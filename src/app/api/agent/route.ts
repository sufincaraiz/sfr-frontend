import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { MAC_SYSTEM_PROMPT } from '@/lib/agent/prompt'
import { MAC_TOOLS, executeTool, type ToolInput } from '@/lib/agent/tools'
import type { MessageParam, ToolUseBlock, ContentBlock } from '@anthropic-ai/sdk/resources/messages'

// ─── Rate limiter (in-memory, per sessionId) ─────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(sessionId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// ─── Input schema ─────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  message:   z.string().min(1).max(4000),
  channel:   z.enum(['WEB', 'WHATSAPP', 'TELEGRAM', 'APP']).default('WEB'),
})

// ─── Anthropic client ─────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Parse and validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido.' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de entrada inválidos.' }, { status: 400 })
  }

  const { sessionId, message, channel } = parsed.data

  // 2. Rate limit
  if (!checkRateLimit(sessionId)) {
    return NextResponse.json(
      { error: 'Demasiados mensajes. Por favor espera un momento.' },
      { status: 429 }
    )
  }

  // 3. Find or create Conversation
  let conversation
  try {
    conversation = await prisma.conversation.upsert({
      where:  { channel_externalId: { channel, externalId: sessionId } },
      update: { updatedAt: new Date() },
      create: { channel, externalId: sessionId },
      include: { lead: true, messages: { orderBy: { createdAt: 'asc' }, take: 30 } },
    })
  } catch (err) {
    console.error('[Mac] DB error (conversation upsert):', err)
    return NextResponse.json(
      { error: 'Error interno. Por favor intenta de nuevo.' },
      { status: 500 }
    )
  }

  // 4. Save incoming user message
  try {
    await prisma.message.create({
      data: { conversationId: conversation.id, role: 'USER', content: message },
    })
  } catch (err) {
    console.error('[Mac] DB error (save user message):', err)
  }

  // 5. Build conversation history for Anthropic
  const history: MessageParam[] = conversation.messages.map((m) => ({
    role:    m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }))

  // Append current user message (not yet in DB history since just saved)
  history.push({ role: 'user', content: message })

  // 6. Build dynamic system prompt context
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

  // 7. Agentic loop (max 5 iterations)
  let reply = ''
  let escalated = false
  const collectedProperties: unknown[] = []
  const MAX_ITERATIONS = 5

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5',
        max_tokens: 1024,
        system:     systemPrompt,
        tools:      MAC_TOOLS,
        messages:   history,
      })

      // Collect text blocks
      const textBlocks = response.content.filter(
        (b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text'
      )
      if (textBlocks.length > 0) {
        reply = textBlocks.map((b) => b.text).join('\n')
      }

      // If model is done, exit loop
      if (response.stop_reason !== 'tool_use') break

      // Collect tool_use blocks
      const toolUseBlocks = response.content.filter(
        (b): b is ToolUseBlock => b.type === 'tool_use'
      )
      if (toolUseBlocks.length === 0) break

      // Append assistant turn to history
      history.push({ role: 'assistant', content: response.content })

      // Execute each tool and collect results
      const toolResultMessages: MessageParam['content'] = []

      for (const toolBlock of toolUseBlocks) {
        const result = await executeTool(
          toolBlock.name,
          toolBlock.input as ToolInput,
          conversation.id
        )

        // Fill in the actual tool_use_id
        result.tool_use_id = toolBlock.id

        toolResultMessages.push(result)

        // Track escalation
        if (toolBlock.name === 'solicitar_asesor') escalated = true

        // Collect property data for frontend card rendering
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

      // Append tool results to history
      history.push({ role: 'user', content: toolResultMessages })
    }
  } catch (err) {
    console.error('[Mac] Anthropic API error:', err)
    return NextResponse.json(
      { error: 'El asistente no está disponible en este momento. Por favor intenta más tarde.' },
      { status: 503 }
    )
  }

  // Fallback reply if model returned no text
  if (!reply) {
    reply = 'Disculpa, tuve un problema procesando tu mensaje. ¿Podrías repetirlo?'
  }

  // 8. Save assistant reply to DB
  try {
    await prisma.message.create({
      data: { conversationId: conversation.id, role: 'ASSISTANT', content: reply },
    })
  } catch (err) {
    console.error('[Mac] DB error (save assistant message):', err)
  }

  // 9. Respond
  return NextResponse.json({
    reply,
    properties: collectedProperties,
    escalated,
    conversationId: conversation.id,
  })
}
