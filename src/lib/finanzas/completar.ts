import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { leerNumero } from '@/lib/finanzas/numeros'
import { erroresDeCaptura, estaPorCompletar, faltantesDeCaptura } from '@/lib/finanzas/captura'
import { erroresDeIngreso, faltantesDeIngreso } from '@/lib/finanzas/captura-ingreso'
import { calcularRetefuente, compararRetencion, ParametroFiscalFaltante } from '@/lib/finanzas/calculo'
import { parametrosDelAnio } from '@/lib/finanzas/parametros'
import { estadoDelAnio } from '@/lib/finanzas/ingresos'

/**
 * COMPLETAR EN EL ESCRITORIO LO CAPTURADO EN LA CALLE
 * ==================================================
 *
 * La captura pide lo mínimo a propósito. Esto es el otro lado: el detalle
 * editable donde se pone el proveedor, la factura, las retenciones del
 * comprobante — y donde se CORRIGE lo que se tecleó con prisa, incluida la
 * categoría o la naturaleza de un gasto.
 *
 * CUATRO REGLAS, aprendidas en el panel de propiedades:
 *
 * 1. LISTA BLANCA, nunca `...body`. Cada campo editable está enumerado abajo.
 *    Un spread del cliente dejaría escribir `por_completar`, `registrado_por` o
 *    `retefuente_sugerida` desde el navegador, que son derivados o rastro.
 * 2. `null` NO es cadena vacía. El formulario manda `null` para «sin dato» y
 *    una cadena para «este texto». Si se confundieran, un campo que el usuario
 *    no tocó volvería como '' y BORRARÍA lo que había.
 * 3. SOLO SE ESCRIBE LO QUE VIENE. Un campo ausente del cuerpo no se toca.
 * 4. LO DERIVADO SE RECALCULA, no se recibe: `por_completar` sale de la misma
 *    función que usa la captura, y el sugerido de retención se recalcula si
 *    cambió el valor o el tercero. Si se recibieran del cliente, dos pantallas
 *    tendrían criterios distintos sobre el mismo gasto.
 */

export class ErrorCompletar extends Error {
  status: number
  constructor(mensaje: string, status = 400) {
    super(mensaje)
    this.name = 'ErrorCompletar'
    this.status = status
  }
}

const CERO = new Prisma.Decimal(0)

/** Texto: `null` se respeta como «sin dato»; ausente = no tocar. */
function texto(v: unknown, campo: string): string | null {
  if (v === null) return null
  const s = String(v ?? '').trim()
  if (s === '') return null
  if (s.length > 400) throw new ErrorCompletar(`${campo}: demasiado largo.`)
  return s
}

function dinero(v: unknown, campo: string): Prisma.Decimal {
  const n = leerNumero(v, 'pesos', campo)
  if (n === null) return CERO
  const d = new Prisma.Decimal(n)
  if (d.lt(0)) throw new ErrorCompletar(`${campo}: no puede ser negativo.`)
  return d
}

function fecha(v: unknown, campo: string): Date | null {
  if (v === null || v === undefined || String(v).trim() === '') return null
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) throw new ErrorCompletar(`${campo}: fecha inválida.`)
  return d
}

// ─── Gastos ──────────────────────────────────────────────────────────────────

/** LISTA BLANCA del gasto. Lo que no está aquí no se puede escribir. */
export interface EdicionEgreso {
  fecha?: string | null
  descripcion?: string | null
  valor_base?: string | null
  categoria_id?: string
  naturaleza?: 'DEL_NEGOCIO' | 'DE_OPERACION' | 'REEMBOLSABLE'
  tercero_id?: string | null
  property_id?: string | null
  reembolsa_tercero_id?: string | null
  numero_factura_proveedor?: string | null
  metodo_pago?: string | null
  es_deducible?: boolean
  iva_pagado?: string | null
  retefuente_practicada?: string | null
  reteica_practicada?: string | null
}

