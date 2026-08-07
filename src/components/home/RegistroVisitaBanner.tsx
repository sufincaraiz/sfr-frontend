import Link from 'next/link';
import { ClipboardCheck, ArrowRight } from 'lucide-react';

/**
 * Acceso al registro de visitas. Va después de las propiedades destacadas: es
 * justo cuando alguien que está mirando inmuebles piensa en ir a verlos.
 * Deliberadamente más sobrio que GuiaInversionBanner (fondo claro, no degradado
 * azul): es un trámite operativo, no una promesa comercial, y no debe competir
 * con el banner de la guía de inversión.
 */
export function RegistroVisitaBanner() {
  return (
    <section style={{ padding: '2.5rem 1.5rem', background: '#F8FAFC' }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          background: '#fff',
          border: '1.5px solid #E2E8F0',
          borderLeft: '5px solid #E8B92F',
          borderRadius: 16,
          padding: 'clamp(1.35rem, 3vw, 1.9rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap',
          boxShadow: '0 4px 20px rgba(13,45,94,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', flex: '1 1 360px' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 50, height: 50, borderRadius: 13, background: '#EFF6FF',
              flexShrink: 0,
            }}
          >
            <ClipboardCheck size={25} color="#1B56A1" />
          </span>
          <div>
            <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: 'clamp(1.05rem, 2.2vw, 1.3rem)', lineHeight: 1.3, margin: '0 0 4px' }}>
              ¿Vas a visitar un inmueble con nosotros?
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
              Regístrate antes de tu visita. Toma menos de un minuto.
            </p>
          </div>
        </div>

        <Link
          href="/registro-visita"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#E8B92F', color: '#0D2D5E', fontWeight: 800,
            fontSize: '0.92rem', padding: '13px 26px', borderRadius: 11,
            textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          Registrar mi visita <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
