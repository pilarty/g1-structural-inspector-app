import { useEffect, useState } from 'react';
import { FileUp, Loader2, X } from 'lucide-react';
import { useProyectos } from '../proyectos';
import { elegirArchivo, importarArchivo, leerResumen, type ResumenArchivo } from '../archivoInspeccion';
import { fechaLarga } from '../formato';

/** Importar una inspección que te compartieron como archivo (.g1insp): se crea una copia en tu cuenta. */
export default function DialogoImportar({ onCerrar, onImportado }: {
  onCerrar: () => void;
  /** Se importó: la edificación nueva */
  onImportado: (edificacionId: string) => void;
}) {
  const { proyectos, recargar } = useProyectos();
  const [archivo, setArchivo] = useState<{ nombre: string; datos: unknown; resumen: ResumenArchivo } | null>(null);
  const [proyectoId, setProyectoId] = useState(proyectos[0]?.id ?? '');
  const [estado, setEstado] = useState<{ tipo: 'nada' | 'enviando' } | { tipo: 'error'; texto: string } | { tipo: 'listo'; eid: string; avisos: string[] }>({ tipo: 'nada' });

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && estado.tipo !== 'enviando') onCerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar, estado.tipo]);

  async function elegir() {
    const a = await elegirArchivo();
    if (!a) return;
    const r = leerResumen(a.contenido);
    if ('error' in r) { setArchivo(null); setEstado({ tipo: 'error', texto: r.error }); return; }
    setArchivo({ nombre: a.nombre, datos: r.datos, resumen: r.resumen });
    setEstado({ tipo: 'nada' });
  }

  async function importar() {
    if (!archivo || !proyectoId) return;
    setEstado({ tipo: 'enviando' });
    const r = await importarArchivo(archivo.datos, proyectoId);
    if (!r.ok) { setEstado({ tipo: 'error', texto: r.mensaje }); return; }
    await recargar();
    setEstado({ tipo: 'listo', eid: r.edificacionId, avisos: r.avisos });
  }

  const enviando = estado.tipo === 'enviando';
  const r = archivo?.resumen;

  return (
    <div className="fixed inset-0 z-50 bg-[#14202B]/30 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Importar inspección"
      onMouseDown={e => e.target === e.currentTarget && !enviando && onCerrar()}>
      <div className="w-full max-w-[520px] bg-white rounded-lg border border-[#D4D4D4] shadow-[0_12px_48px_rgba(20,32,43,0.24)] overflow-hidden">
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-[#E5E7EB]">
          <div className="flex-1">
            <h2 className="text-[17px] font-bold text-[#1A1C1E]">Importar edificación</h2>
            <p className="text-[13px] text-[#8A8C8E] mt-0.5">Abrí un archivo <b className="font-semibold">.g1insp</b> que te compartieron: trae la edificación con sus inspecciones. Se crea una copia en tu cuenta.</p>
          </div>
          <button type="button" onClick={onCerrar} disabled={enviando} aria-label="Cerrar"
            className="flex-none w-8 h-8 -mr-1.5 flex items-center justify-center rounded-[4px] text-[#616161] hover:bg-black/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {estado.tipo === 'listo' ? (
            <div className="rounded-md border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-[13px] text-[#065F46]">
              <p className="font-semibold">Listo: la edificación y sus inspecciones ya están en tu cuenta.</p>
              {estado.avisos.length > 0 && (
                <ul className="mt-1.5 list-disc pl-5 text-[#92400E]">{estado.avisos.map(a => <li key={a}>{a}</li>)}</ul>
              )}
            </div>
          ) : (
            <>
              <button type="button" onClick={elegir} disabled={enviando}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-dashed border-[#A0A2A4] text-left hover:bg-[#F8F9FA] transition-colors">
                <FileUp className="w-5 h-5 text-[#377DC0] flex-none" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-[#1A1C1E] truncate">{archivo ? archivo.nombre : 'Elegir archivo…'}</span>
                  <span className="block text-[12px] text-[#8A8C8E]">{archivo ? 'Tocá para elegir otro' : 'Inspecciones exportadas desde G1 Structural Inspector'}</span>
                </span>
              </button>

              {r && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-md bg-[#F8F9FA] border border-[#E5E7EB] px-4 py-3 text-[13px]">
                  <div className="col-span-2"><dt className="text-[12px] text-[#8A8C8E]">Edificación</dt><dd className="font-semibold text-[#1A1C1E]">{r.edificacion}{r.direccion ? <span className="font-normal text-[#66686A]"> · {r.direccion}</span> : null}</dd></div>
                  <div><dt className="text-[12px] text-[#8A8C8E]">Inspecciones</dt><dd className="font-semibold text-[#1A1C1E]">
                    {r.inspecciones}{r.desde ? <span className="font-normal text-[#66686A]"> · {r.desde === r.hasta || !r.hasta ? fechaLarga(r.desde) : `${fechaLarga(r.desde)} a ${fechaLarga(r.hasta)}`}</span> : null}
                  </dd></div>
                  <div><dt className="text-[12px] text-[#8A8C8E]">Plantas</dt><dd className="font-semibold text-[#1A1C1E] truncate">{r.plantas.length ? r.plantas.join(', ') : 'Sin indicar'}</dd></div>
                  <div><dt className="text-[12px] text-[#8A8C8E]">Hallazgos</dt><dd className="font-semibold text-[#1A1C1E]">{r.hallazgos}</dd></div>
                  <div><dt className="text-[12px] text-[#8A8C8E]">Compartida por</dt><dd className="font-semibold text-[#1A1C1E] truncate">{r.exportadoPor ?? '—'}</dd></div>
                </dl>
              )}

              {r && (
                <label className="block">
                  <span className="text-[13px] font-medium text-[#14202B]">Guardar en el proyecto <span className="text-[#DC2626] font-semibold">*</span></span>
                  <select value={proyectoId} onChange={e => setProyectoId(e.target.value)} disabled={enviando}
                    className="mt-1.5 w-full h-9 px-2.5 rounded-md text-[13px] text-[#1A1C1E] bg-white border border-[#D4D4D4] outline-none focus:border-[#377DC0]">
                    {proyectos.length === 0 && <option value="">Primero creá un proyecto</option>}
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <span className="block text-[12px] text-[#8A8C8E] mt-1">Se agrega como una edificación nueva en ese proyecto, con todas sus inspecciones.</span>
                </label>
              )}

              {estado.tipo === 'error' && <p className="text-[13px] text-[#991B1B]">{estado.texto}</p>}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[#F8F9FA] border-t border-[#E5E7EB]">
          {estado.tipo === 'listo' ? (
            <button type="button" onClick={() => onImportado(estado.eid)}
              className="flex items-center justify-center h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-[#377DC0] text-white hover:bg-[#2F6CA8]">
              Ver la edificación
            </button>
          ) : (
            <>
              <button type="button" onClick={onCerrar} disabled={enviando}
                className="flex items-center justify-center h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-white text-[#1A1C1E] border border-[#D4D4D4] hover:bg-[#F3F4F6]">
                Cancelar
              </button>
              <button type="button" onClick={importar} disabled={!archivo || !proyectoId || enviando}
                className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-[3px] text-[13px] font-medium bg-[#377DC0] text-white hover:bg-[#2F6CA8] disabled:bg-[#E5E7EB] disabled:text-[#A0A2A4]">
                {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
                {enviando ? 'Importando…' : 'Importar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
