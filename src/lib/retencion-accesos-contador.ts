import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Retención de la bitácora de accesos al enlace del contador (Ley 1581 de 2012).
//
// La política de tratamiento declara: «Los registros de acceso al enlace de
// consulta contable conservan la dirección IP y el navegador por un máximo de
// doce (12) meses; cumplido ese plazo se eliminan esos datos y se conserva
// únicamente la fecha del acceso y el enlace consultado.»
//
// Este módulo es lo que hace cierta esa frase, y ANONIMIZA en vez de borrar:
// el rastro de QUE el enlace se usó y CUÁNDO tiene valor de auditoría —es la
// prueba de quién consultó datos financieros del negocio— mientras que la IP y
// el navegador dejan de tener utilidad práctica pasado un año. Retener solo lo
// necesario es el criterio de la ley; borrar la fila entera perdería la
// auditoría sin ganar nada en privacidad.
//
// Mismo disparador que la purga de visitas: el cron diario de /api/cron/purge-visitas.
// ─────────────────────────────────────────────────────────────────────────────

export const MESES_RETENCION_ACCESOS = 12

/** Fecha límite: todo acceso anterior ya cumplió los 12 meses. */
export function fechaCorteAccesos(): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - MESES_RETENCION_ACCESOS)
  return d
}

/**
 * Pone `ip` y `userAgent` en null en los accesos vencidos y los marca.
 * Idempotente: el filtro `anonimizado_en: null` evita reprocesar cada noche
 * las mismas filas.
 */
export async function anonimizarAccesosVencidos(): Promise<{ anonimizados: number; corte: Date }> {
  const corte = fechaCorteAccesos()
  const { count } = await prisma.accesoEnlaceContador.updateMany({
    where: { fecha: { lt: corte }, anonimizado_en: null },
    data: { ip: null, userAgent: null, anonimizado_en: new Date() },
  })
  return { anonimizados: count, corte }
}

/** Cuántos accesos siguen con dato personal pese a haber vencido (debería ser 0). */
export async function accesosVencidosSinAnonimizar(): Promise<number> {
  return prisma.accesoEnlaceContador.count({
    where: { fecha: { lt: fechaCorteAccesos() }, anonimizado_en: null },
  })
}
