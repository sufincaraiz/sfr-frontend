#!/usr/bin/env node
/**
 * LO QUE WINDOWS PERDONA Y LINUX NO
 * =================================
 *
 * La máquina de desarrollo es Windows. El objetivo —Vercel— es Linux. Son dos
 * superficies permanentes, y lo que las separa no da error aquí: da error allí,
 * en el despliegue, con el commit ya empujado.
 *
 * Esto vigila las dos formas que ya nos costaron algo:
 *
 * 1. FINALES DE LÍNEA. `.gitattributes` guarda el texto con LF. Si una
 *    herramienta escribe CRLF en el árbol de trabajo, `git diff` sale VACÍO
 *    —para git los dos archivos son el mismo— y sin embargo los bytes en disco
 *    difieren de los que Vercel va a tener. El 2026-10-14 eso rompió dos
 *    despliegues: una guarda comparaba el SHA-256 de un documento, el módulo
 *    viajó con la huella del CRLF, y Vercel calculó la del LF. Mismo commit,
 *    dos huellas. Había 47 archivos versionados con CRLF.
 *
 *    ⚠ Un `git status` limpio NO protege de esto. Es justamente lo que lo
 *    esconde, y por eso hace falta mirar los bytes.
 *
 * 2. MAYÚSCULAS EN LOS IMPORTS. Windows no distingue la caja de un nombre de
 *    archivo y Linux sí. `import './Cotejo'` funciona aquí y revienta allí.
 *
 * Lo que NO vigila, y conviene saberlo: los permisos. Están todos en 100644 y
 * ningún script se invoca sin `node` delante, así que el bit de ejecución no
 * decide nada. Si algún día se invoca un script directamente, esto se queda
 * corto.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve, basename } from 'node:path'

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' })

/* ── 1. CRLF en archivos que el repositorio guarda con LF ──────────────────── */

/**
 * Qué finales de línea DEBE tener cada archivo según `.gitattributes`. No se
 * decide aquí: se le pregunta a git, que es quien manda. Un `.bat` declarado
 * `eol=crlf` tiene que tener CRLF, y marcarlo sería el falso positivo.
 */
function conCrlfIndebido() {
  const versionados = git('ls-files', '-z').split('\0').filter(Boolean)
  const atributos = git('check-attr', 'eol', '--stdin', ...[])
  void atributos
  const malos = []

  /* Una sola llamada a git para todos los archivos: preguntar uno por uno son
   * miles de procesos. */
  const respuesta = execFileSync('git', ['check-attr', 'eol', '--stdin'], {
    encoding: 'utf8', input: versionados.join('\n'),
  })
  const quiere = new Map()
  for (const linea of respuesta.split('\n')) {
    const i = linea.lastIndexOf(': eol: ')
    if (i > 0) quiere.set(linea.slice(0, i), linea.slice(i + 7).trim())
  }

  for (const f of versionados) {
    if (quiere.get(f) !== 'lf') continue
    let b
    try {
      b = readFileSync(f)
    } catch {
      continue
    }
    /* Binario declarado como texto: no se mira. Un NUL en los primeros bytes
     * es la señal que usa git. */
    if (b.subarray(0, 8000).includes(0)) continue
    const i = b.indexOf(0x0d)
    if (i >= 0 && b[i + 1] === 0x0a) {
      malos.push({ f, linea: b.subarray(0, i).toString('utf8').split('\n').length })
    }
  }
  return malos
}

/* ── 2. Caja de los imports relativos ──────────────────────────────────────── */

const EXTENSIONES = ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx']

function conCajaDistinta() {
  const archivos = git('ls-files', '-z').split('\0')
    .filter(f => /\.(ts|tsx|mjs|js)$/.test(f))
  const malos = []

  for (const f of archivos) {
    let src
    try {
      src = readFileSync(f, 'utf8')
    } catch {
      continue
    }
    /* Solo imports y exports de verdad, al principio de la línea: así no entra
     * el `from './cotejo'` que vive DENTRO de la plantilla de un generador y
     * que se resuelve en otro directorio. Eso ya fue un falso positivo una vez. */
    for (const m of src.matchAll(/^\s*(?:import|export)[^'"\n]*from\s+'(\.[^']+)'/gm)) {
      const base = resolve(dirname(f), m[1])
      const real = EXTENSIONES.map(e => base + e).find(p => existsSync(p))
      if (!real) continue /* que no resuelva es otro problema; lo dice tsc */
      const dir = dirname(real), nombre = basename(real)
      let hay
      try {
        hay = readdirSync(dir)
      } catch {
        continue
      }
      if (!hay.includes(nombre)) {
        const cual = hay.find(x => x.toLowerCase() === nombre.toLowerCase())
        malos.push({ f, imp: m[1], real: cual ?? '(?)' })
      }
    }
  }
  return malos
}

/* ── el informe ────────────────────────────────────────────────────────────── */

console.log('\n══ PORTABILIDAD: WINDOWS AQUÍ, LINUX EN VERCEL ═══════════════')

const crlf = conCrlfIndebido()
const caja = conCajaDistinta()

if (crlf.length) {
  console.log(`  ✗ ${crlf.length} archivo(s) con CRLF que el repositorio guarda con LF:`)
  for (const m of crlf.slice(0, 15)) console.log(`     ${m.f}`)
  if (crlf.length > 15) console.log(`     … y ${crlf.length - 15} más.`)
  console.log('     `git diff` sale vacío y los bytes difieren de los que tendrá Vercel.')
  console.log('     Normalízalos:  node scripts/normalizar-saltos.mjs')
} else {
  console.log('  ✓ ningún archivo de texto tiene CRLF donde el repositorio guarda LF.')
}

if (caja.length) {
  console.log(`  ✗ ${caja.length} import(s) con la caja distinta del archivo real:`)
  for (const m of caja) console.log(`     ${m.f}  →  '${m.imp}'   el archivo es «${m.real}»`)
  console.log('     Funciona en Windows y no resuelve en Linux.')
} else {
  console.log('  ✓ ningún import relativo difiere en mayúsculas del archivo real.')
}

console.log('')
if (crlf.length || caja.length) process.exit(1)
