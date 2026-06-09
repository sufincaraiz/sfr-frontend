'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { MUNICIPALITIES, PROPERTY_TYPES, formatPrice } from '@/lib/utils';

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

export default function EditarPropiedadPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [data,    setData]    = useState<Record<string, unknown> | null>(null);
  const [form,    setForm]    = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch(`/api/admin/properties/${id}`)
      .then(r => { if (r.status === 401) { window.location.href = '/admin/login'; } return r.json(); })
      .then(d => {
        setData(d);
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
        });
      });
  }, [id]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price_cop:    parseInt(form['price_cop'] ?? '0') || 0,
          area_lot_m2:  form['area_lot_m2']  ? parseFloat(form['area_lot_m2'])  : null,
          area_built_m2: form['area_built_m2'] ? parseFloat(form['area_built_m2']) : null,
          bedrooms:     parseInt(form['bedrooms'] ?? '0') || 0,
          bathrooms:    parseInt(form['bathrooms'] ?? '0') || 0,
          parking:      parseInt(form['parking'] ?? '0') || 0,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return; }
      setSuccess('✅ Propiedad actualizada correctamente');
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

      {/* Precio actual */}
      <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: '#1B56A1', fontSize: '0.8rem', fontWeight: 700 }}>Precio actual:</span>
        <span style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.1rem' }}>{formatPrice(Number(data.price_cop))}</span>
      </div>

      {/* Formulario */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EFF6FF' }}>
          Información general
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <Field label="Título">
            <input value={form.title} onChange={e => set('title', e.target.value)} required style={inputStyle} />
          </Field>
          <Field label="Tipo">
            <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
              {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Municipio">
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
          <Field label="Precio COP">
            <input type="number" value={form.price_cop} onChange={e => set('price_cop', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Área terreno (m²)">
            <input type="number" value={form.area_lot_m2} onChange={e => set('area_lot_m2', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Área construida (m²)">
            <input type="number" value={form.area_built_m2} onChange={e => set('area_built_m2', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Habitaciones">
            <input type="number" min="0" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Baños">
            <input type="number" min="0" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EFF6FF' }}>Descripción y SEO</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Descripción corta">
            <textarea value={form.short_description} onChange={e => set('short_description', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <Field label="Descripción completa">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Meta title">
              <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Meta description">
              <input value={form.meta_description} onChange={e => set('meta_description', e.target.value)} style={inputStyle} />
            </Field>
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
          <button type="submit" disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 24px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  );
}
