import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { consultarExperto } from '@/lib/agent/expert'
import { enviarAlertaLeadWhatsApp } from '@/lib/whatsapp'
import {
  norm, terminos, filtrarPorTerminos, puntuar, tiposDesde, TIPO_SINONIMOS, type Puntuable,
} from './busqueda-texto'
import type { Tool, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'
import type { LeadQualification } from '@prisma/client'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Tool definitions (schema for Anthropic) ─────────────────────────────────

export const MAC_TOOLS: Tool[] = [
  {
    name: 'buscar_propiedades',
    description:
      'Busca propiedades disponibles en la base de datos. Úsala siempre que el cliente mencione qué busca. Nunca recomiendes propiedades sin llamarla primero. Los filtros son flexibles: si no hay coincidencias exactas, la herramienta relaja los criterios sola y te avisa en el campo "aviso".',
    input_schema: {
      type: 'object',
      properties: {
        municipio:  { type: 'string', description: 'Nombre del municipio (ej. "La Vega", "Albán"). Tildes y mayúsculas no importan.' },
        tipo:       { type: 'string', description: 'Tipo tal como lo dijo el cliente: lote | casa | finca | cabaña | apartamento | condominio | local. Se interpreta con sinónimos (parcela, terreno, chalet, apto…).' },
        texto:      { type: 'string', description: 'Palabras clave del cliente cuando no encajan en los otros filtros: nombre del proyecto o condominio ("La Rivera", "Senderos del Bosque"), vereda, o características ("piscina", "vista", "río"). Busca en título y descripción.' },
        precioMin:  { type: 'number', description: 'Precio mínimo en COP' },
        precioMax:  { type: 'number', description: 'Precio máximo en COP' },
        areaMin:    { type: 'number', description: 'Área mínima en m²' },
        limite:     { type: 'number', description: 'Máximo de resultados (default 6, máx 10)' },
        ordenar:    { type: 'string', enum: ['reciente', 'precio_desc', 'precio_asc'], description: 'Orden: "reciente" (default, novedades primero), "precio_desc" (premium/las más costosas primero, útil para anclar la opción más full) o "precio_asc" (las más económicas primero)' },
      },
      required: [],
    },
  },
  {
    name: 'resumen_portafolio',
    description:
      'Devuelve el inventario real y actualizado: cuántas propiedades hay disponibles, por tipo, por municipio, el rango de precios y las más recientes. Úsala cuando el cliente pregunte de forma general ("¿qué tienen?", "¿qué hay nuevo?", "¿en qué municipios trabajan?") o cuando necesites saber si vale la pena filtrar. Nunca afirmes cifras de inventario sin llamarla.',
    input_schema: { type: 'object', properties: {}, required: [] },
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
        motivo:  { type: 'string', description: 'LEAD_CALIENTE | LLAMADA_PREFERIDA | VISITA | VENDEDOR | PROPIEDAD_FUERA_CATALOGO | ALIADO_BROKER | CLIENTE_MOLESTO | CONSULTA_ESPECIAL (pregunta cuya respuesta no tienes: promociones, descuentos, permutas, financiación puntual, documentos de un predio…)' },
        resumen: { type: 'string', description: 'Síntesis de la conversación y datos clave del lead' },
      },
      required: ['motivo', 'resumen'],
    },
  },
  {
    name: 'marcar_fuera_de_alcance',
    description:
      'Llámala cuando el cliente pide algo AJENO al negocio inmobiliario de La Vega / Gualivá (traducir, programar, redactar textos ajenos, tareas, consejos generales, recetas, etc.). NO cumplas la petición. El servidor lleva el conteo y decide cómo responder; tú solo la marcas y sigues lo que te devuelva.',
    input_schema: {
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Qué pidió el cliente, en pocas palabras' },
      },
      required: ['motivo'],
    },
  },
  {
    name: 'consultar_experto',
    description:
      'Consulta al analista experto de Su Finca Raíz. Úsala SOLO cuando el cliente pida análisis de inversión o rentabilidad, pregunte por normativa POT/EOT o usos del suelo, compare tres o más propiedades, o requiera un razonamiento que excede una respuesta comercial estándar. No la uses para preguntas simples de precio, ubicación o disponibilidad.',
    input_schema: {
      type: 'object',
      properties: {
        pregunta: { type: 'string', description: 'La consulta técnica en detalle' },
        contexto: { type: 'string', description: 'Datos relevantes ya recogidos en la conversación (presupuesto, zona de interés, propiedades vistas)' },
      },
      required: ['pregunta', 'contexto'],
    },
  },
]

