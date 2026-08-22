/**
 * BÚSQUEDA POR TÉRMINOS — lógica pura, sin base de datos
 * ======================================================
 *
 * Vive en su propio módulo para que `scripts/probar-busqueda.ts` ejercite
 * ESTA función y no una copia. El proyecto ya perdió dos veces por tener la
 * misma decisión escrita dos veces (TIPO_LINKS, la condición de municipio
 * publicable): una copia en el test que nadie sincroniza es un test que
 * aprueba mientras producción falla.
 *
 * NO IMPORTA NADA. Es deliberado: `node scripts/probar-busqueda.ts` lo carga
 * directamente, y un solo `import` de `@/…` lo rompería, porque Node no
 * resuelve los alias de TypeScript.
 */

/** minúsculas, sin tildes, sin espacios sobrantes */
export function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
// ─── Términos de la búsqueda libre ────────────────────────────────────────────
// El filtro libre hacía `contains` con la FRASE COMPLETA. Medido contra
// producción: «La Ceibita» devolvía 1 y «Finca La Ceibita en Guacamayas»
// devolvía 0, con la propiedad publicada. Y como los criterios se relajan en
// cascada, el texto se descartaba y Mac recibía OTRAS propiedades: le dijo a un
// cliente que un inmueble del catálogo no existía y que «podría estar en
// camino». Misma clase de fallo que «¿tienen condominios?» —cero resultados
// habiendo doce—, con el agravante de que aquí se pierde el lead.
//
// Ahora la consulta se parte en términos y se exigen TODOS, cada uno pudiendo
// caer en cualquier campo. Se descartan conectores y palabras de TIPO: «finca»,
// «casa» o «lote» ya viajan en `input.tipo`, y dentro del texto solo sirven
// para no encontrar nada, porque ninguna ficha se llama «finca» a secas.

/** Sinónimos del cliente → tipos reales de la BD (Property.type). */
const LOTES = ['lote', 'lote-urbano', 'lote-campestre', 'lote-rural']

export const TIPO_SINONIMOS: Record<string, string[]> = {
  finca: ['finca'], fincas: ['finca'], hacienda: ['finca'], parcela: ['finca'],
  campo: ['finca'], 'finca de recreo': ['finca'], quinta: ['finca'],
  // "lote" a secas abarca los subtipos: el catálogo los separa (lote urbano /
  // campestre / rural), pero el cliente casi nunca los distingue al preguntar.
  lote: LOTES, lotes: LOTES,
  terreno: LOTES, terrenos: LOTES,
  predio: LOTES, tierra: LOTES,
  'lote urbano': ['lote-urbano', 'lote'],
  'lote campestre': ['lote-campestre', 'lote'],
  'lote rural': ['lote-rural', 'lote'],
  casa: ['casa'], casas: ['casa'],
  vivienda: ['casa', 'apartamento'],
  'casa campestre': ['casa', 'finca'],
  chalet: ['casa'],
  cabana: ['casa', 'finca'], cabanas: ['casa', 'finca'],
  apartamento: ['apartamento'], apartamentos: ['apartamento'],
  apto: ['apartamento'], apartaestudio: ['apartamento'],
  // condominio/conjunto se interceptan antes: van por en_condominio, no por type.
  local: ['local'], locales: ['local'],
}

/** Devuelve los tipos de BD que corresponden a lo que dijo el cliente (null = no reconocido). */
export function tiposDesde(entrada: string): string[] | null {
  const n = norm(entrada)
  if (TIPO_SINONIMOS[n]) return TIPO_SINONIMOS[n]
  // Coincidencia parcial: "lote campestre en La Vega", "casa en condominio"…
  // Se prueba de la clave más larga a la más corta, para que "lote campestre"
  // gane sobre "lote" y "casa campestre" sobre "casa".
  const hit = Object.keys(TIPO_SINONIMOS)
    .sort((a, b) => b.length - a.length)
    .find(k => n.includes(k))
  return hit ? TIPO_SINONIMOS[hit]! : null
}

