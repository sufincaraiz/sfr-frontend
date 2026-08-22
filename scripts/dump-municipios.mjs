import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
for (const m of await p.municipality.findMany({ orderBy: { slug: 'asc' }, select: { slug: true, inversion: true, faqs: true, descripcion_seo: true } })) {
  console.log('\n' + '='.repeat(78))
  console.log(`### ${m.slug}`)
  console.log(`\n--- descripcion_seo ---\n${m.descripcion_seo ?? '(null)'}`)
  console.log(`\n--- inversion ---\n${m.inversion ?? '(null)'}`)
  if (Array.isArray(m.faqs)) m.faqs.forEach((q, i) => console.log(`\n--- faq[${i}] ---\nP: ${q?.question}\nR: ${q?.answer}`))
}
await p.$disconnect()
