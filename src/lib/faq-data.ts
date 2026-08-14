// El año NO se escribe a mano (doctrina §7): los modelos descartan agresivamente
// lo que se autodeclara viejo, y una página que dice «2025» en agosto de 2026 se
// está autodescartando. Se calcula al construir, así que la revalidación horaria
// de la portada lo mantiene al día sin que nadie se acuerde en enero.
const ANIO = new Date().getFullYear()

export const HOME_FAQS = [
  {
    question: `¿Por qué invertir en La Vega, Cundinamarca en ${ANIO}?`,
    answer:
      'La Vega y la región del Gualivá registran una valorización anual promedio del 18 %, ' +
      'impulsada por tres factores concretos: la doble calzada Bogotá-La Vega que redujo el ' +
      'tiempo de desplazamiento a menos de 90 minutos, el auge del turismo campestre ' +
      'post-pandemia, y la escasez de lotes disponibles con servicios públicos completos. ' +
      'Invertir aquí hoy equivale a lo que fue invertir en el Oriente Antioqueño hace 15 años. ' +
      'La zona combina clima templado (18 °C promedio), agua potable, luz eléctrica y ' +
      'conectividad — condiciones que la convierten en la primera opción para familias ' +
      'bogotanas que buscan segunda vivienda o retiro.',
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
      'Cada negociación incluye estudio de títulos y certificado de tradición y libertad, y ' +
      'acompañamiento notarial en la promesa de compraventa y la escrituración. La empresa ' +
      'también realiza estudios de mercado del predio y gestiona proyectos de construcción ' +
      'campestre en consorcio con Conarc. Un agente acompaña al cliente desde la búsqueda ' +
      'hasta la escrituración.',
  },
  {
    // La pregunta también decía «¿Cómo garantiza…?». Corregir solo la respuesta
    // habría dejado la garantía enunciada en el campo `name` del FAQPage, que es
    // justo el que un motor extrae como titular de la respuesta.
    question: '¿Cómo verifica Su Finca Raíz la seguridad legal de una propiedad antes de ofrecerla?',
    answer:
      // «Garantizamos seguridad jurídica» → lo que se hace de verdad. Estaba
      // dentro del FAQPage de la portada, o sea en el marcado que más se
      // extrae, y una garantía enunciada obliga a cumplirla (Ley 1480 de 2011).
      // El proceso de tres capas es real y verificable; la garantía de
      // resultado no lo era. Describirlo es más fuerte que prometerlo.
      'Su Finca Raíz aplica un proceso de verificación jurídica de tres capas antes de ' +
      'ofrecer una propiedad. ' +
      'Primera capa — verificación documental: solicitamos y revisamos el certificado de ' +
      'tradición y libertad actualizado en la Superintendencia de Notariado, confirmando que ' +
      'el predio no tiene embargos, hipotecas ni litigios activos. Segunda capa — estudio de ' +
      'títulos profesional: un abogado especialista en derecho inmobiliario revisa la cadena ' +
      'de propietarios mínimo los últimos 20 años. Tercera capa — acompañamiento notarial: ' +
      'asistimos al comprador y vendedor en la notaría, revisamos la minuta de compraventa y ' +
      'verificamos el pago correcto de impuestos. Este proceso, que en otras inmobiliarias es ' +
      'un servicio adicional costoso, en Su Finca Raíz está incluido sin costo adicional.',
  },
  {
    question: '¿Cuánto cuesta una finca o lote campestre en La Vega, Cundinamarca?',
    answer:
      'Los precios en La Vega y el Gualivá varían según tipo de propiedad, ubicación y ' +
      // OJO: aquí NO se parametriza el año. Decir «actualizada para 2026» sería
      // afirmar que estos precios se revisaron en 2026, y no consta que se hayan
      // revisado desde que se escribieron. Cambiar 2025 por 2026 convertiría un
      // dato viejo en una falsedad sobre su propia vigencia, que es peor.
      // Pendiente: fijar una fecha de corte real y volver a declararla.
      'servicios disponibles. Como referencia orientativa: Lotes desde 500 m² con ' +
      'servicios públicos completos desde $85.000.000 COP. Casas campestres en condominio ' +
      'cerrado (80-120 m² construidos) desde $280.000.000 COP. Fincas productivas entre 1 y ' +
      '5 hectáreas con vía de acceso entre $350.000.000 y $900.000.000 COP. Condominios ' +
      // «avalúo personalizado» → «análisis comercial de valor»: la palabra
      // nombra una actividad regulada (Ley 1673 de 2013, inscripción en el RAA)
      // y ofrecerla sin inscripción es el problema, no describir el trabajo.
      'campestres con amenidades desde $320.000.000 COP. Para un análisis comercial de valor ' +
      'de tu predio o el ' +
      'listado completo de propiedades disponibles filtrado por tu presupuesto, contáctanos ' +
      'por WhatsApp al +57 321 882 6730.',
  },
]
