'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, HandCoins, Loader2 } from 'lucide-react';
import { tramoAntiguedad } from '@/lib/finanzas/captura';

// Cuentas POR COBRAR: gastos que adelantamos por cuenta de un cliente. No son
// gasto y su reembolso no es ingreso — por eso se saldan con un botón y no
// tecleando un ingreso, que inflaría las dos cifras.

const C = { navy: '#0D2D5E', line: '#E2E8F0', muted: '#64748B', warn: '#B45309', bad: '#B91C1C', ok: '#15803D' };

interface Fila { id: string; fecha: string; descripcion: string; valor: string; categoria: string; cliente: string; propiedad: string | null }

const dinero = (v: string) => `$ ${Number(v).toLocaleString('es-CO')}`;
const COLOR_TRAMO = { '0-30': C.muted, '31-60': C.warn, '+60': C.bad } as const;

export default function PorCobrarPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await fetch('/api/admin/finanzas/por-cobrar');
    if (r.status === 401) { window.location.href = '/admin/login'; return; }
    setFilas((await r.json()).porCobrar ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function accion(id: string, accion: 'reembolsado' | 'asumir') {
    let motivo = '';
    if (accion === 'asumir') {
      motivo = window.prompt('¿Por qué lo asume el negocio? Queda en el rastro de auditoría.') ?? '';
      if (motivo.trim().length < 5) return;
    } else if (!confirm('Confirmar que el cliente devolvió esta plata. No se registra como ingreso: cancela la cuenta por cobrar.')) {
      return;
    }
    setOcupado(id); setError('');
    const r = await fetch(`/api/admin/finanzas/egresos/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, motivo }),
    });
    if (!r.ok) setError((await r.json()).error ?? 'No se pudo completar.');
    setOcupado('');
    cargar();
  }

  const total = filas.reduce((s, f) => s + Number(f.valor), 0);

  if (cargando) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <Loader2 size={24} style={{ color: C.navy, animation: 'girar 1s linear infinite' }} />
      <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
    </div>;
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ color: C.muted, fontSize: '0.82rem' }}>Pendiente de cobrar a clientes</div>
        <div style={{ color: C.navy, fontWeight: 800, fontSize: '1.6rem' }}>{dinero(String(total))}</div>
        <div style={{ color: C.muted, fontSize: '0.8rem', marginTop: 4 }}>
          Esto NO es gasto ni ingreso: es plata adelantada por cuenta del cliente. No aparece en el estado de resultados.
        </div>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', color: C.bad, borderRadius: 10, padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

      {filas.length === 0 ? (
        <p style={{ color: C.muted }}>No hay nada por cobrar.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filas.map(f => {
            const tramo = tramoAntiguedad(new Date(f.fecha));
            return (
              <div key={f.id} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '0.9rem 1rem', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: C.navy, fontWeight: 700 }}>{f.descripcion}</div>
                  <div style={{ color: C.muted, fontSize: '0.8rem' }}>
                    {f.cliente} · {f.categoria}{f.propiedad ? ` · ${f.propiedad}` : ''}
                  </div>
                  <div style={{ color: COLOR_TRAMO[tramo], fontSize: '0.75rem', fontWeight: 800, marginTop: 4 }}>
                    {tramo === '0-30' ? 'menos de 30 días' : tramo === '31-60' ? 'entre 31 y 60 días' : 'más de 60 días'}
                  </div>
                </div>
                <div style={{ color: C.navy, fontWeight: 800 }}>{dinero(f.valor)}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => accion(f.id, 'reembolsado')} disabled={ocupado === f.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${C.ok}`, color: C.ok, background: '#fff', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                    <CheckCircle2 size={15} /> Reembolsado
                  </button>
                  <button onClick={() => accion(f.id, 'asumir')} disabled={ocupado === f.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${C.warn}`, color: C.warn, background: '#fff', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                    <HandCoins size={15} /> Lo asume el negocio
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
