/**
 * QUÉ CUENTA COMO «MUNICIPIO PUBLICABLE» — definición única
 * =========================================================
 *
 * Doctrina AEO §1.2: un municipio tiene página cuando tiene contenido propio y
 * verificable, no cuando alguien marca una casilla. La condición se deriva de
 * los datos, y por eso vive en un filtro de Prisma y no en un booleano.
 *
 * Esta definición estuvo escrita DOS VECES, en `cobertura.ts` y en
 * `municipios.ts`, con los mismos seis campos. Coincidían. El problema no era
 * que difirieran: era que nada obligaba a que siguieran coincidiendo. Añadir un
 * séptimo campo a una sola de las dos habría hecho que `getMunicipiosVisibles()`
 * y `municipioTienePagina()` respondieran distinto sobre el mismo municipio, en
 * silencio y sin romper nada visible.
 *
 * Es el mismo patrón que `lib/enlaces.ts` mató un piso más arriba: dos sitios
 * decidiendo por su cuenta lo mismo.
 *
 * ---------------------------------------------------------------------------
 * LA GUARDA
 *
 * `PUBLICABLE` está tipado como `Prisma.MunicipalityWhereInput`. No es adorno:
 * si alguien renombra o elimina una de estas columnas en schema.prisma, el
 * `tsc` del build falla aquí en vez de devolver silenciosamente cero
 * municipios publicables —que es lo que haría un filtro construido con
 * `Object.fromEntries`, porque pierde el tipo por el camino—.
 */

import { Prisma } from '@prisma/client'

/** Los seis campos que definen «contenido propio y verificable» (§1.2). */
export const CAMPOS_CONTENIDO = [
  'altitud_msnm',
  'distancia_bogota_km',
  'tiempo_bogota_min',
  'temp_min',
  'temp_max',
  'descripcion_seo',
] as const

/**
 * Condición completa de publicación: los seis campos poblados, no oculto, y la
 * descripción no vacía —que `not: null` no cubre: una cadena vacía no es null—.
 *
 * `oculto` solo puede IMPEDIR la publicación, nunca forzarla: es un freno
 * manual, no un interruptor.
 */
export const PUBLICABLE = {
  oculto:              false,
  altitud_msnm:        { not: null },
  distancia_bogota_km: { not: null },
  tiempo_bogota_min:   { not: null },
  temp_min:            { not: null },
  temp_max:            { not: null },
  descripcion_seo:     { not: null },
  NOT: { descripcion_seo: '' },
} satisfies Prisma.MunicipalityWhereInput
