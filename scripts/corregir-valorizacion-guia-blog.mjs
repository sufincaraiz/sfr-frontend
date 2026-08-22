#!/usr/bin/env node
/**
 * VALOR FUTURO EN LA GUÍA Y EN EL BLOG
 * ====================================
 *
 * Las dos superficies que quedaban del barrido del 22/08/2026:
 *
 *  - `guia-inversion/page.tsx`: «la demanda de alquileres vacacionales supera a
 *    la oferta publicada» —nadie contó ninguna de las dos— y «terrenos
 *    urbanizados con proyección».
 *
 *  - El artículo «Cumpleaños de Cundinamarca»: diez afirmaciones, incluida la
 *    más categórica de todo el sitio, «invertir en finca raíz siempre ha sido
 *    una de las formas más seguras de construir patrimonio», que es consejo de
 *    inversión y no información inmobiliaria.
 *
 * Los otros dos artículos del blog («¿Dónde invertir en 2026?» y «Posesión
 * inmediata vs mera tenencia») se revisaron y NO se tocan: dicen expresamente
 * «estos proyectos no significan que una propiedad vaya a valorizarse» y
 * «hablar de potencial de inversión es más responsable que prometer
 * rentabilidad». Son la doctrina aplicada, no el problema.
 *
 *     node scripts/corregir-valorizacion-guia-blog.mjs           (dry-run)
 *     node scripts/corregir-valorizacion-guia-blog.mjs --apply
 */

import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

// ── 1. La guía ───────────────────────────────────────────────────────────────
const GUIA = 'src/app/guia-inversion/page.tsx'

const REGLAS_GUIA = [
  ['La demanda de alquileres vacacionales de corta estancia en la región supera a la oferta publicada, lo que sostiene el interés por las propiedades de descanso. La rentabilidad de cada inmueble depende de su ubicación, su estado y las condiciones del mercado en cada momento.',
   'En la región hay propiedades de descanso que se alquilan por temporadas cortas, sobre todo fines de semana y puentes festivos. Cuánto rinda un inmueble concreto depende de su ubicación, su estado y las condiciones del mercado en cada momento: no publicamos cifras de ocupación ni de rentabilidad porque no las hemos medido.',
   'guía · «supera a la oferta publicada» — nadie contó ninguna de las dos'],
  ['Nos enfocamos en terrenos urbanizados con proyección y seguridad. Proyectos estructurados con visión, como Senderos del Bosque o la Parcelación Cucharal, representan el estándar de lo que un inversionista debe buscar: vías, servicios y proyecciones arquitectónicas claras.',
   'Nos enfocamos en terrenos urbanizados con documentación en regla. Proyectos como Senderos del Bosque o la Parcelación Cucharal muestran lo que conviene revisar en un lote: vías de acceso, viabilidad de servicios públicos, matrícula independiente y licencia de urbanismo.',
   'guía · «terrenos con proyección», «el estándar que un inversionista debe buscar»'],
]

// ── 2. El artículo ───────────────────────────────────────────────────────────
const SLUG_ARTICULO = 'cumpleanos-de-cundinamarca'

