// ─────────────────────────────────────────────────────────────────────────────
// FAQ transversales del sitio, en un solo sitio.
//
// Vivian como constantes dentro de cada page.tsx, y Next no permite exportar
// valores arbitrarios desde un archivo de ruta: el modulo de una pagina solo
// puede exportar ,  y el resto de claves reservadas.
//
// Ademas de resolver eso, es donde deben estar: son DATOS, no presentacion, y
// el hub /preguntas-frecuentes los importa de aqui en vez de copiarlos. Dos
// copias de la misma respuesta son dos copias que pueden divergir, y aqui el
// riesgo es peor de lo habitual porque ambas irian dentro de un FAQPage.
// ─────────────────────────────────────────────────────────────────────────────

import { contrasteConMac } from '@/lib/horario'

export const FAQS_NOSOTROS = [
  {
    question: '¿Qué es una inmobiliaria inteligente?',
    answer: 'Una inmobiliaria inteligente integra inteligencia artificial y tecnología en sus procesos: atención automatizada 24/7, búsqueda con recomendaciones personalizadas, recorridos virtuales y visualización de proyectos. Su Finca Raíz opera bajo ese modelo en La Vega, Cundinamarca, y la Provincia del Gualivá.',
  },
  {
    question: '¿Quién es Mac?',
    answer: 'Mac es el agente de inteligencia artificial de Su Finca Raíz, experto en el mercado inmobiliario de La Vega y el Gualivá. Analiza tu necesidad, compara propiedades y responde en minutos, las 24 horas, los 7 días de la semana, en cualquier idioma.',
  },
  {
    question: '¿Puedo ver una finca sin viajar a La Vega?',
    answer: 'Sí. Nuestros recorridos virtuales 360° te permiten explorar las propiedades desde cualquier lugar del mundo, y Mac resuelve tus preguntas al instante.',
  },
  {
    question: '¿Su Finca Raíz atiende inversionistas extranjeros?',
    answer: 'Sí. Mac asesora en cualquier idioma y nuestro equipo acompaña todo el proceso legal y comercial para inversión extranjera en la región del Gualivá.',
  },
  {
    question: '¿Qué zonas cubre Su Finca Raíz?',
    answer: 'La Vega, Cundinamarca y toda la región del Gualivá: fincas, lotes urbanizados, casas campestres, condominios y proyectos de parcelación.',
  },
];



export const FAQS_MAC = [
  {
    question: '¿Mac es una persona o un sistema automatizado?',
    answer:
      'Mac es un sistema automatizado de inteligencia artificial, no una persona. Se identifica ' +
      'como tal desde el primer mensaje. La mayoría de las consultas se resuelven en la propia ' +
      'conversación; cuando hace falta criterio humano —una negociación, una visita, un caso ' +
      'jurídico particular— Mac deriva a un asesor de Su Finca Raíz, y el cliente también puede ' +
      'pedir ese paso en cualquier momento.',
  },
  {
    question: '¿En qué horario atiende Mac?',
    // El horario de la sede NO se escribe aquí: sale de HORARIO_SEDE, que es la
    // misma fuente del JSON-LD. Escribirlo a mano en cada sitio fue lo que
    // produjo tres horarios contradictorios en el sitio, ninguno de ellos real.
    answer:
      'Las 24 horas, todos los días, en el sitio web y por WhatsApp. ' +
      contrasteConMac() +
      ' Una consulta a las tres de la madrugada recibe respuesta; la visita al predio se ' +
      'agenda después con un asesor, dentro del horario de la sede.',
  },
  {
    question: '¿Qué puede hacer Mac exactamente?',
    answer:
      'Busca propiedades en el catálogo por tipo, municipio, presupuesto y características; ' +
      'da el detalle de un inmueble concreto; resume el portafolio disponible; responde ' +
      'preguntas sobre la región, los trámites y el proceso de compra; y registra los datos de ' +
      'contacto de quien quiere que lo llame un asesor. Consulta el inventario en tiempo real, ' +
      'así que no ofrece propiedades ya vendidas.',
  },
  {
    question: '¿Qué datos personales trata Mac y quién los guarda?',
    answer:
      'Mac guarda la conversación y, si el cliente los facilita, su nombre, teléfono y correo ' +
      'para que un asesor pueda devolverle el contacto. No pide ni necesita cédula, datos ' +
      'bancarios ni documentos. El tratamiento se rige por la política de tratamiento de datos ' +
      'de Su Finca Raíz, conforme a la Ley 1581 de 2012 de Habeas Data.',
  },
  {
    question: '¿Mac puede equivocarse?',
    answer:
      'Sí. Es un sistema automatizado y puede cometer errores de interpretación o dar una ' +
      'respuesta incompleta. Las cifras de precio, área y disponibilidad las lee del catálogo, ' +
      'pero ninguna respuesta de Mac constituye una oferta comercial vinculante ni asesoría ' +
      'jurídica: eso lo confirma siempre un asesor antes de cualquier negociación.',
  },
]


export const FAQS_GENERALES = [
  {
    question: '¿Qué documentos necesito para comprar una propiedad de forma segura?',
    answer:
      'Para una compra segura se requiere el Certificado de Tradición y Libertad reciente, ' +
      'las escrituras públicas, paz y salvos de impuestos y administración (si aplica), y un ' +
      'estudio de títulos realizado por un abogado independiente. En Su Finca Raíz validamos ' +
      'toda la documentación jurídica antes de ofrecer una propiedad.',
  },
];
