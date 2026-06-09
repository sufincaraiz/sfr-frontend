'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Save, Loader2 } from 'lucide-react';
import { MUNICIPALITIES, PROPERTY_TYPES } from '@/lib/utils';

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dge1ls2a7';
const PRESET = 'sufincaraiz_properties';

interface MediaItem { url: string; is_primary: boolean; order: number }

const SERVICIOS = ['agua', 'energia', 'gas', 'internet', 'alcantarillado', 'via_pavimentada'] as const;
const SERVICIOS_LABELS: Record<string, string> = {
  agua: 'Agua potable', energia: 'Energía eléctrica', gas: 'Gas natural',
  internet: 'Internet', alcantarillado: 'Alcantarillado', via_pavimentada: 'Vía pavimentada',
};

const SectionTitle = ({ title }: { title: string }) => (
  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EFF6FF' }}>
    {title}
  </h3>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
      {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9,
  fontSize: '0.875rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box',
};

export default function NuevaPropiedadPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', type: 'finca', municipality_name: 'La Vega', status: 'available',
    price_cop: '', area_lot_m2: '', area_built_m2: '', bedrooms: '0', bathrooms: '0', parking: '0',
    year_built: '', geo_lat: '', geo_lng: '', address_visible: '',
    short_description: '', description: '', meta_title: '', meta_description: '',
    // features
    clima: '', altitud: '', distancia_parque: '',
    has_360_tour: false, tour360_url: '',
  });
  const [servicios,  setServicios]  = useState<string[]>([]);
  const [media,      setMedia]      = useState<MediaItem[]>([]);
  const [uploading,  setUploading]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

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
        const data = await res.json();
        if (data.secure_url) {
          uploaded.push({ url: data.secure_url, is_primary: media.length + uploaded.length === 0, order: media.length + uploaded.length });
        }
      } catch { /* skip failed */ }
    }
    setMedia(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const removeMedia = (i: number) => {
    setMedia(prev => {
      const next = prev.filter((_, idx) => idx !== i).map((m, idx) => ({ ...m, order: idx, is_primary: idx === 0 }));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('El título es obligatorio'); return; }
    setSaving(true); setError('');
    try {
      const features: { key: string; value: string }[] = [];
      if (form.clima)           features.push({ key: 'clima',            value: form.clima });
      if (form.altitud)         features.push({ key: 'altitud',          value: form.altitud });
      if (form.distancia_parque) features.push({ key: 'distancia_parque', value: form.distancia_parque });
      servicios.forEach(s => features.push({ key: s, value: 'si' }));
      if (form.has_360_tour && form.tour360_url) features.push({ key: 'tour360_url', value: form.tour360_url });

      const payload = {
        title:           form.title,
        type:            form.type,
        municipality_name: form.municipality_name,
        status:          form.status,
        price_cop:       form.price_cop ? parseInt(form.price_cop) : 0,
        area_lot_m2:     form.area_lot_m2  ? parseFloat(form.area_lot_m2)  : null,
        area_built_m2:   form.area_built_m2 ? parseFloat(form.area_built_m2) : null,
        bedrooms:        parseInt(form.bedrooms) || 0,
        bathrooms:       parseInt(form.bathrooms) || 0,
        parking:         parseInt(form.parking) || 0,
        year_built:      form.year_built ? parseInt(form.year_built) : null,
        geo_lat:         form.geo_lat   ? parseFloat(form.geo_lat)   : null,
        geo_lng:         form.geo_lng   ? parseFloat(form.geo_lng)   : null,
        address_visible: form.address_visible || null,
        short_description: form.short_description || null,
        description:     form.description || null,
        meta_title:      form.meta_title || null,
        meta_description: form.meta_description || null,
        media,
        features,
      };

      const res = await fetch('/api/admin/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Error al guardar');
        return;
      }
      router.push('/admin/propiedades');
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>

      {/* ── INFORMACIÓN BÁSICA ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <SectionTitle title="📋 Información básica" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          <Field label="Título" required>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Finca El Rosal con casa…" required style={inputStyle} />
          </Field>
          <Field label="Tipo de propiedad" required>
            <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
              {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Municipio" required>
            <select value={form.municipality_name} onChange={e => set('municipality_name', e.target.value)} style={inputStyle}>
              {MUNICIPALITIES.map(m => <option key={m.value} value={m.label}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
              <option value="available">Disponible</option>
              <option value="reserved">Reservada</option>
              <option value="sold">Vendida</option>
            </select>
          </Field>
        </div>
      </div>

      {/* ── PRECIOS Y ÁREAS ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <SectionTitle title="💰 Precios y áreas" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          <Field label="Precio COP" required>
            <input type="number" value={form.price_cop} onChange={e => set('price_cop', e.target.value)} placeholder="500000000" style={inputStyle} />
          </Field>
          <Field label="Área terreno (m²)">
            <input type="number" value={form.area_lot_m2} onChange={e => set('area_lot_m2', e.target.value)} placeholder="20000" style={inputStyle} />
          </Field>
          <Field label="Área construida (m²)">
            <input type="number" value={form.area_built_m2} onChange={e => set('area_built_m2', e.target.value)} placeholder="180" style={inputStyle} />
          </Field>
          <Field label="Habitaciones">
            <input type="number" min="0" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Baños">
            <input type="number" min="0" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Parqueaderos">
            <input type="number" min="0" value={form.parking} onChange={e => set('parking', e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>

      {/* ── UBICACIÓN ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <SectionTitle title="📍 Ubicación" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <Field label="Dirección / referencia">
            <input value={form.address_visible} onChange={e => set('address_visible', e.target.value)} placeholder="Vereda La Esmeralda…" style={inputStyle} />
          </Field>
          <Field label="Latitud (GPS)">
            <input type="number" step="any" value={form.geo_lat} onChange={e => set('geo_lat', e.target.value)} placeholder="4.9965" style={inputStyle} />
          </Field>
          <Field label="Longitud (GPS)">
            <input type="number" step="any" value={form.geo_lng} onChange={e => set('geo_lng', e.target.value)} placeholder="-74.3680" style={inputStyle} />
          </Field>
        </div>
      </div>

      {/* ── DESCRIPCIÓN ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <SectionTitle title="📝 Descripción" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Descripción corta">
            <textarea value={form.short_description} onChange={e => set('short_description', e.target.value)} rows={2} placeholder="Hermosa finca con vista panorámica…" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <Field label="Descripción completa">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Descripción detallada de la propiedad…" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
        </div>
      </div>

      {/* ── CARACTERÍSTICAS ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <SectionTitle title="🌿 Características y servicios" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <Field label="Clima / temperatura">
            <input value={form.clima} onChange={e => set('clima', e.target.value)} placeholder="Templado, 18°C promedio" style={inputStyle} />
          </Field>
          <Field label="Altitud msnm">
            <input value={form.altitud} onChange={e => set('altitud', e.target.value)} placeholder="1680 msnm" style={inputStyle} />
          </Field>
          <Field label="Distancia al parque (km)">
            <input value={form.distancia_parque} onChange={e => set('distancia_parque', e.target.value)} placeholder="12 km, 20 min" style={inputStyle} />
          </Field>
        </div>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 10 }}>Servicios públicos disponibles:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {SERVICIOS.map(s => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600, color: servicios.includes(s) ? '#15803D' : '#64748B', background: servicios.includes(s) ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${servicios.includes(s) ? '#86EFAC' : '#E2E8F0'}`, borderRadius: 8, padding: '6px 12px', userSelect: 'none', transition: 'all 0.15s' }}>
              <input type="checkbox" checked={servicios.includes(s)} onChange={e => setServicios(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))} style={{ display: 'none' }} />
              {servicios.includes(s) ? '✓' : '+'} {SERVICIOS_LABELS[s]}
            </label>
          ))}
        </div>
      </div>

      {/* ── IMÁGENES ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <SectionTitle title="📸 Imágenes" />
        <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files && uploadImages(e.target.files)} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1rem' }}>
          {uploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
          {uploading ? 'Subiendo…' : 'Seleccionar imágenes'}
        </button>
        {media.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
            {media.map((m, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 8, overflow: 'hidden', border: m.is_primary ? '3px solid #E8B92F' : '2px solid #E2E8F0' }}>
                <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {m.is_primary && <span style={{ position: 'absolute', bottom: 3, left: 3, background: '#E8B92F', color: '#0D2D5E', fontSize: '0.6rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>Principal</span>}
                <button type="button" onClick={() => removeMedia(i)}
                  style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        {media.length === 0 && !uploading && (
          <p style={{ color: '#94A3B8', fontSize: '0.82rem' }}>Sin imágenes — sube al menos una foto</p>
        )}
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>

      {/* ── SEO ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <SectionTitle title="🔍 SEO" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Meta title (máx. 60 caracteres)">
            <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)} maxLength={70} placeholder="Finca El Rosal en La Vega Cundinamarca | Su Finca Raíz" style={inputStyle} />
          </Field>
          <Field label="Meta description (máx. 160 caracteres)">
            <textarea value={form.meta_description} onChange={e => set('meta_description', e.target.value)} maxLength={180} rows={2} placeholder="Hermosa finca en venta en La Vega…" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
        </div>
      </div>

      {/* ── TOUR 360 ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <SectionTitle title="🌐 Tour Virtual 360°" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: '0.75rem' }}>
          <input type="checkbox" checked={form.has_360_tour} onChange={e => set('has_360_tour', e.target.checked)} style={{ width: 16, height: 16 }} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0D2D5E' }}>Esta propiedad tiene tour 360°</span>
        </label>
        {form.has_360_tour && (
          <Field label="URL del tour (Panoee embed URL)">
            <input value={form.tour360_url} onChange={e => set('tour360_url', e.target.value)} placeholder="https://panoee.com/embed/…" style={inputStyle} />
          </Field>
        )}
      </div>

      {/* Error + Submit */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontWeight: 600, fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => router.push('/admin/propiedades')}
          style={{ padding: '11px 22px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving || uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 28px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
          {saving ? 'Guardando…' : 'Guardar propiedad'}
        </button>
      </div>
    </form>
  );
}
