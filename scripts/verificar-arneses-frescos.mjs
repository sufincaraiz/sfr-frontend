#!/usr/bin/env node
/**
 * ¿CUÁNDO CORRIÓ EN VERDE POR ÚLTIMA VEZ CADA ARNÉS QUE NO ESTÁ EN EL BUILD?
 * =========================================================================
 *
 * El 2026-10-15 se descubrió que el check de limpieza de `probar-panel-notarial`
 * llevaba días fallando sin que nadie lo notara. No fallaba por un defecto del
 * código: medía el estado GLOBAL de la base y empezó a fallar en cuanto el año
 * 2026 real se sembró. Y nadie lo vio porque **ese arnés no está en la cadena
 * del build**: toca la base, así que se corre a mano.
 *
 * > **Un arnés que nadie corre está en la misma familia que una guarda que nadie
 * > llama: su verde es de la última vez que alguien se acordó.**
 *
 * EL CENSO que llevó a esto: 13 verificadores corrían en el build y 9 no. De los
 * 9, tres eran arneses EN MEMORIA, sin base, que tardan 270 ms, 202 ms y 1,3 s
 * —menos de dos segundos entre los tres, para más de 800 verificaciones—.
 * Estaban fuera por nada, y entraron.
 *
 * Los que quedan fuera son los que ESCRIBEN en la base: `probar-panel-notarial`
 * crea y borra un año de prueba, y correrlo en cada despliegue escribiría en
 * producción cada vez. Para esos no hay forma de que el build los ejecute, así
 * que lo que el build comprueba es otra cosa: **cuándo fue la última vez que
 * alguien los corrió en verde**.
 *
 * El registro se commitea a propósito. Significa exactamente lo que dice: «la
 * última vez que alguien lo corrió Y guardó el resultado». Si el registro es de
 * hace tres semanas, su verde no es un hecho sobre hoy, y eso se ve.
 *
 *   node scripts/verificar-arneses-frescos.mjs
 */
import { readFileSync } from 'node:fs'

const REGISTRO = 'scripts/registro-de-arneses.json'

/** Más de esto y el verde deja de ser un hecho sobre hoy. */
const DIAS_MAXIMO = 14

/** Los que no pueden correr en el build, con por qué. */
const FUERA_DEL_BUILD = {
  'probar-panel-notarial.mjs':
    'crea y borra un año de prueba: correrlo en cada despliegue escribiría en producción',
}

console.log('\n══ ARNESES QUE NO CORREN EN EL BUILD ═════════════════════════')

let registro
try {
  registro = JSON.parse(readFileSync(REGISTRO, 'utf8'))
} catch (e) {
  console.log(`  ✗ no pude leer ${REGISTRO}: ${e.code ?? e.message}`)
  console.log('    Sin registro no se puede saber si siguen verdes.\n')
  process.exit(1)
}

const ahora = Date.now()
const problemas = []

for (const [guion, porque] of Object.entries(FUERA_DEL_BUILD)) {
  const c = registro.corridas?.[guion]
  if (!c?.cuando) {
    problemas.push(`${guion} no tiene ninguna corrida registrada`)
    console.log(`  ✗ ${guion}`)
    console.log(`     sin registro. ${porque}`)
    continue
  }
  const dias = Math.floor((ahora - Date.parse(c.cuando)) / 86_400_000)
  const viejo = dias > DIAS_MAXIMO
  console.log(`  ${viejo ? '✗' : '·'} ${guion}`)
  console.log(`     última corrida en verde: ${c.cuando.slice(0, 10)} (hace ${dias} día(s))` +
    `${c.verificaciones ? ` · ${c.verificaciones} verificaciones` : ''}`)
  console.log(`     ${porque}`)
  if (viejo) {
    problemas.push(`${guion} lleva ${dias} días sin correr (máximo ${DIAS_MAXIMO})`)
  }
}

if (problemas.length) {
  console.log('')
  for (const p of problemas) console.log(`  ✗ ${p}.`)
  console.log('\n  Córrelo y actualiza el registro:')
  console.log('    node --env-file=.env.local scripts/probar-panel-notarial.mjs')
  console.log('  Su verde es de la última vez que alguien se acordó, y eso no es un hecho')
  console.log('  sobre hoy.\n')
  process.exit(1)
}

console.log(`\n  ✓ ninguno lleva más de ${DIAS_MAXIMO} días sin correr en verde.\n`)
