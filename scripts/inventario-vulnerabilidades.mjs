#!/usr/bin/env node
/**
 * LAS VULNERABILIDADES, CLASIFICADAS POR QUIÉN CONTROLA LA ENTRADA
 * ===============================================================
 *
 * «19 vulnerabilities (4 moderate, 14 high, 1 critical)» salía en cada build
 * desde hacía meses y nadie la había leído, porque el log solo se abre cuando
 * sale rojo. Un build verde dice lo mismo que uno rojo sobre todo lo que no hizo
 * fallar el build.
 *
 * El número agregado no sirve para decidir, por lo mismo que no servía el
 * indicador agregado del módulo financiero: mete en la misma cuenta una
 * dependencia de `eslint` y el marco que sirve cada petición.
 *
 * ⚠ DOS CORRECCIONES QUE COSTARON UN DESPLIEGUE ROJO. Las dos van aquí porque
 * las dos eran mías y las dos son reutilizables.
 *
 * 1. LA MEDICIÓN DEPENDÍA DE LA SUPERFICIE. La primera versión llamaba a
 *    `npm audit` sin banderas. Aquí cuenta 19; en Vercel contaba **8**, porque
 *    allí `NODE_ENV=production` y npm omite las devDependencies del audit. El
 *    guion concluyó que once paquetes declarados «ya no aparecen» y rompió el
 *    build. Es el mismo error que la huella del documento: **medir la superficie
 *    en vez del contenido**. Ahora las dos consultas van con bandera explícita
 *    —`--omit=dev` y `--include=dev`—, así que dan lo mismo en cualquier máquina.
 *
 * 2. «DE DESARROLLO» ERA FALSO PARA SEIS. El árbol de PRODUCCIÓN trae ocho, y
 *    entre ellos `js-yaml`, `argparse` y `sprintf-js`, que vienen de
 *    `gray-matter` —el que parsea el frontmatter del blog, y esas rutas leen el
 *    MDX en runtime—, y `postcss`, `nanoid` y `source-map-js`, que vienen de
 *    `next` y de `critters` con `optimizeCss` activo. **Su código sí corre
 *    sirviendo peticiones.** Lo que los separa de la crítica no es que no
 *    corran: es que **la entrada es nuestra y no del visitante**.
 *
 * TRES CATEGORÍAS, no dos:
 *
 *   · VISITANTE          el visitante alcanza la ruta Y controla la entrada.
 *   · ENTRADA_NUESTRA    el código puede correr sirviendo, pero lo que procesa
 *                        sale de nuestro repositorio o de nuestra configuración.
 *   · SOLO_DESARROLLO    no está en el árbol de producción. **Y eso se
 *                        COMPRUEBA**: tiene que estar ausente del audit sin dev
 *                        y presente en el audit con dev. No es una opinión.
 *
 * Lo que NO hace: fallar por las vulnerabilidades en sí. Están medidas y
 * aplazadas a propósito. Lo medido se puede aplazar; lo invisible no.
 *
 *   node scripts/inventario-vulnerabilidades.mjs
 */
import { spawnSync } from 'node:child_process'

const ALCANCE = {
  /* ── El visitante alcanza la ruta y controla la entrada ───────────────── */
  next: {
    alcance: 'VISITANTE', por: 'el marco sirve cada peticion: cualquier fallo suyo esta en el camino caliente',
    /* Desde 15.5.28 ya no trae alertas propias: las cuatro de antes (RCE en
     * Windows, RCE en Image Optimization con AVIF, dos de cache SSG/ISR
     * autoalojado) quedaron cerradas con la actualizacion. Lo que npm sigue
     * plegando bajo next es solo su postcss interno (8.4.31). */
    comprobado:
      'sin alertas propias desde 15.5.28; queda marcado solo por su postcss interno, ' +
      'que procesa el CSS que escribimos nosotros (ver la fila de postcss)',
  },

  /* ── Corre sirviendo, pero con entrada nuestra ─────────────────────────── */
  'gray-matter': {
    alcance: 'ENTRADA_NUESTRA',
    por: 'parsea el frontmatter del blog; marcado por su js-yaml',
    comprobado: 'el YAML que procesa son los .mdx del repositorio, no algo que mande el visitante',
  },
  'js-yaml': {
    alcance: 'ENTRADA_NUESTRA',
    por: 'via gray-matter, que parsea el frontmatter del blog; esas rutas leen el MDX en runtime',
    comprobado: 'el YAML que procesa son los .mdx del repositorio, no algo que mande el visitante',
  },
  argparse: { alcance: 'ENTRADA_NUESTRA', por: 'transitiva de js-yaml, misma cadena de gray-matter' },
  'sprintf-js': { alcance: 'ENTRADA_NUESTRA', por: 'transitiva de argparse, misma cadena' },
  postcss: {
    alcance: 'ENTRADA_NUESTRA',
    por: 'via next y critters (optimizeCss activo); el CSS que procesa lo escribimos nosotros',
  },

  /* ── Fuera del arbol de produccion. COMPROBADO, no afirmado ───────────── */
  tailwindcss: { alcance: 'SOLO_DESARROLLO', por: 'devDependency' },
  'eslint-config-next': { alcance: 'SOLO_DESARROLLO', por: 'devDependency' },
  '@next/eslint-plugin-next': { alcance: 'SOLO_DESARROLLO', por: 'via eslint-config-next' },
  'postcss-selector-parser': { alcance: 'SOLO_DESARROLLO', por: 'via tailwindcss' },
  'postcss-nested': { alcance: 'SOLO_DESARROLLO', por: 'via tailwindcss' },
  chokidar: { alcance: 'SOLO_DESARROLLO', por: 'vigilancia de archivos en desarrollo' },
  'fast-glob': { alcance: 'SOLO_DESARROLLO', por: 'glob de herramientas' },
  micromatch: { alcance: 'SOLO_DESARROLLO', por: 'glob de herramientas' },
  braces: { alcance: 'SOLO_DESARROLLO', por: 'glob de herramientas' },
}

