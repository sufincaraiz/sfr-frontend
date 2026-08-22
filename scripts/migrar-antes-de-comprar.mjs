#!/usr/bin/env node
/**
 * `inversion` → `antes_de_comprar`
 * ================================
 *
 * El campo preguntaba «por qué invertir aquí» y por tanto PRESUPONÍA la
 * respuesta: la novena forma de esconderse, alojada en el nombre de la columna.
 * Pasa a ser «qué revisar antes de comprar aquí» — acceso, agua, uso del suelo,
 * qué tipo de inmueble se consigue. Sin precios, sin horizontes, sin
 * comparaciones entre municipios.
 *
 * NO se hace con un rename en el esquema: `prisma db push` interpreta un
 * renombrado como DROP + ADD y se lleva el contenido por delante. Va por pasos
 * aditivos:
 *
 *   1. Añadir `antes_de_comprar` al esquema y `db push`   (hecho)
 *   2. Copiar el contenido                                 (este script)
 *   3. Cambiar el código a la columna nueva
 *   4. Quitar `inversion` del esquema y `db push`
 *
 * Entre el paso 2 y el 4 las dos columnas conviven, así que si algo sale mal el
 * contenido sigue en su sitio.
 *
 *     node scripts/migrar-antes-de-comprar.mjs           (dry-run)
 *     node scripts/migrar-antes-de-comprar.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const municipios = await prisma.municipality.findMany({
  orderBy: { slug: 'asc' },
  select: { id: true, slug: true, inversion: true, antes_de_comprar: true },
})

let aCopiar = 0
let yaEstaban = 0
let vacios = 0

for (const m of municipios) {
  if (!m.inversion) { console.log(`  ·  ${m.slug.padEnd(16)} sin contenido`); vacios++; continue }
  if (m.antes_de_comprar === m.inversion) { console.log(`  =  ${m.slug.padEnd(16)} ya copiado`); yaEstaban++; continue }
  if (m.antes_de_comprar) {
    console.log(`  ⚠  ${m.slug.padEnd(16)} DESTINO NO VACÍO y distinto — no se pisa`)
    continue
  }
  console.log(`  →  ${m.slug.padEnd(16)} ${m.inversion.length} car.`)
  aCopiar++
  if (APPLY) await prisma.municipality.update({ where: { id: m.id }, data: { antes_de_comprar: m.inversion } })
}

console.log('\n' + '='.repeat(60))
console.log(`${municipios.length} municipios · ${aCopiar} a copiar · ${yaEstaban} ya copiados · ${vacios} sin contenido`)
console.log(APPLY ? 'APLICADO — ahora el paso 3: cambiar el código' : 'DRY-RUN — nada se escribió')
await prisma.$disconnect()
