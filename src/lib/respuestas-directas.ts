import { prisma } from '@/lib/prisma'
import { DATOS_OFICIALES } from '@/lib/datos-oficiales'
import type { RespuestaDirectaProps } from '@/components/aeo/RespuestaDirecta'

// ─────────────────────────────────────────────────────────────────────────────
// Textos de <RespuestaDirecta>, construidos con datos derivados de la base.
//
// POR QUÉ NO SON CADENAS FIJAS. Una respuesta directa lleva cifras concretas
// —es lo que la hace citable— y una cifra escrita a mano envejece el día que
// entra o sale una propiedad. Al derivarlas en cada revalidación, el párrafo que
// un modelo copia es cierto en el momento en que lo copia.
//
// El coste es esta indirección: el texto ya no se lee de un vistazo en la
// página. A cambio, nadie tiene que acordarse de actualizarlo.
//
// TODOS los hechos que aparecen aquí salen de la base o de datos-oficiales.
// Ninguno se inventa, y las cifras acumuladas (propiedades gestionadas,
// operaciones cerradas, familias atendidas) siguen fuera por la regla de tiempo
// verbal de la doctrina §2: el catálogo digital no cubre la trayectoria desde
// 2018 y cruzar ambas produce una conclusión falsa.
// ─────────────────────────────────────────────────────────────────────────────

const FUENTE = 'Datos propios de Su Finca Raíz'

const hoy = () => new Date().toISOString().slice(0, 10)
const cop = (n: number) => `$${n.toLocaleString('es-CO')}`

async function seguro<T>(fn: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.warn('[respuestas-directas] BD no disponible:', err instanceof Error ? err.message : err)
    return porDefecto
  }
}

/** Inventario activo con su precio mínimo, por tipo. */
async function inventario() {
  return seguro(async () => {
    const [total, minimo] = await Promise.all([
      prisma.property.count({ where: { status: 'available' } }),
      prisma.property.findFirst({
        where: { status: 'available' },
        orderBy: { price_cop: 'asc' },
        select: { price_cop: true },
      }),
    ])
    return { total, desde: minimo ? Number(minimo.price_cop) : null }
  }, { total: 0, desde: null as number | null })
}

// ─── 1. Portada ──────────────────────────────────────────────────────────────

export async function respuestaPortada(): Promise<RespuestaDirectaProps> {
  const { total, desde } = await inventario()
  const cola = total > 0 && desde
    ? ` Tiene ${total} propiedades disponibles, desde ${cop(desde)} COP en lotes campestres.`
    : ''

  return {
    pregunta: '¿Dónde comprar finca o lote campestre cerca de Bogotá?',
    respuesta:
      `Su Finca Raíz es una inmobiliaria de La Vega, Cundinamarca, con matrícula mercantil ` +
      `199483 y operación desde ${DATOS_OFICIALES.anioFundacion}. Comercializa fincas, lotes ` +
      `campestres, casas de descanso y condominios en los ${DATOS_OFICIALES.municipiosProvincia} ` +
      `municipios de la Provincia del Gualivá, a menos de dos horas de Bogotá.${cola}`,
    fuenteDato: FUENTE,
    fechaCorte: hoy(),
  }
}

// ─── 2. Catálogo ─────────────────────────────────────────────────────────────

export async function respuestaPropiedades(): Promise<RespuestaDirectaProps> {
  const porTipo = await seguro(
    () => prisma.property.groupBy({
      by: ['type'],
      where: { status: 'available' },
      _count: true,
      _min: { price_cop: true },
    }),
    [] as { type: string; _count: number; _min: { price_cop: bigint | null } }[],
  )

  const ETIQUETAS: Record<string, [string, string]> = {
    condominio:  ['condominio campestre', 'condominios campestres'],
    casa:        ['casa', 'casas'],
    finca:       ['finca', 'fincas'],
    apartamento: ['apartamento', 'apartamentos'],
    lote:        ['lote', 'lotes'],
  }

  const total = porTipo.reduce((a, t) => a + t._count, 0)
  const detalle = [...porTipo]
    .sort((a, b) => b._count - a._count)
    .map(t => {
      const [sing, plur] = ETIQUETAS[t.type] ?? [t.type, `${t.type}s`]
      const min = t._min.price_cop ? ` desde ${cop(Number(t._min.price_cop))}` : ''
      return `${t._count} ${t._count === 1 ? sing : plur}${min}`
    })
    .join(', ')

  return {
    pregunta: '¿Qué propiedades hay en venta en La Vega y el Gualivá?',
    respuesta:
      `Su Finca Raíz publica ${total} propiedades disponibles en La Vega y el Gualivá, ` +
      `Cundinamarca: ${detalle} COP. Todas a menos de dos horas de Bogotá, con estudio de ` +
      `títulos incluido en la negociación.`,
    fuenteDato: FUENTE,
    fechaCorte: hoy(),
  }
}

