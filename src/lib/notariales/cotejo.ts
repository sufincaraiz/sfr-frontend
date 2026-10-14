/**
 * COTEJO DE LA TRANSCRIPCIÓN — módulo HOJA
 * ========================================
 *
 * Compara lo CARGADO en la base contra lo TRANSCRITO del PDF, fila por fila.
 *
 * ⚠ POR QUÉ ESTO NO ES UN ECO, que es lo único que lo hace valer:
 *
 * Las dos rutas son independientes y ninguna deriva de la otra. El titular
 * transcribió del PDF a `PARAMETROS-NOTARIALES-VERIFICADOS.md`, y después cargó
 * del MISMO PDF al panel, a mano, en otro momento. Si las dos lecturas
 * coinciden, cada cifra tiene dos pares de ojos encima. Si divergen, alguien
 * leyó mal el papel.
 *
 * Y ese es justo el error que ningún arnés puede encontrar: el motor estaría
 * calculando impecablemente sobre una cifra equivocada, las 439 verificaciones
 * en verde, y el resultado sería plausible y falso. Es el mismo patrón que la
 * exención muerta y el indicador agregado, pero una capa más abajo —en el dato,
 * no en el cálculo—, y ahí ya no hay guarda que lo alcance: solo dos lecturas.
 *
 * CUATRO ESTADOS, no dos. «No transcrito» y «no cargado» no son lo mismo que
 * «difiere», y confundirlos convertiría el informe en un semáforo inútil:
 *
 *   · COINCIDE        las dos lecturas dicen lo mismo
 *   · DIFIERE         dicen cosas distintas → volver al PDF antes de publicar
 *   · SIN_TRANSCRIBIR está en la base y no en el documento → ¿de dónde salió?
 *   · SIN_CARGAR      está en el documento y no en la base → falta cargarlo
 *
 * El tercero es el más incómodo y el que más importa: una cifra en la base que
 * nadie transcribió es una cifra con una sola lectura, y puede que con ninguna.
 */

export type EstadoCotejo = 'COINCIDE' | 'DIFIERE' | 'SIN_TRANSCRIBIR' | 'SIN_CARGAR'

/** Una fila del bloque legible por máquina de la transcripción. */
export interface FilaTranscrita {
  concepto: string
  campo: string
  valor: string
  unidad: string
  articulo: string
}

/** Una cifra tal como está en la base. */
export interface ValorCargado {
  concepto: string
  campo: string
  valor: string
  unidad: string
  articulo: string
}

export interface ResultadoCotejo {
  concepto: string
  campo: string
  estado: EstadoCotejo
  transcrito: FilaTranscrita | null
  cargado: ValorCargado | null
  /** Qué difiere, en texto. Vacío si coincide. */
  diferencias: string[]
}

export class ErrorBloqueCotejo extends Error {
  linea: number
  constructor(mensaje: string, linea = 0) {
    super(`Bloque de cotejo, línea ${linea}: ${mensaje}`)
    this.name = 'ErrorBloqueCotejo'
    this.linea = linea
  }
}

const INICIO = '<!-- COTEJO:INICIO -->'
const FIN = '<!-- COTEJO:FIN -->'
const COLUMNAS = ['concepto', 'campo', 'valor', 'unidad', 'articulo'] as const

/**
 * Normaliza una cifra para comparar: «52.374» y «52374» son el mismo número, y
 * «3,00» y «3» también. Lo que NO se normaliza es el texto: un artículo escrito
 * distinto se reporta, porque puede ser que se leyó otro artículo.
 */
export function normalizarValor(v: string): string {
  const s = String(v ?? '').trim()
  if (s === '' || s === '—' || s.toLowerCase() === 'abierto') return ''
  const limpio = s.replace(/\s|\$/g, '')
  // Número a la colombiana: punto de miles, coma decimal.
  const candidato = limpio.includes(',')
    ? limpio.split('.').join('').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(limpio) ? limpio.split('.').join('') : limpio
  const n = Number(candidato)
  if (!Number.isFinite(n)) return s
  // Sin ceros decimales de adorno: 3,00 y 3 son la misma tarifa.
  return String(n)
}

const normalizarTexto = (v: string): string =>
  String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

/**
 * Lee el bloque de columnas fijas. Es una tabla de Markdown para que la misma
 * fila se lea a ojo y por máquina: si viviera en un JSON aparte, la prosa y el
 * dato podrían desincronizarse y nadie lo vería.
 */
