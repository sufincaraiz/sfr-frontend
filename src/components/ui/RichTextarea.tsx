'use client';

import { useRef } from 'react';
import { Bold, Italic, Highlighter } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Textarea con barra de formato. Inserta marcadores tipo Markdown alrededor del
// texto seleccionado:  **negrita**  ·  *cursiva*  ·  ==resaltado==
// El render público (lib/richtext) interpreta estos mismos marcadores.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (next: string) => void;
  style?: React.CSSProperties;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  /** Muestra la línea de ayuda debajo de la barra (por defecto true). */
  hint?: boolean;
}

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 28, borderRadius: 7, border: '1.5px solid #E2E8F0',
  background: '#fff', color: '#0D2D5E', cursor: 'pointer', flexShrink: 0,
};

export function RichTextarea({ value, onChange, style, rows = 4, required, maxLength, placeholder, hint = true }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const surround = (marker: string, sample: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || sample;
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    onChange(next);
    // Reposicionar la selección sobre el texto envuelto.
    requestAnimationFrame(() => {
      ta.focus();
      const s = start + marker.length;
      ta.setSelectionRange(s, s + selected.length);
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <button type="button" onClick={() => surround('**', 'negrita')} title="Negrita" style={btnStyle}><Bold size={14} /></button>
        <button type="button" onClick={() => surround('*', 'cursiva')} title="Cursiva" style={{ ...btnStyle, fontStyle: 'italic' }}><Italic size={14} /></button>
        <button type="button" onClick={() => surround('==', 'resaltado')} title="Resaltar" style={btnStyle}><Highlighter size={14} /></button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        style={style}
      />
      {hint && (
        <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 5 }}>
          Selecciona texto y usa los botones. También puedes escribir <b>**negrita**</b>, <i>*cursiva*</i> o <mark style={{ background: '#FEF3C7' }}>==resaltado==</mark>. Separa párrafos con una línea en blanco.
        </p>
      )}
    </div>
  );
}
