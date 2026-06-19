'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, UserPlus, Check, Loader2 } from 'lucide-react';

interface LeadRow {
  id: string; name: string; phone: string; email: string;
  channel: string; message: string | null; status: string;
  created_at: string;
  property: { slug: string; title: string | null; type: string } | null;
  contacto: { id: string } | null;
}

const STATUS_OPTS = [
  { value: 'new',        label: 'Nuevo',      color: '#1B56A1', bg: '#EFF6FF' },
  { value: 'contacted',  label: 'Contactado',  color: '#D97706', bg: '#FEF3C7' },
  { value: 'qualified',  label: 'Calificado',  color: '#7C3AED', bg: '#F5F3FF' },
  { value: 'closed',     label: 'Cerrado',     color: '#15803D', bg: '#F0FDF4' },
];

export default function AdminLeadsPage() {
  const [leads,   setLeads]   = useState<LeadRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [status,  setStatus]  = useState('todos');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status !== 'todos') params.set('status', status);
      const res = await fetch(`/api/admin/leads?${params}`);
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [convId, setConvId] = useState('');

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchData();
  };

  const pasarAlCrm = async (id: string) => {
    setConvId(id);
    const res = await fetch('/api/admin/crm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: id }),
    });
    setConvId('');
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? 'No se pudo pasar el lead al CRM.');
      return;
    }
    fetchData();
  };

  const getBadge = (s: string) => {
    const opt = STATUS_OPTS.find(o => o.value === s) ?? { label: s, color: '#64748B', bg: '#F1F5F9' };
    return <span style={{ background: opt.bg, color: opt.color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{opt.label}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.85rem', fontWeight: 600, color: '#0D2D5E', background: '#fff', cursor: 'pointer' }}>
          <option value="todos">Todos los leads</option>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={fetchData}
          style={{ padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, background: '#fff', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: '0.82rem' }}>
          <RefreshCw size={14} /> Actualizar
        </button>
        <span style={{ color: '#94A3B8', fontSize: '0.82rem', marginLeft: 'auto' }}>
          {loading ? 'Cargando…' : `${total} lead${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Nombre', 'Teléfono', 'Email', 'Propiedad', 'Canal', 'Mensaje', 'Fecha', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && !loading && (
                <tr><td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>No hay leads con este filtro</td></tr>
              )}
              {leads.map((l, i) => (
                <tr key={l.id} style={{ borderTop: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ padding: '10px 14px', color: '#0D2D5E', fontWeight: 700, whiteSpace: 'nowrap' }}>{l.name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <a href={`tel:${l.phone}`} style={{ color: '#1B56A1', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>{l.phone}</a>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748B', fontSize: '0.8rem' }}>{l.email}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                    {l.property
                      ? <Link href={`/propiedad/${l.property.slug}`} target="_blank" style={{ color: '#1B56A1', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {l.property.title ?? l.property.slug}
                        </Link>
                      : <span style={{ color: '#94A3B8' }}>General</span>}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{l.channel}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 180, color: '#475569', fontSize: '0.8rem' }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {l.message ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#94A3B8', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    {new Date(l.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{getBadge(l.status)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <select
                        value={l.status}
                        onChange={e => updateStatus(l.id, e.target.value)}
                        style={{ padding: '4px 8px', border: '1.5px solid #E2E8F0', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, color: '#0D2D5E', background: '#fff', cursor: 'pointer' }}
                      >
                        {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {l.contacto ? (
                        <Link href="/admin/crm" title="Ya está en el CRM" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 7, background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          <Check size={12} /> En CRM
                        </Link>
                      ) : (
                        <button onClick={() => pasarAlCrm(l.id)} disabled={convId === l.id} title="Pasar al CRM"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 7, background: '#EFF6FF', color: '#1B56A1', border: '1px solid #BFDBFE', fontSize: '0.72rem', fontWeight: 700, cursor: convId === l.id ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                          {convId === l.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={12} />} Pasar al CRM
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pages > 1 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'center', gap: 6 }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: n === page ? '#1B56A1' : '#F8FAFC', color: n === page ? '#fff' : '#0D2D5E', fontWeight: 700, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
