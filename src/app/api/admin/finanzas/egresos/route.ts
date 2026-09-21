import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import {
  categoriasParaCaptura, crearEgreso, listarEgresos, ErrorEgreso, type EntradaEgreso,
} from '@/lib/finanzas/egresos'

// Captura y listado de egresos. admin y contador: el contador registra y
// consulta; lo que no puede tocar son los parámetros fiscales del año.
const ROLES = ['admin', 'contador']

export async function GET(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const p = new URL(req.url).searchParams
  if (p.get('vista') === 'captura') {
    return NextResponse.json({ categorias: await categoriasParaCaptura() })
  }
  const porCompletarParam = p.get('por_completar')
  return NextResponse.json({
    egresos: await listarEgresos({
      naturaleza: p.get('naturaleza') ?? undefined,
      categoria_id: p.get('categoria') ?? undefined,
      por_completar: porCompletarParam === null ? undefined : porCompletarParam === '1',
    }),
  })
}

export async function POST(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: EntradaEgreso
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  try {
    return NextResponse.json(await crearEgreso(body, s.nombre), { status: 201 })
  } catch (e) {
    if (e instanceof ErrorEgreso) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[egresos] POST', e)
    return NextResponse.json({ error: 'No se pudo guardar el gasto.' }, { status: 500 })
  }
}
