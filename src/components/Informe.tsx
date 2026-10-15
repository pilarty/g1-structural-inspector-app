import { infoDano } from '../danos';
import type { EstadoRevision } from './DetalleDeteccion';

// Estructura basada en:
//  · ASCE MOP 158-2024 (ex ASCE/SEI 11-99), cap. 5: informe de evaluación de condición estructural.
//  · ACI 201.1R-08: terminología e informe de la inspección visual de hormigón en servicio.
//  · Ley 257 CABA (mod. Ley 6.116), art. 2: daños, intervención, plazo y tecnología.

export interface DatosInforme {
  proyecto: string;
  proyectoId: string | null;
  relevamientoId: number;
  comitente: string;
  edificacion: string;
  direccion: string;
  planta: string;
  motivo: string | null;
  observaciones: string | null;
  fecha: string;
  inicio: string;
  fin: string;
  duracion: string;
  robot: string;
  distancia: string;
}

export interface HallazgoInforme {
  numero: number;
  tipo: string | null;
  confianza: number | null; // 0 a 100
  x: number | null;
  y: number | null;
  hora: string;
  estado: EstadoRevision;
  nota: string | null;
  intervencion: string | null;
  plazo: string | null;
  foto: string | null;
}

const ESTADO: Record<EstadoRevision, string> = { pendiente: 'Sin revisar', confirmado: 'Confirmado', descartado: 'Descartado' };

