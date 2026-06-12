'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// El lightbox (y la librería YARL) se cargan de forma diferida y solo en
// cliente: no entran al bundle inicial ni al HTML indexable.
const EventoLightbox = dynamic(() => import('./EventoLightbox'), { ssr: false });

// Ventana del evento "421 años de La Vega", a prueba de zona horaria.
// Los offsets -05:00 (hora Colombia) hacen que getTime() devuelva el epoch UTC
// correcto sin importar la zona del visitante.
const START = new Date('2026-06-12T00:00:00-05:00').getTime();
const END   = new Date('2026-06-16T00:00:00-05:00').getTime(); // visible todo el 15, desaparece al entrar el 16

export function EventoPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const now = Date.now();
    if (now < START || now >= END) return; // fuera de fechas → no se monta
    setShow(true);                         // dentro del rango: aparece en cada carga de la home
  }, []);

  if (!show) return null;

  return <EventoLightbox onClose={() => setShow(false)} />;
}
