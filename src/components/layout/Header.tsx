'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SearchBar } from '@/components/search/SearchBar';

const NAV_LINKS = [
  { href: '/propiedades?tipo=finca',      label: 'Fincas' },
  { href: '/propiedades?municipio=La Vega', label: 'La Vega' },
  { href: '/propiedades',                 label: 'Propiedades' },
  { href: '/guia-inversion',             label: 'Guía de Inversión' },
  { href: '/vender-mi-finca',            label: 'Vende tu finca' },
  { href: '/nosotros',                   label: 'Nosotros' },
  { href: '/blog',                       label: 'Blog' },
];

// Ícono hamburguesa (3 líneas)
function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="5"  width="18" height="2" rx="1" fill="white" />
      <rect x="2" y="10" width="18" height="2" rx="1" fill="white" />
      <rect x="2" y="15" width="18" height="2" rx="1" fill="white" />
    </svg>
  );
}

export function Header() {
  const [open,    setOpen]    = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cierra el menú al redimensionar a desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Bloquea el scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navLinkStyle = { color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,0.4)' };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          height: 72,
          background: scrolled ? 'rgba(13,45,94,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/images/logo-su-finca-raiz-blanco.png"
                alt="Su Finca Raíz - Inmobiliaria La Vega Cundinamarca"
                width={180}
                height={56}
                priority
                style={{ display: 'block' }}
              />
            </Link>

            {/* Nav — desktop */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={navLinkStyle}
                  className="transition-opacity hover:opacity-80"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* CTA + hamburger */}
            <div className="flex items-center gap-3">
              <Link
                href="/contacto"
                className="hidden sm:inline-flex items-center px-5 py-2 text-sm rounded-lg transition-colors"
                style={{ background: '#E8B92F', color: '#0D2D5E', fontWeight: 700 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#d4a728')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#E8B92F')}
              >
                Contáctanos
              </Link>

              {/* Botón hamburguesa */}
              <button
                aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className="lg:hidden p-2 rounded-md transition-colors hover:bg-white/10"
                style={{ color: '#FFFFFF' }}
              >
                {open ? <X size={22} color="#FFFFFF" /> : <HamburgerIcon />}
              </button>
            </div>
          </div>

          {/* Compact search — aparece al hacer scroll en desktop */}
          {scrolled && (
            <div className="pb-3 hidden lg:block -mt-1">
              <SearchBar compact />
            </div>
          )}
        </div>
      </header>

      {/* Drawer móvil — slide-down con animación 0.3s */}
      <div
        className="lg:hidden fixed inset-x-0 z-40 overflow-hidden"
        style={{
          top: 72,
          // La altura máxima del drawer es el resto de la pantalla
          maxHeight: open ? 'calc(100vh - 72px)' : '0px',
          transition: 'max-height 0.3s ease',
          overflowY: 'auto',
        }}
        aria-hidden={!open}
      >
        <div
          style={{
            background: '#0D2D5E',
            transform: open ? 'translateY(0)' : 'translateY(-8px)',
            opacity: open ? 1 : 0,
            transition: 'transform 0.3s ease, opacity 0.25s ease',
          }}
        >
          {/* Botón cerrar en esquina superior derecha */}
          <div className="flex justify-end px-4 pt-4 pb-1">
            <button
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={20} color="#FFFFFF" />
            </button>
          </div>

          {/* Links */}
          <nav className="px-5 pb-4">
            {NAV_LINKS.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center py-4 text-base font-semibold transition-colors hover:text-yellow-300"
                style={{
                  color: '#FFFFFF',
                  borderBottom: i < NAV_LINKS.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                }}
              >
                {l.label}
              </Link>
            ))}

            {/* Contáctanos dentro del drawer */}
            <div className="pt-5 pb-2">
              <Link
                href="/contacto"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full py-3.5 rounded-xl text-sm font-bold transition-colors"
                style={{ background: '#E8B92F', color: '#0D2D5E' }}
              >
                Contáctanos
              </Link>
            </div>

            {/* Buscador compacto en el drawer */}
            <div className="pb-4">
              <SearchBar compact />
            </div>
          </nav>
        </div>
      </div>

      {/* Overlay oscuro detrás del drawer */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
