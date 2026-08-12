// ─────────────────────────────────────────────────────────────────────────────
// Propuestas comerciales retiradas.
//
// Una propuesta es un documento dirigido a UN cliente, no contenido del sitio.
// Cuando deja de estar vigente no basta con quitar el archivo: si simplemente
// desaparece, un buscador la reintenta durante meses y mientras tanto sigue
// mostrándola en resultados.
//
// Por eso devuelve 410 Gone y no 404. La diferencia importa: 404 significa «no
// está aquí ahora» —el rastreador vuelve a probar—, mientras que 410 significa
// «existió y se retiró para siempre», y los buscadores la sacan del índice mucho
// antes. Para un documento que declara una estructura societaria que ya no
// existe, esa diferencia son meses de exposición.
//
// Las propuestas VIGENTES no pasan por aquí: se sirven como HTML estático desde
// public/propuesta/<slug>.html mediante el rewrite de next.config, que tiene
// prioridad sobre esta ruta.
// ─────────────────────────────────────────────────────────────────────────────

/** Propuestas retiradas. Añadir aquí el slug al retirar una. */
const RETIRADAS = new Set([
  // Retirada en agosto de 2026: declaraba un consorcio a tres bandas
  // (Su Finca Raíz · Conarc · MOX) que ya no corresponde a la estructura actual.
  'villa-maria-elvira',
])

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const limpio = slug.replace(/\.html$/, '')

  if (RETIRADAS.has(limpio)) {
    return new Response(
      'Esta propuesta comercial fue retirada y ya no está disponible.\n' +
      'Para una propuesta actualizada, escríbenos al +57 321 882 6730.\n',
      {
        status: 410,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          // Que no se quede cacheada en ningún borde.
          'Cache-Control': 'no-store',
          // Cinturón y tirantes: aunque un rastreador ignore el 410, no la indexa.
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    )
  }

  return new Response('No encontrado', { status: 404 })
}
