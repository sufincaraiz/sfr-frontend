/**
 * SUBIDA DESDE EL NAVEGADOR, CON FIRMA DEL SERVIDOR
 * =================================================
 *
 * Única puerta de subida del panel. Pide la firma a `/api/subidas/firma` —que
 * exige sesión— y sube directo a Cloudinary con ella. El archivo no pasa por
 * nuestro servidor: una foto de 8 MB no cabe en el cuerpo de una función
 * serverless, y de paso no gastamos ancho de banda.
 *
 * La ENTREGA sigue siendo pública: estas imágenes se ven en las fichas. Lo
 * único que cambió respecto al preset sin firma es QUIÉN puede subir.
 *
 * Módulo de cliente sin imports de servidor.
 */

export type DestinoSubida = 'properties' | 'modelos3d' | 'blog' | 'directorio' | 'municipios' | 'propuesta'

export class ErrorSubida extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorSubida'
  }
}

interface Firma {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  carpeta: string
  recurso: 'image' | 'raw'
  formatos: string[]
  maxBytes: number
}

const extension = (nombre: string) => (nombre.split('.').pop() ?? '').toLowerCase()

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`

/** Devuelve la URL pública del archivo subido. Lanza `ErrorSubida` con motivo. */
export async function subirArchivo(file: File, destino: DestinoSubida): Promise<string> {
  const resFirma = await fetch('/api/subidas/firma', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destino }),
  })
  if (resFirma.status === 401) throw new ErrorSubida('Tu sesión expiró: vuelve a entrar para subir archivos.')
  if (!resFirma.ok) {
    const j = await resFirma.json().catch(() => ({}));
    throw new ErrorSubida(j.error ?? 'No se pudo autorizar la subida.')
  }
  const f: Firma = await resFirma.json()

  // Se comprueba ANTES de subir para no gastar la subida y dar un motivo claro.
  // El formato también viaja firmado, así que Cloudinary lo vuelve a comprobar.
  const ext = extension(file.name)
  if (ext && !f.formatos.includes(ext)) {
    throw new ErrorSubida(`«${file.name}»: formato .${ext} no admitido. Se aceptan: ${f.formatos.join(', ')}.`)
  }
  if (file.size > f.maxBytes) {
    throw new ErrorSubida(`«${file.name}» pesa ${mb(file.size)} y el máximo es ${mb(f.maxBytes)}.`)
  }

  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', f.apiKey)
  fd.append('timestamp', String(f.timestamp))
  fd.append('signature', f.signature)
  // Estos dos van FIRMADOS: cambiarlos aquí invalida la firma, así que el
  // navegador no puede escribir en otra carpeta ni colar otro formato.
  fd.append('folder', f.carpeta)
  fd.append('allowed_formats', f.formatos.join(','))

  const res = await fetch(`https://api.cloudinary.com/v1_1/${f.cloudName}/${f.recurso}/upload`, {
    method: 'POST',
    body: fd,
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || !d.secure_url) {
    throw new ErrorSubida(d?.error?.message ?? 'Cloudinary rechazó el archivo.')
  }
  return d.secure_url as string
}

/** Varios archivos: devuelve las URLs logradas y los motivos de las fallidas. */
export async function subirVarios(files: File[], destino: DestinoSubida): Promise<{ urls: string[]; errores: string[] }> {
  const urls: string[] = []
  const errores: string[] = []
  for (const file of files) {
    try { urls.push(await subirArchivo(file, destino)) }
    catch (e) { errores.push(e instanceof ErrorSubida ? e.message : `«${file.name}»: no se pudo subir.`) }
  }
  return { urls, errores }
}
