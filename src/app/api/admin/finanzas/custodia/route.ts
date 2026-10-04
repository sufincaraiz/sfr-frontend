import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { crearCustodia, listarCustodia, resumenDeCustodia, ErrorCustodia } from '@/lib/finanzas/custodia'
import { tiposParaCaptura } from '@/lib/finanzas/ingresos'
import type { CustodiaCapturada } from '@/lib/finanzas/captura-custodia'

// Dinero de terceros y anticipos sin causar. admin y contador.
const ROLES = ['admin', 'contador']

export async function GET(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const p = new URL(req.url).searchParams
  // Los tipos de servicio viajan con el listado: hacen falta para causar un
  // anticipo sin pedir otra vuelta al servidor.
  const [movimientos, resumen, tipos] = await Promise.all([
    listarCustodia(p.get('abiertos') === '1'),
    resumenDeCustodia(),
    tiposParaCaptura(),
  ])
  return NextResponse.json({ movimientos, resumen, tipos })
}

export async function POST(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: CustodiaCapturada
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  try {
    return NextResponse.json(await crearCustodia(body, s.nombre), { status: 201 })
  } catch (e) {
    if (e instanceof ErrorCustodia) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[custodia] POST', e)
    return NextResponse.json({ error: 'No se pudo registrar el dinero en custodia.' }, { status: 500 })
  }
}
