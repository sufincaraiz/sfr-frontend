#!/usr/bin/env node
/**
 * PRUEBA DEL PANEL CONTRA LA BASE REAL.
 *
 * Siembra el año 9999, ejercita las escrituras del panel rompiéndolas, y lo
 * borra todo al terminar. Lo que comprueba el arnés en memoria es el cálculo;
 * esto comprueba lo que solo se ve con la base delante: que la clave ajena
 * derivada aguante el orden de inserción, que un año ACTIVO no se edite, y que
 * un respaldo rechazado NO quede guardado a medias.
 *
 *   node scripts/probar-panel-notarial.mjs
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { sembrarAnio, borrarAnio, anioParaPantalla, guardarCampoAnio, guardarConcepto, guardarTramos, activarAnio, volverABorrador, guardarRespaldo } from '../src/lib/notariales/panel.ts'
import { leerAnio } from '../src/lib/notariales/datos.ts'
import { leerBloqueCotejo } from '../src/lib/notariales/cotejo.ts'

const ok = (t, c, x = '') => console.log(`  ${c ? '✓' : '✗'} ${t}${c ? '' : ' ' + x}`)
const lanza = async (t, fn, trozo = '') => {
  try { await fn(); console.log(`  ✗ ${t} (NO lanzó)`) }
  catch (e) { ok(`${t} → lanza`, !trozo || e.message.includes(trozo), `(${e.message})`) }
}
const prisma = new PrismaClient()
const ANIO = 2099
const BLOQUE = leerBloqueCotejo(readFileSync('PARAMETROS-NOTARIALES-VERIFICADOS.md', 'utf8'))

try {
  await prisma.anioNotarial.deleteMany({ where: { anio: ANIO } })

  console.log('\n── Sembrar ──')
  await sembrarAnio(prisma, ANIO, 'prueba')
  const a = await leerAnio(prisma, ANIO)
  ok('nacen los 19 conceptos', a.conceptos.length === 19, `(${a.conceptos.length})`)
  ok('en BORRADOR', a.estado === 'BORRADOR')
  ok('versión 1', a.version === 1)
  ok('sin UVT ni UVB ni IVA', !a.uvt && !a.uvb && !a.tarifa_iva)
  ok('sin redondeo del IVA', !a.redondeo_iva)
  ok('CERO respaldos', (a.respaldos ?? []).length === 0 &&
    a.conceptos.every(c => (c.respaldos ?? []).length === 0))
  ok('solo las tres verificadas traen cifra',
    a.conceptos.filter(c => c.valor !== null).map(c => c.clave).join() === 'acto_sin_cuantia')
  ok('…y los dos recaudos sus tramos',
    a.conceptos.filter(c => (c.tramos ?? []).length).map(c => c.clave).sort().join() === 'recaudo_sin_cuantia,recaudo_snr')
  ok('la clave ajena derivada quedó bien',
    a.conceptos.find(c => c.clave === 'copia_autentica').multiplica_cantidad_de === 'hojas_papel_notarial')
  ok('la regla general de retención existe, sin tarifa',
    a.reglas_retencion.length === 1 && a.reglas_retencion[0].valor_efecto === null)
  await lanza('sembrar dos veces', () => sembrarAnio(prisma, ANIO, 'prueba'), 'ya existe')

  console.log('\n── La pantalla ──')
  const p = await anioParaPantalla(prisma, ANIO, BLOQUE)
  ok('los campos salen en el orden del documento', p.campos.length === BLOQUE.length)
  ok('…con el artículo a la vista como NAVEGACIÓN',
    p.campos.every(c => c.articulo_navegacion.length > 0))
  ok('…y sin un campo de artículo por cifra que teclear',
    p.campos.every(c => !('articulo' in c)))
  ok('…y la unidad esperada al lado', p.campos.every(c => c.unidad_esperada.length > 0))
  // 29 = el acto sin cuantía (1) + las siete filas del art. 50 con sus cuatro
  // cifras cada una (28). Son las tres verificadas contra el PDF y nada más:
  // los otros 24 campos del bloque salen vacíos.
  ok('solo salen cargados los de las tres verificadas: 29 de 53',
    p.campos.filter(c => c.valor !== null).length === 29, `(${p.campos.filter(c => c.valor !== null).length})`)
  ok('…y los demás 24 salen vacíos', p.campos.filter(c => c.valor === null).length === 24)
  ok('los pendientes vienen partidos por dueño', p.pendientes.porDueno.length === 3,
    JSON.stringify(p.pendientes.porDueno.map(d => [d.dueno, d.cantidad])))
  ok('el esquema no se contradice', p.incoherencia === null, `(${p.incoherencia})`)
  ok('el cotejo ya reporta lo sembrado', p.cotejo.coinciden > 0 || p.cotejo.difieren > 0,
    JSON.stringify(p.cotejo))
  ok('los criterios adoptados viajan a la pantalla', p.criterios_adoptados.length === 2)

  console.log('\n── Guardar, con lista blanca ──')
  await guardarCampoAnio(prisma, ANIO, 'uvt', '52374')
  ok('el UVT quedó', (await leerAnio(prisma, ANIO)).uvt === '52374')
  ok('y la versión subió', (await leerAnio(prisma, ANIO)).version === 2)
  await lanza('un campo que no es editable', () => guardarCampoAnio(prisma, ANIO, 'version', 99), 'no es un campo editable')
  await lanza('un modo de redondeo inventado',
    () => guardarCampoAnio(prisma, ANIO, 'redondeo_iva_modo', 'HACIA_ARRIBA'), 'desconocido')
  await lanza('un campo de concepto fuera de la lista',
    () => guardarConcepto(prisma, ANIO, 'copias', { label: 'otro' }), 'no se puede editar')
  await guardarConcepto(prisma, ANIO, 'copias', { valor: '700' })
  ok('la copia simple quedó en 700',
    (await leerAnio(prisma, ANIO)).conceptos.find(c => c.clave === 'copias').valor === '700')
  await lanza('una tabla de tramos con un hueco',
    () => guardarTramos(prisma, ANIO, 'derechos_orip', [
      { orden: 1, desde: 0, hasta: 100, modo_calculo: 'FIJO', valor: 10, unidad: 'PESOS' },
      { orden: 2, desde: 200, hasta: null, modo_calculo: 'FIJO', valor: 20, unidad: 'PESOS' },
    ]), 'un hueco')
  ok('…y no se guardó nada',
    (await leerAnio(prisma, ANIO)).conceptos.find(c => c.clave === 'derechos_orip').tramos.length === 0)

  console.log('\n── Activar ──')
  await lanza('activar con todo a medias', () => activarAnio(prisma, ANIO, 'prueba'), 'El año no está publicable')
  await lanza('un respaldo de un blog',
    () => guardarRespaldo(prisma, ANIO, { ambito: 'ANIO' }, {
      campo: 'uvt', norma: 'x', url: 'https://gastosnotariales.co/t',
      vigencia_desde: '2026-02-01', verificado_por: 'prueba', verificado_en: '2026-10-13',
    }), 'no corresponde a una autoridad oficial activa')
  ok('…y no quedó guardado',
    ((await leerAnio(prisma, ANIO)).respaldos ?? []).length === 0)
  await guardarRespaldo(prisma, ANIO, { ambito: 'ANIO' }, {
    campo: 'uvt', norma: 'Res. DIAN 000238 de 2025', articulo: 'art. 1',
    url: 'https://www.dian.gov.co/res238.pdf',
    vigencia_desde: '2026-01-01', articulo_vigencia: 'art. 2',
    verificado_por: 'prueba', verificado_en: '2026-10-13',
  })
  ok('un respaldo oficial sí queda',
    (await leerAnio(prisma, ANIO)).respaldos.some(r => r.campo === 'uvt' && r.norma.includes('DIAN')))
  await prisma.anioNotarial.update({ where: { anio: ANIO }, data: { estado: 'ACTIVO' } })
  await lanza('editar un año ACTIVO', () => guardarCampoAnio(prisma, ANIO, 'uvb', '12110'), 'devolverlo a borrador')
  await volverABorrador(prisma, ANIO, 'prueba')
  ok('devuelto a borrador, vuelve a editarse',
    await guardarCampoAnio(prisma, ANIO, 'uvb', '12110').then(() => true).catch(() => false))

  console.log('\n── Limpieza ──')
  await borrarAnio(prisma, ANIO)
  ok('el año de prueba se borró con todo lo suyo, respaldos incluidos',
    (await prisma.anioNotarial.count({ where: { anio: ANIO } })) === 0 &&
    (await prisma.conceptoNotarial.count()) === 0 &&
    (await prisma.respaldoNormativo.count()) === 0)
} finally {
  await prisma.$disconnect()
}
