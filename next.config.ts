import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Oculta el indicador "N" de desarrollo
  devIndicators: false,

  // Comprime respuestas HTTP con gzip/brotli
  compress: true,

  // Elimina el header X-Powered-By: Next.js (seguridad + bytes)
  poweredByHeader: false,

  images: {
    // AVIF primero (30-50% más ligero que WebP), WebP como fallback
    formats: ['image/avif', 'image/webp'],

    // Cache de imágenes optimizadas — 60s mínimo en CDN
    minimumCacheTTL: 60,

    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'tour.panoee.net' },
      { protocol: 'https', hostname: 'studio.panoee.net' },
    ],
  },

  experimental: {
    // Extrae CSS crítico e inlinea el above-the-fold — mejora FCP
    optimizeCss: true,
  },

  // ── Redirects SEO ──────────────────────────────────────────────────────────
  async redirects() {
    // Municipios de la región (slug → nombre) para las landing de tipo+municipio.
    const MUNIS: [string, string][] = [
      ['la-vega', 'La Vega'], ['nimaima', 'Nimaima'], ['nocaima', 'Nocaima'],
      ['quebradanegra', 'Quebradanegra'], ['sasaima', 'Sasaima'], ['vergara', 'Vergara'], ['villeta', 'Villeta'],
    ]
    // Prefijo de URL antigua → valor de `tipo` en /propiedades.
    const TYPES: [string, string][] = [
      ['fincas-en-venta', 'finca'], ['lotes-en-venta', 'lote'],
      ['casas-campestres-en-venta', 'casa'], ['condominios-campestres', 'condominio'],
    ]

    // Landing legacy de tipo (+ municipio) → filtro real de /propiedades.
    const landing = TYPES.flatMap(([prefix, tipo]) => [
      { source: `/${prefix}`, destination: `/propiedades?tipo=${tipo}`, permanent: true },
      ...MUNIS.map(([mslug, mname]) => ({
        source: `/${prefix}-${mslug}-cundinamarca`,
        destination: `/propiedades?tipo=${tipo}&municipio=${encodeURIComponent(mname)}`,
        permanent: true,
      })),
    ])

    // Propiedades con slug viejo (prefijo de tipo duplicado, `$`→"dollar") → slug actual.
    const propiedades: [string, string][] = [
      ['casa-casa-alameda-la-vega-cundinamarca', 'casa-alameda-la-vega-cundinamarca'],
      ['casa-casa-central-1-cuadra-del-rey-la-vega-cundinamarca', 'casa-central-1-cuadra-del-rey-la-vega-cundinamarca'],
      ['casa-casa-lote-san-antonio-la-vega-cundinamarca', 'casa-lote-san-antonio-la-vega-cundinamarca'],
      ['casa-lvc-015-casa-lote-la-paloma-dollar280-la-vega-cundinamarca', 'casa-lvc-015-casa-lote-la-paloma-280-la-vega-cundinamarca'],
      ['condominio-condominio-oeste-la-vega-cundinamarca', 'condominio-oeste-la-vega-cundinamarca'],
      ['finca-finca-bulucaima-dollar800-la-vega-cundinamarca', 'finca-bulucaima-800-la-vega-cundinamarca'],
      ['finca-finca-el-cural-andres-la-vega-cundinamarca', 'finca-el-cural-andres-la-vega-cundinamarca'],
      ['finca-finca-la-alborada-la-vega-cundinamarca', 'finca-la-alborada-la-vega-cundinamarca'],
      ['finca-finca-la-huerta-golf-la-vega-cundinamarca', 'finca-la-huerta-golf-la-vega-cundinamarca'],
      ['finca-finca-llano-grande-alquiler-la-vega-cundinamarca', 'finca-llano-grande-alquiler-la-vega-cundinamarca'],
      ['lote-lote-petaquero-la-vega-cundinamarca', 'lote-petaquero-la-vega-cundinamarca'],
    ]
    const props = propiedades.map(([from, to]) => ({
      source: `/propiedad/${from}`, destination: `/propiedad/${to}`, permanent: true,
    }))

    return [
      { source: '/inmuebles', destination: '/propiedades', permanent: true },
      { source: '/fincas-en-venta/la-vega', destination: `/propiedades?tipo=finca&municipio=${encodeURIComponent('La Vega')}`, permanent: true },
      ...landing,
      ...props,
    ]
  },

  // ── Propuestas comerciales (HTML estático en /public/propuesta) ─────────────
  // URL limpia sin .html. Para cada propuesta nueva: deja el archivo en
  // public/propuesta/<slug>.html y agrega aquí una línea con su <slug>.
  async rewrites() {
    return [
      { source: '/propuesta/villa-maria-elvira', destination: '/propuesta/villa-maria-elvira.html' },
    ]
  },

  // ── Headers de seguridad ────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Evita que el navegador "adivine" el Content-Type (MIME sniffing)
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          // Bloquea que el sitio sea embebido en iframes ajenos (clickjacking)
          { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
          // Solo envía el origen (sin path ni query) en requests cross-origin
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          // Desactiva APIs de hardware no usadas
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
          // Fuerza HTTPS por 2 años, incluyendo subdominios, en la lista preload
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default nextConfig
