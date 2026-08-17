import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, Search, MapPin, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: true },
};

// Página 404 global. Se muestra cuando una URL no existe (p. ej. una propiedad
// vendida o retirada). En vez de dejar al visitante en un callejón sin salida,
// lo guiamos a las secciones útiles del sitio.
export default function NotFound() {
  return (
    <main style={{ background: '#F8FAFC', minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: 640, width: '100%', textAlign: 'center', background: '#fff', borderRadius: 20, border: '1px solid #E2E8F0', padding: 'clamp(2rem, 5vw, 3.5rem)' }}>

        <p style={{ color: '#E8B92F', fontWeight: 900, fontSize: 'clamp(3.5rem, 12vw, 6rem)', lineHeight: 1, margin: 0 }}>404</p>

        <h1 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', margin: '0.5rem 0 0.75rem' }}>
          No encontramos esta página
        </h1>
        <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.7, maxWidth: 460, margin: '0 auto 2rem' }}>
          Es posible que la propiedad ya se haya vendido o retirado, o que el enlace esté desactualizado.
          Pero tenemos muchas más fincas, lotes y casas campestres esperándote.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <Link href="/propiedades" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0D2D5E', color: '#fff', fontWeight: 800, fontSize: '0.92rem', padding: '0.8rem 1.5rem', borderRadius: 12, textDecoration: 'none' }}>
            <Search size={17} /> Ver propiedades
          </Link>
          <Link href="/municipios" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#0D2D5E', border: '1.5px solid #E2E8F0', fontWeight: 700, fontSize: '0.92rem', padding: '0.8rem 1.5rem', borderRadius: 12, textDecoration: 'none' }}>
            <MapPin size={17} /> Explorar municipios
          </Link>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#0D2D5E', border: '1.5px solid #E2E8F0', fontWeight: 700, fontSize: '0.92rem', padding: '0.8rem 1.5rem', borderRadius: 12, textDecoration: 'none' }}>
            <Home size={17} /> Ir al inicio
          </Link>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #F1F5F9' }}>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginBottom: '0.9rem' }}>
            ¿Buscas algo en particular? Te orientamos según lo que necesites.
          </p>
          <a
            href="https://wa.me/573218826730?text=Hola%2C+llegu%C3%A9+a+una+p%C3%A1gina+que+no+existe+y+quiero+ayuda+para+encontrar+una+propiedad"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#15803D', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.7rem 1.4rem', borderRadius: 12, textDecoration: 'none' }}
          >
            <MessageCircle size={16} /> Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
