/**
 * EL EDITOR DE TRAMOS — módulo HOJA
 * =================================
 *
 * LA DECISIÓN QUE DECIDE EL RESTO: **`desde` no se teclea.**
 *
 * Se teclea `hasta` y el valor. `desde` se deriva del `hasta` de la fila
 * anterior, que es exactamente como ya se almacena —el intervalo es
 * `desde < base ≤ hasta`, así que el `hasta` de un tramo ES el `desde` del
 * siguiente, no `+1`; ver el comentario de `Tramo.desde` en `tipos.ts`, que
 * existe por el caso de $100.000.000,50—.
 *
 * Lo que eso compra no es comodidad:
 *
 * > **El hueco y el solape dejan de poder escribirse.** No es una validación
 * > que los caza: es una forma donde no existen. Primer nivel de la jerarquía
 * > —que no pueda ocurrir— en vez del tercero —que se note—.
 *
 * Y de paso, 29 filas pasan de 58 campos a 29.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUÉ DEJA DE SER POSIBLE Y QUÉ SIGUE SIÉNDOLO
 *
 * Imposible por construcción (no hay dónde escribirlo):
 *   · un hueco entre dos tramos
 *   · un solape entre dos tramos
 *   · un `desde` que no case con el `hasta` anterior
 *   · dos tramos con el mismo `orden`
 *
 * Sigue siendo posible, y es lo que las verificaciones tienen que mirar:
 *   · dos `hasta` iguales → un tramo de anchura cero
 *   · `hasta` que no crece → se ordena solo, así que nunca es un error del
 *     usuario: es la forma canónica
 *   · más de un tramo abierto (`hasta` nulo)
 *   · ningún tramo abierto → la tabla no cubre el infinito: INCOMPLETA
 *   · la tabla vacía → no es un error, es una tabla sin empezar
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNA TABLA A MEDIAS NO ESTÁ ROTA, ESTÁ A MEDIAS
 *
 * Por eso el diagnóstico tiene DOS severidades y no una:
 *
 *   · `INCOMPLETA` — todavía no has terminado. No se puede liquidar con ella y
 *     no hay nada que corregir: faltan filas.
 *   · `ERROR` — lo escrito se contradice. Hay algo que arreglar.
 *
 * > Si el editor grita desde la primera fila, en la fila 14 nadie lo lee.
 *
 * Nada de este módulo sabe que existe una pantalla. **Lo que la pantalla puede
 * garantizar es cero**: toda la corrección vive aquí y la prueba
 * `scripts/probar-editor-tramos.mjs`. Si para saber si el editor es correcto
 * hay que abrirlo, está mal hecho.
 */

import { ErrorEsquemaNotarial, type Tramo, type ModoTramo, type UnidadValor } from './tipos.ts'
import { leerNumero } from '../finanzas/numeros.ts'

/**
 * UNA FILA COMO SE TECLEA. No lleva `desde` ni `orden`: los dos se derivan.
 *
 * `hasta: null` es el tramo ABIERTO —«y de ahí para arriba»—. Es una elección
 * del que carga, no una ausencia: por eso es `null` explícito y no `undefined`.
 */
export interface FilaEditor {
  /** Límite superior INCLUSIVO, o `null` para el tramo abierto. */
  hasta: string | number | null
  valor: string | number
  unidad: UnidadValor
  modo_calculo: ModoTramo
  /** Los límites van en UVT en vez de pesos (timbre). */
  en_uvt?: boolean
  aporte_snr?: string | number | null
  aporte_fondo?: string | number | null
  valor_en_uvb?: string | number | null
}

export type Severidad = 'INCOMPLETA' | 'ERROR'

export interface Aviso {
  severidad: Severidad
  /** Índice de la fila en el orden CANÓNICO, o `null` si es de la tabla entera. */
  fila: number | null
  mensaje: string
}

export interface Resultado {
  /** La tabla en forma canónica. Vacía si hay algún `ERROR`. */
  tramos: Tramo[]
  avisos: Aviso[]
  /** Ningún aviso de severidad ERROR: lo escrito no se contradice. */
  coherente: boolean
  /** Coherente Y completa: se puede liquidar con ella. */
  liquidable: boolean
}

