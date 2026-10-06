/**
 * MOTOR DE GASTOS NOTARIALES — TIPOS · módulo HOJA (sin imports `@/`)
 * ==================================================================
 *
 * Estos tipos son el espejo del esquema acordado. Viven aquí y no se derivan de
 * Prisma a propósito: el motor tiene que poder correr —y probarse— sin base de
 * datos, con un año construido en memoria.
 *
 * ⚠ NINGÚN VALOR VIVE EN ESTE MÓDULO. Las tarifas entran por parámetro, desde
 * la base, y cada una exige su respaldo oficial. Una tarifa escrita a mano aquí
 * sería exactamente lo que el titular bloqueó: una cifra sin PDF.
 */

import type { LiquidacionIva } from './iva.ts'

/** Versión del motor. Sube cuando cambia una REGLA de cálculo, no el formato. */
export const VERSION_MOTOR = 1

// ─────────────────────────────────────────────────────────────────────────────
// Enumeraciones del esquema
// ─────────────────────────────────────────────────────────────────────────────

/** Los cinco grupos visuales. El orden es el de la pantalla y del PDF. */
export type Grupo =
  | 'COSTOS_NOTARIALES'
  | 'IMPUESTOS'
  | 'REGISTRO'
  | 'DOCUMENTOS_PREVIOS'
  | 'OBLIGACIONES'

export const GRUPOS: { clave: Grupo; titulo: string; nota: string }[] = [
  { clave: 'COSTOS_NOTARIALES', titulo: 'Costos notariales', nota: 'Lo que cobra la notaría, con su IVA.' },
  { clave: 'IMPUESTOS', titulo: 'Impuestos', nota: 'No los cobra la notaría: los recauda.' },
  { clave: 'REGISTRO', titulo: 'Registro', nota: 'Oficina de Registro de Instrumentos Públicos.' },
  { clave: 'DOCUMENTOS_PREVIOS', titulo: 'Documentos previos', nota: 'Los consigue el vendedor antes de la firma.' },
  {
    clave: 'OBLIGACIONES',
    titulo: 'Obligaciones del inmueble',
    // Va aparte porque NO es un gasto del trámite: es una deuda del predio que
    // hay que saldar antes. Sumarla con los costos notariales haría parecer
    // «caro escriturar» algo que en realidad es un impuesto atrasado.
    nota: 'Deudas del predio que deben quedar saldadas antes de escriturar.',
  },
]

export type TipoCalculo =
  | 'FIJO'
  | 'PORCENTAJE'
  | 'POR_MIL'
  | 'TRAMOS'
  | 'POR_UNIDAD'
  | 'VALOR_LIBRE'
  /** La retención: pasa por la lista de reglas, nunca por una tarifa suelta. */
  | 'REGLAS'

/**
 * Cada valor nombra UNA función de base, con su propia norma. No hay base por
 * defecto: una base sin función es un error de esquema, no un cero.
 */
export type BaseCalculo =
  | 'NOTARIAL'
  | 'REGISTRO'
  | 'ORIP'
  | 'TIMBRE'
  | 'RETENCION'
  /** Sobre la tarifa registral ya liquidada (sistematización). */
  | 'TARIFA_REGISTRAL'
  /** Por unidades capturadas (hojas, copias, personas identificadas…). */
  | 'UNIDADES'
  | 'NINGUNA'

/** Quién es el obligado ante la autoridad. NO es quién lo paga en el negocio. */
export type SujetoLegal = 'VENDEDOR' | 'COMPRADOR' | 'AMBAS_PARTES' | 'CONTRATANTES'

/**
 * Por qué el reparto es el que es. Gobierna tres guardas y lo que se imprime:
 *   · NORMA_SUPLETIVA — la ley reparte así salvo pacto. Exige `norma_reparto`.
 *   · COSTUMBRE       — lo paga quien lo paga por práctica del mercado.
 *   · CONTRIBUYENTE   — no hay reparto que repartir: hay un obligado.
 *   · CONFIGURACION   — es una opción de la simulación. PROHÍBE `norma_reparto`.
 */
export type MotivoReparto = 'NORMA_SUPLETIVA' | 'COSTUMBRE' | 'CONTRIBUYENTE' | 'CONFIGURACION'

export type ModoTramo =
  /** Valor en pesos del tramo. Ignora la base. */
  | 'FIJO'
  /** Tasa sobre la base COMPLETA (derechos ORIP). */
  | 'TASA_SOBRE_TOTAL'
  /** Tasa sobre `(base − desde)`, acumulando los tramos anteriores (timbre). */
  | 'TASA_MARGINAL'

/**
 * Sin esto, un `3` que significa «3 por mil» leído como «3 %» es un error de
 * diez veces que NO parece un error: da una cifra plausible.
 */
