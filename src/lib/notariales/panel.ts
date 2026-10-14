/**
 * ESCRITURA DEL AÑO TARIFARIO — lo que hace el panel
 * ==================================================
 *
 * Reglas que gobiernan todo lo de aquí:
 *
 *  1. LISTA BLANCA, nunca spread del cliente. Es la lección del panel de
 *     propiedades: un `...body` deja escribir cualquier columna, incluidas las
 *     derivadas.
 *  2. LA VERSIÓN SUBE EN LA MISMA TRANSACCIÓN que la escritura. Si subiera
 *     aparte, dos PDF calculados con tarifas distintas podrían llevar el mismo
 *     código de trazabilidad.
 *  3. UN AÑO ACTIVO NO SE EDITA. Hay que devolverlo a borrador, que es un acto
 *     visible y registrado.
 *  4. CERO VALORES PRECARGADOS. Sembrar un año crea los 19 conceptos con su
 *     forma de cálculo y **sin una sola cifra** —salvo las tres verificadas
 *     contra el PDF, que de todos modos nacen sin respaldo y no habilitan nada—.
 *  5. LAS GUARDAS CORREN ANTES DE GUARDAR, no al activar. Una tabla de tramos
 *     con un hueco no se guarda; no se guarda y luego se avisa.
 */

import { ErrorEsquemaNotarial, type AnioNotarial, type Respaldo, type Tramo } from './tipos.ts'
import { CONCEPTOS_V1, DUENO_DEL_CONCEPTO, FUENTES_OFICIALES, camposExigidos } from './catalogo.ts'
import {
  exigirRespaldoOficial, exigirOrdenDeDerivados, pendientesParaActivar, resumenDePendientes,
  verificarConcepto, verificarEsquema, exigirAnioPublicable, divergenciaUvt,
} from './guardas.ts'
import { verificarTramos } from './tramos.ts'
import { CRITERIOS_ADOPTADOS } from './iva.ts'
import { leerAnio, leerFuentes, exigirEditable, subirVersion, valoresDesdeAnio, type ClienteNotarial } from './datos.ts'
import { compararCotejo, resumirCotejo, type FilaTranscrita } from './cotejo.ts'

export const MODOS_REDONDEO = ['CERCANO', 'ARRIBA', 'ABAJO', 'PUBLICADO'] as const
export const UNIDADES = ['PESOS', 'PORCENTAJE', 'POR_MIL'] as const
export const MODOS_TRAMO = ['FIJO', 'TASA_SOBRE_TOTAL', 'TASA_MARGINAL'] as const

/** La regla general de retención con la que nace un año: sin tarifa. */
const REGLA_GENERAL = {
  clave: 'general',
  label: 'Tarifa general',
  orden: 100,
  activa: true,
  tipo_efecto: 'TARIFA',
  valor_efecto: null,
  unidad: 'PORCENTAJE',
}

// ─────────────────────────────────────────────────────────────────────────────
// Sembrar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea el año con sus conceptos vacíos.
 *
 * ⚠ EL ORDEN DE INSERCIÓN IMPORTA: la clave ajena compuesta exige que el origen
 * de una cantidad derivada exista antes que el derivado. `exigirOrdenDeDerivados`
 * lo comprueba sobre el catálogo antes de tocar la base, así que si alguien
 * reordena el molde se entera aquí y no con un error de Postgres a medias.
 */
/**
 * Deja en la tabla las autoridades de la precarga. Idempotente.
 *
 * Hace falta porque `FUENTES_OFICIALES` vive en código y la guarda resuelve
 * contra la TABLA: con la tabla vacía, un respaldo de la DIAN se rechazaría por
 * «no corresponde a una autoridad oficial activa», que es cierto y desconcertante.
 * Lo encontró la prueba contra la base, no una revisión.
 *
 * No contradice el «cero valores precargados»: eso rige para las TARIFAS. La
 * lista de autoridades es la precarga que acordamos, y cada fila queda firmada
 * como tal —`agregada_por: precarga`— para distinguirla de una añadida a mano.
 */
