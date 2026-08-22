import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const ID = '94a75859-b88c-4794-8dd9-9b53d8c6c7e8' // Proyecto Cabañas Top 32
const REGLAS = [
  ['Proyecto Cabañas Top para vivir o rentar (Alta demanda turística/Airbnb)',
   'Proyecto Cabañas Top para vivir o rentar.',
   'mac_knowledge · «Alta demanda turística/Airbnb» — misma frase retirada de la ficha'],
  ['Entorno: Zona de alta valorización y tendencia turística. Los vecinos son',
   'Entorno: Los vecinos son',
   'mac_knowledge · «Zona de alta valorización y tendencia turística»'],
  ['Esta inversión incluye el lote de 500 m2',
   'El precio incluye el lote de 500 m2',
   'mac_knowledge · «Esta inversión incluye» → «El precio incluye»'],
]

const k = await prisma.macKnowledge.findUnique({ where: { id: ID }, select: { id: true, titulo: true, contenido: true } })
if (!k) { console.log('❌ entrada no encontrada'); process.exit(1) }
let c = k.contenido, fallos = []
for (const [b, r, etiqueta] of REGLAS) {
  if (!c.includes(b)) { console.log(`  ❌ NO ENCONTRADO — ${etiqueta}`); fallos.push(etiqueta); continue }
  c = c.split(b).join(r); console.log(`  ✓ ${etiqueta}`)
}
if (fallos.length) { console.log('\nAbortado: hay reglas sin encontrar.'); process.exit(1) }
if (APPLY) { await prisma.macKnowledge.update({ where: { id: ID }, data: { contenido: c } }); console.log('\n→ GUARDADO') }
else console.log('\nDRY-RUN — nada se escribió')
await prisma.$disconnect()
