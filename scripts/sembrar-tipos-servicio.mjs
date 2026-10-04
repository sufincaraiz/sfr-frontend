#!/usr/bin/env node
/**
 * SIEMBRA DE TIPOS DE SERVICIO — idempotente.
 *
 * Las cinco líneas de ingreso del negocio, tomadas del contexto del RUT.
 *
 * ⚠ `ciiu` queda en NULL a propósito: lo confirma el contador (pregunta 4 del
 * formulario /interno/datos-contador). No se precarga ninguna suposición,
 * porque un CIIU inventado haría que el ICA se liquidara con la tarifa de otra
 * actividad sin que nadie lo note. Un ingreso sin CIIU detiene el cálculo de
 * ICA en vez de adivinar.
 *
 * `genera_iva` en false: hoy el año NO es responsable de IVA. Esa decisión vive
 * en el parámetro fiscal del año, no aquí; este campo solo dice si la línea
 * sería gravada el día que lo sea.
 *
 * `concepto_retencion_sugerido` apunta al CONCEPTO, nunca a una tarifa: las
 * tarifas viven en los parámetros del año.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TIPOS = [
  { slug: 'comision-venta',      label: 'Comisión por venta',          concepto_retencion_sugerido: 'comisiones',  orden: 10 },
  { slug: 'estudio-titulos',     label: 'Acompañamiento en títulos',   concepto_retencion_sugerido: 'honorarios',  orden: 20 },
  { slug: 'analisis-valor',      label: 'Análisis comercial de valor', concepto_retencion_sugerido: 'honorarios',  orden: 30 },
  { slug: 'dron-fotogrametria',  label: 'Dron y fotogrametría',        concepto_retencion_sugerido: 'servicios',   orden: 40 },
  { slug: 'gestion-proyectos',   label: 'Gestión de proyectos',        concepto_retencion_sugerido: 'honorarios',  orden: 50 },
]

const main = async () => {
  let creados = 0
  for (const t of TIPOS) {
    const previo = await prisma.tipoServicio.findUnique({ where: { slug: t.slug } })
    if (previo) { console.log(`  · ya existía: ${t.label}`); continue }
    await prisma.tipoServicio.create({ data: { ...t, ciiu: null, genera_iva: false } })
    creados++
    console.log(`  + creado: ${t.label} (CIIU pendiente del contador)`)
  }
  const total = await prisma.tipoServicio.count()
  const sinCiiu = await prisma.tipoServicio.count({ where: { ciiu: null } })
  console.log(`\n${creados} creado(s) · ${total} tipos en total · ${sinCiiu} sin CIIU (pendiente del contador).`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
