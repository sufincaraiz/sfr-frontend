/**
 * GUARDA DE INTEGRIDAD: catálogo de tipos  <->  propiedades publicadas
 * ====================================================================
 *
 * Esto ya se escapó una vez. Al retirar «condominio» como tipo de inmueble se
 * ocultó su fila del catálogo, pero:
 *
 *   · el formulario del admin seguía ofreciéndolo, porque pide la lista con
 *     los ocultos incluidos — cualquiera podía volver a crear una propiedad
 *     con un tipo retirado y resucitar la taxonomía eliminada;
 *   · y el buscador público ofrecía cuatro tipos con CERO propiedades
 *     —Lote urbano, Lote rural, Lote campestre, Local comercial—, mandando al
 *     cliente a listados vacíos.
 *
 * Ninguna de las dos cosas rompía nada visible. Las dos costaban leads.
 *
 * ---------------------------------------------------------------------------
 * QUÉ ROMPE EL BUILD
 *
 *   1. Una propiedad publicada con un tipo que no existe en el catálogo.
 *      Su ficha renderiza el slug crudo y no cae en ningún filtro.
 *   2. Una propiedad publicada con un tipo OCULTO. Ocultar un tipo con
 *      inventario vivo lo saca de todos los filtros dejando las fichas
 *      publicadas: quedan huérfanas, alcanzables solo por URL directa.
 *
 * QUÉ SOLO AVISA
 *
 *   · Tipos del catálogo sin inventario. Es un estado válido y frecuente
 *     —un tipo entra antes que su primera propiedad—, y por eso el desplegable
 *     PÚBLICO se deriva del inventario en vez de del catálogo. Lo que no puede
 *     pasar es que se ofrezcan al cliente, no que existan.
 *   · La base sin responder: se avisa y se sigue, por lo mismo que en
 *     `veredas-integridad.ts`.
 */

import { prisma } from '@/lib/prisma'

export interface ResultadoTipos {
  ok: boolean
  errores: string[]
  avisos: string[]
  sinInventario: string[]
}

export async function verificarIntegridadTipos(): Promise<ResultadoTipos> {
  const errores: string[] = []
  const avisos: string[] = []
  const sinInventario: string[] = []

  let catalogo: { slug: string; label: string; oculto: boolean }[]
  let grupos: { type: string; _count: { _all: number } }[]
  try {
    ;[catalogo, grupos] = await Promise.all([
      prisma.tipoPropiedad.findMany({ select: { slug: true, label: true, oculto: true } }),
      prisma.property.groupBy({ by: ['type'], where: { status: 'available' }, _count: { _all: true } }),
    ])
  } catch (e) {
    avisos.push(
      `No se pudo consultar el catálogo de tipos, integridad SIN VERIFICAR: ${
        e instanceof Error ? e.message.split('\n')[0] : String(e)
      }`,
    )
    return { ok: true, errores, avisos, sinInventario }
  }

  const porSlug = new Map(catalogo.map(t => [t.slug, t]))
  const conInventario = new Map(grupos.map(g => [g.type, g._count._all]))

  // 1 y 2: ninguna propiedad publicada puede apuntar a un tipo inexistente u oculto.
  for (const [slug, n] of conInventario) {
    const t = porSlug.get(slug)
    if (!t) {
      errores.push(
        `${n} propiedad(es) disponibles con tipo «${slug}», que NO existe en el ` +
          `catálogo. No caen en ningún filtro y su ficha muestra el slug crudo.`,
      )
      continue
    }
    if (t.oculto) {
      errores.push(
        `${n} propiedad(es) disponibles con el tipo «${t.label}» (${slug}), que está ` +
          `OCULTO. Quedan fuera de todos los filtros pero siguen publicadas: ` +
          `o se reasignan a un tipo activo, o el tipo vuelve a estar visible.`,
      )
    }
  }

  // Aviso: catálogo con tipos sin inventario. Válido, pero el público no debe verlos.
  for (const t of catalogo) {
    if (!conInventario.has(t.slug)) sinInventario.push(`${t.label} (${t.slug})${t.oculto ? ' [oculto]' : ''}`)
  }

  return { ok: errores.length === 0, errores, avisos, sinInventario }
}

/** Envoltura para el build: lanza si hay propiedades con taxonomía rota. */
export async function exigirIntegridadTipos(): Promise<void> {
  const r = await verificarIntegridadTipos()

  for (const a of r.avisos) console.warn(`[tipos] AVISO: ${a}`)
  if (r.sinInventario.length) {
    console.log(
      `[tipos] ${r.sinInventario.length} sin inventario (no se ofrecen en el ` +
        `buscador público): ${r.sinInventario.join(', ')}`,
    )
  }

  if (!r.ok) {
    throw new Error(
      `\n\n══ TAXONOMÍA DE TIPOS ROTA ═════════════════════════════════\n` +
        r.errores.map(e => `  • ${e}`).join('\n') +
        `\n\n  Ver src/lib/tipos-integridad.ts\n` +
        `════════════════════════════════════════════════════════════\n`,
    )
  }
}
