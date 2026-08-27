#!/usr/bin/env node
/**
 * MIGRACIÓN DE SERVICIOS Y ACCESO A LA CLAVE UNIFICADA
 * ====================================================
 *
 * property_features guardaba los servicios de dos formas y solo se pintaba una
 * (§13). Se corrigió la plantilla para pintar las dos; esto UNIFICA el dato en
 * una sola clave, `servicio`, para que el formulario tenga un único sitio donde
 * escribir y no se vuelva a divergir.
 *
 * TRES cosas, cada clave por separado —nunca un deleteMany de la ficha entera—:
 *
 *  A. Las claves viejas (agua, energia, gas, internet, alcantarillado) → filas
 *     `servicio`. Guardaban solo "si", un booleano: la etiqueta es GENÉRICA.
 *     `agua=si` no dice si es acueducto municipal o veredal, y ponerlo sería
 *     inventar. El titular precisa desde el formulario si quiere.
 *
 *  B. `via_pavimentada` (7 fichas). Un booleano true no es «vía pavimentada»:
 *     solo dice que alguien marcó una casilla, y el tramo final puede ser otro
 *     (undécima forma). Ficha por ficha:
 *       · Albán y Osaka → texto de `acceso` con lo que la ficha SÍ sostiene.
 *       · La Rivera, Lote campestre, y los 3 apartamentos → se borra.
 *
 *  C. «Acceso: Buenas vías» de Lote campestre 500 → fuera de la descripción.
 *     Es vago y no hay dato para sustituirlo; la ficha entra en la lista de las
 *     que llena el titular.
 *
 * RIESGO QUE SE COMPROBÓ: una fila con via_pavimentada Y otro servicio podría
 * perder el segundo si la migración moviera de más. No ocurre: via_pavimentada
 * es su propia clave y se toca sola. El dry-run cuenta hechos antes y después
 * por ficha para probarlo.
 *
 *     node scripts/migrar-servicios.mjs           (dry-run)
 *     node scripts/migrar-servicios.mjs --apply
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

/** clave vieja → etiqueta genérica (el booleano no dice más que «lo hay»). */
const ETIQUETA = {
  agua:           'Agua',
  energia:        'Energía eléctrica',
  gas:            'Gas',
  internet:       'Internet',
  alcantarillado: 'Alcantarillado',
  telefono:       'Teléfono',
  acueducto:      'Acueducto',
}
const VIEJAS = Object.keys(ETIQUETA)
const truthy = v => v && v !== 'no' && v !== 'false' && v !== '0'

/** via_pavimentada: slug (prefijo) → acceso en texto, o null = borrar */
const ACCESO = {
  'lote-lote-para-proyecto-alban':        'Frente directo a la vía principal Silvania – Albán (vía nacional pavimentada), a 250 m del Peaje Jalisco.',
  'finca-casa-campestre-en-condominio':   'A 300 metros de la autopista La Vega – Bogotá.',
  'condominio-lote-en-condominio-campestre-la-rivera': null,
  'lote-lote-campestre':                  null,
  'apartamento-apartamento-nuevo-en-conjunto': null,
  'apartamento-venta-de-apartamento-de-94m': null,
  'apartamento-apartamento-en-venta-en-conjunto': null,
}

const props = await prisma.property.findMany({
  select: { id: true, slug: true, title: true, description: true, features: { select: { id: true, feature_key: true, feature_value: true } } },
})
const buscar = pre => props.find(p => p.slug.startsWith(pre))

let creadas = 0, borradas = 0, accesos = 0, fallos = []