export function leerBloqueCotejo(texto: string): FilaTranscrita[] {
  const desde = texto.indexOf(INICIO)
  const hasta = texto.indexOf(FIN)
  if (desde < 0 || hasta < 0) {
    throw new ErrorBloqueCotejo(`faltan las marcas ${INICIO} … ${FIN}.`)
  }
  if (hasta < desde) throw new ErrorBloqueCotejo('la marca de fin va antes que la de inicio.')

  const lineas = texto.slice(desde + INICIO.length, hasta).split('\n')
  const filas: FilaTranscrita[] = []
  const vistas = new Set<string>()
  let cabecera = false

  for (let i = 0; i < lineas.length; i++) {
    const cruda = (lineas[i] ?? '').trim()
    if (!cruda || !cruda.startsWith('|')) continue
    const celdas = cruda.split('|').slice(1, -1).map(c => c.trim())
    if (/^[-: ]+$/.test(celdas.join(''))) continue

    if (!cabecera) {
      if (celdas.join(',').toLowerCase() !== COLUMNAS.join(',')) {
        throw new ErrorBloqueCotejo(
          `la cabecera tiene que ser exactamente «${COLUMNAS.join(' | ')}» y es «${celdas.join(' | ')}».`,
          i + 1,
        )
      }
      cabecera = true
      continue
    }

    if (celdas.length !== COLUMNAS.length) {
      throw new ErrorBloqueCotejo(`la fila tiene ${celdas.length} columnas y deben ser ${COLUMNAS.length}.`, i + 1)
    }
    const [concepto, campo, valor, unidad, articulo] = celdas as [string, string, string, string, string]
    for (const [nombre, v] of [['concepto', concepto], ['campo', campo], ['valor', valor], ['articulo', articulo]] as const) {
      if (!v) throw new ErrorBloqueCotejo(`falta ${nombre}.`, i + 1)
    }
    const llave = `${concepto}·${campo}`
    if (vistas.has(llave)) {
      throw new ErrorBloqueCotejo(`«${llave}» está transcrito dos veces.`, i + 1)
    }
    vistas.add(llave)
    filas.push({ concepto, campo, valor, unidad, articulo })
  }

  if (!cabecera) throw new ErrorBloqueCotejo('el bloque no tiene cabecera.')
  if (!filas.length) throw new ErrorBloqueCotejo('el bloque no tiene ni una fila.')
  return filas
}

/** Compara las dos lecturas. No deriva ninguna de la otra. */
export function compararCotejo(
  transcritas: FilaTranscrita[],
  cargados: ValorCargado[],
): ResultadoCotejo[] {
  const porLlave = (x: { concepto: string; campo: string }) => `${x.concepto}·${x.campo}`
  const mapaT = new Map(transcritas.map(f => [porLlave(f), f]))
  const mapaC = new Map(cargados.map(v => [porLlave(v), v]))
  const llaves = [...new Set([...mapaT.keys(), ...mapaC.keys()])].sort()

  return llaves.map(llave => {
    const t = mapaT.get(llave) ?? null
    const c = mapaC.get(llave) ?? null
    const [concepto, campo] = llave.split('·') as [string, string]

    if (t && !c) return { concepto, campo, estado: 'SIN_CARGAR' as const, transcrito: t, cargado: null, diferencias: [] }
    if (!t && c) return { concepto, campo, estado: 'SIN_TRANSCRIBIR' as const, transcrito: null, cargado: c, diferencias: [] }
    if (!t || !c) return { concepto, campo, estado: 'SIN_CARGAR' as const, transcrito: t, cargado: c, diferencias: [] }

    const diferencias: string[] = []
    if (normalizarValor(t.valor) !== normalizarValor(c.valor)) {
      diferencias.push(`valor: el documento dice ${t.valor} y la base tiene ${c.valor}`)
    }
    if (normalizarTexto(t.unidad) !== normalizarTexto(c.unidad)) {
      // La unidad es tan grave como el valor: un 3 por mil cargado como 3 % es
      // un error de diez veces que da una cifra plausible.
      diferencias.push(`unidad: el documento dice ${t.unidad || '—'} y la base tiene ${c.unidad || '—'}`)
    }
    if (normalizarTexto(t.articulo) !== normalizarTexto(c.articulo)) {
      diferencias.push(`artículo: el documento dice «${t.articulo}» y la base cita «${c.articulo}»`)
    }
    return {
      concepto, campo,
      estado: (diferencias.length ? 'DIFIERE' : 'COINCIDE') as EstadoCotejo,
      transcrito: t, cargado: c, diferencias,
    }
  })
}

export interface ResumenCotejo {
  total: number
  coinciden: number
  difieren: number
  sin_transcribir: number
  sin_cargar: number
  /** ¿Se puede activar el año con esto? Solo si NADA difiere ni sobra. */
  apto: boolean
}

/**
 * `apto` exige dos cosas, y la segunda es la que suele olvidarse: que nada
 * difiera, y que **nada esté cargado sin transcribir**. Lo que falta por cargar
 * no impide activar —ya lo bloquea la guarda de respaldos—, pero una cifra que
 * nadie leyó dos veces sí.
 */
export function resumirCotejo(resultados: ResultadoCotejo[]): ResumenCotejo {
  const cuenta = (e: EstadoCotejo) => resultados.filter(r => r.estado === e).length
  const difieren = cuenta('DIFIERE')
  const sinTranscribir = cuenta('SIN_TRANSCRIBIR')
  return {
    total: resultados.length,
    coinciden: cuenta('COINCIDE'),
    difieren,
    sin_transcribir: sinTranscribir,
    sin_cargar: cuenta('SIN_CARGAR'),
    apto: difieren === 0 && sinTranscribir === 0,
  }
}
