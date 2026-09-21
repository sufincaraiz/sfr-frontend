import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { leerNumero } from '@/lib/finanzas/numeros'
import {
  erroresDeCaptura, estaPorCompletar, ordenarPorUso,
  type EgresoCapturado, type Naturaleza,
} from '@/lib/finanzas/captura'
import { egresosDeResultado, gastoDeResultado } from '@/lib/finanzas/calculo'

/**
 * EGRESOS — captura rápida y listados.
 *
 * La naturaleza (quién paga al final) es distinta de la categoría (qué se
 * compró) y las dos se capturan. Un REEMBOLSABLE nace con
 * `estado_reembolso = PENDIENTE` y NO es gasto: sale de los reportes por
 * `egresosDeResultado()` y suma en «Por cobrar». Ver calculo.ts.
 */

export class ErrorEgreso extends Error {
  status: number
  constructor(mensaje: string, status = 400) {
    super(mensaje)
    this.name = 'ErrorEgreso'
    this.status = status
  }
}

const dec = (v: string) => new Prisma.Decimal(v)

export async function categoriasParaCaptura() {
  const desde = new Date(Date.now() - 90 * 86_400_000)
  const [categorias, uso] = await Promise.all([
    prisma.categoriaEgreso.findMany({ where: { activo: true } }),
    prisma.egreso.groupBy({ by: ['categoria_id'], where: { fecha: { gte: desde } }, _count: { _all: true } }),
  ])
  const usoPorCategoria = Object.fromEntries(uso.map(u => [u.categoria_id, u._count._all]))
  return ordenarPorUso(
    categorias.map(c => ({ id: c.id, nombre: c.nombre, orden: c.orden, es_deducible_por_defecto: c.es_deducible_por_defecto })),
    usoPorCategoria,
  )
}

/** Propiedades y clientes recientes para el selector, sin listas de 200 filas. */
export async function destinosRecientes(q: string) {
  const busca = q.trim()
  const [propiedades, terceros] = await Promise.all([
    prisma.property.findMany({
      where: busca
        ? { OR: [{ title: { contains: busca, mode: 'insensitive' } }, { slug: { contains: busca, mode: 'insensitive' } }] }
        : { status: { in: ['available', 'reserved'] } },
      select: { id: true, title: true, slug: true, municipality: { select: { name: true } } },
      orderBy: { updated_at: 'desc' },
      take: 12,
    }),
    prisma.tercero.findMany({
      where: { activo: true, ...(busca ? { nombre: { contains: busca, mode: 'insensitive' } } : {}) },
      select: { id: true, nombre: true, numero_documento: true, rol: true },
      orderBy: { updated_at: 'desc' },
      take: 12,
    }),
  ])
  return {
    propiedades: propiedades.map(p => ({ id: p.id, etiqueta: p.title ?? p.slug, detalle: p.municipality?.name ?? '' })),
    terceros: terceros.map(t => ({ id: t.id, etiqueta: t.nombre, detalle: t.numero_documento })),
  }
}

/**
 * Alta rápida de tercero desde la captura: solo el nombre. El documento real
 * llega después, así que se guarda un marcador y el tercero queda incompleto
 * a la vista en /admin/finanzas/terceros.
 */
export async function crearTerceroRapido(nombre: string, rol: 'CLIENTE' | 'PROVEEDOR') {
  const limpio = nombre.trim()
  if (limpio.length < 3) throw new ErrorEgreso('El nombre del tercero es demasiado corto.')
  const marcador = `SIN-DOC-${Date.now().toString(36).toUpperCase()}`
  const t = await prisma.tercero.create({
    data: {
      nombre: limpio,
      tipo_documento: 'CC',
      numero_documento: marcador,
      tipo_persona: 'NATURAL',
      rol,
      notas: 'Creado desde la captura rápida: faltan los datos del RUT (documento, régimen, declarante de renta).',
    },
    select: { id: true, nombre: true, numero_documento: true },
  })
  return { id: t.id, etiqueta: t.nombre, detalle: 'sin documento — completar' }
}

export interface EntradaEgreso extends EgresoCapturado {
  es_deducible?: boolean
}

