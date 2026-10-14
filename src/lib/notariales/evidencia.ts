import 'server-only'
import { createHash } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'

/**
 * EL PDF DE LA RESOLUCIÓN: ARCHIVADO, NUNCA PUBLICADO
 * ===================================================
 *
 * Mismo camino firmado que los recibos, y por una razón distinta.
 *
 * Un recibo es privado porque lleva datos de un tercero. Este PDF no es
 * privado: es una norma pública. Se archiva como `authenticated` porque
 * **publicar una copia de una norma que no emitimos nos convertiría en un sitio
 * desde el que se puede citar esa norma**. Y cuando la entidad la modifique
 * —como pasó con la registral a los diez días de expedirse— nuestra copia
 * pública diría lo viejo con nuestra marca encima.
 *
 * El PDF es EVIDENCIA INTERNA, no contenido. Sirve para que, dentro del panel,
 * se pueda volver a abrir el documento contra el que se cargó cada cifra. El
 * PDF de la simulación no lo enlaza: cita la norma y dice dónde la consigue el
 * lector por su cuenta. Ver `citaPublica` en guardas.ts.
 *
 * ⚠ EL HASH SE CALCULA SOBRE LOS BYTES QUE LLEGAN, antes de subir nada. Si se
 * calculara después, sobre lo que devuelve el almacenamiento, estaríamos
 * comprobando la integridad de nuestra propia copia contra sí misma —un eco— en
 * vez de contra el archivo que el titular tenía delante.
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const KEY = process.env.CLOUDINARY_API_KEY
const SECRET = process.env.CLOUDINARY_API_SECRET

export const CARPETA_NORMAS = 'notariales/normas'

export function evidenciaConfigurada(): boolean {
  return !!(CLOUD && KEY && SECRET)
}

function configurar() {
  if (!evidenciaConfigurada()) {
    throw new Error(
      'Faltan CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET: sin ellas no se puede archivar el ' +
      'documento de forma autenticada, y NO se archiva de forma pública.',
    )
  }
  cloudinary.config({ cloud_name: CLOUD, api_key: KEY, api_secret: SECRET, secure: true })
}

/** SHA-256 de los bytes que llegaron. Hexadecimal en minúsculas, 64 dígitos. */
export function hashDeBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export interface DocumentoArchivado {
  ruta: string
  hash: string
  bytes: number
}

/**
 * Archiva el PDF y devuelve su `public_id` y su hash. Nunca devuelve una URL:
 * una URL guardada sobrevive al borrado del registro y se puede reenviar.
 */
export async function archivarDocumento(bytes: Buffer, nombre: string): Promise<DocumentoArchivado> {
  configurar()
  // El hash, PRIMERO: sobre lo que llegó, no sobre lo que quedó guardado.
  const hash = hashDeBytes(bytes)
  const ruta = await new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CARPETA_NORMAS,
        type: 'authenticated',
        // `raw` porque es un PDF, no una imagen: como imagen, Cloudinary
        // intentaría derivar miniaturas y podría recomprimirlo, y un documento
        // recomprimido ya no cuadra con su hash.
        resource_type: 'raw',
        use_filename: false,
        unique_filename: true,
        context: `origen=panel-notariales|archivo=${nombre.slice(0, 60).replace(/[|=]/g, '-')}`,
      },
      (err, res) => {
        if (err || !res) return reject(err ?? new Error('Cloudinary no devolvió resultado'))
        resolve(res.public_id)
      },
    )
    stream.end(bytes)
  })
  return { ruta, hash, bytes: bytes.length }
}

/**
 * Enlace firmado de vida corta, solo para el proxy del servidor. No se envía al
 * navegador ni se guarda: lo usa el panel para volver a abrir el documento.
 */
export function enlaceEfimeroDocumento(ruta: string, segundos = 60): string {
  configurar()
  return cloudinary.utils.private_download_url(ruta, '', {
    resource_type: 'raw',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + segundos,
  })
}

/** Defensa de ruta: el proxy solo sirve rutas de la carpeta de normas. */
export function esRutaDeNorma(ruta: string): boolean {
  return ruta.startsWith(`${CARPETA_NORMAS}/`) && !ruta.includes('..')
}

/**
 * Vuelve a bajar el documento y comprueba que su hash siga siendo el mismo.
 *
 * No es paranoia: el hash existe para que nadie sustituya el archivo en
 * silencio, y un hash que nunca se vuelve a comprobar es un comentario. El
 * panel lo ofrece como botón en la vista de cotejo.
 */
export async function verificarHashArchivado(ruta: string, hashEsperado: string): Promise<{
  coincide: boolean
  hash: string
}> {
  const url = enlaceEfimeroDocumento(ruta, 60)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo bajar el documento archivado (${res.status}).`)
  const hash = hashDeBytes(Buffer.from(await res.arrayBuffer()))
  return { coincide: hash === hashEsperado, hash }
}
