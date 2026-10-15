/**
 * LA ESCALA DE UNA TARIFA, EN UN SOLO SITIO
 * =========================================
 *
 * Una tarifa se expresa en porcentaje o en por mil, y pasar de la tarifa al
 * multiplicador es dividir por 100 o por 1.000. Eso estaba escrito **cuatro
 * veces**:
 *
 *   · `notariales/tramos.ts`   la tarifa de un tramo
 *   · `notariales/retencion.ts` la tarifa de una regla de retención
 *   · `notariales/calculo.ts`  una tarifa suelta, fuera de tabla
 *   · `finanzas/calculo.ts`    el ICA, con un `1000` literal
 *
 * Tres de ellas eran las MISMAS DOS LÍNEAS con distinto mensaje de error. La
 * cuarta tenía el divisor metido en la expresión.
 *
 * ⚠ POR QUÉ ESTO IMPORTA MÁS QUE LA DUPLICACIÓN
 *
 * Confundir las dos escalas no produce un error: produce una **cifra diez veces
 * mayor o menor, y plausible**. Un 3 por mil leído como 3 % convierte $30.900
 * en $309.000, que sigue pareciendo un gasto notarial. Nadie lo ve al revisar.
 *
 * Y mientras la escala estuviera en cuatro sitios, vigilarla costaba cuatro
 * mutaciones y bastaba con que alguien añadiera un quinto sitio para que la
 * cobertura volviera a tener un agujero. El inventario del 2026-10-14 solo
 * encontró tres de las cuatro: la de `calculo.ts` se me pasó, y ese es
 * exactamente el modo de fallo de una decisión repetida.
 *
 * LO QUE **NO** SE UNIFICA, Y ES DELIBERADO:
 *
 *   · Los MENSAJES de error. Cada sitio sabe de qué habla —un tramo, una regla,
 *     un concepto— y un mensaje genérico obligaría a buscar dónde pasó. Por eso
 *     `divisorDe` devuelve `null` en vez de lanzar: el número vive aquí, el
 *     mensaje se queda en casa.
 *   · La ARITMÉTICA. El módulo notarial trabaja en `number` y el financiero en
 *     `Prisma.Decimal`. Unificar la operación obligaría a uno de los dos a
 *     cambiar de tipo, y un Decimal convertido a number en el camino es
 *     justamente el error que `finanzas/dinero.ts` existe para que no pase.
 *     Lo que se comparte es la ESCALA, no la cuenta.
 */

/** Por cuánto se divide una tarifa según su unidad. */
export const DIVISOR = {
  PORCENTAJE: 100,
  POR_MIL: 1000,
} as const

export type UnidadTarifa = keyof typeof DIVISOR

/**
 * El divisor de una unidad, o `null` si la unidad no es una tasa.
 *
 * `null` y no una excepción: quien llama sabe decir *qué* no tenía unidad —el
 * tramo 3 de los derechos de registro, la tarifa de tal regla— y ese detalle es
 * lo que convierte el error en algo accionable.
 */
export function divisorDe(unidad: string | null | undefined): number | null {
  if (unidad === 'PORCENTAJE') return DIVISOR.PORCENTAJE
  if (unidad === 'POR_MIL') return DIVISOR.POR_MIL
  return null
}
