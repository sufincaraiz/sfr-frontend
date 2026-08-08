import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Lock, ShieldCheck, Users, FileDown, CalendarDays } from 'lucide-react';
import {
  COOKIE_SESION,
  buscarEnlaceUsable,
  verificarSesion,
  visitantesDe,
} from '@/lib/visitantes';
import { PinForm } from './PinForm';

// Nada de esto entra a buscadores. Es una URL secreta con datos personales
// detrás; que un rastreador la conozca ya sería una filtración en sí misma.
export const metadata: Metadata = {
  title: 'Registro de visitantes',
  robots: { index: false, follow: false, nocache: true },
};

// Lee cookies y datos vivos: nunca se prerenderiza ni se cachea.
export const dynamic = 'force-dynamic';

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

/** Mensaje único para enlace inexistente, expirado, revocado o bloqueado. */
function NoDisponible() {
  return (
    <main style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7rem 1.5rem 4rem' }}>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '2.5rem 2rem', maxWidth: 460, textAlign: 'center' }}>
        <Lock size={34} color="#94A3B8" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.6rem' }}>
          Este enlace no está disponible
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
          Si eres el propietario del inmueble y necesitas consultar el registro de visitantes,
          comunícate con Su Finca Raíz y te generamos uno nuevo.
        </p>
      </div>
    </main>
  );
}

export default async function VisitantesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const enlace = await buscarEnlaceUsable(token);
  if (!enlace) return <NoDisponible />;

  const galleta = (await cookies()).get(COOKIE_SESION)?.value;
  const autenticado = verificarSesion(galleta, enlace.id);

  const titulo = enlace.propiedad.title ?? 'Inmueble';
  const municipio = enlace.propiedad.municipality?.name ?? null;

  // Sin PIN no se consulta nada: los datos ni se leen de la base.
  if (!autenticado) {
    return <PinForm token={token} propiedad={titulo} municipio={municipio} />;
  }

  // `visitantesDe` selecciona SOLO nombre, cédula y fecha. El correo, el celular
  // y el municipio de procedencia no se leen aquí, así que no pueden llegar al
  // navegador del dueño ni siquiera dentro del payload de React.
  const visitantes = await visitantesDe(enlace.propiedadId);

  return (
    <main style={{ background: '#F8FAFC', minHeight: '100vh', padding: '7rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Encabezado */}
        <div style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', borderRadius: 16, padding: '1.8rem 1.9rem', marginBottom: '1.25rem' }}>
          <p style={{ color: '#B08D3F', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 0.45rem' }}>
            Registro de visitantes
          </p>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.3rem,3.2vw,1.9rem)', lineHeight: 1.2, margin: 0 }}>
            {titulo}
          </h1>
          {municipio && (
            <p style={{ color: '#BFD4EE', fontSize: '0.88rem', margin: '0.4rem 0 0' }}>{municipio}</p>
          )}
        </div>

        {/* Confidencialidad */}
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '0.85rem 1.05rem', marginBottom: '1.25rem' }}>
          <ShieldCheck size={18} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: '#92400E', fontSize: '0.83rem', lineHeight: 1.55, margin: 0 }}>
            Esta información es <strong>confidencial</strong>. Se entrega para el control de ingreso
            y la seguridad de su inmueble, y su uso debe ser reservado conforme a la Ley 1581 de 2012.
          </p>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#475569', fontSize: '0.9rem', fontWeight: 700 }}>
            <Users size={16} color="#1B56A1" />
            {visitantes.length} visitante{visitantes.length !== 1 ? 's' : ''}
          </span>
          <a
            href={`/api/visitantes/${token}/pdf`}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0D2D5E', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '10px 17px', borderRadius: 9, textDecoration: 'none', marginLeft: 'auto' }}
          >
            <FileDown size={15} /> Descargar PDF
          </a>
        </div>

        {/* Lista */}
        {visitantes.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '3rem 1.5rem', textAlign: 'center' }}>
            <CalendarDays size={38} color="#CBD5E1" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
              Todavía no hay visitas registradas para este inmueble.
            </p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 480 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', color: '#94A3B8', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '11px 16px', fontWeight: 700, textAlign: 'left' }}>Nombre completo</th>
                    <th style={{ padding: '11px 16px', fontWeight: 700, textAlign: 'left' }}>Cédula</th>
                    <th style={{ padding: '11px 16px', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>Fecha de la visita</th>
                  </tr>
                </thead>
                <tbody>
                  {visitantes.map(v => (
                    <tr key={v.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '11px 16px', fontWeight: 600, color: '#0D2D5E' }}>{v.nombresCompletos}</td>
                      <td style={{ padding: '11px 16px', color: '#334155', fontFamily: 'monospace' }}>{v.cedula}</td>
                      <td style={{ padding: '11px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>{fecha(v.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p style={{ color: '#94A3B8', fontSize: '0.78rem', lineHeight: 1.6, margin: '1.25rem 0 0', textAlign: 'center' }}>
          Su Finca Raíz comparte con el propietario únicamente el nombre y el número de documento
          de quienes ingresaron. Los datos de contacto de los visitantes son de uso interno y no
          se entregan a terceros.
        </p>
      </div>
    </main>
  );
}
