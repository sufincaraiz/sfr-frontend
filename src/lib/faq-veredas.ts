import { prisma } from '@/lib/prisma'
import type { VeredaData } from '@/lib/veredas-data'

// ─────────────────────────────────────────────────────────────────────────────
// FAQ de vereda derivadas de sus datos.
//
// SE AÑADEN A LAS ESCRITAS A MANO, NO LAS SUSTITUYEN. Es la diferencia con lo
// que se hizo en municipios y en el corredor, y la razón importa.
//
// Allí el texto a mano era «topografías fascinantes» y «perfecto para
// condominios de lujo»: adjetivos sin dato, que no dicen nada y que no se
// pueden verificar. Aquí el contenido a mano es conocimiento local real —qué
// variedades de café se dan en El Cural, si hay agua para riego en Cacahual,
// cuántos grados menos hace en Tabacal que en el parque de La Vega—. Eso es
// justamente el territorio hiperlocal donde el sitio no tiene competencia
// digital, y sustituirlo por plantillas sería cambiar contenido único por
// contenido que cualquiera puede generar.
//
// Los «ideal» que quedan en esas FAQ llevan el dato pegado: «ideal para café
// variedad Colombia y Castillo» es una afirmación agronómica discutible con un
// agrónomo, no un adjetivo de folleto. Un barrido por palabra clave los marca
// igual que a «fascinantes»; leerlos en contexto los separa.
//
// Lo que faltaba y sí se deriva: las cifras de distancia juntas en una sola
// respuesta, y el inventario EN PRESENTE, que no aparecía en ninguna FAQ y es
// la única cifra de esta familia que no envejece mal (§2, regla de tiempo
// verbal).
// ─────────────────────────────────────────────────────────────────────────────

export interface FaqItem { pregunta: string; respuesta: string }

/** Propiedades disponibles en el municipio de la vereda. */
async function disponiblesEnMunicipio(slug: string): Promise<number> {
  try {
    return await prisma.property.count({
      where: { status: 'available', municipality: { slug } },
    })
  } catch (err) {
    console.warn('[faq-veredas] BD no disponible:', err instanceof Error ? err.message : err)
    return 0
  }
}

function minutosATexto(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0)  return `${m} minutos`
  if (m === 0)  return `${h} ${h === 1 ? 'hora' : 'horas'}`
  return `${h} ${h === 1 ? 'hora' : 'horas'} y ${m} minutos`
}

export async function faqsDeVereda(v: VeredaData): Promise<FaqItem[]> {
  const disponibles = await disponiblesEnMunicipio(v.municipio_slug)

  const faqs: FaqItem[] = [
    {
      pregunta: `¿A qué distancia está la vereda ${v.name} de Bogotá y del casco urbano de ${v.municipio_name}?`,
      respuesta:
        `La vereda ${v.name} está a ${minutosATexto(v.distancia_bogota_min)} de Bogotá y a ` +
        `${minutosATexto(v.distancia_pueblo_min)} del casco urbano de ${v.municipio_name}. ` +
        `Se encuentra a ${v.altitud_msnm.toLocaleString('es-CO')} msnm, con temperaturas de ` +
        `${v.temperatura_c.min} a ${v.temperatura_c.max} °C.`,
    },
  ]

  // El inventario va en PRESENTE y del municipio, no de la vereda: el catálogo
  // no está desglosado a ese nivel y decir «N propiedades en la vereda» sería
  // una precisión que el dato no tiene. Sin inventario NO se dice «0», se dice
  // lo que sigue siendo cierto (§1.3).
  faqs.push({
    pregunta: `¿Hay fincas o lotes en venta cerca de la vereda ${v.name}?`,
    respuesta: disponibles > 0
      ? `Su Finca Raíz publica hoy ${disponibles} propiedad${disponibles === 1 ? '' : 'es'} ` +
        `disponible${disponibles === 1 ? '' : 's'} en ${v.municipio_name}, el municipio al que ` +
        `pertenece la vereda ${v.name}. El inventario cambia de forma continua y se puede ` +
        'consultar filtrado por municipio en el catálogo del sitio.'
      : `Su Finca Raíz capta inmuebles en ${v.municipio_name}, el municipio al que pertenece ` +
        `la vereda ${v.name}, dentro de los doce de la Provincia del Gualivá que cubre. En ` +
        'este momento no hay publicaciones activas en ese municipio, y la búsqueda de un ' +
        'predio concreto se puede encargar directamente.',
  })

  return faqs
}
