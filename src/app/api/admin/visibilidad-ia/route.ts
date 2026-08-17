/**
 * Tablero de visibilidad en IA — registro y lectura.
 *
 * El registro tiene que ser de DOS CLICS. Quien mide está con seis pestañas
 * abiertas repitiendo once consultas: si el formulario es largo, la medición no
 * se hace. Por eso el POST acepta lo mínimo —motor, consulta, aparece— y todo
 * lo demás es opcional.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { CONSULTAS, MOTORES, CONSULTA_IDS, MOTOR_IDS } from '@/lib/visibilidad-ia'

const Schema = z.object({
  // Se validan contra el catálogo EN CÓDIGO: una medición con una consulta que
  // no es de control no sirve para el histórico.
  consulta_id:  z.string().refine(v => CONSULTA_IDS.includes(v), 'Consulta fuera del catálogo de control'),
  motor:        z.string().refine(v => MOTOR_IDS.includes(v), 'Motor desconocido'),
  aparece:      z.boolean(),
  posicion:     z.number().int().min(1).max(50).nullable().optional(),
  competidores: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  descripcion:  z.string().trim().max(4000).optional(),
  notas:        z.string().trim().max(2000).optional(),
  version_nota: z.string().trim().max(300).optional(),
})

/**
 * Commit desplegado, capturado por el SERVIDOR.
 *
 * Se toma solo en vez de pedirlo: quien mide está con seis pestañas abiertas y
 * no va a copiar un hash. Sin este dato, dentro de tres meses no se sabe contra
 * qué versión del sitio se midió cada fila.
 */
function commitDesplegado(): string | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  return sha ? sha.slice(0, 7) : null
}

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const mediciones = await prisma.medicionIA.findMany({
    orderBy: { medido_en: 'desc' },
    take: 1000,
  })

  return NextResponse.json({
    consultas: CONSULTAS,
    motores:   MOTORES,
    mediciones: mediciones.map(m => ({ ...m, medido_en: m.medido_en.toISOString() })),
  })
}

export async function POST(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalle: parsed.error.issues }, { status: 400 })
  }
  const d = parsed.data

  const m = await prisma.medicionIA.create({
    data: {
      consulta_id:  d.consulta_id,
      motor:        d.motor,
      aparece:      d.aparece,
      // Una posición sin aparición es una contradicción: se descarta en vez de
      // guardarse y ensuciar el histórico.
      posicion:     d.aparece ? (d.posicion ?? null) : null,
      competidores: d.competidores ?? [],
      descripcion:  d.descripcion || null,
      notas:        d.notas || null,
      medido_por:   session.email ?? null,
      commit_sitio: commitDesplegado(),
      version_nota: d.version_nota || null,
    },
  })

  return NextResponse.json({ ok: true, id: m.id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  await prisma.medicionIA.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
