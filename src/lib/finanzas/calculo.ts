/**
 * CÁLCULO TRIBUTARIO — lógica pura, sin acceso a base
 * ====================================================
 *
 * Módulo HOJA a propósito: no importa `@/…`, solo el Decimal de Prisma. Así
 * `scripts/probar-finanzas.mjs` lo ejercita con Node y puede ROMPER las guardas
 * a propósito. Mismo patrón que `valor-futuro.ts` y `slug.ts`: la prueba tiene
 * que ejercitar el código que corre en producción, no una copia suya.
 *
 * DOS GUARDAS, Y NINGUNA ADIVINA:
 *   · Si falta el parámetro del año, o está en BORRADOR, el cálculo LANZA. No
 *     cae al año anterior, no asume cero.
 *   · Si no se ha DECIDIDO si el año es responsable de IVA, también LANZA. Un
 *     `false` silencioso en un año donde sí se cruzaron topes es el error que
 *     nadie ve.
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
const vacio = (v: unknown): boolean => v === null || v === undefined

export interface ConceptoRetencionLike {
  concepto: string
  tarifa_declarante: Num
  tarifa_no_declarante: Num
  /** Base mínima EN UVT. 0 = se retiene desde el primer peso. */
  base_minima_uvt: Num
}

export interface ParametrosAnioLike {
  anio: number
  estado: 'BORRADOR' | 'ACTIVO'
  /** null = sin decidir. Bloquea la activación y hace lanzar los cálculos de IVA. */
  responsable_iva: boolean | null
  uvt: Num | null
  /** Solo obligatoria si responsable_iva = true. */
  tarifa_iva: Num | null
  tarifa_reteiva?: Num | null
  conceptos: ConceptoRetencionLike[]
}

// ─── Activación de un año ────────────────────────────────────────────────────

/**
 * ÚNICA fuente de «qué falta para activar este año». La usan a la vez la
 * pantalla (para pintar la lista de pendientes) y el endpoint de activación
 * (para validar). Si fueran dos listas, la pantalla diría «listo» y el
 * servidor «falta».
 */
export function pendientesParaActivar(p: ParametrosAnioLike): string[] {
  const falta: string[] = []
  if (vacio(p.uvt)) falta.push('Cargar el UVT del año')
  if (vacio(p.responsable_iva)) {
    falta.push('Decidir si el año es responsable de IVA (no se asume que no)')
  } else if (p.responsable_iva === true && vacio(p.tarifa_iva)) {
    falta.push('Cargar la tarifa de IVA (obligatoria porque el año es responsable de IVA)')
  }
  if (!p.conceptos || p.conceptos.length === 0) {
    falta.push('Configurar al menos un concepto de retención')
  }
  return falta
}

declare const marcaActivable: unique symbol
/**
 * Un parámetro que YA pasó por `verificarActivable`. La marca no se puede
 * fabricar a mano: es la garantía de TIPO —no de convención— de que nadie
 * activa un año sin haber pasado por la validación.
 */
export type ParametroActivable = ParametrosAnioLike & { readonly [marcaActivable]: true }

export type ResultadoActivable =
  | { listo: true; parametro: ParametroActivable }
  | { listo: false; pendientes: string[] }

/** Único camino para obtener un `ParametroActivable`. */
export function verificarActivable(p: ParametrosAnioLike): ResultadoActivable {
  const pendientes = pendientesParaActivar(p)
  if (pendientes.length > 0) return { listo: false, pendientes }
  return { listo: true, parametro: p as ParametroActivable }
}

// ─── Guarda de cálculo ───────────────────────────────────────────────────────

/**
 * Verifica que el año sirva para calcular. LANZA si no.
 * Reutiliza `pendientesParaActivar` a propósito: la misma lista que gobierna la
 * activación gobierna el cálculo, así que un año activado a mano por la base
 * tampoco pasa.
 */
export function exigirParametrosCompletos(
  p: ParametrosAnioLike | null | undefined,
  anio: number,
): ParametrosAnioLike {
  if (!p) {
    throw new ParametroFiscalFaltante(
      `No hay parámetros fiscales cargados para ${anio}. Cárgalos en /admin/finanzas/parametros ` +
      `antes de registrar movimientos de ese año. NO se usan los del año anterior ni se asume cero: ` +
      `calcular con la tarifa equivocada produce una declaración mal presentada.`,
    )
  }
  if (p.estado !== 'ACTIVO') {
    throw new ParametroFiscalFaltante(
      `Los parámetros fiscales de ${anio} están en BORRADOR. El módulo no calcula con un borrador: ` +
      `complétalos y actívalos en /admin/finanzas/parametros.`,
    )
  }
  const falta = pendientesParaActivar(p)
  if (falta.length > 0) {
    throw new ParametroFiscalFaltante(
      `Los parámetros de ${anio} figuran ACTIVOS pero están incompletos: ${falta.join('; ')}. ` +
      `El cálculo se detiene.`,
    )
  }
  return p
}

// ─── Retención en la fuente ──────────────────────────────────────────────────

