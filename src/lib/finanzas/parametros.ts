/**
 * Carga, edición, copia y activación de parámetros fiscales.
 *
 * La validación («qué falta») vive en el módulo hoja `pendientes.ts`, que la
 * pantalla ejecuta en el navegador y la prueba con Node. Aquí está el acceso a
 * base y la PROCEDENCIA: quién cargó cada valor, cuándo, de dónde vino y si ya
 * se revisó.
 */
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  exigirParametrosCompletos,
  verificarActivable,
  type ParametroActivable,
  type ParametrosAnioLike,
  type ResultadoActivable,
} from '@/lib/finanzas/calculo'
import { claveConcepto, type Origen, type Procedencia, type ProcedenciaEscalares } from '@/lib/finanzas/pendientes'
import { leerNumero } from '@/lib/finanzas/numeros'

export class ErrorParametros extends Error {
  constructor(mensaje: string, readonly status = 400) {
    super(mensaje)
    this.name = 'ErrorParametros'
  }
}

const ESCALARES = ['uvt', 'responsable_iva', 'tarifa_iva', 'tarifa_reteiva'] as const
type Escalar = (typeof ESCALARES)[number]

// ─── Lectura ─────────────────────────────────────────────────────────────────

async function leerCrudo(anio: number) {
  return prisma.parametroFiscal.findUnique({
    where: { anio },
    include: {
      conceptos: { orderBy: { label: 'asc' } },
      tarifasIca: { orderBy: { municipio: 'asc' } },
    },
  })
}

/** Lee el año tal cual está, sin exigir nada. */
export async function leerAnio(anio: number): Promise<ParametrosAnioLike | null> {
  return ((await leerCrudo(anio)) as unknown as ParametrosAnioLike | null) ?? null
}

/** Parámetros listos para CALCULAR. Lanza si no existen, están en borrador o incompletos. */
export async function parametrosDelAnio(anio: number): Promise<ParametrosAnioLike> {
  return exigirParametrosCompletos(await leerAnio(anio), anio)
}

export async function pendientesDelAnio(anio: number): Promise<ResultadoActivable | null> {
  const p = await leerAnio(anio)
  return p ? verificarActivable(p) : null
}

const txt = (d: Prisma.Decimal | null | undefined) => (d === null || d === undefined ? null : d.toString())

/** Forma serializable para la pantalla: Decimal → string, fechas → ISO. */
export async function anioParaPantalla(anio: number) {
  const [p, previo, anios] = await Promise.all([
    leerCrudo(anio),
    prisma.parametroFiscal.findUnique({ where: { anio: anio - 1 }, select: { anio: true, estado: true } }),
    prisma.parametroFiscal.findMany({ select: { anio: true, estado: true }, orderBy: { anio: 'desc' } }),
  ])
  return {
    anio,
    anios,
    anteriorDisponible: previo ? { anio: previo.anio, estado: previo.estado } : null,
    parametro: p && {
      anio: p.anio,
      estado: p.estado,
      cerrado: p.cerrado,
      responsable_iva: p.responsable_iva,
      uvt: txt(p.uvt),
      tarifa_iva: txt(p.tarifa_iva),
      tarifa_reteiva: txt(p.tarifa_reteiva),
      notas: p.notas,
      procedencia: (p.procedencia ?? {}) as ProcedenciaEscalares,
      activado_por: p.activado_por,
      activado_en: p.activado_en?.toISOString() ?? null,
      updated_at: p.updated_at.toISOString(),
      conceptos: p.conceptos.map(c => ({
        concepto: c.concepto,
        label: c.label,
        tarifa_declarante: c.tarifa_declarante.toString(),
        tarifa_no_declarante: c.tarifa_no_declarante.toString(),
        base_minima_uvt: c.base_minima_uvt.toString(),
        cargado_por: c.cargado_por,
        cargado_en: c.cargado_en.toISOString(),
        origen: c.origen,
        copiado_de_anio: c.copiado_de_anio,
        revisado: c.revisado,
      })),
      tarifasIca: p.tarifasIca.map(t => ({
        municipio: t.municipio,
        tarifa_por_mil: t.tarifa_por_mil.toString(),
        cargado_por: t.cargado_por,
        cargado_en: t.cargado_en.toISOString(),
        origen: t.origen,
        copiado_de_anio: t.copiado_de_anio,
        revisado: t.revisado,
      })),
    },
  }
}

