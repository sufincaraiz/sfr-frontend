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
}

export default nextConfig
