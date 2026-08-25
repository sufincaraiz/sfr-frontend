/**
 * LO QUE SE CALLA — hechos adversos conocidos y no publicados
 * ==========================================================
 *
 * Ciento y pico afirmaciones retiradas por prometer de más. Esta es la primera
 * pasada en la dirección contraria: **qué sabemos y no decimos**.
 *
 * Un hecho material adverso conocido y no publicado es peor que una promesa. La
 * promesa infla una expectativa; el silencio hace que alguien conduzca una hora
 * y media para descubrir en el sitio lo que estaba escrito en nuestra propia
 * base. Y en Colombia el vendedor responde por los vicios que conocía
 * (saneamiento por evicción y vicios redhibitorios, Código Civil arts. 1893 y
 * ss.): callarlos no es solo una mala práctica comercial.
 *
 * Tres clases de hallazgo, y son distintas:
 *
 *   A. En `mac_knowledge` hay un hecho adverso y la ficha no lo dice. El caso
 *      del relieve inclinado. Es el más claro: lo sabemos por escrito.
 *   B. La vereda tiene acceso difícil según `veredas-data.ts` y la ficha de una
 *      propiedad de esa vereda presume del acceso. Contradicción entre dos
 *      fuentes propias.
 *   C. La ficha se contradice a sí misma o calla un dato estructural: áreas
 *      imposibles, sin área, sin acceso ni servicios declarados.
 *
 *     node scripts/auditar-hechos-adversos.ts
 */

import { PrismaClient } from '@prisma/client'
import { norm, terminos, filtrarPorTerminos, puntuar } from '../src/lib/agent/busqueda-texto.ts'
import { getAllVeredasData } from '../src/lib/veredas-data.ts'

const prisma = new PrismaClient()

const ADVERSOS: Array<{ clase: string; re: RegExp }> = [
  { clase: 'relieve',        re: /\b(relieve inclinad\w*|pendiente pronunciad\w*|en ladera|inclinaci[oó]n del (terreno|predio)|desnivel\w*)\b/i },
  { clase: 'acceso',         re: /\b(v[ií]a destapad\w*|destapad\w*|4 ?x ?4|acceso dif[ií]cil|carreteable|en mal estado|sin pavimentar|placa huella)\b/i },
  { clase: 'servicio ausente', re: /\b(no (cuenta con|tiene|dispone)|carece de|sin (acueducto|energ[ií]a|gas|alcantarillado|internet|parqueadero)|no hay (agua|energ[ií]a|gas))\b/i },
  { clase: 'jurídico',       re: /\b(sucesi[oó]n|litigio|posesi[oó]n(?! inmediata)|mera tenencia|falsa tradici[oó]n|sin escritura|hipoteca|embargo|servidumbre)\b/i },
  { clase: 'restricción',    re: /\b(no se puede construir|restricci[oó]n de|[íi]ndice de ocupaci[oó]n|ronda h[ií]drica|zona de riesgo|deslizamiento|reserva forestal|no permite)\b/i },
  { clase: 'obra necesaria', re: /\b(obras de adecuaci[oó]n|requiere adecuaci[oó]n|necesita (obra|arreglo|reparaci[oó]n)|para remodelar|a rem odelar)\b/i },
]

const fichas = await prisma.property.findMany({
  where: { status: 'available' },
  select: {
    slug: true, title: true, short_description: true, description: true,
    meta_title: true, meta_description: true,
    area_lot_m2: true, area_built_m2: true, type: true,
    municipality: { select: { name: true } },
    vereda: { select: { name: true, slug: true } },
    features: { select: { feature_key: true, feature_value: true } },
  },
})

const textoDe = (f: (typeof fichas)[number]) => norm([
  f.title, f.short_description, f.description, f.meta_title, f.meta_description,
  ...f.features.map(x => `${x.feature_key} ${x.feature_value}`),
].filter(Boolean).join(' \n '))

let n = 0

