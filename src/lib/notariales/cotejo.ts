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
 * CINCO ESTADOS, no dos. «No transcrito» y «no cargado» no son lo mismo que
 * «difiere», y confundirlos convertiría el informe en un semáforo inútil:
 *
 *   · COINCIDE        las dos lecturas dicen lo mismo
 *   · DIFIERE         dicen cosas distintas → volver al PDF antes de publicar
 *   · SIN_TRANSCRIBIR está en la base y no en el documento → ¿de dónde salió?
 *   · SIN_CARGAR      está en el documento y no en la base → falta cargarlo
 *   · SIN_LECTURA     el documento dice `pendiente`: no hay segunda lectura
 *
 * El tercero es el más incómodo y el que más importa: una cifra en la base que
 * nadie transcribió es una cifra con una sola lectura, y puede que con ninguna.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL QUINTO ESTADO, y por qué hizo falta (2026-10-22, hallazgo N-02)
 *
 * El cotejo compara `valor`, `unidad` y `articulo` —y NO comparaba el **modo de
 * cálculo** de un tramo ni la **regla de redondeo**. Son los dos parámetros que
 * más mueven la cifra sin cambiar ningún número de la tabla:
 *
 *     la MISMA tabla ORIP, mismos valores y unidades, solo cambiando el modo
 *       base $200.000.000 → TASA_SOBRE_TOTAL 2.262.000 · MARGINAL 1.773.900
 *       base $600.000.000 → TASA_SOBRE_TOTAL 7.998.000 · MARGINAL 6.717.600
 *
 * Un millón doscientos ochenta mil pesos de diferencia, y el cotejo daba
 * COINCIDE en los dos casos.
 *
 * ⚠ Y AL AÑADIRLOS APARECIÓ EL PROBLEMA DE FONDO: **el documento normativo
 * transcrito no dice el modo.** Ni en el bloque ni en la prosa. Así que no hay
 * segunda lectura que cotejar, y rellenarla desde la base sería convertir el
 * cotejo en un eco —exactamente lo que estas líneas de arriba existen para
 * evitar—.
 *
 * De ahi `SIN_LECTURA`: el documento escribe `pendiente`, que no es un valor
 * sino una declaración de que **nadie ha leído ese parámetro del PDF todavía**.
 * No cuenta como coincidencia, no cuenta como diferencia, y bloquea `completo`.
 *
 * > La ausencia de evidencia no es una coincidencia. Es una casilla vacía con
 * > nombre.
 */

export type EstadoCotejo =
  | 'COINCIDE' | 'DIFIERE' | 'SIN_TRANSCRIBIR' | 'SIN_CARGAR' | 'SIN_LECTURA'

/**
 * Lo que el documento escribe cuando un parámetro **no se ha leído del PDF**.
 *
 * No es un valor con el que se pueda comparar: es la ausencia, declarada. Se
 * escribe en la columna `valor` del bloque.
 */
export const PENDIENTE = 'pendiente'

/**
 * Campos cuyo valor es un NOMBRE y no una cifra: se comparan como texto
 * normalizado, no con `normalizarValor` —que ante «TASA_SOBRE_TOTAL» devuelve
 * la cadena tal cual y haría sensible la comparación a un espacio o a una
 * mayúscula, que es como quedan muertas las comparaciones—.
 */
function esCampoDeTexto(campo: string): boolean {
  return campo === 'redondeo.modo' || campo.endsWith('.modo')
}

/** Una fila del bloque legible por máquina de la transcripción. */
export interface FilaTranscrita {
  concepto: string
  campo: string
  valor: string
  unidad: string
  articulo: string
}

/**
 * Una cifra tal como está en la base.
 *
 * `articulo` NO sale de un campo por cifra: sale del **respaldo** que cubre ese
 * campo, que el titular teclea una vez leyéndolo del PDF que tiene en la mano.
 * Ver `valoresDesdeAnio`. Esa es la diferencia entre comparar dos lecturas
 * independientes y comparar una lectura consigo misma.
 */
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

export const INICIO = '<!-- COTEJO:INICIO -->'
export const FIN = '<!-- COTEJO:FIN -->'
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
 * ¿Las dos citas hablan del mismo sitio del documento? Una contiene a la otra
 * cuando una es más específica —«art. 50» y «art. 50 parágrafo»—. Si ninguna
 * contiene a la otra, son dos artículos distintos.
 */