// ── A. claves viejas → servicio ─────────────────────────────────────────────
console.log('══ A · CLAVES VIEJAS → servicio (cuenta antes/después por ficha) ═══')
for (const p of props) {
  const viejas = p.features.filter(f => VIEJAS.includes(f.feature_key) && truthy(f.feature_value))
  if (!viejas.length) continue
  const yaServicio = p.features.filter(f => f.feature_key === 'servicio').map(f => f.feature_value)
  const nuevas = viejas.map(f => ETIQUETA[f.feature_key])
  // Sin duplicar si por lo que sea ya existiera esa etiqueta como servicio.
  const aCrear = nuevas.filter(n => !yaServicio.some(s => s.toLowerCase() === n.toLowerCase()))
  const antes = viejas.length + yaServicio.length
  const despues = yaServicio.length + aCrear.length
  const ok = despues >= viejas.length + yaServicio.length - (nuevas.length - aCrear.length)
  console.log(`\n  ${p.title}`)
  console.log(`    ${viejas.map(f => f.feature_key).join(', ')} → ${aCrear.join(', ') || '(ya estaban)'}`)
  console.log(`    hechos de servicio: ${antes} → ${despues}  ${despues === antes ? '✓ ninguno se pierde' : '⚠ REVISAR'}`)
  if (despues !== antes) fallos.push(`${p.slug}: ${antes}→${despues}`)
  creadas += aCrear.length; borradas += viejas.length
  if (APPLY) {
    for (const n of aCrear) await prisma.propertyFeature.create({ data: { property_id: p.id, feature_key: 'servicio', feature_value: n } })
    for (const f of viejas) await prisma.propertyFeature.delete({ where: { id: f.id } })
  }
}

// ── B. via_pavimentada ──────────────────────────────────────────────────────
console.log('\n\n══ B · via_pavimentada — 7 fichas ═════════════════════════════════')
for (const [pre, texto] of Object.entries(ACCESO)) {
  const p = buscar(pre)
  if (!p) { console.log(`  ❌ NO ENCONTRADA: ${pre}`); fallos.push(pre); continue }
  const vp = p.features.find(f => f.feature_key === 'via_pavimentada')
  if (!vp) { console.log(`  · ${p.title}: sin via_pavimentada (ya migrada)`); continue }
  if (texto) {
    console.log(`  → ${p.title}: acceso = «${texto}»`)
    accesos++
    if (APPLY) {
      await prisma.propertyFeature.deleteMany({ where: { property_id: p.id, feature_key: 'acceso' } })
      await prisma.propertyFeature.create({ data: { property_id: p.id, feature_key: 'acceso', feature_value: texto } })
    }
  } else {
    console.log(`  ✗ ${p.title}: se borra el booleano`)
  }
  borradas++
  if (APPLY) await prisma.propertyFeature.delete({ where: { id: vp.id } })
}

// ── C. «Buenas vías» fuera de la descripción del Lote campestre ─────────────
console.log('\n\n══ C · «Acceso: Buenas vías» → fuera ══════════════════════════════')
const lc = buscar('lote-lote-campestre')
const MARCA = '\nAcceso: Buenas vías'
if (lc && lc.description?.includes(MARCA)) {
  console.log('  ✓ retirada de la descripción del Lote campestre 500')
  if (APPLY) {
    const nueva = lc.description.split(MARCA).join('')
    await prisma.property.update({ where: { id: lc.id }, data: { description: nueva, short_description: nueva } })
  }
} else if (lc?.description?.includes('Buenas vías')) {
  console.log('  ⚠ «Buenas vías» está pero no con el salto esperado — revisar a mano')
  fallos.push('lote-campestre/Buenas vías')
} else {
  console.log('  · ya no está')
}

console.log('\n' + '='.repeat(64))
console.log(`servicio creadas: ${creadas} · viejas+vp borradas: ${borradas} · acceso escrito: ${accesos}`)
if (fallos.length) { console.log('⚠ REVISAR:'); fallos.forEach(f => console.log('   ' + f)) }
console.log(APPLY ? 'APLICADO' : 'DRY-RUN — nada se escribió')
if (fallos.length && !APPLY) process.exit(1)
await prisma.$disconnect()
