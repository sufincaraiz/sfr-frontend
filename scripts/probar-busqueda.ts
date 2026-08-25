/**
 * PRUEBA DEL FILTRO DE TEXTO LIBRE DE MAC
 * =======================================
 *
 * El filtro hacía `contains` con la FRASE COMPLETA. Medido contra producción el
 * 22/08/2026: «La Ceibita» devolvía 1 y «Finca La Ceibita en Guacamayas»
 * devolvía 0, con la propiedad publicada. Como los criterios se relajan en
 * cascada, el texto se descartaba y Mac recibía OTRAS propiedades: le dijo a un
 * cliente que un inmueble del catálogo no existía y que «podría estar en
 * camino». Es la misma clase de fallo que «¿tienen condominios?» —cero
 * resultados habiendo doce—, con el agravante de que aquí se pierde el lead.
 *
 * Esta prueba importa `terminos`, `coincideTexto` y `puntuar` de
 * `src/lib/agent/busqueda-texto.ts`: ejercita EL CÓDIGO QUE CORRE EN
 * PRODUCCIÓN, no una copia. Una copia en el test que nadie sincroniza es un
 * test que aprueba mientras producción falla.
 *
 * No basta con que la ficha aparezca: tiene que salir PRIMERA. Quien escribe
 * «Ceibita» busca esa finca, no las que la mencionan de pasada.
 *
 *     node scripts/probar-busqueda.ts        (Node 24 ejecuta .ts directamente)
 */

import { PrismaClient } from '@prisma/client'
import { terminos, coincideTexto, puntuar, filtrarPorTerminos } from '../src/lib/agent/busqueda-texto.ts'

const prisma = new PrismaClient()

/** [consulta del cliente, fragmento del slug que debe salir PRIMERO] */
const CASOS: Array<[string, string]> = [
  // Los cinco que se midieron sobre producción. El quinto devolvía 0.
  ['La Ceibita', 'ceibita'],
  ['Ceibita', 'ceibita'],
  ['Finca La Ceibita', 'ceibita'],
  ['Guacamayas', 'ceibita'],
  ['Finca La Ceibita en Guacamayas', 'ceibita'],
  // Parciales y coloquiales.
  ['ceibita', 'ceibita'],
  ['la finca de guacamayas', 'ceibita'],
  ['el condominio de bella vista', 'bella-vista'],
  ['Senderos del Bosque', 'senderos-del-bosque'],
  ['Palo de Agua', 'palo-de-agua'],
  ['cabañas top 32', 'cabanas-top-32'],
  // Con tilde: `contains` de Postgres NO la ignora, por eso el filtro va en JS.
  ['lote en Albán', 'alban'],
  ['alban', 'alban'],
  ['Victoria Real', 'victoria-real'],
]

/** Consultas que NO deben filtrar por texto: solo dicen el tipo. */
const SIN_TERMINOS = ['una finca', 'casas', 'un lote', 'propiedades', 'lote campestre']

const propiedades = await prisma.property.findMany({
  where: { status: 'available' },
  select: {
    slug: true, title: true, short_description: true, description: true,
    municipality: { select: { name: true } },
    vereda: { select: { name: true } },
  },
})

let fallos = 0

for (const [consulta, esperado] of CASOS) {
  const terms = terminos(consulta)
  const encontradas = propiedades
    .filter(p => coincideTexto(p, terms))
    .sort((a, b) => puntuar(b, terms) - puntuar(a, terms))
  const primera = encontradas[0]
  const ok = terms.length > 0 && !!primera?.slug.includes(esperado)
  if (!ok) fallos++
  console.log(
    `${ok ? '✓' : '❌'} "${consulta}"`.padEnd(40) +
    `[${terms.join(' ')}]`.padEnd(26) +
    `${encontradas.length} result.` +
    (ok ? '' : `  ← 1ª: ${primera?.slug ?? '(ninguna)'}, se esperaba ${esperado}`)
  )
}

for (const consulta of SIN_TERMINOS) {
  const terms = terminos(consulta)
  const ok = terms.length === 0
  if (!ok) fallos++
  console.log(`${ok ? '✓' : '❌'} sin términos: "${consulta}"`.padEnd(66) + (ok ? '' : `← quedó [${terms.join(' ')}]`))
}

// ── Relajación: frases naturales con palabras de sobra ──────────────────────
// «servicios públicos del condominio Palo de Agua» devolvía CERO cuando se
// exigían TODOS los términos —la ficha no dice literalmente «servicios
// públicos»— y Mac volvió a responder que ese condominio no existe. El cliente
// no escribe palabras clave: escribe una frase, y lo que sobra no puede
// dejarlo sin respuesta.
console.log('\n── Frases naturales (relajación progresiva) ────────────────')
const NATURALES: Array<[string, string]> = [
  ['¿Qué servicios públicos tiene el condominio Palo de Agua?', 'palo-de-agua'],
  ['quiero saber del proyecto Senderos del Bosque en La Vega', 'senderos-del-bosque'],
  ['me interesa la finca La Ceibita que está en Guacamayas', 'ceibita'],
  ['información del lote de Albán sobre la vía principal', 'alban'],
  ['busco una casa con piscina en condominio cerrado en La Vega', 'condominio'],
]
for (const [consulta, esperado] of NATURALES) {
  const terms = terminos(consulta)
  const r = filtrarPorTerminos(propiedades, terms)
  const ok = !!r[0]?.slug.includes(esperado)
  if (!ok) fallos++
  console.log(
    `${ok ? '✓' : '❌'} "${consulta.slice(0, 48)}"`.padEnd(56) +
    `${r.length} result.` + (ok ? '' : `  ← 1ª: ${r[0]?.slug ?? '(ninguna)'}`)
  )
}

const total = CASOS.length + SIN_TERMINOS.length + NATURALES.length
console.log(`\n${total - fallos}/${total} casos correctos sobre ${propiedades.length} fichas disponibles.`)
await prisma.$disconnect()
if (fallos) process.exit(1)
