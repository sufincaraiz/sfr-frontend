#!/usr/bin/env node
/**
 * EL MISMO RESULTADO CON TZ=UTC Y CON TZ=America/Bogota
 * ====================================================
 *
 * No comprueba que las fechas estén bien: eso lo hace `probar-fechas.mjs`.
 * Comprueba algo distinto y más fuerte: que **el resultado no dependa de la
 * zona del proceso**.
 *
 * > **Una herramienta que mide no puede heredar su configuración del entorno.
 * > Si el resultado depende de una variable que no pusimos nosotros, el
 * > resultado no es un hecho.** Aplicado al motor y no solo al instrumento.
 *
 * Por qué hace falta además del arnés: un arnés puede pasar en las dos zonas y
 * aun así estar comparando cosas distintas en cada una. Lo único que demuestra
 * invariancia es correr las dos y exigir la MISMA salida, carácter por carácter.
 *
 * Y por qué estas dos zonas: UTC es la de Vercel —donde se construye y se sirve
 * lo que la gente usa— y America/Bogota es la de la máquina de desarrollo y la
 * del negocio. Son las dos superficies reales, no dos al azar.
 *
 *   node scripts/verificar-fechas-invariantes.mjs
 */
import { spawnSync } from 'node:child_process'

const ZONAS = ['UTC', 'America/Bogota']
const salidas = new Map()

console.log('\n══ LAS FECHAS NO DEPENDEN DE LA ZONA DEL PROCESO ═════════════')

for (const tz of ZONAS) {
  const r = spawnSync(process.execPath, ['scripts/probar-fechas.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, TZ: tz },
  })
  if (r.error) {
    console.log(`  ✗ no pude correr el arnés con TZ=${tz}: ${r.error.message}\n`)
    process.exit(1)
  }
  /* Se junta stdout con el código de salida: un arnés que falla en una zona y
   * pasa en la otra es justo lo que esto busca. */
  salidas.set(tz, { texto: `${r.stdout ?? ''}`, codigo: r.status })
  const n = (`${r.stdout ?? ''}`.match(/verificaciones/) ?? []).length
  void n
  console.log(`  TZ=${tz.padEnd(16)} salida ${r.status === 0 ? 'en verde' : `con fallos (${r.status})`}`)
}

const [a, b] = ZONAS.map(z => salidas.get(z))

if (a.codigo !== 0 || b.codigo !== 0) {
  console.log('\n  ✗ el arnés de fechas no pasa en al menos una de las dos zonas.')
  console.log('    La salida completa, con TZ=UTC:\n')
  console.log(a.texto.split('\n').filter(l => l.includes('✗')).map(l => `    ${l}`).join('\n'))
  console.log('')
  process.exit(1)
}

if (a.texto !== b.texto) {
  /* La primera línea que difiere es el dato: dice qué verificación cambió. */
  const la = a.texto.split('\n')
  const lb = b.texto.split('\n')
  let i = 0
  while (i < Math.max(la.length, lb.length) && la[i] === lb[i]) i++
  console.log('\n  ✗ el arnés pasa en las dos zonas pero NO da la misma salida.')
  console.log('    Eso significa que algo se está comparando distinto en cada una.')
  console.log(`\n    primera línea que difiere (${i + 1}):`)
  console.log(`      TZ=UTC            ${JSON.stringify(la[i] ?? '(fin)')}`)
  console.log(`      TZ=America/Bogota ${JSON.stringify(lb[i] ?? '(fin)')}\n`)
  process.exit(1)
}

const cuenta = a.texto.match(/(\d+) verificaciones/)?.[1] ?? '?'
console.log(`\n  ✓ las ${cuenta} verificaciones dan la MISMA salida en las dos zonas.`)
console.log('    El resultado no depende de la zona del proceso.\n')