/**
 * Lee un límite SIN LANZAR.
 *
 * ⚠ ESTO LO ENCONTRÓ EL ARNÉS, no el diseño. `leerNumero` lanza ante «-5», que
 * es lo correcto en el motor —una tarifa ilegible tiene que detener el
 * cálculo— y es **inaceptable en un editor**: quien está tecleando pasa por
 * estados ilegibles todo el rato («-», «1.», «»). Una excepción ahí tumba la
 * pantalla en vez de señalar la fila.
 *
 * > Un número a medio teclear no es una excepción, igual que una tabla a
 * > medias no está rota.
 *
 * Devuelve `{ hasta: null }` para el tramo abierto y `{ ilegible: true }` para
 * lo que no se puede leer, y el que llama decide qué contar.
 */
function limiteNumerico(v: string | number | null, etiqueta: string): { hasta: number | null; ilegible: boolean } {
  if (v === null) return { hasta: null, ilegible: false }
  try {
    const s = leerNumero(v, 'pesos', etiqueta)
    if (s === null) return { hasta: null, ilegible: false }
    const n = Number(s)
    if (!Number.isFinite(n)) return { hasta: null, ilegible: true }
    return { hasta: n, ilegible: false }
  } catch {
    return { hasta: null, ilegible: true }
  }
}

interface FilaLeida {
  fila: FilaEditor
  hasta: number | null
  ilegible: boolean
  /**
   * `true` solo si el que teclea ELIGIÓ dejarlo abierto, o sea `hasta: null`
   * explícito.
   *
   * ⚠ NO ES LO MISMO QUE «sin límite». Una casilla vacía —`''`— es una fila
   * recién añadida cuyo límite todavía no se ha escrito, y confundir las dos
   * cosas producía el peor defecto que ha tenido este módulo: con
   * `[{hasta:''}, {hasta:null}]` devolvía DOS tramos abiertos, los dos con
   * `desde: 0`, y declaraba la tabla **liquidable**. El segundo tramo no se
   * alcanza nunca y la cifra habría salido plausible.
   *
   * Lo encontró una prueba de un estado que no estaba en la lista de extremos
   * —la casilla vacía—, que es justo el estado en el que NACE toda fila.
   */
  abierto: boolean
  /** La casilla está en blanco: no se ha escrito el límite todavía. */
  enBlanco: boolean
}

/**
 * EL ORDEN CANÓNICO: por `hasta` creciente, el abierto al final, y lo ilegible
 * detrás de todo —no se puede colocar lo que no se puede leer—.
 *
 * Esto es lo que hace que «insertar una fila en medio» no sea una operación:
 * da igual dónde se inserte, el resultado es el mismo. La pantalla no tiene que
 * saber colocarla, y no hay forma de dejar la tabla desordenada.
 */
function ordenCanonico(filas: FilaEditor[], etiqueta: string): FilaLeida[] {
  const leidas: FilaLeida[] = filas.map(f => {
    const enBlanco = f.hasta !== null && String(f.hasta).trim() === ''
    const { hasta, ilegible } = enBlanco
      ? { hasta: null, ilegible: false }
      : limiteNumerico(f.hasta, `${etiqueta}: límite`)
    return { fila: f, hasta, ilegible, enBlanco, abierto: !ilegible && !enBlanco && f.hasta === null }
  })
  return leidas.sort((a, b) => {
    /* Lo que no se puede colocar va al final: ilegible, luego en blanco, luego
     * el abierto, y delante los límites por orden. */
    /* EL ABIERTO VA ÚLTIMO SIEMPRE: es la definición del tramo superior. Lo
     * ilegible y lo que está en blanco van delante de él porque no se pueden
     * colocar, pero tampoco pueden desplazarlo de su sitio. */
    const peso = (x: FilaLeida) => (x.abierto ? 3 : x.enBlanco ? 2 : x.ilegible ? 1 : 0)
    if (peso(a) !== peso(b)) return peso(a) - peso(b)
    if (a.hasta === null || b.hasta === null) return 0
    return a.hasta - b.hasta
  })
}

/** La fila vacía con la que nace un tramo nuevo en la pantalla. */
export function filaNueva(modo: ModoTramo, unidad: UnidadValor, en_uvt = false): FilaEditor {
  return { hasta: null, valor: '', unidad, modo_calculo: modo, en_uvt }
}

