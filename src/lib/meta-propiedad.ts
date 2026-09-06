/**
 * META DESCRIPTION DERIVADA DE UNA PROPIEDAD — fuente única
 * =========================================================
 *
 * Módulo hoja (sin imports de `@/…`) para que lo usen a la vez:
 *   · el runtime de Next (fallback de generateMetadata en la ficha, y las
 *     fichas nuevas que nacen sin meta escrita a mano),
 *   · el script Node que regeneró las metas heredadas del WordPress.
 *
 * UNA SOLA fuente: si mañana cambia el formato, cambia aquí y lo heredan las
 * fichas viejas (al re-correr el script) y las nuevas (por el fallback). Sin
 * esto, una ficha nueva volvería a nacer con el patrón viejo.
 *
 * REGLA (doctrina §2, meta_description): solo ATRIBUTOS ESTABLES —tipo, área,
 * habitaciones, baños, ubicación—. NUNCA precio, estado, conteos ni distancias
 * sin medir: eso cambia y la meta no se revisa cuando cambia.
 */

export interface DatosMetaPropiedad {
  /** Slug del tipo: 'casa' | 'finca' | 'lote' | 'apartamento' | … Decide qué área es el titular. */
  tipo: string
  /** Etiqueta del tipo ya resuelta: «Casa», «Finca», «Lote», «Apartamento»… */
  tipoLabel: string
  areaConstruida?: number | null
  areaLote?: number | null
  habitaciones?: number | null
  banos?: number | null
  municipio: string
}

/** «3.708» / «267,7» — separador de miles y coma decimal, es-CO. */
function m2(n: number): string {
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2 })
}

export function metaDescripcionPropiedad(d: DatosMetaPropiedad): string {
  const con = d.areaConstruida && d.areaConstruida > 0 ? d.areaConstruida : null
  const lot = d.areaLote && d.areaLote > 0 ? d.areaLote : null

  // Qué área es el titular depende del tipo: en tierra (finca/lote) manda el
  // LOTE; en vivienda (casa/apto) manda lo construido. Una «Finca de 200 m²»
  // —usando la construcción sobre 22 ha de terreno— es engañosa.
  let areaTxt = ''
  if (d.tipo === 'lote') {
    if (lot) areaTxt = ` de ${m2(lot)} m²`
  } else if (d.tipo === 'finca') {
    if (lot) areaTxt = ` de ${m2(lot)} m² de terreno`
    else if (con) areaTxt = ` de ${m2(con)} m²`
  } else {
    if (con) areaTxt = ` de ${m2(con)} m²`
    else if (lot) areaTxt = ` de ${m2(lot)} m² de terreno`
  }

  const attrs: string[] = []
  if (d.tipo !== 'lote') {
    if (d.habitaciones && d.habitaciones > 0) attrs.push(`${d.habitaciones} ${d.habitaciones === 1 ? 'habitación' : 'habitaciones'}`)
    if (d.banos && d.banos > 0) attrs.push(`${d.banos} ${d.banos === 1 ? 'baño' : 'baños'}`)
  }

  let s = d.tipoLabel + areaTxt
  if (attrs.length) s += (areaTxt ? ', ' : ' con ') + attrs.join(' y ')
  s += ` en ${d.municipio}, Cundinamarca.`
  return s
}
