import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { archivarDocumento, evidenciaConfigurada, enlaceEfimeroDocumento, esRutaDeNorma } from '@/lib/notariales/evidencia'

const ROLES = ['admin']

/** 20 MB: una resolución escaneada cabe de sobra, y un PDF de 100 MB no es una resolución. */
const MAXIMO = 20 * 1024 * 1024

/**
 * Archiva el PDF de una resolución y devuelve su ruta y su hash.
 *
 * El camino es este y no el de pegar una URL: la resolución notarial no está
 * publicada como página accesible, y la compilación que sí tiene enlace es peor
 * evidencia que el documento firmado. Ver `evidencia.ts`.
 *
 * ⚠ NO devuelve una URL de descarga. El archivo queda `authenticated` y solo se
 * abre por el proxy de abajo, con un enlace que vive un minuto: publicar una
 * copia de una norma que no emitimos nos convertiría en un sitio desde el que
 * citarla.
 */
export async function POST(req: NextRequest) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!evidenciaConfigurada()) {
    return NextResponse.json({
      error: 'Faltan las llaves de Cloudinary: sin ellas el documento no se archiva de forma ' +
        'autenticada, y NO se archiva de forma pública.',
    }, { status: 409 })
  }
  try {
    const form = await req.formData()
    const archivo = form.get('archivo')
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 })
    }
    if (archivo.size > MAXIMO) {
      return NextResponse.json({
        error: `El archivo pesa ${Math.round(archivo.size / 1024 / 1024)} MB y el máximo son 20.`,
      }, { status: 400 })
    }
    // Se comprueba el tipo Y la firma del archivo: una extensión se renombra.
    const bytes = Buffer.from(await archivo.arrayBuffer())
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return NextResponse.json({
        error: 'El archivo no es un PDF. Cambiar la extensión no cambia el contenido, y lo que se ' +
          'archiva como evidencia tiene que poder abrirse después.',
      }, { status: 400 })
    }

    const archivado = await archivarDocumento(bytes, archivo.name)
    return NextResponse.json({
      ruta: archivado.ruta,
      hash: archivado.hash,
      bytes: archivado.bytes,
      archivado_por: s.email,
    })
  } catch (e) {
    console.error('[notariales/evidencia] POST', e)
    return NextResponse.json({ error: 'No se pudo archivar el documento.' }, { status: 500 })
  }
}

/**
 * Proxy para volver a abrir el documento DENTRO del panel. Sirve los bytes; el
 * enlace firmado se genera aquí, dura un minuto y no sale del servidor.
 */
export async function GET(req: NextRequest) {
  if (!(await requireRole(ROLES))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const ruta = new URL(req.url).searchParams.get('ruta') ?? ''
  if (!esRutaDeNorma(ruta)) {
    return NextResponse.json({ error: 'Ruta fuera de la carpeta de normas.' }, { status: 400 })
  }
  try {
    const res = await fetch(enlaceEfimeroDocumento(ruta, 60))
    if (!res.ok) return NextResponse.json({ error: 'No se pudo abrir.' }, { status: 502 })
    return new NextResponse(await res.arrayBuffer(), {
      headers: {
        'Content-Type': 'application/pdf',
        // No se cachea: el enlace es efímero por diseño y una copia en caché
        // sobreviviría a la sesión que la pidió.
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    console.error('[notariales/evidencia] GET', e)
    return NextResponse.json({ error: 'No se pudo abrir el documento.' }, { status: 500 })
  }
}