export const CONECTORES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'de', 'en', 'con', 'para', 'por', 'sin', 'sobre', 'entre', 'hasta', 'desde',
  'y', 'o', 'u', 'que', 'se', 'su', 'sus', 'mi', 'mis', 'tu', 'tus',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'me', 'te', 'les', 'busco', 'quiero', 'interesa', 'tienen', 'tiene', 'hay',
  'ver', 'cerca', 'zona', 'sector', 'vereda', 'municipio', 'proyecto',
])

/** Palabras que describen el TIPO: viajan en `input.tipo`, no en el texto. */
export const PALABRAS_TIPO = new Set([
  ...Object.keys(TIPO_SINONIMOS).flatMap(k => k.split(' ')),
  'condominio', 'condominios', 'conjunto', 'conjuntos', 'cerrado', 'cerrados',
  'campestre', 'campestres', 'urbano', 'urbana', 'rural', 'rurales',
  'inmueble', 'inmuebles', 'propiedad', 'propiedades',
])

/**
 * Parte una consulta en términos buscables. Devuelve [] si no queda ninguno
 * —«una finca», «casas»— y entonces NO se filtra por texto: el tipo ya lo hace.
 */
export function terminos(consulta: string): string[] {
  return norm(consulta)
    .split(/[^a-z0-9ñ]+/)
    .filter(t => t.length >= 3 && !CONECTORES.has(t) && !PALABRAS_TIPO.has(t))
}

export interface Puntuable {
  title?: string | null
  short_description?: string | null
  description?: string | null
  municipality?: { name: string } | null
  vereda?: { name: string } | null
}

/**
 * ¿Aparece el término al PRINCIPIO de alguna palabra del texto? Ambos vienen ya
 * normalizados. Se exige inicio de palabra porque el `contains` a secas hacía
 * que «top» encontrara «topografía»: con 36 fichas, un término corto dentro de
 * otra palabra basta para enterrar el resultado bueno.
 */
export function contieneTermino(textoNorm: string, t: string): boolean {
  return new RegExp(`(^|[^a-z0-9ñ])${t}`).test(textoNorm)
}

/** Los cuatro campos de una ficha contra los que se busca, ya normalizados. */
function camposDe(p: Puntuable) {
  return {
    titulo: norm(p.title ?? ''),
    vrd:    norm(p.vereda?.name ?? ''),
    muni:   norm(p.municipality?.name ?? ''),
    cuerpo: norm(`${p.short_description ?? ''} ${p.description ?? ''}`),
  }
}

/**
 * El filtro de texto vive en JS, no en Prisma. `contains` de Postgres no ignora
 * tildes: «alban» NO encuentra «Albán», y el cliente escribe sin tildes la mitad
 * de las veces. Con un catálogo de decenas de fichas, normalizar los dos lados
 * en memoria es exacto y barato; en la base habría que instalar `unaccent`.
 */
export function coincideTexto(p: Puntuable, terms: string[]): boolean {
  const c = camposDe(p)
  return terms.every(t =>
    contieneTermino(c.titulo, t) || contieneTermino(c.vrd, t) ||
    contieneTermino(c.muni, t)   || contieneTermino(c.cuerpo, t))
}

/**
 * Puntúa una ficha contra los términos buscados. El título y el nombre propio
 * de la zona pesan más que el cuerpo: quien escribe «Ceibita» busca ESA finca,
 * no las que la mencionan de pasada.
 */
export function puntuar(p: Puntuable, terms: string[]): number {
  const c = camposDe(p)
  let n = 0
  for (const t of terms) {
    if (contieneTermino(c.titulo, t)) n += 5
    if (contieneTermino(c.vrd, t))    n += 3
    if (contieneTermino(c.muni, t))   n += 2
    if (contieneTermino(c.cuerpo, t)) n += 1
  }
  return n
}
