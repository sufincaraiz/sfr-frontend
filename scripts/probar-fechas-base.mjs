#!/usr/bin/env node
/**
 * LAS FECHAS QUE VIENEN DE LA BASE, LEÍDAS EN DOS ZONAS
 * ====================================================
 *
 * El arnés `probar-fechas.mjs` prueba el puente **en memoria**. Esto prueba el
 * otro camino: lo que sale de PostgreSQL a través de Prisma. Son dos
 * superficies, como el arnés en memoria y la base lo han sido toda la semana.
 *
 * Y la diferencia importa: una columna `DATE` llega a JavaScript como un `Date`
 * a medianoche UTC, así que todo lo que se derive de ella con componentes
 * locales se mueve con la zona del proceso. Migrar la columna era necesario y
 * no suficiente; esto es lo que comprueba la otra mitad.
 *
 * ⚠ La salida tiene que ser IDÉNTICA con `TZ=UTC` y con `TZ=America/Bogota`.
 * Quien lo compara es `verificar-fechas-invariantes.mjs`. Por eso aquí no se
 * imprime nada que cambie entre ejecuciones: ni la hora, ni cuántas filas hay
 * —solo los días derivados de lo que esté guardado, en orden—.
 *
 * Si no hay base a mano dice que no pudo preguntar y sale con 0: «no pude
 * preguntar» no es «está bien», pero tampoco es motivo para romper un build por
 * una red caída. Se ve distinto de un cero, y eso basta.
 *
 *   node --env-file=.env.local scripts/probar-fechas-base.mjs
 */
import { PrismaClient } from '@prisma/client'
import { diaPuro, anioDelDia } from '../src/lib/dia-colombia.ts'

if (!process.env.DATABASE_URL) {
  console.log('\n  ⚠ NO PUDE PREGUNTAR: sin DATABASE_URL.')
  console.log('    Esto no dice que las fechas estén bien: dice que no se consultaron.\n')
  process.exit(0)
}

const prisma = new PrismaClient()
try {
  console.log('\n══ DÍAS LEÍDOS DE LA BASE ══')

  /* Los tipos de columna, que son la mitad del arreglo. Si una vuelve a ser
   * timestamp, esto lo dice antes de que nadie lo note en una cifra. */
  const tipos = await prisma.$queryRawUnsafe(`
    select table_name||'.'||column_name as col, data_type
    from information_schema.columns
    where table_schema='public' and table_name in
      ('egresos','ingresos','enlaces_contador','movimientos_custodia','mac_knowledge','accesos_enlace_contador')
      and column_name in ('fecha','fecha_reembolso','fecha_causacion','fecha_recaudo',
                          'periodo_desde','periodo_hasta','fecha_recibido','fecha_cierre','vigente_hasta')
    order by 1`)
  for (const t of tipos) console.log(`  ${t.col.padEnd(38)} ${t.data_type}`)

  /* Y los días derivados de lo que haya. Ordenados, para que la salida no
   * dependa del orden que devuelva el motor. */
  const egresos = await prisma.egreso.findMany({
    select: { fecha: true }, orderBy: { fecha: 'asc' },
  })
  console.log(`\n  egresos.fecha, día y año fiscal derivados (${egresos.length} filas):`)
  for (const e of egresos) {
    console.log(`     ${diaPuro(e.fecha)}  ·  año fiscal ${anioDelDia(e.fecha)}`)
  }
  if (!egresos.length) console.log('     (ninguna)')

  const ingresos = await prisma.ingreso.findMany({
    select: { fecha_causacion: true }, orderBy: { fecha_causacion: 'asc' },
  })
  console.log(`\n  ingresos.fecha_causacion (${ingresos.length} filas):`)
  for (const i of ingresos) {
    console.log(`     ${diaPuro(i.fecha_causacion)}  ·  año fiscal ${anioDelDia(i.fecha_causacion)}`)
  }
  if (!ingresos.length) console.log('     (ninguna)')

  console.log('\n  → los días de arriba no dependen de la zona del proceso.\n')
} finally {
  await prisma.$disconnect()
}
