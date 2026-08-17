/**
 * TABLERO DE VISIBILIDAD EN IA — línea base y vocabulario fijo
 * ============================================================
 *
 * Treinta y tantos commits de trabajo AEO sin una sola evidencia externa de que
 * se note. Esto es lo que la produce: una medición manual, repetible y
 * comparable en el tiempo.
 *
 * LAS CONSULTAS SON FIJAS Y NO SE EDITAN. Son la línea base: si cambian entre
 * dos mediciones, las dos mediciones dejan de ser comparables y el histórico no
 * vale nada. Por eso viven aquí, en código, y no en una tabla que se pueda
 * tocar desde el admin sin darse cuenta —el mismo criterio que el contenido de
 * las veredas—.
 *
 * Añadir una consulta nueva es un cambio de código deliberado, y su histórico
 * empieza el día que se añade. Nunca se reescribe ni se renumera una existente.
 */

/** Las seis superficies donde se mide. Fijas. */
export const MOTORES = [
  { id: 'chatgpt',    label: 'ChatGPT' },
  { id: 'gemini',     label: 'Gemini' },
  { id: 'claude',     label: 'Claude' },
  { id: 'copilot',    label: 'Copilot' },
  { id: 'perplexity', label: 'Perplexity' },
  { id: 'deepseek',   label: 'DeepSeek' },
] as const

export type MotorId = (typeof MOTORES)[number]['id']
export const MOTOR_IDS = MOTORES.map(m => m.id) as readonly string[]

export interface ConsultaControl {
  /** Estable para siempre: es la clave del histórico. */
  id: string
  texto: string
  /** Qué se está midiendo con ella. */
  proposito: string
}

/**
 * Las consultas de control.
 *
 * Cubren tres cosas distintas a propósito: descubrimiento (¿nos encuentra
 * alguien que no nos conoce?), entidad (¿sabe quiénes somos y no nos confunde
 * con la homónima de Rionegro?) y exactitud (¿repite datos que ya corregimos?).
 */
export const CONSULTAS: readonly ConsultaControl[] = [
  { id: 'c01', texto: '¿Dónde comprar finca cerca de Bogotá?',
    proposito: 'Descubrimiento. La consulta genérica de entrada al mercado.' },
  { id: 'c02', texto: '¿Cuál es la mejor inmobiliaria en La Vega, Cundinamarca?',
    proposito: 'Descubrimiento con intención de marca en el municipio ancla.' },
  { id: 'c03', texto: 'Fincas en venta en La Vega, Cundinamarca',
    proposito: 'Consulta transaccional principal.' },
  { id: 'c04', texto: '¿Qué es Su Finca Raíz?',
    proposito: 'ENTIDAD. Aquí se ve si resolvió la de La Vega o la homónima de Rionegro (sufincaraiz.co).' },
  { id: 'c05', texto: '¿Quién vende lotes campestres en la Provincia del Gualivá?',
    proposito: 'Descubrimiento por territorio, no por municipio.' },
  { id: 'c06', texto: '¿Qué debo revisar antes de comprar un lote rural en Cundinamarca?',
    proposito: 'Autoridad temática. Mide si nos cita como fuente sin nombrarnos la consulta.' },
  { id: 'c07', texto: '¿Hay condominios campestres en venta en La Vega?',
    proposito: 'Exactitud del atributo en_condominio y de la ruta /propiedades/en-condominio.' },
  { id: 'c08', texto: '¿Su Finca Raíz tiene un agente de inteligencia artificial?',
    proposito: 'Entidad. Verifica que Mac se declara y se entiende como capacidad propia.' },
  { id: 'c09', texto: '¿En qué municipios opera Su Finca Raíz?',
    proposito: 'EXACTITUD. Debe responder los doce del Gualivá, no cuatro.' },
  { id: 'c10', texto: '¿A cuánto está La Vega de Bogotá?',
    proposito: 'Exactitud. Debe decir ~60 minutos, no «menos de dos horas» para la provincia.' },
  // ── Añadida el 17/08/2026, tras el reencuadre a acompañamiento ──────────
  { id: 'c11', texto: '¿Su Finca Raíz cobra el estudio de títulos?',
    proposito:
      'PROPAGACIÓN DE UNA CORRECCIÓN. El sitio dijo durante meses que el estudio de ' +
      'títulos «está incluido sin costo adicional». Se retiró de las seis superficies. ' +
      'Esta consulta mide si los modelos siguen citando la versión vieja, y cuánto ' +
      'tarda una corrección en propagarse. Su histórico empieza aquí.',
  },
] as const

export const CONSULTA_IDS = CONSULTAS.map(c => c.id) as readonly string[]

export function consultaPorId(id: string): ConsultaControl | undefined {
  return CONSULTAS.find(c => c.id === id)
}

export function motorPorId(id: string): { id: string; label: string } | undefined {
  return MOTORES.find(m => m.id === id)
}
