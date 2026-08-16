'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Trash2, Upload, X, Star, ChevronLeft, ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import { PROPERTY_TYPES, formatPrice } from '@/lib/utils';
import { MUNICIPIOS_PROVINCIA } from '@/lib/datos-oficiales';

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dge1ls2a7';
const PRESET = 'sufincaraiz_properties';
const OTRO   = '__otro__';

interface MediaItem { url: string; alt_text: string }

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9,
  fontSize: '0.875rem', outline: 'none', color: '#0D2D5E', background: '#fff',
  width: '100%', boxSizing: 'border-box',
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>{label}</label>
    {children}
  </div>
);

const iconBtn: React.CSSProperties = {
  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#fff',
};

export default function EditarPropiedadPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const fileRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const [up3d, setUp3d] = useState(false);
  const [err3d, setErr3d] = useState('');
  const [munis, setMunis] = useState<string[]>([...MUNICIPIOS_PROVINCIA]);
  const [nuevoMuni, setNuevoMuni] = useState('');
  const [muniCreado, setMuniCreado] = useState<{ name: string; slug: string } | null>(null);
  const [tipos, setTipos] = useState<{ value: string; label: string; oculto?: boolean }[]>(PROPERTY_TYPES);
  const [nuevoTipo, setNuevoTipo] = useState('');

  useEffect(() => {
    fetch('/api/admin/municipios')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const names: string[] = (d?.municipios ?? []).map((m: { name: string }) => m.name);
        if (names.length) setMunis([...new Set(names)]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/admin/property-types')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const lista = (d?.tipos ?? [])
          .map((t: { slug: string; label: string; oculto?: boolean }) => ({ value: t.slug, label: t.label, oculto: !!t.oculto }));
        if (lista.length) setTipos(lista);
      })
      .catch(() => {});
  }, []);
  const [data,    setData]    = useState<Record<string, unknown> | null>(null);
  const [form,    setForm]    = useState<Record<string, string>>({});
  // Booleano aparte: el resto del formulario son cadenas, y ensanchar el
  // Record obligaría a comprobar el tipo en cada campo de texto.
  const [enCondominio, setEnCondominio] = useState(false);
  const [media,   setMedia]   = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch(`/api/admin/properties/${id}`)
      .then(r => { if (r.status === 401) { window.location.href = '/admin/login'; } return r.json(); })
      .then(d => {
        setData(d);
        setEnCondominio(!!d.en_condominio);
        setForm({
          title:            d.title ?? '',
          type:             d.type ?? 'finca',
          municipality_name: d.municipality?.name ?? 'La Vega',
          status:           d.status ?? 'available',
          price_cop:        String(d.price_cop ?? 0),
          area_lot_m2:      String(d.area_lot_m2 ?? ''),
          area_built_m2:    String(d.area_built_m2 ?? ''),
          bedrooms:         String(d.bedrooms ?? 0),
          bathrooms:        String(d.bathrooms ?? 0),
          parking:          String(d.parking ?? 0),
          short_description: d.short_description ?? '',
          description:      d.description ?? '',
          meta_title:       d.meta_title ?? '',
          meta_description: d.meta_description ?? '',
          video_url:        d.video_url ?? '',
          virtual_tour_url: d.virtual_tour_url ?? '',
          modelo3d_url:     d.modelo3d_url ?? '',
        });
        // Media ordenada (la primera = portada)
        const imgs = (d.media ?? [])
          .filter((m: { type?: string }) => !m.type || m.type === 'image')
          .sort((a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0))
          .map((m: { url: string; alt_text?: string }) => ({ url: m.url, alt_text: m.alt_text ?? '' }));
        setMedia(imgs);
      });
  }, [id]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Gestión de fotos ──────────────────────────────────────────────────────
  const uploadImages = async (files: FileList) => {
    setUploading(true);
    const uploaded: MediaItem[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', PRESET);
      fd.append('folder', 'properties');
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd });
        const d = await res.json();
        if (d.secure_url) uploaded.push({ url: d.secure_url, alt_text: '' });
      } catch { /* skip */ }
    }
    setMedia(prev => [...prev, ...uploaded]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Subida del modelo 3D (.glb) a Cloudinary como archivo raw ───────────────
  const upload3dModel = async (file: File) => {
    setErr3d('');
    const name = file.name.toLowerCase();
    if (!name.endsWith('.glb') && !name.endsWith('.gltf')) {
      setErr3d('El modelo debe ser un archivo .glb (o .gltf). Convierte tu .fbx a .glb primero.');
      if (modelRef.current) modelRef.current.value = '';
      return;
    }
    setUp3d(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', PRESET);
    fd.append('folder', 'modelos3d');
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, { method: 'POST', body: fd });
      const d = await res.json();
      if (d.secure_url) set('modelo3d_url', d.secure_url);
      else setErr3d(d.error?.message ?? 'No se pudo subir el modelo (revisa el tamaño; puede exceder el límite de Cloudinary). Como alternativa, pega la URL del .glb.');
    } catch {
      setErr3d('Error de conexión al subir el modelo.');
    }
    setUp3d(false);
    if (modelRef.current) modelRef.current.value = '';
  };

  const removeMedia = (i: number) => setMedia(prev => prev.filter((_, idx) => idx !== i));
  const setCover    = (i: number) => setMedia(prev => {
    const n = [...prev]; const [it] = n.splice(i, 1);
    if (!it) return prev;
    n.unshift(it); return n;
  });
  const moveMedia   = (i: number, dir: -1 | 1) => setMedia(prev => {
    const j = i + dir;
    if (j < 0 || j >= prev.length) return prev;
    const n = [...prev]; const tmp = n[i]!; n[i] = n[j]!; n[j] = tmp; return n;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const municipio = form.municipality_name === OTRO ? nuevoMuni.trim() : form.municipality_name;
    if (!municipio || municipio.length < 2) { setError('Escribe el nombre del municipio.'); return; }
    const tipoNuevo = form.type === OTRO ? nuevoTipo.trim() : '';
    if (form.type === OTRO && tipoNuevo.length < 2) { setError('Escribe el nombre del tipo de inmueble.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          municipality_name: municipio,
          type:       form.type === OTRO ? '' : form.type,
          type_label: tipoNuevo || undefined,
          en_condominio: enCondominio,
          price_cop:    parseInt(form['price_cop'] ?? '0') || 0,
          area_lot_m2:  form['area_lot_m2']  ? parseFloat(form['area_lot_m2'])  : null,
          area_built_m2: form['area_built_m2'] ? parseFloat(form['area_built_m2']) : null,
          bedrooms:     parseInt(form['bedrooms'] ?? '0') || 0,
          bathrooms:    parseInt(form['bathrooms'] ?? '0') || 0,
          parking:      parseInt(form['parking'] ?? '0') || 0,
          video_url:        form['video_url']?.trim() || null,
          virtual_tour_url: form['virtual_tour_url']?.trim() || null,
          modelo3d_url:     form['modelo3d_url']?.trim() || null,
          media,  // orden actual; la primera = portada
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return; }
      const saved = await res.json();
      setData(prev => ({ ...(prev ?? {}), ...saved }));
      setSuccess('✅ Propiedad actualizada correctamente');
      if (saved.municipality_created) {
        setMuniCreado({ name: saved.municipality_new_name ?? municipio, slug: saved.municipality_slug });
        // Reflejar el municipio ya existente en el desplegable y limpiar "Otro".
        setForm(f => ({ ...f, municipality_name: saved.municipality_new_name ?? municipio }));
        setNuevoMuni('');
        if (!munis.includes(saved.municipality_new_name ?? municipio)) setMunis(prev => [...prev, saved.municipality_new_name ?? municipio]);
      }
      if (saved.type) {
        // Refleja el tipo resuelto (nuevo o existente) en el desplegable.
        setForm(f => ({ ...f, type: saved.type }));
        setNuevoTipo('');
        if (!tipos.some(t => t.value === saved.type)) {
          setTipos(prev => [...prev, { value: saved.type, label: saved.type_new_label ?? saved.type }]);
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    await fetch(`/api/admin/properties/${id}`, { method: 'DELETE' });
    router.push('/admin/propiedades');
  };

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748B', gap: 10 }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando propiedad…
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <button type="button" onClick={() => router.push('/admin/propiedades')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
          <ArrowLeft size={15} /> Volver al listado
        </button>
        <a href={`/propiedad/${data.slug as string}`} target="_blank" rel="noopener noreferrer"
          style={{ color: '#1B56A1', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}>
          Ver en web →
        </a>
      </div>

      {success && <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '12px 16px', color: '#15803D', fontWeight: 700 }}>{success}</div>}
      {error   && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontWeight: 700 }}>⚠️ {error}</div>}

      {muniCreado && (
        <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <MapPin size={20} style={{ color: '#1B56A1', flexShrink: 0 }} />
          <p style={{ color: '#1D4ED8', fontSize: '0.86rem', lineHeight: 1.5, margin: 0, flex: 1, minWidth: 200 }}>
            Se creó el municipio <strong>{muniCreado.name}</strong> (oculto). Ya aparece en el filtro del inicio.
            ¿Le agregas su página de contenido?
          </p>
          <button type="button" onClick={() => router.push(`/admin/municipios?edit=${muniCreado.slug}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.82rem', padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Completar {muniCreado.name} <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Precio actual */}
      <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: '#1B56A1', fontSize: '0.8rem', fontWeight: 700 }}>Precio actual:</span>
        <span style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.1rem' }}>{formatPrice(Number(data.price_cop))}</span>
      </div>

      {/* Información general */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EFF6FF' }}>
          Información general
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <Field label="Título"><input value={form.title} onChange={e => set('title', e.target.value)} required style={inputStyle} /></Field>
          <Field label="Tipo">
            <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
              {/* Se ocultan los tipos retirados —«Condominio» lo está— para que
                  nadie los reasigne, pero se conserva el actual aunque esté oculto:
                  filtrarlo cambiaría el tipo de la ficha sin querer al guardar. */}
              {tipos.filter(t => !t.oculto || t.value === form.type)
                    .map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              <option value={OTRO}>➕ Otro tipo…</option>
            </select>
            {form.type === OTRO && (
              <input value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)} placeholder="Nombre del tipo (ej. Bodega)" autoFocus style={{ ...inputStyle, marginTop: 8 }} />
            )}
          </Field>
          <Field label="Ubicación">
            {/* «Condominio» dejó de ser un tipo de inmueble —no es una clase de
                inmueble, es dónde está—. Esta casilla es lo que lo sustituye, y es
                lo que alimenta el filtro público /propiedades/en-condominio.
                Cruza con el tipo: en un condominio hay lotes, casas y fincas. */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '0.55rem 0' }}>
              <input type="checkbox" checked={enCondominio} onChange={e => setEnCondominio(e.target.checked)} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0D2D5E' }}>Está en un condominio campestre</span>
            </label>
          </Field>
          <Field label="Municipio">
            <select value={form.municipality_name} onChange={e => set('municipality_name', e.target.value)} style={inputStyle}>
              {munis.map(name => <option key={name} value={name}>{name}</option>)}
              <option value={OTRO}>➕ Otro municipio…</option>
            </select>
            {form.municipality_name === OTRO && (
              <input value={nuevoMuni} onChange={e => setNuevoMuni(e.target.value)} placeholder="Nombre del municipio (ej. Albán)" autoFocus style={{ ...inputStyle, marginTop: 8 }} />
            )}
          </Field>
          <Field label="Estado">
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
              <option value="available">Disponible</option>
              <option value="reserved">Reservada</option>
              <option value="sold">Vendida</option>
            </select>
          </Field>
          <Field label="Precio COP"><input type="number" value={form.price_cop} onChange={e => set('price_cop', e.target.value)} style={inputStyle} /></Field>
          <Field label="Área terreno (m²)"><input type="number" value={form.area_lot_m2} onChange={e => set('area_lot_m2', e.target.value)} style={inputStyle} /></Field>
          <Field label="Área construida (m²)"><input type="number" value={form.area_built_m2} onChange={e => set('area_built_m2', e.target.value)} style={inputStyle} /></Field>
          <Field label="Habitaciones"><input type="number" min="0" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} style={inputStyle} /></Field>
          <Field label="Baños"><input type="number" min="0" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} style={inputStyle} /></Field>
        </div>
      </div>

      {/* Fotos */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EFF6FF' }}>
          📸 Fotos
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.78rem', marginBottom: '1rem' }}>
          La primera foto es la portada. Usa ★ para fijar la portada y las flechas para reordenar.
        </p>
        <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files && uploadImages(e.target.files)} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1rem' }}>
          {uploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
          {uploading ? 'Subiendo…' : 'Agregar fotos'}
        </button>

        {media.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {media.map((m, i) => (
              <div key={m.url} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden', border: i === 0 ? '3px solid #E8B92F' : '2px solid #E2E8F0' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.alt_text || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {i === 0 && <span style={{ position: 'absolute', bottom: 4, left: 4, background: '#E8B92F', color: '#0D2D5E', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>PORTADA</span>}
                {/* Controles */}
                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                  {i !== 0 && (
                    <button type="button" title="Fijar como portada" onClick={() => setCover(i)} style={{ ...iconBtn, background: 'rgba(232,185,47,0.95)', color: '#0D2D5E' }}>
                      <Star size={12} />
                    </button>
                  )}
                  <button type="button" title="Eliminar" onClick={() => removeMedia(i)} style={iconBtn}>
                    <X size={12} />
                  </button>
                </div>
                <div style={{ position: 'absolute', bottom: 4, right: 4, display: 'flex', gap: 4 }}>
                  <button type="button" title="Mover antes" disabled={i === 0} onClick={() => moveMedia(i, -1)} style={{ ...iconBtn, opacity: i === 0 ? 0.3 : 1 }}>
                    <ChevronLeft size={12} />
                  </button>
                  <button type="button" title="Mover después" disabled={i === media.length - 1} onClick={() => moveMedia(i, 1)} style={{ ...iconBtn, opacity: i === media.length - 1 ? 0.3 : 1 }}>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#94A3B8', fontSize: '0.82rem' }}>Sin fotos — agrega al menos una.</p>
        )}
      </div>

      {/* Video y Tour 360 */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EFF6FF' }}>
          🎬 Video y Tour Virtual
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Enlace de YouTube (opcional — si lo agregas, se muestra el video en la ficha)">
            <input value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://www.youtube.com/watch?v=…" style={inputStyle} />
          </Field>
          <Field label="URL del Tour 360° / embed (opcional — Panoee, Kuula, etc.)">
            <input value={form.virtual_tour_url} onChange={e => set('virtual_tour_url', e.target.value)} placeholder="https://app.panoee.com/embed/…" style={inputStyle} />
          </Field>

          {/* Modelo 3D (fotogrametría) */}
          <Field label="Modelo 3D del terreno (opcional — se muestra debajo del tour 360)">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={form.modelo3d_url} onChange={e => set('modelo3d_url', e.target.value)} placeholder="Sube un .glb o pega su URL" style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
              <input ref={modelRef} type="file" accept=".glb,.gltf,model/gltf-binary" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && upload3dModel(e.target.files[0])} />
              <button type="button" onClick={() => modelRef.current?.click()} disabled={up3d}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {up3d ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
                {up3d ? 'Subiendo…' : 'Subir .glb'}
              </button>
              {form.modelo3d_url && (
                <button type="button" onClick={() => set('modelo3d_url', '')}
                  style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Quitar</button>
              )}
            </div>
            {err3d && <p style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: 6 }}>⚠️ {err3d}</p>}
            <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 6 }}>
              Formato <b>.glb</b> (convierte tu <b>.fbx</b> a .glb con Blender). El visitante podrá girar y hacer zoom al modelo.
            </p>
          </Field>
        </div>
      </div>

      {/* Descripción y SEO */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EFF6FF' }}>Descripción y SEO</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Descripción corta">
            <textarea value={form.short_description} onChange={e => set('short_description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
          </Field>
          <Field label="Descripción completa">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={14} style={{ ...inputStyle, resize: 'vertical', minHeight: 280, lineHeight: 1.6 }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Meta title"><input value={form.meta_title} onChange={e => set('meta_title', e.target.value)} style={inputStyle} /></Field>
            <Field label="Meta description"><input value={form.meta_description} onChange={e => set('meta_description', e.target.value)} style={inputStyle} /></Field>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button type="button" onClick={handleDelete} disabled={deleting}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
          {deleting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
          Eliminar propiedad
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => router.push('/admin/propiedades')}
            style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 700, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || uploading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 24px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  );
}
