import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const RE = /valoriz|revaloriz|plusval|aval[uú]o|valor comercial|proyecci[oó]n|potencial de crecimiento|rentab|retorno de|inversi[oó]n segura|vale m[aá]s|cotizad|se ha consolidado|demanda/i

function mostrar(fuente, campo, texto) {
  if (typeof texto !== 'string') return
  for (const frase of texto.split(/(?<=[.!?\n])\s+/)) {
    if (RE.test(frase)) console.log(`\n[${fuente} · ${campo}]\n  ${frase.trim().slice(0, 400)}`)
  }
}

console.log('########## PROPIEDADES (verificación post-corrección)')
for (const p of await prisma.property.findMany({ select: { slug: true, title: true, short_description: true, description: true, meta_title: true, meta_description: true } }))
  for (const f of ['title','short_description','description','meta_title','meta_description']) mostrar(p.slug, f, p[f])

console.log('\n\n########## MUNICIPIOS')
for (const m of await prisma.municipality.findMany({ select: { slug: true, descripcion_seo: true, meta_description: true, historia: true, clima: true, turismo: true, inversion: true, faqs: true } })) {
  for (const f of ['descripcion_seo','meta_description','historia','clima','turismo','inversion']) mostrar(m.slug, f, m[f])
  if (Array.isArray(m.faqs)) m.faqs.forEach((q, i) => { mostrar(m.slug, `faq[${i}].q`, q?.question); mostrar(m.slug, `faq[${i}].a`, q?.answer) })
}

console.log('\n\n########## MAC KNOWLEDGE')
for (const k of await prisma.macKnowledge.findMany({ where: { activo: true }, select: { titulo: true, contenido: true } })) mostrar(`mac:${k.titulo}`, 'contenido', k.contenido)

console.log('\n\n########## ARTÍCULOS (blog)')
for (const a of await prisma.article.findMany({ select: { slug: true, title: true, excerpt: true, content: true, meta_description: true } }).catch(() => []))
  for (const f of ['title','excerpt','content','meta_description']) mostrar(`blog:${a.slug}`, f, a[f])

console.log('\n\n########## PAGE CONTENT')
for (const pc of await prisma.pageContent.findMany()) mostrar(`page:${pc.key}`, 'data', JSON.stringify(pc.data))

console.log('\n\n########## DIRECTORIO')
for (const b of await prisma.business.findMany().catch(() => [])) mostrar(`negocio:${b.slug ?? b.id}`, 'todo', JSON.stringify(b))

await prisma.$disconnect()
