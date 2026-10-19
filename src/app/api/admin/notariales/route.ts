import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sembrarAnio, anioParaPantalla, asegurarFuentes } from '@/lib/notariales/panel'
import { transcripcion, respuestaDeError } from '@/lib/notariales/api'
import { hoyEnColombia } from '@/lib/dia-colombia'

// Parámetros notariales: SOLO admin. El contador no carga tarifas de notaría.
const ROLES = ['admin']

export async function GET() {
  if (!(await requireRole(ROLES))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const anios = await prisma.anioNotarial.findMany({
    orderBy: { anio: 'desc' },
    select: { anio: true, estado: true, cerrado: true, version: true, activado_en: true, updated_at: true },
  })
  // EL AÑO SUGERIDO LO DECIDE EL SERVIDOR, no el navegador.
  //
  // La pantalla lo proponía con `new Date().getFullYear()` del cliente, o sea
  // con la zona del visitante. El año tarifario de una resolución colombiana es
  // un hecho sobre Colombia, no sobre dónde esté quien mira: si el titular abre
  // el panel desde otra zona, el año propuesto no puede cambiar por eso.
  return NextResponse.json({ anios, anio_sugerido: Number(hoyEnColombia().slice(0, 4)) })
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
    await sembrarAnio(prisma, Number(anio), s.email)
    await asegurarFuentes(prisma)
    return NextResponse.json(await anioParaPantalla(prisma, Number(anio), transcrita))
  } catch (e) {
    return respuestaDeError(e, 'POST /api/admin/notariales')
  }
}
