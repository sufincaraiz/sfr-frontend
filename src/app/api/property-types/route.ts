import { NextResponse } from 'next/server'
import { getTiposOfrecibles } from '@/lib/property-types.server'

// Lista PÚBLICA de tipos para los selectores del buscador y de los filtros.
//
// Solo los visibles Y con inventario. Ofrecía cuatro tipos con cero
// propiedades —Lote urbano, Lote rural, Lote campestre, Local comercial—, así
// que el cliente elegía y no encontraba nada. El admin usa
// /api/admin/property-types, que sí devuelve el catálogo entero porque allí es
// donde se crean las propiedades.

/* ─── CACHEADA, desde el 2026-10-27 ──────────────────────────────────────────
 *
 * Misma razón y mismo valor que `/api/municipios`: se ejecutaba en cada carga de
 * página desde `SearchBar`. 3600 porque el ahorro está en dejar de correr por
 * página, no en alargar el reloj.
 *
 * ⚠ `getTiposOfrecibles()` usa `cache()` de React, que deduplica DENTRO de una
 * petición y no persiste nada. Así que el `revalidateTag('enlaces')` que ya
 * dispara `revalidarPropiedad()` NO llega a esta ruta: hace falta el
 * `revalidatePath('/api/property-types')` explícito, que está en
 * `revalidarPropiedad()` y en `admin/property-types`. Los tipos «ofrecibles»
 * dependen del inventario: vender la última propiedad de un tipo lo saca. */
export const revalidate = 3600

export async function GET() {
  const tipos = await getTiposOfrecibles()
  return NextResponse.json({ tipos })
}
