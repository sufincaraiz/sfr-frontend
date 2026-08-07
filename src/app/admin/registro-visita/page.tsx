'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, RotateCcw, Lock, ExternalLink } from 'lucide-react';
import { DEFAULT_REGISTRO_VISITA, type RegistroVisitaContent } from '@/lib/registro-visita';

const inputS: React.CSSProperties = {
  padding: '10px 13px', border: '1.5px solid #E2E8F0', borderRadius: 9,
  fontSize: '0.9rem', outline: 'none', color: '#0D2D5E', background: '#fff',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
};
const labelS: React.CSSProperties = {
  fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6,
};
const cardS: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.5rem',
};

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #EFF6FF' }}>
    {children}
  </h3>
);

const CAMPOS_ORDEN = [
  ['nombresCompletos',   'Nombres y apellidos'],
  ['cedula',             'Cédula'],
  ['inmuebleReferencia', 'Inmueble a visitar'],
  ['correo',             'Correo'],
  ['celular',            'Celular'],
  ['municipioOrigen',    'Municipio'],
] as const;

export default function AdminRegistroVisitaPage() {
  const [c, setC] = useState<RegistroVisitaContent | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/registro-visita');
      if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
      const d = await res.json();
      setC(d.data ?? DEFAULT_REGISTRO_VISITA);
    } catch {
      setError('No se pudo cargar el contenido.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!c) return;
    setGuardando(true); setError(''); setAviso('');
    try {
      const res = await fetch('/api/admin/registro-visita', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: c }),
      });
      if (!res.ok) { setError((await res.json()).error ?? 'No se pudo guardar'); return; }
      setAviso('✅ Contenido guardado. Los cambios ya se ven en la página pública.');
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = () => {
    if (!confirm('¿Restaurar todos los textos a los valores por defecto? No se guarda hasta que pulses Guardar.')) return;
    setC(structuredClone(DEFAULT_REGISTRO_VISITA));
    setAviso('Textos restaurados. Pulsa Guardar para aplicarlos.');
  };

  if (cargando || !c) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 size={26} style={{ color: '#1B56A1', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <a
          href="/registro-visita" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B56A1', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
        >
          <ExternalLink size={14} /> Ver la página pública
        </a>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem' }}>{error}</div>}
      {aviso && <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: '#15803D', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem' }}>{aviso}</div>}

      {/* ── Encabezado ── */}
      <div style={cardS}>
        <Titulo>Encabezado</Titulo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelS}>Línea superior</label>
            <input value={c.hero.eyebrow} onChange={e => setC({ ...c, hero: { ...c.hero, eyebrow: e.target.value } })} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Título</label>
            <input value={c.hero.titulo} onChange={e => setC({ ...c, hero: { ...c.hero, titulo: e.target.value } })} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Subtítulo</label>
            <textarea value={c.hero.subtitulo} onChange={e => setC({ ...c, hero: { ...c.hero, subtitulo: e.target.value } })} rows={2} style={{ ...inputS, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelS}>Aviso azul (sobre el formulario)</label>
            <textarea value={c.aviso} onChange={e => setC({ ...c, aviso: e.target.value })} rows={3} style={{ ...inputS, resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* ── Campos ── */}
      <div style={cardS}>
        <Titulo>Etiquetas de los campos</Titulo>
        <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          Cambia cómo se llama cada campo y su texto de ejemplo. El orden y la
          cantidad de campos no se modifican desde aquí.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {CAMPOS_ORDEN.map(([k, nombre]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
              <div>
                <label style={labelS}>{nombre} — etiqueta</label>
                <input
                  value={c.campos[k].label}
                  onChange={e => setC({ ...c, campos: { ...c.campos, [k]: { ...c.campos[k], label: e.target.value } } })}
                  style={inputS}
                />
              </div>
              <div>
                <label style={labelS}>{nombre} — texto de ejemplo</label>
                <input
                  value={c.campos[k].placeholder}
                  onChange={e => setC({ ...c, campos: { ...c.campos, [k]: { ...c.campos[k], placeholder: e.target.value } } })}
                  style={inputS}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Consentimiento (parcialmente bloqueado) ── */}
      <div style={cardS}>
        <Titulo>Consentimiento</Titulo>
        <div style={{
          display: 'flex', gap: 11, alignItems: 'flex-start',
          background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 11,
          padding: '0.9rem 1.1rem', marginBottom: '1.1rem',
        }}>
          <Lock size={18} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: '#92400E', fontSize: '0.83rem', lineHeight: 1.55, margin: 0 }}>
            <strong>El texto de las dos casillas no se edita desde aquí, a propósito.</strong> Cada
            registro guarda solo un “sí” por casilla, así que ese “sí” únicamente prueba
            algo si el texto mostrado fue siempre el mismo. Si necesitas reformularlo,
            pídelo por desarrollo: queda registrado en el historial del código, que es lo
            que exige la Ley 1581.
          </p>
        </div>
        <div>
          <label style={labelS}>Título del bloque</label>
          <input value={c.consentimiento.titulo} onChange={e => setC({ ...c, consentimiento: { titulo: e.target.value } })} style={inputS} />
        </div>
      </div>

      {/* ── Botón y confirmación ── */}
      <div style={cardS}>
        <Titulo>Botón y confirmación</Titulo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
            <div>
              <label style={labelS}>Texto del botón</label>
              <input value={c.boton.enviar} onChange={e => setC({ ...c, boton: { ...c.boton, enviar: e.target.value } })} style={inputS} />
            </div>
            <div>
              <label style={labelS}>Mientras guarda</label>
              <input value={c.boton.enviando} onChange={e => setC({ ...c, boton: { ...c.boton, enviando: e.target.value } })} style={inputS} />
            </div>
          </div>
          <div>
            <label style={labelS}>Ayuda cuando faltan las casillas</label>
            <input value={c.boton.ayudaCasillas} onChange={e => setC({ ...c, boton: { ...c.boton, ayudaCasillas: e.target.value } })} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Confirmación — título</label>
            <input value={c.confirmacion.titulo} onChange={e => setC({ ...c, confirmacion: { ...c.confirmacion, titulo: e.target.value } })} style={inputS} />
          </div>
          <div>
            <label style={labelS}>Confirmación — mensaje</label>
            <textarea value={c.confirmacion.mensaje} onChange={e => setC({ ...c, confirmacion: { ...c.confirmacion, mensaje: e.target.value } })} rows={3} style={{ ...inputS, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelS}>Confirmación — texto del botón</label>
            <input value={c.confirmacion.textoBotonVolver} onChange={e => setC({ ...c, confirmacion: { ...c.confirmacion, textoBotonVolver: e.target.value } })} style={inputS} />
          </div>
        </div>
      </div>

      {/* ── Nota legal ── */}
      <div style={cardS}>
        <Titulo>Nota legal del pie</Titulo>
        <textarea value={c.notaLegal} onChange={e => setC({ ...c, notaLegal: e.target.value })} rows={4} style={{ ...inputS, resize: 'vertical' }} />
      </div>

      {/* ── Acciones ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: '1rem' }}>
        <button
          type="button" onClick={guardar} disabled={guardando}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.9rem', padding: '11px 22px', borderRadius: 10, border: 'none', cursor: guardando ? 'default' : 'pointer', opacity: guardando ? 0.6 : 1 }}
        >
          {guardando ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
          Guardar cambios
        </button>
        <button
          type="button" onClick={restaurar}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', color: '#64748B', fontWeight: 700, fontSize: '0.9rem', padding: '11px 20px', borderRadius: 10, border: '1.5px solid #E2E8F0', cursor: 'pointer' }}
        >
          <RotateCcw size={15} /> Restaurar por defecto
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
