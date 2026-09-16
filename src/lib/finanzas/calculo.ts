/**
 * CÁLCULO TRIBUTARIO — lógica pura, sin acceso a base
 * ====================================================
 *
 * Módulo HOJA a propósito: no importa `@/…`, solo el Decimal de Prisma. Así
 * `scripts/probar-finanzas.mjs` lo ejercita con Node y puede ROMPER la guarda
 * a propósito. Mismo patrón que `valor-futuro.ts` y `slug.ts`: la prueba tiene
 * que ejercitar el código que corre en producción, no una copia suya.
 *
 * LA GUARDA MÁS IMPORTANTE DEL MÓDULO: si falta el parámetro del año, esto
 * LANZA. No cae al año anterior, no asume cero, no devuelve null silencioso.
 * Un cálculo con la tarifa equivocada produce una declaración mal presentada,
 * y ese error no se ve hasta que lo ve la DIAN.
 */
import { Prisma } from '@prisma/client'

export class ParametroFiscalFaltante extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ParametroFiscalFaltante'
  }
}

type Num = Prisma.Decimal | number | string
const dec = (v: Num): Prisma.Decimal => new Prisma.Decimal(v as never)

export interface ConceptoRetencionLike {
  concepto: string
  tarifa_declarante: Num
  tarifa_no_declarante: Num
  /** Base mínima EN UVT. 0 = se retiene desde el primer peso. */
  base_minima_uvt: Num
}

export interface ParametrosAnioLike {
  anio: number
  uvt: Num | null
  tarifa_iva: Num | null
  tarifa_reteiva?: Num | null
  conceptos: ConceptoRetencionLike[]
}

/**
 * Verifica que el año traiga lo mínimo para calcular. LANZA si no.
 * Se llama SIEMPRE antes de cualquier cálculo.
 */
export function exigirParametrosCompletos(p: ParametrosAnioLike | null | undefined, anio: number): ParametrosAnioLike {
  if (!p) {
    throw new ParametroFiscalFaltante(
      `No hay parámetros fiscales cargados para ${anio}. Cárgalos en /admin/finanzas/parametros ` +
      `antes de registrar movimientos de ese año. NO se usan los del año anterior ni se asume cero: ` +
      `calcular con la tarifa equivocada produce una declaración mal presentada.`,
    )
  }
  const faltan: string[] = []
  if (p.uvt === null || p.uvt === undefined) faltan.push('el UVT')
  if (p.tarifa_iva === null || p.tarifa_iva === undefined) faltan.push('la tarifa de IVA')
  if (faltan.length) {
    throw new ParametroFiscalFaltante(
      `Los parámetros fiscales de ${anio} están incompletos: falta ${faltan.join(' y ')}. ` +
      `El cálculo se detiene hasta que se carguen.`,
    )
  }
  return p
}

export interface ResultadoRetencion {
  valor: Prisma.Decimal
  retuvo: boolean
  /** Por qué no se retuvo, cuando no se retuvo. Va al detalle del movimiento. */
  motivo?: string
}

/**
 * Retención en la fuente de un concepto.
 *
 * Implementa EXPLÍCITAMENTE la regla de la base mínima en UVT, que es de las
 * que más se olvidan: si la base no supera el mínimo del año, NO se retiene.
 * También corta si el tercero es autorretenedor.
 */
export function calcularRetefuente(args: {
  base: Num
  concepto: string
  esDeclaranteRenta: boolean
  esAutorretenedor?: boolean
  parametros: ParametrosAnioLike
}): ResultadoRetencion {
  const { concepto, esDeclaranteRenta, esAutorretenedor, parametros } = args
  const base = dec(args.base)
  const cero = new Prisma.Decimal(0)

  if (esAutorretenedor) {
    return { valor: cero, retuvo: false, motivo: 'El tercero es autorretenedor: no se le practica retención.' }
  }

  const c = parametros.conceptos.find(x => x.concepto === concepto)
  if (!c) {
    throw new ParametroFiscalFaltante(
      `El concepto de retención «${concepto}» no está configurado para ${parametros.anio}. ` +
      `Agrégalo en los parámetros del año; no se asume una tarifa por defecto.`,
    )
  }

  // Base mínima en UVT — la regla que más se olvida.
  const uvt = dec(parametros.uvt as Num)
  const minimo = dec(c.base_minima_uvt).mul(uvt)
  if (minimo.gt(0) && base.lt(minimo)) {
    return {
      valor: cero,
      retuvo: false,
      motivo:
        `La base ($${base.toFixed(2)}) no supera la base mínima de ${dec(c.base_minima_uvt).toString()} UVT ` +
        `($${minimo.toDecimalPlaces(2).toFixed(2)} en ${parametros.anio}): no se retiene.`,
    }
  }

  const tarifa = dec(esDeclaranteRenta ? c.tarifa_declarante : c.tarifa_no_declarante)
  return { valor: base.mul(tarifa).div(100).toDecimalPlaces(2), retuvo: true }
}

/** IVA generado sobre una base, con la tarifa del año. */
export function calcularIva(base: Num, parametros: ParametrosAnioLike, generaIva = true): Prisma.Decimal {
  if (!generaIva) return new Prisma.Decimal(0)
  return dec(base).mul(dec(parametros.tarifa_iva as Num)).div(100).toDecimalPlaces(2)
}

/**
 * DISCREPANCIA entre lo que la contraparte practicó y lo que el sistema
 * calculó. NO se guarda: se deriva de los dos valores almacenados. Un cliente
 * que retiene de más es dinero recuperable; uno que retiene de menos deja un
 * saldo que la DIAN cobrará. Ambos casos deben verse.
 */
export interface Discrepancia {
  hay: boolean
  /** practicada − sugerida. Positivo = le retuvieron de MÁS. */
  diferencia: Prisma.Decimal | null
  /** null cuando no se pudo calcular el sugerido (faltaba el parámetro). */
  calculable: boolean
}

export function compararRetencion(
  practicada: Num,
  sugerida: Num | null | undefined,
  toleranciaPesos: Num = 1,
): Discrepancia {
  if (sugerida === null || sugerida === undefined) {
    return { hay: false, diferencia: null, calculable: false }
  }
  const diff = dec(practicada).sub(dec(sugerida))
  return { hay: diff.abs().gt(dec(toleranciaPesos)), diferencia: diff, calculable: true }
}

/** Valor neto que se recibe de un ingreso. DERIVADO — nunca columna. */
export function netoIngreso(a: {
  valor_base: Num; iva_generado: Num
  retefuente_practicada: Num; reteica_practicada: Num; reteiva_practicada: Num
}): Prisma.Decimal {
  return dec(a.valor_base).plus(dec(a.iva_generado))
    .sub(dec(a.retefuente_practicada)).sub(dec(a.reteica_practicada)).sub(dec(a.reteiva_practicada))
    .toDecimalPlaces(2)
}

/** Valor que se paga en un egreso. DERIVADO — nunca columna. */
export function netoEgreso(a: {
  valor_base: Num; iva_descontable: Num
  retefuente_practicada: Num; reteica_practicada: Num; reteiva_practicada: Num
}): Prisma.Decimal {
  return dec(a.valor_base).plus(dec(a.iva_descontable))
    .sub(dec(a.retefuente_practicada)).sub(dec(a.reteica_practicada)).sub(dec(a.reteiva_practicada))
    .toDecimalPlaces(2)
}
