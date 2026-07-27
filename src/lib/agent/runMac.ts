import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { MAC_SYSTEM_PROMPT } from '@/lib/agent/prompt'
import { bloqueConocimiento } from '@/lib/agent/knowledge'
import { MAC_TOOLS, executeTool, type ToolInput } from '@/lib/agent/tools'
import type { MessageParam, ToolUseBlock, ContentBlock, TextBlockParam } from '@anthropic-ai/sdk/resources/messages'

export type MacChannel = 'WEB' | 'WHATSAPP' | 'TELEGRAM' | 'APP'

export interface RunMacResult {
  reply: string
  properties: unknown[]
  escalated: boolean
  conversationId: string
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Topes de consumo por conversación (techo de costo) ───────────────────────
const MAX_TURNS = 25
const MAX_TOKENS_IN = 150_000
const MAX_TOKENS_OUT = 15_000

// Mensaje de cierre: al alcanzar un tope o si la conversación ya está cerrada.
const CIERRE_MSG =
  'Ha sido un gusto conversar contigo. Para continuar con calma y darte atención personalizada, escríbeme por WhatsApp al 321 882 6730 y seguimos por ahí. 🏡'

/**
 * Ni el widget de la web ni WhatsApp renderizan markdown: los ** y ## se ven
 * literales. El prompt ya pide texto plano, pero el modelo recae; esto lo
 * garantiza. En WhatsApp la negrita existe con un solo asterisco, así que allí
 * se traduce en vez de borrarse.
 */
function aTextoPlano(texto: string, channel: MacChannel): string {
  const negrita = channel === 'WHATSAPP' ? '*$1*' : '$1'
  return texto
    .replace(/\*\*([\s\S]+?)\*\*/g, negrita)
    .replace(/__([\s\S]+?)__/g, negrita)
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
}

/**
 * Núcleo de Mac, reutilizable por cualquier canal (web, WhatsApp, …): upsert de
 * conversación + historial + system prompt + loop agéntico + persistencia.
 * Es la MISMA lógica y el MISMO prompt que usa la web; la ruta y el webhook solo
 * la envuelven (validación, rate-limit, envío). Lanza si falla la BD o Anthropic.
 */
export async function runMac(
  { sessionId, message, channel }: { sessionId: string; message: string; channel: MacChannel },
): Promise<RunMacResult> {
  // 1. Conversación (crea o recupera) con historial y lead
  const conversation = await prisma.conversation.upsert({
    where:  { channel_externalId: { channel, externalId: sessionId } },
    update: { updatedAt: new Date() },
    create: { channel, externalId: sessionId },
    include: { lead: true, messages: { orderBy: { createdAt: 'asc' }, take: 30 } },
  })

  // 1.b. Techo de costo: si la conversación ya está cerrada o superó algún tope,
  //      respondemos el mensaje de cierre SIN llamar a la API de Anthropic.
  if (conversation.closedAt) {
    return { reply: CIERRE_MSG, properties: [], escalated: false, conversationId: conversation.id }
  }
  const capReason =
    conversation.turnCount >= MAX_TURNS     ? 'MAX_TURNS'      :
    conversation.tokensIn  >= MAX_TOKENS_IN  ? 'MAX_TOKENS_IN'  :
    conversation.tokensOut >= MAX_TOKENS_OUT ? 'MAX_TOKENS_OUT' : null
  if (capReason) {
    try {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { closedAt: new Date(), closedReason: capReason },
      })
    } catch (err) {
      console.error('[Mac] DB error (cerrar conversación):', err)
    }
    console.log(`[Mac] conv=${conversation.id} CERRADA por ${capReason} (turnos=${conversation.turnCount}, tokensIn=${conversation.tokensIn}, tokensOut=${conversation.tokensOut})`)
    return { reply: CIERRE_MSG, properties: [], escalated: false, conversationId: conversation.id }
  }

  // 2. Guardar el mensaje entrante del usuario
  try {
    await prisma.message.create({
      data: { conversationId: conversation.id, role: 'USER', content: message },
    })
  } catch (err) {
    console.error('[Mac] DB error (save user message):', err)
  }

  // 3. Historial para Anthropic
  const history: MessageParam[] = conversation.messages.map((m) => ({
    role:    m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }))
  history.push({ role: 'user', content: message })

  // 4. System prompt dinámico
  const lead = conversation.lead
  const contextLines: string[] = [
    `Fecha actual: ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Canal: ${channel}`,
    `ID de conversación: ${conversation.id}`,
  ]
  if (lead) {
    contextLines.push(`Lead existente: nombre="${lead.name}", calificación="${lead.qualification}", pipeline="${lead.pipeline}"`)
    if (lead.phone) contextLines.push(`Teléfono: ${lead.phone}`)
    if (lead.interestType) contextLines.push(`Interés: ${lead.interestType}`)
    if (lead.interestZone) contextLines.push(`Zona de interés: ${lead.interestZone}`)
  }
  if (conversation.status === 'ESCALATED') {
    contextLines.push('Esta conversación ya fue escalada al asesor humano. Informa al cliente que el especialista lo contactará pronto.')
  }
  // Base de conocimiento editable desde /admin/mac (promociones, FAQ, políticas)
  const conocimiento = await bloqueConocimiento()
  // Prompt caching: el bloque ESTÁTICO (prompt + conocimiento, grande y estable)
  // se cachea; el contexto dinámico va aparte SIN cache porque cambia cada turno.
  // cache_control marca el fin del prefijo cacheado, así que va en el bloque
  // estable. (Haiku necesita ~2048+ tokens para activar el caché; si no llega,
  // simplemente no cachea, no rompe nada.)
  const systemStatic  = `${MAC_SYSTEM_PROMPT}${conocimiento}`
  const systemDynamic = `\n\n# Contexto de sesión\n${contextLines.join('\n')}`
  const systemBlocks: TextBlockParam[] = [
    { type: 'text', text: systemStatic, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: systemDynamic },
  ]

  // 5. Loop agéntico (máx 5 iteraciones) + contabilidad de tokens del turno
  let reply = ''
  let escalated = false
  let turnTokensIn = 0
  let turnTokensOut = 0
  const collectedProperties: unknown[] = []
  const MAX_ITERATIONS = 5

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 1024,
      system:     systemBlocks,
      tools:      MAC_TOOLS,
      messages:   history,
    })

    // Acumula tokens de esta llamada (incluye tokens de creación/lectura de caché)
    const usage = response.usage
    turnTokensIn  += (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0)
    turnTokensOut += (usage.output_tokens ?? 0)

    const textBlocks = response.content.filter(
      (b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text',
    )
    if (textBlocks.length > 0) {
      reply = textBlocks.map((b) => b.text).join('\n')
    }

    if (response.stop_reason !== 'tool_use') break

    const toolUseBlocks = response.content.filter(
      (b): b is ToolUseBlock => b.type === 'tool_use',
    )
    if (toolUseBlocks.length === 0) break

    history.push({ role: 'assistant', content: response.content })

    const toolResultMessages: MessageParam['content'] = []
    for (const toolBlock of toolUseBlocks) {
      const result = await executeTool(toolBlock.name, toolBlock.input as ToolInput, conversation.id)
      result.tool_use_id = toolBlock.id
      toolResultMessages.push(result)

      if (toolBlock.name === 'solicitar_asesor') escalated = true

      if (toolBlock.name === 'buscar_propiedades' || toolBlock.name === 'detalle_propiedad') {
        try {
          const parsed = JSON.parse(result.content as string) as {
            resultados?: unknown[]
            sugerencias?: unknown[]
          }
          if (parsed.resultados?.length) collectedProperties.push(...parsed.resultados)
          if (parsed.sugerencias?.length) collectedProperties.push(...parsed.sugerencias)
        } catch {
          // ignore parse errors
        }
      }
    }
    history.push({ role: 'user', content: toolResultMessages })
  }

  reply = reply ? aTextoPlano(reply, channel) : 'Disculpa, tuve un problema procesando tu mensaje. ¿Podrías repetirlo?'

  // 5.b. Contabilidad: acumula tokens del turno e incrementa turnCount.
  const totalIn   = conversation.tokensIn  + turnTokensIn
  const totalOut  = conversation.tokensOut + turnTokensOut
  const totalTurn = conversation.turnCount + 1
  try {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        tokensIn:  { increment: turnTokensIn },
        tokensOut: { increment: turnTokensOut },
        turnCount: { increment: 1 },
      },
    })
  } catch (err) {
    console.error('[Mac] DB error (contabilidad de tokens):', err)
  }
  console.log(`[Mac] conv=${conversation.id} turno=${totalTurn} tokensTurno(in/out)=${turnTokensIn}/${turnTokensOut} acumulado(in/out)=${totalIn}/${totalOut}`)

  // 6. Guardar la respuesta del asistente
  try {
    await prisma.message.create({
      data: { conversationId: conversation.id, role: 'ASSISTANT', content: reply },
    })
  } catch (err) {
    console.error('[Mac] DB error (save assistant message):', err)
  }

  return { reply, properties: collectedProperties, escalated, conversationId: conversation.id }
}
