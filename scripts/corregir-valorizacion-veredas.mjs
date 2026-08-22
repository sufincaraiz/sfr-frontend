#!/usr/bin/env node
/**
 * LA NOVENA FORMA, RETIRADA DE LAS VEREDAS
 * ========================================
 *
 * `veredas-data.ts` tiene un campo llamado `valorizacion`: el nombre del campo
 * ES la novena forma. Su propósito declarado era afirmar plusvalía futura por
 * vereda, y la plantilla lo remataba con un encabezado en forma de pregunta
 * —«¿Qué potencial de valorización tiene la vereda X?»— que es el sitio más
 * citable de la página.
 *
 * Esto RETIRA afirmaciones y deja los hechos que sobreviven. NO reescribe el
 * archivo: la reescritura de veredas es otro trabajo.
 *
 * Además del campo, la misma afirmación vivía en `ventajas`, en
 * `descripcion_seo` y en las FAQ de la propia vereda —doctrina §7: la
 * corrección anterior retiró «retornos superiores al 13 % anual» del campo
 * `valorizacion` de Guarumal y dejó vivo, en la FAQ de al lado, «recuperar la
 * inversión en plazos de 8 a 12 años» y «600.000 a 1.200.000 pesos por noche»—.
 *
 *     node scripts/corregir-valorizacion-veredas.mjs           (dry-run)
 *     node scripts/corregir-valorizacion-veredas.mjs --apply
 */

import fs from 'node:fs'

const APPLY = process.argv.includes('--apply')
const F = 'src/lib/veredas-data.ts'
const P = 'src/app/veredas/[slug]/page.tsx'

