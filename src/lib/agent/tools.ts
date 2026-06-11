import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import type { Tool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'
import type { LeadQualification } from '@prisma/client'

// ─── Tool definitions (schema for Anthropic) ─────────────────────────────────

export const MAC_TOOLS: Tool[] = [
  {
    name: 'buscar_propiedades',
    description:
      'Busca propiedades disponibles en la base de datos. Úsala siempre que el cliente mencione qué busca. Nunca recomiendes propiedades sin llamarla primero.',
    input_schema: {
      type: 'object',
      properties: {
        municipio:  { type: 'string', description: 'Nombre del municipio (ej. "La Vega")' },
        tipo:       { type: 'string', description: 'Tipo: lote | casa | finca | cabaña | apartamento | condominio' },
        precioMin:  { type: 'number', description: 'Precio mínimo en COP' },
        precioMax:  { type: 'number', description: 'Precio máximo en COP' },
        areaMin:    { type: 'number', description: 'Área mínima en m²' },
        limite:     { type: 'number', description: 'Máximo de resultados (default 5, max 5)' },
      },
      required: [],
    },
  },
  {
    name: 'detalle_propiedad',
    description: 'Obtiene la ficha completa de una propiedad específica.',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Slug único de la propiedad' },
        id:   { type: 'string', description: 'ID de la propiedad' },
      },
      required: [],
    },
  },
  {
    name: 'crear_o_actualizar_lead',
    description:
      'Guarda o actualiza la información del cliente a medida que la vas conociendo. Llámala cada vez que obtengas un dato nuevo (nombre, teléfono, presupuesto, interés, tiempos). No esperes a tener todo.',
    input_schema: {
      type: 'object',
      properties: {
        nombre:        { type: 'string' },
        telefono:      { type: 'string' },
        email:         { type: 'string' },
        qualification: { type: 'string', enum: ['SIN_CALIFICAR', 'CALIENTE', 'TIBIO', 'FRIO', 'VACIO', 'DESCARTADO'] },
        budgetMin:     { type: 'number', description: 'Presupuesto mínimo en COP' },
        budgetMax:     { type: 'number', description: 'Presupuesto máximo en COP' },
        interestType:  { type: 'string', description: 'lote, casa, finca, cabaña...' },
        interestZone:  { type: 'string', description: 'Municipio/vereda de interés' },
        timeframe:     { type: 'string', description: '"inmediato", "1-3 meses", "explorando"' },
        financing:     { type: 'string', description: '"recursos propios", "crédito", "mixto"' },
        agentNotes:    { type: 'string', description: 'Resumen del cliente y contexto relevante' },
        source:        { type: 'string', description: 'meta_ads | metrocuadrado | fincaraiz | web_organico | whatsapp' },
        portalAdId:    { type: 'string', description: 'ID del anuncio del portal externo' },
        nextAction:    { type: 'string', description: 'Próxima acción para Leonel' },
        nextActionDate: { type: 'string', description: 'Fecha de próxima acción (ISO 8601)' },
      },
      required: [],
    },
  },
  {
    name: 'solicitar_asesor',
    description:
      'Escala la conversación al asesor humano. Úsala cuando el lead esté calificado como CALIENTE, pida hablar con una persona, quiera agendar visita, o aplique el protocolo de llamada preferencial.',
    input_schema: {
      type: 'object',
      properties: {
        motivo:  { type: 'string', description: 'LEAD_CALIENTE | LLAMADA_PREFERIDA | VISITA | CLIENTE_MOLESTO' },
        resumen: { type: 'string', description: 'Síntesis de la conversación y datos clave del lead' },
      },
      required: ['motivo', 'resumen'],
    },
  },
]

// ─── Tool executors ───────────────────────────────────────────────────────────

interface BuscarInput {
  municipio?: string
  tipo?: string
  precioMin?: number
  precioMax?: number
  areaMin?: number
  limite?: number
}

interface DetalleInput {
  slug?: string
  id?: string
}

interface LeadInput {
  nombre?: string
  telefono?: string
  email?: string
  qualification?: string
  budgetMin?: number
  budgetMax?: number
  interestType?: string
  interestZone?: string
  timeframe?: string
  financing?: string
  agentNotes?: string
  source?: string
  portalAdId?: string
  nextAction?: string
  nextActionDate?: string
}

interface SolicitarInput {
  motivo: string
  resumen: string
}

export type ToolInput = BuscarInput | DetalleInput | LeadInput | SolicitarInput

