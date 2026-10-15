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
  ErrorDeEntrada, ErrorEsquemaNotarial, FRASE_EVIDENCIA, GRUPOS,
  type TipoEvidencia,
  type AnioNotarial, type Concepto, type Entrada, type Fuente,
  type Grupo, type Linea, type Liquidacion, type Modo,
} from './tipos.ts'
import { Prisma } from '@prisma/client'
import { evaluarTramos, pesos, redondear, repartir, tasa } from './tramos.ts'
import { calcularBase, type Base } from './bases.ts'
import { calcularRetencion } from './retencion.ts'
import {
  citaPublica, exigirAnioPublicable, exigirFechaIso, exigirVigencia, tipoDeEvidencia,
} from './guardas.ts'
import { liquidarIva, type AporteIva } from './iva.ts'
import { codigoTrazabilidad } from './trazabilidad.ts'
import { divisorDe } from '../escala-tarifa.ts'

/** Multiplicador de una tarifa suelta (no de un tramo). */
function multiplicador(c: Concepto): number {
  const v = tasa(c.valor, `la tarifa de ${c.label}`)
  const divisor = divisorDe(c.unidad)
  if (divisor !== null) return v / divisor
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

/** Lo que el usuario cuenta de este concepto, en singular o en plural. */
function unidadCapturada(c: Concepto, n = 1): string {
  if (n === 1) return c.unidad_captura_label ?? c.unidad_label ?? 'unidad'
  return c.unidad_captura_plural ?? c.unidad_plural ?? `${c.unidad_captura_label ?? c.unidad_label ?? 'unidad'}s`
}

/** La unidad de la TARIFA, en singular o en plural. */
function unidadTarifa(c: Concepto, n = 1): string {
  if (n === 1) return c.unidad_label ?? 'unidad'
  return c.unidad_plural ?? `${c.unidad_label ?? 'unidad'}s`
}

function cantidadDe(c: Concepto, entrada: Entrada, modo: Modo): { cantidad: number; asumida: boolean } {
  const n = entrada.cantidades?.[c.clave]
  if (n === undefined || n === null) {
    // La sencilla puede asumir una cantidad, pero solo si está DECLARADA, y lo
    // dice en la liquidación. Un valor por defecto escondido sería la clase de
    // supuesto que nadie ve.
    if (modo === 'SENCILLA' && c.cantidad_en_sencilla) {
      return { cantidad: c.cantidad_en_sencilla, asumida: true }
    }
    throw new ErrorDeEntrada(`Falta cuántas ${unidadCapturada(c, 2)} lleva la escritura.`, c.clave)
  }
  if (!Number.isInteger(n) || n < 1) {
    throw new ErrorDeEntrada(
      `La cantidad de ${unidadCapturada(c, 2)} tiene que ser un entero de 1 o más. ` +
      (c.opcional ? 'Si no aplica, desactiva el concepto.' : ''),
      c.clave,
    )
  }
  return { cantidad: n, asumida: false }
}

/**
 * El factor que viene de OTRO concepto. No se vuelve a preguntar: se lee de
 * donde ya está, que es el único modo de que no puedan discrepar.
 */
function factorDerivado(c: Concepto, anio: AnioNotarial, entrada: Entrada, modo: Modo): number {
  if (!c.multiplica_cantidad_de) return 1
  const origen = anio.conceptos.find(x => x.clave === c.multiplica_cantidad_de)
  if (!origen) {
    throw new ErrorEsquemaNotarial(
      `${c.label}: multiplica la cantidad de «${c.multiplica_cantidad_de}», que no es un concepto del año.`,
      'multiplica_cantidad_de',
    )
  }
  if (origen.tipo !== 'POR_UNIDAD') {
    throw new ErrorEsquemaNotarial(
      `${c.label}: multiplica la cantidad de ${origen.label}, que no se cobra por unidad.`,
      'multiplica_cantidad_de',
    )
  }
  if (origen.multiplica_cantidad_de) {
    throw new ErrorEsquemaNotarial(
      `${c.label}: multiplica una cantidad que ya es derivada (${origen.label}). Sin cadenas.`,
      'multiplica_cantidad_de',
    )
  }
  return cantidadDe(origen, entrada, modo).cantidad
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

/**
 * La única fila de una tabla sin base. Lanza si no es exactamente una, porque
 * «sin base» y «varias filas por cuantía» juntas no significan nada.
 */
function tablaSinBase(c: Concepto) {
  const tramos = c.tramos ?? []
  const unico = tramos[0]
  if (tramos.length !== 1 || !unico || unico.hasta !== null && unico.hasta !== undefined) {
    throw new ErrorEsquemaNotarial(
      `${c.label}: es una tabla por tramos sin base, así que solo puede tener una fila abierta ` +
      `(tiene ${tramos.length}).`,
      'tramos',
    )
  }
  return unico
}

/**
 * Desglose institucional del tramo que aplicó: cuánto del recaudo va a la
 * Superintendencia y cuánto al Fondo. Es distribución INSTITUCIONAL, no
 * económica: no cambia lo que paga el usuario ni cómo se reparte entre las
 * partes. Solo se imprime en el PDF.
 */
function desgloseDe(c: Concepto, base: number | null, uvt: number | null): { snr: number; fondo: number } | null {
  if (c.tipo !== 'TRAMOS') return null
  const tramos = [...(c.tramos ?? [])].sort((a, b) => a.orden - b.orden)
  if (base === null) {
    // Tabla de una sola fila: no hay nada que escoger.
    const unico = tramos[0]
    if (!unico || unico.aporte_snr === null || unico.aporte_snr === undefined) return null
    return { snr: Number(unico.aporte_snr), fondo: Number(unico.aporte_fondo ?? 0) }
  }
  for (const t of tramos) {
    if (t.aporte_snr === null || t.aporte_snr === undefined) continue
    const desde = Number(t.desde) * (t.en_uvt && uvt ? uvt : 1)
    const hasta = t.hasta === null || t.hasta === undefined
      ? null
      : Number(t.hasta) * (t.en_uvt && uvt ? uvt : 1)
    if (base > desde && (hasta === null || base <= hasta)) {
      return { snr: Number(t.aporte_snr), fondo: Number(t.aporte_fondo ?? 0) }
    }
  }
  return null
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

  // ── La fecha del acto decide QUÉ NORMAS aplican ──────────────────────────
  // El año es una etiqueta: ninguna de sus resoluciones empieza el 1 de enero.
  // Por defecto hoy, y la liquidación la devuelve para que el PDF la imprima.
  const hoy = opciones.fecha ?? new Date()
  const fechaActo = entrada.fecha_acto === null || entrada.fecha_acto === undefined || entrada.fecha_acto === ''
    ? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    : exigirFechaIso(entrada.fecha_acto, 'la fecha del acto')
  // Los respaldos del AÑO (UVT, UVB, tarifa de IVA, su redondeo y las cinco
  // bases) entran siempre: no hay liquidación que no los use.
  exigirVigencia(anio.respaldos ?? [], fechaActo)

  const tarifaIva = tasa(anio.tarifa_iva, 'la tarifa de IVA')
  const uvt = anio.uvt === null || anio.uvt === undefined ? null : Number(anio.uvt)
  const lineas: Linea[] = []
  const aportes: AporteIva[] = []
  const evidencias = new Map<string, { norma: string; tipo: TipoEvidencia; frase: string; cita: string; enlace: string | null }>()
  const anotarEvidencia = (r: typeof anio.respaldos extends (infer T)[] | undefined ? T : never) => {
    const tipo = tipoDeEvidencia(r)
    evidencias.set(r.norma, { norma: r.norma, tipo, frase: FRASE_EVIDENCIA[tipo], ...citaPublica(r) })
  }
  for (const r of anio.respaldos ?? []) anotarEvidencia(r)
  const basesUsadas = new Map<string, Base>()
  let tarifaRegistral: number | null = null

  for (const c of participantes(anio, entrada, modo)) {
    // Solo los conceptos que PARTICIPAN: una tarifa opcional y apagada cuya
    // norma empieza más tarde no tiene por qué detener esta liquidación.
    exigirVigencia(c.respaldos ?? [], fechaActo)
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
        if (base === null) {
          throw new ErrorEsquemaNotarial(
            `${c.label}: se liquida como tasa y no tiene base sobre la que aplicarse.`,
            'base',
          )
        }
        // Redondea como diga SU resolución, no al peso por costumbre.
        valor = redondear(multiplicador(c) * base.valor, c.redondeo, c.label)
        break
      case 'TRAMOS':
        // Una tabla SIN base es legítima cuando tiene una sola fila abierta: es
        // el recaudo de los actos sin cuantía, que no depende de ninguna
        // cuantía precisamente por eso. Sigue siendo una tabla y no un valor
        // fijo del concepto para que el desglose institucional viva donde viven
        // todos —en el tramo— y lo alcance la guarda que comprueba que sume.
        valor = base === null
          ? redondear(pesos(tablaSinBase(c).valor, `el valor de ${c.label}`), c.redondeo, c.label)
          : evaluarTramos(c.tramos!, base.valor, uvt, c.label, c.redondeo)
        break
      case 'POR_UNIDAD': {
        const { cantidad, asumida } = cantidadDe(c, entrada, modo)
        const factor = factorDerivado(c, anio, entrada, modo)
        const unitario = pesos(c.valor, `el valor de ${c.label}`)
        // Pesos por cantidades enteras: exacto, no hay nada que redondear.
        valor = unitario * cantidad * factor
        if (c.multiplica_cantidad_de) {
          const origen = anio.conceptos.find(x => x.clave === c.multiplica_cantidad_de)!
          const total = cantidad * factor
          avisos.push(
            `${cantidad} ${unidadCapturada(c, cantidad)} × ${factor} ${unidadTarifa(origen, factor)} ` +
            `= ${total} ${unidadTarifa(origen, total)}.`,
          )
        } else {
          avisos.push(`${cantidad} ${unidadTarifa(c, cantidad)}.`)
        }
        if (asumida) {
          avisos.push(
            `Se asumió ${cantidad} ${unidadCapturada(c, cantidad)}.` +
            (c.sesgo_en_sencilla ? ` ${c.sesgo_en_sencilla}` : ''),
          )
        }
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
        // Las reglas activas se evalúan todas, así que todas tienen que regir.
        for (const regla of anio.reglas_retencion) {
          if (regla.activa) exigirVigencia(regla.respaldos ?? [], fechaActo)
        }
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
    // ── Precio con el IVA DENTRO (art. 5, copia simple) ─────────────────────
    // El componente se EXTRAE del precio publicado; jamás se suma un 19 %
    // encima. Y no entra en BASE_IVA: un precio publicado con IVA incluido ya
    // viene liquidado por la resolución, así que la copia cuesta $700 la cara y
    // sigue costando $700 después de liquidar el IVA del resto de la escritura.
    let ivaIncluido = new Prisma.Decimal(0)
    if (c.precio_incluye_iva) {
      if (!c.grava_iva) {
        throw new ErrorEsquemaNotarial(
          `${c.label}: dice llevar el IVA incluido en el precio y a la vez no gravar IVA.`,
          'precio_incluye_iva',
        )
      }
      if (c.es_recaudo_terceros) {
        throw new ErrorEsquemaNotarial(
          `${c.label}: un recaudo para terceros no puede llevar IVA incluido.`,
          'precio_incluye_iva',
        )
      }
      const bruto = new Prisma.Decimal(valor)
      const neto = bruto.div(new Prisma.Decimal(1).add(new Prisma.Decimal(tarifaIva).div(100)))
      ivaIncluido = bruto.sub(neto)
    }

    const pct = pctDe(c, entrada)
    // El IVA de la línea NO se redondea ni se reparte aquí: se acumula exacto y
    // se liquida UNA vez sobre el total. Redondear por línea haría que dos
    // conceptos de 20.004 sumaran 40.000 en vez de 40.010.
    const ivaExacto = c.grava_iva && !c.precio_incluye_iva
      ? new Prisma.Decimal(valor).mul(tarifaIva).div(100)
      : new Prisma.Decimal(0)
    if (c.grava_iva && !c.precio_incluye_iva) {
      aportes.push({ clave: c.clave, base: valor, pct_comprador: pct })
    }
    const rv = repartir(valor, pct)

    for (const r of c.respaldos ?? []) {
      // «documento oficial archivado» y «enlace oficial» son dos afirmaciones
      // distintas, y quien lea la simulación tiene derecho a saber cuál tiene
      // delante. Va pegado a la norma, no en una nota al pie.
      normas.push(
        `${r.norma}${r.articulo ? `, ${r.articulo}` : ''} — ${FRASE_EVIDENCIA[tipoDeEvidencia(r)]}`,
      )
      anotarEvidencia(r)
    }
    if (c.motivo_reparto === 'NORMA_SUPLETIVA' && c.norma_reparto) {
      normas.push(`Reparto: ${c.norma_reparto} (salvo pacto entre las partes).`)
    }
    if (modo === 'SENCILLA' && c.es_estimacion_en_sencilla) {
      avisos.push(`Es una estimación. ${c.sesgo_en_sencilla ?? ''}`.trim())
    }
    if (c.cantidad_variable_por_notaria) avisos.push('Este valor cambia de una notaría a otra.')
    // Genérico a propósito: «cuántas personas firmen» vale para la biometría y
    // no para las copias. Lo específico va en la ayuda de cada concepto.
    if (c.cantidad_variable_por_operacion) avisos.push('La cantidad depende de la operación.')

    lineas.push({
      clave: c.clave,
      label: c.label,
      grupo: c.grupo,
      base,
      valor,
      iva_exacto: ivaExacto.toString(),
      ...(c.precio_incluye_iva ? { iva_incluido_exacto: ivaIncluido.toString() } : {}),
      ...(desgloseDe(c, base?.valor ?? null, uvt) ? { desglose_institucional: desgloseDe(c, base?.valor ?? null, uvt) } : {}),
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
  // El IVA que ya venía DENTRO de precios publicados no se vuelve a liquidar:
  // se informa, para que el PDF pueda decir cuánto IVA pagó en total.
  const ivaIncluidoEnPrecios = lineas.reduce(
    (acc, l) => acc.add(new Prisma.Decimal(l.iva_incluido_exacto ?? 0)),
    new Prisma.Decimal(0),
  ).toString()

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
    // Vale para cualquiera de los cuatro candidatos del art. 51 a), no solo
    // para el avalúo: lo que sorprende es que la base NO sea el precio pactado.
    if (!b.motivo.startsWith('Se tomó el valor pactado')) { avisos.push(b.motivo); break }
  }
  if (deudas.length) {
    avisos.push('Las obligaciones del inmueble van aparte: no son costo del trámite, son deuda del predio.')
  }

  return {
    fecha_acto: fechaActo,
    evidencias: [...evidencias.values()],
    lineas,
    grupos,
    iva,
    iva_incluido_en_precios: ivaIncluidoEnPrecios,
    totales,
    obligaciones,
    bases: [...basesUsadas.values()].map(b => ({ clave: b.clave, valor: b.valor, motivo: b.motivo })),
    avisos,
    trazabilidad: codigoTrazabilidad({ anio: anio.anio, version: anio.version, fecha: opciones.fecha }),
    modo,
  }
}
