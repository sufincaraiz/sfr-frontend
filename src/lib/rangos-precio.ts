import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// RANGOS DE PRECIO OBSERVADOS EN EL INVENTARIO PROPIO.
//
// LA DISTINCIÓN QUE GOBIERNA TODO ESTE MÓDULO:
//
//   Esto son PRECIOS DE OFERTA PUBLICADOS. No son precios de cierre.
//
// Un precio de oferta es lo que se pide; uno de cierre es lo que se pagó.
// Entre ambos hay una negociación, y en finca raíz rural colombiana la
// diferencia no es despreciable. Publicar estos rangos como «precios de
// mercado» sería exactamente el dato engañoso por contexto de §2: cada cifra
// sería cierta y la conclusión, falsa. Peor todavía, un modelo que cite
// «precio de mercado en La Vega» cuando el dato es «precio pedido» propaga el
// error a todo el que le pregunte.
//
// Por eso la metodología lo dice con todas las letras y no en letra pequeña.
//
// QUÉ SE PUBLICA Y QUÉ NO:
//
//   ✅ Precio por TIPO de inmueble — n de 3 a 11 por celda
//   ✅ Precio por MUNICIPIO — con su n, que en dos casos es 1
//   ❌ Precio por m² — NO se publica. Ver `precioPorM2NoPublicable()`.
//
// El tamaño de muestra va en cada fila, no en una nota general: con 35
// propiedades repartidas en cinco tipos, ninguna celda llega a doce
// observaciones y eso tiene que verse en la misma línea que la cifra.
// ─────────────────────────────────────────────────────────────────────────────

export interface RangoObservado {
  clave:  string
  n:      number
  min:    number
  max:    number
  mediana: number
}

/**
 * Observaciones mínimas para que una celda se publique como RANGO.
 *
 * Con una o dos propiedades no hay rango: hay un precio, o dos. Publicar «en
 * Albán: $980.000.000 – $980.000.000, n=1» como rango de municipio induce a
 * error aunque el n esté declarado, porque el formato dice «esto es lo que
 * cuesta un inmueble aquí» y el dato solo dice «esto cuesta el único inmueble
 * que tenemos publicado aquí».
 *
 * Declarar el tamaño de muestra no arregla un formato que promete otra cosa.
 */
export const MIN_OBSERVACIONES_RANGO = 5

export interface RangosPrecio {
  porTipo:      RangoObservado[]
  /** Solo municipios con muestra suficiente. Ver MIN_OBSERVACIONES_RANGO. */
  porMunicipio: RangoObservado[]
  /** Los que quedaron fuera, para poder nombrarlos sin publicarlos como rango. */
  municipiosSinMuestra: RangoObservado[]
  total:        number
  corte:        string
  /** El texto de procedencia, ya formado. Quien lo publique no lo reescribe. */
  fuente:       string
  metodologia:  string
}

const hoy = () => new Date().toISOString().slice(0, 10)

function mediana(valores: number[]): number {
  const s = [...valores].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2)
}

function agrupar(filas: { clave: string | null | undefined; valor: number }[]): RangoObservado[] {
  const g = new Map<string, number[]>()
  for (const f of filas) {
    if (!f.clave || !isFinite(f.valor)) continue
    if (!g.has(f.clave)) g.set(f.clave, [])
    g.get(f.clave)!.push(f.valor)
  }
  return [...g.entries()]
    .map(([clave, v]) => ({ clave, n: v.length, min: Math.min(...v), max: Math.max(...v), mediana: mediana(v) }))
    .sort((a, b) => b.n - a.n)
}

