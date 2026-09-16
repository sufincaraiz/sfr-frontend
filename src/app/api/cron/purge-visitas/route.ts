import { NextRequest, NextResponse } from 'next/server'
import { purgarVisitasVencidas } from '@/lib/retencion-visitas'
import { anonimizarAccesosVencidos } from '@/lib/retencion-accesos-contador'

// ─────────────────────────────────────────────────────────────────────────────
// Purga automática del registro de visitas (retención de 2 años).
// La lógica de borrado vive en @/lib/retencion-visitas, compartida con el botón
// manual de /admin/visitas.
//
// Autenticación: Vercel Cron manda `Authorization: Bearer $CRON_SECRET` cuando
// la variable existe. FALLA CERRADO a propósito — si CRON_SECRET no está
// configurada, el endpoint responde 503 y no borra nada. Es preferible que la
// purga no corra (y se note) a que quede un endpoint de borrado abierto.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET
  if (!secreto) {
    console.error('[cron/purge-visitas] CRON_SECRET no está configurada: no se purga nada.')
    return NextResponse.json({ error: 'No configurado.' }, { status: 503 })
  }

  if (req.headers.get('authorization') !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  try {
    const { eliminadas, corte } = await purgarVisitasVencidas()
    // Queda en los logs de Vercel como evidencia de que la retención se cumple.
    console.log(`[cron/purge-visitas] Eliminadas ${eliminadas} visitas anteriores a ${corte.toISOString()}.`)

    // Misma corrida, otra retención: la bitácora del enlace del contador se
    // ANONIMIZA a los 12 meses (ip y userAgent a null), conservando fecha y
    // enlace. Va aquí y no en un cron propio porque el plan Hobby limita los
    // crons y el disparador es el mismo: una pasada diaria de retención.
    const accesos = await anonimizarAccesosVencidos()
    console.log(
      `[cron/purge-visitas] Anonimizados ${accesos.anonimizados} accesos de contador anteriores a ` +
      `${accesos.corte.toISOString()} (ip y userAgent a null; fecha y enlace conservados).`,
    )

    return NextResponse.json({
      ok: true,
      eliminadas,
      corte: corte.toISOString(),
      accesosContadorAnonimizados: accesos.anonimizados,
    })
  } catch (err) {
    console.error('[cron/purge-visitas] error purgando:', err)
    return NextResponse.json({ error: 'Error al purgar.' }, { status: 500 })
  }
}
