/**
 * TRAMOS — módulo HOJA
 * ====================
 *
 * Un solo mecanismo cubre los tres casos que parecen distintos: el mínimo de
 * los derechos notariales, los tramos ORIP y los tramos marginales del timbre.
 * Así, partir un tramo en dos el día que lo haga una resolución es una fila.
 *
 * LOS TRES MODOS, escritos antes del código que los usa:
 *   · FIJO             — pesos del tramo. Ignora la base.
 *   · TASA_SOBRE_TOTAL — tasa sobre la base COMPLETA (ORIP).
 *   · TASA_MARGINAL    — tasa sobre `(base − desde)`, acumulando los anteriores.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL ESCALÓN DE LOS DERECHOS NOTARIALES — leer antes de «arreglar» nada.
 *
 * La fórmula publicada para 2026 es: valor fijo hasta una cuantía de corte, y
 * 3 por mil sobre el EXCEDENTE. Con las cifras que circulan —$30.900 hasta
 * $259.300— el excedente no iguala al mínimo hasta una base de unos diez
 * millones: una finca de $5.000.000 y una de $9.000.000 pagarían casi lo mismo.
 * Parece un error y no lo es necesariamente.
 *
 * REGLA: se implementa LITERALMENTE lo que diga la resolución oficial. Ni se
 * corrige por intuición matemática, ni se descarta por parecer raro. Quien lea
 * esto después y vea el escalón: no es un bug, está verificado contra el PDF
 * —o, mientras no haya PDF, el concepto está sin tarifa y el año no se activa.
 *
 * Lo único que SÍ se rechaza es una tabla NO MONÓTONA: si un inmueble más caro
 * paga menos que uno más barato, eso no es una tarifa, es una tabla mal
 * cargada. Ver `verificarTramos`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { leerNumero } from '../finanzas/numeros.ts'
import { ErrorEsquemaNotarial, type Monotonicidad, type Redondeo, type Tramo } from './tipos.ts'

/** Pesos: «52.374» son cincuenta y dos mil, no 52,374. */
export function pesos(v: unknown, campo: string): number {
  const s = leerNumero(v, 'pesos', campo)
  if (s === null) throw new ErrorEsquemaNotarial(`Falta ${campo}.`, campo)
  return Number(s)
}

/** Tasas: punto y coma son decimales («9,11» por mil, «1,5» %). */
export function tasa(v: unknown, campo: string): number {
  const s = leerNumero(v, 'tasa', campo)
  if (s === null) throw new ErrorEsquemaNotarial(`Falta ${campo}.`, campo)
  return Number(s)
}

/**
 * Redondeo INTERNO del motor, al peso más cercano. Se usa solo donde la
 * aritmética es nuestra y no de la resolución: el IVA calculado sobre una base
 * ya redondeada, y el reparto entre las partes —que no puede ir a la centena, o
 * las dos mitades dejarían de sumar el total—.
 *
 * El redondeo de una TARIFA no se decide aquí: ver `redondear`.
 */
export const alPeso = (n: number): number => Math.round(n)

/**
 * Redondeo de una tarifa, como lo diga su resolución. Sin `Redondeo` cargado se
 * detiene: un «al peso más cercano» por defecto sería una regla inventada, y
 * encima invisible —daría cifras plausibles y nadie iría a mirar—.
 */
export function redondear(n: number, r: Redondeo | null | undefined, etiqueta: string): number {
  if (!r) {
    throw new ErrorEsquemaNotarial(
      `${etiqueta}: no se sabe a qué unidad redondea esta tarifa ni en qué sentido. ` +
      'Lo dice la resolución, no el motor.',
      'redondeo',
    )
  }
  if (!Number.isInteger(r.unidad) || r.unidad < 1) {
    throw new ErrorEsquemaNotarial(`${etiqueta}: unidad de redondeo inválida (${r.unidad}).`, 'redondeo')
  }
  const q = n / r.unidad
  const entero = r.modo === 'ARRIBA' ? Math.ceil(q) : r.modo === 'ABAJO' ? Math.floor(q) : Math.round(q)
  return entero * r.unidad
}

/**
 * Reparte un total entre comprador y vendedor SIN perder ni inventar un peso:
 * se redondea la parte del comprador y el resto es del vendedor. Un 50/50 de
 * $30.901 da 15.451 y 15.450, no dos veces 15.450,5 que no suman el total.
 */
