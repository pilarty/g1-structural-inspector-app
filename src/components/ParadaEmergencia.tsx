import { useEffect, useState } from 'react';
import { OctagonX, Loader2 } from 'lucide-react';
import { consultarActivo, pararEmergencia } from '../robotConexion';

type Aviso = { tono: 'ok' | 'alerta'; texto: string };

/**
 * Botón rojo de parada de emergencia, visible en todas las pantallas (va en TopNav).
 * Se activa cuando hay un robot conectado y lo pone en modo amortiguado, como L2 + B en el mando.
 */
export default function ParadaEmergencia() {
  const [robot, setRobot] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    let vivo = true;
    const revisar = () =>
      consultarActivo()
        .then(a => vivo && setRobot(a.conectado ? a.codigo ?? 'robot' : null))
        .catch(() => vivo && setRobot(null));
    revisar();
    const t = setInterval(revisar, 3000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 8000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function parar() {
    setEnviando(true);
    try {
      const r = await pararEmergencia();
      setAviso(r.ok && r.confirmada
        ? { tono: 'ok', texto: `${robot} quedó en modo amortiguado. Para volver a moverlo hay que confirmar de nuevo.` }
        : { tono: 'alerta', texto: `${r.detalle} Usá ya el mando: L2 + B.` });
    } catch {
      setAviso({ tono: 'alerta', texto: 'No se pudo enviar la parada. Usá ya el mando: L2 + B.' });
    } finally {
      setEnviando(false);
    }
  }

  const activo = robot !== null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={parar}
        disabled={!activo || enviando}
        title={activo ? `Parar ${robot} (modo amortiguado)` : 'Sin robot conectado'}
        className={`flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-bold uppercase tracking-wide transition-colors ${
          activo ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]' : 'bg-white/10 text-white/35 cursor-not-allowed'
        }`}
      >
        {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <OctagonX className="w-5 h-5" />}
        Parada de emergencia
      </button>
      {aviso && (
        <div
          role="alert"
          className={`absolute right-0 top-12 w-[340px] px-3.5 py-2.5 rounded-xl shadow-lg text-[12px] font-medium leading-snug z-50 ${
            aviso.tono === 'ok' ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#FEF2F2] text-[#991B1B]'
          }`}
        >
          {aviso.texto}
        </div>
      )}
    </div>
  );
}
