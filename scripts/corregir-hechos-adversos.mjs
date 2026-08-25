#!/usr/bin/env node
/**
 * DOS HECHOS ADVERSOS QUE LA FICHA CONTRADECÍA O RECORTABA
 * ========================================================
 *
 * De los 37 hallazgos de `auditar-hechos-adversos.ts`, estos dos no son
 * silencio: son afirmaciones NUESTRAS que chocan con datos NUESTROS. El resto
 * —fichas que no mencionan acceso ni servicios— es un hueco de contenido y se
 * reporta aparte.
 *
 * (B) CONDOMINIO OESTE, vereda Tabacal. La ficha decía «combina la tranquilidad
 *     del campo con fácil acceso». `veredas-data.ts` dice de esa misma vereda:
 *     «Vía destapada desde La Vega en proceso de pavimentación. Acceso 4x4
 *     recomendado en temporada de lluvias.»
 *
 *     Es el caso exacto que hay que evitar: alguien conduce una hora y media
 *     confiando en «fácil acceso» y se encuentra una destapada que exige 4x4 si
 *     ha llovido. El dato estaba en nuestra propia base.
 *
 * (A) LA RIVERA. La ficha decía «Vías de acceso en placa huella hasta la
 *     entrada de tu lote». El conocimiento dice «vía carreteable con tramos
 *     mixtos (asfaltada, placa huella y destapada)». No es falso: es la parte
 *     buena de la verdad. Nombrar el mejor tramo y callar el peor es la misma
 *     familia de defecto.
 *
 * En los dos casos se escribe el hecho completo y sin suavizar, siguiendo la
 * regla que ya está en el prompt: no ocultarlo, no presentarlo como defecto, y
 * NO afirmar lo contrario.
 *
 *     node scripts/corregir-hechos-adversos.mjs           (dry-run)
 *     node scripts/corregir-hechos-adversos.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const CAMPOS = ['title', 'short_description', 'description', 'meta_title', 'meta_description']

const REGLAS = {
  'condominio-oeste-la-vega-cundinamarca': [
    ['Ubicada estratégicamente en la vereda Tabacal, jurisdicción de La Vega, Cundinamarca, combina la tranquilidad del campo con fácil acceso.',
     'Ubicada en la vereda Tabacal, jurisdicción de La Vega, Cundinamarca. El acceso desde La Vega es por vía destapada, en proceso de pavimentación; en temporada de lluvias se recomienda vehículo 4x4.',
     'Condominio Oeste · «fácil acceso» contradecía la vía destapada de Tabacal'],
  ],
  'condominio-lote-en-condominio-campestre-la-rivera-la-vega-cundinamarca': [
    ['🛣️ Vías de acceso en placa huella hasta la entrada de tu lote.',
     '🛣️ Acceso por vía carreteable con tramos mixtos —asfaltada, placa huella y destapada— hasta la entrada del lote.',
     'La Rivera · la ficha nombraba solo el tramo bueno'],
  ],
}

let cambios = 0
const fallos = []

for (const [slug, reglas] of Object.entries(REGLAS)) {
  const p = await prisma.property.findUnique({
    where: { slug },
    select: { id: true, title: true, short_description: true, description: true, meta_title: true, meta_description: true },
  })
  if (!p) { console.log(`\n### ❌ NO ENCONTRADA: ${slug}`); fallos.push(slug); continue }
  console.log(`\n### ${slug}`)
  const data = {}
  for (const [buscar, reemplazar, etiqueta] of reglas) {
    const golpes = []
    for (const f of CAMPOS) {
      const actual = data[f] ?? p[f]
      if (typeof actual !== 'string' || !actual.includes(buscar)) continue
      data[f] = actual.split(buscar).join(reemplazar)
      golpes.push(f); cambios++
    }
    if (golpes.length) console.log(`  ✓ ${golpes.join(', ')} — ${etiqueta}`)
    else { console.log(`  ❌ NO ENCONTRADO — ${etiqueta}`); fallos.push(etiqueta) }
  }
  if (APPLY && Object.keys(data).length) {
    await prisma.property.update({ where: { id: p.id }, data })
    console.log(`  → GUARDADO (${Object.keys(data).join(', ')})`)
  }
}

console.log('\n' + '='.repeat(60))
console.log(`Cambios: ${cambios} · Fallos: ${fallos.length}`)
if (fallos.length) { console.log('ABORTADO'); await prisma.$disconnect(); process.exit(1) }
console.log(APPLY ? 'APLICADO' : 'DRY-RUN — nada se escribió')
await prisma.$disconnect()
