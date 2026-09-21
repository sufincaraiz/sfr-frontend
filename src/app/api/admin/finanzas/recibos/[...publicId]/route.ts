import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { enlaceEfimero, esPublicIdDeRecibo, recibosConfigurados } from '@/lib/finanzas/recibos'

/**
 * Ver un recibo. El navegador nunca recibe un enlace de Cloudinary: este proxy
 * exige sesión, genera un enlace firmado que vive un minuto, trae los bytes y
 * los sirve. Así el recibo no queda accesible por URL a quien la reenvíe, y el
 * enlace tampoco se puede guardar en ningún sitio: caduca.
 */
const ROLES = ['admin', 'contador']

export async function GET(_req: NextRequest, ctx: { params: Promise<{ publicId: string[] }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!recibosConfigurados()) return NextResponse.json({ error: 'Recibos no configurados.' }, { status: 503 })

  const { publicId } = await ctx.params
  const id = decodeURIComponent((publicId ?? []).join('/'))
  if (!esPublicIdDeRecibo(id)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  try {
    const res = await fetch(enlaceEfimero(id, 60), { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return new NextResponse(res.body, {
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
        // Nunca en caché compartida: es un documento con datos de terceros.
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'Content-Disposition': 'inline',
      },
    })
  } catch (e) {
    console.error('[recibos] GET', e)
    return NextResponse.json({ error: 'No se pudo abrir el recibo.' }, { status: 500 })
  }
}