const REGLAS_BLOG = [
  ['**Cumpleaños de Cundinamarca: historia, evolución y el enorme potencial inmobiliario de la región Gualivá**',
   '**Cumpleaños de Cundinamarca: historia y evolución de la región Gualivá**',
   'blog · titular «el enorme potencial inmobiliario»'],
  ['Esta transformación ha impulsado la valorización de numerosas zonas rurales y campestres. Lo que antes',
   'Lo que antes',
   'blog · «ha impulsado la valorización de numerosas zonas»'],
  ['ver el verdadero potencial de cada montaña y cada valle antes de tomar una decisión.',
   'ver cada montaña y cada valle antes de tomar una decisión.',
   'blog · «el verdadero potencial de cada montaña»'],
  ['la cercanía con Bogotá la convierten en una de las zonas con mayor potencial de crecimiento.',
   'la cercanía con Bogotá explican ese interés.',
   'blog · «una de las zonas con mayor potencial de crecimiento»'],
  ['La Vega se ha consolidado como uno de los destinos favoritos para construir casas campestres, desarrollar condominios y adquirir lotes con alta proyección de valorización.',
   'La Vega concentra buena parte de la oferta de casas campestres, condominios y lotes de la provincia.',
   'blog · «alta proyección de valorización»'],
  ['ofrece un gran potencial para desarrollos turísticos y propiedades destinadas al alquiler vacacional.',
   'tiene desarrollos turísticos y propiedades destinadas al alquiler vacacional.',
   'blog · Nimaima «gran potencial»'],
  ['Su riqueza ambiental y la tranquilidad de sus paisajes representan una oportunidad inmejorable para quienes desean invertir pensando en el crecimiento a futuro.',
   'Su riqueza ambiental y la tranquilidad de sus paisajes lo hacen atractivo para vivienda de descanso.',
   'blog · San Francisco «oportunidad inmejorable», «crecimiento a futuro»'],
  ['Crecimiento exponencial del turismo nacional y ecológico.',
   'Presencia creciente de turismo nacional y ecológico en la región.',
   'blog · «crecimiento exponencial» sin medición'],
  ['Alta demanda de viviendas de descanso para fines de semana.',
   'Viviendas de descanso usadas principalmente los fines de semana.',
   'blog · «alta demanda»'],
  ['Fuerte potencial de valorización en municipios estratégicos cercanos a Bogotá.',
   'Municipios cercanos a Bogotá con acceso por doble calzada.',
   'blog · «fuerte potencial de valorización»'],
  ['Dentro de toda la región Gualivá, La Vega se destaca como uno de los municipios con mayor proyección inmobiliaria. Su cercanía con Bogotá, el clima privilegiado, la amplia oferta turística y el crecimiento de proyectos campestres la convierten en un destino sumamente atractivo para inversionistas nacionales e internacionales.',
   'Dentro de la región Gualivá, La Vega es el municipio con más oferta inmobiliaria campestre. Su cercanía con Bogotá, su clima templado y su oferta turística explican esa concentración.',
   'blog · «mayor proyección inmobiliaria»'],
  ['Invertir en finca raíz siempre ha sido una de las formas más seguras de construir patrimonio. Cuando esa inversión se realiza en territorios con crecimiento sostenido, desarrollo turístico y excelente ubicación, las oportunidades aumentan considerablemente. La región Gualivá reúne precisamente estas condiciones: naturaleza, conectividad, calidad de vida y un mercado inmobiliario en constante evolución.',
   'No podemos decirle a nadie si comprar finca raíz es una buena inversión: eso depende de su situación, del predio concreto y del momento del mercado, y aconsejarlo es trabajo de un asesor financiero habilitado. Lo que sí podemos describir es el territorio: naturaleza, conectividad con Bogotá, oferta turística y qué revisar antes de comprar en cada municipio.',
   'blog · «invertir en finca raíz SIEMPRE ha sido una de las formas más seguras» — consejo de inversión'],
]

let cambios = 0
const sinEncontrar = []

console.log('### guia-inversion')
let guia = fs.readFileSync(GUIA, 'utf8')
for (const [buscar, reemplazar, etiqueta] of REGLAS_GUIA) {
  if (!guia.includes(buscar)) { console.log(`  ❌ NO ENCONTRADO — ${etiqueta}`); sinEncontrar.push(etiqueta); continue }
  guia = guia.split(buscar).join(reemplazar)
  console.log(`  ✓ ${etiqueta}`); cambios++
}

console.log('\n### blog: cumpleaños de Cundinamarca')
const art = await prisma.article.findFirst({ where: { slug: { contains: SLUG_ARTICULO } }, select: { id: true, title: true, content: true } })
if (!art) { console.log('  ❌ ARTÍCULO NO ENCONTRADO'); process.exit(1) }
let contenido = art.content
for (const [buscar, reemplazar, etiqueta] of REGLAS_BLOG) {
  if (!contenido.includes(buscar)) { console.log(`  ❌ NO ENCONTRADO — ${etiqueta}`); sinEncontrar.push(etiqueta); continue }
  contenido = contenido.split(buscar).join(reemplazar)
  console.log(`  ✓ ${etiqueta}`); cambios++
}

console.log('\n' + '='.repeat(60))
console.log(`Cambios: ${cambios} · Reglas sin encontrar: ${sinEncontrar.length}`)
if (sinEncontrar.length) { console.log('ABORTADO'); await prisma.$disconnect(); process.exit(1) }

if (APPLY) {
  fs.writeFileSync(GUIA, guia)
  await prisma.article.update({ where: { id: art.id }, data: { content: contenido } })
  console.log('APLICADO')
} else console.log('DRY-RUN — nada se escribió')

await prisma.$disconnect()
