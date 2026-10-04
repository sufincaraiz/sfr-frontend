'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Handshake, Loader2, TriangleAlert } from 'lucide-react';

// Listado de ingresos. Dos cosas se ven siempre porque cambian el impuesto:
// si facturamos el total de una comisión compartida, y si lo que nos retuvieron
// difiere de lo que correspondía.

const C = { navy: '#0D2D5E', line: '#E2E8F0', muted: '#64748B', warn: '#B45309', warnBg: '#FFFBEB', bad: '#B91C1C', ok: '#15803D' };

interface Parte { rol: string; quien: string; valor: string; genera_egreso: boolean }
interface Fila {
  id: string; fecha: string; fecha_recaudo: string | null; valor: string; iva: string;
  retefuente: string; retefuente_sugerida: string | null; discrepancia: string | null; nota: string | null;
  factura: string | null; estado: string; ciiu: string | null; municipio_ica: string | null;
  facturamos_total: boolean; tipo: string; es_comision: boolean; cliente: string; propiedad: string | null;
  partes: Parte[]; faltan: string[]; por_completar: boolean;
}

const dinero = (v: string) => `$ ${Number(v).toLocaleString('es-CO')}`;

/**
 * Lo que falta y depende de NOSOTROS. El CIIU sale de aquí porque lo confirma
 * el contador y se muestra aparte, en gris: mezclarlo con factura y recaudo
 * haría que un pendiente ajeno pareciera un descuido propio.
 */
const faltanPropios = (faltan: string[]) => faltan.filter(x => !/CIIU/.test(x));
const dia = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

const ESTADO: Record<string, { bg: string; fg: string }> = {
  CAUSADO: { bg: '#FFFBEB', fg: '#B45309' },
  FACTURADO: { bg: '#EFF6FF', fg: '#1D4ED8' },
  COBRADO: { bg: '#F0FDF4', fg: '#15803D' },
  ANULADO: { bg: '#F1F5F9', fg: '#64748B' },
};

export default function IngresosPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await fetch('/api/admin/finanzas/ingresos');
    if (r.status === 401) { window.location.href = '/admin/login'; return; }
    const d = await r.json();
    setFilas(d.ingresos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <Loader2 size={24} style={{ color: C.navy, animation: 'girar 1s linear infinite' }} />
      <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
    </div>;
  }

  const total = filas.reduce((s, f) => s + Number(f.valor), 0);

  return (
    <div style={{ maxWidth: 900 }}>
      {filas.length === 0 ? (
        <p style={{ color: C.muted }}>
          Todavía no hay ingresos registrados. <Link href="/admin/finanzas/ingresos/nuevo" style={{ color: '#1B56A1', fontWeight: 700 }}>Registrar el primero</Link>.
        </p>
      ) : (
        <>
          <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
            <div style={{ color: C.muted, fontSize: '0.82rem' }}>{filas.length} ingreso{filas.length === 1 ? '' : 's'} · base gravable acumulada</div>
            <div style={{ color: C.navy, fontWeight: 800, fontSize: '1.6rem' }}>{dinero(String(total))}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filas.map(f => {
              const e = ESTADO[f.estado] ?? ESTADO.CAUSADO!;
              return (
                <div key={f.id} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '0.85rem 1rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 46, color: C.muted, fontSize: '0.78rem', fontWeight: 700, paddingTop: 2 }}>{dia(f.fecha)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.navy, fontWeight: 700 }}>{f.tipo}</div>
                    <div style={{ color: C.muted, fontSize: '0.8rem' }}>
                      {[f.cliente, f.propiedad, f.municipio_ica ? `ICA en ${f.municipio_ica}` : null, f.factura ? `factura ${f.factura}` : null]
                        .filter(Boolean).join(' · ')}
                    </div>

                    {f.partes.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: '0.78rem', color: C.muted }}>
                        <Handshake size={12} style={{ verticalAlign: -2 }} />{' '}
                        {f.facturamos_total ? 'Facturamos el total' : 'Cada uno facturó lo suyo'}:{' '}
                        {f.partes.map(p => `${p.quien} ${dinero(p.valor)}${p.genera_egreso ? ' (gasto)' : ''}`).join(' · ')}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                      <span style={{ background: e.bg, color: e.fg, fontWeight: 800, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999 }}>
                        {f.estado === 'CAUSADO' ? 'causado, sin cobrar' : f.estado.toLowerCase()}
                      </span>
                      {Number(f.retefuente) > 0 && (
                        <span style={{ color: C.muted, fontSize: '0.72rem' }}>retuvieron {dinero(f.retefuente)}</span>
                      )}
                      {f.discrepancia && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF2F2', color: C.bad, fontWeight: 800, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999 }}>
                          <TriangleAlert size={11} /> difiere {dinero(String(Math.abs(Number(f.discrepancia))))} del sugerido
                        </span>
                      )}
                      {/* Tres niveles, y el color los separa:
                          · ROJO  = algo no cuadra y hay que mirarlo (discrepancia).
                          · ÁMBAR = falta algo NUESTRO (factura, recaudo).
                          · GRIS  = esperamos a un tercero. El CIIU lo confirma
                                    el contador: es un pendiente esperado, no
                                    una falla, y no debe alarmar en cada fila. */}
                      {!f.ciiu && (
                        <span style={{ background: '#F1F5F9', color: C.muted, fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                          CIIU pendiente del contador
                        </span>
                      )}
                      {faltanPropios(f.faltan).length > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.warn, fontSize: '0.72rem', fontWeight: 700 }}>
                          <AlertCircle size={12} /> {faltanPropios(f.faltan).map(x => `falta ${x}`).join(' · ')}
                        </span>
                      )}
                    </div>

                    {f.nota && <div style={{ marginTop: 6, fontSize: '0.75rem', color: C.muted, fontStyle: 'italic' }}>{f.nota}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: C.navy, fontWeight: 800, whiteSpace: 'nowrap' }}>{dinero(f.valor)}</div>
                    {Number(f.iva) > 0 && <div style={{ color: C.muted, fontSize: '0.72rem' }}>+ IVA {dinero(f.iva)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
