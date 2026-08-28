/**
 * PRUEBA DEL GENERADOR DE SLUGS BASE (regla nueva, sin duplicar el tipo).
 *     node scripts/probar-slug.ts
 */
import { slugBasePropiedad } from '../src/lib/slug.ts'

const CASOS: Array<[string, string, string, string]> = [
  // [título, tipo, municipio, slug base esperado]
  ['Conjunto Villa Esperanza', 'apartamento', 'la-vega', 'apartamento-conjunto-villa-esperanza-la-vega-cundinamarca'],
  ['Apartamento nuevo en conjunto', 'apartamento', 'la-vega', 'apartamento-nuevo-en-conjunto-la-vega-cundinamarca'],
  // Título que NO empieza por el tipo → SÍ antepone una vez:
  ['Villa Esperanza', 'apartamento', 'la-vega', 'apartamento-villa-esperanza-la-vega-cundinamarca'],
  ['Quinta del Bosque', 'casa', 'san-francisco', 'casa-quinta-del-bosque-san-francisco-cundinamarca'],
  // Trampa del límite de palabra: «Casablanca» NO empieza por «casa-».
  ['Casablanca', 'casa', 'la-vega', 'casa-casablanca-la-vega-cundinamarca'],
  // El tipo exacto como título:
  ['Lote', 'lote', 'la-vega', 'lote-la-vega-cundinamarca'],
  ['Lote campestre', 'lote', 'la-vega', 'lote-campestre-la-vega-cundinamarca'],
]

let fallos = 0
for (const [titulo, tipo, muni, esperado] of CASOS) {
  const got = slugBasePropiedad(titulo, tipo, muni)
  const ok = got === esperado
  if (!ok) fallos++
  console.log(`${ok ? '✓' : '❌'} "${titulo}" [${tipo}]`)
  console.log(`     ${got}${ok ? '' : `\n     ESPERADO: ${esperado}`}`)
}
console.log(`\n${CASOS.length - fallos}/${CASOS.length} correctos`)
if (fallos) process.exit(1)
