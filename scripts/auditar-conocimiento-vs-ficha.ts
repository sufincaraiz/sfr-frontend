/**
 * QUÉ SABE MAC QUE LA FICHA NO PUBLICA
 * ====================================
 *
 * Toda esta semana fue en una dirección: retirar del sitio lo que no se podía
 * sostener. La auditoría de las diez preguntas encontró el caso contrario y es
 * el más valioso.
 *
 * A «¿cuál es la propiedad más barata?» Mac respondió que el lote de 500 m²
 * está «en el sector El Cucharal, a 8 minutos en carro del parque principal».
 * Parecía inventado. No lo era: está en `mac_knowledge`, escrito y verificado.
 * **La ficha es la que no lo dice.**
 *
 * Ese dato hoy solo alcanza a quien conversa con Mac. En la ficha alcanzaría
 * también a Google y a los motores generativos, que es justo lo que persigue
 * todo el trabajo de AEO.
 *
 * Esto compara cada entrada de conocimiento con la ficha de su propiedad y
 * lista lo que está en una y no en la otra. NO decide: el criterio de qué
 * publicar es del titular. Enumera candidatos.
 *
 *     node scripts/auditar-conocimiento-vs-ficha.ts
 */

import { PrismaClient } from '@prisma/client'
import { norm, terminos, filtrarPorTerminos, puntuar } from '../src/lib/agent/busqueda-texto.ts'

const prisma = new PrismaClient()

/** Para emparejar títulos: solo conectores, NUNCA palabras de tipo. */
const CONECTORES_TITULO = new Set([
  'del', 'las', 'los', 'una', 'unos', 'unas', 'con', 'para', 'por', 'que',
  'proyecto', 'ubicacion', 'clima', 'amenidades', 'legal', 'construccion',
  'servicios', 'publicos', 'cierre', 'proximo', 'paso', 'oferta', 'precios',
])

const fichas = await prisma.property.findMany({
  where: { status: 'available' },
  select: {
    slug: true, title: true, short_description: true, description: true,
    municipality: { select: { name: true } }, vereda: { select: { name: true } },
    features: { select: { feature_key: true, feature_value: true } },
  },
})

const entradas = await prisma.macKnowledge.findMany({
  where: { activo: true },
  select: { titulo: true, contenido: true },
  orderBy: { titulo: 'asc' },
})

/** Todo el texto publicado de una ficha, normalizado. */
function textoFicha(f: (typeof fichas)[number]): string {
  return norm([
    f.title, f.short_description, f.description,
    f.municipality?.name, f.vereda?.name,
    ...f.features.map(x => `${x.feature_key} ${x.feature_value}`),
  ].filter(Boolean).join(' \n '))
}

/**
 * Datos DUROS de una línea: cifras, medidas, tiempos, nombres propios. Son los
 * que valen la pena recuperar; la prosa comercial no.
 */
const DUROS = [
  { clase: 'sector / vereda',   re: /\b(?:sector|vereda|barrio|conjunto|condominio)\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]*(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]*)?/g },
  { clase: 'tiempo',            re: /\b\d+\s*(?:a\s*\d+\s*)?minutos?\b|\b\d+\s*h(?:oras?)?\b/gi },
  { clase: 'distancia',         re: /\b\d+[.,]?\d*\s*(?:km|kil[óo]metros?|metros?|m)\b/gi },
  { clase: 'área',              re: /\b\d+[.,]?\d*\s*(?:m2|m²|hect[áa]reas?)\b/gi },
  { clase: 'precio',            re: /\$\s?[\d.,]+(?:\s*(?:millones|COP))?/gi },
  { clase: 'norma / licencia',  re: /\b(?:licencia|resoluci[óo]n|matr[íi]cula|POT|EOT|RNSC|CAR)\b[^.\n]{0,60}/gi },
  { clase: 'servicio',          re: /\b(?:acueducto|energ[íi]a|gas|internet|fibra [óo]ptica|Starlink|pozo s[ée]ptico|alcantarillado)\b[^.\n]{0,40}/gi },
]

let totalRecuperables = 0

for (const k of entradas) {
  // Emparejar NO es lo mismo que buscar. `terminos` descarta las palabras de
  // tipo —«lote», «condominio», «finca»— porque en una consulta de cliente
  // sobran; pero los títulos de estas entradas SON nombres de propiedad y esas
  // palabras forman parte del nombre. Con el filtro puesto, «Lote campestre de
  // 500 m2» se quedaba en ["500"] y no emparejaba con nada — precisamente la
  // entrada que destapó todo esto.
  const t = norm(k.titulo)
    .split(/[^a-z0-9ñ]+/)
    .filter(x => x.length >= 3 && !CONECTORES_TITULO.has(x))
  const cand = filtrarPorTerminos(fichas, t)[0]
  const ficha = cand && puntuar(cand, t) >= 5 ? cand : null

  console.log(`\n${'='.repeat(76)}\n### ${k.titulo}`)
  if (!ficha) { console.log('   (sin ficha emparejable — se omite)'); continue }
  console.log(`   ficha: ${ficha.slug}`)

  const publicado = textoFicha(ficha)
  const hallazgos = []

  for (const { clase, re } of DUROS) {
    for (const bruto of k.contenido.match(re) ?? []) {
      const dato = bruto.trim().replace(/\s+/g, ' ')
      if (dato.length < 4) continue
      // ¿Aparece ya en la ficha? Se compara normalizado, sin tildes.
      if (publicado.includes(norm(dato))) continue
      hallazgos.push({ clase, dato })
    }
  }

  // Dedup por dato, conservando la clase.
  const vistos = new Set()
  const unicos = hallazgos.filter(h => !vistos.has(h.dato.toLowerCase()) && vistos.add(h.dato.toLowerCase()))

  if (unicos.length === 0) { console.log('   ✓ nada que la ficha no diga ya'); continue }
  totalRecuperables += unicos.length
  for (const h of unicos) {
    // Contexto: la frase donde aparece, para que se pueda juzgar si vale.
    const frase = k.contenido.split(/(?<=[.!?\n])\s+/).find(f => f.includes(h.dato))
    console.log(`   · [${h.clase}] ${h.dato}`)
    if (frase) console.log(`       «${frase.trim().replace(/\s+/g, ' ').slice(0, 150)}»`)
  }
}

console.log(`\n${'='.repeat(76)}`)
console.log(`${totalRecuperables} datos duros que Mac tiene y la ficha no publica.`)
await prisma.$disconnect()
