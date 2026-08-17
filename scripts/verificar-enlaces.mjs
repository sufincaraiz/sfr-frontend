#!/usr/bin/env node
/**
 * GUARDA DE ENLACES INTERNOS — recorre el HTML que el build acaba de generar.
 * ==========================================================================
 *
 * Cuarta vez que el mismo fallo llega a producción: un enlace interno escrito a
 * mano que apunta a algo que no existe o que está vacío. Las cuatro pasaron el
 * build en verde, porque una plantilla de cadena siempre compila.
 *
 *   1. la miga de la ficha, a una vereda sin página;
 *   2. el breadcrumb del dron, a /servicios, que no existe;
 *   3. related-properties.ts, repitiendo el 1;
 *   4. el FOOTER, a /propiedades?tipo=condominio —un tipo retirado— con cero
 *      resultados, en el pie de TODAS las páginas del sitio.
 *
 * ---------------------------------------------------------------------------
 * DOS CLASES, PORQUE UNA NO BASTA
 *
 * El caso 4 es el que lo demuestra: /propiedades?tipo=condominio ES una ruta
 * válida. Comprobar solo que la ruta exista no lo habría atrapado nunca.
 *
 *   (a) RUTA INEXISTENTE — el href no corresponde a ninguna ruta generada.
 *   (b) PARÁMETRO SIN INVENTARIO — el href apunta a una ruta válida pero con
 *       ?tipo= o ?municipio= cuyo valor no tiene ni una propiedad. La página
 *       responde 200 y no ofrece nada: un callejón sin salida.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ AQUÍ Y NO EN `next build`
 *
 * Es análisis del RESULTADO del build, no parte de él, y necesita la base para
 * la clase (b). Vercel no debe caerse porque Railway tarde en responder: mismo
 * criterio que la guarda de veredas.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const RAIZ = process.cwd()

// La clase (b) necesita la base, y este script corre fuera de Next, que es
// quien normalmente carga .env.local. Sin esto la comprobación se saltaba en
// silencio: justo la que atrapa el enlace del footer.
if (!process.env.DATABASE_URL && existsSync(path.join(RAIZ, '.env.local'))) {
  const m = readFileSync(path.join(RAIZ, '.env.local'), 'utf8').match(/^DATABASE_URL=(.*)$/m)
  if (m) process.env.DATABASE_URL = m[1].trim().replace(/^['"]|['"]$/g, '')
}

// Assets servidos por Next fuera del árbol de rutas.
const IGNORAR = [/^\/_next\//, /^\/api\//, /^\/images\//, /\.(xml|txt|png|jpe?g|svg|ico|webp|css|js|pdf)$/]

function rutasGeneradas() {
  const pm = JSON.parse(readFileSync(path.join(RAIZ, '.next/prerender-manifest.json'), 'utf8'))
  const apr = JSON.parse(readFileSync(path.join(RAIZ, '.next/app-path-routes-manifest.json'), 'utf8'))
  return {
    exactas: new Set([
      ...Object.keys(pm.routes || {}),
      ...Object.values(apr).map(r => String(r).replace(/\/route$/, '')),
    ]),
    patrones: Object.values(pm.dynamicRoutes || {}).map(d => new RegExp(d.routeRegex)),
  }
}

function htmlsPublicos() {
  const base = path.join(RAIZ, '.next/server/app')
  const out = []
  if (!existsSync(base)) return out
  ;(function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      // /admin es privado y no forma parte de la malla pública.
      else if (e.name.endsWith('.html') && !p.includes(`${path.sep}admin${path.sep}`)) out.push(p)
    }
  })(base)
  return out
}

async function inventario() {
  // Import perezoso: si no hay base, la clase (b) se omite en vez de fallar.
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const [tipos, munis] = await Promise.all([
      prisma.property.groupBy({ by: ['type'], where: { status: 'available' } }),
      prisma.municipality.findMany({
        where: { properties: { some: { status: 'available' } } },
        select: { name: true, slug: true },
      }),
    ])
    return {
      tipos: new Set(tipos.map(t => t.type)),
      municipios: new Set(munis.flatMap(m => [m.slug.toLowerCase(), m.name.toLowerCase()])),
    }
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

const { exactas, patrones } = rutasGeneradas()
const archivos = htmlsPublicos()

const enlaces = new Map() // href -> Set(páginas)
for (const f of archivos) {
  const html = readFileSync(f, 'utf8')
  for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
    const href = m[1]
    if (IGNORAR.some(re => re.test(href))) continue
    if (!enlaces.has(href)) enlaces.set(href, new Set())
    enlaces.get(href).add(path.relative(path.join(RAIZ, '.next/server/app'), f))
  }
}

const existe = href => {
  const limpio = href.split('?')[0].replace(/\/+$/, '') || '/'
  return exactas.has(limpio) || patrones.some(re => re.test(limpio))
}

const clsA = []
for (const [href, pags] of enlaces) if (!existe(href)) clsA.push([href, pags.size])

const clsB = []
let inv = null
try {
  inv = await inventario()
} catch (e) {
  console.warn(`[enlaces] AVISO: sin base, no se comprueban parámetros: ${String(e).split('\n')[0]}`)
}
if (inv) {
  for (const [href, pags] of enlaces) {
    const q = href.includes('?') ? new URLSearchParams(href.split('?')[1]) : null
    if (!q) continue
    const tipo = q.get('tipo')
    const muni = q.get('municipio')
    if (tipo && tipo !== 'todos' && !inv.tipos.has(tipo)) {
      clsB.push([href, pags.size, `el tipo «${tipo}» no tiene ninguna propiedad disponible`])
    }
    if (muni && muni !== 'todos' && !inv.municipios.has(decodeURIComponent(muni).toLowerCase())) {
      clsB.push([href, pags.size, `el municipio «${decodeURIComponent(muni)}» no tiene inventario`])
    }
  }
}

console.log('\n══ ENLACES INTERNOS ═════════════════════════════════════════')
console.log(`  ${archivos.length} páginas · ${enlaces.size} enlaces distintos`)

if (!clsA.length && !clsB.length) {
  console.log('  → todos los destinos existen y tienen contenido.')
  console.log('═════════════════════════════════════════════════════════════\n')
  process.exit(0)
}

if (clsA.length) {
  console.log(`\n  ✗ SIN RUTA QUE LOS SIRVA (${clsA.length}):`)
  for (const [h, n] of clsA.sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(4)} pág.  ${h}`)
}
if (clsB.length) {
  console.log(`\n  ✗ RUTA VÁLIDA PERO SIN CONTENIDO (${clsB.length}):`)
  for (const [h, n, por] of clsB.sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(4)} pág.  ${h}\n              ${por}`)
}
console.log('\n  Un enlace interno roto resta autoridad al dominio, y uno en el')
console.log('  footer o el header lo hace desde TODAS las páginas a la vez.')
console.log('  Deriva el destino con lib/enlaces.ts en vez de escribirlo a mano.')
console.log('═════════════════════════════════════════════════════════════\n')
process.exit(1)