const CAMPOS_EGRESO: (keyof EdicionEgreso)[] = [
  'fecha', 'descripcion', 'valor_base', 'categoria_id', 'naturaleza', 'tercero_id',
  'property_id', 'reembolsa_tercero_id', 'numero_factura_proveedor', 'metodo_pago',
  'es_deducible', 'iva_pagado', 'retefuente_practicada', 'reteica_practicada',
]

export async function detalleEgreso(id: string) {
  const e = await prisma.egreso.findUnique({
    where: { id },
    select: {
      id: true, fecha: true, descripcion: true, valor_base: true, iva_pagado: true,
      retefuente_practicada: true, reteica_practicada: true, numero_factura_proveedor: true,
      metodo_pago: true, es_deducible: true, naturaleza: true, estado_reembolso: true,
      fecha_reembolso: true, motivo_reclasificacion: true, reclasificado_de: true,
      por_completar: true, soporte_public_id: true, registrado_por: true, created_at: true,
      categoria: { select: { id: true, nombre: true } },
      tercero: { select: { id: true, nombre: true, numero_documento: true } },
      reembolsaTercero: { select: { id: true, nombre: true } },
      property: { select: { id: true, title: true, slug: true } },
    },
  })
  if (!e) return null

  const estado = await estadoDelAnio(e.fecha.getFullYear())
  // ESPEJO FIEL: cada campo sale con su valor REAL, y `null` viaja como null.
  // Así el formulario puede reenviar sin cambios lo que nadie tocó.
  return {
    id: e.id,
    fecha: e.fecha.toISOString().slice(0, 10),
    descripcion: e.descripcion,
    valor_base: e.valor_base.toString(),
    iva_pagado: e.iva_pagado.toString(),
    retefuente_practicada: e.retefuente_practicada.toString(),
    reteica_practicada: e.reteica_practicada.toString(),
    numero_factura_proveedor: e.numero_factura_proveedor,
    metodo_pago: e.metodo_pago,
    es_deducible: e.es_deducible,
    naturaleza: e.naturaleza,
    estado_reembolso: e.estado_reembolso,
    fecha_reembolso: e.fecha_reembolso?.toISOString().slice(0, 10) ?? null,
    motivo_reclasificacion: e.motivo_reclasificacion,
    reclasificado_de: e.reclasificado_de,
    por_completar: e.por_completar,
    tiene_recibo: !!e.soporte_public_id,
    registrado_por: e.registrado_por,
    creado_en: e.created_at.toISOString(),
    categoria: e.categoria,
    tercero: e.tercero,
    reembolsa: e.reembolsaTercero,
    propiedad: e.property ? { id: e.property.id, etiqueta: e.property.title ?? e.property.slug } : null,
    /** Para que la pantalla sepa si puede ofrecer el campo de IVA. */
    anio: estado,
    faltan: faltantesDeCaptura({
      valor: e.valor_base.toString(), categoria_id: e.categoria.id, naturaleza: e.naturaleza,
      tercero_id: e.tercero?.id ?? null,
      descripcion: e.descripcion === e.categoria.nombre ? '' : e.descripcion,
      numero_factura_proveedor: e.numero_factura_proveedor,
      soporte_public_id: e.soporte_public_id,
    }),
  }
}

