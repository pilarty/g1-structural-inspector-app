import { infoDano } from '../danos';
import type { EstadoRevision } from './DetalleDeteccion';
import logo from '../assets/logo-g1.png';
import { PLAZOS } from './DetalleDeteccion';

// Estructura basada en:
//  · ASCE MOP 158-2024 (ex ASCE/SEI 11-99), cap. 5: informe de evaluación de condición estructural.
//  · ACI 201.1R-08: terminología e informe de la inspección visual de hormigón en servicio.
//  · Ley 257 CABA (mod. Ley 6.116), art. 2: daños, intervención, plazo y tecnología.

export interface DatosInforme {
  proyecto: string;
  proyectoId: string | null;
  relevamientoId: number;
  comitente: string;
  profesional: string;
  matricula: string;
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

/** Lo que se dibuja en el plano del informe: paredes y camino del robot (en metros). */
export interface PlanoInforme {
  paredes: { resolucion: number; celdas: [number, number][] } | null;
  recorrido: { x: number; y: number }[];
}

/** Referencia del hallazgo, igual en el plano, las tablas y las fotos: H-01, H-02… */
export const ref = (n: number) => `H-${String(n).padStart(2, '0')}`;

/** Qué implica cada plazo, ordenado de más a menos urgente. */
const URGENCIA: Record<string, { color: string; fondo: string; accion: string }> = {
  'Inmediato': { color: '#B91C1C', fondo: '#FEE2E2', accion: 'Restringir el acceso e intervenir de inmediato' },
  'Dentro de 30 días': { color: '#C2410C', fondo: '#FFEDD5', accion: 'Intervenir a corto plazo' },
  'Dentro de 6 meses': { color: '#A16207', fondo: '#FEF9C3', accion: 'Programar la reparación' },
  'Dentro de 1 año': { color: '#15803D', fondo: '#DCFCE7', accion: 'Incluir en el mantenimiento' },
  'Controlar en la próxima inspección': { color: '#1D4ED8', fondo: '#DBEAFE', accion: 'Observar su evolución' },
};

/** Descripción breve de cada tipo de daño que puede detectar el modelo. */
const DESCRIPCION: Record<string, string> = {
  'Grieta estructural': 'Abertura en un elemento resistente que puede indicar esfuerzos superiores a su capacidad o asentamientos.',
  'Desprendimiento de hormigón': 'Pérdida de fragmentos de la superficie del hormigón, generalmente por corrosión de la armadura o por impactos.',
  'Corrosión': 'Deterioro del acero de refuerzo o de elementos metálicos, visible como manchas de óxido o pérdida de sección.',
  'Delaminación': 'Separación de una capa superficial del hormigón en forma paralela a la superficie del elemento.',
  'Pérdida de material': 'Disminución de la sección del elemento por desgaste, erosión o ataque del medio.',
  'Descascaramiento': 'Desprendimiento de escamas delgadas de la superficie del material.',
  'Humedad': 'Manchas o zonas mojadas por filtraciones o condensación que pueden acelerar otros deterioros.',
  'Eflorescencia salina': 'Depósito blanquecino de sales en la superficie producido por el paso de agua a través del material.',
  'Crecimiento biológico': 'Presencia de hongos, musgos o líquenes asociada a una humedad persistente.',
  'Vegetación': 'Plantas que crecen sobre la estructura o en sus juntas, cuyas raíces pueden dañarla.',
  'Vandalismo': 'Daños intencionales o pintadas sobre la superficie.',
  'Grieta de corte': 'Fisura inclinada característica de los esfuerzos de corte, frecuente en vigas, columnas y muros luego de un sismo.',
  'Grieta diagonal': 'Fisura inclinada en muros o paneles asociada a esfuerzos de corte o a asentamientos diferenciales.',
  'Grieta de flexión': 'Fisura perpendicular al eje del elemento producida por flexión o por el balanceo durante un sismo.',
  'Grieta de desprendimiento': 'Fisura que separa un elemento no estructural, como un tabique o un revestimiento, de la estructura.',
  'Escombros': 'Restos de material caídos que pueden indicar daños en elementos cercanos y obstaculizar el paso.',
};

const ESTADO: Record<EstadoRevision, string> ={ pendiente: 'Sin revisar', confirmado: 'Confirmado', descartado: 'Descartado' };

/** Plano estático de la planta con el recorrido y los hallazgos numerados. */
function Plano({ plano, hallazgos }: { plano: PlanoInforme; hallazgos: HallazgoInforme[] }) {
  const puntos = hallazgos.filter(h => h.x != null && h.y != null);
  const pts: { x: number; y: number }[] = [...plano.recorrido, ...puntos.map(h => ({ x: h.x!, y: h.y! }))];
  const res = plano.paredes?.resolucion ?? 0;
  if (plano.paredes) for (const [i, j] of plano.paredes.celdas) pts.push({ x: i * res, y: j * res }, { x: (i + 1) * res, y: (j + 1) * res });
  if (pts.length === 0) return null;

  let minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
  let minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));
  const minimo = 4;
  if (maxX - minX < minimo) { const c = (minX + maxX) / 2; minX = c - minimo / 2; maxX = c + minimo / 2; }
  if (maxY - minY < minimo) { const c = (minY + maxY) / 2; minY = c - minimo / 2; maxY = c + minimo / 2; }
  const pad = Math.max(maxX - minX, maxY - minY) * 0.06;
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;

  const W = 700;
  const H = Math.round(Math.min(460, Math.max(240, W * (maxY - minY) / (maxX - minX))));
  const escala = Math.min(W / (maxX - minX), H / (maxY - minY));
  const offX = (W - (maxX - minX) * escala) / 2;
  const offY = (H - (maxY - minY) * escala) / 2;
  const X = (x: number) => offX + (x - minX) * escala;
  const Y = (y: number) => offY + (maxY - y) * escala;

  // Barra de escala de 1, 2, 5 o 10 m
  const metros = [1, 2, 5, 10, 20].find(m => m * escala >= 60) ?? 20;
  const inicio = plano.recorrido[0];

  // Los hallazgos que caen en el mismo lugar del plano se muestran juntos para que no se superpongan las etiquetas
  const grupos: HallazgoInforme[][] = [];
  for (const h of puntos) {
    const g = grupos.find(gr => Math.hypot(X(gr[0].x!) - X(h.x!), Y(gr[0].y!) - Y(h.y!)) < 16);
    if (g) g.push(h); else grupos.push([h]);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#FAFBFC" />
      {plano.paredes && (
        <g fill="#3B4753">
          {plano.paredes.celdas.map(([i, j]) => (
            <rect key={`${i},${j}`} x={X(i * res)} y={Y((j + 1) * res)} width={res * escala + 0.4} height={res * escala + 0.4} />
          ))}
        </g>
      )}
      {plano.recorrido.length > 1 && (
        <polyline points={plano.recorrido.map(p => `${X(p.x)},${Y(p.y)}`).join(' ')} fill="none" stroke="#377DC0"
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" opacity="0.85" />
      )}
      {inicio && (
        <g>
          <circle cx={X(inicio.x)} cy={Y(inicio.y)} r="6" fill="#FFFFFF" stroke="#377DC0" strokeWidth="2.5" />
          <text x={X(inicio.x) + 9} y={Y(inicio.y) + 4} fontSize="11" fill="#377DC0" fontWeight="600">Inicio</text>
        </g>
      )}
      {grupos.map(g => {
        const cx = X(g[0].x!), cy = Y(g[0].y!);
        const texto = g.map(h => ref(h.numero)).join(', ');
        const derecha = cx > W - 20 - texto.length * 5.5;
        return (
          <g key={g[0].numero}>
            <circle cx={cx} cy={cy} r="7" fill={infoDano(g[0].tipo).color} stroke="#FFFFFF" strokeWidth="2" />
            <rect x={derecha ? cx - 11 - texto.length * 5.5 : cx + 9} y={cy - 21} width={texto.length * 5.5 + 4} height="13" fill="#FFFFFF" opacity="0.9" />
            <text x={derecha ? cx - 9 : cx + 11} y={cy - 11} fontSize="10" fill="#14202B" textAnchor={derecha ? 'end' : 'start'}>{texto}</text>
          </g>
        );
      })}
      <g transform={`translate(${W - 16 - metros * escala}, ${H - 16})`}>
        <rect x="-6" y="-16" width={metros * escala + 12} height="24" rx="3" fill="#FFFFFF" opacity="0.9" />
        <line x1="0" y1="0" x2={metros * escala} y2="0" stroke="#14202B" strokeWidth="2" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#14202B" strokeWidth="2" />
        <line x1={metros * escala} y1="-4" x2={metros * escala} y2="4" stroke="#14202B" strokeWidth="2" />
        <text x={metros * escala / 2} y="-5" fontSize="10" textAnchor="middle" fill="#14202B">{metros} m</text>
      </g>
    </svg>
  );
}

