import { redirect } from 'next/navigation';
import { Contact } from 'lucide-react';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Placeholder de la Fase 0. El CRM real (embudo de ventas) se construye en la Fase 1.
export default async function CrmPage() {
  const session = await requireRole(['admin', 'asistente_crm']);
  if (!session) redirect('/admin/login');

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', background: '#EFF6FF', color: '#1B56A1', borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <Contact size={26} />
        </div>
        <h1 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.4rem', margin: '0 0 8px' }}>CRM</h1>
        <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
          Hola, {session.nombre}. Aquí vivirá el CRM de contactos con embudo de ventas.
          Estamos terminando de construirlo — muy pronto podrás cargar y dar seguimiento a tus contactos.
        </p>
      </div>
    </div>
  );
}
