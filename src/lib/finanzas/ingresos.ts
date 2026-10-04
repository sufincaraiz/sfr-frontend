import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { leerNumero } from '@/lib/finanzas/numeros'
import {
  consecuenciaDelReparto, erroresDeIngreso, faltantesDeIngreso, ingresoPorCompletar,
  type IngresoCapturado, type ParteComision, type RolParte,
} from '@/lib/finanzas/captura-ingreso'
import { ordenarPorUso } from '@/lib/finanzas/captura'
import { calcularRetefuente, compararRetencion, ParametroFiscalFaltante } from '@/lib/finanzas/calculo'
import { leerAnio, parametrosDelAnio } from '@/lib/finanzas/parametros'

/**
 * INGRESOS — captura rápida, reparto de comisión y listado.
 *
 * TRES COSAS QUE NO SE MEZCLAN:
 *
 * 1. EL HECHO. Lo que el cliente efectivamente retuvo está en su comprobante y
 *    se guarda tal cual (`retefuente_practicada`, etc.). El sistema NO lo
 *    corrige.
 * 2. EL SUGERIDO. Con los parámetros del año ACTIVO se calcula qué debería
 *    haberse retenido y se guarda aparte (`retefuente_sugerida`). Si difiere,
 *    queda la nota de discrepancia. Si el año no está activo, el sugerido es
 *    null y no se inventa: un cero ahí diría «coincide» cuando nadie comparó.
 * 3. LA BASE GRAVABLE. La decide `facturamos_total` sobre el reparto, no el
 *    valor que se teclea. Ver `consecuenciaDelReparto`.
 *
 * La captura NO exige un año fiscal activo: si lo exigiera, no se podría
 * registrar nada hasta que el contador responda, y los ingresos reales se
 * perderían. Lo que falta sin año activo es el sugerido, y eso se dice.
 */

export class ErrorIngreso extends Error {
  status: number
  constructor(mensaje: string, status = 400) {
    super(mensaje)
    this.name = 'ErrorIngreso'
    this.status = status
  }
}

const dec = (v: string | number) => new Prisma.Decimal(v)
const CERO = new Prisma.Decimal(0)

const pesos = (v: unknown, campo: string): Prisma.Decimal => {
  const n = leerNumero(v, 'pesos', campo)
  return n === null ? CERO : dec(n)
}

/** Tipos de servicio para los botones, los más usados primero (90 días). */
export async function tiposParaCaptura() {
  const desde = new Date(Date.now() - 90 * 86_400_000)
  const [tipos, uso] = await Promise.all([
    prisma.tipoServicio.findMany({ where: { activo: true } }),
    prisma.ingreso.groupBy({ by: ['tipo_servicio_id'], where: { fecha_causacion: { gte: desde } }, _count: { _all: true } }),
  ])
  const usoPorTipo = Object.fromEntries(uso.map(u => [u.tipo_servicio_id, u._count._all]))
  return ordenarPorUso(
    tipos.map(t => ({
      id: t.id, nombre: t.label, orden: t.orden,
      slug: t.slug,
      ciiu: t.ciiu,
      concepto_retencion_sugerido: t.concepto_retencion_sugerido,
      /** true = la pantalla pide propiedad y ofrece el reparto. */
      es_comision: t.slug === 'comision-venta',
    })),
    usoPorTipo,
  )
}

/**
 * Estado del año fiscal, para que la pantalla sepa qué puede pedir.
 *
 * Usa `leerAnio`, que NO lanza. `parametrosDelAnio` sí lanza cuando el año no
 * está completo —que es el estado de hoy, sin UVT ni tarifas— y eso tumbaría la
 * captura entera: justo lo contrario de lo que se quiere, porque los ingresos
 * reales tienen que poder registrarse mientras el contador responde.
 */
export async function estadoDelAnio(anio = new Date().getFullYear()) {
  const p = await leerAnio(anio)
  return {
    anio,
    activo: p?.estado === 'ACTIVO',
    // null = sin decidir. Con null o false, los campos de IVA quedan bloqueados.
    responsable_iva: p?.responsable_iva ?? null,
  }
}

export interface EntradaIngreso extends IngresoCapturado {
  notas?: string | null
}

