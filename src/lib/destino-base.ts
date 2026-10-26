/**
 * ¿A QUÉ BASE ESTOY ESCRIBIENDO?
 * ==============================
 *
 * Nace el 2026-10-26, después de dos semanas en las que **todo lo que se corrió
 * fue contra producción sin que nadie lo decidiera**: `.env.local` apunta a
 * Railway, y el nombre decía lo contrario de lo que era. Catorce ejecuciones,
 * incluido un `prisma db push`, fueron a la base real porque era lo cómodo.
 *
 * El renombrado de los archivos arregla una mitad: a partir de ahora el camino
 * cómodo —`npm run dev`, `npx prisma`, un guión sin banderas— lleva a la base
 * aislada, y tocar producción exige escribir `--env-file=.env.produccion` a
 * mano. Eso protege contra el **olvido**.
 *
 * Esto protege contra la otra mitad, que es peor porque no se siente como un
 * error: **escribir esa bandera a propósito, con prisa, para algo que parecía
 * inofensivo.** «Es aditiva y son cero filas» era verdad y aun así era un juicio
 * sobre el estado de hoy, no una propiedad de la operación.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FAIL-CLOSED, Y ESO SIGNIFICA ALGO CONCRETO
 *
 * No hay una lista de hosts de producción que haya que mantener al día —una
 * lista así falla justo cuando alguien añade un host nuevo, que es el momento
 * de más riesgo—. Al revés:
 *
 *   > Solo pasan los destinos que se reconocen como SEGUROS.
 *   > Todo lo demás se trata como producción, incluido lo que no se entiende.
 *
 * Una URL con una errata, un host nuevo, una cadena vacía: todos se niegan. La
 * única forma de escribir en algo que no está en la lista segura es autorizarlo
 * para esa ejecución concreta.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA AUTORIZACIÓN ES POR EJECUCIÓN, Y NO PUEDE QUEDARSE PUESTA
 *
 * Se pasa en la línea de comandos de esa corrida:
 *
 *     ESCRIBIR_EN_PRODUCCION="<host>" node --env-file=.env.produccion scripts/x.mjs
 *
 * Y lleva el HOST dentro, no un «sí». Un `sí` serviría para cualquier base y se
 * podría dejar escrito en un archivo; escribir el host obliga a mirar a dónde se
 * está apuntando, que es el acto que esta guarda existe para forzar.
 *
 * ⚠ LO QUE ESTA GUARDA NO CUBRE: `prisma db push` y `prisma migrate` son
 * binarios de Prisma y no pasan por aquí. A ésos los cubre el renombrado —sin
 * `--env-file` leen `.env.local`, que será la aislada— y nada más. Está dicho
 * aquí para que nadie suponga que están protegidos.
 *
 * Módulo HOJA: sin `@/`, sin `enum`, sin propiedades de constructor.
 */

export type ClaseDeDestino = 'SEGURO' | 'PRODUCCION_CONOCIDA' | 'DESCONOCIDO'

/**
 * Hosts que SÍ son seguros. Lista cerrada y corta a propósito.
 *
 * `BASES_AISLADAS` permite añadir el host de la base aislada cuando exista, sin
 * tocar código: va en `.env.local`, separado por comas.
 */
/* ⚠ `[::1]` va CON corchetes y `::1` a secas NO está: `new URL(...).hostname`
 * devuelve la forma con corchetes para IPv6, y una URL con el literal sin
 * corchetes ni siquiera se puede parsear. Una entrada que nunca puede coincidir
 * es peor que ausente: hace creer que ese caso está cubierto. Lo comprobé
 * ejecutándolo, no leyéndolo. */
export const HOSTS_SEGUROS = ['localhost', '127.0.0.1', '[::1]']

/**
 * Hosts que sabemos que son producción. **No es lo que decide**: solo sirve
 * para dar un mensaje mejor. Lo que decide es no estar en `HOSTS_SEGUROS`.
 */
export const HOSTS_DE_PRODUCCION = ['acela.proxy.rlwy.net']

export interface Destino {
  clase: ClaseDeDestino
  host: string | null
  /** Qué es esto, en una frase que se pueda leer en una consola. */
  queEs: string
}

/** Saca el host de una URL de conexión sin exponer la contraseña. */
export function hostDeLaBase(url: string | undefined | null): string | null {
  const s = typeof url === 'string' ? url.trim() : ''
  if (!s) return null
  try {
    /* `new URL` entiende postgresql:// y deja la contraseña en `password`, que
     * aquí no se toca ni se devuelve nunca. */
    const u = new URL(s)
    const h = u.hostname.toLowerCase()
    return h || null
  } catch {
    return null
  }
}

