import { useCallback, useEffect, useRef, useState } from 'react';
import { CreditCard, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import ActivityBar, { NavTab } from './ActivityBar';
import { TopNav, PrimaryButton } from './components';
import CalendarioOcupacion from './components/CalendarioOcupacion';
import {
  abrirPago, aIso, crearAlquiler, dolares, fechaCorta, fechaFin, listarAlquileres, obtenerOcupacion, obtenerPrecios, pesos,
  pisaOcupado, precioUsd, textoError, verificarAlquiler, type Alquiler, type Licencia, type Modalidad, type Precios, type Tramo,
} from './alquiler';

interface ServicioProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  licencia: Licencia | null;
  /** Se llama cuando un pago queda confirmado, para que la barra y la licencia se actualicen */
  onPagado: () => void;
  /** Se llegó acá porque Iniciar inspección necesita un alquiler */
  motivoBloqueo?: boolean;
}

const ESPERA_MAX_MS = 15 * 60 * 1000;
const CADA_MS = 5000;

const ETIQUETA_ESTADO: Record<Alquiler['estado'], { texto: string; clase: string }> = {
  pagado: { texto: 'Pagado', clase: 'bg-[#DCFCE7] text-[#166534]' },
  pendiente: { texto: 'Pendiente de pago', clase: 'bg-[#FEF3C7] text-[#92400E]' },
  devuelto: { texto: 'Devuelto', clase: 'bg-[#E5E7EB] text-[#374151]' },
};

