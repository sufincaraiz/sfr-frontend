#!/usr/bin/env node
/**
 * LA CLASE DOCUMENTAL — ARNÉS
 * ===========================
 *
 * La propiedad central, y es la que el encargo pedía demostrar:
 *
 *   > UNA EVIDENCIA INSUFICIENTE NO PUEDE ACTIVAR.
 *
 * Se recorren TODAS las combinaciones de hasta tres respaldos sobre las cuatro
 * clases —más la clase ausente— y se exige que activen exactamente aquellas que
 * incluyen una publicación oficial, y ninguna más. Exhaustivo y no por muestreo:
 * si alguien añade una rama al veredicto y se le olvida un caso, aquí se cae.
 *
 *     node scripts/probar-clase-documental.mjs
 */
import {
  puedeActivar, esClaseDocumental, CLASES_DOCUMENTALES, QUE_ES,
} from '../src/lib/notariales/clase-documental.ts'

let ok = 0, fail = 0
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`) }
}
const R = (...clases) => clases.map((c, i) => ({ campo: `c${i}`, clase_documental: c }))

console.log('\n══ UNA EVIDENCIA INSUFICIENTE NO PUEDE ACTIVAR ═══════════════')

/* EXHAUSTIVO: las 5 posibilidades por respaldo (4 clases + sin clase), en
 * combinaciones de 1, 2 y 3 respaldos. 5 + 25 + 125 = 155 casos. */
{
  const POSIBLES = [...CLASES_DOCUMENTALES, null]
  const casos = []
  for (const a of POSIBLES) {
    casos.push([a])
    for (const b of POSIBLES) {
      casos.push([a, b])
      for (const c of POSIBLES) casos.push([a, b, c])
    }
  }

  let mal = 0, sinMotivo = 0
  for (const combo of casos) {
    const v = puedeActivar(R(...combo))
    /* La verdad esperada, escrita INDEPENDIENTEMENTE de la implementación: si
     * algún respaldo no trae clase, no activa; si no, activa solo con un
     * original. No se deriva del código que se está probando. */
    const algunoSinClase = combo.some(c => c === null)
    const esperado = !algunoSinClase && combo.includes('PUBLICACION_OFICIAL')
    if (v.activa !== esperado) { mal++; if (mal <= 3) console.log(`     ✗ ${JSON.stringify(combo)} → ${v.activa}, esperado ${esperado}`) }
    if (!v.motivo || !v.estado) sinMotivo++
  }
  check(`las ${casos.length} combinaciones de hasta 3 respaldos dan el veredicto correcto`,
    mal === 0, `(${mal} mal)`)
  check('…y todas traen estado y motivo: ningún veredicto mudo',
    sinMotivo === 0, `(${sinMotivo} mudos)`)
}

console.log('\n══ CADA «NO» DICE ALGO DISTINTO ══════════════════════════════')

check('sin ningún respaldo → SIN_RESPALDO',
  puedeActivar([]).estado === 'SIN_RESPALDO')
check('con la clase sin declarar → SIN_CLASE, y NO se le supone ninguna',
  puedeActivar(R(null)).estado === 'SIN_CLASE')
check('solo un compilado → SOLO_COMPILADO',
  puedeActivar(R('TEXTO_COMPILADO')).estado === 'SOLO_COMPILADO')
check('solo copias e índices → SOLO_LOCALIZADORES',
  puedeActivar(R('COPIA', 'INDICE')).estado === 'SOLO_LOCALIZADORES')
check('la publicación oficial sola → ACTIVA',
  puedeActivar(R('PUBLICACION_OFICIAL')).activa === true)

/* Los cuatro estados de «no» son distintos entre sí: si dos coincidieran, el
 * panel no podría decirle al titular qué le falta. */
{
  const estados = [
    puedeActivar([]).estado,
    puedeActivar(R(null)).estado,
    puedeActivar(R('TEXTO_COMPILADO')).estado,
    puedeActivar(R('INDICE')).estado,
  ]
  check('los cuatro motivos de «no activa» son estados DISTINTOS',
    new Set(estados).size === 4, estados.join(', '))
}

console.log('\n══ DOS COMPILACIONES NO SON DOS LECTURAS ═════════════════════')

check('compilado + compilado NO activa',
  puedeActivar(R('TEXTO_COMPILADO', 'TEXTO_COMPILADO')).activa === false)
check('…y el motivo lo DICE: es el mismo texto copiado dos veces',
  /copiado dos veces/.test(puedeActivar(R('TEXTO_COMPILADO', 'TEXTO_COMPILADO')).motivo))
check('tres compilados tampoco',
  puedeActivar(R('TEXTO_COMPILADO', 'TEXTO_COMPILADO', 'TEXTO_COMPILADO')).activa === false)
check('compilado + copia + índice tampoco',
  puedeActivar(R('TEXTO_COMPILADO', 'COPIA', 'INDICE')).activa === false)
check('pero compilado + ORIGINAL sí: el original es el que activa',
  puedeActivar(R('TEXTO_COMPILADO', 'PUBLICACION_OFICIAL')).activa === true)

console.log('\n══ UN RESPALDO SIN CLASE CONTAMINA AL CONJUNTO ═══════════════')

/* Si un concepto tiene el original Y un respaldo sin clasificar, NO activa:
 * no sabemos qué es ese segundo documento, y un respaldo sin declarar es
 * exactamente lo que esta clase existe para impedir. */
check('original + uno sin clase → NO activa',
  puedeActivar(R('PUBLICACION_OFICIAL', null)).activa === false)
check('…y el motivo dice cuántos de cuántos están sin declarar',
  /1 de sus 2/.test(puedeActivar(R('PUBLICACION_OFICIAL', null)).motivo),
  puedeActivar(R('PUBLICACION_OFICIAL', null)).motivo)

console.log('\n══ LO QUE CUENTA COMO CLASE ══════════════════════════════════')

for (const c of CLASES_DOCUMENTALES) check(`«${c}» es una clase válida`, esClaseDocumental(c))
for (const v of [null, undefined, '', 'OFICIAL', 'publicacion_oficial', 0, {}, []]) {
  check(`«${JSON.stringify(v)}» NO es una clase válida`, !esClaseDocumental(v))
}
check('las cuatro clases tienen texto para la pantalla',
  CLASES_DOCUMENTALES.every(c => typeof QUE_ES[c] === 'string' && QUE_ES[c].length > 5))
check('…y los cuatro textos son distintos',
  new Set(CLASES_DOCUMENTALES.map(c => QUE_ES[c])).size === 4)

check('una lista que no es lista no revienta: no activa',
  puedeActivar(undefined).activa === false && puedeActivar(null).activa === false)

console.log(`\n${fail === 0 ? '✓ TODO EN VERDE' : '✗ HAY FALLOS'} — ${ok + fail} verificaciones, ${fail} fallos\n`)
process.exit(fail === 0 ? 0 : 1)
