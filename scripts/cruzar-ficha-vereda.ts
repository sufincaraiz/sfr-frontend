/**
 * CRUCE FICHA ↔ VEREDA — informe
 * ==============================
 *
 * Ejecuta `src/lib/cruce-ficha-vereda.ts` sobre el catálogo y separa lo que se
 * puede derivar de lo que necesita dato del titular. También lista los huecos
 * de SERVICIOS, que NO se derivan: el servicio es del predio, no de la vereda.
 *
 *     node scripts/cruzar-ficha-vereda.ts
 */

import { PrismaClient } from '@prisma/client'
import { cruzarFichasConVeredas } from '../src/lib/cruce-ficha-vereda.ts'
import { getAllVeredasData } from '../src/lib/veredas-data.ts'

const prisma = new PrismaClient()

const fichas = await prisma.property.findMany({
  where: { status: 'available' },
  select: {
    slug: true, title: true, short_description: true, description: true, type: true,
    vereda: { select: { slug: true, name: true } },
  },
  orderBy: { slug: 'asc' },
})

const { discrepancias, huecosDerivables, sinVereda } = cruzarFichasConVeredas(fichas, getAllVeredasData())

console.log('══ DISCREPANCIAS · la ficha afirma lo que su vereda contradice ═════')
if (!discrepancias.length) console.log('  ✓ ninguna')
for (const d of discrepancias) {
  console.log(`\n  ⚠ ${d.slug}  (vereda ${d.vereda})`)
  console.log(`    la ficha: «…${d.afirma}…»`)
  console.log(`    la vereda: «${d.peroLaVereda}»`)
}

console.log('\n\n══ HUECOS DE ACCESO · DERIVABLES de la vereda ══════════════════════')
if (!huecosDerivables.length) console.log('  ✓ ninguno')
for (const h of huecosDerivables) {
  console.log(`\n  → ${h.slug}  (vereda ${h.vereda})`)
  console.log(`    se puede publicar: «${h.acceso}»`)
}

console.log('\n\n══ HUECOS DE ACCESO · NECESITAN DATO DEL TITULAR ═══════════════════')
console.log('   (sin vereda asignada, o su vereda no tiene contenido editorial)')
if (!sinVereda.length) console.log('  ✓ ninguno')
for (const s of sinVereda) console.log(`  · ${s}`)

// ── Servicios: se listan, NO se derivan ────────────────────────────────────
const MENCIONA_SERVICIOS = /\b(acueducto|agua|energ[ií]a|enel|codensa|gas|alcantarillado|pozo s[eé]ptico|internet|servicios p[úu]blicos)\b/i
const sinServicios = fichas.filter(f =>
  f.type !== 'apartamento' &&
  !MENCIONA_SERVICIOS.test([f.short_description, f.description].filter(Boolean).join('\n')))

console.log('\n\n══ HUECOS DE SERVICIOS · TODOS necesitan dato del titular ══════════')
console.log('   El servicio es del PREDIO, no de la vereda. Dos lotes vecinos')
console.log('   pueden tener uno acueducto veredal y el otro nada: derivarlo por')
console.log('   proximidad sería el error que este cruce existe para detectar.')
for (const f of sinServicios) console.log(`  · ${f.slug}`)

console.log(`\n${'='.repeat(70)}`)
console.log(`${discrepancias.length} discrepancia(s) · ${huecosDerivables.length} acceso(s) derivable(s) · ` +
            `${sinVereda.length} acceso(s) sin fuente · ${sinServicios.length} sin servicios`)
await prisma.$disconnect()
