import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { recibosConfigurados, subirRecibo } from '@/lib/finanzas/recibos'

// Subida del recibo. Pasa por el servidor A PROPÓSITO: el navegador no tiene
// —ni debe tener— credenciales para subir a la carpeta privada. Devuelve el
// public_id, nunca una URL.
const ROLES = ['admin', 'contador']
const MAX = 8 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export async function GET() {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json({ configurado: recibosConfigurados() })
}

export async function POST(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!recibosConfigurados()) {
    return NextResponse.json({
      error: 'La subida privada de recibos no está configurada (faltan CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET). ' +
             'El gasto se puede guardar sin foto y queda por completar.',
    }, { status: 503 })
  }

  const form = await req.formData().catch(() => null)
  const archivo = form?.get('archivo')
  if (!(archivo instanceof File)) return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 })
  if (archivo.size > MAX) return NextResponse.json({ error: 'La foto pesa más de 8 MB.' }, { status: 413 })
  if (archivo.type && !TIPOS.includes(archivo.type)) {
    return NextResponse.json({ error: `Tipo de archivo no admitido (${archivo.type}).` }, { status: 415 })
  }

  try {
    const bytes = Buffer.from(await archivo.arrayBuffer())
    const publicId = await subirRecibo(bytes, archivo.name || 'recibo')
    return NextResponse.json({ public_id: publicId }, { status: 201 })
  } catch (e) {
    console.error('[recibos] POST', e)
    return NextResponse.json({ error: 'No se pudo subir el recibo.' }, { status: 500 })
  }
}
