import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const pruebas = ['La Ceibita', 'Ceibita', 'Finca La Ceibita en Guacamayas', 'Finca La Ceibita', 'Guacamayas']
for (const t of pruebas) {
  const n = await p.property.count({
    where: { status: 'available', OR: [
      { title: { contains: t, mode: 'insensitive' } },
      { short_description: { contains: t, mode: 'insensitive' } },
      { description: { contains: t, mode: 'insensitive' } },
      { vereda: { name: { contains: t, mode: 'insensitive' } } },
    ] },
  })
  console.log(`${n === 0 ? '❌' : '✓'} "${t}" → ${n} resultado(s)`)
}
await p.$disconnect()
