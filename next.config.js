/**
 * ============================================================
 * NEXT.JS CONFIG - Su Finca Raíz
 * next.config.js
 * ============================================================
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
  },
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  // Redirects SEO
  async redirects() {
    return [
      {
        source: '/inmuebles',
        destination: '/propiedades',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
