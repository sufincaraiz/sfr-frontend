/**
 * LECTURA Y ESCRITURA DEL AÑO TARIFARIO
 * =====================================
 *
 * Traduce entre las filas de Prisma y los tipos del motor.
 *
 * ⚠ RECIBE EL CLIENTE POR PARÁMETRO, no lo importa. Es deliberado: así el
 * script del cotejo (`scripts/cotejar-notariales.mjs`, que corre con su propio
 * cliente y sin el alias `@/`) usa EXACTAMENTE el mismo mapeo que el panel. Si
 * cada uno tuviera el suyo, las dos lecturas podrían diferir y el cotejo
 * compararía una traducción contra otra en vez de un documento contra la base.
 */

import {
  ErrorEsquemaNotarial,
  type AnioNotarial, type Concepto, type ReglaRetencion, type Respaldo, type Tramo,
} from './tipos.ts'
import type { ValorCargado } from './cotejo.ts'

/** Lo mínimo que se necesita del cliente, para no atar el módulo a Prisma. */
/**
 * Lo mínimo que se necesita del cliente, para no atar el módulo a los tipos
 * generados por Prisma —que viven en `@prisma/client` y harían este archivo
 * inservible desde el script del cotejo—.
 *
 * ⚠ Los argumentos van como `any` a propósito, y es el único `any` del módulo.
 * Con `unknown` las firmas no son asignables desde las de Prisma —los
 * parámetros de función son contravariantes— y el desacople no compilaría. El
 * precio está confinado a estas declaraciones: lo que pasa por ellas se
 * construye en este archivo, donde sí está tipado.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Lee<R> = (a?: any) => Promise<R>
type Escribe = (a: any) => Promise<unknown>
type Fila = Record<string, unknown>

export interface ClienteNotarial {
  anioNotarial: {
    findUnique: Lee<Fila | null>
    findMany: Lee<Fila[]>
    update: Escribe
    create: (a: any) => Promise<Fila>
    delete: Escribe
  }
  respaldoNormativo: { findMany: Lee<Fila[]>; upsert: Escribe; deleteMany: Escribe }
  fuenteNormativa: { findMany: Lee<Fila[]>; upsert: Escribe }
  conceptoNotarial: { findUnique: Lee<Fila | null>; findMany: Lee<Fila[]>; update: Escribe }
  reglaRetencionNotarial: { findMany: Lee<Fila[]> }
  tramoConcepto: { deleteMany: Escribe; createMany: Escribe }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const texto = (v: unknown): string | null => (v === null || v === undefined ? null : String(v))
const numero = (v: unknown): string | null => (v === null || v === undefined ? null : String(v))
const fecha = (v: unknown): string | null => {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  return (v as Date).toISOString().slice(0, 10)
}

// ─────────────────────────────────────────────────────────────────────────────
// Lectura
// ─────────────────────────────────────────────────────────────────────────────

function respaldoDesdeFila(f: Record<string, unknown>): Respaldo {
  return {
    campo: String(f.campo),
    norma: String(f.norma),
    articulo: texto(f.articulo),
    tipo_evidencia: (f.tipo_evidencia as Respaldo['tipo_evidencia']) ?? 'URL_OFICIAL',
    url: texto(f.url),
    fuente_dominio: texto(f.fuente_dominio),
    documento_ruta: texto(f.documento_ruta),
    documento_hash: texto(f.documento_hash),
    entidad_emisora: texto(f.entidad_emisora),
    obtenido_de: texto(f.obtenido_de),
    obtenido_en: fecha(f.obtenido_en),
    archivado_por: texto(f.archivado_por),
    fecha_norma: fecha(f.fecha_norma),
    caracter: (f.caracter as Respaldo['caracter']) ?? 'EXIGIDO',
    vigencia_desde: fecha(f.vigencia_desde) ?? '',
    vigencia_hasta: fecha(f.vigencia_hasta),
    articulo_vigencia: texto(f.articulo_vigencia),
    nota: texto(f.nota),
    verificado_por: String(f.verificado_por ?? ''),
    verificado_en: fecha(f.verificado_en) ?? '',
  }
}

function tramoDesdeFila(f: Record<string, unknown>): Tramo {
  return {
    orden: Number(f.orden),
    desde: String(f.desde),
    hasta: numero(f.hasta),
    en_uvt: !!f.en_uvt,
    modo_calculo: f.modo_calculo as Tramo['modo_calculo'],
    valor: String(f.valor),
    unidad: f.unidad as Tramo['unidad'],
    aporte_snr: numero(f.aporte_snr),
    aporte_fondo: numero(f.aporte_fondo),
    valor_en_uvb: numero(f.valor_en_uvb),
  }
}

function conceptoDesdeFila(f: Record<string, unknown>, respaldos: Respaldo[]): Concepto {
  const tramos = ((f.tramos as Record<string, unknown>[]) ?? []).map(tramoDesdeFila)
  const redondeo = f.redondeo_unidad === null || f.redondeo_unidad === undefined
    ? null
    : { unidad: Number(f.redondeo_unidad), modo: f.redondeo_modo as 'CERCANO' | 'ARRIBA' | 'ABAJO' | 'PUBLICADO' }
  return {
    clave: String(f.clave),
    label: String(f.label),
    terminos_coloquiales: (f.terminos_coloquiales as string[]) ?? [],
    grupo: f.grupo as Concepto['grupo'],
    orden: Number(f.orden),
    tipo: f.tipo as Concepto['tipo'],
    base: f.base as Concepto['base'],
    valor: numero(f.valor),
    unidad: (f.unidad as Concepto['unidad']) ?? null,
    tramos,
    redondeo,
    monotonicidad: (f.monotonicidad as Concepto['monotonicidad']) ?? 'LIBRE',
    grava_iva: !!f.grava_iva,
    precio_incluye_iva: !!f.precio_incluye_iva,
    es_recaudo_terceros: !!f.es_recaudo_terceros,
    sujeto_legal: f.sujeto_legal as Concepto['sujeto_legal'],
    reparto_por_defecto: Number(f.reparto_por_defecto),
    reparto_editable: !!f.reparto_editable,
    motivo_reparto: f.motivo_reparto as Concepto['motivo_reparto'],
    norma_reparto: texto(f.norma_reparto),
    solo_avanzada: !!f.solo_avanzada,
    opcional: !!f.opcional,
    activo_por_defecto: !!f.activo_por_defecto,
    aplica_en_sencilla: !!f.aplica_en_sencilla,
    es_estimacion_en_sencilla: !!f.es_estimacion_en_sencilla,
    sesgo_en_sencilla: texto(f.sesgo_en_sencilla),
    unidad_label: texto(f.unidad_label),
    unidad_plural: texto(f.unidad_plural),
    multiplica_cantidad_de: texto(f.multiplica_cantidad_de),
    unidad_captura_label: texto(f.unidad_captura_label),
    unidad_captura_plural: texto(f.unidad_captura_plural),
    cantidad_en_sencilla: f.cantidad_en_sencilla === null || f.cantidad_en_sencilla === undefined
      ? null : Number(f.cantidad_en_sencilla),
    cantidad_sugerida: f.cantidad_sugerida === null || f.cantidad_sugerida === undefined
      ? null : Number(f.cantidad_sugerida),
    cantidad_variable_por_notaria: !!f.cantidad_variable_por_notaria,
    cantidad_variable_por_operacion: !!f.cantidad_variable_por_operacion,
    ayuda: texto(f.ayuda),
    respaldos,
  }
}

function reglaDesdeFila(f: Record<string, unknown>, respaldos: Respaldo[]): ReglaRetencion {
  return {
    clave: String(f.clave),
    label: String(f.label),
    orden: Number(f.orden),
    activa: !!f.activa,
    tipo_efecto: f.tipo_efecto as ReglaRetencion['tipo_efecto'],
    valor_efecto: numero(f.valor_efecto),
    unidad: (f.unidad as ReglaRetencion['unidad']) ?? null,
    condiciones: ((f.condiciones as Record<string, unknown>[]) ?? []).map(c => ({
      campo: String(c.campo),
      operador: c.operador as 'IGUAL' | 'DISTINTO' | 'MENOR' | 'MENOR_IGUAL' | 'MAYOR' | 'MAYOR_IGUAL' | 'EN',
      valor: String(c.valor),
    })),
    respaldos,
  }
}

/** El año completo, en los tipos del motor. `null` si no existe. */
export async function leerAnio(db: ClienteNotarial, anio: number): Promise<AnioNotarial | null> {
  const fila = await db.anioNotarial.findUnique({
    where: { anio },
    include: {
      conceptos: { orderBy: { orden: 'asc' }, include: { tramos: { orderBy: { orden: 'asc' } } } },
      reglas: { orderBy: { orden: 'asc' }, include: { condiciones: true } },
    },
  })
  if (!fila) return null

  const conceptos = (fila.conceptos as Record<string, unknown>[]) ?? []
  const reglas = (fila.reglas as Record<string, unknown>[]) ?? []
  const ids = [String(fila.id), ...conceptos.map(c => String(c.id)), ...reglas.map(r => String(r.id))]
  const respaldos = await db.respaldoNormativo.findMany({ where: { referencia_id: { in: ids } } })
  const porReferencia = new Map<string, Respaldo[]>()
  for (const r of respaldos) {
    const clave = String(r.referencia_id)
    if (!porReferencia.has(clave)) porReferencia.set(clave, [])
    porReferencia.get(clave)!.push(respaldoDesdeFila(r))
  }

  return {
    anio: Number(fila.anio),
    estado: fila.estado as AnioNotarial['estado'],
    uvt: numero(fila.uvt),
    uvb: numero(fila.uvb),
    tarifa_iva: numero(fila.tarifa_iva),
    redondeo_iva: fila.redondeo_iva_unidad === null || fila.redondeo_iva_unidad === undefined
      ? null
      : { unidad: Number(fila.redondeo_iva_unidad), modo: fila.redondeo_iva_modo as 'CERCANO' | 'ARRIBA' | 'ABAJO' | 'PUBLICADO' },
    version: Number(fila.version),
    cerrado: !!fila.cerrado,
    respaldos: porReferencia.get(String(fila.id)) ?? [],
    conceptos: conceptos.map(c => conceptoDesdeFila(c, porReferencia.get(String(c.id)) ?? [])),
    reglas_retencion: reglas.map(r => reglaDesdeFila(r, porReferencia.get(String(r.id)) ?? [])),
  }
}

