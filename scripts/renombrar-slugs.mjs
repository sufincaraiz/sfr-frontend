#!/usr/bin/env node
/**
 * RENOMBRAR SLUGS DE PROPIEDAD — infraestructura, NO ejecutar sin lista
 * =====================================================================
 *
 * Los 36 slugs existentes tienen defectos heredados: tipo duplicado
 * (apartamento-apartamento-…), prefijo de otro tipo (finca-casa-…), o el
 * régimen «condominio» como si fuera tipo. El GENERADOR ya está corregido para
 * las nuevas; esto es para renombrar las viejas CUANDO el titular decida
 * cuáles —la decisión depende del tráfico e indexación real en Search Console,
 * porque son URLs de junio y renombrar una con enlaces entrantes pierde señal.
 *
 * QUÉ HACE, por id:
 *   1. Regenera el slug con la regla nueva (slugBasePropiedad + unicidad).
 *   2. Escribe una fila en `redirects` (source viejo → destination nuevo,
 *      permanent=true). Es 301 PERMANENTE y queda REGISTRADO en la base, no en
 *      memoria; next.config.ts la lee y el siguiente build lo sirve.
 *   3. Actualiza el slug de la propiedad.
 *   4. Notifica a IndexNow las URLs NUEVAS (ping directo, sin importar módulos
 *      del runtime de Next).
 *
 * NO revalida desde aquí: `revalidatePath` solo existe dentro del runtime de
 * Next, no en un script Node. Y no hace falta —un renombrado EXIGE deploy de
 * todos modos: next.config.ts lee la tabla `redirects` en el build y
 * `generateStaticParams` regenera la página con el slug nuevo—. El deploy es
 * parte del procedimiento, no un olvido.
 *
 * SIN ids → DRY-RUN de las 36: muestra viejo → nuevo y si cambiaría, para que
 * el titular marque cuáles renombrar y cuáles congelar. No escribe nada.
 *
 *     node scripts/renombrar-slugs.mjs                      dry-run de las 36
 *     node scripts/renombrar-slugs.mjs --apply id1 id2 …    renombra ESOS ids
 *
 * NO tiene modo «--apply» global a propósito: renombrar todo de golpe es justo
 * lo que el titular quiere evitar hasta ver los datos de Search Console.
 */
import { PrismaClient } from '@prisma/client'
import { readdirSync } from 'node:fs'
import { slugBasePropiedad, slugify } from '../src/lib/slug.ts'

const prisma = new PrismaClient()

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sufincaraiz.com'

/** Ping directo a IndexNow, sin importar el módulo del runtime (@/lib/site). */
async function pingIndexNow(urls, motivo) {
  const key = readdirSync('public').find(f => /^[0-9a-f]{32}\.txt$/.test(f))?.replace('.txt', '')
  if (!key) { console.warn(`  [indexnow] sin clave en public/; no se notifica`); return }
  try {
    const host = new URL(SITE).host
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(15000),
    })
    console.log(`  [indexnow] ${motivo}: HTTP ${res.status}`)
  } catch (e) {
    console.warn(`  [indexnow] ${motivo}: ${e instanceof Error ? e.message : e}`)
  }
}
const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const IDS = args.filter(a => a !== '--apply')

if (APPLY && IDS.length === 0) {
  console.error('--apply requiere al menos un id. Sin ids es dry-run. NO hay apply global.')
  process.exit(1)
}

const donde = APPLY ? { id: { in: IDS } } : {}
const props = await prisma.property.findMany({
  where: donde,
  select: { id: true, slug: true, title: true, type: true, vereda: { select: { slug: true } }, municipality: { select: { name: true, slug: true } } },
  orderBy: { slug: 'asc' },
})

const libre = async (s, exceptoId) =>
  (await prisma.property.count({ where: { slug: s, ...(exceptoId ? { id: { not: exceptoId } } : {}) } })) === 0

async function slugUnico(base, veredaSlug, id) {
  if (await libre(base, id)) return base
  const conVereda = veredaSlug ? `${base.replace(/-cundinamarca$/, '')}-${veredaSlug}-cundinamarca` : null
  if (conVereda && await libre(conVereda, id)) return conVereda
  const raiz = conVereda ?? base
  let s = raiz
  for (let n = 2; n < 100 && !(await libre(s, id)); n++) s = `${raiz}-${n}`
  return s
}

let cambian = 0
for (const p of props) {
  const base = slugBasePropiedad(p.title, p.type, slugify(p.municipality?.name ?? 'la-vega'))
  const nuevo = await slugUnico(base, p.vereda?.slug ?? null, p.id)
  const igual = nuevo === p.slug
  if (!igual) cambian++
  console.log(`${igual ? '  =' : '  →'} ${p.slug}`)
  if (!igual) console.log(`       ${nuevo}`)

  if (APPLY && !igual) {
    // El redirect va ANTES de cambiar el slug: si algo falla después, al menos
    // la URL vieja no queda en 404.
    await prisma.redirect.upsert({
      where: { source: `/propiedad/${p.slug}` },
      update: { destination: `/propiedad/${nuevo}`, permanent: true },
      create: { source: `/propiedad/${p.slug}`, destination: `/propiedad/${nuevo}`, permanent: true },
    })
    await prisma.property.update({ where: { id: p.id }, data: { slug: nuevo } })
    const urls = [`${SITE}/propiedad/${nuevo}`]
    if (p.municipality?.slug) urls.push(`${SITE}/municipios/${p.municipality.slug}`)
    await pingIndexNow(urls, `slug renombrado ${nuevo}`)
    console.log(`       ✓ renombrado · redirect 301 registrado en la tabla · DESPLIEGA para que surta efecto`)
  }
}

console.log(`\n${'='.repeat(60)}`)
console.log(`${props.length} fichas · ${cambian} cambiarían de slug`)
console.log(APPLY ? `APLICADO a ${IDS.length} id(s)` : 'DRY-RUN — nada se escribió. Pasa --apply con ids concretos.')
await prisma.$disconnect()
