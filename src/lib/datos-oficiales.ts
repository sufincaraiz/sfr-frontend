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
  /** PROVISIONAL — venía de StatsSection.tsx. Sin fuente documentada. */
  aniosOperacion: 10,

  /** PROVISIONAL — derivado de aniosOperacion (2026 − 10). Confirmar el año real. */
  anioFundacion: 2016,

  /** TODO: requiere dato de Leonel. No existía en el sitio; no se inventa. */
  propiedadesGestionadas: null as number | null,

  /** TODO: requiere dato de Leonel. No existía en el sitio; no se inventa. */
  operacionesCerradas: null as number | null,

  // ── Cobertura ──────────────────────────────────────────────────────────────
  // Los DOCE municipios de la Provincia del Gualivá. NO es provisional ni sale de
  // la base de datos: es una constante geográfica y la cobertura que la empresa
  // declara poder atender. Ver doctrina §1.1.
  //
  // Las otras dos cifras de cobertura (municipios con página, municipios con
  // inventario) son DERIVADAS y se calculan en tiempo de ejecución; no viven
  // aquí porque cambian solas. El texto público de cobertura usa siempre esta.
  municipiosProvincia: 12,

  /** PROVISIONAL — venía de StatsSection.tsx. Sin fuente documentada. */
  familiasAtendidas: 150,

  // ── Satisfacción: RETIRADA del sitio ───────────────────────────────────────
  // Había un «98 % de clientes que nos recomiendan» escrito a mano, sin encuesta
  // ni metodología detrás. Se retiró por dos razones que apuntan al mismo sitio:
  //
  //   • Es una afirmación publicitaria cuantitativa sin soporte verificable
  //     (Ley 1480 de 2011, Estatuto del Consumidor).
  //   • Un modelo generativo que no encuentra corroboración de una cifra baja la
  //     confianza en TODAS las demás cifras del sitio. Una métrica inventada
  //     cuesta más de lo que aporta.
  //
  // El reemplazo natural, cuando exista, es la calificación real y el número de
  // reseñas de Google Business Profile: dato de tercero, verificable y con
  // metodología pública. Ahí sí se puede publicar, y además marcar como
  // AggregateRating en el JSON-LD.
  /** TODO: calificación media de Google Business Profile (ej. 4.8). */
  googleRating: null as number | null,
  /** TODO: número de reseñas en Google Business Profile. */
  googleReviewCount: null as number | null,

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
