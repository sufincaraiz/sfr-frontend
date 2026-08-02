'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Save, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Info } from 'lucide-react';

interface Tipo {
  id: string;
  slug: string;
  label: string;
  plural: string | null;
  orden: number;
  oculto: boolean;
  propiedades: number;
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1.5px solid #E2E8F0', borderRadius: 8,
  fontSize: '0.85rem', outline: 'none', color: '#0D2D5E', background: '#fff', width: '100%', boxSizing: 'border-box',
};

const iconBtn: React.CSSProperties = {
  background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 8,
  padding: '6px 8px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center',
};

export default function TiposPage() {
  const [tipos,   setTipos]   = useState<Tipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error,   setError]   = useState('');
  const [aviso,   setAviso]   = useState('');
  const [nuevo,   setNuevo]   = useState('');
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/property-types');
      if (res.status === 403 || res.status === 401) { window.location.href = '/admin/login'; return; }
      const d = await res.json();
      setTipos(d.tipos ?? []);
    } catch {
      setError('No se pudieron cargar los tipos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const editar = (id: string, campo: keyof Tipo, valor: string | number | boolean) =>
    setTipos(prev => prev.map(t => (t.id === id ? { ...t, [campo]: valor } : t)));

  const guardar = async (t: Tipo) => {
    setSavingId(t.id); setError(''); setAviso('');
    try {
      const res = await fetch('/api/admin/property-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, label: t.label, plural: t.plural ?? '', orden: t.orden, oculto: t.oculto }),
      });
      if (!res.ok) { setError((await res.json()).error ?? 'No se pudo guardar'); return; }
      setAviso(`✅ "${t.label}" guardado`);
      await cargar();
    } finally {
      setSavingId(null);
    }
  };

  const mover = async (t: Tipo, dir: -1 | 1) => {
    const nuevoOrden = t.orden + dir * 15; // salto mayor que el paso de 10 del seed
    editar(t.id, 'orden', nuevoOrden);
    await guardar({ ...t, orden: nuevoOrden });
  };

  const crear = async () => {
    const label = nuevo.trim();
    if (label.length < 2) { setError('Escribe el nombre del tipo.'); return; }
    setCreando(true); setError(''); setAviso('');
    try {
      const res = await fetch('/api/admin/property-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) { setError((await res.json()).error ?? 'No se pudo crear'); return; }
      setNuevo(''); setAviso(`✅ Tipo "${label}" creado`);
      await cargar();
    } finally {
      setCreando(false);
    }
  };

  const borrar = async (t: Tipo) => {
    if (!confirm(`¿Borrar el tipo "${t.label}"? Esta acción no se puede deshacer.`)) return;
    setSavingId(t.id); setError(''); setAviso('');
    try {
      const res = await fetch(`/api/admin/property-types?id=${t.id}`, { method: 'DELETE' });
      if (!res.ok) { setError((await res.json()).error ?? 'No se pudo borrar'); return; }
      setAviso(`Tipo "${t.label}" eliminado`);
      await cargar();
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 size={26} style={{ color: '#1B56A1', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: '0.9rem 1.1rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={18} style={{ color: '#1B56A1', flexShrink: 0, marginTop: 2 }} />
        <p style={{ color: '#1D4ED8', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>
          Estos tipos alimentan el selector del formulario de propiedades y el filtro
          del buscador. El <strong>identificador</strong> no se puede cambiar porque es el
          valor guardado en cada propiedad; para dejar de ofrecer un tipo sin perder
          el histórico, <strong>ocúltalo</strong>.
        </p>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem' }}>{error}</div>}
      {aviso && <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: '#15803D', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem' }}>{aviso}</div>}

      {/* Crear */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.1rem 1.25rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Agregar tipo</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={nuevo}
            onChange={e => setNuevo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); crear(); } }}
            placeholder="Ej. Bodega, Lote industrial…"
            style={{ ...inputStyle, flex: '1 1 240px', width: 'auto' }}
          />
          <button
            type="button" onClick={crear} disabled={creando}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1B56A1', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '8px 16px', borderRadius: 9, border: 'none', cursor: creando ? 'default' : 'pointer', opacity: creando ? 0.6 : 1 }}
          >
            {creando ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
            Crear
          </button>
        </div>
      </div>

      {/* Listado */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Identificador</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Nombre (singular)</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Plural</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>Propiedades</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid #F1F5F9', opacity: t.oculto ? 0.55 : 1 }}>
                  <td style={{ padding: '10px 14px', color: '#94A3B8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{t.slug}</td>
                  <td style={{ padding: '10px 14px', minWidth: 160 }}>
                    <input value={t.label} onChange={e => editar(t.id, 'label', e.target.value)} style={inputStyle} />
                  </td>
                  <td style={{ padding: '10px 14px', minWidth: 160 }}>
                    <input value={t.plural ?? ''} onChange={e => editar(t.id, 'plural', e.target.value)} placeholder="(automático)" style={inputStyle} />
                  </td>
                  <td style={{ padding: '10px 14px', color: '#475569', textAlign: 'center' }}>{t.propiedades}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      <button type="button" title="Subir" onClick={() => mover(t, -1)} style={iconBtn}><ArrowUp size={14} /></button>
                      <button type="button" title="Bajar" onClick={() => mover(t, 1)} style={iconBtn}><ArrowDown size={14} /></button>
                      <button
                        type="button"
                        title={t.oculto ? 'Mostrar en los selectores' : 'Ocultar de los selectores'}
                        onClick={() => guardar({ ...t, oculto: !t.oculto })}
                        style={iconBtn}
                      >
                        {t.oculto ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button" title="Guardar cambios" onClick={() => guardar(t)} disabled={savingId === t.id}
                        style={{ ...iconBtn, background: '#1B56A1', borderColor: '#1B56A1', color: '#fff' }}
                      >
                        {savingId === t.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                      </button>
                      <button
                        type="button"
                        title={t.propiedades > 0 ? 'No se puede borrar: hay propiedades con este tipo' : 'Borrar'}
                        onClick={() => borrar(t)}
                        disabled={t.propiedades > 0}
                        style={{ ...iconBtn, color: '#B91C1C', opacity: t.propiedades > 0 ? 0.35 : 1, cursor: t.propiedades > 0 ? 'not-allowed' : 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
