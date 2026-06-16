'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Loader2, Upload, Trash2, Pencil, Plus, ExternalLink, X, Star } from 'lucide-react';
import { CATEGORIAS, MUNICIPIOS_DIR, MAX_FOTOS, fotosDe, type Business } from '@/lib/directorio';

interface Form {
  id?: string;
  nombre: string; imagenes: string[]; descripcion: string; categoria: string; municipio: string;
  whatsapp: string; domicilios: boolean; google_maps_url: string;
}

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dge1ls2a7';
const PRESET = 'sufincaraiz_properties';
const DESC_MAX = 300;

const inputS: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.875rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box' };
const labelS: React.CSSProperties = { fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };

const EMPTY: Form = { nombre: '', imagenes: [], descripcion: '', categoria: 'Restaurante', municipio: 'La Vega', whatsapp: '', domicilios: false, google_maps_url: '' };

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

  const set = (k: keyof Form, v: string | boolean | string[]) => setForm(f => ({ ...f, [k]: v }));

  const uploadMany = async (files: FileList) => {
    setUploading(true);
    const espacio = MAX_FOTOS - form.imagenes.length;
    const lote = Array.from(files).slice(0, Math.max(0, espacio));
    const subidas: string[] = [];
    for (const file of lote) {
      const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', PRESET); fd.append('folder', 'directorio');
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd });
        const d = await res.json();
        if (d.secure_url) subidas.push(d.secure_url.replace('/upload/', '/upload/c_fill,ar_4:3,g_auto,f_auto,q_auto,w_900/'));
      } catch { /* */ }
    }
    if (subidas.length) setForm(f => ({ ...f, imagenes: [...f.imagenes, ...subidas].slice(0, MAX_FOTOS) }));
    if (files.length > espacio) setMsg(`⚠️ Máximo ${MAX_FOTOS} fotos. Se agregaron las primeras disponibles.`);
    setUploading(false);
  };

  const removeFoto = (i: number) => setForm(f => ({ ...f, imagenes: f.imagenes.filter((_, idx) => idx !== i) }));
  const hacerPortada = (i: number) => setForm(f => {
    const portada = f.imagenes[i];
    if (portada === undefined) return f;
    return { ...f, imagenes: [portada, ...f.imagenes.filter((_, idx) => idx !== i)] };
  });

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

  const edit = (b: Business) => {
    setForm({
      id: b.id, nombre: b.nombre, imagenes: fotosDe(b), descripcion: b.descripcion ?? '',
      categoria: b.categoria, municipio: b.municipio, whatsapp: b.whatsapp ?? '',
      domicilios: b.domicilios, google_maps_url: b.google_maps_url ?? '',
    });
    setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
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

        {/* Descripción corta */}
        <div style={{ marginTop: '1rem' }}>
          <label style={labelS}>Descripción corta</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value.slice(0, DESC_MAX))} rows={3}
            style={{ ...inputS, resize: 'vertical', lineHeight: 1.5 }}
            placeholder="Ej: Comida típica de la región, asados y cazuelas. Ambiente familiar con vista a la montaña." />
          <p style={{ margin: '4px 0 0', textAlign: 'right', fontSize: '0.72rem', color: form.descripcion.length >= DESC_MAX ? '#DC2626' : '#94A3B8' }}>{form.descripcion.length}/{DESC_MAX}</p>
        </div>

        {/* Fotos (hasta 5) */}
        <div style={{ marginTop: '1rem' }}>
          <label style={labelS}>Fotos del negocio (hasta {MAX_FOTOS}) — la primera es la portada</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
            {form.imagenes.map((url, i) => (
              <div key={url + i} style={{ position: 'relative', width: 110 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: 110, height: 82, objectFit: 'cover', borderRadius: 8, border: i === 0 ? '2px solid #E8B92F' : '1px solid #E2E8F0', display: 'block' }} />
                {i === 0 && <span style={{ position: 'absolute', top: 4, left: 4, background: '#E8B92F', color: '#0D2D5E', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: 5 }}>PORTADA</span>}
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {i !== 0 && (
                    <button type="button" onClick={() => hacerPortada(i)} title="Hacer portada" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '3px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#B7791F', cursor: 'pointer', fontSize: '0.66rem', fontWeight: 700 }}><Star size={11} /> Portada</button>
                  )}
                  <button type="button" onClick={() => removeFoto(i)} title="Eliminar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px 7px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
            {form.imagenes.length < MAX_FOTOS && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: 110, height: 82, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', cursor: uploading ? 'wait' : 'pointer' }}>
                {uploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />} {uploading ? 'Subiendo…' : 'Subir foto'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) uploadMany(e.target.files); e.target.value = ''; }} />
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
        {list.map(b => {
          const fotos = fotosDe(b);
          return (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.8rem 1.25rem', borderTop: '1px solid #F1F5F9' }}>
            {fotos[0]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={fotos[0]} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              : <div style={{ width: 48, height: 36, borderRadius: 6, background: '#F1F5F9', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#0D2D5E', fontSize: '0.88rem' }}>{b.nombre} {b.domicilios && <span title="Domicilios">🛵</span>}</p>
              <p style={{ margin: 0, color: '#64748B', fontSize: '0.78rem' }}>{b.categoria} · {b.municipio}{fotos.length > 1 ? ` · 📷 ${fotos.length}` : ''}</p>
            </div>
            <button onClick={() => edit(b)} title="Editar" style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#1B56A1', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pencil size={15} /></button>
            <button onClick={() => del(b.id)} title="Eliminar" style={{ border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={15} /></button>
          </div>
          );
        })}
      </div>
    </div>
  );
}
