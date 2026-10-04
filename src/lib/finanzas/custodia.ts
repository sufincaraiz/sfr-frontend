import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { leerNumero } from '@/lib/finanzas/numeros'
import {
  colorDeCustodia, diasEnCustodia, erroresDeCustodia, faltantesDeCustodia, motivoDeEspera,
  type CustodiaCapturada, type NaturalezaCustodia,
} from '@/lib/finanzas/captura-custodia'
import { crearIngreso } from '@/lib/finanzas/ingresos'

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

// ─── Captura y ciclo de vida ─────────────────────────────────────────────────

export class ErrorCustodia extends Error {
  status: number
  constructor(mensaje: string, status = 400) {
    super(mensaje)
    this.name = 'ErrorCustodia'
    this.status = status
  }
}

const pesos = (v: unknown, campo: string): Prisma.Decimal => {
  const n = leerNumero(v, 'pesos', campo)
  if (n === null) throw new ErrorCustodia(`Falta ${campo}.`)
  return new Prisma.Decimal(n)
}

export async function crearCustodia(c: CustodiaCapturada, por: string) {
  const errores = erroresDeCustodia(c)
  if (errores.length) throw new ErrorCustodia(errores.join(' '))

  const m = await prisma.movimientoCustodia.create({
    data: {
      naturaleza: c.naturaleza as NaturalezaCustodia,
      concepto: String(c.concepto).trim(),
      tercero_id: c.tercero_id!,
      property_id: c.property_id ?? null,
      fecha_recibido: c.fecha_recibido ? new Date(c.fecha_recibido) : new Date(),
      valor: pesos(c.valor, 'el valor'),
      estado: 'RECIBIDO',
      notas: c.notas ?? null,
      registrado_por: por,
    },
    select: { id: true, valor: true, naturaleza: true },
  })
  return { id: m.id, valor: m.valor.toString(), naturaleza: m.naturaleza, faltan: faltantesDeCustodia(c) }
}

/**
 * CAUSAR un anticipo: deja de ser custodia y nace el Ingreso que lo declara.
 *
 * El enlace `ingreso_id` se escribe junto con el cambio de estado, y el
 * `where` exige que siga en RECIBIDO. Si el estado pasara a APLICADO sin el
 * enlace, quedaría exactamente lo que `exigirCustodiaCoherente` detiene: plata
 * causada que no está declarada en ningún lado.
 */
export async function causarCustodia(
  id: string,
  datos: { tipo_servicio_id: string; fecha_causacion?: string | null; numero_factura?: string | null },
  por: string,
) {
  const m = await prisma.movimientoCustodia.findUnique({
    where: { id },
    select: { id: true, estado: true, naturaleza: true, valor: true, tercero_id: true, property_id: true, concepto: true },
  })
  if (!m) throw new ErrorCustodia('Ese movimiento no existe.', 404)
  if (m.estado !== 'RECIBIDO') throw new ErrorCustodia(`Ese movimiento ya está ${m.estado.toLowerCase()}.`, 409)
  if (m.naturaleza !== 'ANTICIPO_PROPIO') {
    throw new ErrorCustodia(
      'Solo un ANTICIPO PROPIO se causa como ingreso. Las arras son del vendedor: se entregan o se devuelven, ' +
      'nunca se convierten en ingreso nuestro.',
      409,
    )
  }
  if (!datos.tipo_servicio_id) throw new ErrorCustodia('Falta el tipo de servicio con el que se causa.')

  // El ingreso se crea por el camino NORMAL (misma validación, mismo sugerido
  // de retención, mismo CIIU): un ingreso nacido por otra puerta se saltaría
  // las reglas de la captura.
  const ingreso = await crearIngreso({
    valor: m.valor.toString(),
    tipo_servicio_id: datos.tipo_servicio_id,
    tercero_id: m.tercero_id,
    property_id: m.property_id,
    fecha_causacion: datos.fecha_causacion ?? null,
    numero_factura: datos.numero_factura ?? null,
    notas: `Causación del anticipo en custodia «${m.concepto}».`,
  }, por)

  const r = await prisma.movimientoCustodia.updateMany({
    where: { id, estado: 'RECIBIDO' },
    data: { estado: 'APLICADO', ingreso_id: ingreso.id, fecha_cierre: new Date() },
  })
  if (r.count === 0) {
    // Otra pestaña lo cerró entre la lectura y la escritura. El ingreso ya
    // existe, así que se dice en claro en vez de dejar dos registros mudos.
    throw new ErrorCustodia(
      `Se creó el ingreso ${ingreso.id} pero el movimiento de custodia ya no estaba abierto: ` +
      `revísalo para no declararlo dos veces.`,
      409,
    )
  }

  return { ingreso_id: ingreso.id, valor: ingreso.valor_base, faltan: ingreso.faltan }
}

