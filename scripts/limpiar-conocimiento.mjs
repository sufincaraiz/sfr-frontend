#!/usr/bin/env node
/**
 * `mac_knowledge` SE QUEDA SOLO CON LO QUE NO ESTÁ EN LA FICHA
 * ===========================================================
 *
 * Dos limpiezas en una, y las dos por la misma razón: un dato escrito en dos
 * sitios se desincroniza. Es lo que pasó con `description` y
 * `short_description`, con `TIPO_LINKS`, con el clima del prompt y con el
 * kilometraje de los municipios.
 *
 *  1. Lo que se acaba de PUBLICAR en la ficha sale de aquí. Mac no lo pierde:
 *     lo lee con `detalle_propiedad`, de la ficha, que pasa a ser la única
 *     fuente.
 *
 *  2. Las INSTRUCCIONES salen de aquí y se generalizan en el prompt. Es la
 *     tercera vez que aparecen dentro del conocimiento —Tobia Chica, La Rivera
 *     y ahora esta— y la frontera ya está cerrada: el conocimiento es DATO.
 *     Las cuatro reglas (servicios no instalados, tiempos aproximados,
 *     características desfavorables, construir) viven en `prompt.ts`.
 *
 *     node scripts/limpiar-conocimiento.mjs           (dry-run)
 *     node scripts/limpiar-conocimiento.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

/** id corto → [[buscar, reemplazar, etiqueta]] */
const REGLAS = {
  // ── Lote campestre de 500 m² ──────────────────────────────────────────────
  '1f9aaa96': [
    ['NO presentar el inmueble únicamente como "un lote".\n\nPresentarlo como una oportunidad para materializar un proyecto de descanso, turismo o inversión.\n\n', '',
     'lote · instrucción de encuadre comercial'],
    ['El lote se encuentra aproximadamente a 1,3 kilómetros del Parque Principal de La Vega, Cundinamarca.\nPara llegar al inmueble se toma la vía hacia la Laguna El Tabacal y posteriormente se llega al sector conocido como El Cucharal.\nEl recorrido es de aproximadamente 8 minutos en vehículo desde el Parque Principal de La Vega.\n\nCuando un cliente pregunte por la ubicación, responder de manera sencilla:\n"El lote está en el sector El Cucharal, a aproximadamente 1,3 km del Parque Principal de La Vega. Se llega tomando la vía hacia la Laguna El Tabacal y el recorrido es de unos 8 minutos en carro."\nNo afirmar tiempos exactos de recorrido en condiciones particulares de tráfico. Utilizar "aproximadamente".',
     'Para llegar al inmueble se toma la vía hacia la Laguna El Tabacal. El sector, la distancia y el tiempo están PUBLICADOS EN LA FICHA: léelos de ahí.',
     'lote · ubicación publicada + guion de respuesta'],
    ['El lote cuenta con:\n- Matrícula inmobiliaria independiente.\nEsta característica debe destacarse como una fortaleza del inmueble.',
     'El lote cuenta con matrícula inmobiliaria independiente.',
     'lote · «debe destacarse como una fortaleza»'],
    ['Utilizar expresiones como:\n\n"ideal para pensar en..."\n"atractivo para desarrollar..."\n"con potencial para..."\n"según la normatividad y los permisos aplicables.".\n\n', '',
     'lote · guion de expresiones'],
    ['Existe viabilidad para:\nAGUA:\nAcueducto veredal.\nENERGÍA:\nEnel-Codensa.\nALCANTARILLADO:\nSistema mediante pozo séptico.\nINTERNET:\nPosibilidad de conexión mediante operadores locales o Starlink, sujeto a disponibilidad y condiciones técnicas del servicio.\n\nIMPORTANTE:\nUtilizar "viabilidad" o "posibilidad de conexión".\nNO afirmar que los servicios ya están instalados dentro del lote si esta información no está confirmada.\nNO afirmar que Starlink está instalado.\nNO garantizar disponibilidad, velocidad, costos o condiciones de los operadores.',
     'Los servicios con viabilidad están PUBLICADOS EN LA FICHA: léelos de ahí. Cómo se habla de un servicio no instalado es una regla general y está en tus instrucciones.',
     'lote · servicios publicados + las cuatro prohibiciones (→ prompt)'],
    ['El predio posee un relieve inclinado.\nNO presentar la inclinación como un defecto.\nExplicar que el relieve puede aportar características atractivas para determinados proyectos:',
     'El predio posee un relieve inclinado. Este dato NO está publicado en la ficha todavía: dilo si preguntan por la topografía. El relieve puede aportar:',
     'lote · relieve, la instrucción pasa a regla general'],
    ['IMPORTANTE:\n\nNo prometer que se puede construir sin obras de adecuación.\nNo afirmar que el terreno es "100% plano".\nNo ocultar la condición de relieve inclinado si el cliente pregunta por la topografía.\nLa respuesta debe ser transparente y convertir la característica en una oportunidad de diseño, sin exagerarla.\n', '',
     'lote · prohibiciones de topografía (→ prompt)'],
  ],

  // ── La Rivera — El proyecto ───────────────────────────────────────────────
  '0a1ea543': [
    [' El trayecto desde el pueblo toma entre 15 y 18 minutos en carro.', '',
     'La Rivera · tiempo, ya publicado en la ficha'],
    ['VÍAS DE ACCESO: vía carreteable con tramos mixtos (asfaltada, placa huella y destapada). Sé honesto pero positivo: está a solo 15-18 minutos del centro de La Vega y es el camino ideal para desconectarse de la ciudad.',
     'VÍAS DE ACCESO: vía carreteable con tramos mixtos (asfaltada, placa huella y destapada).',
     'La Rivera · «sé honesto pero positivo» (→ regla general de características desfavorables)'],
  ],

  // ── La Rivera — Legal y servicios ─────────────────────────────────────────
  '9c025be9': [
    ['RÉGIMEN: Propiedad Horizontal (P.H.). Cada lote cuenta con su matrícula inmobiliaria independiente.',
     'RÉGIMEN: Propiedad Horizontal (P.H.).',
     'La Rivera · matrícula, ya publicada en la ficha'],
    ['QUÉ SE VENDE: únicamente el lote, no incluye construcción. Si preguntan si venden casas hechas, aclara enseguida que la oportunidad es comprar el lote y construir la casa a su medida. Se permite construir hasta DOS (2) niveles.',
     'QUÉ SE VENDE: únicamente el lote, no incluye construcción. Se permite construir hasta DOS (2) niveles.',
     'La Rivera · «aclara enseguida que la oportunidad es…»'],
    ['ADMINISTRACIÓN: la cuota se calcula por coeficiente y oscila entre $400.000 y $450.000 COP mensuales.\n\n', '',
     'La Rivera · administración, ya publicada en la ficha con fecha de corte'],
    ['SERVICIOS PÚBLICOS: el condominio cuenta con alcantarillado (también es viable instalar pozo séptico). Hay viabilidad total de agua y energía, con red eléctrica subterránea. El comprador solo debe solicitar la matrícula.',
     'SERVICIOS PÚBLICOS: publicados en la ficha. El comprador solo debe solicitar la matrícula del servicio.',
     'La Rivera · servicios, ya publicados en la ficha'],
  ],

  // ── Cabañas Top 32 ────────────────────────────────────────────────────────
  '94a75859': [
    ['Cada lote tiene 500 m2, cuenta con matrícula inmobiliaria totalmente independiente y plano topográfico.',
     'Cada lote tiene 500 m2.',
     'Cabañas · matrícula y plano, ya publicados en la ficha'],
    [' Hay disponibilidad para conexión a internet por fibra óptica, antena o Starlink.', '',
     'Cabañas · internet, ya publicado en la ficha'],
    ['Ubicación: Sector El Cucharal. Se toma la vía hacia el Parque Ecológico Laguna el Tabacal. Queda a solo 1.2 kilómetros del parque principal de La Vega (muy cerca del pueblo, mucho antes de llegar a la Laguna que está a 7 km).',
     'Ubicación: se toma la vía hacia el Parque Ecológico Laguna el Tabacal. Sector y distancias están publicados en la ficha.',
     'Cabañas · ubicación y distancias, ya publicadas en la ficha'],
  ],
}

