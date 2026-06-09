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
    return [
      {
        // Ruta legacy — redirige permanentemente a la nueva URL canónica
        source:      '/inmuebles',
        destination: '/propiedades',
        permanent:   true,
      },
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
