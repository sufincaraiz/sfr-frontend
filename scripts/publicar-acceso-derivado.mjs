#!/usr/bin/env node
/**
 * ACCESO VIAL DERIVADO DE LA VEREDA
 * =================================
 *
 * De las 18 fichas que no decían nada del acceso, CUATRO tienen vereda asignada
 * y esa vereda tiene `acceso_vial` publicado. El dato ya existía y no llegaba al
 * comprador; publicarlo es derivarlo, no inventarlo.
 *
 * ⚠ SE ESCRIBE COMO LO QUE ES: el acceso A LA VEREDA. No se afirma nada sobre
 * los últimos metros hasta el predio, que pueden ser otra cosa —una servidumbre
 * destapada al final de una vía pavimentada es lo normal en el campo—. Decir
 * «vía pavimentada» a secas sería cometer la undécima forma en el acto de
 * corregirla: quedarse con la parte buena de la verdad.
 *
 * Los SERVICIOS no se derivan. El acceso a un predio es el de su vereda —es la
 * misma vía—; el agua y la energía son del predio.
 *
 *     node scripts/publicar-acceso-derivado.mjs           (dry-run)
 *     node scripts/publicar-acceso-derivado.mjs --apply
 */

import { PrismaClient } from '@prisma/client'
import { cruzarFichasConVeredas } from '../src/lib/cruce-ficha-vereda.ts'
import { getAllVeredasData } from '../src/lib/veredas-data.ts'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const fichas = await prisma.property.findMany({
  where: { status: 'available' },
  select: { id: true, slug: true, short_description: true, description: true, vereda: { select: { slug: true, name: true } } },
})

const { huecosDerivables } = cruzarFichasConVeredas(fichas, getAllVeredasData())

let cambios = 0

for (const h of huecosDerivables) {
  const f = fichas.find(x => x.slug === h.slug)
  if (!f) continue

  const bloque =
    `\n\nAcceso a la vereda ${h.vereda}: ${h.acceso.trim()} ` +
    `El tramo final hasta el predio se confirma en la visita.`

  console.log(`\n  → ${h.slug}`)
  console.log(`    ${bloque.trim().replace(/\s+/g, ' ').slice(0, 150)}`)

  const data = {}
  for (const campo of ['short_description', 'description']) {
    const actual = f[campo]
    if (typeof actual !== 'string' || actual.includes('Acceso a la vereda')) continue
    data[campo] = actual.trimEnd() + bloque
    cambios++
  }
  if (APPLY && Object.keys(data).length) {
    await prisma.property.update({ where: { id: f.id }, data })
    console.log(`    → GUARDADO (${Object.keys(data).join(', ')})`)
  }
}

console.log('\n' + '='.repeat(60))
console.log(`${huecosDerivables.length} ficha(s) · ${cambios} campo(s)`)
console.log(APPLY ? 'APLICADO' : 'DRY-RUN — nada se escribió')
await prisma.$disconnect()
