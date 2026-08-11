import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// ─────────────────────────────────────────────────────────────────────────────
// robots.txt — capa de acceso (doctrina AEO §6).
//
// El grupo `*` con Allow: / ya permitía a todos los rastreadores, así que el
// sitio NUNCA estuvo bloqueado. Lo que se añade aquí es una declaración
// EXPLÍCITA por agente, que sirve para dos cosas:
//
//   • Deja constancia de una decisión deliberada. Un `*` genérico es ambiguo:
//     no distingue «los permito» de «no me lo he planteado».
//   • Protege ante cambios futuros. El día que alguien añada un Disallow al
//     grupo `*`, los agentes de IA seguirán teniendo su propio permiso.
//
// Cada agente va en su propio grupo porque un rastreador solo obedece al grupo
// más específico que coincida con su nombre: si tiene el suyo, ignora el `*`.
// ─────────────────────────────────────────────────────────────────────────────

/** Rastreadores de motores generativos y de búsqueda con permiso explícito. */
const AGENTES_IA = [
  // OpenAI — ChatGPT
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  // Anthropic — Claude
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  // Google — Gemini y búsqueda
  'Google-Extended', 'Googlebot', 'Googlebot-Image',
  // Microsoft — Bing y Copilot
  'Bingbot',
  // Perplexity
  'PerplexityBot', 'Perplexity-User',
  // Apple
  'Applebot', 'Applebot-Extended',
  // Common Crawl (alimenta el entrenamiento de varios modelos)
  'CCBot',
  // Amazon, Meta, Cohere y otros
  'Amazonbot', 'Meta-ExternalAgent', 'cohere-ai',
  'DuckAssistBot', 'YouBot', 'Diffbot', 'Timpibot', 'Bytespider',
] as const

/** Rutas que no aportan nada a un índice ni a un modelo. */
const PRIVADAS = [
  '/admin',            // panel administrativo
  '/api',              // endpoints
  '/registro-visita',  // trámite operativo con datos personales
  '/visitantes',       // enlaces privados de dueños (llevan cédulas)
  '/escribir',         // editor del blog colaborativo
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Un grupo por agente de IA: acceso total al contenido público.
      ...AGENTES_IA.map(userAgent => ({
        userAgent,
        allow: '/',
        disallow: PRIVADAS,
      })),
      // Resto de rastreadores.
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVADAS,
      },
    ],
    // Se declaran el índice y todos los segmentos. El índice basta para un
    // rastreador que lo siga, pero declararlos todos ayuda a los que no lo hacen
    // y deja la estructura visible en Search Console.
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-paginas.xml`,
      `${SITE_URL}/sitemap-propiedades.xml`,
      `${SITE_URL}/sitemap-municipios.xml`,
      `${SITE_URL}/sitemap-blog.xml`,
      `${SITE_URL}/sitemap-imagenes.xml`,
    ],
    host: SITE_URL,
  }
}
