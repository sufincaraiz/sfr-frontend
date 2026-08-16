import Link from 'next/link'
import { Navigation } from 'lucide-react'
import { veredasCercanas } from '@/lib/malla-veredas'
import { cargarEnlaces } from '@/lib/enlaces'

/**
 * Vereda → veredas cercanas.
 *
 * Es el enlace que más sirve al comprador —«no encontré en Bulucaima, ¿qué hay
 * al lado?»— y el que cierra el circuito hiperlocal, que es el territorio donde
 * no hay competencia digital.
 *
 * SE LLAMAN «CERCANAS», NO «COLINDANTES». No tenemos el dato de lindero: la
 * distancia sale de los centroides declarados en `veredas-data.ts`. Afirmar
 * colindancia sería una afirmación no verificada, de la misma clase que las
 * que llevamos toda la sesión retirando. La colindancia real llega con el POT
 * municipal; entonces sustituye a esto, no lo complementa.
 *
 * Una vereda sin coordenadas no propone vecinas en vez de proponer cualquiera.
 */
export async function VeredasCercanas({ slug }: { slug: string }) {
  const [cercanas, enlaces] = await Promise.all([
    veredasCercanas(slug),
    cargarEnlaces(),
  ])

  const items = cercanas
    .map(v => ({ ...v, href: enlaces.vereda(v.slug) }))
    .filter((v): v is typeof v & { href: string } => v.href !== null)

  if (items.length === 0) return null

  return (
    <section style={{ margin: '2.5rem 0' }}>
      <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.35rem' }}>
        ¿Qué otras veredas hay cerca?
      </h2>
      <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0 0 1rem' }}>
        Otras veredas de {items[0]!.municipio_name}, de la más cercana a la más lejana.
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {items.map(v => (
          <li key={v.slug}>
            <Link
              href={v.href}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '0.65rem 0.9rem', borderRadius: 10, border: '1px solid #E2E8F0',
                background: '#FAFAFA', color: '#0D2D5E', fontWeight: 700, fontSize: '0.88rem',
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Navigation size={13} color="#1B56A1" /> {v.name}
              </span>
              {/* El ORDEN se publica; la distancia no. Los centroides de
                  veredas-data.ts son aproximados —los once caben en unos 4×4 km
                  alrededor del casco urbano— y sirven para ordenar, no para
                  afirmar «400 m» al metro entre dos veredas rurales. Publicar la
                  cifra declararía una precisión que el dato no tiene. */}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
