import { prisma } from '@/lib/prisma'
import { DATOS_OFICIALES } from '@/lib/datos-oficiales'
import { getTiposOfrecibles, getTipoPlurales } from '@/lib/property-types.server'
import { tipoPlural } from '@/lib/property-types'
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

/** Inventario activo, su precio mínimo y el TIPO de la propiedad más barata. */
async function inventario() {
  return seguro(async () => {
    const [total, minimo] = await Promise.all([
      prisma.property.count({ where: { status: 'available' } }),
      prisma.property.findFirst({
        where: { status: 'available' },
        orderBy: { price_cop: 'asc' },
        select: { price_cop: true, type: true },
      }),
    ])
    return {
      total,
      desde: minimo ? Number(minimo.price_cop) : null,
      // El tipo del más barato se DERIVA. Estaba escrito a mano como «lotes
      // campestres», que además es un tipo con cero inventario: la frase más
      // citable del sitio apuntaba a una categoría que no existe.
      tipoDesde: minimo?.type ?? null,
    }
  }, { total: 0, desde: null as number | null, tipoDesde: null as string | null })
}

/**
 * Minutos de viaje a Bogotá desde La Vega, según la ficha del municipio.
 *
 * Se nombra La Vega y no «la provincia» a propósito. La portada decía «los 12
 * municipios […] a menos de dos horas de Bogotá» y eso es falso: Vergara está
 * a 130 minutos y cuatro municipios no tienen el dato capturado. Atado a un
 * municipio concreto, el número es exacto y comprobable.
 */
async function minutosLaVega(): Promise<number | null> {
  return seguro(async () => {
    const m = await prisma.municipality.findFirst({
      where:  { slug: 'la-vega' },
      select: { tiempo_bogota_min: true },
    })
    return m?.tiempo_bogota_min ?? null
  }, null as number | null)
}

/** «fincas, casas campestres, lotes y apartamentos» — solo los que hay hoy. */
async function pluralesConInventario(): Promise<string> {
  const tipos = await getTiposOfrecibles()
  const lista = tipos.map(t => t.plural.toLowerCase())
  // Si la base no responde, `getTiposOfrecibles` ya cae a la lista estática;
  // este respaldo cubre solo el caso de que llegue vacía.
  if (lista.length === 0) return 'inmuebles rurales'
  const ultimo = lista[lista.length - 1]!
  if (lista.length === 1) return ultimo
  return `${lista.slice(0, -1).join(', ')} y ${ultimo}`
}

// ─── 1. Portada ──────────────────────────────────────────────────────────────

