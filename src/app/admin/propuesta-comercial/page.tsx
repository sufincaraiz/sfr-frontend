'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Loader2, ExternalLink, Upload, Plus, Trash2 } from 'lucide-react';
import type { PropuestaContent } from '@/lib/propuesta';

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dge1ls2a7';
const PRESET = 'sufincaraiz_properties';

const card: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' };
const inputS: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.875rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelS: React.CSSProperties = { fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };
const h3S: React.CSSProperties = { color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EFF6FF' };

function Txt({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <label style={labelS}>{label}</label>
      {area
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ ...inputS, resize: 'vertical', minHeight: 64 }} />
        : <input value={value} onChange={e => onChange(e.target.value)} style={inputS} />}
    </div>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [up, setUp] = useState(false);
  const upload = async (file: File) => {
    setUp(true);
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', PRESET); fd.append('folder', 'propuesta');
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd });
      const d = await res.json();
      if (d.secure_url) onChange(`${d.secure_url.replace('/upload/', '/upload/f_auto,q_auto,c_limit,w_1600/')}`);
    } catch { /* */ }
    setUp(false);
  };
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <label style={labelS}>{label}</label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" style={{ width: 92, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0', flexShrink: 0, background: '#F1F5F9' }} />
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        <button type="button" onClick={() => ref.current?.click()} disabled={up}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
          {up ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />} {up ? 'Subiendo…' : 'Cambiar imagen'}
        </button>
      </div>
    </div>
  );
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <label style={labelS}>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <textarea value={it} rows={2} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }} style={{ ...inputS, resize: 'vertical' }} />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} title="Quitar"
              style={{ flexShrink: 0, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, width: 36, cursor: 'pointer' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...items, ''])}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, border: '1.5px solid #E2E8F0', background: '#fff', color: '#1B56A1', borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
          <Plus size={13} /> Agregar
        </button>
      </div>
    </div>
  );
}

