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
 * Los avisos se comparan contra el build anterior (.next/ultimo-build.json).
 * Una subida brusca sí merece mirada aunque ninguno sea, por sí solo, un fallo.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES EL SCRIPT `build`
 *
 * Vercel ejecuta `npm run build`. Si este chequeo fuera ese script, un hipo de
 * Railway durante un despliegue lo tumbaría. La disciplina es local: se corre
 * antes de empujar, que es cuando aún se puede arreglar.
 *
 *     npm run build:verificado
 */

import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const HISTORIAL = '.next/ultimo-build.json'

const PATRONES = [
  { clave: 'p2024',      re: /P2024/g,                        grave: true,  label: 'P2024 (pool agotado)' },
  { clave: 'prerender',  re: /Error occurred prerendering/g,   grave: true,  label: 'errores de prerender' },
  { clave: 'timeouts',   re: /took more than \d+ seconds/g,    grave: false, label: 'timeouts de página' },
  { clave: 'reintentos', re: /Retrying again shortly/g,        grave: false, label: 'reintentos' },
]

let salida = ''

const hijo = spawn('npm', ['run', 'build'], { shell: true, stdio: ['inherit', 'pipe', 'pipe'] })
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
    mkdirSync('.next', { recursive: true })
    writeFileSync(HISTORIAL, JSON.stringify(conteo, null, 2))
  } catch { /* el historial es una ayuda, no un requisito */ }

  const graves = PATRONES.filter(p => p.grave && conteo[p.clave] > 0)

  if (codigo !== 0) {
    console.log('  → next build falló por su cuenta.')
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

  console.log('  → sano.')
  console.log('═════════════════════════════════════════════════════════════\n')
})
