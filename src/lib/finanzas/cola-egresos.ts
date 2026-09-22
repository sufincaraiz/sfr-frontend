/**
 * COLA LOCAL DE EGRESOS — para capturar sin señal
 * ===============================================
 *
 * Las visitas son en veredas. Si el envío falla, el gasto NO se pierde: queda
 * guardado en el teléfono y se reintenta cuando vuelve la señal.
 *
 * Decisión tomada (opción B, no la PWA con service worker): la app tiene que
 * seguir abierta para que la cola suba sola. Por eso el aviso «N gastos sin
 * subir» es IMPOSIBLE DE IGNORAR: si alguien cierra la pestaña con cosas en
 * cola y no vuelve, se perderían sin enterarse. Ver `avisoDeCola()`.
 *
 * Módulo HOJA con almacenamiento INYECTADO: el navegador le pasa localStorage
 * y la prueba con Node le pasa un mapa en memoria. Así la lógica de la cola se
 * ejercita de verdad, no una copia suya.
 */

export interface PendienteEnCola {
  /** Id local, no el de la base. */
  id: string
  creado_en: string
  /** El cuerpo tal cual se enviaría a POST /api/admin/finanzas/egresos. */
  cuerpo: Record<string, unknown>
  /** Foto sin subir, en base64 (data URL). Se sube al vaciar la cola. */
  foto?: string | null
  intentos: number
  ultimo_error?: string | null
}

export interface AlmacenCola {
  leer(clave: string): string | null
  escribir(clave: string, valor: string): void
}

export const CLAVE_COLA = 'sfr-cola-egresos'

export function almacenNavegador(): AlmacenCola | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return {
      leer: (k) => localStorage.getItem(k),
      escribir: (k, v) => localStorage.setItem(k, v),
    }
  } catch {
    // Modo privado o almacenamiento bloqueado: sin cola. La captura sigue
    // funcionando con señal, y sin señal avisa que no puede guardar.
    return null
  }
}

export function leerCola(a: AlmacenCola): PendienteEnCola[] {
  try {
    const crudo = a.leer(CLAVE_COLA)
    if (!crudo) return []
    const v = JSON.parse(crudo)
    return Array.isArray(v) ? (v as PendienteEnCola[]) : []
  } catch {
    return []
  }
}

function guardarCola(a: AlmacenCola, cola: PendienteEnCola[]): void {
  a.escribir(CLAVE_COLA, JSON.stringify(cola))
}

export function encolar(a: AlmacenCola, cuerpo: Record<string, unknown>, foto?: string | null): PendienteEnCola {
  const p: PendienteEnCola = {
    id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    creado_en: new Date().toISOString(),
    cuerpo,
    foto: foto ?? null,
    intentos: 0,
  }
  guardarCola(a, [...leerCola(a), p])
  return p
}

export function quitarDeCola(a: AlmacenCola, id: string): void {
  guardarCola(a, leerCola(a).filter(p => p.id !== id))
}

export function marcarIntentoFallido(a: AlmacenCola, id: string, error: string): void {
  guardarCola(a, leerCola(a).map(p => (p.id === id ? { ...p, intentos: p.intentos + 1, ultimo_error: error } : p)))
}

/**
 * El aviso que NO se puede ignorar. Se muestra en todo el módulo de finanzas
 * mientras quede algo en cola, y advierte del riesgo real: cerrar la pestaña.
 */
export function avisoDeCola(cola: PendienteEnCola[]): string | null {
  if (cola.length === 0) return null
  const n = cola.length
  return `${n} ${n === 1 ? 'gasto guardado en este teléfono y sin subir' : 'gastos guardados en este teléfono y sin subir'}. ` +
    'Están solo aquí: si cierras esta pestaña antes de que suban, no los verá nadie más.'
}