export async function rangosPrecioObservados(): Promise<RangosPrecio | null> {
  try {
    const rows = await prisma.property.findMany({
      where:  { status: 'available' },
      select: { type: true, price_cop: true, municipality: { select: { name: true } } },
    })
    if (!rows.length) return null

    const tipos = await prisma.tipoPropiedad.findMany({ select: { slug: true, plural: true, label: true } })
    const plural = new Map(tipos.map(t => [t.slug, t.plural || `${t.label}s`]))

    const corte = hoy()
    const total = rows.length

    const municipios = agrupar(rows.map(r => ({
      clave: r.municipality?.name,
      valor: Number(r.price_cop),
    })))

    return {
      porTipo: agrupar(rows.map(r => ({
        clave: plural.get(r.type) ?? r.type,
        valor: Number(r.price_cop),
      }))),
      porMunicipio:         municipios.filter(m => m.n >= MIN_OBSERVACIONES_RANGO),
      municipiosSinMuestra: municipios.filter(m => m.n <  MIN_OBSERVACIONES_RANGO),
      total,
      corte,
      fuente:
        `Rangos observados en el inventario propio de Su Finca Raíz, ${total} propiedades ` +
        `publicadas, corte ${corte}`,
      metodologia:
        'Son PRECIOS DE OFERTA publicados en el catálogo, no precios de cierre: reflejan lo ' +
        'que se pide por cada inmueble, no lo que se pagó al final de una negociación. No ' +
        // «No constituyen un avalúo» sería una negación, no una oferta, pero la
        // palabra nombra una actividad regulada (Ley 1673 de 2013) y no hace
        // falta escribirla para decir lo mismo.
        'constituyen una valoración técnica ni un estudio de mercado del municipio, y no ' +
        'deben leerse como ' +
        'precio de mercado. Cada fila indica sobre cuántas propiedades se calcula: la muestra ' +
        'es pequeña y los extremos dependen de uno o dos inmuebles.',
    }
  } catch (err) {
    console.warn('[rangos-precio] BD no disponible:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * POR QUÉ NO HAY PRECIO POR METRO CUADRADO.
 *
 * Se calculó y se descartó. Dos razones independientes, y cualquiera de las
 * dos bastaría:
 *
 * 1. DOS ÁREAS ESTÁN MAL EN LA BASE, por un factor de mil. «Finca
 *    Agropecuaria» tiene `area_lot_m2 = 22` con un precio de $1.700 millones
 *    —una finca de 22 m²— y «Lote para proyecto» tiene 52,519 donde casi con
 *    seguridad son 52.519 m². Dan $77.272.727/m² y $18.659.914/m². Publicar
 *    una media contaminada por esos dos valores sería publicar basura con
 *    aspecto de dato.
 *
 * 2. AUNQUE ESTUVIERAN BIEN, el m² de lote no compara lo mismo entre tipos.
 *    En una casa urbana de 150 m² de lote el precio lo pone la construcción,
 *    no el suelo; en una finca de varias hectáreas, al revés. Un promedio que
 *    mezcle ambos no describe ningún mercado real.
 *
 * Además, diez de las treinta y cinco fichas activas no tienen `area_lot_m2`,
 * así que el cálculo se haría sobre dos tercios del inventario.
 *
 * Se publicará cuando las áreas estén corregidas y separando suelo urbano de
 * suelo rural. Mientras tanto, la jerarquía de sustentación de §2 es clara:
 * ninguna cifra es mejor que una cifra frágil.
 */
export const PRECIO_POR_M2_PENDIENTE = true

// ─── Respuesta de la FAQ de precios, derivada ────────────────────────────────

/**
 * Texto de la FAQ «¿cuánto cuesta…?», construido desde el inventario.
 *
 * Sustituye a un bloque escrito a mano con cuatro cifras, de las cuales el
 * mínimo de lotes decía $85.000.000 cuando el lote más barato del catálogo
 * está en $150.000.000, y una fila entera nombraba «condominios campestres»,
 * un tipo retirado.
 *
 * PROBLEMA DE ÁMBITO, que derivar no resuelve solo. La tabla anterior se
 * presentaba como «referencia orientativa» de precios en La Vega, es decir,
 * como rango de MERCADO. Nunca lo fue, y hoy no hay forma de sustentarlo: lo
 * único medible es el catálogo propio. Si se derivan las cifras sin cambiar el
 * encabezado, el número queda correcto y la afirmación cambia de significado en
 * silencio — quien buscaba referencia de mercado recibe nuestro mínimo.
 *
 * Por eso el texto declara tres cosas que la versión anterior no declaraba:
 * que son precios de OFERTA, que son de NUESTRO catálogo, y con qué fecha de
 * corte. El comentario del código pedía esa fecha desde el principio.
 */
export async function respuestaPreciosCatalogo(): Promise<string> {
  const r = await rangosPrecioObservados()
  if (!r || r.porTipo.length === 0) {
    return 'El precio depende del tipo de inmueble, la vereda, el área y los servicios ' +
      'disponibles. Escríbenos y te pasamos las opciones que hay hoy en catálogo dentro de ' +
      'tu presupuesto.'
  }

  const cop = (n: number) => '$' + n.toLocaleString('es-CO')
  const suficientes = r.porTipo.filter(t => t.n >= MIN_OBSERVACIONES_RANGO)
  const escasos     = r.porTipo.filter(t => t.n <  MIN_OBSERVACIONES_RANGO)

  const filas = suficientes
    .map(t => `${t.clave} (n=${t.n}): de ${cop(t.min)} a ${cop(t.max)}, mediana ${cop(t.mediana)}`)
    .join('. ')

  // Los tipos con menos de MIN_OBSERVACIONES_RANGO se NOMBRAN pero no se
  // publican como rango: con dos o tres propiedades no hay rango, hay precios.
  const cola = escasos.length
    ? ` De ${escasos.map(t => `${t.clave} (${t.n})`).join(' y ')} hay muy pocas unidades ` +
      'publicadas como para dar un rango; los precios concretos están en cada ficha.'
    : ''

  return `Precios de NUESTRO CATÁLOGO ACTIVO, no promedios de mercado: ${filas}.${cola} ` +
    `Son precios de OFERTA de propiedades publicadas por Su Finca Raíz, no precios de ` +
    `cierre. Corte a ${r.corte}, sobre ${r.total} propiedades disponibles. El valor de un ` +
    `predio concreto depende de su vereda, su área, su acceso y sus servicios.`
}