function articulosCompatibles(a: string, b: string): boolean {
  const x = normalizarTexto(a)
  const y = normalizarTexto(b)
  if (!x || !y) return true
  return x === y || x.startsWith(y) || y.startsWith(x)
}

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

    /* EL DOCUMENTO DECLARA QUE NO HA LEÍDO ESTE PARÁMETRO. Va primero, antes
     * que cualquier otra clasificación: sin segunda lectura no hay cotejo
     * posible, ni para bien ni para mal. Y se dice si la base tiene algo, que
     * es lo que decide si hay un dato publicable sin respaldo de lectura. */
    if (t && normalizarTexto(t.valor) === PENDIENTE) {
      return {
        concepto, campo, estado: 'SIN_LECTURA' as const, transcrito: t, cargado: c,
        diferencias: [
          c
            ? 'la base tiene un valor y el documento declara que nadie lo ha leído del PDF: ' +
              'no hay segunda lectura con la que compararlo'
            : 'nadie lo ha leído del PDF y tampoco está cargado',
        ],
      }
    }

    if (t && !c) return { concepto, campo, estado: 'SIN_CARGAR' as const, transcrito: t, cargado: null, diferencias: [] }
    if (!t && c) return { concepto, campo, estado: 'SIN_TRANSCRIBIR' as const, transcrito: null, cargado: c, diferencias: [] }
    if (!t || !c) return { concepto, campo, estado: 'SIN_CARGAR' as const, transcrito: t, cargado: c, diferencias: [] }

    const diferencias: string[] = []
    /* Un MODO se compara como texto; una cifra, como cifra. El mismo `!==` con
     * el normalizador equivocado dejaría pasar «tasa_sobre_total» frente a
     * «TASA_SOBRE_TOTAL», o lo reportaría como diferencia siendo el mismo modo. */
    const iguales = esCampoDeTexto(campo)
      ? normalizarTexto(t.valor) === normalizarTexto(c.valor)
      : normalizarValor(t.valor) === normalizarValor(c.valor)
    if (!iguales) {
      diferencias.push(`valor: el documento dice ${t.valor} y la base tiene ${c.valor}`)
    }
    if (normalizarTexto(t.unidad) !== normalizarTexto(c.unidad)) {
      // La unidad es tan grave como el valor: un 3 por mil cargado como 3 % es
      // un error de diez veces que da una cifra plausible.
      diferencias.push(`unidad: el documento dice ${t.unidad || '—'} y la base tiene ${c.unidad || '—'}`)
    }
    // El artículo se compara SOLO si el respaldo ya lo trae. Mientras no hay
    // respaldo no hay segunda lectura, y reportar «difiere» contra un vacío
    // convertiría una carga a medias en un falso hallazgo.
    //
    // Y se compara por COMPATIBILIDAD, no por igualdad, porque las dos lecturas
    // no tienen la misma granularidad: un respaldo cubre todos los tramos de un
    // concepto con «art. 50», y la transcripción distingue que los aportes
    // salen del «art. 50 parágrafo». Eso no es una contradicción: es un
    // refinamiento. Lo que sí es contradicción —y se reporta— es «art. 50»
    // contra «art. 51», que significa que alguien leyó otro artículo.
    if (c.articulo && !articulosCompatibles(t.articulo, c.articulo)) {
      diferencias.push(
        `artículo: el documento dice «${t.articulo}» y el respaldo cita «${c.articulo}». ` +
        'Uno de los dos leyó otro artículo',
      )
    }
    return {
      concepto, campo,
      estado: (diferencias.length ? 'DIFIERE' : 'COINCIDE') as EstadoCotejo,
      transcrito: t, cargado: c, diferencias,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// EL VEREDICTO QUE VE EL PANEL
//
// ⚠⚠ ESTO NO PUEDE LLEVAR LA CIFRA TRANSCRITA. NUNCA. ⚠⚠
//
// `ResultadoCotejo.diferencias` dice «el documento dice 28900 y la base tiene
// 28090». Eso sirve para el informe del script, que se lee después. Si llegara
// a la pantalla mientras se carga, el titular leería la cifra esperada y la
// copiaría — y el cotejo dejaría de comparar dos lecturas del PDF para comparar
// una lectura consigo misma. Habría costado el trabajo de escribirlo y no
// detectaría nada.
//
// Por eso el panel recibe `VeredictoCampo`: QUÉ difiere y DÓNDE mirar, nunca
// qué se esperaba. La navegación se muestra, el dato no. Es el mismo cuidado
// que con el artículo, que es navegación y no campo.
//
// Si alguien quiere «mejorar» el mensaje añadiendo el valor esperado para que
// sea más útil: eso es exactamente lo que no se puede hacer, y hay una
// verificación en el arnés que serializa el veredicto entero y comprueba que la
// cifra transcrita no aparezca en ninguna parte.
// ─────────────────────────────────────────────────────────────────────────────

export type AspectoDiferente = 'valor' | 'unidad' | 'articulo'

export interface VeredictoCampo {
  concepto: string
  campo: string
  estado: EstadoCotejo
  /** El artículo de la transcripción: navegación, para volver al PDF. */
  mirar_en: string
  /** Qué aspecto no coincide. Sin decir qué se esperaba. */
  difiere_en: AspectoDiferente[]
}

export interface VeredictoSeccion {
  concepto: string
  total: number
  coinciden: number
  difieren: number
  sin_transcribir: number
  sin_cargar: number
  /** Declarados `pendiente` en el documento: sin segunda lectura. */
  sin_lectura: number
  campos: VeredictoCampo[]
}

const ASPECTO: Record<string, AspectoDiferente> = {
  valor: 'valor', unidad: 'unidad', 'artículo': 'articulo',
}

/** Qué aspectos difieren, leído de los mensajes y vaciado de cifras. */
function aspectosDe(r: ResultadoCotejo): AspectoDiferente[] {
  const out: AspectoDiferente[] = []
  for (const d of r.diferencias) {
    const etiqueta = d.split(':')[0]?.trim() ?? ''
    const aspecto = ASPECTO[etiqueta]
    if (aspecto && !out.includes(aspecto)) out.push(aspecto)
  }
  return out
}

/**
 * El cotejo agrupado por concepto, listo para la pantalla. Cada sección se
 * guarda por su cuenta, así que cada sección tiene su propio veredicto: «7 de 7
 * coinciden» se ve mientras se avanza, con el PDF todavía abierto, en vez de
 * tres días después.
 */
export function veredictoPorSeccion(
  transcritas: FilaTranscrita[],
  cargados: ValorCargado[],
): VeredictoSeccion[] {
  const resultados = compararCotejo(transcritas, cargados)
  const porConcepto = new Map<string, ResultadoCotejo[]>()
  for (const r of resultados) {
    if (!porConcepto.has(r.concepto)) porConcepto.set(r.concepto, [])
    porConcepto.get(r.concepto)!.push(r)
  }
  const articuloDe = new Map(transcritas.map(t => [`${t.concepto}·${t.campo}`, t.articulo]))

  return [...porConcepto.entries()].map(([concepto, suyos]) => ({
    concepto,
    total: suyos.length,
    coinciden: suyos.filter(r => r.estado === 'COINCIDE').length,
    difieren: suyos.filter(r => r.estado === 'DIFIERE').length,
    sin_transcribir: suyos.filter(r => r.estado === 'SIN_TRANSCRIBIR').length,
    sin_cargar: suyos.filter(r => r.estado === 'SIN_CARGAR').length,
    sin_lectura: suyos.filter(r => r.estado === 'SIN_LECTURA').length,
    campos: suyos.map(r => ({
      concepto: r.concepto,
      campo: r.campo,
      estado: r.estado,
      // El artículo de la transcripción es navegación y sí se muestra.
      mirar_en: articuloDe.get(`${r.concepto}·${r.campo}`) ?? '',
      difiere_en: aspectosDe(r),
    })),
  }))
}

/** Cuántas de las cifras transcritas llevan ya valor cargado. */
export function avance(transcritas: FilaTranscrita[], cargados: ValorCargado[]): {
  cargadas: number
  total: number
  porcentaje: number
} {
  const hay = new Set(cargados.map(c => `${c.concepto}·${c.campo}`))
  const cargadas = transcritas.filter(t => hay.has(`${t.concepto}·${t.campo}`)).length
  const total = transcritas.length
  return { cargadas, total, porcentaje: total ? Math.round((cargadas / total) * 100) : 0 }
}

export interface ResumenCotejo {
  total: number
  coinciden: number
  difieren: number
  sin_transcribir: number
  sin_cargar: number
  /**
   * Parámetros que el documento declara `pendiente`: cargados o no, **no
   * tienen segunda lectura**. No son diferencias y NO son coincidencias.
   */
  sin_lectura: number
  /** ¿Se puede activar el año con esto? Solo si NADA difiere ni sobra. */
  apto: boolean
  /**
   * `sin_cargar === 0 && sin_lectura === 0`. `apto` sin esto no autoriza a
   * publicar.
   *
   * ⚠ `sin_lectura` entra en COMPLETO y no en APTO, a propósito. `apto`
   * significa «nada de lo cargado contradice la transcripción» y un parámetro
   * sin transcribir no contradice nada: meterlo ahí borraría la distinción
   * entre consistencia y completitud, que costó un defecto descubrirla —el
   * `apto: true` sobre 53 cifras sin cargar—.
   */
  completo: boolean
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
  const sinCargar = cuenta('SIN_CARGAR')
  const sinLectura = cuenta('SIN_LECTURA')
  return {
    total: resultados.length,
    coinciden: cuenta('COINCIDE'),
    difieren,
    sin_transcribir: sinTranscribir,
    sin_cargar: sinCargar,
    sin_lectura: sinLectura,
    /**
     * CONSISTENCIA, no completitud: «nada de lo cargado contradice la
     * transcripción». Deliberado y probado —un año vacío no contradice nada—.
     */
    apto: difieren === 0 && sinTranscribir === 0,
    /**
     * COMPLETITUD, que faltaba y es la mitad que engaña.
     *
     * ⚠ `apto` sale `true` en un año VACÍO: con 53 cifras sin cargar, no hay
     * ninguna que difiera ni ninguna sin transcribir. Eso es correcto para lo
     * que `apto` dice, y es exactamente la forma de indicador que miente en la
     * dirección cómoda si alguien lo lee como «apto para publicar».
     *
     * Lo descubrió el arnés del panel el día que se le puso un código de salida:
     * imprimía `{"sin_cargar":53,"apto":true}` y nadie lo había mirado.
     */
    completo: sinCargar === 0 && sinLectura === 0,
  }
}
