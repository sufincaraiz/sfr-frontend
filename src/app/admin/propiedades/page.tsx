'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, Eye, Pencil, Search, RefreshCw } from 'lucide-react';
import { formatPrice, TYPE_LABELS } from '@/lib/utils';

interface PropRow {
  id: string; slug: string; title: string | null; type: string;
  status: string; price_cop: number;
  municipality: { name: string } | null;
  media: { url: string }[];
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: 'Disponible', color: '#15803D', bg: '#DCFCE7' },
  reserved:  { label: 'Reservada',  color: '#D97706', bg: '#FEF3C7' },
  sold:      { label: 'Vendida',    color: '#DC2626', bg: '#FEE2E2' },
};

export default function AdminPropiedadesPage() {
  const [rows,    setRows]    = useState<PropRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('todos');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);
      if (status !== 'todos') params.set('status', status);
      const res = await fetch(`/api/admin/properties?${params}`);
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await res.json();
      setRows(data.properties ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'available' ? 'sold' : 'available';
    await fetch(`/api/admin/properties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    fetchData();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Barra superior */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          {/* Buscador */}
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por título o slug…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.85rem', outline: 'none', color: '#0D2D5E' }}
            />
          </div>
          {/* Filtro status */}
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.85rem', fontWeight: 600, color: '#0D2D5E', background: '#fff', cursor: 'pointer' }}
          >
            <option value="todos">Todos los estados</option>
            <option value="available">Disponibles</option>
            <option value="reserved">Reservadas</option>
            <option value="sold">Vendidas</option>
          </select>
          <button onClick={fetchData} style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, background: '#fff', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: '0.82rem' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
        <Link
          href="/admin/propiedades/nueva"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E8B92F', color: '#0D2D5E', fontWeight: 800, fontSize: '0.875rem', padding: '9px 18px', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          <PlusCircle size={15} /> Nueva Propiedad
        </Link>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #F1F5F9', color: '#64748B', fontSize: '0.82rem' }}>
          {loading ? 'Cargando…' : `${total} propiedad${total !== 1 ? 'es' : ''}`}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['', 'Título', 'Municipio', 'Tipo', 'Precio', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>No hay propiedades con estos filtros</td></tr>
              )}
              {rows.map((p, i) => {
                const img = p.media?.[0]?.url;
                const s = STATUS_MAP[p.status] ?? { label: p.status, color: '#64748B', bg: '#F1F5F9' };
                return (
                  <tr key={p.id} style={{ borderTop: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '10px 14px' }}>
                      {img
                        ? <img src={img} alt="" style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 7 }} />
                        : <div style={{ width: 52, height: 38, background: '#F1F5F9', borderRadius: 7 }} />
                      }
                    </td>
                    <td style={{ padding: '10px 14px', color: '#0D2D5E', fontWeight: 600, maxWidth: 220 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.title ?? p.slug}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{p.municipality?.name ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{TYPE_LABELS[p.type] ?? p.type}</td>
                    <td style={{ padding: '10px 14px', color: '#0D2D5E', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(p.price_cop)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: s.bg, color: s.color, fontWeight: 700, fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20 }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
                        <Link href={`/propiedad/${p.slug}`} target="_blank"
                          style={{ padding: '5px 9px', borderRadius: 6, background: '#EFF6FF', color: '#1B56A1', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Eye size={12} />
                        </Link>
                        <Link href={`/admin/propiedades/${p.id}`}
                          style={{ padding: '5px 9px', borderRadius: 6, background: '#F8FAFC', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Pencil size={12} />
                        </Link>
                        <button
                          onClick={() => toggleStatus(p.id, p.status)}
                          title={p.status === 'available' ? 'Marcar como vendida' : 'Marcar como disponible'}
                          style={{
                            padding: '5px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem',
                            background: p.status === 'available' ? '#FEE2E2' : '#DCFCE7',
                            color: p.status === 'available' ? '#DC2626' : '#15803D',
                          }}
                        >
                          {p.status === 'available' ? '✕' : '✓'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pages > 1 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'center', gap: 6 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: page === 1 ? '#F8FAFC' : '#fff', color: page === 1 ? '#CBD5E1' : '#0D2D5E', fontWeight: 700, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
              ‹
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: n === page ? '#1B56A1' : '#F8FAFC', color: n === page ? '#fff' : '#0D2D5E', fontWeight: 700, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: page === pages ? '#F8FAFC' : '#fff', color: page === pages ? '#CBD5E1' : '#0D2D5E', fontWeight: 700, cursor: page === pages ? 'not-allowed' : 'pointer' }}>
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
