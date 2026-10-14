#!/usr/bin/env node
/**
 * PASA A LF LOS ARCHIVOS QUE EL REPOSITORIO GUARDA CON LF.
 *
 * El arreglo de `verificar-portabilidad.mjs`. No cambia nada que git vea: él ya
 * guardaba LF, así que el `git diff` de esto sale vacío. Lo que cambia son los
 * bytes en disco, que son los que una huella SHA-256 lee y los que difieren de
 * los de Vercel.
 *
 * Solo toca lo que `.gitattributes` declara `eol=lf`, preguntándoselo a git: un
 * `.bat` con `eol=crlf` se queda como está.
 *
 *   node scripts/normalizar-saltos.mjs            dice qué haría
 *   node scripts/normalizar-saltos.mjs --escribir lo hace
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const escribir = process.argv.includes('--escribir')
const versionados = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean)

const respuesta = execFileSync('git', ['check-attr', 'eol', '--stdin'], {
  encoding: 'utf8', input: versionados.join('\n'),
})
const quiere = new Map()
for (const linea of respuesta.split('\n')) {
  const i = linea.lastIndexOf(': eol: ')
  if (i > 0) quiere.set(linea.slice(0, i), linea.slice(i + 7).trim())
}

const tocados = []
for (const f of versionados) {
  if (quiere.get(f) !== 'lf') continue
  let b
  try {
    b = readFileSync(f)
  } catch {
    continue
  }
  if (b.subarray(0, 8000).includes(0)) continue
  if (!b.includes('\r\n')) continue
  tocados.push(f)
  if (escribir) writeFileSync(f, b.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
}

console.log(`\n  ${tocados.length} archivo(s) con CRLF donde el repositorio guarda LF.`)
for (const f of tocados.slice(0, 20)) console.log(`    ${f}`)
if (tocados.length > 20) console.log(`    … y ${tocados.length - 20} más.`)
console.log(escribir
  ? '\n  ✓ pasados a LF. `git diff` no verá nada: eso es lo esperado.\n'
  : '\n  (nada escrito. Añade --escribir)\n')