/** Entregar al vendedor o devolver al comprador: sale de custodia, sin ingreso. */
export async function cerrarCustodia(
  id: string,
  accion: 'entregado' | 'devuelto',
  entregadoATerceroId: string | null,
  por: string,
) {
  const m = await prisma.movimientoCustodia.findUnique({ where: { id }, select: { estado: true } })
  if (!m) throw new ErrorCustodia('Ese movimiento no existe.', 404)
  if (m.estado !== 'RECIBIDO') throw new ErrorCustodia(`Ese movimiento ya está ${m.estado.toLowerCase()}.`, 409)
  if (accion === 'entregado' && !entregadoATerceroId) {
    throw new ErrorCustodia('Para entregar hay que decir a quién: queda en el rastro de a dónde fue la plata.')
  }
  await prisma.movimientoCustodia.update({
    where: { id },
    data: {
      estado: accion === 'entregado' ? 'ENTREGADO' : 'DEVUELTO',
      entregado_a_tercero_id: accion === 'entregado' ? entregadoATerceroId : null,
      fecha_cierre: new Date(),
      registrado_por: por,
    },
  })
}

export async function listarCustodia(soloAbiertos = false) {
  const filas = await prisma.movimientoCustodia.findMany({
    where: soloAbiertos ? { estado: 'RECIBIDO' } : {},
    select: {
      id: true, naturaleza: true, concepto: true, valor: true, estado: true,
      fecha_recibido: true, fecha_cierre: true, ingreso_id: true, notas: true,
      tercero: { select: { nombre: true } },
      entregadoA: { select: { nombre: true } },
      property: { select: { title: true, slug: true } },
    },
    orderBy: [{ estado: 'asc' }, { fecha_recibido: 'asc' }],
  })
  return filas.map(m => ({
    id: m.id,
    naturaleza: m.naturaleza,
    concepto: m.concepto,
    valor: m.valor.toString(),
    estado: m.estado,
    fecha: m.fecha_recibido.toISOString(),
    fecha_cierre: m.fecha_cierre?.toISOString() ?? null,
    dias: m.estado === 'RECIBIDO' ? diasEnCustodia(m.fecha_recibido) : null,
    // El color y su motivo se derivan del TIEMPO: no hay nada que recordar.
    color: m.estado === 'RECIBIDO' ? colorDeCustodia(m.naturaleza, m.fecha_recibido) : 'gris',
    motivo: m.estado === 'RECIBIDO' ? motivoDeEspera(m.naturaleza, m.fecha_recibido) : null,
    de: m.tercero.nombre,
    entregado_a: m.entregadoA?.nombre ?? null,
    propiedad: m.property?.title ?? m.property?.slug ?? null,
    ingreso_id: m.ingreso_id,
    notas: m.notas,
  }))
}

/**
 * Resumen DESGLOSADO POR NATURALEZA, nunca un total único.
 *
 * La pregunta obligatoria aplicada antes de escribirlo: «¿esta cifra suma
 * causas que piden acciones distintas?». Sí — unas arras se ENTREGAN al
 * vendedor y un anticipo se CAUSA como ingreso nuestro. Un «saldo en custodia:
 * $X» podría esconder ingreso nuestro sin declarar detrás de plata ajena. Van
 * separadas, y el total solo como suma secundaria de lo que hay en la cuenta y
 * no es utilidad.
 */
export async function resumenDeCustodia() {
  const abiertos = await prisma.movimientoCustodia.findMany({
    where: { estado: 'RECIBIDO' },
    select: { naturaleza: true, valor: true, fecha_recibido: true },
  })
  const porNaturaleza = (n: NaturalezaCustodia) => {
    const filas = abiertos.filter(m => m.naturaleza === n)
    const colores = filas.map(m => colorDeCustodia(n, m.fecha_recibido))
    return {
      total: filas.reduce((a, m) => a.plus(m.valor), new Prisma.Decimal(0)).toString(),
      cantidad: filas.length,
      // El PEOR color manda: si uno lleva un año, la tarjeta no puede verse
      // tranquila porque los demás sean recientes.
      color: colores.includes('rojo') ? 'rojo' : colores.includes('ambar') ? 'ambar' : 'gris',
      masViejoDias: filas.length ? Math.max(...filas.map(m => diasEnCustodia(m.fecha_recibido))) : 0,
    }
  }
  const ajeno = porNaturaleza('DINERO_DE_TERCEROS')
  const propio = porNaturaleza('ANTICIPO_PROPIO')
  return {
    ajeno,
    propio,
    /** Suma secundaria: cuánto hay en la cuenta que NO es utilidad. */
    enLaCuenta: new Prisma.Decimal(ajeno.total).plus(propio.total).toString(),
  }
}
