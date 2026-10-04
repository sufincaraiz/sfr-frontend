/**
 * REGLAS DE LA CUSTODIA DE DINEROS DE TERCEROS — módulo HOJA (sin imports)
 * =======================================================================
 *
 * Dinero que está en nuestras manos y NO es ingreso. Dos cosas distintas que
 * comparten tabla pero no consecuencia:
 *
 * · DINERO_DE_TERCEROS — arras o depósitos recibidos EN NOMBRE DEL VENDEDOR.
 *   Nunca son nuestros. Son un PASIVO: hay que entregarlos o devolverlos.
 * · ANTICIPO_PROPIO — anticipo de honorarios que todavía no se ha causado.
 *   Será nuestro, pero aún no: es ingreso diferido. Hay que CAUSARLO.
 *
 * Ninguno suma al estado de resultados mientras esté en custodia. El error que
 * esto evita es el simétrico del reembolsable: contar como ingreso una plata
 * que solo estamos guardando infla la base y hace pagar impuesto sobre lo
 * ajeno.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA PREGUNTA OBLIGATORIA, aplicada ANTES de escribir los contadores:
 *
 *   «¿esta cifra suma causas que piden acciones distintas?»
 *
 * El contador evidente sería «saldo en custodia: $X». Y la respuesta es SÍ,
 * suma dos cosas con acciones opuestas: unas arras se ENTREGAN al vendedor y
 * un anticipo se CAUSA como ingreso nuestro. Un solo total escondería, por
 * ejemplo, $20 M de ingreso nuestro sin declarar detrás de $100 M de plata
 * ajena. Por eso el resumen va SIEMPRE desglosado por naturaleza, y el total
 * solo aparece como suma secundaria, etiquetado como lo que es: cuánto dinero
 * hay en la cuenta que no es utilidad.
 */

export type NaturalezaCustodia = 'DINERO_DE_TERCEROS' | 'ANTICIPO_PROPIO'
export type EstadoCustodia = 'RECIBIDO' | 'ENTREGADO' | 'DEVUELTO' | 'APLICADO'

export const NATURALEZAS_CUSTODIA: {
  valor: NaturalezaCustodia
  titulo: string
  ayuda: string
  /** Qué hay que hacer con ese dinero al final. */
  salida: string
}[] = [
  {
    valor: 'DINERO_DE_TERCEROS',
    titulo: 'Arras del vendedor',
    ayuda: 'Recibidas en nombre del vendedor. Nunca son nuestras.',
    salida: 'se entregan al vendedor o se devuelven al comprador',
  },
  {
    valor: 'ANTICIPO_PROPIO',
    titulo: 'Anticipo de honorarios',
    ayuda: 'Será nuestro, pero todavía no se ha causado.',
    salida: 'se causa como ingreso cuando se presta el servicio',
  },
]

export interface CustodiaCapturada {
  valor: string
  naturaleza: NaturalezaCustodia
  /** Arras, depósito de seriedad, anticipo de honorarios… */
  concepto: string
  /** De quién se recibió. Obligatorio: es plata de alguien. */
  tercero_id?: string | null
  property_id?: string | null
  fecha_recibido?: string | null
  notas?: string | null
}

const numero = (v: unknown): number => {
  const s = String(v ?? '').trim().replace(/\s|\$/g, '')
  if (s === '') return NaN
  const limpio = s.includes(',') ? s.split('.').join('').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.split('.').join('') : s
  return Number(limpio)
}

/** Lo que impide GUARDAR. */
export function erroresDeCustodia(c: CustodiaCapturada): string[] {
  const err: string[] = []
  const v = numero(c.valor)
  if (!Number.isFinite(v)) err.push('Falta el valor.')
  else if (v <= 0) err.push('El valor tiene que ser mayor que cero.')
  if (!NATURALEZAS_CUSTODIA.some(n => n.valor === c.naturaleza)) err.push('Falta indicar qué clase de dinero es.')
  if (!c.tercero_id) err.push('Falta de quién se recibió: este dinero es de alguien y hay que poder devolverlo.')
  if (String(c.concepto ?? '').trim().length < 3) err.push('Falta el concepto (arras, depósito de seriedad, anticipo…).')
  if (c.fecha_recibido && Number.isNaN(Date.parse(String(c.fecha_recibido)))) err.push('La fecha no es válida.')
  return err
}

