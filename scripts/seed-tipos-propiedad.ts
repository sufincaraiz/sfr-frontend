/**
 * Siembra el catálogo de tipos de inmueble (tabla property_types).
 *
 * Idempotente: hace upsert por slug, así que se puede correr las veces que sea.
 * Los slugs coinciden exactamente con los valores que ya tiene `Property.type`
 * (finca, casa, condominio, lote, apartamento, local), por lo que ninguna
 * propiedad existente cambia ni queda huérfana.
 *
 *   npx tsx scripts/seed-tipos-propiedad.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_TIPOS } from '../src/lib/property-types';

// Prisma CLI lee .env; este script se corre suelto, así que cargamos .env.local.
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const linea of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    const clave = m?.[1];
    if (clave && !process.env[clave]) process.env[clave] = (m?.[2] ?? '').replace(/^["']|["']$/g, '').trim();
  }
}

const prisma = new PrismaClient();

async function main() {
  for (const tipo of DEFAULT_TIPOS) {
    const res = await prisma.tipoPropiedad.upsert({
      where: { slug: tipo.slug },
      // No pisamos label/plural si el admin ya los editó: solo aseguramos que exista.
      update: {},
      create: { slug: tipo.slug, label: tipo.label, plural: tipo.plural, orden: tipo.orden },
    });
    console.log(`  ${res.slug.padEnd(16)} ${res.label}`);
  }

  const huerfanos = await prisma.property.groupBy({ by: ['type'], _count: { _all: true } });
  const conocidos = new Set(DEFAULT_TIPOS.map(t => t.slug));
  for (const h of huerfanos) {
    if (conocidos.has(h.type)) continue;
    // Un tipo que existe en propiedades pero no en el catálogo: lo registramos
    // para que siga apareciendo en los filtros.
    await prisma.tipoPropiedad.upsert({
      where: { slug: h.type },
      update: {},
      create: { slug: h.type, label: h.type, orden: 200 },
    });
    console.log(`  ${h.type.padEnd(16)} (recuperado de ${h._count._all} propiedades)`);
  }

  const total = await prisma.tipoPropiedad.count();
  console.log(`\nCatálogo: ${total} tipos.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
