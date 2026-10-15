#!/usr/bin/env node
/**
 * LAS VULNERABILIDADES, CLASIFICADAS POR QUIÉN LAS ALCANZA
 * =======================================================
 *
 * «19 vulnerabilities (4 moderate, 14 high, 1 critical)» sale en cada build
 * desde hace meses y nadie la había leído, porque el log solo se abre cuando
 * sale rojo. Un build verde imprime lo mismo y nadie lo mira: es una superficie
 * sin inspeccionar.
 *
 * Y el número agregado no sirve para decidir, por lo mismo que no servía el
 * indicador agregado del módulo financiero: mete en la misma cuenta una
 * dependencia de `eslint` que nunca corre en producción y el marco que sirve
 * cada petición. Lo que decide es **quién puede alcanzar la ruta vulnerable**.
 *
 * Por eso aquí hay DOS cifras y no una:
 *
 *   · VISITANTE  un visitante de sufincaraiz.com puede alcanzarla.
 *   · INTERNA    vive en el build o en herramientas de desarrollo que nunca
 *                corren sirviendo una petición.
 *
 * ⚠ LA CLASIFICACIÓN SE DECLARA Y SE COMPRUEBA.
 *
 * Cada paquete lleva su alcance y el **porqué**, y donde el porqué era
 * comprobable se comprobó en producción, no de memoria. Si `npm audit` saca un
 * paquete que no está declarado, esto **rompe el build**: una vulnerabilidad
 * nueva no puede entrar en silencio. Y si un paquete declarado desaparece del
 * audit, también rompe: una excepción que sobrevive a su causa engaña igual que
 * una fila mal declarada.
 *
 * Lo que NO hace: fallar por las vulnerabilidades en sí. Están medidas y
 * aplazadas a propósito. Lo medido se puede aplazar; lo invisible no.
 *
 *   node scripts/inventario-vulnerabilidades.mjs
 */
import { spawnSync } from 'node:child_process'

/**
 * El alcance de cada paquete vulnerable, con su razón.
 *
 * `comprobado` es para lo que se verificó contra producción y no se razonó: va
 * con el resultado literal, para que mañana se pueda repetir.
 */
const ALCANCE = {
  next: {
    alcance: 'VISITANTE', severidad: 'critical',
    porque: 'es el marco que sirve cada peticion: cualquier fallo suyo esta en el camino caliente',
    /* Las CUATRO alertas que npm pliega bajo este paquete, una por una. Ninguna
     * aplica a ESTE despliegue, y las dos primeras se comprobaron: */
    comprobado:
      'RCE en servidores Windows: Vercel construye y sirve en Linux (iad1, en el log del build). ' +
      'RCE en la Image Optimization API con AVIF: /_next/image devuelve 404 en produccion ' +
      '-comprobado con curl, tres variantes- porque next.config usa loader custom de Cloudinary. ' +
      'Las dos de envenenamiento de cache de SSG/ISR dicen «in self-hosted applications» y esto ' +
      'no es autoalojado. El salto que las cierra es a 15.5.24 o superior dentro de la misma mayor.',
  },
  sharp: {
    alcance: 'INTERNA', severidad: 'high',
    porque: 'transitiva de next, solo la usa el optimizador de imagenes del servidor',
    comprobado: '/_next/image devuelve 404 en produccion, asi que ningun byte de imagen pasa por sharp en runtime',
  },

  /* ── Build: corren al compilar y su salida es estatica ─────────────────── */
  postcss: { alcance: 'INTERNA', severidad: 'high',
    porque: 'procesa el CSS al compilar; la XSS del stringify afecta a CSS que escribimos nosotros' },
  'postcss-selector-parser': { alcance: 'INTERNA', severidad: 'moderate', porque: 'idem, al compilar' },
  'source-map-js': { alcance: 'INTERNA', severidad: 'high', porque: 'mapas de fuentes del build' },
  browserslist: { alcance: 'INTERNA', severidad: 'high', porque: 'decide los navegadores objetivo al compilar' },
  'baseline-browser-mapping': { alcance: 'INTERNA', severidad: 'moderate', porque: 'dato de browserslist, al compilar' },
  nanoid: { alcance: 'INTERNA', severidad: 'high',
    porque: 'transitiva; nuestro codigo no lo usa y el fallo exige un generador propio con tamano cero' },

  /* ── Desarrollo: eslint, tailwind y sus glob ───────────────────────────── */
  tailwindcss: { alcance: 'INTERNA', severidad: 'high', porque: 'dependencia de desarrollo' },
  'eslint-config-next': { alcance: 'INTERNA', severidad: 'high', porque: 'dependencia de desarrollo' },
  '@next/eslint-plugin-next': { alcance: 'INTERNA', severidad: 'high', porque: 'dependencia de desarrollo' },
  chokidar: { alcance: 'INTERNA', severidad: 'high', porque: 'vigilancia de archivos en desarrollo' },
  'fast-glob': { alcance: 'INTERNA', severidad: 'high', porque: 'glob de herramientas' },
  micromatch: { alcance: 'INTERNA', severidad: 'high', porque: 'glob de herramientas' },
  braces: { alcance: 'INTERNA', severidad: 'high', porque: 'glob de herramientas' },
  'brace-expansion': { alcance: 'INTERNA', severidad: 'high', porque: 'glob de herramientas' },
  'js-yaml': { alcance: 'INTERNA', severidad: 'high', porque: 'transitiva de herramientas de desarrollo' },
  argparse: { alcance: 'INTERNA', severidad: 'moderate', porque: 'transitiva de js-yaml' },
  'sprintf-js': { alcance: 'INTERNA', severidad: 'moderate', porque: 'transitiva de argparse' },
}

