import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { cargarEnlaces } from '@/lib/enlaces'
import { veredasPublicables } from '@/lib/malla-veredas'

/**
 * Blog → municipio / vereda. Bloque al pie, no enlaces al vuelo.
 *
 * Al pie y no dentro del cuerpo porque un enlace inyectado sobre el texto
 * cambia lo que el autor escribió, y aquí el autor puede ser alguien de la
 * comunidad.
 *
 * ---------------------------------------------------------------------------
 * QUÉ CALIFICA
 *
 * Solo lo que el artículo menciona DE VERDAD: más de una aparición, o
 * aparición en el título. Una mención incidental no justifica un enlace.
 *
 * EL ARTÍCULO TIENE QUE LLAMARLO POR SU NOMBRE. Al comparar se exige que la
 * mención venga precedida de «vereda» o del artículo original —«La Cabaña»,
 * «vereda Cabaña»— y NO cuenta «una cabaña». El comparador tolerante quita el
 * artículo para que «vereda Rosario» encuentre El Rosario, y ese mismo
 * mecanismo, sin esta condición, hace que «cabaña», «centro», «libertad» y
 * «el roble» choquen con vocabulario corriente del dominio. Medido: «La
 * Cabaña» daba 5 falsos positivos en dos artículos, todos del tipo «instalar
 * una cabaña» o «poner una cabaña para renta turística».
 *
 * TOPE DE 5, por inventario y luego por menciones. Un artículo que nombra los
 * doce municipios —hay uno— produciría un vertedero de enlaces, no una malla.
 *
 * Si nada califica, el bloque NO se renderiza. Un bloque vacío es peor que su
 * ausencia.
 */

const TOPE = 5

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Cuenta menciones exigiendo que el nombre venga nombrado como lugar.
 *
 * @param nombre  «La Cabaña», «Sasaima»
 * @param clase   'vereda' admite además el prefijo «vereda X»
 */
function contar(texto: string, nombre: string, clase: 'municipio' | 'vereda'): number {
  const n = norm(nombre)
  const articulo = n.match(/^(el|la|los|las)\s+/)?.[0]
  const base = escapar(n.replace(/^(el|la|los|las)\s+/, ''))
  if (base.length < 4) return 0

  // Sin artículo propio: el nombre basta («Sasaima», «Nocaima»).
  if (!articulo) {
    const re = new RegExp(`\\b${base}\\b`, 'g')
    return (texto.match(re) || []).length
  }

  // Con artículo: se exige el artículo original o la palabra «vereda» delante.
  // «La Cabaña» y «vereda Cabaña» cuentan; «una cabaña» no.
  const prefijos = clase === 'vereda' ? `(?:${escapar(articulo.trim())}\\s+|vereda\\s+(?:${escapar(articulo.trim())}\\s+)?)` : `${escapar(articulo.trim())}\\s+`
  const re = new RegExp(`\\b${prefijos}${base}\\b`, 'g')
  return (texto.match(re) || []).length
}

interface Enlazable {
  href: string
  nombre: string
  clase: 'municipio' | 'vereda'
  inventario: number
  menciones: number
}

export async function TerritorioDelArticulo({
  titulo, contenido, extracto,
}: { titulo: string; contenido: string; extracto?: string | null }) {
  const texto = norm(`${contenido} ${extracto ?? ''}`)
  const tit = norm(titulo)

  const [munis, veredas, enlaces, invMuni] = await Promise.all([
    prisma.municipality.findMany({ select: { slug: true, name: true } }).catch(() => []),
    veredasPublicables().catch(() => []),
    cargarEnlaces(),
    prisma.municipality
      .findMany({
        where: { properties: { some: { status: 'available' } } },
        select: { slug: true, _count: { select: { properties: { where: { status: 'available' } } } } },
      })
      .catch(() => []),
  ])
  const nMuni = Object.fromEntries(invMuni.map(m => [m.slug, m._count.properties]))

  const candidatos: Enlazable[] = []

  for (const m of munis) {
    const href = enlaces.municipio(m.slug)
    if (!href) continue // sin página, no se enlaza
    const n = contar(texto, m.name, 'municipio')
    const enTitulo = contar(tit, m.name, 'municipio') > 0
    if (n > 1 || enTitulo) {
      candidatos.push({ href, nombre: m.name, clase: 'municipio', inventario: nMuni[m.slug] ?? 0, menciones: n })
    }
  }

  for (const v of veredas) {
    const href = enlaces.vereda(v.slug)
    if (!href) continue
    const n = contar(texto, v.name, 'vereda')
    const enTitulo = contar(tit, v.name, 'vereda') > 0
    if (n > 1 || enTitulo) {
      candidatos.push({ href, nombre: `Vereda ${v.name}`, clase: 'vereda', inventario: v.inventario, menciones: n })
    }
  }

  const elegidos = candidatos
    .sort((a, b) => b.inventario - a.inventario || b.menciones - a.menciones)
    .slice(0, TOPE)

  if (elegidos.length === 0) return null

  return (
    <section style={{ margin: '2.5rem 0', paddingTop: '1.5rem', borderTop: '1px solid #E2E8F0' }}>
      <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.05rem', margin: '0 0 0.9rem' }}>
        ¿Qué hay en venta en los lugares de los que habla este artículo?
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {elegidos.map(e => (
          <li key={e.href}>
            <Link
              href={e.href}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '0.65rem 0.9rem', borderRadius: 10, border: '1px solid #E2E8F0',
                background: '#fff', color: '#0D2D5E', fontWeight: 700, fontSize: '0.88rem',
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <MapPin size={14} color="#1B56A1" /> {e.nombre}
              </span>
              {e.inventario > 0 && (
                <span style={{ color: '#64748B', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {e.inventario} {e.inventario === 1 ? 'propiedad' : 'propiedades'}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
