import { prisma } from './prisma'
import { TYPE_LABELS } from './utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RelatedCard {
  slug: string
  title: string
  type: string
  type_label: string
  price_cop: number
  area_lot_m2: number | null
  area_built_m2: number | null
  bedrooms: number
  image_url: string | null
  image_alt: string
  municipality_name: string
  municipality_slug: string
}

export interface RelatedGroups {
  municipio: RelatedCard[]
  vereda: RelatedCard[]
  tipo: RelatedCard[]
  municipio_name: string
  municipio_slug: string
  vereda_name: string | null
  vereda_slug: string | null
  tipo_label: string
  tipo_slug: string
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCard(raw: any): RelatedCard {
  const img = (raw.media as { url: string; alt_text: string }[] | undefined)?.[0]
  const typeLabel = (TYPE_LABELS as Record<string, string>)[raw.type as string] ?? raw.type
  const defaultTitle = `${typeLabel} en ${(raw.municipality as { name: string } | undefined)?.name ?? ''}`
  return {
    slug:              raw.slug as string,
    title:             (raw.title as string | null) ?? defaultTitle,
    type:              raw.type as string,
    type_label:        typeLabel,
    price_cop:         Number(raw.price_cop),
    area_lot_m2:       raw.area_lot_m2 as number | null,
    area_built_m2:     raw.area_built_m2 as number | null,
    bedrooms:          raw.bedrooms as number,
    image_url:         img?.url ?? null,
    image_alt:         img?.alt_text || (raw.title as string) || defaultTitle,
    municipality_name: (raw.municipality as { name: string } | undefined)?.name ?? '',
    municipality_slug: (raw.municipality as { slug: string } | undefined)?.slug ?? '',
  }
}

const MEDIA_SELECT = {
  where: { type: 'image' as const },
  orderBy: [{ is_primary: 'desc' as const }, { order: 'asc' as const }],
  take: 1,
  select: { url: true, alt_text: true },
}

const PROPERTY_SELECT = {
  slug:          true,
  title:         true,
  type:          true,
  price_cop:     true,
  area_lot_m2:   true,
  area_built_m2: true,
  bedrooms:      true,
  municipality:  { select: { name: true, slug: true } },
  media:         MEDIA_SELECT,
} as const

// ─── Main function ────────────────────────────────────────────────────────────

export async function getRelatedProperties(params: {
  currentSlug:      string
  municipalityId:   string
  municipalitySlug: string
  municipalityName: string
  veredaId:         string | null
  type:             string
}): Promise<RelatedGroups> {
  const { currentSlug, municipalityId, municipalitySlug, municipalityName, veredaId, type } = params

  // Build queries before Promise.all so TypeScript can infer each type independently
  const qMunicipio = prisma.property.findMany({
    where: { municipality_id: municipalityId, status: 'available', slug: { not: currentSlug } },
    select: PROPERTY_SELECT,
    orderBy: { updated_at: 'desc' },
    take: 8,
  })

  const qVereda = veredaId
    ? prisma.property.findMany({
        where: { vereda_id: veredaId, status: 'available', slug: { not: currentSlug } },
        select: PROPERTY_SELECT,
        orderBy: { updated_at: 'desc' },
        take: 6,
      })
    : Promise.resolve([] as Awaited<typeof qMunicipio>)

  const qTipo = prisma.property.findMany({
    where: { type, status: 'available', slug: { not: currentSlug } },
    select: PROPERTY_SELECT,
    orderBy: { updated_at: 'desc' },
    take: 12,
  })

  const qVeredaRecord = veredaId
    ? prisma.vereda.findUnique({ where: { id: veredaId }, select: { slug: true, name: true } })
    : Promise.resolve(null)

  const [rawMunicipio, rawVereda, rawTipo, veredaRecord] = await Promise.all([
    qMunicipio, qVereda, qTipo, qVeredaRecord,
  ])

  // ── Deduplication ────────────────────────────────────────────────────────────
  const shownSlugs = new Set<string>([currentSlug])

  // 1. municipio: up to 4
  const municipio = rawMunicipio.slice(0, 4).map(r => {
    shownSlugs.add(r.slug)
    return toCard(r)
  })

  // 2. vereda: up to 3, skip any already in municipio section
  const veredaFiltered = rawVereda.filter(r => !shownSlugs.has(r.slug)).slice(0, 3)
  veredaFiltered.forEach(r => shownSlugs.add(r.slug))
  const vereda = veredaFiltered.map(toCard)

  // 3. tipo: up to 4, skip anything already shown above
  const tipo = rawTipo.filter(r => !shownSlugs.has(r.slug)).slice(0, 4).map(toCard)

  return {
    municipio,
    vereda,
    tipo,
    municipio_name:  municipalityName,
    municipio_slug:  municipalitySlug,
    vereda_name:     veredaRecord?.name ?? null,
    vereda_slug:     veredaRecord?.slug ?? null,
    tipo_label:      (TYPE_LABELS as Record<string, string>)[type] ?? type,
    tipo_slug:       type,
  }
}
