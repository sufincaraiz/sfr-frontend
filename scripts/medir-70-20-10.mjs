#!/usr/bin/env node
/**
 * MEDICIÓN 70/20/10 — caracteres de texto publicado por cubo.
 * ===========================================================
 * Cubos (definición del titular):
 *   INFORMACIÓN (meta 70%): municipios, veredas, guía de inversión, glosario,
 *     FAQ, blog, datos de mercado con procedencia. Contenido que sirve aunque
 *     no compres nada aquí.
 *   INVENTARIO  (meta 20%): descripciones de propiedad, catálogo.
 *   MARCA       (meta 10%): nosotros, mac, hero, servicios, propuesta.
 *
 * Se cuentan CARACTERES de texto visible. No cuenta código, marcado, nav ni
 * llms.txt. Página mixta: por el sujeto de cada bloque.
 *
 * Qué es exacto y qué no:
 *  - INVENTARIO (BD), municipios (BD), artículos (BD), blog MDX, glosario:
 *    EXACTO (texto real almacenado).
 *  - FAQs generadas por municipio/vereda: NO se cuentan (se generan en runtime
 *    desde plantillas). Son INFORMACIÓN adicional no contada -> el % de
 *    inventario que sale es un TECHO; el real es menor.
 *  - Prosa estática de páginas de marca (nosotros/mac/servicios): se estima
 *    aparte leyendo los archivos; va como nota, no en el total exacto.
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
const prisma = new PrismaClient()

const L = s => (s ?? '').length
const fmt = n => n.toLocaleString('es-CO')

// ── INVENTARIO (BD) ──────────────────────────────────────────────────────────
const props = await prisma.property.findMany({
  select: { description: true, short_description: true },
})
let inventario = 0
for (const p of props) inventario += L(p.description) + L(p.short_description)

// ── INFORMACIÓN (BD): municipios ─────────────────────────────────────────────
const munis = await prisma.municipality.findMany({
  select: { oculto: true, descripcion_seo: true, historia: true, clima: true, turismo: true, antes_de_comprar: true, faqs: true },
})
let infoMunicipios = 0
let infoFaqsDB = 0
for (const m of munis) {
  infoMunicipios += L(m.descripcion_seo) + L(m.historia) + L(m.clima) + L(m.turismo) + L(m.antes_de_comprar)
  // faqs es Json [{question, answer}] almacenado por municipio.
  if (Array.isArray(m.faqs)) for (const f of m.faqs) infoFaqsDB += L(f?.question) + L(f?.answer)
}
// FAQ GENERADAS en runtime (faq-municipios.ts): 1 por municipio con página,
// ~510 car. (pregunta + respuesta con datos reales). Estimación, no exacto.
const muniPublicados = munis.filter(m => !m.oculto && m.descripcion_seo).length
const infoFaqsGen = muniPublicados * 510

// ── INFORMACIÓN (BD): artículos de blog ──────────────────────────────────────
const arts = await prisma.article.findMany({ select: { content: true, excerpt: true } })
let infoArticulos = 0
for (const a of arts) infoArticulos += L(a.content) + L(a.excerpt)

// ── INFORMACIÓN (archivos): blog MDX ─────────────────────────────────────────
let infoMdx = 0
const mdxDir = 'content/blog'
if (existsSync(mdxDir)) {
  for (const f of readdirSync(mdxDir).filter(x => x.endsWith('.mdx'))) {
    const raw = readFileSync(`${mdxDir}/${f}`, 'utf8')
    // quita el frontmatter (--- ... ---) del inicio
    const body = raw.replace(/^---[\s\S]*?---\n/, '')
    infoMdx += body.length
  }
}

// ── INFORMACIÓN (archivo): glosario ──────────────────────────────────────────
// Cuenta solo el texto dentro de comillas/backticks (el contenido real), no el
// código que lo rodea.
function textoEnLiterales(ruta) {
  if (!existsSync(ruta)) return 0
  const src = readFileSync(ruta, 'utf8')
  let total = 0
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
  let m
  while ((m = re.exec(src))) {
    const s = m[1] ?? m[2] ?? m[3] ?? ''
    // ignora literales que son claramente claves/enums cortas o rutas
    if (s.length >= 12 && /\s/.test(s)) total += s.length
  }
  return total
}
const infoGlosario = textoEnLiterales('src/lib/glosario-data.ts')
const infoVeredas  = textoEnLiterales('src/lib/veredas-data.ts')

// MARCA sobre el HTML SERVIDO, no parseando JSX: el texto de /nosotros y /mac
// vive como nodos de texto entre etiquetas, que el parseo de literales no ve.
// Se toma el <main> (el contenido de la página, sin nav/header/footer) y se
// cuentan sus caracteres visibles. Es más fiable, aunque incluye títulos y
// etiquetas renderizadas —que también son texto publicado de marca—.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sufincaraiz.com'
async function textoServido(ruta) {
  try {
    const r = await fetch(SITE + ruta)
    let html = await r.text()
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    const main = html.match(/<main[\s\S]*?<\/main>/i)
    let cuerpo = main ? main[0] : html
      .replace(/<nav[\s\S]*?<\/nav>/gi, '').replace(/<header[\s\S]*?<\/header>/gi, '').replace(/<footer[\s\S]*?<\/footer>/gi, '')
    const texto = cuerpo.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
    return texto.length
  } catch (e) {
    console.warn(`  [marca] no se pudo leer ${ruta}: ${e instanceof Error ? e.message : e}`)
    return 0
  }
}
const marcaRutas = ['/nosotros', '/mac', '/servicios/dron-y-fotogrametria']
let marca = 0
const marcaDetalle = []
for (const ruta of marcaRutas) {
  const n = await textoServido(ruta)
  marcaDetalle.push([ruta, n])
  marca += n
}

const infoTotal = infoMunicipios + infoArticulos + infoMdx + infoGlosario + infoVeredas + infoFaqsDB + infoFaqsGen
const total = inventario + infoTotal + marca
const pc = n => `${(100 * n / total).toFixed(1)} %`

console.log(`\n${'='.repeat(64)}`)
console.log(`INFORMACIÓN  ${fmt(infoTotal).padStart(9)}   ${pc(infoTotal)}`)
console.log(`   · municipios (BD)       ${fmt(infoMunicipios).padStart(9)}`)
console.log(`   · artículos blog (BD)   ${fmt(infoArticulos).padStart(9)}  (${arts.length})`)
console.log(`   · veredas (archivo)     ${fmt(infoVeredas).padStart(9)}`)
console.log(`   · blog MDX              ${fmt(infoMdx).padStart(9)}`)
console.log(`   · glosario              ${fmt(infoGlosario).padStart(9)}`)
console.log(`   · FAQ municipio (BD)    ${fmt(infoFaqsDB).padStart(9)}`)
console.log(`   · FAQ generadas (est.)  ${fmt(infoFaqsGen).padStart(9)}  (${muniPublicados} municipios × ~510)`)
console.log(`INVENTARIO   ${fmt(inventario).padStart(9)}   ${pc(inventario)}   (${props.length} fichas)`)
console.log(`MARCA        ${fmt(marca).padStart(9)}   ${pc(marca)}   (HTML servido)`)
for (const [r, n] of marcaDetalle) console.log(`   · ${r.padEnd(34)} ${fmt(n).padStart(9)}`)
console.log(`${'─'.repeat(64)}`)
console.log(`TOTAL        ${fmt(total).padStart(9)}`)
console.log(`\nOBJETIVO 70 / 20 / 10  (información / inventario / marca)`)
console.log(`\nMétodo: INFO e INVENTARIO se miden sobre el TEXTO CRUDO de la base y`)
console.log(`archivos de datos; MARCA sobre el HTML SERVIDO (su texto no vive en BD`)
console.log(`sino en TSX). No cuenta nav, footer, código ni llms.txt. Las FAQ`)
console.log(`generadas de VEREDA siguen sin contar (INFO extra no incluida).`)
await prisma.$disconnect()
