import { NextRequest, NextResponse } from 'next/server'
import { purgarVisitasVencidas } from '@/lib/retencion-visitas'

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
    return NextResponse.json({ ok: true, eliminadas, corte: corte.toISOString() })
  } catch (err) {
    console.error('[cron/purge-visitas] error purgando:', err)
    return NextResponse.json({ error: 'Error al purgar.' }, { status: 500 })
  }
}