export default function Servicio({ activeTab, onTabChange, licencia, onPagado, motivoBloqueo }: ServicioProps) {
  const [precios, setPrecios] = useState<Precios | null>(null);
  const [alquileres, setAlquileres] = useState<Alquiler[]>([]);
  // null: la nube todavía no tiene el calendario, entonces no se muestra
  const [ocupado, setOcupado] = useState<Tramo[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [modalidad, setModalidad] = useState<Modalidad>('semanal');
  const [cantidad, setCantidad] = useState(1);
  const hoy = aIso(new Date());
  const [inicio, setInicio] = useState(hoy);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [esperando, setEsperando] = useState<number | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const temporizador = useRef<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [p, l] = await Promise.all([obtenerPrecios(), listarAlquileres()]);
      setPrecios(p); setAlquileres(l); setErrorCarga(null);
      obtenerOcupacion().then(setOcupado).catch(() => setOcupado(null));
    } catch (e) {
      setErrorCarga(textoError(e));
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  // Mientras se espera el pago, se le pregunta al servidor cada pocos segundos
  useEffect(() => {
    if (esperando === null) return;
    const desde = Date.now();
    const consultar = async () => {
      try {
        const a = await verificarAlquiler(esperando);
        if (a.estado === 'pagado') {
          setEsperando(null); setConfirmado(true); await cargar(); onPagado();
          return;
        }
      } catch { /* se reintenta */ }
      if (Date.now() - desde > ESPERA_MAX_MS) { setEsperando(null); return; }
      temporizador.current = window.setTimeout(consultar, CADA_MS);
    };
    temporizador.current = window.setTimeout(consultar, CADA_MS);
    return () => { if (temporizador.current) window.clearTimeout(temporizador.current); };
  }, [esperando, cargar, onPagado]);

  const pagar = async () => {
    setProcesando(true); setError(null); setConfirmado(false);
    try {
      const a = await crearAlquiler(modalidad, cantidad, inicio);
      if (!a.url_pago) throw new Error('sin url');
      abrirPago(a.url_pago);
      setEsperando(a.id);
      await cargar();
    } catch (e) {
      setError(textoError(e));
    } finally {
      setProcesando(false);
    }
  };

  const usd = precios ? precioUsd(modalidad, cantidad, precios) : 0;
  const ars = precios ? usd * precios.tipo_cambio_ars : 0;
  const fin = fechaFin(modalidad, inicio, cantidad);
  const fechaValida = inicio >= hoy;
  const choca = ocupado ? pisaOcupado(inicio, fin, ocupado) : false;
  const unidad = modalidad === 'semanal' ? (cantidad === 1 ? 'semana' : 'semanas') : (cantidad === 1 ? 'mes' : 'meses');

  return (
    <div className="flex h-screen font-sans text-[#1A1C1E]">
      <ActivityBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <div className="flex-1 overflow-y-auto bg-[#F3F4F6]">
          <div className="w-full max-w-[1100px] mx-auto px-6 xl:px-8 pt-7 pb-10">
            <h1 className="text-[24px] font-semibold text-[#0F1A24] tracking-[-0.02em]">Servicio de alquiler</h1>
            <p className="mt-1 text-[14px] text-[#616161]">
              Alquilá el robot Unitree G1 junto con la aplicación Pro, por semana o por mes.
            </p>

            {motivoBloqueo && (
              <div className="mt-5 flex items-start gap-2.5 rounded-md border border-[#F59E0B] bg-[#FFFBEB] px-4 py-3 text-[14px] text-[#92400E]">
                <AlertCircle className="w-5 h-5 shrink-0 mt-px" />
                Para iniciar una inspección necesitás tener un alquiler pagado vigente.
              </div>
            )}

            {licencia && (
              <div className={`mt-5 flex items-center gap-2.5 rounded-md border px-4 py-3 text-[14px] ${
                licencia.activa ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]' : 'border-[#D4D4D4] bg-white text-[#374151]'}`}>
                <ShieldCheck className="w-5 h-5 shrink-0" />
                {licencia.activa
                  ? `Versión Pro activa hasta el ${fechaCorta(licencia.hasta)}.`
                  : 'No tenés un alquiler vigente. Sin alquiler podés consultar tus inspecciones y exportar los informes.'}
              </div>
            )}

            {confirmado && (
              <div className="mt-4 rounded-md border border-[#86EFAC] bg-[#F0FDF4] px-4 py-3 text-[14px] text-[#166534]">
                Pago confirmado. Tu alquiler ya está registrado.
              </div>
            )}

            {errorCarga ? (
              <div className="mt-6 rounded-md border border-[#D4D4D4] bg-white px-4 py-6 text-[14px] text-[#616161]">{errorCarga}</div>
            ) : !precios ? (
              <div className="mt-6 text-[14px] text-[#616161]">Cargando…</div>
            ) : (
              <>
                {precios.modo_prueba && (
                  <div className="mt-5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-[13px] text-[#1E40AF]">
                    Modo de prueba: los pagos no cobran dinero real.
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['semanal', 'mensual'] as Modalidad[]).map(m => (
                    <button key={m} type="button" onClick={() => { setModalidad(m); setCantidad(1); }}
                      className={`text-left rounded-md bg-white p-5 border-2 transition-colors ${
                        modalidad === m ? 'border-[#377DC0]' : 'border-[#D4D4D4] hover:border-[#9CA3AF]'}`}>
                      <div className="text-[12px] font-semibold tracking-[0.08em] text-[#377DC0]">{m === 'semanal' ? 'SEMANAL' : 'MENSUAL'}</div>
                      <div className="mt-1 text-[28px] font-semibold text-[#0F1A24]">
                        {dolares(m === 'semanal' ? precios.semanal_usd : precios.mensual_usd)}
                        <span className="text-[14px] font-normal text-[#616161]"> {m === 'semanal' ? 'por semana' : 'por mes'}</span>
                      </div>
                      <ul className="mt-3 space-y-1 text-[13px] text-[#374151]">
                        <li>Robot Unitree G1 EDU Standard</li>
                        <li>Aplicación g1structuralinspector Pro</li>
                        <li>Inspecciones ilimitadas durante el período</li>
                        {m === 'mensual' && <li>Equivale a {dolares(Math.round(precios.mensual_usd * 12 / 52))} por semana</li>}
                      </ul>
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-md bg-white border border-[#D4D4D4] p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="text-[13px] font-medium text-[#374151]">
                      Cantidad de {modalidad === 'semanal' ? 'semanas' : 'meses'}
                      <input type="number" min={1} max={12} value={cantidad}
                        onChange={e => setCantidad(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                        className="mt-1 block w-full h-9 px-2.5 rounded-[3px] border border-[#D4D4D4] text-[14px] outline-none focus:border-[#377DC0]" />
                    </label>
                    <label className="text-[13px] font-medium text-[#374151]">
                      Fecha de inicio
                      <input type="date" min={hoy} value={inicio} onChange={e => setInicio(e.target.value)}
                        className="mt-1 block w-full h-9 px-2.5 rounded-[3px] border border-[#D4D4D4] text-[14px] outline-none focus:border-[#377DC0]" />
                    </label>
                  </div>

                  {ocupado && (
                    <CalendarioOcupacion ocupado={ocupado} inicio={inicio} fin={fin} hoy={hoy} onElegirInicio={setInicio} />
                  )}

                  <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-[#E5E7EB] pt-4">
                    <div>
                      <div className="text-[13px] text-[#616161]">
                        {cantidad} {unidad} · del {fechaCorta(inicio)} al {fechaCorta(fin)}
                      </div>
                      <div className="mt-1 text-[24px] font-semibold text-[#0F1A24]">{dolares(usd)}</div>
                      <div className="text-[13px] text-[#616161]">
                        Se cobra en pesos: aproximadamente {pesos(ars)} (dólar a {pesos(precios.tipo_cambio_ars)}). El monto exacto se confirma al pagar.
                      </div>
                    </div>
                    <PrimaryButton variant="large" onClick={pagar} disabled={procesando || esperando !== null || !fechaValida || choca}
                      icon={<CreditCard className="w-4 h-4" />}>
                      {procesando ? 'Preparando el pago…' : 'Pagar con Mercado Pago'}
                    </PrimaryButton>
                  </div>
                  {choca && (
                    <div className="mt-3 text-[13px] text-[#B91C1C]">
                      El robot ya está alquilado en parte de esas fechas. Elegí otra fecha de inicio o menos {modalidad === 'semanal' ? 'semanas' : 'meses'}.
                    </div>
                  )}
                  {error && <div className="mt-3 text-[13px] text-[#B91C1C]">{error}</div>}
                  {esperando !== null && (
                    <div className="mt-3 flex items-center gap-2 text-[13px] text-[#374151]">
                      <Clock className="w-4 h-4" />
                      Se abrió Mercado Pago en tu navegador. Cuando termines de pagar, esta pantalla se actualiza sola.
                    </div>
                  )}
                </div>
              </>
            )}

            {alquileres.length > 0 && (
              <div className="mt-6">
                <h2 className="text-[16px] font-semibold text-[#0F1A24]">Mis alquileres</h2>
                <div className="mt-2 bg-white rounded-md border border-[#D4D4D4] divide-y divide-[#E5E7EB]">
                  {alquileres.map(a => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[14px]">
                      <div>
                        <div className="font-medium">
                          {a.cantidad} {a.modalidad === 'semanal' ? (a.cantidad === 1 ? 'semana' : 'semanas') : (a.cantidad === 1 ? 'mes' : 'meses')} · {dolares(a.monto_usd)}
                        </div>
                        <div className="text-[13px] text-[#616161]">Del {fechaCorta(a.fecha_inicio)} al {fechaCorta(a.fecha_fin)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.estado === 'pendiente' && (
                          <button type="button" onClick={() => setEsperando(a.id)} disabled={esperando !== null}
                            className="text-[13px] text-[#377DC0] hover:underline disabled:opacity-50">Ya pagué, verificar</button>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[12px] font-medium ${ETIQUETA_ESTADO[a.estado].clase}`}>
                          {ETIQUETA_ESTADO[a.estado].texto}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 text-[12px] text-[#6B7280]">
              Cuando termina el alquiler, devolvés el robot y seguís viendo tus inspecciones e informes sin costo.
              Para crear inspecciones nuevas hace falta un alquiler vigente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