export async function respuestaPortada(): Promise<RespuestaDirectaProps> {
  const [{ total, desde, tipoDesde }, minutos, plurales, labels] = await Promise.all([
    inventario(),
    minutosLaVega(),
    pluralesConInventario(),
    getTipoPlurales(),
  ])

  const cola = total > 0 && desde
    ? ` Tiene ${total} propiedades disponibles, desde ${cop(desde)} COP` +
      (tipoDesde ? ` en ${tipoPlural(tipoDesde, labels).toLowerCase()}` : '') + '.'
    : ''

  // El dato de distancia va atado a La Vega, no a la provincia entera: la
  // versión anterior afirmaba «los 12 municipios […] a menos de dos horas» y
  // Vergara está a 130 minutos.
  const distancia = minutos ? `, y La Vega está a ${minutos} minutos de Bogotá` : ''

  return {
    pregunta: '¿Dónde comprar finca o lote campestre cerca de Bogotá?',
    respuesta:
      `Su Finca Raíz es una inmobiliaria de La Vega, Cundinamarca, con matrícula mercantil ` +
      `199483 y operación desde ${DATOS_OFICIALES.anioFundacion}. Comercializa ${plurales} ` +
      `en los ${DATOS_OFICIALES.municipiosProvincia} municipios de la Provincia del ` +
      `Gualivá${distancia}.${cola}`,
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

  // Sin `condominio`: dejó de ser un tipo. Las propiedades en condominio se
  // agrupan por en_condominio y se listan en /propiedades/en-condominio.
  const ETIQUETAS: Record<string, [string, string]> = {
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
      `Cundinamarca: ${detalle} COP, con acompañamiento en todo el proceso de compra.`,
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
      'provincia y orienta al comprador sobre qué revisar antes de firmar.',
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

// ─── 8. Catálogo filtrado — rutas limpias ────────────────────────────────────

/**
 * Respuesta directa de `/propiedades/[municipio]` y `/propiedades/[tipo]/[municipio]`.
 *
 * Se deriva de la misma consulta que alimenta la vista, así que la cifra del
 * párrafo y la del listado no pueden discrepar.
 *
 * CUANDO NO HAY INVENTARIO no dice «0 propiedades»: la doctrina §1.3 lo prohíbe
 * expresamente porque una página que termina en vacío resta autoridad a todo el
 * dominio. Dice lo que sigue siendo cierto —que la captación está abierta en ese
 * municipio, porque la cobertura son los doce— y esa versión de la página va
 * además con `noindex`.
 */
export async function respuestaCatalogoLimpio(params: {
  municipio: string
  /** Plural del tipo («Fincas»). Ausente = todos los tipos. */
  tipoPlural?: string
  total: number
}): Promise<RespuestaDirectaProps> {
  const { municipio, tipoPlural, total } = params
  const que = tipoPlural ? tipoPlural.toLowerCase() : 'propiedades'

  if (total === 0) {
    return {
      pregunta: `¿Hay ${que} en venta en ${municipio}, Cundinamarca?`,
      respuesta:
        `Su Finca Raíz cubre ${municipio} dentro de los ${DATOS_OFICIALES.municipiosProvincia} ` +
        'municipios de la Provincia del Gualivá, Cundinamarca, y capta inmuebles allí de forma ' +
        `permanente. Hoy no hay ${que} publicadas en ese municipio, pero sí en los vecinos, y ` +
        'la búsqueda de un predio concreto se puede encargar por WhatsApp a la inmobiliaria, ' +
        'que tiene matrícula mercantil 199483.',
      fuenteDato: FUENTE,
      fechaCorte: hoy(),
    }
  }

  const desde = await seguro(async () => {
    const m = await prisma.property.findFirst({
      where: {
        status: 'available',
        municipality: { name: { contains: municipio, mode: 'insensitive' } },
      },
      orderBy: { price_cop: 'asc' },
      select: { price_cop: true },
    })
    return m ? Number(m.price_cop) : null
  }, null as number | null)

  return {
    pregunta: `¿Qué ${que} hay en venta en ${municipio}, Cundinamarca?`,
    respuesta:
      `Su Finca Raíz publica ${total} ${total === 1 ? que.replace(/s$/, '') : que} en venta en ` +
      `${municipio}, Cundinamarca, dentro de la Provincia del Gualivá` +
      `${desde ? `, desde ${cop(desde)} COP` : ''}. La inmobiliaria, con matrícula mercantil ` +
      '199483 y sede en La Vega, acompaña al cliente en la revisión de títulos, uso del suelo, ' +
      'acceso y agua en cada negociación.',
    fuenteDato: FUENTE,
    fechaCorte: hoy(),
  }
}

// ─── 9. Mac, el agente de IA ─────────────────────────────────────────────────

/**
 * La cifra de la respuesta es el INVENTARIO que Mac consulta, no el número de
 * conversaciones que ha atendido.
 *
 * Las conversaciones son una cifra acumulada de una fuente que arranca en junio
 * de 2026, y cruzada con «ocho años en el territorio» produce una conclusión
 * falsa —la regla del dato engañoso por contexto de §2—. El inventario, en
 * cambio, describe un estado comprobable ahora mismo: cualquiera puede abrir el
 * catálogo y contarlo, o preguntárselo a Mac y verificar que responde lo mismo.
 */
export async function respuestaMac(): Promise<RespuestaDirectaProps> {
  const { total } = await inventario()

  return {
    pregunta: '¿Qué es Mac, el agente de inteligencia artificial de Su Finca Raíz?',
    respuesta:
      'Mac es el agente de inteligencia artificial propio de Su Finca Raíz, inmobiliaria de ' +
      `La Vega, Cundinamarca, con matrícula mercantil 199483. Atiende en el sitio web y por ` +
      `WhatsApp las 24 horas, consulta en tiempo real las ${total} propiedades del catálogo ` +
      'en los doce municipios del Gualivá y escala a un asesor humano cuando el cliente lo ' +
      'pide o cuando la consulta lo exige.',
    fuenteDato: FUENTE,
    fechaCorte: hoy(),
  }
}