export function clasificarDestino(
  url: string | undefined | null,
  aisladas: string | undefined = process.env.BASES_AISLADAS,
): Destino {
  const host = hostDeLaBase(url)

  if (!host) {
    /* Sin host no se puede saber a dónde apunta, y «no se puede saber» es el
     * caso en el que más hay que negarse: una cadena rota apuntando a un sitio
     * por defecto escribiría donde nadie mira. */
    return {
      clase: 'DESCONOCIDO',
      host: null,
      queEs: 'no se pudo leer el host de DATABASE_URL (¿falta, o está mal escrita?)',
    }
  }

  const extra = String(aisladas ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  if (HOSTS_SEGUROS.includes(host) || extra.includes(host)) {
    return { clase: 'SEGURO', host, queEs: 'una base aislada' }
  }
  if (HOSTS_DE_PRODUCCION.includes(host)) {
    return { clase: 'PRODUCCION_CONOCIDA', host, queEs: 'la base de PRODUCCIÓN' }
  }
  return {
    clase: 'DESCONOCIDO',
    host,
    queEs:
      'un destino que no está en la lista de bases aisladas. No se supone que sea ' +
      'seguro: lo que no se reconoce se trata como producción',
  }
}

/** ¿Puede este destino recibir escrituras, con esta autorización? */
export function puedeEscribir(
  d: Destino,
  autorizacion: string | undefined = process.env.ESCRIBIR_EN_PRODUCCION,
): { puede: boolean; motivo: string } {
  if (d.clase === 'SEGURO') {
    return { puede: true, motivo: `escribiendo en ${d.host}, ${d.queEs}` }
  }

  const dada = String(autorizacion ?? '').trim().toLowerCase()
  if (!dada) {
    return {
      puede: false,
      motivo:
        `NO se escribe: ${d.host ?? '(sin host)'} es ${d.queEs}, y no hay autorización ` +
        'para esta ejecución.',
    }
  }

  /* La autorización lleva el HOST dentro. Un «sí» valdría para cualquier base y
   * se podría dejar escrito en un archivo; el host obliga a mirar a dónde se
   * apunta, que es el acto que esto existe para forzar. */
  if (!d.host || dada !== d.host.toLowerCase()) {
    return {
      puede: false,
      motivo:
        `NO se escribe: la autorización dice «${dada}» y el destino es ` +
        `«${d.host ?? '(sin host)'}». Tienen que coincidir.`,
    }
  }
  return { puede: true, motivo: `escribiendo en ${d.host} CON autorización explícita` }
}

/**
 * OPERACIONES DE LECTURA, lista cerrada.
 *
 * ⚠ Se enumeran las LECTURAS y no las escrituras, a propósito. Si se
 * enumeraran las escrituras, una operación nueva de Prisma —o uno de sus
 * nombres que no conocemos— caería del lado de «no es escritura» y pasaría sin
 * mirar. Enumerando lecturas, lo desconocido cae del lado seguro: se trata como
 * escritura y se comprueba.
 */
export const OPERACIONES_DE_LECTURA = [
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany',
  'count', 'aggregate', 'groupBy', 'queryRaw', 'findRaw', 'aggregateRaw',
]

export function esEscritura(operation: string | undefined | null): boolean {
  const op = typeof operation === 'string' ? operation.trim() : ''
  if (!op) return true // sin nombre, se asume lo peor
  return !OPERACIONES_DE_LECTURA.includes(op)
}

/**
 * ¿Está este proceso autorizado a escribir, mire donde mire?
 *
 * Tres llaves, y ninguna es «adivinar si soy la app»:
 *
 *   1. el destino es una base aislada → siempre;
 *   2. `SFR_DESTINO_DE_DESPLIEGUE` coincide con el host → es la app desplegada,
 *      autorizada **por su configuración**, no por detección de entorno. Si se
 *      detectara el entorno (`process.env.VERCEL`), un fallo de esa detección
 *      tumbaría producción, y ése es el lado por el que no se puede fallar;
 *   3. `ESCRIBIR_EN_PRODUCCION` coincide con el host → una persona lo autorizó
 *      para ESTA ejecución.
 *
 * La 2 y la 3 llevan nombres distintos y es deliberado: la 2 vive solo en
 * Vercel y `verificar-destinos.mjs` rompe el build si aparece en cualquier
 * `.env*` del repositorio. Si se pudiera dejar escrita en un archivo, volvería
 * a ser la autorización permanente que decidimos no tener.
 */
export function autorizacionDeEscritura(
  d: Destino,
  despliegue: string | undefined = process.env.SFR_DESTINO_DE_DESPLIEGUE,
  porEjecucion: string | undefined = process.env.ESCRIBIR_EN_PRODUCCION,
): { puede: boolean; motivo: string } {
  if (d.clase === 'SEGURO') {
    return { puede: true, motivo: `${d.host} es una base aislada` }
  }
  const dep = String(despliegue ?? '').trim().toLowerCase()
  if (dep && d.host && dep === d.host.toLowerCase()) {
    return { puede: true, motivo: 'la app desplegada, autorizada por su configuración' }
  }
  return puedeEscribir(d, porEjecucion)
}

export class DestinoNoAutorizado extends Error {
  host: string | null
  constructor(mensaje: string, host: string | null) {
    super(mensaje)
    this.name = 'DestinoNoAutorizado'
    this.host = host
  }
}

/**
 * La puerta. Se llama ANTES de la primera escritura, no después.
 *
 * No devuelve un booleano que el llamador pueda ignorar con un `if` olvidado:
 * se detiene. Es la misma forma que `exigirFirma` —detener, no sustituir—.
 */
export function exigirDestinoParaEscribir(
  url: string | undefined | null = process.env.DATABASE_URL,
  autorizacion: string | undefined = process.env.ESCRIBIR_EN_PRODUCCION,
  aisladas: string | undefined = process.env.BASES_AISLADAS,
): Destino {
  const d = clasificarDestino(url, aisladas)
  const v = puedeEscribir(d, autorizacion)
  if (!v.puede) {
    throw new DestinoNoAutorizado(
      `${v.motivo}\n\n` +
      '  Si de verdad hay que escribir ahí, autorízalo para ESTA ejecución:\n' +
      `    ESCRIBIR_EN_PRODUCCION="${d.host ?? '<host>'}" node --env-file=<archivo> <guion>\n\n` +
      '  Y si lo que querías era la base aislada, mira qué archivo de entorno estás\n' +
      '  pasando: sin --env-file se usa .env.local, que es la aislada.',
      d.host,
    )
  }
  return d
}
