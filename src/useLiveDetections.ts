import { useEffect, useState } from 'react';

const BACKEND_URL = 'http://localhost:8000';

interface BackendDetection {
  id: string;
  frame: number;
  timestamp: number;
  x: number; // metros, coordenada del mundo MuJoCo
  y: number; // metros, coordenada del mundo MuJoCo
  severity: 'low' | 'medium' | 'high' | 'critical';
  types: { type: string; label: string; probability: number }[];
  image: string;
}

export interface LiveDetection {
  id: string;
  worldX: number;
  worldY: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  types: { type: string; label: string; probability: number }[];
  date: string;
  image: string;
}

export function useLiveDetections(pollMs = 3000): LiveDetection[] {
  const [detections, setDetections] = useState<LiveDetection[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetections() {
      try {
        const res = await fetch(`${BACKEND_URL}/detections`);
        const data: BackendDetection[] = await res.json();
        if (cancelled) return;

        setDetections(
          data.map(d => ({
            id: d.id,
            worldX: d.x,
            worldY: d.y,
            severity: d.severity,
            types: d.types,
            date: new Date(d.timestamp * 1000).toLocaleString('es-AR'),
            image: `${BACKEND_URL}${d.image}`,
          }))
        );
      } catch (err) {
        console.error('No se pudo conectar con el backend en', BACKEND_URL, err);
      }
    }

    fetchDetections();
    const interval = setInterval(fetchDetections, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return detections;
}