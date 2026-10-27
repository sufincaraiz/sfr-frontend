#!/usr/bin/env node
/**
 * QUIÉN LEYÓ — ARNÉS
 * ==================
 *
 * La propiedad central:
 *
 *   > Dos lecturas no son el doble de una. Si las hizo el mismo lector, o dos
 *   > asistentes, o alguien sin declarar, NO son independientes.
 *
 * Se prueba exhaustivamente sobre un lector de cada clase, en todas las
 * parejas, con el esperado escrito APARTE de la implementación.
 *
 *     node scripts/probar-lector.mjs
 */
import { clasificarLector, veredictoDeLecturas, NIVEL } from '../src/lib/notariales/lector.ts'

let ok = 0, fail = 0
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`) }
}
const clase = v => clasificarLector(v).clase

console.log('\n══ CADA LECTOR EN SU CLASE ═══════════════════════════════════')

for (const [v, esperada] of [
  ['', 'AUSENTE'], ['   ', 'AUSENTE'], [null, 'AUSENTE'], [undefined, 'AUSENTE'],
  ['leonel@sufincaraiz.com', 'PERSONA'],
  ['asistente', 'ASISTENTE'], ['claude', 'ASISTENTE'], ['Asistente', 'ASISTENTE'],
  ['asistente:gpt', 'ASISTENTE'],
  ['titular', 'MARCADOR'], ['precarga', 'MARCADOR'],
  ['entidad:supernotariado.gov.co', 'ENTIDAD'], ['entidad:www.supernotariado.gov.co', 'ENTIDAD'],
  ['entidad:blog-de-tarifas.com', 'NO_RECONOCIDO'],
  ['supernotariado', 'NO_RECONOCIDO'], ['Juan Pérez', 'NO_RECONOCIDO'],
]) {
  check(`«${v}» → ${esperada}`, clase(v) === esperada, `(salió ${clase(v)})`)
}

/* LO QUE PEDÍA EL ENCARGO, literal: estos cuatro caían todos en MARCADOR y
 * tienen que poder distinguirse. Asistente y claude son la MISMA clase —los dos
 * son asistentes— y eso es correcto; lo que no puede pasar es que un asistente
 * y el titular se confundan. */
check('asistente y titular ya NO son la misma clase',
  clase('asistente') !== clase('titular'))
check('…ni el titular y la entidad emisora',
  clase('titular') !== clase('entidad:supernotariado.gov.co'))
check('«supernotariado» a secas NO se adivina como entidad: se rechaza con el formato',
  /entidad:<dominio>/.test(clasificarLector('supernotariado').etiqueta))
check('un dominio que no es fuente oficial no sube a ENTIDAD aunque lleve «entidad:»',
  clase('entidad:blog-de-tarifas.com') !== 'ENTIDAD')

console.log('\n══ DOS LECTURAS NO SON EL DOBLE DE UNA ═══════════════════════')

/* EXHAUSTIVO. Un representante por clase, más un segundo asistente y una
 * segunda persona distintos, para poder probar «dos de la misma clase».
 * El esperado se escribe AQUÍ, con reglas propias, no copiando las de la
 * implementación. */
const REP = [
  '', 'asistente', 'claude', 'titular', 'Juan Pérez',
  'leonel@sufincaraiz.com', 'otra@persona.co', 'entidad:supernotariado.gov.co',
]
const esperado = (a, b) => {
  const ca = clase(a), cb = clase(b)
  if (ca === 'AUSENTE' || cb === 'AUSENTE') return false
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return false
  if (ca === 'ASISTENTE' && cb === 'ASISTENTE') return false
  return ca === 'ENTIDAD' || cb === 'ENTIDAD' || ca === 'PERSONA' || cb === 'PERSONA'
}
{
  let mal = 0, total = 0, sinTexto = 0
  for (const a of REP) for (const b of REP) {
    total++
    const v = veredictoDeLecturas(a, b)
    if (v.independientes !== esperado(a, b)) {
      mal++
      if (mal <= 3) console.log(`     ✗ «${a}» + «${b}» → ${v.independientes}, esperado ${esperado(a, b)}`)
    }
    if (!v.texto) sinTexto++
  }
  check(`las ${total} parejas dan la independencia correcta`, mal === 0, `(${mal} mal)`)
  check('…y todas traen texto para la página', sinTexto === 0)
}

check('dos asistentes: NO independientes, y lo DICE así',
  (() => { const v = veredictoDeLecturas('asistente', 'claude')
    return !v.independientes && /dos lecturas de asistente/.test(v.texto) })())
check('el mismo lector dos veces: una lectura, no dos',
  (() => { const v = veredictoDeLecturas('claude', 'claude')
    return !v.independientes && /mismo lector/.test(v.texto) })())
check('la misma persona con otra caja en el correo sigue siendo la misma',
  !veredictoDeLecturas('leonel@sufincaraiz.com', 'LEONEL@sufincaraiz.com').independientes)
check('el titular sin correo y un asistente: NO independientes',
  !veredictoDeLecturas('titular', 'claude').independientes)
check('sin lector declarado en un lado: NO independientes',
  !veredictoDeLecturas('', 'leonel@sufincaraiz.com').independientes)

console.log('\n══ Y SUBE DE CLASE CUANDO CONFIRMA ALGUIEN MÁS ═══════════════')

{
  const dosAsistentes = veredictoDeLecturas('asistente', 'claude')
  const conPersona = veredictoDeLecturas('asistente', 'leonel@sufincaraiz.com')
  const conEntidad = veredictoDeLecturas('asistente', 'entidad:supernotariado.gov.co')
  check('dos asistentes → nivel de asistente', dosAsistentes.nivel === NIVEL.ASISTENTE)
  check('…una persona lo sube', conPersona.nivel > dosAsistentes.nivel && conPersona.independientes)
  check('…y la entidad emisora, más todavía',
    conEntidad.nivel > conPersona.nivel && /entidad emisora/.test(conEntidad.texto))
}

console.log(`\n${fail === 0 ? '✓ TODO EN VERDE' : '✗ HAY FALLOS'} — ${ok + fail} verificaciones, ${fail} fallos\n`)
process.exit(fail === 0 ? 0 : 1)
