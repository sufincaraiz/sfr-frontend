#!/usr/bin/env node
/**
 * LA NOVENA FORMA, RETIRADA DE LOS MUNICIPIOS
 * ===========================================
 *
 * La novena forma de esconderse: la afirmación se muda del inmueble al
 * municipio. «La Vega se ha consolidado como uno de los municipios con mayor
 * proyección para la inversión inmobiliaria por su rápida valorización» no
 * afirma nada sobre ningún bien concreto —así que ningún barrido sobre fichas
 * la alcanza— y el lector entiende exactamente lo mismo: que su lote sube.
 *
 * Esto RETIRA afirmaciones. NO reescribe: la reescritura de los cinco campos
 * de los ocho municipios está planificada aparte, con estructura propia.
 *
 *     node scripts/corregir-valorizacion-municipios.mjs           (dry-run)
 *     node scripts/corregir-valorizacion-municipios.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const CAMPOS = ['descripcion_seo', 'historia', 'clima', 'turismo', 'inversion']

/** slug → [[buscar, reemplazar, etiqueta]] sobre los campos de texto. */
const TEXTO = {
  'la-vega': [
    ['La Vega se ha consolidado como uno de los municipios con mayor proyección para la inversión inmobiliaria en Cundinamarca. Su ubicación, a poco más de una hora desde el occidente de Bogotá, su excelente clima y la creciente demanda de viviendas campestres han sostenido la demanda de vivienda campestre en el municipio.',
     'La Vega está a poco más de una hora del occidente de Bogotá y concentra buena parte de la oferta de vivienda campestre de la provincia del Gualivá.',
     'la-vega · «mayor proyección para la inversión» + demanda circular'],
    [' Los inmuebles con áreas entre 500 m² y 5.000 m² son especialmente apetecidos por familias e inversionistas que buscan calidad de vida y una inversión patrimonial de largo plazo.',
     ' Los inmuebles con áreas entre 500 m² y 5.000 m² son los más frecuentes en el catálogo del municipio.',
     'la-vega · «apetecidos» + «inversión patrimonial de largo plazo»'],
    ['\n\nInvertir en La Vega significa apostar por un municipio en permanente crecimiento, con una alta demanda de vivienda campestre, excelente conectividad con Bogotá y un entorno natural que continúa posicionándolo como uno de los lugares preferidos para vivir, descansar o desarrollar proyectos turísticos y de inversión en Cundinamarca.',
     '',
     'la-vega · párrafo de cierre entero: «permanente crecimiento», «alta demanda»'],
  ],
  'nimaima': [
    [' A 85 km de Bogotá, ofrece lotes y fincas a precios muy accesibles con alta proyección de valorización.',
     ' A 85 km de Bogotá, ofrece lotes y fincas a precios accesibles.',
     'nimaima · seo «alta proyección de valorización»'],
    ['han despertado un creciente interés por parte de inversionistas, familias y personas que desean adquirir',
     'atraen a inversionistas, familias y personas que desean adquirir',
     'nimaima · «creciente interés»'],
    ['\n\nPara quienes buscan una inversión con visión de largo plazo, Nimaima representa una oportunidad de adquirir propiedades en un municipio con amplio potencial de crecimiento, rodeado de naturaleza, con excelente calidad de vida y un mercado inmobiliario que continúa despertando el interés de compradores que valoran la tranquilidad, el espacio y el contacto con el entorno rural.',
     '',
     'nimaima · párrafo de cierre: «amplio potencial de crecimiento»'],
    ['lo convierten en un destino ideal para quienes buscan descansar, disfrutar del turismo de naturaleza o invertir en fincas, lotes y viviendas campestres en una de las regiones con mayor proyección del occidente de Cundinamarca.',
     'lo convierten en un destino para quienes buscan descansar, disfrutar del turismo de naturaleza o comprar fincas, lotes y viviendas campestres en el occidente de Cundinamarca.',
     'nimaima · historia «una de las regiones con mayor proyección»'],
  ],
  'nocaima': [
    ['\n\nInvertir en Nocaima significa apostar por un municipio con gran potencial de desarrollo, un entorno tranquilo y una creciente demanda de propiedades campestres. Ya sea para construir la casa de sus sueños, desarrollar un proyecto turístico o adquirir una finca con vocación productiva, Nocaima ofrece excelentes oportunidades para quienes buscan invertir con visión de futuro en una de las regiones más atractivas de Cundinamarca.',
     '',
     'nocaima · párrafo de cierre: «gran potencial de desarrollo», «creciente demanda»'],
  ],
  'san-francisco': [
    ['San Francisco se ha consolidado como uno de los municipios con mayor proyección para la inversión inmobiliaria en el occidente de Cundinamarca. Su cercanía',
     'San Francisco está en el occidente de Cundinamarca, en la provincia del Gualivá. Su cercanía',
     'san-francisco · «mayor proyección para la inversión inmobiliaria»'],
    ['Estas características han incrementado el interés de familias, inversionistas y desarrolladores que buscan propiedades con un alto potencial de desarrollo.',
     'Estas características interesan a familias, inversionistas y desarrolladores.',
     'san-francisco · «alto potencial de desarrollo»'],
    ['\n\nLa creciente demanda por espacios naturales, impulsada por la búsqueda de una mejor calidad de vida y el auge de las viviendas campestres, ha fortalecido el mercado inmobiliario de San Francisco. Su equilibrio entre tranquilidad, conectividad y riqueza ambiental favorece el desarrollo de proyectos residenciales, turísticos y agroecológicos con excelentes perspectivas a mediano y largo plazo.',
     '',
     'san-francisco · «ha fortalecido el mercado», «excelentes perspectivas a mediano y largo plazo»'],
    [', aumentando su atractivo para quienes desean invertir con visión de futuro.',
     '.',
     'san-francisco · «invertir con visión de futuro»'],
    ['\n\nInvertir en San Francisco significa apostar por un municipio que combina naturaleza, calidad de vida y oportunidades de crecimiento, ideal para construir un patrimonio sólido en una de las regiones más apetecidas para vivir y disfrutar del campo cerca de Bogotá.',
     '',
     'san-francisco · párrafo de cierre: «oportunidades de crecimiento», «patrimonio sólido»'],
    ['San Francisco se ha consolidado como un destino ideal para quienes buscan calidad de vida, tranquilidad e invertir en casas campestres, fincas y lotes con excelente proyección en Cundinamarca.',
     'San Francisco es un destino para quienes buscan calidad de vida, tranquilidad y vivienda campestre en Cundinamarca.',
     'san-francisco · clima «con excelente proyección»'],
  ],
  'sasaima': [
    [' ofrece inmuebles campestres a precios más accesibles que La Vega con excelente potencial de valorización.',
     ' ofrece inmuebles campestres a precios más accesibles que La Vega.',
     'sasaima · seo «excelente potencial de valorización»'],
    ['Sasaima se ha consolidado como una de las mejores opciones del occidente de Cundinamarca para quienes buscan calidad de vida, contacto con la naturaleza e invertir en casas campestres, fincas y lotes con gran potencial de desarrollo.',
     'Sasaima es una opción del occidente de Cundinamarca para quienes buscan calidad de vida, contacto con la naturaleza y vivienda campestre.',
     'sasaima · clima «mejores opciones» + «gran potencial de desarrollo»'],
    ['Sasaima se ha convertido en uno de los municipios con mayor potencial para la inversión inmobiliaria en el occidente de Cundinamarca. Su estratégica ubicación, la cercanía con Bogotá y el creciente interés por la vida campestre han impulsado la demanda de lotes, fincas y viviendas rurales, convirtiéndolo en una excelente alternativa para quienes buscan invertir con visión de largo plazo.',
     'Sasaima está en el occidente de Cundinamarca, cerca de Bogotá, y tiene oferta de lotes, fincas y viviendas rurales.',
     'sasaima · «mayor potencial», «han impulsado la demanda», «visión de largo plazo»'],
    ['permitiendo acceder a propiedades con amplios terrenos, excelentes condiciones naturales y un importante potencial para proyectos residenciales, turísticos y agropecuarios.',
     'permitiendo acceder a propiedades con amplios terrenos y buenas condiciones naturales para proyectos residenciales, turísticos y agropecuarios.',
     'sasaima · «importante potencial»'],
  ],
  'villeta': [
    ['Villeta se ha consolidado como uno de los mercados inmobiliarios más dinámicos del occidente de Cundinamarca, gracias a su reconocido atractivo turístico, su excelente conectividad con Bogotá y la creciente demanda de viviendas para descanso y alquiler vacacional.',
     'Villeta es el municipio de clima cálido con mayor actividad turística del Gualivá, bien conectado con Bogotá, con oferta de vivienda de descanso y de alquiler vacacional.',
     'villeta · «mercados más dinámicos» + «creciente demanda»'],
    [' Las propiedades destinadas al alojamiento turístico tienen una alta demanda durante fines de semana, puentes festivos y temporadas vacacionales, lo que convierte a Villeta en una alternativa atractiva para quienes desean combinar el disfrute de una segunda vivienda con la posibilidad de generar ingresos mediante alquileres de corta estancia.',
     ' Hay propiedades destinadas al alojamiento turístico, una modalidad frecuente en el municipio. El resultado de una operación de alquiler depende del inmueble, de su gestión y de las condiciones del mercado en cada momento.',
     'villeta · «alta demanda» + promesa de ingresos por alquiler'],
    ['han despertado un creciente interés por parte de inversionistas y desarrolladores, impulsados por la expansión del turismo, la consolidación de nuevos proyectos campestres y el auge de las plataformas de alojamiento vacacional.',
     'concentran proyectos campestres y alojamiento vacacional.',
     'villeta · «creciente interés» + «auge»'],
    ['Gracias a su clima cálido durante todo el año, su amplia infraestructura turística y su cercanía con Bogotá, Villeta continúa posicionándose como uno de los destinos más atractivos para invertir en finca raíz en Cundinamarca. Ya sea para',
     'Villeta tiene clima cálido durante todo el año, infraestructura turística y cercanía con Bogotá. Ya sea para',
     'villeta · «continúa posicionándose como uno de los destinos más atractivos para invertir»'],
    ['su amplia oferta de servicios la convierten en uno de los destinos más visitados del departamento y en un lugar ideal para vivir, disfrutar de una segunda vivienda o invertir en casas campestres, apartamentos, fincas y proyectos inmobiliarios con gran proyección.',
     'su amplia oferta de servicios la convierten en un destino frecuente para vivir, disfrutar de una segunda vivienda o comprar casas campestres, apartamentos y fincas.',
     'villeta · historia «gran proyección»'],
    ['Villeta se ha convertido en uno de los municipios más atractivos de Cundinamarca para vivir, disfrutar de una segunda vivienda o invertir en apartamentos, casas campestres, fincas y proyectos inmobiliarios con gran proyección.',
     'Villeta es un municipio de Cundinamarca para vivir, disfrutar de una segunda vivienda o comprar apartamentos, casas campestres y fincas.',
     'villeta · clima «gran proyección»'],
  ],
  'vergara': [
    ['Vergara se ha consolidado como una excelente alternativa para quienes buscan invertir en propiedades rurales de gran extensión en el occidente de Cundinamarca. Su vocación',
     'Vergara ofrece propiedades rurales de gran extensión en el occidente de Cundinamarca. Su vocación',
     'vergara · «se ha consolidado como una excelente alternativa»'],
    [' Esta dinámica representa una oportunidad para quienes desean invertir en un municipio con amplio potencial de crecimiento.',
     '',
     'vergara · «amplio potencial de crecimiento»'],
    ['\n\nInvertir en Vergara significa apostar por un municipio con amplias posibilidades de desarrollo, una sólida tradición agropecuaria y un mercado inmobiliario con oportunidades para quienes buscan construir patrimonio a largo plazo en una de las regiones rurales con mayor proyección del occidente de Cundinamarca.',
     '',
     'vergara · párrafo de cierre: «mayor proyección», «patrimonio a largo plazo»'],
  ],
}

