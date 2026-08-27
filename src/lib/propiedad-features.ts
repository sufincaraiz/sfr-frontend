import { prisma } from '@/lib/prisma'

/**
 * FEATURES POR MERGE, NO POR REEMPLAZO TOTAL
 * ==========================================
 *
 * El `PUT` hacía esto:
 *
 *     if (features) {
 *       await prisma.propertyFeature.deleteMany({ where: { property_id: id } })
 *       // …y recrea solo lo que llegó
 *     }
 *
 * Es reemplazo total. Hoy no rompe nada porque el formulario de edición NUNCA
 * envía `features` —por eso los 84 servicios, el clima, la altitud y la
 * distancia al parque siguen vivos: el formulario los ignora por completo—.
 *
 * Pero en cuanto el formulario unificado envíe servicios, ese `deleteMany`
 * borraría clima, altitud, distancia_parque y tour360_url de golpe. La
 * alternativa «que el formulario mande siempre TODO» funciona el primer día y
 * falla el día que alguien añade una clave y se olvida de incluirla, que es la
 * misma clase de defecto que llevamos toda la sesión persiguiendo: depender de
 * que alguien se acuerde.
 *
 * Aquí el contrato es explícito: **solo se tocan las claves que llegan**. Lo
 * que no viene, no se toca. Y borrar es una acción declarada —enviar la clave
 * con valor vacío—, no un efecto secundario de omitirla.
 */

/** Una clave con uno o varios valores. `servicio` admite varios; el resto, uno. */
export interface FeatureEntrada {
  key: string
  /** Uno o varios. Vacío o `[]` BORRA esa clave. */
  value: string | string[]
}

/** Claves que admiten varias filas para la misma propiedad. */
const MULTIVALOR = new Set(['servicio'])

/**
 * Aplica el merge. Devuelve un resumen de lo que cambió, para poder registrarlo.
 * No revalida: de eso se encarga quien la llama, junto con el resto del guardado.
 */
export async function fusionarFeatures(
  propertyId: string,
  entradas: FeatureEntrada[],
): Promise<{ tocadas: string[]; borradas: string[] }> {
  const tocadas: string[] = []
  const borradas: string[] = []

  for (const { key, value } of entradas) {
    const valores = (Array.isArray(value) ? value : [value])
      .map(v => String(v ?? '').trim())
      .filter(Boolean)

    if (!MULTIVALOR.has(key) && valores.length > 1) {
      throw new Error(`La clave «${key}» no admite varios valores`)
    }

    // Se reemplaza SOLO esta clave. Las demás no se tocan.
    await prisma.propertyFeature.deleteMany({ where: { property_id: propertyId, feature_key: key } })

    if (valores.length === 0) { borradas.push(key); continue }

    await prisma.propertyFeature.createMany({
      data: valores.map(v => ({ property_id: propertyId, feature_key: key, feature_value: v })),
    })
    tocadas.push(key)
  }

  return { tocadas, borradas }
}

/**
 * Convierte las filas de la base a la forma que consume el formulario:
 * `servicio` como array y el resto como cadena.
 */
export function agruparFeatures(
  filas: Array<{ feature_key: string; feature_value: string }>,
): Record<string, string | string[]> {
  const salida: Record<string, string | string[]> = {}
  for (const f of filas) {
    if (MULTIVALOR.has(f.feature_key)) {
      const actual = salida[f.feature_key]
      salida[f.feature_key] = Array.isArray(actual) ? [...actual, f.feature_value] : [f.feature_value]
    } else {
      salida[f.feature_key] = f.feature_value
    }
  }
  return salida
}
