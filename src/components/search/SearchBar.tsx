'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { MUNICIPALITIES, PROPERTY_TYPES } from '@/lib/utils';

interface SearchBarProps {
  compact?: boolean;
}

export function SearchBar({ compact = false }: SearchBarProps) {
  const router = useRouter();
  const [tipo,      setTipo]      = useState('');
  const [municipio, setMunicipio] = useState('');
  const [precioMax, setPrecioMax] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (tipo)      params.set('tipo',      tipo);
    if (municipio) params.set('municipio', municipio);
    if (precioMax) params.set('maxPrecio', precioMax);
    router.push(`/propiedades?${params.toString()}`);
  };

  if (compact) {
    return (
      <form
        onSubmit={handleSearch}
        role="search"
        aria-label="Buscar propiedades"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#FFFFFF',
          borderRadius: 10,
          padding: '0 12px',
          height: 56,
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
        }}
      >
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          aria-label="Tipo de inmueble"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#2C2C2C',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">Tipo</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <span style={{ color: '#CBD5E1', fontSize: 18 }}>|</span>

        <select
          value={municipio}
          onChange={(e) => setMunicipio(e.target.value)}
          aria-label="Municipio"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#2C2C2C',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">Municipio</option>
          {MUNICIPALITIES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <button
          type="submit"
          aria-label="Buscar"
          style={{
            padding: '6px 14px',
            background: '#1B56A1',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Search size={13} />
          Buscar
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSearch}
      className="w-full max-w-3xl mx-auto"
      role="search"
      aria-label="Buscar fincas y propiedades en Cundinamarca"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 border border-white/20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">

          <div className="flex flex-col gap-1">
            <label htmlFor="search-tipo" className="text-xs font-bold text-stone/60 uppercase tracking-wider">
              Tipo de inmueble
            </label>
            <select
              id="search-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full bg-white rounded-lg px-3 py-2.5 text-sm font-semibold outline-none" style={{ color: '#2C2C2C', border: '1.5px solid #1B56A1' }}
            >
              <option value="">Todos los tipos</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="search-municipio" className="text-xs font-bold text-stone/60 uppercase tracking-wider">
              Municipio
            </label>
            <select
              id="search-municipio"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              className="w-full bg-white rounded-lg px-3 py-2.5 text-sm font-semibold outline-none" style={{ color: '#2C2C2C', border: '1.5px solid #1B56A1' }}
            >
              <option value="">Todos los municipios</option>
              {MUNICIPALITIES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="search-precio" className="text-xs font-bold text-stone/60 uppercase tracking-wider">
              Precio máximo
            </label>
            <select
              id="search-precio"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              className="w-full bg-white rounded-lg px-3 py-2.5 text-sm font-semibold outline-none" style={{ color: '#2C2C2C', border: '1.5px solid #1B56A1' }}
            >
              <option value="">Sin límite</option>
              <option value="200000000">Hasta $200 millones</option>
              <option value="500000000">Hasta $500 millones</option>
              <option value="1000000000">Hasta $1.000 millones</option>
              <option value="2000000000">Hasta $2.000 millones</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
          style={{ background: '#E8B92F', color: '#0D2D5E', fontWeight: 700 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#d4a728')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#E8B92F')}
        >
          <Search size={17} />
          Buscar propiedades
        </button>
      </div>
    </form>
  );
}
