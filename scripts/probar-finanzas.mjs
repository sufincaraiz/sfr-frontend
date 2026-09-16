#!/usr/bin/env node
/**
 * PRUEBA DE LAS GUARDAS DEL MÓDULO FINANCIERO.
 *
 * Ejercita el código REAL (módulos hoja, sin alias `@/`), no una copia. Lo
 * importante aquí no es que los cálculos den bien: es que las guardas FALLEN
 * cuando tienen que fallar. Una guarda que nunca se probó rompiéndola no es
 * una guarda, es un comentario.
 */
import { exigirParametrosCompletos, calcularRetefuente, calcularIva, compararRetencion, netoIngreso, ParametroFiscalFaltante } from '../src/lib/finanzas/calculo.ts'
import { roleCanAccessAdminPath, roleHome } from '../src/lib/permissions.ts'

let ok = 0, fail = 0
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`) }
}
const lanza = (nombre, fn, tipo = ParametroFiscalFaltante) => {
  try { fn(); check(nombre, false, '(NO lanzó — la guarda no sirve)') }
  catch (e) { check(`${nombre} → lanza «${e.message.slice(0, 60)}…»`, e instanceof tipo, `(lanzó ${e.name})`) }
}

const PARAMS_2026 = {
  anio: 2026,
  uvt: 49799,          // valor de ejemplo SOLO para la prueba
  tarifa_iva: 19,
  conceptos: [
    { concepto: 'comisiones', tarifa_declarante: 11, tarifa_no_declarante: 10, base_minima_uvt: 0 },
    { concepto: 'servicios',  tarifa_declarante: 4,  tarifa_no_declarante: 6,  base_minima_uvt: 4 },
  ],
}

console.log('\n══ 1. LA GUARDA DEL AÑO: debe DETENERSE, no adivinar ══')
lanza('sin parámetros del año', () => exigirParametrosCompletos(null, 2027))
lanza('sin UVT cargado', () => exigirParametrosCompletos({ ...PARAMS_2026, uvt: null }, 2026))
lanza('sin tarifa de IVA', () => exigirParametrosCompletos({ ...PARAMS_2026, tarifa_iva: null }, 2026))
check('con parámetros completos devuelve', exigirParametrosCompletos(PARAMS_2026, 2026).anio === 2026)

// NO CAE AL AÑO ANTERIOR: la función solo recibe el año pedido; es
// estructuralmente incapaz de leer otro. Se verifica que el mensaje lo diga.
try { exigirParametrosCompletos(null, 2027) } catch (e) {
  check('el mensaje advierte que no usa el año anterior ni asume cero',
    /no se usan los del año anterior/i.test(e.message) && /asume cero/i.test(e.message))
}

console.log('\n══ 2. BASE MÍNIMA EN UVT (la regla que más se olvida) ══')
// servicios: mínimo 4 UVT = 199.196
const bajo = calcularRetefuente({ base: 150000, concepto: 'servicios', esDeclaranteRenta: true, parametros: PARAMS_2026 })
check('base bajo el mínimo → NO retiene', bajo.retuvo === false && bajo.valor.toString() === '0')
check('…y explica por qué', /no supera la base mínima/i.test(bajo.motivo ?? ''))
const alto = calcularRetefuente({ base: 1000000, concepto: 'servicios', esDeclaranteRenta: true, parametros: PARAMS_2026 })
check('base sobre el mínimo → retiene 4% = 40.000', alto.retuvo && alto.valor.toString() === '40000')

console.log('\n══ 3. DECLARANTE vs NO DECLARANTE ══')
const d = calcularRetefuente({ base: 1000000, concepto: 'comisiones', esDeclaranteRenta: true, parametros: PARAMS_2026 })
const nd = calcularRetefuente({ base: 1000000, concepto: 'comisiones', esDeclaranteRenta: false, parametros: PARAMS_2026 })
check('declarante 11% = 110.000', d.valor.toString() === '110000')
check('no declarante 10% = 100.000', nd.valor.toString() === '100000')

console.log('\n══ 4. AUTORRETENEDOR y CONCEPTO INEXISTENTE ══')
const auto = calcularRetefuente({ base: 5000000, concepto: 'comisiones', esDeclaranteRenta: true, esAutorretenedor: true, parametros: PARAMS_2026 })
check('autorretenedor → no se le retiene', auto.retuvo === false && auto.valor.toString() === '0')
lanza('concepto no configurado', () => calcularRetefuente({ base: 1000000, concepto: 'arrendamiento', esDeclaranteRenta: true, parametros: PARAMS_2026 }))

console.log('\n══ 5. IVA y DERIVADOS (nunca columnas) ══')
check('IVA 19% de 1.000.000 = 190.000', calcularIva(1000000, PARAMS_2026).toString() === '190000')
check('neto = base + IVA − retenciones',
  netoIngreso({ valor_base: 1000000, iva_generado: 190000, retefuente_practicada: 110000, reteica_practicada: 0, reteiva_practicada: 0 }).toString() === '1080000')

console.log('\n══ 6. DISCREPANCIA de retención (dinero recuperable) ══')
const igual = compararRetencion(110000, 110000)
check('practicada = sugerida → sin discrepancia', igual.hay === false && igual.calculable)
const demas = compararRetencion(150000, 110000)
check('le retuvieron de MÁS → discrepancia +40.000', demas.hay && demas.diferencia.toString() === '40000')
const sinCalc = compararRetencion(110000, null)
check('sin sugerido → no calculable (no finge que cuadra)', sinCalc.calculable === false && sinCalc.hay === false)

console.log('\n══ 7. ROL «contador»: ve finanzas, NO propiedades ni CRM ══')
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
