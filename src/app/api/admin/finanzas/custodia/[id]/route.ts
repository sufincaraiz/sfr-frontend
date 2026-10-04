import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { causarCustodia, cerrarCustodia, ErrorCustodia } from '@/lib/finanzas/custodia'

// Las tres salidas de un dinero en custodia:
//   · entregado / devuelto → sale sin ser ingreso nunca.
//   · causar               → nace el Ingreso que lo declara, enlazado.
const ROLES = ['admin', 'contador']

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await ctx.params
  let body: { accion?: string; entregado_a?: string | null; tipo_servicio_id?: string; fecha_causacion?: string | null; numero_factura?: string | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  try {
    if (body.accion === 'causar') {
      const r = await causarCustodia(id, {
        tipo_servicio_id: String(body.tipo_servicio_id ?? ''),
        fecha_causacion: body.fecha_causacion ?? null,
        numero_factura: body.numero_factura ?? null,
      }, s.nombre)
      return NextResponse.json({ ok: true, ...r })
    }
    if (body.accion === 'entregado' || body.accion === 'devuelto') {
      await cerrarCustodia(id, body.accion, body.entregado_a ?? null, s.nombre)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Acción desconocida.' }, { status: 400 })
  } catch (e) {
    if (e instanceof ErrorCustodia) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[custodia] acción', e)
    return NextResponse.json({ error: 'No se pudo completar la acción.' }, { status: 500 })
  }
}
