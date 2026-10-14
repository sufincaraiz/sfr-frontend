#!/usr/bin/env node
/**
 * ¿VERCEL DESPLEGÓ ESTE COMMIT, Y QUÉ ESTÁ SIRVIENDO AHORA?
 * ========================================================
 *
 * Existe por lo que pasó el 2026-10-14. El reporte decía «tsc y build limpios»
 * y era verdad; el despliegue del mismo commit había fallado a los 17 segundos.
 * Las dos afirmaciones eran ciertas porque **no hablaban de lo mismo**:
 *
 *   · el build de la máquina de desarrollo
 *   · el build que despliega Vercel
 *
 * Son DOS SUPERFICIES, como el arnés en memoria y la base de datos. Un verde en
 * una no es un hecho sobre la otra. Y lo que las separó aquel día no fue una
 * variable de entorno ni el caché: fue el CHECKOUT. `.gitattributes` guarda el
 * documento con LF, la copia en Windows lo tenía con CRLF, y la huella que una
 * guarda comparaba era de la copia y no del contenido. Mismo commit, bytes
 * distintos, y `git diff` vacío: git no veía ninguna diferencia.
 *
 * ⚠ «EMPUJADO» Y «DESPLEGADO» SON DOS COSAS DISTINTAS. Y «build limpio» sin
 * decir en qué superficie no significa nada. Esto está aquí para que decirlo
 * cueste lo mismo que comprobarlo:
 *
 *   node scripts/estado-del-deploy.mjs
 *
 * Sale con 1 mientras el commit de HEAD no esté READY en producción, así que
 * no se puede «dar por desplegado» a base de haber hecho push.
 */
import { execFileSync, spawnSync } from 'node:child_process'

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim()

/**
 * ⚠ «NO PUDE PREGUNTAR» NO ES «NO HAY DESPLIEGUE».
 *
 * La primera versión de esto devolvía cadena vacía cuando el proceso de Vercel
 * no arrancaba —Node 20 se niega a ejecutar un `.cmd` sin shell— y el guion
 * concluía «Vercel no tiene ningún despliegue de este commit». Era falso y
 * tranquilizador en la dirección contraria: el despliegue existía y estaba en
 * ERROR. Un instrumento que confunde «no sé» con «no hay» no sirve para decidir
 * nada, y este existe precisamente para decidir si se puede decir «desplegado».
 */
class NoPudePreguntar extends Error {}

function vercelLs(sha) {
  const bin = process.platform === 'win32' ? 'vercel.cmd' : 'vercel'
  /* El sha sale de `git rev-parse`: 40 hexadecimales. Se comprueba igual, porque
   * en Windows esto va por shell y lo que entra en una linea de shell se mira. */
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new NoPudePreguntar(`sha raro: ${sha}`)

  /* spawnSync y no execFileSync: el CLI de Vercel manda a stderr las lineas que
   * dicen que CONSULTO el proyecto, y deja en stdout solo la url. Mirando una
   * sola de las dos no se distingue «consulte y no hay» de «no llegue a
   * consultar», que es la confusion que este guion existe para no cometer. */
  /* La orden va como UNA cadena y no como argumentos: con `shell` las dos cosas
   * acaban concatenadas igual, y pasarlas separadas solo hace que Node avise de
   * una seguridad que no da. Lo que de verdad protege es el sha comprobado
   * arriba; aqui no entra nada mas de fuera. */
  const r = spawnSync(`${bin} ls --prod --meta githubCommitSha=${sha}`, {
    encoding: 'utf8', shell: true,
  })
  if (r.error) throw new NoPudePreguntar(r.error.message)
  const todo = `${r.stdout ?? ''}\n${r.stderr ?? ''}`

  /* La prueba de que hablo con Vercel es que contesto sobre despliegues: o lista
   * uno, con su estado, o dice que no hay ninguno. Cualquier otra cosa -no
   * autenticado, sin red, proyecto equivocado- es «no se». */
  const listo = /●\s+(Ready|Error|Building|Queued|Canceled)/i.test(todo)
  const vacio = /No deployments found/i.test(todo)
  if (!listo && !vacio) {
    const ultimo = todo.trim().split('\n').filter(Boolean).slice(-2).join(' · ')
    throw new NoPudePreguntar(ultimo || 'salida ilegible')
  }
  return todo
}

const sha = git('rev-parse', 'HEAD')
const corto = sha.slice(0, 7)
const asunto = git('log', '-1', '--format=%s')

console.log('\n══ ESTADO DEL DESPLIEGUE ═════════════════════════════════════')
console.log(`  HEAD: ${corto}  ${asunto.slice(0, 60)}`)

/* Antes de preguntar por el despliegue: ¿está empujado? Preguntar por un commit
 * que Vercel no puede haber visto da «sin despliegue», que es cierto y no
 * informa. */
let empujado = true
try {
  git('merge-base', '--is-ancestor', sha, git('rev-parse', '@{u}'))
} catch {
  empujado = false
}
if (!empujado) {
  console.log('\n  ✗ este commit NO está empujado. Vercel no puede haberlo visto.')
  console.log('    «empujado» y «desplegado» son dos cosas distintas, y esto no es ni lo uno.\n')
  process.exit(1)
}

let salida
try {
  salida = vercelLs(sha)
} catch (e) {
  if (!(e instanceof NoPudePreguntar)) throw e
  console.log('\n  ✗ NO PUDE PREGUNTARLE A VERCEL. Esto no dice nada del despliegue.')
  console.log(`    ${e.message}`)
  console.log('    Mientras no se pueda consultar, no se puede afirmar ni desplegado ni no.\n')
  process.exit(2)
}
const estado = salida.match(/●\s+(Ready|Error|Building|Queued|Canceled)/i)?.[1]

if (!estado) {
  console.log('\n  ✗ Vercel no tiene ningún despliegue de producción de este commit.')
  console.log('    Empujado sí; desplegado no. No se puede reportar como desplegado.\n')
  process.exit(1)
}

const url = salida.match(/https:\/\/\S+\.vercel\.app/)?.[0] ?? '(sin url)'
console.log(`  Vercel: ${estado.toUpperCase()} — ${url}`)

if (!/ready/i.test(estado)) {
  console.log(`\n  ✗ el despliegue de ${corto} está en ${estado.toUpperCase()}.`)
  if (/error/i.test(estado)) {
    console.log(`    El log, que es donde está la causa y no aquí:`)
    console.log(`      vercel inspect --logs ${url}`)
  }
  console.log('')
  process.exit(1)
}

console.log(`\n  ✓ ${corto} está READY en producción.`)
console.log('    Esto es lo único que autoriza a decir «desplegado».\n')
