#!/usr/bin/env node
/**
 * BLOQUE 3 — saneamiento sobrio de los cuerpos marcados. Mismo enfoque que los 7:
 * conservar cada hecho, quitar la familia completa (superlativo, comparativa, la
 * parte buena de la verdad, gratuidad/promesa, cifras sin procedencia).
 *
 * CONSERVA las notas de acceso honestas (placa huella / 4x4 / mixto): se asegura
 * con ACCESO_REQUERIDO. Si al sanear se pierde una, el dry-run lo grita.
 *
 * Finca Agropecuaria NO entra aquí: su área está en disputa (campo 22.000 vs
 * «22 hectáreas»); se sanea cuando el titular confirme el dato.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const VALOR_FUTURO = /valoriz|revaloriz|plusval|aval[uú]o|valor comercial|rentabilid|retorno de la inversi|inversi[oó]n segura|se valoriza|potencial de crecimiento|proyecci[oó]n inmobiliaria/i
const SUPERLATIVO = /espectacular|exclusiv|magníf|imponente|inmejorable|impecable|prestigios|obra maestra|majestuos|exuberante|inigualable|de lujo|privilegiad|estrat[ée]gic|lienzo|alto nivel|alto impacto|de ensue|paradis|envidiabl|de primer nivel|los? m[aá]s buscad|mejor clima|una de las mejores|refugio (perfecto|ideal|definitivo)|sue[nñ]o|invierte hoy/i

// Frase que DEBE seguir presente tras el saneamiento (acceso honesto).
const ACCESO_REQUERIDO = {
  'casa-lote-rural-casa-la-vega-cundinamarca': /placa huella/i,
  'condominio-lote-en-condominio-campestre-la-rivera-la-vega-cundinamarca': /placa huella|mixto/i,
  'condominio-oeste-la-vega-cundinamarca': /4x4/i,
  'lote-campestre-la-vega-cundinamarca': /placa huella/i,
  'lote-campestre-la-vega-cundinamarca-2': /placa huella/i,
  'lote-rural-campestre-la-vega-cundinamarca': /placa huella/i,
  'lote-petaquero-la-vega-cundinamarca': /placa huella/i,
}

const NUEVO = {
  'casa-alameda-la-vega-cundinamarca':
`Casa urbana nueva en el barrio Alameda, zona centro de La Vega, Cundinamarca.

Parqueadero, sala-comedor, baño medio, cocina semi-integral y zona de lavado. Habitación principal con baño privado y clóset en madera de pino; dos habitaciones con clóset, una de ellas con balcón; baño auxiliar completo. Cocina estilo americano, comedor, sala, cuarto de estudio y terraza con corredores. Terraza superior con habitación, clóset y baño privado.`,

  'casa-lote-rural-casa-la-vega-cundinamarca':
`Casa lote campestre en La Vega, Cundinamarca (Ref. LVC 007).

• Área del terreno: 130 m². Área construida: 60 m² aproximados.
• Precio: $150.000.000 COP.
• Matrícula inmobiliaria independiente, lista para escrituración.

Casa de un solo nivel en material prefabricado, con cubierta en fibrocemento, corredor frontal, zona exterior plana con parqueadero y portón. Interior: sala-comedor integrada con la cocina, dos habitaciones y un baño completo. Cerramiento con puerta metálica y cerca perimetral.

Servicios: energía eléctrica y agua por acueducto; pozo séptico; gas por pipeta; viabilidad de internet por proveedores locales o satelital (Starlink).

Acceso: a 4 km de la autopista La Vega–Villeta y a 9,6 km del parque principal de La Vega. La vía de acceso es carreteable, con tramos en placa huella y vía destapada.

Altitud 1.028 msnm, clima cálido.`,

  // Isaí LVC 016 NO entra: el original en la base está truncado (promete tres
  // construcciones y dos niveles, solo describe el primer nivel de la principal).
  // Se marca para que el titular complete los datos que faltan antes de sanear.

  'casa-proyecto-cabanas-top-32-lotes-campestres-en-la-vega-la-vega-cundinamarca':
`Proyecto Cabañas Top 32, Sector Cucharal (vía Tabacal), La Vega, Cundinamarca. Desarrollado en alianza por Su Finca Raíz y Constructora CONARC.

• Lote privado de 500 m² con matrícula inmobiliaria independiente y plano topográfico.
• Cabaña de 32 m² entregada en obra blanca.
• Arquitectura en ladrillo a la vista con cristalería de gran formato.
• Preparado para sistema híbrido de energía (solar y red eléctrica local).
• Precio desde $285.000.000 COP (varía si se amplía el área construida o se añaden especificaciones). Separación desde $5.000.000, con plan de pagos escalonado.
• Sin cuota de administración (solo el impuesto predial anual).

El estudio de títulos corre por cuenta del comprador y su abogado; orientamos sobre qué revisar y acompañamos el proceso hasta la notaría.

Ubicación: Ruta Laguna El Tabacal (Sector Cucharal), a 1,2 km del parque principal de La Vega (la Laguna está a 7 km). Internet: viabilidad por fibra, antena o satelital, según disponibilidad. Clima cálido. Licencia de Urbanismo Res. Nº 073 de 2025.`,

  'casa-se-vende-casa-lote-urbano-san-francisco-cundinamarca':
`Casa lote urbano en el sector El Tesorito, San Francisco, Cundinamarca, a 667 metros del Parque Principal.

La propiedad tiene actualmente dos ingresos por arriendos residenciales, gracias a su distribución en espacios independientes.

• Área del lote: 473 m². Área construida: 150 m² aproximados, en dos construcciones.
• Casa principal (dos niveles independientes): primer nivel con 2 habitaciones, 1 baño completo, cocina semi-integral, sala-comedor y corredores exteriores; segundo nivel con 2 habitaciones, 1 baño completo, cocina semi-integral, sala-comedor y sala exterior cubierta.
• Segunda construcción: apartaestudio independiente con baño completo, apto para un segundo ingreso de arriendo o para visitas.
• Parqueadero cubierto.

Acceso vial carreteable, apto para cualquier vehículo hasta la entrada del inmueble. La propiedad colinda con un arroyo.

Servicios: energía (Enel Codensa), acueducto, tanque de recolección de agua lluvia y gas propano (pipeta). Clima cálido (20 °C a 25 °C), altitud 1.527 msnm.

Escritura pública propia, impuestos al día, lista para traspaso. Precio: $490.000.000 COP.`,

  'condominio-finca-la-ceibita-guacamayas-la-vega-cundinamarca':
`Finca campestre en el Sector Asturias, La Vega, Cundinamarca. Área construida: 615 m² aproximados, en cuatro construcciones.

Casa principal (dos niveles, estilo campestre colonial): 4 habitaciones amplias, todas con baño privado, techos altos, armarios y ventilación; la habitación principal con balcón privado. Tres zonas sociales: sala interior, sala exterior con baño social y una sala adicional.`,

  'condominio-lote-buenos-aires-la-vega-cundinamarca':
`Lote de 2.800 m² en el Condominio Campestre Altos de Buenos Aires, La Vega, Cundinamarca.

• Terreno cercado en su perímetro con limoncillo.
• Internet por fibra óptica.
• Saneamiento mediante pozo séptico.
• Documentación al día y en regla.`,

  'condominio-lote-en-condominio-campestre-la-rivera-la-vega-cundinamarca':
`Lotes en el Condominio Campestre La Rivera P.H., La Vega, Cundinamarca.

• Lote N° 9: 1.550 m² — $270.000.000 COP.
• Lote N° 25: 1.940 m² — $315.000.000 COP.
• Lote N° 27: 1.690 m² — $310.000.000 COP.

Financiación directa, con planes de pago. Cada lote cuenta con matrícula inmobiliaria independiente.

Amenidades del condominio: piscina, acceso directo al río, senderos ecológicos, parque infantil, conserjería y seguridad.

Acceso por vía carreteable con tramos mixtos —asfaltada, placa huella y destapada— hasta la entrada del lote.

Servicios: alcantarillado (o pozo séptico viable), viabilidad de agua y energía con red eléctrica subterránea; internet por fibra, antena o satelital según disponibilidad. Administración aproximada entre $400.000 y $450.000 COP mensuales (valores de 2026), calculada por coeficiente de copropiedad, así que varía según la unidad; confírmala antes de cerrar.`,

  'condominio-oeste-la-vega-cundinamarca':
`Finca en condominio en la vereda Tabacal, La Vega, Cundinamarca.

El acceso desde La Vega es por vía destapada, en proceso de pavimentación; en temporada de lluvias se recomienda vehículo 4x4.

• Área total: 14.450 m². Área construida: 500 m² aproximados, en cuatro construcciones.
• Casa principal (dos niveles): primer nivel con sala de estar, comedor, cocina integral con barra, tres habitaciones con clóset, dos baños completos y una escalera central con jardín interior; corredores con zonas de estar.`,

  'condominio-palo-de-agua-la-vega-cundinamarca':
`Lote plano de 963,5 m² en el Condominio Palo de Agua (Sector El Acomodo), La Vega, Cundinamarca. Ref. LVD 007. Precio: $420.000.000 COP.

Terreno de topografía plana y suelo fértil, con clima cálido (19 °C – 27 °C) y altitud de 1.051 msnm.

Amenidades del condominio: piscina para adultos y niños, senderos ecológicos, colindancia con un río y guaduales, cancha de fútbol, cancha de vóley playa, conserjería, acceso controlado y salón social.

Ubicación: a 3,4 km de la zona urbana y a 4,2 km del Parque Principal.`,

  'condominio-senderos-del-bosque-la-vega-cundinamarca':
`Condominio campestre Senderos del Bosque, La Vega, Cundinamarca. Lotes para construir, con clima cálido durante todo el año.

Valores por etapa:
• Etapa 1: $190.000/m²
• Etapa 2: $230.000/m²
• Etapa 3: próximamente.

Cada lote está pensado para vivir o construir casa de descanso.`,

  'condominio-venta-de-lotes-planos-en-condominio-guadu-la-vega-la-vega-cundinamarca':
`Lotes planos en el Condominio Campestre Guadu, La Vega, Cundinamarca. Ref. LVD 017.

• Lote 39: 898 m². Lote 52: 875 m². Ambos totalmente planos.
• Precio: $255.000.000 COP cada lote.
• Servicios públicos: con viabilidad.

Amenidades del condominio: piscina y jacuzzi, cancha de tenis, cancha múltiple, cancha de vóley playa, mini market, salón de juegos, conserjería y portón eléctrico.

Ubicación: altitud 1.355 msnm, temperatura promedio de 24 °C; a 11,5 km del parque principal de La Vega. Sector con presencia de vivienda campestre y alojamiento turístico.`,

  'finca-el-cural-andres-la-vega-cundinamarca':
`Finca campestre en la vereda El Cural, La Vega, Cundinamarca.

• Área total: 10.089 m². Área construida: 311 m² aproximados, en cuatro construcciones.
• Casa principal (dos niveles): primer nivel con salón de juegos (ping-pong y billar) y baño; segundo nivel con 4 habitaciones, 3 baños, cocina, comedor, sala y terraza.
• Casa secundaria (un nivel): 3 habitaciones, 2 baños, cocina, sala-comedor y porche.
• Casa del administrador: 2 habitaciones, un baño, cocina y sala-comedor.
• Kiosco BBQ y piscina con vista.

Servicios: acueducto veredal y suministro adicional por nacimiento natural, energía eléctrica (Enel Codensa), gas propano e internet.`,

  'lote-campestre-la-vega-cundinamarca':
`Lote campestre en La Vega, Cundinamarca (Ref. LVE 008).

• Área del terreno: 3.708 m² (Lote 2).
• Precio: $450.000.000 COP.
• Matrícula inmobiliaria independiente, lista para escrituración.

Terreno de topografía plana, con prados verdes y un árbol central. Linderos definidos con cerca viva perimetral; entrada privada con portón vehicular y estructura cubierta.

Acceso: a 4 km de la autopista La Vega–Villeta y a 9,6 km del parque principal. La vía de acceso es carreteable, con tramos en placa huella y vía destapada. Altitud 1.028 msnm, clima cálido.`,

  'lote-rural-campestre-la-vega-cundinamarca':
`Lote campestre en el sector La Huerta, La Vega, Cundinamarca (Ref. LVE 009).

• Área del terreno: 3.708 m² (Lote 3).
• Precio: $380.000.000 COP.
• Matrícula inmobiliaria independiente, lista para escrituración.

Terreno con prados verdes y topografía mixta, con ondulaciones suaves y zonas aprovechables para construcción y paisajismo. Linderos demarcados con cerca viva y postes con alambre.

Acceso: a 4 km de la autopista La Vega–Villeta y a 9,6 km del parque principal. La vía de acceso es carreteable, con tramos en placa huella y vía destapada. Altitud 1.028 msnm, clima cálido.`,

  'lote-campestre-la-vega-cundinamarca-2':
`Lote campestre en La Vega, Cundinamarca (Ref. LVE 010).

• Área del terreno: 37.776 m², que abarca zonas despejadas y ladera montañosa boscosa.
• Precio: $750.000.000 COP.
• Matrícula inmobiliaria independiente, lista para escrituración.

Relieve mixto: praderas suaves y aprovechables en la parte baja y una elevación montañosa cubierta de vegetación nativa. Linderos naturales y perimetrales demarcados a lo largo de la colina.

Acceso: a 4 km de la autopista La Vega–Villeta y a 9,6 km del parque principal. La vía de acceso es carreteable, con tramos en placa huella y vía destapada. Altitud 1.028 msnm, clima cálido.`,

  'lote-lote-campestre-la-vega-cundinamarca':
`Lote campestre de 500 m² en el Sector El Cucharal, La Vega, Cundinamarca.

A aproximadamente 1,3 km del parque principal de La Vega. Matrícula inmobiliaria independiente y uso de suelo campestre. El predio tiene relieve inclinado.

Uso posible: glamping, cabaña de descanso o proyecto turístico, sujeto a las normas, licencias y permisos aplicables.

• Precio: $150.000.000 COP.
• Agua: viabilidad de acueducto veredal. Energía: Enel Codensa. Alcantarillado: pozo séptico. Internet: viabilidad por fibra, antena o satelital, según disponibilidad.`,

  'lote-petaquero-la-vega-cundinamarca':
`Lote campestre de 730 m² en La Vega, Cundinamarca (Ref. LVE 005).

• Cerrado en malla eslabonada.
• Árboles frutales (limón y guayaba).
• Dos explanaciones para construir.
• Viabilidad de servicios públicos.
• Escritura pública propia, documentos al día.
• Precio: $150.000.000 COP.

Acceso: a 1,5 km de la vía nacional de doble calzada; acceso hasta el terreno por placa huella.`,
}

let malos = 0
for (const [slug, texto] of Object.entries(NUEVO)) {
  const p = await prisma.property.findUnique({ where: { slug }, select: { short_description: true } })
  const antes = p?.short_description?.length ?? 0
  const vf = VALOR_FUTURO.test(texto)
  const sm = texto.match(SUPERLATIVO)
  const req = ACCESO_REQUERIDO[slug]
  const accesoOk = req ? req.test(texto) : null
  const problema = vf || sm || accesoOk === false
  if (problema) malos++
  console.log(`\n${slug}`)
  console.log(`   ${antes} → ${texto.length} car.   vf:${vf ? '⚠' : 'no'}  superlativo:${sm ? `⚠«${sm[0]}»` : 'no'}  acceso:${accesoOk === null ? '—' : accesoOk ? '✓ conservado' : '⚠ PERDIDO'}`)
  if (APPLY && !problema) {
    await prisma.property.update({ where: { slug }, data: { short_description: texto, description: texto } })
    console.log('   ✓ guardado')
  }
}
console.log(`\n${'='.repeat(60)}`)
console.log(`${Object.keys(NUEVO).length} cuerpos · ${malos ? `✗ ${malos} con problema (NO se guardan)` : '✓ todos limpios y con acceso conservado'}`)
console.log(APPLY ? 'APLICADO a los limpios.' : '(dry-run — pasa --apply)')
console.log('\nNOTA: Finca Agropecuaria NO está aquí (área en disputa). Chicala tampoco (solo era cifra).')
await prisma.$disconnect()