// ─── Validación de entrada ───────────────────────────────────────────────────

/**
 * Número de un campo del formulario. `modo` decide qué significa el punto:
 * en pesos separa miles («52.374» = 52374), en tasas es decimal. Ver numeros.ts.
 */
function numero(v: unknown, campo: string, min: number, max: number, modo: 'pesos' | 'tasa' = 'tasa'): Prisma.Decimal | null {
  let s: string | null
  try {
    s = leerNumero(v, modo, campo)
  } catch (e) {
    throw new ErrorParametros(e instanceof Error ? e.message : `${campo}: número inválido.`)
  }
  if (s === null) return null
  const d = new Prisma.Decimal(s)
  if (d.lt(min) || d.gt(max)) throw new ErrorParametros(`${campo}: debe estar entre ${min} y ${max}.`)
  return d
}

const igualDecimal = (a: Prisma.Decimal | null, b: Prisma.Decimal | null) =>
  a === null || b === null ? a === b : a.eq(b)

export interface EntradaGuardado {
  anio: number
  uvt: unknown
  responsable_iva: boolean | null
  tarifa_iva: unknown
  tarifa_reteiva: unknown
  notas?: string | null
  /** Escalares que el usuario CONFIRMÓ sin cambiar (pasan de sin revisar a revisado). */
  confirmar?: Escalar[]
  /** Escalares cuyo valor viene del formulario del contador (nacen sin revisar). */
  importados?: Escalar[]
  conceptos: { label: string; tarifa_declarante: unknown; tarifa_no_declarante: unknown; base_minima_uvt: unknown; revisado?: boolean; origen?: string }[]
  tarifasIca: { municipio: string; tarifa_por_mil: unknown; revisado?: boolean; origen?: string }[]
}

// ─── Guardar borrador ────────────────────────────────────────────────────────

/**
 * Guarda el año como BORRADOR y registra la procedencia campo a campo.
 *
 *  · Valor cambiado a mano      → por/en de quien guarda, origen manual, REVISADO.
 *  · Valor cambiado por import  → origen contador, SIN REVISAR.
 *  · Valor igual + «confirmar»  → pasa a revisado, conserva el origen (se ve
 *                                 «copiado de 2025 · revisado por …»).
 *  · Valor igual sin tocar      → la procedencia no cambia.
 */
