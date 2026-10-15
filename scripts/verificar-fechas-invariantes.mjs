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

/**
 * DOS CAMINOS, no uno.
 *
 * `probar-fechas` ejercita el puente en memoria. `probar-fechas-base` lee de
 * PostgreSQL a través de Prisma, que es el otro camino y la otra superficie: una
 * columna `DATE` llega a JavaScript como `Date` a medianoche UTC, así que migrar
 * la columna era necesario y no suficiente. Comprobar solo el de memoria
 * dejaría la mitad sin mirar.
 */
const ARNESES = [
  { guion: 'scripts/probar-fechas.mjs', que: 'el puente, en memoria' },
  { guion: 'scripts/probar-fechas-base.mjs', que: 'lo que sale de la base' },
  /* LOS DOS MOTORES, en las dos zonas.
   *
   * El 2026-10-15 un fixture de probar-notariales construia su entrada con
   * `new Date(2026, 9, 6)` —componentes LOCALES— y daba el dia 6 en una maquina
   * UTC-5 y el dia 5 en Vercel. La PRUEBA tenia el defecto que estaba
   * verificando, y solo se vio cuando el arnes entro al build y corrio en la
   * otra superficie. Corriendolos aqui en las dos zonas, el siguiente falla en
   * esta maquina y no en un despliegue. */
  { guion: 'scripts/probar-notariales.mjs', que: 'el motor notarial, en dos zonas' },
  { guion: 'scripts/probar-finanzas.mjs', que: 'el motor financiero, en dos zonas' },
]

console.log('\n══ LAS FECHAS NO DEPENDEN DE LA ZONA DEL PROCESO ═════════════')

let malas = 0

for (const arnes of ARNESES) {
  const salidas = new Map()
  console.log(`\n  ${arnes.que}  (${arnes.guion})`)

  for (const tz of ZONAS) {
    const r = spawnSync(process.execPath, [arnes.guion], {
      encoding: 'utf8',
      env: { ...process.env, TZ: tz },
    })
    if (r.error) {
      console.log(`     ✗ no pude correrlo con TZ=${tz}: ${r.error.message}`)
      malas++
      continue
    }
    salidas.set(tz, { texto: `${r.stdout ?? ''}`, codigo: r.status })
    const noPregunto = /NO PUDE PREGUNTAR/.test(`${r.stdout ?? ''}`)
    console.log(`     TZ=${tz.padEnd(16)} ${noPregunto ? 'no pudo preguntar' : r.status === 0 ? 'en verde' : `con fallos (${r.status})`}`)
  }

  const a = salidas.get(ZONAS[0])
  const b = salidas.get(ZONAS[1])
  if (!a || !b) { malas++; continue }

  if (a.codigo !== 0 || b.codigo !== 0) {
    console.log('     ✗ no pasa en al menos una de las dos zonas:')
    for (const l of a.texto.split('\n').filter(l => l.includes('✗'))) console.log(`        ${l.trim()}`)
    malas++
    continue
  }

  if (a.texto !== b.texto) {
    /* La primera línea que difiere es el dato: dice QUÉ cambió entre zonas. */
    const la = a.texto.split('\n')
    const lb = b.texto.split('\n')
    let i = 0
    while (i < Math.max(la.length, lb.length) && la[i] === lb[i]) i++
    console.log('     ✗ pasa en las dos zonas pero NO da la misma salida.')
    console.log('        Algo se está comparando distinto en cada una.')
    console.log(`        primera línea que difiere (${i + 1}):`)
    console.log(`          TZ=UTC            ${JSON.stringify(la[i] ?? '(fin)')}`)
    console.log(`          TZ=America/Bogota ${JSON.stringify(lb[i] ?? '(fin)')}`)
    malas++
    continue
  }

  const cuenta = a.texto.match(/(\d+) verificaciones/)?.[1]
  console.log(`     ✓ misma salida en las dos zonas${cuenta ? ` (${cuenta} verificaciones)` : ''}`)
}

if (malas) {
  console.log(`\n  ✗ ${malas} de ${ARNESES.length} caminos dependen de la zona del proceso.`)
  console.log('    Mientras la respuesta dependa de dónde corra, el arreglo no está hecho.\n')
  process.exit(1)
}

console.log(`\n  ✓ los ${ARNESES.length} caminos dan lo mismo con TZ=UTC y con TZ=America/Bogota.`)
console.log('    Si se quita TZ de la ecuación, el resultado sigue siendo el mismo.\n')
