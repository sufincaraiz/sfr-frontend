#!/usr/bin/env node
/**
 * PRUEBA DEL EDITOR DE TRAMOS — el módulo hoja, sin pantalla.
 *
 * Si para saber si el editor es correcto hay que abrirlo, está mal hecho. Esto
 * es lo que decide si es correcto; la pantalla solo puede ser incómoda.
 *
 * LOS CINCO EXTREMOS DEGENERADOS VIVEN AQUÍ, y con su encuadre: no son bordes
 * raros, son **el estado normal del editor a media carga**. Una tabla vacía es
 * cómo nace todo concepto; una tabla de una fila es el primer segundo de uso.
 *
 *     node scripts/probar-editor-tramos.mjs
 */
import {
  tramosDesdeFilas, filasDesdeTramos, filaNueva, resumenParaPantalla,
} from '../src/lib/notariales/editor-tramos.ts'
import { evaluarTramos, verificarTramos, tramoQueAplica } from '../src/lib/notariales/tramos.ts'

let ok = 0, fail = 0
const check = (q, bien, extra = '') => {
  if (bien) { ok++; console.log(`  ✓ ${q}`) }
  else { fail++; console.log(`  ✗ ${q}${extra ? ' ' + extra : ''}`) }
}
const titulo = t => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 62 - t.length))}`)

const fila = (hasta, valor, extra = {}) =>
  ({ hasta, valor, unidad: 'PESOS', modo_calculo: 'FIJO', en_uvt: false, ...extra })

const erroresDe = r => r.avisos.filter(a => a.severidad === 'ERROR')
const mediasDe  = r => r.avisos.filter(a => a.severidad === 'INCOMPLETA')

// ─────────────────────────────────────────────────────────────────────────────
titulo('LO QUE YA NO SE PUEDE ESCRIBIR')

{
  const r = tramosDesdeFilas([fila(1_000_000, 30_900), fila(5_000_000, 50_000), fila(null, 80_000)])
  check('tres filas dan tres tramos', r.tramos.length === 3)
  check('el primer `desde` es 0', r.tramos[0].desde === 0, `(${r.tramos[0].desde})`)
  check('`desde` del 2.º ES el `hasta` del 1.º, sin +1',
    r.tramos[1].desde === r.tramos[0].hasta, `(${r.tramos[1].desde} vs ${r.tramos[0].hasta})`)
  check('`desde` del 3.º ES el `hasta` del 2.º',
    r.tramos[2].desde === r.tramos[1].hasta)
  check('el último queda abierto', r.tramos[2].hasta === null)
  check('el `orden` se deriva, 1..n', r.tramos.map(t => t.orden).join() === '1,2,3')
  check('la tabla es coherente y liquidable', r.coherente && r.liquidable)

  /* LA PROPIEDAD QUE JUSTIFICA LA FORMA: entre el `hasta` de un tramo y el
   * `desde` del siguiente no cabe NADA, ni un decimal. */
  const bordes = r.tramos.slice(0, -1).map((t, i) => t.hasta === r.tramos[i + 1].desde)
  check('no hay hueco ni solape POSIBLE: cada borde es un solo número',
    bordes.every(Boolean))
  check('…y el caso de $100.000.000,50 cae en un tramo, no en el hueco',
    tramoQueAplica(
      tramosDesdeFilas([fila(100_000_000, 10), fila(null, 20)]).tramos,
      100_000_000.5, null, 'x',
    )?.orden === 2)
}

{
  /* No hay campo `desde`, así que un `desde` torcido no se puede teclear. Lo
   * único que queda por comprobar es que el módulo no lo acepte por otra vía. */
  const r = tramosDesdeFilas([fila(1000, 1, { desde: 999_999 }), fila(null, 2)])
  check('un `desde` colado en la fila se IGNORA: manda el derivado',
    r.tramos[0].desde === 0 && r.tramos[1].desde === 1000)
}

// ─────────────────────────────────────────────────────────────────────────────
titulo('EL ORDEN: insertar en medio no es una operación')

{
  const a = tramosDesdeFilas([fila(1000, 1), fila(5000, 2), fila(null, 3)])
  const enMedio = tramosDesdeFilas([fila(1000, 1), fila(null, 3), fila(5000, 2)])
  const alReves = tramosDesdeFilas([fila(null, 3), fila(5000, 2), fila(1000, 1)])
  const j = r => JSON.stringify(r.tramos)
  check('da igual en qué posición se inserte la fila: el resultado es el mismo',
    j(a) === j(enMedio) && j(a) === j(alReves))
  check('…y el abierto siempre acaba al final',
    [a, enMedio, alReves].every(r => r.tramos.at(-1).hasta === null))
}

// ─────────────────────────────────────────────────────────────────────────────
titulo('EXTREMO 1 — la tabla VACÍA: no está rota, no ha empezado')

{
  const r = tramosDesdeFilas([])
  check('no produce ningún tramo', r.tramos.length === 0)
  check('NO es un error: es coherente', r.coherente)
  check('…pero no es liquidable', !r.liquidable)
  check('el aviso es «a medias», no «mal»',
    erroresDe(r).length === 0 && mediasDe(r).length === 1)
  check('el tono para la pantalla es A_MEDIAS', resumenParaPantalla(r).tono === 'A_MEDIAS')
  /* Y es el estado en el que nace: `CONCEPTOS_V1` siembra `tramos: []`. */
  check('…que es exactamente como nace un concepto sembrado', r.avisos[0].fila === null)
}

// ─────────────────────────────────────────────────────────────────────────────
titulo('EXTREMO 2 — UN SOLO tramo')

{
  const abierto = tramosDesdeFilas([fila(null, 30_900)])
  check('un solo tramo ABIERTO es una tabla completa y válida',
    abierto.coherente && abierto.liquidable && abierto.tramos.length === 1)
  check('…cubre desde 0 hasta el infinito',
    abierto.tramos[0].desde === 0 && abierto.tramos[0].hasta === null)
  check('…y liquida igual para una base pequeña y una enorme',
    evaluarTramos(abierto.tramos, 1, null, 'x', { modo: 'PUBLICADO' })
    === evaluarTramos(abierto.tramos, 9_999_999_999, null, 'x', { modo: 'PUBLICADO' }))

  const cerrado = tramosDesdeFilas([fila(5_000_000, 30_900)])
  check('un solo tramo CERRADO es coherente pero INCOMPLETO',
    cerrado.coherente && !cerrado.liquidable)
  check('…y lo dice nombrando el límite por encima del cual no dice nada',
    /5000000|5\.000\.000/.test(mediasDe(cerrado).map(a => a.mensaje).join()))
  check('…y por encima de ese límite el motor NO inventa un tramo',
    tramoQueAplica(cerrado.tramos, 6_000_000, null, 'x') === null)
}

// ─────────────────────────────────────────────────────────────────────────────
titulo('EXTREMO 3 — el tramo superior abierto')

{
  const dos = tramosDesdeFilas([fila(null, 1), fila(null, 2)])
  check('DOS tramos abiertos sí es una contradicción', !dos.coherente)
  check('…y no devuelve tabla: una tabla contradictoria no se entrega a medias',
    dos.tramos.length === 0)
  check('el tono es MAL', resumenParaPantalla(dos).tono === 'MAL')

  const sinAbrir = tramosDesdeFilas([fila(1000, 1), fila(5000, 2)])
  check('ninguno abierto: coherente pero incompleto',
    sinAbrir.coherente && !sinAbrir.liquidable)
}

// ─────────────────────────────────────────────────────────────────────────────
titulo('EXTREMO 4 — borrar la ÚLTIMA fila')

{
  const completa = [fila(1000, 1), fila(5000, 2), fila(null, 3)]
  const tras = tramosDesdeFilas(completa.slice(0, -1))
  check('al borrar la fila abierta la tabla NO se rompe', tras.coherente)
  check('…pasa a estar a medias, que es la verdad', !tras.liquidable)
  check('…y el aviso dice qué falta, no que algo esté mal',
    erroresDe(tras).length === 0 &&
    /Falta el tramo abierto/.test(mediasDe(tras).map(a => a.mensaje).join()))
  const trasDos = tramosDesdeFilas(completa.slice(0, 1))
  check('borrando dos filas sigue siendo «a medias», no «mal»',
    trasDos.coherente && !trasDos.liquidable)
  const vacia = tramosDesdeFilas([])
  check('borrando todas, vuelve al estado inicial', vacia.coherente && vacia.tramos.length === 0)
}

// ─────────────────────────────────────────────────────────────────────────────
titulo('EXTREMO 5 — una fila recién añadida, sin valor')

{
  const r = tramosDesdeFilas([fila(1000, 30_900), filaNueva('FIJO', 'PESOS')])
  check('una fila sin valor NO es un error: es una fila recién añadida', r.coherente)
  check('…es «a medias» y señala la fila', mediasDe(r).some(a => a.fila === 1))
  check('…y el tono no es de alarma', resumenParaPantalla(r).tono === 'A_MEDIAS')
  check('la fila nueva nace ABIERTA, que es lo que se quiere al final de una tabla',
    filaNueva('FIJO', 'PESOS').hasta === null)
}

// ─────────────────────────────────────────────────────────────────────────────
titulo('LO QUE SIGUE SIENDO POSIBLE Y SÍ ES UN ERROR')

{
  const iguales = tramosDesdeFilas([fila(1000, 1), fila(1000, 2), fila(null, 3)])
  check('dos `hasta` iguales: un tramo de anchura cero es un ERROR',
    !iguales.coherente)
  check('…y el mensaje dice qué fila y contra cuál',
    /termina en 1000 y el anterior ya terminaba en 1000/.test(erroresDe(iguales).map(a => a.mensaje).join()))

  const cero = tramosDesdeFilas([fila(0, 1), fila(null, 2)])
  check('un `hasta` de 0 es un límite inválido', !cero.coherente)
  check('…y da UN solo aviso, no dos por el mismo hecho', erroresDe(cero).length === 1,
    `(dio ${erroresDe(cero).length})`)

  const negativo = tramosDesdeFilas([fila(-5, 1), fila(null, 2)])
  check('un `hasta` negativo también', !negativo.coherente)
}

// ──────────────────────────────────────────────────────────────────────────────
titulo('LA CASILLA EN BLANCO — el peor defecto que ha tenido este módulo')

{
  /* ⚠ ESTE CASO NO ESTABA EN LA LISTA DE CINCO EXTREMOS, y es el estado en el
   * que NACE toda fila: la casilla del límite empieza vacía.
   *
   * Antes de arreglarlo, `[{hasta:''}, {hasta:null}]` devolvía DOS tramos
   * abiertos, los dos con `desde: 0`, y declaraba la tabla LIQUIDABLE. El
   * segundo no se alcanza nunca y la cifra habría salido plausible. */
  const r = tramosDesdeFilas([fila('', 100), fila(null, 200)])
  check('una casilla de límite en blanco NO cuenta como tramo abierto',
    !r.liquidable, `(liquidable=${r.liquidable})`)
  check('…y no es un error: es «a medias»', r.coherente)
  check('…el aviso dice qué fila y da las dos salidas',
    mediasDe(r).some(a => a.fila !== null && /límite del tramo/.test(a.mensaje)))
  check('…y jamás se declara liquidable una tabla con dos `hasta` nulos',
    !(r.liquidable && r.tramos.filter(t => t.hasta === null).length > 1))

  const soloBlanco = tramosDesdeFilas([fila('   ', 100)])
  check('solo espacios en el límite también cuenta como en blanco', !soloBlanco.liquidable)

  const mediaTecla = tramosDesdeFilas([fila('1.', 100), fila(null, 200)])
  check('un número a medio teclear no tumba el módulo y deja la tabla sin liquidar',
    !mediaTecla.liquidable, `(avisos: ${JSON.stringify(mediaTecla.avisos)})`)
}


// ─────────────────────────────────────────────────────────────────────────────
titulo('EL VIAJE REDONDO: lo ya guardado se puede editar y vuelve igual')

{
  /* Si una tabla válida no se puede expresar en la forma del editor, la forma
   * está mal. Esto se comprueba ANTES de construir la pantalla. */
  const original = [
    { orden: 1, desde: 0, hasta: 1_000_000, en_uvt: false, modo_calculo: 'FIJO', valor: '30900', unidad: 'PESOS' },
    { orden: 2, desde: 1_000_000, hasta: 5_000_000, en_uvt: false, modo_calculo: 'TASA_SOBRE_TOTAL', valor: '3', unidad: 'POR_MIL' },
    { orden: 3, desde: 5_000_000, hasta: null, en_uvt: false, modo_calculo: 'TASA_MARGINAL', valor: '1,5', unidad: 'PORCENTAJE' },
  ]
  const vuelta = tramosDesdeFilas(filasDesdeTramos(original))
  check('una tabla de tres modos distintos sobrevive el viaje redondo',
    JSON.stringify(vuelta.tramos) === JSON.stringify(original),
    `\n      ida:    ${JSON.stringify(original)}\n      vuelta: ${JSON.stringify(vuelta.tramos)}`)

  const conAportes = [
    { orden: 1, desde: 0, hasta: null, en_uvt: true, modo_calculo: 'FIJO', valor: '7000', unidad: 'PESOS',
      aporte_snr: '5000', aporte_fondo: '2000', valor_en_uvb: '0,25' },
  ]
  const vuelta2 = tramosDesdeFilas(filasDesdeTramos(conAportes))
  check('…y una con aportes, UVT y equivalencia UVB también',
    JSON.stringify(vuelta2.tramos) === JSON.stringify(conAportes),
    `\n      vuelta: ${JSON.stringify(vuelta2.tramos)}`)
}

// ─────────────────────────────────────────────────────────────────────────────
titulo('LO QUE EL EDITOR NO DECIDE: la monotonía la sigue juzgando el motor')

{
  /* Una tabla donde un inmueble más caro paga MENOS es coherente para el editor
   * —no hay hueco, no hay solape, los límites crecen— y la rechaza
   * `verificarTramos`. La frontera entre los dos módulos tiene que quedar
   * visible: el editor vigila la FORMA, el motor vigila la TARIFA. */
  const r = tramosDesdeFilas([fila(1_000_000, 50_000), fila(null, 10_000)])
  check('el editor la da por coherente: su forma está bien', r.coherente && r.liquidable)
  let rechazada = false
  try { verificarTramos(r.tramos, null, 'x', { monotonicidad: 'NO_DECRECIENTE', redondeo: { modo: 'PUBLICADO' } }) }
  catch { rechazada = true }
  check('…y el MOTOR la rechaza por no ser monótona', rechazada)
}

console.log(`\n${fail === 0 ? '✓ TODO EN VERDE' : '✗ HAY FALLOS'} — ${ok} verificaciones, ${fail} fallos\n`)
process.exit(fail === 0 ? 0 : 1)
