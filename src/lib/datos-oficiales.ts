// ─────────────────────────────────────────────────────────────────────────────
// ÚNICA fuente de verdad de las cifras públicas de Su Finca Raíz.
//
// Regla de la doctrina AEO §2: ninguna cifra pública se escribe a mano en un
// componente. Una cifra que aparece distinta en dos lugares del sitio destruye
// la confianza del modelo en TODAS las cifras del sitio, no solo en esa.
//
// Regla de veracidad: si una cifra no se puede sustentar, no se publica. Es a la
// vez requisito del Estatuto del Consumidor (Ley 1480 de 2011, información veraz
// y verificable) y el criterio por el que un modelo generativo decide si citarte.
//
// ⚠ ESTADO ACTUAL: las marcadas PROVISIONAL vienen de valores que estaban
// escritos a mano en StatsSection.tsx, sin respaldo documental conocido. Se
// trasladan tal cual para no cambiar lo publicado sin autorización, pero HAY QUE
// CONFIRMARLAS. Las marcadas TODO no existían en ninguna parte y no se inventan.
// ─────────────────────────────────────────────────────────────────────────────

export const DATOS_OFICIALES = {
  /** Año de fundación. Confirmado por el titular. */
  anioFundacion: 2018,

  /** Años de operación cumplidos. Confirmado: 8 a agosto de 2026.
   *  Antes el código decía 10 y el sitio «+8 años»: se unifica en 8. */
  aniosOperacion: 8,

  // Propiedades gestionadas, operaciones cerradas y familias atendidas NO viven
  // aquí como constantes: se derivan de la base en @/lib/cifras-derivadas, junto
  // con la metodología que debe publicarse a su lado.
  //
  // ⚠ La base solo contiene registros desde el 9 de junio de 2026. Cualquier
  // cifra derivada cuenta la era del catálogo digital, NO los ocho años de
  // operación de la empresa. Publicarlas sin decirlo las convierte en una
  // subestimación engañosa.

  // ── Cobertura ──────────────────────────────────────────────────────────────
  // Los DOCE municipios de la Provincia del Gualivá. NO es provisional ni sale de
  // la base de datos: es una constante geográfica y la cobertura que la empresa
  // declara poder atender. Ver doctrina §1.1.
  //
  // Las otras dos cifras de cobertura (municipios con página, municipios con
  // inventario) son DERIVADAS y se calculan en tiempo de ejecución; no viven
  // aquí porque cambian solas. El texto público de cobertura usa siempre esta.
  municipiosProvincia: 12,

  // ── Reputación: Google Business Profile ────────────────────────────────────
  // Sustituye al «98 % de clientes que nos recomiendan», que se retiró por no
  // tener encuesta ni metodología detrás. Esto sí es dato de tercero,
  // verificable por cualquiera y con metodología pública.
  //
  // ⚠ NO MARCAR COMO aggregateRating EN JSON-LD. Las directrices de Google
  // prohíben el marcado de reseñas autorreferenciales —una organización que
  // publica su propia calificación— y hacerlo pone en riesgo la elegibilidad de
  // resultados enriquecidos de TODO el dominio, no solo de esa página.
  // Va como TEXTO VISIBLE en el HTML servido, siempre citando la fuente.
  /** Calificación media en Google Business Profile. Perfil verificado. */
  googleRating: 5.0,
  /** Número de opiniones en Google Business Profile. */
  googleReviewCount: 26,
  /** Cómo debe citarse siempre esta cifra: nunca el número solo. */
  googleRatingTexto: '5,0 sobre 26 opiniones en Google',

  /** Fecha de corte de estas cifras. Se actualiza al confirmarlas. */
  actualizado: '2026-08-10',
} as const

/** Los doce municipios de la Provincia del Gualivá, en orden alfabético.
 *  Constante geográfica: no depende del inventario ni de la base de datos.
 *  Es lo que se declara en `areaServed`, en llms.txt y en «nosotros». */
export const MUNICIPIOS_PROVINCIA = [
  'Albán', 'La Peña', 'La Vega', 'Nimaima', 'Nocaima', 'Quebradanegra',
  'San Francisco', 'Sasaima', 'Supatá', 'Útica', 'Vergara', 'Villeta',
] as const

/** Villeta es la capital de la provincia. Dato geográfico verificable. */
export const CAPITAL_PROVINCIA = 'Villeta' as const