/**
 * LA FUNCIÓN DEL MÓDULO: filas tecleadas → tabla canónica + diagnóstico.
 *
 * No lanza por lo que el usuario puede estar escribiendo a medias: devuelve
 * avisos. Lanza solo si un dato es ilegible como número, que es lo mismo que
 * hace el resto del motor.
 */
export function tramosDesdeFilas(filas: FilaEditor[], etiqueta = 'concepto'): Resultado {
  const avisos: Aviso[] = []

  /* LA TABLA VACÍA NO ES UN ERROR. Es el estado en el que nace todo concepto
   * por tramos: `CONCEPTOS_V1` siembra `tramos: []`. Decir «error» aquí sería
   * gritar en la fila cero. */
  if (filas.length === 0) {
    return {
      tramos: [],
      avisos: [{ severidad: 'INCOMPLETA', fila: null, mensaje: 'La tabla no tiene ninguna fila todavía.' }],
      coherente: true,
      liquidable: false,
    }
  }

  const orden = ordenCanonico(filas, etiqueta)

  /* MÁS DE UN TRAMO ABIERTO sí es una contradicción: dos filas dicen «y de ahí
   * para arriba» y la segunda no puede alcanzarse nunca. */
  const abiertos = orden.filter(f => f.abierto).length
  if (abiertos > 1) {
    avisos.push({
      severidad: 'ERROR', fila: null,
      mensaje: `Hay ${abiertos} tramos abiertos y solo puede haber uno: el último.`,
    })
  }

  const tramos: Tramo[] = []
  let anterior: number = 0

  for (let i = 0; i < orden.length; i++) {
    const leida = orden[i]!
    const f = leida.fila
    const hasta = leida.hasta

    /* UN LÍMITE ILEGIBLE ES UN ERROR, pero de la fila, con su valor a la vista:
     * así el que teclea ve QUÉ escribió y no un «algo falló». */
    if (leida.ilegible) {
      avisos.push({
        severidad: 'ERROR', fila: i,
        mensaje: `El límite del tramo ${i + 1} no se puede leer como una cifra: «${String(f.hasta)}».`,
      })
    }

    /* LA CASILLA EN BLANCO ES «A MEDIAS», y sobre todo NO es el tramo abierto.
     * Mientras esté en blanco la tabla no es liquidable, así que no hay forma
     * de que una fila sin límite llegue al motor como si cubriera el infinito. */
    if (leida.enBlanco) {
      avisos.push({
        severidad: 'INCOMPLETA', fila: i,
        mensaje: `Falta el límite del tramo ${i + 1}: escribe hasta cuánto llega, ` +
          'o déjalo como tramo abierto si es el último.',
      })
    }

    /* Faltar el valor es «a medias», no «mal». Es el estado de una fila recién
     * añadida, y la fila recién añadida es el caso más frecuente del editor. */
    const sinValor = f.valor === '' || f.valor === null || f.valor === undefined
    if (sinValor) {
      avisos.push({ severidad: 'INCOMPLETA', fila: i, mensaje: `Falta el valor del tramo ${i + 1}.` })
    }
    /* Autocomprobación de ESTE módulo, y solo cuando hay un único abierto:
     * con dos, el aviso correcto es el de arriba y este sobra. */
    if (abiertos === 1 && leida.abierto && i !== orden.length - 1) {
      /* No debería ocurrir —el orden canónico pone el abierto al final— así que
       * si ocurre es un defecto de ESTE módulo, no del que teclea. */
      avisos.push({
        severidad: 'ERROR', fila: i,
        mensaje: `El tramo abierto quedó en la posición ${i + 1} de ${orden.length}.`,
      })
    }

    /* UN AVISO POR CAUSA, no dos por el mismo hecho. Un `hasta` de 0 en la
     * primera fila es «límite inválido», no «no supera al anterior»: el segundo
     * mensaje sería cierto y confundiría, porque no hay fila anterior. */
    if (hasta !== null) {
      if (hasta <= 0) {
        avisos.push({
          severidad: 'ERROR', fila: i,
          mensaje: `El tramo ${i + 1} termina en ${hasta}, que no es un límite válido.`,
        })
      } else if (i > 0 && hasta <= anterior) {
        /* Dos `hasta` iguales, o uno que no supera al anterior: el intervalo
         * `desde < base ≤ hasta` queda vacío y ese tramo no se aplica nunca. */
        avisos.push({
          severidad: 'ERROR', fila: i,
          mensaje: `El tramo ${i + 1} termina en ${hasta} y el anterior ya terminaba en ${anterior}: ` +
            'no cubre ningún valor.',
        })
      }
    }

    tramos.push({
      orden: i + 1,
      /* AQUÍ ESTÁ TODO. `desde` es el `hasta` anterior, literal, sin `+1`. El
       * primer tramo arranca en 0. No hay forma de que no case. */
      desde: anterior,
      hasta: hasta,
      en_uvt: f.en_uvt ?? false,
      modo_calculo: f.modo_calculo,
      valor: f.valor,
      unidad: f.unidad,
      ...(f.aporte_snr !== undefined ? { aporte_snr: f.aporte_snr } : {}),
      ...(f.aporte_fondo !== undefined ? { aporte_fondo: f.aporte_fondo } : {}),
      ...(f.valor_en_uvb !== undefined ? { valor_en_uvb: f.valor_en_uvb } : {}),
    })

    if (hasta !== null) anterior = hasta
  }

  /* SIN TRAMO ABIERTO LA TABLA NO CUBRE EL INFINITO. Es lo que pasa al borrar
   * la última fila, y es «a medias»: una base por encima del último `hasta` no
   * encuentra tramo y el motor se detiene, que es lo correcto. No hay nada que
   * corregir en lo escrito; falta una fila. */
  if (abiertos === 0) {
    avisos.push({
      severidad: 'INCOMPLETA', fila: null,
      mensaje: `Falta el tramo abierto: por encima de ${anterior} la tabla no dice nada.`,
    })
  }

  const coherente = !avisos.some(a => a.severidad === 'ERROR')
  return {
    tramos: coherente ? tramos : [],
    avisos,
    coherente,
    liquidable: coherente && !avisos.some(a => a.severidad === 'INCOMPLETA'),
  }
}

