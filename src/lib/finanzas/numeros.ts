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
 */

export class ErrorNumero extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorNumero'
  }
}

/**
 * Devuelve el número normalizado como texto con punto decimal («52374»,
 * «9.66»), o null si viene vacío. Lanza si no es un número legible.
 */
export function leerNumero(entrada: unknown, modo: 'pesos' | 'tasa', campo: string): string | null {
  if (entrada === null || entrada === undefined) return null
  let s = String(entrada).trim()
  // «1 UVT = $52.374» → lo que va después del igual.
  if (s.includes('=')) s = s.slice(s.lastIndexOf('=') + 1)
  // Solo las UNIDADES que un contador escribe junto al número. Una lista
  // cerrada, no «quitar letras»: «52 mil» tiene que seguir fallando, no volverse 52.
  s = s
    .replace(/\b(cop|pesos?|uvt|mcte|m\/cte)\b\.?/gi, '')
    .replace(/(por|x)\s*(mil|1\.?000)\b/gi, '')
    .replace(/por\s*ciento\b/gi, '')
    .replace(/[.,]-$/, '')
    .replace(/\s|\$|%|‰/g, '')
  if (s === '') return null

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
  return s
}
