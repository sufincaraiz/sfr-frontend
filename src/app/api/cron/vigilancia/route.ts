import { NextRequest, NextResponse } from 'next/server'
import { vigilarContenido } from '@/lib/vigilancia'
import { reconciliarHallazgos } from '@/lib/vigilancia-registro'
import { enviarAlertaLeadWhatsApp } from '@/lib/whatsapp'
import { latidoRedis, avisarRespaldoEnMemoria } from '@/lib/redis-salud'
import { conteoPoolAgotado } from '@/lib/pool-agotado'

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

    // DEDUPLICACIÓN: el estado se guarda en la tabla `vigilancia_hallazgos`. Solo
    // se avisa lo NUEVO o lo que sigue abierto tras N días (ver reconciliar). Si
    // la corrida fue parcial (sinComprobar), NO se marca nada resuelto: un
    // hallazgo que solo no se escaneó no está corregido.
    const rec = await reconciliarHallazgos(r.hallazgos, { marcarResueltos: r.sinComprobar.length === 0 })
    console.log(
      `[cron/vigilancia] nuevos: ${rec.nuevos.length}, re-aviso (+3d): ${rec.vencidos.length}, ` +
      `abiertos: ${rec.abiertos}, resueltos ahora: ${rec.resueltosAhora}`,
    )

    if (rec.aNotificar) {
      // WhatsApp ahora es un PUNTERO, no el contenido: el detalle vive en
      // /admin/vigilancia. Reutiliza la plantilla `nuevo_lead_sfr` (sin trámite
      // con Meta), pero como solo dispara ante cambios, deja de ahogar los leads.
      const partes: string[] = []
      if (rec.nuevos.length) partes.push(`${rec.nuevos.length} nuevo${rec.nuevos.length > 1 ? 's' : ''}`)
      if (rec.vencidos.length) partes.push(`${rec.vencidos.length} sin corregir hace +3 días`)
      await enviarAlertaLeadWhatsApp(
        '⚠ VIGILANCIA DE CONTENIDO',
        'revisar /admin/vigilancia',
        `${partes.join(' y ')}. Revísalos en el panel /admin/vigilancia.`,
      )
    }

    // LATIDO DE REDIS. Los únicos caminos que tocan Upstash son de visitante
    // (chat de Mac, PIN del dueño, registro de visitas) y con tan poco uso la
    // base entra en «inactiva» y Upstash la archiva. Un comando al día la
    // mantiene viva. Si falla, NO se cae el cron: se registra y, como Redis no
    // responder significa que los tres limitadores están en respaldo de
    // memoria, se avisa una vez al día.
    const latido = await latidoRedis()
    if (latido.escrito) {
      console.log('[cron/vigilancia] latido de Redis escrito (vigilancia:ultimo, caduca en 7 días).')
    } else {
      console.warn(`[cron/vigilancia] Redis no respondió al latido: ${latido.motivo}`)
      await avisarRespaldoEnMemoria('el cron de vigilancia', latido.motivo)
    }

    // P2024 EN PRODUCCIÓN — la señal que el build no puede dar.
    //
    // `verificar-build.mjs` cuenta los P2024 del log del build y no corre en
    // Vercel: se lanzaría a sí mismo. Envolver `next build` se descartó por
    // riesgo, así que el pool agotado se vigila donde de verdad ocurre —en
    // ejecución— con un contador en Redis que una extensión de Prisma alimenta.
    // Aquí es donde puede ponerse rojo solo, que es lo que el build no ofrece.
    const pool = await conteoPoolAgotado(7)
    if (!pool.consultado) {
      console.warn('[cron/vigilancia] contador de P2024: no se pudo consultar (Redis). ' +
        'Esto NO es un cero: es un «no sé».')
    } else if (pool.total === 0) {
      console.log('[cron/vigilancia] contador de P2024: 0 en los últimos 7 días (consultado).')
    } else {
      console.error(
        `[cron/vigilancia] ✗ ${pool.total} P2024 en 7 días: ` +
        pool.porDia.map(d => `${d.dia}=${d.veces}`).join(', ') +
        '. Pool de conexiones agotado EN PRODUCCIÓN — casi siempre consultas de ' +
        'más por petición.',
      )
      await enviarAlertaLeadWhatsApp(
        '⚠ POOL DE CONEXIONES AGOTADO',
        'revisar consultas por página',
        `${pool.total} errores P2024 en los últimos 7 días (${pool.porDia.map(d => `${d.dia}: ${d.veces}`).join(' · ')}). ` +
        'Algo está consultando la base de más por petición.',
      )
    }

    // Que falten comprobaciones no es un fallo: es Railway. Pero se reporta,
    // porque un «0 hallazgos» que en realidad no comprobó nada es peor que un
    // hallazgo.
    return NextResponse.json({ ok: true, ...r, dedup: rec, redis: latido, p2024: pool })
  } catch (err) {
    console.error('[cron/vigilancia] error:', err)
    return NextResponse.json({ error: 'Error al vigilar.' }, { status: 500 })
  }
}