export async function crearIngreso(e: EntradaIngreso, por: string) {
  const tipo = await prisma.tipoServicio.findUnique({ where: { id: e.tipo_servicio_id } })
  if (!tipo) throw new ErrorIngreso('Ese tipo de servicio no existe.', 404)

  const fechaCausacion = e.fecha_causacion ? new Date(e.fecha_causacion) : new Date()
  const anioFiscal = fechaCausacion.getFullYear()
  const estado = await estadoDelAnio(anioFiscal)

  const errores = erroresDeIngreso(e, {
    esComision: tipo.slug === 'comision-venta',
    responsableIva: estado.responsable_iva,
  })
  if (errores.length) throw new ErrorIngreso(errores.join(' '))

  const partes = (e.partes ?? []).filter(p => String(p.valor ?? '').trim() !== '')
  const facturamosTotal = e.facturamos_total !== false
  const total = pesos(e.valor, 'Valor del ingreso')

  // La BASE GRAVABLE sale del reparto, no del campo que se teclea.
  const consecuencia = partes.length > 0
    ? consecuenciaDelReparto(e.valor, partes, facturamosTotal)
    : { valorBase: total.toString(), generanEgreso: false, partesAjenas: 0, valorAjeno: '0', explicacion: '' }
  const valorBase = dec(consecuencia.valorBase)

  // El CIIU es FOTO del momento: si el tipo lo tiene, se copia ahora. Si mañana
  // se corrige el del tipo, lo ya declarado no cambia.
  const ciiu = String(e.ciiu ?? tipo.ciiu ?? '').trim() || null

  // Municipio del ICA: de la propiedad si hay, porque el ICA se declara donde
  // se genera el ingreso.
  let municipioIca = String(e.municipio_ica ?? '').trim() || null
  if (!municipioIca && e.property_id) {
    const prop = await prisma.property.findUnique({
      where: { id: e.property_id },
      select: { municipality: { select: { name: true } } },
    })
    municipioIca = prop?.municipality?.name ?? null
  }

  // ── Sugerido de retefuente: solo con el año ACTIVO y completo ──
  const practicada = pesos(e.retefuente_practicada, 'Retefuente practicada')
  let retefuenteSugerida: Prisma.Decimal | null = null
  let notaDiscrepancia: string | null = null
  if (estado.activo && tipo.concepto_retencion_sugerido) {
    try {
      // Aquí SÍ el lector ESTRICTO: un sugerido calculado con parámetros a
      // medias sería peor que no tenerlo. Si lanza, el catch lo anota y el
      // ingreso se guarda igual, con el sugerido en null.
      const parametros = await parametrosDelAnio(anioFiscal)
      const tercero = e.tercero_id
        ? await prisma.tercero.findUnique({ where: { id: e.tercero_id }, select: { es_declarante_renta: true, es_autorretenedor: true } })
        : null
      {
        const r = calcularRetefuente({
          base: valorBase,
          concepto: tipo.concepto_retencion_sugerido,
          esDeclaranteRenta: tercero?.es_declarante_renta ?? false,
          esAutorretenedor: tercero?.es_autorretenedor ?? false,
          parametros,
        })
        retefuenteSugerida = r.valor
        const d = compararRetencion(practicada, retefuenteSugerida)
        if (d.hay) {
          notaDiscrepancia =
            `El cliente retuvo $${practicada.toFixed(0)} y por los parámetros de ${anioFiscal} ` +
            `correspondían $${retefuenteSugerida.toFixed(0)} (diferencia $${d.diferencia?.toFixed(0)}). ` +
            `Se conserva lo practicado, que es lo que figura en su comprobante.`
        }
      }
    } catch (err) {
      // Un parámetro incompleto NO impide registrar el ingreso: deja el
      // sugerido en null, que es lo honesto, y lo anota.
      if (err instanceof ParametroFiscalFaltante) {
        notaDiscrepancia = `No se pudo calcular el sugerido: ${err.message}`
      } else throw err
    }
  } else {
    notaDiscrepancia = `Sin un año fiscal ${anioFiscal} ACTIVO no se calcula el sugerido de retención: se guarda solo lo practicado.`
  }

  const faltan = faltantesDeIngreso(e)

  const creado = await prisma.$transaction(async tx => {
    const ingreso = await tx.ingreso.create({
      data: {
        tipo_servicio_id: tipo.id,
        property_id: e.property_id ?? null,
        tercero_id: e.tercero_id!,
        fecha_causacion: fechaCausacion,
        fecha_recaudo: e.fecha_recaudo ? new Date(e.fecha_recaudo) : null,
        valor_base: valorBase,
        iva_generado: estado.responsable_iva === true ? pesos(e.iva_generado, 'IVA') : CERO,
        retefuente_practicada: practicada,
        reteica_practicada: pesos(e.reteica_practicada, 'ReteICA practicada'),
        reteiva_practicada: estado.responsable_iva === true ? pesos(e.reteiva_practicada, 'ReteIVA practicada') : CERO,
        retefuente_sugerida: retefuenteSugerida,
        nota_discrepancia: notaDiscrepancia,
        numero_factura: String(e.numero_factura ?? '').trim() || null,
        estado: e.fecha_recaudo ? 'COBRADO' : 'CAUSADO',
        municipio_ica: municipioIca,
        ciiu,
        facturamos_total: facturamosTotal,
        notas: e.notas ?? null,
        registrado_por: por,
      },
      select: { id: true, valor_base: true },
    })

    // ── El reparto ──
    for (const p of partes) {
      let egresoId: string | null = null
      // Solo si facturamos el total la parte ajena es plata que SALE de
      // nosotros; si cada uno facturó lo suyo, la fila es informativa.
      if (facturamosTotal && p.rol !== 'PROPIA' && p.tercero_id) {
        const categoria = await tx.categoriaEgreso.findFirst({ where: { nombre: 'Comisiones a corredores' } })
          ?? await tx.categoriaEgreso.create({
            data: {
              nombre: 'Comisiones a corredores',
              grupo: 'operativo',
              es_deducible_por_defecto: true,
              genera_iva_descontable: false,
              concepto_retencion_sugerido: 'comisiones',
              orden: 5,
            },
          })
        const egreso = await tx.egreso.create({
          data: {
            categoria_id: categoria.id,
            naturaleza: 'DE_OPERACION',
            fecha: fechaCausacion,
            descripcion: `Comisión compartida — ${p.etiqueta ?? 'corredor externo'}`,
            valor_base: pesos(p.valor, 'Parte de la comisión'),
            iva_pagado: CERO,
            es_deducible: true,
            property_id: e.property_id ?? null,
            tercero_id: p.tercero_id,
            // Nace por completar: falta su retefuente practicada y el soporte.
            por_completar: true,
            registrado_por: por,
          },
          select: { id: true },
        })
        egresoId = egreso.id
      }

      await tx.distribucionComision.create({
        data: {
          ingreso_id: ingreso.id,
          tercero_id: p.rol === 'PROPIA' ? null : p.tercero_id ?? null,
          rol: p.rol as RolParte,
          valor: pesos(p.valor, 'Parte de la comisión'),
          genera_egreso: !!egresoId,
          egreso_id: egresoId,
        },
      })
    }

    return ingreso
  })

  return {
    id: creado.id,
    valor_base: creado.valor_base.toString(),
    por_completar: ingresoPorCompletar(e),
    faltan,
    tipo: tipo.label,
    consecuencia: consecuencia.explicacion || null,
    nota: notaDiscrepancia,
  }
}