async function buscarPropiedades(input: BuscarInput) {
  const limite = Math.min(input.limite ?? 5, 5)

  const where: Record<string, unknown> = { status: 'available' }
  if (input.tipo) where['type'] = input.tipo
  if (input.precioMin !== undefined || input.precioMax !== undefined) {
    where['price_cop'] = {}
    if (input.precioMin !== undefined) (where['price_cop'] as Record<string, unknown>)['gte'] = BigInt(input.precioMin)
    if (input.precioMax !== undefined) (where['price_cop'] as Record<string, unknown>)['lte'] = BigInt(input.precioMax)
  }
  if (input.areaMin !== undefined) where['area_lot_m2'] = { gte: input.areaMin }
  if (input.municipio) {
    where['municipality'] = { name: { contains: input.municipio, mode: 'insensitive' } }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties = await (prisma.property.findMany as any)({
    where,
    include: {
      municipality: { select: { name: true, slug: true } },
      vereda:       { select: { name: true } },
      media:        { where: { is_primary: true }, take: 1 },
    },
    orderBy: { price_cop: 'asc' },
    take: limite,
  }) as Array<Parameters<typeof formatProperty>[0]>

  if (properties.length === 0) {
    // fallback: broader search without filters for suggestions
    const sugerencias = await prisma.property.findMany({
      where: { status: 'available' },
      include: {
        municipality: { select: { name: true, slug: true } },
        media: { where: { is_primary: true }, take: 1 },
      },
      orderBy: { updated_at: 'desc' },
      take: 3,
    })
    return {
      resultados: [],
      sugerencias: sugerencias.map(formatProperty),
      mensaje: 'No encontré propiedades con esos criterios exactos. Te comparto algunas opciones disponibles:',
    }
  }

  return { resultados: properties.map(formatProperty), sugerencias: [] }
}

function formatProperty(p: {
  id: string; slug: string; title: string | null; type: string
  price_cop: bigint; area_lot_m2: number | null; area_built_m2: number | null
  municipality: { name: string; slug: string }
  vereda?: { name: string } | null
  media?: Array<{ url: string; alt_text: string }>
}) {
  return {
    id:           p.id,
    slug:         p.slug,
    titulo:       p.title ?? p.slug,
    tipo:         p.type,
    municipio:    p.municipality.name,
    vereda:       p.vereda?.name ?? null,
    precio:       Number(p.price_cop),
    precioFormateado: `$${Number(p.price_cop).toLocaleString('es-CO')}`,
    areaCOP:      p.area_lot_m2 ?? p.area_built_m2 ?? null,
    fotoPrincipal: p.media?.[0]?.url ?? null,
    urlFicha:     `${SITE_URL}/propiedad/${p.slug}`,
  }
}

async function detallePropiedad(input: DetalleInput) {
  const where = input.slug ? { slug: input.slug } : input.id ? { id: input.id } : null
  if (!where) return { error: 'Se requiere slug o id' }

  const p = await prisma.property.findUnique({
    where: where as { slug: string } | { id: string },
    include: {
      municipality: { select: { name: true, slug: true } },
      vereda:       { select: { name: true } },
      media:        { orderBy: { order: 'asc' } },
      features:     true,
    },
  })

  if (!p) return { error: 'Propiedad no encontrada' }

  return {
    id:           p.id,
    slug:         p.slug,
    titulo:       p.title ?? p.slug,
    tipo:         p.type,
    municipio:    p.municipality.name,
    vereda:       p.vereda?.name ?? null,
    precio:       Number(p.price_cop),
    precioFormateado: `$${Number(p.price_cop).toLocaleString('es-CO')}`,
    areaLote:     p.area_lot_m2,
    areaConstruida: p.area_built_m2,
    habitaciones: p.bedrooms,
    banos:        p.bathrooms,
    descripcion:  p.description ?? p.short_description ?? '',
    caracteristicas: p.features.map(f => ({ key: f.feature_key, value: f.feature_value })),
    fotos:        p.media.filter(m => m.type === 'image').map(m => m.url),
    videoUrl:     p.video_url ?? null,
    virtualTourUrl: p.virtual_tour_url ?? null,
    estado:       p.status,
    urlFicha:     `${SITE_URL}/propiedad/${p.slug}`,
  }
}

async function crearOActualizarLead(input: LeadInput, conversationId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  })
  if (!conv) return { error: 'Conversación no encontrada' }

  const qualEnum = (input.qualification as LeadQualification | undefined) ?? undefined

  if (conv.leadId && conv.lead) {
    const updated = await prisma.lead.update({
      where: { id: conv.leadId },
      data: {
        ...(input.nombre    && { name: input.nombre }),
        ...(input.telefono  && { phone: input.telefono }),
        ...(input.email     && { email: input.email }),
        ...(qualEnum        && { qualification: qualEnum }),
        ...(input.budgetMin !== undefined && { budgetMin: input.budgetMin }),
        ...(input.budgetMax !== undefined && { budgetMax: input.budgetMax }),
        ...(input.interestType  && { interestType: input.interestType }),
        ...(input.interestZone  && { interestZone: input.interestZone }),
        ...(input.timeframe     && { timeframe: input.timeframe }),
        ...(input.financing     && { financing: input.financing }),
        ...(input.agentNotes    && { agentNotes: input.agentNotes }),
        ...(input.source        && { source: input.source }),
        ...(input.portalAdId    && { portalAdId: input.portalAdId }),
        ...(input.nextAction    && { nextAction: input.nextAction }),
        ...(input.nextActionDate && { nextActionDate: new Date(input.nextActionDate) }),
        lastContactAt: new Date(),
      },
    })
    return { ok: true, leadId: updated.id, action: 'updated' }
  }

  // Create new lead
  const lead = await prisma.lead.create({
    data: {
      name:    input.nombre    ?? 'Sin nombre',
      phone:   input.telefono  ?? '',
      email:   input.email     ?? '',
      channel: conv.channel.toLowerCase(),
      qualification: qualEnum ?? 'SIN_CALIFICAR',
      ...(input.budgetMin !== undefined && { budgetMin: input.budgetMin }),
      ...(input.budgetMax !== undefined && { budgetMax: input.budgetMax }),
      ...(input.interestType  && { interestType: input.interestType }),
      ...(input.interestZone  && { interestZone: input.interestZone }),
      ...(input.timeframe     && { timeframe: input.timeframe }),
      ...(input.financing     && { financing: input.financing }),
      ...(input.agentNotes    && { agentNotes: input.agentNotes }),
      ...(input.source        && { source: input.source }),
      ...(input.portalAdId    && { portalAdId: input.portalAdId }),
      ...(input.nextAction    && { nextAction: input.nextAction }),
      ...(input.nextActionDate && { nextActionDate: new Date(input.nextActionDate) }),
      lastContactAt: new Date(),
    },
  })

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { leadId: lead.id },
  })

  return { ok: true, leadId: lead.id, action: 'created' }
}

