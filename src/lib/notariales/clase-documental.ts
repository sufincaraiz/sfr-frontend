/**
 * DE QUÉ DOCUMENTO SALIÓ ESTA CIFRA
 * =================================
 *
 * No de qué dominio: **de qué documento.** Un mismo portal oficial aloja el PDF
 * firmado de una resolución y, en otra página, su texto integrado con las
 * modificaciones posteriores. Son dos documentos distintos con autoridad
 * distinta, y la URL no dice de cuál se bajó nadie.
 *
 * Hasta el 2026-10-25 esta distinción NO existía. Había tres ejes y ninguno era
 * éste:
 *
 *   · `tipo_evidencia`  URL_OFICIAL / DOCUMENTO_ARCHIVADO  → el SOPORTE
 *   · `caracter`        EXIGIDO / ADOPTADO                 → qué manda la norma
 *   · `es_compilacion`  booleano, por DOMINIO              → el eje equivocado
 *
 * El tercero era lo más cercano y fallaba en los dos extremos: no puede decir
 * que `supernotariado.gov.co` sirve el original Y el compilado, y no puede
 * expresar más de dos clases.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA LISTA BLANCA DEJA DE SER LA PUERTA
 *
 * Hoy `esFuenteOficial` decide mirando si el host está en
 * `fuentes_normativas`, y eso era todo. A partir de ahora la lista blanca dice
 * **de dónde se puede bajar** —sigue sin valer un blog ni una notaría
 * particular— pero **no dice que lo que bajaste sirva de respaldo.** Eso lo
 * dice la clase documental, y es necesaria además de la lista, no en su lugar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA REGLA DE ACTIVACIÓN ES LA DEL COTEJO, APLICADA AL DOCUMENTO
 *
 * El cotejo de las 53 cifras exige DOS LECTURAS independientes antes de dar una
 * cifra por buena. Lo mismo vale aquí:
 *
 *   · PUBLICACION_OFICIAL  activa sola. Es el texto auténtico.
 *   · TEXTO_COMPILADO      NO activa sola. Necesita el original.
 *   · compilado + compilado NO son dos lecturas: es el mismo texto copiado dos
 *     veces, y copiarlo dos veces no lo verifica.
 *   · COPIA e INDICE       NUNCA activan. Sirven para localizar, no para
 *     sostener.
 *
 * El caso que lo prueba está en nuestra propia base: el normograma de
 * Cancillería **declara por escrito que tiene erratas de digitación**, y hasta
 * hoy valía exactamente lo mismo que el Diario Oficial.
 *
 * ⚠ CONSECUENCIA QUE CONVIENE VER DE FRENTE: con estas cuatro reglas, el
 * veredicto se reduce a **«hace falta al menos una PUBLICACION_OFICIAL»**. No
 * hay combinación de compilados, copias e índices que active. Eso es correcto y
 * es más simple de lo que parece la enunciación — pero **el MOTIVO sí cambia**,
 * y por eso esto devuelve un veredicto con su razón y no un booleano: «tienes
 * dos compilaciones» se arregla de otra forma que «solo tienes un índice».
 *
 * Módulo HOJA: sin `@/`, sin `enum`, sin propiedades de constructor.
 */

/** La clase DOCUMENTAL de un respaldo. Del documento, no del dominio. */
export type ClaseDocumental =
  /** El texto auténtico tal como se publicó: Diario Oficial, o el PDF firmado
   *  con radicado y sellos que expidió la propia entidad. */
  | 'PUBLICACION_OFICIAL'
  /** Texto compilado o integrado: un normograma, una versión consolidada con
   *  las modificaciones incorporadas. Útil, y no es el texto auténtico. */
  | 'TEXTO_COMPILADO'
  /** Una reproducción: alguien que vuelve a publicar el texto. */
  | 'COPIA'
  /** Un índice o una ficha informativa: dice que la norma existe y dónde está,
   *  no qué dice. */
  | 'INDICE'

