import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SlidersHorizontal, Clock, AlertTriangle } from 'lucide-react';
import { requireSession } from '@/lib/auth';
import { roleCanAccessAdminPath } from '@/lib/permissions';
import { faltantesEmpresa } from '@/lib/finanzas/empresa';

// Entrada del módulo de finanzas. Por ahora solo existe la pantalla de
// parámetros; terceros, egresos, ingresos, custodia y reportes llegan en ese
// orden.
//
// COMPONENTE DE SERVIDOR a propósito: el NIT y la razón social viven en
// variables de entorno SIN NEXT_PUBLIC_, que no existen en el navegador. Si
// esta pantalla fuera de cliente, `faltantesEmpresa()` vería siempre todo
// vacío y el aviso de «datos pendientes» no desaparecería nunca, aunque las
// variables estuvieran bien configuradas en Vercel.

const PROXIMOS = ['Terceros', 'Egresos', 'Ingresos y distribución de comisión', 'Custodia de dineros de terceros', 'Reportes'];

export const dynamic = 'force-dynamic';

export default async function FinanzasPage() {
  const sesion = await requireSession();
  if (!sesion) redirect('/admin/login');
  if (!roleCanAccessAdminPath(sesion.role, '/admin/finanzas')) redirect('/admin');

  const faltan = faltantesEmpresa();
  const verParametros = roleCanAccessAdminPath(sesion.role, '/admin/finanzas/parametros');

  return (
    <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {faltan.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, padding: '1rem 1.25rem' }}>
          <AlertTriangle size={20} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.86rem', color: '#78350F', lineHeight: 1.5 }}>
            <strong>Datos de la empresa pendientes: {faltan.join(', ')}.</strong><br />
            Mientras falten, todo reporte sale marcado «NO VÁLIDO PARA DECLARAR».
          </div>
        </div>
      )}
      {verParametros && (
        <Link href="/admin/finanzas/parametros" style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '1.1rem 1.25rem', textDecoration: 'none' }}>
          <SlidersHorizontal size={22} style={{ color: '#1B56A1', flexShrink: 0 }} />
          <div>
            <div style={{ color: '#0D2D5E', fontWeight: 800 }}>Parámetros fiscales del año</div>
            <div style={{ color: '#64748B', fontSize: '0.84rem' }}>UVT, decisión de IVA, conceptos de retención e ICA. Sin un año ACTIVO el módulo no calcula nada.</div>
          </div>
        </Link>
      )}
      <div style={{ background: '#fff', border: '1px dashed #CBD5E1', borderRadius: 14, padding: '1.1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontWeight: 800, fontSize: '0.88rem', marginBottom: 6 }}>
          <Clock size={16} /> En construcción
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#64748B', fontSize: '0.85rem', lineHeight: 1.6 }}>
          {PROXIMOS.map(p => <li key={p}>{p}</li>)}
        </ul>
      </div>
    </div>
  );
}