async function solicitarAsesor(input: SolicitarInput, conversationId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  })

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'ESCALATED' },
  })

  if (conv?.leadId) {
    await prisma.lead.update({
      where: { id: conv.leadId },
      data: {
        pipeline:   'NUEVO',
        agentNotes: input.resumen,
        ...(input.motivo === 'LLAMADA_PREFERIDA' && { nextAction: 'Llamar — cliente prefiere teléfono' }),
      },
    })
  }

  // Fase 1: log to console; Phase 2 will send WhatsApp/email notification
  console.log(`[Mac → Asesor] Motivo: ${input.motivo} | Conv: ${conversationId}`)
  console.log(`Resumen: ${input.resumen}`)

  return { ok: true, escalated: true, motivo: input.motivo }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  input: ToolInput,
  conversationId: string
): Promise<ToolResultBlockParam> {
  try {
    let result: unknown
    switch (name) {
      case 'buscar_propiedades':
        result = await buscarPropiedades(input as BuscarInput)
        break
      case 'detalle_propiedad':
        result = await detallePropiedad(input as DetalleInput)
        break
      case 'crear_o_actualizar_lead':
        result = await crearOActualizarLead(input as LeadInput, conversationId)
        break
      case 'solicitar_asesor':
        result = await solicitarAsesor(input as SolicitarInput, conversationId)
        break
      default:
        result = { error: `Tool desconocida: ${name}` }
    }
    return {
      type: 'tool_result',
      tool_use_id: '',
      content: JSON.stringify(result),
    }
  } catch (err) {
    console.error(`[Mac tool error] ${name}:`, err)
    return {
      type: 'tool_result',
      tool_use_id: '',
      content: JSON.stringify({ error: 'Error interno al ejecutar la herramienta' }),
      is_error: true,
    }
  }
}
