/**
 * REGLAS DE LA CAPTURA DE INGRESOS — módulo HOJA (sin imports)
 * ============================================================
 *
 * Lo ejecutan el navegador (validar antes de enviar), el servidor (validar lo
 * que llega) y la prueba con Node. Una definición sola de qué es un ingreso
 * capturable, qué le falta, y cómo se reparte una comisión.
 *
 * MISMO PRINCIPIO QUE LOS EGRESOS: lo mínimo es valor + tipo de servicio +
 * con quién. Factura, retenciones y fecha de recaudo se completan en el
 * escritorio, y mientras tanto el ingreso YA cuenta en los reportes.
 *
 * LO QUE AQUÍ NO SE CALCULA: ninguna tarifa. Las retenciones que nos practican
 * son un HECHO del comprobante del cliente y se guardan como tal; el sugerido
 * que las contrasta lo calcula `calculo.ts` con los parámetros del año, y solo
 * si ese año está ACTIVO.
 */

export type RolParte = 'PROPIA' | 'CORREDOR_EXTERNO' | 'ASESOR_INTERNO'

export interface ParteComision {
  rol: RolParte
  /** Null en la parte PROPIA. */
  tercero_id?: string | null
  /** Etiqueta solo para la pantalla. */
  etiqueta?: string
  /** En pesos. Las filas suman la comisión TOTAL, incluida la propia. */
  valor: string
}

export interface IngresoCapturado {
  valor: string
  tipo_servicio_id: string
  /** Comisión de venta: la propiedad. */
  property_id?: string | null
  /** Quién paga. Obligatorio: sin tercero no hay a quién facturar. */
  tercero_id?: string | null
  fecha_causacion?: string | null
  /** Cuándo entró la plata. Vacío = causado pero no recaudado. */
  fecha_recaudo?: string | null
  numero_factura?: string | null
  /** Hecho del comprobante del cliente, no un cálculo nuestro. */
  retefuente_practicada?: string | null
  reteica_practicada?: string | null
  reteiva_practicada?: string | null
  iva_generado?: string | null
  /** Foto del CIIU al causar. Sin él, el ICA no se calcula. */
  ciiu?: string | null
  municipio_ica?: string | null
  /** true = facturamos la comisión total; false = solo nuestra parte. */
  facturamos_total?: boolean
  partes?: ParteComision[]
}

const numero = (v: unknown): number => {
  const s = String(v ?? '').trim().replace(/\s|\$/g, '')
  if (s === '') return NaN
  // Mismo criterio que lib/finanzas/numeros.ts para pesos.
  const limpio = s.includes(',') ? s.split('.').join('').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.split('.').join('') : s
  return Number(limpio)
}

const vacioTexto = (v: unknown): boolean => v === null || v === undefined || String(v).trim() === ''

/** Lo que impide GUARDAR. Vacío = se puede guardar. */
export function erroresDeIngreso(e: IngresoCapturado, opciones: { esComision: boolean; responsableIva: boolean | null }): string[] {
  const err: string[] = []
  const valor = numero(e.valor)
  if (!Number.isFinite(valor)) err.push('Falta el valor.')
  else if (valor <= 0) err.push('El valor tiene que ser mayor que cero.')
  if (!e.tipo_servicio_id) err.push('Falta el tipo de servicio.')
  if (!e.tercero_id) err.push('Falta el cliente: sin él no hay a quién facturar.')
  if (opciones.esComision && !e.property_id) {
    err.push('Una comisión de venta necesita la propiedad: de ahí salen el municipio y la operación.')
  }

  // ── IVA: la bandera del año manda sobre el formulario ──
  // Si el año NO es responsable, el campo no puede llenarse: un IVA cobrado sin
  // ser responsable es un cobro que no se está autorizado a hacer, y encima
  // inflaría la base. Si la decisión está SIN TOMAR, tampoco: no se asume.
  const iva = numero(e.iva_generado)
  const ivaCargado = Number.isFinite(iva) && iva !== 0
  if (ivaCargado && opciones.responsableIva !== true) {
    err.push(
      opciones.responsableIva === false
        ? 'El año no es responsable de IVA: este ingreso no puede llevar IVA.'
        : 'Sin decidir si el año es responsable de IVA no se puede cargar IVA. Decídelo en los parámetros del año.',
    )
  }

  // ── Fechas ──
  if (!vacioTexto(e.fecha_causacion) && Number.isNaN(Date.parse(String(e.fecha_causacion)))) {
    err.push('La fecha de causación no es válida.')
  }
  if (!vacioTexto(e.fecha_recaudo)) {
    if (Number.isNaN(Date.parse(String(e.fecha_recaudo)))) err.push('La fecha de recaudo no es válida.')
    else if (!vacioTexto(e.fecha_causacion) && Date.parse(String(e.fecha_recaudo)) < Date.parse(String(e.fecha_causacion))) {
      err.push('La plata no puede entrar antes de causarse: revisa las fechas.')
    }
  }

  // ── Reparto de comisión ──
  if (e.partes && e.partes.length > 0) {
    err.push(...erroresDeReparto(e.valor, e.partes))
  }
  return err
}

