#!/usr/bin/env node
/**
 * PRUEBA DE LAS GUARDAS DEL MÓDULO FINANCIERO.
 *
 * Ejercita el código REAL (módulos hoja, sin alias `@/`), no una copia. Lo
 * importante no es que los cálculos den bien: es que las guardas FALLEN cuando
 * tienen que fallar. Una guarda que nunca se probó rompiéndola no es una
 * guarda, es un comentario.
 */
import {
  exigirParametrosCompletos, pendientesParaActivar, verificarActivable,
  calcularRetefuente, calcularIva, calcularReteIva, costoEgreso,
  compararRetencion, netoIngreso, ParametroFiscalFaltante,
  gastoDeResultado, egresosDeResultado, calcularIca,
} from '../src/lib/finanzas/calculo.ts'
import { roleCanAccessAdminPath, roleHome } from '../src/lib/permissions.ts'
import { CODIFICADOR_JS, PREFIJO_RESPUESTA, decodificarRespuesta } from '../src/lib/finanzas/formulario-contador.ts'
import { leerNumero } from '../src/lib/finanzas/numeros.ts'
import { erroresDeCaptura, faltantesDeCaptura, estaPorCompletar, ordenarPorUso, tramoAntiguedad, repetirEgreso } from '../src/lib/finanzas/captura.ts'
import { leerCola, encolar, vaciarCola, avisoDeCola, leerRecibos, encolarRecibo, vaciarRecibos, avisoDeRecibos } from '../src/lib/finanzas/cola-egresos.ts'
import { EMPRESA_BASE, empresa, MARCA_PENDIENTE, digitoVerificacion, encabezadoReporte, exigirNitValido, faltantesEmpresa } from '../src/lib/finanzas/empresa.ts'