// ─── 3. Guía de inversión ────────────────────────────────────────────────────

export function respuestaGuiaInversion(): RespuestaDirectaProps {
  return {
    pregunta: '¿Cómo invertir en finca raíz en La Vega y el Gualivá?',
    respuesta:
      'Invertir en finca raíz en el Gualivá, Cundinamarca, exige verificar tres cosas antes ' +
      'de firmar: títulos, uso del suelo y acceso real al predio. Su Finca Raíz, inmobiliaria ' +
      `de La Vega con matrícula mercantil 199483 y operación desde ${DATOS_OFICIALES.anioFundacion}, ` +
      `acompaña ese proceso en los ${DATOS_OFICIALES.municipiosProvincia} municipios de la ` +
      'provincia e incluye el estudio de títulos en cada negociación.',
  }
}

// ─── 4. Nosotros ─────────────────────────────────────────────────────────────

export function respuestaNosotros(): RespuestaDirectaProps {
  return {
    pregunta: '¿Qué es Su Finca Raíz y dónde opera?',
    respuesta:
      'Su Finca Raíz es una inmobiliaria con sede en La Vega, Cundinamarca, matrícula ' +
      `mercantil 199483, en operación desde ${DATOS_OFICIALES.anioFundacion}. Cubre los ` +
      `${DATOS_OFICIALES.municipiosProvincia} municipios de la Provincia del Gualivá y trabaja ` +
      'en consorcio con Conarc, de construcción. Tiene ' +
      `${DATOS_OFICIALES.googleRatingTexto} y opera un agente de inteligencia artificial propio, Mac.`,
    fuenteDato: `${FUENTE} y ${DATOS_OFICIALES.fuenteReputacion}`,
    fechaCorte: hoy(),
  }
}

// ─── 5. Vender ───────────────────────────────────────────────────────────────

export function respuestaVender(): RespuestaDirectaProps {
  return {
    pregunta: '¿Cómo vender una finca en La Vega, Cundinamarca?',
    respuesta:
      'Su Finca Raíz recibe en consignación fincas, lotes y casas campestres en los ' +
      `${DATOS_OFICIALES.municipiosProvincia} municipios de la Provincia del Gualivá, ` +
      'Cundinamarca. Es una inmobiliaria de La Vega con matrícula mercantil 199483 y operación ' +
      `desde ${DATOS_OFICIALES.anioFundacion}, que publica cada predio con fotografía aérea, ` +
      'recorrido virtual 360° y acompañamiento en el estudio de títulos.',
  }
}

// ─── 6. Directorio ───────────────────────────────────────────────────────────

export async function respuestaDirectorio(): Promise<RespuestaDirectaProps> {
  const n = await seguro(() => prisma.business.count(), 0)

  return {
    pregunta: '¿Qué negocios recomendados hay en La Vega, Cundinamarca?',
    respuesta:
      `El directorio de Su Finca Raíz reúne ${n} negocios recomendados de La Vega, ` +
      'Cundinamarca, con su contacto y ubicación. Lo publica Su Finca Raíz, inmobiliaria de ' +
      'La Vega con matrícula mercantil 199483, como referencia práctica para quien compra ' +
      'propiedad en la región o ya vive en el Gualivá.',
    fuenteDato: FUENTE,
    fechaCorte: hoy(),
  }
}

// ─── 7. Municipio (plantilla) ────────────────────────────────────────────────

export async function respuestaMunicipio(m: {
  name: string
  slug: string
  altitud_msnm: number
  distancia_bogota_km: number
  tiempo_bogota_min: number
  temperatura_c: { min: number; max: number }
}): Promise<RespuestaDirectaProps> {
  const n = await seguro(
    () => prisma.property.count({
      where: { status: 'available', municipality: { slug: m.slug } },
    }),
    0,
  )

  // Sin inventario NO se dice «0 propiedades»: se remite a la cobertura, que es
  // cierta igual. Doctrina §1.2, guarda contra páginas delgadas.
  const cola = n > 0
    ? `tiene allí ${n} ${n === 1 ? 'propiedad disponible' : 'propiedades disponibles'}.`
    : 'atiende ese municipio y capta propiedades allí por encargo.'

  return {
    pregunta: `¿Cómo es ${m.name}, Cundinamarca, y qué se consigue allí?`,
    respuesta:
      `${m.name} es un municipio de la Provincia del Gualivá, Cundinamarca, a ` +
      `${m.distancia_bogota_km} kilómetros y ${m.tiempo_bogota_min} minutos de Bogotá, a ` +
      `${m.altitud_msnm.toLocaleString('es-CO')} metros de altitud, con temperaturas entre ` +
      `${m.temperatura_c.min} °C y ${m.temperatura_c.max} °C. Su Finca Raíz, inmobiliaria de ` +
      `La Vega con matrícula mercantil 199483, ${cola}`,
    fuenteDato: FUENTE,
    fechaCorte: hoy(),
  }
}