// ─── Tool executors ───────────────────────────────────────────────────────────

interface BuscarInput {
  municipio?: string
  tipo?: string
  texto?: string
  precioMin?: number
  precioMax?: number
  areaMin?: number
  limite?: number
  ordenar?: 'reciente' | 'precio_desc' | 'precio_asc'
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

interface ExpertoInput {
  pregunta?: string
  contexto?: string
}

export type ToolInput = BuscarInput | DetalleInput | LeadInput | SolicitarInput | ExpertoInput

// ─── Normalización de criterios ───────────────────────────────────────────────
// El cliente escribe "cabaña", "Finca", "Alban", "terreno"… y la BD guarda
// etiquetas fijas en minúscula y con tilde. Sin normalizar, el filtro exacto
// devolvía 0 resultados y Mac respondía que no había nada (aunque sí hubiera).
//
// La normalización, los sinónimos de tipo y el filtro de texto se importan
// arriba desde `busqueda-texto.ts`: vive en un módulo
// propio para que `scripts/probar-busqueda.ts` ejercite ESAS funciones y no
// una copia suya.

/** ids de municipios cuyo nombre coincide con lo que dijo el cliente, ignorando tildes. */
async function municipioIds(entrada: string): Promise<string[]> {
  const n = norm(entrada)
  const todos = await prisma.municipality.findMany({ select: { id: true, name: true } })
  return todos.filter(m => norm(m.name).includes(n) || n.includes(norm(m.name))).map(m => m.id)
}

const PROP_INCLUDE = {
  municipality: { select: { name: true, slug: true } },
  vereda:       { select: { name: true } },
  media:        { where: { is_primary: true }, take: 1 },
} as const

async function buscarPropiedades(input: BuscarInput) {
  const limite = Math.min(input.limite ?? 6, 10)

  // Orden: por defecto novedades primero (así las propiedades recién subidas
  // siempre aparecen); opcional por precio para anclar la opción "más full".
  const orderBy =
    input.ordenar === 'precio_asc'  ? { price_cop: 'asc'  as const } :
    input.ordenar === 'precio_desc' ? { price_cop: 'desc' as const } :
                                      { updated_at: 'desc' as const }

  // Nombre largo a propósito: con "totalDisponibles" a secas el modelo lo leía
  // como "cuántas hay de lo que el cliente preguntó" e inventaba cifras.
  const totalDisponiblesEnTodoElPortafolio = await prisma.property.count({ where: { status: 'available' } })

  // ── Criterios, cada uno como filtro independiente y descartable ────────────
  // Un criterio filtra en la base (`where`) o en memoria (`filtro`). El de texto
  // es de los segundos: ver `filtrarPorTerminos`. Los dos se relajan igual.
  const criterios: Array<{
    nombre: string
    where?: Record<string, unknown>
    filtro?: (p: Puntuable) => boolean
  }> = []

  if (input.tipo) {
    // «Condominio» y «conjunto» dejaron de ser un valor de `type`: son el
    // RÉGIMEN de propiedad y viven en `en_condominio`. Sin esta intercepción,
    // un cliente que pregunta «¿tienen condominios?» recibiría cero resultados
    // habiendo doce inmuebles en condominio — la reclasificación de tipos habría
    // roto en silencio una de las consultas más frecuentes del negocio.
    //
    // Régimen y tipo son INDEPENDIENTES y se acumulan. «Casas en condominio» es
    // una pregunta por las dos cosas: la primera versión de esta intercepción
    // dejaba que la palabra «condominio» se comiera el tipo, y devolvía los doce
    // inmuebles —lotes incluidos— a quien había preguntado por casas.
    const entrada = norm(input.tipo)
    const enCondominio = /condominio|conjunto/.test(entrada)

    if (enCondominio) {
      criterios.push({ nombre: 'en condominio', where: { en_condominio: true } })
    }

    // Se quita lo que ya consumió el régimen y se busca el tipo en lo que queda.
    const resto = enCondominio
      ? entrada.replace(/\b(en|dentro de)\b/g, ' ').replace(/condominios?|conjuntos?( cerrados?)?/g, ' ').trim()
      : entrada

    const tipos = resto ? tiposDesde(resto) : null
    if (tipos) criterios.push({ nombre: `tipo ${input.tipo}`, where: { type: { in: tipos } } })
    // Si el tipo no se reconoce (ej. "casa lote"), no se filtra: se usa como texto.
  }

  // Zona pedida fuera de nuestra cobertura: se muestran opciones igual, pero Mac
  // debe decirlo con claridad para no dar a entender que operamos allí.
  let zonaFuera: string | null = null
  if (input.municipio) {
    const ids = await municipioIds(input.municipio)
    if (ids.length) criterios.push({ nombre: `municipio ${input.municipio}`, where: { municipality_id: { in: ids } } })
    else zonaFuera = input.municipio
  }

  const libre = [input.texto, tiposDesde(input.tipo ?? '') ? null : input.tipo]
    .filter((s): s is string => !!s && s.trim().length >= 3)

  // TODOS los términos deben aparecer; cada uno puede caer en cualquier campo.
  const terms = [...new Set(libre.flatMap(terminos))]
  if (terms.length) {
    // Criterio MARCADOR: su filtro es inerte a propósito. El texto no se aplica
    // aquí sino en `filtrarPorTerminos`, que relaja solo. El criterio existe
    // para que la cascada pueda descartarlo —y decírselo a Mac en el aviso— si
    // ni siquiera un término aparece en ninguna ficha.
    criterios.push({ nombre: `búsqueda "${terms.join(' ')}"`, filtro: () => true })
  }

  if (input.precioMin !== undefined || input.precioMax !== undefined) {
    const rango: Record<string, bigint> = {}
    if (input.precioMin !== undefined) rango['gte'] = BigInt(Math.round(input.precioMin))
    if (input.precioMax !== undefined) rango['lte'] = BigInt(Math.round(input.precioMax))
    criterios.push({ nombre: 'rango de precio', where: { price_cop: rango } })
  }

  if (input.areaMin !== undefined) {
    criterios.push({ nombre: 'área mínima', where: { area_lot_m2: { gte: input.areaMin } } })
  }

  // ── Relajación progresiva: se sueltan los criterios menos importantes ──────
  // (área → precio → texto → municipio → tipo) antes de rendirse. Así una
  // propiedad nueva o etiquetada distinto nunca queda invisible.
  const orden = ['área mínima', 'rango de precio']
  const prioridad = (n: string) => (orden.indexOf(n) >= 0 ? orden.indexOf(n) : n.startsWith('búsqueda') ? 2 : n.startsWith('municipio') ? 3 : 4)
  const activos = [...criterios].sort((a, b) => prioridad(a.nombre) - prioridad(b.nombre))

  const descartados: string[] = []
  for (;;) {
    const where = { status: 'available', AND: activos.flatMap(c => (c.where ? [c.where] : [])) }
    const filtros = activos.flatMap(c => (c.filtro ? [c.filtro] : []))

    // Con filtros en memoria hay que traer el candidato completo y no un `take`
    // corto, o el filtro se aplicaría sobre una página arbitraria. El catálogo
    // son decenas de fichas: cabe entero.
    const found = await prisma.property.findMany({
      where,
      include: PROP_INCLUDE,
      orderBy,
      take: filtros.length ? 200 : limite,
    })
    // El de texto se aplica aparte, con relajación progresiva; los demás
    // filtros en memoria (si algún día hay otros) son estrictos.
    const otrosFiltros = activos.flatMap(c => (c.filtro && !c.nombre.startsWith('búsqueda') ? [c.filtro] : []))
    const otros = otrosFiltros.length ? found.filter(p => otrosFiltros.every(f => f(p))) : found

    // El texto NO es un filtro más: exige todos sus términos y, si eso deja la
    // lista vacía, va soltando el mínimo. Ver `filtrarPorTerminos`. Así una
    // palabra de sobra en la frase del cliente no lo deja sin respuesta, y el
    // orden por relevancia mantiene primera a la ficha que se llama como lo que
    // pidió.
    const porTexto = terms.length > 0 && activos.some(c => c.nombre.startsWith('búsqueda'))
    const ordenados = (porTexto ? filtrarPorTerminos(otros, terms) : otros).slice(0, limite)

    // Traza de la búsqueda. Sin esto no se puede saber si Mac respondió mal
    // porque la herramienta falló o porque no la llamó con lo que el cliente
    // dijo — y esa diferencia decide dónde está el defecto. Barata: una línea
    // por búsqueda.
    console.log(
      `[Mac:buscar] entrada=${JSON.stringify({ municipio: input.municipio, tipo: input.tipo, texto: input.texto })} ` +
      `términos=[${terms.join(' ')}] candidatos=${found.length} → ${ordenados.length}` +
      (descartados.length ? ` (descartados: ${descartados.join(', ')})` : ''),
    )

    if (ordenados.length > 0) {
      const avisos: string[] = []
      if (zonaFuera) {
        avisos.push(
          `NO tenemos propiedades en ${zonaFuera}: no operamos esa zona. Dilo con claridad y ofrece estas opciones de nuestra región (Gualivá, Cundinamarca) como alternativa. Nunca las presentes como si estuvieran en ${zonaFuera}.`,
        )
      }
      if (descartados.length) {
        avisos.push(
          `No había coincidencias exactas, así que amplié la búsqueda ignorando: ${descartados.join(', ')}. Dile al cliente con honestidad que son las opciones más cercanas a lo que pidió.`,
        )
      }
      if (descartados.some(d => d.startsWith('búsqueda'))) {
        avisos.push(
          `IMPORTANTE: NO existe en el catálogo ninguna propiedad que coincida con «${terms.join(' ')}». Dilo tal cual —"no la tengo en el catálogo"— y ofrece las de "resultados" como lo más parecido. PROHIBIDO decir que podría estar en camino, que la subirán pronto, que quizá exista o cualquier variante: no lo sabes. Si el cliente insiste en esa propiedad concreta, usa solicitar_asesor con motivo PROPIEDAD_FUERA_CATALOGO.`,
        )
      }
      return {
        resultados: ordenados.map(formatProperty),
        totalEncontrados: ordenados.length,
        sugerencias: [],
        totalDisponiblesEnTodoElPortafolio,
        nota: 'Los "resultados" son las ÚNICAS propiedades que puedes mencionar. "totalDisponiblesEnTodoElPortafolio" es el catálogo completo de Su Finca Raíz en todos los municipios: NUNCA lo presentes como la cantidad disponible de lo que el cliente preguntó, ni de un proyecto o condominio en particular.',
        ...(avisos.length && { aviso: avisos.join(' ') }),
      }
    }

    const siguiente = activos.shift()
    if (!siguiente) break
    descartados.push(siguiente.nombre)
  }

  // Sin nada que mostrar ni relajando todo: el portafolio está vacío.
  return {
    resultados: [],
    totalEncontrados: 0,
    sugerencias: [],
    totalDisponiblesEnTodoElPortafolio,
    aviso: 'No hay propiedades disponibles en el catálogo en línea en este momento. Conecta al cliente con el especialista (solicitar_asesor, motivo PROPIEDAD_FUERA_CATALOGO).',
  }
}

/** ¿Se cargó o actualizó en los últimos 30 días? Sirve para que Mac destaque novedades. */
function esReciente(fecha: Date): boolean {
  return Date.now() - fecha.getTime() < 30 * 24 * 60 * 60 * 1000
}

function formatProperty(p: {
  id: string; slug: string; title: string | null; type: string
  price_cop: bigint; area_lot_m2: number | null; area_built_m2: number | null
  short_description?: string | null; updated_at?: Date
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
    resumen:      p.short_description?.slice(0, 220) ?? null,
    nueva:        p.updated_at ? esReciente(p.updated_at) : false,
    fotoPrincipal: p.media?.[0]?.url ?? null,
    urlFicha:     `${SITE_URL}/propiedad/${p.slug}`,
  }
}

/** Inventario real, para que Mac nunca improvise cifras ni ignore lo recién cargado. */
async function resumenPortafolio() {
  const where = { status: 'available' }
  const [total, porTipo, agregados, recientes, municipios] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.groupBy({ by: ['type'], where, _count: { type: true } }),
    prisma.property.aggregate({ where, _min: { price_cop: true }, _max: { price_cop: true } }),
    prisma.property.findMany({ where, include: PROP_INCLUDE, orderBy: { updated_at: 'desc' }, take: 5 }),
    // El _count DEBE llevar el mismo filtro que el resto: sin él contaba
    // TODAS las propiedades del municipio, vendidas incluidas. La Vega tiene
    // 33 disponibles y una vendida, así que Mac decía «34 en La Vega» y luego
    // «35 en total» — dos cifras del mismo servidor que no cuadran entre sí.
    prisma.municipality.findMany({
      select: { name: true, _count: { select: { properties: { where } } } },
      orderBy: { name: 'asc' },
    }),
  ])

  const cop = (v: bigint | null) => (v === null ? null : `$${Number(v).toLocaleString('es-CO')}`)

  return {
    totalDisponiblesEnTodoElPortafolio: total,
    porTipo: Object.fromEntries(porTipo.map(t => [t.type, t._count.type])),
    porMunicipio: Object.fromEntries(municipios.filter(m => m._count.properties > 0).map(m => [m.name, m._count.properties])),
    precioDesde: cop(agregados._min.price_cop),
    precioHasta: cop(agregados._max.price_cop),
    masRecientes: recientes.map(formatProperty),
    // La nota decía «el especialista maneja propiedades que aún no se
    // publican». De ahí salían las respuestas en las que Mac afirmaba que un
    // inmueble «podría estar en camino» o «ser un proyecto aún no publicado»:
    // no lo inventaba de la nada, lo leía AQUÍ. Una prohibición en el prompt no
    // gana contra un permiso en el resultado de la herramienta.
    nota: 'Estas son TODAS las propiedades publicadas en línea, y las únicas que puedes mencionar. "masRecientes" son las 5 últimas actualizadas, sin importar la fecha: no digas "de esta semana" ni inventes cuándo se publicaron. "nueva: true" significa cargada o actualizada en los últimos 30 días. Si el cliente busca algo que no está aquí, escala con solicitar_asesor (motivo PROPIEDAD_FUERA_CATALOGO) y dile que le confirmamos: NO afirmes que existe fuera del catálogo, que está por publicarse, que viene en camino ni que el especialista tiene otras. No sabes si existe.',
  }
}

