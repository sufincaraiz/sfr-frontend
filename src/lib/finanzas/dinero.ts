/**
 * FRONTERA BigInt ↔ Decimal — el ÚNICO lugar donde se cruzan los dos mundos.
 * =========================================================================
 *
 * `Property.price_cop` es **BigInt** (pesos enteros): un precio de lista no
 * lleva centavos. El módulo financiero es **Decimal(16,2)**: el IVA y las
 * retenciones SÍ los producen, y redondear en el esquema esconde el error.
 *
 * Son dos dominios distintos y está bien que lo sean. Lo que NO puede pasar es
 * que la conversión viva dispersa: una comisión calculada con `Number()` aquí
 * y con Decimal allá da dos cifras distintas para el mismo negocio, y el error
 * aparece meses después en una declaración. Todo cruce pasa por aquí.
 *
 * REGLA: nunca uses `Number(price_cop)` fuera de este archivo.
 */
import { Prisma } from '@prisma/client'

/** Precio de propiedad (BigInt, pesos enteros) → Decimal del módulo financiero. */
export function precioPropiedadADecimal(price_cop: bigint): Prisma.Decimal {
  return new Prisma.Decimal(price_cop.toString())
}

/**
 * Decimal → peso entero. El peso colombiano no circula en centavos, así que
 * todo lo que vuelve al mundo de los precios se redondea explícitamente aquí
 * y no por casualidad en un `toFixed` perdido.
 */
export function aPesoEntero(valor: Prisma.Decimal): bigint {
  return BigInt(valor.toDecimalPlaces(0).toFixed(0))
}

/**
 * Comisión sobre el precio de una propiedad: el cruce más frecuente de los dos
 * mundos y la razón de que este archivo exista. Devuelve Decimal con 2
 * decimales, porque de aquí salen IVA y retenciones.
 */
export function comisionSobrePrecio(
  price_cop: bigint,
  porcentaje: Prisma.Decimal | number | string,
): Prisma.Decimal {
  return precioPropiedadADecimal(price_cop)
    .mul(new Prisma.Decimal(porcentaje))
    .div(100)
    .toDecimalPlaces(2)
}
