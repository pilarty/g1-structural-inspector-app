import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { aIso, type Tramo } from '../alquiler';

interface Props {
  ocupado: Tramo[];
  inicio: string;
  fin: string;
  hoy: string;
  onElegirInicio: (fecha: string) => void;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const estaOcupado = (dia: string, ocupado: Tramo[]) => ocupado.some(t => dia >= t.desde && dia <= t.hasta);

function Mes({ anio, mes, props }: { anio: number; mes: number; props: Props }) {
  const { ocupado, inicio, fin, hoy, onElegirInicio } = props;
  const cantidad = new Date(anio, mes + 1, 0).getDate();
  // getDay() empieza en domingo; la semana se muestra desde el lunes
  const vacios = (new Date(anio, mes, 1).getDay() + 6) % 7;

  return (
    <div>
      <div className="text-[13px] font-semibold text-[#0F1A24] capitalize mb-2">{MESES[mes]} {anio}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#6B7280] mb-1">
        {DIAS.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: vacios }, (_, i) => <div key={`v${i}`} />)}
        {Array.from({ length: cantidad }, (_, i) => {
          const dia = aIso(new Date(anio, mes, i + 1));
          const pasado = dia < hoy;
          const lleno = estaOcupado(dia, ocupado);
          const elegido = dia >= inicio && dia <= fin;
          let clase = 'bg-white text-[#1A1C1E] hover:border-[#377DC0]';
          if (pasado) clase = 'bg-white text-[#C4C4C4]';
          else if (lleno && elegido) clase = 'bg-[#FECACA] text-[#991B1B] border-[#B91C1C]';
          else if (lleno) clase = 'bg-[#E5E7EB] text-[#9CA3AF] line-through';
          else if (elegido) clase = 'bg-[#377DC0] text-white border-[#377DC0]';
          return (
            <button key={dia} type="button" disabled={pasado || lleno} onClick={() => onElegirInicio(dia)}
              title={lleno ? 'El robot está alquilado este día' : undefined}
              className={`h-8 rounded-[3px] border border-transparent text-[12px] disabled:cursor-default ${clase}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarioOcupacion(props: Props) {
  const [base, setBase] = useState(() => {
    const [y, m] = props.inicio.split('-').map(Number);
    return { anio: y, mes: m - 1 };
  });
  const siguiente = base.mes === 11 ? { anio: base.anio + 1, mes: 0 } : { anio: base.anio, mes: base.mes + 1 };
  const [hy, hm] = props.hoy.split('-').map(Number);
  const esElPrimero = base.anio === hy && base.mes === hm - 1;

  const mover = (paso: number) => setBase(b => {
    const total = b.anio * 12 + b.mes + paso;
    return { anio: Math.floor(total / 12), mes: total % 12 };
  });

  return (
    <div className="mt-5 border-t border-[#E5E7EB] pt-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-[#374151]">Disponibilidad del robot</div>
        <div className="flex gap-1">
          <button type="button" onClick={() => mover(-1)} disabled={esElPrimero} aria-label="Mes anterior"
            className="p-1 rounded hover:bg-[#F3F4F6] disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente"
            className="p-1 rounded hover:bg-[#F3F4F6]"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Mes anio={base.anio} mes={base.mes} props={props} />
        <Mes anio={siguiente.anio} mes={siguiente.mes} props={props} />
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-[#616161]">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#377DC0]" /> Tu alquiler</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#E5E7EB]" /> Ocupado</span>
        <span>Tocá un día libre para empezar el alquiler ese día.</span>
      </div>
    </div>
  );
}
