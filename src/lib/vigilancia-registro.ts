/**
 * REGISTRO Y DEDUPLICACIÓN DE HALLAZGOS DE VIGILANCIA
 * ===================================================
 *
 * El cron corría a diario y avisaba lo MISMO cada día, por el canal de los
 * leads. Esto le da memoria: cada hallazgo se identifica por un hash estable
 * (clase + detalle) y solo se notifica lo NUEVO o lo que sigue abierto tras N
 * días. Cuando una corrida deja de ver un hash, se marca `resuelto`.
 *
 * GUARDA CONTRA CORRIDA PARCIAL: si alguna comprobación no pudo correr (Railway
 * lento), `marcarResueltos` llega en false y NO se resuelve nada — un hallazgo
 * que solo no se escaneó no es un hallazgo corregido. Se siguen registrando los
 * nuevos, pero no se cierra a ciegas.
 */
import { createHash } from 'node:crypto'
import { diaEnColombia } from '@/lib/dia-colombia'
import { prisma } from '@/lib/prisma'
import type { Hallazgo } from '@/lib/vigilancia'

const DIA_MS = 24 * 60 * 60 * 1000

/** Identidad estable del hallazgo: mismo texto → mismo hash → no se re-avisa. */
export function hashHallazgo(h: Hallazgo): string {
  return createHash('sha1').update(`${h.clase}\u0000${h.detalle}`).digest('hex')
}

/**
 * Un hallazgo CON SU EDAD.
 *
 * ⚠ UN RECORDATORIO QUE NO ENVEJECE SE VUELVE PAISAJE. El aviso decía lo
 * mismo cada vez —«1 sin corregir hace +3 días»— y a la tercera repetición
 * idéntica deja de leerse: el lector ya sabe qué dice sin abrirlo. La edad es
 * lo único que cambia entre un aviso y el siguiente, así que es lo único que
 * puede hacer que el texto no sea el mismo texto.
 *
 * No hace falta columna nueva: `primero_visto` ya está en la tabla.
 */
export interface HallazgoConEdad extends Hallazgo {
  /** Cuándo se vio por primera vez, en día de Colombia. */
  desde: string
  /** Noches que lleva abierto. 0 la primera noche. */
  noches: number
}

export interface Reconciliacion {
  nuevos: Hallazgo[]        // primera vez que se ven (o reaparecidos tras resolverse)
  vencidos: HallazgoConEdad[]  // abiertos hace ≥ N días y toca re-avisar
  abiertos: number          // total de hallazgos activos ahora
  resueltosAhora: number    // dejaron de verse en esta corrida
  aNotificar: boolean       // hay algo que justifique un WhatsApp
}

/**
 * Concilia los hallazgos de esta corrida con la tabla. Solo el cron la llama:
 * es quien escribe el estado. Devuelve qué avisar.
 */
export async function reconciliarHallazgos(
  actuales: Hallazgo[],
  opts: { diasReaviso?: number; marcarResueltos?: boolean } = {},
): Promise<Reconciliacion> {
  const diasReaviso = opts.diasReaviso ?? 3
  const marcarResueltos = opts.marcarResueltos ?? true
  const ahora = new Date()
  const umbral = new Date(ahora.getTime() - diasReaviso * DIA_MS)

  const conHash = actuales.map(h => ({ ...h, hash: hashHallazgo(h) }))
  const hashesActuales = conHash.map(h => h.hash)
  const almacenados = await prisma.vigilanciaHallazgo.findMany({
    where: { hash: { in: hashesActuales.length ? hashesActuales : ['__none__'] } },
  })
  const porHash = new Map(almacenados.map(a => [a.hash, a]))

  const nuevos: Hallazgo[] = []
  const vencidos: HallazgoConEdad[] = []

  for (const h of conHash) {
    const prev = porHash.get(h.hash)
    if (!prev) {
      await prisma.vigilanciaHallazgo.create({
        data: { hash: h.hash, clase: h.clase, detalle: h.detalle, primero_visto: ahora, ultimo_visto: ahora, notificado_en: ahora },
      })
      nuevos.push(h)
      continue
    }
    if (prev.resuelto) {
      // Reapareció algo que se había corregido: cuenta como aviso nuevo.
      await prisma.vigilanciaHallazgo.update({
        where: { hash: h.hash },
        data: { resuelto: false, primero_visto: ahora, ultimo_visto: ahora, notificado_en: ahora },
      })
      nuevos.push(h)
      continue
    }
    // Sigue abierto. ¿Toca re-avisar? Abierto hace ≥ N días y sin re-aviso en ≥ N días.
    const reavisar = prev.primero_visto <= umbral && (!prev.notificado_en || prev.notificado_en <= umbral)
    await prisma.vigilanciaHallazgo.update({
      where: { hash: h.hash },
      data: { ultimo_visto: ahora, ...(reavisar ? { notificado_en: ahora } : {}) },
    })
    if (reavisar) {
      vencidos.push({
        ...h,
        desde: diaEnColombia(prev.primero_visto),
        noches: Math.floor((ahora.getTime() - prev.primero_visto.getTime()) / DIA_MS),
      })
    }
  }

  let resueltosAhora = 0
  if (marcarResueltos) {
    const r = await prisma.vigilanciaHallazgo.updateMany({
      where: { resuelto: false, hash: { notIn: hashesActuales.length ? hashesActuales : ['__none__'] } },
      data: { resuelto: true },
    })
    resueltosAhora = r.count
  }

  return {
    nuevos, vencidos,
    abiertos: conHash.length,
    resueltosAhora,
    aNotificar: nuevos.length + vencidos.length > 0,
  }
}
