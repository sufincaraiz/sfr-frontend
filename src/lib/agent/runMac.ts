import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { MAC_SYSTEM_PROMPT } from '@/lib/agent/prompt'
import { MAC_TOOLS, executeTool, type ToolInput } from '@/lib/agent/tools'
import type { MessageParam, ToolUseBlock, ContentBlock } from '@anthropic-ai/sdk/resources/messages'

export type MacChannel = 'WEB' | 'WHATSAPP' | 'TELEGRAM' | 'APP'

export interface RunMacResult {
  reply: string
  properties: unknown[]
  escalated: boolean
  conversationId: string
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  const systemPrompt = `${MAC_SYSTEM_PROMPT}\n\n# Contexto de sesión\n${contextLines.join('\n')}`

  // 5. Loop agéntico (máx 5 iteraciones)
  let reply = ''
  let escalated = false
  const collectedProperties: unknown[] = []
  const MAX_ITERATIONS = 5

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      MAC_TOOLS,
      messages:   history,
    })

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

  if (!reply) {
    reply = 'Disculpa, tuve un problema procesando tu mensaje. ¿Podrías repetirlo?'
  }

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
