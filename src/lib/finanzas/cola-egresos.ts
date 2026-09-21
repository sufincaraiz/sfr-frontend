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