export type UnidadValor = 'PESOS' | 'PORCENTAJE' | 'POR_MIL'

/**
 * Cómo redondea ESTA tarifa. No es una decisión del motor: la resolución dice a
 * qué unidad y en qué sentido se redondea, y hasta que no esté el PDF el
 * concepto no tiene redondeo y no se puede liquidar. Asumir «al peso más
 * cercano» sería inventar una regla de la norma.
 */
export type ModoRedondeo = 'CERCANO' | 'ARRIBA' | 'ABAJO'

export interface Redondeo {
  /** 1 = al peso · 100 = a la centena · 1000 = al millar. */
  unidad: number
  modo: ModoRedondeo
}

/**
 * Propiedad del CONCEPTO, no creencia sobre el mundo.
 *
 *   · NO_DECRECIENTE — se configuró así: una base mayor nunca puede costar
 *     menos, y `verificarTramos` lo comprueba en cada frontera.
 *   · LIBRE — no se afirma nada. Una tabla normativa futura puede bajar.
 *
 * La diferencia importa: «esta tarifa se configuró como no decreciente» es
 * verificable; «las tarifas no bajan» es una suposición que una resolución
 * puede desmentir, y entonces la guarda estaría rechazando una tabla correcta.
 */
export type Monotonicidad = 'NO_DECRECIENTE' | 'LIBRE'

export type EstadoAnio = 'BORRADOR' | 'ACTIVO'
export type TipoFuente = 'OFICIAL' | 'SECUNDARIA'
export type Modo = 'SENCILLA' | 'AVANZADA'

// ─────────────────────────────────────────────────────────────────────────────
// Filas
// ─────────────────────────────────────────────────────────────────────────────

/** Dominio autorizado para respaldar una cifra. Tabla, no lista en código. */
export interface Fuente {
  dominio: string
  entidad: string
  tipo: TipoFuente
  activo: boolean
}

export interface Respaldo {
  campo: string
  norma: string
  articulo?: string | null
  url: string
  fecha_norma?: string | null
  verificado_en: string
  verificado_por: string
}

export interface Tramo {
  orden: number
  desde: string | number
  /** null = tramo abierto. Exactamente uno por concepto. */
  hasta?: string | number | null
  /** Los límites van en UVT, no en pesos (timbre). */
  en_uvt?: boolean
  modo_calculo: ModoTramo
  valor: string | number
  unidad: UnidadValor
}

export interface Condicion {
  campo: string
  operador: 'IGUAL' | 'DISTINTO' | 'MENOR' | 'MENOR_IGUAL' | 'MAYOR' | 'MAYOR_IGUAL' | 'EN'
  valor: string
}

export interface ReglaRetencion {
  clave: string
  label: string
  orden: number
  activa: boolean
  tipo_efecto: 'TARIFA' | 'EXENCION' | 'REDUCCION_PCT_POR_ANIO' | 'TOPE'
  valor_efecto?: string | number | null
  unidad?: UnidadValor | null
  condiciones: Condicion[]
  respaldos?: Respaldo[]
}

export interface Concepto {
  clave: string
  label: string
  /** Para el texto de la página. NUNCA se renderiza como nombre del concepto. */
  terminos_coloquiales: string[]
  grupo: Grupo
  orden: number
  tipo: TipoCalculo
  base: BaseCalculo
  valor?: string | number | null
  unidad?: UnidadValor | null
  tramos?: Tramo[]
  /** Dato de la resolución. null = pendiente: el concepto no liquida. */
  redondeo?: Redondeo | null
  /** Solo se comprueba cuando es NO_DECRECIENTE. */
  monotonicidad: Monotonicidad
  grava_iva: boolean
  es_recaudo_terceros: boolean
  sujeto_legal: SujetoLegal
  /** % que asume el comprador por defecto. */
  reparto_por_defecto: number
  reparto_editable: boolean
  motivo_reparto: MotivoReparto
  norma_reparto?: string | null
  solo_avanzada: boolean
  opcional: boolean
  activo_por_defecto: boolean
  aplica_en_sencilla: boolean
  es_estimacion_en_sencilla: boolean
  unidad_label?: string | null
  cantidad_sugerida?: number | null
  /** El VALOR depende de la notaría (hoja de papel, copia). */
  cantidad_variable_por_notaria: boolean
  /** La CANTIDAD depende de la operación (cuánta gente firma). */
  cantidad_variable_por_operacion: boolean
  respaldos?: Respaldo[]
}

