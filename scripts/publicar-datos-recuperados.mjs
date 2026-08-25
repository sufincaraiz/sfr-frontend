#!/usr/bin/env node
/**
 * PUBLICAR LO QUE MAC SABÍA Y LA FICHA NO DECÍA
 * =============================================
 *
 * Toda la semana fue retirar. Esto es lo contrario: 29 datos duros que estaban
 * en `mac_knowledge`, escritos y verificados, y que solo alcanzaban a quien
 * conversaba con Mac. En la ficha alcanzan también a Google y a los motores.
 *
 * Se publican los TRES bloques comprobados uno a uno. Los que eran diferencia
 * de formato —«desde $285.000.000» frente a «$285.000.000 COP»— se ignoran.
 *
 * DOS CONDICIONES DEL TITULAR, y las dos son de veracidad:
 *
 *  1. Starlink y equivalentes NO se escriben como servicio instalado. La
 *     entrada de conocimiento decía literalmente «NO afirmar que Starlink está
 *     instalado» — la cautela existía, pero vivía como instrucción al agente en
 *     vez de como redacción del hecho. Aquí se escribe como lo que es:
 *     viabilidad, sujeta a disponibilidad y a contratación con el operador.
 *
 *  2. La administración de La Rivera es una CIFRA, así que va con fecha de
 *     corte y declarando que varía por unidad. Sin eso sería una cifra sin
 *     procedencia en el campo más citable de la ficha.
 *
 *     node scripts/publicar-datos-recuperados.mjs           (dry-run)
 *     node scripts/publicar-datos-recuperados.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const BLOQUES = {
  'lote-lote-campestre-la-vega-cundinamarca': {
    ancla: 'Acceso: Buenas vías',
    texto: [
      'Acceso: Buenas vías',
      'Sector: El Cucharal',
      'Recorrido al Parque Principal de La Vega: aproximadamente 8 minutos en vehículo',
      'Agua: viabilidad de acueducto veredal',
      'Energía: Enel-Codensa',
      'Alcantarillado: sistema mediante pozo séptico',
      'Internet: viabilidad de conexión por fibra, antena o satelital, sujeto a disponibilidad y a contratación directa con el operador',
    ].join('\n'),
    etiqueta: 'lote campestre 500 m² · sector, tiempo y servicios',
  },

  'condominio-lote-en-condominio-campestre-la-rivera-la-vega-cundinamarca': {
    ancla: '🛣️ Vías de acceso en placa huella hasta la entrada de tu lote.',
    texto: [
      '🛣️ Vías de acceso en placa huella hasta la entrada de tu lote.',
      '',
      'Datos del condominio',
      '',
      'Recorrido desde el casco urbano de La Vega: entre 15 y 18 minutos en carro.',
      'Cada lote cuenta con matrícula inmobiliaria independiente.',
      'Servicios públicos: el condominio cuenta con alcantarillado, y también es viable instalar pozo séptico. Viabilidad de agua y energía, con red eléctrica subterránea.',
      'Internet: viabilidad de conexión por fibra, antena o satelital, sujeto a disponibilidad y a contratación directa con el operador.',
      'Cuota de administración: entre $400.000 y $450.000 COP mensuales, calculada por coeficiente de copropiedad, así que VARÍA SEGÚN LA UNIDAD. Valores vigentes a agosto de 2026; confírmalos antes de cerrar.',
    ].join('\n'),
    etiqueta: 'La Rivera · tiempo, matrícula, servicios y administración',
  },

  'casa-proyecto-cabanas-top-32-lotes-campestres-en-la-vega-la-vega-cundinamarca': {
    ancla: 'Ubicado en la Ruta Laguna El Tabacal (Sector Cucharal).',
    texto: [
      'Ubicado en la Ruta Laguna El Tabacal (Sector Cucharal), a 1,2 kilómetros del parque principal de La Vega — mucho antes de llegar a la Laguna, que está a 7 km.',
      'Cada lote se entrega con plano topográfico además de su matrícula inmobiliaria independiente.',
      'Internet: viabilidad de conexión por fibra, antena o satelital, sujeto a disponibilidad y a contratación directa con el operador.',
    ].join('\n'),
    etiqueta: 'Cabañas Top 32 · distancias, plano topográfico e internet',
  },
}

let cambios = 0
const fallos = []

for (const [slug, { ancla, texto, etiqueta }] of Object.entries(BLOQUES)) {
  const p = await prisma.property.findUnique({
    where: { slug },
    select: { id: true, description: true, short_description: true },
  })
  if (!p) { console.log(`  ❌ FICHA NO ENCONTRADA: ${slug}`); fallos.push(slug); continue }
  if (!p.description?.includes(ancla)) {
    console.log(`  ❌ ANCLA NO ENCONTRADA en ${slug}: «${ancla.slice(0, 50)}…»`)
    fallos.push(slug); continue
  }
  if (p.description.includes(texto)) { console.log(`  = ya publicado — ${etiqueta}`); continue }

  const nueva = p.description.replace(ancla, texto)
  console.log(`  ✓ ${etiqueta}  (+${nueva.length - p.description.length} car.)`)
  cambios++
  if (APPLY) await prisma.property.update({ where: { id: p.id }, data: { description: nueva } })
}

console.log('\n' + '='.repeat(60))
console.log(`Fichas ampliadas: ${cambios} · Fallos: ${fallos.length}`)
if (fallos.length) { console.log('ABORTADO'); await prisma.$disconnect(); process.exit(1) }
console.log(APPLY ? 'APLICADO' : 'DRY-RUN — nada se escribió')
await prisma.$disconnect()
