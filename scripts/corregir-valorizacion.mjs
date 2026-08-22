import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const FIELDS = ['title', 'short_description', 'description', 'meta_title', 'meta_description']

// slug -> [ [buscar, reemplazar, etiqueta] ]
const REGLAS = {
  'lote-lote-para-proyecto-alban-cundinamarca': [
    [' (Con un valor comercial estimado por encima de los $1.200.000.000)', '', 'ALBÁN · avalúo inventado — se retira sin sustituto'],
  ],
  'finca-casa-campestre-en-condominio-la-vega-cundinamarca': [
    [', la zona más exclusiva y de mayor valorización del municipio,', ',', 'Osaka · «zona más exclusiva y de mayor valorización»'],
    [', sumando un incalculable valor de casa en condominio con zonas comunes a la propiedad.', '.', 'Osaka · «incalculable valor»'],
  ],
  'condominio-finca-la-ceibita-guacamayas-la-vega-cundinamarca': [
    ['Ubicada en una de las zonas de mayor valorización Sector Asturias,', 'Ubicada en el Sector Asturias,', 'Ceibita · «una de las zonas de mayor valorización»'],
  ],
  'condominio-senderos-del-bosque-la-vega-cundinamarca': [
    ['Donde la naturaleza, la tranquilidad y la inversión inteligente se encuentran.', 'Donde la naturaleza y la tranquilidad se encuentran.', 'Senderos · «inversión inteligente»'],
    ['ubicado en La Vega, Cundinamarca, uno de los destinos con mayor proyección de valorización y calidad de vida de la región.', 'ubicado en La Vega, Cundinamarca.', 'Senderos · «mayor proyección de valorización»'],
    ['convirtiéndose en el lugar ideal para descansar, compartir en familia o desarrollar un patrimonio con gran potencial de crecimiento.', 'convirtiéndose en el lugar ideal para descansar o compartir en familia.', 'Senderos · «patrimonio con gran potencial de crecimiento»'],
    ['vivir con más paz, más naturaleza y la confianza de haber tomado una excelente decisión de inversión.', 'vivir con más paz y más naturaleza.', 'Senderos · «excelente decisión de inversión»'],
    ['Disfruta de naturaleza, clima privilegiado, paz y una inversión con gran potencial de valorización.', 'Naturaleza, clima cálido y paz a minutos del casco urbano.', 'Senderos · meta «gran potencial de valorización»'],
  ],
  'condominio-palo-de-agua-la-vega-cundinamarca': [
    ['Ubicación Estratégica e Inversión Segura', 'Ubicación', 'Palo de Agua · encabezado «Inversión Segura»'],
    ['La Vega se ha consolidado como uno de los municipios con mayor proyección para la inversión inmobiliaria por su rápida valorización y calidad de vida. ', '', 'Palo de Agua · NOVENA FORMA — la afirmación mudada al municipio'],
    ['Este terreno es un lienzo en blanco de topografía totalmente plana y suelo fértil, una característica altamente cotizada que facilita la construcción y reduce costos de obra.', 'Este terreno es un lienzo en blanco de topografía totalmente plana y suelo fértil.', 'Palo de Agua · «altamente cotizada» → el hecho, y punto'],
  ],
  'condominio-venta-de-lotes-planos-en-condominio-guadu-la-vega-la-vega-cundinamarca': [
    ['el equilibrio perfecto entre comodidad, naturaleza y proyección inmobiliaria en La Vega', 'el equilibrio perfecto entre comodidad y naturaleza en La Vega', 'Guadu · «proyección inmobiliaria»'],
    ['Topografía: Lotes totalmente planos, una característica altamente cotizada que optimiza los costos de construcción y permite diseñar espacios integrados que aprovechan al máximo las vistas panorámicas.', 'Topografía: Lotes totalmente planos.', 'Guadu · «altamente cotizada» → el hecho, y punto'],
  ],
  'casa-proyecto-cabanas-top-32-lotes-campestres-en-la-vega-la-vega-cundinamarca': [
    ['¡Tu Refugio y Negocio Rentable en La Vega!', '¡Tu Refugio en La Vega!', 'Cabañas Top 32 · «Negocio Rentable»'],
    ['Da el paso hacia una inversión inteligente y un estilo de vida rodeado de naturaleza.', 'Da el paso hacia un estilo de vida rodeado de naturaleza.', 'Cabañas Top 32 · «inversión inteligente»'],
    [' El Sector Cucharal tiene demanda de alquiler vacacional.', '', 'Cabañas Top 32 · «demanda de alquiler vacacional»'],
    ['Invierte en Cabañas Top 32, Sector Cucharal, La Vega. Lote de 500m2 + cabaña de 32m2 desde $285M.', 'Cabañas Top 32, Sector Cucharal, La Vega. Lote de 500 m² + cabaña de 32 m² desde $285M.', 'Cabañas Top 32 · meta «Invierte en»'],
  ],
  'apartamento-venta-de-apartamento-de-94m-en-el-mirador-la-vega-la-vega-cundinamarca': [
    ['Diseñado para quienes buscan confort, modernidad y una excelente rentabilidad,', 'Diseñado para quienes buscan confort y modernidad,', 'Apto 94 m² · «una excelente rentabilidad»'],
  ],
  'casa-se-vende-casa-lote-urbano-san-francisco-cundinamarca': [
    ['473m², 2 niveles y apartaestudio rentable. Excelente inversión.', '473 m², dos niveles y apartaestudio independiente.', 'San Francisco · meta «rentable / Excelente inversión»'],
  ],
  'condominio-condominio-bella-vista-la-vega-cundinamarca-la-vega-cundinamarca': [
    ['Valor de Inversión: $980.000.000 COP', 'Precio: $980.000.000 COP', 'Bella Vista · «Valor de Inversión» → «Precio»'],
  ],
}