export function repartir(total: number, pctComprador: number): { comprador: number; vendedor: number } {
  const comprador = alPeso((total * pctComprador) / 100)
  return { comprador, vendedor: total - comprador }
}

/** El multiplicador de un tramo según su unidad. PESOS no es una tasa. */
function multiplicador(t: Tramo, etiqueta: string): number {
  const v = tasa(t.valor, `${etiqueta} (tramo ${t.orden})`)
  if (t.unidad === 'PORCENTAJE') return v / 100
  if (t.unidad === 'POR_MIL') return v / 1000
  throw new ErrorEsquemaNotarial(
    `El tramo ${t.orden} de ${etiqueta} usa ${t.modo_calculo} con unidad PESOS: una tasa no se expresa en pesos.`,
    'unidad',
  )
}

/** Límite del tramo en PESOS. Si va en UVT, exige el UVT del año. */
function limite(valor: string | number, enUvt: boolean, uvt: number | null, etiqueta: string): number {
  const n = pesos(valor, `${etiqueta}: límite del tramo`)
  if (!enUvt) return n
  if (uvt === null) {
    throw new ErrorEsquemaNotarial(
      `${etiqueta} tiene tramos en UVT y el año no tiene UVT cargado.`,
      'uvt',
    )
  }
  return n * uvt
}

/**
 * El valor SIN redondear. Existe aparte para poder comprobar la fórmula contra
 * una cuenta hecha a mano —$10.500.000 → $61.622,10— sin que el redondeo
 * esconda una diferencia de decimales.
 */
export function evaluarTramosCrudo(
  tramos: Tramo[],
  base: number,
  uvt: number | null,
  etiqueta = 'concepto',
): number {
  if (!tramos.length) throw new ErrorEsquemaNotarial(`${etiqueta} no tiene tramos cargados.`, 'tramos')
  const orden = [...tramos].sort((a, b) => a.orden - b.orden)
  const marginal = orden.some(t => t.modo_calculo === 'TASA_MARGINAL')

  if (marginal) {
    // Acumula tramo por tramo. Un tramo FIJO dentro de una tabla marginal es
    // legítimo: es la forma del mínimo notarial —valor fijo hasta la cuantía de
    // corte, y tasa sobre el excedente a partir de ahí.
    let total = 0
    for (const t of orden) {
      const desde = limite(t.desde, !!t.en_uvt, uvt, etiqueta)
      if (base <= desde) break
      if (t.modo_calculo === 'FIJO') {
        total += pesos(t.valor, `${etiqueta} (tramo ${t.orden})`)
        continue
      }
      const hasta = t.hasta === null || t.hasta === undefined
        ? base
        : limite(t.hasta, !!t.en_uvt, uvt, etiqueta)
      total += multiplicador(t, etiqueta) * (Math.min(base, hasta) - desde)
    }
    return total
  }

  for (const t of orden) {
    const desde = limite(t.desde, !!t.en_uvt, uvt, etiqueta)
    const hasta = t.hasta === null || t.hasta === undefined
      ? null
      : limite(t.hasta, !!t.en_uvt, uvt, etiqueta)
    const dentro = base > desde && (hasta === null || base <= hasta)
    if (!dentro) continue
    if (t.modo_calculo === 'FIJO') return pesos(t.valor, `${etiqueta} (tramo ${t.orden})`)
    return multiplicador(t, etiqueta) * base
  }
  throw new ErrorEsquemaNotarial(
    `${etiqueta}: la base ${base} no cae en ningún tramo. La tabla tiene un hueco.`,
    'tramos',
  )
}

/** El valor de la tarifa, redondeado como diga su resolución. */
export function evaluarTramos(
  tramos: Tramo[],
  base: number,
  uvt: number | null,
  etiqueta = 'concepto',
  redondeo?: Redondeo | null,
): number {
  return redondear(evaluarTramosCrudo(tramos, base, uvt, etiqueta), redondeo, etiqueta)
}

export interface OpcionesTramos {
  monotonicidad?: Monotonicidad
  redondeo?: Redondeo | null
}

/**
 * Coherencia de la tabla. Lanza, no filtra: una tabla de tarifas a medias da
 * una cifra plausible y equivocada, que es la peor de las dos.
 */
