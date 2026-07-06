'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Plus, Save, X, Pencil, Eye, EyeOff, Upload, MapPin, ExternalLink, Trash2 } from 'lucide-react';

interface Faq { question: string; answer: string }
interface Muni {
  id: string; slug: string; name: string; provincia: string | null;
  distancia_bogota_km: number | null; tiempo_bogota_min: number | null; altitud_msnm: number | null;
  temp_min: number | null; temp_max: number | null; descripcion_seo: string | null;
  historia: string | null; clima: string | null; turismo: string | null; inversion: string | null;
  og_image: string | null; geo_lat: number | null; geo_lng: number | null; wikipedia_url: string | null;
  faqs: unknown; tour360_url: string | null; oculto: boolean;
}
interface Form {
  id?: string; slug: string; name: string; provincia: string;
  distancia_bogota_km: string; tiempo_bogota_min: string; altitud_msnm: string; temp_min: string; temp_max: string;
  geo_lat: string; geo_lng: string;
  descripcion_seo: string; historia: string; clima: string; turismo: string; inversion: string;
  og_image: string; tour360_url: string; wikipedia_url: string; faqs: Faq[]; oculto: boolean;
}

const EMPTY: Form = {
  slug: '', name: '', provincia: 'Gualivá',
  distancia_bogota_km: '', tiempo_bogota_min: '', altitud_msnm: '', temp_min: '', temp_max: '',
  geo_lat: '', geo_lng: '',
  descripcion_seo: '', historia: '', clima: '', turismo: '', inversion: '',
  og_image: '', tour360_url: '', wikipedia_url: '', faqs: [], oculto: false,
};

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dge1ls2a7';
const PRESET = 'sufincaraiz_properties';

const inputS: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.875rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelS: React.CSSProperties = { fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };
const taS: React.CSSProperties = { ...inputS, resize: 'vertical', lineHeight: 1.5, minHeight: 90 };

const numOrNull = (s: string) => { const t = s.trim(); if (t === '') return null; const n = Number(t); return Number.isNaN(n) ? null : n; };
const str = (n: number | null) => (n == null ? '' : String(n));
const asFaqs = (v: unknown): Faq[] => Array.isArray(v) ? v.filter(f => f && typeof f === 'object') as Faq[] : [];

