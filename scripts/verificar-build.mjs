#!/usr/bin/env node
/**
 * BUILD VERIFICADO — porque EXIT=0 no prueba que el build esté sano.
 * ==================================================================
 *
 * Next reintenta cada página hasta tres veces. Un build con 7 fallos P2024
 * —pool de conexiones agotado— termina en verde porque los reintentos acaban
 * pasando. Ocurrió al extraer lib/enlaces.ts: `cache()` de React memoiza dentro
 * de un render, y en el prerender cada una de las 167 páginas es su propio
 * render, así que la ficha pasó de 1 consulta a 3 y el pool de 5 murió.
 * `npm run build` devolvió 0. El daño solo se veía contando dentro del log.
 *
 * Misma clase de defecto que el `new Date()` en datos derivados y que el
 * `no-store` del catálogo: no rompe nada visible y lo degrada todo.
 *
 * ---------------------------------------------------------------------------
 * QUÉ FALLA Y QUÉ SOLO AVISA
 *
 * FALLA (exit 1) — son defectos del código, no del entorno:
 *   · P2024              pool agotado: alguien añadió consultas por página.
 *   · prerender error    una página no se generó por una excepción.
 *
 * AVISA — son del entorno, y hacerlos fallar convertiría una Railway lenta en
 * un falso error de código, que es justo lo que evitamos en la guarda de
 * veredas:
 *   · «took more than 60 seconds»
 *   · «Retrying again shortly»
 *
 *  Los avisos se comparan contra el build anterior (.build-historial.json).
 * Una subida brusca sí merece mirada aunque ninguno sea, por sí solo, un fallo.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES EL SCRIPT `build`
 *
 * Por dos razones distintas, y conviene no confundirlas:
 *
 *  1. RECURSIÓN. Este script LANZA `npm run build` y analiza su log. Si él
 *     mismo fuera ese script, se llamaría a sí mismo.
 *  2. Su valor está en comparar contra el build anterior (`.build-historial`),
 *     que es una disciplina local: se corre antes de empujar, cuando aún se
 *     puede arreglar.
 *
 * NO por miedo a Railway. Esa preocupación era real y está resuelta dentro de
 * cada guarda: `veredas-integridad` y `tipos-integridad` devuelven ok:true si
 * no alcanzan la base, y `verificar-enlaces` omite su clase (b). Distinguen
 * «los datos divergen» de «no llego a la base», que es lo que permite que una
 * guarda viva dentro del despliegue sin tumbarlo por una caída de
 * infraestructura. Cualquier guarda nueva que consulte la base TIENE que
 * respetar esa distinción.
 *
 * Desde el 22/08/2026 `verificar-enlaces.mjs` SÍ es el último paso de
 * `npm run build`, así que corre también en Vercel.
 *
 *     npm run build:verificado
 */

import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// FUERA de .next: el propio build borra ese directorio, así que el historial
// guardado dentro nunca sobrevivía para la comparación siguiente.
const HISTORIAL = '.build-historial.json'

const PATRONES = [
  { clave: 'p2024',      re: /P2024/g,                        grave: true,  label: 'P2024 (pool agotado)' },
  { clave: 'prerender',  re: /Error occurred prerendering/g,   grave: true,  label: 'errores de prerender' },
  { clave: 'timeouts',   re: /took more than \d+ seconds/g,    grave: false, label: 'timeouts de página' },
  { clave: 'reintentos', re: /Retrying again shortly/g,        grave: false, label: 'reintentos' },
  // No es un error: es la MAGNITUD. Un salto grande al añadir enlaces significa
  // consultas por página en vez de una consulta compartida, que es lo que agota
  // el pool de 5 durante el prerender. Se compara con el build anterior.
  { clave: 'consultas',  re: /prisma:query/g,                  grave: false, label: 'consultas a la base' },
]

let salida = ''

const hijo = spawn('npm', ['run', 'build'], {
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, SFR_LOG_QUERIES: '1' },
})
hijo.stdout.on('data', d => { salida += d; process.stdout.write(d) })
hijo.stderr.on('data', d => { salida += d; process.stderr.write(d) })

hijo.on('close', codigo => {
  const conteo = Object.fromEntries(
    PATRONES.map(p => [p.clave, (salida.match(p.re) ?? []).length]),
  )

  const previo = existsSync(HISTORIAL)
    ? JSON.parse(readFileSync(HISTORIAL, 'utf8'))
    : null

  console.log('\n══ VERIFICACIÓN DEL BUILD ═══════════════════════════════════')
  console.log(`  exit de next build: ${codigo}`)
  for (const p of PATRONES) {
    const n = conteo[p.clave]
    const antes = previo ? previo[p.clave] : null
    const delta = antes === null ? '' : n > antes ? `  ▲ antes ${antes}` : n < antes ? `  ▼ antes ${antes}` : '  = igual'
    const marca = n === 0 ? '·' : p.grave ? '✗' : '!'
    console.log(`  ${marca} ${String(n).padStart(3)}  ${p.label.padEnd(26)}${delta}`)
  }
  if (!previo) console.log('  (sin build anterior con el que comparar)')

  try {
    writeFileSync(HISTORIAL, JSON.stringify(conteo, null, 2))
  } catch { /* el historial es una ayuda, no un requisito */ }

  // Un salto de más del 50% en consultas no es un error, pero es la señal que
  // precedió a los dos P2024 anteriores. Se avisa fuerte.
  if (previo && previo.consultas > 0 && conteo.consultas > previo.consultas * 1.5) {
    console.log("")
    console.log(`  ATENCIÓN: las consultas subieron de ${previo.consultas} a ${conteo.consultas}.`)
    console.log('  Revisa si algo pasó a consultar POR PÁGINA en vez de una vez.')
  }

  const graves = PATRONES.filter(p => p.grave && conteo[p.clave] > 0)

  if (codigo !== 0) {
    // `npm run build` son ahora DOS pasos: `next build` y, detrás,
    // `verificar-enlaces.mjs`. No se puede afirmar cuál de los dos falló sin
    // mirar la salida, y afirmarlo mal manda a buscar el fallo donde no está.
    console.log('  → `npm run build` falló: mira arriba si fue next build o la')
    console.log('    guarda de enlaces internos.')
    console.log('═════════════════════════════════════════════════════════════\n')
    process.exit(codigo ?? 1)
  }

  if (graves.length) {
    console.log('')
    console.log('  BUILD EN VERDE PERO DEGRADADO. Next reintentó y las páginas')
    console.log('  acabaron generándose, pero esto es un defecto del código:')
    for (const p of graves) console.log(`    · ${conteo[p.clave]} × ${p.label}`)
    console.log('')
    console.log('  P2024 casi siempre significa consultas de más POR PÁGINA.')
    console.log('  Revisa lo último que tocó datos: un `cache()` de React no')
    console.log('  sirve entre páginas del prerender; usa `unstable_cache`.')
    console.log('═════════════════════════════════════════════════════════════\n')
    process.exit(1)
  }

  // La guarda de enlaces internos ya NO se lanza aquí: desde el 22/08/2026 es
  // el último paso de `npm run build`, así que corre también en Vercel y ya
  // se ejecutó dentro del hijo de arriba. Lanzarla otra vez sería repetir un
  // recorrido de 118 páginas para obtener el mismo resultado.
  console.log('  → sano.')
  console.log('═════════════════════════════════════════════════════════════\n')
})
