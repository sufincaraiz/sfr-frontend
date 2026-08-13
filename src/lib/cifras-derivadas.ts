import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// CIFRAS DERIVADAS DE LA BASE — con su metodología, que se publica al lado.
//
// La doctrina §3.6 exige que todo dato lleve origen: «Datos propios de Su Finca
// Raíz sobre N operaciones, corte agosto de 2026». Un dato sin metodología no se
// cita; peor, un dato con metodología implícita se malinterpreta.
//
// ⚠ ADVERTENCIA QUE GOBIERNA TODO ESTE MÓDULO
//
// La base de datos contiene registros desde el 9 de junio de 2026. La empresa
// opera desde 2018. Por tanto NINGUNA de estas cifras mide la trayectoria de la
// empresa: miden la era del catálogo digital, que son unos dos meses.
//
// Publicar «35 propiedades gestionadas» junto a «8 años en el territorio» le
// dice a un lector —y a un modelo— que la empresa hace cuatro propiedades al
// año. Publicar «1 operación cerrada» es peor todavía. La cifra sería literal-
// mente cierta y sustancialmente falsa, que es la peor clase de dato: pasa el
// filtro de veracidad y destruye la credibilidad igual.
//
// Por eso estas funciones devuelven SIEMPRE la cifra junto a su periodo y su
// metodología, y quien las use está obligado a mostrar ambos.
// ─────────────────────────────────────────────────────────────────────────────

export interface CifraDerivada {
  valor: number
  /** Qué cuenta exactamente y qué excluye. Se publica junto al número. */
  metodologia: string
  /** Fecha del registro más antiguo que entra en el cálculo. */
  desde: string | null
  /** Fecha de corte del cálculo. */
  corte: string
}

const hoy = () => new Date().toISOString().slice(0, 10)

// ─────────────────────────────────────────────────────────────────────────────
// INVENTARIO EN PRESENTE — la única familia de cifras segura por definición.
//
// Doctrina §2, regla de tiempo verbal: una cifra en presente describe un estado
// verificable ahora mismo (se comprueba abriendo el catálogo) y no implica
// ninguna historia. Las acumuladas sí, y por eso quedan fuera.
// ─────────────────────────────────────────────────────────────────────────────

/** Propiedades disponibles ahora mismo. 0 si la base no responde. */
export async function contarPropiedadesDisponibles(): Promise<number> {
  return conFallback(() => prisma.property.count({ where: { status: 'available' } }), 0)
}

/**
 * Frase de inventario lista para meta descriptions y textos de servicio.
 *
 * Redondea a la decena inferior («Más de 30» con 34) por dos razones: no obliga
 * a redesplegar cada vez que entra o sale una propiedad, y «más de N» sigue
 * siendo cierto mientras el inventario no baje de esa decena.
 *
 * Si no hay dato —base caída o catálogo vacío— devuelve una frase SIN cifra.
 * Nunca «0 propiedades disponibles»: un cero aquí es peor que no decir nada.
 */
export async function fraseInventario(): Promise<string> {
  const n = await contarPropiedadesDisponibles()
  if (n <= 0) return 'Fincas, lotes y casas campestres verificados'
  if (n < 10) return `${n} propiedad${n === 1 ? '' : 'es'} disponible${n === 1 ? '' : 's'}`
  return `Más de ${Math.floor(n / 10) * 10} propiedades disponibles`
}

/**
 * Rango de precios del catálogo activo, con el formato que espera `priceRange`
 * de schema.org.
 *
 * Sustituye a «COP 50.000.000 – COP 5.000.000.000», que estaba escrita a mano en
 * el JSON-LD y no cuadraba con nada: el catálogo real iba de 150 a 2.200
 * millones. Un rango inventado en el marcado es exactamente la clase de dato que
 * hace que un modelo deje de confiar en las demás cifras del sitio.
 *
 * **Se redondea hacia afuera a la decena de millón**, nunca al dato exacto: el
 * mínimo baja y el máximo sube. Dos razones, y las dos importan. El rango
 * redondeado hacia afuera CONTIENE al real, así que sigue siendo verdadero
 * mientras el catálogo no se salga de él; y no obliga a redesplegar cada vez que
 * entra o sale una propiedad, que es lo que convierte a una cifra derivada en
 * una cifra a mano con pasos extra.
 *
 * Si la base no responde o el catálogo está vacío devuelve `null`, y quien llama
 * OMITE el campo. La doctrina §7 ya lo resolvió para `lastmod`: omitir es
 * honesto, falsear no.
 */
