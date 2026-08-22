#!/usr/bin/env node
/**
 * SEGUNDO LOTE DEL 22/08
 * ======================
 *
 *  (4) Villeta: «más de 50.000 visitantes mensuales». Cifra sin fuente ni
 *      método en un campo pensado para ser citado. Caso 4 de §2. Salió de los
 *      campos SIN AUDITAR —`turismo` e `historia` de los 8 municipios, ~27.000
 *      caracteres—, que siguen pendientes.
 *
 *  (3) `mac_knowledge` debe ser DATO Y SOLO DATO. La entrada de La Rivera
 *      llevaba reglas de comportamiento («infórmalo siempre que menciones un
 *      precio», «no los cuentes como más de tres»). Son buenas reglas, pero su
 *      sitio es el prompt, donde se revisan. Una excepción declarada
 *      convertiría la regla en criterio, y el criterio es lo que dejó entrar a
 *      Tobia Chica. Las instrucciones se migran GENERALIZADAS a prompt.ts y
 *      aquí queda solo el hecho.
 *
 *      Tobia Chica se BORRA. Una fila desactivada que contiene un prompt de
 *      inyección no tiene por qué seguir existiendo.
 *
 *     node scripts/corregir-lote-22b.mjs           (dry-run)
 *     node scripts/corregir-lote-22b.mjs --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const ID_RIVERA = '6c42c2a1'
const ID_TOBIA = '5f7c0be7-8472-4814-ade9-88be3fae05c4'

let cambios = 0
const fallos = []

// ── (4) Villeta ──────────────────────────────────────────────────────────────
console.log('### villeta — cifra sin fuente')
const villeta = await prisma.municipality.findUnique({ where: { slug: 'villeta' }, select: { id: true, faqs: true } })
const faqs = JSON.parse(JSON.stringify(villeta?.faqs ?? []))
const VIEJO_V = 'Villeta es el municipio turístico más visitado del Gualivá con más de 50.000 visitantes mensuales.'
const NUEVO_V = 'Villeta es el municipio de clima cálido con más infraestructura turística del Gualivá.'
if (typeof faqs[0]?.answer === 'string' && faqs[0].answer.includes(VIEJO_V)) {
  faqs[0].answer = faqs[0].answer.replace(VIEJO_V, NUEVO_V)
  console.log('  ✓ faq[0] «más de 50.000 visitantes mensuales»')
  cambios++
} else { console.log('  ❌ NO ENCONTRADO — villeta faq[0]'); fallos.push('villeta') }

// ── (3) La Rivera: se queda solo con los hechos ──────────────────────────────
console.log('\n### mac_knowledge — La Rivera, solo hechos')
const todas = await prisma.macKnowledge.findMany({ select: { id: true, titulo: true, contenido: true } })
const rivera = todas.find(k => k.id.startsWith(ID_RIVERA))
const RIVERA_HECHOS = `Oferta especial vigente: TRES lotes disponibles en el Condominio Campestre La Rivera P.H.

- Lote N° 9: 1.550 m². Precio: $270.000.000 COP.
- Lote N° 27: 1.690 m². Precio: $310.000.000 COP.
- Lote N° 25: 1.940 m². Precio: $315.000.000 COP.

Los tres precios son negociables. La propuesta formal y el descuento final se acuerdan con el equipo comercial.

En la web hay DOS fichas que corresponden a estos mismos tres lotes: una general ("Lote en condominio campestre La Rivera", que muestra el Lote N° 9 como precio de entrada y menciona los tres) y la ficha propia del Lote N° 27. Son los mismos tres lotes de arriba.`
if (rivera && rivera.contenido !== RIVERA_HECHOS) {
  console.log('  ✓ reglas de comportamiento retiradas (migran a prompt.ts)')
  cambios++
} else { console.log('  ❌ NO ENCONTRADA — La Rivera'); fallos.push('rivera') }

// ── (3) Tobia Chica: borrada ────────────────────────────────────────────────
console.log('\n### mac_knowledge — Tobia Chica, borrada')
const tobia = await prisma.macKnowledge.findUnique({ where: { id: ID_TOBIA }, select: { titulo: true, activo: true, contenido: true } })
if (tobia) {
  console.log(`  ✓ «${tobia.titulo}» — ${tobia.contenido.length} car., activo=${tobia.activo}`)
  cambios++
} else { console.log('  ❌ NO ENCONTRADA — Tobia Chica'); fallos.push('tobia') }

console.log('\n' + '='.repeat(60))
console.log(`Cambios: ${cambios} · Fallos: ${fallos.length}`)
if (fallos.length) { console.log('ABORTADO'); await prisma.$disconnect(); process.exit(1) }

if (APPLY) {
  await prisma.municipality.update({ where: { id: villeta.id }, data: { faqs } })
  await prisma.macKnowledge.update({ where: { id: rivera.id }, data: { contenido: RIVERA_HECHOS } })
  await prisma.macKnowledge.delete({ where: { id: ID_TOBIA } })
  console.log('APLICADO')
} else console.log('DRY-RUN — nada se escribió')

await prisma.$disconnect()