/** Informe de inspección listo para imprimir o guardar como PDF (A4). */
export default function Informe({ datos, hallazgos, descartados }: {
  datos: DatosInforme;
  /** Hallazgos que van en el informe (los descartados no) */
  hallazgos: HallazgoInforme[];
  descartados: number;
}) {
  const confirmados = hallazgos.filter(h => h.estado === 'confirmado').length;
  const sinRevisar = hallazgos.filter(h => h.estado === 'pendiente').length;
  const porTipo = [...hallazgos.reduce((m, h) => {
    const t = infoDano(h.tipo);
    return m.set(t.etiqueta, { t, n: (m.get(t.etiqueta)?.n ?? 0) + 1 });
  }, new Map<string, { t: ReturnType<typeof infoDano>; n: number }>()).values()].sort((a, b) => b.n - a.n);
  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const conIntervencion = hallazgos.filter(h => h.estado === 'confirmado' && (h.intervencion || h.plazo));

  return (
    <div className="informe font-sans text-[#1A1C1E]">
      {/* Encabezado */}
      <header className="flex items-start justify-between border-b-2 border-[#14202B] pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#616161]">Informe de inspección visual · Evaluación preliminar</p>
          <h1 className="text-[22px] font-bold leading-tight mt-1">{datos.edificacion}</h1>
          <p className="text-[12px] text-[#66686A]">{datos.direccion || 'Sin dirección'}</p>
        </div>
        <div className="text-right">
          <span className="inline-flex w-8 h-8 rounded-[5px] bg-[#377DC0] text-white text-[12px] font-bold items-center justify-center">G1</span>
          <p className="text-[10px] text-[#8A8C8E] mt-1">Inspección N.º {datos.relevamientoId}</p>
          <p className="text-[10px] text-[#8A8C8E]">Emitido el {hoy}</p>
        </div>
      </header>

      {/* 1. Datos generales */}
      <section className="mt-4">
        <h2 className="informe-titulo">1. Datos generales</h2>
        <table className="informe-datos">
          <tbody>
            <tr><th>Edificación</th><td>{datos.edificacion}</td><th>Proyecto</th><td>{datos.proyecto}</td></tr>
            <tr><th>Dirección</th><td>{datos.direccion || '—'}</td><th>Comitente</th><td>{datos.comitente || '—'}</td></tr>
            <tr><th>Planta inspeccionada</th><td>{datos.planta}</td><th>Fecha</th><td>{datos.fecha}</td></tr>
            <tr><th>Motivo</th><td colSpan={3}>{datos.motivo ?? '—'}</td></tr>
            <tr><th>Horario</th><td>{datos.inicio} a {datos.fin} ({datos.duracion})</td><th>Equipo</th><td>Robot {datos.robot}</td></tr>
          </tbody>
        </table>
      </section>

      {/* 2. Alcance y método */}
      <section className="mt-4">
        <h2 className="informe-titulo">2. Alcance y método</h2>
        <p className="informe-texto">
          Inspección visual de la planta indicada, realizada con un robot que recorrió el lugar ({datos.distancia} de recorrido)
          tomando fotografías. Cada fotografía fue analizada por un modelo de visión artificial que detecta y clasifica daños
          visibles; luego cada hallazgo fue revisado por el inspector, que lo confirmó o lo descartó.
          Corresponde a una <b>evaluación preliminar</b> de la condición del lugar.
        </p>
        <p className="informe-texto mt-1.5 text-[#66686A]">
          <b>Limitaciones:</b> solo se evaluaron daños visibles en las superficies recorridas; no se hicieron ensayos ni se
          inspeccionaron elementos ocultos. La confianza informada indica qué tan seguro está el modelo del tipo de daño y no
          mide su gravedad.
        </p>
        {datos.observaciones && (
          <p className="informe-texto mt-1.5 whitespace-pre-line"><b>Observaciones del lugar:</b> {datos.observaciones}</p>
        )}
      </section>

      {/* 3. Resumen */}
      <section className="mt-4">
        <h2 className="informe-titulo">3. Resumen</h2>
        <p className="informe-texto">
          Se registraron <b>{hallazgos.length}</b> hallazgo{hallazgos.length === 1 ? '' : 's'}: {confirmados} confirmado{confirmados === 1 ? '' : 's'} por el
          inspector{sinRevisar ? ` y ${sinRevisar} sin revisar` : ''}.{descartados ? ` Además, ${descartados} detección${descartados === 1 ? ' fue descartada' : 'es fueron descartadas'} como falso positivo y no se incluye${descartados === 1 ? '' : 'n'}.` : ''}
        </p>
        {porTipo.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] mt-2">
            {porTipo.map(({ t, n }) => (
              <span key={t.etiqueta} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />{t.etiqueta}: <b>{n}</b>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 4. Hallazgos */}
      <section className="mt-4">
        <h2 className="informe-titulo">4. Hallazgos</h2>
        {hallazgos.length === 0 ? (
          <p className="informe-texto">No se registraron hallazgos en esta inspección.</p>
        ) : (
          <table className="informe-tabla">
            <thead>
              <tr><th>#</th><th>Daño</th><th>Conf.</th><th>Ubicación (m)</th><th>Revisión</th><th>Intervención recomendada</th><th>Plazo</th></tr>
            </thead>
            <tbody>
              {hallazgos.map(h => {
                const t = infoDano(h.tipo);
                return (
                  <tr key={h.numero}>
                    <td><span className="informe-num" style={{ background: t.color }}>{h.numero}</span></td>
                    <td>{t.etiqueta}{t.clase ? <span className="text-[#8A8C8E]"> ({t.clase.toLowerCase()})</span> : null}{h.nota ? <div className="text-[#66686A] mt-0.5">{h.nota}</div> : null}</td>
                    <td>{h.confianza != null ? `${h.confianza}%` : '—'}</td>
                    <td>{h.x != null && h.y != null ? `${h.x.toFixed(1)}; ${h.y.toFixed(1)}` : '—'}</td>
                    <td>{ESTADO[h.estado]}</td>
                    <td>{h.intervencion ?? (h.estado === 'confirmado' ? 'A definir' : '—')}</td>
                    <td>{h.plazo ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* 5. Registro fotográfico */}
      {hallazgos.some(h => h.foto) && (
        <section className="mt-4">
          <h2 className="informe-titulo">5. Registro fotográfico</h2>
          <div className="grid grid-cols-2 gap-3">
            {hallazgos.filter(h => h.foto).map(h => {
              const t = infoDano(h.tipo);
              return (
                <figure key={h.numero} className="informe-foto">
                  <img src={h.foto!} alt={`Hallazgo ${h.numero}`} />
                  <figcaption>
                    <span className="informe-num" style={{ background: t.color }}>{h.numero}</span>
                    {t.etiqueta}{h.confianza != null ? ` · ${h.confianza}%` : ''} · {ESTADO[h.estado]} · {h.hora}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Intervenciones recomendadas */}
      <section className="mt-4 informe-bloque">
        <h2 className="informe-titulo">6. Intervenciones recomendadas</h2>
        {conIntervencion.length === 0 && <p className="informe-texto text-[#8A8C8E]">El inspector no indicó intervenciones para los hallazgos confirmados.</p>}
        {conIntervencion.length > 0 && (
          <>
            <ul className="informe-texto list-disc pl-5">
              {conIntervencion.map(h => (
                <li key={h.numero}>Hallazgo {h.numero} ({infoDano(h.tipo).etiqueta}): {h.intervencion ?? 'a definir'}{h.plazo ? ` — ${h.plazo.toLowerCase()}` : ''}.</li>
              ))}
            </ul>
          </>
        )}
      </section>

    </div>
  );
}