export default function AdminMunicipiosPage() {
  const [list, setList] = useState<Muni[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [upImg, setUpImg] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');
  const imgRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/municipios');
    if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
    const d = await res.json();
    setList(d.municipios ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof Form, v: string | boolean | Faq[]) => setForm(f => ({ ...f, [k]: v }));
  const flash = (m: string) => { setMsg(m); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const nuevo = () => { setForm(EMPTY); setShowForm(true); setMsg(''); };
  const editar = (m: Muni) => {
    setForm({
      id: m.id, slug: m.slug, name: m.name, provincia: m.provincia ?? 'Gualivá',
      distancia_bogota_km: str(m.distancia_bogota_km), tiempo_bogota_min: str(m.tiempo_bogota_min),
      altitud_msnm: str(m.altitud_msnm), temp_min: str(m.temp_min), temp_max: str(m.temp_max),
      geo_lat: str(m.geo_lat), geo_lng: str(m.geo_lng),
      descripcion_seo: m.descripcion_seo ?? '', historia: m.historia ?? '', clima: m.clima ?? '',
      turismo: m.turismo ?? '', inversion: m.inversion ?? '', og_image: m.og_image ?? '',
      tour360_url: m.tour360_url ?? '', wikipedia_url: m.wikipedia_url ?? '', faqs: asFaqs(m.faqs), oculto: m.oculto,
    });
    setShowForm(true); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cerrar = () => { setForm(EMPTY); setShowForm(false); };

  const subirImagen = async (file: File) => {
    setUpImg(true);
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', PRESET); fd.append('folder', 'municipios');
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd });
      const d = await res.json();
      if (d.secure_url) set('og_image', d.secure_url.replace('/upload/', '/upload/c_fill,ar_16:9,g_auto,f_auto,q_auto,w_1200/'));
    } catch { /* */ }
    setUpImg(false);
  };

  const payload = () => ({
    ...(form.id ? { id: form.id } : {}),
    slug: form.slug.trim(), name: form.name.trim(), provincia: form.provincia.trim(),
    distancia_bogota_km: numOrNull(form.distancia_bogota_km), tiempo_bogota_min: numOrNull(form.tiempo_bogota_min),
    altitud_msnm: numOrNull(form.altitud_msnm), temp_min: numOrNull(form.temp_min), temp_max: numOrNull(form.temp_max),
    geo_lat: numOrNull(form.geo_lat), geo_lng: numOrNull(form.geo_lng),
    descripcion_seo: form.descripcion_seo, historia: form.historia, clima: form.clima, turismo: form.turismo, inversion: form.inversion,
    og_image: form.og_image, tour360_url: form.tour360_url, wikipedia_url: form.wikipedia_url,
    faqs: form.faqs.filter(f => f.question.trim() || f.answer.trim()), oculto: form.oculto,
  });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { flash('⚠️ El nombre es obligatorio.'); return; }
    if (!/^[a-z0-9-]{2,}$/.test(form.slug.trim())) { flash('⚠️ El slug debe tener minúsculas, números y guiones (ej. san-francisco).'); return; }
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/municipios', {
      method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()),
    });
    setSaving(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { flash(`⚠️ ${d.error ?? 'No se pudo guardar.'}`); return; }
    flash(form.id ? '✅ Municipio actualizado.' : '✅ Municipio creado.');
    cerrar(); load();
  };

  const toggleOculto = async (m: Muni) => {
    setBusyId(m.id);
    await fetch('/api/admin/municipios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, oculto: !m.oculto }) });
    setBusyId(''); load();
  };

  // FAQs helpers
  const addFaq = () => set('faqs', [...form.faqs, { question: '', answer: '' }]);
  const setFaq = (i: number, k: keyof Faq, v: string) => set('faqs', form.faqs.map((f, idx) => idx === i ? { ...f, [k]: v } : f));
  const delFaq = (i: number) => set('faqs', form.faqs.filter((_, idx) => idx !== i));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 960 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin size={20} style={{ color: '#1B56A1' }} />
          <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>Municipios</h2>
        </div>
        {!showForm && (
          <button onClick={nuevo} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.85rem', padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
            <Plus size={15} /> Nuevo municipio
          </button>
        )}
      </div>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msg.startsWith('✅') ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '11px 15px', color: msg.startsWith('✅') ? '#15803D' : '#DC2626', fontWeight: 700, fontSize: '0.88rem' }}>{msg}</div>}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={guardar} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{form.id ? `Editar: ${form.name}` : 'Nuevo municipio'}</h3>
            <button type="button" onClick={cerrar} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}><X size={14} /> Cerrar</button>
          </div>

          {/* Básicos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            <div><label style={labelS}>Nombre *</label><input value={form.name} onChange={e => set('name', e.target.value)} required style={inputS} placeholder="San Francisco" /></div>
            <div><label style={labelS}>Slug (URL) *</label><input value={form.slug} onChange={e => set('slug', e.target.value)} required style={inputS} placeholder="san-francisco" /></div>
            <div><label style={labelS}>Provincia/subregión</label><input value={form.provincia} onChange={e => set('provincia', e.target.value)} style={inputS} placeholder="Gualivá" /></div>
          </div>

          {/* Recorrido 360 */}
          <div>
            <label style={labelS}>Enlace del recorrido 360° del parque principal (Panoee)</label>
            <input value={form.tour360_url} onChange={e => set('tour360_url', e.target.value)} style={inputS} placeholder="https://tour.panoee.net/iframe/..." />
            <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 5 }}>Pega el enlace del tour de Panoee. Si lo dejas vacío, la página del municipio muestra solo la descripción.</p>
          </div>

          {/* Imagen de portada */}
          <div>
            <label style={labelS}>Imagen de portada (hero)</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {form.og_image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.og_image} alt="" style={{ width: 140, height: 79, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0' }} />
                : <div style={{ width: 140, height: 79, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '0.72rem' }}>Sin imagen</div>}
              <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && subirImagen(e.target.files[0])} />
              <button type="button" onClick={() => imgRef.current?.click()} disabled={upImg} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                {upImg ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />} {upImg ? 'Subiendo…' : 'Subir imagen'}
              </button>
              {form.og_image && <button type="button" onClick={() => set('og_image', '')} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>Quitar</button>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            <div><label style={labelS}>Distancia Bogotá (km)</label><input type="number" value={form.distancia_bogota_km} onChange={e => set('distancia_bogota_km', e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>Tiempo Bogotá (min)</label><input type="number" value={form.tiempo_bogota_min} onChange={e => set('tiempo_bogota_min', e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>Altitud (msnm)</label><input type="number" value={form.altitud_msnm} onChange={e => set('altitud_msnm', e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>Temp. mín (°C)</label><input type="number" value={form.temp_min} onChange={e => set('temp_min', e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>Temp. máx (°C)</label><input type="number" value={form.temp_max} onChange={e => set('temp_max', e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>Latitud</label><input value={form.geo_lat} onChange={e => set('geo_lat', e.target.value)} style={inputS} placeholder="4.9929" /></div>
            <div><label style={labelS}>Longitud</label><input value={form.geo_lng} onChange={e => set('geo_lng', e.target.value)} style={inputS} placeholder="-74.3404" /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelS}>URL de Wikipedia</label><input value={form.wikipedia_url} onChange={e => set('wikipedia_url', e.target.value)} style={inputS} placeholder="https://es.wikipedia.org/wiki/..." /></div>
          </div>

          {/* Contenido */}
          <div><label style={labelS}>Descripción (intro, la de arriba)</label><textarea value={form.descripcion_seo} onChange={e => set('descripcion_seo', e.target.value)} rows={3} style={taS} /></div>
          <div><label style={labelS}>Historia</label><textarea value={form.historia} onChange={e => set('historia', e.target.value)} rows={4} style={taS} /></div>
          <div><label style={labelS}>Clima</label><textarea value={form.clima} onChange={e => set('clima', e.target.value)} rows={4} style={taS} /></div>
          <div><label style={labelS}>Turismo</label><textarea value={form.turismo} onChange={e => set('turismo', e.target.value)} rows={4} style={taS} /></div>
          <div><label style={labelS}>Inversión inmobiliaria</label><textarea value={form.inversion} onChange={e => set('inversion', e.target.value)} rows={4} style={taS} /></div>

          {/* FAQs */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ ...labelS, marginBottom: 0 }}>Preguntas frecuentes ({form.faqs.length})</label>
              <button type="button" onClick={addFaq} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#EFF6FF', color: '#1B56A1', border: '1px solid #BFDBFE', borderRadius: 8, padding: '5px 11px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}><Plus size={13} /> Agregar</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.faqs.map((f, i) => (
                <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={f.question} onChange={e => setFaq(i, 'question', e.target.value)} style={{ ...inputS, fontWeight: 700 }} placeholder="Pregunta" />
                    <button type="button" onClick={() => delFaq(i)} title="Eliminar" style={{ flexShrink: 0, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                  <textarea value={f.answer} onChange={e => setFaq(i, 'answer', e.target.value)} rows={2} style={taS} placeholder="Respuesta" />
                </div>
              ))}
            </div>
          </div>

          {/* Oculto */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, color: '#0D2D5E', fontSize: '0.88rem' }}>
            <input type="checkbox" checked={form.oculto} onChange={e => set('oculto', e.target.checked)} style={{ width: 17, height: 17, accentColor: '#DC2626' }} />
            Ocultar este municipio (no se muestra en la web)
          </label>

          <div>
            <button type="submit" disabled={saving || upImg} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : (form.id ? <Save size={15} /> : <Plus size={15} />)} {saving ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Crear municipio')}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9', fontWeight: 700, color: '#0D2D5E', fontSize: '0.9rem' }}>Municipios ({list.length})</div>
        {list.length === 0 && <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>Aún no hay municipios.</div>}
        {list.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.85rem 1.25rem', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', opacity: m.oculto ? 0.6 : 1 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#0D2D5E', fontSize: '0.9rem' }}>
                {m.name}
                {m.oculto && <span style={{ marginLeft: 8, fontSize: '0.68rem', color: '#DC2626', fontWeight: 700 }}>· oculto</span>}
                {m.tour360_url && <span style={{ marginLeft: 8, fontSize: '0.66rem', color: '#1B56A1', background: '#EFF6FF', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>360°</span>}
              </p>
              <p style={{ margin: 0, color: '#64748B', fontSize: '0.78rem' }}>/municipios/{m.slug}</p>
            </div>
            {!m.oculto && <a href={`/municipios/${m.slug}`} target="_blank" rel="noopener noreferrer" title="Ver" style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}><ExternalLink size={15} /></a>}
            <button onClick={() => toggleOculto(m)} disabled={busyId === m.id} title={m.oculto ? 'Mostrar' : 'Ocultar'} style={{ border: `1.5px solid ${m.oculto ? '#BBF7D0' : '#FECACA'}`, background: m.oculto ? '#F0FDF4' : '#FEF2F2', color: m.oculto ? '#15803D' : '#DC2626', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {busyId === m.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : (m.oculto ? <Eye size={15} /> : <EyeOff size={15} />)}
            </button>
            <button onClick={() => editar(m)} title="Editar" style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#1B56A1', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pencil size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
