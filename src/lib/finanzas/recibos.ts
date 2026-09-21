import 'server-only'
import { v2 as cloudinary } from 'cloudinary'

/**
 * RECIBOS: PRIVADOS, SIEMPRE
 * ==========================
 *
 * Un recibo lleva nombres, valores y a veces el NIT de un tercero. En la URL
 * pública de Cloudinary —que es lo que usa el resto del sitio para fotos de
 * propiedades— quedaría expuesto a cualquiera que tenga el enlace, sin sesión
 * y para siempre. Ley 1581/2012: eso es una cesión no autorizada.
 *
 * Por eso:
 *   · Se suben con firma de servidor y `type: 'authenticated'`. No hay preset
 *     sin firmar, así que el navegador NO puede subir un recibo por su cuenta.
 *   · En la base solo se guarda el `public_id`. NUNCA una URL: una URL guardada
 *     es una URL que sobrevive al borrado del registro y se puede reenviar.
 *   · Para verlo, el admin pasa por `/api/admin/finanzas/recibos/…`, que exige
 *     sesión y sirve los bytes. El enlace firmado se genera en ese momento,
 *     dura un minuto y no sale nunca del servidor.
 *
 * Si faltan las credenciales, `recibosConfigurados()` es false y la captura
 * sigue funcionando sin foto: el egreso queda POR COMPLETAR. No se cae a la
 * subida pública, que es justo lo que queremos evitar.
 */

// El cloud name es público por naturaleza (sale en toda URL de imagen) y en
// este proyecto vive en NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME. UNA sola fuente: no
// se acepta un segundo nombre de respaldo, porque dos nombres para el mismo
// dato son dos verdades en cuanto alguien los define distintos. Si falta, la
// subida falla con el mensaje de abajo. Las LLAVES nunca llevan NEXT_PUBLIC_:
// si lo llevaran, viajarían al navegador.
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const KEY = process.env.CLOUDINARY_API_KEY
const SECRET = process.env.CLOUDINARY_API_SECRET

export const CARPETA_RECIBOS = 'finanzas/recibos'

export function recibosConfigurados(): boolean {
  return !!(CLOUD && KEY && SECRET)
}

function configurar() {
  if (!recibosConfigurados()) {
    throw new Error(
      'Faltan CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET: sin ellas no se puede subir un recibo ' +
      'de forma privada, y NO se sube de forma pública.',
    )
  }
  cloudinary.config({ cloud_name: CLOUD, api_key: KEY, api_secret: SECRET, secure: true })
}

/** Sube el recibo y devuelve su `public_id`. Nunca devuelve una URL. */
export function subirRecibo(bytes: Buffer, nombre: string): Promise<string> {
  configurar()
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CARPETA_RECIBOS,
        type: 'authenticated',
        resource_type: 'image',
        // El nombre lo pone Cloudinary: un nombre de archivo del teléfono puede
        // llevar datos (fecha, lugar) y además chocaría entre usuarios.
        use_filename: false,
        unique_filename: true,
        context: `origen=captura|archivo=${nombre.slice(0, 60).replace(/[|=]/g, '-')}`,
      },
      (err, res) => {
        if (err || !res) return reject(err ?? new Error('Cloudinary no devolvió resultado'))
        resolve(res.public_id)
      },
    )
    stream.end(bytes)
  })
}

/**
 * Enlace firmado de vida corta. Solo lo usa el proxy del servidor: no se envía
 * al navegador ni se guarda en ninguna parte.
 */
export function enlaceEfimero(publicId: string, segundos = 60): string {
  configurar()
  return cloudinary.utils.private_download_url(publicId, '', {
    resource_type: 'image',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + segundos,
  })
}

export async function borrarRecibo(publicId: string): Promise<void> {
  configurar()
  await cloudinary.uploader.destroy(publicId, { type: 'authenticated', resource_type: 'image' })
}

/** Defensa de ruta: el proxy solo sirve public_id de la carpeta de recibos. */
export function esPublicIdDeRecibo(publicId: string): boolean {
  return publicId.startsWith(`${CARPETA_RECIBOS}/`) && !publicId.includes('..')
}
