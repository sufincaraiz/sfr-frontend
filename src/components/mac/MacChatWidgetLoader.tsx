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
  // No mostrar en /admin ni en sus sub-rutas
  if (pathname.startsWith('/admin')) return null
  return <MacChatWidget />
}
