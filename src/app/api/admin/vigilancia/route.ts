import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { vigilarContenido } from '@/lib/vigilancia'

// Panel de vigilancia. GET lista el estado ALMACENADO (lo que el cron ha
// registrado, con su dedup). POST hace un escaneo EN VIVO sin persistir, para
// ver el estado actual sin esperar al cron (la tabla solo la escribe el cron).

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const filas = await prisma.vigilanciaHallazgo.findMany({
    orderBy: [{ resuelto: 'asc' }, { primero_visto: 'asc' }],
    take: 500,
  })
  const ahora = Date.now()
  const hallazgos = filas.map(f => ({
    id: f.id,
    clase: f.clase,
    detalle: f.detalle,
    resuelto: f.resuelto,
    primero_visto: f.primero_visto,
    ultimo_visto: f.ultimo_visto,
    dias_abierto: Math.floor((ahora - f.primero_visto.getTime()) / (24 * 60 * 60 * 1000)),
  }))
  return NextResponse.json({
    hallazgos,
    abiertos: hallazgos.filter(h => !h.resuelto).length,
    resueltos: hallazgos.filter(h => h.resuelto).length,
  })
}

export async function POST() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Escaneo en vivo, SIN escribir la tabla: es una foto del estado actual. La
  // reconciliación (y el aviso) siguen siendo exclusivos del cron.
  const r = await vigilarContenido()
  return NextResponse.json({
    hallazgos: r.hallazgos,
    comprobado: r.comprobado,
    sinComprobar: r.sinComprobar,
    fecha: r.fecha,
  })
}