export async function guardarBorrador(e: EntradaGuardado, por: string) {
  if (!Number.isInteger(e.anio) || e.anio < 2000 || e.anio > 2100) throw new ErrorParametros('Año inválido.')
  const actual = await leerCrudo(e.anio)
  if (actual?.cerrado) throw new ErrorParametros(`${e.anio} está cerrado: no se editan sus parámetros.`, 409)
  if (actual?.estado === 'ACTIVO') {
    throw new ErrorParametros(`${e.anio} está ACTIVO. Vuélvelo a borrador para editarlo: un año activo no cambia en silencio.`, 409)
  }
  if (e.responsable_iva !== null && typeof e.responsable_iva !== 'boolean') {
    throw new ErrorParametros('responsable_iva debe ser sí, no o sin decidir.')
  }

  // UVT en PESOS y con piso de 1.000: un UVT de «52,374» es casi seguro un
  // error de separador (se quiso decir 52.374). Mejor rechazarlo que calcular
  // retenciones con un UVT mil veces menor.
  const uvtLeido = numero(e.uvt, 'UVT', 0, 1_000_000, 'pesos')
  if (uvtLeido !== null && uvtLeido.lt(1000)) {
    throw new ErrorParametros(
      `UVT: ${uvtLeido.toString()} es demasiado bajo para un valor en pesos (el UVT ronda las decenas de miles). ` +
      `¿Un error de separador? Escríbelo como 52.374 o 52374.`,
    )
  }
  const nuevos = {
    uvt: uvtLeido,
    tarifa_iva: numero(e.tarifa_iva, 'Tarifa de IVA', 0, 100),
    tarifa_reteiva: numero(e.tarifa_reteiva, 'Tarifa de reteIVA', 0, 100),
  }
  const ahora = new Date().toISOString()
  const confirmar = new Set(e.confirmar ?? [])
  const importados = new Set(e.importados ?? [])
  const procPrev = ((actual?.procedencia ?? {}) as ProcedenciaEscalares)
  const proc: ProcedenciaEscalares = { ...procPrev }

  const marcar = (campo: Escalar, cambio: boolean, vacioNuevo: boolean) => {
    if (vacioNuevo) { delete proc[campo]; return }
    if (cambio) {
      const origen: Origen = importados.has(campo) ? 'contador' : 'manual'
      proc[campo] = { por, en: ahora, origen, revisado: origen !== 'contador' || confirmar.has(campo) }
    } else if (confirmar.has(campo) && procPrev[campo]?.revisado === false) {
      proc[campo] = { ...procPrev[campo]!, revisado: true, por, en: ahora }
    }
  }
  marcar('uvt', !igualDecimal(actual?.uvt ?? null, nuevos.uvt), nuevos.uvt === null)
  marcar('responsable_iva', (actual?.responsable_iva ?? null) !== e.responsable_iva, e.responsable_iva === null)
  marcar('tarifa_iva', !igualDecimal(actual?.tarifa_iva ?? null, nuevos.tarifa_iva), nuevos.tarifa_iva === null)
  marcar('tarifa_reteiva', !igualDecimal(actual?.tarifa_reteiva ?? null, nuevos.tarifa_reteiva), nuevos.tarifa_reteiva === null)

  // Filas: validadas antes de abrir la transacción.
  const conceptos = e.conceptos.map((c, i) => {
    const label = String(c.label ?? '').trim()
    if (!label) throw new ErrorParametros(`Concepto ${i + 1}: falta el nombre.`)
    return {
      concepto: claveConcepto(label),
      label,
      td: numero(c.tarifa_declarante, `${label} (declarante)`, 0, 100) ?? (() => { throw new ErrorParametros(`${label}: falta la tarifa para declarante.`) })(),
      tnd: numero(c.tarifa_no_declarante, `${label} (no declarante)`, 0, 100) ?? (() => { throw new ErrorParametros(`${label}: falta la tarifa para no declarante.`) })(),
      bmu: numero(c.base_minima_uvt, `${label} (base mínima)`, 0, 100_000) ?? new Prisma.Decimal(0),
      revisado: c.revisado !== false,
      importado: c.origen === 'contador',
    }
  })
  const dupC = conceptos.find((c, i) => conceptos.findIndex(x => x.concepto === c.concepto) !== i)
  if (dupC) throw new ErrorParametros(`El concepto «${dupC.label}» está repetido.`)

  const icas = e.tarifasIca.map((t, i) => {
    const municipio = String(t.municipio ?? '').trim()
    if (!municipio) throw new ErrorParametros(`ICA ${i + 1}: falta el municipio.`)
    const tarifa = numero(t.tarifa_por_mil, `ICA ${municipio}`, 0, 100)
    if (tarifa === null) throw new ErrorParametros(`ICA ${municipio}: falta la tarifa.`)
    return { municipio, tarifa, revisado: t.revisado !== false, importado: t.origen === 'contador' }
  })
  const dupI = icas.find((t, i) => icas.findIndex(x => x.municipio.toLowerCase() === t.municipio.toLowerCase()) !== i)
  if (dupI) throw new ErrorParametros(`El municipio «${dupI.municipio}» está repetido en ICA.`)

  await prisma.$transaction(async tx => {
    const p = await tx.parametroFiscal.upsert({
      where: { anio: e.anio },
      create: {
        anio: e.anio, estado: 'BORRADOR', responsable_iva: e.responsable_iva,
        uvt: nuevos.uvt, tarifa_iva: nuevos.tarifa_iva, tarifa_reteiva: nuevos.tarifa_reteiva,
        notas: e.notas ?? null, procedencia: proc as Prisma.InputJsonValue,
      },
      update: {
        responsable_iva: e.responsable_iva,
        uvt: nuevos.uvt, tarifa_iva: nuevos.tarifa_iva, tarifa_reteiva: nuevos.tarifa_reteiva,
        notas: e.notas ?? null, procedencia: proc as Prisma.InputJsonValue,
      },
    })

    const prevC = new Map((actual?.conceptos ?? []).map(c => [c.concepto, c]))
    for (const c of conceptos) {
      const prev = prevC.get(c.concepto)
      if (!prev) {
        await tx.conceptoRetencion.create({ data: {
          parametro_id: p.id, concepto: c.concepto, label: c.label,
          tarifa_declarante: c.td, tarifa_no_declarante: c.tnd, base_minima_uvt: c.bmu,
          cargado_por: por, origen: c.importado ? 'contador' : 'manual', revisado: c.importado ? c.revisado : true,
        } })
        continue
      }
      const cambio = prev.label !== c.label || !prev.tarifa_declarante.eq(c.td) || !prev.tarifa_no_declarante.eq(c.tnd) || !prev.base_minima_uvt.eq(c.bmu)
      if (cambio) {
        await tx.conceptoRetencion.update({ where: { id: prev.id }, data: {
          label: c.label, tarifa_declarante: c.td, tarifa_no_declarante: c.tnd, base_minima_uvt: c.bmu,
          cargado_por: por, cargado_en: new Date(),
          origen: c.importado ? 'contador' : 'manual', copiado_de_anio: null, revisado: c.importado ? c.revisado : true,
        } })
      } else if (c.revisado && !prev.revisado) {
        await tx.conceptoRetencion.update({ where: { id: prev.id }, data: { revisado: true, cargado_por: por, cargado_en: new Date() } })
      }
    }
    const clavesC = new Set(conceptos.map(c => c.concepto))
    const sobraC = [...prevC.values()].filter(c => !clavesC.has(c.concepto)).map(c => c.id)
    if (sobraC.length) await tx.conceptoRetencion.deleteMany({ where: { id: { in: sobraC } } })

    const prevI = new Map((actual?.tarifasIca ?? []).map(t => [t.municipio.toLowerCase(), t]))
    for (const t of icas) {
      const prev = prevI.get(t.municipio.toLowerCase())
      if (!prev) {
        await tx.tarifaIca.create({ data: {
          parametro_id: p.id, municipio: t.municipio, tarifa_por_mil: t.tarifa,
          cargado_por: por, origen: t.importado ? 'contador' : 'manual', revisado: t.importado ? t.revisado : true,
        } })
      } else if (!prev.tarifa_por_mil.eq(t.tarifa) || prev.municipio !== t.municipio) {
        await tx.tarifaIca.update({ where: { id: prev.id }, data: {
          municipio: t.municipio, tarifa_por_mil: t.tarifa, cargado_por: por, cargado_en: new Date(),
          origen: t.importado ? 'contador' : 'manual', copiado_de_anio: null, revisado: t.importado ? t.revisado : true,
        } })
      } else if (t.revisado && !prev.revisado) {
        await tx.tarifaIca.update({ where: { id: prev.id }, data: { revisado: true, cargado_por: por, cargado_en: new Date() } })
      }
    }
    const clavesI = new Set(icas.map(t => t.municipio.toLowerCase()))
    const sobraI = [...prevI.entries()].filter(([k]) => !clavesI.has(k)).map(([, t]) => t.id)
    if (sobraI.length) await tx.tarifaIca.deleteMany({ where: { id: { in: sobraI } } })
  })
}

