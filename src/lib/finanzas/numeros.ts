/**
 * LECTURA DE NÚMEROS ESCRITOS A LA COLOMBIANA
 * ===========================================
 *
 * «52.374» es cincuenta y dos MIL trescientos setenta y cuatro pesos, no 52,374.
 * Leerlo con `Number()` da un UVT mil veces menor y deja inservibles todas las
 * bases mínimas de retención. Es exactamente el error de separador que ya se
 * coló en el catálogo (lotes de «3.708» m² guardados como 3,708).
 *
 * Por eso el significado del punto depende del TIPO de dato:
 *   · pesos → el punto separa miles y la coma es decimal («52.374,50»).
 *   · tasa  → punto o coma son decimales («9,66» o «9.66» por mil, «0,5» %).
 *
 * Módulo HOJA sin imports: lo usan el servidor y la prueba con Node.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ LA UNIDAD QUE LA PERSONA ESCRIBE **NO SE TIRA**.
 *
 * Hasta el 2026-10-15, este módulo quitaba «por mil», «por ciento», `%` y `‰`
 * del texto y los descartaba. Quien decidía si dividir por 100 o por 1.000 era
 * un campo aparte, `unidad`. O sea: teclear **«9,11 por mil»** en un campo cuya
 * `unidad` quedó en `PORCENTAJE` daba **diez veces la cifra**, y plausible.
 *
 * La única guarda que existía era una frase en un mensaje de chat pidiéndole al
 * titular que se fijara en la etiqueta.
 *
 * > **Una guarda que vive en una instrucción a un humano no es una guarda: es
 * > un recordatorio, y los recordatorios fallan en la fila 14 de 24.**
 *
 * Ahora `leerNumero` devuelve también la unidad que detectó en el texto, y
 * `exigirUnidadCoherente` detiene la contradicción. Dos precisiones sobre el
 * comportamiento, porque las dos importan:
 *
 *   · SILENCIO NO ES CONTRADICCIÓN. «9,11» sin unidad es válido y usa la
 *     declarada. Lo que se detiene es el texto que declara **otra**.
 *   · EN LAS DOS DIRECCIONES. «9,11 por mil» en un campo PORCENTAJE y «0,27 %»
 *     en un campo POR_MIL paran las dos.
 *
 * Y el mensaje dice **las dos cosas** —qué unidad escribió la persona y cuál
 * espera el campo— porque cualquiera de las dos puede ser la equivocada y quien
 * teclea es el único que sabe cuál.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export class ErrorNumero extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorNumero'
  }
}

/** La unidad que el TEXTO declara, si declara alguna. */
export type UnidadEscrita = 'PORCENTAJE' | 'POR_MIL' | 'PESOS' | null

export interface NumeroLeido {
  /** El número normalizado con punto decimal, o null si viene vacío. */
  valor: string | null
  /** Lo que el texto dijo. `null` = no dijo nada, y eso es válido. */
  unidad: UnidadEscrita
}

/**
 * Devuelve el número normalizado como texto con punto decimal («52374»,
 * «9.66»), o null si viene vacío. Lanza si no es un número legible.
 *
 * Firma estrecha conservada a propósito: la usan decenas de sitios que no
 * tienen una unidad declarada con la que comparar. Quien SÍ la tiene llama a
 * `leerNumeroConUnidad`.
 */
export function leerNumero(entrada: unknown, modo: 'pesos' | 'tasa', campo: string): string | null {
  return leerNumeroConUnidad(entrada, modo, campo).valor
}

/**
 * Como `leerNumero`, y además dice qué unidad declaraba el texto.
 *
 * Se detecta ANTES de limpiar, porque la limpieza es justo lo que la borraba.
 */
export function leerNumeroConUnidad(
  entrada: unknown, modo: 'pesos' | 'tasa', campo: string,
): NumeroLeido {
  if (entrada === null || entrada === undefined) return { valor: null, unidad: null }
  let s = String(entrada).trim()

  // ── La unidad, LEÍDA antes de que la limpieza la borre ───────────────────
  // El orden importa: «por mil» contiene «mil», y `‰` y `%` no se confunden.
  let unidad: UnidadEscrita = null
  if (/(por|x)\s*(mil|1\.?000)\b/i.test(s) || /‰/.test(s)) unidad = 'POR_MIL'
  else if (/por\s*ciento\b/i.test(s) || /%/.test(s)) unidad = 'PORCENTAJE'
  else if (/\b(cop|pesos?|mcte|m\/cte)\b/i.test(s) || /\$/.test(s)) unidad = 'PESOS'

  // «1 UVT = $52.374» → lo que va después del igual.
  //
  // ⚠ Si no queda nada después del «=», el texto está MAL ESCRITO y eso no es
  // un campo vacío: devolver null mandaba a quien teclea a buscar un campo que
  // no falta. Ver el final de esta función.
  const teniaIgual = s.includes('=')
  if (teniaIgual) s = s.slice(s.lastIndexOf('=') + 1)
  // Solo las UNIDADES que un contador escribe junto al número. Una lista
  // cerrada, no «quitar letras»: «52 mil» tiene que seguir fallando, no volverse 52.
  s = s
    .replace(/\b(cop|pesos?|uvt|mcte|m\/cte)\b\.?/gi, '')
    .replace(/(por|x)\s*(mil|1\.?000)\b/gi, '')
    .replace(/por\s*ciento\b/gi, '')
    .replace(/[.,]-$/, '')
    .replace(/\s|\$|%|‰/g, '')
  if (s === '') {
    if (teniaIgual) {
      throw new ErrorNumero(
        `${campo}: «${String(entrada)}» no tiene ningún número después del «=». ` +
        'No es que el campo esté vacío: está mal escrito.')
    }
    return { valor: null, unidad }
  }

  if (modo === 'pesos') {
    if (s.includes(',')) {
      // «52.374,50» → miles con punto, decimales con coma.
      s = s.split('.').join('').replace(',', '.')
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      // «52.374» / «1.234.567» → solo separadores de miles.
      s = s.split('.').join('')
    }
  } else {
    s = s.replace(',', '.')
  }

  if (!/^\d+(\.\d+)?$/.test(s)) throw new ErrorNumero(`${campo}: «${String(entrada)}» no es un número válido.`)
  return { valor: s, unidad }
}

/** Cómo se dice cada unidad, para que el mensaje se lea como lo escribió nadie. */
const COMO_SE_DICE: Record<string, string> = {
  PORCENTAJE: 'por ciento (%)',
  POR_MIL: 'por mil (‰)',
  PESOS: 'pesos ($)',
}

/**
 * Detiene la CONTRADICCIÓN entre la unidad escrita y la del campo.
 *
 * `null` en lo escrito no es contradicción: es silencio, y el silencio usa la
 * declarada. Y no hay dirección privilegiada: «por mil» en un campo de
 * porcentaje y «%» en uno de por mil paran igual.
 */
export function exigirUnidadCoherente(
  escrita: UnidadEscrita, declarada: string | null | undefined, campo: string,
): void {
  if (escrita === null) return
  if (declarada === null || declarada === undefined || declarada === '') return
  if (escrita === declarada) return
  throw new ErrorNumero(
    `${campo}: escribiste «${COMO_SE_DICE[escrita] ?? escrita}» y el campo está declarado en ` +
    `«${COMO_SE_DICE[declarada] ?? declarada}». Un por mil leído como por ciento da diez veces ` +
    'la cifra, y se ve plausible. Corrige el texto o la unidad del campo: cualquiera de los dos ' +
    'puede ser el equivocado.',
  )
}
