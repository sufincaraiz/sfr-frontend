#!/usr/bin/env node
/**
 * EL LATIDO — ARNÉS
 * =================
 *
 * No toca la red ni la base. Lo que se prueba son las decisiones, que es donde
 * están los defectos de esta pieza:
 *
 *   · que `/fail` se construya bien pase lo que pase con la barra final —un
 *     `…uuid//fail` devolvería 404 y el aviso de fallo se perdería JUSTO cuando
 *     más falta hace—;
 *   · que la falta de configuración no se trague en silencio;
 *   · y que la URL, que es una credencial, no se escape en ningún texto.
 *
 * La prueba que NO está aquí, y es la que importa, es la de aceptación: apagar
 * el ping y comprobar que el aviso llega al Telegram de Leonel. Eso no lo puede
 * demostrar ningún arnés, porque la mitad de la cadena no es nuestra.
 *
 *     node scripts/probar-latido.mjs
 */
import { urlDeLatido, decidirLatido, latir } from '../src/lib/latido.ts'

let ok = 0, fail = 0
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`) }
}

const U = 'https://hc-ping.com/00000000-0000-0000-0000-000000000000'

console.log('\n══ LA URL DEL FALLO SE CONSTRUYE BIEN ════════════════════════')

check('el latido de vida va a la URL tal cual', urlDeLatido(U, 'VIVO') === U)
check('el de fallo le añade /fail', urlDeLatido(U, 'FALLO') === `${U}/fail`)
check('una barra final no produce //fail',
  urlDeLatido(`${U}/`, 'FALLO') === `${U}/fail`, urlDeLatido(`${U}/`, 'FALLO'))
check('ni varias barras finales',
  urlDeLatido(`${U}///`, 'FALLO') === `${U}/fail`, urlDeLatido(`${U}///`, 'FALLO'))
check('los espacios de un copia-y-pega se recortan',
  urlDeLatido(`  ${U}  `, 'VIVO') === U)
check('…y la barra final tampoco sobrevive en el latido de vida',
  urlDeLatido(`${U}/`, 'VIVO') === U)

console.log('\n══ SIN URL NO SE CALLA: SE DICE ══════════════════════════════')

for (const [etiqueta, v] of [['undefined', undefined], ['vacía', ''], ['espacios', '   ']]) {
  const d = decidirLatido(v)
  check(`con la variable ${etiqueta} NO late, y dice por qué`,
    d.late === false && /HEALTHCHECKS_PING_URL/.test(d.motivo), JSON.stringify(d))
}
check('con una URL buena, late', decidirLatido(U).late === true)
check('…y devuelve la base ya limpia', decidirLatido(`  ${U}/  `).base === `${U}/`.trim())

/* La URL es la credencial: por http viajaría en claro hasta el vigilante. */
check('una URL http NO late, y lo dice',
  decidirLatido('http://hc-ping.com/abc').late === false)
check('…y el motivo nombra la variable, para que se pueda arreglar sin leer código',
  /HEALTHCHECKS_PING_URL/.test(decidirLatido('http://hc-ping.com/abc').motivo))

console.log('\n══ EL LATIDO NO PUEDE MATAR A QUIEN VIGILA ═══════════════════')

/* Un vigilante que tumba el cron que observa fabrica la averia de la que iba a
 * avisar. Estas tres son la misma propiedad desde tres entradas distintas. */
for (const [etiqueta, v] of [['sin URL', undefined], ['URL basura', 'no-soy-una-url'], ['http', 'http://x.y/z']]) {
  const r = await latir('VIVO', v)
  check(`${etiqueta}: devuelve un resultado en vez de lanzar`,
    r && r.mandado === false && typeof r.detalle === 'string', JSON.stringify(r))
}

console.log('\n══ LA URL NO SE ESCAPA EN NINGÚN TEXTO ═══════════════════════')

/* Quien tenga la URL puede mandar «estoy vivo» en falso. Un vigilante al que se
 * puede mentir da un verde que no puede ser rojo. */
/* ⚠ Este bloque llamaba a `latir` con una URL https de aspecto real, y SALÍA A
 * LA RED: hc-ping.com contestaba 400 en cada ejecución del arnés. Un arnés que
 * depende de internet es lento, falla cuando no debe y —peor— manda tráfico a
 * un tercero cada vez que alguien corre las pruebas. Ahora todo lo de aquí se
 * queda en casa: `decidirLatido` es puro, y a `latir` solo se le dan entradas
 * que cortan ANTES del fetch. */
{
  const secreta = 'https://hc-ping.com/7306d778-DEADBEEF-no-debe-salir'
  const d = decidirLatido(secreta)
  const r = await latir('VIVO', 'http://hc-ping.com/DEADBEEF-tampoco')
  const textos = [d.late ? '' : d.motivo, r.detalle, urlDeLatido(secreta, 'FALLO')].join(' ')
  check('el motivo y el resultado NO incluyen la URL',
    !/DEADBEEF-tampoco/.test([d.late ? '' : d.motivo, r.detalle].join(' ')),
    [d.late ? '' : d.motivo, r.detalle].join(' ').slice(0, 120))
  check('…y `urlDeLatido` sí la lleva, claro: es la que hay que llamar',
    textos.includes('DEADBEEF-no-debe-salir/fail'))
}

console.log(`\n${fail === 0 ? '✓ TODO EN VERDE' : '✗ HAY FALLOS'} — ${ok + fail} verificaciones, ${fail} fallos`)
console.log('  ⚠ Esto NO demuestra que el aviso llegue. Eso solo lo demuestra')
console.log('    apagar el ping y mirar el Telegram de Leonel.\n')
process.exit(fail === 0 ? 0 : 1)
