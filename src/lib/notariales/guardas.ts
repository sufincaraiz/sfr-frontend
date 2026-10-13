/**
 * GUARDAS DEL AÑO TARIFARIO — módulo HOJA
 * =======================================
 *
 * Aquí vive la regla que el titular puso por encima de todo: **ninguna cifra
 * entra sin su PDF oficial**. Y vive como código, no como disciplina: una URL
 * de un sitio comercial no se puede guardar como respaldo —la rechaza
 * `exigirRespaldoOficial`—, y un año con un solo concepto sin respaldo no pasa
 * a ACTIVO.
 *
 * Dos clases de problema, que son dos colores distintos en la interfaz:
 *   · ÁMBAR — `AnioNoPublicable`: falta una cifra o un respaldo. Espera a un
 *     tercero (la Superintendencia, el contador, la entidad que expide).
 *   · ROJO  — `ErrorEsquemaNotarial`: el esquema se contradice. No espera a
 *     nadie; está mal cargado y hay que corregirlo.
 */

import {
  AnioNoPublicable, ErrorEsquemaNotarial, FueraDeVigencia, RespaldoNoOficial,
  type AnioNotarial, type Concepto, type Fuente, type Respaldo,
} from './tipos.ts'
import { camposExigidos, DUENO_DEL_CONCEPTO, DUENOS, type Dueno } from './catalogo.ts'
import { verificarTramos } from './tramos.ts'
import { verificarReglas } from './retencion.ts'
import { BASES } from './bases.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Fechas
//
// Van como texto «AAAA-MM-DD» y se comparan como texto. Con `new Date()` de por
// medio, «2026-01-15» se interpreta como medianoche UTC y en nuestro huso puede
// retroceder un día: un acto del 1 de febrero pasaría a ser del 31 de enero, y
// justo esa diferencia de un día es la que decide qué resolución aplica. En
// formato ISO el orden alfabético ES el orden cronológico, así que no hace falta
// convertir nada.
// ─────────────────────────────────────────────────────────────────────────────

