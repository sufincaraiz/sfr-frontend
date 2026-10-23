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

  /**
   * ⚠⚠ ALCANCE NO VERIFICADO — ESTE COTEJO NO SE PUEDE USAR TODAVÍA.
   *
   * La pantalla de plantillas de Meta tenía un filtro «Últimos 7 días» arriba.
   * **No sabemos si la columna de entregados lo respeta.** Si lo respeta, ese 1
   * es de una semana y no el histórico desde el 2026-07-29, y toda la
   * aritmética de abajo está anclada a un número cuyo periodo desconocemos.
   *
   * No se supone en ninguna dirección. Y hay dos indicios que apuntan a que
   * NO es el histórico, pero ninguno lo demuestra:
   *
   *   · el cron de vigilancia ha mandado ~27 mensajes por ESTA MISMA plantilla
   *     desde el 2026-09-07, y Leonel tiene captura de haber recibido uno de
   *     ellos, así que las entregas históricas son >> 1;
   *   · pero «1 en los últimos 7 días» tampoco cuadra: los re-avisos de
   *     vigilancia caen cada 3 días y el último fue el 2026-10-20, así que en
   *     esa ventana deberían ser 2.
   *
   * Ninguna de las dos lecturas cuadra con lo medido, y por eso el guión se
   * niega a cotejar. Un número con el alcance sin declarar no es una medición.
   *
   * CÓMO SE CIERRA, en un clic y sin leer documentación: cambiar el filtro de
   * la pantalla a otro rango —30 días, o todo el tiempo— y mirar si la cifra
   * cambia. Si cambia, la columna respeta el filtro y el 1 es de 7 días. Si no
   * cambia, es el histórico. Es una prueba DIFERENCIAL: no pregunta qué
   * significa la columna, le cambia una entrada y mira la salida.
   */
  alcance_verificado: false,
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
  console.log(`   línea base: Meta decía ${BASE.entregados} entregado(s) el ${BASE.fecha}${BASE.alcance_verificado ? '' : '  ⚠ ALCANCE NO VERIFICADO'},`)
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

  /* EL GUION SE NIEGA A COTEJAR MIENTRAS EL ALCANCE NO ESTE VERIFICADO.
   *
   * No imprime un veredicto con una advertencia al lado: se para. Un cotejo con
   * una nota de «ojo, puede que la base sea de otro periodo» se lee como un
   * cotejo, y la nota se vuelve paisaje —que es justo el fallo que estamos
   * midiendo en el cron de vigilancia—. Si el numero no se puede usar, el
   * instrumento no da numero. */
  if (!BASE.alcance_verificado) {
    console.log('\n   ✗ NO SE PUEDE COTEJAR: el alcance de la línea base no está verificado.')
    console.log(`   El ${BASE.fecha} Meta mostraba ${BASE.entregados} entregado(s), pero su`)
    console.log('   pantalla tenia un filtro «Ultimos 7 dias» y no sabemos si la columna')
    console.log('   lo respeta. Si lo respeta, ese 1 es de una semana y no el historico.')
    console.log('\n   CÓMO SE CIERRA, en un clic: cambia el filtro a otro rango y mira si')
    console.log('   la cifra cambia. Si cambia, respeta el filtro. Es una prueba')
    console.log('   diferencial: no pregunta que significa la columna, le cambia una')
    console.log('   entrada y mira la salida.')
    console.log('\n   Después, pon alcance_verificado: true y corrige `entregados` al')
    console.log('   valor historico. Hasta entonces este guion no compara nada.')
    console.log('\n   ── Y HAY UN DENOMINADOR QUE CORREGIR ANTES ───────────────')
    console.log('   El cron de vigilancia manda sus alertas internas por ESTA MISMA')
    console.log('   plantilla: ~27 mensajes desde el 2026-09-07 que no son leads. Meta')
    console.log('   los cuenta como entregas de la plantilla de leads, asi que las dos')
    console.log('   lecturas NO estan contando lo mismo. Mientras eso siga asi, el')
    console.log('   contador de Meta no sirve de testigo por mucho que se aclare el')
    console.log('   periodo. Plantilla propia para alertas internas: esta en el tablero.')
    console.log('\n═════════════════════════════════════════════════════════════\n')
    process.exit(1)
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
