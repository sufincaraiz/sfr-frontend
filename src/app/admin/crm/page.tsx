'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Plus, Save, X, Pencil, Trash2, MessageCircle, Contact as ContactIcon, CalendarClock } from 'lucide-react';
import {
  ETAPAS, TIPOS, ORIGENES, etapaMeta, seguimientoVencido,
  TIPO_LABEL, ORIGEN_LABEL, waLink, type Contacto, type Etapa,
} from '@/lib/crm';

interface Form {
  id?: string;
  nombre: string; telefono: string; email: string; tipo: string;
  interes: string; etapa: string; proximo_seguimiento: string; origen: string; notas: string;
}

const EMPTY: Form = { nombre: '', telefono: '', email: '', tipo: 'comprador', interes: '', etapa: 'nuevo', proximo_seguimiento: '', origen: 'manual', notas: '' };

const inputS: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.875rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box' };
const labelS: React.CSSProperties = { fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }) : '';

export default function AdminCrmPage() {
  const [list, setList] = useState<Contacto[]>([]);
  const [role, setRole] = useState<string>('');
  const [form, setForm] = useState<Form>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [filtro, setFiltro] = useState<string>('Todos');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/crm');
    if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
    const d = await res.json();
    setList(d.contactos ?? []);
  }, []);

  useEffect(() => {
    load();
    fetch('/api/admin/me').then(r => r.ok ? r.json() : null).then(d => d && setRole(d.role)).catch(() => {});
  }, [load]);

  const isAdmin = role === 'admin';
  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const flash = (m: string) => { setMsg(m); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const nuevo = () => { setForm(EMPTY); setShowForm(true); setMsg(''); };
  const editar = (c: Contacto) => {
    setForm({
      id: c.id, nombre: c.nombre, telefono: c.telefono ?? '', email: c.email ?? '', tipo: c.tipo,
      interes: c.interes ?? '', etapa: c.etapa, proximo_seguimiento: c.proximo_seguimiento ? c.proximo_seguimiento.slice(0, 10) : '',
      origen: c.origen, notas: c.notas ?? '',
    });
    setShowForm(true); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cerrarForm = () => { setForm(EMPTY); setShowForm(false); };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nombre.trim().length < 2) { flash('⚠️ El nombre es obligatorio.'); return; }
    setSaving(true); setMsg('');
    const editing = !!form.id;
    const res = await fetch('/api/admin/crm', {
      method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { flash('⚠️ No se pudo guardar.'); return; }
    flash(editing ? '✅ Contacto actualizado.' : '✅ Contacto agregado.');
    cerrarForm(); load();
  };

  const cambiarEtapa = async (c: Contacto, etapa: Etapa) => {
    if (etapa === c.etapa) return;
    setBusyId(c.id);
    await fetch('/api/admin/crm', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, etapa }) });
    setBusyId(''); load();
  };

  const borrar = async (c: Contacto) => {
    if (!confirm(`¿Eliminar el contacto "${c.nombre}"?`)) return;
    setBusyId(c.id);
    const res = await fetch(`/api/admin/crm?id=${c.id}`, { method: 'DELETE' });
    setBusyId('');
    if (!res.ok) { flash('⚠️ No se pudo eliminar.'); return; }
    load();
  };

  const filtrados = useMemo(
    () => filtro === 'Todos' ? list : list.filter(c => c.etapa === filtro),
    [list, filtro],
  );
  const conteo = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of list) m[c.etapa] = (m[c.etapa] ?? 0) + 1;
    return m;
  }, [list]);

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '7px 15px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
    border: active ? '1.5px solid #1B56A1' : '1.5px solid #E2E8F0',
    background: active ? '#1B56A1' : '#fff', color: active ? '#fff' : '#475569',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1000 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ContactIcon size={20} style={{ color: '#1B56A1' }} />
          <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>CRM · Contactos</h2>
        </div>
        {!showForm && (
          <button onClick={nuevo} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.85rem', padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
            <Plus size={15} /> Nuevo contacto
          </button>
        )}
      </div>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msg.startsWith('✅') ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '11px 15px', color: msg.startsWith('✅') ? '#15803D' : '#DC2626', fontWeight: 700, fontSize: '0.88rem' }}>{msg}</div>}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={guardar} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{form.id ? 'Editar contacto' : 'Nuevo contacto'}</h3>
            <button type="button" onClick={cerrarForm} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}><X size={14} /> Cerrar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            <div><label style={labelS}>Nombre *</label><input value={form.nombre} onChange={e => set('nombre', e.target.value)} required style={inputS} placeholder="Juan Pérez" /></div>
            <div><label style={labelS}>Teléfono / WhatsApp</label><input value={form.telefono} onChange={e => set('telefono', e.target.value)} style={inputS} placeholder="321 000 0000" /></div>
            <div><label style={labelS}>Correo</label><input value={form.email} onChange={e => set('email', e.target.value)} style={inputS} placeholder="juan@correo.com" /></div>
            <div><label style={labelS}>Tipo</label><select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={inputS}>{TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}</select></div>
            <div><label style={labelS}>Etapa</label><select value={form.etapa} onChange={e => set('etapa', e.target.value)} style={inputS}>{ETAPAS.map(et => <option key={et} value={et}>{etapaMeta(et).label}</option>)}</select></div>
            <div><label style={labelS}>Próximo seguimiento</label><input type="date" value={form.proximo_seguimiento} onChange={e => set('proximo_seguimiento', e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>Origen</label><select value={form.origen} onChange={e => set('origen', e.target.value)} style={inputS}>{ORIGENES.map(o => <option key={o} value={o}>{ORIGEN_LABEL[o]}</option>)}</select></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelS}>¿Qué busca? (interés)</label><input value={form.interes} onChange={e => set('interes', e.target.value)} style={inputS} placeholder="Finca con agua en La Vega, hasta $300M" /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelS}>Notas</label><textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={3} style={{ ...inputS, resize: 'vertical', lineHeight: 1.5 }} placeholder="Detalles de la conversación, preferencias, etc." /></div>
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : (form.id ? <Save size={15} /> : <Plus size={15} />)} {saving ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Agregar contacto')}
            </button>
          </div>
        </form>
      )}

      {/* Filtros por etapa */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => setFiltro('Todos')} style={tabBtn(filtro === 'Todos')}>Todos ({list.length})</button>
        {ETAPAS.map(et => (
          <button key={et} onClick={() => setFiltro(et)} style={tabBtn(filtro === et)}>{etapaMeta(et).label} ({conteo[et] ?? 0})</button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9', fontWeight: 700, color: '#0D2D5E', fontSize: '0.9rem' }}>
          {filtro === 'Todos' ? 'Todos los contactos' : etapaMeta(filtro).label} ({filtrados.length})
        </div>
        {filtrados.length === 0 && <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>No hay contactos en esta etapa.</div>}
        {filtrados.map(c => {
          const wa = waLink(c.telefono, c.nombre);
          const vencido = seguimientoVencido(c.proximo_seguimiento, c.etapa);
          const meta = etapaMeta(c.etapa);
          const busy = busyId === c.id;
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.9rem 1.25rem', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#0D2D5E', fontSize: '0.9rem' }}>
                  {c.nombre}
                  <span style={{ marginLeft: 8, fontSize: '0.72rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 6, padding: '2px 7px' }}>{TIPO_LABEL[c.tipo as keyof typeof TIPO_LABEL] ?? c.tipo}</span>
                  {c.origen === 'lead-web' && <span style={{ marginLeft: 6, fontSize: '0.68rem', fontWeight: 700, color: '#1B56A1', background: '#EFF6FF', borderRadius: 6, padding: '2px 7px' }}>desde lead</span>}
                </p>
                <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: '0.78rem' }}>
                  {c.telefono || 'sin teléfono'}{c.email ? ` · ${c.email}` : ''}
                </p>
                {c.interes && <p style={{ margin: '3px 0 0', color: '#475569', fontSize: '0.78rem', fontStyle: 'italic' }}>{c.interes}</p>}
              </div>

              {c.proximo_seguimiento && (
                <span title="Próximo seguimiento" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', fontWeight: 700, padding: '4px 9px', borderRadius: 8, background: vencido ? '#FEF2F2' : '#F8FAFC', color: vencido ? '#DC2626' : '#64748B', border: `1px solid ${vencido ? '#FECACA' : '#E2E8F0'}` }}>
                  <CalendarClock size={12} /> {fmtFecha(c.proximo_seguimiento)}{vencido ? ' · vencido' : ''}
                </span>
              )}

              <select value={c.etapa} disabled={busy} onChange={e => cambiarEtapa(c, e.target.value as Etapa)}
                style={{ ...inputS, width: 'auto', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 700, background: meta.bg, color: meta.color, border: 'none' }}>
                {ETAPAS.map(et => <option key={et} value={et}>{etapaMeta(et).label}</option>)}
              </select>

              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: '#25D366', color: '#fff', textDecoration: 'none', flexShrink: 0 }}>
                  <MessageCircle size={15} />
                </a>
              )}
              <button onClick={() => editar(c)} title="Editar" style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#1B56A1', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Pencil size={15} /></button>
              {isAdmin && (
                <button onClick={() => borrar(c)} disabled={busy} title="Eliminar" style={{ border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
