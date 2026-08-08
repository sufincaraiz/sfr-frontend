import { NextRequest, NextResponse } from 'next/server'
import {
  COOKIE_SESION,
  buscarEnlaceUsable,
  verificarSesion,
  visitantesDe,
} from '@/lib/visitantes'
import { generarPdfVisitantes } from '@/lib/pdf-visitantes'

// Descarga del PDF. NO es un endpoint abierto: exige la misma sesión que abre la
// pantalla, así que sin haber acertado el PIN no se baja nada. Además revalida
// el estado del enlace en cada descarga — si el admin lo revocó mientras el
// dueño tenía la pestaña abierta, la descarga deja de funcionar de inmediato.

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const enlace = await buscarEnlaceUsable(token)
  if (!enlace) {
    return NextResponse.json({ error: 'Este enlace no está disponible.' }, { status: 403 })
  }

  if (!verificarSesion(req.cookies.get(COOKIE_SESION)?.value, enlace.id)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  // Mismo origen de datos que la pantalla: tres campos, filtrados en el servidor.
  const visitantes = await visitantesDe(enlace.propiedadId)

  const pdf = generarPdfVisitantes({
    propiedad: enlace.propiedad.title ?? 'Inmueble',
    municipio: enlace.propiedad.municipality?.name ?? null,
    visitantes,
  })

  const nombre = `visitantes-${enlace.propiedad.slug ?? 'inmueble'}.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Content-Length': String(pdf.length),
      // Un documento con cédulas no se guarda en caches intermedias.
      'Cache-Control': 'private, no-store, max-age=0',
    },
  })
}
