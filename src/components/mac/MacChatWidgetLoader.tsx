'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

// Carga diferida — el widget no bloquea el bundle principal
const MacChatWidget = dynamic(() => import('./MacChatWidget'), {
  ssr: false,
  loading: () => null,
})

export function MacChatWidgetLoader() {
  const pathname = usePathname()
  // usePathname() puede ser null durante el pre-render estático (Vercel);
  // el null-guard evita que el componente falle silenciosamente en producción
  if (!pathname || pathname.startsWith('/admin')) return null
  return <MacChatWidget />
}
