/**
 * VIGILANCIA DEL CONTENIDO PUBLICADO — el hueco entre despliegues
 * ==============================================================
 *
 * Las guardas del build protegen el momento del despliegue. No protegen lo que
 * pasa DESPUÉS: un `UPDATE` desde el admin puede dejar un municipio sin sus
 * seis campos, romper la correspondencia de veredas, o —lo que costó una
 * sesión entera de saneamiento— reintroducir una afirmación de valorización en
 * la descripción de una ficha. Nada de eso se entera hasta el siguiente build,
 * que puede tardar semanas.
 *
 * Esto AVISA, NO BLOQUEA. Es la diferencia con una guarda: aquí no hay nada que
 * romper, solo un mensaje que llega. Corre desde un cron diario —el plan Hobby
 * no permite más frecuencia— y su fallo no puede afectar al sitio.
 *
 * DISTINGUE «los datos divergen» de «no llego a la base», como las guardas del
 * build: si Railway no responde, esto no reporta un falso positivo, reporta que
 * no pudo comprobar.
 */

import { prisma } from '@/lib/prisma'
import { verificarIntegridadVeredas } from '@/lib/veredas-integridad'
import { verificarIntegridadTipos } from '@/lib/tipos-integridad'
import { CAMPOS_CONTENIDO } from '@/lib/publicable'
import { primeraCoincidencia } from '@/lib/valor-futuro'

export interface Hallazgo {
  clase: string
  detalle: string
}

export interface ResultadoVigilancia {
  hallazgos: Hallazgo[]
  comprobado: string[]
  sinComprobar: string[]
  fecha: string
}

/** Campos de texto publicados de cada superficie. */
const CAMPOS_PROPIEDAD = ['title', 'short_description', 'description', 'meta_title', 'meta_description'] as const
const CAMPOS_MUNICIPIO = ['descripcion_seo', 'meta_description', 'historia', 'clima', 'turismo', 'antes_de_comprar'] as const

export async function vigilarContenido(): Promise<ResultadoVigilancia> {
  const hallazgos: Hallazgo[] = []
  const comprobado: string[] = []
  const sinComprobar: string[] = []

  // ── 1. Integridad de veredas ───────────────────────────────────────────────
  try {
    const r = await verificarIntegridadVeredas()
    if (r.filasEnTabla === null) sinComprobar.push('veredas (base inalcanzable)')
    else {
      comprobado.push('veredas')
      for (const e of r.errores) hallazgos.push({ clase: 'veredas', detalle: e })
    }
  } catch (e) {
    sinComprobar.push(`veredas (${msg(e)})`)
  }

  // ── 2. Integridad de tipos ────────────────────────────────────────────────
  try {
    const r = await verificarIntegridadTipos()
    comprobado.push('tipos')
    for (const e of r.errores) hallazgos.push({ clase: 'tipos', detalle: e })
  } catch (e) {
    sinComprobar.push(`tipos (${msg(e)})`)
  }

  // ── 3. Municipios con página que perdieron un campo de contenido ──────────
  try {
    const munis = await prisma.municipality.findMany({
      where: { oculto: false },
      select: { slug: true, ...Object.fromEntries(CAMPOS_CONTENIDO.map(c => [c, true])) } as never,
    })
    comprobado.push('campos de municipio')
    for (const m of munis as unknown as Array<Record<string, unknown>>) {
      // Solo interesan los que YA tenían página: si nunca tuvo contenido, no es
      // una degradación, es un municipio sin sembrar.
      const llenos = CAMPOS_CONTENIDO.filter(c => m[c] !== null && m[c] !== undefined && m[c] !== '')
      if (llenos.length === 0 || llenos.length === CAMPOS_CONTENIDO.length) continue
      const faltan = CAMPOS_CONTENIDO.filter(c => !llenos.includes(c))
      hallazgos.push({
        clase: 'municipio incompleto',
        detalle: `${m.slug}: le faltan ${faltan.join(', ')} — deja de ser publicable`,
      })
    }
  } catch (e) {
    sinComprobar.push(`campos de municipio (${msg(e)})`)
  }

  // ── 4. Afirmaciones de valor futuro reintroducidas ────────────────────────
  try {
    const props = await prisma.property.findMany({
      where: { status: 'available' },
      select: { slug: true, title: true, short_description: true, description: true, meta_title: true, meta_description: true },
    })
    comprobado.push('valor futuro en fichas')
    for (const p of props) {
      for (const campo of CAMPOS_PROPIEDAD) {
        const frase = primeraCoincidencia(p[campo])
        if (frase) hallazgos.push({ clase: 'valor futuro', detalle: `propiedad ${p.slug} · ${campo}: «${frase}»` })
      }
    }
  } catch (e) {
    sinComprobar.push(`valor futuro en fichas (${msg(e)})`)
  }

  try {
    const munis = await prisma.municipality.findMany({
      select: { slug: true, descripcion_seo: true, meta_description: true, historia: true, clima: true, turismo: true, antes_de_comprar: true, faqs: true },
    })
    comprobado.push('valor futuro en municipios')
    for (const m of munis) {
      for (const campo of CAMPOS_MUNICIPIO) {
        const frase = primeraCoincidencia(m[campo])
        if (frase) hallazgos.push({ clase: 'valor futuro', detalle: `municipio ${m.slug} · ${campo}: «${frase}»` })
      }
      if (Array.isArray(m.faqs)) {
        m.faqs.forEach((f, i) => {
          const q = f as { question?: string; answer?: string } | null
          // La FAQ de La Vega dice a propósito que NO publicamos tasas de
          // valorización. Nombrar lo que no se hace no es afirmarlo.
          for (const [campo, texto] of [['question', q?.question], ['answer', q?.answer]] as const) {
            // La excepción de las frases legítimas vive en el detector.
            const frase = primeraCoincidencia(texto)
            if (frase) hallazgos.push({ clase: 'valor futuro', detalle: `municipio ${m.slug} · faq[${i}].${campo}: «${frase}»` })
          }
        })
      }
    }
  } catch (e) {
    sinComprobar.push(`valor futuro en municipios (${msg(e)})`)
  }

  try {
    const ks = await prisma.macKnowledge.findMany({ where: { activo: true }, select: { titulo: true, contenido: true } })
    comprobado.push('conocimiento de Mac')
    for (const k of ks) {
      const frase = primeraCoincidencia(k.contenido)
      if (frase) hallazgos.push({ clase: 'valor futuro', detalle: `mac_knowledge «${k.titulo}»: «${frase}»` })
      // Una entrada que da ÓRDENES en vez de datos es lo que fue Tobia Chica.
      if (/\b(tu objetivo|tu meta|debes sonar|actúa como|reglas de interacción)\b/i.test(k.contenido)) {
        hallazgos.push({ clase: 'instrucción en conocimiento', detalle: `mac_knowledge «${k.titulo}» contiene instrucciones, no datos` })
      }
    }
  } catch (e) {
    sinComprobar.push(`conocimiento de Mac (${msg(e)})`)
  }

  return { hallazgos, comprobado, sinComprobar, fecha: new Date().toISOString() }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message.split('\n')[0]! : String(e)
}