/** slug → [[índice de faq, campo, buscar, reemplazar, etiqueta]] */
const FAQS = {
  'la-vega': [
    [0, 'answer',
     ' Las veredas más valorizadas son Bulucaima, Guarumal y La Alianza.', '',
     'la-vega · faq0 «las veredas más valorizadas» (ranking sin medición)'],
    [1, 'question',
     '¿Cuánto se valoriza una finca en La Vega por año?',
     '¿Por qué hay demanda de vivienda campestre en La Vega?',
     'la-vega · faq1 la PREGUNTA pedía una tasa que nadie midió'],
    [1, 'answer',
     'La Vega concentra demanda de vivienda campestre en finca raíz rural, impulsada por la doble calzada Bogotá-La Vega que redujo el trayecto a 90 minutos, el crecimiento del turismo campestre post-pandemia y la escasez de lotes con servicios públicos completos. Es la mayor tasa de valorización entre los municipios del Gualivá, Cundinamarca.',
     'Por la cercanía con Bogotá —60 km y 1 hora y 14 minutos desde el Portal 80, medido en automóvil el 19 de agosto de 2026—, el clima templado de 18 a 26 °C y la conexión por doble calzada. No publicamos tasas de valorización: estimar cuánto subirá de precio un inmueble es un avalúo, y en Colombia solo puede emitirlo un avaluador inscrito en el RAA (Ley 1673 de 2013).',
     'la-vega · faq1 «mayor tasa de valorización» + el «90 minutos» que sobrevivió a la medición'],
    [2, 'answer',
     'La Vega queda a 74 kilómetros de Bogotá por la Autopista Medellín (Ruta 62). Con la doble calzada Bogotá-La Vega, el trayecto toma aproximadamente 90 minutos en condiciones normales de tráfico y hasta 2 horas los fines de semana.',
     'La Vega queda a 60 kilómetros de Bogotá por la Autopista Medellín (Ruta 62). Medido en automóvil desde el Portal 80 el 19 de agosto de 2026: 1 hora y 14 minutos, por Puente El Cortijo, Siberia, La Punta y El Vino. Los fines de semana el trayecto puede ser mayor.',
     'la-vega · faq2 los 74 km / 90 min heredados, sustituidos por la medición'],
  ],
  'nimaima': [
    [0, 'answer',
     'Nimaima se distingue por su microclima excepcional y el menor precio por metro cuadrado entre los municipios del Gualivá. Con infraestructura básica completa y excelente conectividad, ofrece la mayor relación precio-valorización esperada de la región para inversores que compran antes del desarrollo masivo.',
     'Nimaima tiene clima templado de 20 a 28 °C, infraestructura básica y acceso por la vía del Gualivá. Su oferta son lotes y fincas de menor precio que los de La Vega y Villeta, en un municipio con poca construcción campestre.',
     'nimaima · faq0 «menor precio de la región» + «mayor relación precio-valorización esperada»'],
    [1, 'answer',
     ' Es el municipio del Gualivá con mayor diferencial precio-valor respecto a los municipios más desarrollados de la región.', '',
     'nimaima · faq1 «mayor diferencial precio-valor»'],
  ],
  'nocaima': [
    [0, 'answer',
     ' Su proximidad a La Vega y Villeta, con precios por debajo de los de esos municipios, lo hace atractivo para inversores que buscan tierra productiva con alta proyección de valorización.',
     ' Está cerca de La Vega y de Villeta, con precios por debajo de los de esos municipios.',
     'nocaima · faq0 «alta proyección de valorización»'],
  ],
  'quebradanegra': [
    [0, 'answer',
     'Quebradanegra destaca por su riqueza hídrica, el potencial de turismo ecológico y los precios más accesibles de la región. Su condición de municipio en desarrollo temprano lo convierte en una oportunidad de compra antes de la valorización masiva que ya experimentaron La Vega y Nocaima.',
     'Quebradanegra tiene riqueza hídrica, poca construcción campestre y los precios más bajos de nuestro catálogo en la provincia. Es un municipio de vocación agrícola y turismo incipiente.',
     'quebradanegra · faq0 «antes de la valorización masiva»'],
    [1, 'answer',
     ' Los lotes rurales con acceso a agua disponibles desde $30 millones son la oferta más demandada.',
     ' Hay lotes rurales con acceso a agua desde $30 millones.',
     'quebradanegra · faq1 «la oferta más demandada»'],
  ],
  'villeta': [
    [0, 'answer',
     ' Las propiedades con piscina tienen excelente rentabilidad como alquiler vacacional.', '',
     'villeta · faq0 «excelente rentabilidad como alquiler vacacional»'],
    [0, 'answer',
     ' los espectáculos naturales la hacen destino de alta demanda.',
     ' los espectáculos naturales la hacen un destino turístico frecuente.',
     'villeta · faq0 «destino de alta demanda»'],
    [1, 'answer',
     ' Las propiedades con piscina y acceso al río tienen precios más altos por su potencial de renta vacacional.',
     ' Las propiedades con piscina y acceso al río tienen precios más altos.',
     'villeta · faq1 «potencial de renta vacacional»'],
  ],
  'vergara': [
    [0, 'answer',
     ' Su creciente conectividad lo posiciona como frontera de expansión del mercado inmobiliario rural de Cundinamarca.', '',
     'vergara · faq0 «frontera de expansión del mercado»'],
  ],
}

