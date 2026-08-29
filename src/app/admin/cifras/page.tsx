'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, RotateCcw, ExternalLink, Star } from 'lucide-react';
import { DEFAULT_CIFRAS, textoReputacion, type CifrasPublicas } from '@/lib/cifras-publicas';

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

export default function AdminCifrasPage() {
  const [c, setC] = useState<CifrasPublicas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cifras-publicas');
      if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
      const d = await res.json();
      setC(d.data ?? DEFAULT_CIFRAS);
    } catch {
      setError('No se pudo cargar las cifras.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Validación en el cliente, espejo de la del servidor: el botón se bloquea si
  // algo está fuera de rango, así el error se ve antes de guardar.
  const errores: string[] = [];
  if (c) {
    if (!(c.calificacionGoogle >= 0 && c.calificacionGoogle <= 5)) errores.push('La calificación debe estar entre 0 y 5.');
    if (!(Number.isInteger(c.resenasGoogle) && c.resenasGoogle >= 0)) errores.push('Las reseñas deben ser un número entero de 0 o más.');
    if (!/^\d{4}-\d{2}$/.test(c.fechaCorteReputacion)) errores.push('La fecha de corte debe tener el formato AAAA-MM (ej. 2026-08).');
  }

  const guardar = async () => {
    if (!c || errores.length) return;
    setGuardando(true); setError(''); setAviso('');
    try {
      const res = await fetch('/api/admin/cifras-publicas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: c }),
      });
      if (!res.ok) { setError((await res.json()).error ?? 'No se pudo guardar'); return; }
      setAviso('✅ Cifras guardadas. Ya se ven en el inicio, en Nosotros, en las respuestas de Mac y en el llms.txt.');
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = () => {
    if (!confirm('¿Restaurar los valores por defecto del código? No se guarda hasta que pulses Guardar.')) return;
    setC({ ...DEFAULT_CIFRAS });
    setAviso('Valores restaurados. Pulsa Guardar para aplicarlos.');
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
    <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <a
          href="/#preguntas-frecuentes" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B56A1', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
        >
          <ExternalLink size={14} /> Ver el inicio
        </a>
        <a
          href="/nosotros" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B56A1', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
        >
          <ExternalLink size={14} /> Ver Nosotros
        </a>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem' }}>{error}</div>}
      {aviso && <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: '#15803D', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem' }}>{aviso}</div>}

      <div style={cardS}>
        <Titulo>Reputación en Google</Titulo>
        <p style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.55 }}>
          El número de reseñas sube solo con el tiempo. Actualízalo aquí cuando cambie
          y se refleja en todo el sitio sin desplegar código: inicio, Nosotros, las
          respuestas de Mac y el archivo para modelos de IA (llms.txt).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem' }}>
            <div>
              <label style={labelS}>Calificación (0 a 5)</label>
              <input
                type="number" min={0} max={5} step={0.1}
                value={Number.isNaN(c.calificacionGoogle) ? '' : c.calificacionGoogle}
                onChange={e => setC({ ...c, calificacionGoogle: parseFloat(e.target.value) })}
                style={inputS}
              />
            </div>
            <div>
              <label style={labelS}>Número de reseñas</label>
              <input
                type="number" min={0} step={1}
                value={Number.isNaN(c.resenasGoogle) ? '' : c.resenasGoogle}
                onChange={e => setC({ ...c, resenasGoogle: parseInt(e.target.value, 10) })}
                style={inputS}
              />
            </div>
          </div>
          <div style={{ maxWidth: 220 }}>
            <label style={labelS}>Fecha de corte (AAAA-MM)</label>
            <input
              type="month"
              value={/^\d{4}-\d{2}$/.test(c.fechaCorteReputacion) ? c.fechaCorteReputacion : ''}
              onChange={e => setC({ ...c, fechaCorteReputacion: e.target.value })}
              style={inputS}
            />
            <p style={{ color: '#94A3B8', fontSize: '0.72rem', marginTop: 5, lineHeight: 1.4 }}>
              Cuándo se contó la cifra. No se muestra al público hoy; queda registrada como respaldo.
            </p>
          </div>
        </div>
      </div>

      {/* Vista previa: exactamente lo que verá el visitante y lo que dirá Mac. */}
      <div style={{ ...cardS, background: '#0D2D5E', border: 'none' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
          Vista previa
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Star size={26} style={{ color: '#E8B92F' }} fill="#E8B92F" />
          <div style={{ fontWeight: 800, fontSize: '2.2rem', color: '#E8B92F', lineHeight: 1 }}>
            {(c.calificacionGoogle >= 0 && c.calificacionGoogle <= 5) ? c.calificacionGoogle.toFixed(1).replace('.', ',') : '—'}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', maxWidth: 200 }}>
            {errores.length ? 'Corrige los valores para ver la vista previa' : textoReputacion(c)}
          </p>
        </div>
      </div>

      {errores.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', color: '#92400E', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.83rem', lineHeight: 1.5 }}>
          {errores.map(e => <div key={e}>• {e}</div>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: '1rem' }}>
        <button
          type="button" onClick={guardar} disabled={guardando || errores.length > 0}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.9rem', padding: '11px 22px', borderRadius: 10, border: 'none', cursor: (guardando || errores.length) ? 'default' : 'pointer', opacity: (guardando || errores.length) ? 0.5 : 1 }}
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
