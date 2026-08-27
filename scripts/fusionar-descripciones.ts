/**
 * FUSIÓN DE `description` Y `short_description`
 * =============================================
 *
 * La ficha pública nunca renderizó `description`: pintaba
 * `feat(features,'descripcion') ?? short_description`, y esa clave nació muerta
 * el 09/06/2026. Resultado: 9.197 caracteres que solo veía Mac.
 *
 * La fusión NO es «publicar la larga»: en ocho fichas hay 2.759 caracteres que
 * solo están en la corta, y en tres de ellas —Guadu, Petaquero, Albán— la corta
 * es MÁS LARGA que la larga, o sea que la obsoleta es la larga.
 *
 * Este script hace dos cosas y ninguna decide por nadie:
 *
 *   1. COMPRUEBA que en las 27 fichas «resueltas» la larga contiene de verdad a
 *      la corta. Si es así no hay nada que fusionar: `description` ya es el
 *      superconjunto y se publica tal cual.
 *   2. GENERA el material de revisión de las ocho que divergen, con los dos
 *      textos completos y marcado qué tiene cada uno que el otro no.
 *
 *     node scripts/fusionar-descripciones.ts            comprueba y resume
 *     node scripts/fusionar-descripciones.ts --informe  escribe el .md de revisión
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'

const prisma = new PrismaClient()
const INFORME = process.argv.includes('--informe')

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

/** Frases con contenido. Se ignoran las de menos de 12 caracteres. */
const frases = (s: string) =>
  norm(s).split(/(?<=[.!?\n])\s+/).map(x => x.trim()).filter(x => x.length > 12)

const props = await prisma.property.findMany({
  where: { status: 'available' },
  select: { slug: true, title: true, short_description: true, description: true },
  orderBy: { slug: 'asc' },
})

const resueltas: string[] = []
const divergen: typeof props = []
const problemas: string[] = []

for (const p of props) {
  const s = p.short_description ?? ''
  const d = p.description ?? ''
  if (!s || !d) { problemas.push(`${p.slug}: falta uno de los dos campos`); continue }
  if (norm(d).includes(norm(s))) resueltas.push(p.slug)
  else divergen.push(p)
}

console.log('══ 1 · LAS QUE SE RESUELVEN SOLAS ══════════════════════════════════')
console.log(`  ${resueltas.length} fichas en las que \`description\` CONTIENE a \`short_description\`.`)
console.log('  No hay nada que fusionar: la larga ya es el superconjunto.')
console.log('  Se publica tal cual y la corta se deriva de ella después.')
if (problemas.length) { console.log('\n  ⚠ Sin uno de los dos campos:'); problemas.forEach(x => console.log(`     ${x}`)) }

console.log('\n══ 2 · LAS QUE DIVERGEN — decisión manual ══════════════════════════')
for (const p of divergen) {
  const s = p.short_description!
  const d = p.description!
  const soloEnLarga = frases(d).filter(x => !frases(s).includes(x))
  const soloEnCorta = frases(s).filter(x => !frases(d).includes(x))
  const laLargaEsObsoleta = s.length > d.length
  console.log(
    `  ${laLargaEsObsoleta ? '⚠ ' : '  '}${p.slug}\n` +
    `      corta ${s.length} car. · larga ${d.length} car.` +
    (laLargaEsObsoleta ? '  ← LA LARGA ES MÁS CORTA: probablemente obsoleta' : '') + '\n' +
    `      solo en la larga: ${soloEnLarga.length} frase(s) · solo en la corta: ${soloEnCorta.length}`,
  )
}

if (INFORME) {
  const partes: string[] = [
    '# Fusión de descripciones — las 8 que divergen',
    '',
    'La ficha pública nunca ha mostrado `description`. Estas ocho fichas tienen',
    'contenido en los dos campos que el otro no tiene, así que la fusión es una',
    'decisión editorial y no automática.',
    '',
    '**Las tres primeras están priorizadas porque su `short_description` es MÁS',
    'LARGA que su `description`**: ahí la larga es probablemente la obsoleta.',
    '',
    '---',
    '',
  ]

  // Primero las que tienen la larga obsoleta.
  const orden = [...divergen].sort((a, b) => {
    const aObs = (a.short_description?.length ?? 0) > (a.description?.length ?? 0) ? 0 : 1
    const bObs = (b.short_description?.length ?? 0) > (b.description?.length ?? 0) ? 0 : 1
    return aObs - bObs
  })

  for (const p of orden) {
    const s = p.short_description!
    const d = p.description!
    const fs_ = frases(s)
    const fd_ = frases(d)
    const soloEnLarga = fd_.filter(x => !fs_.includes(x))
    const soloEnCorta = fs_.filter(x => !fd_.includes(x))
    const obsoleta = s.length > d.length

    // Se muestran las frases originales, no las normalizadas: el titular tiene
    // que leer el texto tal como está escrito para decidir.
    const originales = (texto: string, normalizadas: string[]) =>
      texto.split(/(?<=[.!?\n])\s+/)
        .map(x => x.trim())
        .filter(x => normalizadas.includes(norm(x)))

    partes.push(
      `## ${p.title ?? p.slug}`,
      '',
      `\`${p.slug}\``,
      '',
      `- Corta: **${s.length}** caracteres`,
      `- Larga: **${d.length}** caracteres`,
      ...(obsoleta ? ['- ⚠ **La larga es más corta que la corta: probablemente obsoleta.**'] : []),
      '',
      `### Solo en la LARGA (${soloEnLarga.length} frases) — se perdería si te quedas con la corta`,
      '',
      ...(soloEnLarga.length
        ? originales(d, soloEnLarga).map(x => `> ${x}`)
        : ['_(nada)_']),
      '',
      `### Solo en la CORTA (${soloEnCorta.length} frases) — se perdería si te quedas con la larga`,
      '',
      ...(soloEnCorta.length
        ? originales(s, soloEnCorta).map(x => `> ${x}`)
        : ['_(nada)_']),
      '',
      '<details><summary>Texto completo de <code>short_description</code></summary>',
      '',
      '```',
      s,
      '```',
      '',
      '</details>',
      '',
      '<details><summary>Texto completo de <code>description</code></summary>',
      '',
      '```',
      d,
      '```',
      '',
      '</details>',
      '',
      '---',
      '',
    )
  }

  const ruta = 'FUSION-DESCRIPCIONES.md'
  // Sin filtrar las cadenas vacías: en markdown son las líneas en blanco que
  // separan párrafos, listas y bloques de código. Filtrarlas dejaba el informe
  // en un solo párrafo continuo.
  writeFileSync(ruta, partes.join('\n') + '\n')
  console.log(`\n→ Informe escrito en ${ruta}`)
}

await prisma.$disconnect()