/** [archivo, buscar, reemplazar, etiqueta] */
const REGLAS = [
  // ── El encabezado de la plantilla: la pregunta presupone la respuesta ──────
  [P,
   '<InfoSection title={`¿Qué potencial de valorización tiene la vereda ${v.name}?`} icon={<TrendingUp size={19} />} accent>',
   '<InfoSection title={`¿Qué hay que saber del mercado en la vereda ${v.name}?`} icon={<MapPin size={19} />} accent>',
   'plantilla · el encabezado preguntaba por el potencial de valorización'],

  // ── Los once bloques `valorizacion` ───────────────────────────────────────
  [F,
   `      'Bulucaima es una de las veredas con mayor demanda de finca raíz del ' +\n      'Gualivá. La consolidación de condominios campestres como Altos de Bulucaima y la ' +\n      'llegada de compradores del norte de Bogotá han impulsado los precios de lotes ' +\n      'de 1.000 m² por encima de los 180 millones de pesos. Las fincas de recreo con ' +\n      'piscina y casa registran tiempos de venta inferiores a 45 días, reflejo de una ' +\n      'demanda que supera ampliamente la oferta disponible.',`,
   `      'En Bulucaima están consolidados condominios campestres como Altos de ' +\n      'Bulucaima. Los lotes de 1.000 m² de la vereda se ofrecen por encima de los ' +\n      '180 millones de pesos.',`,
   'bulucaima · «mayor demanda del Gualivá», «45 días», «supera la oferta»'],

  [F,
   `      'El Cural sostiene una demanda constante, impulsada por el auge del ' +\n      'agroturismo y el interés en fincas productivas con agua propia. ' +\n      'Las propiedades con cultivos establecidos de café o aguacate tienen mayor ' +\n      'liquidez por el interés de inversionistas del sector agroalimentario. ' +\n      'Los lotes de más de 5.000 m² con acceso a quebrada representan la mejor ' +\n      'relación precio-retorno de toda la jurisdicción de La Vega.',`,
   `      'El Cural es zona de fincas productivas con cultivos establecidos de café ' +\n      'y aguacate, y varias tienen agua propia. Hay lotes de más de 5.000 m² con ' +\n      'acceso a quebrada.',`,
   'el-cural · «demanda constante», «mayor liquidez», «mejor relación precio-retorno»'],

  [F,
   `      'San Juan está en la fase inicial de valorización acelerada. Los precios ' +\n      'siguen por debajo de los de Bulucaima para lotes equivalentes. La mejora ' +\n      'progresiva de la vía de acceso y el desplazamiento de la demanda desde ' +\n      'veredas más consolidadas, como Chicalá y Bulucaima, sostienen el interés ' +\n      'por la zona.',`,
   `      'Los lotes de San Juan se ofrecen por debajo de los de Bulucaima para áreas ' +\n      'equivalentes. La vía de acceso ha ido mejorando.',`,
   'san-juan · «fase inicial de valorización acelerada»'],

  [F,
   `      'Tabacal es la apuesta a largo plazo más interesante de La Vega. Los precios ' +\n      'actuales son los más bajos de las veredas cercanas al casco urbano, pero ' +\n      'la pavimentación de la vía está contemplada en el Plan de Desarrollo ' +\n      'Municipal 2024–2027, y de ejecutarse cambiaría su accesibilidad. Es una ' +\n      'obra prevista, no ejecutada: el efecto sobre los precios dependerá de que ' +\n      'se realice y de cuándo.',`,
   `      'Los precios en Tabacal son los más bajos de las veredas cercanas al casco ' +\n      'urbano. La pavimentación de la vía está contemplada en el Plan de ' +\n      'Desarrollo Municipal 2024–2027, y de ejecutarse cambiaría su ' +\n      'accesibilidad. Es una obra prevista, no ejecutada: el efecto sobre los ' +\n      'precios dependerá de que se realice y de cuándo.',`,
   'tabacal · «la apuesta a largo plazo más interesante» (el resto ya estaba bien)'],

  [F,
   `      'La Alianza se ha beneficiado del rebose de demanda desde veredas más ' +\n      'saturadas. Con vía pavimentada ya establecida, sus fundamentos de ' +\n      'valorización son sólidos y sostenibles. ' +\n      'Los lotes de menos de 150 millones con escritura y sin problemas ' +\n      'jurídicos tienen alta rotación entre compradores de primera finca.',`,
   `      'La Alianza tiene vía pavimentada. Hay lotes por debajo de 150 millones ' +\n      'con escritura y sin problemas jurídicos.',`,
   'la-alianza · «rebose de demanda», «fundamentos sólidos y sostenibles», «alta rotación»'],

  [F,
   `      'El Rosario ha seguido la tendencia positiva de toda La Vega con ' +\n      'valorización sostenida. La topografía plana reduce los costos de ' +\n      'construcción frente a las veredas con pendientes pronunciadas. Los proyectos ' +\n      'de parcelación activos en la vereda están generando una revalorización ' +\n      'acelerada del suelo rural.',`,
   `      'La topografía de El Rosario es plana. Hay proyectos de parcelación activos ' +\n      'en la vereda.',`,
   'el-rosario · «tendencia positiva», «revalorización acelerada»'],

  [F,
   `      'Laureles representa la inversión más orientada a la naturaleza en La Vega. ' +\n      'Los precios son moderados hoy pero el interés creciente por el turismo de ' +\n      'naturaleza y las fincas eco-lodge está generando una demanda nueva de ' +\n      'compradores con perfil ambiental, y el ecoturismo sigue consolidándose ' +\n      'en el Gualivá.',`,
   `      'Laureles tiene bosque nativo, agua permanente y clima fresco. El POT de ' +\n      'La Vega permite allí desarrollos de ecoturismo en áreas rurales, con ' +\n      'restricciones de densidad y licencia ambiental ante la CAR Cundinamarca.',`,
   'laureles · «la inversión más orientada a la naturaleza», «demanda nueva»'],

  [F,
   `      'La Libertad es la inversión de mayor horizonte temporal en La Vega. ' +\n      'La valorización es más lenta que en veredas bajas, pero sostenida por ' +\n      'la escasez de tierras a esta altitud y el creciente interés en proyectos ' +\n      'de conservación privada y pago por servicios ambientales. El gobierno ' +\n      'colombiano reconoce como reservas naturales privadas (RNSC) que generan ' +\n      'beneficios tributarios y pueden obtener compensaciones por conservación.',`,
   `      'El Estado colombiano reconoce las Reservas Naturales de la Sociedad Civil ' +\n      '(RNSC). Registrar un predio como RNSC da acceso a beneficios tributarios y ' +\n      'permite optar a compensaciones por conservación.',`,
   'la-libertad · «la inversión de mayor horizonte», «valorización sostenida»'],

  [F,
   `      'Guarumal combina proximidad al casco urbano, vía pavimentada y demanda de ' +\n      'alquiler vacacional, sobre todo en las casas con piscina, que se ocupan ' +\n      'principalmente los fines de semana. Cuánto rinda un predio concreto depende de ' +\n      'su estado, su ubicación dentro de la vereda y las condiciones del mercado en ' +\n      'cada momento.',`,
   `      'Guarumal está cerca del casco urbano y tiene vía pavimentada. Hay casas ' +\n      'con piscina que se alquilan por temporadas, sobre todo los fines de ' +\n      'semana. Cuánto rinda un predio concreto depende de su estado, su ubicación ' +\n      'dentro de la vereda y las condiciones del mercado en cada momento.',`,
   'guarumal · «demanda de alquiler vacacional»'],

  [F,
   `      'Cacahual está beneficiándose de la demanda residual de La Vega y de la ' +\n      'llegada de inversionistas del sector agrícola. Las fincas productivas con ' +\n      'cultivos de aguacate Hass han demostrado retornos combinados superiores ' +\n      'la valorización del predio con el ingreso del cultivo. El resultado depende ' +\n      'del manejo agrícola y de las condiciones del mercado en cada momento.',`,
   `      'En Cacahual hay fincas productivas con cultivos de aguacate Hass y ' +\n      'cítricos. El resultado de un cultivo depende del manejo agrícola y de las ' +\n      'condiciones del mercado en cada momento.',`,
   'cacahual · «demanda residual», «han demostrado retornos combinados»'],

  [F,
   `      'Chupal es para el inversionista con paciencia y visión ambiental. ' +\n      'Los precios son los más bajos de La Vega por el acceso difícil, pero ' +\n      'el escenario de mayor retorno es el proyecto de conservación privada: ' +\n      'registrar el predio como RNSC genera beneficios fiscales y puede ' +\n      'recibir compensaciones de la CAR por servicios ambientales. A medida ' +\n      'que el mercado de carbono voluntario crezca en Colombia, estas tierras ' +\n      'tendrán un valor adicional significativo.',`,
   `      'El acceso a Chupal es difícil, y eso se refleja en el precio: son los más ' +\n      'bajos de La Vega. Registrar el predio como Reserva Natural de la Sociedad ' +\n      'Civil (RNSC) da acceso a beneficios fiscales y permite optar a ' +\n      'compensaciones de la CAR por servicios ambientales.',`,
   'chupal · «mayor retorno» y la predicción del mercado de carbono'],

  // ── La misma afirmación en `ventajas` ─────────────────────────────────────
  [F, `      'Zona de alta valorización con demanda activa de compradores',`,
      `      'Varios condominios campestres consolidados en la vereda',`,
      'bulucaima · ventaja «alta valorización con demanda activa»'],
  [F, `      'Tierras vírgenes con alta potencial para proyectos de conservación',`,
      `      'Predios con bosque nativo aptos para proyectos de conservación',`,
      'la-libertad · ventaja «alta potencial»'],
  [F, `      'Zona de reserva natural con restricciones que protegen el valor del suelo',`,
      `      'Zona de reserva natural con restricciones de uso del suelo',`,
      'la-libertad · ventaja «protegen el valor del suelo»'],
  [F, `      'Alta demanda de alquiler vacacional por la accesibilidad',`,
      `      'Casas con piscina que se alquilan por temporadas',`,
      'guarumal · ventaja «alta demanda de alquiler vacacional»'],

  // ── Y en `descripcion_seo` ────────────────────────────────────────────────
  [F, `      'naturaleza y una alta demanda inmobiliaria sostenida.',`,
      `      'naturaleza y servicios completos.',`,
      'bulucaima · seo «alta demanda inmobiliaria sostenida»'],
  [F, `      'de gran extensión a precios competitivos, es la opción favorita para ' +\n      'quienes buscan finca raíz de inversión agroproductiva.',`,
      `      'de gran extensión a precios competitivos, es una opción para quienes ' +\n      'buscan finca raíz agroproductiva.',`,
      'el-cural · seo «la opción favorita»'],
  [F, `      '2 horas de Bogotá. Sus tierras ofrecen una oportunidad de inversión ' +\n      'única en el Gualivá.',`,
      `      '2 horas de Bogotá.',`,
      'tabacal · seo «oportunidad de inversión única»'],
  [F, `      'a precios imbatibles para quienes tienen visión de largo plazo.',`,
      `      'a los precios por metro cuadrado más bajos de La Vega.',`,
      'la-libertad · seo «precios imbatibles», «visión de largo plazo»'],

  // ── Y en las FAQ de la propia vereda (doctrina §7: el mismo lote) ─────────
  [F, `        pregunta: '¿Qué tan buena es la inversión en fincas productivas en El Cural?',`,
      `        pregunta: '¿Qué se produce en las fincas de El Cural?',`,
      'el-cural · faq, la pregunta pedía un juicio de inversión'],
  [F, `        respuesta: 'El Cural produce café especial, y las fincas de la vereda combinan la valorización del predio con el ingreso agrícola. El agroturismo cafetero añade una tercera vía de ingreso a quienes abren su finca a visitantes. El rendimiento concreto depende del predio, del manejo del cultivo y de las condiciones del mercado en cada momento.',`,
      `        respuesta: 'El Cural produce café especial. El agroturismo cafetero es una vía de ingreso adicional para quienes abren su finca a visitantes. El rendimiento concreto depende del predio, del manejo del cultivo y de las condiciones del mercado en cada momento.',`,
      'el-cural · faq «combinan la valorización del predio con el ingreso agrícola»'],
  [F, `        pregunta: '¿Es segura la inversión en Tabacal dado que la vía no está pavimentada?',`,
      `        pregunta: '¿Cómo influye en el precio que la vía de Tabacal no esté pavimentada?',`,
      'tabacal · faq, la pregunta pedía una garantía de seguridad de la inversión'],
  [F, `pueden superar los 600 millones, y tienen alta valorización por el turismo de naturaleza que busca estos ambientes únicos.',`,
      `pueden superar los 600 millones.',`,
      'laureles · faq «alta valorización por el turismo de naturaleza»'],
  [F, ` Una inversión a 5 años con proyección excelente.',`,
      `',`,
      'la-libertad · faq «una inversión a 5 años con proyección excelente»'],
  [F, ` Las casas con piscina en Guarumal generan ingresos de 600.000 a 1.200.000 pesos por noche en temporada alta.',`,
      `',`,
      'guarumal · faq, cifras de ingreso por noche sin fuente'],
  [F, ` El retorno por alquiler vacacional permite recuperar la inversión en plazos de 8 a 12 años, un indicador muy favorable en finca raíz.',`,
      `',`,
      'guarumal · faq «recuperar la inversión en 8 a 12 años» — sobrevivió a la corrección anterior'],
]

const archivos = {}
const leer = f => (archivos[f] ??= fs.readFileSync(f, 'utf8'))

let cambios = 0
const sinEncontrar = []

for (const [archivo, buscar, reemplazar, etiqueta] of REGLAS) {
  const actual = leer(archivo)
  if (!actual.includes(buscar)) {
    console.log(`  ❌ NO ENCONTRADO — ${etiqueta}`)
    sinEncontrar.push(etiqueta)
    continue
  }
  archivos[archivo] = actual.split(buscar).join(reemplazar)
  console.log(`  ✓ ${etiqueta}`)
  cambios++
}

console.log('\n' + '='.repeat(60))
console.log(`Cambios: ${cambios} · Reglas sin encontrar: ${sinEncontrar.length}`)

if (sinEncontrar.length) {
  console.log('DRY-RUN ABORTADO: hay reglas sin encontrar.')
  process.exit(1)
}

if (APPLY) {
  for (const [f, contenido] of Object.entries(archivos)) fs.writeFileSync(f, contenido)
  console.log('APLICADO a: ' + Object.keys(archivos).join(', '))
} else {
  console.log('DRY-RUN — nada se escribió')
}
