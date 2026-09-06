#!/usr/bin/env node
/**
 * BLOQUE 1 — cifras malas. Aplica SOLO las inequívocas:
 *   · LVE 009: area_lot_m2 3.708 → 3708 (error de separador de miles)
 *   · LVE 010: area_lot_m2 37.776 → 37776 (íd.)
 *   · Finca Agropecuaria: «220w» → «220V» (unidad equivocada) en los cuerpos
 * NO toca las dos áreas en disputa (Chicala 136 vs «72 m²»; Agropecuaria campo
 * 22.000 vs «22 hectáreas»): esperan confirmación del titular contra escritura.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function verArea(slug) {
  const p = await prisma.property.findUnique({ where: { slug }, select: { area_lot_m2: true } })
  return p?.area_lot_m2
}

const a9 = await verArea('lote-rural-campestre-la-vega-cundinamarca')
const a10 = await verArea('lote-campestre-la-vega-cundinamarca-2')
const agr = await prisma.property.findUnique({ where: { slug: 'finca-agropecuaria-la-vega-cundinamarca' }, select: { short_description: true, description: true } })
const w = /220\s*w\b/i
const agrSdTiene = w.test(agr.short_description || '')
const agrDeTiene = w.test(agr.description || '')

console.log('ANTES:')
console.log(`  LVE 009 area_lot_m2 = ${a9}   → 3708`)
console.log(`  LVE 010 area_lot_m2 = ${a10}  → 37776`)
console.log(`  Agropecuaria «220w» presente: short=${agrSdTiene} desc=${agrDeTiene}  → «220V»`)

if (APPLY) {
  await prisma.property.update({ where: { slug: 'lote-rural-campestre-la-vega-cundinamarca' }, data: { area_lot_m2: 3708 } })
  await prisma.property.update({ where: { slug: 'lote-campestre-la-vega-cundinamarca-2' }, data: { area_lot_m2: 37776 } })
  await prisma.property.update({
    where: { slug: 'finca-agropecuaria-la-vega-cundinamarca' },
    data: {
      short_description: (agr.short_description || '').replace(w, '220V'),
      description: (agr.description || '').replace(w, '220V'),
    },
  })
  const v9 = await verArea('lote-rural-campestre-la-vega-cundinamarca')
  const v10 = await verArea('lote-campestre-la-vega-cundinamarca-2')
  const va = await prisma.property.findUnique({ where: { slug: 'finca-agropecuaria-la-vega-cundinamarca' }, select: { description: true } })
  console.log('\nDESPUÉS:')
  console.log(`  LVE 009 = ${v9}   LVE 010 = ${v10}   Agropecuaria «220w» restante: ${w.test(va.description || '')}`)
  console.log('✓ aplicado (3 cifras). Las 2 áreas en disputa quedan intactas.')
} else {
  console.log('\n(dry-run — pasa --apply)')
}
console.log('\n⚠ MARCADAS, esperan tu dato (NO tocadas):')
console.log('   · Casa Chicala: campo area_lot_m2=136 vs cuerpo «Área Total predio: 72 m²»')
console.log('   · Finca Agropecuaria: campo area_lot_m2=22.000 vs cuerpo «22 hectáreas» (220.000)')
await prisma.$disconnect()
