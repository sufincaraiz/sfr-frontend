/**
 * GUARDA DE CUSTODIA — el estado de resultados FALLA, no omite.
 * =============================================================
 *
 * Un `MovimientoCustodia` marcado APLICADO declara que ya se causó: ese dinero
 * dejó de ser pasivo y pasó a ser ingreso. Si además no enlaza ningún
 * `Ingreso`, entonces hay dinero causado que NO está declarado en ninguna
 * parte — y un estado de resultados que lo omita en silencio da una utilidad
 * falsa y una base gravable corta.
 *
 * Por eso esto LANZA en vez de filtrar. Es la misma disciplina de las guardas
 * del build: un reporte que se emite con un hueco es peor que uno que no se
 * emite, porque el hueco no se ve.
 */
import { prisma } from '@/lib/prisma'

export class CustodiaSinIngreso extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'CustodiaSinIngreso'
  }
}

/**
 * Se llama ANTES de emitir el estado de resultados (y cualquier reporte que
 * sume ingresos). Si encuentra custodia causada sin ingreso, detiene el reporte.
 */
export async function exigirCustodiaCoherente(): Promise<void> {
  const huerfanos = await prisma.movimientoCustodia.findMany({
    where: { estado: 'APLICADO', ingreso_id: null },
    select: {
      id: true, concepto: true, valor: true, fecha_recibido: true,
      tercero: { select: { nombre: true } },
    },
    orderBy: { fecha_recibido: 'asc' },
  })
  if (huerfanos.length === 0) return

  const detalle = huerfanos
    .map(h => `«${h.concepto}» de ${h.tercero.nombre} por $${h.valor.toString()}`)
    .join('; ')

  throw new CustodiaSinIngreso(
    `${huerfanos.length} movimiento(s) de custodia están APLICADOS pero no enlazan ningún ingreso: ` +
    `es dinero que ya se causó y no está declarado. El reporte NO se emite hasta resolverlos, ` +
    `porque omitirlos daría una utilidad falsa y una base gravable corta. Pendientes: ${detalle}.`,
  )
}

/**
 * Saldo de dinero en custodia a una fecha: lo recibido y aún no entregado,
 * devuelto ni aplicado. Es un PASIVO, y nunca entra en la base gravable.
 */
export async function saldoEnCustodia(): Promise<{ total: string; movimientos: number }> {
  const abiertos = await prisma.movimientoCustodia.findMany({
    where: { estado: 'RECIBIDO' },
    select: { valor: true },
  })
  const total = abiertos.reduce((a, m) => a + Number(m.valor), 0)
  return { total: total.toFixed(2), movimientos: abiertos.length }
}
