#!/usr/bin/env node
/**
 * DOS LECTURAS DE CUÁNTOS AVISOS SALIERON — SOLO LECTURA
 * =====================================================
 *
 * ⚠ NO ESCRIBE NADA. Ni un `update`, ni un `create`, ni un fichero.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE INSTRUMENTO ES DISTINTO A TODOS LOS DEMÁS DEL PROYECTO
 *
 * Es la primera vez que hay un **testigo externo**. Las 53 cifras notariales se
 * cotejan contra un documento que transcribimos nosotros: dos lecturas, sí,
 * pero las dos nuestras. Aquí la segunda lectura la lleva Meta, en su propio
 * panel, con su propio contador, y no la controlamos. Eso la hace mejor.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE EL CONTADOR DE META ES, Y LO QUE NO (resuelto el 2026-10-25)
 *
 * Durante dos días se trabajó con una línea base falsa: «1 entregado desde el
 * 2026-07-29». **No era el histórico.** Se resolvió sin tener que entender la
 * pantalla, porque el instrumento se delató al movernos:
 *
 *   · viernes 2026-10-23, antes del lead de prueba ..... 1
 *   · domingo 2026-10-25, después ....................... 3
 *
 * Tres hechos, ninguno inferencia: el contador SE MUEVE; NO es el histórico
 * desde julio (con ~27 entregas de vigilancia desde septiembre no habría podido
 * decir 1 el viernes); y el +2 cuadra con lo que sabemos que salió en esa
 * ventana —el lead de prueba del 23 y un re-aviso de vigilancia, cuyo ciclo es
 * de 3 días y el anterior fue el 20—.
 *
 * Lo que queda demostrado es que el contador es **vivo y acotado**, NO cuál es
 * su ventana exacta. Así que la línea base deja de ser un total histórico y
 * pasa a ser lo único que sí sabemos: **lecturas puntuales, con su fecha, de un
 * contador que se mueve.** Y de ahí la forma de este guión:
 *
 *   > Solo se cotejan INCREMENTOS entre dos lecturas, contra lo que salió en
 *   > esa misma ventana. Nunca totales.
 *
 * ⚠ Y SIGUE HABIENDO UN DENOMINADOR SUCIO. El cron de vigilancia manda sus
 * alertas internas por ESTA MISMA plantilla, así que el incremento de Meta
 * incluye mensajes que no son leads. El guión los estima y los descuenta, pero
 * una estimación no es un recuento: **el cotejo no será exacto hasta que
 * `alerta_interna_sfr` esté aprobada y cableada.** Hasta entonces informa, no
 * dictamina.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CÓMO SE USA
 *
 *     node --env-file=.env.local scripts/cotejar-avisos.mjs <entregados-ahora>
 *
 * La cifra de Meta **se pasa a mano, leída de su panel**. No se consulta por
 * API a propósito, y no es por comodidad:
 *
 *   1. si este guión fuera a buscarla, las dos lecturas pasarían por el mismo
 *      token y la misma credencial, y un fallo de permisos las movería a las
 *      dos a la vez;
 *   2. teclearla obliga a que una PERSONA abra el panel de Meta y la lea, que
 *      es justo el acto que convierte esto en una segunda lectura y no en un
 *      eco. Es la misma razón por la que el veredicto del panel notarial no
 *      lleva la cifra transcrita: si la lleva, se copia.
 */
import { PrismaClient } from '@prisma/client'

const DIA_MS = 86_400_000
const DIAS_REAVISO_VIGILANCIA = 3

/**
 * LECTURAS DEL CONTADOR DE META, en orden. Cada una es un hecho con fecha: lo
 * que la pantalla decía cuando una persona la miró. No son totales históricos
 * y no se interpretan como tales.
 *
 * Para añadir una, se escribe aquí con la fecha en que se leyó.
 */
const LECTURAS = [
  { fecha: '2026-10-23', entregados: 1, nota: 'viernes, antes del lead de prueba' },
  { fecha: '2026-10-25', entregados: 3, nota: 'domingo; índice de entrega 100 %' },
]

