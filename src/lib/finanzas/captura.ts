/**
 * REGLAS DE LA CAPTURA RÁPIDA — módulo HOJA (sin imports)
 * =======================================================
 *
 * Lo ejecutan el navegador (validar antes de enviar y antes de encolar sin
 * señal), el servidor (validar lo que llega) y la prueba con Node. Una sola
 * definición de qué es un egreso capturable y de qué le falta.
 *
 * PRINCIPIO: lo mínimo es valor + categoría + naturaleza. Todo lo demás se
 * completa después. Un egreso incompleto YA cuenta en los reportes; lo que no
 * puede es perderse por estar incompleto.
 */

export type Naturaleza = 'DEL_NEGOCIO' | 'DE_OPERACION' | 'REEMBOLSABLE'

export const NATURALEZAS: { valor: Naturaleza; titulo: string; ayuda: string }[] = [
  { valor: 'DEL_NEGOCIO', titulo: 'El negocio', ayuda: 'Gasto general de la oficina' },
  { valor: 'DE_OPERACION', titulo: 'Una operación', ayuda: 'Lo absorbe una venta concreta' },
  { valor: 'REEMBOLSABLE', titulo: 'Me lo reembolsan', ayuda: 'El cliente lo devuelve: no es gasto' },
]

export interface EgresoCapturado {
  valor: string
  categoria_id: string
  naturaleza: Naturaleza
  /** Propiedad de la operación (DE_OPERACION). */
  property_id?: string | null
  /** Cliente que reembolsa (REEMBOLSABLE). */
  reembolsa_tercero_id?: string | null
  /** Proveedor. Opcional: se completa después. */
  tercero_id?: string | null
  fecha?: string | null
  descripcion?: string | null
  numero_factura_proveedor?: string | null
  metodo_pago?: string | null
  soporte_public_id?: string | null
}

/** Lo que impide GUARDAR. Vacío = se puede guardar. */
export function erroresDeCaptura(e: EgresoCapturado): string[] {
  const err: string[] = []
  const v = String(e.valor ?? '').trim()
  if (v === '') err.push('Falta el valor.')
  if (!e.categoria_id) err.push('Falta la categoría.')
  if (!NATURALEZAS.some(n => n.valor === e.naturaleza)) err.push('Falta indicar quién lo paga.')
  if (e.naturaleza === 'DE_OPERACION' && !e.property_id) {
    err.push('Un gasto de operación necesita la propiedad a la que se imputa.')
  }
  if (e.naturaleza === 'REEMBOLSABLE' && !e.reembolsa_tercero_id) {
    err.push('Un gasto reembolsable necesita el cliente que lo devuelve: si no, no hay a quién cobrarle.')
  }
  if (e.naturaleza !== 'REEMBOLSABLE' && e.reembolsa_tercero_id) {
    err.push('Solo un gasto reembolsable lleva cliente que reembolsa.')
  }
  return err
}

/**
 * Lo que falta para considerarlo COMPLETO. No impide guardar: marca
 * `por_completar` y lo manda a la lista de pendientes del escritorio.
 */
export function faltantesDeCaptura(e: EgresoCapturado): string[] {
  const f: string[] = []
  if (!e.tercero_id) f.push('proveedor')
  if (!String(e.descripcion ?? '').trim()) f.push('descripción')
  if (!e.soporte_public_id) f.push('foto del recibo')
  if (!String(e.numero_factura_proveedor ?? '').trim()) f.push('número de factura')
  return f
}

export const estaPorCompletar = (e: EgresoCapturado): boolean => faltantesDeCaptura(e).length > 0

/**
 * Orden de las categorías en los botones: las más usadas arriba, CALCULADO con
 * el uso real de los últimos 90 días. `orden` solo desempata. Una lista fija
 * envejece y nadie la mantiene.
 */
export function ordenarPorUso<T extends { id: string; orden: number; nombre: string }>(
  categorias: T[],
  usoPorCategoria: Record<string, number>,
): T[] {
  return [...categorias].sort((a, b) => {
    const ua = usoPorCategoria[a.id] ?? 0
    const ub = usoPorCategoria[b.id] ?? 0
    if (ua !== ub) return ub - ua
    if (a.orden !== b.orden) return a.orden - b.orden
    return a.nombre.localeCompare(b.nombre, 'es')
  })
}

/** Antigüedad de una cuenta por cobrar, para la pantalla de por-cobrar. */
export function tramoAntiguedad(fecha: Date, hoy: Date = new Date()): '0-30' | '31-60' | '+60' {
  const dias = Math.floor((hoy.getTime() - fecha.getTime()) / 86_400_000)
  if (dias <= 30) return '0-30'
  if (dias <= 60) return '31-60'
  return '+60'
}

// ─── Repetir el último gasto ─────────────────────────────────────────────────

export interface DestinoCapturado { id: string; etiqueta: string; detalle: string }

export interface UltimoEgreso {
  valor: string
  categoria_id: string
  categoria: string
  naturaleza: Naturaleza
  destino?: DestinoCapturado | null
  /** Puede venir de una versión anterior guardada en el teléfono. */
  foto?: string | null
  soporte_public_id?: string | null
}

export interface RepetidoEgreso {
  valor: string
  categoria_id: string
  naturaleza: Naturaleza
  destino: DestinoCapturado | null
  foto: null
  soporte_public_id: null
}

/**
 * «La gasolina se carga igual cada semana»: repetir copia valor, categoría,
 * naturaleza y la propiedad o el cliente.
 *
 * ⚠ NUNCA copia la foto ni el `public_id` del soporte, y el tipo lo garantiza
 * (`null` literal, no `string | null`). Cada gasto necesita SU comprobante: dos
 * gastos respaldados por el mismo recibo son un soporte duplicado, y en una
 * revisión de la DIAN eso no se sostiene. El repetido nace, por tanto, sin foto
 * y marcado POR COMPLETAR.
 */
export function repetirEgreso(u: UltimoEgreso): RepetidoEgreso {
  return {
    valor: u.valor,
    categoria_id: u.categoria_id,
    naturaleza: u.naturaleza,
    destino: u.destino ?? null,
    foto: null,
    soporte_public_id: null,
  }
}
