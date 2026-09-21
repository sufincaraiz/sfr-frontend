import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { marcarReembolsado, asumirComoGasto, ErrorEgreso } from '@/lib/finanzas/egresos'

// Acciones sobre una cuenta por cobrar. Saldar NO crea un ingreso: cancela la
// cuenta. Asumirla la convierte en gasto, con motivo y rastro.
const ROLES = ['admin', 'contador']

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params
  let body: { accion?: string; motivo?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  try {
    if (body.accion === 'reembolsado') await marcarReembolsado(id, s.nombre)
    else if (body.accion === 'asumir') await asumirComoGasto(id, String(body.motivo ?? ''), s.nombre)
    else return NextResponse.json({ error: 'Acción desconocida.' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ErrorEgreso) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[egresos] acción', e)
    return NextResponse.json({ error: 'No se pudo completar la acción.' }, { status: 500 })
  }
}
