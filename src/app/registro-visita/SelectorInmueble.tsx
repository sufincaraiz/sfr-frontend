'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import type { PropiedadOpcion } from './page';

export type SeleccionInmueble =
  | { tipo: 'catalogo'; id: string; titulo: string }
  | { tipo: 'otro' }
  | null;

const inputStyle: React.CSSProperties = {
  padding: '12px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10,
  fontSize: '0.95rem', outline: 'none', color: '#0D2D5E', background: '#fff',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
};

const OTRO_LABEL = 'Otro (inmueble no listado)';

/** Normaliza para buscar ignorando tildes y mayúsculas. */
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface Props {
  propiedades: PropiedadOpcion[];
  seleccion: SeleccionInmueble;
  onSeleccion: (s: SeleccionInmueble) => void;
  textoOtro: string;
  onTextoOtro: (v: string) => void;
  placeholder: string;
}

export function SelectorInmueble({
  propiedades, seleccion, onSeleccion, textoOtro, onTextoOtro, placeholder,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const cajaRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera.
  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const filtradas = useMemo(() => {
    const q = norm(busqueda.trim());
    if (!q) return propiedades;
    return propiedades.filter(p => norm(`${p.titulo} ${p.municipio}`).includes(q));
  }, [busqueda, propiedades]);

  const elegir = (s: SeleccionInmueble) => {
    onSeleccion(s);
    setAbierto(false);
    setBusqueda('');
  };

  const limpiar = () => {
    onSeleccion(null);
    onTextoOtro('');
    setBusqueda('');
  };

  // ── Ya hay algo elegido: se muestra como ficha, no como buscador ──
  if (seleccion) {
    const etiqueta = seleccion.tipo === 'catalogo' ? seleccion.titulo : OTRO_LABEL;
    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          border: '1.5px solid #1B56A1', background: '#EFF6FF', borderRadius: 10,
          padding: '11px 12px',
        }}>
          <Check size={17} color="#1B56A1" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '0.92rem', color: '#0D2D5E', fontWeight: 600, lineHeight: 1.35 }}>
            {etiqueta}
          </span>
          <button
            type="button"
            onClick={limpiar}
            aria-label="Cambiar inmueble"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 2, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {seleccion.tipo === 'otro' && (
          <input
            value={textoOtro}
            onChange={e => onTextoOtro(e.target.value)}
            placeholder="Escribe la referencia o nombre del inmueble"
            autoFocus
            required
            maxLength={200}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        )}
      </div>
    );
  }

  // ── Buscador ──
  return (
    <div ref={cajaRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }}
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls="lista-inmuebles"
          autoComplete="off"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') setAbierto(false);
            if (e.key === 'Enter') {
              e.preventDefault(); // no enviar el formulario desde el buscador
              const primera = filtradas[0];
              if (primera) elegir({ tipo: 'catalogo', id: primera.id, titulo: primera.titulo });
            }
          }}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingLeft: 36, paddingRight: 34 }}
        />
        <ChevronDown
          size={16}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }}
        />
      </div>

      {abierto && (
        <ul
          id="lista-inmuebles"
          role="listbox"
          style={{
            position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0,
            maxHeight: 260, overflowY: 'auto', margin: 0, padding: 4,
            background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 10,
            boxShadow: '0 10px 30px rgba(13,45,94,0.12)', listStyle: 'none',
          }}
        >
          {filtradas.map(p => (
            <li key={p.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => elegir({ tipo: 'catalogo', id: p.id, titulo: p.titulo })}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', cursor: 'pointer', padding: '9px 10px', borderRadius: 7,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ display: 'block', fontSize: '0.88rem', color: '#0D2D5E', fontWeight: 600, lineHeight: 1.35 }}>
                  {p.titulo}
                </span>
                {p.municipio && (
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#94A3B8', marginTop: 1 }}>
                    {p.municipio}
                  </span>
                )}
              </button>
            </li>
          ))}

          {filtradas.length === 0 && (
            <li style={{ padding: '10px', fontSize: '0.83rem', color: '#94A3B8' }}>
              Ningún inmueble coincide. Usa “{OTRO_LABEL}”.
            </li>
          )}

          {/* Siempre disponible al final, coincida o no la búsqueda. */}
          <li role="option" aria-selected={false} style={{ borderTop: '1px solid #F1F5F9', marginTop: 4, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => elegir({ tipo: 'otro' })}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none',
                border: 'none', cursor: 'pointer', padding: '9px 10px', borderRadius: 7,
                fontSize: '0.86rem', color: '#1B56A1', fontWeight: 700, fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              ➕ {OTRO_LABEL}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
