/**
 * ENLACES INTERNOS — autoridad única sobre «¿esta entidad tiene página?»
 * =====================================================================
 *
 * Tres veces el mismo fallo, y las tres fuera del alcance de `next build`,
 * que compila en verde porque el enlace es una plantilla de cadena válida:
 *
 *   1. La miga de la ficha enlazaba a `/veredas/<slug>` de una vereda de la
 *      tabla sin entrada en veredas-data.ts.
 *   2. El breadcrumb del borrador de dron enlazaba a `/servicios`, que no
 *      existe: solo existe `/servicios/dron-y-fotogrametria`.
 *   3. `related-properties.ts` repetía el fallo 1 desde otro sitio.
 *
 * El patrón común no es el descuido: es que cada punto del código decidía por
 * su cuenta si una ruta existía, replicando una regla que vive en otra parte
 * (veredas-data.ts, el inventario del catálogo, el árbol de `src/app`). Este
 * módulo centraliza esa decisión para que haya un solo sitio donde equivocarse.
 *
 * ---------------------------------------------------------------------------
 * CÓMO SE USA
 *
 * En un componente de servidor, cargar el índice una vez y construir enlaces:
 *
 *     const enlaces = await cargarEnlaces()
 *     const href = enlaces.vereda('llano-grande')   // → null, no tiene página
 *     {href && <Link href={href}>…</Link>}
 *
 * Devuelve `null`, nunca una ruta rota. Un `null` es una decisión de diseño
 * —mostrar el bloque sin enlace— y no un error que haya que capturar.
 *
 * `cargarEnlaces()` está memoizada por petición con `cache()` de React: da
 * igual cuántos componentes la llamen dentro del mismo render.
 *
 * ---------------------------------------------------------------------------
 * REGLA DE ORO
 *
 * Si añades una ruta con segmento dinámico, su condición de existencia se
 * declara AQUÍ. No en el componente que la enlaza.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getAllVeredasData } from './veredas-data'
import { getMunicipiosVisibles } from './municipios'
import { combinacionesConInventario, municipiosConInventarioSlug } from './catalogo'

/** Rutas propias sin segmento dinámico. Escritas a mano porque a mano se enlazan. */
const RUTAS_FIJAS = new Set([
  '/', '/propiedades', '/municipios', '/veredas', '/blog', '/nosotros', '/contacto',
  '/mac', '/glosario', '/directorio', '/guia-inversion', '/preguntas-frecuentes',
  '/vender-mi-finca', '/fincas-en-venta',
  '/servicios/dron-y-fotogrametria',
  // OJO: «/servicios» NO está. No hay src/app/servicios/page.tsx.
])

export interface Enlaces {
  /** `/municipios/<slug>` si el municipio es publicable. */
  municipio(slug: string | null | undefined): string | null
  /** `/veredas/<slug>` si la vereda tiene contenido en veredas-data.ts. */
  vereda(slug: string | null | undefined): string | null
  /** `/propiedades/<municipio>` si ese municipio tiene inventario. */
  catalogoMunicipio(slug: string | null | undefined): string | null
  /** `/propiedades/<tipo>/<municipio>` si esa combinación tiene inventario. */
  catalogoTipoMunicipio(tipo: string | null | undefined, municipio: string | null | undefined): string | null
  /** Rutas fijas: devuelve la ruta si existe, `null` si nadie la ha creado. */
  fija(ruta: string): string | null
  /**
   * Como `municipio()` pero nunca devuelve null: si no hay página, cae al
   * catálogo filtrado, que existe siempre. Para cuando el enlace tiene que
   * estar sí o sí —el nombre del municipio en la miga de una ficha—.
   */
  municipioConRespaldo(nombre: string, slug: string): string
}

/**
 * Las tres listas que sí tocan la base. En la caché de datos de Next, NO en
 * `cache()` de React.
 *
 * La diferencia costó un build: `cache()` memoiza dentro de un render, y en el
 * prerender cada una de las 167 páginas es su propio render. Con esto en
 * `cache()`, la ficha pasaba de 1 consulta a 3, y con el pool en 5 el build
 * moría con P2024 —el mismo fallo de la vereda por consulta aparte, otra vez—.
 * Salía «verde» solo porque Next reintenta hasta tres veces.
 *
 * `unstable_cache` comparte el resultado entre renders y entre peticiones: una
 * ronda por hora, no una por página.
 *
 * El `catch` va FUERA a propósito. Si estuviera dentro, una caída de Railway
 * cachearía «nada tiene página» durante una hora y el sitio se quedaría sin
 * enlaces internos mucho después de que la base volviera.
 */
const leerIndice = unstable_cache(
  async () => {
    const [municipios, catalogoMunis, combinaciones] = await Promise.all([
      getMunicipiosVisibles(),
      municipiosConInventarioSlug(),
      combinacionesConInventario(),
    ])
    return {
      municipios: municipios.map(m => m.slug),
      catalogo:   catalogoMunis,
      combis:     combinaciones.map(c => `${c.tipo}/${c.municipio}`),
    }
  },
  ['indice-enlaces-internos'],
  { revalidate: 3600, tags: ['enlaces'] },
)

export const cargarEnlaces = cache(async (): Promise<Enlaces> => {
  // Sin índice se pierden enlaces, no se cae la página: `municipioConRespaldo`
  // sigue devolviendo el catálogo filtrado, que existe siempre.
  const idx = await leerIndice().catch(err => {
    console.warn('[enlaces] índice no disponible; se omiten enlaces internos:', err instanceof Error ? err.message : err)
    return { municipios: [] as string[], catalogo: [] as string[], combis: [] as string[] }
  })

  const setMunicipios = new Set(idx.municipios)
  const setVeredas    = new Set(getAllVeredasData().map(v => v.slug))
  const setCatalogo   = new Set(idx.catalogo)
  const setCombis     = new Set(idx.combis)

  return {
    municipio: slug => (slug && setMunicipios.has(slug) ? `/municipios/${slug}` : null),
    vereda:    slug => (slug && setVeredas.has(slug) ? `/veredas/${slug}` : null),
    catalogoMunicipio: slug => (slug && setCatalogo.has(slug) ? `/propiedades/${slug}` : null),
    catalogoTipoMunicipio: (tipo, municipio) =>
      tipo && municipio && setCombis.has(`${tipo}/${municipio}`)
        ? `/propiedades/${tipo}/${municipio}`
        : null,
    fija: ruta => (RUTAS_FIJAS.has(ruta) ? ruta : null),
    municipioConRespaldo: (nombre, slug) =>
      slug && setMunicipios.has(slug)
        ? `/municipios/${slug}`
        : `/propiedades?municipio=${encodeURIComponent(nombre)}`,
  }
})

/**
 * Variante sincrónica, solo para veredas: su fuente es código, no base de datos.
 * Existe para los sitios que no pueden esperar a un `await` —`related-properties.ts`
 * construye el resultado dentro de un map— y para no obligar a cargar el índice
 * entero cuando lo único que se necesita es esta comprobación.
 */
export function hrefVereda(slug: string | null | undefined): string | null {
  if (!slug) return null
  return getAllVeredasData().some(v => v.slug === slug) ? `/veredas/${slug}` : null
}
