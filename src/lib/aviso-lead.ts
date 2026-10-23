/**
 * EL AVISO DE UN LEAD, Y POR QUÉ NO PUEDE CALLARSE
 * ================================================
 *
 * El 2026-10-23 se midió que 9 de 12 leads de los últimos 60 días no habían
 * generado ningún aviso a Leonel, y que **nadie podía haberlo sabido**: la
 * notificación no se guardaba en ninguna parte. La causa de los nueve fue que
 * `POST /api/leads` —por donde entran los cuatro formularios públicos— no
 * contenía ni una línea de aviso; nunca la tuvo. Los otros tres entraron por
 * el agente Mac, que sí avisa, y de ésos no se puede saber si llegaron.
 *
 * Y lo que lo mantuvo escondido meses: **el único camino instrumentado era el
 * menos usado.** Las pruebas recorren el camino que el programador tiene a
 * mano, no el que la gente usa.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA PROPIEDAD QUE ESTE MÓDULO EXISTE PARA TENER
 *
 * > Un camino de aviso no puede tener un solo `return` mudo.
 *
 * Antes había tres, y cada uno salía sin escribir nada:
 *
 *   · `whatsapp.ts:41`   `if (!to) return`            ← sin destino configurado
 *   · `tools.ts:630/668` `if (resumen) …`             ← el LLM no dio resumen
 *   · `whatsapp.ts:84`   `console.warn(cuerpo); return` ← el error de Meta, al log
 *
 * Los dos primeros no dejaban rastro ninguno. El tercero lo dejaba en un log
 * que caduca, y cuando se fue a buscar el cuerpo literal de Meta para los tres
 * leads de Mac, ya no existía.
 *
 * De ahí la forma de `decidirAviso`: **es total**. Para cualquier entrada
 * devuelve o «manda» o un motivo escrito, y nunca `undefined`. El tipo lo
 * obliga, y `scripts/probar-aviso-lead.mjs` lo recorre exhaustivamente: si
 * alguien añade una condición nueva y se le olvida el motivo, no compila; si
 * devuelve un motivo que la pantalla no sabe nombrar, la prueba se cae.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HASTA DÓNDE LLEGA LO QUE SABEMOS
 *
 * `ACEPTADO_POR_META` significa que la API devolvió 2xx. **No** significa que
 * el mensaje llegara al teléfono, ni que Leonel lo leyera. El nombre está
 * elegido para no afirmar de más: «ENVIADO» o «ENTREGADO» dirían algo que esta
 * capa no puede comprobar. Si algún día hace falta la entrega de verdad, la da
 * el webhook de estados de Meta, no esta función.
 *
 * Este archivo es un MÓDULO HOJA: sin imports con `@/`, sin `enum`, sin
 * propiedades de constructor. Así `node` puede ejecutarlo en modo strip-only y
 * el arnés prueba el código real, no una copia transpilada.
 */

/** Resultado de UN intento. Igual que el enum `ResultadoAviso` del esquema. */
export type ResultadoAviso =
  | 'ACEPTADO_POR_META'
  | 'RECHAZADO_POR_META'
  | 'SIN_CONFIGURAR'
  | 'ERROR_DE_RED'
  | 'SIN_RESUMEN'

/** Todos los resultados, para que una prueba pueda recorrerlos sin olvidarse. */
export const RESULTADOS: ResultadoAviso[] = [
  'ACEPTADO_POR_META',
  'RECHAZADO_POR_META',
  'SIN_CONFIGURAR',
  'ERROR_DE_RED',
  'SIN_RESUMEN',
]

/** Lo que hace falta para poder intentar un aviso por WhatsApp. */
export interface ConfigAviso {
  to: string | undefined
  phoneId: string | undefined
  token: string | undefined
}

/**
 * La decisión, y es TOTAL: o manda, o dice por qué no.
 *
 * `motivo` lleva el texto que se guarda en la fila y que el panel muestra. No
 * es para el log: es para la base, porque un log caduca.
 */
export type Decision =
  | { manda: true; destino: string }
  | { manda: false; resultado: ResultadoAviso; motivo: string; destino: string | null }

/**
 * ¿Se puede avisar de este lead, y si no, por qué exactamente?
 *
 * `resumen` es opcional porque solo el camino del agente Mac lo tiene. Un lead
 * del formulario web no genera resumen y eso NO debe impedir el aviso: ése fue
 * justo el error de `tools.ts`, donde `if (resumen)` convertía la falta de un
 * texto de cortesía en la falta del aviso entero.
 */
