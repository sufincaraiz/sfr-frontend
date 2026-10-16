import { prisma } from '@/lib/prisma'
import { mesesAntesEnColombia } from './dia-colombia'

// ─────────────────────────────────────────────────────────────────────────────
// Retención de la bitácora de accesos al enlace del contador (Ley 1581 de 2012).
//
// ⚠ TABLA VACÍA Y SIN ESCRITOR. Este módulo corre cada noche y SIEMPRE devuelve
// cero, porque el enlace del contador NO EXISTE: no hay ruta, no hay token+PIN
// y no hay filtro de periodo (ver el comentario de `EnlaceContador` en el
// esquema). Nadie escribe en `accesos_enlace_contador`, así que no hay nada que
// anonimizar.
//
//   ⇒ Ese cero dice «no hay nada», NO «la retención funciona».
//
// Un verde que no puede ser rojo no es un verde, así que el que llama está
// obligado a distinguir las dos cosas: `anonimizarAccesosVencidos` devuelve
// también cuántas filas hay EN TOTAL, y con cero filas el mensaje tiene que
// decir que no demostró nada. Mientras eso siga así, lo único que esta pasada
// prueba es que la consulta no revienta.
//
// LO QUE ESTE MÓDULO HARÁ CIERTO el día que el enlace exista es la sección 4 de
// la política de tratamiento —pública—, que desde el 2026-10-16 está redactada
// en futuro justo por esto. ANONIMIZA en vez de borrar:
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
  // RESTAR 365 DIAS NO ES DOCE MESES, y la aritmetica de calendario sobre
  // componentes LOCALES daba un corte distinto en cada zona. El corte se
  // calcula como calendario en Bogota y vuelve a instante, porque se compara
  // contra una columna de INSTANTE: cuando ocurrio el acceso.
  return mesesAntesEnColombia(MESES_RETENCION_ACCESOS)
}

/**
 * Pone `ip` y `userAgent` en null en los accesos vencidos y los marca.
 * Idempotente: el filtro `anonimizado_en: null` evita reprocesar cada noche
 * las mismas filas.
 */
export async function anonimizarAccesosVencidos(): Promise<{
  anonimizados: number
  corte: Date
  /** Filas en la bitácora. Con 0, el `anonimizados: 0` no demuestra nada. */
  filas: number
  /** Vencidas que SIGUEN con dato personal después de la pasada: debe ser 0. */
  pendientes: number
}> {
  const corte = fechaCorteAccesos()
  const { count } = await prisma.accesoEnlaceContador.updateMany({
    where: { fecha: { lt: corte }, anonimizado_en: null },
    data: { ip: null, userAgent: null, anonimizado_en: new Date() },
  })
  /* LAS DOS CIFRAS QUE CONVIERTEN EL CERO EN INFORMACIÓN. `filas` separa «no
   * había nada» de «estaba todo al día»; `pendientes` es lo que haría rojo a
   * este verde, y por eso se cuenta DESPUÉS de la pasada. */
  const filas = await prisma.accesoEnlaceContador.count()
  const pendientes = await accesosVencidosSinAnonimizar()
  return { anonimizados: count, corte, filas, pendientes }
}

/** Cuántos accesos siguen con dato personal pese a haber vencido (debería ser 0). */
export async function accesosVencidosSinAnonimizar(): Promise<number> {
  return prisma.accesoEnlaceContador.count({
    where: { fecha: { lt: fechaCorteAccesos() }, anonimizado_en: null },
  })
}
