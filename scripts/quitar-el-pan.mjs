#!/usr/bin/env node
/**
 * QUITAR EL PAN DEL SÁNDWICH
 * ==========================
 *
 * La auditoría de §12 encontró que los cuerpos de `turismo` e `historia` son
 * buenos —fechados, con nombres propios, citables— y que los defectos se
 * concentran en la PRIMERA y la ÚLTIMA frase: un ranking para abrir, una
 * llamada a invertir para cerrar.
 *
 * Esto retira exactamente eso en los cinco municipios con cuerpo bueno, y no
 * toca el cuerpo. Más las tres contradicciones (g).
 *
 * SAN FRANCISCO Y VERGARA no se parchean: su `historia` no contiene historia
 * —ni una fecha, ni un nombre— y retirando las afirmaciones queda relleno. Se
 * VACÍAN. Un campo vacío no dice nada falso y no ocupa espacio citable con
 * prosa genérica; el titular los escribirá con hechos reales.
 *
 * EL FUNDADOR DE LA VEGA queda sin nombre y sin fecha exacta: el campo
 * publicaba «Alonso Vásquez de Cisneros, 3 de junio de 1605» y el traspaso
 * tenía anotado «Juan de Borja, sin confirmar». Son dos nombres para el mismo
 * hecho y no podemos distinguirlos. Sasaima, igual: declaraba EL MISMO DÍA y el
 * MISMO oidor que La Vega. Nocaima se queda con su 8 de junio: es coherente y
 * distinto.
 *
 *     node scripts/quitar-el-pan.mjs           (dry-run)
 *     node scripts/quitar-el-pan.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

/** slug → [[campo, buscar, reemplazar, etiqueta]] */
const REGLAS = {
  'la-vega': [
    ['turismo',
     'La Vega se ha consolidado como uno de los destinos turísticos más atractivos de Cundinamarca gracias a su excelente clima, su riqueza natural y su cercanía con Bogotá. Cada fin de semana, miles de visitantes llegan al municipio para disfrutar de experiencias de ecoturismo, turismo de naturaleza, gastronomía y descanso, convirtiéndolo en un importante motor económico de la región.',
     'La Vega recibe visitantes de Bogotá cada fin de semana, que llegan por su clima cálido, sus ríos y su oferta gastronómica.',
     'apertura: «más atractivos», «miles de visitantes», «motor económico»'],
    ['turismo',
     'su tradicional mercado campesino dominical, considerado el más grande de Cundinamarca,',
     'su tradicional mercado campesino dominical, uno de los más importantes de Cundinamarca,',
     '(g) el mercado: «el más grande» ≠ «uno de los más importantes» de su propia historia'],
    ['turismo',
     '\n\nGracias a su combinación de naturaleza, tranquilidad, infraestructura turística y fácil acceso desde la capital, La Vega continúa posicionándose como uno de los mejores destinos para vacacionar, vivir o invertir en finca raíz en Cundinamarca.',
     '',
     'cierre: «uno de los mejores destinos para… invertir»'],
    ['historia',
     'La Vega, Cundinamarca, es uno de los municipios con mayor riqueza histórica, cultural y natural de la región del Gualivá. Su origen se remonta',
     'El origen de La Vega se remonta',
     'apertura: «mayor riqueza histórica de la región»'],
    ['historia',
     'Su historia colonial comenzó oficialmente el 3 de junio de 1605, cuando el licenciado Alonso Vásquez de Cisneros ordenó la fundación de dos pueblos indígenas en la región:',
     'Su historia colonial comenzó en 1605, con la fundación de dos pueblos indígenas en la región:',
     '(g) EL FUNDADOR: fuera el nombre y la fecha exacta hasta verificar'],
    ['historia',
     '\n\nEn la actualidad, La Vega es reconocida como uno de los municipios más atractivos de Cundinamarca para vivir, invertir y disfrutar del turismo de naturaleza. Su combinación de tradición agrícola, desarrollo inmobiliario, riqueza ambiental y calidad de vida la convierten en un destino ideal para quienes buscan tranquilidad sin alejarse de la ciudad.',
     '',
     'cierre 1: «uno de los municipios más atractivos… para invertir»'],
    ['historia',
     '\n\nLa Vega es hoy un municipio que conserva con orgullo su historia, mientras continúa proyectándose como un referente de desarrollo turístico, agropecuario y residencial en el centro del país.',
     '',
     'cierre 2: «se proyecta como un referente»'],
  ],

  'villeta': [
    ['turismo',
     'Villeta es uno de los destinos turísticos más importantes del departamento de Cundinamarca y uno de los preferidos por quienes buscan disfrutar de un clima cálido, naturaleza, gastronomía y actividades recreativas a poca distancia de Bogotá. Su amplia oferta hotelera, de fincas de recreo y de espacios para el descanso atrae visitantes durante todo el año, especialmente en fines de semana, puentes festivos y temporadas vacacionales.',
     'Villeta es un municipio de clima cálido a poca distancia de Bogotá. Su oferta hotelera, de fincas de recreo y de espacios para el descanso recibe visitantes durante todo el año, especialmente en fines de semana, puentes festivos y temporadas vacacionales.',
     'apertura: «más importantes del departamento y uno de los preferidos»'],
    ['turismo',
     '\n\nGracias a su excelente clima, su ubicación estratégica y la diversidad de experiencias que ofrece, Villeta se consolida como un destino ideal para vacacionar, adquirir una segunda vivienda o invertir en apartamentos, casas campestres, hoteles, fincas y proyectos turísticos con gran potencial en el occidente de Cundinamarca.',
     '',
     'cierre: «proyectos turísticos con GRAN POTENCIAL» — valor futuro superviviente'],
    ['historia',
     'Villeta es uno de los municipios con mayor tradición histórica, cultural y agroindustrial del departamento de Cundinamarca. Su desarrollo',
     'Villeta tiene una larga tradición agroindustrial. Su desarrollo',
     'apertura: «mayor tradición histórica del departamento»'],
    ['historia',
     '\n\nEn la actualidad, Villeta combina su riqueza histórica con una sólida vocación turística, agrícola y comercial. Su excelente clima cálido, su cercanía con Bogotá y su amplia oferta de servicios la convierten en un destino frecuente para vivir, disfrutar de una segunda vivienda o comprar casas campestres, apartamentos y fincas.',
     '',
     'cierre comercial'],
  ],

  'sasaima': [
    ['turismo',
     'Sasaima es uno de los destinos más atractivos del occidente de Cundinamarca para quienes buscan disfrutar de la naturaleza, la aventura y las tradiciones campesinas. Su privilegiada ubicación, su clima agradable y la riqueza de sus paisajes lo convierten en un lugar ideal para el descanso y el turismo sostenible, a poca distancia de Bogotá.',
     'Sasaima está a poca distancia de Bogotá y ofrece naturaleza, aventura y tradiciones campesinas.',
     'apertura: «uno de los destinos más atractivos del occidente»'],
    ['turismo',
     '\n\nGracias a su combinación de naturaleza, aventura, cultura y excelente conectividad con Bogotá, Sasaima se consolida como un destino ideal para vacacionar, adquirir una finca de recreo o invertir en casas campestres y lotes rodeados de un entorno natural privilegiado.',
     '',
     'cierre: «adquirir una finca de recreo o invertir»'],
    ['historia',
     'La fundación oficial de Sasaima ocurrió el 3 de junio de 1605, cuando el oidor Alonso Vásquez de Cisneros ordenó el establecimiento del nuevo pueblo indígena',
     'La fundación oficial de Sasaima ocurrió en 1605, con el establecimiento del nuevo pueblo indígena',
     '(g) LA FECHA REPETIDA: mismo día y mismo oidor que La Vega'],
    ['historia',
     '\n\nHoy, Sasaima conserva su riqueza histórica, cultural y natural, ofreciendo a residentes y visitantes un municipio donde la tradición, la tranquilidad y la calidad de vida se integran con modernas oportunidades de inversión en casas campestres, fincas y lotes rodeados de naturaleza.',
     '',
     'cierre: «modernas oportunidades de inversión»'],
  ],

  'nocaima': [
    ['turismo',
     'Nocaima es un destino ideal para quienes disfrutan del turismo de naturaleza, el senderismo y las experiencias rurales auténticas.',
     'Nocaima ofrece turismo de naturaleza, senderismo y experiencias rurales.',
     'apertura: «destino ideal»'],
    ['turismo',
     '\n\nGracias a su riqueza natural, su tradición agrícola y su cercanía con Bogotá, Nocaima se consolida como un destino perfecto para disfrutar de fines de semana, adquirir una finca de recreo o invertir en casas campestres y lotes rodeados de naturaleza, tranquilidad y excelente calidad de vida.',
     '',
     'cierre: «destino perfecto para… invertir»'],
    ['historia',
     'Nocaima, uno de los municipios con mayor riqueza histórica del occidente de Cundinamarca, tiene sus orígenes',
     'Nocaima tiene sus orígenes',
     'apertura: «mayor riqueza histórica del occidente»'],
    ['historia',
     '\n\nEn la actualidad, Nocaima conserva su riqueza histórica, su tradición agrícola y su patrimonio cultural, mientras se proyecta como un destino ideal para el turismo de naturaleza, el descanso y la inversión inmobiliaria. Su cercanía con Bogotá, su excelente clima y sus paisajes montañosos han convertido al municipio en uno de los lugares preferidos para adquirir fincas, casas campestres y lotes en el occidente de Cundinamarca, combinando historia, tranquilidad y calidad de vida.',
     '',
     'cierre: «uno de los lugares preferidos para adquirir fincas»'],
  ],

  'nimaima': [
    ['turismo',
     'Nimaima es un destino ideal para quienes buscan disfrutar de la naturaleza, el descanso y la tranquilidad en un entorno auténticamente rural.',
     'Nimaima es un municipio de entorno rural, con naturaleza, descanso y tranquilidad.',
     'apertura: «destino ideal»'],
    ['turismo',
     '\n\nGracias a su ambiente tranquilo, su riqueza paisajística y su cercanía con Bogotá, Nimaima se consolida como un destino ideal para disfrutar de fines de semana, adquirir una finca de recreo o invertir en propiedades campestres rodeadas de naturaleza y calidad de vida.',
     '',
     'cierre: «adquirir una finca de recreo o invertir»'],
    ['historia',
     '\n\nActualmente, Nimaima es reconocido por su tranquilidad, su clima cálido, sus montañas, quebradas y cascadas, así como por la calidez de su gente. Su cercanía con Bogotá y su entorno natural lo convierten en un destino para quienes buscan descansar, disfrutar del turismo de naturaleza o comprar fincas, lotes y viviendas campestres en el occidente de Cundinamarca.',
     '',
     'cierre comercial'],
  ],

  'vergara': [
    ['turismo',
     '\n\nGracias a su riqueza natural, su vocación agrícola y su cercanía con Bogotá, Vergara se consolida como un destino ideal para disfrutar del turismo rural, adquirir una finca de recreo o invertir en propiedades rodeadas de naturaleza, tranquilidad y un entorno con gran potencial de desarrollo.',
     '',
     'cierre: «un entorno con GRAN POTENCIAL de desarrollo» — otro valor futuro vivo'],
  ],
}

