/**
 * DISTANCIA Y TIEMPO A BOGOTÁ — qué está medido y qué es estimación heredada
 * ==========================================================================
 *
 * EL PROBLEMA DE ORIGEN. Los campos `distancia_bogota_km`, `tiempo_bogota_min`,
 * `altitud_msnm` y `temp_min/max` de los ocho municipios NO se midieron: salen
 * de `src/lib/municipios-data.ts`, un archivo escrito a mano que se borró como
 * código muerto el 11/08/2026. Se comprobó recuperándolo del historial: siete
 * de los ocho conservan exactamente sus valores originales.
 *
 * Y se publicaban en `<DatosVerificables>` con «Fuente: Su Finca Raíz» y fecha
 * de corte, es decir **con el formato de un dato medido**. Es el caso 2 de §2
 * publicado como si fuera caso 1, en el bloque que existe precisamente para ser
 * citable. Peor que cualquier adjetivo retirado: declara una procedencia falsa.
 *
 * ---------------------------------------------------------------------------
 * DOS FUENTES QUE COINCIDEN NO SE VERIFICAN ENTRE SÍ
 *
 * Seis de los ocho tienen el km del texto igual al del campo. Eso NO es
 * verificación: campo y descripción salieron de la misma línea del mismo
 * archivo. La Vega discrepaba solo porque alguien editó el campo y no el texto.
 *
 * ---------------------------------------------------------------------------
 * CÓMO SE SALE DE AQUÍ
 *
 * Midiendo, y declarando el método junto al dato. Un municipio entra en
 * `MEDICIONES` el día que se mide; hasta entonces su fila se publica como
 * aproximada, sin fecha de corte que sugiera medición.
 */

export interface MedicionDistancia {
  km: number
  min: number
  /** El punto de partida importa: medir desde el centro da una cifra que nadie recorre. */
  origen: string
  destino: string
  ruta: string
  fuente: string
  /** ISO. Es la fecha de la medición, no la del despliegue. */
  fecha: string
  modo: string
}

/**
 * Municipios MEDIDOS. Los demás siguen con la estimación heredada.
 *
 * La Vega se midió el 19/08/2026 y el resultado descartó las dos cifras que
 * habían convivido: ni 74/90 del archivo original ni 62/60 de la edición sin
 * rastro. El tiempo real —74 min— es MAYOR que el que publicábamos.
 */
export const MEDICIONES: Record<string, MedicionDistancia> = {
  'la-vega': {
    km: 60,
    min: 74,
    origen:  'Portal 80, Bogotá',
    destino: 'La Vega, Cundinamarca (casco urbano)',
    ruta:    'Santafé de Bogotá (Puente el Cortijo) – Siberia – La Punta – El Vino – La Vega',
    fuente:  'Google Maps',
    fecha:   '2026-08-19',
    modo:    'en automóvil, con peajes',
  },
}

export function medicionDe(slug: string): MedicionDistancia | null {
  return MEDICIONES[slug] ?? null
}

/** «1 h 14 min» · «46 min». Sin «1 h 0 min» cuando los minutos son exactos. */
export function enHorasYMinutos(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/** Procedencia, ya redactada, para el pie del bloque de datos. */
export function procedenciaDistancia(slug: string): string {
  const m = medicionDe(slug)
  return m
    ? `Distancia y tiempo medidos en ${m.fuente} el ${m.fecha}, ${m.modo}, desde ${m.origen} hasta ${m.destino}. Ruta: ${m.ruta}. ` +
      `Medido hasta el casco urbano, no hasta un predio o vereda concretos, que suman tiempo por vía interna. ` +
      `Es una lectura de un día: varía con el tráfico y suele ser mayor los fines de semana.`
    : 'Distancia y tiempo aproximados por carretera desde Bogotá, sujetos a ruta y tráfico. Pendientes de medición.'
}

/**
 * Nota por fila para los datos geográficos NO medidos.
 *
 * Altitud y temperatura vienen del mismo archivo borrado, así que el reencuadre
 * abarca el bloque entero y no solo las dos filas de distancia.
 */
export const NOTA_GEOGRAFICA_APROXIMADA = 'Dato geográfico aproximado, pendiente de verificación'
