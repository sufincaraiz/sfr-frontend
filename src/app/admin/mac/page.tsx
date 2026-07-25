'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, Trash2, Pencil, Plus, X, Bot, Power } from 'lucide-react';

interface Ficha {
  id: string;
  titulo: string;
  contenido: string;
  categoria: string;
  activo: boolean;
  orden: number;
  vigente_hasta: string | null;
  updated_at: string;
}

interface Form {
  id?: string;
  titulo: string; contenido: string; categoria: string;
  activo: boolean; orden: number; vigente_hasta: string;
}

const CATEGORIAS = ['General', 'Promociones', 'Formas de pago', 'Proceso de compra', 'Preguntas frecuentes', 'Servicios', 'Políticas'];
const CONTENIDO_MAX = 4000;

const inputS: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.875rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box' };
const labelS: React.CSSProperties = { fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };

const EMPTY: Form = { titulo: '', contenido: '', categoria: 'General', activo: true, orden: 0, vigente_hasta: '' };

export default function AdminMacPage() {
  const [list, setList] = useState<Ficha[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/mac');
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    const d = await res.json();
    setList(d.fichas ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof Form, v: string | boolean | number) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.titulo.trim().length < 3 || form.contenido.trim().length < 5) {
      setMsg('⚠️ El título y el contenido son obligatorios.'); return;
    }
    setSaving(true); setMsg('');
    const editing = !!form.id;
    const res = await fetch('/api/admin/mac', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setMsg('⚠️ No se pudo guardar.'); return; }
    setMsg(editing ? '✅ Ficha actualizada. Mac ya la está usando.' : '✅ Ficha agregada. Mac ya la está usando.');
    setForm(EMPTY);
    load();
  };

  const edit = (f: Ficha) => {
    setForm({
      id: f.id, titulo: f.titulo, contenido: f.contenido, categoria: f.categoria,
      activo: f.activo, orden: f.orden,
      vigente_hasta: f.vigente_hasta ? f.vigente_hasta.slice(0, 10) : '',
    });
    setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggle = async (f: Ficha) => {
    await fetch('/api/admin/mac', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: f.id, activo: !f.activo }),
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar esta ficha? Mac dejará de saber esta información.')) return;
    await fetch(`/api/admin/mac?id=${id}`, { method: 'DELETE' });
    load();
  };

  const activas = list.filter(f => f.activo).length;
  const vencida = (f: Ficha) => !!f.vigente_hasta && new Date(f.vigente_hasta) < new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0D2D5E', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>
          <Bot size={22} /> Lo que Mac sabe
        </h2>
        <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: '0.85rem', lineHeight: 1.55 }}>
          Todo lo que cargues aquí Mac lo usa al responder, en la web y en WhatsApp, sin necesidad de publicar nada.
          Sirve para promociones vigentes, formas de pago, preguntas frecuentes o cualquier dato del negocio.
          Las propiedades <strong>no</strong> van aquí: esas Mac ya las lee del catálogo.
        </p>
      </div>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msg.startsWith('✅') ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '11px 15px', color: msg.startsWith('✅') ? '#15803D' : '#DC2626', fontWeight: 700, fontSize: '0.88rem' }}>{msg}</div>}

      {/* Formulario */}
      <form onSubmit={save} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{form.id ? 'Editar ficha' : 'Nueva ficha de información'}</h3>
          {form.id && <button type="button" onClick={() => { setForm(EMPTY); setMsg(''); }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}><X size={14} /> Cancelar edición</button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelS}>Título *</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)} required style={inputS} placeholder="Ej: Promoción de septiembre — lotes La Rivera" />
          </div>
          <div>
            <label style={labelS}>Categoría</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)} style={inputS}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelS}>Prioridad (0 = primero)</label>
            <input type="number" min={0} max={999} value={form.orden} onChange={e => set('orden', Number(e.target.value) || 0)} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Vigente hasta (opcional)</label>
            <input type="date" value={form.vigente_hasta} onChange={e => set('vigente_hasta', e.target.value)} style={inputS} />
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={labelS}>Contenido *</label>
          <textarea
            value={form.contenido}
            onChange={e => set('contenido', e.target.value.slice(0, CONTENIDO_MAX))}
            rows={7}
            style={{ ...inputS, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
            placeholder={'Escríbelo como se lo explicarías a un asesor nuevo. Ejemplo:\n\nHasta el 30 de septiembre, los lotes del condominio La Rivera tienen separación desde $5.000.000 y plan de pago a 12 meses sin interés. Aplica solo para pago de contado del saldo. El especialista confirma condiciones finales.'}
          />
          <p style={{ margin: '4px 0 0', textAlign: 'right', fontSize: '0.72rem', color: form.contenido.length >= CONTENIDO_MAX ? '#DC2626' : '#94A3B8' }}>{form.contenido.length}/{CONTENIDO_MAX}</p>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.9rem', cursor: 'pointer', fontWeight: 600, color: '#0D2D5E', fontSize: '0.88rem' }}>
          <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} style={{ width: 17, height: 17, accentColor: '#15803D' }} />
          Activa (Mac la usa en sus respuestas)
        </label>

        <div style={{ marginTop: '1.25rem' }}>
          <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : (form.id ? <Save size={15} /> : <Plus size={15} />)} {saving ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Agregar ficha')}
          </button>
        </div>
      </form>

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9', fontWeight: 700, color: '#0D2D5E', fontSize: '0.9rem' }}>
          Fichas cargadas ({list.length}) · <span style={{ color: '#15803D' }}>{activas} activa{activas === 1 ? '' : 's'}</span>
        </div>
        {list.length === 0 && <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>Mac todavía funciona solo con su instrucción base. Agrega la primera ficha arriba.</div>}
        {list.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0.9rem 1.25rem', borderTop: '1px solid #F1F5F9', opacity: f.activo && !vencida(f) ? 1 : 0.55 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#0D2D5E', fontSize: '0.88rem' }}>
                {f.titulo}
                {!f.activo && <span style={{ marginLeft: 8, background: '#F1F5F9', color: '#64748B', fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5 }}>INACTIVA</span>}
                {f.activo && vencida(f) && <span style={{ marginLeft: 8, background: '#FEF3C7', color: '#B45309', fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5 }}>VENCIDA</span>}
              </p>
              <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: '0.78rem' }}>
                {f.categoria}{f.vigente_hasta ? ` · hasta ${f.vigente_hasta.slice(0, 10)}` : ''}
              </p>
              <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.8rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.contenido}</p>
            </div>
            <button onClick={() => toggle(f)} title={f.activo ? 'Desactivar' : 'Activar'} style={{ border: `1.5px solid ${f.activo ? '#BBF7D0' : '#E2E8F0'}`, background: f.activo ? '#F0FDF4' : '#fff', color: f.activo ? '#15803D' : '#94A3B8', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Power size={15} /></button>
            <button onClick={() => edit(f)} title="Editar" style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#1B56A1', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Pencil size={15} /></button>
            <button onClick={() => del(f.id)} title="Eliminar" style={{ border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
