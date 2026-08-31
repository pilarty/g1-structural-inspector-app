import { useEffect, useState } from 'react';

const BACKEND_URL = 'http://localhost:8000';

// Viewbox del plano SVG (igual al que ya usaba App.tsx) y margen para
// que el contorno de la habitación no toque los bordes del panel.
const CANVAS_W = 800;
const CANVAS_H = 600;
const PAD = 60;

export interface RoomLayout {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  floorPolygon: [number, number][]; // en metros, coordenadas del mundo MuJoCo
}

export function useRoomLayout() {
  const [room, setRoom] = useState<RoomLayout | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoom() {
      try {
        const res = await fetch(`${BACKEND_URL}/room`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data) return; // /room devuelve null hasta que corra extraer_dimensiones.py
        setRoom({
          xMin: data.x_min,
          xMax: data.x_max,
          yMin: data.y_min,
          yMax: data.y_max,
          floorPolygon: data.floor_polygon,
        });
      } catch (err) {
        console.error('No se pudo obtener el layout de la habitación', err);
      }
    }

    fetchRoom();
    // Reintenta cada 5s hasta que extraer_dimensiones.py haya corrido y
    // el backend tenga el layout disponible.
    const interval = setInterval(fetchRoom, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return room;
}

/** Convierte un punto en metros (mundo MuJoCo) a coordenadas de píxel
 * dentro del viewBox 800x600 del plano, preservando la proporción real
 * de la habitación (no la estira para que "quede linda"). */
export function worldToCanvas(x: number, y: number, room: RoomLayout) {
  const width = room.xMax - room.xMin || 1;
  const depth = room.yMax - room.yMin || 1;
  const scale = Math.min((CANVAS_W - PAD * 2) / width, (CANVAS_H - PAD * 2) / depth);

  const drawWidth = width * scale;
  const drawHeight = depth * scale;
  const offsetX = (CANVAS_W - drawWidth) / 2;
  const offsetY = (CANVAS_H - drawHeight) / 2;

  return {
    px: offsetX + (x - room.xMin) * scale,
    py: offsetY + (y - room.yMin) * scale,
  };
}

/** Píxel del viewBox -> porcentaje, para usar en `left`/`top` de los pines
 * (que se posicionan como % del div contenedor, igual que antes). */
export function canvasToPercent(px: number, py: number) {
  return { x: (px / CANVAS_W) * 100, y: (py / CANVAS_H) * 100 };
}