import { prisma } from '@/lib/prisma'
import { PROPUESTA_KEY, withDefaults, renderPropuesta, type PropuestaContent } from '@/lib/propuesta'

// Siempre dinámico: refleja al instante lo que se edita en el admin
export const dynamic = 'force-dynamic'

export async function GET() {
  let data: Partial<PropuestaContent> | null = null
  try {
    const row = await prisma.pageContent.findUnique({ where: { key: PROPUESTA_KEY } })
    data = (row?.data as Partial<PropuestaContent> | undefined) ?? null
  } catch (err) {
    console.error('[propuesta-comercial] error leyendo contenido:', err)
  }

  const html = renderPropuesta(withDefaults(data))
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