export function esFechaIso(v: unknown): boolean {
  const s = String(v ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [a, m, d] = s.split('-').map(Number)
  if (m! < 1 || m! > 12 || d! < 1 || d! > 31) return false
  // Que el día exista de verdad: el 31 de febrero cumple el formato.
  const f = new Date(Date.UTC(a!, m! - 1, d!))
  return f.getUTCFullYear() === a && f.getUTCMonth() === m! - 1 && f.getUTCDate() === d
}

export function exigirFechaIso(v: unknown, campo: string): string {
  if (!esFechaIso(v)) {
    throw new ErrorEsquemaNotarial(`${campo} tiene que ser una fecha AAAA-MM-DD válida, y llegó «${String(v)}».`, campo)
  }
  return String(v)
}

/** ¿Esta norma regía el día del acto? */
export function cubreLaFecha(r: Respaldo, fecha: string): boolean {
  if (fecha < r.vigencia_desde) return false
  if (r.vigencia_hasta && fecha > r.vigencia_hasta) return false
  return true
}

/**
 * Detiene la liquidación si alguna norma en juego no regía el día del acto, y
 * las nombra TODAS: ver solo la primera haría creer que falta una sola cosa.
 */
export function exigirVigencia(respaldos: Respaldo[], fecha: string): void {
  const fuera = respaldos.filter(r => !cubreLaFecha(r, fecha))
  if (!fuera.length) return
  throw new FueraDeVigencia(fecha, fuera.map(r => ({
    campo: r.campo,
    norma: r.norma,
    articulo_vigencia: r.articulo_vigencia ?? null,
    vigencia_desde: r.vigencia_desde,
    vigencia_hasta: r.vigencia_hasta ?? null,
  })))
}

// ─────────────────────────────────────────────────────────────────────────────
// Fuentes
// ─────────────────────────────────────────────────────────────────────────────

/** ¿El dominio de esta URL es una autoridad oficial y activa? */
export function esFuenteOficial(url: string, fuentes: Fuente[]): Fuente | null {
  let host: string
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    host = u.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
  return fuentes.find(f =>
    f.activo && f.tipo === 'OFICIAL' &&
    // Una autoridad sin constancia de quién la añadió y cuándo no sirve para
    // respaldar nada: añadir una fuente es el acto más delicado de todo esto.
    !!String(f.agregada_por ?? '').trim() && esFechaIso(f.agregada_en) &&
    (host === f.dominio.toLowerCase() || host.endsWith(`.${f.dominio.toLowerCase()}`)),
  ) ?? null
}

/**
 * Un respaldo incompleto o de fuente no oficial no se guarda. Es la diferencia
 * entre una cifra verificada y una cifra que alguien copió de un blog: lo
 * segundo ya nos pasó en el glosario, y ahí sigue, publicado y desactualizado.
 */
export function exigirRespaldoOficial(r: Respaldo, fuentes: Fuente[]): void {
  for (const campo of ['norma', 'url', 'verificado_en', 'verificado_por'] as const) {
    if (!String(r[campo] ?? '').trim()) {
      throw new RespaldoNoOficial(`El respaldo de «${r.campo}» no tiene ${campo}.`)
    }
  }
  // Una norma sin fecha de vigencia no sirve para decidir si aplica a un acto.
  if (!esFechaIso(r.vigencia_desde)) {
    throw new RespaldoNoOficial(
      `El respaldo de «${r.campo}» no dice desde cuándo rige la norma. ` +
      'Sin eso no se puede saber si aplica al acto que se está liquidando.',
    )
  }
  if (r.vigencia_hasta !== null && r.vigencia_hasta !== undefined && r.vigencia_hasta !== '') {
    if (!esFechaIso(r.vigencia_hasta)) {
      throw new RespaldoNoOficial(`El respaldo de «${r.campo}» tiene una fecha de derogatoria ilegible.`)
    }
    if (r.vigencia_hasta < r.vigencia_desde) {
      throw new RespaldoNoOficial(
        `El respaldo de «${r.campo}» dice haber sido derogado (${r.vigencia_hasta}) antes de empezar a regir (${r.vigencia_desde}).`,
      )
    }
  }
  const fuente = esFuenteOficial(r.url, fuentes)
  if (!fuente) {
    throw new RespaldoNoOficial(
      `La URL del respaldo de «${r.campo}» no pertenece a una autoridad oficial activa: ${r.url}. ` +
      'Una tabla publicada por un particular no respalda una tarifa.',
    )
  }
  // Citar una compilación sin decir que lo es convierte un normograma en la
  // entidad emisora. La nota es obligatoria, y la advertencia de la fuente se
  // imprime al lado de la cifra.
  if (fuente.es_compilacion && !String(r.nota ?? '').trim()) {
    throw new RespaldoNoOficial(
      `El respaldo de «${r.campo}» cita ${fuente.dominio}, que es una COMPILACIÓN y no la entidad ` +
      'emisora. Falta la nota que diga qué edición se consultó y dónde está el texto auténtico.',
    )
  }
}

/**
 * Por qué un respaldo no sirve, con el motivo textual.
 *
 * Que el motivo viaje importa: un respaldo cuya fuente se DESACTIVÓ deja de
 * valer, y si el aviso dijera solo «sin respaldo» nadie entendería por qué un
 * año que ayer se activaba hoy no. Desactivar una fuente no puede ser una
 * puerta trasera, pero tampoco un misterio.
 */
const estadoDelRespaldo = (
  respaldos: Respaldo[] | undefined,
  campo: string,
  fuentes: Fuente[],
): { vale: boolean; motivo: string | null } => {
  const r = (respaldos ?? []).find(x => x.campo === campo)
  if (!r) return { vale: false, motivo: null }
  try {
    exigirRespaldoOficial(r, fuentes)
    return { vale: true, motivo: null }
  } catch (e) {
    return { vale: false, motivo: e instanceof Error ? e.message : String(e) }
  }
}

const tieneRespaldo = (respaldos: Respaldo[] | undefined, campo: string, fuentes: Fuente[]): boolean =>
  estadoDelRespaldo(respaldos, campo, fuentes).vale

// ─────────────────────────────────────────────────────────────────────────────
// Coherencia del esquema — ROJO
// ─────────────────────────────────────────────────────────────────────────────

export function verificarConcepto(c: Concepto, uvt: number | null): void {
  // Las tres guardas del reparto. Son el esquema acordado, hecho imposible de
  // violar por descuido o por copiar la fila de al lado.
  if (c.motivo_reparto === 'NORMA_SUPLETIVA' && !String(c.norma_reparto ?? '').trim()) {
    throw new ErrorEsquemaNotarial(
      `${c.label}: el reparto dice apoyarse en una norma supletiva y no la nombra.`,
      'norma_reparto',
    )
  }
  if (c.motivo_reparto === 'CONFIGURACION' && String(c.norma_reparto ?? '').trim()) {
    throw new ErrorEsquemaNotarial(
      `${c.label}: el reparto es una opción de la simulación y lleva una norma colgada ` +
      `(«${c.norma_reparto}»). Imprimirla afirmaría que la ley reparte así, y no lo hace.`,
      'norma_reparto',
    )
  }
  if (c.motivo_reparto === 'CONTRIBUYENTE' && c.reparto_editable) {
    throw new ErrorEsquemaNotarial(
      `${c.label}: tiene un contribuyente definido, así que no hay reparto que editar.`,
      'reparto_editable',
    )
  }

  if (c.grava_iva && c.es_recaudo_terceros) {
    throw new ErrorEsquemaNotarial(
      `${c.label}: no puede gravar IVA y ser recaudo para terceros a la vez. ` +
      'Un recaudo sale de la base del IVA justamente por no ser remuneración del notario.',
      'grava_iva',
    )
  }

  if (c.reparto_por_defecto < 0 || c.reparto_por_defecto > 100) {
    throw new ErrorEsquemaNotarial(`${c.label}: el reparto por defecto está fuera de 0–100.`, 'reparto_por_defecto')
  }

  if (c.tipo === 'POR_UNIDAD' && !String(c.unidad_label ?? '').trim()) {
    throw new ErrorEsquemaNotarial(`${c.label}: se cobra por unidad y no dice de qué unidad.`, 'unidad_label')
  }
  // Una etiqueta de varias palabras no pluraliza añadiendo una «s»: «copia
  // auténtica» daría «copia auténticas». Donde el plural mecánico no sirve, se
  // exige escrito.
  for (const [singular, plural, campo] of [
    [c.unidad_label, c.unidad_plural, 'unidad_plural'],
    [c.unidad_captura_label, c.unidad_captura_plural, 'unidad_captura_plural'],
  ] as const) {
    if (String(singular ?? '').includes(' ') && !String(plural ?? '').trim()) {
      throw new ErrorEsquemaNotarial(
        `${c.label}: «${singular}» no pluraliza añadiendo una «s». Escribe su plural.`,
        campo,
      )
    }
  }
  if (c.multiplica_cantidad_de) {
    if (c.multiplica_cantidad_de === c.clave) {
      throw new ErrorEsquemaNotarial(`${c.label}: multiplica su propia cantidad.`, 'multiplica_cantidad_de')
    }
    if (c.tipo !== 'POR_UNIDAD') {
      throw new ErrorEsquemaNotarial(
        `${c.label}: declara una cantidad derivada y no se cobra por unidad.`, 'multiplica_cantidad_de',
      )
    }
    // Si el usuario cuenta copias y la tarifa es por hoja, la pantalla tiene
    // que preguntar por copias. Sin esta etiqueta preguntaría por hojas y la
    // cifra saldría al cuadrado.
    if (!String(c.unidad_captura_label ?? '').trim()) {
      throw new ErrorEsquemaNotarial(
        `${c.label}: su cantidad es derivada y no dice qué cuenta el usuario.`, 'unidad_captura_label',
      )
    }
  }
  // Un supuesto declarado tiene que decir HACIA DÓNDE desvía. «Se asumió 1
  // copia» no dice si el número real será mayor o menor; aquí siempre es mayor,
  // y el que lee la cifra necesita saberlo. Mismo criterio que el aviso de
  // muestra pequeña: no se dice «la muestra es corta», se dice qué no se puede
  // concluir de ella.
  if (c.es_estimacion_en_sencilla && !String(c.sesgo_en_sencilla ?? '').trim()) {
    throw new ErrorEsquemaNotarial(
      `${c.label}: es una estimación en la calculadora sencilla y no dice hacia dónde desvía. ` +
      'La dirección del sesgo es parte del supuesto.',
      'sesgo_en_sencilla',
    )
  }
  if (c.cantidad_en_sencilla !== null && c.cantidad_en_sencilla !== undefined) {
    if (!Number.isInteger(c.cantidad_en_sencilla) || c.cantidad_en_sencilla < 1) {
      throw new ErrorEsquemaNotarial(
        `${c.label}: la cantidad asumida en la sencilla tiene que ser un entero de 1 o más.`, 'cantidad_en_sencilla',
      )
    }
    if (!c.es_estimacion_en_sencilla) {
      throw new ErrorEsquemaNotarial(
        `${c.label}: asume una cantidad en la sencilla y no está marcado como estimación. ` +
        'Un supuesto que no se declara es un supuesto que nadie ve.',
        'es_estimacion_en_sencilla',
      )
    }
  }

  if (c.tipo === 'TRAMOS' && (c.tramos ?? []).length) {
    verificarTramos(c.tramos!, uvt, c.label, { monotonicidad: c.monotonicidad, redondeo: c.redondeo })
    // Una tabla sin base solo puede tener una fila: no hay cuantía que
    // escoger. Antes esto reventaba en ejecución con un TypeError, que es la
    // peor forma de fallar: ni dice qué pasa ni dónde.
    if (c.base === 'NINGUNA' && c.tramos!.length !== 1) {
      throw new ErrorEsquemaNotarial(
        `${c.label}: es una tabla por tramos sin base y tiene ${c.tramos!.length} filas. ` +
        'Sin cuantía no hay tramo que escoger.',
        'tramos',
      )
    }
  }
  if ((c.tipo === 'PORCENTAJE' || c.tipo === 'POR_MIL') && c.base === 'NINGUNA') {
    throw new ErrorEsquemaNotarial(
      `${c.label}: se liquida como tasa y no declara base sobre la que aplicarse.`,
      'base',
    )
  }

  if ((c.tipo === 'PORCENTAJE' || c.tipo === 'POR_MIL') && c.valor !== null && c.valor !== undefined) {
    if (!c.unidad || c.unidad === 'PESOS') {
      throw new ErrorEsquemaNotarial(
        `${c.label}: la tarifa no dice si es porcentaje o por mil. Un 3 leído como % en vez de por mil ` +
        'es un error de diez veces que da una cifra plausible.',
        'unidad',
      )
    }
  }
}

export function verificarEsquema(anio: AnioNotarial): void {
  const uvt = anio.uvt === null || anio.uvt === undefined ? null : Number(anio.uvt)
  const claves = new Set<string>()
  for (const c of anio.conceptos) {
    if (claves.has(c.clave)) {
      throw new ErrorEsquemaNotarial(`Hay dos conceptos con la clave ${c.clave}.`, 'clave')
    }
    claves.add(c.clave)
    verificarConcepto(c, uvt)
  }
  for (const c of anio.conceptos) {
    if (!c.multiplica_cantidad_de) continue
    if (!claves.has(c.multiplica_cantidad_de)) {
      throw new ErrorEsquemaNotarial(
        `${c.label}: multiplica la cantidad de «${c.multiplica_cantidad_de}», que no está en el año.`,
        'multiplica_cantidad_de',
      )
    }
  }
  exigirOrdenDeDerivados(anio.conceptos)
  // La sistematización se liquida sobre la tarifa registral: sin ORIP no tiene
  // sobre qué calcularse, y un cero ahí pasaría por dato.
  if (claves.has('sistematizacion') && !claves.has('derechos_orip')) {
    throw new ErrorEsquemaNotarial(
      'La sistematización se calcula sobre los derechos de registro, y el concepto no está en el año.',
      'base',
    )
  }
  if (anio.conceptos.some(c => c.tipo === 'REGLAS')) verificarReglas(anio.reglas_retencion)
}

/**
 * El origen de una cantidad derivada tiene que ir ANTES que el derivado.
 *
 * No es una preferencia: la clave ajena compuesta de `conceptos_notariales` se
 * comprueba fila a fila al insertar, así que sembrar el derivado primero falla.
 * Esta guarda traslada ese fallo al arnés: si alguien reordena el catálogo, se
 * entera corriendo las pruebas y no la primera vez que se siembra un año.
 */
export function exigirOrdenDeDerivados(conceptos: Concepto[]): void {
  const orden = [...conceptos].sort((a, b) => a.orden - b.orden)
  const vistos = new Set<string>()
  for (const c of orden) {
    if (c.multiplica_cantidad_de && !vistos.has(c.multiplica_cantidad_de)) {
      const origen = conceptos.find(x => x.clave === c.multiplica_cantidad_de)
      throw new ErrorEsquemaNotarial(
        `${c.label} (orden ${c.orden}) multiplica la cantidad de ` +
        `${origen ? `${origen.label} (orden ${origen.orden})` : `«${c.multiplica_cantidad_de}»`}, ` +
        'que va después. El origen tiene que insertarse primero o la clave ajena lo rechaza.',
        'orden',
      )
    }
    vistos.add(c.clave)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pendientes — ÁMBAR
// ─────────────────────────────────────────────────────────────────────────────

export interface Pendiente {
  que: string
  quien: Dueno
  campo: string
}

/**
 * Qué falta para que el año pueda activarse. El orden no es casual: primero la
 * cifra que falta, después el respaldo de la cifra que ya está.
 */
export function pendientesParaActivar(anio: AnioNotarial, fuentes: Fuente[]): Pendiente[] {
  const p: Pendiente[] = []

  for (const [campo, label, quien] of [
    ['uvt', 'el UVT del año', 'titular'],
    ['uvb', 'la UVB del año', 'titular'],
    ['tarifa_iva', 'la tarifa de IVA', 'titular'],
    ['redondeo_iva', 'a qué múltiplo aproxima el IVA', 'titular'],
  ] as const) {
    const v = anio[campo]
    if (v === null || v === undefined || v === '') p.push({ que: `Falta ${label}`, quien, campo })
    else {
      const estado = estadoDelRespaldo(anio.respaldos, campo, fuentes)
      if (!estado.vale) {
        p.push({
          que: estado.motivo
            ? `${label}: ${estado.motivo}`
            : `${label} está cargada sin su resolución oficial`,
          quien, campo,
        })
      }
    }
  }

  for (const c of anio.conceptos) {
    const quien = DUENO_DEL_CONCEPTO[c.clave] ?? 'titular'
    for (const campo of camposExigidos(c)) {
      const cargado = campo === 'tramos'
        ? (c.tramos ?? []).length > 0
        : campo === 'valor'
          ? c.valor !== null && c.valor !== undefined && c.valor !== ''
          : campo === 'redondeo'
            ? !!c.redondeo
            : true
      if (!cargado) {
        p.push({
          que: campo === 'redondeo'
            ? `${c.label}: falta saber a qué unidad redondea la resolución`
            : `${c.label}: falta la tarifa`,
          quien, campo,
        })
        continue
      }
      const estado = estadoDelRespaldo(c.respaldos, campo, fuentes)
      if (!estado.vale) {
        if (estado.motivo) {
          p.push({ que: `${c.label}: ${estado.motivo}`, quien, campo })
          continue
        }
        const que = campo === 'tramos' ? 'los tramos están'
          : campo === 'redondeo' ? 'el redondeo está'
          : campo === 'reparto' ? 'el reparto está'
          : campo === 'sujeto_legal' ? 'el contribuyente está'
          : 'la tarifa está'
        p.push({ que: `${c.label}: ${que} sin respaldo oficial`, quien, campo })
      }
    }
  }

  for (const r of anio.reglas_retencion) {
    if (!r.activa) continue
    if (!tieneRespaldo(r.respaldos, 'tarifa', fuentes)) {
      p.push({ que: `Retención — ${r.label}: sin respaldo oficial`, quien: 'contador', campo: 'tarifa' })
    }
    if (r.tipo_efecto !== 'EXENCION' && (r.valor_efecto === null || r.valor_efecto === undefined || r.valor_efecto === '')) {
      p.push({ que: `Retención — ${r.label}: falta la tarifa`, quien: 'contador', campo: 'valor_efecto' })
    }
  }

  // Las cinco bases también se sustentan. Que el avalúo pueda SUBIR la base por
  // encima del precio pactado es la clase de regla que alguien va a discutir en
  // la notaría: tiene que poder enseñarse la norma.
  for (const b of BASES) {
    if (!tieneRespaldo(anio.respaldos, b.campo_respaldo, fuentes)) {
      p.push({ que: `${b.label}: falta la norma que la sustenta`, quien: 'titular', campo: b.campo_respaldo })
    }
  }

  return p
}

/**
 * LA PREGUNTA OBLIGATORIA, aplicada antes de publicar el contador:
 *   «¿esta cifra suma causas que piden acciones distintas?»
 *
 * Sí: «7 pendientes» mezcla lo que depende de que el titular baje un PDF, lo
 * que depende del contador y lo que depende de una alcaldía. Son tres acciones
 * distintas y tres tiempos distintos. Por eso el contador va partido por dueño,
 * y el total solo aparece como suma secundaria.
 */
export function resumenDePendientes(pendientes: Pendiente[]): {
  total: number
  porDueno: { dueno: Dueno; etiqueta: string; cantidad: number; items: string[] }[]
} {
  const porDueno = (Object.keys(DUENOS) as Dueno[])
    .map(d => ({
      dueno: d,
      etiqueta: DUENOS[d],
      cantidad: pendientes.filter(p => p.quien === d).length,
      items: pendientes.filter(p => p.quien === d).map(p => p.que),
    }))
    .filter(x => x.cantidad > 0)
  return { total: pendientes.length, porDueno }
}

/** Puerta única: o el año está listo, o se dice exactamente qué falta. */
export function exigirAnioPublicable(anio: AnioNotarial, fuentes: Fuente[]): void {
  verificarEsquema(anio)
  if (anio.estado !== 'ACTIVO') {
    throw new AnioNoPublicable([{ que: `El año ${anio.anio} está en borrador`, quien: 'titular' }])
  }
  const p = pendientesParaActivar(anio, fuentes)
  if (p.length) throw new AnioNoPublicable(p.map(x => ({ que: x.que, quien: x.quien })))
}

// ─────────────────────────────────────────────────────────────────────────────
// Divergencia con el año fiscal — AVISA, no bloquea
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El UVT vive aquí y también en los parámetros fiscales del módulo contable.
 * Si divergen, uno de los dos está mal, pero NO se bloquea la página pública:
 * el que puede estar mal es el fiscal, que está en borrador esperando al
 * contador. Se avisa en ámbar en las dos pantallas.
 */
export function divergenciaUvt(
  uvtNotarial: string | number | null | undefined,
  uvtFiscal: string | number | null | undefined,
): string | null {
  if (uvtNotarial === null || uvtNotarial === undefined || uvtNotarial === '') return null
  if (uvtFiscal === null || uvtFiscal === undefined || uvtFiscal === '') return null
  const a = Number(uvtNotarial), b = Number(uvtFiscal)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null
  return `El UVT de la calculadora (${a}) no coincide con el de los parámetros fiscales (${b}). ` +
    'Uno de los dos está mal: compáralos contra la resolución de la DIAN.'
}

// ─────────────────────────────────────────────────────────────────────────────
// Copiar un año
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copia la ESTRUCTURA de un año al siguiente y **tira todos los respaldos**.
 * Una resolución de 2026 no respalda una tarifa de 2027. Sin esto, «copiar el
 * año anterior» sería la puerta trasera de la guarda: el año nuevo nacería
 * activable con los PDF del año viejo.
 */
export function copiarAnio(anio: AnioNotarial, nuevoAnio: number): AnioNotarial {
  return {
    anio: nuevoAnio,
    estado: 'BORRADOR',
    uvt: null,
    uvb: null,
    tarifa_iva: null,
    redondeo_iva: null,
    version: 1,
    cerrado: false,
    respaldos: [],
    // Se tiran tarifas, tramos, respaldos Y el redondeo: la unidad a la que
    // redondea una tarifa también la fija la resolución de cada año.
    conceptos: anio.conceptos.map(c => ({ ...c, valor: null, tramos: [], redondeo: null, respaldos: [] })),
    reglas_retencion: anio.reglas_retencion.map(r => ({ ...r, valor_efecto: null, respaldos: [] })),
  }
}
