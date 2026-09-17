import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { verificarActivable } from '@/lib/finanzas/calculo'
import {
  activarAnio, anioParaPantalla, copiarDelAnioAnterior, leerAnio, volverABorrador, ErrorParametros,
} from '@/lib/finanzas/parametros'

// Acciones sobre un año fiscal: copiar | activar | borrador. SOLO admin.

export async function POST(req: NextRequest, { params }: { params: Promise<{ accion: string }> }) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { accion } = await params
  let anio: number
  try {
    anio = Number((await req.json()).anio)
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return NextResponse.json({ error: 'Año inválido.' }, { status: 400 })
  }

  try {
    if (accion === 'copiar') {
      const r = await copiarDelAnioAnterior(anio, session.nombre)
      return NextResponse.json({ ...(await anioParaPantalla(anio)), copia: r })
    }

    if (accion === 'activar') {
      const p = await leerAnio(anio)
      if (!p) return NextResponse.json({ error: `No existe el año ${anio}.` }, { status: 404 })
      if (p.estado === 'ACTIVO') return NextResponse.json({ error: `${anio} ya está activo.` }, { status: 409 })
      // La validación se hace SOBRE LO GUARDADO, nunca sobre lo que diga el cliente.
      const r = verificarActivable(p)
      if (!r.listo) {
        return NextResponse.json({ error: 'Faltan datos para activar.', pendientes: r.pendientes }, { status: 409 })
      }
      // `activarAnio` solo acepta el parámetro marcado que devuelve verificarActivable.
      await activarAnio(r.parametro, session.nombre)
      return NextResponse.json(await anioParaPantalla(anio))
    }

    if (accion === 'borrador') {
      await volverABorrador(anio)
      return NextResponse.json(await anioParaPantalla(anio))
    }

    return NextResponse.json({ error: 'Acción desconocida.' }, { status: 404 })
  } catch (err) {
    if (err instanceof ErrorParametros) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error(`[finanzas/parametros/${accion}] error:`, err)
    return NextResponse.json({ error: 'No se pudo completar la acción.' }, { status: 500 })
  }
}