// ─── Copiar del año anterior ─────────────────────────────────────────────────

/**
 * Copia al borrador de `anio` lo que tenga `anio − 1`, con TRES reglas:
 *   1. NO copia el UVT ni la decisión de IVA: cambian por definición cada año.
 *   2. NUNCA pisa un valor ya cargado en el año destino.
 *   3. Todo lo copiado nace SIN REVISAR y bloquea la activación hasta que
 *      alguien lo confirme. Si no, copiar sería usar el año anterior por la
 *      puerta de atrás.
 */
export async function copiarDelAnioAnterior(anio: number, por: string) {
  const origenAnio = anio - 1
  const [fuente, destino] = await Promise.all([leerCrudo(origenAnio), leerCrudo(anio)])
  if (!fuente) throw new ErrorParametros(`No hay parámetros de ${origenAnio} para copiar.`, 404)
  if (destino?.cerrado) throw new ErrorParametros(`${anio} está cerrado.`, 409)
  if (destino?.estado === 'ACTIVO') throw new ErrorParametros(`${anio} está ACTIVO: no se copia encima de un año activo.`, 409)

  const ahora = new Date().toISOString()
  const copia = (): Procedencia => ({ por, en: ahora, origen: 'copia', copiadoDe: origenAnio, revisado: false })
  const proc = { ...((destino?.procedencia ?? {}) as ProcedenciaEscalares) }
  const copiado: string[] = []
  const omitido: string[] = ['UVT (cambia cada año)', 'decisión de IVA (se decide año por año)']

  const datos: { tarifa_iva?: Prisma.Decimal; tarifa_reteiva?: Prisma.Decimal } = {}
  if (fuente.tarifa_iva !== null) {
    if (destino?.tarifa_iva == null) { datos.tarifa_iva = fuente.tarifa_iva; proc.tarifa_iva = copia(); copiado.push('tarifa de IVA') }
    else omitido.push('tarifa de IVA (ya estaba cargada)')
  }
  if (fuente.tarifa_reteiva !== null) {
    if (destino?.tarifa_reteiva == null) { datos.tarifa_reteiva = fuente.tarifa_reteiva; proc.tarifa_reteiva = copia(); copiado.push('tarifa de reteIVA') }
    else omitido.push('tarifa de reteIVA (ya estaba cargada)')
  }

  await prisma.$transaction(async tx => {
    const p = await tx.parametroFiscal.upsert({
      where: { anio },
      create: { anio, estado: 'BORRADOR', ...datos, procedencia: proc as Prisma.InputJsonValue },
      update: { ...datos, procedencia: proc as Prisma.InputJsonValue },
    })
    const yaC = new Set((destino?.conceptos ?? []).map(c => c.concepto))
    for (const c of fuente.conceptos) {
      if (yaC.has(c.concepto)) { omitido.push(`concepto ${c.label} (ya estaba)`); continue }
      await tx.conceptoRetencion.create({ data: {
        parametro_id: p.id, concepto: c.concepto, label: c.label,
        tarifa_declarante: c.tarifa_declarante, tarifa_no_declarante: c.tarifa_no_declarante, base_minima_uvt: c.base_minima_uvt,
        cargado_por: por, origen: 'copia', copiado_de_anio: origenAnio, revisado: false,
      } })
      copiado.push(`concepto ${c.label}`)
    }
    const yaI = new Set((destino?.tarifasIca ?? []).map(t => t.municipio.toLowerCase()))
    for (const t of fuente.tarifasIca) {
      if (yaI.has(t.municipio.toLowerCase())) { omitido.push(`ICA ${t.municipio} (ya estaba)`); continue }
      await tx.tarifaIca.create({ data: {
        parametro_id: p.id, municipio: t.municipio, tarifa_por_mil: t.tarifa_por_mil,
        cargado_por: por, origen: 'copia', copiado_de_anio: origenAnio, revisado: false,
      } })
      copiado.push(`ICA ${t.municipio}`)
    }
  })
  return { copiado, omitido, desde: origenAnio }
}

// ─── Activación ──────────────────────────────────────────────────────────────

/**
 * La firma EXIGE un `ParametroActivable`, tipo que solo produce
 * `verificarActivable`. Es el compilador impidiendo activar sin validar.
 */
export async function activarAnio(parametro: ParametroActivable, por: string): Promise<void> {
  await prisma.parametroFiscal.update({
    where: { anio: parametro.anio },
    data: { estado: 'ACTIVO', activado_por: por, activado_en: new Date() },
  })
}

export async function volverABorrador(anio: number): Promise<void> {
  const p = await prisma.parametroFiscal.findUnique({ where: { anio }, select: { cerrado: true } })
  if (!p) throw new ErrorParametros(`No existe el año ${anio}.`, 404)
  if (p.cerrado) throw new ErrorParametros(`${anio} está cerrado.`, 409)
  await prisma.parametroFiscal.update({ where: { anio }, data: { estado: 'BORRADOR', activado_por: null, activado_en: null } })
}

export function anioFiscalDe(fecha: Date): number {
  return fecha.getFullYear()
}
