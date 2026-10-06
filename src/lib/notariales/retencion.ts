/**
 * RETENCIÓN EN LA FUENTE — MOTOR DE EXCEPCIONES · módulo HOJA
 * ==========================================================
 *
 * La retención no se calcula con una tarifa suelta: se calcula RECORRIENDO una
 * lista de reglas, aunque hoy la lista tenga una sola —la general—. Añadir la
 * siguiente es una fila.
 *
 * ⚠ DÓNDE TERMINA ESA PROMESA, dicho sin adornos: una regla cuya condición se
 * apoye en un dato que el formulario YA pregunta es una fila. Una que necesite
 * una pregunta nueva —«¿fue su casa de habitación?», «¿en qué año lo
 * adquirió?»— es código, porque hay que añadir la pregunta. Para que eso no se
 * descubra en producción, cada campo del contexto declara si el formulario lo
 * pregunta, y `verificarReglas` rechaza una regla que dependa de uno que no.
 *
 * ⚠ SI NINGUNA REGLA APLICA, SE DETIENE. Nunca devuelve cero. Un cero en la
 * retención es la cifra con la que alguien cierra un negocio.
 *
 * En v1 la lista tiene la regla general y nada más. Lo que queda FUERA por
 * decisión de alcance —y porque el mercado son fincas y lotes rurales del
 * Gualivá, donde casi nunca aplican—: VIS/VIP, beneficio AFC y la reducción del
 * art. 399 por casa de habitación.
 */

import {
  ErrorEsquemaNotarial, SinReglaAplicable,
  type Condicion, type ReglaRetencion, type UnidadValor,
} from './tipos.ts'
import { alPeso, tasa } from './tramos.ts'

/**
 * Lista blanca de campos del contexto. `pregunta_en_formulario` es la frontera
 * entre «una fila» y «código».
 */
export const CAMPOS_CONDICION: {
  campo: string
  label: string
  tipo: 'texto' | 'numero' | 'booleano'
  pregunta_en_formulario: boolean
}[] = [
  { campo: 'valor_en_uvt', label: 'Valor de la enajenación en UVT', tipo: 'numero', pregunta_en_formulario: true },
  { campo: 'tipo_persona_vendedor', label: 'El vendedor es persona natural o jurídica', tipo: 'texto', pregunta_en_formulario: true },
  // Los cuatro de abajo NO se preguntan todavía. Una regla que los use no se
  // puede activar: primero hay que añadir la pregunta, y eso es código.
  { campo: 'es_activo_fijo', label: 'El inmueble era activo fijo del vendedor', tipo: 'booleano', pregunta_en_formulario: false },
  { campo: 'es_casa_habitacion', label: 'Es la casa o apartamento de habitación del vendedor', tipo: 'booleano', pregunta_en_formulario: false },
  { campo: 'anio_adquisicion', label: 'Año en que el vendedor lo adquirió', tipo: 'numero', pregunta_en_formulario: false },
  { campo: 'es_vis', label: 'Es vivienda de interés social', tipo: 'booleano', pregunta_en_formulario: false },
]

const CAMPOS = new Map(CAMPOS_CONDICION.map(c => [c.campo, c]))

export type Contexto = Record<string, string | number | boolean | undefined>

function comparar(cond: Condicion, actual: string | number | boolean): boolean {
  const esperado = cond.valor
  switch (cond.operador) {
    case 'IGUAL': return String(actual) === esperado
    case 'DISTINTO': return String(actual) !== esperado
    case 'EN': return esperado.split('|').map(s => s.trim()).includes(String(actual))
    case 'MENOR': return Number(actual) < Number(esperado)
    case 'MENOR_IGUAL': return Number(actual) <= Number(esperado)
    case 'MAYOR': return Number(actual) > Number(esperado)
    case 'MAYOR_IGUAL': return Number(actual) >= Number(esperado)
  }
}

/**
 * Una condición sobre un campo que el contexto no trae NO se cumple por
 * omisión: se detiene. Si se cumpliera, una exención se aplicaría sola por el
 * hecho de no haber preguntado.
 */
function cumple(cond: Condicion, ctx: Contexto): boolean {
  if (!CAMPOS.has(cond.campo)) {
    throw new ErrorEsquemaNotarial(`La condición usa un campo desconocido: ${cond.campo}.`, 'campo')
  }
  const actual = ctx[cond.campo]
  if (actual === undefined || actual === null || actual === '') {
    throw new SinReglaAplicable(
      `La regla depende de «${CAMPOS.get(cond.campo)!.label}» y la simulación no lo trae.`,
    )
  }
  return comparar(cond, actual)
}

function multiplicador(valor: unknown, unidad: UnidadValor | null | undefined, etiqueta: string): number {
  const v = tasa(valor, etiqueta)
  if (unidad === 'PORCENTAJE') return v / 100
  if (unidad === 'POR_MIL') return v / 1000
  throw new ErrorEsquemaNotarial(`${etiqueta}: la tarifa no dice si es porcentaje o por mil.`, 'unidad')
}

