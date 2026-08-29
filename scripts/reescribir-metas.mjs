#!/usr/bin/env node
/**
 * REESCRIBIR META_DESCRIPTIONS con superlativos/promesas → descripción sobria.
 * =============================================================================
 *
 * SIN --apply  → AUDITORÍA: lista las fichas cuya meta_description (o meta_title)
 *                trae texto prohibido, con TODOS los datos de respaldo al lado
 *                (áreas, alcobas, baños, vereda, features) para poder verificar
 *                que la propuesta no inventa cifras. NO escribe nada.
 *
 * CON --apply  → escribe la meta_description nueva SOLO en las fichas para las que
 *                hay propuesta definida abajo (PROPUESTAS por slug). No toca
 *                meta_title, short_description ni description: eso es otro lote.
 *
 *     node scripts/reescribir-metas.mjs
 *     node scripts/reescribir-metas.mjs --apply
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

// Texto prohibido: superlativos, promesas de valorización/rentabilidad,
// llamadas a la acción y adjetivos de venta.
const PROHIBIDO = /espectacular|exclusiv|[úu]nic[oa]|ideal|excelente|estrat[ée]gic|privilegiad|valorizaci[óo]n|rentabilidad|oportunidad de inversi[óo]n|invierte|agenda hoy|hermos|potencial de valor/i

// Segundo detector, SOLO para reportar (no reescribe): distancias y gratuidad en
// la meta, que también están en la lista de prohibido pero por otra razón.
const DISTANCIA = /\ba\s+\d+([.,]\d+)?\s?(km|kil[óo]metros?|minutos?|metros?|m)\b|gratis|sin costo/i

// Propuestas nuevas, por slug. SOLO datos verificados contra los campos
// estructurados y el short_description de la propia ficha. Nada inventado.
const PROPUESTAS = {
  'apartamento-apartamento-en-venta-en-conjunto-la-vega-cundinamarca':
    'Apartamento en venta en La Vega, Cundinamarca. 65 m², 3 habitaciones, 2 baños y piscina, en primer piso y cerca del Parque Principal.',
  'apartamento-apartamento-nuevo-en-conjunto-la-vega-cundinamarca':
    'Apartamento nuevo de 88 m² en el centro de La Vega, Cundinamarca. 2 habitaciones, 2 baños y balcón, en conjunto residencial.',
  'apartamento-venta-de-apartamento-de-94m-en-el-mirador-la-vega-la-vega-cundinamarca':
    'Apartamento esquinero de 94 m² en el Conjunto El Mirador, La Vega, Cundinamarca. 3 habitaciones, 2 baños y parqueadero propio.',
  'condominio-condominio-bella-vista-la-vega-cundinamarca-la-vega-cundinamarca':
    'Finca en condominio en la Vereda La Huerta, La Vega, Cundinamarca. 3.883 m² de lote, 267 m² construidos, 4 alcobas y 3 baños.',
  'finca-casa-campestre-en-condominio-la-vega-cundinamarca':
    'Casa campestre de 300 m² en condominio, en San Juan de La Vega, Cundinamarca. Lote de 845 m², 3 alcobas y 4 baños, a 300 m de la vía La Vega–Bogotá.',
  'lote-lote-para-proyecto-alban-cundinamarca':
    'Lote de 55.519 m² (5,55 ha) en Albán, Cundinamarca, con frente directo a la vía nacional pavimentada Silvania–Albán, a 250 m del Peaje Jalisco.',
  // Quinta: se retira «a 1 km del parque» (distancia sin medir) y el «..» final;
  // el resto ya estaba publicado y se conserva.
  'finca-quinta-san-francisco-cundinamarca':
    'Quinta de 4.050 m² en la Vereda Toriba, San Francisco, Cundinamarca. 393 m² construidos, arquitectura contemporánea y topografía plana.',
  // Guadu: fuera el precio ($255M, cambia) y «vista panorámica» (apreciación);
  // piscina y tenis se conservan (amenidades del condominio en la descripción).
  'condominio-venta-de-lotes-planos-en-condominio-guadu-la-vega-la-vega-cundinamarca':
    'Lotes planos en el Condominio Campestre Guadu, La Vega, Cundinamarca. Dos lotes de 875 y 898 m², con piscina y cancha de tenis en zonas comunes.',
}

const props = await prisma.property.findMany({
  select: {
    id: true, slug: true, title: true,
    meta_title: true, meta_description: true, short_description: true,
    area_lot_m2: true, area_built_m2: true, bedrooms: true, bathrooms: true, parking: true,
    type: true,
    municipality: { select: { name: true } },
    vereda: { select: { name: true } },
    features: { select: { feature_key: true, feature_value: true } },
  },
  orderBy: { slug: 'asc' },
})

// APLICAR: escribe EXACTAMENTE las propuestas definidas, por slug. No depende del
// detector: lo que no esté en PROPUESTAS no se toca. Solo meta_description.
if (APPLY) {
  let n = 0
  for (const [slug, nueva] of Object.entries(PROPUESTAS)) {
    const res = await prisma.property.updateMany({ where: { slug }, data: { meta_description: nueva } })
    if (res.count === 1) { console.log(`  ✓ ${slug}\n     ${nueva}`); n++ }
    else console.log(`  ⚠ ${slug}: ${res.count} filas (esperaba 1), NO garantizado`)
  }
  console.log(`\n${'='.repeat(60)}\n${n}/${Object.keys(PROPUESTAS).length} meta_description escritas.`)
  await prisma.$disconnect()
  process.exit(0)
}

let flag = 0
for (const p of props) {
  const md = p.meta_description ?? ''
  const mt = p.meta_title ?? ''
  const malo = PROHIBIDO.test(md) || PROHIBIDO.test(mt)
  if (!malo) continue
  flag++

  // Auditoría: ficha + respaldo
  const feats = p.features.map(f => `${f.feature_key}=${f.feature_value}`).join(', ')
  console.log(`\n── ${p.title}  [${p.type}]`)
  console.log(`   slug: ${p.slug}`)
  console.log(`   muni: ${p.municipality?.name ?? '—'}   vereda: ${p.vereda?.name ?? '—'}`)
  console.log(`   lote: ${p.area_lot_m2 ?? '—'} m²   const.: ${p.area_built_m2 ?? '—'} m²   alcobas: ${p.bedrooms ?? '—'}   baños: ${p.bathrooms ?? '—'}   parq.: ${p.parking ?? '—'}`)
  console.log(`   META_TITLE: ${mt || '—'}`)
  console.log(`   META_DESC : ${md || '—'}`)
  console.log(`   SHORT_DESC: ${(p.short_description ?? '—').slice(0, 200)}`)
  console.log(`   FEATURES  : ${feats || '—'}`)
  const prop = PROPUESTAS[p.slug]
  console.log(`   ► NUEVA   : ${prop ? `${prop}  (${prop.length} car.)` : '⚠ sin propuesta'}`)
}

// Reporte aparte: distancias/gratuidad en meta (no se reescriben en este lote).
if (!APPLY) {
  const conDist = props.filter(p => DISTANCIA.test(p.meta_description ?? '') || DISTANCIA.test(p.meta_title ?? ''))
  if (conDist.length) {
    console.log(`\n── DISTANCIA/GRATUIDAD en meta (solo reporte) ──`)
    for (const p of conDist) console.log(`   ${p.slug}  [lote ${p.area_lot_m2 ?? '—'} · const ${p.area_built_m2 ?? '—'} · vereda ${p.vereda?.name ?? '—'} · muni ${p.municipality?.name ?? '—'}]\n      ${p.meta_description ?? p.meta_title}`)
  }
}

console.log(`\n${'='.repeat(60)}`)
console.log(`${flag} fichas con texto prohibido en meta.`)
console.log(APPLY ? 'APLICADO (solo las que tienen propuesta).' : 'AUDITORÍA — nada se escribió.')
await prisma.$disconnect()