export async function crearEgreso(e: EntradaEgreso, por: string) {
  const errores = erroresDeCaptura(e)
  if (errores.length) throw new ErrorEgreso(errores.join(' '))

  const valor = leerNumero(e.valor, 'pesos', 'Valor del gasto')
  if (valor === null) throw new ErrorEgreso('Falta el valor.')
  if (dec(valor).lte(0)) throw new ErrorEgreso('El valor tiene que ser mayor que cero.')

  const categoria = await prisma.categoriaEgreso.findUnique({ where: { id: e.categoria_id } })
  if (!categoria) throw new ErrorEgreso('Esa categoría no existe.', 404)

  const naturaleza = e.naturaleza as Naturaleza
  const fecha = e.fecha ? new Date(e.fecha) : new Date()
  if (Number.isNaN(fecha.getTime())) throw new ErrorEgreso('Fecha inválida.')

  const creado = await prisma.egreso.create({
    data: {
      categoria_id: categoria.id,
      naturaleza,
      fecha,
      // La descripción es opcional en la calle: si no viene, queda el nombre de
      // la categoría y el egreso se marca POR COMPLETAR.
      descripcion: String(e.descripcion ?? '').trim() || categoria.nombre,
      valor_base: dec(valor),
      // Hoy no somos responsables de IVA: el IVA pagado es costo y va dentro
      // del valor. Cuando el año sea responsable, se capturará aparte.
      iva_pagado: new Prisma.Decimal(0),
      es_deducible: e.es_deducible ?? categoria.es_deducible_por_defecto,
      property_id: naturaleza === 'DE_OPERACION' ? e.property_id ?? null : null,
      reembolsa_tercero_id: naturaleza === 'REEMBOLSABLE' ? e.reembolsa_tercero_id ?? null : null,
      estado_reembolso: naturaleza === 'REEMBOLSABLE' ? 'PENDIENTE' : null,
      tercero_id: e.tercero_id ?? null,
      numero_factura_proveedor: String(e.numero_factura_proveedor ?? '').trim() || null,
      metodo_pago: String(e.metodo_pago ?? '').trim() || null,
      soporte_public_id: e.soporte_public_id ?? null,
      por_completar: estaPorCompletar(e),
      registrado_por: por,
    },
    select: { id: true, valor_base: true, por_completar: true, naturaleza: true },
  })
  return {
    id: creado.id,
    valor: creado.valor_base.toString(),
    por_completar: creado.por_completar,
    naturaleza: creado.naturaleza,
    categoria: categoria.nombre,
  }
}

export async function listarEgresos(f: { naturaleza?: string; categoria_id?: string; por_completar?: boolean; limite?: number }) {
  const egresos = await prisma.egreso.findMany({
    where: {
      ...(f.naturaleza ? { naturaleza: f.naturaleza as Naturaleza } : {}),
      ...(f.categoria_id ? { categoria_id: f.categoria_id } : {}),
      ...(f.por_completar === undefined ? {} : { por_completar: f.por_completar }),
    },
    select: {
      id: true, fecha: true, descripcion: true, valor_base: true, naturaleza: true,
      estado_reembolso: true, fecha_reembolso: true, por_completar: true, soporte_public_id: true,
      categoria: { select: { nombre: true } },
      property: { select: { title: true, slug: true } },
      reembolsaTercero: { select: { nombre: true } },
      tercero: { select: { nombre: true } },
    },
    orderBy: { fecha: 'desc' },
    take: f.limite ?? 100,
  })
  return egresos.map(e => ({
    id: e.id,
    fecha: e.fecha.toISOString(),
    descripcion: e.descripcion,
    valor: e.valor_base.toString(),
    naturaleza: e.naturaleza,
    estado_reembolso: e.estado_reembolso,
    fecha_reembolso: e.fecha_reembolso?.toISOString() ?? null,
    por_completar: e.por_completar,
    tiene_recibo: !!e.soporte_public_id,
    categoria: e.categoria.nombre,
    propiedad: e.property?.title ?? e.property?.slug ?? null,
    reembolsa: e.reembolsaTercero?.nombre ?? null,
    proveedor: e.tercero?.nombre ?? null,
  }))
}

