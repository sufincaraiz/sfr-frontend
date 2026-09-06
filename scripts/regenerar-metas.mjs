#!/usr/bin/env node
/**
 * BLOQUE 2 — regenera las meta_description heredadas (precio incrustado) con la
 * forma DERIVADA (misma función que el fallback de la ficha: fuente única).
 * Conserva las 8 buenas (KEEP), y quita el precio de los 2 meta_title.
 *
 *     node scripts/regenerar-metas.mjs            dry-run
 *     node scripts/regenerar-metas.mjs --apply
 */
import { PrismaClient } from '@prisma/client'
import { metaDescripcionPropiedad } from '../src/lib/meta-propiedad.ts'
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const KEEP = new Set([
  'apartamento-apartamento-en-venta-en-conjunto-la-vega-cundinamarca',
  'apartamento-apartamento-nuevo-en-conjunto-la-vega-cundinamarca',
  'apartamento-venta-de-apartamento-de-94m-en-el-mirador-la-vega-la-vega-cundinamarca',
  'condominio-condominio-bella-vista-la-vega-cundinamarca-la-vega-cundinamarca',
  'finca-casa-campestre-en-condominio-la-vega-cundinamarca',
  'finca-quinta-san-francisco-cundinamarca',
  'lote-lote-para-proyecto-alban-cundinamarca',
  'condominio-venta-de-lotes-planos-en-condominio-guadu-la-vega-la-vega-cundinamarca',
])
const MALO = /\$\s?\d|\bCOP\b|\bmillones\b|\binvierte\b|\bideal\b|\ba\s+\d+\s?(min|minutos)\b/i

// En espera del dato del titular (área en disputa): no se regenera su meta.
const HOLD = new Set(['finca-agropecuaria-la-vega-cundinamarca'])
// Casos que la función derivada no captura bien (proyecto lote+cabaña): meta a mano, sin precio.
const ESPECIAL = {
  'casa-proyecto-cabanas-top-32-lotes-campestres-en-la-vega-la-vega-cundinamarca':
    'Proyecto Cabañas Top 32, Sector Cucharal, La Vega, Cundinamarca. Lote de 500 m² con cabaña de 32 m² en obra blanca.',
}

// Etiquetas reales del catálogo (para que la meta regenerada = la del runtime).
const labelMap = {}
try {
  for (const t of await prisma.tipoPropiedad.findMany({ select: { slug: true, label: true } })) labelMap[t.slug] = t.label
} catch { /* cae al fallback capitalizado */ }
const label = (tipo) => labelMap[tipo] ?? (tipo.charAt(0).toUpperCase() + tipo.slice(1))

const props = await prisma.property.findMany({
  select: {
    slug: true, type: true, area_lot_m2: true, area_built_m2: true, bedrooms: true, bathrooms: true,
    meta_title: true, meta_description: true, municipality: { select: { name: true } },
  },
  orderBy: { slug: 'asc' },
})

let nDesc = 0, nTit = 0
for (const p of props) {
  // (a) meta_description derivada
  if (!KEEP.has(p.slug) && !HOLD.has(p.slug) && MALO.test(p.meta_description || '')) {
    const nueva = ESPECIAL[p.slug] ?? metaDescripcionPropiedad({
      tipo: p.type,
      tipoLabel: label(p.type),
      areaConstruida: p.area_built_m2, areaLote: p.area_lot_m2,
      habitaciones: p.bedrooms, banos: p.bathrooms,
      municipio: p.municipality?.name ?? 'La Vega',
    })
    console.log(`\nDESC ${p.slug}`)
    console.log(`   antes: ${p.meta_description}`)
    console.log(`   nueva: ${nueva}`)
    if (APPLY) await prisma.property.update({ where: { slug: p.slug }, data: { meta_description: nueva } })
    nDesc++
  }
  // (b) precio en meta_title
  if (/\$\s?\d/.test(p.meta_title || '')) {
    const limpio = (p.meta_title || '').replace(/\s*\$\s?\d[\d.,]*/g, '').replace(/\s{2,}/g, ' ').trim()
    console.log(`\nTIT  ${p.slug}`)
    console.log(`   antes: ${p.meta_title}`)
    console.log(`   nueva: ${limpio}`)
    if (APPLY) await prisma.property.update({ where: { slug: p.slug }, data: { meta_title: limpio } })
    nTit++
  }
}
console.log(`\n${'='.repeat(60)}`)
console.log(`${nDesc} meta_description · ${nTit} meta_title`)
console.log(APPLY ? 'APLICADO.' : '(dry-run — pasa --apply)')
await prisma.$disconnect()
