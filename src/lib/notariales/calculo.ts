/**
 * MOTOR DE LIQUIDACIÓN — módulo HOJA
 * ==================================
 *
 * Convierte un año tarifario y una operación en la liquidación completa: línea
 * por línea, con su base, su IVA, su reparto y su norma.
 *
 * Tres cosas que este archivo NO hace, y es deliberado:
 *
 *  1. No tiene ni una tarifa. Todas entran por el año, y el año no se liquida
 *     si a un concepto le falta su respaldo oficial (`exigirAnioPublicable`).
 *  2. No inventa un cero. Si falta una cantidad, si llega un reparto para un
 *     concepto que no se reparte, o si ninguna regla de retención aplica, se
 *     detiene. Un cero en una liquidación se lee como «esto no se paga».
 *  3. No reparte el IVA por su cuenta. El IVA sigue el reparto del concepto que
 *     lo genera: si el comprador asume el 100 % de las copias, el IVA de esas
 *     copias es suyo. Un 50/50 plano contradiría el reparto configurado arriba,
 *     en la misma pantalla.
 */

import {
  ErrorDeEntrada, ErrorEsquemaNotarial, GRUPOS,
  type AnioNotarial, type Concepto, type Entrada, type Fuente,
  type Grupo, type Linea, type Liquidacion, type Modo,
} from './tipos.ts'
import { Prisma } from '@prisma/client'
import { evaluarTramos, pesos, redondear, repartir, tasa } from './tramos.ts'
import { calcularBase, type Base } from './bases.ts'
import { calcularRetencion } from './retencion.ts'
import { exigirAnioPublicable } from './guardas.ts'
import { liquidarIva, type AporteIva } from './iva.ts'
import { codigoTrazabilidad } from './trazabilidad.ts'

/** Multiplicador de una tarifa suelta (no de un tramo). */
function multiplicador(c: Concepto): number {
  const v = tasa(c.valor, `la tarifa de ${c.label}`)
  if (c.unidad === 'PORCENTAJE') return v / 100
  if (c.unidad === 'POR_MIL') return v / 1000
  throw new ErrorEsquemaNotarial(`${c.label}: la tarifa no dice si es porcentaje o por mil.`, 'unidad')
}

/**
 * Qué conceptos entran.
 *
 * `entrada.opcionales`, cuando viene, REEMPLAZA el valor por defecto de los
 * opcionales: solo quedan activos los que vengan en la lista. Si no viene, se
 * usa `activo_por_defecto`. Así se puede apagar algo que viene encendido sin
 * necesitar un segundo campo para decir «apágalo».
 */
function participantes(anio: AnioNotarial, entrada: Entrada, modo: Modo): Concepto[] {
  const elegidos = entrada.opcionales
  return anio.conceptos
    .filter(c => (modo === 'SENCILLA' ? c.aplica_en_sencilla : true))
    .filter(c => !c.opcional || (elegidos ? elegidos.includes(c.clave) : c.activo_por_defecto))
    .sort((a, b) => a.orden - b.orden)
}

/** Lo que manda el cliente se valida contra las claves del año, no se confía. */
function exigirClavesConocidas(anio: AnioNotarial, entrada: Entrada): void {
  const claves = new Set(anio.conceptos.map(c => c.clave))
  for (const [campo, mapa] of [
    ['cantidades', entrada.cantidades],
    ['repartos', entrada.repartos],
    ['valores_libres', entrada.valores_libres],
  ] as const) {
    for (const clave of Object.keys(mapa ?? {})) {
      if (!claves.has(clave)) throw new ErrorDeEntrada(`«${clave}» no es un concepto de ${anio.anio}.`, campo)
    }
  }
  for (const clave of entrada.opcionales ?? []) {
    if (!claves.has(clave)) throw new ErrorDeEntrada(`«${clave}» no es un concepto de ${anio.anio}.`, 'opcionales')
  }
}

function cantidadDe(c: Concepto, entrada: Entrada): number {
  const n = entrada.cantidades?.[c.clave]
  if (n === undefined || n === null) {
    throw new ErrorDeEntrada(`Falta cuántas ${c.unidad_label ?? 'unidades'}(s) lleva la escritura.`, c.clave)
  }
  if (!Number.isInteger(n) || n < 1) {
    throw new ErrorDeEntrada(
      `La cantidad de ${c.unidad_label ?? 'unidades'} tiene que ser un entero de 1 o más. ` +
      (c.opcional ? 'Si no aplica, desactiva el concepto.' : ''),
      c.clave,
    )
  }
  return n
}

function pctDe(c: Concepto, entrada: Entrada): number {
  const override = entrada.repartos?.[c.clave]
  if (override === undefined || override === null) return c.reparto_por_defecto
  if (!c.reparto_editable) {
    throw new ErrorDeEntrada(
      `${c.label} no se reparte: ${c.sujeto_legal === 'VENDEDOR' ? 'el vendedor' : 'una de las partes'} ` +
      'es el contribuyente. No se puede cambiar desde la simulación.',
      c.clave,
    )
  }
  if (typeof override !== 'number' || !Number.isFinite(override) || override < 0 || override > 100) {
    throw new ErrorDeEntrada(`El reparto de ${c.label} tiene que ir entre 0 y 100.`, c.clave)
  }
  return override
}

