/**
 * GUARDA DE INTEGRIDAD: veredas-data.ts  <->  tabla `veredas`
 * ============================================================
 *
 * Decisión tomada (ver TRASPASO-SESION.md, «Punto B»):
 *
 *   veredas-data.ts  = FUENTE ÚNICA del contenido editorial de las veredas.
 *   tabla `veredas`  = SOLO la relación (id, slug, name, municipality_id)
 *                      para asignar propiedades, filtrar y enlazar.
 *
 * Editar `name` en la tabla NO cambia lo que se publica. El texto de cada
 * página sale del código, y por eso las 12 páginas siguieron sirviéndose
 * durante la caída de Railway del 15/08/2026.
 *
 * El riesgo de esa decisión es la desincronización silenciosa: es exactamente
 * lo que pasó con `municipios-data.ts`, que quedó huérfano durante meses
 * porque la única defensa era un comentario y nadie lo leyó.
 *
 * Por eso la defensa aquí NO es este comentario: es `verificarIntegridadVeredas()`,
 * que se invoca desde generateStaticParams() en src/app/veredas/[slug]/page.tsx
 * y ROMPE `next build` si las dos fuentes divergen.
 *
 * ---------------------------------------------------------------------------
 * QUÉ EXIGE LA GUARDA (y qué no)
 *
 * Rompe el build si:
 *   1. Una vereda de veredas-data.ts no tiene fila en la tabla.
 *   2. El `name` de la fila no coincide con el del código.
 *   3. La fila está en otro municipio que el declarado en el código.
 *   4. Dos filas comparten slug (la ruta /veredas/[slug] no lleva municipio:
 *      dos filas con el mismo slug harían la URL ambigua).
 *
 * NO rompe el build si:
 *   - La tabla tiene veredas de más SIN página editorial. Eso es deliberado:
 *     una vereda sin página pero con propiedad asignada sigue sirviendo para
 *     el filtro y el enlazado. La Vega tiene 27 veredas y solo unas pocas
 *     justifican una página propia.
 *   - La base no responde. Se avisa y se sigue. Meter una caída de Railway
 *     dentro de esta guarda convertiría un fallo de infraestructura en un
 *     falso error de datos, y contradiría la razón misma de la decisión.
 */

import { prisma } from '@/lib/prisma'
import { getAllVeredasData } from '@/lib/veredas-data'

export interface ResultadoIntegridad {
  ok: boolean
  errores: string[]
  avisos: string[]
  /** Veredas en la tabla que no tienen página editorial. Es un estado válido. */
  sinPagina: string[]
  /** null si no se pudo consultar la base. */
  filasEnTabla: number | null
}

export async function verificarIntegridadVeredas(): Promise<ResultadoIntegridad> {
  const errores: string[] = []
  const avisos: string[] = []
  const sinPagina: string[] = []

  const enCodigo = getAllVeredasData()

  let filas: { slug: string; name: string; municipality: { slug: string; name: string } }[]
  try {
    filas = await prisma.vereda.findMany({
      select: { slug: true, name: true, municipality: { select: { slug: true, name: true } } },
    })
  } catch (e) {
    // Base inalcanzable: no es una divergencia de datos. Si el build realmente
    // necesita la base, fallará por su cuenta al prerenderizar las fichas.
    avisos.push(
      `No se pudo consultar la tabla veredas, integridad SIN VERIFICAR: ${
        e instanceof Error ? e.message.split('\n')[0] : String(e)
      }`,
    )
    return { ok: true, errores, avisos, sinPagina, filasEnTabla: null }
  }

  // 4. Slug globalmente único: la ruta /veredas/[slug] no lleva municipio.
  const porSlug = new Map<string, typeof filas>()
  for (const f of filas) {
    const g = porSlug.get(f.slug) ?? []
    g.push(f)
    porSlug.set(f.slug, g)
  }
  for (const [slug, grupo] of porSlug) {
    if (grupo.length > 1) {
      errores.push(
        `slug duplicado «${slug}» en ${grupo.length} municipios (${grupo
          .map(f => f.municipality.name)
          .join(', ')}). La ruta /veredas/${slug} sería ambigua.`,
      )
    }
  }

  // 1-3. Todo lo que tiene página editorial debe existir en la tabla, igual.
  for (const v of enCodigo) {
    const fila = filas.find(f => f.slug === v.slug)
    if (!fila) {
      errores.push(
        `«${v.name}» (${v.slug}) está en veredas-data.ts con página editorial ` +
          `pero NO tiene fila en la tabla veredas. Sin fila no se le pueden ` +
          `asignar propiedades y la página saldrá siempre vacía.`,
      )
      continue
    }
    if (fila.name !== v.name) {
      errores.push(
        `«${v.slug}»: el nombre difiere. Código «${v.name}» / tabla «${fila.name}». ` +
          `Manda el código: corrige la fila de la tabla.`,
      )
    }
    if (fila.municipality.slug !== v.municipio_slug) {
      errores.push(
        `«${v.slug}»: municipio distinto. Código «${v.municipio_slug}» / ` +
          `tabla «${fila.municipality.slug}».`,
      )
    }
  }

  // 5. Filas sin página: estado válido, se informa.
  const conPagina = new Set(enCodigo.map(v => v.slug))
  for (const f of filas) {
    if (!conPagina.has(f.slug)) sinPagina.push(`${f.slug} (${f.municipality.name})`)
  }

  return { ok: errores.length === 0, errores, avisos, sinPagina, filasEnTabla: filas.length }
}

/**
 * Envoltura para el build. Lanza si hay divergencia, de modo que `next build`
 * termine en rojo antes de publicar un sitio desincronizado.
 */
export async function exigirIntegridadVeredas(): Promise<void> {
  const r = await verificarIntegridadVeredas()

  for (const a of r.avisos) console.warn(`[veredas] AVISO: ${a}`)

  if (r.filasEnTabla !== null) {
    console.log(
      `[veredas] ${getAllVeredasData().length} con página editorial, ` +
        `${r.filasEnTabla} filas en tabla, ${r.sinPagina.length} sin página` +
        (r.sinPagina.length ? `: ${r.sinPagina.join(', ')}` : ''),
    )
  }

  if (!r.ok) {
    throw new Error(
      `\n\n══ INTEGRIDAD DE VEREDAS ROTA ══════════════════════════════\n` +
        r.errores.map(e => `  • ${e}`).join('\n') +
        `\n\n  veredas-data.ts manda sobre el contenido; la tabla solo guarda\n` +
        `  la relación. Las dos tienen que declarar el mismo slug, el mismo\n` +
        `  nombre y el mismo municipio. Ver src/lib/veredas-integridad.ts\n` +
        `════════════════════════════════════════════════════════════\n`,
    )
  }
}
