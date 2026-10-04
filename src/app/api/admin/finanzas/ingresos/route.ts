import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import {
  crearIngreso, estadoDelAnio, listarIngresos, tiposParaCaptura, ErrorIngreso, type EntradaIngreso,
} from '@/lib/finanzas/ingresos'

// Captura y listado de ingresos. admin y contador, igual que los egresos.
const ROLES = ['admin', 'contador']

export async function GET(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const p = new URL(req.url).searchParams
  if (p.get('vista') === 'captura') {
    // El estado del año viaja con los tipos: la pantalla necesita saber si
    // puede ofrecer los campos de IVA antes de pintarlos.
    const [tipos, anio] = await Promise.all([tiposParaCaptura(), estadoDelAnio()])
    return NextResponse.json({ tipos, anio })
  }
  return NextResponse.json({
    ingresos: await listarIngresos({
      tipo_servicio_id: p.get('tipo') ?? undefined,
      estado: p.get('estado') ?? undefined,
    }),
  })
}

export async function POST(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: EntradaIngreso
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  try {
    return NextResponse.json(await crearIngreso(body, s.nombre), { status: 201 })
  } catch (e) {
    if (e instanceof ErrorIngreso) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[ingresos] POST', e)
    return NextResponse.json({ error: 'No se pudo guardar el ingreso.' }, { status: 500 })
  }
}
