#!/usr/bin/env node
/**
 * COTEJO DE LA TRANSCRIPCIÓN CONTRA LA BASE.
 *
 * Lee PARAMETROS-NOTARIALES-VERIFICADOS.md y la base, y compara fila por fila.
 *
 * ⚠ LAS DOS RUTAS SON INDEPENDIENTES, y eso es lo único que lo hace valer: el
 * titular transcribió del PDF al documento, y después cargó del MISMO PDF al
 * panel, a mano y en otro momento. Nadie deriva del otro. Si divergen, alguien
 * leyó mal el papel — y ese es el único error que ningún arnés puede encontrar,
 * porque el motor estaría calculando impecablemente sobre una cifra equivocada.
 *
 * Corre con el arnés, NO en el build: un año a medio cargar es un estado normal
 * del trabajo, no un fallo del código.
 *
 *   node scripts/cotejar-notariales.mjs [año]
 */
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { leerBloqueCotejo, compararCotejo, resumirCotejo } from '../src/lib/notariales/cotejo.ts'
import { leerAnio, valoresDesdeAnio } from '../src/lib/notariales/datos.ts'

const anio = Number(process.argv[2]) || new Date().getFullYear()
const DOC = 'PARAMETROS-NOTARIALES-VERIFICADOS.md'

const ICONO = {
  COINCIDE: '✓',
  DIFIERE: '✗',
  SIN_TRANSCRIBIR: '⚠',
  SIN_CARGAR: '·',
}

const prisma = new PrismaClient()
try {
  const transcritas = leerBloqueCotejo(readFileSync(DOC, 'utf8'))
  const cargado = await leerAnio(prisma, anio)

  console.log(`\n══ COTEJO DEL AÑO ${anio} ══`)
  console.log(`   documento: ${DOC} · ${transcritas.length} cifras transcritas`)
  if (!cargado) {
    console.log(`\n   El año ${anio} no existe en la base todavía: nada que cotejar.`)
    console.log('   Créalo en /admin/notariales y vuelve a correr esto al terminar de cargar.\n')
    process.exit(0)
  }
  console.log(`   base: año ${cargado.anio} en ${cargado.estado}, versión ${cargado.version}`)

  const resultados = compararCotejo(transcritas, valoresDesdeAnio(cargado))
  const resumen = resumirCotejo(resultados)

  // Lo que DIFIERE va primero y completo: es lo único que obliga a volver al PDF.
  const difieren = resultados.filter(r => r.estado === 'DIFIERE')
  if (difieren.length) {
    console.log('\n── LAS DOS LECTURAS NO COINCIDEN ──')
    for (const r of difieren) {
      console.log(`  ${ICONO.DIFIERE} ${r.concepto} · ${r.campo}`)
      for (const d of r.diferencias) console.log(`      ${d}`)
    }
  }

  const sobran = resultados.filter(r => r.estado === 'SIN_TRANSCRIBIR')
  if (sobran.length) {
    console.log('\n── CARGADO SIN TRANSCRIBIR: una sola lectura, o ninguna ──')
    for (const r of sobran) {
      console.log(`  ${ICONO.SIN_TRANSCRIBIR} ${r.concepto} · ${r.campo} = ${r.cargado.valor} ` +
        `${r.cargado.unidad}${r.cargado.articulo ? ` (${r.cargado.articulo})` : ''}`)
    }
  }

  const faltan = resultados.filter(r => r.estado === 'SIN_CARGAR')
  if (faltan.length) {
    console.log(`\n── FALTA CARGAR (${faltan.length}) ──`)
    const porConcepto = new Map()
    for (const r of faltan) {
      if (!porConcepto.has(r.concepto)) porConcepto.set(r.concepto, [])
      porConcepto.get(r.concepto).push(r.campo)
    }
    for (const [concepto, campos] of porConcepto) {
      console.log(`  ${ICONO.SIN_CARGAR} ${concepto}: ${campos.join(', ')}`)
    }
  }

  const coinciden = resultados.filter(r => r.estado === 'COINCIDE')
  if (coinciden.length) {
    console.log(`\n── CON DOS LECTURAS COINCIDENTES (${coinciden.length}) ──`)
    for (const r of coinciden) {
      console.log(`  ${ICONO.COINCIDE} ${r.concepto} · ${r.campo} = ${r.cargado.valor} ${r.cargado.unidad}`)
    }
  }

  console.log(`\n${resumen.coinciden} coinciden · ${resumen.difieren} difieren · ` +
    `${resumen.sin_transcribir} sin transcribir · ${resumen.sin_cargar} sin cargar`)

  if (resumen.difieren) {
    console.log('\n✗ HAY QUE VOLVER AL PDF antes de activar: dos lecturas del mismo papel no coinciden.\n')
  } else if (resumen.sin_transcribir) {
    console.log('\n⚠ HAY CIFRAS CARGADAS QUE NADIE TRANSCRIBIÓ. Una sola lectura no es verificación:')
    console.log('  o se transcriben al bloque desde su documento, o se quitan de la base.\n')
  } else if (resumen.coinciden === 0) {
    console.log('\n· Nada cargado todavía. El cotejo no tiene nada que objetar, lo cual no es lo')
    console.log('  mismo que estar bien: lo que falta lo bloquea la guarda de respaldos.\n')
  } else {
    console.log('\n✓ LAS DOS LECTURAS COINCIDEN en todo lo cargado: dos pares de ojos sobre cada cifra.\n')
  }
  process.exit(resumen.apto ? 0 : 1)
} finally {
  await prisma.$disconnect()
}
