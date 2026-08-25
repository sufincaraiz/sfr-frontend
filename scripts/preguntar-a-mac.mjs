#!/usr/bin/env node
/**
 * PREGUNTARLE A MAC — el arnés de medición
 * ========================================
 *
 * Mac es la superficie que MENOS se ha auditado y la única que habla con
 * clientes. Dos cosas salieron de preguntarle en vez de leer su prompt:
 *
 *  · Citaba 22-28 °C y ~1.200 msnm cuando la ficha del municipio dice 18-26 y
 *    1.230. Dos respuestas distintas del mismo negocio, invisibles desde el
 *    código.
 *  · Decía que una propiedad publicada no existía y que «podría estar en
 *    camino».
 *
 * Ninguna de las dos se habría visto leyendo. Hay que preguntar.
 *
 *     node scripts/preguntar-a-mac.mjs factuales     10 preguntas de dato
 *     node scripts/preguntar-a-mac.mjs residuo       5 × la misma, para varianza
 *
 * Requiere el servidor levantado en localhost:3000.
 */

const URL = process.env.MAC_URL ?? 'http://localhost:3000/api/agent'

const FACTUALES = [
  ['distancia',   '¿A cuántos kilómetros está La Vega de Bogotá y cuánto se demora uno?'],
  ['altitud',     '¿A qué altura sobre el nivel del mar está La Vega?'],
  ['clima',       '¿Qué temperatura hace en La Vega?'],
  ['municipios',  '¿En qué municipios tienen propiedades?'],
  ['tipos',       '¿Qué tipos de inmueble manejan?'],
  ['precio-min',  '¿Cuál es la propiedad más barata que tienen?'],
  ['horario',     '¿Cuál es su horario de atención?'],
  ['matricula',   '¿Los lotes del proyecto Cabañas Top 32 tienen matrícula inmobiliaria independiente?'],
  ['servicios',   '¿Qué servicios públicos tiene el condominio Palo de Agua?'],
  ['cobertura',   '¿Ustedes venden propiedades en Zipaquirá o en Melgar?'],
]

const RESIDUO = Array.from({ length: 5 }, (_, i) => [
  `muestra-${i + 1}`,
  '¿Cuánto puedo ganar alquilando una cabaña en La Vega?',
])

const LOTES = { factuales: FACTUALES, residuo: RESIDUO }
const cual = process.argv[2] ?? 'factuales'
const lote = LOTES[cual]
if (!lote) {
  console.error(`Lote desconocido: ${cual}. Usa: ${Object.keys(LOTES).join(' | ')}`)
  process.exit(1)
}

const sello = Date.now().toString(36)

for (const [etiqueta, pregunta] of lote) {
  // sessionId distinto por pregunta: sin memoria cruzada entre casos.
  const sessionId = `medir-${cual}-${etiqueta}-${sello}`
  let texto
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: pregunta, channel: 'WEB' }),
      signal: AbortSignal.timeout(150_000),
    })
    const j = await res.json()
    texto = j.reply ?? `(sin reply — ${JSON.stringify(j).slice(0, 200)})`
  } catch (e) {
    texto = `(ERROR: ${e instanceof Error ? e.message : String(e)})`
  }
  console.log(`\n${'='.repeat(74)}\n### ${etiqueta}\nP: ${pregunta}\n\nR: ${texto}`)
}
