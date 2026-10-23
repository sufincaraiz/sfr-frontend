#!/usr/bin/env node
/**
 * LEADS DE LOS ÚLTIMOS 60 DÍAS Y SI HUBO AVISO — SOLO LECTURA
 * ==========================================================
 *
 * ⚠ NO ESCRIBE NADA. Ni un `update`, ni un `create`, ni un fichero.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA RESPUESTA A «¿CUÁLES TIENEN CONSTANCIA DE QUE EL AVISO SALIÓ?» ES NINGUNO,
 * Y NO ES UNA SUPOSICIÓN: ES UNA PROPIEDAD DEL ESQUEMA.
 *
 * El modelo `Lead` no tiene ningún campo que hable de la notificación —no hay
 * `avisoEnviadoAt`, ni `avisoError`, ni nada equivalente—. El envío se hacía
 * (cuando se hacía) con un `await` cuyo resultado se descartaba. Así que esta
 * consulta NO puede distinguir «avisado» de «no avisado»: la lista es todos.
 *
 * Lo que sí puede hacer, y es lo que decide a quién llamar primero, es separar
 * los leads por el CAMINO por el que entraron, porque los caminos sí difieren:
 *
 *   · channel «web», «propiedad», «vender-finca»…  → POST /api/leads
 *     Esa ruta NO contiene ninguna llamada de aviso. Nunca la tuvo.
 *     → aviso: IMPOSIBLE. No falló: no existía.
 *
 *   · channel «mac» / lead con `summary`            → agente Mac (tools.ts)
 *     Ese camino sí llama a `enviarAlertaLeadWhatsApp`, y solo si hay resumen.
 *     → aviso: INTENTADO, resultado desconocido (no se guarda).
 *
 * De ahí las dos columnas del informe. «INTENTADO» no significa entregado.
 *
 *     node --env-file=.env.local scripts/leads-sin-aviso.mjs [dias]
 */
import { PrismaClient } from '@prisma/client'

const DIAS = Number(process.argv[2]) || 60
const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000)

const prisma = new PrismaClient()
try {
  const leads = await prisma.lead.findMany({
    where: { created_at: { gte: desde } },
    orderBy: { created_at: 'desc' },
    select: {
      id: true, created_at: true, name: true, phone: true, email: true,
      channel: true, source: true, status: true, pipeline: true,
      summary: true, summaryAt: true, lastContactAt: true,
      property: { select: { slug: true } },
    },
  })

  /* El camino por el que entró decide si hubo intento de aviso. Un lead del
   * agente Mac se reconoce por tener `summary`/`summaryAt`: es el agente quien
   * los escribe, y el aviso solo se intenta `if (resumen)`. */
  const porMac = l => Boolean(l.summary || l.summaryAt) || l.channel === 'mac'

  const fecha = d => new Date(d).toISOString().slice(0, 16).replace('T', ' ')
  const col = (s, n) => String(s ?? '').slice(0, n).padEnd(n)

  console.log(`\n══ LEADS DE LOS ÚLTIMOS ${DIAS} DÍAS ═══════════════════════════════`)
  console.log(`   desde ${desde.toISOString().slice(0, 10)} · ${leads.length} leads\n`)

  if (leads.length === 0) {
    console.log('   No hay leads en la ventana.\n')
    process.exit(0)
  }

  console.log('   ⚠ NINGUNO tiene constancia de aviso entregado: el modelo Lead')
  console.log('     no guarda ese dato. La columna AVISO dice lo que el CÓDIGO')
  console.log('     hace en ese camino, no lo que Meta contestó.\n')

  console.log('  ' + col('FECHA', 17) + col('NOMBRE', 26) + col('TELÉFONO', 16) +
    col('CANAL', 15) + col('ESTADO', 10) + 'AVISO')
  console.log('  ' + '─'.repeat(98))

  let imposibles = 0
  let intentados = 0
  for (const l of leads) {
    const mac = porMac(l)
    if (mac) intentados++; else imposibles++
    console.log('  ' + col(fecha(l.created_at), 17) + col(l.name, 26) +
      col(l.phone, 16) + col(l.channel, 15) + col(l.status, 10) +
      (mac ? 'intentado, resultado desconocido' : 'IMPOSIBLE — la ruta no avisa'))
  }

  console.log('  ' + '─'.repeat(98))
  console.log(`\n   ── A QUIÉN HAY QUE LLAMAR ───────────────────────────────────`)
  console.log(`   ${String(imposibles).padStart(4)} por formulario web  → NUNCA se avisó. Llamar a todos.`)
  console.log(`   ${String(intentados).padStart(4)} por el agente Mac   → se intentó; si Meta lo rechazó,`)
  console.log(`        tampoco llegó, y no hay forma de saberlo desde la base.`)
  console.log(`   ${String(leads.length).padStart(4)} en total`)

  /* Sin contacto registrado: el subconjunto más urgente. `lastContactAt` sí
   * existe, y un lead sin contacto Y sin aviso es uno que nadie atendió. */
  const nadie = leads.filter(l => !l.lastContactAt && l.status === 'new')
  console.log(`\n   ${String(nadie.length).padStart(4)} sin NINGÚN contacto registrado y en estado «new»`)
  console.log('        ← éstos primero: nadie los llamó y nadie fue avisado.')

  console.log('\n   ── POR CANAL ────────────────────────────────────────────────')
  const porCanal = {}
  for (const l of leads) porCanal[l.channel] = (porCanal[l.channel] || 0) + 1
  for (const [c, n] of Object.entries(porCanal).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(4)} ${c}`)
  }

  console.log('\n   ── EL PRIMERO Y EL ÚLTIMO DE LA VENTANA ─────────────────────')
  console.log(`   más antiguo: ${fecha(leads[leads.length - 1].created_at)}`)
  console.log(`   más reciente: ${fecha(leads[0].created_at)}`)

  console.log('\n═════════════════════════════════════════════════════════════\n')
} finally {
  await prisma.$disconnect()
}
