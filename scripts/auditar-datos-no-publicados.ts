/**
 * DATOS CAPTURADOS QUE NO SE PUBLICAN
 * ===================================
 *
 * El reverso del ciclo entero. Durante una semana se retiró lo que sobraba;
 * esto busca lo que ya está escrito, ya verificado, y **no llega a nadie**.
 *
 * El patrón salió de dos hallazgos del 22/08:
 *   · 84 filas `servicio` en `property_features` que la ficha no pintaba,
 *     porque `serviciosKeys` era una lista a mano sin esa clave.
 *   · 7 filas `via_pavimentada` que no se pintaban en ninguna parte.
 *
 * Los dos son el mismo defecto —una lista escrita a mano que se desincroniza
 * del sistema— y sugieren que hay más. Esto lo comprueba de la única forma
 * fiable: enumerando lo que HAY en la base y buscando cada nombre en el código
 * que renderiza.
 *
 * ⚠ Heurística, no prueba: busca el nombre del campo en el fuente de la
 * plantilla. Un campo puede aparecer y usarse solo para `metadata` o para
 * JSON-LD —que no es lo mismo que mostrarlo al visitante— así que cada
 * hallazgo se confirma mirando. Sirve para saber DÓNDE mirar.
 *
 *     node scripts/auditar-datos-no-publicados.ts
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'node:fs'
import { getAllVeredasData } from '../src/lib/veredas-data.ts'

const prisma = new PrismaClient()

const leer = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '')

const FICHA = leer('src/app/propiedad/[slug]/page.tsx')
const MUNI = leer('src/app/municipios/[slug]/page.tsx')
const VEREDA = leer('src/app/veredas/[slug]/page.tsx')
// El JSON-LD publica hacia los motores aunque no se vea en pantalla: cuenta.
const JSONLD = leer('src/components/seo/JsonLd.tsx')

function usado(fuente: string, nombre: string): boolean {
  return new RegExp(`\\b${nombre}\\b`).test(fuente)
}

// ── 1. Claves de property_features ─────────────────────────────────────────
console.log('══ 1 · CLAVES DE property_features ═════════════════════════════════')
const claves = await prisma.propertyFeature.groupBy({
  by: ['feature_key'],
  _count: { feature_key: true },
  orderBy: { _count: { feature_key: 'desc' } },
})
for (const c of claves) {
  const enFicha = usado(FICHA, c.feature_key)
  const enJson = usado(JSONLD, c.feature_key)
  const marca = enFicha ? '  ' : enJson ? '~ ' : '⚠ '
  const donde = enFicha ? 'ficha' : enJson ? 'solo JSON-LD' : 'NO SE PUBLICA'
  console.log(`${marca}${String(c._count.feature_key).padStart(3)} × ${c.feature_key.padEnd(22)} ${donde}`)
}

// ── 2. Columnas de Property con dato y sin uso en la ficha ─────────────────
console.log('\n\n══ 2 · COLUMNAS DE property ═══════════════════════════════════════')
const COLS = ['address_visible', 'year_built', 'geo_lat', 'geo_lng', 'parking',
  'transaction_type', 'video_url', 'virtual_tour_url', 'modelo3d_url',
  'meta_title', 'meta_description', 'en_condominio', 'area_built_m2', 'vereda_id'] as const
const props = await prisma.property.findMany({ where: { status: 'available' }, select: Object.fromEntries(COLS.map(c => [c, true])) as never })
for (const col of COLS) {
  const conDato = (props as unknown as Array<Record<string, unknown>>)
    .filter(p => p[col] !== null && p[col] !== undefined && p[col] !== '' && p[col] !== false).length
  if (conDato === 0) { console.log(`  ${String(conDato).padStart(3)} × ${col.padEnd(22)} (sin dato en ninguna ficha)`); continue }
  const enFicha = usado(FICHA, col)
  const enJson = usado(JSONLD, col)
  const marca = enFicha ? '  ' : enJson ? '~ ' : '⚠ '
  console.log(`${marca}${String(conDato).padStart(3)} × ${col.padEnd(22)} ${enFicha ? 'ficha' : enJson ? 'solo JSON-LD' : 'NO SE PUBLICA'}`)
}

// ── 3. Campos de Municipality ──────────────────────────────────────────────
console.log('\n\n══ 3 · CAMPOS DE municipality ══════════════════════════════════════')
const MCOLS = ['provincia', 'distancia_bogota_km', 'tiempo_bogota_min', 'altitud_msnm',
  'temp_min', 'temp_max', 'descripcion_seo', 'historia', 'clima', 'turismo',
  'antes_de_comprar', 'og_image', 'geo_lat', 'geo_lng', 'wikipedia_url',
  'faqs', 'tour360_url', 'demand_score'] as const
const munis = await prisma.municipality.findMany({ where: { oculto: false }, select: Object.fromEntries(MCOLS.map(c => [c, true])) as never })
for (const col of MCOLS) {
  const conDato = (munis as unknown as Array<Record<string, unknown>>)
    .filter(m => m[col] !== null && m[col] !== undefined && m[col] !== '' && m[col] !== 0).length
  if (conDato === 0) { console.log(`  ${String(conDato).padStart(3)} × ${col.padEnd(22)} (sin dato)`); continue }
  const enPag = usado(MUNI, col)
  const enJson = usado(JSONLD, col)
  const marca = enPag ? '  ' : enJson ? '~ ' : '⚠ '
  console.log(`${marca}${String(conDato).padStart(3)} × ${col.padEnd(22)} ${enPag ? 'página' : enJson ? 'solo JSON-LD' : 'NO SE PUBLICA'}`)
}

// ── 4. Campos de veredas-data.ts ───────────────────────────────────────────
console.log('\n\n══ 4 · CAMPOS DE veredas-data.ts ══════════════════════════════════')
const veredas = getAllVeredasData()
const claveVereda = new Set<string>()
for (const v of veredas) for (const k of Object.keys(v)) claveVereda.add(k)
for (const k of [...claveVereda].sort()) {
  const conDato = veredas.filter(v => {
    const val = (v as unknown as Record<string, unknown>)[k]
    return val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)
  }).length
  const enPag = usado(VEREDA, k)
  const enJson = usado(JSONLD, k)
  const marca = enPag ? '  ' : enJson ? '~ ' : '⚠ '
  console.log(`${marca}${String(conDato).padStart(3)} × ${k.padEnd(22)} ${enPag ? 'página' : enJson ? 'solo JSON-LD' : 'NO SE PUBLICA'}`)
}

console.log('\n⚠ = no aparece en la plantilla · ~ = solo en el marcado, no visible')
await prisma.$disconnect()