/* ── preguntar, con bandera explícita ─────────────────────────────────────── */

class NoPudePreguntar extends Error {}

/**
 * `modo` va SIEMPRE explícito. Sin bandera, el resultado depende de `NODE_ENV`
 * y por tanto de la máquina, que es lo que rompió el despliegue del 2026-10-15.
 */
function auditar(modo) {
  const r = spawnSync(`npm audit --json ${modo}`, {
    encoding: 'utf8', shell: true, maxBuffer: 32 * 1024 * 1024,
  })
  const texto = `${r.stdout ?? ''}`
  if (!texto.trim()) throw new NoPudePreguntar(`npm audit ${modo} no devolvio nada`)
  let j
  try {
    j = JSON.parse(texto)
  } catch {
    throw new NoPudePreguntar(`npm audit ${modo} devolvio algo que no es JSON`)
  }
  if (!j.metadata?.vulnerabilities) throw new NoPudePreguntar(`npm audit ${modo} no trae el resumen`)
  const paquetes = Object.values(j.vulnerabilities ?? {}).filter(v => v.severity !== 'info')
  return { resumen: j.metadata.vulnerabilities, paquetes, nombres: new Set(paquetes.map(v => v.name)) }
}

console.log('\n══ VULNERABILIDADES, POR QUIÉN CONTROLA LA ENTRADA ═══════════')

let prod, todo
try {
  prod = auditar('--omit=dev')
  todo = auditar('--include=dev')
} catch (e) {
  if (!(e instanceof NoPudePreguntar)) throw e
  /* «No pude preguntar» NO es «no hay». Se dice, y no se rompe el build por una
   * red caida: esto informa. Pero tiene que verse distinto de un cero. */
  console.log(`  ⚠ NO PUDE PREGUNTAR: ${e.message}`)
  console.log('    Esto no dice que no haya vulnerabilidades: dice que no se consultaron.\n')
  process.exit(0)
}

const visitante = prod.paquetes.filter(v => ALCANCE[v.name]?.alcance === 'VISITANTE')
const nuestra = prod.paquetes.filter(v => ALCANCE[v.name]?.alcance === 'ENTRADA_NUESTRA')
const soloDesarrollo = [...todo.nombres].filter(n => !prod.nombres.has(n))

console.log(`  ARBOL DE PRODUCCION: ${prod.resumen.total} ` +
  `(${prod.resumen.critical} critica · ${prod.resumen.high} alta · ${prod.resumen.moderate} moderada)`)
console.log(`  ARBOL COMPLETO, con desarrollo: ${todo.resumen.total}`)
console.log('')
console.log(`  ① ALCANZABLES POR UN VISITANTE: ${visitante.length}`)
for (const v of visitante) {
  console.log(`     ! ${v.name} (${v.severity}) — ${ALCANCE[v.name].por}`)
  if (ALCANCE[v.name].comprobado) for (const l of partir(ALCANCE[v.name].comprobado, 82)) console.log(`       ${l}`)
}
console.log(`\n  ② CORREN SIRVIENDO, PERO CON ENTRADA NUESTRA: ${nuestra.length}`)
for (const v of nuestra) {
  console.log(`     · ${v.name} (${v.severity}) — ${ALCANCE[v.name].por}`)
  if (ALCANCE[v.name].comprobado) for (const l of partir(ALCANCE[v.name].comprobado, 82)) console.log(`       ${l}`)
}
console.log(`\n  ③ FUERA DEL ARBOL DE PRODUCCION: ${soloDesarrollo.length}`)
console.log(`     ${soloDesarrollo.sort().join(', ')}`)

/* ── las comprobaciones ───────────────────────────────────────────────────── */

const problemas = []

for (const v of todo.paquetes) {
  if (!ALCANCE[v.name]) problemas.push(`${v.name} (${v.severity}) es NUEVA y no esta clasificada`)
}
for (const [n, d] of Object.entries(ALCANCE)) {
  if (!todo.nombres.has(n)) { problemas.push(`${n} esta clasificado y ya no aparece en el audit: quita su fila`); continue }
  /* LA CATEGORIA SE COMPRUEBA, no se cree. Un paquete declarado como solo de
   * desarrollo que SI esta en el arbol de produccion es una clasificacion
   * equivocada, y es exactamente el error que costo el despliegue rojo. */
  const enProd = prod.nombres.has(n)
  if (d.alcance === 'SOLO_DESARROLLO' && enProd) {
    problemas.push(`${n} esta declarado SOLO_DESARROLLO y SI esta en el arbol de produccion`)
  }
  if (d.alcance !== 'SOLO_DESARROLLO' && !enProd) {
    problemas.push(`${n} esta declarado ${d.alcance} y NO esta en el arbol de produccion: es de desarrollo`)
  }
}

if (problemas.length) {
  console.log('')
  for (const p of problemas) console.log(`  ✗ ${p}.`)
  console.log('')
  process.exit(1)
}

console.log(`\n  → las ${todo.paquetes.length} estan clasificadas y cada categoria cuadra con el audit.`)
console.log('    Medidas y aplazadas a proposito.\n')

function partir(texto, ancho) {
  const lineas = []
  let actual = ''
  for (const p of texto.split(' ')) {
    if ((actual + ' ' + p).trim().length > ancho) { lineas.push(actual.trim()); actual = p }
    else actual += ' ' + p
  }
  if (actual.trim()) lineas.push(actual.trim())
  return lineas
}
