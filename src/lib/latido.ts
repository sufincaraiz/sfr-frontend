/**
 * EL LATIDO: DECIRLE A UN TERCERO QUE SEGUIMOS VIVOS
 * ==================================================
 *
 * Un servicio de fuera (healthchecks.io) espera una señal cada día. Si la señal
 * no llega, **él escribe**. Eso invierte el problema que teníamos:
 *
 *   · un aviso que informa POR NO LLEGAR le pide a una persona que advierta un
 *     silencio, y eso no lo hace nadie —la bandeja de Leonel tenía 1.932 sin
 *     leer: un correo que falta ahí no se distingue de los que sobran—;
 *   · un tercero que espera el pulso convierte la ausencia en **un aviso que
 *     llega**.
 *
 * Y es la única pieza del sistema que **no comparte infraestructura con nada
 * nuestro**: ni Vercel, ni Meta, ni la base, ni este código. Si todo lo nuestro
 * muere a la vez, ése es justo el caso en que tiene que hablar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TRES REGLAS, Y LAS TRES SON DEL INSTRUMENTO
 *
 * 1. **EL LATIDO NO PUEDE MATAR A QUIEN VIGILA.** Nada de aquí lanza nunca. Un
 *    vigilante que tumba el cron que observa es peor que no tener vigilante:
 *    fabrica la avería de la que iba a avisar.
 *
 * 2. **EL ÉXITO SE MANDA AL FINAL, EL FALLO EXPLÍCITAMENTE.** Latir al entrar
 *    solo demuestra que la función arrancó, y lo que importa es que TERMINÓ su
 *    trabajo. Y cuando revienta se manda `/fail`, para que la alerta llegue en
 *    segundos en vez de esperar a que se agote el margen. El silencio queda
 *    para lo único que no se puede avisar: que la función ni se ejecutó.
 *
 * 3. **SIN URL NO SE CALLA: SE DICE.** Si falta la variable de entorno, se
 *    registra. Es la misma lección que los tres `return` mudos de `whatsapp.ts`
 *    que dejaron 9 leads sin aviso: un camino que se desactiva en silencio es
 *    indistinguible de uno que funciona.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ LA URL ES UNA LLAVE, NO UNA DIRECCIÓN
 *
 * Quien la tenga puede mandar «estoy vivo» en falso, y **un vigilante al que se
 * puede mentir es peor que ninguno**: da un verde que no puede ser rojo. Por eso
 * vive en una variable de entorno de Vercel y nunca en el repositorio, y por eso
 * este módulo no la imprime en ningún log ni en ningún error.
 *
 * Este archivo es un MÓDULO HOJA: sin imports con `@/`, sin `enum`, sin
 * propiedades de constructor, para que `node` lo ejecute en modo strip-only y
 * el arnés pruebe el código real.
 */

/** Qué se le está diciendo al vigilante. */
export type EstadoLatido = 'VIVO' | 'FALLO'

/**
 * La URL a la que se manda cada estado.
 *
 * `/fail` se añade a la base. Se normaliza la barra final porque una URL
 * copiada del panel puede traerla o no, y `…uuid//fail` no es la misma ruta
 * que `…uuid/fail`: el vigilante devolvería 404 y el fallo se perdería
 * justo en el momento en que más falta hace.
 */
export function urlDeLatido(base: string, estado: EstadoLatido): string {
  const limpia = base.trim().replace(/\/+$/, '')
  return estado === 'FALLO' ? `${limpia}/fail` : limpia
}

/** Resultado de un intento de latido. Nunca una excepción. */
export interface ResultadoLatido {
  mandado: boolean
  /** Por qué no se mandó, o qué contestó el vigilante. Nunca lleva la URL. */
  detalle: string
}

/**
 * ¿Hay con qué latir? Separado del envío para poder probarlo sin red.
 *
 * Devuelve la base o el motivo, nunca `undefined`: misma forma que
 * `decidirAviso` en `aviso-lead.ts`, y por la misma razón.
 */
export function decidirLatido(
  url: string | undefined,
): { late: true; base: string } | { late: false; motivo: string } {
  const base = (url ?? '').trim()
  if (!base) {
    return { late: false, motivo: 'no se latió: falta HEALTHCHECKS_PING_URL en el entorno' }
  }
  if (!/^https:\/\//i.test(base)) {
    /* Exigir https no es ceremonia: la URL ES la credencial, y por http
     * viajaría en claro hasta el vigilante. */
    return { late: false, motivo: 'no se latió: HEALTHCHECKS_PING_URL no empieza por https://' }
  }
  return { late: true, base }
}

/**
 * Manda el latido. **No lanza nunca y no hace esperar al cron**: 5 segundos de
 * tope, porque el trabajo del cron ya está hecho cuando se llama a esto y
 * colgarse aquí sería convertir al vigilante en la avería.
 */
export async function latir(
  estado: EstadoLatido,
  url: string | undefined = process.env.HEALTHCHECKS_PING_URL,
): Promise<ResultadoLatido> {
  const d = decidirLatido(url)
  if (!d.late) {
    console.warn(`[latido] ${d.motivo}`)
    return { mandado: false, detalle: d.motivo }
  }
  try {
    const res = await fetch(urlDeLatido(d.base, estado), {
      method: 'POST',
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) {
      console.warn(`[latido] el vigilante contestó ${res.status} al latido ${estado}.`)
      return { mandado: false, detalle: `el vigilante contestó ${res.status}` }
    }
    return { mandado: true, detalle: `latido ${estado} aceptado` }
  } catch (err) {
    /* Que el latido no salga NO es que el cron fallara. Se registra y se sigue:
     * si de verdad hay un corte, el vigilante lo detectará por ausencia, que es
     * exactamente para lo que está. */
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.warn(`[latido] no se pudo latir (${estado}): ${msg}`)
    return { mandado: false, detalle: msg }
  }
}
