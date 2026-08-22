import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const props = await p.property.findMany({
  select: {
    slug: true, title: true, type: true, en_condominio: true, status: true,
    short_description: true, description: true,
    meta_title: true, meta_description: true,
    municipality: { select: { name: true } },
  },
  orderBy: { slug: 'asc' },
})
console.log(`TOTAL: ${props.length}`)
for (const x of props) {
  console.log('\n' + '='.repeat(78))
  console.log(`SLUG: ${x.slug}  [${x.type}${x.en_condominio ? '/condominio' : ''}] ${x.municipality?.name ?? '?'} — ${x.status}`)
  console.log(`TITLE: ${x.title ?? '(null)'}`)
  console.log(`META_TITLE: ${x.meta_title ?? '(null)'}`)
  console.log(`META_DESC: ${x.meta_description ?? '(null)'}`)
  console.log(`SHORT: ${x.short_description ?? '(null)'}`)
  console.log(`DESC: ${x.description ?? '(null)'}`)
}
await p.$disconnect()
