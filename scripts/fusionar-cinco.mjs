#!/usr/bin/env node
/**
 * LAS CINCO DESCRIPCIONES QUE QUEDABAN
 * ====================================
 *
 * Decisiones del titular:
 *
 *   Palo de Agua        → LARGA (la corta era solo el encabezado técnico)
 *   Petaquero           → CORTA (la larga era la obsoleta)
 *   Lvc 014 El Cural    → LARGA
 *   Lote campestre 500  → LARGA. La corta se quedó atrás: el script que publicó
 *                         el sector, el recorrido y los servicios recuperados
 *                         escribió SOLO en `description`. Es el mismo defecto
 *                         de tener el dato en dos sitios, en pequeño.
 *   Finca El Cural      → LARGA + la entradilla comercial de la corta, con la
 *                         vereda corregida.
 *
 * LA VEREDA DE LA FINCA EL CURAL. El cuerpo decía «vereda Tabacal» mientras el
 * título, el slug y el nombre de la ficha dicen El Cural. Se corrige al Cural y
 * se le asigna `vereda_id`, que era el dato que faltaba desde la auditoría de
 * veredas. De paso sale «estratégicamente».
 *
 * Al terminar, las dos columnas quedan IGUALES en las cinco. No es la solución
 * final —`short_description` se derivará en el servidor— pero cierra hoy la
 * divergencia, que es lo que hacía que la ficha pública y Mac dijeran cosas
 * distintas.
 *
 *     node scripts/fusionar-cinco.mjs           (dry-run)
 *     node scripts/fusionar-cinco.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

/** prefijo del slug → cuál de las dos gana */
const GANA = {
  'condominio-palo-de-agua': 'larga',
  'lote-petaquero': 'corta',
  'casa-lvc-014-casa-lote-el-cural': 'larga',
  'lote-lote-campestre': 'larga',
  // Decididas un turno antes: en las dos gana la larga. Guadu pese a ser mas
  // corta — su corta arrastra el kilometraje duplicado con dos formatos de
  // decimal y la errata de sintaxis. Cabanas, 19 frases contra 3, y de esas 3
  // una decia «a solo 40 min de Bogota» contra los 60 km y 1 h 14 medidos.
  'condominio-venta-de-lotes-planos': 'larga',
  'casa-proyecto-cabanas-top-32': 'larga',
}

const props = await prisma.property.findMany({
  where: { status: 'available' },
  select: { id: true, slug: true, title: true, short_description: true, description: true, vereda_id: true },
})

let cambios = 0

for (const [pre, cual] of Object.entries(GANA)) {
  const p = props.find(x => x.slug.startsWith(pre))
  if (!p) { console.log(`  ❌ NO ENCONTRADA: ${pre}`); process.exit(1) }
  const texto = cual === 'larga' ? p.description : p.short_description
  if (!texto) { console.log(`  ❌ ${pre}: el campo ganador está vacío`); process.exit(1) }
  console.log(`  ✓ ${p.title} → ${cual.toUpperCase()} (${texto.length} car.)`)
  cambios++
  if (APPLY) {
    await prisma.property.update({
      where: { id: p.id },
      data: { description: texto, short_description: texto },
    })
  }
}

// ── Finca El Cural: fusión + vereda ─────────────────────────────────────────
const finca = props.find(x => x.slug.startsWith('finca-el-cural-andres'))
if (!finca) { console.log('  ❌ NO ENCONTRADA: finca-el-cural-andres'); process.exit(1) }

const ENTRADILLA = [
  'Se Vende Finca Campestre, El Cural - La Vega, Cundinamarca.',
  'Esta finca con potencial turístico, perfecta para el descanso y la recreación, ofrece un estilo de vida campestre con todas las comodidades modernas.',
  'Ubicada en la vereda El Cural, jurisdicción de La Vega, Cundinamarca, combina la tranquilidad del campo con fácil acceso.',
].join(' ')

const FUSIONADA = `${ENTRADILLA}\n\n${finca.description.trim()}`

const vereda = await prisma.vereda.findFirst({
  where: { slug: 'el-cural', municipality: { slug: 'la-vega' } },
  select: { id: true, name: true },
})
if (!vereda) { console.log('  ❌ vereda El Cural no encontrada'); process.exit(1) }

console.log(`\n  ✓ Finca El Cural → fusionada (${FUSIONADA.length} car.)`)
console.log(`      vereda_id: ${finca.vereda_id ?? '(vacío)'} → ${vereda.id} (${vereda.name})`)
console.log('      «Ubicada estratégicamente en la vereda Tabacal» → «Ubicada en la vereda El Cural»')
cambios++

if (APPLY) {
  await prisma.property.update({
    where: { id: finca.id },
    data: { description: FUSIONADA, short_description: FUSIONADA, vereda_id: vereda.id },
  })
}

console.log('\n' + '='.repeat(60))
console.log(`${cambios} fichas`)
console.log(APPLY ? 'APLICADO' : 'DRY-RUN — nada se escribió')
await prisma.$disconnect()
