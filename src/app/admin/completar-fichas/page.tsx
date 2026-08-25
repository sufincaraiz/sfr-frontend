import { prisma } from '@/lib/prisma'
import { getAllVeredasData } from '@/lib/veredas-data'
import { CompletarFichasForm, type FilaFicha } from './CompletarFichasForm'

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETAR FICHAS — acceso y servicios, en una sola pasada
//
// La auditoría de hechos adversos encontró 18 fichas sin acceso y 15 sin
// servicios. Hacerlo ficha por ficha en el editor son 29 pantallas, y escribir
// «acueducto veredal, energía Enel-Codensa, pozo séptico» quince veces a mano
// es donde se cuelan las erratas.
//
// LA LISTA SE DERIVA, no se escribe: aparecen aquí las fichas a las que HOY les
// falta el dato. Cuando se llenan, desaparecen solas; si mañana entra una ficha
// nueva sin acceso, aparece sola. Una lista escrita a mano de «las 21» se
// habría quedado obsoleta el mismo día.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Completar fichas · Su Finca Raíz' }

/** Servicios más frecuentes del catálogo. Se derivan: no son una lista fija. */
async function serviciosFrecuentes(): Promise<string[]> {
  const filas = await prisma.propertyFeature.groupBy({
    by: ['feature_value'],
    where: { feature_key: 'servicio' },
    _count: { feature_value: true },
    orderBy: { _count: { feature_value: 'desc' } },
    take: 12,
  })
  const delCatalogo = filas.map(f => f.feature_value)
  // Opciones que el catálogo todavía no usa pero que son reales en el campo, y
  // que hay que poder marcar sin escribirlas: la ausencia también se publica.
  const NECESARIAS = [
    'Acueducto veredal',
    'Concesión de agua CAR',
    'Nacedero propio',
    'Pozo séptico',
    'Alcantarillado',
    'Sin conexión de agua',
    'Sin conexión de gas',
    'Sin alcantarillado',
  ]
  const vistos = new Set(delCatalogo.map(s => s.toLowerCase()))
  return [...delCatalogo, ...NECESARIAS.filter(s => !vistos.has(s.toLowerCase()))]
}

/**
 * «Tener el dato» no es «tener la clave». Un acceso puede estar en la clave
 * `acceso`, en el booleano viejo `via_pavimentada`, o descrito en la prosa de la
 * ficha —hay varias que lo cuentan bien en la descripción—. Filtrar solo por la
 * clave habría metido en esta lista 28 fichas en vez de las que de verdad
 * callan el dato, y la lista habría dejado de ser creíble a la tercera fila.
 *
 * El criterio es EL MISMO que usa la auditoría (`cruce-ficha-vereda.ts`), a
 * propósito: si divergen, una dice que falta y la otra que no.
 */
type PropConFeatures = {
  short_description: string | null
  description: string | null
  features: Array<{ feature_key: string; feature_value: string }>
}

const MENCIONA_ACCESO =
  /\b(acceso|v[ií]a|v[ií]as|carretera|carreteable|pavimentad\w*|destapad\w*|placa huella|se llega)\b/i
const MENCIONA_SERVICIOS =
  /\b(acueducto|agua|energ[ií]a|enel|codensa|gas|alcantarillado|pozo s[eé]ptico|internet|servicios p[úu]blicos)\b/i

function prosaDe(p: PropConFeatures): string {
  return [p.short_description, p.description].filter(Boolean).join('\n')
}

function tieneAcceso(p: PropConFeatures): boolean {
  if (p.features.some(f => f.feature_key === 'acceso' && f.feature_value.trim())) return true
  if (p.features.some(f => f.feature_key === 'via_pavimentada' && f.feature_value === 'si')) return true
  return MENCIONA_ACCESO.test(prosaDe(p))
}

function tieneServicios(p: PropConFeatures): boolean {
  if (p.features.some(f => f.feature_key === 'servicio' && f.feature_value.trim())) return true
  if (p.features.some(f => ['agua', 'energia', 'gas', 'internet', 'alcantarillado', 'acueducto'].includes(f.feature_key))) return true
  return MENCIONA_SERVICIOS.test(prosaDe(p))
}

export default async function CompletarFichasPage() {
  const [props, servicios] = await Promise.all([
    prisma.property.findMany({
      where: { status: 'available' },
      select: {
        id: true, slug: true, title: true, type: true,
        short_description: true, description: true,
        municipality: { select: { name: true } },
        vereda: { select: { slug: true, name: true } },
        features: { select: { feature_key: true, feature_value: true } },
      },
      orderBy: { title: 'asc' },
    }),
    serviciosFrecuentes(),
  ])

  const veredas = getAllVeredasData()

  const filas: FilaFicha[] = props
    .map(p => {
      const acceso = p.features.find(f => f.feature_key === 'acceso')?.feature_value ?? ''
      const yaServicios = p.features.filter(f => f.feature_key === 'servicio').map(f => f.feature_value)
      const v = p.vereda ? veredas.find(x => x.slug === p.vereda!.slug) : undefined
      return {
        id: p.id,
        slug: p.slug,
        titulo: p.title ?? p.slug,
        tipo: p.type,
        municipio: p.municipality?.name ?? '—',
        vereda: p.vereda?.name ?? null,
        accesoVereda: v?.acceso_vial ?? null,
        acceso,
        servicios: yaServicios,
        // Referencia para no tener que abrir la ficha: el arranque del texto.
        referencia: (p.short_description ?? p.description ?? '')
          .replace(/\s+/g, ' ').trim().slice(0, 220),
        faltaAcceso: !tieneAcceso(p),
        faltaServicios: !tieneServicios(p),
      }
    })
    .filter(f => f.faltaAcceso || f.faltaServicios)

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      <h1 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.4rem' }}>
        Completar fichas — acceso y servicios
      </h1>
      <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 780, marginBottom: '0.6rem' }}>
        Aparecen solo las fichas a las que <strong>hoy</strong> les falta uno de los dos datos.
        Al guardar desaparecen de esta lista. Si mañana entra una ficha nueva sin acceso, aparece sola.
      </p>
      <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 780, marginBottom: '1.5rem' }}>
        <strong>«Sin conexión de agua» es tan publicable como «acueducto veredal».</strong> Lo que
        no es publicable es el silencio: en un predio rural, no decirlo se lee como que no lo hay.
        Y si el acceso varía por tramos, escríbelos todos — «asfaltada, placa huella y destapada»,
        no solo el mejor.
      </p>

      {filas.length === 0
        ? <p style={{ color: '#15803D', fontWeight: 700 }}>✓ Todas las fichas tienen acceso y servicios.</p>
        : <CompletarFichasForm filas={filas} opcionesServicio={servicios} />}
    </main>
  )
}
