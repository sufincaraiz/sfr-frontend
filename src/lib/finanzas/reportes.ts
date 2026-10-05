import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { egresosDeResultado, gastoDeResultado } from '@/lib/finanzas/calculo'
import { exigirCustodiaCoherente } from '@/lib/finanzas/custodia'
import { estadoDelAnio } from '@/lib/finanzas/ingresos'

/**
 * LOS TRES REPORTES QUE NO DEPENDEN DE TARIFAS
 * ============================================
 *
 * Estado de resultados simple, gastos por categoría e ingresos por línea de
 * servicio. Ninguno necesita UVT ni tarifas de retención, así que funcionan
 * con el año fiscal todavía en borrador. Los de retenciones, IVA e ICA no
 * están aquí a propósito: con el año en borrador solo podrían mostrar ceros, y
 * un cero que parece un dato es peor que una pantalla que dice «falta esto».
 *
 * DOS GUARDAS ANTES DE SUMAR UN SOLO PESO:
 *
 * 1. `exigirCustodiaCoherente()` — si hay custodia APLICADA sin ingreso
 *    enlazado, hay plata causada sin declarar y el reporte NO se emite.
 * 2. `gastoDeResultado()` — un egreso REEMBOLSABLE lanza en vez de sumarse:
 *    es una cuenta por cobrar, no un gasto.
 *
 * Las dos están probadas rompiéndolas en scripts/probar-finanzas.mjs.
 */

export interface Periodo { desde: Date; hasta: Date }

/** Periodo por defecto: el año en curso, que es la unidad de la declaración. */
export function periodoDelAnio(anio = new Date().getFullYear()): Periodo {
  return { desde: new Date(anio, 0, 1), hasta: new Date(anio, 11, 31, 23, 59, 59) }
}

export function periodoDelMes(anio: number, mes: number): Periodo {
  return { desde: new Date(anio, mes - 1, 1), hasta: new Date(anio, mes, 0, 23, 59, 59) }
}

const pct = (parte: Prisma.Decimal, total: Prisma.Decimal): number =>
  total.isZero() ? 0 : Number(parte.div(total).mul(100).toFixed(1))

/**
 * INGRESOS POR LÍNEA DE SERVICIO — qué sostiene el negocio.
 *
 * Se suma `valor_base`, que ya es la base gravable decidida al registrar: con
 * `facturamos_total` el reparto de una comisión compartida ya quedó resuelto,
 * así que aquí no se vuelve a interpretar nada.
 */
export async function ingresosPorLinea(p: Periodo) {
  await exigirCustodiaCoherente()

  const filas = await prisma.ingreso.findMany({
    where: { fecha_causacion: { gte: p.desde, lte: p.hasta }, estado: { not: 'ANULADO' } },
    select: {
      valor_base: true, fecha_recaudo: true,
      tipoServicio: { select: { id: true, label: true } },
    },
  })

  const porTipo = new Map<string, { label: string; total: Prisma.Decimal; cantidad: number; cobrado: Prisma.Decimal }>()
  for (const f of filas) {
    const k = f.tipoServicio.id
    const e = porTipo.get(k) ?? { label: f.tipoServicio.label, total: new Prisma.Decimal(0), cantidad: 0, cobrado: new Prisma.Decimal(0) }
    e.total = e.total.plus(f.valor_base)
    e.cantidad += 1
    if (f.fecha_recaudo) e.cobrado = e.cobrado.plus(f.valor_base)
    porTipo.set(k, e)
  }
  const total = [...porTipo.values()].reduce((a, e) => a.plus(e.total), new Prisma.Decimal(0))

  return {
    total: total.toString(),
    movimientos: filas.length,
    lineas: [...porTipo.entries()]
      .map(([id, e]) => ({
        id,
        linea: e.label,
        total: e.total.toString(),
        cantidad: e.cantidad,
        /** Cuánto de esa línea ya entró en caja. */
        cobrado: e.cobrado.toString(),
        porcentaje: pct(e.total, total),
      }))
      .sort((a, b) => Number(b.total) - Number(a.total)),
  }
}

/** GASTOS POR CATEGORÍA. Los reembolsables quedan fuera: no son gasto. */
export async function gastosPorCategoria(p: Periodo) {
  const responsableIva = (await estadoDelAnio(p.desde.getFullYear())).responsable_iva

  const filas = await prisma.egreso.findMany({
    where: { fecha: { gte: p.desde, lte: p.hasta } },
    select: {
      valor_base: true, iva_pagado: true, naturaleza: true, es_deducible: true,
      categoria: { select: { id: true, nombre: true } },
    },
  })

  const porCategoria = new Map<string, { nombre: string; total: Prisma.Decimal; cantidad: number; noDeducible: Prisma.Decimal }>()
  let total = new Prisma.Decimal(0)
  for (const f of egresosDeResultado(filas)) {
    // Lanza si se colara un reembolsable: la guarda, no un filtro silencioso.
    const costo = gastoDeResultado({ ...f, naturaleza: f.naturaleza }, responsableIva ?? false)
    const k = f.categoria.id
    const e = porCategoria.get(k) ?? { nombre: f.categoria.nombre, total: new Prisma.Decimal(0), cantidad: 0, noDeducible: new Prisma.Decimal(0) }
    e.total = e.total.plus(costo)
    e.cantidad += 1
    if (!f.es_deducible) e.noDeducible = e.noDeducible.plus(costo)
    porCategoria.set(k, e)
    total = total.plus(costo)
  }

  return {
    total: total.toString(),
    movimientos: filas.filter(f => f.naturaleza !== 'REEMBOLSABLE').length,
    categorias: [...porCategoria.entries()]
      .map(([id, e]) => ({
        id,
        categoria: e.nombre,
        total: e.total.toString(),
        cantidad: e.cantidad,
        /** Lo que el contador tendrá que rechazar al depurar la renta. */
        no_deducible: e.noDeducible.toString(),
        porcentaje: pct(e.total, total),
      }))
      .sort((a, b) => Number(b.total) - Number(a.total)),
  }
}

/** ESTADO DE RESULTADOS SIMPLE: ingresos menos gastos. Sin impuestos. */
export async function estadoDeResultados(p: Periodo) {
  const [ing, gas] = await Promise.all([ingresosPorLinea(p), gastosPorCategoria(p)])
  const ingresos = new Prisma.Decimal(ing.total)
  const gastos = new Prisma.Decimal(gas.total)
  return {
    ingresos: ingresos.toString(),
    gastos: gastos.toString(),
    resultado: ingresos.sub(gastos).toString(),
    margen: ingresos.isZero() ? 0 : Number(ingresos.sub(gastos).div(ingresos).mul(100).toFixed(1)),
    lineas: ing.lineas,
    categorias: gas.categorias,
    movimientos: { ingresos: ing.movimientos, gastos: gas.movimientos },
  }
}
