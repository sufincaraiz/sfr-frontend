'use client';

import { useRef } from 'react';
import { Bold } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  style?: React.CSSProperties;
}

/**
 * Textarea con un botón «Negrilla». Envuelve lo SELECCIONADO en `**…**`, el
 * marcador de negrilla ligera que la ficha pinta en <strong> (ver
 * `src/lib/descripcion.ts`). Si lo seleccionado ya estaba en negrilla, la quita
 * (alterna). Es la forma de «poner negrilla desde el panel» sin un editor
 * enriquecido ni dependencias nuevas.
 */
export function CampoConNegrilla({ value, onChange, rows, placeholder, style }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const alternarNegrilla = () => {
    const el = ref.current;
    if (!el) return;
    const ini = el.selectionStart;
    const fin = el.selectionEnd;
    if (ini === fin) { el.focus(); return; } // sin selección, no hay nada que marcar

    const sel = value.slice(ini, fin);
    const yaNegrita = sel.length > 4 && sel.startsWith('**') && sel.endsWith('**');
    const nuevoSel = yaNegrita ? sel.slice(2, -2) : `**${sel}**`;
    const nuevo = value.slice(0, ini) + nuevoSel + value.slice(fin);
    onChange(nuevo);

    // Reposiciona la selección sobre el MISMO texto visible tras el re-render:
    // al quitar negrilla el texto queda 4 caracteres más corto; al ponerla, se
    // desplaza 2 por el `**` inicial.
    requestAnimationFrame(() => {
      el.focus();
      if (yaNegrita) el.setSelectionRange(ini, fin - 4);
      else el.setSelectionRange(ini + 2, fin + 2);
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={alternarNegrilla}
          title="Selecciona texto y pulsa aquí para ponerlo en negrilla"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#EFF6FF', color: '#1B56A1', border: '1.5px solid #BFDBFE',
            borderRadius: 8, padding: '5px 10px', fontSize: '0.78rem', fontWeight: 700,
            cursor: 'pointer', lineHeight: 1,
          }}
        >
          <Bold size={14} /> Negrilla
        </button>
        <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>
          Selecciona el texto y pulsa «Negrilla». En la ficha se verá en <strong>negrita</strong>.
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={style}
      />
    </div>
  );
}