/** Sube lo que haya en cola. `enviar` inyectado para poder probarlo. */
export async function vaciarCola(
  a: AlmacenCola,
  enviar: (p: PendienteEnCola) => Promise<{ ok: boolean; error?: string }>,
): Promise<{ subidos: number; fallidos: number }> {
  let subidos = 0, fallidos = 0
  for (const p of leerCola(a)) {
    let r: { ok: boolean; error?: string }
    try { r = await enviar(p) } catch (e) { r = { ok: false, error: e instanceof Error ? e.message : 'error' } }
    if (r.ok) { quitarDeCola(a, p.id); subidos++ }
    else { marcarIntentoFallido(a, p.id, r.error ?? 'error'); fallidos++ }
  }
  return { subidos, fallidos }
}

// ─── Cola de RECIBOS pendientes ──────────────────────────────────────────────
//
// Caso distinto al de arriba: el gasto SÍ se guardó en el servidor, pero su
// foto no llegó a subir. Antes eso pasaba en silencio y el gasto quedaba sin
// soporte creyendo uno que lo tenía. En un módulo contable el silencio es peor
// que el fallo: el recibo se pierde y nadie se entera hasta una revisión.
//
// Por eso la foto NO se descarta: queda aquí, atada al id del gasto ya
// creado, hasta que suba o se borre a propósito.

export interface ReciboPendiente {
  id: string
  egreso_id: string
  /** Resumen legible del gasto, para que el aviso diga a cuál pertenece. */
  resumen: string
  creado_en: string
  /** La foto, en base64 (data URL). */
  foto: string
  intentos: number
  ultimo_error?: string | null
}

export const CLAVE_RECIBOS = 'sfr-recibos-pendientes'

export function leerRecibos(a: AlmacenCola): ReciboPendiente[] {
  try {
    const crudo = a.leer(CLAVE_RECIBOS)
    if (!crudo) return []
    const v = JSON.parse(crudo)
    return Array.isArray(v) ? (v as ReciboPendiente[]) : []
  } catch {
    return []
  }
}

const guardarRecibos = (a: AlmacenCola, cola: ReciboPendiente[]) => a.escribir(CLAVE_RECIBOS, JSON.stringify(cola))

export function encolarRecibo(a: AlmacenCola, egresoId: string, foto: string, resumen: string, error?: string): ReciboPendiente {
  const r: ReciboPendiente = {
    id: `recibo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    egreso_id: egresoId,
    resumen,
    creado_en: new Date().toISOString(),
    foto,
    intentos: error ? 1 : 0,
    ultimo_error: error ?? null,
  }
  guardarRecibos(a, [...leerRecibos(a), r])
  return r
}

export function quitarRecibo(a: AlmacenCola, id: string): void {
  guardarRecibos(a, leerRecibos(a).filter(r => r.id !== id))
}

export function marcarFalloRecibo(a: AlmacenCola, id: string, error: string): void {
  guardarRecibos(a, leerRecibos(a).map(r => (r.id === id ? { ...r, intentos: r.intentos + 1, ultimo_error: error } : r)))
}

/** Aviso del recibo que no subió. Nombra el gasto: ya existe, le falta soporte. */
export function avisoDeRecibos(cola: ReciboPendiente[]): string | null {
  if (cola.length === 0) return null
  if (cola.length === 1) {
    return `El gasto de ${cola[0]!.resumen} se guardó, pero la foto del recibo NO se subió. ` +
      'La foto sigue en este teléfono: reintenta antes de cerrar la pestaña.'
  }
  return `${cola.length} gastos se guardaron sin su foto del recibo. Las fotos siguen en este teléfono: ` +
    'reintenta antes de cerrar la pestaña.'
}

export async function vaciarRecibos(
  a: AlmacenCola,
  enviar: (r: ReciboPendiente) => Promise<{ ok: boolean; error?: string }>,
): Promise<{ subidos: number; fallidos: number }> {
  let subidos = 0, fallidos = 0
  for (const r of leerRecibos(a)) {
    let res: { ok: boolean; error?: string }
    try { res = await enviar(r) } catch (e) { res = { ok: false, error: e instanceof Error ? e.message : 'error' } }
    if (res.ok) { quitarRecibo(a, r.id); subidos++ }
    else { marcarFalloRecibo(a, r.id, res.error ?? 'error'); fallidos++ }
  }
  return { subidos, fallidos }
}
