/**
 * PENDIENTES PARA ACTIVAR UN AÑO FISCAL — única fuente
 * =====================================================
 *
 * Módulo HOJA sin ningún import, a propósito, por dos razones:
 *   1. La PANTALLA lo usa en el navegador para pintar la lista en vivo, y no
 *      puede arrastrar `@prisma/client` al bundle del cliente.
 *   2. `scripts/probar-finanzas.mjs` lo ejecuta con Node directamente.
 *
 * Lo usan la pantalla (lista en vivo), la activación (`verificarActivable`) y la
 * guarda de cálculo (`exigirParametrosCompletos`). Si fueran tres listas, la
 * pantalla diría «listo», el servidor «falta» y el cálculo haría otra cosa.
 *
 * REGLA DE LA COPIA: un valor copiado del año anterior o importado del
 * formulario del contador nace SIN REVISAR y cuenta como pendiente hasta que
 * alguien lo confirma. Sin esto, «copiar del año anterior» sería una puerta
 * trasera a la guarda que prohíbe usar el año anterior.
 */

export type Origen = 'manual' | 'copia' | 'contador'

/** Procedencia de un valor: quién, cuándo, de dónde y si ya se revisó. */
export interface Procedencia {
  por: string | null
  /** ISO 8601 */
  en: string
  origen: Origen
  copiadoDe?: number | null
  revisado: boolean
}

export interface ProcedenciaEscalares {
  uvt?: Procedencia
  responsable_iva?: Procedencia
  tarifa_iva?: Procedencia
  tarifa_reteiva?: Procedencia
}

interface FilaRevisable {
  revisado?: boolean
  origen?: string
  copiado_de_anio?: number | null
}

export interface EntradaPendientes {
  anio: number
  uvt: unknown
  /** null = sin decidir. */
  responsable_iva: boolean | null
  tarifa_iva: unknown
  tarifa_reteiva?: unknown
  conceptos: (FilaRevisable & { concepto: string; label?: string })[]
  tarifasIca?: (FilaRevisable & { municipio: string })[]
  procedencia?: ProcedenciaEscalares | null
}

const vacio = (v: unknown): boolean => v === null || v === undefined || v === ''

/** «copiado de 2025» / «importado del formulario del contador». */
export function describirOrigen(origen?: string, copiadoDe?: number | null): string {
  if (origen === 'copia') return copiadoDe ? `copiado de ${copiadoDe}` : 'copiado de otro año'
  if (origen === 'contador') return 'importado del formulario del contador'
  return 'cargado a mano'
}

function sinRevisar(p?: Procedencia): boolean {
  return !!p && p.revisado === false
}

export function pendientesParaActivar(p: EntradaPendientes): string[] {
  const falta: string[] = []
  const proc = p.procedencia ?? {}

  // ── Obligatorios ──
  if (vacio(p.uvt)) falta.push('Cargar el UVT del año')
  else if (sinRevisar(proc.uvt)) falta.push(`Revisar el UVT (${describirOrigen(proc.uvt!.origen, proc.uvt!.copiadoDe)})`)

  if (vacio(p.responsable_iva)) {
    falta.push('Decidir si el año es responsable de IVA (no se asume que no)')
  } else if (sinRevisar(proc.responsable_iva)) {
    falta.push(`Confirmar la decisión sobre IVA (${describirOrigen(proc.responsable_iva!.origen, proc.responsable_iva!.copiadoDe)})`)
  }

  // La tarifa de IVA solo importa si el año es responsable. Si no lo es, ni se
  // exige ni bloquea aunque venga copiada sin revisar: no se usa en ningún cálculo.
  if (p.responsable_iva === true) {
    if (vacio(p.tarifa_iva)) {
      falta.push('Cargar la tarifa de IVA (obligatoria porque el año es responsable de IVA)')
    } else if (sinRevisar(proc.tarifa_iva)) {
      falta.push(`Revisar la tarifa de IVA (${describirOrigen(proc.tarifa_iva!.origen, proc.tarifa_iva!.copiadoDe)})`)
    }
    if (!vacio(p.tarifa_reteiva) && sinRevisar(proc.tarifa_reteiva)) {
      falta.push(`Revisar la tarifa de reteIVA (${describirOrigen(proc.tarifa_reteiva!.origen, proc.tarifa_reteiva!.copiadoDe)})`)
    }
  }

  if (!p.conceptos || p.conceptos.length === 0) {
    falta.push('Configurar al menos un concepto de retención')
  } else {
    const nr = p.conceptos.filter(c => c.revisado === false)
    if (nr.length) {
      const origen = describirOrigen(nr[0]!.origen, nr[0]!.copiado_de_anio)
      falta.push(
        `Revisar ${nr.length} concepto${nr.length === 1 ? '' : 's'} de retención (${origen}): ` +
        nr.map(c => c.label || c.concepto).join(', '),
      )
    }
  }

  // Las tarifas de ICA no son obligatorias para activar, pero una COPIADA sin
  // revisar sí bloquea: se usaría en el cálculo como si alguien la hubiera confirmado.
  const icaNr = (p.tarifasIca ?? []).filter(t => t.revisado === false)
  if (icaNr.length) {
    const origen = describirOrigen(icaNr[0]!.origen, icaNr[0]!.copiado_de_anio)
    falta.push(
      `Revisar ${icaNr.length} tarifa${icaNr.length === 1 ? '' : 's'} de ICA (${origen}): ` +
      icaNr.map(t => t.municipio).join(', '),
    )
  }

  return falta
}

/**
 * Clave estable de un concepto a partir de su nombre: «Comisiones» →
 * «comisiones», «Otros servicios» → «otros_servicios». Una sola definición
 * para el servidor (guardar) y la pantalla (fusionar lo importado).
 */
export function claveConcepto(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}
