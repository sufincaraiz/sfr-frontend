#!/usr/bin/env node
/**
 * LO QUE SE CALLABA, Y UNA PROMESA QUE EL PROMPT YA PROHIBÍA
 * =========================================================
 *
 * (1) RELIEVE INCLINADO. `mac_knowledge` dice que el predio del lote campestre
 *     de 500 m² «posee un relieve inclinado», y añadía instrucciones para no
 *     presentarlo como defecto. La ficha no lo mencionaba: decía «Entorno:
 *     Natural y con panorámicas».
 *
 *     Un hecho material adverso que se conoce y no se publica es peor que una
 *     promesa: es información que tenemos y que el comprador necesita ANTES de
 *     desplazarse. Se escribe como dato, sin suavizar — nada de «desniveles
 *     naturales» ni «topografía variada».
 *
 * (2) «ESTUDIO DE TÍTULOS INCLUIDO EN LA NEGOCIACIÓN», en la ficha de Cabañas
 *     Top 32. Es LITERALMENTE la frase que el prompt de Mac pone como ejemplo
 *     de lo que NO se debe decir, y llevaba cuatro turnos reportada. El barrido
 *     de gratuidad del 20/08 se hizo sobre código y páginas; las 36 fichas no
 *     entraron. Ahora sí: `scripts/auditar-gratuidad-fichas.ts`, y esta era la
 *     única.
 *
 *     node scripts/corregir-lote-23.mjs           (dry-run)
 *     node scripts/corregir-lote-23.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const CAMPOS = ['title', 'short_description', 'description', 'meta_title', 'meta_description']

const REGLAS = {
  'lote-lote-campestre-la-vega-cundinamarca': [
    ['Uso de suelo: Campestre',
     'Uso de suelo: Campestre\nRelieve: el predio tiene relieve inclinado',
     'lote · relieve inclinado en la ficha de características'],
    ['El inmueble cuenta con matrícula inmobiliaria independiente y uso de suelo campestre.',
     'El inmueble cuenta con matrícula inmobiliaria independiente y uso de suelo campestre. El predio tiene relieve inclinado.',
     'lote · relieve inclinado en la prosa'],
  ],
  'casa-proyecto-cabanas-top-32-lotes-campestres-en-la-vega-la-vega-cundinamarca': [
    ['Lote Privado: 500 m² de terreno con matrícula inmobiliaria independiente, con estudio de títulos incluido en la negociación.',
     'Lote Privado: 500 m² de terreno con matrícula inmobiliaria independiente. El estudio de títulos corre por cuenta del comprador y su abogado; nosotros orientamos sobre qué revisar y acompañamos el proceso hasta la notaría.',
     'Cabañas · «estudio de títulos incluido en la negociación»'],
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
      golpes.push(f)
      cambios++
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
