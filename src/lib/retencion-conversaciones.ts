import { prisma } from '@/lib/prisma'
import { mesesAntesEnColombia } from './dia-colombia'

// ─────────────────────────────────────────────────────────────────────────────
// Retención del contenido de las conversaciones con Mac (Ley 1581 de 2012).
//
// ⚠ POR QUÉ ESTO EXISTE. La política de tratamiento decía que el contenido de
// las consultas se almacena «temporalmente», y era falso: `conversations` y
// `messages` no tenían purga, ni plazo, ni anonimización. Se guardaban para
// siempre. Al encontrarlo había dos salidas —cambiar el texto a «se conservan
// indefinidamente» o implementar la purga— y se eligió implementarla, por tres
// razones:
//
//   1. El principio de MINIMIZACIÓN de la Ley 1581 no es una frase de la
//      política: es la obligación. La finalidad declarada es «que un asesor
//      pueda devolver el contacto»; pasado un año esa finalidad ya se cumplió o
//      ya no se va a cumplir, y el contenido deja de tener razón para estar.
//   2. Publicar «se conservan indefinidamente» habría sido cierto y peor, y
//      habría que cambiarlo igual el día que se implementara.
//   3. La maquinaria ya estaba escrita DOS veces —la purga de visitas a dos
//      años y la anonimización de accesos a doce meses— y el disparador diario
//      ya existe. El coste marginal era una función.
//
// ANONIMIZA EN VEZ DE BORRAR, igual que la bitácora del contador: la fila del
// mensaje se queda —con su `role` y su `createdAt`— y lo que se vacía es el
// CONTENIDO. Así sobrevive lo que tiene valor de negocio y de auditoría
// —cuántos turnos, cuándo, si escaló a una persona, cuántos tokens costó— y
// desaparece lo que es dato personal. Borrar la conversación entera perdería
// las métricas de uso sin ganar nada en privacidad.
//
// DOCE MESES, el mismo plazo que la bitácora de accesos. No porque dé igual:
// dos plazos distintos para dos datos de la misma familia son dos fechas que
// alguien tiene que recordar, y la política tendría que explicar por qué.
//
// Mismo disparador que las otras dos: el cron diario de /api/cron/purge-visitas.
// ─────────────────────────────────────────────────────────────────────────────

export const MESES_RETENCION_CONVERSACIONES = 12

/**
 * El contenido vaciado se marca con la cadena vacía.
 *
 * ⚠ ES LA MARCA Y ES EL FILTRO. Sin una columna nueva, `content: { not: '' }`
 * es lo que hace la pasada idempotente: un mensaje ya vaciado no vuelve a
 * entrar. Se prefirió esto a añadir una columna porque la fila ya dice todo lo
 * que hace falta —existió un mensaje, de este rol, a esta hora— y una migración
 * para marcar un vaciado que es visible en el propio dato sería ceremonia.
 */
export const CONTENIDO_VACIADO = ''

/** Fecha límite: toda conversación sin actividad antes de esto ya cumplió. */
export function fechaCorteConversaciones(): Date {
  // Calendario en Bogotá y vuelta a instante: se compara contra `updatedAt`,
  // que es un INSTANTE (cuándo se habló por última vez).
  return mesesAntesEnColombia(MESES_RETENCION_CONVERSACIONES)
}

export interface ResultadoRetencionConversaciones {
  /** Mensajes cuyo contenido se vació en esta pasada. 0 si no está autorizada. */
  vaciados: number
  /** Lo que HABRÍA vaciado. Con la purga apagada, esta es la cifra real. */
  vaciariaSiEstuvieraHabilitada: number
  /** Si la pasada tenía permiso para escribir. */
  habilitada: boolean
  /** Por qué no escribió, cuando no escribió. */
  bloqueadaPor: string | null
  /** Conversaciones que vencerán en los próximos 60 días: el aviso previo. */
  cercaDelCorte: number
  /** Conversaciones vencidas que tenían algo que vaciar. */
  conversaciones: number
  corte: Date
  /** Mensajes con contenido en TODA la tabla. Con 0, el `vaciados: 0` no dice nada. */
  conContenido: number
  /** Vencidos que SIGUEN con contenido tras la pasada: debe ser 0. */
  pendientes: number
}

/**
 * ¿ESTÁ AUTORIZADO A BORRAR?
 *
 * ⚠ ESTA ES LA ÚNICA RETENCIÓN DE LAS TRES QUE DESTRUYE MATERIA PRIMA DEL
 * NEGOCIO. Las otras dos tiran dato personal sin más valor; esta tira **lo que
 * la gente preguntó**, y saber qué preguntan los compradores vale dinero. Un
 * borrado no se revierte, así que el paso destructivo va con puerta:
 *
 *   1. `PURGA_CONVERSACIONES=1` en el entorno. Sin eso, la pasada **mide y
 *      reporta** pero no escribe. Así el código se despliega, se le ve el
 *      comportamiento en los logs durante meses y nadie borra nada por
 *      sorpresa.
 *   2. Un respaldo reciente declarado en `prisma/respaldo-conversaciones.json`
 *      —solo la FECHA y DÓNDE quedó, nunca las filas: un volcado con datos de
 *      terceros no entra al repositorio, y hay una guarda del build que lo
 *      impide—.
 *
 * Medido el 2026-10-19 contra producción: **0 conversaciones vencidas**. La más
 * antigua es del 2026-06-11, así que la primera corrida que podría borrar algo
 * es de **junio de 2027**. Hay ocho meses para decidir qué hacer con el corpus
 * de preguntas antes de que la purga tenga nada que tocar.
 */
