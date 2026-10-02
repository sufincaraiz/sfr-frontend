import { NextRequest, NextResponse } from 'next/server'
import { requireSession, getBlogWriterSession } from '@/lib/auth'
import { DESTINOS, esDestino, firmarSubida, subidasConfiguradas } from '@/lib/subidas-firmadas'

/**
 * Firma para subir a Cloudinary. EXIGE SESIÓN: es lo que sustituye al preset
 * sin firma, con el que cualquiera podía subir archivos a la cuenta.
 *
 * El escritor del blog colaborativo entra con su propia credencial y solo
 * puede pedir firma para la carpeta `blog`: si pide otra, 403.
 */
export async function POST(req: NextRequest) {
  let body: { destino?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  if (!esDestino(body.destino)) {
    return NextResponse.json({ error: 'Destino de subida desconocido.' }, { status: 400 })
  }

  const admin = await requireSession()
  const escritor = admin ? null : await getBlogWriterSession()
  if (!admin && !escritor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rol: 'admin' | 'blog_writer' = admin ? 'admin' : 'blog_writer'
  if (!DESTINOS[body.destino].roles.includes(rol)) {
    return NextResponse.json({ error: 'No autorizado para subir a esa carpeta.' }, { status: 403 })
  }

  if (!subidasConfiguradas()) {
    return NextResponse.json({ error: 'La subida de archivos no está configurada.' }, { status: 503 })
  }

  try {
    return NextResponse.json(firmarSubida(body.destino))
  } catch (e) {
    console.error('[subidas] firma', e)
    return NextResponse.json({ error: 'No se pudo firmar la subida.' }, { status: 500 })
  }
}