async function detallePropiedad(input: DetalleInput) {
  const where = input.slug ? { slug: input.slug } : input.id ? { id: input.id } : null
  if (!where) return { error: 'Se requiere slug o id' }

  const include = {
    municipality: { select: { name: true, slug: true } },
    vereda:       { select: { name: true } },
    media:        { orderBy: { order: 'asc' as const } },
    features:     true,
  }

  const p = await prisma.property.findUnique({ where: where as { slug: string } | { id: string }, include })

  if (!p) {
    // El slug pudo llegar incompleto o mal copiado: se sugieren coincidencias
    // en vez de responder "no existe" y dejar al cliente sin salida.
    const pista = input.slug ?? input.id ?? ''
    const parecidas = await prisma.property.findMany({
      where: { status: 'available', OR: [
        { slug:  { contains: pista.split('-').slice(0, 3).join('-'), mode: 'insensitive' } },
        { title: { contains: pista.replace(/-/g, ' '), mode: 'insensitive' } },
      ] },
      include: PROP_INCLUDE,
      take: 3,
    })
    return parecidas.length
      ? { error: 'No encontré esa ficha exacta', parecidas: parecidas.map(formatProperty) }
      : { error: 'Propiedad no encontrada. Usa buscar_propiedades o resumen_portafolio antes de afirmar que no existe.' }
  }

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

const RESUMEN_SYSTEM =
  'Resume esta conversación de un lead inmobiliario en 3-4 frases para que un asesor sepa ' +
  'con quién va a hablar antes de llamar. Incluye: qué busca el cliente (tipo de inmueble, ' +
  'zona, presupuesto si lo dio), qué preguntó, y cualquier señal de interés o urgencia. ' +
  'Español, directo, sin saludos ni relleno.'

/**
 * Genera el resumen de la conversación con UNA llamada corta a Haiku (barata, sin
 * razonamiento) y lo guarda en el lead. Los tokens se suman a los de Haiku de la
 * conversación (tokensIn/tokensOut), NO aparte. Es un extra: si falla, se registra con
 * console.warn y NO rompe la captura del lead (summary queda null).
 */
async function generarResumenLead(leadId: string, conversationId: string): Promise<string | null> {
  try {
    const mensajes = await prisma.message.findMany({
      where:   { conversationId },
      orderBy: { createdAt: 'asc' },
      take:    50,
      select:  { role: true, content: true },
    })
    if (mensajes.length === 0) return null

    const transcript = mensajes
      .map((m) => `${m.role === 'USER' ? 'Cliente' : 'Mac'}: ${m.content}`)
      .join('\n')

    const resp = await anthropic.messages.create(
      {
        model:      'claude-haiku-4-5',
        max_tokens: 300,
        system:     RESUMEN_SYSTEM,
        messages:   [{ role: 'user', content: transcript }],
      },
      { signal: AbortSignal.timeout(20_000), maxRetries: 1 },
    )

    // Contabilidad: los tokens del resumen se suman a los de Haiku de la conversación.
    const u = resp.usage
    const inTok  = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
    const outTok = u.output_tokens ?? 0
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data:  { tokensIn: { increment: inTok }, tokensOut: { increment: outTok } },
      })
    } catch (err) {
      console.error('[Mac] DB error (tokens del resumen):', err)
    }

    const texto = resp.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
    if (!texto) {
      console.warn(`[Mac] resumen vacío para lead=${leadId} (tokens in/out=${inTok}/${outTok})`)
      return null
    }

    await prisma.lead.update({
      where: { id: leadId },
      data:  { summary: texto, summaryAt: new Date() },
    })
    console.log(`[Mac] resumen de conversación generado para lead=${leadId} (tokens in/out=${inTok}/${outTok})`)
    return texto
  } catch (err) {
    console.warn('[Mac] no se pudo generar el resumen del lead:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Deriva el teléfono del lead a partir del externalId de una conversación de WhatsApp.
 * Meta (Cloud API) entrega el wa_id como dígitos CON indicativo de país, sin "+" ni
 * sufijo (ej: "573001234567" → CO, "34600123456" → ES, "14155551234" → US). Conservamos
 * el indicativo que YA trae y devolvemos E.164 (con "+"). NUNCA se agrega ni se adivina
 * un país. Es defensivo ante variantes ("@c.us"/"@s.whatsapp.net", espacios, "+" previo).
 * Devuelve null si no parece un número válido (8–15 dígitos, rango E.164).
 */
function telefonoWhatsappE164(externalId: string): string | null {
  const digits = externalId.replace(/@.*$/, '').replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
}

async function crearOActualizarLead(input: LeadInput, conversationId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  })
  if (!conv) return { error: 'Conversación no encontrada' }

  const qualEnum = (input.qualification as LeadQualification | undefined) ?? undefined

  // Ley 1581/2012: registra el consentimiento la PRIMERA vez que se capta un dato
  // de contacto (nombre, teléfono o correo). Si ya existe, no se sobrescribe.
  const captaContacto = Boolean(input.nombre || input.telefono || input.email)

  // WhatsApp: el número del cliente ES el canal (externalId), con su indicativo de país.
  // Solo lo usamos como teléfono si el cliente NO dio uno propio en la conversación; si
  // dio un número (aunque sea sin indicativo), ese manda y se guarda tal cual, sin tocar.
  const waPhone =
    conv.channel === 'WHATSAPP' && !input.telefono
      ? telefonoWhatsappE164(conv.externalId)
      : null

  if (conv.leadId && conv.lead) {
    const updated = await prisma.lead.update({
      where: { id: conv.leadId },
      data: {
        ...(input.nombre    && { name: input.nombre }),
        ...(input.telefono  && { phone: input.telefono }),
        // WhatsApp: rellena el teléfono con el número del canal solo si el lead aún no
        // tiene uno (no sobrescribe un número que el cliente haya dado antes).
        ...(waPhone && !conv.lead.phone && { phone: waPhone }),
        ...(input.email     && { email: input.email }),
        ...(captaContacto && !conv.lead.consentAt && { consentAt: new Date() }),
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
    // Resumen para el asesor: una sola vez, al captar contacto y si aún no lo tiene.
    if (captaContacto && !conv.lead.summary) {
      const resumen = await generarResumenLead(updated.id, conversationId)
      // Alerta al asesor por WhatsApp (dormida si no hay ALERT_WHATSAPP_TO). No bloqueante.
      if (resumen) await enviarAlertaLeadWhatsApp(updated.name, updated.phone, resumen)
    }
    return { ok: true, leadId: updated.id, action: 'updated' }
  }

  // Create new lead
  const lead = await prisma.lead.create({
    data: {
      name:    input.nombre    ?? 'Sin nombre',
      phone:   input.telefono  ?? waPhone ?? '',
      email:   input.email     ?? '',
      channel: conv.channel.toLowerCase(),
      qualification: qualEnum ?? 'SIN_CALIFICAR',
      ...(captaContacto && { consentAt: new Date() }),
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

  // Resumen para el asesor: lead nuevo captado con contacto → se genera una vez.
  if (captaContacto) {
    const resumen = await generarResumenLead(lead.id, conversationId)
    // Alerta al asesor por WhatsApp (dormida si no hay ALERT_WHATSAPP_TO). No bloqueante.
    if (resumen) await enviarAlertaLeadWhatsApp(lead.name, lead.phone, resumen)
  }

  return { ok: true, leadId: lead.id, action: 'created' }
}

/**
 * ÚLTIMA OPORTUNIDAD antes de decirle a un cliente que algo no existe.
 *
 * La herramienta de búsqueda encuentra «Palo de Agua» sin problema. Lo que
 * falla, de forma intermitente, es que Mac la llame con el nombre propio que
 * dijo el cliente: en una de cada tres conversaciones escalaba directamente y
 * el cliente se iba creyendo que no tenemos un condominio publicado.
 *
 * Una regla más en el prompt no arregla eso —ya está escrita y se cumple dos de
 * cada tres veces—. Esto sí: cuando Mac va a escalar por PROPIEDAD_FUERA_CATALOGO,
 * el SERVIDOR busca en el resumen antes de dejarlo pasar, y si la propiedad
 * existe se lo devuelve como resultado de herramienta, que es donde las
 * instrucciones sí se cumplen.
 */
async function rescatarDelCatalogo(resumen: string) {
  const terms = terminos(resumen)
  if (terms.length === 0) return null
  const fichas = await prisma.property.findMany({ where: { status: 'available' }, include: PROP_INCLUDE })
  const hit = filtrarPorTerminos(fichas, terms)[0]
  // Un solo término suelto («servicios», «lote») coincide con media base: solo
  // se rescata cuando el nombre propio pesa en el TÍTULO.
  if (!hit || puntuar(hit, terms) < 5) return null
  return hit
}

async function solicitarAsesor(input: SolicitarInput, conversationId: string) {
  if (input.motivo === 'PROPIEDAD_FUERA_CATALOGO') {
    const rescatada = await rescatarDelCatalogo(input.resumen)
    if (rescatada) {
      console.log(`[Mac → Asesor] Escalación EVITADA: «${rescatada.title}» sí está en el catálogo | Conv: ${conversationId}`)
      return {
        ok: false,
        noEscalado: true,
        propiedad: formatProperty(rescatada),
        instruccion:
          'ALTO: esa propiedad SÍ está publicada, es la que va en "propiedad". No se escaló nada. ' +
          'NO le digas al cliente que no la tienes: respóndele con estos datos. Si necesitas la ficha ' +
          'completa, llama a detalle_propiedad con su slug.',
      }
    }
  }

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  })

  // Una sola escalación por conversación: si ya se notificó al asesor, NO se vuelve a
  // notificar (evita notificaciones ilimitadas). Se le indica al modelo que no reintente.
  if (conv?.escalatedAt) {
    console.log(`[Mac → Asesor] Escalación IGNORADA (ya escalado el ${conv.escalatedAt.toISOString()}) | Conv: ${conversationId}`)
    return {
      ok: true,
      yaEscalado: true,
      instruccion:
        'El asesor humano YA fue notificado de esta conversación. NO vuelvas a escalar ni a llamar esta herramienta. ' +
        'Confirma al cliente, con naturalidad, que un especialista lo contactará pronto y que no debe repetir nada.',
    }
  }

  // Marca la escalación (escalatedAt) en la misma operación que fija el estado ESCALATED.
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'ESCALATED', escalatedAt: new Date() },
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
      case 'resumen_portafolio':
        result = await resumenPortafolio()
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
      case 'consultar_experto':
        result = await consultarExperto(input as ExpertoInput, conversationId, 'MODELO')
        break
      default:
        result = { error: `Tool desconocida: ${name}` }
    }
    // Los resultados con datos de propiedades (texto libre de la BD) se delimitan
    // como DATOS, no como instrucciones, para blindar contra inyección de prompt
    // vía descripciones/títulos maliciosos. El prompt (INTEGRIDAD) refuerza que el
    // contenido entre <property_data>…</property_data> nunca son órdenes.
    const DATA_TOOLS = new Set(['buscar_propiedades', 'resumen_portafolio', 'detalle_propiedad'])
    const json = JSON.stringify(result)
    return {
      type: 'tool_result',
      tool_use_id: '',
      content: DATA_TOOLS.has(name) ? `<property_data>\n${json}\n</property_data>` : json,
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
