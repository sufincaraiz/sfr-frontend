#!/usr/bin/env node
/**
 * PRUEBA DEL MOTOR DE GASTOS NOTARIALES.
 *
 * Ejercita el código REAL (módulos hoja, sin alias `@/`), no una copia.
 *
 * ⚠⚠ LAS TARIFAS DE ESTE ARCHIVO SON INVENTADAS. No son las tarifas de 2026, no
 * salen de ninguna resolución y NO PUEDEN COPIARSE A LA SIEMBRA. Existen para
 * poder probar aritmética y guardas sin esperar los PDF oficiales. La siembra
 * real (`CONCEPTOS_V1`) nace con `valor: null` y `tramos: []`, y así tiene que
 * seguir hasta que el titular cargue cada resolución desde el panel.
 */
import {
  evaluarTramos, evaluarTramosCrudo, verificarTramos, repartir, alPeso, redondear,
} from '../src/lib/notariales/tramos.ts'
import {
  calcularBaseNotarial, calcularBaseRetencion, calcularBaseTimbre, BASES,
} from '../src/lib/notariales/bases.ts'
import { calcularRetencion, verificarReglas, CAMPOS_CONDICION } from '../src/lib/notariales/retencion.ts'
import {
  esFuenteOficial, exigirRespaldoOficial, verificarEsquema, verificarConcepto,
  pendientesParaActivar, resumenDePendientes, exigirAnioPublicable, divergenciaUvt, copiarAnio,
} from '../src/lib/notariales/guardas.ts'
import { CONCEPTOS_V1, FUENTES_OFICIALES, camposExigidos } from '../src/lib/notariales/catalogo.ts'
import { liquidar } from '../src/lib/notariales/calculo.ts'
import { codigoTrazabilidad, AVISO_NO_ALMACENADO } from '../src/lib/notariales/trazabilidad.ts'
import { VERSION_MOTOR } from '../src/lib/notariales/tipos.ts'

