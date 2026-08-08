import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { purgarVisitasVencidas } from '@/lib/retencion-visitas'

// Purga manual del registro de visitas, disparada desde el botón de
// /admin/visitas. Es el respaldo del cron diario: en el plan Hobby de Vercel los
// crons pueden saltarse ejecuciones, y la retención de 2 años que promete la
// política no puede depender de que eso siempre funcione.
//
// Borra exactamente lo mismo que el cron (misma función compartida), así que no
// hay riesgo de que los dos caminos difieran. Solo rol admin: es un borrado
// definitivo de datos personales.
//
// POST y no GET a propósito — un GET que borra datos se dispara con un prefetch
// del navegador o un crawler.

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { eliminadas, corte } = await purgarVisitasVencidas()
    // Un borrado manual de datos personales debe dejar rastro de quién lo hizo.
    console.log(
      `[admin/visitas/purgar] ${session.email} eliminó ${eliminadas} visitas anteriores a ${corte.toISOString()}.`
    )
    return NextResponse.json({ ok: true, eliminadas, corte: corte.toISOString() })
  } catch (err) {
    console.error('[admin/visitas/purgar] error purgando:', err)
    return NextResponse.json({ error: 'Error al ejecutar la limpieza.' }, { status: 500 })
  }
}
