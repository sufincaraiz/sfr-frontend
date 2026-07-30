// Loader de next/image que delega la optimización/redimensión a CLOUDINARY
// (f_auto, q_auto, w_<ancho>, c_limit) en vez de al optimizador de Vercel. Elimina el
// "peaje doble": las imágenes de Cloudinary ya no consumen cupo de Image Optimization
// de Vercel; Cloudinary hace la transformación por URL.
//
// Se registra como images.loaderFile en next.config → aplica a TODOS los <Image>, por eso:
//
// GUARD (crítico): cualquier URL que NO sea de Cloudinary (logos locales /images/*.png,
// Unsplash, Panoee, etc.) se devuelve TAL CUAL, sin tocar. Si les metiéramos parámetros de
// Cloudinary se romperían; se sirven directas.
//
// IDEMPOTENTE: algunas URLs ya traen transformación (portadas de blog guardadas con
// cloudinaryOptimize → f_auto,q_auto,c_limit,w_1280; o tarjetas con cloudinarySquare →
// c_fill,ar_1:1,g_auto,f_auto,q_auto,w_600). En esos casos NO se apila una segunda
// transformación: se ajusta SOLO el ancho (w_) dentro de la existente, preservando
// recorte/formato/calidad. Las URLs planas (…/upload/v###/…) reciben la transformación nueva.

interface CloudinaryLoaderArgs {
  src: string
  width: number
  quality?: number
}

// Detecta si el primer segmento tras /upload/ ya es una transformación de Cloudinary
// (empieza por una clave de transformación conocida, p. ej. c_, w_, f_, q_, ar_, g_…).
// Una versión ("v1784660209") o un public_id ("properties") NO coinciden.
const ES_TRANSFORM = /(^|,)(c|w|h|f|q|ar|g|dpr|e|fl|o|r|b|co|a|l|u|t|x|y|z|so|eo|du|pg|vc|ac|br|fps)_/

export default function cloudinaryLoader({ src, width }: CloudinaryLoaderArgs): string {
  // GUARD: si no es una URL de Cloudinary, se devuelve intacta (logos locales, etc.).
  if (!src.includes('res.cloudinary.com') || !src.includes('/upload/')) {
    return src
  }

  const idx = src.indexOf('/upload/')
  const base = src.slice(0, idx)          // https://res.cloudinary.com/<cloud>/image
  const rest = src.slice(idx + '/upload/'.length) // <transform?>/v###/<public_id>.<ext>
  const segs = rest.split('/')
  const first = segs[0] ?? ''

  if (ES_TRANSFORM.test(first)) {
    // Ya hay transformación: solo fijamos/actualizamos el ancho, sin duplicar nada.
    const tokens = first.split(',').filter((t) => t && !/^w_/.test(t))
    tokens.push(`w_${width}`)
    segs[0] = tokens.join(',')
    return `${base}/upload/${segs.join('/')}`
  }

  // URL plana: insertamos la transformación antes de la versión. q_auto = Cloudinary elige
  // la calidad óptima (mejor que un número fijo); c_limit nunca agranda.
  return `${base}/upload/f_auto,q_auto,w_${width},c_limit/${rest}`
}
