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
  exigirCamposConocidosDelTramo,
} from '../src/lib/notariales/tramos.ts'
import {
  calcularBaseNotarial, calcularBaseRetencion, calcularBaseTimbre, BASES,
} from '../src/lib/notariales/bases.ts'
import { calcularRetencion, verificarReglas, exigirValorDeCondicion, CAMPOS_CONDICION } from '../src/lib/notariales/retencion.ts'
import {
  esFuenteOficial, exigirRespaldoOficial, verificarEsquema, verificarConcepto,
  pendientesParaActivar, resumenDePendientes, exigirAnioPublicable, divergenciaUvt, copiarAnio,
  esFechaIso, cubreLaFecha, exigirVigencia,
} from '../src/lib/notariales/guardas.ts'
import { CONCEPTOS_V1, FUENTES_OFICIALES, camposExigidos } from '../src/lib/notariales/catalogo.ts'
import { liquidar } from '../src/lib/notariales/calculo.ts'
import { liquidarIva } from '../src/lib/notariales/iva.ts'
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
  campo, norma: 'Resolución RES-2026-000964-6 (cifras INVENTADAS para la prueba)',
  articulo: 'art. 50', url, fecha_norma: '2026-01-20',
  // Art. 56: rige desde el 1 de febrero de 2026. No desde el 1 de enero.
  vigencia_desde: '2026-02-01', vigencia_hasta: null, articulo_vigencia: 'art. 56',
  verificado_en: '2026-10-06', verificado_por: 'prueba',
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
lanza('un respaldo que no dice desde cuándo rige la norma',
  () => exigirRespaldoOficial({ ...RESP('valor'), vigencia_desde: undefined }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'desde cuándo rige')
lanza('un respaldo con fecha de vigencia ilegible',
  () => exigirRespaldoOficial({ ...RESP('valor'), vigencia_desde: '1 de febrero' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'desde cuándo rige')
lanza('un respaldo derogado antes de empezar a regir',
  () => exigirRespaldoOficial({ ...RESP('valor'), vigencia_hasta: '2026-01-01' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'antes de empezar a regir')
lanza('un respaldo con URL comercial',
  () => exigirRespaldoOficial(RESP('valor', 'https://gastosnotariales.co/t'), FUENTES_OFICIALES),
  'RespaldoNoOficial')
check('una fuente oficial DESACTIVADA deja de servir',
  esFuenteOficial('https://www.dian.gov.co/x.pdf',
    FUENTES_OFICIALES.map(f => f.dominio === 'dian.gov.co' ? { ...f, activo: false } : f)) === null)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ LA SIEMBRA REAL NACE VACÍA ══')
// ─────────────────────────────────────────────────────────────────────────────
check('son 18 conceptos', CONCEPTOS_V1.length === 18, `(hay ${CONCEPTOS_V1.length})`)
// Tres vienen verificados contra el PDF; los quince restantes, vacíos.
const VERIFICADOS = ['recaudo_snr', 'recaudo_sin_cuantia', 'acto_sin_cuantia']
check('los quince que faltan por verificar NO traen valor ni tramos',
  CONCEPTOS_V1.filter(c => !VERIFICADOS.includes(c.clave))
    .every(c => c.valor === null && (c.tramos ?? []).length === 0))
check('solo el acto sin cuantía trae un valor cargado (art. 2 lit. a)',
  CONCEPTOS_V1.filter(c => c.valor !== null).map(c => c.clave).join() === 'acto_sin_cuantia' &&
  CONCEPTOS_V1.find(c => c.clave === 'acto_sin_cuantia').valor === 90_600)
check('solo los dos recaudos traen tramos',
  CONCEPTOS_V1.filter(c => (c.tramos ?? []).length).map(c => c.clave).sort().join() ===
  'recaudo_sin_cuantia,recaudo_snr')
// LO QUE IMPORTA: traer la cifra NO habilita nada. Sin respaldo oficial el año
// sigue sin poder activarse, que es el punto de toda la guarda.
check('ninguno de los tres verificados trae respaldo',
  VERIFICADOS.every(k => (CONCEPTOS_V1.find(c => c.clave === k).respaldos ?? []).length === 0))
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
check('solo los dos recaudos traen redondeo, y es PUBLICADO',
  CONCEPTOS_V1.filter(c => c.redondeo).every(c => c.redondeo.modo === 'PUBLICADO') &&
  CONCEPTOS_V1.filter(c => c.redondeo).length === 2)
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
lanza('una tabla por tramos SIN base con más de una fila',
  () => verificarConcepto({ ...base, tipo: 'TRAMOS', base: 'NINGUNA', redondeo: PESO, tramos: [
    T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 100, null, 'FIJO', 20, 'PESOS'),
  ] }, null),
  'ErrorEsquemaNotarial', 'Sin cuantía no hay tramo que escoger')
lanza('una tasa que no declara base',
  () => verificarConcepto({ ...base, tipo: 'PORCENTAJE', base: 'NINGUNA', valor: 1, unidad: 'PORCENTAJE', redondeo: PESO }, null),
  'ErrorEsquemaNotarial', 'no declara base')
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
  /avalúo catastral porque supera el valor pactado/.test(calcularBaseNotarial(conAvaluoAlto).motivo))
check('la base de retención NO toma el avalúo: es el valor de la enajenación',
  calcularBaseRetencion(conAvaluoAlto).valor === 80_000_000)
check('la del timbre tampoco', calcularBaseTimbre(conAvaluoAlto).valor === 80_000_000)
check('sin los otros tres se avisa de que no se pudieron comparar',
  /No se informó el avalúo catastral ni el autoavalúo ni el valor del remate/
    .test(calcularBaseNotarial({ valor_venta: 80_000_000 }).motivo))

// ── Art. 51 literal a): CUATRO valores, no dos ─────────────────────────────
check('gana el autoavalúo si es el mayor de los cuatro',
  calcularBaseNotarial({ valor_venta: 80_000_000, avaluo_catastral: 90_000_000, autoavaluo: 120_000_000 }).valor === 120_000_000)
check('…y lo dice por su nombre',
  /autoavalúo porque supera el valor pactado/
    .test(calcularBaseNotarial({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).motivo))
check('gana el valor del remate si es el mayor',
  calcularBaseNotarial({ valor_venta: 80_000_000, avaluo_catastral: 90_000_000, autoavaluo: 95_000_000, valor_remate: 99_000_000 }).valor === 99_000_000)
check('con los cuatro informados y el pactado mayor, gana el pactado',
  calcularBaseNotarial({ valor_venta: 200_000_000, avaluo_catastral: 90_000_000, autoavaluo: 95_000_000, valor_remate: 99_000_000 }).valor === 200_000_000)
check('…y entonces NO hay aviso de que falte comparar nada',
  !/No se informó/.test(calcularBaseNotarial({ valor_venta: 200_000_000, avaluo_catastral: 1, autoavaluo: 1, valor_remate: 1 }).motivo))
check('la base de RETENCIÓN sigue siendo el valor de la enajenación, no el mayor de cuatro',
  calcularBaseRetencion({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).valor === 80_000_000)
check('la del TIMBRE tampoco toma el autoavalúo',
  calcularBaseTimbre({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).valor === 80_000_000)
lanza('un autoavalúo negativo lo rechaza la lectura del número',
  () => calcularBaseNotarial({ valor_venta: 100, autoavaluo: -5 }),
  'ErrorNumero', 'no es un número válido')
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
  // recaudo_snr y recaudo_sin_cuantia NO se inventan: el catálogo ya trae los
  // tramos reales del art. 50, verificados contra el PDF. El arnés solo les
  // pone el respaldo que les falta, para poder activar el año de prueba.
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
  // INVENTADA, como todo lo demás de este arnés: aproximación al múltiplo de
  // $10, medio hacia arriba. La real entra con el PDF.
  redondeo_iva: { unidad: 10, modo: 'CERCANO' },
  version: 7, cerrado: false,
  respaldos: [RESP('uvt', 'https://www.dian.gov.co/uvt.pdf'), RESP('uvb'), RESP('tarifa_iva'),
    RESP('redondeo_iva', 'https://www.dian.gov.co/concepto.pdf'),
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
  // El comprador asume el 100 % de las copias y de la biometría. La biometría
  // es la que mueve el reparto del IVA: las copias ya lo traen dentro.
  repartos: { copias: 100, biometria: 100 },
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
check('el recaudo SNR no lleva IVA', linea('recaudo_snr').iva_exacto === '0')
check('…y su valor NO está dentro de BASE_IVA',
  Number(L.iva.base) === 424_122 && 424_122 + 25_000 !== Number(L.iva.base))
// A mano: 330.122 derechos + 70.000 hojas + 24.000 biometría = 424.122. Las
// copias NO están: su precio ya trae el IVA dentro.
check('BASE_IVA es la remuneración gravada SIN las copias: 424.122',
  L.iva.base === '424122', `(dio ${L.iva.base})`)
check('IVA_BRUTO conserva los decimales: 80.583,18 (19 % de 424.122, a mano)',
  L.iva.bruto === '80583.18', `(dio ${L.iva.bruto})`)
check('IVA_LIQUIDADO aproxima al múltiplo de 10: 80.580', L.iva.liquidado === 80_580, `(dio ${L.iva.liquidado})`)
check('ninguna línea lleva el IVA redondeado: lo aporta exacto',
  L.lineas.find(l => l.clave === 'derechos_escritura').iva_exacto === '62723.18')

// La decisión aprobada: el IVA SIGUE el reparto de cada concepto.
check('las copias son del comprador por el precio completo, IVA incluido',
  linea('copias').comprador === 6_000 && linea('copias').vendedor === 0)
check('…así que el IVA total NO queda 50/50', L.iva.comprador !== L.iva.vendedor)
// A mano: ponderado = 165.061 + 35.000 + 24.000 = 224.061 de 424.122.
// 80.580 × 224.061/424.122 = 42.569,91 → la MENOR es la del vendedor
// (38.010,09 → 38.010) y el comprador se queda con el residual, 42.570.
check('el IVA reparte 42.570 / 38.010 (se redondea la MENOR, la mayor es residual)',
  L.iva.comprador === 42_570 && L.iva.vendedor === 38_010,
  `(dio ${L.iva.comprador} / ${L.iva.vendedor})`)
check('…y suman exactamente el liquidado',
  L.iva.comprador + L.iva.vendedor === L.iva.liquidado)
check('un 50/50 plano habría dado 40.290 / 40.290, y no es lo que salió',
  L.iva.comprador !== 40_290)

check('las partes suman el total, al peso',
  L.totales.comprador + L.totales.vendedor === L.totales.total)
// ── EL CENTINELA DEL TOTAL ─────────────────────────────────────────────────
// A mano: 3.448.242 de conceptos del trámite + 80.580 de IVA liquidado.
//
// Este número ha cambiado dos veces, y las dos por un motivo escrito:
//   · 3.526.065 → 3.524.922 al pasar a UN SOLO redondeo del IVA sobre el total
//     en vez de uno por línea (y al salir las copias de BASE_IVA, porque su
//     precio ya trae el IVA dentro).
//   · 3.524.922 → 3.528.822 al sembrar el recaudo REAL del art. 50: para una
//     cuantía de 100 M son $28.900, no los $25.000 inventados que tenía antes
//     el arnés.
// El centinela vale por el motivo, no por el número: si vuelve a moverse sin
// una razón escrita aquí, es un fallo.
check('total del trámite: 3.528.822', L.totales.total === 3_528_822, `(dio ${L.totales.total})`)
check('…del que 2.216.301 son del comprador y 1.312.521 del vendedor',
  L.totales.comprador === 2_216_301 && L.totales.vendedor === 1_312_521,
  `(dio ${L.totales.comprador} / ${L.totales.vendedor})`)
check('el predial pendiente va APARTE del trámite',
  L.obligaciones.total === 450_000 && !L.lineas.filter(l => l.grupo !== 'OBLIGACIONES').some(l => l.clave === 'predial_pendiente'))
check('…y el total del trámite es exactamente lo demás más el IVA',
  L.lineas.reduce((s, l) => s + l.total, 0) + L.iva.liquidado === 3_528_822 + 450_000)
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
check('…y la liquidación lo explica', L2.avisos.some(a => /avalúo catastral porque supera el valor pactado/.test(a)))

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
console.log('\n══ IVA: LOS SIETE VALORES Y UN SOLO REDONDEO ══')
// ─────────────────────────────────────────────────────────────────────────────
// Los esperados están calculados aparte, a mano. La regla de aproximación que
// se usa aquí (múltiplo de $10, medio hacia arriba) es INVENTADA para probar la
// mecánica: la real es normativa y entra con su PDF.
const DIEZ = { unidad: 10, modo: 'CERCANO' }
const unIva = (base, pct = 50, tarifa = 19, regla = DIEZ) =>
  liquidarIva([{ clave: 'x', base, pct_comprador: pct }], tarifa, regla)

lanza('sin la regla de aproximación, el IVA NO liquida',
  () => unIva('216965.35', 50, 19, null),
  'ErrorEsquemaNotarial', 'regla normativa')

check('216.965,35 → IVA_BRUTO 41.223,4165', unIva('216965.35').bruto === '41223.4165',
  `(dio ${unIva('216965.35').bruto})`)
// Las dos fronteras: prueban el corte sin depender de decimales infinitos.
check('216.973,68 → IVA_BRUTO 41.224,9992', unIva('216973.68').bruto === '41224.9992',
  `(dio ${unIva('216973.68').bruto})`)
check('…y liquida 41.220 (queda por debajo del medio)', unIva('216973.68').liquidado === 41_220)
check('216.973,69 → IVA_BRUTO 41.225,0011', unIva('216973.69').bruto === '41225.0011',
  `(dio ${unIva('216973.69').bruto})`)
check('…y liquida 41.230 (pasa el medio: medio hacia arriba)', unIva('216973.69').liquidado === 41_230)
check('un céntimo de base mueve la liquidación 10 pesos',
  unIva('216973.69').liquidado - unIva('216973.68').liquidado === 10)

const NOVENTA = unIva('999999.00', 37)
check('999.999,00 → IVA_BRUTO 189.999,81', NOVENTA.bruto === '189999.81', `(dio ${NOVENTA.bruto})`)
check('…liquida 190.000', NOVENTA.liquidado === 190_000)
check('…y al 37/63 reparte 70.300 / 119.700',
  NOVENTA.comprador === 70_300 && NOVENTA.vendedor === 119_700,
  `(dio ${NOVENTA.comprador} / ${NOVENTA.vendedor})`)
check('…que suman el liquidado', NOVENTA.comprador + NOVENTA.vendedor === 190_000)

// EL ERROR QUE SE BUSCA: redondear por línea en vez de sobre el total.
// Con tarifa del 20 %, dos bases de 100.020 dan 20.004 de IVA cada una, exacto.
const DOS = liquidarIva(
  [{ clave: 'a', base: 100020, pct_comprador: 50 }, { clave: 'b', base: 100020, pct_comprador: 50 }],
  20, DIEZ,
)
check('dos conceptos de 20.004 de IVA → IVA_BRUTO 40.008', DOS.bruto === '40008', `(dio ${DOS.bruto})`)
check('…liquidan 40.010, nunca 40.000', DOS.liquidado === 40_010 && DOS.liquidado !== 40_000)
check('…que es lo que habría dado redondear cada línea por su cuenta',
  unIva('100020', 50, 20).liquidado * 2 === 40_000)
check('…diez pesos que no aparecen en ninguna línea y sí en el total',
  DOS.liquidado - unIva('100020', 50, 20).liquidado * 2 === 10)

// EL MEDIO EXACTO. Las dos fronteras de arriba (…,9992 y …,0011) prueban de qué
// lado cae el corte, pero NO distinguen medio-arriba de medio-abajo: ninguna
// está en el medio. Hace falta un cociente que termine en ,5 exacto, y con el
// 19 % no existe. Con el 20 %: 206.125 × 20 % = 41.225 → /10 = 4.122,5 clavado.
check('en el medio EXACTO, medio hacia arriba: 41.225 → 41.230',
  unIva('206125', 50, 20).liquidado === 41_230, `(dio ${unIva('206125', 50, 20).liquidado})`)
check('…y medio hacia abajo habría dado 41.220',
  unIva('206125', 50, 20, { unidad: 10, modo: 'ABAJO' }).liquidado === 41_220)

// CUÁL DE LAS DOS PARTES SE REDONDEA. Con la mayoría de repartos da igual: las
// dos ramas coinciden. Solo se separan cuando la parte cae en ,5 exacto.
// 41.230 × 25 % = 10.307,5 → se redondea la MENOR (10.308) y la mayor es el
// residual (30.922). Redondeando la mayor saldría 10.307 / 30.923.
check('al 25 %, redondear la MENOR da 10.308 / 30.922',
  (() => { const r = unIva('216973.69', 25)
    return r.comprador === 10_308 && r.vendedor === 30_922 })(),
  `(dio ${unIva('216973.69', 25).comprador} / ${unIva('216973.69', 25).vendedor})`)
check('…y nunca 10.307 / 30.923, que es redondear la mayor',
  unIva('216973.69', 25).comprador !== 10_307)

// EL EMPATE. Con múltiplos de 10 el 50/50 siempre parte exacto, así que la rama
// del empate solo se ve con aproximación al peso: 41.225 / 2 = 20.612,5.
const AL_PESO_REGLA = { unidad: 1, modo: 'CERCANO' }
check('en el empate, el residual es del COMPRADOR: 20.612 / 20.613',
  (() => { const r = unIva('216973.69', 50, 19, AL_PESO_REGLA)
    return r.liquidado === 41_225 && r.comprador === 20_612 && r.vendedor === 20_613 })(),
  `(dio ${JSON.stringify(unIva('216973.69', 50, 19, AL_PESO_REGLA))})`)
check('…y es determinista: dos llamadas idénticas dan lo mismo',
  unIva('216973.69', 50, 19, AL_PESO_REGLA).comprador ===
  unIva('216973.69', 50, 19, AL_PESO_REGLA).comprador)

// CONCILIACIÓN: una docena de repartos, incluidos los extremos y el empate.
const REPARTOS = [0, 5, 17, 33, 37, 50, 63, 66.6, 75, 88, 99, 100]
let descuadres = 0
for (const pct of REPARTOS) {
  const r = unIva('216973.69', pct)
  if (r.comprador + r.vendedor !== r.liquidado) descuadres++
  if (r.comprador < 0 || r.vendedor < 0) descuadres++
}
check(`conciliación en ${REPARTOS.length} repartos: comprador + vendedor = liquidado siempre`,
  descuadres === 0, `(${descuadres} descuadres)`)
check('el 0 % deja todo el IVA al vendedor', unIva('216973.69', 0).vendedor === 41_230)
check('el 100 % deja todo el IVA al comprador', unIva('216973.69', 100).comprador === 41_230)
check('en el empate 50/50 el residual es del comprador (determinismo)',
  (() => { const r = unIva('216973.69', 50)
    // 41.230 / 2 = 20.615 exactos: no hay residuo que repartir, pero la rama
    // del empate es la que decide, y tiene que dar siempre lo mismo.
    return r.comprador === 20_615 && r.vendedor === 20_615 })())
check('con reparto impar, el residual lo absorbe la parte MAYOR',
  (() => { const r = unIva('216973.69', 33)
    // menor = comprador = 41.230 × 0,33 = 13.605,9 → 13.606; mayor = 27.624.
    return r.comprador === 13_606 && r.vendedor === 27_624 })())
check('los valores EXACTOS se conservan para el PDF',
  unIva('216973.69', 33).comprador_exacto === '13605.9')
check('una base de cero no revienta ni inventa IVA',
  (() => { const r = liquidarIva([], 19, DIEZ)
    return r.base === '0' && r.liquidado === 0 && r.comprador === 0 && r.vendedor === 0 })())
check('la aproximación hacia ABAJO da otra cosa que la cercana',
  unIva('216973.69', 50, 19, { unidad: 10, modo: 'ABAJO' }).liquidado === 41_220)
check('…y hacia ARRIBA también',
  unIva('216973.68', 50, 19, { unidad: 10, modo: 'ARRIBA' }).liquidado === 41_230)
lanza('un reparto fuera de rango en un aporte',
  () => liquidarIva([{ clave: 'x', base: 100, pct_comprador: 140 }], 19, DIEZ),
  'ErrorEsquemaNotarial', 'fuera de 0–100')
check('el redondeo del IVA es un pendiente del año, a nombre del titular',
  pendientesParaActivar({ ...ANIO_VACIO }, FUENTES_OFICIALES)
    .some(x => x.campo === 'redondeo_iva' && x.quien === 'titular'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ LÍMITES CONTIGUOS: la base puede traer decimales ══')
// ─────────────────────────────────────────────────────────────────────────────
// Si la base viene de un avalúo, puede tener centavos. Con límites del tipo
// «hasta 100.000.000 / desde 100.000.001», una base de 100.000.000,50 no cae
// en ningún tramo. El convenio es `desde < base ≤ hasta`, contiguo.
check('una base con decimales cae en su tramo (100.000.000,50 → 9,11 por mil)',
  evaluarTramos(ORIP, 100_000_000.5, null, 'ORIP', PESO) === 911_000,
  `(dio ${evaluarTramos(ORIP, 100_000_000.5, null, 'ORIP', PESO)})`)
// A mano: 12.852.101,50 × 9,11 / 1.000 = 117.082,644665 → 117.083.
check('medio peso por encima de una frontera ya está en el tramo siguiente',
  evaluarTramos(ORIP, 12_852_101.5, null, 'ORIP', PESO) === 117_083,
  `(dio ${evaluarTramos(ORIP, 12_852_101.5, null, 'ORIP', PESO)})`)
check('…y justo EN la frontera sigue en el tramo fijo',
  evaluarTramos(ORIP, 12_852_101, null, 'ORIP', PESO) === 53_100)
check('un avalúo escrito a la colombiana con centavos se lee bien',
  calcularBaseNotarial({ valor_venta: 1, avaluo_catastral: '100.000.000,50' }).valor === 100_000_000.5)
lanza('la tabla NO contigua del documento: hasta 100.000.000 / desde 100.000.001',
  () => verificarTramos([
    T(1, 0, 100_000_000, 'FIJO', 10, 'PESOS'),
    T(2, 100_000_001, null, 'FIJO', 20, 'PESOS'),
  ], null, 'x'),
  'ErrorEsquemaNotarial', 'un hueco')
check('…y el mensaje dice los dos números para poder arreglarlo',
  (() => { try {
    verificarTramos([T(1, 0, 100_000_000, 'FIJO', 10, 'PESOS'), T(2, 100_000_001, null, 'FIJO', 20, 'PESOS')], null, 'x')
    return false
  } catch (e) { return /100000000 → 100000001/.test(e.message) } })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ UN SOLO SITIO PARA CADA DATO DEL TRAMO ══')
// ─────────────────────────────────────────────────────────────────────────────
lanza('un tramo que trae su propio IVA',
  () => exigirCamposConocidosDelTramo({ ...T(1, 0, null, 'FIJO', 10, 'PESOS'), iva: 19 }, 'x'),
  'ErrorEsquemaNotarial', 'El IVA se declara en el concepto')
lanza('un tramo con una condición en texto libre',
  () => exigirCamposConocidosDelTramo({ ...T(1, 0, null, 'FIJO', 10, 'PESOS'), condicion: 'SIN_CUANTIA' }, 'x'),
  'ErrorEsquemaNotarial', 'no va como texto libre')
lanza('cualquier otro campo desconocido, para que migrar no pierda datos en silencio',
  () => exigirCamposConocidosDelTramo({ ...T(1, 0, null, 'FIJO', 10, 'PESOS'), observacion: 'algo' }, 'x'),
  'ErrorEsquemaNotarial', 'no conoce')
check('la verificación de la tabla también los caza',
  (() => { try {
    verificarTramos([{ ...T(1, 0, null, 'FIJO', 10, 'PESOS'), iva: 19 }], null, 'x')
    return false
  } catch (e) { return /grava_iva/.test(e.message) } })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ RECAUDO: valor publicado, aportes y UVB de trazabilidad ══')
// ─────────────────────────────────────────────────────────────────────────────
check('PUBLICADO devuelve la cifra tal cual, sin recalcular',
  redondear(15000, { unidad: 1, modo: 'PUBLICADO' }, 'x') === 15000)
check('…y no la mueve aunque la unidad diga centena',
  redondear(15050, { unidad: 100, modo: 'PUBLICADO' }, 'x') === 15050)
lanza('una cifra «publicada» que sale con decimales delata que se recalculó',
  () => redondear(15000.5, { unidad: 1, modo: 'PUBLICADO' }, 'x'),
  'ErrorEsquemaNotarial', 'se declaró PUBLICADA y sale con decimales')

const RECAUDO = CONCEPTOS_V1.find(c => c.clave === 'recaudo_snr').tramos
check('los aportes que suman el valor publicado pasan',
  (() => { verificarTramos(RECAUDO, null, 'recaudo'); return true })())
lanza('aportes que NO suman el recaudo publicado',
  () => verificarTramos([
    { ...T(1, 0, null, 'FIJO', 25000, 'PESOS'), aporte_snr: 17000, aporte_fondo: 7000 },
  ], null, 'recaudo'),
  'ErrorEsquemaNotarial', 'no suman el recaudo')
lanza('aportes institucionales sobre un tramo que no es un valor fijo',
  () => verificarTramos([
    { ...T(1, 0, null, 'TASA_SOBRE_TOTAL', 3, 'POR_MIL'), aporte_snr: 1, aporte_fondo: 2 },
  ], null, 'recaudo'),
  'ErrorEsquemaNotarial', 'no es un valor fijo')
check('el usuario ve UN solo recaudo: 28.900 para una cuantía de 100 M',
  linea('recaudo_snr').valor === 28_900, `(dio ${linea('recaudo_snr').valor})`)
check('…y el desglose institucional queda aparte, para el PDF (mitad y mitad)',
  linea('recaudo_snr').desglose_institucional?.snr === 14_450 &&
  linea('recaudo_snr').desglose_institucional?.fondo === 14_450)
check('…que suma el recaudo que paga',
  linea('recaudo_snr').desglose_institucional.snr + linea('recaudo_snr').desglose_institucional.fondo === 28_900)
check('el desglose NO altera el reparto entre comprador y vendedor',
  linea('recaudo_snr').comprador === 14_450 && linea('recaudo_snr').vendedor === 14_450)
// La UVB es solo trazabilidad: si moviera una cifra, no sería trazabilidad.
const ANIO_UVB_TOCADA = {
  ...ANIO,
  conceptos: ANIO.conceptos.map(c => c.clave !== 'recaudo_snr' ? c : {
    ...c, tramos: c.tramos.map(t => ({ ...t, valor_en_uvb: 999 })),
  }),
}
check('cambiar la UVB del tramo no mueve ninguna cifra',
  liquidar(ANIO_UVB_TOCADA, ENTRADA, { fuentes: FUENTES_OFICIALES }).totales.total === L.totales.total)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ ART. 50 TRANSCRITO: cada cifra contra su UVB ══')
// ─────────────────────────────────────────────────────────────────────────────
// La comprobación del titular, replicada: cada valor publicado sale de
// UVB × $12.110 ajustado a la centena más próxima, y cada mitad es exacta. Si
// alguna no cuadra, el error está en la transcripción, no en la tabla.
//
// Esto NO es un eco: el esperado se deriva de la UVB, que es otro dato de la
// misma fila, no del valor que estamos comprobando.
const UVB_2026 = 12_110
const aLaCentena = n => Math.round(n / 100) * 100
const TRAMOS_50 = [
  ...CONCEPTOS_V1.find(c => c.clave === 'recaudo_sin_cuantia').tramos,
  ...CONCEPTOS_V1.find(c => c.clave === 'recaudo_snr').tramos,
]
check('son las siete filas del artículo 50', TRAMOS_50.length === 7)
let malTranscritos = 0
for (const t of TRAMOS_50) {
  if (aLaCentena(Number(t.valor_en_uvb) * UVB_2026) !== Number(t.valor)) malTranscritos++
  if (Number(t.aporte_snr) !== Number(t.valor) / 2) malTranscritos++
  if (Number(t.aporte_fondo) !== Number(t.valor) / 2) malTranscritos++
}
check('las siete cuadran con UVB × 12.110 a la centena, y las mitades son exactas',
  malTranscritos === 0, `(${malTranscritos} descuadres)`)
check('los valores publicados, en orden: 19.300 · 28.900 · 43.700 · 52.700 · 71.900 · 84.800 · 96.400',
  TRAMOS_50.map(t => Number(t.valor)).join() === '19300,28900,43700,52700,71900,84800,96400')
check('la tabla por cuantía cubre la recta y pasa sus guardas',
  (() => { verificarTramos(CONCEPTOS_V1.find(c => c.clave === 'recaudo_snr').tramos, null, 'art. 50'); return true })())

// LA FRONTERA QUE DICE EL DOCUMENTO: «De $0 hasta $100.000.000».
const recaudoDe = base => evaluarTramos(
  CONCEPTOS_V1.find(c => c.clave === 'recaudo_snr').tramos, base, null, 'art. 50',
  { unidad: 1, modo: 'PUBLICADO' })
check('$100.000.000 EXACTOS van al PRIMER tramo: 28.900', recaudoDe(100_000_000) === 28_900)
check('…y un peso más, al segundo: 43.700', recaudoDe(100_000_001) === 43_700)
check('…y medio peso más también, que es lo que el «+1» dejaba fuera',
  recaudoDe(100_000_000.5) === 43_700)
check('una cuantía de 1.500 M exactos todavía es del quinto tramo: 84.800',
  recaudoDe(1_500_000_000) === 84_800)
check('…y por encima, del abierto: 96.400', recaudoDe(1_500_000_001) === 96_400)
check('la cuantía más pequeña posible paga el primer tramo', recaudoDe(1) === 28_900)

// ── Actos sin cuantía: catalogados y calculables, fuera de la sencilla ──────
check('el acto sin cuantía NO está en la calculadora sencilla',
  CONCEPTOS_V1.find(c => c.clave === 'acto_sin_cuantia').aplica_en_sencilla === false)
check('…y no viene activado por defecto',
  CONCEPTOS_V1.find(c => c.clave === 'acto_sin_cuantia').activo_por_defecto === false)
const CON_SIN_CUANTIA = liquidar(ANIO, {
  ...ENTRADA,
  opcionales: [...ENTRADA.opcionales, 'acto_sin_cuantia', 'recaudo_sin_cuantia'],
}, { fuentes: FUENTES_OFICIALES })
const lsc = k => CON_SIN_CUANTIA.lineas.find(l => l.clave === k)
check('…pero activado, calcula: 90.600 del art. 2 lit. a)', lsc('acto_sin_cuantia').valor === 90_600)
check('…grava IVA: 17.214 exactos (19 % de 90.600, a mano)',
  lsc('acto_sin_cuantia').iva_exacto === '17214')
check('…y su recaudo es el de la primera fila: 19.300', lsc('recaudo_sin_cuantia').valor === 19_300)
check('…con su desglose mitad y mitad: 9.650 / 9.650',
  lsc('recaudo_sin_cuantia').desglose_institucional.snr === 9_650 &&
  lsc('recaudo_sin_cuantia').desglose_institucional.fondo === 9_650)
check('…y el recaudo del acto sin cuantía tampoco entra en BASE_IVA',
  lsc('recaudo_sin_cuantia').iva_exacto === '0')

// ── Y lo que de verdad importa: la cifra cargada NO habilita el cálculo ────
lanza('el catálogo REAL, con los tres verificados, sigue sin poder activarse',
  () => liquidar({ ...ANIO_VACIO, estado: 'ACTIVO' }, { valor_venta: 100_000_000 }, { fuentes: FUENTES_OFICIALES }),
  'AnioNoPublicable')
check('…y los pendientes nombran los tres, por falta de RESPALDO y no de cifra',
  (() => { const p = pendientesParaActivar(ANIO_VACIO, FUENTES_OFICIALES)
    return ['recaudo_snr', 'recaudo_sin_cuantia', 'acto_sin_cuantia'].every(k => {
      const label = CONCEPTOS_V1.find(c => c.clave === k).label
      return p.some(x => x.que.startsWith(label) && /sin respaldo oficial/.test(x.que))
    }) })())
check('…y NINGUNO de los tres aparece como «falta la tarifa»',
  !pendientesParaActivar(ANIO_VACIO, FUENTES_OFICIALES)
    .some(x => /falta la tarifa/.test(x.que) && /Recaudo|Acto sin cuantía/.test(x.que)))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ COPIA SIMPLE: EL IVA VA DENTRO DEL PRECIO ══')
// ─────────────────────────────────────────────────────────────────────────────
// Art. 5: $700 por cara, IVA incluido. Es el único concepto así.
check('la unidad de la copia es la CARA, no la copia',
  CONCEPTOS_V1.find(c => c.clave === 'copias').unidad_label === 'cara')
check('…y está marcada como precio con IVA incluido',
  CONCEPTOS_V1.find(c => c.clave === 'copias').precio_incluye_iva === true)
check('…y es la única del catálogo',
  CONCEPTOS_V1.filter(c => c.precio_incluye_iva).length === 1)
check('el precio no se toca: 2 caras × 3.000 = 6.000', linea('copias').valor === 6_000)
// A mano: 6.000 / 1,19 = 5.042,0168… de base y 957,9831… de IVA incluido.
check('el componente de IVA se EXTRAE: 957,98',
  Number(linea('copias').iva_incluido_exacto).toFixed(2) === '957.98',
  `(dio ${linea('copias').iva_incluido_exacto})`)
check('…y nunca se suma un 19 % encima (serían 1.140, y 7.140 de total)',
  Number(linea('copias').iva_incluido_exacto) !== 1_140 && linea('copias').valor !== 7_140)
check('el neto más el IVA incluido devuelven el precio publicado',
  Math.abs((6_000 - Number(linea('copias').iva_incluido_exacto)) +
    Number(linea('copias').iva_incluido_exacto) - 6_000) < 0.0001)
check('no aporta a BASE_IVA: su IVA ya venía liquidado en el precio',
  Number(L.iva.base) === 424_122)
check('la liquidación informa el IVA que ya venía dentro de precios',
  Number(L.iva_incluido_en_precios).toFixed(2) === '957.98',
  `(dio ${L.iva_incluido_en_precios})`)
check('…aparte del liquidado, para que el PDF pueda sumar el IVA total pagado',
  L.iva.liquidado === 80_580 && Number(L.iva_incluido_en_precios) > 0)
// Art. 5: 700 × 19/119 = 111,76 por cara. Dos caras → 223,53.
check('la extracción es precio × 19/119, no precio × 19 %',
  Math.abs(Number(linea('copias').iva_incluido_exacto) - (6_000 * 19) / 119) < 0.0001)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ CONDICIONES: ni texto libre ni comparación muda ══')
// ─────────────────────────────────────────────────────────────────────────────
check('el campo de texto declara sus valores admitidos',
  CAMPOS_CONDICION.find(c => c.campo === 'tipo_persona_vendedor').valores.join() === 'NATURAL,JURIDICA')
lanza('«juridica» en minúscula se rechaza al cargar la regla',
  () => exigirValorDeCondicion({ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'juridica' }),
  'ErrorEsquemaNotarial', 'Mayúsculas incluidas')
check('«JURIDICA» se acepta',
  (() => { exigirValorDeCondicion({ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'JURIDICA' }); return true })())
lanza('un valor que no está en la lista',
  () => exigirValorDeCondicion({ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'SOCIEDAD' }),
  'ErrorEsquemaNotarial', 'solo admite')
lanza('un «sí» en un campo de sí o no',
  () => exigirValorDeCondicion({ campo: 'es_casa_habitacion', operador: 'IGUAL', valor: 'si' }),
  'ErrorEsquemaNotarial', 'true o false')
lanza('una palabra en un campo numérico',
  () => exigirValorDeCondicion({ campo: 'valor_en_uvt', operador: 'MAYOR', valor: 'mucho' }),
  'ErrorEsquemaNotarial', 'es numérico')
lanza('una condición sin valor',
  () => exigirValorDeCondicion({ campo: 'valor_en_uvt', operador: 'MAYOR', valor: '' }),
  'ErrorEsquemaNotarial', 'no tiene valor')
lanza('una regla cargada con el valor en minúscula no se guarda',
  () => verificarReglas([
    { ...GENERAL, clave: 'exc', orden: 10, condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'juridica' }] },
    GENERAL,
  ]),
  'ErrorEsquemaNotarial', 'Mayúsculas incluidas')
lanza('y si la simulación manda «juridica», tampoco falla en silencio',
  () => calcularRetencion([
    { ...GENERAL, clave: 'exenta', orden: 10, tipo_efecto: 'EXENCION', valor_efecto: null,
      condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'JURIDICA' }] },
    GENERAL,
  ], 100_000_000, { tipo_persona_vendedor: 'juridica' }),
  'ErrorEsquemaNotarial', 'solo admite')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ VIGENCIA: EL AÑO ES UNA ETIQUETA, NO UN RANGO ══')
// ─────────────────────────────────────────────────────────────────────────────
// RES-2026-000964-6, art. 56: rige desde el 1 de febrero de 2026.
// RES-2026-001726-6, art. 29: rige desde el 29 de enero de 2026.
// Las dos son «de 2026» y ni empiezan el mismo día ni empiezan en enero.

check('las fechas se leen como texto ISO', esFechaIso('2026-02-01'))
check('…y el 31 de febrero no existe aunque cumpla el formato', !esFechaIso('2026-02-31'))
check('…ni «1 de febrero»', !esFechaIso('1 de febrero'))
check('…ni un mes 13', !esFechaIso('2026-13-01'))
check('el orden alfabético ES el cronológico: 2026-01-15 < 2026-02-01',
  '2026-01-15' < '2026-02-01')

const NOTARIAL = RESP('uvt')
check('la norma cubre el día en que empieza a regir', cubreLaFecha(NOTARIAL, '2026-02-01'))
check('…y no el día anterior', !cubreLaFecha(NOTARIAL, '2026-01-31'))
check('…ni un acto de mediados de enero', !cubreLaFecha(NOTARIAL, '2026-01-15'))
// La anterior: Resolución 585 de 2025, derogada por el art. 56 desde el 1 de
// febrero de 2026. Es la que SÍ cubre un acto del 15 de enero de 2026.
const ANTERIOR = {
  ...NOTARIAL, norma: 'Resolución 585 de 2025',
  vigencia_desde: '2025-02-01', vigencia_hasta: '2026-01-31',
}
check('la resolución de 2025 SÍ cubre un acto del 15 de enero de 2026',
  cubreLaFecha(ANTERIOR, '2026-01-15'))
check('…y el día de su derogatoria todavía', cubreLaFecha(ANTERIOR, '2026-01-31'))
check('…y ya no el 1 de febrero, cuando entra la nueva',
  !cubreLaFecha(ANTERIOR, '2026-02-01'))
check('las dos normas no se solapan ni dejan hueco en la frontera',
  cubreLaFecha(ANTERIOR, '2026-01-31') && !cubreLaFecha(NOTARIAL, '2026-01-31') &&
  !cubreLaFecha(ANTERIOR, '2026-02-01') && cubreLaFecha(NOTARIAL, '2026-02-01'))

// EL CASO QUE PEDISTE: una escritura del 15 de enero de 2026 contra el año 2026.
let fuera = null
try {
  liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-01-15' }, { fuentes: FUENTES_OFICIALES })
} catch (e) { fuera = e }
check('un acto del 15 de enero de 2026 NO se liquida con las tarifas de 2026',
  fuera?.name === 'FueraDeVigencia', `(lanzó ${fuera?.name})`)
check('…y el aviso nombra el artículo de la vigencia (art. 56)',
  /art\. 56/.test(fuera?.message ?? ''))
check('…y dice desde cuándo rige',
  /rige desde el 2026-02-01/.test(fuera?.message ?? ''))
check('…y dice qué hacer: cargar el año que SÍ regía',
  /Carga el año tarifario que estaba vigente/.test(fuera?.message ?? ''))
check('…y trae las normas en el error, no solo en el texto',
  Array.isArray(fuera?.normas) && fuera.normas.length > 0 &&
  fuera.normas.every(n => n.vigencia_desde === '2026-02-01'))
check('…nombrándolas TODAS, no solo la primera', fuera.normas.length > 1,
  `(${fuera?.normas?.length} normas)`)

check('el 1 de febrero de 2026 sí liquida',
  liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-02-01' }, { fuentes: FUENTES_OFICIALES })
    .totales.total === 3_528_822)
check('el 31 de enero de 2026 no',
  (() => { try {
    liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-01-31' }, { fuentes: FUENTES_OFICIALES })
    return false
  } catch (e) { return e.name === 'FueraDeVigencia' } })())

// LAS DOS RESOLUCIONES NO EMPIEZAN EL MISMO DÍA: un acto del 30 de enero está
// cubierto por la registral (29 de enero) y no por la notarial (1 de febrero).
const ANIO_DOS_NORMAS = {
  ...ANIO,
  respaldos: ANIO.respaldos.map(r => r.campo === 'base_orip' || r.campo === 'base_registro'
    ? { ...r, norma: 'Resolución RES-2026-001726-6', vigencia_desde: '2026-01-29', articulo_vigencia: 'art. 29' }
    : r),
}
let mixto = null
try {
  liquidar(ANIO_DOS_NORMAS, { ...ENTRADA, fecha_acto: '2026-01-30' }, { fuentes: FUENTES_OFICIALES })
} catch (e) { mixto = e }
check('un acto del 30 de enero se detiene por la notarial, no por la registral',
  mixto?.name === 'FueraDeVigencia' &&
  mixto.normas.every(n => n.vigencia_desde === '2026-02-01'))
check('…y la registral NO aparece entre las que no cubren esa fecha',
  !mixto.normas.some(n => /001726/.test(n.norma)))

// La fecha del acto sale en la liquidación, para que el PDF la imprima.
check('sin fecha del acto se usa hoy, y se devuelve',
  liquidar(ANIO, ENTRADA, { fuentes: FUENTES_OFICIALES, fecha: new Date(2026, 9, 6) }).fecha_acto === '2026-10-06')
check('con fecha del acto, se devuelve esa',
  liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-03-15' }, { fuentes: FUENTES_OFICIALES }).fecha_acto === '2026-03-15')
lanza('una fecha del acto ilegible',
  () => liquidar(ANIO, { ...ENTRADA, fecha_acto: '15/01/2026' }, { fuentes: FUENTES_OFICIALES }),
  'ErrorEsquemaNotarial', 'la fecha del acto')
lanza('una fecha del acto que no existe',
  () => liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-02-30' }, { fuentes: FUENTES_OFICIALES }),
  'ErrorEsquemaNotarial', 'la fecha del acto')

// Un concepto OPCIONAL y apagado cuya norma empieza más tarde no estorba.
const ANIO_OPCIONAL_FUTURO = {
  ...ANIO,
  conceptos: ANIO.conceptos.map(c => c.clave !== 'firma_digital' ? c : {
    ...c, respaldos: (c.respaldos ?? []).map(r => ({ ...r, vigencia_desde: '2027-01-01' })),
  }),
}
check('una tarifa apagada cuya norma rige el año que viene no detiene la liquidación',
  liquidar(ANIO_OPCIONAL_FUTURO, ENTRADA, { fuentes: FUENTES_OFICIALES }).totales.total === 3_528_822)
check('…pero encendida, sí la detiene',
  (() => { try {
    liquidar(ANIO_OPCIONAL_FUTURO, { ...ENTRADA, opcionales: [...ENTRADA.opcionales, 'firma_digital'],
      cantidades: { ...ENTRADA.cantidades, firma_digital: 1 } }, { fuentes: FUENTES_OFICIALES })
    return false
  } catch (e) { return e.name === 'FueraDeVigencia' } })())

// AISLAR LA COMPROBACIÓN DEL AÑO: si solo el UVT queda fuera de vigencia y
// todas las tarifas están en regla, lo único que puede detener la liquidación
// es la comprobación de los respaldos DEL AÑO.
const ANIO_UVT_FUTURO = {
  ...ANIO,
  respaldos: ANIO.respaldos.map(r => r.campo === 'uvt' ? { ...r, vigencia_desde: '2026-03-01' } : r),
}
check('el año de referencia sí liquida un acto del 15 de febrero',
  liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-02-15' }, { fuentes: FUENTES_OFICIALES })
    .totales.total === 3_528_822)
let soloAnio = null
try {
  liquidar(ANIO_UVT_FUTURO, { ...ENTRADA, fecha_acto: '2026-02-15' }, { fuentes: FUENTES_OFICIALES })
} catch (e) { soloAnio = e }
check('…y con el UVT rigiendo desde marzo, se detiene',
  soloAnio?.name === 'FueraDeVigencia', `(lanzó ${soloAnio?.name})`)
check('…nombrando el UVT y solo el UVT',
  soloAnio?.normas?.length === 1 && soloAnio.normas[0].campo === 'uvt')

check('exigirVigencia con todo en regla no lanza',
  (() => { exigirVigencia([NOTARIAL], '2026-05-05'); return true })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ COPIAR UN AÑO NO COPIA LOS RESPALDOS ══')
// ─────────────────────────────────────────────────────────────────────────────
const C2027 = copiarAnio(ANIO, 2027)
check('el año copiado conserva la estructura', C2027.conceptos.length === 18)
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
