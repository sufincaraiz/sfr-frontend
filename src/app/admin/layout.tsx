'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Home, PlusCircle, Users, Contact, Shield, ExternalLink,
  LogOut, Menu, X, ChevronRight, FileText, Store, Loader2,
} from 'lucide-react';

// Mapa nombre-de-icono → componente (los nombres vienen de permissions.ts, edge-safe)
const ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  LayoutDashboard, Home, PlusCircle, Users, Contact, Shield, FileText, Store,
};

interface Me {
  nombre: string;
  role: string;
  home: string;
  nav: { href: string; label: string; icon: string }[];
}

// Inline style helpers
const hoverIn  = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; };
const hoverOut = (e: React.MouseEvent<HTMLElement>, col = 'rgba(255,255,255,0.65)') => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = col; };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);
  const [me,   setMe]   = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  // No layout (ni fetch de sesión) en la página de login
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (isLogin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.status === 401) { router.replace('/admin/login'); return; }
        const data = (await res.json()) as Me;
        if (!cancelled) { setMe(data); setReady(true); }
      } catch {
        if (!cancelled) router.replace('/admin/login');
      }
    })();
    return () => { cancelled = true; };
  }, [isLogin, router]);

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (isLogin) return <>{children}</>;

  if (!ready || !me) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7FA' }}>
        <Loader2 size={28} style={{ color: '#1B56A1', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const nav = me.nav;
  const canCreateProperty = nav.some(n => n.href === '/admin/propiedades/nueva');

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  // Título de la página: ítem de nav con prefijo más específico que matchee la ruta
  const pageTitle = (() => {
    if (pathname.startsWith('/admin/propiedades/') && pathname !== '/admin/propiedades/nueva') return 'Editar Propiedad';
    const matches = nav.filter(n => pathname === n.href || pathname.startsWith(n.href + '/'));
    if (matches.length) return matches.reduce((a, b) => (b.href.length > a.href.length ? b : a)).label;
    return 'Admin';
  })();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F7FA' }}>

      {/* Overlay móvil */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className="admin-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, zIndex: 50,
          background: '#0D2D5E', display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s ease',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '1.25rem 1.1rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Image src="/images/logo-su-finca-raiz-blanco.png" alt="Su Finca Raíz" width={140} height={42} />
            <button
              onClick={() => setOpen(false)}
              className="lg-hide"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 2 }}
            >
              <X size={18} />
            </button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', marginTop: 8, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Panel Administrativo
          </p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
          {nav.map(item => {
            const isActive = pathname === item.href
              || (item.href !== '/admin/dashboard'
                  && item.href !== '/admin/propiedades/nueva'
                  && pathname.startsWith(item.href));
            const Icon = ICONS[item.icon] ?? Home;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, marginBottom: 3,
                  textDecoration: 'none', fontWeight: 600, fontSize: '0.87rem',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                  background: isActive ? '#1B56A1' : 'transparent',
                  borderLeft: `3px solid ${isActive ? '#E8B92F' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={16} />
                {item.label}
                {isActive && <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
              </Link>
            );
          })}

          {/* Ver sitio */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, marginTop: 6,
              textDecoration: 'none', fontWeight: 600, fontSize: '0.87rem',
              color: 'rgba(255,255,255,0.4)', borderLeft: '3px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={hoverIn}
            onMouseLeave={e => hoverOut(e, 'rgba(255,255,255,0.4)')}
          >
            <ExternalLink size={16} />
            Ver sitio web
          </a>
        </nav>

        {/* Footer sidebar */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ padding: '8px 12px', marginBottom: 8 }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Sesión</p>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.nombre}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#FCA5A5', fontWeight: 700, fontSize: '0.85rem', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="admin-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30, height: 64,
          background: '#fff', borderBottom: '1px solid #E2E8F0',
          padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setOpen(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0D2D5E', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}
            >
              <Menu size={21} />
            </button>
            <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
              {pageTitle}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {canCreateProperty && (
              <Link
                href="/admin/propiedades/nueva"
                style={{
                  background: '#E8B92F', color: '#0D2D5E', fontWeight: 700, fontSize: '0.8rem',
                  padding: '7px 14px', borderRadius: 8, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <PlusCircle size={14} /> Nueva
              </Link>
            )}
            <div style={{
              width: 34, height: 34, borderRadius: '50%', background: '#1B56A1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
            }}>
              {me.nombre.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, padding: '1.75rem 1.5rem', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (min-width: 1024px) {
          .admin-sidebar { transform: translateX(0) !important; }
          .admin-main    { margin-left: 260px !important; }
          .lg-hide       { display: none !important; }
        }
      `}</style>
    </div>
  );
}
