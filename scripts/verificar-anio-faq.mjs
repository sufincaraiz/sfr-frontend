#!/usr/bin/env node
/**
 * ¿EL AÑO DE LAS FAQ SE QUEDÓ ATRÁS?
 * ==================================
 *
 * `src/lib/faq-data.ts` cita un año en las preguntas de la portada. La doctrina
 * §7 dice por qué importa: los modelos descartan agresivamente lo que se
 * autodeclara viejo, y una página que dice «2025» en agosto de 2026 se está
 * autodescartando.
 *
 * Estaba calculado con `new Date().getFullYear()` **al construir**, que es una
 * cuarta clase de fecha: ni día puro, ni instante, ni puente, sino una
 * CONSTANTE DE TIEMPO DE BUILD con la zona de la máquina que compila —hoy
 * Vercel, UTC—. Cinco horas al año el build habría horneado el año siguiente, y
 * lo que queda horneado en una página estática lo indexa un buscador.
 *
 * Ahora es un literal, que es honesto sobre lo que es, y esto rompe el build en
 * cuanto se queda atrás. El cambio es de una cifra y la guarda dice cuál.
 *
 * > **Un valor por petición en una página que no se renderiza por petición es
 * > la misma mentira con más pasos.** Por eso literal y no puente: la portada
 * > es estática.
 *
 *   node scripts/verificar-anio-faq.mjs
 */
import { readFileSync } from 'node:fs'
import { anioEnColombia } from '../src/lib/dia-colombia.ts'

const ARCHIVO = 'src/lib/faq-data.ts'
const fuente = readFileSync(ARCHIVO, 'utf8')
const m = fuente.match(/export const ANIO_FAQ = (\d{4})/)

console.log('\n══ EL AÑO DE LAS FAQ ═════════════════════════════════════════')

if (!m) {
  console.log(`  ✗ ${ARCHIVO} ya no declara ANIO_FAQ como literal de cuatro dígitos.`)
  console.log('    Si volvió a calcularse al construir, lee la cabecera de este guion.\n')
  process.exit(1)
}

const declarado = Number(m[1])
/* El año de COLOMBIA, no el del servidor: es el puente, y aquí también. */
const actual = anioEnColombia()

console.log(`  declarado en ${ARCHIVO}: ${declarado}`)
console.log(`  año en curso en Colombia:  ${actual}`)

if (declarado < actual) {
  console.log(`\n  ✗ el año de las FAQ se quedó atrás: dice ${declarado} y estamos en ${actual}.`)
  console.log(`    Cambia ANIO_FAQ a ${actual} en ${ARCHIVO}.`)
  console.log('    Una página que se autodeclara vieja se autodescarta: doctrina §7.\n')
  process.exit(1)
}

if (declarado > actual) {
  /* También importa: un año futuro horneado es la otra cara del mismo defecto,
   * y es exactamente lo que producía el cálculo al construir en las últimas
   * cinco horas del 31 de diciembre. */
  console.log(`\n  ✗ el año de las FAQ va ADELANTADO: dice ${declarado} y estamos en ${actual}.`)
  console.log('    Un año futuro horneado en una página estática lo indexa un buscador igual.\n')
  process.exit(1)
}

console.log('\n  ✓ al día.\n')