// ── A. Adverso en el conocimiento, ausente en la ficha ──────────────────────
console.log('══ A · LO SABE MAC Y LA FICHA NO LO DICE ═══════════════════════════')
const CONECTORES_TITULO = new Set(['del', 'las', 'los', 'una', 'con', 'para', 'por', 'que',
  'proyecto', 'ubicacion', 'clima', 'amenidades', 'legal', 'construccion', 'servicios',
  'publicos', 'cierre', 'proximo', 'paso', 'oferta', 'precios'])

for (const k of await prisma.macKnowledge.findMany({ where: { activo: true }, select: { titulo: true, contenido: true } })) {
  const t = norm(k.titulo).split(/[^a-z0-9ñ]+/).filter(x => x.length >= 3 && !CONECTORES_TITULO.has(x))
  const cand = filtrarPorTerminos(fichas, t)[0]
  if (!cand || puntuar(cand, t) < 5) continue
  const publicado = textoDe(cand)
  for (const { clase, re } of ADVERSOS) {
    for (const frase of k.contenido.split(/(?<=[.!?\n])\s+/)) {
      const m = frase.match(re)
      if (!m) continue
      if (publicado.includes(norm(m[0]))) continue
      console.log(`\n  ⚠ [${clase}] ${cand.slug}`)
      console.log(`    conocimiento: «${frase.trim().replace(/\s+/g, ' ').slice(0, 140)}»`)
      n++
      break
    }
  }
}

// ── B. La vereda tiene acceso difícil y la ficha presume del acceso ─────────
console.log('\n\n══ B · LA VEREDA DICE UNA COSA Y LA FICHA OTRA ═════════════════════')
const veredas = getAllVeredasData()
const PRESUME = /\b(buenas v[ií]as|excelente acceso|f[aá]cil acceso|acceso inmejorable|v[ií]a pavimentada|apto para cualquier tipo de veh[ií]culo)\b/i
for (const f of fichas) {
  if (!f.vereda) continue
  const v = veredas.find(x => x.slug === f.vereda!.slug)
  if (!v) continue
  const dificil = /destapad|4 ?x ?4|mal estado|carreteable/i.test(v.acceso_vial)
  if (!dificil) continue
  const texto = [f.short_description, f.description].filter(Boolean).join(' ')
  const m = texto.match(PRESUME)
  if (!m) continue
  console.log(`\n  ⚠ ${f.slug}  (vereda ${v.name})`)
  console.log(`    la vereda: «${v.acceso_vial}»`)
  console.log(`    la ficha:  «…${m[0]}…»`)
  n++
}

// ── C. La ficha calla o contradice su propio dato estructural ──────────────
console.log('\n\n══ C · LA FICHA CALLA O SE CONTRADICE ══════════════════════════════')
for (const f of fichas) {
  const avisos: string[] = []
  if (f.area_lot_m2 === null && f.area_built_m2 === null) avisos.push('sin área declarada (ni lote ni construida)')
  if (f.area_lot_m2 !== null && f.area_built_m2 !== null && f.area_built_m2 > f.area_lot_m2) {
    avisos.push(`construida ${f.area_built_m2} m² > lote ${f.area_lot_m2} m² — imposible o mal capturado`)
  }
  if (f.area_lot_m2 !== null && f.area_lot_m2 < 40 && f.type !== 'apartamento') {
    avisos.push(`área de lote de ${f.area_lot_m2} m² para un ${f.type}: revisar folio`)
  }
  const texto = norm([f.short_description, f.description].filter(Boolean).join(' '))
  if (f.type !== 'apartamento' && !/acueducto|agua|energia|servicio/.test(texto)) {
    avisos.push('no menciona servicios públicos')
  }
  if (f.type !== 'apartamento' && !/acceso|via |vias |carretera|pavimentad|destapad/.test(texto)) {
    avisos.push('no menciona acceso vial')
  }
  if (!avisos.length) continue
  console.log(`\n  · ${f.slug}`)
  for (const a of avisos) console.log(`      ${a}`)
  n += avisos.length
}

console.log(`\n${'='.repeat(70)}`)
console.log(`${n} hallazgo(s) sobre ${fichas.length} fichas.`)
await prisma.$disconnect()
