'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, Clock } from 'lucide-react';

// Entrada del módulo de finanzas. Por ahora solo existe la pantalla de
// parámetros; terceros, egresos, ingresos, custodia y reportes llegan en ese
// orden. La tarjeta de parámetros solo se muestra si el menú del rol la incluye
// (la fuente es /api/admin/me, la misma que pinta la barra lateral).

const PROXIMOS = ['Terceros', 'Egresos', 'Ingresos y distribución de comisión', 'Custodia de dineros de terceros', 'Reportes'];

export default function FinanzasPage() {
  const [nav, setNav] = useState<{ prefix: string }[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => { if (r.status === 401) { window.location.href = '/admin/login'; return null; } return r.json(); })
      .then(d => d && setNav(d.nav ?? []))
      .catch(() => setNav([]));
  }, []);

  const verParametros = nav?.some(n => n.prefix === '/admin/finanzas/parametros');

  return (
    <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
