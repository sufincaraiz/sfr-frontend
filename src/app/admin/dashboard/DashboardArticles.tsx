'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Pencil, Trash2, Loader2, PenSquare } from 'lucide-react';

export interface DashArticle {
  id: string; slug: string; title: string;
  author_name: string | null; author_id: string | null;
  cover_image_url: string | null; date: string;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' });

export function DashboardArticles({ initial }: { initial: DashArticle[] }) {
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState('');

  const eliminar = async (a: DashArticle) => {
    if (!confirm(`¿Eliminar el artículo "${a.title}"?`)) return;
    setBusy(a.id);
    const res = await fetch(`/api/admin/blog?id=${a.id}`, { method: 'DELETE' });
    setBusy('');
    if (res.ok) setList(l => l.filter(x => x.id !== a.id));
    else alert('No se pudo eliminar el artículo.');
  };

  if (list.length === 0) {
    return <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center', fontSize: '0.9rem' }}>Aún no hay artículos publicados.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            {['', 'Título', 'Autor', 'Fecha', 'Acciones'].map((h, i) => (
              <th key={i} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((a, i) => (
            <tr key={a.id} style={{ borderTop: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
              <td style={{ padding: '8px 14px', width: 56 }}>
                {a.cover_image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.cover_image_url} alt="" style={{ width: 48, height: 34, objectFit: 'cover', borderRadius: 6 }} />
                  : <div style={{ width: 48, height: 34, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1' }}><PenSquare size={14} /></div>}
              </td>
              <td style={{ padding: '8px 14px', color: '#0D2D5E', fontWeight: 600, maxWidth: 280 }}>
                <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title}</span>
              </td>
              <td style={{ padding: '8px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                {a.author_name ?? '—'}{!a.author_id && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: '#94A3B8' }}>comunidad</span>}
              </td>
              <td style={{ padding: '8px 14px', color: '#94A3B8', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{fmt(a.date)}</td>
              <td style={{ padding: '8px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link href={`/blog/${a.slug}`} target="_blank" title="Ver" style={{ padding: '5px 9px', borderRadius: 7, background: '#EFF6FF', color: '#1B56A1', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem' }}><Eye size={13} /></Link>
                  <Link href={`/admin/blog?edit=${a.id}`} title="Editar" style={{ padding: '5px 9px', borderRadius: 7, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem' }}><Pencil size={13} /></Link>
                  <button onClick={() => eliminar(a)} disabled={busy === a.id} title="Eliminar" style={{ padding: '5px 9px', borderRadius: 7, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem' }}>
                    {busy === a.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