export const PURGA_HABILITADA = (): boolean => process.env.PURGA_CONVERSACIONES === '1'

const RUTA_RESPALDO = 'prisma/respaldo-conversaciones.json'
const DIAS_VALIDEZ_RESPALDO = 30

export interface EstadoRespaldo {
  hay: boolean
  cuando: string | null
  donde: string | null
  vigente: boolean
  motivo: string | null
}

/**
 * Lee la constancia del respaldo. NO lee el respaldo: lee que existe, cuándo se
 * hizo y dónde quedó. El archivo de datos vive FUERA del repositorio.
 */
export async function estadoDelRespaldo(): Promise<EstadoRespaldo> {
  try {
    const { readFileSync } = await import('node:fs')
    const j = JSON.parse(readFileSync(RUTA_RESPALDO, 'utf8')) as
      { cuando?: string; donde?: string }
    if (!j.cuando || !j.donde) {
      return { hay: true, cuando: j.cuando ?? null, donde: j.donde ?? null, vigente: false,
        motivo: 'la constancia existe pero no dice cuándo y dónde' }
    }
    const dias = (Date.now() - new Date(j.cuando).getTime()) / 86_400_000
    if (!Number.isFinite(dias)) {
      return { hay: true, cuando: j.cuando, donde: j.donde, vigente: false, motivo: 'fecha ilegible' }
    }
    if (dias > DIAS_VALIDEZ_RESPALDO) {
      return { hay: true, cuando: j.cuando, donde: j.donde, vigente: false,
        motivo: `el respaldo tiene ${Math.floor(dias)} días (máximo ${DIAS_VALIDEZ_RESPALDO})` }
    }
    return { hay: true, cuando: j.cuando, donde: j.donde, vigente: true, motivo: null }
  } catch {
    return { hay: false, cuando: null, donde: null, vigente: false,
      motivo: `no existe ${RUTA_RESPALDO}` }
  }
}

/**
 * Conversaciones que vencerán dentro de `dias`. Es el AVISO PREVIO: convierte
 * un borrado silencioso en un borrado anunciado.
 */
export async function conversacionesCercaDelCorte(dias = 60): Promise<number> {
  const corte = fechaCorteConversaciones()
  const pronto = new Date(corte.getTime() + dias * 86_400_000)
  return prisma.conversation.count({
    where: { updatedAt: { gte: corte, lt: pronto }, messages: { some: { content: { not: CONTENIDO_VACIADO } } } },
  })
}

/**
 * Vacía el contenido de los mensajes de conversaciones sin actividad desde el
 * corte. Idempotente: `content: { not: '' }` evita reprocesar.
 *
 * SIN LAS DOS LLAVES —la variable de entorno y la constancia de respaldo
 * vigente— mide y reporta, pero no escribe.
 */
export async function anonimizarConversacionesVencidas(): Promise<ResultadoRetencionConversaciones> {
  const corte = fechaCorteConversaciones()

  /* Las conversaciones se eligen por `updatedAt` —la última vez que se habló—,
   * no por `createdAt`: una conversación de hace dos años que sigue viva este
   * mes no ha dejado de tener finalidad. */
  const vencidas = await prisma.conversation.findMany({
    where: { updatedAt: { lt: corte }, messages: { some: { content: { not: CONTENIDO_VACIADO } } } },
    select: { id: true },
  })

  /* Lo que se vaciaría, SIEMPRE calculado. Es la cifra que se reporta mientras
   * la purga está apagada, y es lo que permite verla venir. */
  const vaciaria = vencidas.length === 0 ? 0 : await prisma.message.count({
    where: { conversationId: { in: vencidas.map(c => c.id) }, content: { not: CONTENIDO_VACIADO } },
  })

  const respaldo = await estadoDelRespaldo()
  const habilitada = PURGA_HABILITADA()
  const bloqueadaPor =
    !habilitada ? 'PURGA_CONVERSACIONES no es 1: la pasada solo mide'
    : !respaldo.vigente ? `sin respaldo vigente — ${respaldo.motivo}`
    : null

  let vaciados = 0
  if (vaciaria > 0 && bloqueadaPor === null) {
    const { count } = await prisma.message.updateMany({
      where: { conversationId: { in: vencidas.map(c => c.id) }, content: { not: CONTENIDO_VACIADO } },
      data: { content: CONTENIDO_VACIADO },
    })
    vaciados = count
  }

  /* LAS DOS CIFRAS QUE CONVIERTEN EL CERO EN INFORMACIÓN, igual que en la
   * bitácora del contador: `conContenido` separa «no había nada» de «estaba
   * todo al día», y `pendientes` es lo que haría rojo a este verde. */
  const conContenido = await prisma.message.count({ where: { content: { not: CONTENIDO_VACIADO } } })
  const pendientes = await mensajesVencidosConContenido()

  return {
    vaciados, conversaciones: vencidas.length, corte, conContenido, pendientes,
    vaciariaSiEstuvieraHabilitada: vaciaria,
    habilitada, bloqueadaPor,
    cercaDelCorte: await conversacionesCercaDelCorte(60),
  }
}

/** Cuántos mensajes vencidos siguen con contenido (debería ser 0). */
export async function mensajesVencidosConContenido(): Promise<number> {
  return prisma.message.count({
    where: {
      content: { not: CONTENIDO_VACIADO },
      conversation: { updatedAt: { lt: fechaCorteConversaciones() } },
    },
  })
}