export interface AnioNotarial {
  anio: number
  estado: EstadoAnio
  uvt?: string | number | null
  uvb?: string | number | null
  tarifa_iva?: string | number | null
  /**
   * A qué múltiplo aproxima el IVA y en qué sentido. Es REGLA NORMATIVA, no
   * decisión del motor: sin respaldo oficial el IVA no liquida.
   */
  redondeo_iva?: Redondeo | null
  /** Sube con CUALQUIER escritura del año. Alimenta el código del PDF. */
  version: number
  cerrado: boolean
  conceptos: Concepto[]
  reglas_retencion: ReglaRetencion[]
  respaldos?: Respaldo[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Entrada y salida de una liquidación
// ─────────────────────────────────────────────────────────────────────────────

export interface Entrada {
  valor_venta: string | number
  avaluo_catastral?: string | number | null
  /** Por clave de concepto: cuántas hojas, copias, personas… */
  cantidades?: Record<string, number>
  /** Por clave: % del comprador, solo si el concepto lo permite. */
  repartos?: Record<string, number>
  /** Claves de conceptos opcionales activados. */
  opcionales?: string[]
  /** Por clave: valor escrito a mano (predial pendiente). */
  valores_libres?: Record<string, string | number>
  /** Contexto para las reglas de retención. */
  contexto?: Record<string, string | number | boolean>
}

export interface Linea {
  clave: string
  label: string
  grupo: Grupo
  /** Base usada y por qué, para que el PDF lo pueda imprimir. */
  base: { clave: BaseCalculo; valor: number; motivo: string } | null
  valor: number
  /**
   * Lo que ESTA línea aporta al IVA, exacto y sin redondear. El IVA se liquida
   * una sola vez sobre el total: redondear aquí haría que dos líneas de
   * 20.004 sumaran 40.000 en vez de 40.010.
   */
  iva_exacto: string
  /** Solo el valor del concepto. El IVA se reparte en su propio bloque. */
  total: number
  comprador: number
  vendedor: number
  pct_comprador: number
  sujeto_legal: SujetoLegal
  motivo_reparto: MotivoReparto
  norma_reparto: string | null
  /** De dónde sale la cifra. Se imprime al lado, siempre. */
  normas: string[]
  es_recaudo_terceros: boolean
  avisos: string[]
}

export interface Liquidacion {
  lineas: Linea[]
  grupos: { clave: Grupo; titulo: string; nota: string; total: number; comprador: number; vendedor: number }[]
  /**
   * El IVA es DERIVADO: no tiene tarifa propia ni reparto propio. Los siete
   * valores van completos para que el PDF pueda enseñar de dónde sale cada uno.
   */
  iva: LiquidacionIva
  /**
   * Costo del TRÁMITE. Excluye las obligaciones del inmueble a propósito: un
   * predial atrasado de dos años no es lo que cuesta escriturar, y sumarlo haría
   * parecer carísimo el trámite por una deuda que ya existía.
   */
  totales: { total: number; comprador: number; vendedor: number }
  /** Las deudas del predio, aparte y con su propio total. */
  obligaciones: { total: number; comprador: number; vendedor: number }
  bases: { clave: BaseCalculo; valor: number; motivo: string }[]
  avisos: string[]
  trazabilidad: string
  modo: Modo
}

// ─────────────────────────────────────────────────────────────────────────────
// Errores — todos LANZAN. Ninguno devuelve cero.
// ─────────────────────────────────────────────────────────────────────────────

/** El esquema se contradice. Es ROJO en la interfaz: no espera a nadie. */
export class ErrorEsquemaNotarial extends Error {
  campo: string
  constructor(mensaje: string, campo = '') {
    super(mensaje)
    this.name = 'ErrorEsquemaNotarial'
    this.campo = campo
  }
}

/** Falta una tarifa, un respaldo o el UVT. Es ÁMBAR: espera a un tercero. */
export class AnioNoPublicable extends Error {
  faltantes: { que: string; quien: string }[]
  constructor(faltantes: { que: string; quien: string }[]) {
    super(
      `El año no está publicable: ${faltantes.length} dato(s) sin cargar o sin respaldo oficial.`,
    )
    this.name = 'AnioNoPublicable'
    this.faltantes = faltantes
  }
}

/**
 * Lo que mandó quien usa la calculadora no sirve: falta una cantidad, o viene
 * un reparto para un concepto que no se reparte. Se rechaza, no se corrige: es
 * la misma lección de la lista blanca del panel de propiedades.
 */
export class ErrorDeEntrada extends Error {
  campo: string
  constructor(mensaje: string, campo = '') {
    super(mensaje)
    this.name = 'ErrorDeEntrada'
    this.campo = campo
  }
}

/** Ninguna regla de retención aplicó. Jamás se devuelve cero en su lugar. */
export class SinReglaAplicable extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'SinReglaAplicable'
  }
}

/** La URL del respaldo no pertenece a una autoridad oficial y activa. */
export class RespaldoNoOficial extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'RespaldoNoOficial'
  }
}
