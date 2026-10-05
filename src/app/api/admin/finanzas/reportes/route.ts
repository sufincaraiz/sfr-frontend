import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { estadoDeResultados, periodoDelAnio, periodoDelMes } from '@/lib/finanzas/reportes'
import { CustodiaSinIngreso } from '@/lib/finanzas/custodia'
import { ErrorNaturalezaEgreso } from '@/lib/finanzas/calculo'

// Los tres reportes que no dependen de tarifas. Los de retenciones, IVA e ICA
// no existen todavía: con el año en borrador solo mostrarían ceros.
const ROLES = ['admin', 'contador']

export async function GET(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const p = new URL(req.url).searchParams
  const anio = Number(p.get('anio')) || new Date().getFullYear()
  const mes = Number(p.get('mes')) || 0
  const periodo = mes >= 1 && mes <= 12 ? periodoDelMes(anio, mes) : periodoDelAnio(anio)

  try {
    return NextResponse.json({
      anio, mes,
      desde: periodo.desde.toISOString().slice(0, 10),
      hasta: periodo.hasta.toISOString().slice(0, 10),
      ...(await estadoDeResultados(periodo)),
    })
  } catch (e) {
    // Las dos guardas hablan con el usuario: el reporte NO se emite y se dice
    // exactamente qué hay que resolver antes.
    if (e instanceof CustodiaSinIngreso || e instanceof ErrorNaturalezaEgreso) {
      return NextResponse.json({ error: e.message, guarda: e.name }, { status: 409 })
    }
    console.error('[reportes] GET', e)
    return NextResponse.json({ error: 'No se pudo calcular el reporte.' }, { status: 500 })
  }
}
