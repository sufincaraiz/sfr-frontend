#!/usr/bin/env node
/**
 * PRUEBA DE LA PUERTA DEL CATÁLOGO PÚBLICO — módulo hoja, sin base ni pantalla.
 *
 * El filtro del catálogo es `{ status: 'available' }` y nada más, así que lo que
 * nazca «available» es visible al instante. En vez de añadir condiciones al
 * filtro —que dejaría el estado malo escrito en la base, esperando— se bloquea
 * la TRANSICIÓN. Y bloquear sin decir qué falta es un botón muerto.
 *
 *     node scripts/probar-publicable-propiedad.mjs
 */
import {
  faltaParaPublicar, exigirPublicable, InmuebleNoPublicable,
} from '../src/lib/publicable-propiedad.ts'

let ok = 0, fail = 0
const check = (q, bien, extra = '') => {
  if (bien) { ok++; console.log(`  ✓ ${q}`) }
  else { fail++; console.log(`  ✗ ${q}${extra ? ' ' + extra : ''}`) }
}
const titulo = t => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 60 - t.length))}`)

const LISTA = { price_cop: 450_000_000, description: 'Finca con vista', fotos: 3 }

titulo('UNA PROPIEDAD COMPLETA PASA')
check('nada falta cuando están las tres cosas', faltaParaPublicar(LISTA).length === 0)
check('…y la puerta la deja pasar',
  (() => { try { exigirPublicable('available', LISTA); return true } catch { return false } })())

titulo('LAS TRES QUE FALTAN, UNA POR UNA')
check('precio 0 → falta el precio',
  faltaParaPublicar({ ...LISTA, price_cop: 0 }).join() === 'el precio (no puede ser cero)')
check('precio nulo → falta el precio', faltaParaPublicar({ ...LISTA, price_cop: null }).length === 1)
check('precio como cadena vacía → falta el precio',
  faltaParaPublicar({ ...LISTA, price_cop: '' }).length === 1)
check('precio con puntos de miles SÍ vale: «450.000.000»',
  faltaParaPublicar({ ...LISTA, price_cop: '450.000.000' }).length === 0)
check('sin descripción → falta la descripción',
  faltaParaPublicar({ ...LISTA, description: null }).join() === 'la descripción')
check('una descripción de solo espacios NO es una descripción',
  faltaParaPublicar({ ...LISTA, description: '   ' }).length === 1)
check('…pero la descripción CORTA sirve si no hay larga',
  faltaParaPublicar({ ...LISTA, description: null, short_description: 'Finca' }).length === 0)
check('sin fotos → falta al menos una foto',
  faltaParaPublicar({ ...LISTA, fotos: 0 }).join() === 'al menos una foto')
check('fotos indefinidas cuentan como ninguna',
  faltaParaPublicar({ ...LISTA, fotos: undefined }).length === 1)

titulo('EL MENSAJE ENUMERA — bloquear sin decir qué falta es un botón muerto')
{
  const vacia = { price_cop: 0, description: '', fotos: 0 }
  check('las tres a la vez se reportan las tres', faltaParaPublicar(vacia).length === 3)
  let e = null
  try { exigirPublicable('available', vacia) } catch (err) { e = err }
  check('la puerta lanza InmuebleNoPublicable', e instanceof InmuebleNoPublicable)
  check('…el mensaje nombra las tres cosas',
    /el precio/.test(e.message) && /la descripción/.test(e.message) && /al menos una foto/.test(e.message),
    `(${e?.message})`)
  check('…las une con «y» antes de la última, no con comas sueltas',
    / y al menos una foto\./.test(e.message), `(${e?.message})`)
  check('…y el error lleva la lista aparte, para que la pantalla no la parsee del texto',
    Array.isArray(e.falta) && e.falta.length === 3)

  let uno = null
  try { exigirPublicable('available', { ...LISTA, fotos: 0 }) } catch (err) { uno = err }
  check('con una sola cosa que falta, el mensaje no dice «y»',
    !/ y /.test(uno.message) && /al menos una foto/.test(uno.message), `(${uno?.message})`)
}

titulo('SOLO SE EXIGE EN LA TRANSICIÓN A «available»')
{
  const vacia = { price_cop: 0, description: '', fotos: 0 }
  const pasa = est => { try { exigirPublicable(est, vacia); return true } catch { return false } }
  check('«reserved» no sale al catálogo: no se le exige nada', pasa('reserved'))
  check('«sold» tampoco', pasa('sold'))
  check('sin estado tampoco', pasa(undefined) && pasa(null))
  check('y «available» sí', !pasa('available'))
  /* Es la diferencia entre bloquear la transición y filtrar el estado: lo que
   * no es público no tiene por qué estar completo. */
}

console.log(`\n${fail === 0 ? '✓ TODO EN VERDE' : '✗ HAY FALLOS'} — ${ok} verificaciones, ${fail} fallos\n`)
process.exit(fail === 0 ? 0 : 1)
