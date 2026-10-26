#!/usr/bin/env node
/**
 * QUIEN ESCRIBE EN LA BASE, COMPRUEBA ANTES A DÓNDE
 * =================================================
 *
 * ⚠ ESTA GUARDA NACE DE DOS SEMANAS ESCRIBIENDO EN PRODUCCIÓN SIN DECIDIRLO.
 *
 * `.env.local` apuntaba a Railway. El nombre decía lo contrario de lo que era,
 * así que nadie lo abrió: era plausible. Catorce ejecuciones, incluido un
 * `prisma db push`, fueron a la base real porque era el camino cómodo.
 *
 * El renombrado arregla el olvido —ahora lo cómodo lleva a la base aislada—.
 * Esto arregla lo otro: **escribir `--env-file=.env.produccion` a propósito,
 * con prisa, para algo que parecía inofensivo.**
 *
 * LA REGLA
 *
 *   Todo guión que escriba en la base llama a `exigirDestinoParaEscribir`
 *   antes de la primera escritura, o declara aquí por qué no.
 *
 * Y es de DOS DIRECCIONES, como las demás: si una excepción deja de hacer falta
 * —porque ese guión ya no escribe— también se pone en rojo, para que la lista
 * no se llene de razones caducas que nadie relee.
 */
import { globSync, readFileSync } from 'node:fs'

/* Guiones que escriben y NO comprueban el destino, con su razón.
 *
 * Casi todos son de un solo uso y YA SE EJECUTARON: se conservan como registro
 * de qué se le hizo a los datos y cuándo, no para volver a correrlos. Añadir la
 * guarda a un guión que nadie va a ejecutar no protege nada y además cambiaría
 * el texto de un registro histórico. */
const SIN_GUARDA_A_PROPOSITO = [
  { archivo: 'scripts/mutar.mjs',
    porque: 'no escribe en la BASE: escribe ARCHIVOS del repositorio para mutarlos, y los restaura byte a byte.' },
  { archivo: 'scripts/inventario-decisiones.mjs',
    porque: 'no escribe en la base: lee el repositorio y escribe su propio inventario.' },
  { archivo: 'scripts/probar-panel-notarial.mjs',
    porque: 'arnés con cliente de base FALSO en memoria; no abre ninguna conexión.' },
]

/** Lo de un solo uso, ya corrido. Se agrupa porque la razón es la misma. */
const YA_CORRIERON = [
  'scripts/sembrar-tipos-servicio.mjs', 'scripts/sembrar-categorias-egreso.mjs',
  'scripts/regenerar-metas.mjs', 'scripts/sanear-cuerpos-lote2.mjs',
  'scripts/sanear-cifras.mjs', 'scripts/sanear-7-cuerpos.mjs',
  'scripts/reescribir-metas.mjs', 'scripts/renombrar-slugs.mjs',
  'scripts/migrar-servicios.mjs', 'scripts/fusionar-cinco.mjs',
  'scripts/fusionar-alban.mjs', 'scripts/quitar-el-pan.mjs',
  'scripts/publicar-acceso-derivado.mjs', 'scripts/corregir-hechos-adversos.mjs',
  'scripts/corregir-lote-23.mjs', 'scripts/limpiar-conocimiento.mjs',
  'scripts/publicar-datos-recuperados.mjs', 'scripts/migrar-antes-de-comprar.mjs',
  'scripts/corregir-lote-22b.mjs', 'scripts/corregir-valorizacion-guia-blog.mjs',
  'scripts/retirar-tobia-chica.mjs', 'scripts/corregir-valorizacion-municipios.mjs',
  'scripts/corregir-mac-knowledge.mjs', 'scripts/corregir-valorizacion.mjs',
  'scripts/seed-tipos-propiedad.ts',
]

const ESCRIBE = /\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(|\$executeRaw/
const COMPRUEBA = /\bexigirDestinoParaEscribir\s*\(/

const norm = p => p.replace(/\\/g, '/')

/* ⚠ ESTA GUARDA SE CONTABA A SÍ MISMA. Su propio patrón lleva el literal
 * `$executeRaw` dentro, así que casaba con su propio código fuente y aparecía
 * en el informe como un guión que escribe en la base y que —cómo no— cumple la
 * regla. Un instrumento que se mide a sí mismo da un verde que no significa
 * nada: inflaba la cuenta de «comprueban el destino» de 0 a 1.
 *
 * Se excluye este archivo, y no por elegancia: era la diferencia entre «hay
 * uno protegido» y «no hay ninguno», que es justo lo que había que ver. */
const YO = norm(import.meta.filename)
const archivos = [...globSync('scripts/**/*.mjs'), ...globSync('scripts/**/*.ts')]
  .filter(f => !YO.endsWith(norm(f)))

const escritores = []
for (const f of archivos) {
  const txt = readFileSync(f, 'utf8')
  if (ESCRIBE.test(txt)) escritores.push({ archivo: norm(f), comprueba: COMPRUEBA.test(txt) })
}

const declarados = new Set([...SIN_GUARDA_A_PROPOSITO.map(e => e.archivo), ...YA_CORRIERON])
const mudos = escritores.filter(e => !e.comprueba && !declarados.has(e.archivo))

const presentes = new Set(escritores.map(e => e.archivo))
const conGuarda = new Set(escritores.filter(e => e.comprueba).map(e => e.archivo))
const caducas = [...declarados].filter(a => !presentes.has(a) || conGuarda.has(a))

console.log('\n══ QUIEN ESCRIBE, COMPRUEBA A DÓNDE ══════════════════════════')
console.log(`  guiones que escriben: ${escritores.length}`)
console.log(`  comprueban el destino: ${escritores.filter(e => e.comprueba).length}`)
console.log(`  declarados sin guarda: ${declarados.size} (${SIN_GUARDA_A_PROPOSITO.length} por su naturaleza · ${YA_CORRIERON.length} de un solo uso, ya corridos)`)

if (mudos.length) {
  console.log('\n  ✗ ESCRIBEN EN LA BASE SIN MIRAR A DÓNDE:')
  for (const m of mudos) console.log(`     · ${m.archivo}`)
  console.log('\n  Llama a `exigirDestinoParaEscribir()` antes de la primera escritura,')
  console.log('  o declara aquí por qué este guión no lo necesita. Lo que no vale es')
  console.log('  que un guión nuevo pueda escribir en producción sin enterarse.')
}

if (caducas.length) {
  console.log('\n  ✗ RAZONES CADUCAS (la excepción ya no hace falta):')
  for (const c of caducas) {
    console.log(`     · ${c} — ${presentes.has(c) ? 'ya comprueba el destino' : 'ya no escribe'}`)
  }
  console.log('\n  Bórrala de la lista. Una lista de excepciones con razones vencidas')
  console.log('  se deja de leer entera, y entonces no protege nada.')
}

if (!mudos.length && !caducas.length) {
  console.log('  → todos comprueban el destino o tienen su razón escrita.')
}

process.exit(mudos.length || caducas.length ? 1 : 0)