export async function leerFuentes(db: ClienteNotarial) {
  const filas = await db.fuenteNormativa.findMany({})
  return filas.map(f => ({
    dominio: String(f.dominio),
    entidad: String(f.entidad),
    tipo: f.tipo as 'OFICIAL' | 'SECUNDARIA',
    activo: !!f.activo,
    es_compilacion: !!f.es_compilacion,
    advertencia: texto(f.advertencia),
    agregada_por: String(f.agregada_por ?? ''),
    agregada_en: fecha(f.agregada_en) ?? '',
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Derivación de las filas del cotejo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte el año cargado a las filas `concepto · campo · valor · unidad ·
 * artículo` del bloque de cotejo.
 *
 * Es una función PURA sobre el año ya leído, y está aquí para que el panel y el
 * script la compartan. NO deriva nada —no calcula el aporte al Fondo como la
 * mitad del recaudo— porque el cotejo compara lo que se teclea, no lo que se
 * podría deducir.
 *
 * ⚠ DE DÓNDE SALE EL `articulo`, que es lo que hace independiente esa columna:
 * del **respaldo** que cubre el campo, no de un campo por cifra. El panel
 * muestra el artículo de la transcripción como NAVEGACIÓN —«ve al art. 50»— y
 * no se teclea; el que se teclea es el del respaldo, una vez, leyéndolo del PDF
 * al subirlo. Así las dos lecturas del artículo siguen siendo de dos personas
 * mirando el papel en momentos distintos, y no una copiando lo que la pantalla
 * le enseñó.
 */
export function valoresDesdeAnio(anio: AnioNotarial): ValorCargado[] {
  const out: ValorCargado[] = []
  const articuloDe = (respaldos: Respaldo[] | undefined, campo: string): string =>
    respaldos?.find(r => r.campo === campo)?.articulo ?? ''

  for (const campo of ['uvt', 'uvb'] as const) {
    const v = anio[campo]
    if (v === null || v === undefined || v === '') continue
    out.push({
      concepto: '(anio)', campo, valor: String(v), unidad: 'PESOS',
      articulo: articuloDe(anio.respaldos, campo),
    })
  }

  for (const c of anio.conceptos) {
    if (c.valor !== null && c.valor !== undefined && c.valor !== '') {
      out.push({
        concepto: c.clave, campo: 'valor', valor: String(c.valor),
        unidad: c.unidad ?? 'PESOS', articulo: articuloDe(c.respaldos, 'valor'),
      })
    }
    const articuloTramos = articuloDe(c.respaldos, 'tramos')
    for (const t of c.tramos ?? []) {
      const unidadLimite = t.en_uvt ? 'UVT' : 'PESOS'
      out.push({ concepto: c.clave, campo: `tramo.${t.orden}.hasta`, unidad: unidadLimite, articulo: articuloTramos,
        valor: t.hasta === null || t.hasta === undefined ? 'abierto' : String(t.hasta) })
      out.push({ concepto: c.clave, campo: `tramo.${t.orden}.valor`, valor: String(t.valor),
        unidad: t.unidad, articulo: articuloTramos })
      if (t.aporte_snr !== null && t.aporte_snr !== undefined) {
        out.push({ concepto: c.clave, campo: `tramo.${t.orden}.aporte_snr`, valor: String(t.aporte_snr),
          unidad: 'PESOS', articulo: articuloTramos })
      }
      if (t.aporte_fondo !== null && t.aporte_fondo !== undefined) {
        out.push({ concepto: c.clave, campo: `tramo.${t.orden}.aporte_fondo`, valor: String(t.aporte_fondo),
          unidad: 'PESOS', articulo: articuloTramos })
      }
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Escritura
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un año ACTIVO no se edita. Es la misma regla de los parámetros fiscales: para
 * cambiar una tarifa hay que devolverlo a BORRADOR, que es un acto visible.
 */
export function exigirEditable(anio: { estado: string; cerrado: boolean; anio: number }): void {
  if (anio.cerrado) {
    throw new ErrorEsquemaNotarial(`El año ${anio.anio} está cerrado: no se edita.`, 'cerrado')
  }
  if (anio.estado === 'ACTIVO') {
    throw new ErrorEsquemaNotarial(
      `El año ${anio.anio} está ACTIVO. Para cambiar una tarifa hay que devolverlo a borrador: ` +
      'editar en caliente movería cifras que ya se están publicando.',
      'estado',
    )
  }
}

/** Campos de un concepto que el panel puede escribir. Lista blanca, no spread. */
export const CAMPOS_EDITABLES_CONCEPTO = [
  'valor', 'unidad', 'redondeo_unidad', 'redondeo_modo',
] as const

/** Campos del año que el panel puede escribir. */
export const CAMPOS_EDITABLES_ANIO = [
  'uvt', 'uvb', 'tarifa_iva', 'redondeo_iva_unidad', 'redondeo_iva_modo', 'notas',
] as const

/**
 * La versión sube con CUALQUIER escritura, y en la MISMA transacción. Si subiera
 * aparte, dos PDF calculados con tarifas distintas podrían llevar el mismo
 * código de trazabilidad, que es justo lo que ese código existe para impedir.
 */
export function subirVersion() {
  return { version: { increment: 1 }, version_actualizada_en: new Date() }
}
