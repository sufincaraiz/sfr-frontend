'use client';

import { usePathname } from 'next/navigation';

// Oculta el chrome del sitio público (header, footer, botones flotantes) dentro de /admin,
// que tiene su propio layout. Mismo criterio que MacChatWidgetLoader.
// El null-guard de pathname evita fallos durante el pre-render estático en Vercel.
export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (!pathname || pathname.startsWith('/admin')) return null;
  return <>{children}</>;
}