let totalCambios = 0
const sinTocar = []

for (const [slug, reglas] of Object.entries(REGLAS)) {
  const p = await prisma.property.findUnique({
    where: { slug },
    select: { id: true, title: true, short_description: true, description: true, meta_title: true, meta_description: true },
  })
  if (!p) { console.log(`\n### ❌ SLUG NO ENCONTRADO: ${slug}`); continue }

  console.log(`\n### ${slug}`)
  const nuevo = {}
  for (const f of FIELDS) nuevo[f] = p[f]

  for (const [buscar, reemplazar, etiqueta] of reglas) {
    const golpes = []
    for (const f of FIELDS) {
      if (typeof nuevo[f] !== 'string') continue
      if (!nuevo[f].includes(buscar)) continue
      const n = nuevo[f].split(buscar).length - 1
      nuevo[f] = nuevo[f].split(buscar).join(reemplazar)
      golpes.push(`${f}${n > 1 ? ` ×${n}` : ''}`)
      totalCambios += n
    }
    if (golpes.length === 0) { console.log(`  ❌ NO ENCONTRADO — ${etiqueta}`); sinTocar.push(etiqueta) }
    else console.log(`  ✓ ${golpes.join(', ')} — ${etiqueta}`)
  }

  const diff = {}
  for (const f of FIELDS) if (nuevo[f] !== p[f]) diff[f] = nuevo[f]
  if (Object.keys(diff).length && APPLY) {
    await prisma.property.update({ where: { id: p.id }, data: diff })
    console.log(`  → GUARDADO (${Object.keys(diff).join(', ')})`)
  }
}

console.log(`\n${'='.repeat(60)}`)
console.log(`Reemplazos: ${totalCambios} · Reglas sin encontrar: ${sinTocar.length}`)
if (sinTocar.length) { console.log('SIN ENCONTRAR:'); sinTocar.forEach(s => console.log('  - ' + s)) }
console.log(APPLY ? 'APLICADO' : 'DRY-RUN — nada se escribió')
await prisma.$disconnect()
if (sinTocar.length) process.exit(1)
