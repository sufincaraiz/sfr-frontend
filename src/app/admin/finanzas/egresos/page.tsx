'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Camera, Loader2, Paperclip } from 'lucide-react';

// Listado de egresos con filtros por naturaleza y categoría. La naturaleza se
// ve siempre: es la diferencia entre un gasto y una cuenta por cobrar.

const C = { navy: '#0D2D5E', line: '#E2E8F0', muted: '#64748B', warn: '#B45309', warnBg: '#FFFBEB' };

interface Fila {
  id: string; fecha: string; descripcion: string; valor: string; naturaleza: string;
  estado_reembolso: string | null; por_completar: boolean; tiene_recibo: boolean;
  categoria: string; propiedad: string | null; reembolsa: string | null; proveedor: string | null;
}

const ETIQUETA: Record<string, { txt: string; bg: string; fg: string }> = {
  DEL_NEGOCIO: { txt: 'Del negocio', bg: '#F1F5F9', fg: '#334155' },
  DE_OPERACION: { txt: 'De operación', bg: '#EFF6FF', fg: '#1D4ED8' },
  REEMBOLSABLE: { txt: 'Por cobrar', bg: '#FFFBEB', fg: '#B45309' },
};

const dinero = (v: string) => `$ ${Number(v).toLocaleString('es-CO')}`;

/** Misma compresión que en la captura: la foto se toma con datos móviles. */
async function comprimir(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const lado = 1600;
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala), h = Math.round(bitmap.height * escala);
  const lienzo = document.createElement('canvas');
  lienzo.width = w; lienzo.height = h;
  lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  return new Promise(r => lienzo.toBlob(b => r(b!), 'image/jpeg', 0.7));
}
const dia = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