export async function listarIngresos(f: { tipo_servicio_id?: string; estado?: string; limite?: number } = {}) {
  const filas = await prisma.ingreso.findMany({
    where: {
      ...(f.tipo_servicio_id ? { tipo_servicio_id: f.tipo_servicio_id } : {}),
      ...(f.estado ? { estado: f.estado as 'CAUSADO' | 'FACTURADO' | 'COBRADO' | 'ANULADO' } : {}),
    },
    select: {
      id: true, fecha_causacion: true, fecha_recaudo: true, valor_base: true, iva_generado: true,
      retefuente_practicada: true, retefuente_sugerida: true, reteica_practicada: true,
      numero_factura: true, estado: true, ciiu: true, municipio_ica: true, facturamos_total: true,
      nota_discrepancia: true,
      tipoServicio: { select: { label: true, slug: true } },
      tercero: { select: { nombre: true } },
      property: { select: { title: true, slug: true } },
      distribuciones: { select: { rol: true, valor: true, genera_egreso: true, tercero: { select: { nombre: true } } } },
    },
    orderBy: { fecha_causacion: 'desc' },
    take: f.limite ?? 100,
  })

  return filas.map(i => {
    const faltan = faltantesDeIngreso({
      valor: i.valor_base.toString(),
      tipo_servicio_id: '',
      numero_factura: i.numero_factura,
      retefuente_practicada: i.retefuente_practicada.eq(0) && !i.numero_factura ? null : i.retefuente_practicada.toString(),
      fecha_recaudo: i.fecha_recaudo?.toISOString() ?? null,
      ciiu: i.ciiu,
    })
    const d = compararRetencion(i.retefuente_practicada, i.retefuente_sugerida)
    return {
      id: i.id,
      fecha: i.fecha_causacion.toISOString(),
      fecha_recaudo: i.fecha_recaudo?.toISOString() ?? null,
      valor: i.valor_base.toString(),
      iva: i.iva_generado.toString(),
      retefuente: i.retefuente_practicada.toString(),
      retefuente_sugerida: i.retefuente_sugerida?.toString() ?? null,
      discrepancia: d.hay ? d.diferencia?.toString() ?? null : null,
      nota: i.nota_discrepancia,
      factura: i.numero_factura,
      estado: i.estado,
      ciiu: i.ciiu,
      municipio_ica: i.municipio_ica,
      facturamos_total: i.facturamos_total,
      tipo: i.tipoServicio.label,
      es_comision: i.tipoServicio.slug === 'comision-venta',
      cliente: i.tercero.nombre,
      propiedad: i.property?.title ?? i.property?.slug ?? null,
      partes: i.distribuciones.map(x => ({
        rol: x.rol,
        quien: x.rol === 'PROPIA' ? 'Nuestra parte' : x.tercero?.nombre ?? 'sin nombre',
        valor: x.valor.toString(),
        genera_egreso: x.genera_egreso,
      })),
      faltan,
      por_completar: faltan.length > 0,
    }
  })
}
