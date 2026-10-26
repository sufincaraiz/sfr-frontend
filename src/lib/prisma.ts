import 'server-only'
// ↑ Si un componente de cliente importa esto (directa o indirectamente), el build
// ROMPE y nombra la cadena de imports. Sin esta línea el ORM se colaba al
// navegador en silencio: pasó con /admin/cifras vía lib/cifras-publicas.
import { PrismaClient } from '@prisma/client'
import { registrarPoolAgotado } from '@/lib/pool-agotado'
import {
  clasificarDestino, autorizacionDeEscritura, esEscritura, DestinoNoAutorizado,
} from '@/lib/destino-base'

/**
 * ¿PUEDE ESTE PROCESO ESCRIBIR EN LA BASE A LA QUE APUNTA?
 *
 * Se resuelve UNA vez y se recuerda: `DATABASE_URL` no cambia dentro de un
 * proceso, y recalcularlo en cada consulta sería trabajo en el camino caliente
 * para obtener siempre la misma respuesta.
 */
let veredictoDeEscritura: { puede: boolean; motivo: string; host: string | null } | null = null

function exigirDestinoParaEscrituraDeCliente(): void {
  if (!veredictoDeEscritura) {
    const d = clasificarDestino(process.env.DATABASE_URL)
    const v = autorizacionDeEscritura(d)
    veredictoDeEscritura = { ...v, host: d.host }
  }
  if (veredictoDeEscritura.puede) return
  throw new DestinoNoAutorizado(
    `${veredictoDeEscritura.motivo}\n\n` +
    '  Esta comprobación vive en el cliente de Prisma, así que cubre TODA escritura\n' +
    '  aunque quien la haga no sepa que existe.\n\n' +
    '  · Si querías la base aislada: no pases --env-file, o pasa .env.local.\n' +
    '  · Si de verdad hay que escribir en producción desde un guion, autorízalo\n' +
    '    para ESTA ejecución:\n' +
    `      ESCRIBIR_EN_PRODUCCION="${veredictoDeEscritura.host ?? '<host>'}" node --env-file=.env.produccion <guion>\n\n` +
    '  ⚠ Si esto sale en la APP DESPLEGADA, lo que falta es la variable\n' +
    '    SFR_DESTINO_DE_DESPLIEGUE en Vercel, con el host de la base dentro.',
    veredictoDeEscritura.host,
  )
}

/* `$extends` devuelve un cliente de tipo DISTINTO a PrismaClient, así que el
 * global se tipa a partir de la fábrica y no a mano: si la extensión cambia, el
 * tipo la sigue sin que haya que acordarse. */
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof construir> | undefined
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
/**
 * EL TAMAÑO DEL POOL EN EJECUCIÓN, DECLARADO.
 *
 * ⚠ CORRECCIÓN DE LO QUE SE DIJO EL 2026-10-16: «el 5 es un valor por defecto
 * que nadie eligió» era falso a medias. El `connection_limit=5` de abajo SÍ está
 * elegido y razonado —pero solo durante `next build`, porque la condición es
 * `NEXT_PHASE === 'phase-production-build'`—. **En ejecución no se declaraba
 * nada**, y ahi el defecto de Prisma es `num_cpus * 2 + 1`: un número que
 * depende de la máquina que toque, multiplicado por cada lambda concurrente.
 * El recurso escaso no es nuestro pool: es el proxy de Railway al otro lado.
 *
 * Se declara 3 por instancia: suficiente para las consultas en paralelo de una
 * página (`Promise.all` de cuatro o cinco) sin que veinte lambdas sumen cien
 * conexiones. `pool_timeout=20` deja margen al arranque en frío de Railway
 * antes de rendirse con P2024.
 *
 * SE RESPETA LO QUE VENGA EN LA URL: si alguien fija `connection_limit` en la
 * variable de entorno, manda esa. Declarar no es imponer.
 */
const LIMITE_EJECUCION = 'connection_limit=3&pool_timeout=20'

const rawUrl = process.env.DATABASE_URL
const enBuild = process.env.NEXT_PHASE === 'phase-production-build'
const runtimeUrl =
  !enBuild && rawUrl && !/[?&]connection_limit=/.test(rawUrl)
    ? rawUrl + (rawUrl.includes('?') ? '&' : '?') + LIMITE_EJECUCION
    : undefined

const buildUrl =
  process.env.NEXT_PHASE === 'phase-production-build' && rawUrl && !/[?&]connect_timeout=/.test(rawUrl)
    ? rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'connect_timeout=30&pool_timeout=30&connection_limit=5'
    : undefined

function construir() {
  return new PrismaClient({
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
    ...(runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : {}),
  }).$extends({
    /* ── P2024, LA SEÑAL QUE EL BUILD NO PUEDE DAR ──────────────────────────
     *
     * `verificar-build.mjs` cuenta los P2024 del log del build y no corre en
     * Vercel (se lanzaría a sí mismo). Envolver `next build` para cerrar ese
     * hueco se descartó: es la línea de más riesgo del proyecto y compra
     * detección en build de un problema que se manifiesta en EJECUCIÓN.
     *
     * Esto es la otra mitad. Se envuelve TODA operación, se deja pasar el
     * error intacto —`throw e` siempre— y solo se cuenta por el camino. El
     * contador vive en Redis, no en Postgres: ver lib/pool-agotado.ts. */
    query: {
      async $allOperations({ model, operation, args, query }) {
        /* ── A DÓNDE SE ESTÁ ESCRIBIENDO ────────────────────────────────────
         *
         * ⚠ ESTO ESTABA EN UN AYUDANTE QUE HABÍA QUE ACORDARSE DE LLAMAR, y de
         * los 28 guiones que escriben en la base lo llamaban CERO. Escribí que
         * «protege a los que vengan», y nada hacía que un guion futuro lo
         * invocara: era fail-closed para quien se acordara, que es otra forma
         * de decir fail-open.
         *
         * Aquí pasan TODAS las escrituras, sepa o no su autor que existe. */
        if (esEscritura(operation)) exigirDestinoParaEscrituraDeCliente()
        try {
          return await query(args)
        } catch (e) {
          if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2024') {
            /* Sin await: contar no puede retrasar ni alterar el error que sube. */
            void registrarPoolAgotado(`${model ?? 'raw'}.${operation}`)
          }
          throw e
        }
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? construir()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