export async function actualizarEgreso(id: string, cambios: EdicionEgreso, por: string) {
  const actual = await prisma.egreso.findUnique({
    where: { id },
    select: {
      id: true, fecha: true, descripcion: true, valor_base: true, naturaleza: true,
      categoria_id: true, tercero_id: true, property_id: true, reembolsa_tercero_id: true,
      numero_factura_proveedor: true, soporte_public_id: true, estado_reembolso: true,
      categoria: { select: { nombre: true } },
    },
  })
  if (!actual) throw new ErrorCompletar('Ese gasto no existe.', 404)

  // Solo los campos ENVIADOS se consideran; el resto conserva su valor.
  const enviado = (k: keyof EdicionEgreso) => Object.prototype.hasOwnProperty.call(cambios, k)
  for (const k of Object.keys(cambios)) {
    if (!CAMPOS_EGRESO.includes(k as keyof EdicionEgreso)) {
      throw new ErrorCompletar(`El campo «${k}» no se puede editar desde aquí.`, 400)
    }
  }

  const naturaleza = enviado('naturaleza') ? cambios.naturaleza! : actual.naturaleza
  const categoriaId = enviado('categoria_id') ? cambios.categoria_id! : actual.categoria_id
  const terceroId = enviado('tercero_id') ? (cambios.tercero_id || null) : actual.tercero_id
  const propertyId = enviado('property_id') ? (cambios.property_id || null) : actual.property_id
  const reembolsaId = enviado('reembolsa_tercero_id') ? (cambios.reembolsa_tercero_id || null) : actual.reembolsa_tercero_id
  const valor = enviado('valor_base') ? dinero(cambios.valor_base, 'Valor') : actual.valor_base
  const descripcion = enviado('descripcion') ? texto(cambios.descripcion, 'Descripción') : actual.descripcion
  const factura = enviado('numero_factura_proveedor')
    ? texto(cambios.numero_factura_proveedor, 'Número de factura')
    : actual.numero_factura_proveedor

  const categoria = await prisma.categoriaEgreso.findUnique({ where: { id: categoriaId }, select: { id: true, nombre: true } })
  if (!categoria) throw new ErrorCompletar('Esa categoría no existe.', 404)

  if (valor.lte(0)) throw new ErrorCompletar('El valor tiene que ser mayor que cero.')

  // Las MISMAS reglas de la captura, no unas paralelas.
  const comoCaptura = {
    valor: valor.toString(),
    categoria_id: categoria.id,
    naturaleza,
    property_id: propertyId,
    reembolsa_tercero_id: naturaleza === 'REEMBOLSABLE' ? reembolsaId : null,
    tercero_id: terceroId,
    descripcion: descripcion ?? '',
    numero_factura_proveedor: factura,
    soporte_public_id: actual.soporte_public_id,
  }
  const errores = erroresDeCaptura(comoCaptura)
  if (errores.length) throw new ErrorCompletar(errores.join(' '))

  // El IVA pagado solo se captura si el año es responsable de IVA. Mientras no
  // lo sea, el IVA va dentro del valor como costo (ver costoEgreso).
  const estadoAnio = await estadoDelAnio((enviado('fecha') ? fecha(cambios.fecha, 'Fecha') ?? actual.fecha : actual.fecha).getFullYear())
  let ivaPagado: Prisma.Decimal | undefined
  if (enviado('iva_pagado')) {
    ivaPagado = dinero(cambios.iva_pagado, 'IVA pagado')
    if (ivaPagado.gt(0) && estadoAnio.responsable_iva !== true) {
      throw new ErrorCompletar(
        estadoAnio.responsable_iva === false
          ? 'El año no es responsable de IVA: el IVA pagado va dentro del valor, como costo.'
          : 'Sin decidir si el año es responsable de IVA no se puede separar el IVA pagado.',
      )
    }
  }

  const cambioNaturaleza = naturaleza !== actual.naturaleza

  await prisma.egreso.update({
    where: { id },
    data: {
      ...(enviado('fecha') ? { fecha: fecha(cambios.fecha, 'Fecha') ?? actual.fecha } : {}),
      // Sin descripción propia se vuelve a dejar el nombre de la categoría,
      // igual que en la captura: así «por completar» no depende de la pantalla.
      descripcion: descripcion ?? categoria.nombre,
      valor_base: valor,
      categoria_id: categoria.id,
      naturaleza,
      tercero_id: terceroId,
      property_id: propertyId,
      reembolsa_tercero_id: naturaleza === 'REEMBOLSABLE' ? reembolsaId : null,
      // Al dejar de ser reembolsable, el estado de reembolso pierde sentido y
      // se limpia: un «PENDIENTE» colgando haría que apareciera en por cobrar.
      estado_reembolso: naturaleza === 'REEMBOLSABLE'
        ? (actual.estado_reembolso ?? 'PENDIENTE')
        : null,
      ...(cambioNaturaleza ? { reclasificado_de: actual.naturaleza, reclasificado_por: por, reclasificado_en: new Date() } : {}),
      ...(enviado('numero_factura_proveedor') ? { numero_factura_proveedor: factura } : {}),
      ...(enviado('metodo_pago') ? { metodo_pago: texto(cambios.metodo_pago, 'Método de pago') } : {}),
      ...(enviado('es_deducible') ? { es_deducible: !!cambios.es_deducible } : {}),
      ...(ivaPagado !== undefined ? { iva_pagado: ivaPagado } : {}),
      ...(enviado('retefuente_practicada') ? { retefuente_practicada: dinero(cambios.retefuente_practicada, 'Retefuente practicada') } : {}),
      ...(enviado('reteica_practicada') ? { reteica_practicada: dinero(cambios.reteica_practicada, 'ReteICA practicada') } : {}),
      // DERIVADO: se recalcula aquí, nunca se recibe del cliente.
      por_completar: estaPorCompletar(comoCaptura),
    },
  })

  return { ok: true, por_completar: estaPorCompletar(comoCaptura), faltan: faltantesDeCaptura(comoCaptura) }
}