export function liquidar(
  anio: AnioNotarial,
  entrada: Entrada,
  opciones: { modo?: Modo; fuentes: Fuente[]; fecha?: Date },
): Liquidacion {
  const modo: Modo = opciones.modo ?? 'AVANZADA'
  // La puerta: o el año está completo y respaldado, o no se liquida nada.
  exigirAnioPublicable(anio, opciones.fuentes)
  exigirClavesConocidas(anio, entrada)

  const tarifaIva = tasa(anio.tarifa_iva, 'la tarifa de IVA')
  const uvt = anio.uvt === null || anio.uvt === undefined ? null : Number(anio.uvt)
  const lineas: Linea[] = []
  const aportes: AporteIva[] = []
  const basesUsadas = new Map<string, Base>()
  let tarifaRegistral: number | null = null

  for (const c of participantes(anio, entrada, modo)) {
    // ── Base ────────────────────────────────────────────────────────────────
    let base: Linea['base'] = null
    if (c.base === 'TARIFA_REGISTRAL') {
      if (tarifaRegistral === null) {
        throw new ErrorEsquemaNotarial(
          `${c.label} se calcula sobre la tarifa registral y los derechos de registro no se liquidaron antes.`,
          'orden',
        )
      }
      base = { clave: 'TARIFA_REGISTRAL', valor: tarifaRegistral, motivo: 'Se calculó sobre los derechos de registro liquidados.' }
    } else if (c.base !== 'UNIDADES' && c.base !== 'NINGUNA') {
      const b = calcularBase(c.base, entrada)
      basesUsadas.set(b.clave, b)
      base = { clave: b.clave, valor: b.valor, motivo: b.motivo }
    }

    // ── Valor ───────────────────────────────────────────────────────────────
    let valor: number
    const normas: string[] = []
    const avisos: string[] = []

    switch (c.tipo) {
      case 'FIJO':
        valor = pesos(c.valor, `el valor de ${c.label}`)
        break
      case 'PORCENTAJE':
      case 'POR_MIL':
        // Redondea como diga SU resolución, no al peso por costumbre.
        valor = redondear(multiplicador(c) * base!.valor, c.redondeo, c.label)
        break
      case 'TRAMOS':
        valor = evaluarTramos(c.tramos!, base!.valor, uvt, c.label, c.redondeo)
        break
      case 'POR_UNIDAD': {
        const cantidad = cantidadDe(c, entrada)
        // Pesos por una cantidad entera: exacto, no hay nada que redondear.
        valor = pesos(c.valor, `el valor de ${c.label}`) * cantidad
        avisos.push(`${cantidad} ${c.unidad_label}${cantidad === 1 ? '' : 's'}.`)
        break
      }
      case 'VALOR_LIBRE': {
        const v = entrada.valores_libres?.[c.clave]
        if (v === undefined || v === null || v === '') {
          throw new ErrorDeEntrada(`Falta el valor de ${c.label}.`, c.clave)
        }
        valor = pesos(v, `el valor de ${c.label}`)
        if (valor < 0) throw new ErrorDeEntrada(`${c.label} no puede ser negativo.`, c.clave)
        avisos.push('Valor indicado por quien hace la simulación, no una tarifa.')
        break
      }
      case 'REGLAS': {
        const r = calcularRetencion(
          anio.reglas_retencion,
          base!.valor,
          // El valor en UVT se deriva aquí: así una regla futura que dependa de
          // él es de verdad una fila, sin preguntar nada nuevo.
          { ...(uvt ? { valor_en_uvt: base!.valor / uvt } : {}), ...(entrada.contexto ?? {}) },
        )
        valor = r.valor
        normas.push(r.detalle)
        break
      }
      default:
        throw new ErrorEsquemaNotarial(`${c.label}: tipo de cálculo desconocido (${c.tipo}).`, 'tipo')
    }

    if (c.clave === 'derechos_orip') tarifaRegistral = valor

    // ── IVA y reparto ───────────────────────────────────────────────────────
    const pct = pctDe(c, entrada)
    // El IVA de la línea NO se redondea ni se reparte aquí: se acumula exacto y
    // se liquida UNA vez sobre el total. Redondear por línea haría que dos
    // conceptos de 20.004 sumaran 40.000 en vez de 40.010.
    const ivaExacto = c.grava_iva ? new Prisma.Decimal(valor).mul(tarifaIva).div(100) : new Prisma.Decimal(0)
    if (c.grava_iva) aportes.push({ clave: c.clave, base: valor, pct_comprador: pct })
    const rv = repartir(valor, pct)

    for (const r of c.respaldos ?? []) normas.push(`${r.norma}${r.articulo ? `, ${r.articulo}` : ''}`)
    if (c.motivo_reparto === 'NORMA_SUPLETIVA' && c.norma_reparto) {
      normas.push(`Reparto: ${c.norma_reparto} (salvo pacto entre las partes).`)
    }
    if (modo === 'SENCILLA' && c.es_estimacion_en_sencilla) {
      avisos.push('Es una estimación: el valor exacto depende de la notaría.')
    }
    if (c.cantidad_variable_por_notaria) avisos.push('Este valor cambia de una notaría a otra.')
    if (c.cantidad_variable_por_operacion) avisos.push('La cantidad depende de cuántas personas firmen.')

    lineas.push({
      clave: c.clave,
      label: c.label,
      grupo: c.grupo,
      base,
      valor,
      iva_exacto: ivaExacto.toString(),
      total: valor,
      comprador: rv.comprador,
      vendedor: rv.vendedor,
      pct_comprador: pct,
      sujeto_legal: c.sujeto_legal,
      motivo_reparto: c.motivo_reparto,
      norma_reparto: c.norma_reparto ?? null,
      normas,
      es_recaudo_terceros: c.es_recaudo_terceros,
      avisos,
    })
  }

  // ── IVA derivado: los siete valores, con un solo redondeo ─────────────────
  // La base es la remuneración gravada. Los recaudos para terceros NO están en
  // ella por construcción: un concepto que grave IVA y sea recaudo a la vez lo
  // rechaza la guarda del esquema, no este cálculo.
  const iva = liquidarIva(aportes, tarifaIva, anio.redondeo_iva)

  // ── Grupos, totales y la invariante ───────────────────────────────────────
  // El IVA se muestra dentro de COSTOS NOTARIALES, que es donde se genera.
  const grupos = GRUPOS.map(g => {
    const suyas = lineas.filter(l => l.grupo === g.clave)
    const suIva = g.clave === 'COSTOS_NOTARIALES'
    return {
      ...g,
      total: suyas.reduce((s, l) => s + l.total, 0) + (suIva ? iva.liquidado : 0),
      comprador: suyas.reduce((s, l) => s + l.comprador, 0) + (suIva ? iva.comprador : 0),
      vendedor: suyas.reduce((s, l) => s + l.vendedor, 0) + (suIva ? iva.vendedor : 0),
    }
  }).filter(g => lineas.some(l => l.grupo === g.clave))

  const esObligacion = (g: Grupo) => g === 'OBLIGACIONES'
  const tramite = lineas.filter(l => !esObligacion(l.grupo))
  const deudas = lineas.filter(l => esObligacion(l.grupo))
  const totales = {
    total: tramite.reduce((s, l) => s + l.total, 0) + iva.liquidado,
    comprador: tramite.reduce((s, l) => s + l.comprador, 0) + iva.comprador,
    vendedor: tramite.reduce((s, l) => s + l.vendedor, 0) + iva.vendedor,
  }
  const obligaciones = {
    total: deudas.reduce((s, l) => s + l.total, 0),
    comprador: deudas.reduce((s, l) => s + l.comprador, 0),
    vendedor: deudas.reduce((s, l) => s + l.vendedor, 0),
  }
  // Si esto falla es un error de redondeo del propio motor, no del usuario: una
  // liquidación en la que las partes no suman el total no se entrega.
  if (totales.comprador + totales.vendedor !== totales.total) {
    throw new ErrorEsquemaNotarial(
      `Las partes no suman el total (${totales.comprador} + ${totales.vendedor} ≠ ${totales.total}).`,
      'totales',
    )
  }

  // ── Avisos de la simulación ───────────────────────────────────────────────
  const avisos: string[] = []
  if (modo === 'SENCILLA') {
    const fuera = anio.conceptos
      .filter(c => !c.aplica_en_sencilla)
      .map(c => c.label.toLowerCase())
    if (fuera.length) {
      avisos.push(`Es una estimación. No incluye ${fuera.join(', ')}, que varían según la notaría y la operación.`)
    }
  }
  if (entrada.avaluo_catastral === null || entrada.avaluo_catastral === undefined || entrada.avaluo_catastral === '') {
    avisos.push(
      'No se indicó el avalúo catastral. Varios conceptos se liquidan sobre el mayor entre precio y avalúo: ' +
      'si el avalúo fuera superior, el resultado quedaría por debajo.',
    )
  }
  for (const b of basesUsadas.values()) {
    if (b.motivo.startsWith('Se tomó el avalúo')) { avisos.push(b.motivo); break }
  }
  if (deudas.length) {
    avisos.push('Las obligaciones del inmueble van aparte: no son costo del trámite, son deuda del predio.')
  }

  return {
    lineas,
    grupos,
    iva,
    totales,
    obligaciones,
    bases: [...basesUsadas.values()].map(b => ({ clave: b.clave, valor: b.valor, motivo: b.motivo })),
    avisos,
    trazabilidad: codigoTrazabilidad({ anio: anio.anio, version: anio.version, fecha: opciones.fecha }),
    modo,
  }
}