export function verificarTramos(
  tramos: Tramo[],
  uvt: number | null,
  etiqueta = 'concepto',
  opciones: OpcionesTramos = {},
): void {
  if (!tramos.length) throw new ErrorEsquemaNotarial(`${etiqueta} no tiene tramos cargados.`, 'tramos')
  const orden = [...tramos].sort((a, b) => a.orden - b.orden)
  const primero = orden[0]
  const ultimo = orden[orden.length - 1]
  if (!primero || !ultimo) throw new ErrorEsquemaNotarial(`${etiqueta} no tiene tramos cargados.`, 'tramos')

  const enUvt = !!primero.en_uvt
  for (const t of orden) {
    if (!!t.en_uvt !== enUvt) {
      throw new ErrorEsquemaNotarial(
        `${etiqueta} mezcla tramos en UVT con tramos en pesos.`,
        'en_uvt',
      )
    }
    if (t.modo_calculo === 'FIJO' && t.unidad !== 'PESOS') {
      throw new ErrorEsquemaNotarial(
        `El tramo ${t.orden} de ${etiqueta} es FIJO pero su unidad no es PESOS.`,
        'unidad',
      )
    }
    if (t.modo_calculo !== 'FIJO' && t.unidad === 'PESOS') {
      throw new ErrorEsquemaNotarial(
        `El tramo ${t.orden} de ${etiqueta} es una tasa expresada en PESOS.`,
        'unidad',
      )
    }
  }

  const hayMarginal = orden.some(t => t.modo_calculo === 'TASA_MARGINAL')
  const haySobreTotal = orden.some(t => t.modo_calculo === 'TASA_SOBRE_TOTAL')
  if (hayMarginal && haySobreTotal) {
    throw new ErrorEsquemaNotarial(
      `${etiqueta} mezcla TASA_MARGINAL con TASA_SOBRE_TOTAL: el resultado sería ambiguo.`,
      'modo_calculo',
    )
  }

  if (pesos(primero.desde, `${etiqueta}: primer tramo`) !== 0) {
    throw new ErrorEsquemaNotarial(`${etiqueta}: el primer tramo no arranca en 0.`, 'desde')
  }
  const abiertos = orden.filter(t => t.hasta === null || t.hasta === undefined)
  if (abiertos.length !== 1) {
    throw new ErrorEsquemaNotarial(
      `${etiqueta} tiene ${abiertos.length} tramos abiertos; debe tener exactamente uno.`,
      'hasta',
    )
  }
  if (ultimo.hasta !== null && ultimo.hasta !== undefined) {
    throw new ErrorEsquemaNotarial(`${etiqueta}: el tramo abierto no es el último.`, 'hasta')
  }
  for (let i = 0; i < orden.length - 1; i++) {
    const actual = orden[i]
    const siguiente = orden[i + 1]
    if (!actual || !siguiente) continue
    const hasta = actual.hasta
    if (hasta === null || hasta === undefined) continue
    const h = pesos(hasta, `${etiqueta}: tramo ${actual.orden}`)
    const d = pesos(siguiente.desde, `${etiqueta}: tramo ${siguiente.orden}`)
    if (h !== d) {
      throw new ErrorEsquemaNotarial(
        `${etiqueta}: entre el tramo ${actual.orden} y el ${siguiente.orden} hay ${h < d ? 'un hueco' : 'un solape'} (${h} → ${d}).`,
        'tramos',
      )
    }
  }

  // Monotonía en cada frontera, SOLO si el concepto se configuró como no
  // decreciente. No se aplica a todas las tarifas: «ninguna tarifa baja» sería
  // una creencia sobre el mundo, y una resolución futura puede desmentirla.
  // Configurado así, lo que la guarda afirma es comprobable: «esta tarifa se
  // declaró no decreciente y la tabla cargada la hace bajar».
  //
  // Se compara SIN redondear, para que un redondeo a la centena no tape una
  // caída pequeña ni invente una.
  if (opciones.monotonicidad === 'NO_DECRECIENTE') {
    for (const t of orden) {
      if (t.hasta === null || t.hasta === undefined) continue
      const h = limite(t.hasta, enUvt, uvt, etiqueta)
      const antes = evaluarTramosCrudo(orden, h, uvt, etiqueta)
      const despues = evaluarTramosCrudo(orden, h + 1, uvt, etiqueta)
      if (despues < antes) {
        throw new ErrorEsquemaNotarial(
          `${etiqueta}: está configurada como no decreciente y en la frontera ${h} la tarifa BAJA ` +
          `(${antes} → ${despues}). Revisa el modo de cálculo o la unidad del tramo contra la resolución.`,
          'modo_calculo',
        )
      }
    }
  }
}
