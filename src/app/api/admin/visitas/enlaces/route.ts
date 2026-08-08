import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { SITE_URL } from '@/lib/site'
import {
  DIAS_VIGENCIA,
  estadoDe,
  generarToken,
  hashearPin,
  validarPin,
} from '@/lib/visitantes'

// Enlaces privados para dueños. Solo rol admin: quien pueda crear uno de estos
// está abriendo acceso a cédulas.
//
// El token en claro se devuelve UNA sola vez, al crearlo, dentro de la URL lista
// para copiar. En el listado nunca se devuelve: si el admin lo pierde, regenera.
// Guardarlo visible en una tabla sería dejar la parte secreta a la vista de
// cualquiera que abra el panel.

export const dynamic = 'force-dynamic'

// ─── Listado ─────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const enlaces = await prisma.enlaceVisitantes.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, propiedadId: true, createdAt: true, expiraAt: true,
      revocado: true, ultimoAcceso: true, intentosFallidos: true,
      // `token` y `pinHash` quedan fuera a propósito.
    },
  })

  return NextResponse.json({
    enlaces: enlaces.map(e => ({
      id: e.id,
      propiedadId: e.propiedadId,
      createdAt: e.createdAt.toISOString(),
      expiraAt: e.expiraAt.toISOString(),
      ultimoAcceso: e.ultimoAcceso?.toISOString() ?? null,
      intentosFallidos: e.intentosFallidos,
      estado: estadoDe(e),
    })),
  })
}

// ─── Creación ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { propiedadId?: string; pin?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const propiedadId = body.propiedadId?.trim()
  if (!propiedadId) return NextResponse.json({ error: 'Falta la propiedad.' }, { status: 400 })

  const errorPin = validarPin(body.pin)
  if (errorPin) return NextResponse.json({ error: errorPin }, { status: 400 })

  const propiedad = await prisma.property.findUnique({
    where: { id: propiedadId },
    select: { id: true, title: true },
  })
  if (!propiedad) return NextResponse.json({ error: 'La propiedad no existe.' }, { status: 404 })

  const token = generarToken()
  const expiraAt = new Date(Date.now() + DIAS_VIGENCIA * 24 * 60 * 60 * 1000)

  const enlace = await prisma.enlaceVisitantes.create({
    data: {
      propiedadId: propiedad.id,
      token,
      pinHash: await hashearPin(body.pin as string),
      expiraAt,
    },
    select: { id: true, createdAt: true, expiraAt: true },
  })

  // Rastro de quién abrió el acceso, sin el token ni el PIN.
  console.log(`[admin/visitas/enlaces] ${session.email} generó el enlace ${enlace.id} para la propiedad ${propiedad.id}.`)

  return NextResponse.json({
    ok: true,
    id: enlace.id,
    url: `${SITE_URL}/visitantes/${token}`,
    expiraAt: enlace.expiraAt.toISOString(),
  })
}
