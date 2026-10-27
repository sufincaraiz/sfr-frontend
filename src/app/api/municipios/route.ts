import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Lista de municipios del FILTRO del buscador (home / header).
//
// Se deriva EXCLUSIVAMENTE del inventario activo (doctrina AEO §1.2): un
// municipio entra al filtro cuando tiene al menos una propiedad disponible y
// sale solo cuando deja de tenerla. Nada que ver con que tenga página.
//
// Antes esto era un OR con `oculto: false`, que metía en el filtro municipios
// sin una sola propiedad: el usuario filtraba y no encontraba nada. Filtrar por
// algo que devuelve cero resultados es peor que no ofrecer el filtro.

/* ─── CACHEADA, desde el 2026-10-27 ──────────────────────────────────────────
 *
 * Era una función que se ejecutaba EN CADA CARGA DE PÁGINA, y a veces cuatro
 * veces por carga: la pide `SearchBar`, que vive en el cajón móvil de la
 * cabecera —siempre montado— y en la portada. En Next 15 un `GET` no se cachea
 * por defecto. Se vio en los logs de producción: esta ruta y
 * `/api/property-types` salían en pareja, siempre MISS, y eran 6 de 11
 * invocaciones de función orgánicas en la muestra.
 *
 * 3600 y no más, a propósito: el ahorro viene de pasar de «cada página» a «una
 * vez por hora», no de 1 h a 24 h —eso solo ahorraría ~46 invocaciones/día
 * más y multiplicaría por 24 la ventana de una lista vieja si falla un
 * enganche—. La frescura la dan los `revalidatePath('/api/municipios')` de
 * `revalidarPropiedad()` y de `admin/municipios`; el reloj es la red.
 *
 * ⚠ LA LISTA SALE DEL INVENTARIO, no de la tabla de municipios: lo que más la
 * cambia es PUBLICAR O VENDER UNA PROPIEDAD. Por eso la invalidación vive
 * sobre todo en `revalidarPropiedad()`. Si solo se invalidara al editar un
 * municipio, vender la última finca de un pueblo lo dejaría en el filtro. */
export const revalidate = 3600

/* ⚠ SIN `try/catch`, y es una decisión, no un descuido.
 *
 * El `catch` que devolvía `{ municipios: [] }` era correcto mientras la ruta
 * era dinámica: un fallo de base vaciaba UNA respuesta y la siguiente se
 * recuperaba. Cacheada, el mismo `catch` congelaría la lista VACÍA durante
 * toda la hora, para todos los visitantes, con estado 200 —el buscador sin
 * municipios y ningún error en ninguna parte—.
 *
 * Sin él, un fallo en una revalidación en segundo plano conserva la última
 * versión buena. El precio es que, si la base no responde DURANTE EL BUILD, el
 * build falla y sigue en línea el despliegue anterior: visible y seguro, que es
 * mejor que silencioso y roto. `/api/property-types` ya era así. */
export async function GET() {
  const rows = await prisma.municipality.findMany({
    where: { properties: { some: { status: 'available' } } },
    orderBy: [{ demand_score: 'desc' }, { name: 'asc' }],
    select: { name: true, slug: true },
  })
  return NextResponse.json({ municipios: rows })
}
