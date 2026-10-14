#!/usr/bin/env node
/**
 * BORRA Y VUELVE A SEMBRAR UN AÑO TARIFARIO.
 *
 * Existe porque el 2026-10-14 se vaciaron las 29 cifras que el catálogo
 * sembraba, y el año 2026 ya estaba creado con ellas. Resembrar desde el
 * catálogo nuevo es la forma de dejar el panel en 0 de 53 sin editar filas a
 * mano.
 *
 * ⚠ BORRA. Pide confirmación explícita con el año y solo acepta años en
 * BORRADOR: un año ACTIVO está publicando cifras y no se toca.
 *
 *   node scripts/resembrar-notarial.mjs 2026 --si-borrar
 */
import { PrismaClient } from '@prisma/client'
import { borrarAnio, sembrarAnio, anioParaPantalla } from '../src/lib/notariales/panel.ts'
import { TRANSCRIPCION } from '../src/lib/notariales/transcripcion.generada.ts'

const anio = Number(process.argv[2])
const confirmado = process.argv.includes('--si-borrar')

if (!Number.isInteger(anio)) {
  console.log('\n  Uso: node scripts/resembrar-notarial.mjs <año> --si-borrar\n')
  process.exit(1)
}

const prisma = new PrismaClient()
try {
  const antes = await prisma.anioNotarial.findUnique({
    where: { anio },
    select: { estado: true, version: true, _count: { select: { conceptos: true } } },
  })

  if (antes) {
    console.log(`\n  El año ${anio} existe: ${antes.estado}, versión ${antes.version}, ` +
      `${antes._count.conceptos} conceptos.`)
    if (!confirmado) {
      console.log('  Para borrarlo y volver a sembrarlo, añade --si-borrar\n')
      process.exit(1)
    }
    await borrarAnio(prisma, anio)
    console.log('  Borrado, con sus respaldos.')
  } else {
    console.log(`\n  El año ${anio} no existía.`)
  }

  await sembrarAnio(prisma, anio, 'resembrado')
  const p = await anioParaPantalla(prisma, anio, [...TRANSCRIPCION])

  console.log(`  Sembrado: ${p.conceptos.length} conceptos, estado ${p.estado}, versión ${p.version}.`)
  console.log(`\n  AVANCE: ${p.avance.cargadas} de ${p.avance.total} cifras cargadas ` +
    `(${p.avance.porcentaje} %).`)
  console.log(`  COTEJO: ${p.cotejo.coinciden} coinciden · ${p.cotejo.difieren} difieren · ` +
    `${p.cotejo.sin_transcribir} sin transcribir · ${p.cotejo.sin_cargar} sin cargar.`)
  console.log(`  PENDIENTES: ${p.pendientes.total}, repartidos en ` +
    `${p.pendientes.porDueno.map(d => `${d.cantidad} ${d.dueno}`).join(' · ')}.`)

  const sobra = p.conceptos.filter(c => c.tramos.length > 0)
  console.log(`\n  ${p.avance.cargadas === 0 ? '✓' : '✗'} el panel queda en 0 de 53 cargadas`)
  console.log(`  ${p.cotejo.coinciden === 0 ? '✓' : '✗'} el cotejo no dice «coincide» ni una vez`)
  console.log(`  ${sobra.length === 0 ? '✓' : '✗'} ningún concepto nace con tramos${sobra.length ? `: ${sobra.map(c => c.clave).join()}` : ''}\n`)
} finally {
  await prisma.$disconnect()
}
