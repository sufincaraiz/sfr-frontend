import { NextRequest, NextResponse } from 'next/server'
import { purgarVisitasVencidas } from '@/lib/retencion-visitas'
import { anonimizarAccesosVencidos } from '@/lib/retencion-accesos-contador'
import { anonimizarConversacionesVencidas } from '@/lib/retencion-conversaciones'
import { enviarAlertaLeadWhatsApp } from '@/lib/whatsapp'

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
    /* ⚠ EL CERO DE AQUÍ TIENE DOS CAUSAS DISTINTAS Y EL MENSAJE LAS SEPARA.
     * Mientras el enlace del contador no exista, nadie escribe en esa bitácora:
     * «0 anonimizados» significa que no hay NADA, no que la retención funcione.
     * Un verde que no puede ser rojo no es un verde, así que se registra además
     * cuántas filas hay y cuántas quedaron vencidas sin anonimizar. */
    if (accesos.filas === 0) {
      console.log(
        '[cron/purge-visitas] Bitácora del enlace del contador VACÍA: nada que anonimizar. ' +
        'Este cero NO demuestra que la retención funcione — el enlace del contador todavía no ' +
        'existe, así que nadie escribe en esa tabla.',
      )
    } else {
      console.log(
        `[cron/purge-visitas] Anonimizados ${accesos.anonimizados} de ${accesos.filas} accesos de ` +
        `contador, anteriores a ${accesos.corte.toISOString()} (ip y userAgent a null; fecha y ` +
        `enlace conservados).`,
      )
      if (accesos.pendientes > 0) {
        console.error(
          `[cron/purge-visitas] ✗ ${accesos.pendientes} accesos VENCIDOS siguen con ip/userAgent ` +
          'después de la pasada. La retención NO se está cumpliendo.',
        )
      }
    }

    /* TERCERA RETENCIÓN EN LA MISMA PASADA: el contenido de las conversaciones
     * con Mac, a los doce meses. La política decía «almacenado temporalmente» y
     * no había ninguna purga; esto es lo que hace cierta la frase.
     *
     * ⚠ Y ES LA ÚNICA DE LAS TRES QUE DESTRUYE MATERIA PRIMA DEL NEGOCIO —lo
     * que la gente preguntó—, así que el paso destructivo va con dos llaves:
     * `PURGA_CONVERSACIONES=1` y una constancia de respaldo vigente. Sin ellas
     * la pasada MIDE y reporta, que es información y no es daño. */
    const conv = await anonimizarConversacionesVencidas()
    if (conv.bloqueadaPor) {
      console.log(
        `[cron/purge-visitas] Conversaciones: NO se vació nada (${conv.bloqueadaPor}). ` +
        `Vaciaría ${conv.vaciariaSiEstuvieraHabilitada} mensaje(s) de ${conv.conversaciones} ` +
        `conversación(es) vencida(s); hay ${conv.conContenido} mensaje(s) con contenido en total.`,
      )
      /* ⚠⚠ AQUÍ ESTÁ LA BOMBA DE TIEMPO, Y ESTA ES SU ALARMA.
       *
       * La política PÚBLICA promete que a los doce meses el texto se elimina. Hoy
       * eso no se incumple porque **nada ha llegado a doce meses**: la
       * conversación más antigua es del 2026-06-11 y la primera que podría
       * vencer es de junio de 2027. Pero el día que la primera venza con la
       * purga apagada, la promesa pasa a ser falsa **sin que nadie lo note**:
       * es exactamente la clase de texto que esta sesión se dedicó a cazar,
       * creada por nosotros, con fecha de activación.
       *
       * Por eso no se queda en un console.log: grita. */
      if (conv.vaciariaSiEstuvieraHabilitada > 0) {
        console.error(
          `[cron/purge-visitas] ✗✗ LA POLÍTICA PÚBLICA YA SE INCUMPLE: ` +
          `${conv.vaciariaSiEstuvieraHabilitada} mensaje(s) pasaron de 12 meses y la purga ` +
          `está apagada (${conv.bloqueadaPor}).`,
        )
        await enviarAlertaLeadWhatsApp(
          '✗ RETENCIÓN INCUMPLIDA',
          'conversaciones de +12 meses sin purgar',
          `${conv.vaciariaSiEstuvieraHabilitada} mensajes pasaron de 12 meses y la purga está ` +
          `apagada (${conv.bloqueadaPor}). La política publicada promete que se eliminan.`,
        )
      }
    } else if (conv.conContenido === 0 && conv.vaciados === 0) {
      console.log(
        '[cron/purge-visitas] Conversaciones: no hay ningún mensaje con contenido. ' +
        'Este cero NO demuestra que la retención funcione.',
      )
    } else {
      console.log(
        `[cron/purge-visitas] Conversaciones: vaciado el contenido de ${conv.vaciados} mensaje(s) ` +
        `en ${conv.conversaciones} conversación(es) sin actividad desde ` +
        `${conv.corte.toISOString()}. Quedan ${conv.conContenido} mensaje(s) con contenido, ` +
        `${conv.pendientes} de ellos vencidos.`,
      )
      if (conv.pendientes > 0) {
        console.error(
          `[cron/purge-visitas] ✗ ${conv.pendientes} mensajes VENCIDOS siguen con contenido ` +
          'después de la pasada. La retención de conversaciones NO se está cumpliendo.',
        )
      }
    }
    /* EL AVISO PREVIO. Un borrado irreversible que ocurre sin anunciarse es una
     * sorpresa; con sesenta días de aviso es una decisión. */
    if (conv.cercaDelCorte > 0) {
      console.warn(
        `[cron/purge-visitas] ⚠ ${conv.cercaDelCorte} conversación(es) vencen en los próximos ` +
        '60 días. Si la purga se habilita, su contenido se vacía y no vuelve.',
      )
    }

    return NextResponse.json({
      ok: true,
      eliminadas,
      corte: corte.toISOString(),
      accesosContadorAnonimizados: accesos.anonimizados,
      accesosContadorEnBitacora: accesos.filas,
      accesosContadorVencidosSinAnonimizar: accesos.pendientes,
      /** Con la bitácora vacía, el 0 de arriba no es evidencia de retención. */
      retencionContadorDemostrada: accesos.filas > 0 && accesos.pendientes === 0,
      conversacionesVaciadas: conv.vaciados,
      conversacionesPurgaHabilitada: conv.habilitada,
      conversacionesBloqueadaPor: conv.bloqueadaPor,
      conversacionesVaciariaSiEstuvieraHabilitada: conv.vaciariaSiEstuvieraHabilitada,
      conversacionesCercaDelCorte: conv.cercaDelCorte,
      mensajesConContenido: conv.conContenido,
      mensajesVencidosConContenido: conv.pendientes,
    })
  } catch (err) {
    console.error('[cron/purge-visitas] error purgando:', err)
    return NextResponse.json({ error: 'Error al purgar.' }, { status: 500 })
  }
}