let ok = 0, fail = 0
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`) }
}
/** Prueba que algo LANZA, y que lanza lo que debe. */
const lanza = (nombre, fn, nombreError = 'ErrorEsquemaNotarial', trozo = '') => {
  try {
    fn()
    check(nombre, false, '(NO lanzó — la guarda no sirve)')
  } catch (e) {
    const bien = e.name === nombreError && (!trozo || e.message.includes(trozo))
    check(`${nombre} → lanza`, bien, `(lanzó ${e.name}: ${e.message})`)
  }
}

/** Redondeo al peso, para las pruebas que no van sobre el redondeo. */
const PESO = { unidad: 1, modo: 'CERCANO' }
/** Compara con tolerancia: los decimales de un 3 por mil no son exactos en binario. */
const cerca = (a, b) => Math.abs(a - b) < 0.005

const RESP = (campo, url = 'https://www.supernotariado.gov.co/resolucion.pdf') => ({
  campo, norma: 'Resolución INVENTADA para la prueba', articulo: 'art. 1',
  url, fecha_norma: '2026-01-30', verificado_en: '2026-10-06', verificado_por: 'prueba',
})

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ FUENTES: una tarifa no se respalda con un blog ══')
// ─────────────────────────────────────────────────────────────────────────────
check('acepta un PDF de la Superintendencia',
  !!esFuenteOficial('https://www.supernotariado.gov.co/x.pdf', FUENTES_OFICIALES))
check('acepta un subdominio oficial',
  !!esFuenteOficial('https://servicios.supernotariado.gov.co/x.pdf', FUENTES_OFICIALES))
check('RECHAZA el sitio comercial del que salen todas las cifras que circulan',
  esFuenteOficial('https://gastosnotariales.co/tarifas', FUENTES_OFICIALES) === null)
check('RECHAZA la tabla publicada por una notaría particular',
  esFuenteOficial('https://www.notaria19bogota.com/tarifas-notariales-2026/', FUENTES_OFICIALES) === null)
check('RECHAZA http sin cifrar', esFuenteOficial('http://www.dian.gov.co/x.pdf', FUENTES_OFICIALES) === null)
check('RECHAZA un dominio que solo CONTIENE el oficial',
  esFuenteOficial('https://supernotariado.gov.co.falso.com/x', FUENTES_OFICIALES) === null)
lanza('un respaldo sin quién verificó',
  () => exigirRespaldoOficial({ ...RESP('valor'), verificado_por: '' }, FUENTES_OFICIALES),
  'RespaldoNoOficial')
lanza('un respaldo con URL comercial',
  () => exigirRespaldoOficial(RESP('valor', 'https://gastosnotariales.co/t'), FUENTES_OFICIALES),
  'RespaldoNoOficial')
check('una fuente oficial DESACTIVADA deja de servir',
  esFuenteOficial('https://www.dian.gov.co/x.pdf',
    FUENTES_OFICIALES.map(f => f.dominio === 'dian.gov.co' ? { ...f, activo: false } : f)) === null)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ LA SIEMBRA REAL NACE VACÍA ══')
// ─────────────────────────────────────────────────────────────────────────────
check('son 16 conceptos', CONCEPTOS_V1.length === 16, `(hay ${CONCEPTOS_V1.length})`)
check('NINGUNO trae valor', CONCEPTOS_V1.every(c => c.valor === null))
check('NINGUNO trae tramos', CONCEPTOS_V1.every(c => (c.tramos ?? []).length === 0))
check('el IVA no es un concepto (es derivado)', !CONCEPTOS_V1.some(c => c.clave === 'iva'))
check('«beneficencia» existe como término coloquial del impuesto de registro',
  CONCEPTOS_V1.find(c => c.clave === 'impuesto_registro').terminos_coloquiales.includes('beneficencia'))
check('…y NO es el nombre de ningún concepto',
  !CONCEPTOS_V1.some(c => /beneficencia/i.test(c.label)))
check('el recaudo SNR es TRAMOS en modo fijo, no un porcentaje',
  CONCEPTOS_V1.find(c => c.clave === 'recaudo_snr').tipo === 'TRAMOS')
check('…y sale de la base del IVA',
  CONCEPTOS_V1.find(c => c.clave === 'recaudo_snr').es_recaudo_terceros === true)
check('la biometría se cobra por persona identificada',
  CONCEPTOS_V1.find(c => c.clave === 'biometria').unidad_label === 'persona identificada')
check('…y NO asume cuántas personas firman',
  CONCEPTOS_V1.find(c => c.clave === 'biometria').cantidad_sugerida === null)
check('la cantidad de biometrías varía por operación, no por notaría',
  CONCEPTOS_V1.find(c => c.clave === 'biometria').cantidad_variable_por_operacion === true &&
  CONCEPTOS_V1.find(c => c.clave === 'biometria').cantidad_variable_por_notaria === false)
check('el valor de la hoja varía por notaría, no por operación',
  CONCEPTOS_V1.find(c => c.clave === 'hojas_papel_notarial').cantidad_variable_por_notaria === true &&
  CONCEPTOS_V1.find(c => c.clave === 'hojas_papel_notarial').cantidad_variable_por_operacion === false)
check('el predial pendiente está en OBLIGACIONES, no entre los costos del trámite',
  CONCEPTOS_V1.find(c => c.clave === 'predial_pendiente').grupo === 'OBLIGACIONES')
check('solo los derechos de escritura afirman una norma de reparto',
  CONCEPTOS_V1.filter(c => c.motivo_reparto === 'NORMA_SUPLETIVA').map(c => c.clave).join() === 'derechos_escritura')
check('el IVA, las hojas y las copias NO afirman norma de reparto',
  ['hojas_papel_notarial', 'copias', 'biometria'].every(k =>
    CONCEPTOS_V1.find(c => c.clave === k).motivo_reparto === 'CONFIGURACION' &&
    CONCEPTOS_V1.find(c => c.clave === k).norma_reparto === null))
check('la retención tiene contribuyente y no se reparte',
  (() => { const c = CONCEPTOS_V1.find(x => x.clave === 'retefuente')
    return c.sujeto_legal === 'VENDEDOR' && c.reparto_editable === false && c.motivo_reparto === 'CONTRIBUYENTE' })())
check('el impuesto de registro es costumbre, no ley',
  CONCEPTOS_V1.find(c => c.clave === 'impuesto_registro').motivo_reparto === 'COSTUMBRE')
check('un concepto de valor libre no exige respaldo de tarifa',
  !camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'predial_pendiente')).includes('valor'))
check('…pero sí exige la norma de quién es el contribuyente',
  camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'predial_pendiente')).includes('sujeto_legal'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ LAS GUARDAS DEL ESQUEMA (rojo: se contradice) ══')
// ─────────────────────────────────────────────────────────────────────────────
const base = CONCEPTOS_V1.find(c => c.clave === 'copias')
lanza('norma supletiva sin norma',
  () => verificarConcepto({ ...base, motivo_reparto: 'NORMA_SUPLETIVA', norma_reparto: null }, null),
  'ErrorEsquemaNotarial', 'no la nombra')
lanza('reparto de configuración CON una norma colgada',
  () => verificarConcepto({ ...base, motivo_reparto: 'CONFIGURACION', norma_reparto: 'Código Civil, art. 1862' }, null),
  'ErrorEsquemaNotarial', 'afirmaría que la ley reparte así')
lanza('contribuyente con reparto editable',
  () => verificarConcepto({ ...base, motivo_reparto: 'CONTRIBUYENTE', reparto_editable: true }, null),
  'ErrorEsquemaNotarial', 'no hay reparto que editar')
lanza('grava IVA y es recaudo para terceros a la vez',
  () => verificarConcepto({ ...base, grava_iva: true, es_recaudo_terceros: true }, null),
  'ErrorEsquemaNotarial', 'a la vez')
lanza('se cobra por unidad y no dice de qué unidad',
  () => verificarConcepto({ ...base, unidad_label: null }, null),
  'ErrorEsquemaNotarial', 'de qué unidad')
lanza('un 3 sin decir si es porcentaje o por mil',
  () => verificarConcepto({ ...base, tipo: 'POR_MIL', valor: 3, unidad: null }, null),
  'ErrorEsquemaNotarial', 'porcentaje o por mil')
lanza('la sistematización sin los derechos de registro en el año',
  () => verificarEsquema({
    anio: 2026, estado: 'BORRADOR', version: 1, cerrado: false, reglas_retencion: [],
    conceptos: [CONCEPTOS_V1.find(c => c.clave === 'sistematizacion')],
  }),
  'ErrorEsquemaNotarial', 'no está en el año')
lanza('el catálogo real SIN reglas de retención (tiene un concepto que las usa)',
  () => verificarEsquema({ anio: 2026, estado: 'BORRADOR', version: 1, cerrado: false, conceptos: CONCEPTOS_V1, reglas_retencion: [] }),
  'ErrorEsquemaNotarial', 'No hay reglas de retención')
check('el catálogo real pasa sus propias guardas',
  (() => { try {
    verificarEsquema({
      anio: 2026, estado: 'BORRADOR', version: 1, cerrado: false, conceptos: CONCEPTOS_V1,
      reglas_retencion: [{ clave: 'general', label: 'Tarifa general', orden: 100, activa: true, tipo_efecto: 'TARIFA', valor_efecto: null, unidad: 'PORCENTAJE', condiciones: [] }],
    })
    return true
  } catch (e) { return `(${e.message})` } })() === true)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TRAMOS: la tabla mal cargada no se activa ══')
// ─────────────────────────────────────────────────────────────────────────────
const T = (o, desde, hasta, modo, valor, unidad, en_uvt = false) =>
  ({ orden: o, desde, hasta, modo_calculo: modo, valor, unidad, en_uvt })

// ORIP: fijo hasta el primer corte y tasa SOBRE EL TOTAL después (inventado).
const ORIP = [
  T(1, 0, 12852101, 'FIJO', 53100, 'PESOS'),
  T(2, 12852101, 192778606, 'TASA_SOBRE_TOTAL', 9.11, 'POR_MIL'),
  T(3, 192778606, null, 'TASA_SOBRE_TOTAL', 11.31, 'POR_MIL'),
]
check('ORIP en el tramo fijo', evaluarTramos(ORIP, 10_000_000, null, 'ORIP', PESO) === 53100)
check('ORIP justo en la frontera usa el tramo fijo', evaluarTramos(ORIP, 12_852_101, null, 'ORIP', PESO) === 53100)
check('ORIP sobre el total (9,11 por mil de 100 M)', evaluarTramos(ORIP, 100_000_000, null, 'ORIP', PESO) === 911_000)
check('ORIP en el tramo abierto', evaluarTramos(ORIP, 1_200_000_000, null, 'ORIP', PESO) === 13_572_000)
check('ORIP pasa la coherencia', (() => { verificarTramos(ORIP, null, 'ORIP'); return true })())

// Timbre: marginal y en UVT (inventado, con la forma real de la norma).
const TIMBRE = [
  T(1, 0, 20000, 'TASA_MARGINAL', 0, 'PORCENTAJE', true),
  T(2, 20000, 50000, 'TASA_MARGINAL', 1.5, 'PORCENTAJE', true),
  T(3, 50000, null, 'TASA_MARGINAL', 3, 'PORCENTAJE', true),
]
check('timbre por debajo del umbral: cero porque la tabla dice cero',
  evaluarTramos(TIMBRE, 100_000_000, 50000, 'TIMBRE', PESO) === 0)
check('timbre justo en el umbral sigue en cero',
  evaluarTramos(TIMBRE, 1_000_000_000, 50000, 'TIMBRE', PESO) === 0)
check('timbre MARGINAL: 1,5 % solo del excedente, no de todo',
  evaluarTramos(TIMBRE, 1_200_000_000, 50000, 'TIMBRE', PESO) === 3_000_000)
// La misma tabla leída SOBRE EL TOTAL, evaluada por el motor: 18 M, no 3 M.
const TIMBRE_MAL = [
  T(1, 0, 20000, 'TASA_SOBRE_TOTAL', 0, 'PORCENTAJE', true),
  T(2, 20000, null, 'TASA_SOBRE_TOTAL', 1.5, 'PORCENTAJE', true),
]
check('…la misma tabla leída sobre el total daría 18 M en vez de 3 M',
  evaluarTramos(TIMBRE_MAL, 1_200_000_000, 50000, 'TIMBRE_MAL', PESO) === 18_000_000)
// 1,5 % de 1.500 M = 22.500.000 · 3 % de 500 M = 15.000.000 · suma 37.500.000.
check('timbre en el tercer tramo acumula el segundo (37.500.000, a mano)',
  evaluarTramos(TIMBRE, 3_000_000_000, 50000, 'TIMBRE', PESO) === 37_500_000)
lanza('tramos en UVT sin UVT cargado', () => evaluarTramos(TIMBRE, 1_200_000_000, null, 'TIMBRE', PESO),
  'ErrorEsquemaNotarial', 'no tiene UVT cargado')

// Derechos notariales: EL ESCALÓN. Lectura literal — fijo + tasa sobre el excedente.
const DERECHOS = [
  T(1, 0, 259300, 'FIJO', 30900, 'PESOS'),
  T(2, 259300, null, 'TASA_MARGINAL', 3, 'POR_MIL'),
]
check('derechos: el mínimo se cobra entero desde el primer peso',
  evaluarTramos(DERECHOS, 200_000, null, 'DERECHOS', PESO) === 30_900)
check('derechos en la frontera: el excedente es cero',
  evaluarTramos(DERECHOS, 259_300, null, 'DERECHOS', PESO) === 30_900)
check('derechos de una finca de 100 M (30.900 + 3 por mil del excedente)',
  evaluarTramos(DERECHOS, 100_000_000, null, 'DERECHOS', PESO) === 330_122,
  `(dio ${evaluarTramos(DERECHOS, 100_000_000, null, 'DERECHOS', PESO)})`)
check('EL ESCALÓN existe: el excedente no iguala al mínimo hasta 10.559.300 exactos',
  evaluarTramos(DERECHOS, 5_000_000, null, 'DERECHOS', PESO) === 45_122 &&
  evaluarTramos(DERECHOS, 10_559_300, null, 'DERECHOS', PESO) === 61_800)
check('la lectura literal pasa la coherencia, incluso declarada no decreciente',
  (() => { verificarTramos(DERECHOS, null, 'derechos', { monotonicidad: 'NO_DECRECIENTE' }); return true })())

// La OTRA lectura de la misma pareja de cifras: tasa sobre el TOTAL.
lanza('la tabla que hace BAJAR la tarifa al pasar la frontera (30.900 → 778)',
  () => verificarTramos([T(1, 0, 259300, 'FIJO', 30900, 'PESOS'), T(2, 259300, null, 'TASA_SOBRE_TOTAL', 3, 'POR_MIL')], null, 'derechos', { monotonicidad: 'NO_DECRECIENTE' }),
  'ErrorEsquemaNotarial', 'la tarifa BAJA')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ FRONTERAS A MANO (valores calculados aparte, NO con la fórmula) ══')
// ─────────────────────────────────────────────────────────────────────────────
// Cada cifra de abajo se calculó a mano: 30.900 + 3 por mil de (base − 259.300).
// Ninguna sale de evaluarTramos, ni de alPeso, ni de la aritmética del motor. Si
// la fórmula del motor cambiara, estas NO cambiarían con ella: por eso son
// prueba y no eco.
const FRONTERAS = [
  [259_300, 30_900.00, 30_900],
  [259_301, 30_900.003, 30_900],
  [5_000_000, 45_122.10, 45_122],
  [10_500_000, 61_622.10, 61_622],
  [10_559_300, 61_800.00, 61_800],
  [100_000_000, 330_122.10, 330_122],
  [300_000_000, 930_122.10, 930_122],
]
for (const [base, crudo, redondo] of FRONTERAS) {
  check(`derechos sobre ${base.toLocaleString('es-CO')} → ${crudo} antes de redondeo`,
    cerca(evaluarTramosCrudo(DERECHOS, base, null, 'DERECHOS'), crudo),
    `(dio ${evaluarTramosCrudo(DERECHOS, base, null, 'DERECHOS')})`)
  check(`…y ${redondo.toLocaleString('es-CO')} al peso`,
    evaluarTramos(DERECHOS, base, null, 'DERECHOS', PESO) === redondo)
}
check('el punto donde el excedente iguala al mínimo es 10.559.300, no 10.500.000',
  evaluarTramos(DERECHOS, 10_559_300, null, 'DERECHOS', PESO) === 30_900 * 2 &&
  evaluarTramos(DERECHOS, 10_500_000, null, 'DERECHOS', PESO) !== 61_800)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ REDONDEO: lo dice la resolución, no el motor ══')
// ─────────────────────────────────────────────────────────────────────────────
lanza('una tarifa sin redondeo configurado no se liquida',
  () => evaluarTramos(DERECHOS, 100_000_000, null, 'derechos', null),
  'ErrorEsquemaNotarial', 'Lo dice la resolución')
check('al peso, cercano: 61.622,10 → 61.622', redondear(61_622.10, { unidad: 1, modo: 'CERCANO' }, 'x') === 61_622)
check('a la centena, arriba: 61.622,10 → 61.700', redondear(61_622.10, { unidad: 100, modo: 'ARRIBA' }, 'x') === 61_700)
check('a la centena, abajo: 61.622,10 → 61.600', redondear(61_622.10, { unidad: 100, modo: 'ABAJO' }, 'x') === 61_600)
check('a la centena, cercano: 61.622,10 → 61.600', redondear(61_622.10, { unidad: 100, modo: 'CERCANO' }, 'x') === 61_600)
check('a la centena, cercano, en el medio exacto: 61.650 → 61.700',
  redondear(61_650, { unidad: 100, modo: 'CERCANO' }, 'x') === 61_700)
check('arriba NO sube lo que ya es exacto', redondear(61_600, { unidad: 100, modo: 'ARRIBA' }, 'x') === 61_600)
check('los tres modos dan tres resultados distintos sobre la misma cifra',
  new Set([
    redondear(61_622.10, { unidad: 100, modo: 'ARRIBA' }, 'x'),
    redondear(61_622.10, { unidad: 100, modo: 'ABAJO' }, 'x'),
    redondear(61_622.10, { unidad: 1, modo: 'CERCANO' }, 'x'),
  ]).size === 3)
lanza('una unidad de redondeo inválida', () => redondear(100, { unidad: 0, modo: 'CERCANO' }, 'x'),
  'ErrorEsquemaNotarial', 'unidad de redondeo inválida')
check('el catálogo real nace SIN redondeo en todos los conceptos',
  CONCEPTOS_V1.every(c => !c.redondeo))
check('…y el redondeo es campo exigido en las tarifas que se calculan',
  camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'derechos_escritura')).includes('redondeo') &&
  camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'impuesto_registro')).includes('redondeo'))
check('…y NO se le exige a un valor fijo ni a uno libre',
  !camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'certificado_tradicion')).includes('redondeo') &&
  !camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'predial_pendiente')).includes('redondeo'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ MONOTONICIDAD: propiedad del concepto, no ley universal ══')
// ─────────────────────────────────────────────────────────────────────────────
const CRECIENTE = [T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 100, null, 'FIJO', 20, 'PESOS')]
const CONSTANTE = [T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 100, null, 'FIJO', 10, 'PESOS')]
const DECRECIENTE = [T(1, 0, 100, 'FIJO', 20, 'PESOS'), T(2, 100, null, 'FIJO', 10, 'PESOS')]
const pasa = (tramos, monotonicidad) => {
  try { verificarTramos(tramos, null, 'x', { monotonicidad }); return true } catch { return false }
}
check('creciente pasa como LIBRE', pasa(CRECIENTE, 'LIBRE'))
check('creciente pasa como NO_DECRECIENTE', pasa(CRECIENTE, 'NO_DECRECIENTE'))
check('constante pasa como LIBRE', pasa(CONSTANTE, 'LIBRE'))
check('constante pasa como NO_DECRECIENTE (no decrece)', pasa(CONSTANTE, 'NO_DECRECIENTE'))
check('DECRECIENTE pasa como LIBRE: una tabla puede bajar si así se configuró',
  pasa(DECRECIENTE, 'LIBRE'))
check('…y NO pasa como NO_DECRECIENTE', !pasa(DECRECIENTE, 'NO_DECRECIENTE'))
check('sin opciones no se comprueba nada: LIBRE es el defecto',
  (() => { try { verificarTramos(DECRECIENTE, null, 'x'); return true } catch { return false } })())
lanza('y el mensaje dice que se CONFIGURÓ así, no que las tarifas no bajen',
  () => verificarTramos(DECRECIENTE, null, 'x', { monotonicidad: 'NO_DECRECIENTE' }),
  'ErrorEsquemaNotarial', 'está configurada como no decreciente')
// Que la guarda no desaparezca en una refactorización: estructura 2026 real.
check('derechos_escritura está declarado NO_DECRECIENTE en el catálogo',
  CONCEPTOS_V1.find(c => c.clave === 'derechos_escritura').monotonicidad === 'NO_DECRECIENTE')
check('…y es el ÚNICO del catálogo',
  CONCEPTOS_V1.filter(c => c.monotonicidad === 'NO_DECRECIENTE').length === 1)
check('…y con la estructura 2026 (fijo + 3 por mil marginal) la guarda lo deja pasar',
  pasa(DERECHOS, 'NO_DECRECIENTE'))
check('…pero con la lectura sobre el total lo rechaza',
  !pasa([T(1, 0, 259300, 'FIJO', 30900, 'PESOS'), T(2, 259300, null, 'TASA_SOBRE_TOTAL', 3, 'POR_MIL')], 'NO_DECRECIENTE'))

lanza('un hueco entre tramos',
  () => verificarTramos([T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 200, null, 'FIJO', 20, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'un hueco')
lanza('un solape entre tramos',
  () => verificarTramos([T(1, 0, 300, 'FIJO', 10, 'PESOS'), T(2, 200, null, 'FIJO', 20, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'un solape')
lanza('dos tramos abiertos',
  () => verificarTramos([T(1, 0, null, 'FIJO', 10, 'PESOS'), T(2, 0, null, 'FIJO', 20, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'tramos abiertos')
lanza('el tramo abierto no es el último',
  () => verificarTramos([T(1, 0, null, 'FIJO', 10, 'PESOS'), T(2, 100, 200, 'FIJO', 20, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'no es el último')
lanza('el primer tramo no arranca en cero',
  () => verificarTramos([T(1, 100, null, 'FIJO', 10, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'no arranca en 0')
lanza('mezcla tramos en UVT con tramos en pesos',
  () => verificarTramos([T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 100, null, 'TASA_MARGINAL', 1, 'PORCENTAJE', true)], 50000),
  'ErrorEsquemaNotarial', 'mezcla tramos en UVT')
lanza('mezcla marginal con sobre el total',
  () => verificarTramos([T(1, 0, 100, 'TASA_MARGINAL', 1, 'PORCENTAJE'), T(2, 100, null, 'TASA_SOBRE_TOTAL', 2, 'PORCENTAJE')], null),
  'ErrorEsquemaNotarial', 'ambiguo')
lanza('una tasa expresada en PESOS',
  () => verificarTramos([T(1, 0, null, 'TASA_SOBRE_TOTAL', 3, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'tasa expresada en PESOS')
lanza('un valor fijo expresado en por mil',
  () => verificarTramos([T(1, 0, null, 'FIJO', 3, 'POR_MIL')], null),
  'ErrorEsquemaNotarial', 'su unidad no es PESOS')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ LAS CINCO BASES NO SON LA MISMA ══')
// ─────────────────────────────────────────────────────────────────────────────
const conAvaluoAlto = { valor_venta: 80_000_000, avaluo_catastral: 100_000_000 }
check('la base notarial toma el avalúo cuando supera el precio',
  calcularBaseNotarial(conAvaluoAlto).valor === 100_000_000)
check('…y lo DICE, para que la cifra alta no parezca un error',
  /avalúo catastral porque supera el precio/.test(calcularBaseNotarial(conAvaluoAlto).motivo))
check('la base de retención NO toma el avalúo: es el valor de la enajenación',
  calcularBaseRetencion(conAvaluoAlto).valor === 80_000_000)
check('la del timbre tampoco', calcularBaseTimbre(conAvaluoAlto).valor === 80_000_000)
check('sin avalúo se avisa de que no se pudo comparar',
  /Sin avalúo catastral/.test(calcularBaseNotarial({ valor_venta: 80_000_000 }).motivo))
check('son cinco bases con su propio campo de respaldo',
  BASES.length === 5 && new Set(BASES.map(b => b.campo_respaldo)).size === 5)
lanza('un valor de venta en cero', () => calcularBaseNotarial({ valor_venta: 0 }),
  'ErrorEsquemaNotarial', 'mayor que cero')
check('«52.374» se lee como cincuenta y dos mil, no como 52,374',
  calcularBaseNotarial({ valor_venta: '52.374' }).valor === 52374)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ RETENCIÓN: motor de excepciones con una sola regla ══')
// ─────────────────────────────────────────────────────────────────────────────
const GENERAL = {
  clave: 'general', label: 'Tarifa general', orden: 100, activa: true,
  tipo_efecto: 'TARIFA', valor_efecto: 1, unidad: 'PORCENTAJE', condiciones: [],
  respaldos: [RESP('tarifa', 'https://www.dian.gov.co/x.pdf')],
}
check('la regla general aplica y da el 1 %',
  calcularRetencion([GENERAL], 100_000_000).valor === 1_000_000)
check('…y dice con qué regla se calculó',
  calcularRetencion([GENERAL], 100_000_000).regla === 'general')
lanza('sin ninguna regla', () => calcularRetencion([], 100_000_000),
  'ErrorEsquemaNotarial', 'No hay reglas')
lanza('dos reglas generales', () => verificarReglas([GENERAL, { ...GENERAL, clave: 'otra' }]),
  'ErrorEsquemaNotarial', 'exactamente una regla')
lanza('la general no es la última (una excepción nunca se evaluaría)',
  () => verificarReglas([GENERAL, {
    ...GENERAL, clave: 'exc', orden: 200, condiciones: [{ campo: 'valor_en_uvt', operador: 'MAYOR', valor: '1' }],
  }]),
  'ErrorEsquemaNotarial', 'nunca se evaluaría')
lanza('una regla ACTIVA que depende de una pregunta que el formulario no hace',
  () => verificarReglas([
    { ...GENERAL, clave: 'casa', orden: 10, condiciones: [{ campo: 'es_casa_habitacion', operador: 'IGUAL', valor: 'true' }] },
    GENERAL,
  ]),
  'ErrorEsquemaNotarial', 'es código, no una fila')
check('…y el motivo está declarado en el catálogo de campos',
  CAMPOS_CONDICION.find(c => c.campo === 'es_casa_habitacion').pregunta_en_formulario === false)
check('una excepción sobre un campo que SÍ se pregunta es una fila',
  calcularRetencion([
    { ...GENERAL, clave: 'grande', orden: 10, tipo_efecto: 'TARIFA', valor_efecto: 2, unidad: 'PORCENTAJE',
      condiciones: [{ campo: 'valor_en_uvt', operador: 'MAYOR', valor: '1000' }] },
    GENERAL,
  ], 100_000_000, { valor_en_uvt: 2000 }).valor === 2_000_000)
check('una exención da cero CON regla nombrada',
  (() => { const r = calcularRetencion([
    { ...GENERAL, clave: 'exenta', label: 'Exenta', orden: 10, tipo_efecto: 'EXENCION', valor_efecto: null,
      condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'JURIDICA' }] },
    GENERAL,
  ], 100_000_000, { tipo_persona_vendedor: 'JURIDICA' })
    return r.valor === 0 && r.regla === 'exenta' })())
lanza('una condición cuyo dato no viene: se detiene, NO se da por cumplida',
  () => calcularRetencion([
    { ...GENERAL, clave: 'exenta', orden: 10, tipo_efecto: 'EXENCION', valor_efecto: null,
      condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'JURIDICA' }] },
    GENERAL,
  ], 100_000_000, {}),
  'SinReglaAplicable')
lanza('ninguna regla aplica: jamás devuelve cero',
  () => calcularRetencion([{ ...GENERAL, activa: false }], 100_000_000),
  'SinReglaAplicable', 'devolver cero')
lanza('la regla general no puede ser una reducción',
  () => verificarReglas([{ ...GENERAL, tipo_efecto: 'REDUCCION_PCT_POR_ANIO' }]),
  'ErrorEsquemaNotarial', 'fijar una TARIFA')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ EL AÑO VACÍO NO LIQUIDA, Y DICE QUÉ FALTA Y A QUIÉN ══')
// ─────────────────────────────────────────────────────────────────────────────
const ANIO_VACIO = {
  anio: 2026, estado: 'BORRADOR', uvt: null, uvb: null, tarifa_iva: null,
  version: 1, cerrado: false, respaldos: [],
  conceptos: CONCEPTOS_V1, reglas_retencion: [GENERAL],
}
lanza('el año en borrador no liquida',
  () => liquidar(ANIO_VACIO, { valor_venta: 100_000_000 }, { fuentes: FUENTES_OFICIALES }),
  'AnioNoPublicable')
lanza('ni siquiera ACTIVO liquida si falta una tarifa',
  () => liquidar({ ...ANIO_VACIO, estado: 'ACTIVO' }, { valor_venta: 100_000_000 }, { fuentes: FUENTES_OFICIALES }),
  'AnioNoPublicable')
const pend = pendientesParaActivar(ANIO_VACIO, FUENTES_OFICIALES)
const resumen = resumenDePendientes(pend)
check('hay pendientes de los tres dueños', resumen.porDueno.length === 3, `(${resumen.porDueno.length})`)
check('el contador NO aparece como dueño de las tarifas notariales',
  !resumen.porDueno.find(d => d.dueno === 'contador').items.some(i => /notarial/i.test(i)))
check('la retención espera al contador',
  resumen.porDueno.find(d => d.dueno === 'contador').items.some(i => /Retención/i.test(i)))
check('el certificado de tradición espera a la entidad que lo expide',
  resumen.porDueno.find(d => d.dueno === 'entidad').items.some(i => /tradición/i.test(i)))
check('el contador agregado existe solo como suma secundaria',
  resumen.total === pend.length && resumen.total > resumen.porDueno.length)
check('las cinco bases están entre lo pendiente',
  BASES.every(b => pend.some(p => p.campo === b.campo_respaldo)))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ AÑO COMPLETO (TARIFAS INVENTADAS) — LIQUIDACIÓN ══')
// ─────────────────────────────────────────────────────────────────────────────
const VALORES = {
  derechos_escritura: { redondeo: PESO, tramos: DERECHOS },
  hojas_papel_notarial: { valor: 7000 },
  copias: { valor: 3000 },
  biometria: { valor: 8000 },
  firma_digital: { valor: 12000 },
  autenticaciones: { valor: 5000 },
  recaudo_snr: { redondeo: PESO, tramos: [T(1, 0, 50_000_000, 'FIJO', 15000, 'PESOS'), T(2, 50_000_000, null, 'FIJO', 25000, 'PESOS')] },
  impuesto_registro: { valor: 1, unidad: 'PORCENTAJE', redondeo: PESO },
  timbre: { redondeo: PESO, tramos: TIMBRE },
  derechos_orip: { redondeo: PESO, tramos: ORIP },
  sistematizacion: { valor: 2, unidad: 'PORCENTAJE', redondeo: PESO },
  certificado_tradicion: { valor: 25000 },
  paz_salvo_predial: { valor: 15000 },
  no_valorizacion: { valor: 20000 },
}
const ANIO = {
  anio: 2026, estado: 'ACTIVO', uvt: 50000, uvb: 10000, tarifa_iva: 19,
  version: 7, cerrado: false,
  respaldos: [RESP('uvt', 'https://www.dian.gov.co/uvt.pdf'), RESP('uvb'), RESP('tarifa_iva'),
    ...BASES.map(b => RESP(b.campo_respaldo, 'https://www.suin-juriscol.gov.co/norma.pdf'))],
  conceptos: CONCEPTOS_V1.map(c => ({
    ...c, ...(VALORES[c.clave] ?? {}),
    respaldos: camposExigidos(c).map(campo => RESP(campo)),
  })),
  reglas_retencion: [GENERAL],
}
check('el año completo YA es publicable',
  (() => { try { exigirAnioPublicable(ANIO, FUENTES_OFICIALES); return true } catch (e) { return `(${e.message})` } })() === true)

const ENTRADA = {
  valor_venta: 100_000_000,
  cantidades: { hojas_papel_notarial: 10, copias: 2, biometria: 3 },
  // El comprador asume el 100 % de las copias: el IVA de esas copias es suyo.
  repartos: { copias: 100 },
  opcionales: ['biometria', 'certificado_tradicion', 'paz_salvo_predial', 'no_valorizacion', 'predial_pendiente'],
  valores_libres: { predial_pendiente: '450.000' },
}
const L = liquidar(ANIO, ENTRADA, { fuentes: FUENTES_OFICIALES, fecha: new Date(2026, 9, 6) })
const linea = k => L.lineas.find(l => l.clave === k)

check('derechos notariales: 330.122', linea('derechos_escritura').valor === 330_122)
check('ORIP: 911.000', linea('derechos_orip').valor === 911_000)
check('sistematización: 2 % de la tarifa registral, no del inmueble',
  linea('sistematizacion').valor === 18_220 && linea('sistematizacion').base.valor === 911_000)
check('timbre: cero porque la tabla dice cero bajo el umbral', linea('timbre').valor === 0)
check('retención: 1 % del valor de la enajenación', linea('retefuente').valor === 1_000_000)
check('…y la soporta el vendedor entero',
  linea('retefuente').vendedor === 1_000_000 && linea('retefuente').comprador === 0)
check('el impuesto de registro lo paga el comprador por costumbre',
  linea('impuesto_registro').comprador === 1_000_000 && linea('impuesto_registro').motivo_reparto === 'COSTUMBRE')
check('el recaudo SNR no lleva IVA', linea('recaudo_snr').iva === 0)
check('…y NO está en la base del IVA', !L.lineas.filter(l => l.iva > 0).some(l => l.clave === 'recaudo_snr'))
check('la base del IVA es la remuneración gravada',
  L.iva.base === 330_122 + 70_000 + 6_000 + 24_000, `(dio ${L.iva.base})`)
check('el IVA total es 81.723 (19 % de 430.122, a mano)', L.iva.total === 81_723, `(dio ${L.iva.total})`)
check('…y cuadra con la suma de las líneas',
  L.iva.total === L.lineas.reduce((s, l) => s + l.iva, 0))

// La decisión aprobada: el IVA SIGUE el reparto de cada concepto.
check('el IVA de las copias es del comprador, porque las copias son suyas',
  linea('copias').comprador === 6_000 + 1_140 && linea('copias').vendedor === 0)
check('…así que el IVA total NO queda 50/50', L.iva.comprador !== L.iva.vendedor)
check('el IVA reparte al peso: 41.432 / 40.291',
  L.iva.comprador === 41_432 && L.iva.vendedor === 40_291,
  `(dio ${L.iva.comprador} / ${L.iva.vendedor})`)
check('un 50/50 plano habría dado 40.862 / 40.861, y no es lo que salió',
  L.iva.comprador !== 40_862 && L.iva.vendedor !== 40_861)

check('las partes suman el total, al peso',
  L.totales.comprador + L.totales.vendedor === L.totales.total)
check('total del trámite: 3.526.065', L.totales.total === 3_526_065, `(dio ${L.totales.total})`)
check('el predial pendiente va APARTE del trámite',
  L.obligaciones.total === 450_000 && !L.lineas.filter(l => l.grupo !== 'OBLIGACIONES').some(l => l.clave === 'predial_pendiente'))
check('…y el total del trámite es exactamente lo demás',
  L.lineas.reduce((s, l) => s + l.total, 0) === 3_526_065 + 450_000)
check('los grupos visuales son los cinco acordados',
  L.grupos.map(g => g.clave).join() === 'COSTOS_NOTARIALES,IMPUESTOS,REGISTRO,DOCUMENTOS_PREVIOS,OBLIGACIONES')
check('la firma digital y las autenticaciones no entraron (no se activaron)',
  !linea('firma_digital') && !linea('autenticaciones'))
check('el reparto con norma se imprime como supletivo, no como obligatorio',
  linea('derechos_escritura').normas.some(n => /salvo pacto/.test(n)))
check('avisa de que no se indicó el avalúo catastral',
  L.avisos.some(a => /avalúo catastral/.test(a) && /por debajo/.test(a)))
check('avisa de que el valor de la hoja cambia por notaría',
  linea('hojas_papel_notarial').avisos.some(a => /de una notaría a otra/.test(a)))
check('el valor libre queda marcado como dato de quien simula, no como tarifa',
  linea('predial_pendiente').avisos.some(a => /no una tarifa/.test(a)))

// ── Bases distintas en la misma liquidación ────────────────────────────────
const L2 = liquidar(ANIO, { ...ENTRADA, valor_venta: 80_000_000, avaluo_catastral: 100_000_000 },
  { fuentes: FUENTES_OFICIALES })
check('con avalúo alto, los derechos se liquidan sobre el avalúo',
  L2.lineas.find(l => l.clave === 'derechos_escritura').base.valor === 100_000_000)
check('…pero la retención sigue sobre el precio pactado',
  L2.lineas.find(l => l.clave === 'retefuente').base.valor === 80_000_000 &&
  L2.lineas.find(l => l.clave === 'retefuente').valor === 800_000)
check('…y la liquidación lo explica', L2.avisos.some(a => /avalúo catastral porque supera el precio/.test(a)))

// ── Timbre en la operación grande ──────────────────────────────────────────
const L3 = liquidar(ANIO, { ...ENTRADA, valor_venta: 1_200_000_000 }, { fuentes: FUENTES_OFICIALES })
check('timbre marginal en una finca de 1.200 M: 3.000.000',
  L3.lineas.find(l => l.clave === 'timbre').valor === 3_000_000)
check('…y leerla sobre el total habría errado en 15 millones',
  evaluarTramos(TIMBRE_MAL, 1_200_000_000, 50000, 'TIMBRE_MAL', PESO)
    - L3.lineas.find(l => l.clave === 'timbre').valor === 15_000_000)

// ── Calculadora sencilla ───────────────────────────────────────────────────
const S = liquidar(ANIO, { valor_venta: 100_000_000, cantidades: { hojas_papel_notarial: 10 } },
  { modo: 'SENCILLA', fuentes: FUENTES_OFICIALES })
check('la sencilla no incluye copias ni servicios adicionales',
  !S.lineas.some(l => ['copias', 'biometria', 'firma_digital', 'autenticaciones'].includes(l.clave)))
check('…y lo dice', S.avisos.some(a => /Es una estimación/.test(a) && /copias/.test(a)))
check('…y marca las hojas como estimación',
  S.lineas.find(l => l.clave === 'hojas_papel_notarial').avisos.some(a => /estimación/.test(a)))
check('la sencilla sí trae los impuestos y el registro',
  ['retefuente', 'impuesto_registro', 'derechos_orip'].every(k => S.lineas.some(l => l.clave === k)))

// ── Lo que manda el cliente no se confía ───────────────────────────────────
lanza('un reparto para la retención (que tiene contribuyente, no reparto)',
  () => liquidar(ANIO, { ...ENTRADA, repartos: { retefuente: 50 } }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'no se reparte')
lanza('un reparto fuera de 0–100',
  () => liquidar(ANIO, { ...ENTRADA, repartos: { copias: 140 } }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'entre 0 y 100')
lanza('una clave de concepto que no existe en el año',
  () => liquidar(ANIO, { ...ENTRADA, cantidades: { ...ENTRADA.cantidades, inventado: 2 } }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'no es un concepto')
lanza('falta cuántas hojas lleva la escritura',
  () => liquidar(ANIO, { valor_venta: 100_000_000 }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'Falta cuántas')
lanza('cero copias en vez de desactivar el concepto',
  () => liquidar(ANIO, { ...ENTRADA, cantidades: { ...ENTRADA.cantidades, copias: 0 } }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'entero de 1 o más')
lanza('un predial pendiente activado y sin valor',
  () => liquidar(ANIO, { ...ENTRADA, valores_libres: {} }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'Falta el valor')
lanza('una liquidación con una fuente de respaldo retirada',
  () => liquidar(ANIO, ENTRADA, { fuentes: FUENTES_OFICIALES.map(f => ({ ...f, activo: false })) }),
  'AnioNoPublicable')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ COPIAR UN AÑO NO COPIA LOS RESPALDOS ══')
// ─────────────────────────────────────────────────────────────────────────────
const C2027 = copiarAnio(ANIO, 2027)
check('el año copiado conserva la estructura', C2027.conceptos.length === 16)
check('…y NINGUNA tarifa', C2027.conceptos.every(c => c.valor === null && (c.tramos ?? []).length === 0))
check('…ni un solo respaldo', C2027.conceptos.every(c => (c.respaldos ?? []).length === 0) && C2027.respaldos.length === 0)
check('…ni el UVT', C2027.uvt === null)
check('…y nace en borrador con versión 1', C2027.estado === 'BORRADOR' && C2027.version === 1)
lanza('el año copiado NO puede liquidar con los PDF del año viejo',
  () => liquidar({ ...C2027, estado: 'ACTIVO' }, ENTRADA, { fuentes: FUENTES_OFICIALES }),
  'AnioNoPublicable')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TRAZABILIDAD DEL PDF (sin identificador recuperable) ══')
// ─────────────────────────────────────────────────────────────────────────────
check('el código lleva año, versión de parámetros, versión de motor y fecha',
  L.trazabilidad === `SFR-N2026/P07/M${String(VERSION_MOTOR).padStart(2, '0')}/2026-10-06`,
  `(dio ${L.trazabilidad})`)
check('cambia si cambian los parámetros del año',
  codigoTrazabilidad({ anio: 2026, version: 8, fecha: new Date(2026, 9, 6) }) !== L.trazabilidad)
check('el aviso de no almacenado existe y lo dice en claro',
  /no se almacena/.test(AVISO_NO_ALMACENADO))
lanza('una versión de parámetros inválida', () => codigoTrazabilidad({ anio: 2026, version: 0 }),
  'ErrorEsquemaNotarial', 'Versión de parámetros')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ DIVERGENCIA CON EL AÑO FISCAL: AVISA, NO BLOQUEA ══')
// ─────────────────────────────────────────────────────────────────────────────
check('UVT distinto en los dos módulos → avisa', !!divergenciaUvt(50000, 49799))
check('…nombrando los dos valores', /50000/.test(divergenciaUvt(50000, 49799)) && /49799/.test(divergenciaUvt(50000, 49799)))
check('iguales → no avisa', divergenciaUvt(50000, 50000) === null)
check('el fiscal en borrador y vacío NO produce un aviso falso', divergenciaUvt(50000, null) === null)
check('y la divergencia no impide liquidar',
  (() => { try { exigirAnioPublicable(ANIO, FUENTES_OFICIALES); return true } catch { return false } })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ REPARTO AL PESO ══')
// ─────────────────────────────────────────────────────────────────────────────
check('un impar al 50 % no pierde ni inventa un peso',
  (() => { const r = repartir(30901, 50); return r.comprador + r.vendedor === 30901 })())
check('el 0 % deja todo al vendedor', repartir(1000, 0).vendedor === 1000)
check('el 100 % deja todo al comprador', repartir(1000, 100).comprador === 1000)
check('un reparto raro (37 %) sigue cuadrando',
  (() => { const r = repartir(999_999, 37); return r.comprador + r.vendedor === 999_999 })())

console.log(`\n${fail === 0 ? '✓ TODO EN VERDE' : '✗ HAY FALLOS'} — ${ok} verificaciones, ${fail} fallos\n`)
process.exit(fail === 0 ? 0 : 1)