export async function rangoPreciosCatalogo(): Promise<string | null> {
  return conFallback(async () => {
    const agg = await prisma.property.aggregate({
      where: { status: 'available' },
      _min: { price_cop: true },
      _max: { price_cop: true },
    })

    const min = agg._min.price_cop
    const max = agg._max.price_cop
    if (min == null || max == null) return null

    const DECENA_DE_MILLON = 10_000_000
    const piso  = Math.floor(Number(min) / DECENA_DE_MILLON) * DECENA_DE_MILLON
    const techo = Math.ceil(Number(max)  / DECENA_DE_MILLON) * DECENA_DE_MILLON
    if (piso <= 0 || techo <= 0) return null

    const cop = (n: number) => `COP ${n.toLocaleString('es-CO')}`
    return `${cop(piso)} – ${cop(techo)}`
  }, null)
}

async function conFallback<T>(fn: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.warn('[cifras-derivadas] BD no disponible:', err instanceof Error ? err.message : err)
    return porDefecto
  }
}

/**
 * Propiedades registradas en el catálogo digital, en cualquier estado.
 * NO es «propiedades gestionadas desde la fundación»: la base empieza en 2026.
 */
export async function propiedadesEnCatalogo(): Promise<CifraDerivada> {
  return conFallback(async () => {
    const valor = await prisma.property.count()
    const primera = await prisma.property.findFirst({
      orderBy: { published_at: 'asc' },
      select: { published_at: true },
    })
    return {
      valor,
      metodologia:
        'Propiedades registradas en el catálogo digital de Su Finca Raíz, en cualquier ' +
        'estado (disponibles y vendidas). No incluye operaciones anteriores a la puesta ' +
        'en marcha del catálogo.',
      desde: primera?.published_at?.toISOString().slice(0, 10) ?? null,
      corte: hoy(),
    }
  }, { valor: 0, metodologia: 'No disponible.', desde: null, corte: hoy() })
}

/**
 * Propiedades marcadas como vendidas EN EL SISTEMA.
 *
 * No usar como «operaciones cerradas» de la empresa: solo refleja lo que se ha
 * marcado en el catálogo desde junio de 2026, y hoy da una cifra de un dígito.
 */
export async function propiedadesVendidasEnSistema(): Promise<CifraDerivada> {
  return conFallback(async () => {
    const valor = await prisma.property.count({ where: { status: 'sold' } })
    return {
      valor,
      metodologia:
        'Propiedades marcadas como vendidas en el catálogo digital. No equivale al total ' +
        'de operaciones cerradas por la empresa: solo cuenta las gestionadas a través del ' +
        'sistema desde su puesta en marcha.',
      desde: null,
      corte: hoy(),
    }
  }, { valor: 0, metodologia: 'No disponible.', desde: null, corte: hoy() })
}

/**
 * Personas que han dejado sus datos por los canales digitales (formularios y
 * el agente Mac). NO es «familias atendidas»: no incluye a quien llegó por
 * teléfono, referido o presencialmente, que es la mayoría del histórico.
 */
export async function contactosDigitales(): Promise<CifraDerivada> {
  return conFallback(async () => {
    const valor = await prisma.lead.count()
    const primero = await prisma.lead.findFirst({
      orderBy: { created_at: 'asc' },
      select: { created_at: true },
    })
    return {
      valor,
      metodologia:
        'Personas que dejaron sus datos de contacto por los formularios del sitio o el ' +
        'agente de IA. No incluye clientes atendidos por teléfono, referido o de forma ' +
        'presencial.',
      desde: primero?.created_at?.toISOString().slice(0, 10) ?? null,
      corte: hoy(),
    }
  }, { valor: 0, metodologia: 'No disponible.', desde: null, corte: hoy() })
}
