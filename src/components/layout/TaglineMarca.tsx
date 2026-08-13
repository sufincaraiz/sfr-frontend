// ─────────────────────────────────────────────────────────────────────────────
// <TaglineMarca> — la frase de marca, visual y solo visual.
//
// DÓNDE VA Y POR QUÉ AHÍ. En el hero, bajo el h1, y SIEMPRE DESPUÉS de
// <RespuestaDirecta> en el orden del documento. Nunca entre el h1 y la
// respuesta: la doctrina §3.2 exige que la respuesta directa sea el primer
// párrafo, y un modelo extrae por orden de aparición, no por tamaño de fuente.
// Si el tagline la precediera, lo primero que se llevaría un motor generativo
// sería prosa de marca en el lugar del párrafo citable. Si alguna vez hace
// falta subirlo visualmente, se resuelve con CSS —order, grid-row— sin tocar
// el orden del DOM.
//
// El header quedó descartado como ubicación: mide 72 px con un logo de 56, no
// caben dos líneas debajo, y sobre todo es mobiliario de navegación —lo que se
// pone ahí no se lee. Aquí sí, porque es donde mira quien acaba de aterrizar,
// y es la única opción que funciona en móvil, que es de donde llega la mayor
// parte del tráfico inmobiliario.
//
// ES UN <p>, NO UN ENCABEZADO. No debe competir en la jerarquía de la página
// ni aparecer en un esquema de contenidos. Tipografía secundaria y menor que
// el h1 y que la respuesta directa, para que ningún extractor la confunda con
// contenido sustantivo.
//
// FUERA DEL MARCADO. No va en el JSON-LD, ni en llms.txt, ni en ningún
// metadato, ni en una respuesta directa. El slogan de la entidad —«Inmobiliaria
// impulsada por inteligencia artificial en La Vega y el Gualivá»— es otra cosa
// y sí vive en el JSON-LD. Este texto es marca; aquel es identidad.
//
// Solo en portada y /nosotros, por decisión del titular. No en todas las vistas.
// ─────────────────────────────────────────────────────────────────────────────

/** Texto único. Vive aquí y no en cada página: dos copias pueden divergir. */
const TAGLINE =
  'Tecnología, información y acompañamiento humano para tomar mejores ' +
  'decisiones inmobiliarias.'

export function TaglineMarca() {
  return (
    <p
      style={{
        margin:     '0 0 0.5rem',
        color:      '#64748B',
        fontSize:   '0.88rem',
        fontWeight: 400,
        lineHeight: 1.6,
        letterSpacing: '0.01em',
      }}
    >
      {TAGLINE}
    </p>
  )
}
