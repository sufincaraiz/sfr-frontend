/**
 * DATOS CANÓNICOS PARA MAC — derivados, no escritos en el prompt
 * =============================================================
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 *
 * El prompt de Mac tenía escrito a mano «clima cálido templado (22°C - 28°C,
 * ~1.200 msnm)». La ficha del municipio dice 18-26 °C y 1.230 msnm. Nadie lo
 * vio nunca: el prompt no se lee al lado de la ficha, y ningún build compara un
 * texto libre con una columna. **Mac llevaba meses dando un clima distinto al
 * que publica el sitio, al mismo cliente, sobre el mismo municipio.**
 *
 * Y a la pregunta «¿cuál es su horario de atención?» respondía «estoy
 * disponible 24/7» —que es cierto sobre Mac y no sobre el negocio— mientras el
 * sitio publica un horario de sede real desde `lib/horario.ts`.
 *
 * Es el mismo defecto que `TIPO_LINKS`, que la condición de municipio
 * publicable y que las nueve afirmaciones falsas del traspaso: **un dato
 * escrito a mano en un segundo sitio que nadie vuelve a comparar**. La solución
 * es la de siempre: lo que se puede derivar no se escribe.
 *
 * ---------------------------------------------------------------------------
 * Y POR QUÉ AQUÍ Y NO COMO REGLA
 *
 * La lección del buscador: una instrucción que viaja DENTRO del resultado de
 * una herramienta, en el punto de uso, se cumple; la misma como regla número N
 * del prompt, a cuatrocientas líneas del uso, no. Esto es lo mismo aplicado a
 * los datos: en vez de una regla que diga «no inventes el horario», el horario
 * ESTÁ, con su cifra, en el contexto de cada conversación.
 */

import { prisma } from '@/lib/prisma'
import { horarioEnProsa } from '@/lib/horario'
import { MEDICIONES } from '@/lib/medicion-distancia'

/**
 * Bloque de hechos verificables que se inyecta en el contexto de Mac. Sale de
 * las MISMAS fuentes que publica el sitio, así que no puede divergir de él.
 *
 * Falla en silencio: si la base no responde, Mac se queda sin el bloque —que es
 * lo que tenía hasta hoy— en vez de romper la conversación.
 */
export async function datosCanonicos(): Promise<string> {
  const lineas: string[] = []

  lineas.push(`Horario de atención de la sede: ${horarioEnProsa()}.`)
  lineas.push(
    'Tú estás disponible a toda hora, pero ESE es el horario del negocio. Si te ' +
    'preguntan por el horario, da el de la sede; no respondas solo «24/7», que ' +
    'es una respuesta sobre ti y no sobre lo que preguntan.',
  )

  try {
    const munis = await prisma.municipality.findMany({
      where: { oculto: false, altitud_msnm: { not: null } },
      select: { name: true, altitud_msnm: true, temp_min: true, temp_max: true, distancia_bogota_km: true, tiempo_bogota_min: true, slug: true },
      orderBy: { name: 'asc' },
    })
    if (munis.length) {
      lineas.push('')
      lineas.push('Datos de municipio (los MISMOS que publica la ficha del sitio — si dices otros, el cliente ve dos respuestas distintas del mismo negocio):')
      for (const m of munis) {
        const medido = MEDICIONES[m.slug]
        const dist = medido
          ? `${medido.km} km y ${medido.min} min desde ${medido.origen}, MEDIDO el ${medido.fecha}`
          : `${m.distancia_bogota_km ?? '?'} km y ${m.tiempo_bogota_min ?? '?'} min a Bogotá (estimación heredada, no medida: no la presentes como dato exacto)`
        lineas.push(
          `· ${m.name}: ${m.altitud_msnm} msnm, ${m.temp_min}-${m.temp_max} °C. ${dist}.`,
        )
      }
    }
  } catch (err) {
    console.warn('[Mac] datos canónicos de municipio no disponibles:', err instanceof Error ? err.message : err)
  }

  return `\n\n# Datos verificables (derivados de las mismas fuentes que el sitio)\n${lineas.join('\n')}`
}
