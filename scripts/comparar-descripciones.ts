/**
 * ¿CUÁNTO CONTENIDO HAY EN `description` QUE NO LLEGA A NADIE?
 * ===========================================================
 *
 * La ficha pública NO renderiza `p.description`. Pinta
 * `feat(features,'descripcion') ?? p.short_description`, y la clave
 * `descripcion` no existe en `property_features` —se escribió el 09/06/2026, en
 * el mismo commit que creó la página, y ningún formulario ni endpoint la ha
 * escrito jamás—. Así que la ficha muestra SIEMPRE `short_description`.
 *
 * `description` llega solo a Mac (`tools.ts:456`). Ni a la página, ni al
 * JSON-LD, ni a `llms.txt`, ni a las metas.
 *
 * Esto mide cuánto contenido hay ahí que el visitante no ve, para decidir con
 * números: publicar `description` en la ficha, o derivar `short` de `description`
 * y publicar la larga.
 *
 *     node scripts/comparar-descripciones.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** Normaliza para comparar: sin acentos, espacios colapsados, minúsculas. */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

const props = await prisma.property.findMany({
  where: { status: 'available' },
  select: { slug: true, title: true, short_description: true, description: true },
  orderBy: { slug: 'asc' },
})

type Clase = 'idéntica' | 'short es prefijo' | 'DIVERGEN' | 'sin description' | 'sin short'

const filas: Array<{ slug: string; clase: Clase; invisible: number; lenS: number; lenD: number }> = []

for (const p of props) {
  const s = p.short_description ?? ''
  const d = p.description ?? ''
  const ns = norm(s)
  const nd = norm(d)

  let clase: Clase
  let invisible = 0

  if (!d) clase = 'sin description'
  else if (!s) { clase = 'sin short'; invisible = d.length }
  else if (ns === nd) clase = 'idéntica'
  else if (nd.startsWith(ns)) {
    // El short es el arranque de la larga: lo que se pierde es la cola.
    clase = 'short es prefijo'
    invisible = d.length - s.length
  } else {
    clase = 'DIVERGEN'
    // Cuánto de la larga NO aparece en la corta, contado por frases.
    const frasesCorta = new Set(ns.split(/(?<=[.!?\n])\s+/).map(x => x.trim()).filter(Boolean))
    const ausentes = nd.split(/(?<=[.!?\n])\s+/)
      .map(x => x.trim())
      .filter(x => x.length > 12 && !frasesCorta.has(x))
    invisible = ausentes.join(' ').length
  }

  filas.push({ slug: p.slug, clase, invisible, lenS: s.length, lenD: d.length })
}

const orden: Clase[] = ['DIVERGEN', 'short es prefijo', 'sin short', 'idéntica', 'sin description']

for (const clase of orden) {
  const grupo = filas.filter(f => f.clase === clase)
  if (!grupo.length) continue
  const suma = grupo.reduce((a, f) => a + f.invisible, 0)
  console.log(`\n══ ${clase.toUpperCase()} — ${grupo.length} ficha(s) · ${suma.toLocaleString('es-CO')} car. invisibles`)
  for (const f of grupo.sort((a, b) => b.invisible - a.invisible)) {
    const marca = f.invisible > 400 ? '⚠ ' : '  '
    console.log(`${marca}${String(f.invisible).padStart(5)} car.  short ${String(f.lenS).padStart(5)} / larga ${String(f.lenD).padStart(5)}  ${f.slug}`)
  }
}

const totalInvisible = filas.reduce((a, f) => a + f.invisible, 0)
const conPerdida = filas.filter(f => f.invisible > 0).length

console.log(`\n${'='.repeat(72)}`)
console.log(`${props.length} fichas · ${conPerdida} con contenido que no se publica`)
console.log(`${totalInvisible.toLocaleString('es-CO')} caracteres invisibles en total`)
console.log(`Suma de todas las \`description\`: ${filas.reduce((a, f) => a + f.lenD, 0).toLocaleString('es-CO')} car.`)
console.log(`Suma de todas las \`short_description\`: ${filas.reduce((a, f) => a + f.lenS, 0).toLocaleString('es-CO')} car.`)

await prisma.$disconnect()
