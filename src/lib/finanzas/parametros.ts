/**
 * Carga de parámetros fiscales del año. La validación vive en el módulo hoja
 * `calculo.ts` (para poder probarla rompiéndola con Node); aquí solo está el
 * acceso a base.
 */
import { prisma } from '@/lib/prisma'
import { exigirParametrosCompletos, type ParametrosAnioLike } from '@/lib/finanzas/calculo'

/**
 * Parámetros del año, ya validados. LANZA `ParametroFiscalFaltante` si no
 * existen o están incompletos: no cae al año anterior ni asume cero.
 */
export async function parametrosDelAnio(anio: number): Promise<ParametrosAnioLike> {
  const p = await prisma.parametroFiscal.findUnique({
    where: { anio },
    include: { conceptos: true, tarifasIca: true },
  })
  return exigirParametrosCompletos(p as ParametrosAnioLike | null, anio)
}

/** El año fiscal de una fecha de causación. */
export function anioFiscalDe(fecha: Date): number {
  return fecha.getFullYear()
}