export function decidirAviso(cfg: ConfigAviso, resumen?: string | null): Decision {
  const to = (cfg.to ?? '').trim()
  const phoneId = (cfg.phoneId ?? '').trim()
  const token = (cfg.token ?? '').trim()

  /* Un solo motivo por llamada, y el más informativo primero: si falta el
   * destino, da igual el estado del token. Enumerar lo que falta —y no solo
   * decir «falta configuración»— es lo que convierte la fila en algo que se
   * puede arreglar sin abrir el código. */
  const falta: string[] = []
  if (!to) falta.push('ALERT_WHATSAPP_TO')
  if (!phoneId) falta.push('WHATSAPP_PHONE_NUMBER_ID')
  if (!token) falta.push('WHATSAPP_ACCESS_TOKEN')
  if (falta.length > 0) {
    return {
      manda: false,
      resultado: 'SIN_CONFIGURAR',
      motivo: 'no se intentó: falta ' + falta.join(', ') + ' en el entorno',
      destino: to || null,
    }
  }

  /* `resumen` vacío NO bloquea. Si no hay resumen se avisa igual con lo que
   * haya, porque el nombre y el teléfono ya bastan para devolver la llamada.
   * Ésta es la corrección de `if (resumen)`. */
  return { manda: true, destino: to }
}

/**
 * Clasifica lo que contestó Meta. `estado` es el HTTP; `null` significa que no
 * hubo respuesta (timeout, DNS, red).
 */
export function clasificarRespuesta(estado: number | null): ResultadoAviso {
  if (estado === null) return 'ERROR_DE_RED'
  if (estado >= 200 && estado < 300) return 'ACEPTADO_POR_META'
  return 'RECHAZADO_POR_META'
}

/** ¿Este resultado significa que el aviso salió? Solo uno de los cinco. */
export function cuenta(resultado: ResultadoAviso): boolean {
  return resultado === 'ACEPTADO_POR_META'
}

/**
 * Lo que la ficha del lead pone en pantalla. Cubre los cinco resultados; si se
 * añade uno al tipo y no aquí, TypeScript no compila (el `never` del default).
 */
export function etiquetaDeResultado(resultado: ResultadoAviso): string {
  switch (resultado) {
    case 'ACEPTADO_POR_META':  return 'Meta aceptó el aviso (no confirma lectura)'
    case 'RECHAZADO_POR_META': return 'Meta RECHAZÓ el aviso'
    case 'SIN_CONFIGURAR':     return 'No se intentó: falta configuración'
    case 'ERROR_DE_RED':       return 'No hubo respuesta de Meta (red o timeout)'
    case 'SIN_RESUMEN':        return 'No se intentó: no se generó el resumen'
    default: {
      const nunca: never = resultado
      throw new Error('resultado de aviso sin etiqueta: ' + String(nunca))
    }
  }
}

/** Una fila de aviso, tal como la lee el panel. */
export interface FilaAviso {
  resultado: ResultadoAviso
  destino?: string | null
  http_status?: number | null
  error?: string | null
  intentado_at?: Date | string
}

/**
 * EL ESTADO DE AVISO DE UN LEAD, PARA LA FICHA.
 *
 * ⚠ La lista VACÍA no es «bien»: es el defecto de los nueve. Un lead sin
 * ninguna fila es un lead por cuyo camino no pasó código de aviso, y eso tiene
 * su propio estado —`NUNCA_SE_INTENTO`— en vez de confundirse con un fallo.
 * Si devolviera `false` para los dos casos, el panel diría «no avisado» y
 * nadie distinguiría «Meta lo rechazó» de «aquí no hay código».
 */
export type EstadoAvisoLead = 'AVISADO' | 'FALLO' | 'NUNCA_SE_INTENTO'

export function estadoDeAviso(avisos: FilaAviso[]): EstadoAvisoLead {
  if (!Array.isArray(avisos) || avisos.length === 0) return 'NUNCA_SE_INTENTO'
  if (avisos.some(a => cuenta(a.resultado))) return 'AVISADO'
  return 'FALLO'
}

/**
 * ¿Puede este lead parecer atendido en el panel?
 *
 * No, mientras nadie se haya enterado. `status` lo mueve una persona en el
 * panel, así que un lead ya tocado a mano sí puede estar atendido aunque el
 * aviso fallara: alguien lo vio. Lo que no vale es que un lead en «new» sin
 * aviso se vea igual que uno en «new» avisado, porque el segundo está esperando
 * a Leonel y el primero está esperando a que alguien descubra que existe.
 */
export function pideAtencionUrgente(
  estado: EstadoAvisoLead,
  status: string,
  lastContactAt: Date | string | null | undefined,
): boolean {
  if (estado === 'AVISADO') return false
  if (lastContactAt) return false
  return status === 'new'
}

/** Resumen para la cabecera del panel: cuántos leads nadie supo que existían. */
export function resumirAvisos(
  leads: { avisos?: FilaAviso[]; status: string; lastContactAt?: Date | string | null }[],
): { total: number; avisados: number; fallaron: number; nunca: number; urgentes: number } {
  let avisados = 0, fallaron = 0, nunca = 0, urgentes = 0
  for (const l of leads) {
    const e = estadoDeAviso(l.avisos ?? [])
    if (e === 'AVISADO') avisados++
    else if (e === 'FALLO') fallaron++
    else nunca++
    if (pideAtencionUrgente(e, l.status, l.lastContactAt)) urgentes++
  }
  return { total: leads.length, avisados, fallaron, nunca, urgentes }
}
