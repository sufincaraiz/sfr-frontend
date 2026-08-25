/**
 * PRUEBA DEL DETECTOR DE VALOR FUTURO
 * ===================================
 *
 * Una vigilancia que devuelve «0 hallazgos» sobre datos limpios no ha
 * demostrado nada: puede estar sana o puede no detectar nunca. Las guardas de
 * este proyecto se probaron rompiéndolas a propósito; esta también.
 *
 * Los casos POSITIVOS son las frases REALES que se retiraron el 22/08/2026. Si
 * alguna dejara de detectarse, este archivo lo dice.
 *
 * Los NEGATIVOS son igual de importantes: la FAQ de La Vega menciona la palabra
 * «valorización» para decir que NO publicamos tasas. Nombrar lo que no se hace
 * no es afirmarlo, y un detector que la marca sería ruido diario.
 *
 *     node scripts/probar-vigilancia.ts
 */

import { primeraCoincidencia } from '../src/lib/valor-futuro.ts'

/** Frases retiradas de verdad. TODAS deben detectarse. */
const DEBEN_SALTAR: string[] = [
  'Ubicada en San Juan de La Vega, la zona más exclusiva y de mayor valorización del municipio.',
  'Ubicada en una de las zonas de mayor valorización Sector Asturias.',
  'La Vega se ha consolidado como uno de los municipios con mayor proyección para la inversión inmobiliaria por su rápida valorización.',
  'Precio de Venta: $980.000.000 (Con un valor comercial estimado por encima de los $1.200.000.000).',
  'Diseñado para quienes buscan confort, modernidad y una excelente rentabilidad.',
  'Ubicación Estratégica e Inversión Segura.',
  'desarrollar un patrimonio con gran potencial de crecimiento.',
  'el equilibrio perfecto entre comodidad, naturaleza y proyección inmobiliaria en La Vega.',
  'Es la mayor tasa de valorización entre los municipios del Gualivá.',
  'Las propiedades con piscina tienen excelente rentabilidad como alquiler vacacional.',
  'San Juan está en la fase inicial de valorización acelerada.',
  'Valor Comercial Total: $2.300.000.000 COP.',
  'El avalúo estimado del predio supera el precio de lista.',
]

/** Texto legítimo. NINGUNO debe saltar. */
const NO_DEBEN_SALTAR: string[] = [
  'No publicamos tasas de valorización: estimar cuánto subirá de precio un inmueble es un avalúo, y en Colombia solo puede emitirlo un avaluador inscrito en el RAA.',
  'La Vega queda a 60 kilómetros de Bogotá por la Autopista Medellín. Medido en automóvil desde el Portal 80 el 19 de agosto de 2026: 1 hora y 14 minutos.',
  'Casa de 200 m² con 3 habitaciones, 2 baños y parqueadero cubierto. Acueducto municipal, energía Enel Codensa y gas natural.',
  'La topografía de El Rosario es plana. Hay proyectos de parcelación activos en la vereda.',
  'Registrar el predio como Reserva Natural de la Sociedad Civil da acceso a beneficios fiscales.',
  'El avalúo catastral representa entre el 40 % y el 70 % del valor comercial, según el IGAC.',
]

let fallos = 0

console.log('── DEBEN DETECTARSE ────────────────────────────────────────')
for (const t of DEBEN_SALTAR) {
  const hit = primeraCoincidencia(t)
  if (!hit) { fallos++; console.log(`  ❌ NO detectada: "${t.slice(0, 70)}…"`) }
  else console.log(`  ✓ «${hit.slice(0, 62)}…»`)
}

console.log('\n── NO DEBEN DETECTARSE (falsos positivos) ──────────────────')
for (const t of NO_DEBEN_SALTAR) {
  const hit = primeraCoincidencia(t)
  if (hit) { fallos++; console.log(`  ❌ FALSO POSITIVO: «${hit.slice(0, 62)}…»`) }
  else console.log(`  ✓ ignorada: "${t.slice(0, 62)}…"`)
}

const total = DEBEN_SALTAR.length + NO_DEBEN_SALTAR.length
console.log(`\n${total - fallos}/${total} correctos.`)
if (fallos) process.exit(1)
