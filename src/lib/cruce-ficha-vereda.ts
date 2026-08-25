/**
 * CRUCE FICHA ↔ VEREDA
 * ====================
 *
 * El caso de Condominio Oeste NO se encontró leyendo la ficha. La ficha, sola,
 * era impecable: «combina la tranquilidad del campo con fácil acceso». Se
 * encontró **comparándola con su vereda**, que dice «vía destapada en proceso
 * de pavimentación, 4x4 recomendado en temporada de lluvias».
 *
 * Ninguna lectura de la ficha lo habría destapado, y ningún patrón léxico
 * tampoco: la frase no tiene nada sospechoso. Solo el CRUCE lo ve.
 *
 * Por eso esto es una comprobación repetible y no una pasada manual. Hace dos
 * cosas distintas:
 *
 *   · DISCREPANCIA — la ficha afirma algo que su vereda contradice. Es un
 *     defecto: dos fuentes propias diciendo cosas distintas al mismo cliente.
 *   · HUECO DERIVABLE — la ficha no dice nada de acceso, pero su vereda sí. El
 *     dato existe y no llega al comprador.
 *
 * NO IMPORTA NADA: recibe las veredas como parámetro. Es deliberado, y es la
 * misma razón que en `busqueda-texto.ts` y `valor-futuro.ts` — un solo import
 * de `@/…` impediría que `scripts/cruzar-ficha-vereda.ts` lo ejecutara con
 * Node, y entonces la comprobación repetible dejaría de ser ejecutable fuera
 * del servidor.
 *
 * ⚠ LOS SERVICIOS NO SE DERIVAN. El acceso a un predio es el de su vereda —es
 * la misma vía—. El agua y la energía son del PREDIO: dos lotes vecinos pueden
 * tener uno acueducto veredal y el otro nada. Asumirlo por proximidad sería
 * exactamente el error que este cruce existe para detectar.
 */

export interface FichaCruzable {
  slug: string
  short_description: string | null
  description: string | null
  vereda: { slug: string; name: string } | null
}

export interface Discrepancia {
  slug: string
  vereda: string
  clase: string
  afirma: string
  peroLaVereda: string
}

export interface HuecoDerivable {
  slug: string
  vereda: string
  acceso: string
}

/** Afirmaciones de acceso FÁCIL. Son las que una vereda difícil contradice. */
const PRESUME_ACCESO =
  /\b(buenas v[ií]as|excelente acceso|f[aá]cil acceso|acceso inmejorable|v[ií]a pavimentada|acceso pavimentado|apto para cualquier tipo de veh[ií]culo|acceso directo por v[ií]a principal)\b/i

/** Señales de que la vía de la vereda NO es fácil. */
const ACCESO_DIFICIL = /\b(destapad\w*|4 ?x ?4|mal estado|carreteable|sin pavimentar)\b/i

/** ¿La ficha dice ALGO del acceso? Si no, hay hueco. */
const MENCIONA_ACCESO =
  /\b(acceso|v[ií]a|v[ií]as|carretera|carreteable|pavimentad\w*|destapad\w*|placa huella|se llega)\b/i

function texto(f: FichaCruzable): string {
  return [f.short_description, f.description].filter(Boolean).join('\n')
}

export interface VeredaCruzable {
  slug: string
  name: string
  acceso_vial: string
}

export function cruzarFichasConVeredas(fichas: FichaCruzable[], veredas: VeredaCruzable[]): {
  discrepancias: Discrepancia[]
  huecosDerivables: HuecoDerivable[]
  sinVereda: string[]
} {
  const discrepancias: Discrepancia[] = []
  const huecosDerivables: HuecoDerivable[] = []
  const sinVereda: string[] = []

  for (const f of fichas) {
    const t = texto(f)
    const mencionaAcceso = MENCIONA_ACCESO.test(t)

    if (!f.vereda) {
      if (!mencionaAcceso) sinVereda.push(f.slug)
      continue
    }
    const v = veredas.find(x => x.slug === f.vereda!.slug)
    if (!v) {
      if (!mencionaAcceso) sinVereda.push(f.slug)
      continue
    }

    // Discrepancia: la ficha presume de acceso y la vereda dice que es difícil.
    const presume = t.match(PRESUME_ACCESO)
    if (presume && ACCESO_DIFICIL.test(v.acceso_vial)) {
      discrepancias.push({
        slug: f.slug,
        vereda: v.name,
        clase: 'acceso',
        afirma: presume[0],
        peroLaVereda: v.acceso_vial,
      })
      continue
    }

    // Hueco derivable: la ficha no dice nada y la vereda sí.
    if (!mencionaAcceso) {
      huecosDerivables.push({ slug: f.slug, vereda: v.name, acceso: v.acceso_vial })
    }
  }

  return { discrepancias, huecosDerivables, sinVereda }
}
