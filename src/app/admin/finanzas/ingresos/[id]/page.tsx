'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Handshake, Loader2, Save, Search, TriangleAlert, X } from 'lucide-react';

// Completar un ingreso en el escritorio: factura, retenciones del comprobante,
// fecha de recaudo, CIIU. Y corregir lo capturado con prisa.
//
// ESPEJO FIEL: el formulario arranca con el valor real de cada campo y los
// reenvía todos; lo vacío viaja como null, no como cadena vacía.

const C = { navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B', ok: '#15803D', warn: '#B45309', warnBg: '#FFFBEB', bad: '#B91C1C', badBg: '#FEF2F2' };

interface Parte { rol: string; quien: string; valor: string; genera_egreso: boolean }
interface Detalle {
  id: string; fecha_causacion: string; fecha_recaudo: string | null; valor_base: string;
  iva_generado: string; retefuente_practicada: string; reteica_practicada: string; reteiva_practicada: string;
  retefuente_sugerida: string | null; discrepancia: string | null; nota_discrepancia: string | null;
  numero_factura: string | null; estado: string; ciiu: string | null; municipio_ica: string | null;
  facturamos_total: boolean; notas: string | null; registrado_por: string | null; creado_en: string;
  tipo: { id: string; label: string; slug: string; ciiu: string | null };
  tercero: { id: string; nombre: string; numero_documento: string } | null;
  propiedad: { id: string; etiqueta: string } | null;
  partes: Parte[]; viene_de_custodia: string | null;
  anio: { anio: number; activo: boolean; responsable_iva: boolean | null };
  faltan: string[];
}
interface Tipo { id: string; nombre: string }
interface Destino { id: string; etiqueta: string; detalle: string }

const dinero = (v: string) => `$ ${Number(v).toLocaleString('es-CO')}`;
const pesos = (v: string) => { const n = v.replace(/\D/g, ''); return n === '' ? '' : Number(n).toLocaleString('es-CO'); };
const crudo = (v: string) => v.replace(/\./g, '');
const oNull = (v: string) => { const t = v.trim(); return t === '' ? null : t; };

export default function DetalleIngresoPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Detalle | null>(null);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [tercero, setTercero] = useState<Destino | null>(null);
  const [propiedad, setPropiedad] = useState<Destino | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch(`/api/admin/finanzas/ingresos/${id}`),
      fetch('/api/admin/finanzas/ingresos?vista=captura'),
    ]);
    if (r1.status === 401) { window.location.href = '/admin/login'; return; }
    if (!r1.ok) { setError('Ese ingreso no existe.'); return; }
    const det: Detalle = await r1.json();
    setD(det);
    setTipos(((await r2.json()).tipos ?? []).map((t: { id: string; nombre: string }) => ({ id: t.id, nombre: t.nombre })));
    setForm({
      fecha_causacion: det.fecha_causacion,
      fecha_recaudo: det.fecha_recaudo ?? '',
      valor_base: Number(det.valor_base).toLocaleString('es-CO'),
      tipo_servicio_id: det.tipo.id,
      numero_factura: det.numero_factura ?? '',
      retefuente_practicada: Number(det.retefuente_practicada).toLocaleString('es-CO'),
      reteica_practicada: Number(det.reteica_practicada).toLocaleString('es-CO'),
      reteiva_practicada: Number(det.reteiva_practicada).toLocaleString('es-CO'),
      iva_generado: Number(det.iva_generado).toLocaleString('es-CO'),
      ciiu: det.ciiu ?? '',
      municipio_ica: det.municipio_ica ?? '',
      notas: det.notas ?? '',
    });
    setTercero(det.tercero ? { id: det.tercero.id, etiqueta: det.tercero.nombre, detalle: det.tercero.numero_documento } : null);
    setPropiedad(det.propiedad ? { id: det.propiedad.id, etiqueta: det.propiedad.etiqueta, detalle: '' } : null);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar() {
    if (!d) return;
    setGuardando(true); setError(''); setAviso('');
    const cuerpo = {
      fecha_causacion: form.fecha_causacion,
      fecha_recaudo: oNull(form.fecha_recaudo ?? ''),
      valor_base: crudo(form.valor_base ?? ''),
      tipo_servicio_id: form.tipo_servicio_id,
      tercero_id: tercero?.id ?? null,
      property_id: propiedad?.id ?? null,
      numero_factura: oNull(form.numero_factura ?? ''),
      retefuente_practicada: crudo(form.retefuente_practicada ?? ''),
      reteica_practicada: crudo(form.reteica_practicada ?? ''),
      reteiva_practicada: crudo(form.reteiva_practicada ?? ''),
      iva_generado: crudo(form.iva_generado ?? ''),
      ciiu: oNull(form.ciiu ?? ''),
      municipio_ica: oNull(form.municipio_ica ?? ''),
      notas: oNull(form.notas ?? ''),
    };
    const r = await fetch(`/api/admin/finanzas/ingresos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
    });
    const j = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { setError(j.error ?? 'No se pudo guardar.'); return; }
    setAviso(j.faltan?.length ? `Guardado. Todavía falta: ${j.faltan.join(' · ')}.` : 'Guardado y completo.');
    cargar();
  }

  if (error && !d) return <p style={{ color: C.bad }}>{error}</p>;
  if (!d) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
    <Loader2 size={24} style={{ color: C.navy, animation: 'girar 1s linear infinite' }} />
    <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
  </div>;

  const inputS: React.CSSProperties = { padding: '10px 12px', border: `1.5px solid ${C.line}`, borderRadius: 10, fontSize: '0.92rem', color: C.navy, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' };
  const labelS: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const faltanPropios = d.faltan.filter(x => !/CIIU/.test(x));

  return (
    <div style={{ maxWidth: 720, paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <button onClick={() => router.push('/admin/finanzas/ingresos')} aria-label="Volver"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.navy, padding: 6 }}><ArrowLeft size={22} /></button>
        <div>
          <strong style={{ color: C.navy, fontSize: '1.05rem' }}>{dinero(d.valor_base)}</strong>
          <div style={{ color: C.muted, fontSize: '0.78rem' }}>
            {d.tipo.label} · registrado por {d.registrado_por ?? '—'}
            {d.viene_de_custodia && ` · viene de custodia: ${d.viene_de_custodia}`}
          </div>
        </div>
      </div>

      {faltanPropios.length > 0 && (
        <div style={{ background: C.warnBg, border: '1.5px solid #FDE68A', color: '#78350F', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
          <AlertCircle size={14} style={{ verticalAlign: -2 }} /> Falta: {faltanPropios.join(' · ')}.
        </div>
      )}
      {!d.ciiu && (
        <div style={{ background: '#F8FAFC', border: `1.5px solid ${C.line}`, color: C.muted, borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '0.6rem', fontSize: '0.82rem' }}>
          El CIIU lo confirma el contador. Si ya lo tienes, escríbelo abajo y el ICA de este ingreso pasa a ser calculable.
        </div>
      )}
      {d.discrepancia && (
        <div style={{ background: C.badBg, border: '1.5px solid #FECACA', color: C.bad, borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '0.6rem', fontSize: '0.84rem' }}>
          <TriangleAlert size={14} style={{ verticalAlign: -2 }} /> {d.nota_discrepancia}
        </div>
      )}
      {error && <div role="alert" style={{ background: C.badBg, border: '2px solid #FCA5A5', color: '#7F1D1D', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
      {aviso && <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: C.ok, borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{aviso}</div>}

      {d.partes.length > 0 && (
        <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E3A8A', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.84rem' }}>
          <Handshake size={14} style={{ verticalAlign: -2 }} />{' '}
          {d.facturamos_total ? 'Facturamos el total' : 'Cada uno facturó lo suyo'}:{' '}
          {d.partes.map(p => `${p.quien} ${dinero(p.valor)}${p.genera_egreso ? ' (gasto)' : ''}`).join(' · ')}.
          <div style={{ marginTop: 4, fontSize: '0.78rem' }}>El reparto no se edita aquí: cambiarlo movería la base gravable y el gasto ya creado.</div>
        </div>
      )}

      <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelS}>Valor (base gravable)</label>
            <input value={form.valor_base ?? ''} onChange={e => set('valor_base', pesos(e.target.value))} inputMode="numeric"
              disabled={d.partes.length > 0} style={{ ...inputS, background: d.partes.length > 0 ? '#F8FAFC' : '#fff' }} />
          </div>
          <div>
            <label style={labelS}>Tipo de servicio</label>
            <select value={form.tipo_servicio_id ?? ''} onChange={e => set('tipo_servicio_id', e.target.value)} style={inputS}>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={labelS}>Causado el</label>
            <input type="date" value={form.fecha_causacion ?? ''} onChange={e => set('fecha_causacion', e.target.value)} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Entró la plata el</label>
            <input type="date" value={form.fecha_recaudo ?? ''} onChange={e => set('fecha_recaudo', e.target.value)} style={inputS} />
            <p style={{ color: C.muted, fontSize: '0.74rem', margin: '4px 0 0' }}>Vacío = causado, sin cobrar.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelS}>Cliente</label>
            <Selector tipo="cliente" elegido={tercero} onElegir={setTercero} />
          </div>
          <div>
            <label style={labelS}>Propiedad</label>
            <Selector tipo="propiedad" elegido={propiedad} onElegir={setPropiedad} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <div>
            <label style={labelS}>Número de factura</label>
            <input value={form.numero_factura ?? ''} onChange={e => set('numero_factura', e.target.value)} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Retefuente que me practicaron</label>
            <input value={form.retefuente_practicada ?? ''} onChange={e => set('retefuente_practicada', pesos(e.target.value))} inputMode="numeric" style={inputS} />
            <p style={{ color: C.muted, fontSize: '0.74rem', margin: '4px 0 0' }}>
              {d.retefuente_sugerida ? `Según los parámetros: ${dinero(d.retefuente_sugerida)}.` : 'Tal como figura en su comprobante.'}
            </p>
          </div>
          <div>
            <label style={labelS}>ReteICA que me practicaron</label>
            <input value={form.reteica_practicada ?? ''} onChange={e => set('reteica_practicada', pesos(e.target.value))} inputMode="numeric" style={inputS} />
          </div>
          <div>
            <label style={labelS}>CIIU de este ingreso</label>
            <input value={form.ciiu ?? ''} onChange={e => set('ciiu', e.target.value)} placeholder="6820" style={inputS} />
          </div>
          <div>
            <label style={labelS}>Municipio del ICA</label>
            <input value={form.municipio_ica ?? ''} onChange={e => set('municipio_ica', e.target.value)} style={inputS} />
          </div>
          {d.anio.responsable_iva === true && (
            <>
              <div>
                <label style={labelS}>IVA generado</label>
                <input value={form.iva_generado ?? ''} onChange={e => set('iva_generado', pesos(e.target.value))} inputMode="numeric" style={inputS} />
              </div>
              <div>
                <label style={labelS}>ReteIVA que me practicaron</label>
                <input value={form.reteiva_practicada ?? ''} onChange={e => set('reteiva_practicada', pesos(e.target.value))} inputMode="numeric" style={inputS} />
              </div>
            </>
          )}
        </div>

        {d.anio.responsable_iva !== true && (
          <p style={{ color: C.muted, fontSize: '0.78rem', margin: 0 }}>
            El año {d.anio.anio} no es responsable de IVA, así que este ingreso no lleva IVA ni reteIVA.
          </p>
        )}

        <div>
          <label style={labelS}>Notas</label>
          <textarea value={form.notas ?? ''} onChange={e => set('notas', e.target.value)} rows={2} style={{ ...inputS, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: q, rol: 'CLIENTE' }),
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
          {creando ? 'Creando…' : `Crear «${q.trim()}»`}
        </button>
      )}
    </div>
  );
}
