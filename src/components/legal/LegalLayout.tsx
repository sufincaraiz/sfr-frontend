import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  updated: string;        // ej. "12 de junio de 2026"
  breadcrumbLabel: string;
  children: React.ReactNode;
}

/**
 * Estructura común de las páginas legales (Términos, Datos, Cookies).
 * El contenido se pasa como children y se estiliza de forma consistente
 * con la clase .legal-prose (ver el <style> al final).
 */
export function LegalLayout({ title, updated, breadcrumbLabel, children }: LegalLayoutProps) {
  return (
    <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(2.25rem,6vw,3.5rem) 1.5rem' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem,4vw,2.3rem)', lineHeight: 1.2, marginBottom: 10 }}>
            {title}
          </h1>
          <p style={{ color: '#E8B92F', fontSize: '0.85rem', fontWeight: 700 }}>
            Última actualización: {updated}
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ maxWidth: 820, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
        <ChevronRight size={13} />
        <span style={{ color: '#0D2D5E', fontWeight: 600 }}>{breadcrumbLabel}</span>
      </nav>

      {/* Contenido */}
      <article className="legal-prose" style={{ maxWidth: 820, margin: '0 auto', padding: '1rem 1.5rem 5rem' }}>
        {children}
      </article>

      {/* Estilos del contenido legal */}
      <style>{`
        .legal-prose h2 {
          color: #0D2D5E;
          font-weight: 800;
          font-size: 1.15rem;
          margin: 2rem 0 0.75rem;
          padding-left: 0.75rem;
          border-left: 4px solid #E8B92F;
          line-height: 1.3;
        }
        .legal-prose p {
          color: #475569;
          font-size: 0.97rem;
          line-height: 1.75;
          margin-bottom: 1rem;
        }
        .legal-prose ul {
          margin: 0 0 1.25rem;
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .legal-prose li {
          color: #475569;
          font-size: 0.97rem;
          line-height: 1.65;
        }
        .legal-prose li::marker { color: #1B56A1; }
        .legal-prose strong { color: #0D2D5E; font-weight: 700; }
        .legal-prose a { color: #1B56A1; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
        .legal-prose .intro {
          color: #334155;
          font-size: 1.02rem;
          line-height: 1.8;
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 1.25rem 1.4rem;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </main>
  );
}
