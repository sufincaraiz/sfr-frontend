/**
 * AUDITORÍA DE SLUGS Y METADATOS — solo lectura
 * =============================================
 * 1. Slugs con el tipo duplicado (apartamento-apartamento-…) y con prefijo de
 *    tipo que no coincide con el tipo real (los 13 legacy).
 * 4. meta_title y meta_description contra la lista de prohibido.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const props = await prisma.property.findMany({
  select: { slug: true, title: true, type: true, meta_title: true, meta_description: true },
  orderBy: { slug: 'asc' },
})

// ── 1. Slugs ────────────────────────────────────────────────────────────────
// El slug se genera `${tipo}-${slugify(title)}-${muni}-cundinamarca`. Si el
// título empieza por el tipo, el prefijo se duplica.
console.log('══ 1 · SLUGS ══════════════════════════════════════════════════════')
const TIPOS = ['apartamento', 'casa', 'finca', 'lote', 'condominio', 'local']
let duplicados = [], malPrefijo = []
for (const p of props) {
  const seg = p.slug.split('-')
  // ¿el primer segmento (tipo del slug) se repite en el segundo?
  if (seg[0] && seg[1] && seg[0] === seg[1]) duplicados.push(p)
  // ¿el prefijo del slug coincide con el tipo REAL de la ficha?
  // El slug de condominio arranca por "condominio" pero el type es casa/lote/finca.
  const prefijo = seg[0]
  const tipoReal = p.type
  if (prefijo && TIPOS.includes(prefijo) && prefijo !== tipoReal && !(prefijo === 'condominio')) {
    malPrefijo.push({ ...p, prefijo })
  }
}
console.log(`\nTIPO DUPLICADO EN EL SLUG (${duplicados.length}):`)
duplicados.forEach(p => console.log(`  · ${p.slug}`))
console.log(`\nPREFIJO ≠ TIPO REAL (${malPrefijo.length}):`)
malPrefijo.forEach(p => console.log(`  · [slug dice ${p.prefijo}, es ${p.type}] ${p.slug}`))
// Aparte: los slugs que arrancan por "condominio" (régimen, no tipo)
const conCondo = props.filter(p => p.slug.startsWith('condominio-'))
console.log(`\nARRANCAN POR «condominio» (régimen, no tipo — ${conCondo.length}):`)
conCondo.forEach(p => console.log(`  · [es ${p.type}] ${p.slug}`))

// ── 4. Metadatos ─────────────────────────────────────────────────────────────
console.log('\n\n══ 4 · META_TITLE y META_DESCRIPTION vs PROHIBIDO ══════════════════')
const REGLAS = [
  { clase: 'valorización/rentabilidad', re: /\b(valoriz|revaloriz|plusval|rentab|proyecci[oó]n|potencial|inversi[oó]n segura|aval[uú]o)\b/i },
  { clase: 'superlativo/ranking',        re: /\b(espectacular|exclusiv\w+|inigualable|el mejor|la mejor|los mejores|[uú]nico|imperdible|privilegiad\w+|inmejorable|magn[ií]fic\w+|de lujo|premium|estrat[eé]gic\w+)\b/i },
  { clase: 'distancia sin medir',        re: /\b(a (solo|s[oó]lo )?\d+\s*(min|minutos|km|kil[oó]metros|hora))\b/i },
  { clase: 'gratuidad/alcance',          re: /\b(gratis|gratuit\w+|incluid\w+|sin costo|garantizad\w+|todas nuestras|cada inmueble)\b/i },
]
let incumplen = 0
for (const p of props) {
  const hits = []
  for (const campo of ['meta_title', 'meta_description'] as const) {
    const txt = p[campo]
    if (!txt) continue
    for (const r of REGLAS) { const m = txt.match(r.re); if (m) hits.push(`[${campo} · ${r.clase}] «${m[0]}»`) }
  }
  if (hits.length) { incumplen++; console.log(`\n  ⚠ ${p.slug}`); hits.forEach(h => console.log(`      ${h}`)); 
    if (p.meta_title) console.log(`      meta_title: ${p.meta_title}`) }
}
console.log(`\n${incumplen} fichas con metadatos que incumplen`)
await prisma.$disconnect()
