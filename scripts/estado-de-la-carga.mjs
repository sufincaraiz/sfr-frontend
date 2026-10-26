#!/usr/bin/env node
/**
 * ESTADO DE LA CARGA DE LAS 53 CIFRAS — SOLO LECTURA
 * ==================================================
 *
 * Responde cuatro preguntas y nada más: de las 53, cuántas quedaron CARGADAS,
 * cuántas COINCIDEN con la transcripción, cuántas DIFIEREN y cuántas quedaron
 * SIN RESPALDO.
 *
 * ⚠ NO ESCRIBE NADA. Ni un `update`, ni un `create`, ni un fichero. Se puede
 * correr con el titular a mitad de carga sin tocarle nada; lo único que verá es
 * que la consulta tarda un segundo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ CUATRO CIFRAS Y NO UNA
 *
 * «Van 40 de 53» agrupa cuatro causas que piden acciones distintas, y la regla
 * del proyecto es que un indicador que agrupa causas distintas no se diagnostica
 * desde él: se va al dato. Las cuatro son independientes:
 *
 *   · CARGADA     hay una cifra escrita en la base
 *   · COINCIDE    esa cifra es igual a la del documento transcrito
 *   · DIFIERE     las dos lecturas no dan lo mismo → hay que volver al PDF
 *   · SIN RESPALDO está cargada y no tiene norma oficial detrás → no activa nada
 *
 * Una cifra puede estar CARGADA y DIFERIR; puede COINCIDIR y estar SIN
 * RESPALDO. Sumarlas sería inventar una cifra que no significa nada.
 *
 * Y la quinta, que no es de las 53 pero decide si valen: cuántas de las fuentes
 * normativas las verificó una PERSONA. Medido el 2026-10-19: 7 de 8 eran
 * «precarga» y 1 «titular», o sea ninguna.
 *
 *     node --env-file=.env.produccion scripts/estado-de-la-carga.mjs [año]
 */
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { leerBloqueCotejo, compararCotejo, resumirCotejo } from '../src/lib/notariales/cotejo.ts'
import { leerAnio, valoresDesdeAnio, leerFuentes } from '../src/lib/notariales/datos.ts'
import { pendientesParaActivar, resumenDePendientes } from '../src/lib/notariales/guardas.ts'
import { clasificarFirma } from '../src/lib/notariales/firma.ts'

const anio = Number(process.argv[2]) || 2026
const DOC = 'PARAMETROS-NOTARIALES-VERIFICADOS.md'

const prisma = new PrismaClient()
try {
  const transcritas = leerBloqueCotejo(readFileSync(DOC, 'utf8'))
  const cargado = await leerAnio(prisma, anio)

  console.log(`\n══ ESTADO DE LA CARGA · AÑO ${anio} ═══════════════════════════`)

  if (!cargado) {
    console.log(`\n  El año ${anio} no existe en la base. Nada cargado todavía.\n`)
    process.exit(0)
  }

  const fuentes = await leerFuentes(prisma)
  const resultados = compararCotejo(transcritas, valoresDesdeAnio(cargado))
  const r = resumirCotejo(resultados)
  const pendientes = pendientesParaActivar(cargado, fuentes)
  const resumenPend = resumenDePendientes(pendientes)

  /* SIN RESPALDO: los pendientes que hablan del respaldo y no de la cifra. Se
   * distinguen por el texto del pendiente, que es lo que `pendientesParaActivar`
   * produce; si algún día eso cambia, esta cuenta se queda corta y hay que
   * mirarlo aquí. */
  const sinRespaldo = pendientes.filter(p => /respaldo|norma que la sustenta/i.test(p.que))

  const pct = n => (r.total ? ` (${Math.round((n / r.total) * 100)} %)` : '')

  console.log(`  año en ${cargado.estado}, versión ${cargado.version}`)
  console.log(`  documento transcrito: ${transcritas.length} cifras\n`)
  console.log('  ── LAS CUATRO CIFRAS ────────────────────────────────────')
  console.log(`  del catálogo:        ${String(r.total).padStart(3)}`)
  console.log(`  CARGADAS:            ${String(r.total - r.sin_cargar).padStart(3)}${pct(r.total - r.sin_cargar)}`)
  console.log(`  sin cargar:          ${String(r.sin_cargar).padStart(3)}${pct(r.sin_cargar)}`)
  console.log(`  COINCIDEN:           ${String(r.coinciden).padStart(3)}${pct(r.coinciden)}`)
  console.log(`  DIFIEREN:            ${String(r.difieren).padStart(3)}${pct(r.difieren)}   ← volver al PDF`)
  console.log(`  cargadas sin transcribir: ${String(r.sin_transcribir).padStart(3)}   ← una sola lectura`)
  console.log(`  SIN RESPALDO:        ${String(sinRespaldo.length).padStart(3)}   ← no activan nada`)
  console.log('  ─────────────────────────────────────────────────────────')
  console.log(`  consistente (apto):  ${r.apto ? 'SÍ' : 'NO'}`)
  console.log(`  completo:            ${r.completo ? 'SÍ' : 'NO'}`)
  console.log('  Las dos cosas son distintas: `apto` dice que nada de lo cargado')
  console.log('  contradice la transcripción, y un año VACÍO no contradice nada.')

  if (r.difieren > 0) {
    console.log('\n  ── LO QUE DIFIERE, completo ─────────────────────────────')
    for (const x of resultados.filter(y => y.estado === 'DIFIERE')) {
      console.log(`  ✗ ${x.concepto} · ${x.campo}`)
      for (const d of x.diferencias) console.log(`      ${d}`)
    }
  }

  if (sinRespaldo.length) {
    console.log('\n  ── CARGADAS SIN RESPALDO OFICIAL ────────────────────────')
    for (const p of sinRespaldo.slice(0, 20)) console.log(`  ⚠ ${p.que}`)
    if (sinRespaldo.length > 20) console.log(`  … y ${sinRespaldo.length - 20} más`)
  }

  console.log('\n  ── LO QUE FALTA, por quién puede hacerlo ────────────────')
  for (const d of resumenPend.porDueno) {
    console.log(`  ${String(d.cantidad).padStart(3)} ${d.etiqueta}` +
      (d.bloqueados ? `  (${d.puedeYa} ya · ${d.bloqueados} esperando pantalla)` : ''))
  }
  console.log(`  ${String(resumenPend.total).padStart(3)} en total`)

  /* LA QUINTA CIFRA: quién respalda a los que respaldan. */
  const firmas = fuentes.map(f => clasificarFirma(f.agregada_por))
  const personas = firmas.filter(f => f.acredita).length
  console.log('\n  ── QUIÉN VERIFICÓ LAS AUTORIDADES ───────────────────────')
  console.log(`  fuentes normativas: ${fuentes.length}`)
  console.log(`  verificadas por una PERSONA identificable: ${personas}`)
  console.log(`  por un marcador (precarga, titular…):      ${firmas.length - personas}`)
  if (personas === 0 && fuentes.length > 0) {
    console.log('  ⚠ Ninguna. Cada respaldo elige una de estas, así que lo que')
    console.log('    sostiene una tarifa es una fila que nadie firmó.')
  }

  console.log('\n═════════════════════════════════════════════════════════════\n')
} finally {
  await prisma.$disconnect()
}
