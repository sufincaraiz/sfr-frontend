// El año NO se escribe a mano (doctrina §7): los modelos descartan agresivamente
// lo que se autodeclara viejo, y una página que dice «2025» en agosto de 2026 se
// está autodescartando. Se calcula al construir, así que la revalidación horaria
// de la portada lo mantiene al día sin que nadie se acuerde en enero.
const ANIO = new Date().getFullYear()

export const HOME_FAQS = [
  {
    question: `¿Por qué invertir en La Vega, Cundinamarca en ${ANIO}?`,
    // ⚠ AQUÍ ESTABA LA CIFRA MÁS EXPUESTA DEL SITIO: «valorización anual
    // promedio del 18 %», dentro del FAQPage de la PORTADA. Si un modelo cita a
    // Su Finca Raíz sobre valorización, cita ese número — y no tenía fuente,
    // metodología ni fecha de corte. Se retira hasta tenerlas.
    //
    // Lo que queda son los factores, que sí se sostienen: la doble calzada
    // existe, los tiempos se miden, los servicios se comprueban. Describir por
    // qué sube el valor es defendible; decir cuánto sube, sin fuente, no.
    //
    // Cayó también «invertir aquí hoy equivale a lo que fue invertir en el
    // Oriente Antioqueño hace 15 años»: es una promesa de rendimiento por
    // analogía —la peor clase, porque no se puede ni verificar ni desmentir— y
    // además nombraba justo la región de la inmobiliaria homónima (§1.4).
    answer:
      'La Vega y la Provincia del Gualivá concentran demanda de vivienda campestre por tres ' +
      // Sin cifra exacta: es una FAQ general, no una ficha técnica. El dato
      // preciso —60 km y 1 h 14 min desde Portal 80— vive en el bloque de datos
      // de La Vega con su metodología. Decía «por debajo de los 90 minutos»,
      // que además quedó desmentido por la medición del 19/08/2026.
      'factores comprobables: la doble calzada Bogotá-La Vega, que deja el desplazamiento en ' +
      'algo más de una hora desde el occidente de Bogotá; el crecimiento del turismo campestre ' +
      'en la región; y la ' +
      'disponibilidad limitada de lotes con servicios públicos completos. La zona combina clima ' +
      'templado, agua potable, energía eléctrica y conectividad, condiciones que la sitúan entre ' +
      'las opciones habituales de las familias bogotanas que buscan segunda vivienda o retiro. ' +
      'Cuánto se valorice un predio concreto depende de su ubicación, su estado jurídico y las ' +
      'condiciones del mercado.',
  },
  {
    // Esta respuesta va dentro del FAQPage de la portada, o sea que es MARCADO.
    // Declaraba seis servicios y solo el primero tiene página que lo sustente,
    // que es justo lo que la doctrina §1.1 no permite en el marcado.
    //
    // Cayeron además dos cosas: «el más completo de la región», un superlativo
    // sin forma de sustentarse, de la misma familia que el «98 %» retirado; y
    // «Avalúo técnico», que nombra una actividad regulada por la Ley 1673 de
    // 2013 y reservada a inscritos en el RAA.
    //
    // Los servicios reales que aún no tienen página se nombran en prosa, sin
    // numerar y sin presentarlos como catálogo: es la diferencia entre decir
    // qué se hace y declarar una oferta.
    question: '¿Qué servicios ofrece Su Finca Raíz como Centro de Negocios Inmobiliarios?',
    answer:
      'Su Finca Raíz es un centro de negocios inmobiliarios impulsado por inteligencia ' +
      'artificial en La Vega y la Provincia del Gualivá, Cundinamarca. Su servicio principal ' +
      'es la compra y venta de fincas, lotes, casas campestres, condominios y apartamentos, ' +
      'con recorridos virtuales 360° y tomas aéreas de cada predio para compradores remotos. ' +
      'En cada negociación acompaña al comprador en la revisión de títulos y del certificado ' +
      'de tradición y libertad, y lo acompaña en la notaría durante la promesa de compraventa y ' +
      'la escrituración. La empresa ' +
      'también realiza estudios de mercado del predio y gestiona proyectos de construcción ' +
      'campestre en consorcio con Conarc. Un agente acompaña al cliente desde la búsqueda ' +
      'hasta la escrituración.',
  },
  {
    // La pregunta también decía «¿Cómo garantiza…?». Corregir solo la respuesta
    // habría dejado la garantía enunciada en el campo `name` del FAQPage, que es
    // justo el que un motor extrae como titular de la respuesta.
    // La pregunta también afirmaba el alcance: «antes de ofrecerla».
    question: '¿Cómo acompaña Su Finca Raíz la revisión legal de una propiedad?',
    answer:
      // «Garantizamos seguridad jurídica» → lo que se hace de verdad. Estaba
      // dentro del FAQPage de la portada, o sea en el marcado que más se
      // extrae, y una garantía enunciada obliga a cumplirla (Ley 1480 de 2011).
      // El proceso de tres capas es real y verificable; la garantía de
      // resultado no lo era. Describirlo es más fuerte que prometerlo.
      // Decía «aplica un proceso de verificación de tres capas ANTES de ofrecer
      // una propiedad», con «solicitamos y revisamos […] confirmando que el
      // predio no tiene embargos». Mismo defecto de ALCANCE que faqs.ts: el
      // proceso no corre sobre el catálogo al captarlo, corre sobre la propiedad
      // de un negocio en curso. Y «confirmando que no tiene» es un estado del
      // mundo, no una actividad.
      'Cuando avanzas en la compra de un inmueble, Su Finca Raíz te acompaña en tres ' +
      'frentes. ' +
      'Primero, la documentación: te orientamos sobre cómo pedir el certificado de ' +
      'tradición y libertad actualizado en la Superintendencia de Notariado y qué mirar en él ' +
      '—embargos, hipotecas, litigios activos—. Segunda capa — estudio de ' +
      'títulos profesional: te orientamos sobre por qué conviene que un abogado especialista en ' +
      'derecho inmobiliario revise la cadena de propietarios de los últimos 20 años, y sobre qué ' +
      'debe cubrir esa revisión. Tercera capa — acompañamiento notarial: estamos con el comprador ' +
      'y el vendedor en la notaría y les señalamos qué mirar en la minuta de compraventa y en la ' +
      'liquidación de impuestos. En Su Finca Raíz no te dejamos solo en ese proceso: te decimos ' +
      'qué pedir, qué revisar y en qué orden.',
  },
  {
    // ⚠ RESPUESTA DERIVADA. El texto ya no vive aquí: lo construye
    // `respuestaPreciosCatalogo()` desde el inventario. La versión escrita a
    // mano decía «lotes desde $85.000.000» con el lote más barato en
    // $150.000.000, y una fila entera hablaba de «condominios campestres», un
    // tipo retirado. Ver rangos-precio.ts para el problema de ÁMBITO.
    question: '¿Cuánto cuesta una finca o lote campestre en La Vega, Cundinamarca?',
    answer: '',
    derivada: 'precios',
  },
]

/**
 * HOME_FAQS con las respuestas DERIVADAS ya resueltas.
 *
 * `HOME_FAQS` sigue siendo un array estático porque lo consumen componentes de
 * cliente; las entradas marcadas con `derivada` llevan la respuesta vacía y se
 * rellenan aquí, en servidor. Publicar una FAQPage con una respuesta vacía
 * sería prometer contenido que la página no da, así que la entrada se OMITE si
 * la derivación falla.
 */
export async function homeFaqsResueltas(): Promise<{ question: string; answer: string }[]> {
  const { respuestaPreciosCatalogo } = await import('@/lib/rangos-precio')

  const resueltas = await Promise.all(
    HOME_FAQS.map(async f => {
      if (!('derivada' in f) || !f.derivada) return f
      if (f.derivada === 'precios') {
        const answer = await respuestaPreciosCatalogo().catch(() => '')
        return { ...f, answer }
      }
      return f
    }),
  )
  return resueltas.filter(f => f.answer.trim().length > 0)
}
