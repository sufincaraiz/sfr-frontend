/**
 * Núcleo de la malla de veredas: QUIÉN TIENE PÁGINA. Sin acceso a datos.
 *
 * Vive en su propio archivo, y sin un solo import de runtime, para poder
 * ejercitarlo con inventarios que hoy no existen —ninguna vereda llega a 5
 * propiedades— sin escribir en la base compartida con producción.
 * Ver scripts/probar-promocion.mjs.
 *
 * La razón de cada regla está en malla-veredas.ts, que es quien lo usa.
 */

import type { VeredaData } from './veredas-data'

/** Propiedades a partir de las cuales una vereda sin texto propio gana página. */
export const UMBRAL_PROMOCION = 5

export interface VeredaPublicable {
  slug: string
  name: string
  municipio_slug: string
  municipio_name: string
  /** Propiedades disponibles asignadas a esta vereda. */
  inventario: number
  /** Contenido editorial, o null si la vereda entró solo por inventario. */
  editorial: VeredaData | null
  /** true si tiene página únicamente porque superó el umbral. */
  promocionada: boolean
}

export interface FilaVereda {
  slug: string
  name: string
  municipio_slug: string
  municipio_name: string
  inventario: number
}

/**
 * Núcleo de la decisión, sin base de datos: qué veredas tienen página.
 *
 * Está separada del acceso a datos a propósito, para poder ejercitarla con
 * inventarios que hoy no existen —ninguna vereda llega a 5— sin escribir en la
 * base compartida con producción.
 */
export function seleccionarPublicables(
  filas: FilaVereda[],
  editoriales: VeredaData[],
  umbral: number = UMBRAL_PROMOCION,
): VeredaPublicable[] {
  const porSlug = new Map(editoriales.map(v => [v.slug, v]))

  return filas
    .map(f => {
      const editorial = porSlug.get(f.slug) ?? null
      return {
        slug: f.slug,
        name: f.name,
        municipio_slug: f.municipio_slug,
        municipio_name: f.municipio_name,
        inventario: f.inventario,
        editorial,
        promocionada: !editorial && f.inventario >= umbral,
      }
    })
    .filter(v => v.editorial !== null || v.promocionada)
    .sort((a, b) => b.inventario - a.inventario || a.name.localeCompare(b.name, 'es'))
}