/** La regla general: la única sin condiciones, y la última de la lista. */
export function reglaGeneral(reglas: ReglaRetencion[]): ReglaRetencion {
  const generales = reglas.filter(r => r.condiciones.length === 0)
  if (generales.length !== 1) {
    throw new ErrorEsquemaNotarial(
      `Debe haber exactamente una regla de retención sin condiciones (hay ${generales.length}).`,
      'reglas_retencion',
    )
  }
  return generales[0]!
}

export function verificarReglas(reglas: ReglaRetencion[]): void {
  if (!reglas.length) {
    throw new ErrorEsquemaNotarial('No hay reglas de retención cargadas.', 'reglas_retencion')
  }
  const general = reglaGeneral(reglas)
  const orden = [...reglas].sort((a, b) => a.orden - b.orden)
  if (orden[orden.length - 1]?.clave !== general.clave) {
    throw new ErrorEsquemaNotarial(
      'La regla general no es la última: una excepción nunca se evaluaría.',
      'orden',
    )
  }
  if (general.tipo_efecto !== 'TARIFA') {
    throw new ErrorEsquemaNotarial(
      'La regla general tiene que fijar una TARIFA: una reducción o un tope necesitan una tarifa debajo.',
      'tipo_efecto',
    )
  }
  const claves = new Set<string>()
  for (const r of reglas) {
    if (claves.has(r.clave)) {
      throw new ErrorEsquemaNotarial(`Hay dos reglas de retención con la clave ${r.clave}.`, 'clave')
    }
    claves.add(r.clave)
    for (const c of r.condiciones) {
      const campo = CAMPOS.get(c.campo)
      if (!campo) {
        throw new ErrorEsquemaNotarial(`La regla ${r.clave} usa un campo desconocido: ${c.campo}.`, 'campo')
      }
      if (!campo.pregunta_en_formulario && r.activa) {
        throw new ErrorEsquemaNotarial(
          `La regla ${r.clave} está activa y depende de «${campo.label}», que el formulario no pregunta. ` +
          'Añadir esa pregunta es código, no una fila: la regla no puede activarse antes.',
          'campo',
        )
      }
    }
  }
}

export interface ResultadoRetencion {
  valor: number
  regla: string
  label: string
  detalle: string
}

export function calcularRetencion(
  reglas: ReglaRetencion[],
  base: number,
  ctx: Contexto = {},
): ResultadoRetencion {
  verificarReglas(reglas)
  const activas = reglas.filter(r => r.activa).sort((a, b) => a.orden - b.orden)
  const general = reglaGeneral(reglas)
  const tarifaGeneral = () => multiplicador(general.valor_efecto, general.unidad, 'la tarifa general de retención')

  for (const r of activas) {
    let aplica = true
    for (const c of r.condiciones) {
      if (!cumple(c, ctx)) { aplica = false; break }
    }
    if (!aplica) continue

    switch (r.tipo_efecto) {
      case 'TARIFA': {
        const m = multiplicador(r.valor_efecto, r.unidad, `la tarifa de ${r.clave}`)
        return {
          valor: alPeso(base * m),
          regla: r.clave,
          label: r.label,
          detalle: `${r.label}: ${String(r.valor_efecto)} ${r.unidad === 'POR_MIL' ? 'por mil' : '%'} sobre la base.`,
        }
      }
      case 'EXENCION':
        // Un cero CON regla nombrada es un dato. Un cero por caerse de la lista
        // es un fallo. Por eso solo se puede llegar a cero por aquí.
        return { valor: 0, regla: r.clave, label: r.label, detalle: `${r.label}: no se practica retención.` }
      case 'REDUCCION_PCT_POR_ANIO': {
        const anios = Number(ctx.anios_tenencia ?? NaN)
        if (!Number.isFinite(anios)) {
          throw new SinReglaAplicable(`${r.label} necesita los años de tenencia y la simulación no los trae.`)
        }
        const pct = Math.min(100, tasa(r.valor_efecto, `la reducción de ${r.clave}`) * anios)
        const plena = base * tarifaGeneral()
        return {
          valor: alPeso(plena * (1 - pct / 100)),
          regla: r.clave,
          label: r.label,
          detalle: `${r.label}: se reduce ${pct} % de la retención general por ${anios} año(s).`,
        }
      }
      case 'TOPE': {
        const tope = tasa(r.valor_efecto, `el tope de ${r.clave}`)
        const plena = base * tarifaGeneral()
        return {
          valor: alPeso(Math.min(plena, tope)),
          regla: r.clave,
          label: r.label,
          detalle: `${r.label}: la retención no supera ${tope}.`,
        }
      }
    }
  }

  throw new SinReglaAplicable(
    'Ninguna regla de retención aplicó a esta operación. El cálculo se detiene: ' +
    'devolver cero daría por hecho que no hay retención.',
  )
}