/** Informe de inspección listo para imprimir o guardar como PDF (A4). */
export default function Informe({ datos, hallazgos, descartados, plano }: {
  datos: DatosInforme;
  /** Hallazgos que van en el informe (los descartados no) */
  hallazgos: HallazgoInforme[];
  descartados: number;
  plano: PlanoInforme;
}) {
  const confirmados = hallazgos.filter(h => h.estado === 'confirmado').length;
  const sinRevisar = hallazgos.filter(h => h.estado === 'pendiente').length;
  const porTipo = [...hallazgos.reduce((m, h) => {
    const t = infoDano(h.tipo);
    const e = m.get(t.etiqueta) ?? { t, n: 0, conf: 0, pend: 0 };
    e.n += 1;
    if (h.estado === 'confirmado') e.conf += 1; else e.pend += 1;
    return m.set(t.etiqueta, e);
  }, new Map<string, { t: ReturnType<typeof infoDano>; n: number; conf: number; pend: number }>()).values()].sort((a, b) => b.n - a.n);
  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const conIntervencion = hallazgos.filter(h => h.estado === 'confirmado' && (h.intervencion || h.plazo));
  const porPlazo = PLAZOS.map(p => ({ plazo: p, n: hallazgos.filter(h => h.estado === 'confirmado' && h.plazo === p).length })).filter(x => x.n > 0);
  const sinPlazo = hallazgos.filter(h => h.estado === 'confirmado' && !h.plazo).length;
  const hayPlano = plano.recorrido.length > 0 || !!plano.paredes || hallazgos.some(h => h.x != null && h.y != null);
  let n = 0;
  const sec = () => ++n;

  return (
    <div className="informe font-sans text-[#1A1C1E]">
      {/* Encabezado */}
      <header className="informe-encabezado">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="h-[52px] w-auto" />
          <div>
            <p className="text-[13px] font-bold tracking-[0.02em] text-white">G1 Structural Inspector</p>
            <p className="text-[10px] text-white/70">Informe de inspección visual</p>
            <p className="text-[10px] text-white/70">Evaluación preliminar</p>
          </div>
        </div>
        <div className="text-right text-[10px] text-white/80 leading-relaxed">
          <p className="text-[12px] font-semibold text-white">Inspección N.º {datos.relevamientoId}</p>
          <p>Fecha de la inspección: {datos.fecha}</p>
          <p>Emitido el {hoy}</p>
        </div>
      </header>

      <div className="mt-4">
        <h1 className="text-[20px] font-bold leading-tight text-[#0F1A24]">{datos.edificacion}</h1>
        <p className="text-[12px] text-[#66686A]">{datos.direccion || 'Sin dirección'}</p>
        <p className="text-[12px] text-[#66686A]">Planta inspeccionada: {datos.planta}</p>
      </div>

      {/* Indicadores */}
      <div className="informe-indicadores">
        <div><b>{hallazgos.length}</b><span>Hallazgos informados</span></div>
        <div><b className="text-[#15803D]">{confirmados}</b><span>Confirmados</span></div>
        <div><b className="text-[#B45309]">{sinRevisar}</b><span>Sin revisar</span></div>
        <div><b className="text-[#8A8C8E]">{descartados}</b><span>Descartados</span></div>
        <div><b>{datos.distancia}</b><span>Recorrido del robot</span></div>
      </div>

      {/* Prioridad de intervención según los plazos que indicó el profesional */}
      <div className="informe-prioridad">
        <p className="informe-prioridad-titulo">Prioridad de intervención indicada por el profesional</p>
        {porPlazo.length === 0 ? (
          <p className="text-[10.5px] text-[#66686A]">
            {confirmados === 0 ? 'Todavía no hay hallazgos confirmados.' : 'El profesional no indicó plazos de intervención.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {porPlazo.map(({ plazo, n: cant }) => {
              const u = URGENCIA[plazo];
              return (
                <span key={plazo} className="informe-urgencia" style={{ color: u?.color, background: u?.fondo }}>
                  <b>{cant}</b> {plazo.toLowerCase()}
                </span>
              );
            })}
            {sinPlazo > 0 && <span className="informe-urgencia" style={{ color: '#616161', background: '#F3F4F6' }}><b>{sinPlazo}</b> sin plazo indicado</span>}
          </div>
        )}
      </div>

      {/* Objeto */}
      <section className="mt-5">
        <h2 className="informe-titulo">{sec()}. Objeto del informe</h2>
        <p className="informe-texto">
          El presente informe documenta la inspección visual realizada en {datos.edificacion}
          {datos.direccion ? `, ubicada en ${datos.direccion},` : ''} en el sector «{datos.planta}». Su objetivo es registrar
          los daños visibles detectados durante el recorrido, indicar su ubicación en la planta e informar la revisión
          realizada por el profesional a cargo junto con las intervenciones que recomienda. La información sirve como base
          para decidir los pasos siguientes, como una evaluación detallada, la restricción del acceso o la reparación de los
          elementos afectados.
        </p>
      </section>

      {/* Datos generales */}
      <section className="mt-5">
        <h2 className="informe-titulo">{sec()}. Datos generales</h2>
        <p className="informe-texto mb-2">
          La siguiente tabla resume los datos del proyecto, del profesional responsable y de la inspección registrados en la
          aplicación.
        </p>
        <table className="informe-datos">
          <tbody>
            <tr><th>Proyecto</th><td>{datos.proyecto}</td><th>Comitente</th><td>{datos.comitente || '—'}</td></tr>
            <tr><th>Profesional a cargo</th><td>{datos.profesional || '—'}</td><th>Matrícula</th><td>{datos.matricula || '—'}</td></tr>
            <tr><th>Planta inspeccionada</th><td>{datos.planta}</td><th>Motivo</th><td>{datos.motivo ?? '—'}</td></tr>
            <tr><th>Horario</th><td>{datos.inicio} a {datos.fin} ({datos.duracion})</td><th>Equipo</th><td>Robot {datos.robot}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Alcance y método */}
      <section className="mt-5">
        <h2 className="informe-titulo">{sec()}. Alcance y método</h2>
        <p className="informe-texto">
          La inspección se realizó con un robot humanoide que recorrió la planta de forma autónoma{datos.distancia !== '—' ? ` (${datos.distancia} de
          recorrido)` : ''} mientras el profesional supervisaba el proceso a distancia. El trabajo se desarrolló en las siguientes
          etapas:
        </p>
        <ol className="informe-texto list-decimal pl-5 mt-1 space-y-0.5">
          <li>Recorrido: el robot avanzó por la planta, generó un mapa del lugar y registró su posición en todo momento.</li>
          <li>Captura: durante el recorrido, la cámara del robot tomó fotografías de las superficies a su alcance.</li>
          <li>Detección: un modelo de visión artificial analizó cada fotografía para detectar y clasificar daños visibles.
            Cada detección quedó asociada al punto de la planta en el que fue tomada.</li>
          <li>Revisión: el profesional analizó cada detección, confirmó las que corresponden a daños reales, descartó los
            falsos positivos e indicó la intervención y el plazo recomendados.</li>
          <li>Emisión: la aplicación G1 Structural Inspector generó este informe a partir de los datos registrados durante la
            inspección y de la revisión del profesional.</li>
        </ol>
        <p className="informe-texto mt-1.5">
          Este documento corresponde a una evaluación preliminar de la condición del lugar. Su propósito es orientar la toma de
          decisiones y no reemplaza una evaluación estructural detallada.
        </p>
        <p className="informe-texto mt-1.5 text-[#66686A]">
          El alcance de la inspección se limita a los daños visibles en las superficies que el robot recorrió. No se realizaron
          ensayos de materiales ni se inspeccionaron elementos ocultos, como armaduras, instalaciones o fundaciones. Asimismo,
          el porcentaje de confianza que acompaña a cada hallazgo expresa la certeza del modelo sobre el tipo de daño
          detectado, por lo que no debe interpretarse como una medida de su gravedad.
        </p>
        {datos.observaciones && (
          <p className="informe-texto mt-1.5 whitespace-pre-line"><b>Observaciones del lugar:</b> {datos.observaciones}</p>
        )}
      </section>

      {/* Plano */}
      {hayPlano && (
        <section className="mt-5 informe-bloque">
          <h2 className="informe-titulo">{sec()}. Plano de la planta</h2>
          <p className="informe-texto mb-2">
            El plano se construyó a partir del mapa que generó el robot durante el recorrido. Las zonas oscuras representan
            paredes y objetos, la línea discontinua muestra el camino seguido desde el punto de inicio y cada círculo indica el
            lugar donde se detectó un hallazgo, identificado con la misma referencia que se usa en las tablas y en las
            fotografías. Cuando varios hallazgos coinciden en un mismo punto, sus referencias se indican juntas. La barra de la esquina inferior derecha indica la escala.
          </p>
          <div className="informe-plano"><Plano plano={plano} hallazgos={hallazgos} /></div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] mt-2 text-[#374151]">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 bg-[#3B4753]" />Paredes y objetos</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-[#377DC0]" />Recorrido del robot</span>
            {porTipo.map(({ t }) => (
              <span key={t.etiqueta} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />{t.etiqueta}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Resumen por tipo de daño */}
      <section className="mt-5 informe-bloque">
        <h2 className="informe-titulo">{sec()}. Resumen por tipo de daño</h2>
        <p className="informe-texto mb-2">
          Se informan <b>{hallazgos.length}</b> hallazgo{hallazgos.length === 1 ? '' : 's'}: {confirmados} confirmado{confirmados === 1 ? '' : 's'} por
          el profesional{sinRevisar ? ` y ${sinRevisar} sin revisar` : ''}.{descartados ? ` Además, ${descartados} detección${descartados === 1 ? ' fue descartada' : 'es fueron descartadas'} como falso positivo y no se incluye${descartados === 1 ? '' : 'n'}.` : ''}
        </p>
        {porTipo.length > 0 && (
          <table className="informe-tabla">
            <thead><tr><th>Tipo de daño</th><th>Cantidad</th><th>Confirmados</th><th>Sin revisar</th></tr></thead>
            <tbody>
              {porTipo.map(({ t, n: cant, conf, pend }) => (
                <tr key={t.etiqueta}>
                  <td>{t.etiqueta}</td>
                  <td>{cant}</td><td>{conf}</td><td>{pend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {porTipo.length > 0 && (
          <>
            <p className="informe-texto mt-3 mb-2">A continuación se describe cada tipo de daño presente en este informe.</p>
            <table className="informe-tabla">
              <thead><tr><th>Tipo de daño</th><th>Descripción</th></tr></thead>
              <tbody>
                {porTipo.map(({ t }) => (
                  <tr key={t.etiqueta}>
                    <td className="whitespace-nowrap">{t.etiqueta}</td>
                    <td>{DESCRIPCION[t.etiqueta] ?? 'Daño visible identificado por el modelo de visión artificial.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* Detalle de hallazgos */}
      <section className="mt-5">
        <h2 className="informe-titulo">{sec()}. Detalle de los hallazgos</h2>
        {hallazgos.length > 0 && (
          <p className="informe-texto mb-2">
            La tabla presenta cada hallazgo con su referencia. La confianza indica qué tan seguro está el modelo del tipo de
            daño asignado. La ubicación se expresa en metros respecto del punto de inicio del recorrido. La revisión muestra si
            el profesional confirmó el hallazgo o si todavía está sin revisar, mientras que las dos últimas columnas reúnen su
            recomendación.
          </p>
        )}
        {hallazgos.length === 0 ? (
          <p className="informe-texto">No se registraron hallazgos en esta inspección.</p>
        ) : (
          <table className="informe-tabla">
            <thead>
              <tr><th>Ref.</th><th>Daño</th><th>Confianza</th><th>Ubicación (m)</th><th>Revisión</th><th>Intervención recomendada</th><th>Plazo</th></tr>
            </thead>
            <tbody>
              {hallazgos.map(h => {
                const t = infoDano(h.tipo);
                return (
                  <tr key={h.numero}>
                    <td className="whitespace-nowrap font-semibold">{ref(h.numero)}</td>
                    <td>{t.etiqueta}{h.nota ? <div className="text-[#66686A] mt-0.5">{h.nota}</div> : null}</td>
                    <td>{h.confianza != null ? `${h.confianza}%` : '—'}</td>
                    <td>{h.x != null && h.y != null ? `${h.x.toFixed(1)}; ${h.y.toFixed(1)}` : '—'}</td>
                    <td><span className={`informe-estado informe-estado-${h.estado}`}>{ESTADO[h.estado]}</span></td>
                    <td>{h.intervencion ?? (h.estado === 'confirmado' ? 'A definir' : '—')}</td>
                    <td>{h.plazo ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Registro fotográfico */}
      {hallazgos.some(h => h.foto) && (
        <section className="mt-5">
          <h2 className="informe-titulo">{sec()}. Registro fotográfico</h2>
          <p className="informe-texto mb-2">
            Las fotografías fueron tomadas por la cámara del robot en el momento de cada detección. Constituyen la evidencia del
            daño informado y permiten al lector verificar el estado de cada elemento sin necesidad de acceder al lugar.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {hallazgos.filter(h => h.foto).map(h => {
              const t = infoDano(h.tipo);
              return (
                <figure key={h.numero} className="informe-foto">
                  <img src={h.foto!} alt={`Hallazgo ${h.numero}`} />
                  <figcaption>
                    <div className="flex items-center justify-between">
                      <span><b className="mr-1.5">{ref(h.numero)}</b>{t.etiqueta}</span>
                      <span className={`informe-estado informe-estado-${h.estado}`}>{ESTADO[h.estado]}</span>
                    </div>
                    <div className="text-[#66686A] mt-0.5">
                      {h.confianza != null ? `Confianza del modelo: ${h.confianza}%.` : ''}{h.hora && h.hora !== '—' ? ` Hora de detección: ${h.hora}.` : ''}
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      )}

      {/* Intervenciones recomendadas */}
      <section className="mt-5 informe-bloque">
        <h2 className="informe-titulo">{sec()}. Intervenciones recomendadas</h2>
        <p className="informe-texto mb-2">
          Las intervenciones fueron indicadas por el profesional para los hallazgos confirmados. Se ordenan por urgencia, desde
          las que requieren una acción inmediata hasta las que solo deben controlarse en la próxima inspección. La acción
          sugerida resume qué implica cada plazo para el responsable de la edificación.
        </p>
        {conIntervencion.length === 0 && <p className="informe-texto text-[#8A8C8E]">El profesional no indicó intervenciones para los hallazgos confirmados.</p>}
        {conIntervencion.length > 0 && (
          <table className="informe-tabla">
            <thead><tr><th>Ref.</th><th>Daño</th><th>Intervención recomendada</th><th>Plazo</th><th>Acción sugerida</th></tr></thead>
            <tbody>
              {[...conIntervencion].sort((a, b) => PLAZOS.indexOf(a.plazo ?? '') - PLAZOS.indexOf(b.plazo ?? '')).map(h => {
                const u = h.plazo ? URGENCIA[h.plazo] : undefined;
                return (
                  <tr key={h.numero}>
                    <td className="whitespace-nowrap">{ref(h.numero)}</td>
                    <td>{infoDano(h.tipo).etiqueta}</td>
                    <td>{h.intervencion ?? 'A definir'}</td>
                    <td>{h.plazo ? <span className="informe-urgencia" style={{ color: u?.color, background: u?.fondo }}>{h.plazo}</span> : '—'}</td>
                    <td>{u?.accion ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Conclusiones */}
      <section className="mt-5 informe-bloque">
        <h2 className="informe-titulo">{sec()}. Conclusiones</h2>
        <p className="informe-texto">
          {hallazgos.length === 0
            ? 'Durante el recorrido no se detectaron daños visibles en las superficies inspeccionadas. Este resultado no descarta la existencia de daños ocultos o en zonas que el robot no alcanzó.'
            : `Durante el recorrido se informaron ${hallazgos.length} hallazgo${hallazgos.length === 1 ? '' : 's'}, ${confirmados === 0 ? ', ninguno de los cuales fue confirmado todavía por el profesional' : `, de los cuales ${confirmados} ${confirmados === 1 ? 'fue confirmado' : 'fueron confirmados'} por el profesional`}.${porTipo[0] ? ` El tipo de daño más frecuente es ${porTipo[0].t.etiqueta.toLowerCase()}, con ${porTipo[0].n} caso${porTipo[0].n === 1 ? '' : 's'}.` : ''}`}
          {porPlazo[0] ? ` El plazo más urgente indicado es «${porPlazo[0].plazo.toLowerCase()}», que corresponde a ${porPlazo[0].n} hallazgo${porPlazo[0].n === 1 ? '' : 's'}; por lo tanto, se recomienda ${URGENCIA[porPlazo[0].plazo]?.accion.toLowerCase() ?? 'atenderlos según lo indicado'}.` : ''}
          {sinRevisar > 0 ? ` Quedan ${sinRevisar} hallazgo${sinRevisar === 1 ? '' : 's'} sin revisar, que deben ser evaluados por el profesional antes de tomar decisiones sobre el uso de la edificación.` : ''}
        </p>
        <p className="informe-texto mt-1.5">
          Se recomienda conservar este informe junto con los registros de la inspección para comparar la evolución de los daños
          en futuras inspecciones.
        </p>
      </section>

      {/* Responsabilidad y firma */}
      <section className="mt-5 informe-bloque">
        <div className="informe-dictamen">
          <p className="informe-texto">
            G1 Structural Inspector es una herramienta de apoyo a la inspección: detecta y ubica daños visibles, pero no emite
            dictámenes. La evaluación de la seguridad estructural y la decisión sobre el uso de la edificación corresponden al
            profesional a cargo.
          </p>
          <div className="informe-firma">
            <div>
              <div className="informe-firma-linea" />
              <p>{datos.profesional || 'Profesional a cargo'}</p>
              <p className="text-[#8A8C8E]">{datos.matricula ? `Matrícula ${datos.matricula}` : 'Firma y matrícula'}</p>
              <p className="text-[#8A8C8E] mt-2">Fecha: ____ / ____ / ________</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
