#!/usr/bin/env node
/**
 * ALBÁN — fusión aprobada
 * =======================
 *
 * Los dos campos tenían EL MISMO contenido: la lista de «Potencial de
 * Desarrollo» ya estaba en la larga. Lo único que la larga había perdido eran
 * los saltos de línea, y eso importa porque la ficha renderiza con
 * `white-space: pre-line`: publicarla habría dado un bloque de 1.137 caracteres
 * sin un respiro.
 *
 * Así que la canónica pasa a ser el texto con formato, más los espacios que
 * faltaban donde las palabras iban pegadas («Clave:Ubicación»,
 * «vehicular.Clima», «como:Centro», «turístico.Hotel»).
 *
 * Y de paso salen dos afirmaciones que sobrevivieron a todo el ciclo por vivir
 * en esta ficha: «Ubicación **Inmejorable**» y «**excelente** cobertura de
 * telefonía móvil». Es la doctrina §7: ya que se toca, entra en el lote.
 *
 *     node scripts/fusionar-alban.mjs           (dry-run)
 *     node scripts/fusionar-alban.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const SLUG = 'lote-lote-para-proyecto-alban-cundinamarca'

const CANONICA = `Espectacular lote de terreno ubicado estratégicamente en la Vereda Las Marías, a aproximadamente 2 kilómetros del área urbana del municipio de Albán.

Con una extensión exacta de 55.519 m² (5,55 hectáreas) y una topografía ligeramente ondulada, este inmueble se presenta como el lienzo perfecto para desarrollos de alto impacto.

Características Clave:
Ubicación: Cuenta con frente directo a la vía principal Silvania – Albán (Vía Sasaima – Albán) y se ubica justo frente a la Estación de Servicio Texaco.
Conectividad Estratégica: A tan solo 250 metros del Peaje Jalisco, facilitando la logística y el acceso vehicular.
Clima y Entorno: Ubicado a 1.900 msnm, de clima templado.
Servicios Disponibles: El predio cuenta con servicio de energía eléctrica, acueducto veredal y cobertura de telefonía móvil.

Precio de Venta: $980.000.000.

Potencial de Desarrollo:
Gracias a su ubicación sobre un corredor vial de alto flujo y sus dimensiones, este lote es ideal para estructurar proyectos como:
· Centro de servicios o parador turístico.
· Hotel y zonas de comercio.
· Parcelación para casa lotes campestres.
· Construcción de bodegas.`

const p = await prisma.property.findUnique({
  where: { slug: SLUG },
  select: { id: true, short_description: true, description: true },
})
if (!p) { console.log('❌ ficha no encontrada'); process.exit(1) }

console.log(`  corta actual: ${p.short_description?.length ?? 0} car.`)
console.log(`  larga actual: ${p.description?.length ?? 0} car.`)
console.log(`  canónica:     ${CANONICA.length} car.`)

// Comprobación de que no se pierde contenido: cada palabra con letras de los
// dos textos actuales tiene que seguir estando. Es la red que evita que un
// «solo formato» se lleve una frase por delante.
const palabras = (s) =>
  new Set(s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().match(/[a-z0-9ñ]{4,}/g) ?? [])
const enCanonica = palabras(CANONICA)
const perdidas = []
for (const fuente of [p.short_description ?? '', p.description ?? '']) {
  for (const w of palabras(fuente)) if (!enCanonica.has(w)) perdidas.push(w)
}
const unicas = [...new Set(perdidas)]

// «inmejorable» y «excelente» se retiran a propósito: son las dos
// afirmaciones aprobadas para salir.
const ESPERADAS = new Set(['inmejorable', 'excelente'])
const inesperadas = unicas.filter(w => !ESPERADAS.has(w))

console.log(`\n  palabras retiradas: ${unicas.join(', ') || 'ninguna'}`)
if (inesperadas.length) {
  console.log(`  ❌ SE PIERDE CONTENIDO NO PREVISTO: ${inesperadas.join(', ')}`)
  await prisma.$disconnect()
  process.exit(1)
}
console.log('  ✓ solo se retiran las dos afirmaciones aprobadas')

if (APPLY) {
  await prisma.property.update({
    where: { id: p.id },
    data: { description: CANONICA, short_description: CANONICA },
  })
  console.log('\n→ GUARDADO en description y short_description')
  console.log('  (la corta se derivará de la larga cuando se implante la derivación)')
} else {
  console.log('\nDRY-RUN — nada se escribió')
}
await prisma.$disconnect()
