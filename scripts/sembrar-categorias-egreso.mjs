#!/usr/bin/env node
/**
 * SIEMBRA DE CATEGORÍAS DE EGRESO — idempotente.
 *
 * Va en un script y no en el SQL de migración a propósito: el SQL archivado en
 * prisma/migraciones-aplicadas/ solo admite estructura, nunca datos (lo vigila
 * scripts/verificar-migraciones-sql.mjs).
 *
 * `orden` aquí es solo el desempate inicial: en pantalla las categorías se
 * ordenan por uso real de los últimos 90 días (ver lib/finanzas/captura.ts).
 *
 * `es_deducible_por_defecto` de «Atención a clientes» queda en false: los
 * gastos de atención tienen límites de deducibilidad y esa decisión es del
 * contador, no nuestra. Quien registre puede marcarlo deducible a mano.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORIAS = [
  { nombre: 'Atención a clientes',        grupo: 'operativo', orden: 10, es_deducible_por_defecto: false, concepto_retencion_sugerido: null },
  { nombre: 'Transporte a visitas',       grupo: 'operativo', orden: 20, es_deducible_por_defecto: true,  concepto_retencion_sugerido: null },
  { nombre: 'Trámites y documentos',      grupo: 'operativo', orden: 30, es_deducible_por_defecto: true,  concepto_retencion_sugerido: null },
  { nombre: 'Mensajería y envíos',        grupo: 'operativo', orden: 40, es_deducible_por_defecto: true,  concepto_retencion_sugerido: 'servicios' },
  { nombre: 'Publicidad de una propiedad',grupo: 'operativo', orden: 50, es_deducible_por_defecto: true,  concepto_retencion_sugerido: 'servicios' },
  { nombre: 'Fotografía y dron de una propiedad', grupo: 'operativo', orden: 60, es_deducible_por_defecto: true, concepto_retencion_sugerido: 'servicios' },
  { nombre: 'Viáticos',                   grupo: 'operativo', orden: 70, es_deducible_por_defecto: true,  concepto_retencion_sugerido: null },
]

const main = async () => {
  let creadas = 0
  for (const c of CATEGORIAS) {
    const previa = await prisma.categoriaEgreso.findUnique({ where: { nombre: c.nombre } })
    if (previa) { console.log(`  · ya existía: ${c.nombre}`); continue }
    // `genera_iva_descontable` queda en false: hoy NO somos responsables de
    // IVA, así que el IVA pagado es costo. Si eso cambia, lo cambia el año
    // fiscal, no esta siembra.
    await prisma.categoriaEgreso.create({ data: { ...c, genera_iva_descontable: false } })
    creadas++
    console.log(`  + creada: ${c.nombre}`)
  }
  const total = await prisma.categoriaEgreso.count()
  console.log(`\n${creadas} creada(s) · ${total} categorías en total.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
