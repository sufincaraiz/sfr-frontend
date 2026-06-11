export interface GlosarioTerm {
  term: string
  slug: string
  category: 'documentos' | 'tramites' | 'impuestos' | 'tipos-propiedad' | 'geografia' | 'valuacion' | 'normativa'
  definition: string
  also_known_as?: string[]
}

export const GLOSARIO_TERMS: GlosarioTerm[] = [
  {
    term: 'Certificado de Tradición y Libertad',
    slug: 'certificado-de-tradicion-y-libertad',
    category: 'documentos',
    also_known_as: ['Certificado de libertad', 'CTL'],
    definition:
      'Documento oficial expedido por la Superintendencia de Notariado y Registro de Colombia ' +
      'que registra el historial completo de propietarios de un inmueble, incluyendo hipotecas, ' +
      'embargos, litigios, servidumbres y limitaciones al dominio. Es el documento más importante ' +
      'para verificar la situación legal de una propiedad antes de comprar. Debe tener máximo ' +
      '30 días de expedición al momento de la escrituración. Se solicita en línea a través de la ' +
      'Ventanilla Única de Registro (VUR) del Ministerio de Justicia.',
  },
  {
    term: 'Folio de Matrícula Inmobiliaria',
    slug: 'folio-de-matricula-inmobiliaria',
    category: 'documentos',
    also_known_as: ['Matrícula inmobiliaria', 'FMI'],
    definition:
      'Número único asignado por la Oficina de Registro de Instrumentos Públicos a cada inmueble ' +
      'en Colombia. Es el identificador oficial del predio y permite rastrear su historia jurídica. ' +
      'Con el Folio de Matrícula Inmobiliaria se puede solicitar el Certificado de Tradición y ' +
      'Libertad. Ejemplo: 276-12345 (donde 276 es el código de la Oficina de Registro de La Vega).',
  },
  {
    term: 'Escritura Pública',
    slug: 'escritura-publica',
    category: 'tramites',
    definition:
      'Documento legal autenticado por un Notario que formaliza la transferencia de propiedad de ' +
      'un inmueble en Colombia. Debe ser otorgado por comprador y vendedor ante Notaría y ' +
      'posteriormente inscrito en la Oficina de Registro de Instrumentos Públicos para que ' +
      'produzca efectos legales frente a terceros. Solo con la escritura inscrita se transfiere ' +
      'legalmente la propiedad del inmueble.',
  },
  {
    term: 'Promesa de Compraventa',
    slug: 'promesa-de-compraventa',
    category: 'tramites',
    also_known_as: ['Promesa', 'Contrato de promesa'],
    definition:
      'Contrato privado entre comprador y vendedor que establece el compromiso de celebrar la ' +
      'escritura pública de compraventa en una fecha determinada. Debe incluir: precio total y ' +
      'forma de pago, fecha máxima de escrituración, descripción exacta del inmueble, condiciones ' +
      'suspensivas (si hay financiación) y el pago de arras. No transfiere la propiedad pero es ' +
      'jurídicamente vinculante para ambas partes.',
  },
  {
    term: 'Arras',
    slug: 'arras',
    category: 'tramites',
    also_known_as: ['Depósito de seriedad', 'Señal'],
    definition:
      'Anticipo pagado por el comprador al momento de firmar la Promesa de Compraventa, ' +
      'generalmente equivalente al 10% del precio total del inmueble. Si el comprador desiste ' +
      'injustificadamente pierde las arras. Si el vendedor desiste, debe devolver el doble de ' +
      'lo recibido. Las arras no son el enganche ni el primer pago; son una garantía de seriedad.',
  },
  {
    term: 'Estudio de Títulos',
    slug: 'estudio-de-titulos',
    category: 'tramites',
    definition:
      'Análisis legal realizado por un abogado especialista en derecho inmobiliario que revisa la ' +
      'cadena de propietarios del inmueble durante mínimo los últimos 20 años, verificando que no ' +
      'existan vicios de nulidad, conflictos de linderos, hipotecas ocultas o problemas de ' +
      'titularidad. Costo aproximado en Cundinamarca: $800.000 a $1.500.000 COP. Es la inversión ' +
      'más importante del proceso de compra de finca raíz rural.',
  },
  {
    term: 'Retención en la Fuente Inmobiliaria',
    slug: 'retencion-en-la-fuente',
    category: 'impuestos',
    also_known_as: ['Retención DIAN inmuebles'],
    definition:
      'Impuesto del 1% sobre el valor declarado en la escritura de compraventa, retenido por el ' +
      'comprador y consignado directamente a la DIAN dentro de los dos meses siguientes a la ' +
      'escrituración. Es responsabilidad del comprador retenerlo y declararlo. Existen exenciones ' +
      'para vivienda de interés social (VIS).',
  },
  {
    term: 'Impuesto de Registro',
    slug: 'impuesto-de-registro',
    category: 'impuestos',
    definition:
      'Tributo departamental del 1% sobre el valor de la escritura que se paga a la Gobernación ' +
      'de Cundinamarca para registrar la escritura en la Oficina de Registro de Instrumentos ' +
      'Públicos. Sin este pago la transferencia no queda legalmente registrada. Se liquida en la ' +
      'ventanilla de la Oficina de Registro junto con los derechos notariales.',
  },
  {
    term: 'Derechos Notariales',
    slug: 'derechos-notariales',
    category: 'impuestos',
    definition:
      'Honorarios cobrados por la Notaría por elevar el contrato de compraventa a escritura pública. ' +
      'En Colombia están regulados por la Superintendencia de Notariado y corresponden al 0,27% del ' +
      'valor declarado en la escritura. Se divide entre comprador (mitad) y vendedor (mitad). ' +
      'En una propiedad de $500 millones equivalen aproximadamente a $1.350.000 por cada parte.',
  },
  {
    term: 'Avalúo Catastral',
    slug: 'avaluo-catastral',
    category: 'valuacion',
    definition:
      'Valor asignado a un inmueble por el Instituto Geográfico Agustín Codazzi (IGAC) o la ' +
      'entidad catastral municipal, utilizado como base de liquidación del impuesto predial. ' +
      'Generalmente representa entre el 40% y el 70% del valor comercial real del inmueble. ' +
      'No debe confundirse con el avalúo comercial, que refleja el precio de mercado.',
  },
  {
    term: 'Paz y Salvo',
    slug: 'paz-y-salvo',
    category: 'documentos',
    definition:
      'Certificado expedido por la alcaldía municipal (paz y salvo de predial) o empresa de ' +
      'servicios públicos que confirma que el inmueble está al día en todos sus pagos. Es ' +
      'requisito obligatorio para escriturar en Colombia. Debe tener máximo 30 días de ' +
      'expedición al momento de la compraventa.',
  },
  {
    term: 'POT — Plan de Ordenamiento Territorial',
    slug: 'plan-de-ordenamiento-territorial',
    category: 'normativa',
    also_known_as: ['POT', 'Plan de ordenamiento'],
    definition:
      'Instrumento de planeación municipal que define el uso del suelo en cada zona: urbano, rural, ' +
      'suburbano, de expansión, de protección ambiental o de riesgo. Determina qué se puede ' +
      'construir en cada lote o finca. Es obligatorio consultarlo en la Secretaría de Planeación ' +
      'del municipio antes de comprar cualquier predio con intención de construir o desarrollar. ' +
      'En La Vega, por ejemplo, las veredas cerca al río Dulce tienen restricciones de construcción ' +
      'por riesgo de inundación.',
  },
  {
    term: 'Finca de Recreo',
    slug: 'finca-de-recreo',
    category: 'tipos-propiedad',
    definition:
      'Propiedad rural colombiana destinada principalmente al descanso y el esparcimiento familiar. ' +
      'Generalmente incluye casa de habitación, piscina, zonas verdes y jardines. A diferencia de ' +
      'la finca productiva, no tiene actividad agropecuaria significativa. Es el tipo de inmueble ' +
      'más demandado en La Vega, Sasaima y el Gualivá, Cundinamarca. Los precios en La Vega ' +
      'oscilan entre $280 millones y $2.500 millones COP según tamaño y vereda.',
  },
  {
    term: 'Finca Productiva',
    slug: 'finca-productiva',
    category: 'tipos-propiedad',
    definition:
      'Predio rural con actividad agropecuaria activa: cultivos de café, frutales, ganadería, ' +
      'piscicultura o agroturismo. Genera ingresos operativos además de su valorización como ' +
      'bien inmueble. Requiere mayor extensión (desde 1 hasta 50 hectáreas) e infraestructura ' +
      'de trabajo: establos, bodegas, sistemas de riego, acceso a fuentes de agua permanentes. ' +
      'En la Provincia del Gualivá son comunes las fincas cafeteras y fruticultoras.',
  },
  {
    term: 'Condominio Campestre',
    slug: 'condominio-campestre',
    category: 'tipos-propiedad',
    definition:
      'Desarrollo inmobiliario rural que combina casas o lotes privados con zonas comunes ' +
      'compartidas: piscina, zona BBQ, cancha de fútbol, jardines y vigilancia 24/7. Ofrecen ' +
      'mayor seguridad y amenidades que las fincas individuales. Son los inmuebles con mayor ' +
      'liquidez y demanda entre compradores bogotanos en La Vega. Los precios empiezan desde ' +
      '$280 millones COP para casas de 80 m² construidos.',
  },
  {
    term: 'Vereda',
    slug: 'vereda',
    category: 'geografia',
    definition:
      'División territorial rural colombiana equivalente al barrio en el área urbana. Es la ' +
      'unidad geográfica más pequeña reconocida por el Estado para la administración del campo. ' +
      'Cada municipio tiene entre 5 y 40 veredas con características propias de clima, altitud, ' +
      'accesibilidad y vocación productiva. En La Vega las veredas más conocidas son Bulucaima, ' +
      'Guarumal, San Juan, La Alianza, El Cural y Tabacal.',
  },
  {
    term: 'Valorización Predial',
    slug: 'valorizacion-predial',
    category: 'valuacion',
    also_known_as: ['Contribución de valorización', 'Valorización'],
    definition:
      'Contribución económica obligatoria que cobran los municipios a los propietarios de ' +
      'inmuebles que se benefician de obras públicas de infraestructura (vías, parques, ' +
      'alcantarillado). Se diferencia del impuesto predial en que es de pago único o por ' +
      'cuotas específicas. No debe confundirse con la valorización del mercado inmobiliario ' +
      '(apreciación del precio de la propiedad), que en La Vega es del 18% anual promedio.',
  },
  {
    term: 'Escrituración',
    slug: 'escrituracion',
    category: 'tramites',
    definition:
      'Proceso de elevar el contrato de compraventa a escritura pública ante Notaría e ' +
      'inscribirla en la Oficina de Registro de Instrumentos Públicos. Es el paso que ' +
      'formaliza y perfecciona legalmente la transferencia de propiedad de un inmueble en ' +
      'Colombia. Incluye el pago de retención en la fuente, impuesto de registro y derechos ' +
      'notariales. El proceso completo toma entre 3 y 10 días hábiles.',
  },
  {
    term: 'Catastro',
    slug: 'catastro',
    category: 'valuacion',
    also_known_as: ['Catastro inmobiliario', 'IGAC'],
    definition:
      'Inventario oficial del Estado que describe e identifica todos los inmuebles del ' +
      'territorio colombiano con sus características físicas, económicas y jurídicas. ' +
      'Administrado por el Instituto Geográfico Agustín Codazzi (IGAC) a nivel nacional. ' +
      'El catastro asigna a cada predio su avalúo catastral, base del impuesto predial. ' +
      'Actualmente Colombia adelanta la "Catastro Multipropósito" para modernizar el sistema.',
  },
  {
    term: 'Plusvalía Inmobiliaria',
    slug: 'plusvalia-inmobiliaria',
    category: 'normativa',
    also_known_as: ['Plusvalía', 'Participación en plusvalía'],
    definition:
      'Participación del municipio en el incremento del valor del suelo generado por decisiones ' +
      'urbanísticas: cambio de uso del suelo, aumento de edificabilidad o construcción de obras ' +
      'públicas. En Colombia, los municipios pueden cobrar hasta el 50% de dicha plusvalía cuando ' +
      'un terreno rural se incorpora al perímetro urbano o cuando se autoriza una densificación.',
  },
]

export const CATEGORY_LABELS: Record<GlosarioTerm['category'], string> = {
  'documentos':       'Documentos',
  'tramites':         'Trámites',
  'impuestos':        'Impuestos y Costos',
  'tipos-propiedad':  'Tipos de Propiedad',
  'geografia':        'Geografía Rural',
  'valuacion':        'Valuación',
  'normativa':        'Normativa y Regulación',
}
