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
  AnioNoPublicable, ErrorEsquemaNotarial, FRASE_EVIDENCIA, FueraDeVigencia, RespaldoNoOficial,
  type AnioNotarial, type Concepto, type Fuente, type Respaldo, type TipoEvidencia,
} from './tipos.ts'
import { camposExigidos, DUENO_DEL_CONCEPTO, DUENOS, type Dueno } from './catalogo.ts'
import { verificarTramos } from './tramos.ts'
import { verificarReglas } from './retencion.ts'
import { BASES } from './bases.ts'
import { esClaseDocumental, puedeActivar } from './clase-documental.ts'

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
export function exigirVigencia(respaldos: Respaldo[] | undefined, fecha: string): void {
  /* ⚠ «NO HAY NINGUNO» Y «NO ME LOS TRAJERON» NO SON LO MISMO, y hasta el
   * 2026-10-19 los cuatro llamadores escribían `anio.respaldos ?? []`.
   *
   * `respaldos` es OPCIONAL en el tipo, así que una consulta que olvide
   * incluirlos devuelve `undefined` —no `[]`—, el `?? []` lo convierte en
   * «ninguno», y esta función **pasa en silencio**: una lista vacía no tiene
   * nada fuera de vigencia. Resultado: se liquidaría con tarifas vencidas sin
   * que ninguna guarda chistara, y la guarda estaría «funcionando».
   *
   * Es el mismo patrón que el `?? false` de `gastosPorCategoria` —una guarda
   * desarmada por su llamador— pero por una vía distinta: ahí la falseaba un
   * valor por defecto, aquí la falsea un `select` incompleto. La integridad de
   * una guarda depende de lo que le llega, no solo de lo que hace.
   *
   * Que un año o un concepto no tenga NINGÚN respaldo lo detiene otra guarda
   * —`pendientesParaActivar` no deja activar sin respaldo por cifra—, así que
   * `[]` sigue siendo un caso legítimo y pasa. Lo que no puede pasar es
   * `undefined`. */
  if (respaldos === undefined) {
    throw new ErrorEsquemaNotarial(
      'No se pudieron comprobar las vigencias: la lista de respaldos no se cargó. ' +
      'Esto no es «no hay respaldos» —eso sería una lista vacía—: es que la consulta ' +
      'no los trajo, y sin ellos esta comprobación no puede afirmar nada.',
      'respaldos',
    )
  }
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
/** Un SHA-256 en hexadecimal, 64 dígitos. Ni más corto ni en otro alfabeto. */
export const esHashSha256 = (v: unknown): boolean => /^[0-9a-f]{64}$/.test(String(v ?? ''))

export const tipoDeEvidencia = (r: Respaldo): TipoEvidencia => r.tipo_evidencia ?? 'URL_OFICIAL'

/** La autoridad detrás de un respaldo, sea cual sea su soporte. */
export function fuenteDelRespaldo(r: Respaldo, fuentes: Fuente[]): Fuente | null {
  if (r.fuente_dominio) {
    const buscado = r.fuente_dominio.toLowerCase().replace(/^www\./, '')
    const f = fuentes.find(x => x.dominio.toLowerCase() === buscado)
    if (!f) return null
    // Se reaprovecha la misma comprobación: activa, OFICIAL y con constancia de
    // quién la añadió. La autoridad no se relaja porque el soporte sea un PDF.
    return esFuenteOficial(`https://${f.dominio}/`, fuentes)
  }
  return r.url ? esFuenteOficial(r.url, fuentes) : null
}

export function exigirRespaldoOficial(r: Respaldo, fuentes: Fuente[]): void {
  for (const campo of ['norma', 'verificado_en', 'verificado_por'] as const) {
    if (!String(r[campo] ?? '').trim()) {
      throw new RespaldoNoOficial(`El respaldo de «${r.campo}» no tiene ${campo}.`)
    }
  }
  const tipo = tipoDeEvidencia(r)
  if (tipo === 'DOCUMENTO_ARCHIVADO') {
    // Seis exigencias, y ninguna es decorativa: sin la ruta no se puede volver
    // a abrir, sin el hash alguien lo sustituye en silencio, y sin la
    // procedencia no se distingue un PDF firmado de uno descargado de un blog.
    for (const [campo, falta] of [
      ['documento_ruta', 'dónde quedó archivado'],
      ['entidad_emisora', 'qué entidad lo emitió'],
      ['obtenido_de', 'de dónde se obtuvo'],
      ['archivado_por', 'quién lo archivó'],
    ] as const) {
      if (!String(r[campo] ?? '').trim()) {
        throw new RespaldoNoOficial(`El respaldo de «${r.campo}» es un documento archivado y no dice ${falta}.`)
      }
    }
    if (!esHashSha256(r.documento_hash)) {
      throw new RespaldoNoOficial(
        `El respaldo de «${r.campo}» no trae el hash SHA-256 del documento. ` +
        'Sin él, sustituir el archivo no dejaría rastro.',
      )
    }
    if (!esFechaIso(r.obtenido_en)) {
      throw new RespaldoNoOficial(`El respaldo de «${r.campo}» no dice cuándo se obtuvo el documento.`)
    }
    if (!String(r.fuente_dominio ?? '').trim()) {
      throw new RespaldoNoOficial(
        `El respaldo de «${r.campo}» no dice a qué autoridad corresponde. ` +
        'Un documento no trae dominio, así que la autoridad hay que nombrarla.',
      )
    }
    // Nuestra copia del PDF no se publica, así que el lector necesita saber
    // dónde conseguir la norma por su cuenta. Sin esta frase, la simulación
    // citaría un documento que nadie más puede ver.
    if (!String(r.donde_conseguirlo ?? '').trim()) {
      throw new RespaldoNoOficial(
        `El respaldo de «${r.campo}» es un documento archivado y no dice dónde puede conseguirlo ` +
        'el lector. Nuestra copia es evidencia interna y no se publica.',
      )
    }
  } else if (!String(r.url ?? '').trim()) {
    throw new RespaldoNoOficial(`El respaldo de «${r.campo}» no tiene url.`)
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
  const fuente = fuenteDelRespaldo(r, fuentes)
  if (!fuente) {
    throw new RespaldoNoOficial(
      `El respaldo de «${r.campo}» no corresponde a una autoridad oficial activa ` +
      `(${r.fuente_dominio ?? r.url}). Una tabla publicada por un particular, un gremio o un ` +
      'sitio comercial no respalda una tarifa, venga como enlace o como PDF.',
    )
  }
  // Si trae las dos cosas, tienen que decir lo mismo: un documento de la
  // Superintendencia con un enlace de la DIAN es un respaldo incoherente.
  if (r.fuente_dominio && r.url) {
    const porUrl = esFuenteOficial(r.url, fuentes)
    if (porUrl && porUrl.dominio !== fuente.dominio) {
      throw new RespaldoNoOficial(
        `El respaldo de «${r.campo}» dice ser de ${fuente.dominio} y su enlace es de ${porUrl.dominio}.`,
      )
    }
  }
  // Citar una compilación sin decir que lo es convierte un normograma en la
  // entidad emisora. La nota es obligatoria, y la advertencia de la fuente se
  // imprime al lado de la cifra.
  if (tipoDeEvidencia(r) === 'URL_OFICIAL' && fuente.es_compilacion && !String(r.nota ?? '').trim()) {
    throw new RespaldoNoOficial(
      `El respaldo de «${r.campo}» cita ${fuente.dominio}, que es una COMPILACIÓN y no la entidad ` +
      'emisora. Falta la nota que diga qué edición se consultó y dónde está el texto auténtico.',
    )
  }

  /* ─── LA CLASE DOCUMENTAL ─────────────────────────────────────────────────
   *
   * ⚠ Y AQUÍ ESTABA EL HUECO, hasta el 2026-10-25. La comprobación de arriba
   * mira `tipo_evidencia`, que es el SOPORTE, así que un PDF archivado cuya
   * fuente es una compilación se escapaba entera —y el arnés lo afirmaba como
   * correcto: «a un documento archivado no se le exige la nota de
   * compilación»—. La razón escrita era que un PDF firmado con radicado y
   * sellos vale por sí mismo, y es verdad; lo que no es verdad es que todo PDF
   * archivado sea el original firmado. Uno bajado del normograma de Cancillería
   * es un PDF archivado, NO es el original, y lleva las erratas de digitación
   * que la ficha de esa misma fuente declara por escrito.
   *
   * La clase documental cierra eso porque no mira el soporte ni el dominio:
   * mira de qué documento salió. */
  if (!esClaseDocumental(r.clase_documental)) {
    throw new RespaldoNoOficial(
      `El respaldo de «${r.campo}» no declara de qué clase de documento salió. ` +
      'Las opciones son: publicación oficial original, texto compilado o integrado, ' +
      'copia o reproducción, e índice o fuente informativa. No se supone ninguna: ' +
      'un respaldo sin clase declarada no sostiene una cifra.',
    )
  }
  if (r.clase_documental === 'TEXTO_COMPILADO' && !String(r.nota ?? '').trim()) {
    throw new RespaldoNoOficial(
      `El respaldo de «${r.campo}» salió de un texto compilado y no trae la nota que diga ` +
      'qué edición se consultó y dónde está el texto auténtico. Da igual si llegó por URL ' +
      'o como documento archivado: lo que decide es el documento, no el soporte.',
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
  const delCampo = (respaldos ?? []).filter(x => x.campo === campo)
  if (delCampo.length === 0) return { vale: false, motivo: null }
  try {
    for (const r of delCampo) exigirRespaldoOficial(r, fuentes)
  } catch (e) {
    return { vale: false, motivo: e instanceof Error ? e.message : String(e) }
  }

  /* LA REGLA DE ACTIVACIÓN, que es la del cotejo aplicada al documento: una
   * publicación oficial activa sola; un texto compilado no, porque puede traer
   * erratas —el normograma de Cancillería lo declara por escrito—; y dos
   * compilados no son dos lecturas, son el mismo texto copiado dos veces.
   *
   * ⚠ HOY ESTA LISTA TIENE COMO MUCHO UN ELEMENTO, y conviene saberlo: la clave
   * única de `respaldos_normativos` es (ambito, referencia_id, campo), así que
   * un campo no puede tener dos respaldos. Es decir, **un texto compilado no
   * puede activar nunca**, porque no hay sitio donde poner la segunda fuente
   * que lo acompañaría. No es un defecto de esta función: es que la regla de
   * «dos lecturas» pide un cambio de clave que no está hecho. Mientras no esté,
   * el motivo que devuelve `puedeActivar` dice exactamente qué falta, y eso es
   * mejor que activar con una sola lectura. */
  const v = puedeActivar(delCampo)
  return v.activa ? { vale: true, motivo: null } : { vale: false, motivo: v.motivo }
}

const tieneRespaldo = (respaldos: Respaldo[] | undefined, campo: string, fuentes: Fuente[]): boolean =>
  estadoDelRespaldo(respaldos, campo, fuentes).vale

// ─────────────────────────────────────────────────────────────────────────────
// La cita que ve el público
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NUNCA UN ENLACE A NUESTRO DOMINIO PRESENTADO COMO LA FUENTE DE LA NORMA.
 *
 * El PDF de la resolución se archiva como `authenticated`, no público, y la
 * razón importa: publicar una copia de una norma que no emitimos nos convierte
 * en un sitio desde el que se puede citar esa norma. Y cuando la entidad la
 * modifique —como pasó con la registral a los diez días— nuestra copia pública
 * diría lo viejo con nuestra marca encima. El PDF es evidencia interna, no
 * contenido.
 *
 * Consecuencia: con DOCUMENTO_ARCHIVADO la cita no enlaza nada. Nombra la
 * norma, el artículo, la entidad emisora y la fecha de verificación, y dice
 * dónde la consigue el lector. Con URL_OFICIAL sí va el enlace.
 */
export function citaPublica(r: Respaldo): { cita: string; enlace: string | null } {
  const encabezado = `${r.norma}${r.articulo ? `, ${r.articulo}` : ''}`

  if (tipoDeEvidencia(r) === 'DOCUMENTO_ARCHIVADO') {
    const partes = [encabezado]
    if (r.entidad_emisora) partes.push(`expedida por ${r.entidad_emisora}`)
    partes.push(`verificada contra el documento oficial el ${r.verificado_en}`)
    if (r.donde_conseguirlo) partes.push(r.donde_conseguirlo)
    const cita = `${partes.join('. ')}`
    exigirCitaSinNuestroDominio(cita, r)
    return { cita, enlace: null }
  }

  const cita = `${encabezado}. ${r.url ?? ''}`.trim()
  exigirCitaSinNuestroDominio(cita, r)
  return { cita, enlace: r.url ?? null }
}

/**
 * Guarda de último recurso, por si alguien cambia la plantilla de arriba: una
 * cita pública no puede contener nuestro dominio ni la ruta del archivo. Va
 * aquí y no en una revisión porque es la clase de cosa que se cuela al editar
 * un texto, no al diseñar el sistema.
 */
function exigirCitaSinNuestroDominio(cita: string, r: Respaldo): void {
  const bajo = cita.toLowerCase()
  if (bajo.includes('sufincaraiz')) {
    throw new ErrorEsquemaNotarial(
      `La cita pública de «${r.campo}» apunta a nuestro propio dominio. Una norma que no emitimos ` +
      'no se cita desde nuestro sitio.',
      'cita',
    )
  }
  if (r.documento_ruta && bajo.includes(String(r.documento_ruta).toLowerCase())) {
    throw new ErrorEsquemaNotarial(
      `La cita pública de «${r.campo}» expone la ruta de nuestra copia archivada, que es evidencia interna.`,
      'cita',
    )
  }
}

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
  /**
   * POR QUÉ SU DUEÑO NO PUEDE RESOLVERLO TODAVÍA, o `null` si sí puede.
   *
   * ⚠ EL DÍA QUE ESTO FALTÓ: la pantalla decía «29 esperan la resolución
   * oficial — tú, con la resolución». Esas 29 son tablas por tramos y **el
   * editor de tramos no existe**: el titular podía tener la resolución en la
   * mano y no tenía dónde escribirla.
   *
   * > Un pendiente asignado a quien no tiene cómo resolverlo no es un
   * > pendiente: es una acusación.
   *
   * El contador ya se partía por DUEÑO —porque «7 pendientes» mezclaba tres
   * acciones distintas—. Le faltaba el eje que decide si hay algo que hacer
   * HOY: «te toca y puedes ya» frente a «te toca pero falta que construyamos
   * la pantalla». Lo rellena `conBloqueo()`, en un solo sitio.
   */
  bloqueado: string | null
}

/**
 * CAMPOS QUE EL PANEL TODAVÍA NO SABE EDITAR. Lista cerrada y declarada.
 *
 * No es una propiedad del concepto ni del dueño: es una propiedad de **lo que
 * hemos construido**. Por eso vive en una tabla y no repartida en un `if`.
 *
 * `probar-notariales.mjs` la vigila EN LAS DOS DIRECCIONES: mientras la ruta
 * del editor no exista, `tramos` tiene que estar aquí; el día que exista, tiene
 * que salir. Una advertencia que sobrevive a su causa es la siguiente mentira.
 */
export const SIN_PANTALLA: Record<string, string> = {
  /* VACÍA desde el 2026-10-20: el editor de tramos existe.
   *
   * ⚠ Y no lo recordé yo: lo exigió  en cuanto se quitó
   * el rechazo de la pantalla. La guarda vigila las DOS direcciones —mientras
   * no exista, que los textos lo digan; cuando exista, que dejen de decirlo— y
   * la segunda dirección es la que casi nadie escribe, porque el día que se
   * construye la pieza nadie se acuerda de la advertencia que sobra.
   *
   * Se deja el objeto, no se borra: el día que otro campo no tenga pantalla,
   * la mitad del trabajo está hecha. */
}

/** Un solo sitio donde se decide el bloqueo, a partir del campo que falta. */
const conBloqueo = (p: Omit<Pendiente, 'bloqueado'>): Pendiente =>
  ({ ...p, bloqueado: SIN_PANTALLA[p.campo] ?? null })

/**
 * Qué falta para que el año pueda activarse. El orden no es casual: primero la
 * cifra que falta, después el respaldo de la cifra que ya está.
 */
export function pendientesParaActivar(anio: AnioNotarial, fuentes: Fuente[]): Pendiente[] {
  /* Sin `bloqueado`: lo pone conBloqueo() al salir, en un solo sitio. El
   * tipo lo fuerza —añadirlo a mano aqui no compila—. */
  const p: Omit<Pendiente, 'bloqueado'>[] = []

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
            /* «falta la tarifa» sobre una tabla por tramos también engañaba: no
             * falta UNA cifra, falta la escala entera. */
            : campo === 'tramos'
              ? `${c.label}: falta la tabla por tramos`
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

  /* TODO pendiente sale por aquí, así que el bloqueo se decide una vez y no
   * hay forma de añadir un `push` que lo olvide. */
  return p.map(conBloqueo)
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
  porDueno: {
    dueno: Dueno; etiqueta: string; cantidad: number; items: string[]
    /** De esos, los que su dueño PUEDE resolver hoy. */
    puedeYa: number
    /** Y los que no, con la razón única o «varias» si difieren. */
    bloqueados: number
    porQueBloqueado: string | null
  }[]
  /** Suma de los que nadie puede resolver todavía, en todo el año. */
  bloqueados: number
} {
  const porDueno = (Object.keys(DUENOS) as Dueno[])
    .map(d => {
      const mios = pendientes.filter(p => p.quien === d)
      const trabados = mios.filter(p => p.bloqueado)
      const razones = [...new Set(trabados.map(p => p.bloqueado!))]
      return {
        dueno: d,
        etiqueta: DUENOS[d],
        cantidad: mios.length,
        items: mios.map(p => p.que),
        puedeYa: mios.length - trabados.length,
        bloqueados: trabados.length,
        porQueBloqueado: razones.length === 1 ? razones[0]! : razones.length > 1 ? 'varias razones' : null,
      }
    })
    .filter(x => x.cantidad > 0)
  return {
    total: pendientes.length,
    porDueno,
    bloqueados: pendientes.filter(p => p.bloqueado).length,
  }
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
