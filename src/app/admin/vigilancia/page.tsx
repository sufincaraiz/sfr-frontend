'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Hallazgo {
  id: string; clase: string; detalle: string; resuelto: boolean;
  primero_visto: string; ultimo_visto: string; dias_abierto: number;
}
interface Vivo { clase: string; detalle: string }

const cardS: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem' };

// Color por clase de hallazgo.
const COLOR: Record<string, string> = {
  'valor futuro': '#B91C1C',
  'ficha contradice a su vereda': '#B45309',
  'municipio incompleto': '#B45309',
  'instrucción en conocimiento': '#7C3AED',
};
const chip = (clase: string) => ({
  display: 'inline-block', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px',
  borderRadius: 999, color: '#fff', background: COLOR[clase] ?? '#475569', whiteSpace: 'nowrap' as const,
});

export default function AdminVigilanciaPage() {
  const [hallazgos, setHallazgos] = useState<Hallazgo[] | null>(null);
  const [abiertos, setAbiertos] = useState(0);
  const [resueltos, setResueltos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [escaneando, setEscaneando] = useState(false);
  const [vivo, setVivo] = useState<{ hallazgos: Vivo[]; sinComprobar: string[]; fecha: string } | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/vigilancia');
      if (res.status === 401 || res.status === 403) { window.location.href = '/admin/login'; return; }
      const d = await res.json();
      setHallazgos(d.hallazgos); setAbiertos(d.abiertos); setResueltos(d.resueltos);
    } catch { setError('No se pudo cargar el registro.'); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const escanear = async () => {
    setEscaneando(true); setError(''); setVivo(null);
    try {
      const res = await fetch('/api/admin/vigilancia', { method: 'POST' });
      if (!res.ok) { setError('No se pudo escanear.'); return; }
      setVivo(await res.json());
    } finally { setEscaneando(false); }
  };

  if (cargando || !hallazgos) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 size={26} style={{ color: '#1B56A1', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const abiertosList = hallazgos.filter(h => !h.resuelto);
  const resueltosList = hallazgos.filter(h => h.resuelto);

  return (
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
        La vigilancia corre a diario y compara el contenido publicado contra las formas ya
        conocidas de degradación (valor futuro, municipios incompletos, fichas que
        contradicen su vereda…). Aquí queda el registro; el WhatsApp solo avisa cuando hay
        algo <strong>nuevo</strong> o abierto hace más de 3 días.
      </p>

      {/* Resumen + escanear */}
      <div style={{ ...cardS, display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={22} style={{ color: abiertos ? '#B91C1C' : '#15803D' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: abiertos ? '#B91C1C' : '#15803D', lineHeight: 1 }}>
              {abiertos}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>abiertos</div>
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748B' }}>{resueltos} resueltos en el histórico</div>
        <button
          type="button" onClick={escanear} disabled={escaneando}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, background: '#1B56A1', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '9px 16px', borderRadius: 10, border: 'none', cursor: escaneando ? 'default' : 'pointer', opacity: escaneando ? 0.6 : 1 }}
        >
          {escaneando ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
          Escanear ahora
        </button>
      </div>

      {error && <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#B91C1C', borderRadius: 10, padding: '0.7rem 1rem', fontSize: '0.85rem' }}>{error}</div>}

      {/* Escaneo en vivo */}
      {vivo && (
        <div style={{ ...cardS, borderColor: '#BFDBFE', background: '#F8FAFF' }}>
          <div style={{ fontWeight: 800, color: '#0D2D5E', fontSize: '0.9rem', marginBottom: 8 }}>
            Escaneo en vivo — {vivo.hallazgos.length} hallazgo(s) ahora mismo
          </div>
          {vivo.sinComprobar.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#B45309', fontSize: '0.8rem', marginBottom: 8 }}>
              <AlertTriangle size={14} /> Sin comprobar: {vivo.sinComprobar.join(', ')}
            </div>
          )}
          {vivo.hallazgos.length === 0
            ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#15803D', fontSize: '0.85rem' }}><CheckCircle2 size={15} /> Todo limpio.</div>
            : vivo.hallazgos.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '6px 0', borderTop: i ? '1px solid #E2E8F0' : 'none' }}>
                  <span style={chip(h.clase)}>{h.clase}</span>
                  <span style={{ fontSize: '0.83rem', color: '#334155', lineHeight: 1.5 }}>{h.detalle}</span>
                </div>
              ))}
        </div>
      )}

      {/* Registro almacenado */}
      <div style={cardS}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', marginTop: 0, marginBottom: '1rem' }}>
          Registro ({abiertosList.length} abiertos)
        </h3>
        {abiertosList.length === 0
          ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#15803D', fontSize: '0.9rem' }}><CheckCircle2 size={16} /> Nada abierto. El contenido publicado está limpio.</div>
          : abiertosList.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '10px 0', borderTop: i ? '1px solid #EFF6FF' : 'none' }}>
                <span style={chip(h.clase)}>{h.clase}</span>
                <span style={{ flex: 1, fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>{h.detalle}</span>
                <span style={{ fontSize: '0.72rem', color: h.dias_abierto >= 3 ? '#B91C1C' : '#94A3B8', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {h.dias_abierto === 0 ? 'hoy' : `${h.dias_abierto} día${h.dias_abierto > 1 ? 's' : ''}`}
                </span>
              </div>
            ))}

        {resueltosList.length > 0 && (
          <details style={{ marginTop: '1.25rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.82rem', color: '#64748B', fontWeight: 700 }}>
              {resueltosList.length} resueltos (histórico)
            </summary>
            <div style={{ marginTop: 10 }}>
              {resueltosList.map(h => (
                <div key={h.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '6px 0', opacity: 0.65 }}>
                  <CheckCircle2 size={13} style={{ color: '#15803D', flexShrink: 0 }} />
                  <span style={chip(h.clase)}>{h.clase}</span>
                  <span style={{ flex: 1, fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5, textDecoration: 'line-through' }}>{h.detalle}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
