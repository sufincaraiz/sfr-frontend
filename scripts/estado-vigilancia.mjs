#!/usr/bin/env node
/**
 * CUÁNTAS NOCHES LLEVA CADA PENDIENTE DE VIGILANCIA — SOLO LECTURA
 * ===============================================================
 *
 * ⚠ NO ESCRIBE NADA. Ni un `update`, ni un `create`, ni un fichero.
 *
 * Nace el 2026-10-23, cuando Leonel trajo la captura de su WhatsApp: el cron
 * lleva **43 noches** avisando de lo mismo y nadie lo ha corregido. Eso no es
 * un fallo del cron —hace exactamente lo que se le pidió— sino el caso con
 * número de una regla que el proyecto ya tenía escrita:
 *
 *   > Un recordatorio que no envejece se vuelve paisaje.
 *
 * Y la ironía está en el propio código: el comentario de `cron/vigilancia`
 * dice que el mensaje «tiene que envejecer con el pendiente», y lo hace —nombra
 * el más viejo, desde cuándo y cuántas noches—. **Envejecer el texto no
 * bastó.** Lo que no cambia es la FORMA: mismo canal, misma cadencia, mismo
 * aspecto en la pantalla del teléfono. A los 43 días el número que crece
 * dentro de una frase idéntica es tan invisible como la frase.
 *
 *     node --env-file=.env.local scripts/estado-vigilancia.mjs
 */
import { PrismaClient } from '@prisma/client'

const DIA_MS = 86_400_000
const DIAS_REAVISO = 3   // el mismo valor que usa reconciliarHallazgos

const prisma = new PrismaClient()
try {
  const abiertos = await prisma.vigilanciaHallazgo.findMany({
    where: { resuelto: false },
    orderBy: { primero_visto: 'asc' },
  })
  const resueltos = await prisma.vigilanciaHallazgo.count({ where: { resuelto: true } })

  const ahora = Date.now()
  const noches = h => Math.floor((ahora - new Date(h.primero_visto).getTime()) / DIA_MS)
  const dia = d => (d ? new Date(d).toISOString().slice(0, 10) : '—')

  console.log('\n══ PENDIENTES DE VIGILANCIA ══════════════════════════════════')
  console.log(`   abiertos: ${abiertos.length} · ya resueltos alguna vez: ${resueltos}\n`)

  if (abiertos.length === 0) {
    console.log('   No hay pendientes. El cron no debería estar avisando de nada.\n')
    process.exit(0)
  }

  console.log('   NOCHES  DESDE       ÚLT. AVISO  AVISOS~  CLASE / DETALLE')
  console.log('   ' + '─'.repeat(92))

  /* AVISOS~ lleva la tilde porque es una ESTIMACIÓN y no un recuento. La tabla
   * guarda solo `notificado_en` —la ÚLTIMA vez— y lo sobrescribe, así que el
   * número de envíos no está en ninguna parte. Se deduce de la cadencia: un
   * pendiente se re-avisa cada 3 días, luego son noches/3 + 1 por el aviso de
   * cuando nació. Si algún día hace falta el recuento exacto, hay que contar
   * filas en otra tabla; hoy no existe.
   *
   * ⚠ Y LA COLUMNA NO SE SUMA. La primera versión de este guión sumaba los
   * AVISOS~ de cada fila y llamaba «avisos enviados» al total, y está mal: el
   * cron manda **UN mensaje por corrida** que cubre todos los pendientes
   * vencidos a la vez, no uno por pendiente. Sumar la columna cuenta dos veces
   * los días en que vencían dos. El total de abajo es la UNIÓN de los días en
   * que algo vencía, que es lo que de verdad se corresponde con un mensaje. */
  const diasConAviso = new Set()
  let masViejo = 0
  const porClase = {}
  for (const h of abiertos) {
    const n = noches(h)
    const est = Math.floor(n / DIAS_REAVISO) + 1
    /* Los dias en que ESTE pendiente vencia, al conjunto comun: dia 0, 3, 6... */
    const nacio = Math.floor(new Date(h.primero_visto).getTime() / DIA_MS)
    for (let k = 0; k * DIAS_REAVISO <= n; k++) diasConAviso.add(nacio + k * DIAS_REAVISO)
    if (n > masViejo) masViejo = n
    porClase[h.clase] = (porClase[h.clase] || 0) + 1
    console.log(
      `   ${String(n).padStart(6)}  ${dia(h.primero_visto)}  ${dia(h.notificado_en).padEnd(10)}  ` +
      `${String(est).padStart(7)}  ${h.clase}: ${h.detalle.slice(0, 40)}`,
    )
  }
  console.log('   ' + '─'.repeat(92))

  console.log('\n   ── POR CLASE ─────────────────────────────────────────────')
  for (const [c, n] of Object.entries(porClase).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(4)} ${c}`)
  }

  const pasanDe7 = abiertos.filter(h => noches(h) > 7)
  console.log('\n   ── LO QUE DECIDE SI ESTO ES PAISAJE ──────────────────────')
  console.log(`   el más viejo lleva:            ${String(masViejo).padStart(4)} noches`)
  console.log(`   pendientes de más de 7 noches: ${String(pasanDe7.length).padStart(4)} de ${abiertos.length}`)
  console.log(`   MENSAJES estimados enviados:   ${String(diasConAviso.size).padStart(4)}   (union de dias con algo vencido,`)
  console.log('                                        no la suma de la columna AVISOS~)')
  console.log('\n   Cada uno de esos avisos salió por la plantilla `nuevo_lead_sfr`,')
  console.log('   que es la de LEADS. Así que además de ser paisaje, contaminan el')
  console.log('   contador de Meta que usamos como testigo externo del cotejo de')
  console.log('   avisos: ahí dentro hay entregas que no son de ningún lead.')

  console.log('\n═════════════════════════════════════════════════════════════\n')
} finally {
  await prisma.$disconnect()
}
