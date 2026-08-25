/**
 * PROMESAS DE GRATUIDAD Y DE ALCANCE — EN LAS 36 FICHAS
 * =====================================================
 *
 * El barrido de gratuidad del 20/08 se hizo sobre CÓDIGO Y PÁGINAS. Las fichas,
 * con sus cinco campos de texto, no entraron. Y la de Cabañas Top 32 dice
 * «estudio de títulos incluido en la negociación» — exactamente la frase que el
 * prompt de Mac pone como EJEMPLO DE LO QUE NO SE DEBE DECIR.
 *
 * El límite del prompt: no prometer que Su Finca Raíz EJECUTA ni COSTEA ningún
 * trámite, estudio o certificado; la revisión documental ocurre cuando hay un
 * negocio en curso, sobre esa propiedad concreta, como acompañamiento.
 *
 *     node scripts/auditar-gratuidad-fichas.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CAMPOS = ['title', 'short_description', 'description', 'meta_title', 'meta_description'] as const

const PATRONES: Array<{ clase: string; re: RegExp }> = [
  { clase: 'incluido / sin costo', re: /\b(incluid[oa]s?|sin costo|sin cobro|gratis|gratuit[oa]s?|de cortes[ií]a|no tiene costo|cortes[ií]a de)\b/i },
  { clase: 'nosotros lo hacemos', re: /\b(nos encargamos|nosotros (lo|los|la|las)\s+\w+|nuestro abogado|lo gestionamos|lo tramitamos|hacemos el tr[aá]mite|corre por (nuestra )?cuenta)\b/i },
  { clase: 'queda garantizado',    re: /\b(garantizad[oa]s?|garantizamos|queda en regla|totalmente legal|sin riesgo|100 ?% seguro|blindaj)\b/i },
  { clase: 'alcance universal',    re: /\b(todas nuestras propiedades|cada inmueble|todos nuestros inmuebles|siempre verificamos|verificamos antes de publicar|en cada negocio)\b/i },
  { clase: 'estudio / revisión',   re: /\b(estudio de t[ií]tulos|revisi[oó]n documental|due diligence|saneamiento)\b[^.\n]{0,80}/i },
]

const props = await prisma.property.findMany({
  where: { status: 'available' },
  select: { slug: true, title: true, short_description: true, description: true, meta_title: true, meta_description: true },
  orderBy: { slug: 'asc' },
})

let total = 0

for (const p of props) {
  const halladas: string[] = []
  for (const campo of CAMPOS) {
    const texto = p[campo]
    if (typeof texto !== 'string') continue
    for (const frase of texto.split(/(?<=[.!?\n])\s+/)) {
      for (const { clase, re } of PATRONES) {
        if (!re.test(frase)) continue
        halladas.push(`   · [${clase}] ${campo}: «${frase.trim().replace(/\s+/g, ' ').slice(0, 150)}»`)
        total++
        break
      }
    }
  }
  if (halladas.length) {
    console.log(`\n### ${p.slug}`)
    for (const h of halladas) console.log(h)
  }
}

console.log(`\n${'='.repeat(70)}`)
console.log(`${total} frase(s) de gratuidad o alcance en ${props.length} fichas.`)
await prisma.$disconnect()
