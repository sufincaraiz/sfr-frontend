export interface MunicipioData {
  slug: string
  name: string
  provincia: string
  distancia_bogota_km: number
  tiempo_bogota_min: number
  altitud_msnm: number
  temperatura_c: { min: number; max: number }
  descripcion_seo: string
  historia: string
  clima: string
  turismo: string
  inversion: string
  og_image?: string
  geo_lat: number
  geo_lng: number
  wikipedia_url: string
  faqs: { question: string; answer: string }[]
}

const MUNICIPIOS: Record<string, MunicipioData> = {
  'la-vega': {
    slug: 'la-vega',
    name: 'La Vega',
    provincia: 'Gualivá',
    distancia_bogota_km: 74,
    tiempo_bogota_min: 90,
    altitud_msnm: 1230,
    temperatura_c: { min: 18, max: 26 },
    descripcion_seo:
      'La Vega, Cundinamarca, es el destino campestre favorito de los bogotanos. ' +
      'A solo 74 km y 90 minutos de Bogotá por la doble calzada, ofrece fincas, ' +
      'condominios y casas campestres en un clima primaveral de 18 a 26 °C. ' +
      'Su mercado inmobiliario es el más dinámico del Gualivá.',
    historia:
      'Fundada en 1777 bajo el nombre de San Antonio de La Vega, el municipio ' +
      'consolidó su vocación agropecuaria durante el siglo XIX con cultivos de ' +
      'café, caña de azúcar y frutales. La apertura de la carretera a Bogotá en ' +
      'los años 50 transformó su economía hacia el turismo de fin de semana, ' +
      'convirtiendo sus veredas en destino residencial campestre para miles de ' +
      'familias bogotanas. Hoy es sede del mercado campesino más grande de ' +
      'Cundinamarca, que se celebra cada domingo en la Plaza Principal.',
    clima:
      'La Vega goza de un microclima excepcional con temperaturas entre 18 y 26 °C ' +
      'durante todo el año, clasificado como clima templado húmedo de montaña. ' +
      'La altitud de 1.230 msnm evita el calor extremo de municipios más bajos ' +
      'como Villeta o Útica, mientras que la humedad relativa del 75 % mantiene ' +
      'la vegetación exuberante. Las lluvias se concentran en abril–mayo y ' +
      'octubre–noviembre, con una temporada seca bien marcada de diciembre a marzo.',
    turismo:
      'El municipio atrae más de 30.000 visitantes cada fin de semana entre ' +
      'ecoturismo, turismo gastronómico y turismo de naturaleza. Los principales ' +
      'atractivos incluyen el Parque Natural de La Vega con senderos ecológicos, ' +
      'el río Dulce ideal para deportes de aventura, el mercado campesino dominical, ' +
      'restaurantes especializados en cocina cundinamarquesa y más de 40 fincas ' +
      'turísticas activas. La vereda Chicalá y el sector de Bulucaima concentran ' +
      'la oferta hotelera y de alquiler vacacional de alta gama.',
    inversion:
      'La Vega lidera el ranking de valorización de finca raíz rural en Cundinamarca ' +
      'con un crecimiento promedio del 12 % anual en los últimos cinco años. La ' +
      'doble calzada Bogotá–La Vega, el crecimiento del teletrabajo y la demanda ' +
      'de segunda residencia post-pandemia han disparado los precios en veredas ' +
      'como Chicalá, Bulucaima y Petaquero. Los condominios campestres de entre ' +
      '500 m² y 5.000 m² son los activos de mayor demanda, con tiempos de venta ' +
      'menores a 60 días. El municipio cuenta con Plan de Ordenamiento Territorial ' +
      'actualizado y servicios públicos de alta cobertura.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9929,
    geo_lng: -74.3404,
    wikipedia_url: 'https://es.wikipedia.org/wiki/La_Vega_(Cundinamarca)',
    faqs: [
      {
        question: '¿Cuánto cuesta una finca en La Vega, Cundinamarca en 2025?',
        answer:
          'Los precios de fincas en La Vega varían entre $350 millones y $2.500 millones COP según ' +
          'tamaño, vereda y servicios. Los lotes campestres desde 500 m² empiezan desde $85 millones, ' +
          'las casas campestres en condominio cerrado desde $280 millones, y las fincas productivas de ' +
          '1 a 5 hectáreas entre $350 y $900 millones. Las veredas más valorizadas son Bulucaima, ' +
          'Guarumal y La Alianza.',
      },
      {
        question: '¿Cuánto se valoriza una finca en La Vega por año?',
        answer:
          'La Vega registra una valorización promedio anual del 18% en finca raíz rural, impulsada ' +
          'por la doble calzada Bogotá-La Vega que redujo el trayecto a 90 minutos, el crecimiento ' +
          'del turismo campestre post-pandemia y la escasez de lotes con servicios públicos completos. ' +
          'Es la mayor tasa de valorización entre los municipios del Gualivá, Cundinamarca.',
      },
      {
        question: '¿A cuántos kilómetros queda La Vega de Bogotá?',
        answer:
          'La Vega queda a 74 kilómetros de Bogotá por la Autopista Medellín (Ruta 62). Con la doble ' +
          'calzada Bogotá-La Vega, el trayecto toma aproximadamente 90 minutos en condiciones normales ' +
          'de tráfico y hasta 2 horas los fines de semana.',
      },
      {
        question: '¿Cuál es el clima en La Vega, Cundinamarca?',
        answer:
          'La Vega tiene un clima templado húmedo de montaña con temperaturas entre 18 y 26 °C todo ' +
          'el año, a 1.230 metros sobre el nivel del mar. La humedad relativa promedio es del 75%. ' +
          'Es considerado uno de los mejores microclimas del departamento de Cundinamarca, sin los ' +
          'extremos de calor de Villeta ni el frío de la Sabana de Bogotá.',
      },
      {
        question: '¿Qué tipo de propiedades se venden en La Vega?',
        answer:
          'En La Vega se venden principalmente cuatro tipos de propiedades: fincas de recreo con ' +
          'piscina y áreas verdes, fincas productivas con cultivos de café y frutales, lotes campestres ' +
          'para construcción, y condominios campestres con zonas comunes y vigilancia 24/7. También ' +
          'hay casas campestres independientes y cabañas en arriendo y venta.',
      },
    ],
  },

  'sasaima': {
    slug: 'sasaima',
    name: 'Sasaima',
    provincia: 'Gualivá',
    distancia_bogota_km: 68,
    tiempo_bogota_min: 85,
    altitud_msnm: 1050,
    temperatura_c: { min: 20, max: 28 },
    descripcion_seo:
      'Sasaima es un municipio de clima cálido-templado en el Gualivá cundinamarqués, ' +
      'a 68 km de Bogotá. Reconocido por sus cafetales orgánicos, fincas paneleras ' +
      'y el ecoturismo de aventura en el río Negro, ofrece inmuebles campestres a ' +
      'precios más accesibles que La Vega con excelente potencial de valorización.',
    historia:
      'Sasaima fue fundada oficialmente en 1777. Su nombre proviene de la lengua ' +
      'muisca y significa "tierra de tigrillos". Durante la Colonia fue paso ' +
      'obligado del Camino Real que comunicaba Santa Fe con el río Magdalena. ' +
      'En el siglo XX, la economía se diversificó entre la panela artesanal, ' +
      'el café y la ganadería extensiva, base de las grandes fincas que hoy ' +
      'se reconvierten en proyectos residenciales campestres.',
    clima:
      'Sasaima tiene un clima tropical de altitud con temperatura promedio de 24 °C. ' +
      'Su altitud de 1.050 msnm produce noches frescas y días cálidos perfectos ' +
      'para la agricultura y el turismo de naturaleza. Las lluvias son moderadas ' +
      'y distribuidas a lo largo del año, con mayor intensidad en el segundo ' +
      'semestre. La vegetación de selva andina y bosque húmedo cubre el 60 % ' +
      'del territorio municipal.',
    turismo:
      'Sasaima es destino de ecoturismo y turismo de aventura, con atractivos ' +
      'como el Parque de los Manantiales, los cafetales de la vereda Cune, ' +
      'el río Negro para kayak y rafting, y las cascadas del sector de La Salsa. ' +
      'El Festival del Campesino Sasiameño, celebrado en agosto, atrae artesanos ' +
      'y productores orgánicos de toda la región. Las fincas turísticas de ' +
      'agroturismo están en auge, especialmente para experiencias de cosecha de café.',
    inversion:
      'Sasaima representa la mejor relación precio-valorización del Gualivá. ' +
      'Los precios de lotes y fincas están entre un 20 y un 35 % por debajo de ' +
      'La Vega, con proyecciones de crecimiento superiores al 10 % anual. La ' +
      'cercanía a la doble calzada Bogotá–La Vega y los planes de mejoramiento ' +
      'vial del departamento posicionan a Sasaima como el municipio con mayor ' +
      'potencial de apreciación en los próximos cinco años. Ideal para inversores ' +
      'que buscan tierra con alta rentabilidad de agroturismo.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9667,
    geo_lng: -74.4333,
    wikipedia_url: 'https://es.wikipedia.org/wiki/Sasaima',
    faqs: [
      {
        question: '¿Por qué invertir en finca raíz en Sasaima, Cundinamarca?',
        answer:
          'Sasaima ofrece los mismos atractivos de clima y naturaleza de La Vega pero con precios ' +
          'entre un 20 y 35% más bajos. La mejora de la vía La Vega-Sasaima y los planes de turismo ' +
          'rural del departamento posicionan a Sasaima como el municipio con mayor potencial de ' +
          'apreciación a largo plazo en el Gualivá.',
      },
      {
        question: '¿Cuánto cuesta una finca en Sasaima?',
        answer:
          'Las fincas en Sasaima tienen precios entre $200 y $800 millones COP según tamaño y ' +
          'ubicación. Los lotes campestres con acceso vial empiezan desde $60 millones. El precio ' +
          'por metro cuadrado es entre un 25 y 35% más bajo que en La Vega.',
      },
      {
        question: '¿Cuánto demora llegar de Bogotá a Sasaima?',
        answer:
          'Sasaima queda a aproximadamente 80 kilómetros de Bogotá. El trayecto toma entre 100 y ' +
          '120 minutos por la vía La Vega-Sasaima.',
      },
    ],
  },

  'nocaima': {
    slug: 'nocaima',
    name: 'Nocaima',
    provincia: 'Gualivá',
    distancia_bogota_km: 77,
    tiempo_bogota_min: 95,
    altitud_msnm: 1320,
    temperatura_c: { min: 16, max: 24 },
    descripcion_seo:
      'Nocaima es uno de los municipios más tranquilos y naturales del Gualivá, ' +
      'con un clima fresco de 16 a 24 °C y a solo 95 minutos de Bogotá. ' +
      'Su paisaje de montaña, ríos cristalinos y poca densidad de construcción ' +
      'lo convierten en destino ideal para fincas de retiro y lotes de inversión.',
    historia:
      'Nocaima fue fundada en 1778. Su nombre muisca significa "tierra de ' +
      'nieve blanca" en referencia a las nubes que coronan sus cerros. ' +
      'Durante la Colonia fue un importante productor de caña panelera y ' +
      'frutas tropicales para los mercados de Santa Fe. El municipio conserva ' +
      'su arquitectura colonial en el centro histórico y una tradición agrícola ' +
      'familiar con haciendas de más de dos siglos de historia.',
    clima:
      'Con 1.320 msnm, Nocaima tiene el clima más fresco de los municipios ' +
      'del Gualivá bajo. Las temperaturas de 16 a 24 °C crean condiciones ' +
      'ideales para cultivos de fique, uchuvas, tomates de árbol y frutales ' +
      'de clima frío-templado. La precipitación anual supera los 1.800 mm, ' +
      'garantizando fuentes de agua permanentes en todas las veredas. ' +
      'Las noches son frescas durante todo el año, entre 14 y 18 °C.',
    turismo:
      'Nocaima atrae turistas de naturaleza y senderismo. Sus principales ' +
      'atractivos son el Cerro Chingatá, el Charco de la Pizarra, los miradores ' +
      'naturales de la vereda Payande y la Ruta del Fique que recorre cinco ' +
      'veredas productoras. El Mercado Campesino del primer domingo de cada mes ' +
      'concentra productores de quesos artesanales, mermeladas y frutas exóticas ' +
      'de la región.',
    inversion:
      'Nocaima ofrece lotes y fincas a precios muy competitivos, ideales para ' +
      'inversión a mediano plazo. El municipio ha iniciado la pavimentación de ' +
      'sus vías veredales principales, lo que proyecta una valorización ' +
      'significativa en los próximos tres años. Su baja densidad constructiva ' +
      'y la disponibilidad de lotes desde 2.000 m² con agua de quebrada lo ' +
      'posicionan como alternativa para quienes buscan privacidad y naturaleza ' +
      'sin alejarse de Bogotá.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9333,
    geo_lng: -74.3833,
    wikipedia_url: 'https://es.wikipedia.org/wiki/Nocaima',
    faqs: [
      {
        question: '¿Qué ofrece Nocaima para comprar finca raíz?',
        answer:
          'Nocaima ofrece fincas y lotes a precios accesibles con clima cálido-templado ideal para ' +
          'cultivos de frutas tropicales como mango, mandarina y guayaba. Su proximidad a La Vega y ' +
          'Villeta, con precios hasta un 40% menores, lo hace atractivo para inversores que buscan ' +
          'tierra productiva con alta proyección de valorización.',
      },
      {
        question: '¿Cuánto cuesta una propiedad en Nocaima?',
        answer:
          'En Nocaima las fincas tienen precios entre $150 y $600 millones COP. Los lotes rurales ' +
          'empiezan desde $45 millones. Las fincas frutícolas activas son la oferta más representativa ' +
          'del municipio.',
      },
    ],
  },

  'villeta': {
    slug: 'villeta',
    name: 'Villeta',
    provincia: 'Gualivá',
    distancia_bogota_km: 88,
    tiempo_bogota_min: 100,
    altitud_msnm: 826,
    temperatura_c: { min: 24, max: 32 },
    descripcion_seo:
      'Villeta, la "Ciudad Dulce de Colombia", es el municipio de clima cálido ' +
      'más visitado del Gualivá, a 88 km de Bogotá. Famosa por su panela ' +
      'artesanal y sus piscinas naturales, ofrece fincas y casas campestres ' +
      'en clima tropical perfecto para el turismo recreativo.',
    historia:
      'Villeta fue fundada en 1826 y debe su apodo de "Ciudad Dulce" a los ' +
      'trapiches paneleros que por más de dos siglos han producido la panela ' +
      'más apreciada de Colombia. La ciudad fue también el punto de descanso ' +
      'predilecto de Simón Bolívar en sus travesías entre Bogotá y el río ' +
      'Magdalena. Su centro histórico conserva la casa-museo del Libertador ' +
      'y una arquitectura republicana de gran valor patrimonial.',
    clima:
      'Villeta tiene el clima más cálido del Gualivá, con temperaturas de 24 ' +
      'a 32 °C durante todo el año y una altitud de solo 826 msnm. El ambiente ' +
      'tropical, la humedad del río Villeta y las noches templadas de 22 °C la ' +
      'convierten en destino de turismo recreativo masivo. La temporada seca ' +
      'entre diciembre y marzo atrae el mayor flujo de visitantes bogotanos ' +
      'en busca de sol y piscina.',
    turismo:
      'Villeta recibe más de 50.000 visitantes mensuales durante temporadas altas. ' +
      'El Parque Acuático y las piscinas naturales de las fincas de la zona son ' +
      'la principal atracción, complementadas por el ecoparque El Triunfo, los ' +
      'trapiches artesanales para turismo vivencial y el Festival Nacional de ' +
      'la Panela en octubre. La vereda Tobia, a 20 minutos, es el epicentro del ' +
      'turismo de aventura con rafting en el río Negro.',
    inversion:
      'Villeta tiene el mercado de alquiler vacacional más activo de la región, ' +
      'con rentabilidades de corto plazo entre el 8 y el 12 % anual para ' +
      'fincas con piscina. Los precios de casas campestres en lotes de ' +
      '1.000 a 3.000 m² son competitivos frente a La Vega, con mayor ' +
      'liquidez por la demanda turística constante. El crecimiento de ' +
      'plataformas de alquiler vacacional ha dinamizado el mercado de ' +
      'inmuebles recreativos en toda la vereda El Trigo y el sector Tobia.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 5.0167,
    geo_lng: -74.4667,
    wikipedia_url: 'https://es.wikipedia.org/wiki/Villeta_(Cundinamarca)',
    faqs: [
      {
        question: '¿Por qué es popular Villeta para comprar finca?',
        answer:
          'Villeta es el municipio turístico más visitado del Gualivá con más de 50.000 visitantes ' +
          'mensuales. Su clima cálido de 28 a 32 °C, el río Negro para deportes de aventura, la ' +
          'gastronomía de panela y los espectáculos naturales la hacen destino de alta demanda. ' +
          'Las propiedades con piscina tienen excelente rentabilidad como alquiler vacacional.',
      },
      {
        question: '¿Cuánto cuesta una finca en Villeta, Cundinamarca?',
        answer:
          'Las fincas en Villeta varían entre $250 millones y $1.500 millones COP. Las propiedades ' +
          'con piscina y acceso al río tienen precios más altos por su potencial de renta vacacional. ' +
          'Los lotes en sectores turísticos como Tobia empiezan desde $80 millones.',
      },
      {
        question: '¿Cuál es el clima en Villeta?',
        answer:
          'Villeta tiene clima cálido con temperaturas entre 28 y 35 °C a 795 metros sobre el ' +
          'nivel del mar. Es el municipio más cálido del Gualivá, ideal para quienes prefieren ' +
          'clima tropical en lugar del clima templado de La Vega.',
      },
    ],
  },

  'nimaima': {
    slug: 'nimaima',
    name: 'Nimaima',
    provincia: 'Gualivá',
    distancia_bogota_km: 85,
    tiempo_bogota_min: 100,
    altitud_msnm: 960,
    temperatura_c: { min: 20, max: 28 },
    descripcion_seo:
      'Nimaima es un municipio auténtico del Gualivá, con paisajes de montaña ' +
      'y ríos en un clima templado de 20 a 28 °C. A 85 km de Bogotá, ofrece ' +
      'lotes y fincas a precios muy accesibles con alta proyección de valorización.',
    historia:
      'Nimaima fue elevada a municipio en 1968. Su economía tradicional se ' +
      'basa en la producción de panela, café y frutas tropicales. El nombre ' +
      'de origen muisca evoca la fertilidad de su suelo volcánico, ' +
      'reconocido por los agricultores de la región por su excepcional ' +
      'capacidad productiva para cultivos de clima medio.',
    clima:
      'Nimaima tiene un clima templado-cálido con temperatura promedio de 24 °C ' +
      'y precipitaciones bien distribuidas durante el año. Su altitud intermedia ' +
      'de 960 msnm la ubica en la franja ideal para cultivos mixtos de clima ' +
      'medio: café, cítricos, aguacate y hortalizas. Los vientos alisios que ' +
      'suben del valle del río Villeta generan brisas frescas en las horas de ' +
      'la tarde.',
    turismo:
      'Nimaima ofrece turismo de naturaleza con menor masificación que otros ' +
      'municipios del Gualivá. Sus atractivos principales son el río Nimaima ' +
      'para pesca deportiva y baños naturales, los miradores del Cerro El Burro ' +
      'y las fincas agro-turísticas con producción de panela artesanal. ' +
      'El turismo rural comunitario está en desarrollo con apoyo de la ' +
      'Gobernación de Cundinamarca.',
    inversion:
      'Nimaima representa la opción de mayor accesibilidad económica del Gualivá, ' +
      'con lotes desde 200 millones de pesos y fincas productivas con buena ' +
      'infraestructura. La mejora de la vía Nimaima–Villeta y los planes de ' +
      'inversión departamental en turismo rural posicionan el municipio para ' +
      'una valorización acelerada. Ideal para compradores que priorizan el ' +
      'retorno de inversión sobre la inmediatez de la apreciación.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.9167,
    geo_lng: -74.4167,
    wikipedia_url: 'https://es.wikipedia.org/wiki/Nimaima',
    faqs: [
      {
        question: '¿Qué hace especial a Nimaima para inversión en finca raíz?',
        answer:
          'Nimaima se distingue por su microclima excepcional y el menor precio por metro cuadrado ' +
          'entre los municipios del Gualivá. Con infraestructura básica completa y excelente ' +
          'conectividad, ofrece la mayor relación precio-valorización esperada de la región para ' +
          'inversores que compran antes del desarrollo masivo.',
      },
      {
        question: '¿Cuánto cuesta una finca en Nimaima?',
        answer:
          'En Nimaima las fincas tienen precios entre $120 y $500 millones COP, con lotes desde ' +
          '$35 millones. Es el municipio del Gualivá con mayor diferencial precio-valor respecto ' +
          'a los municipios más desarrollados de la región.',
      },
    ],
  },

  'quebradanegra': {
    slug: 'quebradanegra',
    name: 'Quebradanegra',
    provincia: 'Gualivá',
    distancia_bogota_km: 95,
    tiempo_bogota_min: 110,
    altitud_msnm: 1070,
    temperatura_c: { min: 19, max: 27 },
    descripcion_seo:
      'Quebradanegra es uno de los municipios menos explorados del Gualivá, ' +
      'con una naturaleza virgen, ríos limpios y fincas productivas a precios ' +
      'muy bajos. Para quienes buscan un retiro verdadero a menos de 2 horas ' +
      'de Bogotá, es la opción más auténtica de la región.',
    historia:
      'Quebradanegra debe su nombre a las aguas oscuras de la quebrada que ' +
      'atraviesa su territorio, teñidas por el tanino de los árboles de ' +
      'la selva andina. Fundada como corregimiento de Útica en el siglo XIX, ' +
      'fue erigida municipio en 1959. Su historia está ligada a la colonización ' +
      'antioqueña y cundinamarquesa de las tierras cálidas del Magdalena Medio.',
    clima:
      'Con 1.070 msnm, Quebradanegra tiene un clima templado muy equilibrado, ' +
      'con días cálidos (27 °C) y noches frescas (19 °C). La alta humedad ' +
      'relativa y las lluvias constantes mantienen sus quebradas y ríos con ' +
      'caudal todo el año, una ventaja determinante para fincas productivas ' +
      'y sistemas de acueducto veredal.',
    turismo:
      'El turismo en Quebradanegra es incipiente y auténtico: pesca en el río ' +
      'Negro, senderismo en bosques nativos sin señalización comercial, ' +
      'observación de aves endémicas del Gualivá y turismo comunitario en ' +
      'fincas cafeteras familiares. Para el viajero que busca escapar de la ' +
      'masificación turística, este municipio ofrece una experiencia genuina ' +
      'del campo cundinamarqués.',
    inversion:
      'Quebradanegra tiene los precios de tierra más bajos de los municipios ' +
      'del Gualivá con acceso vial decente. Los lotes con agua de quebrada, ' +
      'fácil acceso y vista a la montaña parten desde 80 millones de pesos. ' +
      'La inversión tiene un horizonte de valorización de 5 a 8 años, ' +
      'con retornos proyectados superiores al 50 % en ese período, ' +
      'especialmente si se desarrollan proyectos agroturísticos o ' +
      'de turismo ecológico.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.8833,
    geo_lng: -74.4500,
    wikipedia_url: 'https://es.wikipedia.org/wiki/Quebradanegra_(Cundinamarca)',
    faqs: [
      {
        question: '¿Por qué invertir en Quebradanegra?',
        answer:
          'Quebradanegra destaca por su riqueza hídrica, el potencial de turismo ecológico y los ' +
          'precios más accesibles de la región. Su condición de municipio en desarrollo temprano ' +
          'lo convierte en una oportunidad de compra antes de la valorización masiva que ya ' +
          'experimentaron La Vega y Nocaima.',
      },
      {
        question: '¿Cuánto cuesta una finca en Quebradanegra?',
        answer:
          'Las fincas en Quebradanegra cuestan entre $100 y $400 millones COP. Los lotes rurales ' +
          'con acceso a agua disponibles desde $30 millones son la oferta más demandada.',
      },
    ],
  },

  'vergara': {
    slug: 'vergara',
    name: 'Vergara',
    provincia: 'Gualivá',
    distancia_bogota_km: 112,
    tiempo_bogota_min: 130,
    altitud_msnm: 850,
    temperatura_c: { min: 22, max: 30 },
    descripcion_seo:
      'Vergara, Cundinamarca, es el municipio más cálido y agrícola del Gualivá, ' +
      'a 112 km de Bogotá. Su economía ganadera y cafetera ofrece grandes extensiones ' +
      'de tierra productiva a precios muy competitivos, ideal para proyectos ' +
      'agroindustriales o turismo rural de gran escala.',
    historia:
      'Vergara fue fundada en el siglo XIX como tierra de colonización ' +
      'agrícola en la confluencia de los ríos Negro y Tobia. Su economía ' +
      'estuvo dominada por la ganadería extensiva y los cultivos de cacao, ' +
      'plátano y café de baja altitud. Hoy conserva el patrimonio de ' +
      'antiguas haciendas ganaderas con casas coloniales de bahareque ' +
      'y grandes extensiones de tierra fértil.',
    clima:
      'Vergara tiene el clima más cálido del Gualivá sur, con temperaturas ' +
      'de 22 a 30 °C y una altitud de solo 850 msnm. El calor seco de la ' +
      'temporada entre diciembre y marzo contrasta con las lluvias abundantes ' +
      'del primer semestre, que mantienen los pastos y cultivos en excelente ' +
      'condición. Los ríos Negro y Tobia proveen agua permanente para todas ' +
      'las fincas del municipio.',
    turismo:
      'Vergara atrae turismo rural de aventura con rafting en los ríos Negro ' +
      'y Tobia, pesca deportiva en embalses naturales y senderismo en el ' +
      'Cañón del Tobia. El aviturismo está ganando relevancia gracias a la ' +
      'biodiversidad del bosque seco tropical, con más de 80 especies de aves ' +
      'registradas en la zona. Las fincas de cacao y plátano ofrecen ' +
      'experiencias de agroturismo en crecimiento.',
    inversion:
      'Vergara ofrece las mayores extensiones de tierra por precio del Gualivá. ' +
      'Fincas ganaderas de 10 a 50 hectáreas con casa, corrales y agua permanente ' +
      'están disponibles a precios que duplican el valor por hectárea en dos años ' +
      'cuando se convierten en proyectos turísticos. El crecimiento del turismo ' +
      'de aventura en Tobia, a solo 20 minutos, jala la valorización de toda ' +
      'la región sur del Gualivá.',
    og_image: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
    geo_lat: 4.8333,
    geo_lng: -74.5167,
    wikipedia_url: 'https://es.wikipedia.org/wiki/Vergara_(Cundinamarca)',
    faqs: [
      {
        question: '¿Qué distingue a Vergara en el mercado inmobiliario del Gualivá?',
        answer:
          'Vergara es el municipio más tranquilo y menos urbanizado del Gualivá, ideal para quienes ' +
          'buscan fincas productivas con vocación agropecuaria a precios mínimos de la región. Su ' +
          'creciente conectividad lo posiciona como frontera de expansión del mercado inmobiliario ' +
          'rural de Cundinamarca.',
      },
      {
        question: '¿Cuánto cuesta una finca en Vergara, Cundinamarca?',
        answer:
          'Las fincas en Vergara tienen precios entre $80 y $350 millones COP, los más bajos de ' +
          'toda la región del Gualivá. Los lotes rurales de mediana extensión empiezan desde ' +
          '$25 millones.',
      },
    ],
  },
}

export function getMunicipioData(slug: string): MunicipioData | null {
  return MUNICIPIOS[slug] ?? null
}

export function getAllMunicipiosData(): MunicipioData[] {
  return Object.values(MUNICIPIOS)
}
