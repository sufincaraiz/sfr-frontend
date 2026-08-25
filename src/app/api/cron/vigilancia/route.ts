import { NextRequest, NextResponse } from 'next/server'
import { vigilarContenido } from '@/lib/vigilancia'
import { enviarAlertaLeadWhatsApp } from '@/lib/whatsapp'

// ─────────────────────────────────────────────────────────────────────────────
// VIGILANCIA DIARIA DEL CONTENIDO PUBLICADO
//
// Las guardas del build protegen el despliegue. Esto protege el hueco entre
// despliegues: un `UPDATE` desde el admin puede degradar el contenido y nadie
// se entera hasta el siguiente build, que puede tardar semanas.
//
// AVISA, NO BLOQUEA. Aquí no hay nada que romper: si esto falla, el sitio sigue
// igual. Por eso puede consultar la base sin el cuidado que exigen las guardas.
//
// Autenticación: mismo patrón que /api/cron/purge-visitas — Vercel Cron manda
// `Authorization: Bearer $CRON_SECRET`. Falla cerrado: sin CRON_SECRET responde
// 503 y no hace nada. Aquí no borra nada, pero el resultado enumera contenido
// interno y no debe quedar abierto.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET
  if (!secreto) {
    console.error('[cron/vigilancia] CRON_SECRET no está configurada: no se vigila nada.')
    return NextResponse.json({ error: 'No configurado.' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  try {
    const r = await vigilarContenido()

    // Los logs de Vercel son la evidencia de que la vigilancia corrió, tanto si
    // encuentra algo como si no. Un cron silencioso que dejó de ejecutarse es
    // indistinguible de uno que no encuentra nada.
    console.log(
      `[cron/vigilancia] ${r.hallazgos.length} hallazgo(s). ` +
      `Comprobado: ${r.comprobado.join(', ') || 'nada'}. ` +
      `Sin comprobar: ${r.sinComprobar.join(', ') || 'nada'}.`,
    )
    for (const h of r.hallazgos) console.log(`[cron/vigilancia]   · ${h.clase}: ${h.detalle}`)

    if (r.hallazgos.length > 0) {
      // Se reutiliza el canal de los leads a propósito: es el que el titular ya
      // mira. Va por la plantilla `nuevo_lead_sfr`, así que el primer parámetro
      // —que en un lead es el nombre— se usa como titular del aviso.
      const porClase = new Map<string, number>()
      for (const h of r.hallazgos) porClase.set(h.clase, (porClase.get(h.clase) ?? 0) + 1)
      const resumen =
        [...porClase].map(([c, n]) => `${n} ${c}`).join('; ') +
        '. Primero: ' + (r.hallazgos[0]?.detalle ?? '')

      await enviarAlertaLeadWhatsApp(
        '⚠ VIGILANCIA DE CONTENIDO',
        'revisar /admin',
        resumen,
      )
    }

    // Que falten comprobaciones no es un fallo: es Railway. Pero se reporta,
    // porque un «0 hallazgos» que en realidad no comprobó nada es peor que un
    // hallazgo.
    return NextResponse.json({ ok: true, ...r })
  } catch (err) {
    console.error('[cron/vigilancia] error:', err)
    return NextResponse.json({ error: 'Error al vigilar.' }, { status: 500 })
  }
}