export async function asegurarFuentes(db: ClienteNotarial) {
  for (const f of FUENTES_OFICIALES) {
    await db.fuenteNormativa.upsert({
      where: { dominio: f.dominio },
      create: {
        dominio: f.dominio, entidad: f.entidad, tipo: f.tipo, activo: f.activo,
        es_compilacion: !!f.es_compilacion, advertencia: f.advertencia ?? null,
        agregada_por: f.agregada_por, agregada_en: new Date(`${f.agregada_en}T00:00:00Z`),
      },
      // Al actualizar NO se toca `activo`: si alguien desactivó una autoridad a
      // conciencia, sembrar un año nuevo no puede reactivarla por la espalda.
      update: {
        entidad: f.entidad, tipo: f.tipo,
        es_compilacion: !!f.es_compilacion, advertencia: f.advertencia ?? null,
      },
    })
  }
}

export async function sembrarAnio(db: ClienteNotarial, anio: number, por: string) {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    throw new ErrorEsquemaNotarial(`Año inválido: ${anio}.`, 'anio')
  }
  exigirOrdenDeDerivados(CONCEPTOS_V1)
  await asegurarFuentes(db)
  const yaEsta = await db.anioNotarial.findUnique({ where: { anio } })
  if (yaEsta) throw new ErrorEsquemaNotarial(`El año ${anio} ya existe.`, 'anio')

  const ordenados = [...CONCEPTOS_V1].sort((a, b) => a.orden - b.orden)
  return db.anioNotarial.create({
    data: {
      anio,
      estado: 'BORRADOR',
      notas: `Sembrado por ${por}.`,
      conceptos: {
        create: ordenados.map(c => ({
          clave: c.clave,
          label: c.label,
          terminos_coloquiales: c.terminos_coloquiales,
          grupo: c.grupo,
          orden: c.orden,
          tipo: c.tipo,
          base: c.base,
          // Las tres verificadas traen su cifra; las demás, nada. Y ninguna
          // trae respaldo, así que ninguna habilita el cálculo.
          valor: c.valor ?? null,
          unidad: c.unidad ?? null,
          redondeo_unidad: c.redondeo?.unidad ?? null,
          redondeo_modo: c.redondeo?.modo ?? null,
          monotonicidad: c.monotonicidad,
          grava_iva: c.grava_iva,
          precio_incluye_iva: !!c.precio_incluye_iva,
          es_recaudo_terceros: c.es_recaudo_terceros,
          sujeto_legal: c.sujeto_legal,
          reparto_por_defecto: c.reparto_por_defecto,
          reparto_editable: c.reparto_editable,
          motivo_reparto: c.motivo_reparto,
          norma_reparto: c.norma_reparto ?? null,
          solo_avanzada: c.solo_avanzada,
          opcional: c.opcional,
          activo_por_defecto: c.activo_por_defecto,
          aplica_en_sencilla: c.aplica_en_sencilla,
          es_estimacion_en_sencilla: c.es_estimacion_en_sencilla,
          sesgo_en_sencilla: c.sesgo_en_sencilla ?? null,
          unidad_label: c.unidad_label ?? null,
          unidad_plural: c.unidad_plural ?? null,
          multiplica_cantidad_de: c.multiplica_cantidad_de ?? null,
          unidad_captura_label: c.unidad_captura_label ?? null,
          unidad_captura_plural: c.unidad_captura_plural ?? null,
          cantidad_en_sencilla: c.cantidad_en_sencilla ?? null,
          cantidad_sugerida: c.cantidad_sugerida ?? null,
          cantidad_variable_por_notaria: c.cantidad_variable_por_notaria,
          cantidad_variable_por_operacion: c.cantidad_variable_por_operacion,
          ayuda: c.ayuda ?? null,
          tramos: (c.tramos ?? []).length
            ? { create: (c.tramos ?? []).map(t => filaDeTramo(t)) }
            : undefined,
        })),
      },
      reglas: { create: [REGLA_GENERAL] },
    } as unknown,
  })
}

