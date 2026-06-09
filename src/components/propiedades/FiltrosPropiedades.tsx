'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PROPERTY_TYPES } from '@/lib/utils';

const MUNICIPIOS = [
  { value: 'La Vega',       label: 'La Vega' },
  { value: 'Sasaima',       label: 'Sasaima' },
  { value: 'Nocaima',       label: 'Nocaima' },
  { value: 'Villeta',       label: 'Villeta' },
  { value: 'Quebradanegra', label: 'Quebradanegra' },
  { value: 'Nimaima',       label: 'Nimaima' },
];

const PRECIOS = [
  { value: '',             label: 'Sin límite' },
  { value: '300000000',   label: 'Hasta $300 millones' },
  { value: '500000000',   label: 'Hasta $500 millones' },
  { value: '800000000',   label: 'Hasta $800 millones' },
  { value: '1200000000',  label: 'Hasta $1.200 millones' },
  { value: '2000000000',  label: 'Hasta $2.000 millones' },
];

export function FiltrosPropiedades() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const tipo      = searchParams.get('tipo')      ?? '';
  const municipio = searchParams.get('municipio') ?? '';
  const maxPrecio = searchParams.get('maxPrecio') ?? '';

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete('page'); // reset pagination
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const clearAll = () => router.push(pathname);

  const hasFilters = tipo || municipio || maxPrecio;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1.5px solid #E2E8F0',
      padding: '1.25rem 1.5rem',
      boxShadow: '0 4px 24px rgba(27,86,161,0.07)',
      marginBottom: '2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <SlidersHorizontal size={18} color="#1B56A1" />
        <span style={{ fontWeight: 700, color: '#0D2D5E', fontSize: '0.95rem' }}>Filtrar propiedades</span>
        {hasFilters && (
          <button
            onClick={clearAll}
            style={{
              marginLeft: 'auto', fontSize: '0.78rem', color: '#1B56A1',
              background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
              textDecoration: 'underline',
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
      }}>
        {/* Tipo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Tipo de inmueble
          </label>
          <select
            value={tipo}
            onChange={e => update('tipo', e.target.value)}
            style={{
              padding: '0.55rem 0.75rem', borderRadius: 8, fontSize: '0.88rem',
              fontWeight: 600, color: '#1E293B',
              border: '1.5px solid #CBD5E1', outline: 'none', background: '#F8FAFC', cursor: 'pointer',
            }}
          >
            <option value="">Todos los tipos</option>
            {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Municipio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Municipio
          </label>
          <select
            value={municipio}
            onChange={e => update('municipio', e.target.value)}
            style={{
              padding: '0.55rem 0.75rem', borderRadius: 8, fontSize: '0.88rem',
              fontWeight: 600, color: '#1E293B',
              border: '1.5px solid #CBD5E1', outline: 'none', background: '#F8FAFC', cursor: 'pointer',
            }}
          >
            <option value="">Todos los municipios</option>
            {MUNICIPIOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Precio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Precio máximo
          </label>
          <select
            value={maxPrecio}
            onChange={e => update('maxPrecio', e.target.value)}
            style={{
              padding: '0.55rem 0.75rem', borderRadius: 8, fontSize: '0.88rem',
              fontWeight: 600, color: '#1E293B',
              border: '1.5px solid #CBD5E1', outline: 'none', background: '#F8FAFC', cursor: 'pointer',
            }}
          >
            {PRECIOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {hasFilters && (
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tipo      && <Chip label={`Tipo: ${PROPERTY_TYPES.find(t=>t.value===tipo)?.label ?? tipo}`} onRemove={() => update('tipo','')} />}
          {municipio && <Chip label={`Municipio: ${municipio}`} onRemove={() => update('municipio','')} />}
          {maxPrecio && <Chip label={`Hasta: ${PRECIOS.find(p=>p.value===maxPrecio)?.label}`} onRemove={() => update('maxPrecio','')} />}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string | undefined; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#EFF6FF', color: '#1B56A1', fontSize: '0.78rem',
      fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      border: '1px solid #BFDBFE',
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B56A1', lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
    </span>
  );
}

// Standalone search icon para vacío
export { Search };