/* ── preguntar ─────────────────────────────────────────────────────────────── */

class NoPudePreguntar extends Error {}

function auditar() {
  const r = spawnSync('npm audit --json', { encoding: 'utf8', shell: true, maxBuffer: 32 * 1024 * 1024 })
  const texto = `${r.stdout ?? ''}`
  if (!texto.trim()) throw new NoPudePreguntar(`npm audit no devolvio nada (${r.stderr ?? ''}`.slice(0, 160))
  let j
  try {
    j = JSON.parse(texto)
  } catch {
    throw new NoPudePreguntar('npm audit devolvio algo que no es JSON')
  }
  if (!j.metadata?.vulnerabilities) throw new NoPudePreguntar('npm audit no trae el resumen')
  return j
}

console.log('\n══ VULNERABILIDADES, POR QUIÉN LAS ALCANZA ═══════════════════')

let auditoria
try {
  auditoria = auditar()
} catch (e) {
  if (!(e instanceof NoPudePreguntar)) throw e
  /* «No pude preguntar» NO es «no hay». Se dice, y no se rompe el build por una
   * red caida: esto informa, no bloquea. Pero tiene que verse distinto. */
  console.log(`  ⚠ NO PUDE PREGUNTAR: ${e.message}`)
  console.log('    Esto no dice que no haya vulnerabilidades: dice que no se consultaron.\n')
  process.exit(0)
}

const m = auditoria.metadata.vulnerabilities
const paquetes = Object.values(auditoria.vulnerabilities ?? {}).filter(v => v.severity !== 'info')

const sinDeclarar = paquetes.filter(v => !ALCANCE[v.name])
const declaradosQueYaNoSalen = Object.keys(ALCANCE).filter(n => !paquetes.some(v => v.name === n))

const visitante = paquetes.filter(v => ALCANCE[v.name]?.alcance === 'VISITANTE')
const interna = paquetes.filter(v => ALCANCE[v.name]?.alcance === 'INTERNA')

console.log(`  npm cuenta ${m.total}: ${m.critical} critica(s) · ${m.high} alta(s) · ` +
  `${m.moderate} moderada(s) · ${m.low} baja(s)`)
console.log('')
console.log(`  ALCANZABLES POR UN VISITANTE: ${visitante.length}`)
for (const v of visitante) {
  console.log(`     ! ${v.name} (${v.severity})`)
  console.log(`       ${ALCANCE[v.name].porque}`)
  if (ALCANCE[v.name].comprobado) {
    for (const linea of partir(ALCANCE[v.name].comprobado, 84)) console.log(`       ${linea}`)
  }
}
console.log(`\n  INTERNAS (build o desarrollo, nunca sirviendo una peticion): ${interna.length}`)
const porAlcance = new Map()
for (const v of interna) {
  const k = ALCANCE[v.name].porque
  if (!porAlcance.has(k)) porAlcance.set(k, [])
  porAlcance.get(k).push(`${v.name} (${v.severity})`)
}
for (const [porque, nombres] of porAlcance) {
  console.log(`     · ${nombres.join(', ')}`)
  console.log(`       ${porque}`)
}

if (sinDeclarar.length || declaradosQueYaNoSalen.length) {
  console.log('')
  for (const v of sinDeclarar) {
    console.log(`  ✗ ${v.name} (${v.severity}) es NUEVA y no esta clasificada.`)
    console.log('     Clasificala en ALCANCE diciendo quien la alcanza y por que.')
  }
  for (const n of declaradosQueYaNoSalen) {
    console.log(`  ✗ ${n} esta clasificado y ya no aparece en el audit. Quita su fila.`)
  }
  console.log('')
  process.exit(1)
}

console.log('\n  → las ' + paquetes.length + ' estan clasificadas. Medidas y aplazadas a proposito.\n')

function partir(texto, ancho) {
  const palabras = texto.split(' ')
  const lineas = []
  let actual = ''
  for (const p of palabras) {
    if ((actual + ' ' + p).trim().length > ancho) { lineas.push(actual.trim()); actual = p }
    else actual += ' ' + p
  }
  if (actual.trim()) lineas.push(actual.trim())
  return lineas
}
