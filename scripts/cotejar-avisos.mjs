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
 * LA LÍNEA BASE, con fecha, porque una medición sin su línea base fechada no
 * es una medición, es un número:
 *
 *   · 2026-10-23 · Meta · plantilla `nuevo_lead_sfr` (APROBADA, Utilidad,
 *     Spanish (COL), activa desde el 2026-07-29)
 *   · MENSAJES ENTREGADOS: **1** — uno, en los 86 días de vida de la plantilla
 *   · la columna siguiente marcaba (3), consistente con los 3 leads que
 *     entraron por el agente Mac
 *
 * Ese 1 es el número contra el que se mide que esto quedó arreglado. Y cierra
 * dos candidatos del diagnóstico contra una superficie que no es la nuestra:
 * la plantilla **no** estaba sin aprobar, y el token **sirvió al menos una
 * vez**. La lectura del código y el contador de Meta coinciden, y eso es lo
 * que lo vuelve un hecho en vez de una conclusión.
 *
 * ⚠ LO QUE UN TOKEN QUE FUNCIONÓ UNA VEZ NO DEMUESTRA: que funcione hoy. Eso
 * solo lo prueba un envío real. No se investiga más por inspección.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CÓMO SE USA, Y POR QUÉ LA CIFRA DE META SE TECLEA
 *
 *     node --env-file=.env.local scripts/cotejar-avisos.mjs <entregados-en-meta>
 *
 * La cifra de Meta **se pasa a mano, leída de su panel**. No se consulta por
 * API a propósito, y no es por comodidad:
 *
 *   1. si este guion fuera a buscarla, las dos lecturas pasarían por el mismo
 *      token y la misma credencial, y un fallo de permisos las movería a las
 *      dos a la vez;
 *   2. teclearla obliga a que una PERSONA abra el panel de Meta y la lea, que
 *      es justo el acto que convierte esto en una segunda lectura y no en un
 *      eco. Es la misma razón por la que el veredicto del panel notarial no
 *      lleva la cifra transcrita: si la lleva, se copia.
 *
 * Sin argumento, el guion imprime lo NUESTRO y dice qué hay que ir a mirar.
 * No inventa la cifra de Meta ni la supone igual.
 */
import { PrismaClient } from '@prisma/client'

/**
 * LA LÍNEA BASE, y se USA en la aritmética, no solo en la cabecera.
 *
 * ⚠ La primera versión de este guión comparó el contador de TODA LA VIDA de
 * Meta contra una tabla que acababa de nacer, y dio un veredicto falso y
 * alarmante: «Meta entregó 1 más de los que registramos → hay un camino de
 * envío sin constancia». No lo había. Ese 1 se entregó el 29 de julio o
 * después, meses antes de que existiera `avisos_lead`.
 *
 * El error es exactamente el que el proyecto ya tiene escrito —«una medición
 * sin su línea base fechada no es una medición, es un número»— y lo cometí
 * teniendo la línea base delante, en una constante, usada solo para imprimir
 * la cabecera. **Tener el dato no es usarlo.**
 *
 * Así que lo que se cotejan son INCREMENTOS desde la línea base, no totales:
 * nuestras filas (que empiezan en `graba_desde`) contra los entregados de Meta
 * MENOS los que ya había entregado entonces.
 */
const BASE = {
  fecha: '2026-10-23',
  entregados: 1,
  desde: '2026-07-29',
  /** Fecha desde la que existe `avisos_lead`. Antes de esto no hay filas y no
   *  es un defecto: es que la tabla no existía. */
  graba_desde: '2026-10-23',
}

const metaArg = process.argv[2]
const prisma = new PrismaClient()

