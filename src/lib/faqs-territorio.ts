/**
 * FAQ DE TERRITORIO — huecos de alta intención, PENDIENTES DE DATOS
 * =================================================================
 *
 * Las dos auditorías externas del 18/08/2026 (Gemini y ChatGPT) coincidieron en
 * estos cinco huecos, y coinciden con lo que un comprador pregunta de verdad
 * antes de firmar. Ninguna se puede responder desde el catálogo: exigen
 * conocimiento del territorio que solo tiene el titular.
 *
 * ⚠ NO SE EXPORTAN AL HUB HASTA QUE TENGAN RESPUESTA. Publicar una FAQPage con
 * respuestas a medias es peor que no tenerla: el marcado promete una respuesta
 * que la página no da, y es la clase de cosa que un modelo cita mal.
 *
 * Al rellenarlas, dos reglas que ya gobiernan el resto del sitio:
 *
 *   · Sin verbos de GASTO —«incluye», «sin costo»— ni de RESULTADO
 *     —«garantizamos», «verificamos», «validamos»—. Solo acompañamiento y
 *     orientación. Ver el reencuadre de §4 del traspaso.
 *   · Toda cifra, con su fuente. Las tarifas normativas (notariales 0,27 %,
 *     registro 1 %) SÍ son citables: son ley, no rendimiento.
 */

export interface FaqPendiente {
  id: string
  pregunta: string
  /** Qué tiene que cubrir la respuesta. No es la respuesta. */
  guion: string[]
  /** Qué dato falta y quién lo tiene. */
  falta: string
}

export const FAQS_TERRITORIO_PENDIENTES: readonly FaqPendiente[] = [
  {
    id: 'agua',
    pregunta: '¿Cómo funciona el acceso al agua en una finca de La Vega?',
    guion: [
      'Las tres figuras y en qué se diferencian: acueducto veredal, concesión de aguas ante la CAR, y nacedero o aljibe propio.',
      'Qué documento acredita cada una y a quién se le pide.',
      'Qué pasa si el predio no tiene ninguna de las tres.',
      'Si la concesión se transfiere con la venta o hay que tramitarla de nuevo.',
    ],
    // TODO(titular): confirmar cómo opera cada acueducto veredal de La Vega y
    // qué cuota de afiliación manejan. Sin eso la respuesta sale genérica y no
    // aporta nada sobre lo que ya dice cualquier página nacional.
    falta: 'Funcionamiento real de los acueductos veredales de La Vega y su cuota.',
  },
  {
    id: 'pot-subdivision',
    pregunta: '¿Qué permite el EOT de La Vega para subdividir un lote rural?',
    guion: [
      'Área mínima de subdivisión en suelo rural y en suburbano, según el EOT vigente.',
      'Diferencia entre subdividir y parcelar, y qué licencia exige cada una.',
      'Ante quién se tramita: Planeación municipal o curaduría.',
      'Qué NO se puede hacer, que es lo que más caro sale descubrir tarde.',
    ],
    // TODO(titular): el EOT vigente de La Vega y su año. Las cifras de área
    // mínima son normativas y verificables, pero hay que citar el acuerdo
    // municipal concreto, no un número suelto.
    falta: 'Número y año del acuerdo del EOT vigente, y las áreas mínimas que fija.',
  },
  {
    id: 'internet',
    pregunta: '¿Hay internet en las veredas de La Vega?',
    guion: [
      'Qué veredas tienen fibra óptica y cuáles dependen de satelital o de red móvil.',
      'Qué operadores llegan de verdad, no los que dicen cobertura en el mapa.',
      'Rangos de velocidad reales y qué se puede hacer con ellos (teletrabajo, videollamada).',
      'Sin nombrar operador como recomendación: describir la cobertura, no vender un servicio.',
    ],
    // TODO(titular): cobertura por vereda. Es el dato que más se pregunta desde
    // la pandemia y ninguna inmobiliaria de la zona lo publica.
    falta: 'Cobertura real por vereda y operadores que efectivamente prestan.',
  },
  {
    id: 'peajes-acceso',
    pregunta: '¿Cuántos peajes hay de Bogotá a La Vega y qué vehículo se necesita?',
    guion: [
      'Número de peajes por la ruta habitual y tarifa de categoría I, con fecha de la tarifa.',
      'Rutas alternativas si las hay.',
      'Cuándo hace falta 4x4 de verdad: no para llegar al municipio, sino para entrar a ciertos predios.',
      'Enlazar con la terminología de acceso que ya usan las fichas: pavimentado, carreteable, destapado.',
    ],
    // TODO(titular): confirmar número de peajes y tarifa vigente con su fecha.
    // Una tarifa sin fecha de corte envejece y contamina el resto (§2).
    falta: 'Peajes de la ruta y tarifa vigente con su fecha de corte.',
  },
  {
    id: 'costos-escrituracion',
    pregunta: '¿Cuánto cuesta escriturar una finca en Cundinamarca?',
    guion: [
      'Los cuatro conceptos por separado: derechos notariales, impuesto de registro, retención en la fuente y beneficencia si aplica.',
      'Qué porcentaje es cada uno y sobre qué base se calcula.',
      'Quién paga qué entre comprador y vendedor por costumbre, aclarando que es negociable.',
      'Un ejemplo con una cifra redonda, marcado como ejemplo y no como cotización.',
      'Estas tarifas SÍ son citables: son normativas, no proyecciones. Ya están en el glosario.',
    ],
    // TODO(titular): confirmar que los porcentajes del glosario siguen vigentes
    // en 2026 y fijar la fecha de corte.
    falta: 'Vigencia 2026 de las tarifas del glosario y su fecha de corte.',
  },
] as const
