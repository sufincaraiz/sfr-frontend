import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

// Cliente independiente al de Haiku (misma API key). El experto NO participa en la
// conversación: es un consultor puntual que Mac (Haiku) invoca cuando hace falta.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Máximo de consultas a Opus por conversación (guardarraíl de costo). */
export const MAX_EXPERT_CALLS = 2

/**
 * Timeout duro de la llamada a Opus. Con el pensamiento activo el razonamiento tarda
 * más, así que damos 45 s (antes 30 s con thinking apagado). El widget mantiene el
 * indicador de escritura toda la espera; la ruta usa maxDuration acorde.
 */
const EXPERT_TIMEOUT_MS = 45_000

/** Tope de salida del experto: pensamiento + texto. 4000 deja ~2000 para el brief. */
const EXPERT_MAX_TOKENS = 4000

// Personalidad propia: analista técnico y sobrio de la región del Gualivá. NO es
// Mac ni habla con el cliente; produce un análisis interno que Mac transmite luego
// con su propia voz.
const EXPERT_SYSTEM_PROMPT = `Eres el analista inmobiliario experto de Su Finca Raíz, especializado en la región
del Gualivá (La Vega, Sasaima, Nocaima, Villeta y municipios vecinos de Cundinamarca,
Colombia). Tu perfil es técnico, sobrio y riguroso: análisis de inversión y rentabilidad,
lectura de POT/EOT y usos del suelo, comparación de alternativas y razonamiento de
compra que va más allá de una respuesta comercial estándar.

NO eres el asistente conversacional ni hablas directamente con el cliente: entregas un
análisis interno, claro y accionable, que el asesor comercial comunicará luego con su
propia voz. Escribe en español, en prosa ordenada, directo al grano, sin saludos ni
despedidas y sin dirigirte al cliente en segunda persona.

Reglas de rigor:
- NUNCA inventes cifras exactas: porcentajes de valorización, estadísticas de mercado,
  precios puntuales, áreas o datos jurídicos de un predio específico. Razona de forma
  cualitativa y, cuando un dato requiera verificación, indícalo explícitamente como
  algo que el especialista debe confirmar.
- Usa solo la información del contexto que te entregan. Si falta un dato clave para
  concluir, dilo y señala qué haría falta.
- No des asesoría legal ni tributaria definitiva: enmárcala como criterios generales
  a validar con el especialista.
- No incluyas etiquetas XML internas ni de sistema en tu respuesta.
- Sé conciso: prioriza 2 o 3 ideas de alto valor sobre un listado exhaustivo.`

export interface ConsultarExpertoInput {
  pregunta?: string
  contexto?: string
}

/** Motivo del escalamiento, para la traza. */
export type ExpertMotivo = 'MODELO' | 'AUTO_CALIENTE'

export interface ExpertResult {
  /** Análisis del experto listo para que Mac lo comunique con su voz. */
  analisis?: string
  /** true si se alcanzó el tope de consultas. */
  limite?: boolean
  /** true si la llamada falló o expiró (Mac continúa normal). */
  error?: boolean
  /** Instrucción para Mac sobre cómo proceder (en los casos limite/error). */
  instruccion?: string
}

/**
 * Consulta al modelo experto (Opus) para un análisis que excede una respuesta
 * comercial estándar. Guardarraíles:
 *  - Máximo MAX_EXPERT_CALLS por conversación; al superarlo NO se llama a Opus y se
 *    devuelve una instrucción para ofrecer una llamada con el asesor humano.
 *  - Tokens de Opus contabilizados APARTE (expertTokensIn/Out) — nunca con los de Haiku.
 *  - Timeout de 30 s; ante fallo/timeout se devuelve un error controlado y Mac sigue.
 *  - Cada consulta se registra en consola con motivo y tokens consumidos.
 */
