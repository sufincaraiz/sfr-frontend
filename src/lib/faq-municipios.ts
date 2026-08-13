import { prisma } from '@/lib/prisma'
import { getMunicipiosConDatos, type MunicipioDatos } from '@/lib/cobertura'
import { DATOS_OFICIALES } from '@/lib/datos-oficiales'

// ─────────────────────────────────────────────────────────────────────────────
// FAQ de municipios, generadas desde sus datos reales.
//
// POR QUÉ EXISTE. Las FAQ de la guía de inversión decían cosas como «Sasaima
// cuenta con topografías fascinantes», «San Francisco ofrece climas templados y
// terrenos vírgenes» o «Villeta es perfecto para condominios de lujo y turismo
// de alto nivel». Tres problemas a la vez:
//
//   1. §3, registro de escritura: afirmaciones falsables, no adjetivos. «Alta
//      rentabilidad» y «fascinante» no se pueden verificar ni desmentir, así que
//      no valen nada para un modelo que busca algo que citar.
//   2. Están dentro de un `FAQPage`, que es el marcado que MÁS se extrae. Un
//      adjetivo publicitario ahí no es un desliz de estilo: es lo que un motor
//      generativo se lleva como respuesta a «¿conviene invertir en Sasaima?».
//   3. §1.3: eran seis municipios escritos a mano, con el mismo problema de
//      desincronización que ya se corrigió en el bloque del corredor.
//
// Ahora cada respuesta lleva altitud, rango de temperatura, distancia y tiempo
// reales, más el inventario en presente si lo hay. Todo comprobable.
//
// LA PREGUNTA VARÍA POR MUNICIPIO A PROPÓSITO. La gente no formula igual dos
// veces, y seis preguntas idénticas cambiando el topónimo capturan una sola
// forma de consulta. La rotación es determinista —depende del índice— para que
// la FAQ de un municipio no cambie de redacción entre despliegues.
// ─────────────────────────────────────────────────────────────────────────────

const PLANTILLAS: readonly ((m: string) => string)[] = [
  (m: string) => `¿Por qué invertir en finca raíz en ${m}, Cundinamarca?`,
  (m: string) => `¿Conviene comprar finca o lote en ${m} para inversión?`,
  (m: string) => `¿Qué oportunidades de inversión hay en ${m}, Cundinamarca?`,
  (m: string) => `¿Vale la pena invertir en ${m}, Cundinamarca?`,
]

export interface FaqItem { question: string; answer: string }

/** Inventario activo por slug de municipio. */
async function inventarioPorMunicipio(): Promise<Map<string, number>> {
  try {
    const rows = await prisma.municipality.findMany({
      select: { slug: true, _count: { select: { properties: { where: { status: 'available' } } } } },
    })
    return new Map(rows.map(r => [r.slug, r._count.properties]))
  } catch (err) {
    console.warn('[faq-municipios] BD no disponible:', err instanceof Error ? err.message : err)
    return new Map()
  }
}

function respuesta(m: MunicipioDatos, disponibles: number): string {
  // Sin «1 h 0 min»: cuando los minutos son exactos se dice «1 hora», y en
  // singular cuando corresponde. Una cifra bien formada se lee como un dato; una
  // mal formada delata que el texto se generó sin mirarlo.
  const h   = Math.floor(m.tiempo_bogota_min / 60)
  const min = m.tiempo_bogota_min % 60
  const horas =
    h === 0   ? `${min} minutos`
    : min === 0 ? `${h} ${h === 1 ? 'hora' : 'horas'}`
    : `${h} ${h === 1 ? 'hora' : 'horas'} y ${min} minutos`

  const base =
    `${m.name} está a ${m.distancia_bogota_km} km de Bogotá —unos ${horas} por carretera—, ` +
    `a ${m.altitud_msnm.toLocaleString('es-CO')} msnm, con temperaturas de ${m.temp_min} a ` +
    `${m.temp_max} °C.`

  // El inventario va en PRESENTE (§2, regla de tiempo verbal): describe un
  // estado comprobable ahora mismo abriendo el catálogo. Si no hay, no se dice
  // «0 propiedades»: se dice lo que sigue siendo cierto, que es la cobertura.
  const stock = disponibles > 0
    ? ` Su Finca Raíz publica hoy ${disponibles} propiedad${disponibles === 1 ? '' : 'es'} ` +
      `disponible${disponibles === 1 ? '' : 's'} en el municipio`
    : ` Su Finca Raíz capta inmuebles en ${m.name} aunque hoy no tenga publicaciones activas allí`

  return (
    base + stock +
    `, dentro de los ${DATOS_OFICIALES.municipiosProvincia} municipios de la Provincia del ` +
    'Gualivá que cubre, e incluye estudio de títulos y verificación de uso del suelo, acceso ' +
    'y agua en cada negociación.'
  )
}

/**
 * FAQ de los municipios con página publicada, en el mismo orden que el bloque
 * del corredor para que la página se lea coherente.
 */
export async function faqsDeMunicipios(): Promise<FaqItem[]> {
  const [municipios, stock] = await Promise.all([
    getMunicipiosConDatos(),
    inventarioPorMunicipio(),
  ])

  return municipios.map((m, i) => {
    const plantilla = PLANTILLAS[i % PLANTILLAS.length] ?? PLANTILLAS[0]!
    return {
      question: plantilla(m.name),
      answer:   respuesta(m, stock.get(m.slug) ?? 0),
    }
  })
}
