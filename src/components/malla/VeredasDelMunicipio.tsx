import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { veredasDeMunicipio } from '@/lib/malla-veredas'
import { cargarEnlaces } from '@/lib/enlaces'

/**
 * Malla municipio → veredas, y vereda → veredas hermanas.
 *
 * ORDENADAS POR INVENTARIO, no alfabéticamente. Quien llega buscando dónde
 * comprar tiene delante primero donde hay algo que comprar; el orden alfabético
 * solo sirve a quien ya sabe el nombre de la vereda.
 *
 * Las veredas sin página quedan fuera —las filtra `veredasDeMunicipio`— y el
 * href pasa igualmente por `lib/enlaces.ts`: si una perdiera su página entre
 * dos revalidaciones, el enlace desaparece en vez de convertirse en un 404.
 *
 * No consulta nada por su cuenta: las dos fuentes están en `unstable_cache`,
 * así que da igual cuántas páginas lo rendericen.
 */
export async function VeredasDelMunicipio({
  municipioSlug,
  municipioNombre,
  excluirSlug,
  titulo,
}: {
  municipioSlug: string
  municipioNombre: string
  /** Para no listarse a sí misma cuando lo usa una página de vereda. */
  excluirSlug?: string
  titulo?: string
}) {
  const [todas, enlaces] = await Promise.all([
    veredasDeMunicipio(municipioSlug),
    cargarEnlaces(),
  ])

  const veredas = todas
    .filter(v => v.slug !== excluirSlug)
    .map(v => ({ ...v, href: enlaces.vereda(v.slug) }))
    .filter((v): v is typeof v & { href: string } => v.href !== null)

  if (veredas.length === 0) return null

  return (
    <section style={{ margin: '2.5rem 0' }}>
      <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.35rem' }}>
        {titulo ?? `¿Qué veredas de ${municipioNombre} tienen información propia?`}
      </h2>
      <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0 0 1rem' }}>
        Ordenadas por número de propiedades disponibles.
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {veredas.map(v => (
          <li key={v.slug}>
            <Link
              href={v.href}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '0.65rem 0.9rem', borderRadius: 10, border: '1px solid #E2E8F0',
                background: '#fff', color: '#0D2D5E', fontWeight: 700, fontSize: '0.88rem',
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <MapPin size={14} color="#1B56A1" /> Vereda {v.name}
              </span>
              {/* El conteo solo aparece cuando hay algo: «0 propiedades» invita a
                  no hacer clic, y la página igual sirve para conocer la vereda. */}
              {v.inventario > 0 && (
                <span style={{ color: '#64748B', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {v.inventario} {v.inventario === 1 ? 'propiedad' : 'propiedades'}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
