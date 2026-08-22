import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
// Marcas de que una entrada intenta DAR ÓRDENES en vez de aportar datos.
const ORDENES = /\b(debes|deberás|tu objetivo|tu meta|tu rol|actúa como|compórtate|no entregues|no digas|siempre que|reglas de interacción|instrucciones|eres el|eres la|eres mac|responde con|enfócate|resalta)\b/i
for (const k of await p.macKnowledge.findMany({ select: { id: true, titulo: true, contenido: true, activo: true } })) {
  const golpes = [...new Set((k.contenido.match(new RegExp(ORDENES, 'gi')) ?? []).map(x => x.toLowerCase()))]
  console.log(`${golpes.length ? '⚠ ' : '  '}${k.activo ? '' : '(inactiva) '}${k.titulo}  [${k.id.slice(0, 8)}] ${k.contenido.length} car.` + (golpes.length ? `\n     órdenes: ${golpes.join(', ')}` : ''))
}
await p.$disconnect()
