import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { anioParaPantalla, guardarBorrador, ErrorParametros, type EntradaGuardado } from '@/lib/finanzas/parametros'

// Parámetros fiscales: SOLO admin (el contador ve finanzas, no edita tarifas).

function anioDe(req: NextRequest): number {
  const a = Number(new URL(req.url).searchParams.get('anio'))
  return Number.isInteger(a) && a >= 2000 && a <= 2100 ? a : new Date().getFullYear()
}

export async function GET(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json(await anioParaPantalla(anioDe(req)))
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: EntradaGuardado
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  try {
    await guardarBorrador(body, session.nombre)
    return NextResponse.json(await anioParaPantalla(body.anio))
  } catch (err) {
    if (err instanceof ErrorParametros) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[finanzas/parametros] error guardando:', err)
    return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
  }
}