export interface ResultadoRetencion {
  valor: Prisma.Decimal
  retuvo: boolean
  /** Por qué no se retuvo, cuando no se retuvo. Va al detalle del movimiento. */
  motivo?: string
}

/**
 * Implementa EXPLÍCITAMENTE la base mínima en UVT, que es de las que más se
 * olvidan: si la base no supera el mínimo del año, NO se retiene. También corta
 * si el tercero es autorretenedor.
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

// ─── IVA ─────────────────────────────────────────────────────────────────────

/**
 * IVA que GENERAMOS al facturar.
 *
 * Si el año NO es responsable de IVA, devuelve 0 aunque haya tarifa cargada:
 * no se puede cobrar un IVA que no se está autorizado a cobrar. Si no se ha
 * decidido, LANZA — no asume que no.
 */
export function calcularIva(base: Num, parametros: ParametrosAnioLike, generaIva = true): Prisma.Decimal {
  if (vacio(parametros.responsable_iva)) {
    throw new ParametroFiscalFaltante(
      `No se ha decidido si ${parametros.anio} es responsable de IVA. El cálculo se detiene: ` +
      `no se asume que no lo es. Decídelo en los parámetros del año.`,
    )
  }
  if (parametros.responsable_iva === false) return new Prisma.Decimal(0)
  if (!generaIva) return new Prisma.Decimal(0)
  if (vacio(parametros.tarifa_iva)) {
    throw new ParametroFiscalFaltante(
      `${parametros.anio} es responsable de IVA pero no tiene tarifa cargada. El cálculo se detiene.`,
    )
  }
  return dec(base).mul(dec(parametros.tarifa_iva as Num)).div(100).toDecimalPlaces(2)
}

/**
 * ReteIVA. Va gobernada por la MISMA bandera: si no somos responsables de IVA
 * no somos agentes de retención de IVA (no la practicamos), y como no cobramos
 * IVA tampoco hay nada que retenernos. Cero en ambas direcciones.
 */
export function calcularReteIva(baseIva: Num, parametros: ParametrosAnioLike): Prisma.Decimal {
  if (vacio(parametros.responsable_iva)) {
    throw new ParametroFiscalFaltante(
      `No se ha decidido si ${parametros.anio} es responsable de IVA; la reteIVA depende de eso.`,
    )
  }
  if (parametros.responsable_iva === false || vacio(parametros.tarifa_reteiva)) {
    return new Prisma.Decimal(0)
  }
  return dec(baseIva).mul(dec(parametros.tarifa_reteiva as Num)).div(100).toDecimalPlaces(2)
}

// ─── Derivados (nunca columnas) ──────────────────────────────────────────────

/**
 * COSTO deducible de un egreso — la función que depende de la bandera.
 *
 * · NO responsable de IVA → el IVA pagado es COSTO: base + IVA.
 * · Responsable          → el IVA es crédito fiscal, no costo: solo base.
 *
 * Usar `valor_base` a secas subestimaría cada egreso en el 19 %, y el reporte
 * de gastos mentiría por debajo.
 */
export function costoEgreso(
  e: { valor_base: Num; iva_pagado: Num },
  responsableIva: boolean | null | undefined,
): Prisma.Decimal {
  if (vacio(responsableIva)) {
    throw new ParametroFiscalFaltante(
      'No se ha decidido si el año es responsable de IVA: no se puede saber si el IVA pagado es costo o crédito.',
    )
  }
  return responsableIva
    ? dec(e.valor_base)
    : dec(e.valor_base).plus(dec(e.iva_pagado)).toDecimalPlaces(2)
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

/** Valor que se PAGA en un egreso (base + IVA − lo que le retuvimos). DERIVADO. */
export function netoEgreso(a: {
  valor_base: Num; iva_pagado: Num
  retefuente_practicada: Num; reteica_practicada: Num; reteiva_practicada: Num
}): Prisma.Decimal {
  return dec(a.valor_base).plus(dec(a.iva_pagado))
    .sub(dec(a.retefuente_practicada)).sub(dec(a.reteica_practicada)).sub(dec(a.reteiva_practicada))
    .toDecimalPlaces(2)
}

// ─── Discrepancias ───────────────────────────────────────────────────────────

export interface Discrepancia {
  hay: boolean
  /** practicada − sugerida. Positivo = le retuvieron de MÁS. */
  diferencia: Prisma.Decimal | null
  /** false cuando no se pudo calcular el sugerido (faltaba el parámetro). */
  calculable: boolean
}

/**
 * Compara lo que la contraparte practicó con lo que el sistema calculó. La
 * discrepancia NO se guarda: se deriva de los dos valores almacenados. Un
 * cliente que retiene de más es dinero recuperable; uno que retiene de menos
 * deja un saldo que la DIAN cobrará. Ambos casos deben verse.
 */
export function compararRetencion(
  practicada: Num,
  sugerida: Num | null | undefined,
  toleranciaPesos: Num = 1,
): Discrepancia {
  if (vacio(sugerida)) return { hay: false, diferencia: null, calculable: false }
  const diff = dec(practicada).sub(dec(sugerida as Num))
  return { hay: diff.abs().gt(dec(toleranciaPesos)), diferencia: diff, calculable: true }
}
