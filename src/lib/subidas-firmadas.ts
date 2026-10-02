import 'server-only'
import { v2 as cloudinary } from 'cloudinary'

/**
 * SUBIDAS FIRMADAS A CLOUDINARY
 * =============================
 *
 * Antes, el navegador subía con un preset SIN FIRMA. El cloud name y el nombre
 * del preset son los dos públicos —viajan en el bundle—, así que cualquiera
 * podía subir archivos a la cuenta sin tener sesión en el panel.
 *
 * Ahora la firma la genera este módulo, en el servidor, y exige sesión. El
 * navegador sigue subiendo directo a Cloudinary (una foto de 8 MB no cabe en
 * el cuerpo de una función serverless), pero solo con una firma nuestra.
 *
 * DIFERENCIA CON LOS RECIBOS (`lib/finanzas/recibos.ts`): aquí solo se firma la
 * SUBIDA. La ENTREGA sigue siendo pública, porque estas imágenes se muestran en
 * las fichas del sitio. Los recibos, en cambio, son privados de punta a punta.
 *
 * Lo firmado ACOTA lo que se puede subir: la carpeta y los formatos viajan
 * dentro de la firma, así que el navegador no puede cambiarlos sin invalidarla.
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const KEY = process.env.CLOUDINARY_API_KEY
const SECRET = process.env.CLOUDINARY_API_SECRET

export type Destino = 'properties' | 'modelos3d' | 'blog' | 'directorio' | 'municipios' | 'propuesta'

interface ReglaDestino {
  carpeta: string
  /** `image` para fotos; `raw` para el .glb, que no es una imagen. */
  recurso: 'image' | 'raw'
  /** Extensiones admitidas. Viajan FIRMADAS: Cloudinary rechaza las demás. */
  formatos: string[]
  /** Tope que revisa el navegador antes de subir, en bytes. */
  maxBytes: number
  /** Quién puede pedir la firma. */
  roles: ('admin' | 'blog_writer')[]
}

const FOTO = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif']

export const DESTINOS: Record<Destino, ReglaDestino> = {
  properties: { carpeta: 'properties', recurso: 'image', formatos: FOTO, maxBytes: 15 * 1024 * 1024, roles: ['admin'] },
  // El modelo 3D es un archivo suelto, no una imagen: `raw`. Los .glb de
  // fotogrametría son grandes, por eso el tope es más alto.
  modelos3d:  { carpeta: 'modelos3d', recurso: 'raw',   formatos: ['glb', 'gltf'], maxBytes: 100 * 1024 * 1024, roles: ['admin'] },
  blog:       { carpeta: 'blog',       recurso: 'image', formatos: FOTO, maxBytes: 15 * 1024 * 1024, roles: ['admin', 'blog_writer'] },
  directorio: { carpeta: 'directorio', recurso: 'image', formatos: FOTO, maxBytes: 15 * 1024 * 1024, roles: ['admin'] },
  municipios: { carpeta: 'municipios', recurso: 'image', formatos: FOTO, maxBytes: 15 * 1024 * 1024, roles: ['admin'] },
  propuesta:  { carpeta: 'propuesta',  recurso: 'image', formatos: FOTO, maxBytes: 15 * 1024 * 1024, roles: ['admin'] },
}

export const esDestino = (v: unknown): v is Destino =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(DESTINOS, v)

export function subidasConfiguradas(): boolean {
  return !!(CLOUD && KEY && SECRET)
}

export interface FirmaSubida {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  carpeta: string
  recurso: 'image' | 'raw'
  formatos: string[]
  maxBytes: number
}

/**
 * Firma una subida para `destino`. La firma cubre carpeta, formatos y marca de
 * tiempo: Cloudinary la caduca a la hora, así que no sirve de llave permanente.
 */
export function firmarSubida(destino: Destino): FirmaSubida {
  if (!subidasConfiguradas()) {
    throw new Error('Faltan NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET.')
  }
  const r = DESTINOS[destino]
  const timestamp = Math.floor(Date.now() / 1000)
  // Estos parámetros, y solo estos, son los que el navegador debe reenviar.
  const aFirmar = { folder: r.carpeta, timestamp, allowed_formats: r.formatos.join(',') }
  const signature = cloudinary.utils.api_sign_request(aFirmar, SECRET!)
  return {
    cloudName: CLOUD!,
    apiKey: KEY!,
    timestamp,
    signature,
    carpeta: r.carpeta,
    recurso: r.recurso,
    formatos: r.formatos,
    maxBytes: r.maxBytes,
  }
}
