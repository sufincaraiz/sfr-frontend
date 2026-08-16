import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// SOLO en build (generación estática): si Railway está en frío, la conexión puede
// colgarse y dejar el build de Vercel pegado (cuelgue de 19 min por P1001). Un
// connect_timeout ACOTADO hace que, si la BD nunca responde, falle en ~30s y caiga
// al try/catch de los generateStaticParams (que devuelven []) en vez de colgarse.
// Debe ser tolerante: el arranque en frío de Railway y algún bache momentáneo bajo
// la carga del prerender (100+ fichas) tardan varios segundos; 8s cortaba de más y
// tumbaba el render de fichas (que sí necesita datos reales). 30s tolera eso y aun
// así acota el cuelgue. connection_limit=5 baja la presión sobre el proxy de Railway.
// En runtime se usa el DATABASE_URL sin cambios (NEXT_PHASE solo vale
// 'phase-production-build' durante `next build`).
const rawUrl = process.env.DATABASE_URL
const buildUrl =
  process.env.NEXT_PHASE === 'phase-production-build' && rawUrl && !/[?&]connect_timeout=/.test(rawUrl)
    ? rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'connect_timeout=30&pool_timeout=30&connection_limit=5'
    : undefined

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // SFR_LOG_QUERIES=1 enciende el log de consultas también en el build.
    // Lo usa `npm run build:verificado` para CONTARLAS: la malla de enlazado
    // multiplica los enlaces y cada enlace puede ser una consulta. El P2024 con
    // pool de 5 ya apareció dos veces por esa vía exacta —la vereda en consulta
    // aparte y `cargarEnlaces()` en `cache()` de React—, y las dos veces el
    // build terminó en verde. Contar es la única forma de verlo venir.
    log:
      process.env.NODE_ENV === 'development' || process.env.SFR_LOG_QUERIES === '1'
        ? ['query']
        : [],
    ...(buildUrl ? { datasources: { db: { url: buildUrl } } } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
