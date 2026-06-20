import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlusCircle, Eye, ArrowRight, PenSquare } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { formatPrice, TYPE_LABELS } from '@/lib/utils';
import { DashboardArticles, type DashArticle } from './DashboardArticles';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireRole(['admin']);
  if (!session) redirect('/admin/login');

  // Métricas
  const [total, activas, vendidas, leads, articulosTotal, ultimasProp, ultimosLeads, ultimosArticulos] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: 'available' } }),
    prisma.property.count({ where: { status: 'sold' } }),
    prisma.lead.count(),
    prisma.article.count(),
    prisma.property.findMany({
      orderBy: { published_at: 'desc' }, take: 8,
      include: { municipality: { select: { name: true } }, media: { where: { is_primary: true }, take: 1 } },
    }),
    prisma.lead.findMany({
      orderBy: { created_at: 'desc' }, take: 6,
      include: { property: { select: { title: true, slug: true, type: true } } },
    }),
    prisma.article.findMany({
      orderBy: { created_at: 'desc' }, take: 6,
      select: { id: true, slug: true, title: true, author_name: true, author_id: true, cover_image_url: true, published_at: true, created_at: true },
    }),
  ]);

  const reservadas = await prisma.property.count({ where: { status: 'reserved' } });

  const articulosDash: DashArticle[] = ultimosArticulos.map(a => ({
    id: a.id, slug: a.slug, title: a.title, author_name: a.author_name, author_id: a.author_id,
    cover_image_url: a.cover_image_url, date: (a.published_at ?? a.created_at).toISOString(),
  }));

  const metrics = [
    { label: 'Total propiedades', value: total,     color: '#1B56A1', bg: '#EFF6FF', icon: '🏡' },
    { label: 'Disponibles',       value: activas,   color: '#15803D', bg: '#F0FDF4', icon: '✅' },
    { label: 'Reservadas',        value: reservadas, color: '#D97706', bg: '#FFFBEB', icon: '🔒' },
    { label: 'Leads recibidos',   value: leads,     color: '#7C3AED', bg: '#F5F3FF', icon: '📩' },
    { label: 'Artículos del blog', value: articulosTotal, color: '#B45309', bg: '#FEF9C3', icon: '📝' },
  ];

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      available: { label: 'Disponible', color: '#15803D', bg: '#DCFCE7' },
      reserved:  { label: 'Reservada',  color: '#D97706', bg: '#FEF3C7' },
      sold:      { label: 'Vendida',    color: '#DC2626', bg: '#FEE2E2' },
    };
    const m = map[s] ?? { label: s, color: '#64748B', bg: '#F1F5F9' };
    return (
      <span style={{ background: m.bg, color: m.color, fontWeight: 700, fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20 }}>
        {m.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Bienvenida + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.5rem', marginBottom: 4 }}>
            Bienvenido, {session.email.split('@')[0]} 👋
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
            Resumen del portal inmobiliario Su Finca Raíz
          </p>
        </div>
        <Link
          href="/admin/propiedades/nueva"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: '#E8B92F', color: '#0D2D5E', fontWeight: 800, fontSize: '0.9rem',
            padding: '11px 20px', borderRadius: 10, textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(232,185,47,0.35)',
          }}
        >
          <PlusCircle size={17} /> Nueva Propiedad
        </Link>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: '#fff', borderRadius: 14, padding: '1.25rem 1.4rem',
            border: '1px solid #F1F5F9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontSize: '1.6rem' }}>{m.icon}</span>
            <span style={{ color: m.color, fontWeight: 900, fontSize: '2rem', lineHeight: 1 }}>{m.value}</span>
            <span style={{ color: '#64748B', fontSize: '0.82rem', fontWeight: 600 }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* Tabla propiedades */}
      <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1rem' }}>Últimas propiedades</h2>
          <Link href="/admin/propiedades" style={{ color: '#1B56A1', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Foto', 'Título', 'Municipio', 'Tipo', 'Precio', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ultimasProp.map((p, i) => {
                const img = p.media[0]?.url;
                return (
                  <tr key={p.id} style={{ borderTop: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '10px 14px' }}>
                      {img
                        ? <img src={img} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                        : <div style={{ width: 48, height: 36, background: '#F1F5F9', borderRadius: 6 }} />
                      }
                    </td>
                    <td style={{ padding: '10px 14px', color: '#0D2D5E', fontWeight: 600, maxWidth: 220 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.title ?? p.slug}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{p.municipality.name}</td>
                    <td style={{ padding: '10px 14px', color: '#475569', whiteSpace: 'nowrap' }}>{TYPE_LABELS[p.type] ?? p.type}</td>
                    <td style={{ padding: '10px 14px', color: '#0D2D5E', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrice(Number(p.price_cop))}</td>
                    <td style={{ padding: '10px 14px' }}>{statusBadge(p.status)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/propiedad/${p.slug}`} target="_blank"
                          style={{ padding: '5px 10px', borderRadius: 6, background: '#EFF6FF', color: '#1B56A1', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Eye size={12} /> Ver
                        </Link>
                        <Link href={`/admin/propiedades/${p.id}`}
                          style={{ padding: '5px 10px', borderRadius: 6, background: '#F8FAFC', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>
                          Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabla leads */}
      <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1rem' }}>Últimos leads</h2>
          <Link href="/admin/leads" style={{ color: '#1B56A1', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Ver todos <ArrowRight size={13} />
          </Link>
        </div>
        {ultimosLeads.length === 0 ? (
          <p style={{ padding: '2rem', color: '#94A3B8', textAlign: 'center', fontSize: '0.9rem' }}>
            Aún no hay leads registrados.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Nombre', 'Teléfono', 'Propiedad', 'Canal', 'Fecha', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ultimosLeads.map((l, i) => (
                  <tr key={l.id} style={{ borderTop: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '10px 14px', color: '#0D2D5E', fontWeight: 600 }}>{l.name}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{l.phone}</td>
                    <td style={{ padding: '10px 14px', color: '#64748B', maxWidth: 180 }}>
                      {l.property
                        ? <Link href={`/propiedad/${l.property.slug}`} target="_blank" style={{ color: '#1B56A1', textDecoration: 'none', fontWeight: 600 }}>{l.property.title ?? l.property.slug}</Link>
                        : <span style={{ color: '#94A3B8' }}>General</span>}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748B' }}>{l.channel}</td>
                    <td style={{ padding: '10px 14px', color: '#94A3B8', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {new Date(l.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: l.status === 'new' ? '#EFF6FF' : '#F0FDF4', color: l.status === 'new' ? '#1B56A1' : '#15803D', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {l.status === 'new' ? 'Nuevo' : l.status === 'contacted' ? 'Contactado' : l.status === 'qualified' ? 'Calificado' : 'Cerrado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Blog (modo Dios: el admin ve y controla todos los artículos) */}
      <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PenSquare size={17} style={{ color: '#1B56A1' }} /> Últimos artículos del blog
          </h2>
          <Link href="/admin/blog" style={{ color: '#1B56A1', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Gestionar blog <ArrowRight size={13} />
          </Link>
        </div>
        <DashboardArticles initial={articulosDash} />
      </section>

      {/* Stats footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Vendidas', value: vendidas, color: '#DC2626' },
          { label: 'Reservadas', value: reservadas, color: '#D97706' },
          { label: 'Disponibles', value: activas, color: '#15803D' },
          { label: 'Total leads', value: leads, color: '#7C3AED' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #F1F5F9', textAlign: 'center' }}>
            <p style={{ color: s.color, fontWeight: 800, fontSize: '1.75rem', lineHeight: 1 }}>{s.value}</p>
            <p style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
