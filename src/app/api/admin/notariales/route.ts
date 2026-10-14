import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sembrarAnio, anioParaPantalla, asegurarFuentes } from '@/lib/notariales/panel'
import { transcripcion, respuestaDeError } from '@/lib/notariales/api'

// Parámetros notariales: SOLO admin. El contador no carga tarifas de notaría.
const ROLES = ['admin']

export async function GET() {
  if (!(await requireRole(ROLES))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const anios = await prisma.anioNotarial.findMany({
    orderBy: { anio: 'desc' },
    select: { anio: true, estado: true, cerrado: true, version: true, activado_en: true, updated_at: true },
  })
  return NextResponse.json({ anios })
}

export async function POST(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const { anio } = await req.json()
    // LO QUE HACE FALTA, ANTES DE ESCRIBIR. La transcripción se lee primero a
    // propósito: el 2026-10-14 se sembró el año y después falló esta lectura,
    // así que la respuesta dijo «no se pudo crear» de algo que SÍ se creó. Si
    // algo va a faltar, que falte antes de tocar la base.
    const transcrita = transcripcion()
    await sembrarAnio(prisma, Number(anio), s.email ?? 'admin')
    await asegurarFuentes(prisma)
    return NextResponse.json(await anioParaPantalla(prisma, Number(anio), transcrita))
  } catch (e) {
    return respuestaDeError(e, 'POST /api/admin/notariales')
  }
}
