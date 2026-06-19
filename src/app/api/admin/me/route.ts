import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { navForRole, roleHome } from '@/lib/permissions'

// Fuente de verdad de la sesión para el cliente (layout): identidad, rol y menú.
export async function GET() {
  const s = await requireSession()
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json({
    id: s.id,
    nombre: s.nombre,
    email: s.email,
    role: s.role,
    home: roleHome(s.role),
    nav: navForRole(s.role),
  })
}
