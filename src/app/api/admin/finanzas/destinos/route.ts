import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { destinosRecientes, crearTerceroRapido, ErrorEgreso } from '@/lib/finanzas/egresos'

// Selector de la captura: propiedades y clientes, recientes primero, con
// búsqueda. Y alta rápida de un tercero con solo el nombre.
const ROLES = ['admin', 'contador']

export async function GET(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const q = new URL(req.url).searchParams.get('q') ?? ''
  return NextResponse.json(await destinosRecientes(q))
}

export async function POST(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  let body: { nombre?: string; rol?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  try {
    const rol = body.rol === 'PROVEEDOR' ? 'PROVEEDOR' : 'CLIENTE'
    return NextResponse.json(await crearTerceroRapido(String(body.nombre ?? ''), rol), { status: 201 })
  } catch (e) {
    if (e instanceof ErrorEgreso) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[destinos] POST', e)
    return NextResponse.json({ error: 'No se pudo crear el tercero.' }, { status: 500 })
  }
}
