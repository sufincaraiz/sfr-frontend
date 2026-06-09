import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const r = await p.property.groupBy({ by: ['status'], _count: { status: true } });
r.forEach(x => console.log(`  "${x.status}"  →  ${x._count.status} propiedad(es)`));
await p.$disconnect();
