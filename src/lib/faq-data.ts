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
    question: '¿Qué servicios ofrece Su Finca Raíz como Centro de Negocios Inmobiliarios?',
    answer:
      'Su Finca Raíz opera como el centro de negocios inmobiliarios más completo de la región ' +
      'del Gualivá. Nuestros servicios incluyen: (1) Compra y venta de fincas, lotes, casas ' +
      'campestres y condominios; (2) Tours virtuales 360° e inspección aérea con drones para ' +
      'compradores remotos; (3) Estudio de títulos y certificado de tradición y libertad ' +
      'incluido en cada negociación; (4) Asesoría notarial y acompañamiento en promesas de ' +
      'compraventa; (5) Avalúo técnico de propiedades rurales y campestres; (6) Gestión de ' +
      'proyectos de construcción campestre para inversionistas. Todo esto bajo un modelo de ' +
      'asesoría personalizada: un agente exclusivo por cliente desde la búsqueda hasta la ' +
      'escrituración.',
  },
  {
    question: '¿Cómo garantiza Su Finca Raíz la seguridad legal al comprar una propiedad?',
    answer:
      'Garantizamos seguridad jurídica en cada transacción mediante un proceso de tres capas. ' +
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
      'campestres con amenidades desde $320.000.000 COP. Para un avalúo personalizado o el ' +
      'listado completo de propiedades disponibles filtrado por tu presupuesto, contáctanos ' +
      'por WhatsApp al +57 321 882 6730.',
  },
]