let ok = 0, fail = 0
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`) }
}
const lanza = (nombre, fn) => {
  try { fn(); check(nombre, false, '(NO lanzó — la guarda no sirve)') }
  catch (e) { check(`${nombre} → lanza`, e instanceof ParametroFiscalFaltante, `(lanzó ${e.name})`) }
}

/** Año completo y activo: no responsable de IVA (el caso real de Su Finca Raíz). */
const ACTIVO_NO_IVA = {
  anio: 2026, estado: 'ACTIVO', responsable_iva: false,
  uvt: 49799, tarifa_iva: 19, tarifa_reteiva: 15,   // tarifa cargada A PROPÓSITO
  conceptos: [
    { concepto: 'comisiones', tarifa_declarante: 11, tarifa_no_declarante: 10, base_minima_uvt: 0 },
    { concepto: 'servicios',  tarifa_declarante: 4,  tarifa_no_declarante: 6,  base_minima_uvt: 4 },
  ],
}
const ACTIVO_CON_IVA = { ...ACTIVO_NO_IVA, responsable_iva: true }
const SIN_DECIDIR    = { ...ACTIVO_NO_IVA, responsable_iva: null }

console.log('\n══ 1. GUARDA DEL AÑO: se detiene, no adivina ══')
lanza('sin parámetros del año', () => exigirParametrosCompletos(null, 2027))
lanza('año en BORRADOR', () => exigirParametrosCompletos({ ...ACTIVO_NO_IVA, estado: 'BORRADOR' }, 2026))
lanza('sin UVT', () => exigirParametrosCompletos({ ...ACTIVO_NO_IVA, uvt: null }, 2026))
lanza('sin decidir responsable_iva', () => exigirParametrosCompletos(SIN_DECIDIR, 2026))
lanza('responsable de IVA pero sin tarifa', () => exigirParametrosCompletos({ ...ACTIVO_CON_IVA, tarifa_iva: null }, 2026))
lanza('sin ningún concepto de retención', () => exigirParametrosCompletos({ ...ACTIVO_NO_IVA, conceptos: [] }, 2026))
check('año completo y ACTIVO pasa', exigirParametrosCompletos(ACTIVO_NO_IVA, 2026).anio === 2026)
try { exigirParametrosCompletos(null, 2027) } catch (e) {
  check('el mensaje advierte que no usa el año anterior ni asume cero',
    /no se usan los del año anterior/i.test(e.message) && /asume cero/i.test(e.message))
}
check('un año NO responsable no necesita tarifa de IVA para calcular',
  exigirParametrosCompletos({ ...ACTIVO_NO_IVA, tarifa_iva: null }, 2026).anio === 2026)

console.log('\n══ 2. IVA: la bandera manda sobre la tarifa ══')
check('NO responsable → 0 AUNQUE haya tarifa_iva cargada (19%)',
  calcularIva(1000000, ACTIVO_NO_IVA).toString() === '0')
lanza('responsable_iva SIN DECIDIR → no asume que no', () => calcularIva(1000000, SIN_DECIDIR))
check('responsable → 19% = 190.000', calcularIva(1000000, ACTIVO_CON_IVA).toString() === '190000')
lanza('responsable pero sin tarifa cargada', () => calcularIva(1000000, { ...ACTIVO_CON_IVA, tarifa_iva: null }))

console.log('\n══ 3. reteIVA bajo la MISMA bandera ══')
check('NO responsable → reteIVA 0', calcularReteIva(190000, ACTIVO_NO_IVA).toString() === '0')
check('responsable → reteIVA 15% de 190.000 = 28.500', calcularReteIva(190000, ACTIVO_CON_IVA).toString() === '28500')
lanza('reteIVA sin decidir la bandera', () => calcularReteIva(190000, SIN_DECIDIR))

console.log('\n══ 4. IVA PAGADO ES COSTO cuando no somos responsables ══')
const eg = { valor_base: 100000, iva_pagado: 19000 }
check('NO responsable → costo = 119.000 (el IVA es costo)', costoEgreso(eg, false).toString() === '119000')
check('responsable → costo = 100.000 (el IVA es crédito)', costoEgreso(eg, true).toString() === '100000')
lanza('costo sin decidir la bandera', () => costoEgreso(eg, null))

console.log('\n══ 5. BASE MÍNIMA EN UVT (la regla que más se olvida) ══')
const bajo = calcularRetefuente({ base: 150000, concepto: 'servicios', esDeclaranteRenta: true, parametros: ACTIVO_NO_IVA })
check('base bajo el mínimo → NO retiene', bajo.retuvo === false && bajo.valor.toString() === '0')
check('…y explica por qué', /no supera la base mínima/i.test(bajo.motivo ?? ''))
const alto = calcularRetefuente({ base: 1000000, concepto: 'servicios', esDeclaranteRenta: true, parametros: ACTIVO_NO_IVA })
check('base sobre el mínimo → retiene 4% = 40.000', alto.retuvo && alto.valor.toString() === '40000')
check('declarante 11%', calcularRetefuente({ base: 1000000, concepto: 'comisiones', esDeclaranteRenta: true, parametros: ACTIVO_NO_IVA }).valor.toString() === '110000')
check('no declarante 10%', calcularRetefuente({ base: 1000000, concepto: 'comisiones', esDeclaranteRenta: false, parametros: ACTIVO_NO_IVA }).valor.toString() === '100000')
const auto = calcularRetefuente({ base: 5000000, concepto: 'comisiones', esDeclaranteRenta: true, esAutorretenedor: true, parametros: ACTIVO_NO_IVA })
check('autorretenedor → no se le retiene', auto.retuvo === false && auto.valor.toString() === '0')
lanza('concepto no configurado', () => calcularRetefuente({ base: 1000000, concepto: 'arrendamiento', esDeclaranteRenta: true, parametros: ACTIVO_NO_IVA }))

console.log('\n══ 6. PENDIENTES PARA ACTIVAR (única fuente) ══')
check('año completo → sin pendientes', pendientesParaActivar(ACTIVO_NO_IVA).length === 0)
const borradorVacio = { anio: 2027, estado: 'BORRADOR', responsable_iva: null, uvt: null, tarifa_iva: null, conceptos: [] }
const pend = pendientesParaActivar(borradorVacio)
check('borrador vacío → 3 pendientes (UVT, decisión de IVA, conceptos)', pend.length === 3, `(dio ${pend.length}: ${pend.join(' | ')})`)
check('responsable de IVA sin tarifa → la pide', pendientesParaActivar({ ...ACTIVO_CON_IVA, tarifa_iva: null }).some(x => /tarifa de IVA/i.test(x)))
check('NO responsable sin tarifa → NO la pide', !pendientesParaActivar({ ...ACTIVO_NO_IVA, tarifa_iva: null }).some(x => /tarifa de IVA/i.test(x)))
const r1 = verificarActivable(borradorVacio)
check('verificarActivable marca no-listo y devuelve la MISMA lista', r1.listo === false && r1.pendientes.length === pend.length)
const r2 = verificarActivable(ACTIVO_NO_IVA)
check('verificarActivable devuelve el parámetro marcado cuando está listo', r2.listo === true && r2.parametro.anio === 2026)

console.log('\n══ 6b. COPIA DEL AÑO ANTERIOR: sin revisar BLOQUEA ══')
// Si lo copiado pudiera activarse sin revisar, «copiar del año anterior» sería
// una puerta trasera a la guarda que prohíbe usar el año anterior.
const copiado = {
  ...ACTIVO_NO_IVA,
  conceptos: ACTIVO_NO_IVA.conceptos.map(c => ({ ...c, revisado: false, origen: 'copia', copiado_de_anio: 2025 })),
}
const pCopia = pendientesParaActivar(copiado)
check('conceptos copiados sin revisar → pendiente que nombra el origen', pCopia.some(x => /Revisar 2 conceptos.*copiado de 2025/.test(x)), `(${pCopia.join(' | ')})`)
lanza('la guarda de CÁLCULO también rechaza lo copiado sin revisar', () => exigirParametrosCompletos(copiado, 2026))
check('verificarActivable NO lo marca listo', verificarActivable(copiado).listo === false)
const confirmado = { ...copiado, conceptos: copiado.conceptos.map(c => ({ ...c, revisado: true })) }
check('al confirmar los conceptos deja de bloquear', pendientesParaActivar(confirmado).length === 0)
const icaCopiada = { ...ACTIVO_NO_IVA, tarifasIca: [{ municipio: 'La Vega', tarifa_por_mil: 7, revisado: false, origen: 'copia', copiado_de_anio: 2025 }] }
check('ICA copiada sin revisar → bloquea aunque el ICA no sea obligatorio', pendientesParaActivar(icaCopiada).some(x => /tarifa de ICA.*La Vega/.test(x)))
const ivaCopiadaNoResp = { ...ACTIVO_NO_IVA, procedencia: { tarifa_iva: { por: 'x', en: '2026-01-01', origen: 'copia', copiadoDe: 2025, revisado: false } } }
check('tarifa de IVA copiada sin revisar NO bloquea si el año no es responsable (no se usa)', pendientesParaActivar(ivaCopiadaNoResp).length === 0)
const ivaCopiadaResp = { ...ACTIVO_CON_IVA, procedencia: ivaCopiadaNoResp.procedencia }
check('…pero SÍ bloquea si el año es responsable', pendientesParaActivar(ivaCopiadaResp).some(x => /Revisar la tarifa de IVA/.test(x)))
const decisionImportada = { ...ACTIVO_NO_IVA, procedencia: { responsable_iva: { por: 'Contador', en: '2026-01-01', origen: 'contador', revisado: false } } }
check('decisión de IVA importada del contador → hay que confirmarla', pendientesParaActivar(decisionImportada).some(x => /Confirmar la decisión sobre IVA.*contador/.test(x)))

console.log('\n══ 7. DERIVADOS y DISCREPANCIA ══')
check('neto ingreso = base + IVA − retenciones',
  netoIngreso({ valor_base: 1000000, iva_generado: 0, retefuente_practicada: 110000, reteica_practicada: 0, reteiva_practicada: 0 }).toString() === '890000')
check('practicada = sugerida → sin discrepancia', compararRetencion(110000, 110000).hay === false)
const demas = compararRetencion(150000, 110000)
check('le retuvieron de MÁS → +40.000', demas.hay && demas.diferencia.toString() === '40000')
check('sin sugerido → no calculable (no finge que cuadra)', compararRetencion(110000, null).calculable === false)

console.log('\n══ 7b. FORMULARIO DEL CONTADOR: ida y vuelta del código ══')
// El codificador es el MISMO texto que incrusta la página del formulario.
const codificar = new Function(`${CODIFICADOR_JS}; return codificarRespuesta`)()
const muestra = {
  v: 1, anio: 2027, por: 'Contadora Pérez', fecha: '2026-12-10', uvt: '52.000',
  responsable_iva: 'no', tarifa_iva: '', agente_reteiva: '', tarifa_reteiva: '',
  conceptos: [{ label: 'Comisiones', declarante: '11', no_declarante: '10', base_uvt: '0' }],
  ica: [{ municipio: 'La Vega', ciiu: '', tarifa: '7' }, { municipio: 'La Vega', ciiu: '5911', tarifa: '4,14' }],
  servicios: [{ linea: 'Fotografía con dron y fotogrametría', ciiu: '5911' }],
}
const codigo = codificar(muestra)
check('el código empieza por el prefijo', codigo.startsWith(PREFIJO_RESPUESTA))
const mensajeWhatsApp = `Parámetros fiscales 2027 — Su Finca Raíz\nUVT: 52.000\nCódigo para el sistema:\n${codigo}\n`
const leido = decodificarRespuesta(mensajeWhatsApp)
check('se decodifica aunque venga dentro del mensaje de WhatsApp', leido.anio === 2027 && leido.uvt === '52.000')
check('conserva tildes y ñ (UTF-8)', leido.por === 'Contadora Pérez')
check('conserva las tablas', leido.conceptos[0].label === 'Comisiones' && leido.ica[0].municipio === 'La Vega')
const lanzaFormato = (nombre, fn) => {
  try { fn(); check(nombre, false, '(NO lanzó)') } catch (e) { check(`${nombre} → lanza «${e.message.slice(0, 50)}…»`, e.name === 'ErrorFormatoRespuesta') }
}
lanzaFormato('texto sin código', () => decodificarRespuesta('hola, te mando los datos'))
lanzaFormato('código cortado al copiar', () => decodificarRespuesta(codigo.slice(0, 40)))
lanzaFormato('versión desconocida', () => decodificarRespuesta(codificar({ ...muestra, v: 2 })))
check('la tarifa de ICA viaja con su CIIU', leido.ica[1].ciiu === '5911' && leido.ica[1].tarifa === '4,14')
check('el CIIU en blanco sobrevive como «general del municipio»', leido.ica[0].ciiu === '')
check('el CIIU por línea de servicio llega', leido.servicios[0].ciiu === '5911')
// Un formulario ENVIADO ANTES del cambio no trae `servicios` ni `ciiu`: debe
// seguir leyéndose, no reventar. Es el caso real de un contador que responda tarde.
const viejo = codificar({ ...muestra, ica: [{ municipio: 'La Vega', tarifa: '7' }], servicios: undefined })
const leidoViejo = decodificarRespuesta(viejo)
check('un código anterior al CIIU se sigue leyendo', leidoViejo.ica[0].ciiu === '' && leidoViejo.servicios.length === 0)

console.log('\n══ 7c. NÚMEROS A LA COLOMBIANA (el error de 3.708 vs 3708) ══')
check('UVT «52.374» se lee como 52374, NO 52,374', leerNumero('52.374', 'pesos', 'UVT') === '52374')
check('UVT «49.799» → 49799', leerNumero('49.799', 'pesos', 'UVT') === '49799')
check('pesos «1.234.567,50» → 1234567.50', leerNumero('1.234.567,50', 'pesos', 'x') === '1234567.50')
check('pesos «52374» → 52374', leerNumero('52374', 'pesos', 'x') === '52374')
check('pesos «$ 52.374» → 52374', leerNumero('$ 52.374', 'pesos', 'x') === '52374')
check('tasa «9,66» → 9.66', leerNumero('9,66', 'tasa', 'ICA') === '9.66')
check('tasa «9.66» → 9.66 (en tasa el punto es decimal)', leerNumero('9.66', 'tasa', 'ICA') === '9.66')
check('tasa «11 %» → 11', leerNumero('11 %', 'tasa', 'x') === '11')
check('vacío → null', leerNumero('  ', 'tasa', 'x') === null)
try { leerNumero('once', 'tasa', 'Comisiones'); check('texto no numérico lanza', false) } catch (e) { check('texto no numérico lanza', e.name === 'ErrorNumero') }

// Cómo escribe de verdad un contador colombiano el UVT en un campo libre.
for (const [entrada, esperado] of [
  ['52.374 UVT', '52374'], ['$52.374', '52374'], ['52374,00', '52374.00'], ['52.374,00', '52374.00'],
  ['$52.374,00', '52374.00'], ['COP 52.374', '52374'], ['$52.374 COP', '52374'], ['52.374 pesos', '52374'],
  ['$52.374 M/CTE', '52374'], ['52.374.-', '52374'], ['1 UVT = $52.374', '52374'], ['52 374', '52374'],
]) check(`UVT «${entrada}» → ${esperado}`, leerNumero(entrada, 'pesos', 'UVT') === esperado)
for (const [entrada, esperado] of [['9,66 por mil', '9.66'], ['11,04 x mil', '11.04'], ['3,5 %', '3.5'], ['4 por ciento', '4']])
  check(`tasa «${entrada}» → ${esperado}`, leerNumero(entrada, 'tasa', 't') === esperado)
// Lo que NO debe convertirse en un número equivocado: falla con el nombre del campo.
for (const entrada of ['52 mil', '$52 mil', 'cincuenta y dos mil', '52.374 aprox'])
  try { leerNumero(entrada, 'pesos', 'UVT'); check(`«${entrada}» lanza (no adivina)`, false) } catch (e) { check(`«${entrada}» lanza (no adivina)`, e.name === 'ErrorNumero' && e.message.startsWith('UVT:')) }
// «52,374» (estilo EE. UU.) se lee 52.374: la regla UVT ≥ 1000 de guardarBorrador lo rechaza.
check('«52,374» se lee 52.374 → lo frena el mínimo de 1000 del UVT', leerNumero('52,374', 'pesos', 'UVT') === '52.374')

console.log('\n══ 7d. ENCABEZADO DE REPORTES: NIT pendiente a la vista ══')
{
  const h = encabezadoReporte('2026-01 a 2026-06', new Date('2026-09-17T15:00:00Z'), { ...EMPRESA_BASE, nit: null, dv: null })
  const nit = h.lineas.find(l => l.etiqueta === 'NIT')
  check('sin NIT: la línea NIT existe (no se omite)', !!nit)
  check('sin NIT: dice PENDIENTE, no vacío', nit?.valor === MARCA_PENDIENTE && nit?.pendiente === true)
  check('sin NIT: no es válido para declarar', h.validoParaDeclarar === false)
  check('sin NIT: el aviso lo dice dentro del propio reporte', /NO VÁLIDO PARA DECLARAR/.test(h.aviso ?? '') && /NIT/.test(h.aviso ?? ''))
  check('matrícula 199483 siempre presente', h.lineas.some(l => l.valor === '199483'))
}
check('DV DIAN: 800197268 → 4', digitoVerificacion('800197268') === '4')
{
  const malo = encabezadoReporte('p', new Date(), { ...EMPRESA_BASE, razonSocial: 'X S.A.S.', nit: '800197268', dv: '5' })
  check('NIT con DV errado: no válido y dice cuál debería ser', !malo.validoParaDeclarar && /debería ser 4/.test(malo.aviso ?? ''))
  const bien = encabezadoReporte('p', new Date(), { ...EMPRESA_BASE, razonSocial: 'X S.A.S.', nit: '800197268', dv: '4' })
  check('NIT completo y correcto: válido, sin aviso, «800.197.268-4»',
    bien.validoParaDeclarar && bien.aviso === null && bien.lineas.find(l => l.etiqueta === 'NIT')?.valor === '800.197.268-4')
}
const rechaza = (nombre, e) => { try { exigirNitValido({ ...EMPRESA_BASE, ...e }); check(nombre, false, '(NO lanzó: se guardaría)') } catch (x) { check(nombre, /EMPRESA:/.test(x.message)) } }
rechaza('NIT con DV errado → se RECHAZA (no solo avisa)', { nit: '800197268', dv: '5' })
rechaza('NIT sin DV → se rechaza', { nit: '800197268', dv: null })
rechaza('DV sin NIT → se rechaza', { nit: null, dv: '4' })
rechaza('NIT con puntos o guion → se rechaza', { nit: '800.197.268', dv: '4' })
check('NIT correcto → se acepta', (() => { exigirNitValido({ ...EMPRESA_BASE, nit: '800197268', dv: '4' }); return true })())
check('NIT pendiente (ambos null) → se tolera', (() => { exigirNitValido({ ...EMPRESA_BASE, nit: null, dv: null }); return true })())
check('empresa() lee EMPRESA_NIT del entorno', (() => { process.env.EMPRESA_NIT = '800197268'; process.env.EMPRESA_NIT_DV = '4'; process.env.EMPRESA_RAZON_SOCIAL = 'NOMBRE DEL RUT'; const e = empresa(); delete process.env.EMPRESA_NIT; delete process.env.EMPRESA_NIT_DV; delete process.env.EMPRESA_RAZON_SOCIAL; return e.nit === '800197268' && e.dv === '4' && e.razonSocial === 'NOMBRE DEL RUT' })())
check('sin variables de entorno → pendiente, no inventa NIT', (() => { const e = empresa(); return e.nit === null && e.dv === null && e.razonSocial === null && faltantesEmpresa(e).length === 2 })())
check('variable vacía cuenta como ausente', (() => { process.env.EMPRESA_NIT = '   '; const e = empresa(); delete process.env.EMPRESA_NIT; return e.nit === null })())
check('con las tres variables bien: 0 pendientes y el aviso del hub desaparece', (() => {
  process.env.EMPRESA_NIT = '800197268'; process.env.EMPRESA_NIT_DV = '4'; process.env.EMPRESA_RAZON_SOCIAL = 'NOMBRE DEL RUT'
  const f = faltantesEmpresa(); const h = encabezadoReporte('2026', new Date())
  delete process.env.EMPRESA_NIT; delete process.env.EMPRESA_NIT_DV; delete process.env.EMPRESA_RAZON_SOCIAL
  return f.length === 0 && h.validoParaDeclarar && h.aviso === null
})())
check('DV errado en el entorno: exigirNitValido lo rechaza (es lo que rompe el build)', (() => {
  process.env.EMPRESA_NIT = '800197268'; process.env.EMPRESA_NIT_DV = '5'
  let lanzo = false
  try { exigirNitValido(empresa()) } catch { lanzo = true }
  delete process.env.EMPRESA_NIT; delete process.env.EMPRESA_NIT_DV
  return lanzo
})())

console.log('\n══ 9. NATURALEZA DEL EGRESO: el reembolsable NO es gasto ══')
const gastoNegocio = { id: 'e1', naturaleza: 'DEL_NEGOCIO', valor_base: 100000, iva_pagado: 19000 }
const gastoOperacion = { ...gastoNegocio, id: 'e2', naturaleza: 'DE_OPERACION' }
const reembolsable = { ...gastoNegocio, id: 'e3', naturaleza: 'REEMBOLSABLE', estado_reembolso: 'PENDIENTE' }
check('DEL_NEGOCIO suma (IVA es costo si no somos responsables)', gastoDeResultado(gastoNegocio, false).toString() === '119000')
check('DE_OPERACION suma', gastoDeResultado(gastoOperacion, false).toString() === '119000')
try { gastoDeResultado(reembolsable, false); check('REEMBOLSABLE en el estado de resultados → lanza', false, '(NO lanzó: se contaría como gasto)') }
catch (e) { check('REEMBOLSABLE en el estado de resultados → lanza', e.name === 'ErrorNaturalezaEgreso' && /por cobrar/i.test(e.message)) }
check('el mensaje dice cómo salir del paso (reclasificar)', (() => { try { gastoDeResultado(reembolsable, false) } catch (e) { return /reclasif/i.test(e.message) } })())
const reclasificado = { ...reembolsable, naturaleza: 'DE_OPERACION', reclasificado_de: 'REEMBOLSABLE', estado_reembolso: 'ASUMIDO' }
check('reclasificado a DE_OPERACION sí suma', gastoDeResultado(reclasificado, false).toString() === '119000')
const lote = [gastoNegocio, reembolsable, gastoOperacion]
check('egresosDeResultado filtra el reembolsable', egresosDeResultado(lote).length === 2)
check('…y lo filtrado ya no lanza', egresosDeResultado(lote).every(e => gastoDeResultado(e, false).gt(0)))
check('un reembolsable NO cambia el total de gastos del mes',
  egresosDeResultado(lote).reduce((s, e) => s.plus(gastoDeResultado(e, false)), gastoDeResultado(gastoNegocio, false).sub(gastoDeResultado(gastoNegocio, false))).toString() === '238000')

console.log('\n══ 9b. CIIU: «en blanco» significa lo CONTRARIO en tarifa y en ingreso ══')
const CON_ICA = {
  ...ACTIVO_NO_IVA,
  tarifasIca: [
    { municipio: 'La Vega', ciiu: '', tarifa_por_mil: 7 },
    { municipio: 'La Vega', ciiu: '5911', tarifa_por_mil: 4.14 },
  ],
}
check('CIIU exacto usa su tarifa (5911 → 4,14‰ de 1.000.000 = 4.140)',
  calcularIca(1000000, { municipio: 'La Vega', ciiu: '5911' }, CON_ICA).toString() === '4140')
check('CIIU sin tarifa propia cae a la general del municipio (7‰ = 7.000)',
  calcularIca(1000000, { municipio: 'La Vega', ciiu: '6820' }, CON_ICA).toString() === '7000')
for (const [nombre, ing] of [
  ['ingreso con CIIU vacío', { municipio: 'La Vega', ciiu: '' }],
  ['ingreso con CIIU null', { municipio: 'La Vega', ciiu: null }],
  ['ingreso sin municipio', { municipio: null, ciiu: '6820' }],
]) lanza(`${nombre} → no calculable, se detiene`, () => calcularIca(1000000, ing, CON_ICA))
check('el mensaje niega explícitamente la lectura «todas las actividades»', (() => {
  try { calcularIca(1000000, { municipio: 'La Vega', ciiu: '' }, CON_ICA) }
  catch (e) { return /NO es «todas las actividades»/.test(e.message) }
})())
lanza('municipio sin ninguna tarifa cargada → se detiene, no asume cero',
  () => calcularIca(1000000, { municipio: 'Sasaima', ciiu: '6820' }, CON_ICA))

console.log('\n══ 10. CAPTURA RÁPIDA: lo mínimo guarda, lo demás queda por completar ══')
const minimo = { valor: '45000', categoria_id: 'cat-1', naturaleza: 'DEL_NEGOCIO' }
check('valor + categoría + naturaleza basta para guardar', erroresDeCaptura(minimo).length === 0)
check('…pero queda POR COMPLETAR', estaPorCompletar(minimo) === true)
check('y dice qué falta', faltantesDeCaptura(minimo).join(',') === 'proveedor,descripción,foto del recibo,número de factura')
check('sin valor no guarda', erroresDeCaptura({ ...minimo, valor: '' }).some(x => /valor/i.test(x)))
check('sin categoría no guarda', erroresDeCaptura({ ...minimo, categoria_id: '' }).some(x => /categoría/i.test(x)))
check('DE_OPERACION sin propiedad no guarda', erroresDeCaptura({ ...minimo, naturaleza: 'DE_OPERACION' }).some(x => /propiedad/i.test(x)))
check('REEMBOLSABLE sin cliente no guarda (no habría a quién cobrar)',
  erroresDeCaptura({ ...minimo, naturaleza: 'REEMBOLSABLE' }).some(x => /cliente/i.test(x)))
check('REEMBOLSABLE con cliente sí guarda',
  erroresDeCaptura({ ...minimo, naturaleza: 'REEMBOLSABLE', reembolsa_tercero_id: 't1' }).length === 0)
check('un gasto normal con cliente que reembolsa es incoherente y se rechaza',
  erroresDeCaptura({ ...minimo, reembolsa_tercero_id: 't1' }).length === 1)
const completo = { ...minimo, tercero_id: 't9', descripcion: 'Almuerzo', soporte_public_id: 'finanzas/recibos/x', numero_factura_proveedor: 'F-1' }
check('con todo, deja de estar por completar', estaPorCompletar(completo) === false)
// El orden de los botones se CALCULA por uso: una lista fija envejece.
const cats = [
  { id: 'a', nombre: 'Atención a clientes', orden: 10 },
  { id: 'b', nombre: 'Transporte a visitas', orden: 20 },
  { id: 'c', nombre: 'Viáticos', orden: 70 },
]
check('la más usada de los últimos 90 días sube al primer botón',
  ordenarPorUso(cats, { c: 9, a: 2 }).map(c => c.id).join('') === 'cab')
check('sin uso, manda el orden inicial', ordenarPorUso(cats, {}).map(c => c.id).join('') === 'abc')
const hoy = new Date('2026-09-21T12:00:00Z')
check('antigüedad 0-30', tramoAntiguedad(new Date('2026-09-10T12:00:00Z'), hoy) === '0-30')
check('antigüedad 31-60', tramoAntiguedad(new Date('2026-08-10T12:00:00Z'), hoy) === '31-60')
check('antigüedad +60', tramoAntiguedad(new Date('2026-06-10T12:00:00Z'), hoy) === '+60')

// REPETIR EL ÚLTIMO: copia lo repetitivo, NUNCA el comprobante. Dos gastos con
// el mismo recibo son un soporte duplicado ante la DIAN.
const ultimoConFoto = {
  valor: '60000', categoria_id: 'cat-gasolina', categoria: 'Transporte a visitas', naturaleza: 'DE_OPERACION',
  destino: { id: 'prop-1', etiqueta: 'Finca La Esperanza', detalle: 'La Vega' },
  foto: 'data:image/jpeg;base64,AAAA', soporte_public_id: 'finanzas/recibos/abc123',
}
const repetido = repetirEgreso(ultimoConFoto)
check('repetir copia valor, categoría y naturaleza',
  repetido.valor === '60000' && repetido.categoria_id === 'cat-gasolina' && repetido.naturaleza === 'DE_OPERACION')
check('repetir conserva la propiedad', repetido.destino?.id === 'prop-1')
check('repetir NO hereda la foto', repetido.foto === null)
check('repetir NO hereda el public_id del recibo', repetido.soporte_public_id === null)
check('el repetido queda POR COMPLETAR (le falta su propio recibo)',
  estaPorCompletar({ valor: repetido.valor, categoria_id: repetido.categoria_id, naturaleza: repetido.naturaleza }) === true)
check('y «foto del recibo» aparece entre lo que falta',
  faltantesDeCaptura({ valor: repetido.valor, categoria_id: repetido.categoria_id, naturaleza: repetido.naturaleza }).includes('foto del recibo'))

console.log('\n══ 10b. COLA SIN SEÑAL: nada se pierde, y el aviso no se puede ignorar ══')
const memoria = new Map()
const almacen = { leer: k => memoria.get(k) ?? null, escribir: (k, v) => memoria.set(k, v) }
check('cola vacía al empezar', leerCola(almacen).length === 0)
check('sin nada en cola no hay aviso', avisoDeCola([]) === null)
encolar(almacen, { ...minimo }, 'data:image/jpeg;base64,AAAA')
encolar(almacen, { ...minimo, valor: '60000' }, null)
check('dos gastos encolados', leerCola(almacen).length === 2)
check('la foto viaja dentro de la cola', leerCola(almacen)[0].foto?.startsWith('data:image') === true)
const aviso = avisoDeCola(leerCola(almacen))
check('el aviso dice cuántos son', /2 gastos/.test(aviso))
check('…y advierte del riesgo real: cerrar la pestaña', /cierras esta pestaña/i.test(aviso))
// Sube uno y el otro falla: el que falla SE QUEDA, con el motivo.
let nEnviados = 0
const r10 = await vaciarCola(almacen, async p => {
  nEnviados++
  return p.cuerpo.valor === '60000' ? { ok: true } : { ok: false, error: 'sin conexión' }
})
check('se intentaron los dos', nEnviados === 2)
check('subió 1 y falló 1', r10.subidos === 1 && r10.fallidos === 1)
check('el que falló SIGUE en la cola (no se pierde)', leerCola(almacen).length === 1)
check('…con el motivo y el intento contados', leerCola(almacen)[0].ultimo_error === 'sin conexión' && leerCola(almacen)[0].intentos === 1)
const r10b = await vaciarCola(almacen, async () => ({ ok: true }))
check('al volver la señal, la cola queda vacía', r10b.subidos === 1 && leerCola(almacen).length === 0)
check('y el aviso desaparece', avisoDeCola(leerCola(almacen)) === null)
// Si el navegador bloquea el almacenamiento (modo privado), no se rompe nada.
check('almacén ilegible → cola vacía, sin excepción',
  leerCola({ leer: () => '{no es json', escribir: () => {} }).length === 0)

console.log('\n══ 10c. LA FOTO QUE NO SUBIÓ: ruidosa y guardada ══')
// El gasto SÍ se guardó y su foto NO: el caso que antes pasaba en silencio y
// dejaba el gasto sin soporte creyendo uno que lo tenía.
const mem2 = new Map()
const alm2 = { leer: k => mem2.get(k) ?? null, escribir: (k, v) => mem2.set(k, v) }
check('sin recibos pendientes no hay aviso', avisoDeRecibos(leerRecibos(alm2)) === null)
encolarRecibo(alm2, 'egreso-1', 'data:image/jpeg;base64,AAAA', '$20.000 · Transporte a visitas', 'Cloudinary respondió 503')
const av = avisoDeRecibos(leerRecibos(alm2))
check('el aviso dice que el GASTO se guardó y la FOTO no', /se guardó/.test(av) && /NO se subió/.test(av))
check('…nombra el gasto concreto', /20\.000/.test(av) && /Transporte a visitas/.test(av))
check('…y dice que la foto sigue en el teléfono', /sigue en este teléfono/i.test(av))
check('la foto NO se descarta: queda en la cola', leerRecibos(alm2)[0].foto.startsWith('data:image'))
check('guarda el id del gasto para adjuntarla después', leerRecibos(alm2)[0].egreso_id === 'egreso-1')
check('guarda el motivo del fallo', leerRecibos(alm2)[0].ultimo_error === 'Cloudinary respondió 503')
const rr1 = await vaciarRecibos(alm2, async () => ({ ok: false, error: 'sigue fallando' }))
check('si el reintento falla, el recibo SIGUE en la cola', rr1.fallidos === 1 && leerRecibos(alm2).length === 1)
check('…y suma intentos', leerRecibos(alm2)[0].intentos === 2)
const rr2 = await vaciarRecibos(alm2, async () => ({ ok: true }))
check('cuando sube, sale de la cola y el aviso desaparece',
  rr2.subidos === 1 && leerRecibos(alm2).length === 0 && avisoDeRecibos(leerRecibos(alm2)) === null)
encolarRecibo(alm2, 'e2', 'data:image/jpeg;base64,BBBB', '$5.000 · Viáticos')
encolarRecibo(alm2, 'e3', 'data:image/jpeg;base64,CCCC', '$7.000 · Peajes')
check('con dos, el aviso habla en plural', /2 gastos se guardaron sin su foto/.test(avisoDeRecibos(leerRecibos(alm2))))
check('las dos colas son independientes (gastos sin señal vs recibos)',
  leerCola(alm2).length === 0 && leerRecibos(alm2).length === 2)

console.log('\n══ 8. ROL «contador» ══')
check('contador → /admin/finanzas', roleCanAccessAdminPath('contador', '/admin/finanzas'))
check('contador → /admin/finanzas/egresos (por prefijo)', roleCanAccessAdminPath('contador', '/admin/finanzas/egresos'))
check('contador NO → /admin/finanzas/parametros', !roleCanAccessAdminPath('contador', '/admin/finanzas/parametros'))
check('contador NO → /admin/propiedades', !roleCanAccessAdminPath('contador', '/admin/propiedades'))
check('contador NO → /admin/crm', !roleCanAccessAdminPath('contador', '/admin/crm'))
check('contador NO → ruta no listada (deny-by-default)', !roleCanAccessAdminPath('contador', '/admin/usuarios'))
check('admin SÍ → /admin/finanzas/parametros', roleCanAccessAdminPath('admin', '/admin/finanzas/parametros'))
check('home del contador es /admin/finanzas', roleHome('contador') === '/admin/finanzas')

console.log(`\n${'='.repeat(60)}`)
console.log(`${ok} ok · ${fail} fallos`)
process.exit(fail ? 1 : 0)