try {
  /* `groupBy` sobre el resultado: una consulta y no cinco. */
  const porResultado = await prisma.avisoLead.groupBy({
    by: ['resultado'],
    _count: { _all: true },
  })

  const cuenta = {}
  for (const f of porResultado) cuenta[f.resultado] = f._count._all
  const nuestrosAceptados = cuenta['ACEPTADO_POR_META'] ?? 0
  const totalIntentos = Object.values(cuenta).reduce((a, b) => a + b, 0)

  const leadsSinNingunAviso = await prisma.lead.count({ where: { avisos: { none: {} } } })
  const leadsTotal = await prisma.lead.count()

  console.log('\n══ DOS LECTURAS DE LOS AVISOS ════════════════════════════════')
  console.log(`   línea base: Meta decía ${BASE.entregados} entregado(s) el ${BASE.fecha},`)
  console.log(`   con la plantilla activa desde el ${BASE.desde}.\n`)

  console.log('   ── LECTURA 1 · NUESTRA BASE ──────────────────────────────')
  console.log(`   intentos registrados:        ${String(totalIntentos).padStart(4)}`)
  for (const [r, n] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(n).padStart(4)}  ${r}`)
  }
  console.log(`   que Meta ACEPTÓ:             ${String(nuestrosAceptados).padStart(4)}   ← se cotejan éstos`)
  console.log(`   leads SIN NINGUNA fila:      ${String(leadsSinNingunAviso).padStart(4)} de ${leadsTotal}`)
  console.log('     ← por su camino no pasó código de aviso. Antes del 2026-10-23')
  console.log('       eran todos; lo que quede aquí es de antes del arreglo.')

  console.log('\n   ── LECTURA 2 · EL PANEL DE META ──────────────────────────')
  if (metaArg === undefined) {
    console.log('   (no se pasó)')
    console.log('\n   Ve a business.facebook.com → WhatsApp Manager → Plantillas →')
    console.log('   nuevo_lead_sfr, y lee MENSAJES ENTREGADOS. Después:')
    console.log(`\n     node --env-file=.env.local scripts/cotejar-avisos.mjs <esa cifra>\n`)
    console.log('   No se consulta por API a propósito: las dos lecturas pasarían')
    console.log('   por la misma credencial y dejarían de ser dos.')
    console.log('\n═════════════════════════════════════════════════════════════\n')
    process.exit(0)
  }

  const meta = Number(metaArg)
  if (!Number.isInteger(meta) || meta < 0) {
    console.log(`   ✗ «${metaArg}» no es una cifra de mensajes entregados.`)
    process.exit(1)
  }
  console.log(`   entregados según Meta:       ${String(meta).padStart(4)}`)

  console.log('\n   ── EL COTEJO, SOBRE INCREMENTOS ─────────────────────────────────────────────')
  /* NO se comparan totales. El contador de Meta es de toda la vida de la
   * plantilla (desde el 2026-07-29) y nuestra tabla empieza el 2026-10-23, así
   * que comparar totales acusa de un defecto inexistente. Se comparan los
   * incrementos desde la línea base. */
  if (meta < BASE.entregados) {
    console.log(`   ✗ El contador de Meta BAJÓ: ${meta} ahora, ${BASE.entregados} el ${BASE.fecha}.`)
    console.log('   Un contador de entregados no baja. O se leyó mal una de las dos')
    console.log('   veces, o se está mirando otra plantilla, o Meta reinició la cuenta.')
    console.log('   Hasta aclararlo este cotejo no dice nada: su línea base no vale.\n')
    process.exit(1)
  }

  const metaNuevos = meta - BASE.entregados
  console.log(`   entregados NUEVOS según Meta: ${String(metaNuevos).padStart(4)}   (${meta} − ${BASE.entregados} de la línea base)`)
  console.log(`   que nosotros registramos:     ${String(nuestrosAceptados).padStart(4)}   (la tabla graba desde el ${BASE.graba_desde})\n`)

  if (metaNuevos === 0 && nuestrosAceptados === 0) {
    console.log('   — TODAVÍA NO HAY NADA QUE COTEJAR.')
    console.log('   Ni un aviso nuevo por ninguno de los dos lados, así que esto no')
    console.log('   dice que funcione ni que no. El criterio de aceptación sigue')
    console.log('   pendiente: un lead de prueba por el FORMULARIO WEB que llegue al')
    console.log('   WhatsApp de Leonel, y este contador pasando de 1 a 2.\n')
    process.exit(0)
  }

  const dif = nuestrosAceptados - metaNuevos
  if (dif === 0) {
    console.log(`   ✓ COINCIDEN en ${metaNuevos} aviso(s) nuevo(s).`)
    console.log('   Las dos lecturas dicen lo mismo, y una de ellas no la controlamos.')
  } else if (dif > 0) {
    console.log(`   ✗ DIFIEREN: nosotros contamos ${dif} más que Meta.`)
    console.log('   Nosotros registramos «Meta aceptó» cuando la API devuelve 2xx, y')
    console.log('   «aceptado» no es «entregado»: un número bloqueado, un teléfono')
    console.log('   apagado mucho tiempo o un usuario que ya no existe se aceptan y')
    console.log('   no se entregan. Esta diferencia no es necesariamente un defecto;')
    console.log('   es la distancia entre lo que nuestra capa puede saber y lo que')
    console.log('   pasó de verdad. Si crece, el camino para cerrarla es el webhook')
    console.log('   de ESTADOS de Meta, que sí informa de la entrega.')
  } else {
    console.log(`   ✗ DIFIEREN, y en la dirección que NO debería poder pasar:`)
    console.log(`   Meta entregó ${-dif} más de los que nosotros registramos.`)
    console.log('   Eso significa que salieron avisos sin que quedara constancia, que')
    console.log('   es exactamente el defecto del 2026-10-23 en otra forma. Hay un')
    console.log('   camino de envío que no pasa por `avisarLead`: búscalo con')
    console.log('   `node scripts/verificar-avisos.mjs` y mirando quién llama a')
    console.log('   `enviarPlantillaWhatsApp` directamente.')
  }

  /* Lo que ninguna de las dos lecturas dice. */
  console.log('\n   ── LO QUE NI UNA NI OTRA DEMUESTRAN ──────────────────────')
  console.log('   Que Leonel lo LEYERA. «Entregado» de Meta es entregado al')
  console.log('   teléfono; nuestro ACEPTADO_POR_META es menos todavía. Ninguna')
  console.log('   de las dos cifras es un acuse: un acuse es que el receptor cite')
  console.log('   lo recibido.')

  console.log('\n═════════════════════════════════════════════════════════════\n')
  process.exit(dif === 0 ? 0 : 1)
} finally {
  await prisma.$disconnect()
}
