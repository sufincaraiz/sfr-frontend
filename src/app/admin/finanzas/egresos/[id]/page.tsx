'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Camera, Check, Loader2, Paperclip, Save, Search, X } from 'lucide-react';
import { NATURALEZAS, type Naturaleza } from '@/lib/finanzas/captura';

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETAR UN GASTO EN EL ESCRITORIO
//
// La captura en la calle pide lo mínimo; aquí se pone el resto y se corrige lo
// que se tecleó con prisa (valor, categoría, naturaleza).
//
// ESPEJO FIEL DE LA BASE: el formulario se llena con el valor REAL de cada
// campo y se envían TODOS, incluidos los que nadie tocó. Así un campo intacto
// se reenvía idéntico y es imposible blanquearlo sin querer. Lo vacío viaja
// como null, no como cadena vacía: son cosas distintas.
// ─────────────────────────────────────────────────────────────────────────────

const C = { navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B', ok: '#15803D', warn: '#B45309', warnBg: '#FFFBEB', bad: '#B91C1C', badBg: '#FEF2F2' };

interface Ref { id: string; nombre?: string; etiqueta?: string; numero_documento?: string }
interface Detalle {
  id: string; fecha: string; descripcion: string; valor_base: string; iva_pagado: string;
  retefuente_practicada: string; reteica_practicada: string;
  numero_factura_proveedor: string | null; metodo_pago: string | null; es_deducible: boolean;
  naturaleza: Naturaleza; estado_reembolso: string | null; motivo_reclasificacion: string | null;
  reclasificado_de: string | null; por_completar: boolean; tiene_recibo: boolean;
  registrado_por: string | null; creado_en: string;
  categoria: { id: string; nombre: string };
  tercero: Ref | null; reembolsa: Ref | null; propiedad: { id: string; etiqueta: string } | null;
  anio: { anio: number; activo: boolean; responsable_iva: boolean | null };
  faltan: string[];
}
interface Categoria { id: string; nombre: string }
interface Destino { id: string; etiqueta: string; detalle: string }

const dinero = (v: string) => `$ ${Number(v).toLocaleString('es-CO')}`;
const pesos = (v: string) => { const n = v.replace(/\D/g, ''); return n === '' ? '' : Number(n).toLocaleString('es-CO'); };
const crudo = (v: string) => v.replace(/\./g, '');
/** Campo de texto vacío = null. Nunca cadena vacía: son cosas distintas. */
const oNull = (v: string) => { const t = v.trim(); return t === '' ? null : t; };

export default function DetalleEgresoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Detalle | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [form, setForm] = useState<Record<string, string | boolean | null>>({});
  const [tercero, setTercero] = useState<Destino | null>(null);
  const [propiedad, setPropiedad] = useState<Destino | null>(null);
  const [reembolsa, setReembolsa] = useState<Destino | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [adjuntando, setAdjuntando] = useState(false);
  const camara = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch(`/api/admin/finanzas/egresos/${id}`),
      fetch('/api/admin/finanzas/egresos?vista=captura'),
    ]);
    if (r1.status === 401) { window.location.href = '/admin/login'; return; }
    if (!r1.ok) { setError('Ese gasto no existe.'); return; }
    const det: Detalle = await r1.json();
    setD(det);
    setCategorias((await r2.json()).categorias ?? []);
    // ESPEJO: el formulario arranca con lo que hay en la base, tal cual.
    setForm({
      fecha: det.fecha,
      descripcion: det.descripcion,
      valor_base: Number(det.valor_base).toLocaleString('es-CO'),
      categoria_id: det.categoria.id,
      naturaleza: det.naturaleza,
      numero_factura_proveedor: det.numero_factura_proveedor ?? '',
      metodo_pago: det.metodo_pago ?? '',
      es_deducible: det.es_deducible,
      iva_pagado: Number(det.iva_pagado).toLocaleString('es-CO'),
      retefuente_practicada: Number(det.retefuente_practicada).toLocaleString('es-CO'),
      reteica_practicada: Number(det.reteica_practicada).toLocaleString('es-CO'),
    });
    setTercero(det.tercero ? { id: det.tercero.id, etiqueta: det.tercero.nombre ?? '', detalle: det.tercero.numero_documento ?? '' } : null);
    setPropiedad(det.propiedad ? { id: det.propiedad.id, etiqueta: det.propiedad.etiqueta, detalle: '' } : null);
    setReembolsa(det.reembolsa ? { id: det.reembolsa.id, etiqueta: det.reembolsa.nombre ?? '', detalle: '' } : null);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar() {
    if (!d) return;
    setGuardando(true); setError(''); setAviso('');
    // Se envían TODOS los campos de la lista blanca, con su valor actual:
    // lo que nadie tocó viaja idéntico y no se puede blanquear por omisión.
    const cuerpo = {
      fecha: form.fecha as string,
      descripcion: oNull(String(form.descripcion ?? '')),
      valor_base: crudo(String(form.valor_base ?? '')),
      categoria_id: form.categoria_id as string,
      naturaleza: form.naturaleza as Naturaleza,
      tercero_id: tercero?.id ?? null,
      property_id: propiedad?.id ?? null,
      reembolsa_tercero_id: reembolsa?.id ?? null,
      numero_factura_proveedor: oNull(String(form.numero_factura_proveedor ?? '')),
      metodo_pago: oNull(String(form.metodo_pago ?? '')),
      es_deducible: !!form.es_deducible,
      iva_pagado: crudo(String(form.iva_pagado ?? '')),
      retefuente_practicada: crudo(String(form.retefuente_practicada ?? '')),
      reteica_practicada: crudo(String(form.reteica_practicada ?? '')),
    };
    const r = await fetch(`/api/admin/finanzas/egresos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
    });
    const j = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { setError(j.error ?? 'No se pudo guardar.'); return; }
    setAviso(j.por_completar ? `Guardado. Todavía falta: ${j.faltan.join(' · ')}.` : 'Guardado y completo.');
    cargar();
  }

  async function adjuntarRecibo(file: File) {
    setAdjuntando(true); setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.round(bitmap.width * escala); lienzo.height = Math.round(bitmap.height * escala);
      lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
      const blob: Blob = await new Promise(res => lienzo.toBlob(b => res(b!), 'image/jpeg', 0.7));
      const fd = new FormData();
      fd.append('archivo', new File([blob], 'recibo.jpg', { type: 'image/jpeg' }));
      const rf = await fetch('/api/admin/finanzas/recibos', { method: 'POST', body: fd });
      if (!rf.ok) throw new Error((await rf.json().catch(() => ({}))).error ?? `La subida respondió ${rf.status}.`);
      const { public_id } = await rf.json();
      const res = await fetch(`/api/admin/finanzas/egresos/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'adjuntar-recibo', public_id }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo adjuntar.');
      setAviso('Recibo adjuntado.');
      cargar();
    } catch (e) {
      setError(e instanceof Error ? `El recibo NO se adjuntó: ${e.message}` : 'El recibo NO se adjuntó.');
    }
    setAdjuntando(false);
  }

  if (error && !d) return <p style={{ color: C.bad }}>{error}</p>;
  if (!d) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
    <Loader2 size={24} style={{ color: C.navy, animation: 'girar 1s linear infinite' }} />
    <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
  </div>;

  const inputS: React.CSSProperties = { padding: '10px 12px', border: `1.5px solid ${C.line}`, borderRadius: 10, fontSize: '0.92rem', color: C.navy, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' };
  const labelS: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };
  const set = (k: string, v: string | boolean | null) => setForm(f => ({ ...f, [k]: v }));
  const esReembolsable = form.naturaleza === 'REEMBOLSABLE';

  return (
    <div style={{ maxWidth: 720, paddingBottom: '3rem' }}>
      <input ref={camara} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) adjuntarRecibo(f); }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <button onClick={() => router.push('/admin/finanzas/egresos')} aria-label="Volver"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.navy, padding: 6 }}><ArrowLeft size={22} /></button>
        <div>
          <strong style={{ color: C.navy, fontSize: '1.05rem' }}>{dinero(d.valor_base)}</strong>
          <div style={{ color: C.muted, fontSize: '0.78rem' }}>
            Registrado por {d.registrado_por ?? '—'} el {new Date(d.creado_en).toLocaleDateString('es-CO')}
          </div>
        </div>
      </div>

      {d.faltan.length > 0 && (
        <div style={{ background: C.warnBg, border: '1.5px solid #FDE68A', color: '#78350F', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <AlertCircle size={14} style={{ verticalAlign: -2 }} /> Falta: {d.faltan.join(' · ')}.
        </div>
      )}
      {error && <div role="alert" style={{ background: C.badBg, border: '2px solid #FCA5A5', color: '#7F1D1D', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
      {aviso && <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: C.ok, borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{aviso}</div>}

      <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelS}>Valor</label>
            <input value={String(form.valor_base ?? '')} onChange={e => set('valor_base', pesos(e.target.value))} inputMode="numeric" style={inputS} />
          </div>
          <div>
            <label style={labelS}>Fecha</label>
            <input type="date" value={String(form.fecha ?? '')} onChange={e => set('fecha', e.target.value)} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Categoría</label>
            <select value={String(form.categoria_id ?? '')} onChange={e => set('categoria_id', e.target.value)} style={inputS}>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={labelS}>Descripción</label>
          <input value={String(form.descripcion ?? '')} onChange={e => set('descripcion', e.target.value)}
            placeholder="Qué se compró exactamente" style={inputS} />
        </div>

        <div>
          <label style={labelS}>¿Quién lo paga al final?</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {NATURALEZAS.map(n => (
              <button key={n.valor} type="button" onClick={() => set('naturaleza', n.valor)}
                style={{ flex: '1 1 150px', textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${form.naturaleza === n.valor ? C.navy : C.line}`,
                  background: form.naturaleza === n.valor ? '#F8FAFC' : '#fff' }}>
                <div style={{ color: C.navy, fontWeight: 700, fontSize: '0.86rem' }}>{n.titulo}</div>
                <div style={{ color: C.muted, fontSize: '0.74rem' }}>{n.ayuda}</div>
              </button>
            ))}
          </div>
          {d.reclasificado_de && (
            <p style={{ color: C.muted, fontSize: '0.76rem', marginTop: 6 }}>
              Antes era {d.reclasificado_de.replace('_', ' ').toLowerCase()}
              {d.motivo_reclasificacion ? `: ${d.motivo_reclasificacion}` : '.'}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelS}>Proveedor</label>
            <Selector tipo="cliente" elegido={tercero} onElegir={setTercero} />
          </div>
          <div>
            <label style={labelS}>Propiedad de la operación</label>
            <Selector tipo="propiedad" elegido={propiedad} onElegir={setPropiedad} />
          </div>
          {esReembolsable && (
            <div>
              <label style={labelS}>Cliente que lo devuelve</label>
              <Selector tipo="cliente" elegido={reembolsa} onElegir={setReembolsa} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelS}>Número de factura</label>
            <input value={String(form.numero_factura_proveedor ?? '')} onChange={e => set('numero_factura_proveedor', e.target.value)} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Método de pago</label>
            <input value={String(form.metodo_pago ?? '')} onChange={e => set('metodo_pago', e.target.value)} placeholder="efectivo, transferencia…" style={inputS} />
          </div>
          <div>
            <label style={labelS}>Retefuente que practicamos</label>
            <input value={String(form.retefuente_practicada ?? '')} onChange={e => set('retefuente_practicada', pesos(e.target.value))} inputMode="numeric" style={inputS} />
          </div>
          <div>
            <label style={labelS}>ReteICA que practicamos</label>
            <input value={String(form.reteica_practicada ?? '')} onChange={e => set('reteica_practicada', pesos(e.target.value))} inputMode="numeric" style={inputS} />
          </div>
          {d.anio.responsable_iva === true && (
            <div>
              <label style={labelS}>IVA pagado</label>
              <input value={String(form.iva_pagado ?? '')} onChange={e => set('iva_pagado', pesos(e.target.value))} inputMode="numeric" style={inputS} />
            </div>
          )}
        </div>

        {d.anio.responsable_iva !== true && (
          <p style={{ color: C.muted, fontSize: '0.78rem', margin: 0 }}>
            El año {d.anio.anio} no es responsable de IVA: el IVA pagado va dentro del valor, como costo.
          </p>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.86rem', color: C.navy, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!form.es_deducible} onChange={e => set('es_deducible', e.target.checked)} />
          Deducible en renta
          <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.78rem' }}>— lo decide el contador para atención a clientes</span>
        </label>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          {d.tiene_recibo ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.ok, fontSize: '0.82rem', fontWeight: 700 }}>
              <Paperclip size={14} /> Recibo adjunto
            </span>
          ) : (
            <button type="button" onClick={() => camara.current?.click()} disabled={adjuntando}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1.5px solid ${C.warn}`, color: C.warn, background: '#fff', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
              {adjuntando ? <Loader2 size={14} style={{ animation: 'girar 1s linear infinite' }} /> : <Camera size={14} />} Adjuntar recibo
            </button>
          )}
          <button onClick={guardar} disabled={guardando}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: C.navy, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontWeight: 800, cursor: 'pointer' }}>
            {guardando ? <Loader2 size={16} style={{ animation: 'girar 1s linear infinite' }} /> : <Save size={16} />} Guardar
          </button>
        </div>
      </div>
      <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

/** Buscador con alta rápida: si el proveedor no existe, se crea con el nombre. */
function Selector({ tipo, elegido, onElegir }: { tipo: 'propiedad' | 'cliente'; elegido: Destino | null; onElegir: (d: Destino | null) => void }) {
  const [q, setQ] = useState('');
  const [lista, setLista] = useState<Destino[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);

  const buscar = useCallback(async (texto: string) => {
    try {
      const r = await fetch(`/api/admin/finanzas/destinos?q=${encodeURIComponent(texto)}`);
      const d = await r.json();
      setLista(tipo === 'propiedad' ? d.propiedades ?? [] : d.terceros ?? []);
    } catch { /* la lista queda como esté */ }
  }, [tipo]);

  useEffect(() => { if (abierto) buscar(q); }, [abierto, q, buscar]);

  if (elegido && !abierto) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${C.line}`, borderRadius: 10, padding: '9px 11px' }}>
        <span style={{ flex: 1, color: C.navy, fontWeight: 600, fontSize: '0.88rem' }}>{elegido.etiqueta}</span>
        <button type="button" onClick={() => setAbierto(true)} style={{ border: 'none', background: 'none', color: C.blue, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>cambiar</button>
        <button type="button" onClick={() => onElegir(null)} aria-label="Quitar" style={{ border: 'none', background: 'none', color: C.muted, cursor: 'pointer' }}><X size={15} /></button>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        style={{ width: '100%', textAlign: 'left', border: `1.5px dashed ${C.line}`, borderRadius: 10, padding: '10px 12px', background: '#fff', color: C.muted, cursor: 'pointer', fontSize: '0.88rem' }}>
        Sin asignar — elegir
      </button>
    );
  }

  async function crear() {
    setCreando(true);
    try {
      const r = await fetch('/api/admin/finanzas/destinos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: q, rol: 'PROVEEDOR' }),
      });
      if (r.ok) { onElegir(await r.json()); setAbierto(false); }
    } finally { setCreando(false); }
  }

  return (
    <div style={{ border: `1.5px solid ${C.navy}`, borderRadius: 10, padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Search size={15} style={{ color: C.muted }} />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={tipo === 'propiedad' ? 'Buscar propiedad…' : 'Buscar o crear…'}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.88rem', color: C.navy, fontFamily: 'inherit' }} />
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" style={{ border: 'none', background: 'none', color: C.muted, cursor: 'pointer' }}><X size={15} /></button>
      </div>
      <div style={{ maxHeight: 170, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {lista.map(x => (
          <button key={x.id} type="button" onClick={() => { onElegir(x); setAbierto(false); }}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', cursor: 'pointer', color: C.navy, fontSize: '0.85rem' }}>
            {x.etiqueta}
            {x.detalle && <span style={{ display: 'block', fontSize: '0.73rem', color: C.muted }}>{x.detalle}</span>}
          </button>
        ))}
        {lista.length === 0 && <span style={{ color: C.muted, fontSize: '0.82rem', padding: 4 }}>Sin resultados.</span>}
      </div>
      {tipo === 'cliente' && q.trim().length >= 3 && (
        <button type="button" onClick={crear} disabled={creando}
          style={{ marginTop: 6, width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px dashed ${C.blue}`, background: '#fff', color: C.blue, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
          {creando ? 'Creando…' : `Crear «${q.trim()}» (datos del RUT después)`}
        </button>
      )}
    </div>
  );
}
