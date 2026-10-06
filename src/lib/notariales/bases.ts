/**
 * LAS CINCO BASES — módulo HOJA
 * =============================
 *
 * No existe una «base del acto» universal. Cada concepto se liquida sobre su
 * propia base, con su propia norma, y el PDF imprime cuál usó y por qué.
 *
 * ⚠ HOY TRES DE ELLAS CALCULAN LO MISMO —el mayor entre precio y avalúo—. Eso
 * NO significa que sean la misma regla: significa que tres normas distintas
 * coinciden en el resultado. Están separadas para que el día que una resolución
 * mueva una de ellas, se mueva en un sitio y no haya que adivinar cuáles de los
 * dieciséis conceptos arrastraba.
 *
 * ⚠ Las normas están en `pendiente`: entran con el PDF oficial, no desde aquí.
 */

import { ErrorEsquemaNotarial, type BaseCalculo, type Entrada } from './tipos.ts'
import { pesos } from './tramos.ts'

export interface Base {
  clave: BaseCalculo
  valor: number
  /** Para imprimir al lado de la cifra. El avalúo que sube la base sorprende. */
  motivo: string
}

/**
 * Catálogo de las reglas de base.
 *
 * La REGLA es código —es una función—, pero la NORMA que la sustenta es un dato
 * y se carga como respaldo del año, en `campo_respaldo`. Si viviera aquí como
 * constante, sería una cita normativa escrita a mano en un archivo fuente: ni
 * se podría cargar desde el panel ni la alcanzaría la guarda del PDF oficial.
 */
export const BASES: { clave: BaseCalculo; label: string; regla: string; campo_respaldo: string }[] = [
  {
    clave: 'NOTARIAL',
    label: 'Base de los derechos notariales',
    // Art. 51 literal a): son CUATRO valores, no dos.
    regla: 'El mayor entre el valor pactado, el avalúo catastral, el autoavalúo y el valor del remate.',
    campo_respaldo: 'base_notarial',
  },
  {
    clave: 'REGISTRO',
    label: 'Base del impuesto de registro',
    regla: 'El mayor entre el valor del acto y el avalúo catastral.',
    campo_respaldo: 'base_registro',
  },
  {
    clave: 'ORIP',
    label: 'Base de los derechos de registro',
    regla: 'El mayor entre el valor del acto y el avalúo catastral.',
    campo_respaldo: 'base_orip',
  },
  {
    clave: 'TIMBRE',
    label: 'Base del impuesto de timbre',
    regla: 'El valor de la enajenación. Si el avalúo entra o no, lo define la DIAN.',
    campo_respaldo: 'base_timbre',
  },
  {
    clave: 'RETENCION',
    label: 'Base de la retención en la fuente',
    regla: 'El valor de la enajenación.',
    campo_respaldo: 'base_retencion',
  },
]

/** Los cuatro candidatos del art. 51 a), con el nombre que lleva cada uno. */
const CANDIDATOS = [
  ['valor_venta', 'el valor pactado'],
  ['avaluo_catastral', 'el avalúo catastral'],
  ['autoavaluo', 'el autoavalúo'],
  ['valor_remate', 'el valor del remate'],
] as const

function entrada(e: Entrada): { venta: number; candidatos: { campo: string; label: string; valor: number }[] } {
  const venta = pesos(e.valor_venta, 'el valor de venta')
  if (venta <= 0) throw new ErrorEsquemaNotarial('El valor de venta tiene que ser mayor que cero.', 'valor_venta')
  const candidatos: { campo: string; label: string; valor: number }[] = []
  for (const [campo, label] of CANDIDATOS) {
    const v = e[campo]
    if (v === null || v === undefined || v === '') continue
    // No se comprueba el signo: `leerNumero` ya rechaza un negativo antes de
    // llegar aquí. Una guarda que no puede dispararse no es una guarda.
    candidatos.push({ campo, label, valor: pesos(v, label) })
  }
  return { venta, candidatos }
}

/**
 * El MAYOR de los candidatos que haya, diciendo cuál ganó y cuáles no se
 * pudieron comparar. Compartido por tres normas distintas que hoy coinciden.
 */
function mayor(e: Entrada, queEs: string): Base & { clave: BaseCalculo } {
  const { venta, candidatos } = entrada(e)
  const ganador = candidatos.reduce((a, b) => (b.valor > a.valor ? b : a))
  const faltan = CANDIDATOS
    .filter(([campo]) => !candidatos.some(c => c.campo === campo))
    .map(([, label]) => label)

  // Sin esta frase, una cifra más alta que el precio parece un error de la
  // calculadora. Es el mismo criterio del módulo financiero: un número que
  // sorprende sin explicación se lee como fallo.
  const motivo = ganador.campo === 'valor_venta'
    ? `Se tomó el valor pactado porque es el mayor de los informados (${queEs}).`
    : `Se tomó ${ganador.label} porque supera el valor pactado (${queEs}).`
  const aviso = faltan.length
    ? ` No se informó ${faltan.join(' ni ')}: si alguno fuera superior, la base sería mayor.`
    : ''

  return { clave: 'NOTARIAL', valor: ganador.valor, motivo: motivo + aviso }
}

export function calcularBaseNotarial(e: Entrada): Base {
  return { ...mayor(e, 'derechos notariales'), clave: 'NOTARIAL' }
}

export function calcularBaseRegistro(e: Entrada): Base {
  return { ...mayor(e, 'impuesto de registro'), clave: 'REGISTRO' }
}

export function calcularBaseOrip(e: Entrada): Base {
  return { ...mayor(e, 'derechos de registro'), clave: 'ORIP' }
}

export function calcularBaseTimbre(e: Entrada): Base {
  const { venta } = entrada(e)
  return {
    clave: 'TIMBRE',
    valor: venta,
    motivo: 'Se tomó el valor de la enajenación.',
  }
}

export function calcularBaseRetencion(e: Entrada): Base {
  const { venta } = entrada(e)
  return {
    clave: 'RETENCION',
    valor: venta,
    motivo: 'Se tomó el valor de la enajenación.',
  }
}

/** Resuelve la base de un concepto. Sin base por defecto: lanza si no existe. */
export function calcularBase(clave: BaseCalculo, e: Entrada): Base {
  switch (clave) {
    case 'NOTARIAL': return calcularBaseNotarial(e)
    case 'REGISTRO': return calcularBaseRegistro(e)
    case 'ORIP': return calcularBaseOrip(e)
    case 'TIMBRE': return calcularBaseTimbre(e)
    case 'RETENCION': return calcularBaseRetencion(e)
    default:
      throw new ErrorEsquemaNotarial(
        `La base ${clave} no se calcula desde la entrada: la resuelve el motor.`,
        'base',
      )
  }
}