let cambios = 0
const sinEncontrar = []

for (const slug of new Set([...Object.keys(TEXTO), ...Object.keys(FAQS)])) {
  const m = await prisma.municipality.findUnique({
    where: { slug },
    select: { id: true, descripcion_seo: true, historia: true, clima: true, turismo: true, inversion: true, faqs: true },
  })
  if (!m) { console.log(`\n### ❌ MUNICIPIO NO ENCONTRADO: ${slug}`); continue }
  console.log(`\n### ${slug}`)

  const data = {}

  for (const [buscar, reemplazar, etiqueta] of TEXTO[slug] ?? []) {
    const golpes = []
    for (const f of CAMPOS) {
      const actual = data[f] ?? m[f]
      if (typeof actual !== 'string' || !actual.includes(buscar)) continue
      data[f] = actual.split(buscar).join(reemplazar)
      golpes.push(f)
      cambios++
    }
    if (golpes.length) console.log(`  ✓ ${golpes.join(', ')} — ${etiqueta}`)
    else { console.log(`  ❌ NO ENCONTRADO — ${etiqueta}`); sinEncontrar.push(etiqueta) }
  }

  if (FAQS[slug]) {
    const faqs = JSON.parse(JSON.stringify(m.faqs ?? []))
    for (const [i, campo, buscar, reemplazar, etiqueta] of FAQS[slug]) {
      const actual = faqs[i]?.[campo]
      if (typeof actual !== 'string' || !actual.includes(buscar)) {
        console.log(`  ❌ NO ENCONTRADO — ${etiqueta}`); sinEncontrar.push(etiqueta); continue
      }
      faqs[i][campo] = actual.split(buscar).join(reemplazar)
      console.log(`  ✓ faq[${i}].${campo} — ${etiqueta}`)
      cambios++
    }
    data.faqs = faqs
  }

  if (APPLY && Object.keys(data).length) {
    await prisma.municipality.update({ where: { id: m.id }, data })
    console.log(`  → GUARDADO (${Object.keys(data).join(', ')})`)
  }
}

console.log('\n' + '='.repeat(60))
console.log(`Cambios: ${cambios} · Reglas sin encontrar: ${sinEncontrar.length}`)
if (sinEncontrar.length) sinEncontrar.forEach(s => console.log('  - ' + s))
console.log(APPLY ? 'APLICADO' : 'DRY-RUN — nada se escribió')
await prisma.$disconnect()
if (sinEncontrar.length) process.exit(1)