export default function EgresosPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [naturaleza, setNaturaleza] = useState('');
  const [soloPorCompletar, setSoloPorCompletar] = useState(false);
  const [adjuntando, setAdjuntando] = useState('');
  const [errorAdjuntar, setErrorAdjuntar] = useState('');
  const camara = useRef<HTMLInputElement>(null);
  const objetivo = useRef<string>('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const p = new URLSearchParams();
    if (naturaleza) p.set('naturaleza', naturaleza);
    if (soloPorCompletar) p.set('por_completar', '1');
    const r = await fetch(`/api/admin/finanzas/egresos?${p}`);
    if (r.status === 401) { window.location.href = '/admin/login'; return; }
    const d = await r.json();
    setFilas(d.egresos ?? []);
    setCargando(false);
  }, [naturaleza, soloPorCompletar]);

  useEffect(() => { cargar(); }, [cargar]);

  /**
   * Adjunta el recibo a un gasto YA guardado: el caso del gasto capturado en
   * la calle sin foto, o de aquel cuya subida falló. Mismo camino firmado y
   * privado que en la captura; al terminar, el gasto deja de estar «sin
   * recibo» y el conteo del hub se actualiza en la siguiente carga.
   */
  async function adjuntar(file: File) {
    const id = objetivo.current;
    if (!id) return;
    setAdjuntando(id); setErrorAdjuntar('');
    try {
      const fd = new FormData();
      fd.append('archivo', new File([await comprimir(file)], 'recibo.jpg', { type: 'image/jpeg' }));
      const rf = await fetch('/api/admin/finanzas/recibos', { method: 'POST', body: fd });
      if (!rf.ok) {
        const j = await rf.json().catch(() => ({}));
        throw new Error(j.error ?? `La subida respondió ${rf.status}.`);
      }
      const { public_id } = await rf.json();
      const res = await fetch(`/api/admin/finanzas/egresos/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'adjuntar-recibo', public_id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'No se pudo adjuntar el recibo.');
      }
      await cargar();
    } catch (e) {
      // Ruidoso a propósito: un recibo que no se adjunta y nadie lo nota es el
      // defecto que ya nos pasó una vez.
      setErrorAdjuntar(e instanceof Error ? e.message : 'No se pudo adjuntar el recibo.');
    }
    setAdjuntando('');
  }

  const chip = (activo: boolean): React.CSSProperties => ({
    padding: '7px 13px', borderRadius: 999, border: `1.5px solid ${activo ? C.navy : C.line}`,
    background: activo ? C.navy : '#fff', color: activo ? '#fff' : C.navy,
    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
  });

  return (
    <div style={{ maxWidth: 900 }}>
      <input ref={camara} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) adjuntar(f); }} />
      {errorAdjuntar && (
        <div role="alert" style={{ background: '#FEF2F2', border: '2px solid #FCA5A5', color: '#7F1D1D', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
          El recibo NO se adjuntó: {errorAdjuntar}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button onClick={() => setNaturaleza('')} style={chip(naturaleza === '')}>Todos</button>
        {Object.entries(ETIQUETA).map(([k, v]) => (
          <button key={k} onClick={() => setNaturaleza(k)} style={chip(naturaleza === k)}>{v.txt}</button>
        ))}
        <button onClick={() => setSoloPorCompletar(v => !v)} style={{ ...chip(soloPorCompletar), marginLeft: 'auto' }}>
          Por completar
        </button>
      </div>

      {cargando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 size={24} style={{ color: C.navy, animation: 'girar 1s linear infinite' }} />
          <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
        </div>
      ) : filas.length === 0 ? (
        <p style={{ color: C.muted }}>
          Todavía no hay gastos registrados. <Link href="/admin/finanzas/egresos/nuevo" style={{ color: '#1B56A1', fontWeight: 700 }}>Registrar el primero</Link>.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filas.map(f => {
            const e = ETIQUETA[f.naturaleza] ?? ETIQUETA.DEL_NEGOCIO!;
            return (
              <div key={f.id} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '0.85rem 1rem', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 46, color: C.muted, fontSize: '0.78rem', fontWeight: 700, paddingTop: 2 }}>{dia(f.fecha)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.navy, fontWeight: 700 }}>{f.descripcion}</div>
                  <div style={{ color: C.muted, fontSize: '0.8rem' }}>
                    {f.categoria}
                    {f.propiedad && ` · ${f.propiedad}`}
                    {f.reembolsa && ` · cobrar a ${f.reembolsa}`}
                    {f.proveedor && ` · ${f.proveedor}`}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    <span style={{ background: e.bg, color: e.fg, fontWeight: 800, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999 }}>{e.txt}</span>
                    {f.naturaleza === 'REEMBOLSABLE' && f.estado_reembolso === 'PENDIENTE' && (
                      <span style={{ background: C.warnBg, color: C.warn, fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999 }}>no es gasto</span>
                    )}
                    {f.estado_reembolso === 'REEMBOLSADO' && <span style={{ color: '#15803D', fontSize: '0.72rem', fontWeight: 700 }}>reembolsado</span>}
                    {f.por_completar && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.warn, fontSize: '0.72rem', fontWeight: 700 }}>
                        <AlertCircle size={12} /> por completar
                      </span>
                    )}
                    {f.tiene_recibo
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: '0.72rem' }}><Paperclip size={12} /> recibo</span>
                      : (
                        <button type="button" disabled={adjuntando === f.id}
                          onClick={() => { objetivo.current = f.id; camara.current?.click(); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1.5px solid ${C.warn}`, background: '#fff', color: C.warn, borderRadius: 999, padding: '3px 10px', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>
                          {adjuntando === f.id ? <Loader2 size={12} style={{ animation: 'girar 1s linear infinite' }} /> : <Camera size={12} />}
                          {adjuntando === f.id ? 'Subiendo…' : 'Adjuntar recibo'}
                        </button>
                      )}
                  </div>
                </div>
                <div style={{ color: C.navy, fontWeight: 800, whiteSpace: 'nowrap' }}>{dinero(f.valor)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
