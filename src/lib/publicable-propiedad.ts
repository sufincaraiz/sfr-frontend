/**
 * QUÉ LE FALTA A UN INMUEBLE PARA PODER ESTAR PÚBLICO — módulo HOJA
 * =================================================================
 *
 * El filtro del catálogo público es `{ status: 'available' }` **y nada más**
 * (`lib/catalogo.ts`). Ni completitud, ni fotos, ni precio. Y el formulario de
 * alta nace con `status: 'available'` y `price_cop: BigInt(data.price_cop || 0)`,
 * así que **una propiedad a medio llenar sería visible al instante**.
 *
 * Medido en producción el 2026-10-19: **0 con precio 0, 0 sin foto, 0 sin
 * descripción**. El peligro es real en el código y nunca ha ocurrido; por eso
 * esto no se hizo antes y por eso se hace ahora sin prisa.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA FORMA DEL ARREGLO, que es la misma que ya funcionó dos veces esta semana:
 *
 * > **En vez de filtrar el estado malo, que no se pueda alcanzar.**
 *
 * No se añade una condición al catálogo —eso dejaría el estado malo escrito en
 * la base, invisible y esperando a que alguien quite el filtro—. Se bloquea la
 * TRANSICIÓN a `available`.
 *
 * Y bloquear sin decir qué falta es un botón muerto: el mensaje **enumera**.
 */

/** Lo mínimo que un inmueble tiene que tener para que un visitante lo vea. */
export interface InmuebleParaPublicar {
  /** `bigint` en la base; se acepta `number` o `string` para los arneses. */
  price_cop?: bigint | number | string | null
  description?: string | null
  short_description?: string | null
  /** Cuántas imágenes tiene asociadas. */
  fotos?: number | null
}

/**
 * Qué falta, en texto, listo para enumerar. Vacío = se puede publicar.
 *
 * Devuelve una LISTA y no un booleano a propósito: un `false` obliga a quien
 * llama a inventarse el mensaje, y el mensaje es la mitad del arreglo.
 */
export function faltaParaPublicar(p: InmuebleParaPublicar): string[] {
  const falta: string[] = []

  /* EL PRECIO. `BigInt(x || 0)` convierte una casilla vacía en CERO, y un cero
   * en una oferta de schema.org afirma «gratis». Cero no es un precio. */
  /* Se compara en Number y no con literales BigInt: el target de TS del
   * proyecto es anterior a ES2020 y `0n` no compila. Un precio de inmueble no
   * se acerca al limite de precision de Number, y la base sigue guardando
   * BigInt. */
  const precio = p.price_cop === null || p.price_cop === undefined
    ? 0
    : Number(typeof p.price_cop === 'string' ? (p.price_cop.replace(/\D/g, '') || '0') : p.price_cop)
  if (!Number.isFinite(precio) || precio <= 0) falta.push('el precio (no puede ser cero)')

  /* LA DESCRIPCIÓN. Vale la larga o la corta: lo que no vale es ninguna. Y se
   * mira con `trim()`, porque una cadena de espacios no es una descripción —es
   * la misma distinción que `PUBLICABLE` tuvo que hacer para los municipios,
   * donde `not: null` no cubría la cadena vacía—. */
  const larga = (p.description ?? '').trim()
  const corta = (p.short_description ?? '').trim()
  if (!larga && !corta) falta.push('la descripción')

  /* AL MENOS UNA FOTO. Un inmueble sin foto en un catálogo de fincas no es una
   * publicación incompleta: es una publicación que nadie va a abrir. */
  if (!p.fotos || p.fotos < 1) falta.push('al menos una foto')

  return falta
}

/** Se lanza al intentar publicar un inmueble que no está listo. */
export class InmuebleNoPublicable extends Error {
  falta: string[]
  constructor(falta: string[]) {
    super(
      'Para que el inmueble salga en el catálogo público falta ' +
      (falta.length === 1 ? falta[0] : `${falta.slice(0, -1).join(', ')} y ${falta.at(-1)}`) +
      '. Se puede guardar sin publicar; lo que no se puede es publicarlo así.',
    )
    this.name = 'InmuebleNoPublicable'
    this.falta = falta
  }
}

/**
 * PUERTA ÚNICA. Solo mira la transición a `available`: los demás estados no
 * salen al catálogo, así que no hay nada que exigirles.
 *
 * ⚠ Campo declarado y no *parameter property*: Node no las soporta en modo
 * strip-only, y estos módulos hoja tienen que poder correr con `node` directo.
 * Es lo que permite que el arnés ejercite el código real y no una copia.
 */
export function exigirPublicable(estado: string | null | undefined, p: InmuebleParaPublicar): void {
  if (estado !== 'available') return
  const falta = faltaParaPublicar(p)
  if (falta.length) throw new InmuebleNoPublicable(falta)
}
