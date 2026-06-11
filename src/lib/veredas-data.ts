export interface VeredaData {
  slug: string
  name: string
  municipio_slug: string
  municipio_name: string
  distancia_pueblo_min: number
  distancia_bogota_min: number
  altitud_msnm: number
  temperatura_c: { min: number; max: number }
  acceso_vial: string
  descripcion_seo: string
  ventajas: string[]
  valorizacion: string
  clima: string
  og_image?: string
  geo_lat?: number
  geo_lng?: number
  faq: { pregunta: string; respuesta: string }[]
}

const VEREDAS: Record<string, VeredaData> = {

  'bulucaima': {
    slug: 'bulucaima',
    name: 'Bulucaima',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 8,
    distancia_bogota_min: 100,
    altitud_msnm: 1280,
    temperatura_c: { min: 17, max: 25 },
    acceso_vial: 'Vía pavimentada desde La Vega. Ingreso por la carretera principal a 6 km del casco urbano.',
    descripcion_seo:
      'Bulucaima es una de las veredas más reconocidas de La Vega, Cundinamarca, ' +
      'famosa por sus fincas de recreo, condominios campestres y paisajes de montaña. ' +
      'A 8 minutos del pueblo y 100 del norte de Bogotá, combina accesibilidad, ' +
      'naturaleza y una alta demanda inmobiliaria sostenida.',
    ventajas: [
      'Acceso por vía pavimentada en excelente estado',
      'Servicios públicos completos: agua, luz, internet fibra óptica',
      'Comunidad consolidada con vecinos permanentes y de fin de semana',
      'Múltiples colegios y supermercados a menos de 10 minutos',
      'Zona de alta valorización con demanda activa de compradores',
      'Paisaje de bosque andino con fuentes de agua permanentes',
    ],
    valorizacion:
      'Bulucaima registra una de las mayores tasas de valorización de finca raíz ' +
      'en el Gualivá, con incrementos promedio del 14 % anual en los últimos cuatro ' +
      'años. La consolidación de condominios campestres como Altos de Bulucaima y la ' +
      'llegada de compradores del norte de Bogotá han impulsado los precios de lotes ' +
      'de 1.000 m² por encima de los 180 millones de pesos. Las fincas de recreo con ' +
      'piscina y casa registran tiempos de venta inferiores a 45 días, reflejo de una ' +
      'demanda que supera ampliamente la oferta disponible.',
    clima:
      'La vereda Bulucaima goza de un microclima excepcional a 1.280 msnm, ' +
      'con temperaturas de 17 a 25 °C durante todo el año. Las tardes frescas, ' +
      'la humedad del bosque andino y la ausencia de vientos fuertes la convierten ' +
      'en la zona más confortable de La Vega para vivir de manera permanente. ' +
      'Las lluvias son moderadas y bien distribuidas, con fuentes de agua naturales ' +
      'activas en todas las temporadas.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9980,
    geo_lng: -74.3510,
    faq: [
      {
        pregunta: '¿Qué tan lejos está Bulucaima del casco urbano de La Vega?',
        respuesta: 'Bulucaima está a solo 8 minutos en automóvil del parque principal de La Vega, por vía pavimentada. Esto permite disfrutar de la tranquilidad del campo con acceso inmediato a todos los servicios del pueblo.',
      },
      {
        pregunta: '¿Hay servicios públicos disponibles en Bulucaima?',
        respuesta: 'Sí. La vereda cuenta con acueducto veredal, energía eléctrica permanente, y varios proveedores de internet por fibra óptica. La cobertura de agua es de las más estables de La Vega gracias a sus quebradas y nacederos.',
      },
      {
        pregunta: '¿Cuál es el precio promedio de un lote en Bulucaima?',
        respuesta: 'Los lotes en Bulucaima parten desde 180 millones de pesos para parcelas de 1.000 m², y pueden superar los 500 millones para lotes grandes con vista panorámica. Las fincas con casa y piscina oscilan entre 800 millones y 2.500 millones de pesos.',
      },
      {
        pregunta: '¿Es Bulucaima una buena opción para vivir de manera permanente?',
        respuesta: 'Totalmente. La vereda tiene comunidad estable, vías en buen estado, servicios completos y está a 10 minutos de colegios, supermercados y servicios médicos en La Vega. Muchas familias bogotanas han establecido allí su residencia principal aprovechando el teletrabajo.',
      },
    ],
  },

  'el-cural': {
    slug: 'el-cural',
    name: 'El Cural',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 12,
    distancia_bogota_min: 105,
    altitud_msnm: 1190,
    temperatura_c: { min: 18, max: 26 },
    acceso_vial: 'Acceso por vía principal La Vega–Sasaima con desvío pavimentado de 3 km.',
    descripcion_seo:
      'La vereda El Cural, en La Vega Cundinamarca, es sinónimo de fincas ' +
      'productivas y paisajes de montaña a 12 minutos del pueblo. Con un ' +
      'microclima templado ideal para cultivos de café y frutales, y propiedades ' +
      'de gran extensión a precios competitivos, es la opción favorita para ' +
      'quienes buscan finca raíz de inversión agroproductiva.',
    ventajas: [
      'Suelos fértiles aptos para café, cítricos y aguacate Hass',
      'Fuentes de agua permanentes: quebrada El Cural con caudal todo el año',
      'Fincas de gran extensión con precios por hectárea más bajos que Bulucaima',
      'Paisaje de selva andina con alta biodiversidad y aves endémicas',
      'Tranquilidad absoluta con baja densidad de construcción',
      'Potencial de agroturismo y fincas cafeteras en desarrollo',
    ],
    valorizacion:
      'El Cural ha registrado valorización sostenida del 10 % anual, impulsada ' +
      'por el auge del agroturismo y la demanda de fincas productivas con agua. ' +
      'Las propiedades con cultivos establecidos de café o aguacate tienen mayor ' +
      'liquidez por el interés de inversionistas del sector agroalimentario. ' +
      'Los lotes de más de 5.000 m² con acceso a quebrada representan la mejor ' +
      'relación precio-retorno de toda la jurisdicción de La Vega.',
    clima:
      'El Cural tiene un clima templado con temperatura promedio de 22 °C, ' +
      'ideal para agricultura de clima medio. Las brisas del valle del río Dulce ' +
      'refrescan las tardes y la humedad constante del bosque garantiza agua en ' +
      'todas las épocas del año. El régimen de lluvias bimodal (abril–mayo y ' +
      'octubre–noviembre) es perfecto para el ciclo del café y los frutales.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9850,
    geo_lng: -74.3620,
    faq: [
      {
        pregunta: '¿Qué tipo de cultivos se pueden establecer en El Cural?',
        respuesta: 'El Cural es ideal para café variedad Colombia y Castillo, aguacate Hass, cítricos (mandarina, naranja), plátano y hortalizas de clima medio. El suelo franco-arcilloso y la disponibilidad de agua de quebrada favorecen cosechas de alta calidad.',
      },
      {
        pregunta: '¿Cuánto cuesta una finca en El Cural?',
        respuesta: 'Las fincas en El Cural varían según extensión y productividad. Un lote de 5.000 m² con acceso a agua parte desde 120 millones, mientras que fincas productivas de 2 a 5 hectáreas con casa y cultivos establecidos oscilan entre 400 y 900 millones de pesos.',
      },
      {
        pregunta: '¿Es posible vivir permanentemente en El Cural?',
        respuesta: 'Sí, aunque la vereda es más rural que Bulucaima. Hay acueducto veredal, energía eléctrica y la vía de acceso está en buen estado. Para servicios cotidianos, La Vega queda a 12 minutos en automóvil.',
      },
      {
        pregunta: '¿Qué tan buena es la inversión en fincas productivas en El Cural?',
        respuesta: 'Las fincas con producción de café especial han demostrado retornos combinados (valorización + ingreso agrícola) superiores al 15 % anual. El auge del agroturismo agrega una tercera fuente de ingreso a quienes abren sus fincas al turismo cafetero.',
      },
    ],
  },

  'san-juan': {
    slug: 'san-juan',
    name: 'San Juan',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 10,
    distancia_bogota_min: 100,
    altitud_msnm: 1220,
    temperatura_c: { min: 18, max: 26 },
    acceso_vial: 'Vía sin pavimentar en buen estado desde La Vega, 7 km desde el parque principal.',
    descripcion_seo:
      'San Juan es una vereda extensa de La Vega con fincas de recreo, lotes ' +
      'y casas campestres a precios accesibles. Su paisaje de sabana andina, ' +
      'quebradas cristalinas y vista hacia la cordillera la posicionan como ' +
      'alternativa de gran valor para quienes buscan espacio y naturaleza ' +
      'sin pagar los precios premium de las veredas más conocidas.',
    ventajas: [
      'Gran extensión territorial con variedad de topografías y microclimas',
      'Precios más accesibles que Bulucaima para lotes equivalentes',
      'Múltiples quebradas y nacederos que garantizan agua todo el año',
      'Vista despejada hacia el cerro del Tabor y la cordillera',
      'Comunidad campesina activa con mercado dominical propio',
      'Potencial para parcelaciones y proyectos campestres de mediana escala',
    ],
    valorizacion:
      'San Juan está en la fase inicial de valorización acelerada. Los precios ' +
      'aún están entre un 25 y un 35 % por debajo de Bulucaima para lotes ' +
      'equivalentes, lo que representa una ventana de oportunidad para inversores. ' +
      'La mejora progresiva de la vía de acceso y el derrame de demanda desde ' +
      'veredas saturadas como Chicalá y Bulucaima proyectan incrementos del ' +
      '12–15 % anual para los próximos tres años.',
    clima:
      'San Juan tiene un clima templado de montaña con temperatura promedio ' +
      'de 22 °C. Su posición geográfica entre los 1.100 y 1.400 msnm crea ' +
      'microclimas variados dentro de la misma vereda: zonas más frescas en ' +
      'la parte alta y más cálidas en las cañadas. La humedad relativa alta ' +
      'favorece pastos naturales y vegetación exuberante todo el año.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9900,
    geo_lng: -74.3450,
    faq: [
      {
        pregunta: '¿Por qué son más baratos los lotes en San Juan que en otras veredas de La Vega?',
        respuesta: 'La vía de acceso aún no está completamente pavimentada, lo que genera una diferencia de precio respecto a veredas con mejor infraestructura vial. Sin embargo, el Municipio tiene proyectada la mejora vial para los próximos dos años, lo que anticipa una corrección de precios al alza.',
      },
      {
        pregunta: '¿Cuánto cuesta un lote en San Juan, La Vega?',
        respuesta: 'Los lotes en San Juan parten desde 80 millones de pesos para parcelas de 1.000 m² en zona baja, y pueden llegar a 200 millones para lotes con vista panorámica en la parte alta. Las fincas con casa establecida oscilan entre 300 y 700 millones.',
      },
      {
        pregunta: '¿Hay agua en San Juan durante todo el año?',
        respuesta: 'Sí. La vereda cuenta con múltiples fuentes de agua natural: la quebrada San Juan y varios nacederos. La mayoría de predios tienen acueducto veredal o captación propia. El caudal se mantiene incluso en temporada seca gracias a la humedad del bosque.',
      },
    ],
  },

  'tabacal': {
    slug: 'tabacal',
    name: 'Tabacal',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 15,
    distancia_bogota_min: 108,
    altitud_msnm: 1350,
    temperatura_c: { min: 16, max: 23 },
    acceso_vial: 'Vía destapada desde La Vega en proceso de pavimentación. Acceso 4x4 recomendado en temporada de lluvias.',
    descripcion_seo:
      'Tabacal es la vereda más alta y fresca de La Vega, con temperaturas de ' +
      '16 a 23 °C y una naturaleza prácticamente virgen. Ideal para quienes ' +
      'buscan retiro, privacidad y contacto con el bosque andino a menos de ' +
      '2 horas de Bogotá. Sus tierras ofrecen una oportunidad de inversión ' +
      'única en el Gualivá.',
    ventajas: [
      'El clima más fresco de La Vega: perfecto para residencia permanente',
      'Alta biodiversidad: orquídeas, bromelias y más de 60 especies de aves',
      'Fuentes de agua naturales con caudal permanente incluso en sequía',
      'Baja densidad de construcción: máxima privacidad y silencio',
      'Suelos aptos para cultivos de clima frío: uchuvas, mora, fresas',
      'Vista panorámica de 360° hacia la Cordillera Occidental',
    ],
    valorizacion:
      'Tabacal es la apuesta a largo plazo más interesante de La Vega. Los precios ' +
      'actuales son los más bajos de las veredas cercanas al casco urbano, pero ' +
      'la pavimentación de la vía proyectada para el Plan de Desarrollo Municipal ' +
      '2024–2027 cambiará radicalmente su accesibilidad. Inversores que compren ' +
      'hoy con un horizonte de 5 años pueden esperar valoraciones del 60–80 % ' +
      'sobre el precio de adquisición.',
    clima:
      'A 1.350 msnm, Tabacal tiene el clima más fresco de La Vega con temperaturas ' +
      'que raramente superan los 23 °C. Las mañanas son frescas (15–17 °C) y las ' +
      'noches pueden bajar a 13 °C en diciembre y enero. La neblina matutina que ' +
      'cubre los cerros crea un ambiente de bosque de niebla que caracteriza el ' +
      'paisaje único de esta vereda.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 5.0050,
    geo_lng: -74.3600,
    faq: [
      {
        pregunta: '¿Se puede acceder a Tabacal en un carro normal?',
        respuesta: 'La vía de acceso es destapada pero transitable en automóvil convencional durante temporada seca. En épocas de lluvia (abril–mayo y octubre–noviembre) se recomienda vehículo 4x4. El municipio tiene proyectada la pavimentación de la vía para 2025–2026.',
      },
      {
        pregunta: '¿Qué tan fría es Tabacal respecto al casco urbano de La Vega?',
        respuesta: 'Tabacal es entre 3 y 5 °C más fresco que el pueblo de La Vega. Si en el parque principal hace 26 °C, en Tabacal estarán entre 21 y 23 °C. Es ideal para quienes aman el clima templado-frío sin llegar a las temperaturas de Bogotá.',
      },
      {
        pregunta: '¿Es segura la inversión en Tabacal dado que la vía no está pavimentada?',
        respuesta: 'El precio actual refleja esa condición: los lotes en Tabacal cuestan entre un 30 y un 40 % menos que en veredas con vía pavimentada. Cuando mejore la infraestructura vial, esa diferencia de precio desaparece, generando una plusvalía directa para quienes compraron antes.',
      },
    ],
  },

  'la-alianza': {
    slug: 'la-alianza',
    name: 'La Alianza',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 9,
    distancia_bogota_min: 102,
    altitud_msnm: 1200,
    temperatura_c: { min: 18, max: 26 },
    acceso_vial: 'Vía pavimentada directa desde La Vega. Acceso cómodo en automóvil todo el año.',
    descripcion_seo:
      'La Alianza es una vereda consolidada de La Vega con vía pavimentada, ' +
      'servicios completos y una comunidad rural activa. Su combinación de ' +
      'fincas productivas y lotes para construcción, a precios más accesibles ' +
      'que Bulucaima, la posiciona como la opción ideal para la primera finca.',
    ventajas: [
      'Vía pavimentada: acceso cómodo en todos los vehículos durante todo el año',
      'Servicios públicos estables: agua, energía, telefonía e internet',
      'Lotes con escritura pública y sin problemas jurídicos',
      'Comunidad organizada con junta de acción comunal activa',
      'Precios entre 20–30 % más accesibles que Bulucaima',
      'Cerca de la vía principal La Vega–Bogotá',
    ],
    valorizacion:
      'La Alianza se ha beneficiado del rebose de demanda desde veredas más ' +
      'saturadas. Con vía pavimentada ya establecida, sus fundamentos de ' +
      'valorización son sólidos y sostenibles: 11 % anual en promedio. ' +
      'Los lotes de menos de 150 millones con escritura y sin problemas ' +
      'jurídicos tienen alta rotación entre compradores de primera finca.',
    clima:
      'Clima templado andino con temperatura media de 22 °C, similar al centro ' +
      'de La Vega. Noches frescas de 17–19 °C ideales para dormir sin aire ' +
      'acondicionado. Precipitación bien distribuida con la mayor concentración ' +
      'en los semestres de lluvia.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9960,
    geo_lng: -74.3480,
    faq: [
      {
        pregunta: '¿La Alianza es una buena opción para una primera finca en La Vega?',
        respuesta: 'Es una de las mejores opciones. La vía pavimentada, los servicios completos y los precios accesibles la hacen ideal para quienes compran su primer inmueble campestre. Además, la comunidad organizada facilita la integración y el cuidado de la propiedad cuando no está habitada.',
      },
      {
        pregunta: '¿Cuánto vale un lote en La Alianza?',
        respuesta: 'Los lotes en La Alianza parten desde 120 millones para parcelas de 1.000 m². Los lotes más grandes de 3.000 a 5.000 m² con acceso a agua y buena vista están entre 250 y 400 millones. Las casas campestres construidas oscilan entre 350 y 800 millones.',
      },
      {
        pregunta: '¿Hay cobertura de internet en La Alianza?',
        respuesta: 'Sí. Varios proveedores ofrecen internet por fibra óptica y por radio en la vereda. La cobertura de telefonía celular es buena en la mayor parte del territorio. Esto la hace viable para trabajar desde casa de manera permanente.',
      },
    ],
  },

  'el-rosario': {
    slug: 'el-rosario',
    name: 'El Rosario',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 11,
    distancia_bogota_min: 103,
    altitud_msnm: 1170,
    temperatura_c: { min: 19, max: 27 },
    acceso_vial: 'Acceso por vía principal con último tramo en afirmado. Mantenimiento municipal regular.',
    descripcion_seo:
      'El Rosario combina la cercanía al casco urbano de La Vega con la ' +
      'tranquilidad del campo abierto. Sus fincas de recreo y lotes planos ' +
      'de fácil construcción, a temperatura cálida-templada, son ideales ' +
      'para quienes buscan una vivienda campestre lista para habitar.',
    ventajas: [
      'Topografía plana y semiplana: construcción más sencilla y económica',
      'Temperatura levemente más cálida: ideal para quien viene del interior',
      'Fácil acceso: a 11 minutos del parque principal de La Vega',
      'Buena cobertura de servicios: agua, luz, internet disponibles',
      'Vistas abiertas hacia el valle con menor vegetación densa',
      'Zona con varios proyectos de condominios campestres en desarrollo',
    ],
    valorizacion:
      'El Rosario ha seguido la tendencia positiva de toda La Vega con ' +
      'valorización del 10–12 % anual. La topografía plana, que reduce los ' +
      'costos de construcción, hace que el metro cuadrado construido sea ' +
      'más rentable que en veredas con pendientes pronunciadas. Los proyectos ' +
      'de parcelación activos en la vereda están generando una revalorización ' +
      'acelerada del suelo rural.',
    clima:
      'El Rosario tiene la temperatura más cálida de las veredas cercanas al ' +
      'pueblo, con máximas de 27 °C en temporada seca. La altitud de 1.170 msnm ' +
      'evita el calor extremo de zonas más bajas, manteniendo noches frescas ' +
      'de 19–21 °C perfectas para descansar sin ventiladores.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9870,
    geo_lng: -74.3390,
    faq: [
      {
        pregunta: '¿El Rosario tiene lotes planos disponibles en La Vega?',
        respuesta: 'Sí. El Rosario es una de las pocas veredas de La Vega con sectores de topografía plana y semiplana, una característica escasa y muy valorada. Los lotes planos reducen los costos de cimentación y urbanismo hasta en un 30 % frente a lotes en ladera.',
      },
      {
        pregunta: '¿Hay condominios campestres en El Rosario?',
        respuesta: 'Hay varios proyectos de parcelación campestre en desarrollo y algunos consolidados. Los condominios en El Rosario ofrecen lotes desde 800 m² con zonas comunes, vigilancia y vías internas pavimentadas.',
      },
      {
        pregunta: '¿Cuál es el rango de precios en El Rosario?',
        respuesta: 'Los lotes parten desde 130 millones para 1.000 m². Las casas campestres construidas oscilan entre 400 y 950 millones según tamaño y acabados. Los lotes planos tienen un premio de precio de entre el 15 y el 25 % sobre lotes equivalentes en ladera.',
      },
    ],
  },

  'laureles': {
    slug: 'laureles',
    name: 'Laureles',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 14,
    distancia_bogota_min: 107,
    altitud_msnm: 1310,
    temperatura_c: { min: 16, max: 24 },
    acceso_vial: 'Vía en afirmado desde La Vega, 10 km. Mantenimiento veredal activo.',
    descripcion_seo:
      'Laureles es una vereda silenciosa y verde de La Vega, con uno de los ' +
      'paisajes más hermosos del municipio: bosques de laurel andino, ' +
      'quebradas cristalinas y vistas despejadas. Para quienes buscan retiro, ' +
      'privacidad y la mayor biodiversidad del Gualivá, es la vereda ideal.',
    ventajas: [
      'Bosques nativos de laurel andino con alta biodiversidad',
      'Tres quebradas activas dentro de la vereda: agua garantizada',
      'Baja densidad de ocupación: máxima privacidad y tranquilidad',
      'Temperatura fresca ideal para residencia permanente sin calor',
      'Suelos ricos en materia orgánica para agricultura ecológica',
      'Observación de aves: más de 70 especies registradas en la zona',
    ],
    valorizacion:
      'Laureles representa la inversión más orientada a la naturaleza en La Vega. ' +
      'Los precios son moderados hoy pero el interés creciente por el turismo de ' +
      'naturaleza y las fincas eco-lodge está generando una demanda nueva de ' +
      'compradores con perfil ambiental. Se proyectan valorizaciones del 15 % ' +
      'anual a medida que el ecoturismo se consolide en el Gualivá.',
    clima:
      'Laureles, a 1.310 msnm, tiene un clima fresco-templado con influencia ' +
      'del bosque de niebla. La temperatura rara vez supera los 24 °C y las ' +
      'noches son frescas entre 14 y 17 °C. La humedad alta, característica ' +
      'del bosque andino, mantiene la vegetación verde incluso en época seca ' +
      'y garantiza caudal en las quebradas durante todo el año.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 5.0020,
    geo_lng: -74.3550,
    faq: [
      {
        pregunta: '¿Por qué se llama vereda Laureles?',
        respuesta: 'El nombre proviene de los árboles de laurel andino (Morella pubescens) que dominan el bosque nativo de la vereda. Esta especie es indicadora de bosques bien conservados y forma corredores ecológicos que albergan gran biodiversidad.',
      },
      {
        pregunta: '¿Se puede desarrollar un proyecto eco-lodge en Laureles?',
        respuesta: 'Laureles tiene condiciones ideales: bosque nativo, agua permanente, clima fresco y alta biodiversidad. El POT de La Vega permite desarrollos de ecoturismo en áreas rurales con restricciones de densidad que protegen el paisaje. Es necesario tramitar licencia ambiental ante la CAR Cundinamarca.',
      },
      {
        pregunta: '¿Cuánto cuestan las fincas en Laureles?',
        respuesta: 'Las fincas en Laureles parten desde 150 millones para predios de 5.000 m² sin construcción. Las fincas con casa, bosque nativo y quebrada propia pueden superar los 600 millones, y tienen alta valorización por el turismo de naturaleza que busca estos ambientes únicos.',
      },
    ],
  },

  'la-libertad': {
    slug: 'la-libertad',
    name: 'La Libertad',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 16,
    distancia_bogota_min: 110,
    altitud_msnm: 1380,
    temperatura_c: { min: 15, max: 23 },
    acceso_vial: 'Vía destapada en buen estado. Ingreso desde la vía La Vega–Nocaima.',
    descripcion_seo:
      'La Libertad es la vereda más alta de La Vega, con un paisaje de páramo ' +
      'bajo y bosque andino que no tiene igual en el municipio. A 1.380 msnm, ' +
      'ofrece el clima más fresco, la mayor biodiversidad y lotes de gran extensión ' +
      'a precios imbatibles para quienes tienen visión de largo plazo.',
    ventajas: [
      'La altitud más elevada de La Vega: clima perfecto todo el año',
      'Vistas espectaculares hacia múltiples municipios del Gualivá',
      'Tierras vírgenes con alta potencial para proyectos de conservación',
      'Precios más accesibles de toda La Vega por m²',
      'Zona de reserva natural con restricciones que protegen el valor del suelo',
      'Acceso a pie a páramos y bosques de niebla únicos en la región',
    ],
    valorizacion:
      'La Libertad es la inversión de mayor horizonte temporal en La Vega. ' +
      'La valorización es más lenta que en veredas bajas, pero sostenida por ' +
      'la escasez de tierras a esta altitud y el creciente interés en proyectos ' +
      'de conservación privada y pago por servicios ambientales. El gobierno ' +
      'colombiano reconoce como reservas naturales privadas (RNSC) que generan ' +
      'beneficios tributarios y pueden obtener compensaciones por conservación.',
    clima:
      'La Libertad tiene el clima más fresco de La Vega. Las temperaturas de ' +
      '15 a 23 °C, con noches que pueden bajar a 12 °C en enero, la convierten ' +
      'en un ambiente propio del bosque andino alto. La neblina permanente ' +
      'en las horas de la mañana y las tardes lluviosas dan a la vereda un ' +
      'ambiente de bosque de niebla que encanta a los amantes de la naturaleza.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 5.0100,
    geo_lng: -74.3650,
    faq: [
      {
        pregunta: '¿Qué significa que La Libertad está en zona de reserva natural?',
        respuesta: 'Parte del territorio de La Libertad está bajo figura de protección ambiental de la CAR Cundinamarca. Esto no impide la compraventa de predios, pero establece restricciones de uso: no se pueden talar bosques nativos, construir en zonas de nacedero ni cambiar el uso del suelo a ganadería intensiva. A cambio, el suelo tiene restricciones que preservan su valor y el ambiente.',
      },
      {
        pregunta: '¿Puedo construir una casa en La Libertad?',
        respuesta: 'Sí, siempre que el predio esté catalogado como suelo rural con aptitud constructiva en el POT de La Vega. Las construcciones deben respetar el índice de ocupación rural y someterse a revisión ambiental. Un arquitecto local puede orientar sobre los trámites específicos de cada lote.',
      },
      {
        pregunta: '¿Cuál es el precio de lotes en La Libertad?',
        respuesta: 'La Libertad tiene los precios más bajos de La Vega por la altura y la vía destapada. Lotes de 5.000 m² parten desde 80 millones y grandes extensiones de 2 o más hectáreas pueden adquirirse desde 180 millones. Una inversión a 5 años con proyección excelente.',
      },
    ],
  },

  'guarumal': {
    slug: 'guarumal',
    name: 'Guarumal',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 7,
    distancia_bogota_min: 98,
    altitud_msnm: 1150,
    temperatura_c: { min: 19, max: 27 },
    acceso_vial: 'Vía pavimentada desde La Vega. Una de las mejores vías de acceso veredal del municipio.',
    descripcion_seo:
      'Guarumal es la vereda más próxima al casco urbano de La Vega con acceso ' +
      'pavimentado, lo que la convierte en la opción más práctica para quienes ' +
      'quieren vivir en el campo sin sacrificar conveniencia. Su proximidad a ' +
      'los servicios del pueblo y su precio aún competitivo la hacen ideal ' +
      'para residencia permanente o finca de fin de semana.',
    ventajas: [
      'La vereda más cercana al pueblo con vía pavimentada: 7 minutos al parque',
      'Total acceso a servicios: mercados, colegios, médicos a menos de 10 min',
      'Menor tiempo de desplazamiento a Bogotá de todas las veredas',
      'Lotificación activa con predios desde 500 m² disponibles',
      'Alta demanda de alquiler vacacional por la accesibilidad',
      'Temperatura ideal para piscina exterior durante todo el año',
    ],
    valorizacion:
      'Guarumal tiene los fundamentos de valorización más sólidos de La Vega ' +
      'para el corto y mediano plazo. La proximidad al pueblo, la vía pavimentada ' +
      'y la demanda de alquiler vacacional generan retornos superiores al 13 % ' +
      'anual. Las casas con piscina en Guarumal tienen ocupación de alquiler ' +
      'vacacional del 70–80 % durante los fines de semana del año, generando ' +
      'ingresos que cubren el costo de oportunidad de la inversión.',
    clima:
      'Guarumal, a 1.150 msnm, tiene el clima más cálido de las veredas cercanas ' +
      'al pueblo. Las temperaturas de 19 a 27 °C son perfectas para el disfrute ' +
      'de piscina exterior. Las tardes de brisa fresca y las noches de 19–21 °C ' +
      'hacen que sea cómodo estar al aire libre en cualquier época del año.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9910,
    geo_lng: -74.3350,
    faq: [
      {
        pregunta: '¿Por qué Guarumal es tan popular para alquiler vacacional?',
        respuesta: 'La combinación de acceso fácil desde Bogotá (98 minutos), clima cálido ideal para piscina y cercanía a todos los servicios de La Vega la hacen atractiva para familias bogotanas en fin de semana. Las casas con piscina en Guarumal generan ingresos de 600.000 a 1.200.000 pesos por noche en temporada alta.',
      },
      {
        pregunta: '¿Cuánto cuesta una casa con piscina en Guarumal?',
        respuesta: 'Las casas campestres con piscina en Guarumal oscilan entre 600 millones y 2.000 millones según tamaño, acabados y extensión del lote. El retorno por alquiler vacacional permite recuperar la inversión en plazos de 8 a 12 años, un indicador muy favorable en finca raíz.',
      },
      {
        pregunta: '¿Hay lotificaciones nuevas disponibles en Guarumal?',
        respuesta: 'Sí. La cercanía al pueblo ha impulsado proyectos de parcelación con lotes desde 500 m². Estos proyectos incluyen vías internas, acueducto y energía, y están disponibles en distintos rangos de precio. Consulte con Su Finca Raíz por los proyectos activos.',
      },
    ],
  },

  'cacahual': {
    slug: 'cacahual',
    name: 'Cacahual',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 18,
    distancia_bogota_min: 112,
    altitud_msnm: 1100,
    temperatura_c: { min: 20, max: 28 },
    acceso_vial: 'Vía principal pavimentada La Vega–Villeta, desvío en afirmado de 4 km.',
    descripcion_seo:
      'Cacahual es una vereda cálida y productiva de La Vega, en el límite con ' +
      'el municipio de Villeta. Su clima cálido-templado, suelos fértiles y ' +
      'grandes extensiones de tierra la convierten en destino preferido para ' +
      'fincas productivas, cultivos de cítricos y proyectos de turismo rural.',
    ventajas: [
      'Suelos de alta fertilidad para cítricos, plátano y aguacate',
      'Clima más cálido: ideal para cultivos de clima medio-bajo',
      'Grandes extensiones disponibles a precios por hectárea muy accesibles',
      'Sobre la vía principal La Vega–Villeta: excelente conectividad',
      'Agua del río abundante para riego y uso doméstico',
      'Potencial para turismo rural y fincas agro-turísticas',
    ],
    valorizacion:
      'Cacahual está beneficiándose de la demanda residual de La Vega y de la ' +
      'llegada de inversionistas del sector agrícola. Las fincas productivas con ' +
      'cultivos de aguacate Hass han demostrado retornos combinados superiores ' +
      'al 18 % anual (valorización + producción). Para el comprador de largo ' +
      'plazo, es la vereda con mayor upside de La Vega.',
    clima:
      'Cacahual, a 1.100 msnm, tiene el clima más cálido de las veredas de La Vega. ' +
      'Las temperaturas de 20 a 28 °C son ideales para cultivos de clima ' +
      'medio-bajo como aguacate, mandarina, naranja y plátano. Las noches son ' +
      'cálidas y la humedad del bosque de galería del río provee el agua ' +
      'necesaria para sistemas de riego por gravedad.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9780,
    geo_lng: -74.3700,
    faq: [
      {
        pregunta: '¿Qué cultivos son más rentables en Cacahual?',
        respuesta: 'El aguacate Hass es el cultivo más rentable actualmente: produce desde el tercer año, tiene alta demanda de exportación y valoriza el predio. La mandarina clementina y la naranja Valencia también son rentables con mercado local garantizado. Los cítricos son más fáciles de manejar para propietarios sin experiencia agrícola.',
      },
      {
        pregunta: '¿Cacahual es más cálido que el centro de La Vega?',
        respuesta: 'Sí, entre 3 y 5 °C más cálido. Si en el parque de La Vega hace 24 °C, en Cacahual estarán entre 26 y 28 °C. Es el tipo de clima perfecto para la producción de aguacate y cítricos, y para quienes prefieren temperatura más cálida para su finca de recreo.',
      },
      {
        pregunta: '¿Hay agua disponible en Cacahual para riego?',
        respuesta: 'Sí. La proximidad al río y la topografía de la vereda permiten sistemas de riego por gravedad en la mayoría de los predios. Varias fincas tienen embalses propios. El acueducto veredal cubre el uso doméstico y parte de los predios tienen captación directa de quebrada.',
      },
    ],
  },

  'chupal': {
    slug: 'chupal',
    name: 'Chupal',
    municipio_slug: 'la-vega',
    municipio_name: 'La Vega',
    distancia_pueblo_min: 20,
    distancia_bogota_min: 115,
    altitud_msnm: 1420,
    temperatura_c: { min: 14, max: 22 },
    acceso_vial: 'Vía destapada desde La Vega por el sector El Vino. 4x4 recomendado.',
    descripcion_seo:
      'Chupal es la vereda más remota y auténtica de La Vega, a 1.420 msnm ' +
      'con un clima frío-templado único en el municipio. Para el comprador que ' +
      'busca tierra virgen, privacidad total y la mayor distancia de los centros ' +
      'urbanos, Chupal ofrece una oportunidad de tierra única y escasa.',
    ventajas: [
      'La mayor altitud de La Vega: clima frío-templado ideal para retiro',
      'Mínima intervención humana: paisaje virgen sin construcciones aledañas',
      'Fuentes de agua de páramo: las más limpias y abundantes del municipio',
      'Silencio absoluto: sin contaminación auditiva ni lumínica',
      'Tierras de bajo precio con potencial para proyectos de conservación',
      'Candidato para declaratoria de Reserva Natural de la Sociedad Civil (RNSC)',
    ],
    valorizacion:
      'Chupal es para el inversionista con paciencia y visión ambiental. ' +
      'Los precios son los más bajos de La Vega por el acceso difícil, pero ' +
      'el escenario de mayor retorno es el proyecto de conservación privada: ' +
      'registrar el predio como RNSC genera beneficios fiscales y puede ' +
      'recibir compensaciones de la CAR por servicios ambientales. A medida ' +
      'que el mercado de carbono voluntario crezca en Colombia, estas tierras ' +
      'tendrán un valor adicional significativo.',
    clima:
      'Chupal tiene el clima más frío de La Vega: temperaturas de 14 a 22 °C ' +
      'durante el día y noches que bajan a 10–12 °C en enero. El bosque de niebla ' +
      'permanente crea una atmósfera de humedad constante que alimenta nacederos ' +
      'y quebradas de páramo con agua limpia todo el año. Para los amantes del ' +
      'frío andino, es el microclima más buscado.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 5.0150,
    geo_lng: -74.3750,
    faq: [
      {
        pregunta: '¿Qué es una Reserva Natural de la Sociedad Civil en Chupal?',
        respuesta: 'Una RNSC es un registro voluntario ante el Registro Único de Ecosistemas (RUNAP) que reconoce oficialmente el compromiso de conservación de un predio privado. Genera beneficios como exención de impuesto predial en Cundinamarca y puede acceder a financiación de proyectos de pago por servicios ambientales.',
      },
      {
        pregunta: '¿Hay electricidad en Chupal?',
        respuesta: 'La red eléctrica cubre la mayor parte de la vereda, aunque algunos predios muy alejados requieren sistemas fotovoltaicos. La Alcaldía de La Vega tiene programas de electrificación rural activos.',
      },
      {
        pregunta: '¿Por qué los precios en Chupal son tan bajos?',
        respuesta: 'El principal factor es la vía de acceso destapada y el requerimiento de vehículo 4x4. Esto limita el mercado de compradores a quienes tienen ese tipo de vehículo o valoran específicamente la inaccesibilidad como ventaja. Para el inversor de largo plazo, esa barrera de acceso es justamente lo que crea el margen de valorización futuro.',
      },
    ],
  },

  'ucranea': {
    slug: 'ucranea',
    name: 'Ucranea',
    municipio_slug: 'sasaima',
    municipio_name: 'Sasaima',
    distancia_pueblo_min: 12,
    distancia_bogota_min: 98,
    altitud_msnm: 1080,
    temperatura_c: { min: 20, max: 28 },
    acceso_vial: 'Vía principal pavimentada Bogotá–Sasaima. Acceso directo sin desvío.',
    descripcion_seo:
      'Ucranea es una vereda de Sasaima estratégicamente ubicada sobre la vía ' +
      'principal a Bogotá, con acceso pavimentado directo y un clima cálido-templado ' +
      'de 20 a 28 °C. Su posición sobre la carretera principal la convierte en ' +
      'la vereda de mayor accesibilidad del municipio para fincas de fin de semana.',
    ventajas: [
      'Sobre la vía principal: acceso en automóvil convencional todo el año',
      'La vereda de Sasaima más cercana a Bogotá por tiempo de viaje',
      'Temperatura cálida ideal para piscina y recreo al aire libre',
      'Precios más bajos que municipios equivalentes de La Vega',
      'Fincas productivas de café y cítricos con ingresos complementarios',
      'Vista al río Dulce y acceso a pozos naturales para baño',
    ],
    valorizacion:
      'Ucranea es el punto de entrada más accesible para invertir en el Gualivá ' +
      'a precio bajo. La vía pavimentada directa es un activo diferencial respecto ' +
      'a otras veredas de Sasaima. La valorización proyectada es del 10 % anual, ' +
      'con potencial adicional si se materializa el plan de mejoramiento turístico ' +
      'del municipio de Sasaima financiado por la Gobernación de Cundinamarca.',
    clima:
      'Ucranea tiene un clima cálido-templado a 1.080 msnm, ideal para cultivos ' +
      'de café, plátano y cítricos. La temperatura de 20 a 28 °C es perfecta ' +
      'para el turismo de recreo, con tardes de brisa fresca que bajan del ' +
      'páramo a través de los cañones del río Dulce. Las noches frescas de ' +
      '19–21 °C hacen que sea cómodo dormir sin aire acondicionado.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9580,
    geo_lng: -74.4200,
    faq: [
      {
        pregunta: '¿Por qué invertir en Ucranea, Sasaima, y no en La Vega?',
        respuesta: 'Ucranea ofrece mayor accesibilidad económica: los mismos metros cuadrados cuestan entre un 30 y un 40 % menos que en La Vega con condiciones equivalentes. Para quien busca primera finca con presupuesto ajustado, Ucranea es la opción más inteligente de todo el Gualivá.',
      },
      {
        pregunta: '¿Cuánto se tarda en llegar de Bogotá a Ucranea?',
        respuesta: 'Aproximadamente 98 minutos desde el norte de Bogotá por la autopista Bogotá–La Vega y la vía Sasaima. Es uno de los accesos más rápidos del Gualivá: prácticamente el mismo tiempo que La Vega pero con precios significativamente menores.',
      },
      {
        pregunta: '¿Se puede construir una casa de recreo en Ucranea?',
        respuesta: 'Sí. El POT de Sasaima permite construcción de vivienda campestre en suelo rural suburbano con los parámetros establecidos. El acceso pavimentado facilita el transporte de materiales, reduciendo los costos de construcción respecto a veredas con vía en afirmado.',
      },
    ],
  },
}

export function getVeredaData(slug: string): VeredaData | null {
  return VEREDAS[slug] ?? null
}

export function getAllVeredasData(): VeredaData[] {
  return Object.values(VEREDAS)
}

export function getVeredasByMunicipio(municipioSlug: string): VeredaData[] {
  return Object.values(VEREDAS).filter(v => v.municipio_slug === municipioSlug)
}
