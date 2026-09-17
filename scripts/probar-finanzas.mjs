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
} from '../src/lib/finanzas/calculo.ts'
import { roleCanAccessAdminPath, roleHome } from '../src/lib/permissions.ts'
import { CODIFICADOR_JS, PREFIJO_RESPUESTA, decodificarRespuesta } from '../src/lib/finanzas/formulario-contador.ts'
import { leerNumero } from '../src/lib/finanzas/numeros.ts'

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
  ica: [{ municipio: 'La Vega', tarifa: '7' }],
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
