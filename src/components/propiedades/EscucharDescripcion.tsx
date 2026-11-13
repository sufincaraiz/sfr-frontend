'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';

interface Props {
  /** Texto YA en plano (sin marcadores **). Se pasa por `descripcionPlana`. */
  texto: string;
}

/**
 * Botón «Escuchar descripción»: lee la descripción en voz alta con la API del
 * navegador (speechSynthesis). No usa ningún servicio externo, así que no toca
 * la CSP ni envía el texto a ningún lado.
 *
 * - Troceamos por frases y encolamos varias `utterance`: Chrome corta la lectura
 *   de un texto largo a los ~15 s si va en una sola.
 * - Si el navegador no soporta la API, el botón no se muestra.
 */
export function EscucharDescripcion({ texto }: Props) {
  const [hablando, setHablando] = useState(false);
  const [soportado, setSoportado] = useState(false);
  // Evita quedar «hablando» si el componente se desmonta a mitad de lectura.
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    setSoportado(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      vivo.current = false;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const vozEspanol = () => {
    const voces = window.speechSynthesis.getVoices();
    return voces.find(v => /^es\b/i.test(v.lang) || v.lang.toLowerCase().startsWith('es')) ?? null;
  };

  const alternar = () => {
    const synth = window.speechSynthesis;
    if (hablando) {
      synth.cancel();
      setHablando(false);
      return;
    }
    const limpio = texto.trim();
    if (!limpio) return;
    synth.cancel();

    const trozos = limpio.match(/[^.!?\n]+[.!?]*\s*/g) ?? [limpio];
    const voz = vozEspanol();
    trozos.forEach((t, i) => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = voz?.lang ?? 'es-ES';
      if (voz) u.voice = voz;
      u.rate = 1;
      u.pitch = 1;
      if (i === trozos.length - 1) {
        u.onend = () => { if (vivo.current) setHablando(false); };
      }
      u.onerror = () => { if (vivo.current) setHablando(false); };
      synth.speak(u);
    });
    setHablando(true);
  };

  if (!soportado) return null;

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={hablando ? 'Detener la lectura de la descripción' : 'Escuchar la descripción en voz alta'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: hablando ? '#EFF6FF' : '#fff',
        color: '#1B56A1',
        border: '1.5px solid #BFDBFE',
        borderRadius: 10,
        padding: '7px 12px',
        fontSize: '0.82rem',
        fontWeight: 700,
        cursor: 'pointer',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {hablando ? <><Square size={15} /> Detener</> : <><Volume2 size={15} /> Escuchar</>}
    </button>
  );
}