export const CLASES_DOCUMENTALES: ClaseDocumental[] = [
  'PUBLICACION_OFICIAL', 'TEXTO_COMPILADO', 'COPIA', 'INDICE',
]

/** Lo que cada clase significa, para la pantalla y para el PDF. */
export const QUE_ES: Record<ClaseDocumental, string> = {
  PUBLICACION_OFICIAL: 'publicación oficial original',
  TEXTO_COMPILADO: 'texto compilado o integrado',
  COPIA: 'copia o reproducción',
  INDICE: 'índice o fuente informativa',
}

export function esClaseDocumental(v: unknown): v is ClaseDocumental {
  return typeof v === 'string' && (CLASES_DOCUMENTALES as string[]).includes(v)
}

/** Lo mínimo que esta regla necesita saber de un respaldo. */
export interface RespaldoClasificado {
  campo: string
  clase_documental?: ClaseDocumental | null
}

export type EstadoActivacion =
  | 'ACTIVA'
  | 'SIN_CLASE'
  | 'SIN_RESPALDO'
  | 'SOLO_COMPILADO'
  | 'SOLO_LOCALIZADORES'

export interface VeredictoActivacion {
  activa: boolean
  estado: EstadoActivacion
  /** Qué falta, en palabras que se puedan leer en el panel y arreglar. */
  motivo: string
}

/**
 * ¿Pueden estos respaldos sostener una cifra publicable?
 *
 * ⚠ UN RESPALDO SIN CLASE NO ACTIVA, y no se le pone una por defecto. Es la
 * misma regla que «una cifra sin respaldo no activa»: el valor que significa
 * «no se decidió» no puede leerse como una decisión. Por eso `clase_documental`
 * es obligatoria en el esquema y aquí se vuelve a comprobar —la base puede
 * tener filas viejas y el tipo puede mentir si alguien pone un `as`—.
 */
export function puedeActivar(respaldos: RespaldoClasificado[]): VeredictoActivacion {
  const lista = Array.isArray(respaldos) ? respaldos : []

  if (lista.length === 0) {
    return { activa: false, estado: 'SIN_RESPALDO', motivo: 'no tiene ningún respaldo' }
  }

  const sinClase = lista.filter(r => !esClaseDocumental(r.clase_documental))
  if (sinClase.length > 0) {
    return {
      activa: false,
      estado: 'SIN_CLASE',
      motivo:
        `${sinClase.length} de sus ${lista.length} respaldo(s) no declaran de qué clase de ` +
        'documento salieron. Sin esa declaración no se puede saber si sostienen la cifra, ' +
        'y no se supone ninguna.',
    }
  }

  const clases = lista.map(r => r.clase_documental as ClaseDocumental)

  if (clases.includes('PUBLICACION_OFICIAL')) {
    return { activa: true, estado: 'ACTIVA', motivo: 'tiene la publicación oficial original' }
  }

  const compilados = clases.filter(c => c === 'TEXTO_COMPILADO').length
  if (compilados > 0) {
    return {
      activa: false,
      estado: 'SOLO_COMPILADO',
      motivo:
        compilados === 1
          ? 'solo se apoya en un texto compilado. Falta la publicación oficial original: ' +
            'una compilación puede traer erratas de digitación, y una de las nuestras lo ' +
            'declara por escrito.'
          : `se apoya en ${compilados} textos compilados y en ninguna publicación oficial. ` +
            'Dos compilaciones no son dos lecturas: son el mismo texto copiado dos veces, ' +
            'y copiarlo dos veces no lo verifica.',
    }
  }

  return {
    activa: false,
    estado: 'SOLO_LOCALIZADORES',
    motivo:
      'solo se apoya en copias o índices. Eso sirve para localizar la norma, no para ' +
      'sostener una cifra: dice que existe y dónde está, no qué dice.',
  }
}
