#!/usr/bin/env node
/**
 * VEREDAS: EL CAMPO `valorizacion` DESAPARECE
 * ===========================================
 *
 * El nombre del campo era el problema: su propósito declarado era afirmar
 * plusvalía futura por vereda. Retiradas las afirmaciones, lo que sobrevivió en
 * cuatro veredas NO es mercado, es TERRITORIO —el Plan de Desarrollo Municipal,
 * la figura RNSC, las compensaciones de la CAR, lo que permite el POT—, que es
 * exactamente el contenido de `antes_de_comprar`.
 *
 * Así que:
 *   - `valorizacion: string` pasa a `antes_de_comprar?: string`, OPCIONAL.
 *   - Se conserva en Tabacal, La Libertad, Chupal y El Rosario.
 *   - Se elimina en las otras siete: o quedaron vacías (El Cural, Laureles,
 *     Cacahual) o lo que quedaba ya está en `acceso_vial`, `ventajas` o las
 *     FAQ de la propia vereda (Bulucaima, San Juan, La Alianza, Guarumal).
 *   - La plantilla solo pinta la sección si el campo existe.
 *
 *     node scripts/migrar-veredas-antes-de-comprar.mjs           (dry-run)
 *     node scripts/migrar-veredas-antes-de-comprar.mjs --apply
 */

import fs from 'node:fs'

const APPLY = process.argv.includes('--apply')
const F = 'src/lib/veredas-data.ts'
const P = 'src/app/veredas/[slug]/page.tsx'

/** Las cuatro que conservan conocimiento del territorio. */
const CONSERVAR = new Set(['tabacal', 'la-libertad', 'chupal', 'el-rosario'])

let datos = fs.readFileSync(F, 'utf8')
const lineas = datos.split('\n')

// ── Localizar cada bloque `valorizacion` con su vereda ───────────────────────
let slug = '?'
const bloques = []
for (let i = 0; i < lineas.length; i++) {
  const m = lineas[i].match(/^\s{4}slug:\s*'([^']+)'/)
  if (m) slug = m[1]
  if (!/^\s{4}valorizacion:/.test(lineas[i])) continue
  let j = i
  while (j < lineas.length && !/^\s{4}[a-zA-Z_]+:/.test(lineas[j + 1] ?? '') && !/^\s{2}\}/.test(lineas[j + 1] ?? '')) j++
  bloques.push({ slug, desde: i, hasta: j })
}

if (bloques.length !== 11) {
  console.log(`❌ se esperaban 11 bloques, hay ${bloques.length}`)
  process.exit(1)
}

// De abajo arriba, para que los índices no se muevan.
for (const b of [...bloques].reverse()) {
  if (CONSERVAR.has(b.slug)) {
    lineas[b.desde] = lineas[b.desde].replace('valorizacion:', 'antes_de_comprar:')
    console.log(`  ✓ ${b.slug.padEnd(14)} conservado como antes_de_comprar`)
  } else {
    lineas.splice(b.desde, b.hasta - b.desde + 1)
    console.log(`  ✗ ${b.slug.padEnd(14)} eliminado (${b.hasta - b.desde + 1} líneas)`)
  }
}
datos = lineas.join('\n')

// ── La interfaz ──────────────────────────────────────────────────────────────
const IFACE_VIEJA = '  valorizacion: string'
const IFACE_NUEVA = [
  '  /**',
  '   * Qué conviene saber ANTES de comprar en esta vereda: normativa que aplica,',
  '   * obras previstas con su fuente, figuras de conservación. Opcional: solo lo',
  '   * tienen las veredas donde hay algo verificable que decir.',
  '   *',
  '   * Se llamaba `valorizacion` y era obligatorio. El nombre declaraba el',
  '   * propósito —afirmar plusvalía futura— y obligaba a rellenarlo aunque no',
  '   * hubiera nada medido que poner, que es justo como se inventan las',
  '   * afirmaciones.',
  '   */',
  '  antes_de_comprar?: string',
].join('\n')

if (!datos.includes(IFACE_VIEJA)) { console.log('❌ interfaz no encontrada'); process.exit(1) }
datos = datos.replace(IFACE_VIEJA, IFACE_NUEVA)
console.log('  ✓ interfaz: valorizacion: string → antes_de_comprar?: string')

// ── La plantilla: la sección solo se pinta si hay contenido ─────────────────
let pagina = fs.readFileSync(P, 'utf8')
const SEC_VIEJA = `            <InfoSection title={\`¿Qué hay que saber del mercado en la vereda \${v.name}?\`} icon={<MapPin size={19} />} accent>
              <p style={{ color: '#1e40af', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '1.25rem' }}>{v.valorizacion}</p>`
const SEC_NUEVA = `            {v.antes_de_comprar && (
            <InfoSection title={\`¿Qué revisar antes de comprar en la vereda \${v.name}?\`} icon={<ClipboardCheck size={19} />} accent>
              <p style={{ color: '#1e40af', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '1.25rem' }}>{v.antes_de_comprar}</p>`
if (!pagina.includes(SEC_VIEJA)) { console.log('❌ sección de la plantilla no encontrada'); process.exit(1) }
pagina = pagina.replace(SEC_VIEJA, SEC_NUEVA)
console.log('  ✓ plantilla: sección condicional + encabezado')

console.log('\n' + '='.repeat(60))
console.log(`${bloques.length} bloques · ${CONSERVAR.size} conservados · ${bloques.length - CONSERVAR.size} eliminados`)

if (APPLY) {
  fs.writeFileSync(F, datos)
  fs.writeFileSync(P, pagina)
  console.log('APLICADO — falta cerrar el JSX condicional a mano y revisar el icono')
} else {
  console.log('DRY-RUN — nada se escribió')
}