let cambios = 0
const fallos = []

const todas = await prisma.macKnowledge.findMany({ select: { id: true, titulo: true, contenido: true } })

for (const [corto, reglas] of Object.entries(REGLAS)) {
  const k = todas.find(x => x.id.startsWith(corto))
  if (!k) { console.log(`\n### ❌ NO ENCONTRADA: ${corto}`); fallos.push(corto); continue }
  console.log(`\n### ${k.titulo}`)
  let c = k.contenido
  for (const [buscar, reemplazar, etiqueta] of reglas) {
    if (!c.includes(buscar)) { console.log(`  ❌ NO ENCONTRADO — ${etiqueta}`); fallos.push(etiqueta); continue }
    c = c.split(buscar).join(reemplazar)
    console.log(`  ✓ ${etiqueta}`)
    cambios++
  }
  const delta = c.length - k.contenido.length
  console.log(`  → ${k.contenido.length} → ${c.length} car. (${delta})`)
  if (APPLY && c !== k.contenido) await prisma.macKnowledge.update({ where: { id: k.id }, data: { contenido: c } })
}

console.log('\n' + '='.repeat(60))
console.log(`Cambios: ${cambios} · Fallos: ${fallos.length}`)
if (fallos.length) { console.log('ABORTADO'); await prisma.$disconnect(); process.exit(1) }
console.log(APPLY ? 'APLICADO' : 'DRY-RUN — nada se escribió')
await prisma.$disconnect()
