/**
 * IVA — LOS SIETE VALORES
 * =======================
 *
 * El IVA no es una línea más: es el sitio donde un redondeo mal puesto produce
 * una cifra plausible y equivocada. Por eso se separa en siete valores con
 * nombre, y cada uno existe por un motivo:
 *
 *   BASE_IVA              suma de los conceptos gravados, SIN redondear
 *   IVA_BRUTO             BASE_IVA × tarifa, exacto, con todos sus decimales
 *   IVA_LIQUIDADO         el ÚNICO redondeo, sobre el total y nunca por línea
 *   IVA_COMPRADOR_EXACTO  la parte que le toca, antes de redondear
 *   IVA_VENDEDOR_EXACTO   ídem
 *   IVA_COMPRADOR         entera
 *   IVA_VENDEDOR          entera
 *
 * REGLAS, escritas antes del código:
 *
 *  1. Nada se redondea antes de sumar, ni la base antes de multiplicar. Dos
 *     conceptos con IVA de 20.004 dan 40.008 y liquidan 40.010; redondeando por
 *     línea darían 20.000 + 20.000 = 40.000, que es la clase de diferencia que
 *     nadie encuentra después.
 *  2. Un solo redondeo, sobre IVA_BRUTO.
 *  3. El IVA sigue el reparto de cada concepto que lo genera: si el comprador
 *     asume el 100 % de las copias, el IVA de esas copias es suyo.
 *  4. Se redondea la parte MENOR y la mayor sale como residual, para que
 *     comprador + vendedor sea IVA_LIQUIDADO siempre. Empate → el residual es
 *     del comprador, por determinismo.
 *  5. Decimal en todo el camino, nunca `number`. Con `number`, 216.973,68 × 19 %
 *     no cae del lado correcto de la frontera.
 *
 * ⚠ A QUÉ MÚLTIPLO SE APROXIMA ES NORMA, NO INGENIERÍA. Vive en el año como
 * parámetro con su RespaldoNormativo, igual que el redondeo de cada concepto.
 * Sin respaldo cargado, el IVA no liquida: ver `liquidarIva`.
 *
 * Usa el Decimal que ya trae Prisma —decimal.js-light— en vez de añadir una
 * dependencia: es el mismo tipo que devolverá la base cuando el panel exista,
 * así que no hay una conversión de por medio donde perder precisión.
 */

import { Prisma } from '@prisma/client'
import { ErrorEsquemaNotarial, type Redondeo } from './tipos.ts'

const D = Prisma.Decimal
type Dec = InstanceType<typeof Prisma.Decimal>

/** Lo que aporta un concepto gravado a la base, con el reparto que ya tiene. */
export interface AporteIva {
  clave: string
  /** Base del concepto, exacta. No se redondea antes de sumar. */
  base: string | number
  /** % del comprador en ESE concepto. */
  pct_comprador: number
}

export interface LiquidacionIva {
  base: string
  tarifa: string
  bruto: string
  liquidado: number
  comprador_exacto: string
  vendedor_exacto: string
  comprador: number
  vendedor: number
  regla: Redondeo
}

/** Redondeo decimal a un múltiplo, con el modo que diga la resolución. */
function aproximar(n: Dec, regla: Redondeo): Dec {
  const q = n.div(regla.unidad)
  const entero = regla.modo === 'ARRIBA' ? q.ceil()
    : regla.modo === 'ABAJO' ? q.floor()
      : q.toDecimalPlaces(0, D.ROUND_HALF_UP)
  return entero.mul(regla.unidad)
}

export function liquidarIva(
  aportes: AporteIva[],
  tarifa: string | number,
  regla: Redondeo | null | undefined,
): LiquidacionIva {
  if (!regla) {
    throw new ErrorEsquemaNotarial(
      'No se sabe a qué múltiplo aproxima el IVA ni en qué sentido. Es una regla normativa, ' +
      'no una decisión del motor: va como parámetro del año, con su respaldo oficial.',
      'redondeo_iva',
    )
  }
  if (!Number.isInteger(regla.unidad) || regla.unidad < 1) {
    throw new ErrorEsquemaNotarial(`Unidad de redondeo del IVA inválida (${regla.unidad}).`, 'redondeo_iva')
  }

  // (1) La base conserva la precisión: ningún aporte se redondea al sumar.
  let base = new D(0)
  let ponderado = new D(0)
  for (const a of aportes) {
    const b = new D(a.base)
    if (b.isNegative()) {
      throw new ErrorEsquemaNotarial(`${a.clave}: una base de IVA no puede ser negativa.`, 'base')
    }
    if (a.pct_comprador < 0 || a.pct_comprador > 100) {
      throw new ErrorEsquemaNotarial(`${a.clave}: reparto fuera de 0–100.`, 'pct_comprador')
    }
    base = base.add(b)
    ponderado = ponderado.add(b.mul(a.pct_comprador).div(100))
  }

  // (2) Un solo redondeo, sobre el total.
  const bruto = base.mul(tarifa).div(100)
  const liquidado = aproximar(bruto, regla)

  // (3) El reparto del IVA es el de los conceptos que lo generan, ponderado por
  // lo que cada uno aporta a la base. Se reparte el LIQUIDADO y no el bruto:
  // repartir el bruto y redondear después no sumaría el liquidado.
  const proporcion = base.isZero() ? new D(0) : ponderado.div(base)
  const compradorExacto = liquidado.mul(proporcion)
  const vendedorExacto = liquidado.sub(compradorExacto)

  // (4) Se redondea la MENOR; la mayor es el residual. Empate → el residual es
  // del comprador. El reparto es un pacto entre las partes, no una norma, así
  // que su unidad es el peso: la del múltiplo normativo solo manda sobre el
  // total liquidado.
  const compradorEsMenor = compradorExacto.lessThan(vendedorExacto)
  let comprador: Dec
  let vendedor: Dec
  if (compradorEsMenor) {
    comprador = compradorExacto.toDecimalPlaces(0, D.ROUND_HALF_UP)
    vendedor = liquidado.sub(comprador)
  } else {
    vendedor = vendedorExacto.toDecimalPlaces(0, D.ROUND_HALF_UP)
    comprador = liquidado.sub(vendedor)
  }

  if (!comprador.add(vendedor).equals(liquidado)) {
    throw new ErrorEsquemaNotarial(
      `El IVA repartido no suma el liquidado (${comprador} + ${vendedor} ≠ ${liquidado}).`,
      'iva',
    )
  }

  return {
    base: base.toString(),
    tarifa: new D(tarifa).toString(),
    bruto: bruto.toString(),
    liquidado: liquidado.toNumber(),
    comprador_exacto: compradorExacto.toString(),
    vendedor_exacto: vendedorExacto.toString(),
    comprador: comprador.toNumber(),
    vendedor: vendedor.toNumber(),
    regla,
  }
}