export async function consultarExperto(
  input: ConsultarExpertoInput,
  conversationId: string,
  motivo: ExpertMotivo = 'MODELO',
): Promise<ExpertResult> {
  // Estado actual (conteo de consultas ya hechas en esta conversación).
  const conv = await prisma.conversation.findUnique({
    where:  { id: conversationId },
    select: { expertCallCount: true },
  })
  const yaHechas = conv?.expertCallCount ?? 0

  // Guardarraíl 1: tope de consultas. No se llama a Opus.
  if (yaHechas >= MAX_EXPERT_CALLS) {
    console.log(`[Mac→Experto] conv=${conversationId} motivo=${motivo} BLOQUEADO por tope (callCount=${yaHechas}/${MAX_EXPERT_CALLS})`)
    return {
      limite: true,
      instruccion:
        'Ya se hizo el máximo de análisis a fondo en esta conversación. NO intentes otro análisis. ' +
        'En tu propia voz, ofrécele al cliente una llamada con nuestro asesor humano para profundizar; ' +
        'si acepta, usa solicitar_asesor con un buen resumen.',
    }
  }

  const pregunta = (input.pregunta ?? '').trim() || 'Elabora un análisis de inversión para este cliente.'
  const contexto = (input.contexto ?? '').trim() || '(sin contexto adicional)'

  const userContent = `Consulta del asesor comercial:\n${pregunta}\n\nContexto recogido en la conversación:\n${contexto}`

  try {
    // Opus 5 razona antes de responder: el pensamiento es justo lo que aporta valor en
    // análisis de inversión y normativa POT/EOT. En Opus 5 NO existe budget_tokens
    // (devuelve 400): el presupuesto de razonamiento se controla con thinking adaptativo
    // + effort. Con max_tokens=4000 y effort "medium", el modelo razona con holgura y
    // deja espacio amplio (~2000 tokens) para el texto final del brief. Sin herramientas
    // en esta llamada, la respuesta sale como texto directo.
    const response = await anthropic.messages.create(
      {
        model:         'claude-opus-5',
        max_tokens:    EXPERT_MAX_TOKENS,
        thinking:      { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system:        EXPERT_SYSTEM_PROMPT,
        messages:      [{ role: 'user', content: userContent }],
      },
      { signal: AbortSignal.timeout(EXPERT_TIMEOUT_MS), maxRetries: 0 },
    )

    const usage = response.usage
    const inTok  = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0)
    // output_tokens ya incluye los tokens de PENSAMIENTO + los de TEXTO: la API los
    // factura juntos como output. Así el costo real de Opus queda bien registrado.
    const outTok = usage.output_tokens ?? 0

    const analisis = response.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim()

    if (!analisis) {
      console.warn(`[Mac→Experto] conv=${conversationId} motivo=${motivo} respuesta vacía (tokens in/out=${inTok}/${outTok})`)
      return { error: true, instruccion: 'El análisis no está disponible ahora. Continúa la conversación normalmente con lo que ya sabes.' }
    }

    // Contabilidad APARTE + incremento del conteo (solo en consultas efectivas).
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          expertCallCount: { increment: 1 },
          expertTokensIn:  { increment: inTok },
          expertTokensOut: { increment: outTok },
        },
      })
    } catch (err) {
      console.error('[Mac→Experto] DB error (contabilidad experto):', err)
    }

    console.log(`[Mac→Experto] conv=${conversationId} motivo=${motivo} OK callCount=${yaHechas + 1}/${MAX_EXPERT_CALLS} tokensExperto(in/out)=${inTok}/${outTok}`)
    return { analisis }
  } catch (err) {
    // Guardarraíl 3: fallo o timeout → error controlado, sin romper la conversación.
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[Mac→Experto] conv=${conversationId} motivo=${motivo} FALLO (${msg})`)
    return {
      error: true,
      instruccion: 'No pude obtener el análisis a fondo en este momento. Continúa la conversación con normalidad usando lo que ya sabes; si el cliente lo necesita, ofrece conectarlo con el asesor humano.',
    }
  }
}