/** Cuentas por cobrar: reembolsables que el cliente todavía no ha devuelto. */
export async function porCobrar() {
  const filas = await prisma.egreso.findMany({
    where: { naturaleza: 'REEMBOLSABLE', estado_reembolso: 'PENDIENTE' },
    select: {
      id: true, fecha: true, descripcion: true, valor_base: true,
      categoria: { select: { nombre: true } },
      reembolsaTercero: { select: { nombre: true } },
      property: { select: { title: true, slug: true } },
    },
    orderBy: { fecha: 'asc' },
  })
  return filas.map(f => ({
    id: f.id,
    fecha: f.fecha.toISOString(),
    descripcion: f.descripcion,
    valor: f.valor_base.toString(),
    categoria: f.categoria.nombre,
    cliente: f.reembolsaTercero?.nombre ?? '—',
    propiedad: f.property?.title ?? f.property?.slug ?? null,
  }))
}

/** El cliente devolvió la plata. NO es un ingreso: cancela la cuenta por cobrar. */
export async function marcarReembolsado(id: string, por: string) {
  const e = await prisma.egreso.findUnique({ where: { id }, select: { naturaleza: true, estado_reembolso: true } })
  if (!e) throw new ErrorEgreso('Ese gasto no existe.', 404)
  if (e.naturaleza !== 'REEMBOLSABLE') throw new ErrorEgreso('Ese gasto no es reembolsable.', 409)
  if (e.estado_reembolso !== 'PENDIENTE') throw new ErrorEgreso('Esa cuenta ya estaba saldada.', 409)
  await prisma.egreso.update({
    where: { id },
    data: {
      estado_reembolso: 'REEMBOLSADO',
      fecha_reembolso: new Date(),
      motivo_reclasificacion: null,
      reclasificado_por: por,
      reclasificado_en: new Date(),
    },
  })
}

/**
 * El cliente no pagó y lo absorbe el negocio. A partir de aquí SÍ es gasto, y
 * por eso queda el rastro completo: de dónde venía, quién, cuándo y por qué.
 */
export async function asumirComoGasto(id: string, motivo: string, por: string) {
  const texto = motivo.trim()
  if (texto.length < 5) throw new ErrorEgreso('Escribe el motivo: queda en el rastro de auditoría.')
  const e = await prisma.egreso.findUnique({ where: { id }, select: { naturaleza: true, estado_reembolso: true } })
  if (!e) throw new ErrorEgreso('Ese gasto no existe.', 404)
  if (e.naturaleza !== 'REEMBOLSABLE') throw new ErrorEgreso('Ese gasto no es reembolsable.', 409)
  if (e.estado_reembolso !== 'PENDIENTE') throw new ErrorEgreso('Esa cuenta ya estaba saldada.', 409)
  await prisma.egreso.update({
    where: { id },
    data: {
      naturaleza: 'DE_OPERACION',
      estado_reembolso: 'ASUMIDO',
      reclasificado_de: 'REEMBOLSABLE',
      reclasificado_por: por,
      reclasificado_en: new Date(),
      motivo_reclasificacion: texto,
    },
  })
}

/**
 * Resumen del mes para el hub. Los gastos se suman con `egresosDeResultado`:
 * un reembolsable NO puede entrar aquí, y si entrara, `gastoDeResultado`
 * lanzaría en lugar de sumarlo callado.
 */
export async function resumenDelMes() {
  const ahora = new Date()
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const [egresosMes, pendientes, cobrar] = await Promise.all([
    prisma.egreso.findMany({
      where: { fecha: { gte: desde } },
      select: { valor_base: true, iva_pagado: true, naturaleza: true },
    }),
    prisma.egreso.count({ where: { por_completar: true } }),
    prisma.egreso.aggregate({
      where: { naturaleza: 'REEMBOLSABLE', estado_reembolso: 'PENDIENTE' },
      _sum: { valor_base: true }, _count: { _all: true },
    }),
  ])
  const gastos = egresosDeResultado(egresosMes)
    .reduce((s, e) => s.plus(gastoDeResultado({ ...e, naturaleza: e.naturaleza }, false)), new Prisma.Decimal(0))
  return {
    mes: desde.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
    gastos: gastos.toString(),
    movimientos: egresosMes.length,
    porCompletar: pendientes,
    porCobrar: { total: (cobrar._sum.valor_base ?? new Prisma.Decimal(0)).toString(), cantidad: cobrar._count._all },
  }
}