const metaArg = process.argv[2]
const prisma = new PrismaClient()

try {
  const ultima = LECTURAS[LECTURAS.length - 1]
  const desde = new Date(`${ultima.fecha}T00:00:00Z`)

  /* NUESTRA LECTURA, acotada a la misma ventana que la de Meta. Contar el total
   * de la tabla contra un incremento del contador compararía cosas distintas,
   * que es el error que este guión ya cometió una vez. */
  const porResultado = await prisma.avisoLead.groupBy({
    by: ['resultado'],
    _count: { _all: true },
    where: { intentado_at: { gte: desde } },
  })
  const cuenta = {}
  for (const f of porResultado) cuenta[f.resultado] = f._count._all
  const nuestrosAceptados = cuenta['ACEPTADO_POR_META'] ?? 0
  const totalIntentos = Object.values(cuenta).reduce((a, b) => a + b, 0)

  /* LO QUE ENSUCIA EL DENOMINADOR: las alertas internas que salen por la misma
   * plantilla. Se ESTIMAN desde la cadencia del cron, no se cuentan: no hay
   * tabla que las registre. Por eso el resultado informa y no dictamina. */
  const abiertos = await prisma.vigilanciaHallazgo.findMany({
    where: { resuelto: false },
    select: { primero_visto: true },
  })
  const ahora = Date.now()
  const diasConAviso = new Set()
  for (const h of abiertos) {
    const nacio = new Date(h.primero_visto).getTime()
    const noches = Math.floor((ahora - nacio) / DIA_MS)
    const nacioDia = Math.floor(nacio / DIA_MS)
    for (let k = 0; k * DIAS_REAVISO_VIGILANCIA <= noches; k++) {
      const dia = nacioDia + k * DIAS_REAVISO_VIGILANCIA
      if (dia * DIA_MS >= desde.getTime()) diasConAviso.add(dia)
    }
  }
  const vigilanciaEstimada = diasConAviso.size

  const leadsSinNingunAviso = await prisma.lead.count({ where: { avisos: { none: {} } } })
  const leadsTotal = await prisma.lead.count()

  console.log('\n══ DOS LECTURAS DE LOS AVISOS ════════════════════════════════')
  console.log('   Se cotejan INCREMENTOS entre dos lecturas, nunca totales: el')
  console.log('   contador de Meta es vivo y acotado, y su ventana exacta se')
  console.log('   desconoce.\n')
  console.log('   ── LAS LECTURAS REGISTRADAS ──────────────────────────────')
  for (const l of LECTURAS) {
    console.log(`   ${l.fecha}  ${String(l.entregados).padStart(4)}   ${l.nota}`)
  }

  if (metaArg === undefined) {
    console.log('\n   ── FALTA LA LECTURA DE HOY ───────────────────────────────')
    console.log('   Ve a business.facebook.com → WhatsApp Manager → Plantillas →')
    console.log('   nuevo_lead_sfr, lee MENSAJES ENTREGADOS y pásalo:')
    console.log('\n     node --env-file=.env.local scripts/cotejar-avisos.mjs <esa cifra>\n')
    console.log('   No se consulta por API a propósito: las dos lecturas pasarían')
    console.log('   por la misma credencial y dejarían de ser dos.')
    console.log('\n═════════════════════════════════════════════════════════════\n')
    process.exit(0)
  }

  const meta = Number(metaArg)
  if (!Number.isInteger(meta) || meta < 0) {
    console.log(`\n   ✗ «${metaArg}» no es una cifra de mensajes entregados.\n`)
    process.exit(1)
  }

  if (meta < ultima.entregados) {
    console.log(`\n   ✗ EL CONTADOR BAJÓ: ${meta} ahora, ${ultima.entregados} el ${ultima.fecha}.`)
    console.log('   Un contador de entregados no baja dentro de su ventana. O se leyó')
    console.log('   mal una de las dos veces, o la ventana se movió y dejó fuera')
    console.log('   entregas viejas —que es posible, porque no sabemos cuál es—, o')
    console.log('   se está mirando otra plantilla. Hasta aclararlo no se coteja.\n')
    process.exit(1)
  }

  const metaNuevos = meta - ultima.entregados
  const esperadoNuestro = nuestrosAceptados + vigilanciaEstimada

  console.log(`\n   ── LA VENTANA: desde el ${ultima.fecha} ──────────────────────`)
  console.log(`   entregados NUEVOS según Meta:     ${String(metaNuevos).padStart(4)}   (${meta} − ${ultima.entregados})`)
  console.log(`   avisos de LEAD que Meta aceptó:   ${String(nuestrosAceptados).padStart(4)}   (de nuestra tabla)`)
  console.log(`   alertas internas estimadas:       ${String(vigilanciaEstimada).padStart(4)}   ← ensucian el contador`)
  console.log(`   total que esperaríamos ver:       ${String(esperadoNuestro).padStart(4)}`)

  if (metaNuevos === 0 && esperadoNuestro === 0) {
    console.log('\n   — NADA QUE COTEJAR en esta ventana. Ni un aviso por ninguno de')
    console.log('   los dos lados, así que esto no dice que funcione ni que no.\n')
    process.exit(0)
  }

  const dif = esperadoNuestro - metaNuevos
  console.log('\n   ── EL COTEJO ─────────────────────────────────────────────')
  if (dif === 0) {
    console.log(`   ✓ CUADRA: ${metaNuevos} por los dos lados.`)
    console.log('   Pero ojo con lo que esto demuestra y lo que no: las alertas')
    console.log('   internas van ESTIMADAS, no contadas, así que el cuadre puede')
    console.log('   esconder un error en un lado y otro compensándolo en el otro.')
    console.log('   No será un cotejo de verdad hasta que las plantillas estén')
    console.log('   separadas. Hasta entonces esto informa, no dictamina.')
  } else if (dif > 0) {
    console.log(`   ⚠ Esperábamos ${dif} más de los que Meta entregó.`)
    console.log('   «Aceptado por Meta» no es «entregado»: un número bloqueado o un')
    console.log('   teléfono apagado mucho tiempo se acepta y no se entrega. También')
    console.log('   puede ser que la estimación de alertas internas se pase. Lo que')
    console.log('   cerraría la pregunta de verdad es el webhook de ESTADOS de Meta.')
  } else {
    console.log(`   ✗ Meta entregó ${-dif} MÁS de los que podemos explicar.`)
    console.log('   Si la estimación de alertas internas no lo cubre, hay un camino')
    console.log('   de envío que no pasa por `avisarLead` y no deja constancia: el')
    console.log('   defecto del 2026-10-23 otra vez en otra forma. Búscalo con')
    console.log('   `node scripts/verificar-avisos.mjs` y mirando quién llama a')
    console.log('   `enviarPlantillaWhatsApp` directamente.')
  }

  console.log('\n   ── CONTEXTO ──────────────────────────────────────────────')
  console.log(`   intentos registrados en la ventana: ${totalIntentos}`)
  console.log(`   leads SIN NINGUNA fila de aviso: ${leadsSinNingunAviso} de ${leadsTotal}`)
  console.log('     ← de antes del 2026-10-23: por su camino no pasaba código de aviso.')

  console.log('\n   ── LO QUE NI UNA NI OTRA DEMUESTRAN ──────────────────────')
  console.log('   Que Leonel lo LEYERA. «Entregado» de Meta es entregado al')
  console.log('   teléfono; nuestro ACEPTADO_POR_META es menos todavía. Ninguna')
  console.log('   de las dos cifras es un acuse: un acuse es que el receptor cite')
  console.log('   lo recibido.')

  console.log('\n═════════════════════════════════════════════════════════════\n')
} finally {
  await prisma.$disconnect()
}
