'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Loader2, Upload, Trash2, Pencil, Plus, ExternalLink, X } from 'lucide-react';
import { CATEGORIAS, MUNICIPIOS_DIR, type Business } from '@/lib/directorio';

interface Form {
  id?: string;
  nombre: string; imagen_url: string; categoria: string; municipio: string;
  whatsapp: string; domicilios: boolean; google_maps_url: string;
}

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dge1ls2a7';
const PRESET = 'sufincaraiz_properties';

const inputS: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.875rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box' };
const labelS: React.CSSProperties = { fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };

const EMPTY: Form = { nombre: '', imagen_url: '', categoria: 'Restaurante', municipio: 'La Vega', whatsapp: '', domicilios: false, google_maps_url: '' };

export default function AdminDirectorioPage() {
  const [list, setList] = useState<Business[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/directorio');
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    const d = await res.json();
    setList(d.businesses ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof Form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', PRESET); fd.append('folder', 'directorio');
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd });
      const d = await res.json();
      if (d.secure_url) set('imagen_url', d.secure_url.replace('/upload/', '/upload/c_fill,ar_4:3,g_auto,f_auto,q_auto,w_700/'));
    } catch { /* */ }
    setUploading(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nombre.trim().length < 2) { setMsg('⚠️ El nombre es obligatorio.'); return; }
    setSaving(true); setMsg('');
    const editing = !!form.id;
    const res = await fetch('/api/admin/directorio', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setMsg('⚠️ No se pudo guardar.'); return; }
    setMsg(editing ? '✅ Negocio actualizado.' : '✅ Negocio agregado.');
    setForm(EMPTY);
    load();
  };

  const edit = (b: Business) => { setForm({ ...b, imagen_url: b.imagen_url ?? '', whatsapp: b.whatsapp ?? '', google_maps_url: b.google_maps_url ?? '' }); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const del = async (id: string) => {
    if (!confirm('¿Eliminar este negocio?')) return;
    await fetch(`/api/admin/directorio?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>Directorio de negocios</h2>
        <a href="/directorio" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B56A1', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}>
          Ver directorio <ExternalLink size={14} />
        </a>
      </div>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msg.startsWith('✅') ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '11px 15px', color: msg.startsWith('✅') ? '#15803D' : '#DC2626', fontWeight: 700, fontSize: '0.88rem' }}>{msg}</div>}

      {/* Formulario */}
      <form onSubmit={save} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{form.id ? 'Editar negocio' : 'Agregar negocio'}</h3>
          {form.id && <button type="button" onClick={() => { setForm(EMPTY); setMsg(''); }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}><X size={14} /> Cancelar edición</button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          <div><label style={labelS}>Nombre *</label><input value={form.nombre} onChange={e => set('nombre', e.target.value)} required style={inputS} placeholder="Restaurante El Mirador" /></div>
          <div><label style={labelS}>Categoría</label><select value={form.categoria} onChange={e => set('categoria', e.target.value)} style={inputS}>{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={labelS}>Municipio</label><select value={form.municipio} onChange={e => set('municipio', e.target.value)} style={inputS}>{MUNICIPIOS_DIR.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div><label style={labelS}>WhatsApp</label><input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} style={inputS} placeholder="321 000 0000" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelS}>Enlace de Google Maps</label><input value={form.google_maps_url} onChange={e => set('google_maps_url', e.target.value)} style={inputS} placeholder="https://maps.app.goo.gl/…" /></div>
        </div>

        {/* Imagen */}
        <div style={{ marginTop: '1rem' }}>
          <label style={labelS}>Foto del negocio</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {form.imagen_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={form.imagen_url} alt="" style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0' }} />
              : <div style={{ width: 100, height: 75, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '0.7rem' }}>Sin foto</div>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
              {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />} {uploading ? 'Subiendo…' : 'Subir foto'}
            </button>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '1rem', cursor: 'pointer', fontWeight: 600, color: '#0D2D5E', fontSize: '0.88rem' }}>
          <input type="checkbox" checked={form.domicilios} onChange={e => set('domicilios', e.target.checked)} style={{ width: 17, height: 17, accentColor: '#15803D' }} />
          🛵 Tiene domicilios disponibles
        </label>

        <div style={{ marginTop: '1.25rem' }}>
          <button type="submit" disabled={saving || uploading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : (form.id ? <Save size={15} /> : <Plus size={15} />)} {saving ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Agregar negocio')}
          </button>
        </div>
      </form>

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9', fontWeight: 700, color: '#0D2D5E', fontSize: '0.9rem' }}>Negocios registrados ({list.length})</div>
        {list.length === 0 && <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>Aún no hay negocios. Agrega el primero arriba.</div>}
        {list.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.8rem 1.25rem', borderTop: '1px solid #F1F5F9' }}>
            {b.imagen_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={b.imagen_url} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              : <div style={{ width: 48, height: 36, borderRadius: 6, background: '#F1F5F9', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#0D2D5E', fontSize: '0.88rem' }}>{b.nombre} {b.domicilios && <span title="Domicilios">🛵</span>}</p>
              <p style={{ margin: 0, color: '#64748B', fontSize: '0.78rem' }}>{b.categoria} · {b.municipio}</p>
            </div>
            <button onClick={() => edit(b)} title="Editar" style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#1B56A1', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pencil size={15} /></button>
            <button onClick={() => del(b.id)} title="Eliminar" style={{ border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
