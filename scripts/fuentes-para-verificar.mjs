#!/usr/bin/env node
/**
 * LAS FUENTES NORMATIVAS, PARA QUE UNA PERSONA LAS VERIFIQUE — SOLO LECTURA
 * ========================================================================
 *
 * ⚠ NO ESCRIBE NADA. Ni un `update`, ni un `create`, ni un fichero.
 *
 * Existe porque la verificación de una norma **no la puede hacer este código**:
 * hay que abrir el sitio del emisor y comprobar que el texto que citamos sigue
 * siendo el vigente. Ya pasó una vez —se citaba el artículo 29 de la registral
 * y ese artículo estaba modificado por una resolución posterior—, y una cita a
 * nivel de artículo que ha cambiado es peor que no citar: afirma con precisión
 * algo que es falso.
 *
 * Lo único que este guión puede hacer es **poner delante lo que hay que
 * verificar, con todo lo que hace falta para hacerlo y nada más**.
 *
 *     node --env-file=.env.produccion scripts/fuentes-para-verificar.mjs
 */
import { PrismaClient } from '@prisma/client'
import { clasificarFirma } from '../src/lib/notariales/firma.ts'

const prisma = new PrismaClient()
try {
  const fuentes = await prisma.fuenteNormativa.findMany({
    orderBy: [{ tipo: 'asc' }, { entidad: 'asc' }],
    include: {
      respaldos: {
        select: {
          norma: true, articulo: true, campo: true, ambito: true,
          tipo_evidencia: true, url: true, verificado_en: true,
          vigencia_desde: true, vigencia_hasta: true,
          fecha_norma: true, entidad_emisora: true, caracter: true,
          articulo_vigencia: true, nota: true, verificado_por: true,
        },
      },
    },
  })

  console.log('\n══ FUENTES NORMATIVAS ════════════════════════════════════════')
  console.log(`   ${fuentes.length} fuentes\n`)

  let sinPersona = 0
  for (const [i, f] of fuentes.entries()) {
    const firma = clasificarFirma(f.agregada_por)
    if (!firma.acredita) sinPersona++

    console.log(`   ─── ${i + 1}. ${f.entidad} ────────────────────────────────`)
    console.log(`   dominio:   ${f.dominio}`)
    console.log(`   tipo:      ${f.tipo}${f.es_compilacion ? '  ⚠ ES UNA COMPILACIÓN, no la entidad emisora' : ''}`)
    console.log(`   activa:    ${f.activo ? 'sí' : 'NO'}`)
    console.log(`   agregada:  ${f.agregada_por} → ${firma.etiqueta}` +
      `${firma.acredita ? '' : '   ⚠ NADIE la verificó'}`)
    console.log(`   el ${new Date(f.agregada_en).toISOString().slice(0, 10)}`)
    if (f.advertencia) console.log(`   ⚠ advertencia obligatoria al citarla: ${f.advertencia}`)

    /* Las normas, agrupadas: una fuente sostiene varias y lo que se verifica es
     * la NORMA, no la fuente. Mostrar 20 filas repitiendo la misma resolución
     * haría ilegible justo lo que hay que mirar. */
    const porNorma = new Map()
    for (const r of f.respaldos) {
      const k = r.norma
      if (!porNorma.has(k)) porNorma.set(k, { articulos: new Set(), campos: new Set(), ev: new Set(), url: r.url, desde: r.vigencia_desde, hasta: r.vigencia_hasta, verif: r.verificado_en, fecha: r.fecha_norma, emisor: r.entidad_emisora, caracter: r.caracter, artVig: r.articulo_vigencia, nota: r.nota, quien: r.verificado_por })
      const g = porNorma.get(k)
      if (r.articulo) g.articulos.add(r.articulo)
      g.campos.add(r.campo)
      g.ev.add(r.tipo_evidencia)
    }

    if (porNorma.size === 0) {
      console.log('   NO sostiene ningún respaldo todavía.')
    } else {
      console.log(`   sostiene ${f.respaldos.length} respaldo(s), en ${porNorma.size} norma(s):`)
      for (const [norma, g] of porNorma) {
        const dia = d => (d ? new Date(d).toISOString().slice(0, 10) : '—')
        console.log(`\n     · ${norma}`)
        console.log(`       fecha de la norma: ${dia(g.fecha)}${g.emisor ? '  ·  emisor: ' + g.emisor : ''}`)
        console.log(`       carácter:          ${g.caracter ?? '—'}`)
        console.log(`       artículos citados: ${[...g.articulos].sort().join(', ') || '(ninguno)'}`)
        if (g.artVig) console.log(`       art. de vigencia:  ${g.artVig}`)
        if (g.nota) console.log(`       nota obligatoria:  ${g.nota}`)
        console.log(`       lo verificó:       ${g.quien ?? '(nadie)'}`)
        console.log(`       sostiene:          ${[...g.campos].sort().join(', ')}`)
        console.log(`       evidencia:         ${[...g.ev].join(', ')}`)
        console.log(`       vigencia:          ${dia(g.desde)} → ${dia(g.hasta) }`)
        console.log(`       verificado en:     ${dia(g.verif)}`)
        if (g.url) console.log(`       url:               ${g.url}`)
      }
    }
    console.log('')
  }

  console.log('   ── QUIÉN LAS VERIFICÓ ────────────────────────────────────')
  console.log(`   fuentes sin que NINGUNA PERSONA las verifique: ${sinPersona} de ${fuentes.length}`)
  console.log('   `precarga` y `titular` son los dos MARCADORES, no personas:')
  console.log('   `titular` significa «el titular, sin correo registrado», así que')
  console.log('   «7 precarga + 1 titular» y «0 personas identificables» son el')
  console.log('   MISMO hecho contado con dos granularidades, no dos cifras en')
  console.log('   conflicto. Lo dice `clasificarFirma`: las dos dan acredita=false.')

  const conRespaldo = fuentes.filter(f => f.respaldos.length > 0)
  if (conRespaldo.length === 0) {
    console.log('')
    console.log('   ── ⚠ NO HAY NINGUNA NORMA QUE VERIFICAR ──────────────')
    console.log('   Estas 8 filas NO son 8 normas. Son 8 DOMINIOS autorizados: el')
    console.log('   registro de qué sitios valen como fuente oficial. No tienen')
    console.log('   número de resolución ni fecha, porque no son resoluciones.')
    console.log('')
    console.log('   Y ninguna sostiene todavía ningún respaldo, porque hay 0 de 53')
    console.log('   cifras cargadas. Las normas —con su número, su fecha y sus')
    console.log('   artículos— viven en los RESPALDOS, y un respaldo nace cuando se')
    console.log('   carga una cifra. Hoy no hay ninguno.')
    console.log('')
    console.log('   Consecuencia: no se puede verificar «qué dice el artículo N de')
    console.log('   cada norma» porque no se cita ninguno todavía. Lo único')
    console.log('   verificable hoy es si cada DOMINIO es la autoridad que dice ser.')
  } else {
    console.log('')
    console.log('   ── LO QUE HAY QUE COMPROBAR DE CADA NORMA ──────────────')
    console.log('   1. que el número y la fecha existan en el sitio del emisor;')
    console.log('   2. que NO haya una resolución posterior que la modifique;')
    console.log('   3. y si la hay, qué artículos cambió —porque citamos artículos,')
    console.log('      y un artículo modificado es una cita precisa y falsa.')
  }

  console.log('\n═════════════════════════════════════════════════════════════\n')
} finally {
  await prisma.$disconnect()
}
