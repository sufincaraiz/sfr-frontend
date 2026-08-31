#!/usr/bin/env node
/**
 * SANEAMIENTO DE 7 CUERPOS — quita lenguaje promocional/valor futuro/distancia
 * sin medir, CONSERVANDO todos los hechos. short_description == description en
 * las 7, así que se escribe el mismo texto sobrio en ambos campos.
 *
 *     node scripts/sanear-7-cuerpos.mjs            dry-run (verifica limpieza)
 *     node scripts/sanear-7-cuerpos.mjs --apply    escribe la base
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

// Detectores para VERIFICAR que el resultado quedó limpio (no para editar).
const VALOR_FUTURO = /valoriz|revaloriz|plusval|aval[uú]o|valor comercial|rentabilid|retorno de la inversi|inversi[oó]n segura|se valoriza|potencial de crecimiento|proyecci[oó]n inmobiliaria/i
const SUPERLATIVO = /espectacular|exclusiv|magníf|imponente|inmejorable|impecable|prestigios|obra maestra|majestuos|exuberante|inigualable|de lujo|privilegiad|estrat[ée]gic|lienzo perfecto|alto nivel|alto impacto|de ensue|paradis/i

const NUEVO = {
  // 1 · Villa Esperanza — apto 65 m², La Vega. (Se omite el «$250.000.000 COP»
  //     de administración: dato corrupto, imposible como cuota mensual.)
  'apartamento-apartamento-en-venta-en-conjunto-la-vega-cundinamarca':
`Apartamento de 65 m² en primer piso, en conjunto cerrado sobre el perímetro del Parque Principal de La Vega, Cundinamarca (Ref. LVA 017).

Información general
• Ubicación: La Vega, Cundinamarca, sobre el perímetro del Parque Principal.
• Área privada: 65 m².
• Precio: $355.000.000 COP.
• Parqueadero propio.

Interior
• Pisos en cerámica y buena iluminación natural.
• Sala y comedor de concepto abierto con balcón hacia las zonas comunes y las montañas.
• Cocina integral abierta con barra, mesón en granito, estufa empotrada y campana; zona de lavandería.
• Habitación principal con baño privado y dos habitaciones secundarias.
• Dos baños completos.

Zona común del conjunto
• Piscina.
• Ascensor.
• Vigilancia 24/7 y portería controlada.

Ubicación y entorno
• Sobre el perímetro del Parque Principal, en el centro del municipio.
• Sector comercial cercano (servicios básicos, financieros y gastronómicos) y acceso a las vías y rutas de transporte.

Servicios y clima
• Altitud: 1.200 msnm. Clima cálido y templado.

Documentación lista para escrituración, con acompañamiento de la agencia.`,

  // 2 · Apto nuevo El Mirador 88 m², La Vega.
  'apartamento-apartamento-nuevo-en-conjunto-la-vega-cundinamarca':
`Apartamento de 88 m² en el Conjunto Residencial El Mirador de la Colina V, 4º piso, sobre el perímetro del Parque Principal de La Vega, Cundinamarca.

Información general
• Ubicación: La Vega, Cundinamarca (perímetro del Parque Principal).
• Área privada: 88 m².
• Tiempo de construcción: 4 a 5 años aproximadamente.
• Precio: $390.000.000 COP.
• Cuota de administración: $80.000 COP.
• No dispone de parqueadero propio.

Interior
• Pisos en cerámica e iluminación natural en todos los espacios.
• Sala y comedor de concepto abierto con puerta corrediza de vidrio a un balcón con vista a las montañas y al municipio.
• Cocina integral abierta con estufa empotrada, campana, mesón en granito y gabinetes; cuarto de lavandería independiente con lavadero e instalación para lavadora.
• Habitación principal con clóset empotrado y baño privado (ducha en vidrio templado); habitación secundaria con clóset y acceso a balcón privado por ventanal de piso a techo.
• Dos baños en total.

Zona común del conjunto
• Ascensor a los pisos superiores.
• El conjunto no tiene zonas sociales comunes, lo que mantiene la administración en $80.000 COP.

Ubicación y entorno
• Sobre el perímetro del Parque Principal.
• A pocos pasos de la terminal de transporte y de un sector comercial con bancos, ferreterías, fruterías y heladerías.
• A 800 metros del Hospital de La Vega.

Servicios y clima
• Altitud: 1.200 msnm. Clima cálido y templado.

Documentación lista para escrituración.`,

  // 3 · El Mirador 94 m² esquinero, La Vega.
  'apartamento-venta-de-apartamento-de-94m-en-el-mirador-la-vega-la-vega-cundinamarca':
`Apartamento esquinero de 94 m² en el Conjunto Residencial El Mirador de la Colina V, 3º piso, sobre el perímetro del Parque Principal de La Vega, Cundinamarca.

Información general
• Ubicación: La Vega, Cundinamarca (perímetro del Parque Principal).
• Área privada: 94 m².
• Tiempo de construcción: 4 a 5 años aproximadamente.
• Precio: $550.000.000 COP.
• Cuota de administración: $80.000 COP.
• Parqueadero propio.

Interior
• Pisos en cerámica e iluminación natural en todos los espacios.
• Sala y comedor de concepto abierto con puerta corrediza de vidrio a un balcón con vista a las montañas y al municipio.
• Cocina integral abierta con estufa empotrada, campana, mesón en granito y gabinetes; cuarto de lavandería independiente con lavadero e instalación para lavadora.
• Habitación principal con baño privado (ducha en vidrio templado) y balcón privado por ventanal de piso a techo; segunda y tercera habitación.
• Dos baños en total.

Zona común del conjunto
• Ascensor a los pisos superiores.
• El conjunto no tiene zonas sociales comunes, lo que mantiene la administración en $80.000 COP.

Ubicación y entorno
• Sobre el perímetro del Parque Principal.
• A pocos pasos de la terminal de transporte y de un sector comercial con bancos, ferreterías, fruterías y heladerías.
• A 800 metros del Hospital de La Vega.

Servicios y clima
• Altitud: 1.200 msnm. Clima cálido y templado.

Documentación lista para escrituración.`,

  // 4 · Bella Vista — finca en condominio, Vereda La Huerta, La Vega.
  'condominio-condominio-bella-vista-la-vega-cundinamarca-la-vega-cundinamarca':
`Finca en condominio en la Vereda La Huerta, jurisdicción de La Vega, Cundinamarca, con vistas a las montañas.

Especificaciones del predio
• Área del lote: 3.883 m² (coeficiente de copropiedad 7,80%).
• Área construida: 267,7 m² aproximadamente.
• Administración: $392.000 COP (incluye poda y rocería interna del predio).
• Precio: $980.000.000 COP.

El predio se distribuye en cinco estructuras independientes:
1. Casa principal (un nivel): sala de estar de concepto abierto integrada con comedor y cocina integral equipada; tres alcobas y dos baños completos; la principal con clóset y balcón privado; corredores perimetrales y zona de lavandería.
2. Casa auxiliar (de huéspedes), independiente: una habitación, baño completo, cocina y sala-comedor.
3. Zonas exteriores: jacuzzi al aire libre con ducha exterior y área de bronceo; kiosco BBQ con terraza.
4. Infraestructura: pesebreras en madera para dos ejemplares; cuarto técnico para planta de emergencia; parqueadero cubierto con pérgola en lona.

Jardines con árboles frutales: mandarina, naranja, aguacate y plátano, entre otros.

Entorno y ubicación
• Clima entre 22 °C y 28 °C; altitud 1.006 msnm.
• A 3,8 km de la autopista Bogotá–La Vega. Acceso por vía mixta: placa huella y destapada en buen estado.
• A 7,5 km del Parque Principal de La Vega.

Servicios
• Acueducto veredal con tanques de reserva, energía eléctrica (Enel Codensa) y gas propano.
• Internet por antena.
• Conserjería del condominio.

Documentación al día y lista para escrituración.`,

  // 5 · Osaka — casa campestre en condominio, San Juan de La Vega.
  'finca-casa-campestre-en-condominio-la-vega-cundinamarca':
`Casa campestre en el condominio Osaka Campestre, en San Juan de La Vega, Cundinamarca.

Especificaciones del predio
• Área del terreno: 845 m² (lote plano, con grama natural y cerramiento en cerca viva).
• Área construida: 300 m² en 2 niveles.
• Clima: 25 °C promedio. Altitud: 1.342 msnm.

Interior
• Diseño de concepto abierto con ventanales de piso a techo.
• 3 alcobas, cada una con vestier, baño privado y balcón con vista a las montañas.
• 4 baños en total, incluido un baño social.
• Cocina integral abierta con isla central y mesón oscuro.
• Sala y comedor independientes con acceso a las terrazas.
• Estudio para home office y sala de TV con terraza en el segundo nivel.
• Puerta principal en madera maciza con pivote, puerta metálica corrediza y escalera flotante en madera con estructura metálica.

Exteriores y tecnología
• Jardines con árboles frutales, senderos peatonales, terraza exterior y fuente de agua en arcilla.
• Smart Home: iluminación inteligente, sistema de alarma y circuito perimetral de cámaras.
• Lavandería con patio, parqueadero cubierto con estructura metálica y depósito.

Sostenibilidad
• Tanque de reserva de agua potable de 2.000 litros con sistema hidroflo, recolección de aguas lluvias con motobomba y luminarias solares exteriores.

Ubicación
• A 300 metros de la autopista La Vega–Bogotá.
• A 2,6 km del Parque Principal de La Vega.
• En San Juan de La Vega, sector de baja densidad de vivienda.

Amenidades del condominio
• Piscina, cancha múltiple y salón comunal.

Documentación lista para traspaso.`,

  // 6 · Quinta — San Francisco, Vereda Toriba. (Ya se había retirado el bullet
  //     de «proyección de valorización»; aquí se limpia el resto del cuerpo.)
  'finca-quinta-san-francisco-cundinamarca':
`Quinta de arquitectura contemporánea en la Vereda Toriba, Conjunto Habitacional "El Tesorito", San Francisco, Cundinamarca.

Información general
• Ubicación: San Francisco, Cundinamarca (Vereda Toriba).
• Área del terreno: 4.050 m² en total (Lotes A2 y A3).
• Área construida: 393 m² aproximadamente.
• Precio: $2.190.000.000 COP.

La casa tiene 15 años de construcción, con arquitectura contemporánea de acentos de modernismo tropical, distribuida en dos bloques.
• Zona social (pabellón abierto): integra cocina, sala de estar y un jacuzzi, con ventanales de piso a techo hacia el paisaje y una losa perforada sobre el área del jacuzzi.
• Zona privada (bloque de habitaciones): galerías acristaladas y jardines interiores bajo claraboyas, con ventilación cruzada.

Terreno
• Topografía completamente plana.

Clima
• Clima templado propio de San Francisco.`,

  // 7 · Lote Albán — Vereda Las Marías.
  'lote-lote-para-proyecto-alban-cundinamarca':
`Lote de 55.519 m² (5,55 hectáreas) en la Vereda Las Marías, a unos 2 km del área urbana de Albán, Cundinamarca, con topografía ligeramente ondulada.

Ubicación y acceso
• Frente directo a la vía principal Silvania–Albán (vía Sasaima–Albán), frente a la Estación de Servicio Texaco.
• A 250 metros del Peaje Jalisco.
• Altitud 1.900 msnm, clima templado.

Servicios
• Energía eléctrica, acueducto veredal y cobertura de telefonía móvil.

Precio: $980.000.000 COP.

Por su frente sobre la vía y sus dimensiones, admite usos como centro de servicios o parador, hotel y comercio, parcelación para casas campestres o bodegas (sujeto al uso del suelo del municipio).`,
}

let malos = 0
for (const [slug, texto] of Object.entries(NUEVO)) {
  const vf = VALOR_FUTURO.test(texto)
  const sm = texto.match(SUPERLATIVO)
  const p = await prisma.property.findUnique({ where: { slug }, select: { short_description: true } })
  const antes = p?.short_description?.length ?? 0
  console.log(`\n${slug}`)
  console.log(`   ${antes} → ${texto.length} car.   valor-futuro: ${vf ? '⚠ SÍ' : 'no'}   superlativo: ${sm ? `⚠ «${sm[0]}»` : 'no'}`)
  if (vf || sm) malos++
  if (APPLY && !vf && !sm) {
    await prisma.property.update({ where: { slug }, data: { short_description: texto, description: texto } })
    console.log('   ✓ guardado (short_description + description)')
  }
}
console.log(`\n${'='.repeat(60)}`)
console.log(malos ? `✗ ${malos} textos aún tienen término prohibido — NO se guardan.` : '✓ los 7 limpios.')
console.log(APPLY ? (malos ? 'APLICADO solo a los limpios.' : 'APLICADO a los 7.') : '(dry-run — pasa --apply)')
await prisma.$disconnect()
