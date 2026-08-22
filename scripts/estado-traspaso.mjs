#!/usr/bin/env node
/**
 * ESTADO DEL PROYECTO, DERIVADO — no escrito a mano.
 * ==================================================
 *
 * TRASPASO-SESION.md llegó a 784 líneas y acumuló NUEVE afirmaciones falsas de
 * estado, todas en la misma dirección: decía «sin empezar» o «siguiente» sobre
 * cosas ya construidas. Una de ellas —el tablero de visibilidad IA— llevó a
 * darlo por hecho sin verificar y a pedir que se «pusiera operativo» algo que
 * no existía.
 *
 * Es el mismo fallo que TIPO_LINKS y que el enlace del footer, un piso más
 * arriba: un dato escrito a mano que nadie vuelve a comprobar. Un documento
 * largo que nadie relee entero se desincroniza igual que una etiqueta.
 *
 * La regla que ya aplicamos a municipios, tipos y veredas, aplicada al propio
 * traspaso: LO QUE SE PUEDE DERIVAR NO SE ESCRIBE.
 *
 * Este script deriva el estado del árbol de archivos y de la base. El traspaso
 * conserva lo que NO es derivable —decisiones, razones, trampas aprendidas—,
 * que es donde está su valor y lo que ningún script puede reconstruir.
 *
 *     node scripts/estado-traspaso.mjs
 */

import fs from 'node:fs'
const { existsSync, readFileSync } = fs

const hay = p => existsSync(p)
const contiene = (p, re) => hay(p) && re.test(readFileSync(p, 'utf8'))

const PIEZAS = [
  // ── Base técnica de AEO (lo que el traspaso llamaba «Sesión 1») ───────────
  ['robots.txt con agentes de IA',  () => contiene('src/app/robots.ts', /GPTBot|ClaudeBot/)],
  ['Sitemap segmentado',            () => hay('src/app/sitemap.xml/route.ts') && hay('src/app/sitemap-propiedades.xml/route.ts')],
  ['llms.txt',                      () => hay('src/app/llms.txt/route.ts')],
  ['Datos oficiales (fuente única)',() => hay('src/lib/datos-oficiales.ts')],
  ['JSON-LD de entidad',            () => contiene('src/components/seo/JsonLd.tsx', /RealEstateAgent/)],
  ['Clave de IndexNow publicada',   () => fs.readdirSync('public').some(f => /^[0-9a-f]{32}.txt$/.test(f))],
  ['Ping de IndexNow al publicar',  () => contiene('src/app/api/admin/properties/route.ts', /indexnow/i)],

  // ── Guardas del contenido publicado ───────────────────────────────────────
  ['Límite de valor futuro en Mac', () => contiene('src/lib/agent/prompt.ts', /VALOR FUTURO, RENTABILIDAD Y AVALÚOS/)],
  ['Mismo límite en el experto',    () => contiene('src/lib/agent/expert.ts', /Ley 1673/)],

  // ── Rutas públicas ────────────────────────────────────────────────────────
  ['Página de Mac',                 () => hay('src/app/mac/page.tsx')],
  ['Hub de preguntas frecuentes',   () => hay('src/app/preguntas-frecuentes/page.tsx')],
  ['Plantilla de vereda',           () => hay('src/app/veredas/[slug]/page.tsx')],
  ['Rutas limpias de catálogo',     () => hay('src/app/propiedades/[filtro]/page.tsx')],
  ['Ruta de atributo en-condominio',() => hay('src/app/propiedades/en-condominio/page.tsx')],
  ['Borrador de dron',              () => hay('src/app/servicios/dron-y-fotogrametria/page.tsx')],

  // ── Panel ─────────────────────────────────────────────────────────────────
  ['Tablero de visibilidad IA',     () => hay('src/app/admin/visibilidad-ia/page.tsx')],
  ['Asignación de vereda en lote',  () => hay('src/app/admin/veredas/page.tsx')],

  // ── Marcado y AEO ─────────────────────────────────────────────────────────
  ['BlogPosting con author Person', () => contiene('src/components/seo/JsonLd.tsx', /personaAutora/)],
  ['ItemList en catálogo',          () => contiene('src/components/seo/JsonLd.tsx', /itemListSchema/)],
  ['DatosVerificables en portada',  () => contiene('src/app/page.tsx', /DatosVerificables/)],
  ['CORREDOR derivado (no a mano)', () => contiene('src/lib/cobertura.ts', /getMunicipiosConDatos/)],

  // ── Malla ─────────────────────────────────────────────────────────────────
  ['Malla de enlazado (núcleo)',    () => hay('src/lib/malla-veredas.ts')],
  ['Malla conectada al municipio',  () => contiene('src/app/municipios/[slug]/page.tsx', /VeredasDelMunicipio/)],
  ['Blog → municipio/vereda',       () => contiene('src/app/blog/[slug]/page.tsx', /TerritorioDelArticulo/)],

  // ── Guardas automáticas ───────────────────────────────────────────────────
  ['Guarda de veredas',             () => hay('src/lib/veredas-integridad.ts')],
  ['Guarda de tipos',               () => hay('src/lib/tipos-integridad.ts')],
  ['Guarda de enlaces internos',    () => hay('scripts/verificar-enlaces.mjs')],
  ['Build verificado (P2024 etc.)', () => hay('scripts/verificar-build.mjs')],
  ['Condición publicable unificada',() => hay('src/lib/publicable.ts')],
]

const filas = PIEZAS.map(([nombre, f]) => {
  let ok = false
  try { ok = !!f() } catch { ok = false }
  return { nombre, ok }
})

const hechas = filas.filter(f => f.ok).length

console.log('\n══ ESTADO DERIVADO ══════════════════════════════════════════')
for (const f of filas) console.log(`  ${f.ok ? '✅' : '⬜'}  ${f.nombre}`)
console.log(`\n  ${hechas} de ${filas.length} piezas verificables construidas.`)
console.log('\n  Esta lista se DERIVA del árbol de archivos. Si TRASPASO-SESION.md')
console.log('  dice otra cosa sobre alguna de ellas, manda esta.')
console.log('═════════════════════════════════════════════════════════════\n')
