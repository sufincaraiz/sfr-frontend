#!/usr/bin/env node
/**
 * AUDITOR DE 404 — lo que el sitio le declara a Google.
 * =====================================================
 * NO es el drilldown de GSC (esos 404 los conoce solo Search Console: URLs que
 * Google descubrió por enlaces externos o del WordPress viejo, y que no están
 * en nuestro sitemap). Esto audita lo que SÍ controlamos:
 *
 *   1. SITEMAP LIMPIO: cada <loc> de cada sitemap debe responder 200. Un 404 o
 *      un redirect dentro del sitemap es una contradicción que Google penaliza:
 *      le decimos "indexa esto" y no existe.
 *   2. REDIRECTS LEGACY: los patrones del WordPress viejo deben responder 301,
 *      no 404. Se prueban muestras conocidas.
 *
 * Corre contra producción. Solo lectura.
 */
const SITE = 'https://www.sufincaraiz.com'

const locs = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim())

async function fetchTexto(url) {
  const r = await fetch(url, { redirect: 'manual' })
  const t = await r.text().catch(() => '')
  return { status: r.status, location: r.headers.get('location'), body: t }
}

// ── 1. Sitemaps ──────────────────────────────────────────────────────────────
const indice = await fetchTexto(`${SITE}/sitemap.xml`)
let sitemaps = locs(indice.body).filter(u => u.includes('sitemap'))
if (sitemaps.length === 0) {
  sitemaps = ['sitemap-propiedades.xml', 'sitemap-municipios.xml', 'sitemap-paginas.xml'].map(s => `${SITE}/${s}`)
}
console.log(`Sitemaps: ${sitemaps.length}`)

const urls = new Set()
for (const sm of sitemaps) {
  const r = await fetchTexto(sm)
  const us = locs(r.body)
  console.log(`  ${sm.replace(SITE, '')}  →  ${us.length} URLs`)
  us.forEach(u => urls.add(u))
}
console.log(`\nTotal URLs en sitemaps: ${urls.size}. Verificando cada una…\n`)

const malos = []
let ok = 0
for (const u of urls) {
  try {
    const r = await fetch(u, { redirect: 'manual' })
    if (r.status === 200) ok++
    else malos.push([u, r.status, r.headers.get('location') ?? ''])
  } catch (e) {
    malos.push([u, 'ERR', String(e).split('\n')[0]])
  }
}
console.log(`SITEMAP: ${ok}/${urls.size} responden 200.`)
if (malos.length) {
  console.log(`\n  ✗ NO 200 EN EL SITEMAP (${malos.length}) — contradicción con Google:`)
  for (const [u, s, l] of malos) console.log(`      [${s}] ${u.replace(SITE, '')}${l ? `  → ${l}` : ''}`)
} else {
  console.log('  → limpio: nada muerto en lo que le declaramos a Google.')
}

// ── 2. Destinos de los redirects de departamento ─────────────────────────────
console.log(`\n${'─'.repeat(60)}\nDESTINOS (deben ser 200 con inventario):`)
for (const d of ['/propiedades/finca', '/propiedades/lote', '/propiedades/casa', '/propiedades/en-condominio']) {
  const r = await fetch(`${SITE}${d}`, { redirect: 'manual' })
  console.log(`   [${r.status}] ${d}`)
}

// ── 3. Legacy: 4 tipos × 12 municipios del Gualivá ───────────────────────────
// prefijo legacy por tipo. «condominios-campestres» NO lleva «-en-venta».
const PREFIJOS = [
  ['fincas-en-venta', 'finca'],
  ['lotes-en-venta', 'lote'],
  ['casas-campestres-en-venta', 'casa'],
  ['condominios-campestres', 'condominio'],
]
const MUNI12 = ['alban', 'la-pena', 'la-vega', 'nimaima', 'nocaima', 'quebradanegra',
  'san-francisco', 'sasaima', 'supata', 'utica', 'vergara', 'villeta']

const redirige = s => s === 301 || s === 308
const cuatroCientoCuatro = []
console.log(`\n${'─'.repeat(60)}\nLEGACY tipo×municipio (4×12) — reportar los 404:`)
for (const [prefijo] of PREFIJOS) {
  const linea = []
  for (const m of MUNI12) {
    const url = `/${prefijo}-${m}-cundinamarca`
    const r = await fetch(`${SITE}${url}`, { redirect: 'manual' })
    if (redirige(r.status)) linea.push(`${m}✓`)
    else { linea.push(`${m}✗${r.status}`); cuatroCientoCuatro.push(url) }
  }
  console.log(`   ${prefijo}:`)
  console.log(`      ${linea.join('  ')}`)
}

// Formas de departamento (sin municipio) — recién añadidas al next.config.
console.log(`\nDEPARTAMENTO (sin municipio) — deben ser 308 tras el deploy:`)
for (const p of ['/fincas-en-venta-cundinamarca', '/lotes-en-venta-cundinamarca',
  '/casas-campestres-en-venta-cundinamarca', '/condominios-campestres-cundinamarca']) {
  const r = await fetch(`${SITE}${p}`, { redirect: 'manual' })
  console.log(`   ${redirige(r.status) ? '✓' : '✗'} [${r.status}] ${p}${r.headers.get('location') ? ` → ${r.headers.get('location')}` : ''}`)
}

console.log(`\n${'═'.repeat(60)}`)
console.log(`404 en variantes tipo×municipio: ${cuatroCientoCuatro.length}`)
for (const u of cuatroCientoCuatro) console.log(`   ✗ ${u}`)
console.log()
