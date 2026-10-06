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
  AnioNoPublicable, ErrorEsquemaNotarial, RespaldoNoOficial,
  type AnioNotarial, type Concepto, type Fuente, type Respaldo,
} from './tipos.ts'
import { camposExigidos, DUENO_DEL_CONCEPTO, DUENOS, type Dueno } from './catalogo.ts'
import { verificarTramos } from './tramos.ts'
import { verificarReglas } from './retencion.ts'
import { BASES } from './bases.ts'

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
  if (!esFuenteOficial(r.url, fuentes)) {
    throw new RespaldoNoOficial(
      `La URL del respaldo de «${r.campo}» no pertenece a una autoridad oficial activa: ${r.url}. ` +
      'Una tabla publicada por un particular no respalda una tarifa.',
    )
  }
}

const tieneRespaldo = (respaldos: Respaldo[] | undefined, campo: string, fuentes: Fuente[]): boolean => {
  const r = (respaldos ?? []).find(x => x.campo === campo)
  if (!r) return false
  try { exigirRespaldoOficial(r, fuentes); return true } catch { return false }
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

  if (c.tipo === 'TRAMOS' && (c.tramos ?? []).length) {
    verificarTramos(c.tramos!, uvt, c.label, { monotonicidad: c.monotonicidad, redondeo: c.redondeo })
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
  ] as const) {
    const v = anio[campo]
    if (v === null || v === undefined || v === '') p.push({ que: `Falta ${label}`, quien, campo })
    else if (!tieneRespaldo(anio.respaldos, campo, fuentes)) {
      p.push({ que: `${label} está cargada sin su resolución oficial`, quien, campo })
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
      if (!tieneRespaldo(c.respaldos, campo, fuentes)) {
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
    version: 1,
    cerrado: false,
    respaldos: [],
    // Se tiran tarifas, tramos, respaldos Y el redondeo: la unidad a la que
    // redondea una tarifa también la fija la resolución de cada año.
    conceptos: anio.conceptos.map(c => ({ ...c, valor: null, tramos: [], redondeo: null, respaldos: [] })),
    reglas_retencion: anio.reglas_retencion.map(r => ({ ...r, valor_efecto: null, respaldos: [] })),
  }
}