/**
 * EL CAMINO DE VUELTA: una tabla ya guardada → filas para editar.
 *
 * Existe para que el editor pueda ABRIR lo que sembró el script, y su prueba de
 * fuego es el viaje redondo: `tramosDesdeFilas(filasDesdeTramos(t))` tiene que
 * devolver `t`. Si una tabla válida no se puede expresar en esta forma, la forma
 * está mal y hay que saberlo antes de construir la pantalla.
 */
export function filasDesdeTramos(tramos: Tramo[]): FilaEditor[] {
  return [...tramos]
    .sort((a, b) => a.orden - b.orden)
    .map(t => ({
      hasta: t.hasta ?? null,
      valor: t.valor,
      unidad: t.unidad,
      modo_calculo: t.modo_calculo,
      en_uvt: t.en_uvt ?? false,
      ...(t.aporte_snr !== undefined ? { aporte_snr: t.aporte_snr } : {}),
      ...(t.aporte_fondo !== undefined ? { aporte_fondo: t.aporte_fondo } : {}),
      ...(t.valor_en_uvb !== undefined ? { valor_en_uvb: t.valor_en_uvb } : {}),
    }))
}

/**
 * Qué decir en la pantalla, en una línea, sin que sea una alarma cuando no lo
 * es. La pantalla no decide el tono: lo decide esto.
 */
export function resumenParaPantalla(r: Resultado): { tono: 'OK' | 'A_MEDIAS' | 'MAL'; texto: string } {
  if (!r.coherente) {
    const n = r.avisos.filter(a => a.severidad === 'ERROR').length
    return { tono: 'MAL', texto: n === 1 ? 'Hay 1 contradicción que corregir.' : `Hay ${n} contradicciones que corregir.` }
  }
  if (!r.liquidable) {
    const n = r.avisos.filter(a => a.severidad === 'INCOMPLETA').length
    return { tono: 'A_MEDIAS', texto: n === 1 ? 'Falta 1 cosa para terminar.' : `Faltan ${n} cosas para terminar.` }
  }
  return { tono: 'OK', texto: `${r.tramos.length} tramo(s), tabla completa.` }
}
