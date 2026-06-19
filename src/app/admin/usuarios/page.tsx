'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, UserPlus, KeyRound, Power, Shield } from 'lucide-react';
import { ROLES, ROLE_LABELS, type Role } from '@/lib/permissions';

interface Usuario {
  id: string; nombre: string; email: string; role: Role; activo: boolean; created_at: string;
}

const inputS: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: '0.875rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box' };
const labelS: React.CSSProperties = { fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };

const ROLE_BADGE: Record<Role, { bg: string; color: string }> = {
  admin:         { bg: '#EEF2FF', color: '#4338CA' },
  asistente_crm: { bg: '#ECFDF5', color: '#047857' },
  autor_blog:    { bg: '#FEF3C7', color: '#B45309' },
};

export default function AdminUsuariosPage() {
  const [list, setList] = useState<Usuario[]>([]);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('asistente_crm');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/usuarios');
    if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
    const d = await res.json();
    setList(d.usuarios ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 2) { flash('⚠️ El nombre es obligatorio.'); return; }
    if (password.length < 8) { flash('⚠️ La contraseña debe tener al menos 8 caracteres.'); return; }
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, role, password }),
    });
    setSaving(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { flash(`⚠️ ${d.error ?? 'No se pudo crear el usuario.'}`); return; }
    flash('✅ Usuario creado.');
    setNombre(''); setEmail(''); setPassword(''); setRole('asistente_crm');
    load();
  };

  const actualizar = async (id: string, body: { role?: Role; activo?: boolean; password?: string }, okMsg: string) => {
    setBusyId(id); setMsg('');
    const res = await fetch('/api/admin/usuarios', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    setBusyId('');
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { flash(`⚠️ ${d.error ?? 'No se pudo actualizar.'}`); return; }
    flash(okMsg);
    load();
  };

  const toggleActivo = (u: Usuario) =>
    actualizar(u.id, { activo: !u.activo }, u.activo ? '✅ Usuario desactivado.' : '✅ Usuario reactivado.');

  const cambiarRol = (u: Usuario, nuevo: Role) => {
    if (nuevo === u.role) return;
    actualizar(u.id, { role: nuevo }, '✅ Rol actualizado.');
  };

  const resetPassword = (u: Usuario) => {
    const nueva = window.prompt(`Nueva contraseña para ${u.nombre} (mínimo 8 caracteres):`);
    if (nueva == null) return;
    if (nueva.length < 8) { flash('⚠️ La contraseña debe tener al menos 8 caracteres.'); return; }
    actualizar(u.id, { password: nueva }, '✅ Contraseña restablecida.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 920 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={20} style={{ color: '#1B56A1' }} />
        <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>Usuarios y roles</h2>
      </div>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msg.startsWith('✅') ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '11px 15px', color: msg.startsWith('✅') ? '#15803D' : '#DC2626', fontWeight: 700, fontSize: '0.88rem' }}>{msg}</div>}

      {/* Crear usuario */}
      <form onSubmit={crear} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 7 }}>
          <UserPlus size={16} /> Crear usuario
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <div><label style={labelS}>Nombre *</label><input value={nombre} onChange={e => setNombre(e.target.value)} required style={inputS} placeholder="María Asistente" /></div>
          <div><label style={labelS}>Correo *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputS} placeholder="maria@sufincaraiz.com" /></div>
          <div><label style={labelS}>Rol</label><select value={role} onChange={e => setRole(e.target.value as Role)} style={inputS}>{ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
          <div><label style={labelS}>Contraseña * (mín. 8)</label><input type="text" value={password} onChange={e => setPassword(e.target.value)} required style={inputS} placeholder="contraseña inicial" /></div>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 10, border: 'none', background: saving ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />} {saving ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>

      {/* Lista */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9', fontWeight: 700, color: '#0D2D5E', fontSize: '0.9rem' }}>Usuarios registrados ({list.length})</div>
        {list.length === 0 && <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>Aún no hay usuarios.</div>}
        {list.map(u => {
          const badge = ROLE_BADGE[u.role] ?? { bg: '#F1F5F9', color: '#475569' };
          const busy = busyId === u.id;
          return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.9rem 1.25rem', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', opacity: u.activo ? 1 : 0.6 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#0D2D5E', fontSize: '0.9rem' }}>
                  {u.nombre} {!u.activo && <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700 }}>· desactivado</span>}
                </p>
                <p style={{ margin: 0, color: '#64748B', fontSize: '0.8rem' }}>{u.email}</p>
              </div>

              <select value={u.role} disabled={busy} onChange={e => cambiarRol(u, e.target.value as Role)}
                style={{ ...inputS, width: 'auto', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 700, background: badge.bg, color: badge.color, border: 'none' }}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>

              <button onClick={() => resetPassword(u)} disabled={busy} title="Restablecer contraseña"
                style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1.5px solid #E2E8F0', background: '#fff', color: '#1B56A1', borderRadius: 8, padding: '6px 11px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                <KeyRound size={13} /> Contraseña
              </button>

              <button onClick={() => toggleActivo(u)} disabled={busy} title={u.activo ? 'Desactivar' : 'Reactivar'}
                style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8, padding: '6px 11px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${u.activo ? '#FECACA' : '#BBF7D0'}`, background: u.activo ? '#FEF2F2' : '#F0FDF4', color: u.activo ? '#DC2626' : '#15803D' }}>
                {busy ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Power size={13} />} {u.activo ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ color: '#94A3B8', fontSize: '0.78rem', margin: 0 }}>
        Por seguridad, las contraseñas se guardan encriptadas: no se pueden ver, solo restablecer. Los usuarios se desactivan (no se borran) para conservar el historial.
      </p>
    </div>
  );
}