export default function AdminPropuestaPage() {
  const [c, setC] = useState<PropuestaContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/propuesta-comercial')
      .then(r => { if (r.status === 401) { window.location.href = '/admin/login'; } return r.json(); })
      .then(d => setC(d.data));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upd = (fn: (draft: any) => void) => setC(prev => { const n = structuredClone(prev); fn(n); return n; });

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/admin/propuesta-comercial', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: c }) });
      setMsg(res.ok ? '✅ Guardado. La propuesta ya está actualizada.' : '⚠️ No se pudo guardar.');
    } catch { setMsg('⚠️ Error de conexión.'); }
    finally { setSaving(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  if (!c) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748B', gap: 10 }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando propuesta…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 860 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>Propuesta comercial</h2>
        <a href="/propuesta-comercial" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B56A1', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}>
          Ver propuesta <ExternalLink size={14} />
        </a>
      </div>
      {msg && <div style={{ background: msg.startsWith('✅') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msg.startsWith('✅') ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '11px 15px', color: msg.startsWith('✅') ? '#15803D' : '#DC2626', fontWeight: 700, fontSize: '0.88rem' }}>{msg}</div>}

      {/* HERO */}
      <div style={card}>
        <h3 style={h3S}>Portada (Hero)</h3>
        <ImageField label="Imagen de fondo" value={c.hero.bgImage} onChange={v => upd(d => { d.hero.bgImage = v; })} />
        <Txt label="Etiqueta izquierda (admite HTML)" value={c.hero.tagLeft} onChange={v => upd(d => { d.hero.tagLeft = v; })} />
        <Txt label="Etiqueta derecha" value={c.hero.tagRight} onChange={v => upd(d => { d.hero.tagRight = v; })} />
        <Txt label="Título (admite <br> y <em>)" value={c.hero.titleHtml} onChange={v => upd(d => { d.hero.titleHtml = v; })} area />
        <Txt label="Subtítulo" value={c.hero.subtitle} onChange={v => upd(d => { d.hero.subtitle = v; })} />
        <Txt label="Etiqueta «preparado para»" value={c.hero.preparedLabel} onChange={v => upd(d => { d.hero.preparedLabel = v; })} />
        <Txt label="Nombre destinatario" value={c.hero.preparedName} onChange={v => upd(d => { d.hero.preparedName = v; })} />
        <Txt label="Rol / detalle" value={c.hero.preparedRole} onChange={v => upd(d => { d.hero.preparedRole = v; })} />
        <ListEditor label="Marcas (lockup)" items={c.hero.brands} onChange={v => upd(d => { d.hero.brands = v; })} />
      </div>

      {/* CONSORCIO */}
      <div style={card}>
        <h3 style={h3S}>01 · Consorcio</h3>
        <Txt label="Eyebrow" value={c.consorcio.eyebrow} onChange={v => upd(d => { d.consorcio.eyebrow = v; })} />
        <Txt label="Titular (lede)" value={c.consorcio.lede} onChange={v => upd(d => { d.consorcio.lede = v; })} area />
        <ImageField label="Imagen" value={c.consorcio.image} onChange={v => upd(d => { d.consorcio.image = v; })} />
        <ListEditor label="Párrafos de introducción" items={c.consorcio.intro} onChange={v => upd(d => { d.consorcio.intro = v; })} />
        <label style={labelS}>Estadísticas (número + etiqueta)</label>
        {c.consorcio.stats.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={s.n} onChange={e => upd(d => { d.consorcio.stats[i].n = e.target.value; })} style={{ ...inputS, maxWidth: 130 }} />
            <input value={s.l} onChange={e => upd(d => { d.consorcio.stats[i].l = e.target.value; })} style={inputS} />
          </div>
        ))}
        <label style={{ ...labelS, marginTop: '0.6rem' }}>Tarjetas de marca</label>
        {c.consorcio.brands.map((b, i) => (
          <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '0.9rem', marginBottom: 8 }}>
            <Txt label="Nombre" value={b.name} onChange={v => upd(d => { d.consorcio.brands[i].name = v; })} />
            <Txt label="Rol" value={b.role} onChange={v => upd(d => { d.consorcio.brands[i].role = v; })} />
            <Txt label="Descripción" value={b.desc} onChange={v => upd(d => { d.consorcio.brands[i].desc = v; })} area />
          </div>
        ))}
      </div>

      {/* CONTEXTO */}
      <div style={card}>
        <h3 style={h3S}>02 · Contexto</h3>
        <Txt label="Eyebrow" value={c.contexto.eyebrow} onChange={v => upd(d => { d.contexto.eyebrow = v; })} />
        <Txt label="Titular (admite <em>)" value={c.contexto.headingHtml} onChange={v => upd(d => { d.contexto.headingHtml = v; })} area />
        <ImageField label="Imagen de fondo (banda)" value={c.contexto.bandImage} onChange={v => upd(d => { d.contexto.bandImage = v; })} />
        <ListEditor label="Columna izquierda" items={c.contexto.colA} onChange={v => upd(d => { d.contexto.colA = v; })} />
        <ListEditor label="Columna derecha" items={c.contexto.colB} onChange={v => upd(d => { d.contexto.colB = v; })} />
        <Txt label="Frase destacada (pull quote)" value={c.contexto.pull} onChange={v => upd(d => { d.contexto.pull = v; })} area />
        <Txt label="Párrafo de mercado" value={c.contexto.market} onChange={v => upd(d => { d.contexto.market = v; })} area />
      </div>

      {/* METODO */}
      <div style={card}>
        <h3 style={h3S}>03 · Metodología</h3>
        <Txt label="Eyebrow" value={c.metodo.eyebrow} onChange={v => upd(d => { d.metodo.eyebrow = v; })} />
        <Txt label="Titular (admite <em>)" value={c.metodo.headingHtml} onChange={v => upd(d => { d.metodo.headingHtml = v; })} area />
        <Txt label="Introducción" value={c.metodo.intro} onChange={v => upd(d => { d.metodo.intro = v; })} area />
        <label style={labelS}>Items (6)</label>
        {c.metodo.items.map((it, i) => (
          <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '0.9rem', marginBottom: 8 }}>
            <Txt label={`Item ${i + 1} · Título`} value={it.title} onChange={v => upd(d => { d.metodo.items[i].title = v; })} />
            <Txt label="Texto" value={it.text} onChange={v => upd(d => { d.metodo.items[i].text = v; })} area />
          </div>
        ))}
        <Txt label="Cierre" value={c.metodo.closing} onChange={v => upd(d => { d.metodo.closing = v; })} area />
      </div>

      {/* PLANES */}
      <div style={card}>
        <h3 style={h3S}>04 · Planes</h3>
        <Txt label="Eyebrow" value={c.planes.eyebrow} onChange={v => upd(d => { d.planes.eyebrow = v; })} />
        <Txt label="Titular (admite <em>)" value={c.planes.headingHtml} onChange={v => upd(d => { d.planes.headingHtml = v; })} area />
        <Txt label="Garantías base (admite <b>)" value={c.planes.base} onChange={v => upd(d => { d.planes.base = v; })} area />
        <ImageField label="Imagen de fondo (banda)" value={c.planes.bandImage} onChange={v => upd(d => { d.planes.bandImage = v; })} />
        {(['premium', 'flexible'] as const).map(k => (
          <div key={k} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '1rem', marginBottom: 10 }}>
            <p style={{ fontWeight: 800, color: '#0D2D5E', fontSize: '0.85rem', marginBottom: 10 }}>{k === 'premium' ? 'Plan Premium (destacado)' : 'Plan Flexible'}</p>
            <Txt label="Etiqueta" value={c.planes[k].tag} onChange={v => upd(d => { d.planes[k].tag = v; })} />
            <Txt label="Nombre" value={c.planes[k].name} onChange={v => upd(d => { d.planes[k].name = v; })} />
            <Txt label="Subtítulo" value={c.planes[k].sub} onChange={v => upd(d => { d.planes[k].sub = v; })} area />
            <ListEditor label="Características (admite <b>)" items={c.planes[k].features} onChange={v => upd(d => { d.planes[k].features = v; })} />
          </div>
        ))}
      </div>

      {/* SERVICIOS */}
      <div style={card}>
        <h3 style={h3S}>05 · Servicios</h3>
        <Txt label="Eyebrow" value={c.servicios.eyebrow} onChange={v => upd(d => { d.servicios.eyebrow = v; })} />
        <Txt label="Titular (admite <em>)" value={c.servicios.headingHtml} onChange={v => upd(d => { d.servicios.headingHtml = v; })} area />
        {c.servicios.columns.map((col, i) => (
          <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '0.9rem', marginBottom: 8 }}>
            <Txt label={`Columna ${i + 1} · Título`} value={col.title} onChange={v => upd(d => { d.servicios.columns[i].title = v; })} />
            <ListEditor label="Items" items={col.items} onChange={v => upd(d => { d.servicios.columns[i].items = v; })} />
          </div>
        ))}
      </div>

      {/* CIERRE */}
      <div style={card}>
        <h3 style={h3S}>06 · Cierre y contacto</h3>
        <Txt label="Eyebrow" value={c.cierre.eyebrow} onChange={v => upd(d => { d.cierre.eyebrow = v; })} />
        <Txt label="Titular (admite <em>)" value={c.cierre.headingHtml} onChange={v => upd(d => { d.cierre.headingHtml = v; })} area />
        <ImageField label="Imagen de fondo (banda)" value={c.cierre.bandImage} onChange={v => upd(d => { d.cierre.bandImage = v; })} />
        <Txt label="Texto del botón" value={c.cierre.ctaText} onChange={v => upd(d => { d.cierre.ctaText = v; })} />
        <Txt label="Enlace del botón" value={c.cierre.ctaHref} onChange={v => upd(d => { d.cierre.ctaHref = v; })} />
        <label style={labelS}>Datos de contacto (etiqueta + valor; el valor admite HTML/enlaces)</label>
        {c.cierre.contacts.map((ct, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={ct.label} onChange={e => upd(d => { d.cierre.contacts[i].label = e.target.value; })} style={{ ...inputS, maxWidth: 160 }} />
            <input value={ct.html} onChange={e => upd(d => { d.cierre.contacts[i].html = e.target.value; })} style={inputS} />
          </div>
        ))}
        <Txt label="Colofón izquierda" value={c.cierre.colophonLeft} onChange={v => upd(d => { d.cierre.colophonLeft = v; })} />
        <Txt label="Colofón derecha" value={c.cierre.colophonRight} onChange={v => upd(d => { d.cierre.colophonRight = v; })} />
      </div>

      {/* Guardar */}
      <div style={{ position: 'sticky', bottom: 0, background: 'linear-gradient(to top, #F8FAFC 60%, transparent)', padding: '1rem 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 30px', borderRadius: 12, border: 'none', background: saving ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 8px 24px rgba(27,86,161,.25)' }}>
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />} {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