/** Municipios cuya `historia` se VACÍA: no contiene historia. */
const VACIAR_HISTORIA = ['san-francisco', 'vergara']

let cambios = 0
const fallos = []

for (const [slug, reglas] of Object.entries(REGLAS)) {
  const m = await prisma.municipality.findUnique({
    where: { slug },
    select: { id: true, turismo: true, historia: true },
  })
  if (!m) { console.log(`\n### ❌ NO ENCONTRADO: ${slug}`); fallos.push(slug); continue }
  console.log(`\n### ${slug}`)

  const data = {}
  for (const [campo, buscar, reemplazar, etiqueta] of reglas) {
    const actual = data[campo] ?? m[campo]
    if (typeof actual !== 'string' || !actual.includes(buscar)) {
      console.log(`  ❌ NO ENCONTRADO — ${campo}: ${etiqueta}`)
      fallos.push(`${slug}/${etiqueta}`)
      continue
    }
    data[campo] = actual.split(buscar).join(reemplazar)
    console.log(`  ✓ ${campo} — ${etiqueta}`)
    cambios++
  }

  for (const k of Object.keys(data)) data[k] = data[k].trim()

  if (APPLY && Object.keys(data).length) {
    await prisma.municipality.update({ where: { id: m.id }, data })
    console.log(`  → GUARDADO (${Object.keys(data).join(', ')})`)
  }
}

console.log('\n### VACIAR `historia` — no contiene historia')
for (const slug of VACIAR_HISTORIA) {
  const m = await prisma.municipality.findUnique({ where: { slug }, select: { id: true, historia: true } })
  if (!m) { console.log(`  ❌ NO ENCONTRADO: ${slug}`); fallos.push(slug); continue }
  console.log(`  ✓ ${slug} — ${m.historia?.length ?? 0} car. de prosa genérica → vacío`)
  cambios++
  if (APPLY) await prisma.municipality.update({ where: { id: m.id }, data: { historia: null } })
}

console.log('\n' + '='.repeat(64))
console.log(`Cambios: ${cambios} · Fallos: ${fallos.length}`)
if (fallos.length) { fallos.forEach(f => console.log('  - ' + f)); console.log('ABORTADO'); await prisma.$disconnect(); process.exit(1) }
console.log(APPLY ? 'APLICADO' : 'DRY-RUN — nada se escribió')
await prisma.$disconnect()