/** Lo que falta para considerarlo completo. No impide guardar. */
export function faltantesDeCustodia(c: CustodiaCapturada): string[] {
  const f: string[] = []
  if (!c.property_id) f.push('propiedad de la operación')
  if (!String(c.notas ?? '').trim()) f.push('soporte o nota de la consignación')
  return f
}

// ─── El color de un dinero que lleva tiempo en custodia ──────────────────────
//
// GRIS NO ES PERMANENTE, y aquí los plazos NO son los de la cartera: tienen que
// salir del negocio, no de una constante copiada.
//
// · ARRAS (dinero ajeno): una promesa de compraventa fija la escritura a 30, 60
//   o 90 días, así que tres meses es normal y no pide nada. Pasados seis meses,
//   plata ajena todavía en nuestras manos es un riesgo que hay que resolver
//   —entregar, devolver o documentar por qué sigue ahí—, y al año es grave.
// · ANTICIPO PROPIO (ingreso diferido): el plazo corto no lo marca el negocio
//   sino la DIAN. Un anticipo sin causar es ingreso nuestro sin declarar: al
//   mes ya conviene mirarlo y a los tres meses ha cruzado cierres.
//
// Si los dos usaran el mismo tramo, o las arras alarmarían sin motivo o el
// anticipo pasaría callado el cierre del periodo.

export const DIAS_CUSTODIA = {
  DINERO_DE_TERCEROS: { ambar: 180, rojo: 365 },
  ANTICIPO_PROPIO: { ambar: 30, rojo: 90 },
} as const

export type ColorCustodia = 'gris' | 'ambar' | 'rojo'

export function diasEnCustodia(desde: Date | string, hoy: Date = new Date()): number {
  const f = desde instanceof Date ? desde : new Date(desde)
  if (Number.isNaN(f.getTime())) return 0
  return Math.floor((hoy.getTime() - f.getTime()) / 86_400_000)
}

export function colorDeCustodia(
  naturaleza: NaturalezaCustodia,
  desde: Date | string | null | undefined,
  hoy: Date = new Date(),
): ColorCustodia {
  if (!desde) return 'gris'
  const dias = diasEnCustodia(desde, hoy)
  const t = DIAS_CUSTODIA[naturaleza] ?? DIAS_CUSTODIA.DINERO_DE_TERCEROS
  if (dias > t.rojo) return 'rojo'
  if (dias > t.ambar) return 'ambar'
  return 'gris'
}

/** Texto del escalamiento, para que el color venga siempre con su motivo. */
export function motivoDeEspera(
  naturaleza: NaturalezaCustodia,
  desde: Date | string | null | undefined,
  hoy: Date = new Date(),
): string | null {
  const color = colorDeCustodia(naturaleza, desde, hoy)
  if (color === 'gris' || !desde) return null
  const dias = diasEnCustodia(desde, hoy)
  const meses = Math.floor(dias / 30)
  if (naturaleza === 'ANTICIPO_PROPIO') {
    return color === 'rojo'
      ? `Sin causar hace ${meses} meses: es ingreso nuestro sin declarar y ya cruzó cierres.`
      : `Sin causar hace ${dias} días: conviene causarlo o explicar por qué sigue en custodia.`
  }
  return color === 'rojo'
    ? `Plata ajena en custodia hace ${meses} meses: hay que entregarla, devolverla o documentar por qué sigue aquí.`
    : `En custodia hace ${meses} meses: revisa si la operación sigue viva.`
}