// ─── Ingresos ────────────────────────────────────────────────────────────────

export interface EdicionIngreso {
  fecha_causacion?: string | null
  fecha_recaudo?: string | null
  valor_base?: string | null
  tipo_servicio_id?: string
  tercero_id?: string | null
  property_id?: string | null
  numero_factura?: string | null
  retefuente_practicada?: string | null
  reteica_practicada?: string | null
  reteiva_practicada?: string | null
  iva_generado?: string | null
  ciiu?: string | null
  municipio_ica?: string | null
  notas?: string | null
}

const CAMPOS_INGRESO: (keyof EdicionIngreso)[] = [
  'fecha_causacion', 'fecha_recaudo', 'valor_base', 'tipo_servicio_id', 'tercero_id',
  'property_id', 'numero_factura', 'retefuente_practicada', 'reteica_practicada',
  'reteiva_practicada', 'iva_generado', 'ciiu', 'municipio_ica', 'notas',
]

export async function detalleIngreso(id: string) {
  const i = await prisma.ingreso.findUnique({
    where: { id },
    select: {
      id: true, fecha_causacion: true, fecha_recaudo: true, valor_base: true, iva_generado: true,
      retefuente_practicada: true, reteica_practicada: true, reteiva_practicada: true,
      retefuente_sugerida: true, nota_discrepancia: true, numero_factura: true, estado: true,
      ciiu: true, municipio_ica: true, facturamos_total: true, notas: true,
      registrado_por: true, created_at: true,
      tipoServicio: { select: { id: true, label: true, slug: true, ciiu: true } },
      tercero: { select: { id: true, nombre: true, numero_documento: true } },
      property: { select: { id: true, title: true, slug: true } },
      distribuciones: { select: { rol: true, valor: true, genera_egreso: true, tercero: { select: { nombre: true } } } },
      custodiasAplicadas: { select: { id: true, concepto: true } },
    },
  })
  if (!i) return null

  const estado = await estadoDelAnio(i.fecha_causacion.getFullYear())
  const d = compararRetencion(i.retefuente_practicada, i.retefuente_sugerida)
  return {
    id: i.id,
    fecha_causacion: i.fecha_causacion.toISOString().slice(0, 10),
    fecha_recaudo: i.fecha_recaudo?.toISOString().slice(0, 10) ?? null,
    valor_base: i.valor_base.toString(),
    iva_generado: i.iva_generado.toString(),
    retefuente_practicada: i.retefuente_practicada.toString(),
    reteica_practicada: i.reteica_practicada.toString(),
    reteiva_practicada: i.reteiva_practicada.toString(),
    retefuente_sugerida: i.retefuente_sugerida?.toString() ?? null,
    discrepancia: d.hay ? d.diferencia?.toString() ?? null : null,
    nota_discrepancia: i.nota_discrepancia,
    numero_factura: i.numero_factura,
    estado: i.estado,
    ciiu: i.ciiu,
    municipio_ica: i.municipio_ica,
    facturamos_total: i.facturamos_total,
    notas: i.notas,
    registrado_por: i.registrado_por,
    creado_en: i.created_at.toISOString(),
    tipo: i.tipoServicio,
    tercero: i.tercero,
    propiedad: i.property ? { id: i.property.id, etiqueta: i.property.title ?? i.property.slug } : null,
    partes: i.distribuciones.map(x => ({
      rol: x.rol,
      quien: x.rol === 'PROPIA' ? 'Nuestra parte' : x.tercero?.nombre ?? 'sin nombre',
      valor: x.valor.toString(),
      genera_egreso: x.genera_egreso,
    })),
    viene_de_custodia: i.custodiasAplicadas[0]?.concepto ?? null,
    anio: estado,
    faltan: faltantesDeIngreso({
      valor: i.valor_base.toString(), tipo_servicio_id: i.tipoServicio.id,
      numero_factura: i.numero_factura,
      retefuente_practicada: i.numero_factura ? i.retefuente_practicada.toString() : null,
      fecha_recaudo: i.fecha_recaudo?.toISOString() ?? null,
      ciiu: i.ciiu,
    }),
  }
}