/**
 * El reparto suma SIEMPRE la comisión total, incluida la parte propia. Si
 * sumara solo lo ajeno, nadie sabría cuánto nos quedó, y si sumara distinto del
 * total habría plata sin dueño en el registro.
 */
export function erroresDeReparto(valorTotal: string, partes: ParteComision[]): string[] {
  const err: string[] = []
  const total = numero(valorTotal)
  if (!Number.isFinite(total)) return ['Falta el valor total para repartirlo.']

  let suma = 0
  partes.forEach((p, i) => {
    const v = numero(p.valor)
    if (!Number.isFinite(v)) { err.push(`La parte ${i + 1} no tiene valor.`); return }
    if (v <= 0) err.push(`La parte ${i + 1} tiene que ser mayor que cero.`)
    if (p.rol !== 'PROPIA' && !p.tercero_id) err.push(`La parte ${i + 1} no dice a quién corresponde.`)
    if (p.rol === 'PROPIA' && p.tercero_id) err.push('Nuestra parte no lleva tercero.')
    suma += v
  })
  if (err.length) return err

  if (partes.filter(p => p.rol === 'PROPIA').length !== 1) {
    err.push('El reparto necesita exactamente una fila para nuestra parte.')
  }
  // Tolerancia de un peso: los redondeos de porcentajes no deben bloquear.
  if (Math.abs(suma - total) > 1) {
    err.push(`Las partes suman $${suma.toLocaleString('es-CO')} y la comisión total es $${total.toLocaleString('es-CO')}. Tienen que coincidir.`)
  }
  return err
}

/**
 * QUÉ ENTRA EN LA BASE GRAVABLE. Es la consecuencia tributaria del reparto, y
 * se deriva aquí para que la pantalla y el servidor digan lo mismo:
 *
 * · facturamos_total = true  → la base es el TOTAL y cada parte ajena es un
 *   EGRESO nuestro (con su retefuente practicada a ese corredor).
 * · facturamos_total = false → cada corredor facturó lo suyo: la base es solo
 *   nuestra parte y las ajenas quedan informativas, sin egreso.
 */
export interface ConsecuenciaReparto {
  valorBase: string
  generanEgreso: boolean
  partesAjenas: number
  valorAjeno: string
  explicacion: string
}

export function consecuenciaDelReparto(
  valorTotal: string,
  partes: ParteComision[],
  facturamosTotal: boolean,
): ConsecuenciaReparto {
  const total = numero(valorTotal)
  const propia = partes.filter(p => p.rol === 'PROPIA').reduce((s, p) => s + (numero(p.valor) || 0), 0)
  const ajenas = partes.filter(p => p.rol !== 'PROPIA')
  const valorAjeno = ajenas.reduce((s, p) => s + (numero(p.valor) || 0), 0)
  const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

  if (facturamosTotal) {
    return {
      valorBase: String(Math.round(total)),
      generanEgreso: true,
      partesAjenas: ajenas.length,
      valorAjeno: String(Math.round(valorAjeno)),
      explicacion:
        `Facturamos el total: la base gravable es ${pesos(total)} y ` +
        `${ajenas.length === 1 ? 'la parte ajena' : `las ${ajenas.length} partes ajenas`} ` +
        `(${pesos(valorAjeno)}) ${ajenas.length === 1 ? 'se registra' : 'se registran'} como gasto nuestro.`,
    }
  }
  return {
    valorBase: String(Math.round(propia)),
    generanEgreso: false,
    partesAjenas: ajenas.length,
    valorAjeno: String(Math.round(valorAjeno)),
    explicacion:
      `Cada corredor factura lo suyo: la base gravable es solo nuestra parte ` +
      `(${pesos(propia)}). Las partes ajenas (${pesos(valorAjeno)}) quedan de referencia, sin gasto.`,
  }
}

/** Lo que falta para considerarlo completo. No impide guardar. */
export function faltantesDeIngreso(e: IngresoCapturado): string[] {
  const f: string[] = []
  if (vacioTexto(e.numero_factura)) f.push('número de factura')
  // «Sin retenciones» es un estado válido, pero hay que confirmarlo mirando el
  // comprobante: mientras nadie lo haya hecho, cuenta como pendiente.
  if (vacioTexto(e.retefuente_practicada)) f.push('retenciones del comprobante')
  if (vacioTexto(e.fecha_recaudo)) f.push('fecha de recaudo')
  if (vacioTexto(e.ciiu)) f.push('CIIU (sin él no se calcula ICA)')
  return f
}

export const ingresoPorCompletar = (e: IngresoCapturado): boolean => faltantesDeIngreso(e).length > 0
