import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { marcarReembolsado, asumirComoGasto, adjuntarRecibo, ErrorEgreso } from '@/lib/finanzas/egresos'
import { detalleEgreso, actualizarEgreso, ErrorCompletar, type EdicionEgreso } from '@/lib/finanzas/completar'
import { revalidatePath } from 'next/cache'

// Detalle, edición y acciones de un gasto. Las acciones sobre una cuenta por
// cobrar: saldar NO crea un ingreso —cancela la cuenta—; asumirla la convierte
// en gasto, con motivo y rastro.
const ROLES = ['admin', 'contador']

/** Detalle para completar en el escritorio: espejo fiel de la base. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  const d = await detalleEgreso(id)
  if (!d) return NextResponse.json({ error: 'Ese gasto no existe.' }, { status: 404 })
  return NextResponse.json(d)
}

/**
 * Edición. El cuerpo pasa por LISTA BLANCA en `actualizarEgreso`: un campo no
 * enumerado se rechaza en vez de ignorarse, para que nadie crea que escribió
 * algo que no se guardó.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await ctx.params
  let body: EdicionEgreso
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  try {
    const r = await actualizarEgreso(id, body, s.nombre)
    // El hub y los reportes leen cifras DERIVADAS de esto (resultado del mes,
    // conteos por completar, gastos por categoría). Son rutas dinámicas, así
    // que no hay caché que invalidar, pero se declara el vínculo por si alguna
    // pasa a estática: el fallo sería silencioso.
    revalidatePath('/admin/finanzas')
    revalidatePath('/admin/finanzas/reportes')
    return NextResponse.json(r)
  } catch (e) {
    if (e instanceof ErrorCompletar) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[egresos] PATCH', e)
    return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params
  let body: { accion?: string; motivo?: string; public_id?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  try {
    if (body.accion === 'adjuntar-recibo') {
      // El reintento de una foto que no subió, y el botón «Adjuntar recibo»
      // de un gasto viejo: el mismo camino.
      const r = await adjuntarRecibo(id, String(body.public_id ?? ''), s.nombre)
      return NextResponse.json({ ok: true, por_completar: r.por_completar })
    }
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