export async function actualizarIngreso(id: string, cambios: EdicionIngreso, por: string) {
  const actual = await prisma.ingreso.findUnique({
    where: { id },
    select: {
      id: true, fecha_causacion: true, fecha_recaudo: true, valor_base: true, tipo_servicio_id: true,
      tercero_id: true, property_id: true, numero_factura: true, ciiu: true, municipio_ica: true,
      retefuente_practicada: true, estado: true,
      tipoServicio: { select: { slug: true, concepto_retencion_sugerido: true } },
    },
  })
  if (!actual) throw new ErrorCompletar('Ese ingreso no existe.', 404)

  for (const k of Object.keys(cambios)) {
    if (!CAMPOS_INGRESO.includes(k as keyof EdicionIngreso)) {
      throw new ErrorCompletar(`El campo «${k}» no se puede editar desde aquí.`, 400)
    }
  }
  const enviado = (k: keyof EdicionIngreso) => Object.prototype.hasOwnProperty.call(cambios, k)

  const fechaCausacion = enviado('fecha_causacion')
    ? fecha(cambios.fecha_causacion, 'Fecha de causación') ?? actual.fecha_causacion
    : actual.fecha_causacion
  const fechaRecaudo = enviado('fecha_recaudo') ? fecha(cambios.fecha_recaudo, 'Fecha de recaudo') : actual.fecha_recaudo
  const valor = enviado('valor_base') ? dinero(cambios.valor_base, 'Valor') : actual.valor_base
  const tipoId = enviado('tipo_servicio_id') ? cambios.tipo_servicio_id! : actual.tipo_servicio_id
  const terceroId = enviado('tercero_id') ? (cambios.tercero_id || null) : actual.tercero_id
  const propertyId = enviado('property_id') ? (cambios.property_id || null) : actual.property_id

  const tipo = await prisma.tipoServicio.findUnique({ where: { id: tipoId }, select: { id: true, slug: true, concepto_retencion_sugerido: true } })
  if (!tipo) throw new ErrorCompletar('Ese tipo de servicio no existe.', 404)

  const estadoAnio = await estadoDelAnio(fechaCausacion.getFullYear())
  const comoCaptura = {
    valor: valor.toString(),
    tipo_servicio_id: tipo.id,
    tercero_id: terceroId,
    property_id: propertyId,
    fecha_causacion: fechaCausacion.toISOString(),
    fecha_recaudo: fechaRecaudo?.toISOString() ?? null,
    iva_generado: enviado('iva_generado') ? cambios.iva_generado : null,
    numero_factura: enviado('numero_factura') ? texto(cambios.numero_factura, 'Número de factura') : actual.numero_factura,
    retefuente_practicada: enviado('retefuente_practicada') ? cambios.retefuente_practicada : actual.retefuente_practicada.toString(),
    ciiu: enviado('ciiu') ? texto(cambios.ciiu, 'CIIU') : actual.ciiu,
  }
  const errores = erroresDeIngreso(comoCaptura, {
    esComision: tipo.slug === 'comision-venta',
    responsableIva: estadoAnio.responsable_iva,
  })
  if (errores.length) throw new ErrorCompletar(errores.join(' '))

  // El SUGERIDO se recalcula si cambió la base o el tercero: es derivado. Si no
  // hay año activo queda en null —nunca en cero, que diría «coincide»—.
  const practicada = enviado('retefuente_practicada')
    ? dinero(cambios.retefuente_practicada, 'Retefuente practicada')
    : actual.retefuente_practicada
  let sugerida: Prisma.Decimal | null = null
  let nota: string | null = null
  const cambioBase = !valor.eq(actual.valor_base) || terceroId !== actual.tercero_id || tipo.id !== actual.tipo_servicio_id
  if (estadoAnio.activo && tipo.concepto_retencion_sugerido) {
    try {
      const parametros = await parametrosDelAnio(fechaCausacion.getFullYear())
      const tercero = terceroId
        ? await prisma.tercero.findUnique({ where: { id: terceroId }, select: { es_declarante_renta: true, es_autorretenedor: true } })
        : null
      const r = calcularRetefuente({
        base: valor,
        concepto: tipo.concepto_retencion_sugerido,
        esDeclaranteRenta: tercero?.es_declarante_renta ?? false,
        esAutorretenedor: tercero?.es_autorretenedor ?? false,
        parametros,
      })
      sugerida = r.valor
      const dif = compararRetencion(practicada, sugerida)
      if (dif.hay) {
        nota = `El cliente retuvo $${practicada.toFixed(0)} y por los parámetros de ${fechaCausacion.getFullYear()} ` +
          `correspondían $${sugerida.toFixed(0)} (diferencia $${dif.diferencia?.toFixed(0)}). ` +
          `Se conserva lo practicado, que es lo que figura en su comprobante.`
      }
    } catch (err) {
      if (err instanceof ParametroFiscalFaltante) nota = `No se pudo calcular el sugerido: ${err.message}`
      else throw err
    }
  } else {
    nota = `Sin un año fiscal ${fechaCausacion.getFullYear()} ACTIVO no se calcula el sugerido de retención: se guarda solo lo practicado.`
  }

  await prisma.ingreso.update({
    where: { id },
    data: {
      fecha_causacion: fechaCausacion,
      fecha_recaudo: fechaRecaudo,
      valor_base: valor,
      tipo_servicio_id: tipo.id,
      tercero_id: terceroId!,
      property_id: propertyId,
      ...(enviado('numero_factura') ? { numero_factura: texto(cambios.numero_factura, 'Número de factura') } : {}),
      ...(enviado('retefuente_practicada') ? { retefuente_practicada: practicada } : {}),
      ...(enviado('reteica_practicada') ? { reteica_practicada: dinero(cambios.reteica_practicada, 'ReteICA practicada') } : {}),
      ...(enviado('reteiva_practicada') ? { reteiva_practicada: estadoAnio.responsable_iva === true ? dinero(cambios.reteiva_practicada, 'ReteIVA practicada') : CERO } : {}),
      ...(enviado('iva_generado') ? { iva_generado: estadoAnio.responsable_iva === true ? dinero(cambios.iva_generado, 'IVA') : CERO } : {}),
      ...(enviado('ciiu') ? { ciiu: texto(cambios.ciiu, 'CIIU') } : {}),
      ...(enviado('municipio_ica') ? { municipio_ica: texto(cambios.municipio_ica, 'Municipio del ICA') } : {}),
      ...(enviado('notas') ? { notas: texto(cambios.notas, 'Notas') } : {}),
      // Derivados: el estado sale de si entró la plata, no de un selector.
      estado: actual.estado === 'ANULADO' ? 'ANULADO' : (fechaRecaudo ? 'COBRADO' : 'CAUSADO'),
      ...(cambioBase || estadoAnio.activo ? { retefuente_sugerida: sugerida, nota_discrepancia: nota } : {}),
    },
  })

  return { ok: true, faltan: faltantesDeIngreso(comoCaptura) }
}
