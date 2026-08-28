import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Oculta el indicador "N" de desarrollo
  devIndicators: false,

  // Comprime respuestas HTTP con gzip/brotli
  compress: true,

  // Elimina el header X-Powered-By: Next.js (seguridad + bytes)
  poweredByHeader: false,

  // Incluye los MDX del blog (content/blog) en el bundle de las funciones serverless que
  // los leen. Sin esto, fs.readdirSync(content/blog) no encuentra los archivos en runtime
  // (/var/task), y los 3 artículos MDX oficiales desaparecerían del sitemap/blog al
  // revalidar (ISR). Son 3 archivos pequeños: el peso extra es despreciable.
  outputFileTracingIncludes: {
    '/': ['./content/blog/**/*'],
    '/sitemap.xml': ['./content/blog/**/*'],
    '/blog': ['./content/blog/**/*'],
    '/blog/**': ['./content/blog/**/*'],
  },

  images: {
    // Loader de Cloudinary: la optimización/redimensión la hace Cloudinary por URL
    // (f_auto, q_auto, w_, c_limit), NO el optimizador de Vercel → elimina el peaje
    // doble y deja de consumir cupo de Image Optimization. Las URLs no-Cloudinary
    // (logos locales, etc.) el loader las devuelve intactas (guard).
    // OJO: en Next 15 hace falta loader:'custom' EXPLÍCITO además de loaderFile; sin él
    // Next deja loader en 'default' y sigue usando /_next/image (el optimizador de Vercel).
    loader: 'custom',
    loaderFile: './src/lib/cloudinary-loader.ts',

    // AVIF primero (30-50% más ligero que WebP), WebP como fallback.
    // Nota: con loader de Cloudinary la negociación de formato la hace f_auto; este
    // campo queda inerte para las imágenes de Cloudinary.
    formats: ['image/avif', 'image/webp'],

    // Cache de imágenes optimizadas en el optimizador de Vercel — 31 días. Con el
    // loader de Cloudinary ninguna imagen pasa por ese optimizador, así que este
    // valor queda prácticamente inerte; se sube igual por robustez.
    minimumCacheTTL: 2678400,

    // Inerte con loaderFile (Next ignora remotePatterns para imágenes con loader
    // custom); se deja como documentación de los hosts de imagen usados.
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

    // Landing legacy de tipo (+ municipio) → ruta LIMPIA de /propiedades.
    //
    // Antes apuntaban a /propiedades?tipo=&municipio=, o sea que una visita
    // desde Google encadenaba redirect y luego canonical hasta la ruta limpia.
    // Ahora aterrizan directamente en la canónica: un salto menos y las señales
    // del enlace legacy llegan enteras a la URL que se quiere posicionar.
    //
    // `mname` deja de usarse en el destino porque la ruta limpia va por slug,
    // que es justo lo que evita el encodeURIComponent de un nombre con espacios.
    const landing = TYPES.flatMap(([prefix, tipo]) => [
      { source: `/${prefix}`, destination: `/propiedades?tipo=${tipo}`, permanent: true },
      ...MUNIS.map(([mslug]) => ({
        source: `/${prefix}-${mslug}-cundinamarca`,
        destination: `/propiedades/${tipo}/${mslug}`,
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

    // Redirects DINÁMICOS desde la tabla `redirects`. Hasta hoy la tabla existía
    // y no la leía nadie; los 301 de propiedades vivían solo en el array de
    // arriba, que exige editar código y desplegar por cada renombrado. Al
    // leerla aquí, renombrar un slug = escribir una fila (lo hace el script de
    // renombrado) y el siguiente build sirve el 301, sin tocar este archivo.
    //
    // GUARDA: envuelto en try/catch. Si Railway no responde en el build, se
    // usan solo los estáticos en vez de romper el despliegue —la misma
    // distinción «datos divergen» vs «no llego a la base» de las otras guardas—.
    // El alias `@/…` no está disponible en next.config (corre antes de que se
    // resuelvan los paths de tsconfig), así que se instancia PrismaClient
    // directo desde el node_module, que sí resuelve.
    let dinamicos: { source: string; destination: string; permanent: boolean }[] = []
    try {
      const { PrismaClient } = await import('@prisma/client')
      const db = new PrismaClient()
      const filas = await db.redirect.findMany({ select: { source: true, destination: true, permanent: true } })
      dinamicos = filas.map(f => ({ source: f.source, destination: f.destination, permanent: f.permanent }))
      await db.$disconnect()
    } catch (e) {
      console.warn('[next.config] no se pudo leer la tabla redirects; solo estáticos:', e instanceof Error ? e.message : e)
    }

    return [
      { source: '/inmuebles', destination: '/propiedades', permanent: true },
      { source: '/fincas-en-venta/la-vega', destination: '/propiedades/finca/la-vega', permanent: true },
      // El slug llevaba un prefijo «ejemplo-» heredado de la plantilla inicial.
      // Le decía a un lector —y a un modelo— que el artículo era de relleno,
      // justo en la guía de compra, que es el contenido más citable del blog.
      {
        source: '/blog/ejemplo-como-comprar-finca-en-la-vega',
        destination: '/blog/como-comprar-finca-en-la-vega',
        permanent: true,
      },
      // /veredas/ucranea publicaba una vereda de Sasaima que en realidad es
      // Ucrania, vereda de La Vega (código postal 253618). No se renombró la
      // página: su contenido —altitud, temperatura, distancias, clima, POT y
      // coordenadas— estaba medido para Sasaima. Se retiró entera y la URL
      // apunta al municipio correcto.
      { source: '/veredas/ucranea', destination: '/municipios/la-vega', permanent: true },
      // «Condominio» dejó de ser un tipo de inmueble, pero quien llegaba a
      // /propiedades/condominio/<municipio> buscaba exactamente lo que ahora
      // vive en /propiedades/en-condominio/<municipio>. La intención es la
      // misma; solo cambió el vocabulario de los datos.
      { source: '/propiedades/condominio/:municipio', destination: '/propiedades/en-condominio/:municipio', permanent: true },
      { source: '/propiedades/condominio', destination: '/propiedades/en-condominio', permanent: true },
      ...landing,
      ...props,
      ...dinamicos,
    ]
  },

  // ── Propuestas comerciales (HTML estático en /public/propuesta) ─────────────
  // URL limpia sin .html. Para cada propuesta nueva: deja el archivo en
  // public/propuesta/<slug>.html y agrega aquí una línea con su <slug>.
  //
  // Al RETIRAR una propuesta: borra su archivo, quita su línea de aquí y añade
  // el slug a RETIRADAS en app/propuesta/[slug]/route.ts, que devuelve 410.
  // El rewrite tiene prioridad sobre esa ruta, así que mientras la línea siga
  // aquí el 410 no se aplica.
  async rewrites() {
    return [
      // (sin propuestas vigentes en este momento)
    ]
  },

  // ── Headers de seguridad ────────────────────────────────────────────────────
  async headers() {
    // Content-Security-Policy en modo BLOQUEO (enforcing): las violaciones ahora SÍ
    // bloquean el recurso. Verificada previamente en Report-Only (consola limpia).
    // Construida contra los recursos reales del sitio: Cloudinary (imágenes/video/upload),
    // Panoee + Pannellum/jsdelivr (tours 360), Google Maps + OpenStreetMap + YouTube
    // (iframes), Google Fonts (propuestas). 'unsafe-inline' en script-src es necesario por
    // los scripts inline de Next.js (App Router, sin nonce) — endurecer con nonce es una
    // mejora posterior.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://plus.unsplash.com https://tour.panoee.net",
      "media-src 'self' https://res.cloudinary.com",
      "connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com",
      "frame-src 'self' https://www.google.com https://www.openstreetmap.org https://www.youtube.com https://tour.panoee.net https://app.panoee.com https://panoee.com",
      "worker-src 'self' blob:",
    ].join('; ')

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
          // Desactiva APIs de hardware no usadas. geolocation solo al propio sitio.
          // xr-spatial-tracking (WebXR/VR): habilitado para el sitio y delegado a los
          // orígenes de Panoee (tours 360 en iframe). Sin listar esos orígenes, el iframe
          // cross-origin no puede usar VR aunque tenga allow="xr-spatial-tracking".
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=(), xr-spatial-tracking=(self "https://tour.panoee.net" "https://app.panoee.com" "https://panoee.com")' },
          // Fuerza HTTPS por 2 años, incluyendo subdominios, en la lista preload
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // CSP en modo BLOQUEO (enforcing): verificada en Report-Only con consola limpia.
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
