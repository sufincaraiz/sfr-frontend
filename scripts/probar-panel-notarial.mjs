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
import { readFileSync, writeFileSync } from 'node:fs'
import { sembrarAnio, borrarAnio, anioParaPantalla, guardarCampoAnio, guardarConcepto, guardarTramos, activarAnio, volverABorrador, guardarRespaldo } from '../src/lib/notariales/panel.ts'
import { leerAnio } from '../src/lib/notariales/datos.ts'
import { leerBloqueCotejo } from '../src/lib/notariales/cotejo.ts'

/*
 * ⚠ ESTE ARNÉS NO PODÍA FALLAR.
 *
 * `ok()` solo IMPRIMÍA. No llevaba cuenta y el guión salía con 0 aunque hubiera
 * ✗ en la pantalla. Por eso el check de limpieza llevaba días rojo sin que nadie
 * lo notara: no es solo que el arnés estuviera fuera del build —es que, incluso
 * corriéndolo a mano, nada se detenía—.
 *
 * > **Un arnés sin código de salida no es un arnés: es un informe.** Su verde no
 * > lo puede leer una máquina, así que depende de que una persona mire la
 * > pantalla hasta el final.
 */
let corridas = 0
let fallos = 0
const ok = (t, c, x = '') => {
  corridas++
  if (!c) fallos++
  console.log(`  ${c ? '✓' : '✗'} ${t}${c ? '' : ' ' + x}`)
}
const lanza = async (t, fn, trozo = '') => {
  try { await fn(); console.log(`  ✗ ${t} (NO lanzó)`) }
  catch (e) { ok(`${t} → lanza`, !trozo || e.message.includes(trozo), `(${e.message})`) }
}
const prisma = new PrismaClient()

/*
 * LA LÍNEA BASE. Se toma ANTES de tocar nada: lo que esta prueba tiene que
 * dejar como estaba es lo que había, no «cero».
 */
const BASE = {
  conceptos: await prisma.conceptoNotarial.count(),
  respaldos: await prisma.respaldoNormativo.count(),
}
if ((await prisma.anioNotarial.count({ where: { anio: 2099 } })) > 0) {
  console.log('\n  ⚠ el año 2099 ya existía: una corrida anterior murió sin limpiar.')
  console.log('    Se borra antes de empezar, para que la línea base sea la de verdad.\n')
}
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
  /* ⚠ ESTAS DOS AFIRMABAN LAS 29 CIFRAS SEMBRADAS, que salieron del catálogo el
   * 2026-10-15. Sobrevivieron a su premisa durante toda la sesión sin que nadie
   * lo notara, porque este arnés no tenía código de salida: imprimía la ✗ y
   * seguía. Ahora afirman lo contrario, que es lo verdadero. */
  ok('NINGÚN concepto nace con cifra',
    a.conceptos.filter(c => c.valor !== null).length === 0,
    `(traen cifra: ${a.conceptos.filter(c => c.valor !== null).map(c => c.clave).join() || '—'})`)
  ok('…ni con tramos',
    a.conceptos.filter(c => (c.tramos ?? []).length).length === 0,
    `(traen tramos: ${a.conceptos.filter(c => (c.tramos ?? []).length).map(c => c.clave).join() || '—'})`)
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
  /* Antes aqui habia un comentario explicando las 29 cifras sembradas. Las
   * cifras salieron del catalogo el 2026-10-15 y el comentario sobrevivio a
   * ellas, igual que las verificaciones que las afirmaban. */
  ok('la pantalla arranca en 0 de 53 cargadas',
    p.avance.cargadas === 0 && p.avance.total === 53,
    `(${p.avance.cargadas} de ${p.avance.total})`)
  ok('…y las 53 salen vacías',
    p.campos.filter(c => c.valor !== null).length === 0,
    `(con valor: ${p.campos.filter(c => c.valor !== null).length})`)
  ok('los pendientes vienen partidos por dueno', p.pendientes.porDueno.length === 3,
    JSON.stringify(p.pendientes.porDueno.map(d => [d.dueno, d.cantidad])))
  ok('el esquema no se contradice', p.incoherencia === null, `(${p.incoherencia})`)
  /* Y la que destapó el defecto: `apto` salía `true` con 53 sin cargar, porque
   * dice CONSISTENCIA y no completitud. Ahora se exigen las dos. */
  ok('el cotejo reporta 53 sin cargar, apto por consistencia y NO completo',
    p.cotejo.total === 53 && p.cotejo.sin_cargar === 53 &&
    p.cotejo.coinciden === 0 && p.cotejo.apto === true && p.cotejo.completo === false,
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
  /*
   * ⚠ ESTE CHECK MEDÍA EL ESTADO GLOBAL, no el suyo.
   *
   * Compraba `conceptoNotarial.count() === 0` y `respaldoNormativo.count() === 0`
   * SIN filtro, así que afirmaba que la base entera estaba vacía. Pasó mientras
   * no hubo más años que el de prueba, y empezó a fallar en cuanto el año 2026
   * real se sembró con sus 19 conceptos. La limpieza funcionaba; el check no.
   *
   * Y no se notó porque este arnés NO está en la cadena del build: toca la base,
   * así que se corre a mano. Un instrumento que solo se mira cuando uno se
   * acuerda deja de avisar justo cuando hace falta.
   *
   * Ahora se mide contra una LÍNEA BASE tomada antes de empezar: lo que tiene
   * que volver a cero es lo que ESTA prueba creó, no la base.
   */
  await borrarAnio(prisma, ANIO)
  ok('el año de prueba se borró con todo lo suyo, respaldos incluidos',
    (await prisma.anioNotarial.count({ where: { anio: ANIO } })) === 0 &&
    (await prisma.conceptoNotarial.count()) === BASE.conceptos &&
    (await prisma.respaldoNormativo.count()) === BASE.respaldos,
    `(conceptos ${await prisma.conceptoNotarial.count()} vs base ${BASE.conceptos}, ` +
    `respaldos ${await prisma.respaldoNormativo.count()} vs base ${BASE.respaldos})`)
  console.log(`\n${fallos === 0 ? '✓ TODO EN VERDE' : '✗ CON FALLOS'} — ${corridas} verificaciones, ${fallos} fallos`)

  /* EL REGISTRO. Este arnes no puede correr en el build —crea y borra un ano de
   * prueba, y eso escribiria en produccion en cada despliegue—, asi que lo que
   * el build comprueba es CUANDO corrio por ultima vez en verde.
   *
   * Se escribe solo si no hubo fallos: un registro de una corrida roja seria
   * peor que ninguno. */
  if (fallos === 0) {
    const ruta = 'scripts/registro-de-arneses.json'
    const reg = JSON.parse(readFileSync(ruta, 'utf8'))
    reg.corridas['probar-panel-notarial.mjs'] = {
      cuando: new Date().toISOString(),
      verificaciones: corridas,
      contra: 'la base de produccion (ano de prueba 2099, autolimpiado)',
    }
    writeFileSync(ruta, JSON.stringify(reg, null, 2) + '\n', 'utf8')
    console.log(`
  registro actualizado: ${ruta}`)
  }
} finally {
  await prisma.$disconnect()
}

/* El código de salida va DESPUÉS de cerrar la conexión: un `process.exit` dentro
 * del `finally` dejaría el cliente de Prisma colgado. */
if (fallos > 0) process.exit(1)
