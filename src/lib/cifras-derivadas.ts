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
