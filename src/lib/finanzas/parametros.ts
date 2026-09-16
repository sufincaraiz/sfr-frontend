/**
 * Carga y activación de parámetros fiscales. La validación vive en el módulo
 * hoja `calculo.ts` (para poder probarla rompiéndola con Node); aquí solo está
 * el acceso a base.
 */
import { prisma } from '@/lib/prisma'
import {
  exigirParametrosCompletos,
  verificarActivable,
  type ParametroActivable,
  type ParametrosAnioLike,
  type ResultadoActivable,
} from '@/lib/finanzas/calculo'

/** Lee el año tal cual está, sin exigir nada. Para la pantalla de edición. */
export async function leerAnio(anio: number): Promise<ParametrosAnioLike | null> {
  const p = await prisma.parametroFiscal.findUnique({
    where: { anio },
    include: { conceptos: true, tarifasIca: true },
  })
  return (p as ParametrosAnioLike | null) ?? null
}

/**
 * Parámetros del año listos para CALCULAR. Lanza `ParametroFiscalFaltante` si
 * no existen, están en BORRADOR o están incompletos: no cae al año anterior ni
 * asume cero.
 */
export async function parametrosDelAnio(anio: number): Promise<ParametrosAnioLike> {
  return exigirParametrosCompletos(await leerAnio(anio), anio)
}

/** Lo que falta para poder activar el año. Alimenta la lista de la pantalla. */
export async function pendientesDelAnio(anio: number): Promise<ResultadoActivable | null> {
  const p = await leerAnio(anio)
  return p ? verificarActivable(p) : null
}

/**
 * Activa el año. La firma EXIGE un `ParametroActivable`, y ese tipo solo lo
 * produce `verificarActivable`. No es una convención documentada: es el
 * compilador impidiendo que alguien active saltándose la validación.
 */
export async function activarAnio(parametro: ParametroActivable): Promise<void> {
  await prisma.parametroFiscal.update({
    where: { anio: parametro.anio },
    data: { estado: 'ACTIVO' },
  })
}

/** Vuelve el año a BORRADOR (para corregir algo ya activado). */
export async function volverABorrador(anio: number): Promise<void> {
  await prisma.parametroFiscal.update({ where: { anio }, data: { estado: 'BORRADOR' } })
}

/** El año fiscal de una fecha de causación. */
export function anioFiscalDe(fecha: Date): number {
  return fecha.getFullYear()
}