function filaDeTramo(t: Tramo) {
  return {
    orden: t.orden,
    desde: String(t.desde),
    hasta: t.hasta === null || t.hasta === undefined ? null : String(t.hasta),
    en_uvt: !!t.en_uvt,
    modo_calculo: t.modo_calculo,
    valor: String(t.valor),
    unidad: t.unidad,
    aporte_snr: t.aporte_snr === null || t.aporte_snr === undefined ? null : String(t.aporte_snr),
    aporte_fondo: t.aporte_fondo === null || t.aporte_fondo === undefined ? null : String(t.aporte_fondo),
    valor_en_uvb: t.valor_en_uvb === null || t.valor_en_uvb === undefined ? null : String(t.valor_en_uvb),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardar
// ─────────────────────────────────────────────────────────────────────────────

async function anioEditable(db: ClienteNotarial, anio: number) {
  const fila = await db.anioNotarial.findUnique({ where: { anio } })
  if (!fila) throw new ErrorEsquemaNotarial(`El año ${anio} no existe.`, 'anio')
  exigirEditable({ anio, estado: String(fila.estado), cerrado: !!fila.cerrado })
  return fila
}

const CAMPOS_ANIO = {
  uvt: 'pesos', uvb: 'pesos', tarifa_iva: 'tasa',
  redondeo_iva_unidad: 'entero', redondeo_iva_modo: 'modo', notas: 'texto',
} as const

export async function guardarCampoAnio(
  db: ClienteNotarial, anio: number, campo: string, valor: unknown,
) {
  const fila = await anioEditable(db, anio)
  const clase = (CAMPOS_ANIO as Record<string, string>)[campo]
  if (!clase) {
    throw new ErrorEsquemaNotarial(`«${campo}» no es un campo editable del año.`, campo)
  }
  const limpio = valor === null || valor === undefined || String(valor).trim() === '' ? null : valor
  if (clase === 'modo' && limpio !== null && !MODOS_REDONDEO.includes(String(limpio) as never)) {
    throw new ErrorEsquemaNotarial(`Modo de redondeo desconocido: ${String(limpio)}.`, campo)
  }
  await db.anioNotarial.update({
    where: { id: fila.id },
    data: { [campo]: limpio, ...subirVersion() },
  })
}

const CAMPOS_CONCEPTO = ['valor', 'unidad', 'redondeo_unidad', 'redondeo_modo'] as const

export async function guardarConcepto(
  db: ClienteNotarial, anio: number, clave: string, cambios: Record<string, unknown>,
) {
  const fila = await anioEditable(db, anio)
  const cargado = await leerAnio(db, anio)
  const concepto = cargado?.conceptos.find(c => c.clave === clave)
  if (!concepto) throw new ErrorEsquemaNotarial(`«${clave}» no es un concepto del año ${anio}.`, 'clave')

  const data: Record<string, unknown> = {}
  for (const [campo, valor] of Object.entries(cambios)) {
    if (!CAMPOS_CONCEPTO.includes(campo as never)) {
      throw new ErrorEsquemaNotarial(`«${campo}» no se puede editar desde el panel.`, campo)
    }
    data[campo] = valor === null || valor === undefined || String(valor).trim() === '' ? null : valor
  }
  if (!Object.keys(data).length) return

  // La guarda ANTES de guardar: se simula el concepto resultante y se verifica.
  const resultante = {
    ...concepto,
    valor: 'valor' in data ? (data.valor as string | null) : concepto.valor,
    unidad: 'unidad' in data ? (data.unidad as never) : concepto.unidad,
    redondeo: 'redondeo_unidad' in data || 'redondeo_modo' in data
      ? (data.redondeo_unidad ?? concepto.redondeo?.unidad) === null
        ? null
        : {
          unidad: Number(data.redondeo_unidad ?? concepto.redondeo?.unidad),
          modo: String(data.redondeo_modo ?? concepto.redondeo?.modo ?? 'CERCANO') as never,
        }
      : concepto.redondeo,
  }
  verificarConcepto(resultante, cargado?.uvt === null || cargado?.uvt === undefined ? null : Number(cargado.uvt))

  const idFila = await db.conceptoNotarial.findUnique({ where: { anio_id_clave: { anio_id: fila.id, clave } } })
  await db.conceptoNotarial.update({ where: { id: idFila?.id }, data })
  await db.anioNotarial.update({ where: { id: fila.id }, data: subirVersion() })
}

/**
 * Reemplaza la tabla de tramos completa. No se editan de a uno: una tabla
 * parcialmente guardada tendría un hueco, y un hueco da una cifra plausible y
 * equivocada. Se verifica entera y se guarda entera.
 */
export async function guardarTramos(
  db: ClienteNotarial, anio: number, clave: string, tramos: Tramo[],
) {
  const fila = await anioEditable(db, anio)
  const cargado = await leerAnio(db, anio)
  const concepto = cargado?.conceptos.find(c => c.clave === clave)
  if (!concepto) throw new ErrorEsquemaNotarial(`«${clave}» no es un concepto del año ${anio}.`, 'clave')
  if (concepto.tipo !== 'TRAMOS') {
    throw new ErrorEsquemaNotarial(`${concepto.label} no se cobra por tramos.`, 'tipo')
  }
  const uvt = cargado?.uvt === null || cargado?.uvt === undefined ? null : Number(cargado.uvt)
  verificarTramos(tramos, uvt, concepto.label, {
    monotonicidad: concepto.monotonicidad,
    redondeo: concepto.redondeo,
  })
  if (concepto.base === 'NINGUNA' && tramos.length !== 1) {
    throw new ErrorEsquemaNotarial(
      `${concepto.label}: es una tabla sin base, así que solo admite una fila abierta.`, 'tramos',
    )
  }

  const idFila = await db.conceptoNotarial.findUnique({ where: { anio_id_clave: { anio_id: fila.id, clave } } })
  await db.tramoConcepto.deleteMany({ where: { concepto_id: idFila?.id } })
  await db.tramoConcepto.createMany({
    data: tramos.map(t => ({ ...filaDeTramo(t), concepto_id: idFila?.id })),
  })
  await db.anioNotarial.update({ where: { id: fila.id }, data: subirVersion() })
}

/** Guarda un respaldo. `exigirRespaldoOficial` corre ANTES de escribir. */
export async function guardarRespaldo(
  db: ClienteNotarial, anio: number,
  destino: { ambito: 'ANIO' | 'CONCEPTO' | 'REGLA_RETENCION'; clave?: string },
  respaldo: Respaldo,
) {
  const fila = await anioEditable(db, anio)
  const fuentes = await leerFuentes(db)
  exigirRespaldoOficial(respaldo, fuentes)

  let referencia = String(fila.id)
  if (destino.ambito === 'CONCEPTO') {
    const c = await db.conceptoNotarial.findUnique({
      where: { anio_id_clave: { anio_id: fila.id, clave: destino.clave } },
    })
    if (!c) throw new ErrorEsquemaNotarial(`«${destino.clave}» no es un concepto del año.`, 'clave')
    referencia = String(c.id)
  }

  await db.respaldoNormativo.upsert({
    where: { ambito_referencia_id_campo: { ambito: destino.ambito, referencia_id: referencia, campo: respaldo.campo } },
    create: filaDeRespaldo(respaldo, destino.ambito, referencia, fuentes),
    update: filaDeRespaldo(respaldo, destino.ambito, referencia, fuentes),
  })
  await db.anioNotarial.update({ where: { id: fila.id }, data: subirVersion() })
}

function filaDeRespaldo(
  r: Respaldo, ambito: string, referencia: string,
  fuentes: { dominio: string }[],
) {
  const dominio = r.fuente_dominio ?? fuentes.find(f => (r.url ?? '').includes(f.dominio))?.dominio ?? null
  return {
    ambito, referencia_id: referencia, campo: r.campo,
    norma: r.norma, articulo: r.articulo ?? null,
    tipo_evidencia: r.tipo_evidencia ?? 'URL_OFICIAL',
    url: r.url ?? null,
    fuente_dominio: dominio,
    documento_ruta: r.documento_ruta ?? null,
    documento_hash: r.documento_hash ?? null,
    entidad_emisora: r.entidad_emisora ?? null,
    obtenido_de: r.obtenido_de ?? null,
    obtenido_en: r.obtenido_en ? new Date(`${r.obtenido_en}T00:00:00Z`) : null,
    archivado_por: r.archivado_por ?? null,
    donde_conseguirlo: r.donde_conseguirlo ?? null,
    fecha_norma: r.fecha_norma ? new Date(`${r.fecha_norma}T00:00:00Z`) : null,
    caracter: r.caracter ?? 'EXIGIDO',
    vigencia_desde: new Date(`${r.vigencia_desde}T00:00:00Z`),
    vigencia_hasta: r.vigencia_hasta ? new Date(`${r.vigencia_hasta}T00:00:00Z`) : null,
    articulo_vigencia: r.articulo_vigencia ?? null,
    nota: r.nota ?? null,
    verificado_por: r.verificado_por,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activar
// ─────────────────────────────────────────────────────────────────────────────

export async function activarAnio(db: ClienteNotarial, anio: number, por: string) {
  const fila = await anioEditable(db, anio)
  const cargado = await leerAnio(db, anio)
  if (!cargado) throw new ErrorEsquemaNotarial(`El año ${anio} no existe.`, 'anio')
  const fuentes = await leerFuentes(db)
  // Se verifica con el año ya en ACTIVO: si se comprobara en BORRADOR, la guarda
  // de `exigirAnioPublicable` fallaría por el estado y no por lo que falta.
  exigirAnioPublicable({ ...cargado, estado: 'ACTIVO' }, fuentes)
  await db.anioNotarial.update({
    where: { id: fila.id },
    data: { estado: 'ACTIVO', activado_por: por, activado_en: new Date(), ...subirVersion() },
  })
}

export async function volverABorrador(db: ClienteNotarial, anio: number, por: string) {
  const fila = await db.anioNotarial.findUnique({ where: { anio } })
  if (!fila) throw new ErrorEsquemaNotarial(`El año ${anio} no existe.`, 'anio')
  if (fila.cerrado) throw new ErrorEsquemaNotarial(`El año ${anio} está cerrado.`, 'cerrado')
  await db.anioNotarial.update({
    where: { id: fila.id },
    data: { estado: 'BORRADOR', notas: `Devuelto a borrador por ${por}.`, ...subirVersion() },
  })
}

/**
 * Borra un año en borrador, con sus respaldos.
 *
 * ⚠ LOS RESPALDOS NO CASCADEAN SOLOS. `respaldos_normativos` apunta a su fila
 * por `referencia_id`, que es una referencia POLIMÓRFICA —puede señalar un año,
 * un concepto o una regla— y por eso no tiene clave ajena. El precio es este:
 * el cascade se lleva conceptos y reglas, pero no sus respaldos, así que hay
 * que borrarlos a mano.
 *
 * Las filas huérfanas no son peligrosas —al sembrar otra vez los uuid son
 * nuevos y nadie las lee— pero son basura, y la basura en una tabla de
 * evidencia envejece mal. Lo encontró la prueba contra la base: el arnés en
 * memoria no podía verlo.
 */
export async function borrarAnio(db: ClienteNotarial, anio: number) {
  const fila = await db.anioNotarial.findUnique({ where: { anio } })
  if (!fila) return
  if (String(fila.estado) === 'ACTIVO') {
    throw new ErrorEsquemaNotarial(
      `El año ${anio} está ACTIVO: devuélvelo a borrador antes de borrarlo.`, 'estado',
    )
  }
  const ids = await idsDelAnio(db, fila.id)
  await db.respaldoNormativo.deleteMany({ where: { referencia_id: { in: ids } } })
  await db.anioNotarial.delete({ where: { id: fila.id } })
}

/** Los ids de todo lo que cuelga de un año: el año, sus conceptos y sus reglas. */
async function idsDelAnio(db: ClienteNotarial, anioId: unknown): Promise<string[]> {
  const conceptos = await db.conceptoNotarial.findMany({ where: { anio_id: anioId }, select: { id: true } })
  const reglas = await db.reglaRetencionNotarial.findMany({ where: { anio_id: anioId }, select: { id: true } })
  return [String(anioId), ...conceptos.map(c => String(c.id)), ...reglas.map(r => String(r.id))]
}

// ─────────────────────────────────────────────────────────────────────────────
// Lo que la pantalla necesita
// ─────────────────────────────────────────────────────────────────────────────

export interface CampoDePantalla {
  concepto: string
  label: string
  campo: string
  /** De qué artículo sale, SEGÚN LA TRANSCRIPCIÓN. Es un localizador. */
  articulo: string
  /** Lo cargado. null = sin cargar. Nunca se precarga desde la transcripción. */
  valor: string | null
  unidad: string | null
  tipo: string
  ayuda: string | null
  dueno: string
  /** Qué unidad espera, para ponerla AL LADO del campo y no en una leyenda. */
  unidad_esperada: string
}

/**
 * Los campos en el ORDEN DEL DOCUMENTO, que es el del bloque de cotejo.
 *
 * ⚠ Y una consecuencia que conviene tener presente: el artículo que se muestra
 * sale de la transcripción, así que el artículo que el titular teclee en el
 * respaldo está GUIADO por lo que ve. El valor NO: nunca se precarga. El cotejo
 * sigue siendo independiente en la cifra y en la unidad, que es donde importa,
 * y es más débil en el artículo. Mejor saberlo que creer que las tres columnas
 * pesan igual.
 */
export function camposEnOrdenDelDocumento(
  anio: AnioNotarial, transcritas: FilaTranscrita[],
): CampoDePantalla[] {
  const cargados = new Map(valoresDesdeAnio(anio).map(v => [`${v.concepto}·${v.campo}`, v]))
  const porClave = new Map(anio.conceptos.map(c => [c.clave, c]))

  return transcritas.map(t => {
    const c = porClave.get(t.concepto)
    const cargado = cargados.get(`${t.concepto}·${t.campo}`)
    return {
      concepto: t.concepto,
      label: c?.label ?? (t.concepto === '(anio)' ? 'Parámetros del año' : t.concepto),
      campo: t.campo,
      articulo: t.articulo,
      valor: cargado?.valor ?? null,
      unidad: cargado?.unidad ?? null,
      tipo: c?.tipo ?? 'FIJO',
      ayuda: c?.ayuda ?? null,
      dueno: DUENO_DEL_CONCEPTO[t.concepto] ?? 'titular',
      unidad_esperada: t.unidad,
    }
  })
}

export async function anioParaPantalla(
  db: ClienteNotarial, anio: number, transcritas: FilaTranscrita[], uvtFiscal?: string | null,
) {
  const cargado = await leerAnio(db, anio)
  if (!cargado) return null
  const fuentes = await leerFuentes(db)

  let incoherencia: string | null = null
  try { verificarEsquema(cargado) } catch (e) { incoherencia = e instanceof Error ? e.message : String(e) }

  const pendientes = pendientesParaActivar(cargado, fuentes)
  const cotejo = resumirCotejo(compararCotejo(transcritas, valoresDesdeAnio(cargado)))

  return {
    anio: cargado.anio,
    estado: cargado.estado,
    cerrado: cargado.cerrado,
    version: cargado.version,
    uvt: cargado.uvt, uvb: cargado.uvb, tarifa_iva: cargado.tarifa_iva,
    redondeo_iva: cargado.redondeo_iva,
    campos: camposEnOrdenDelDocumento(cargado, transcritas),
    conceptos: cargado.conceptos.map(c => ({
      clave: c.clave, label: c.label, tipo: c.tipo, grupo: c.grupo, orden: c.orden,
      unidad_label: c.unidad_label, monotonicidad: c.monotonicidad,
      tramos: c.tramos ?? [],
      respaldos: (c.respaldos ?? []).map(r => ({ campo: r.campo, norma: r.norma, articulo: r.articulo, tipo_evidencia: r.tipo_evidencia })),
      exigidos: camposExigidos(c),
      dueno: DUENO_DEL_CONCEPTO[c.clave] ?? 'titular',
    })),
    respaldos_anio: (cargado.respaldos ?? []).map(r => ({ campo: r.campo, norma: r.norma, articulo: r.articulo, tipo_evidencia: r.tipo_evidencia })),
    pendientes: resumenDePendientes(pendientes),
    // El motivo por el que NO se puede activar, a la vista: el botón deshabilitado
    // sin motivo obliga a adivinar.
    incoherencia,
    cotejo,
    aviso_uvt: divergenciaUvt(cargado.uvt, uvtFiscal),
    criterios_adoptados: CRITERIOS_ADOPTADOS,
    fuentes: fuentes.map(f => ({ dominio: f.dominio, entidad: f.entidad, es_compilacion: f.es_compilacion, advertencia: f.advertencia })),
  }
}
