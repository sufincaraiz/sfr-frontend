import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { detalleIngreso, actualizarIngreso, ErrorCompletar, type EdicionIngreso } from '@/lib/finanzas/completar'

// Detalle y edición de un ingreso. Mismas reglas que el gasto: lista blanca en
// el servidor, derivados recalculados aquí y nunca recibidos del cliente.
const ROLES = ['admin', 'contador']

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  const d = await detalleIngreso(id)
  if (!d) return NextResponse.json({ error: 'Ese ingreso no existe.' }, { status: 404 })
  return NextResponse.json(d)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  let body: EdicionIngreso
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  try {
    const r = await actualizarIngreso(id, body, s.nombre)
    revalidatePath('/admin/finanzas')
    revalidatePath('/admin/finanzas/reportes')
    return NextResponse.json(r)
  } catch (e) {
    if (e instanceof ErrorCompletar) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[ingresos] PATCH', e)
    return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
  }
}
