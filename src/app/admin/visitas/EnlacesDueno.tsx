'use client';

import { useState } from 'react';
import { Link2, Copy, Check, Ban, Loader2, KeyRound, AlertTriangle } from 'lucide-react';

// Enlaces privados del dueño, dentro de cada grupo de /admin/visitas.
//
// El PIN se escribe aquí y viaja una sola vez al servidor, que lo guarda
// hasheado. No hay forma de volver a verlo: si el dueño lo olvida, se genera un
// enlace nuevo. Por eso la interfaz nunca promete "ver el PIN".

export interface EnlaceRow {
  id: string;
  propiedadId: string;
  createdAt: string;
  expiraAt: string;
  ultimoAcceso: string | null;
  intentosFallidos: number;
  estado: 'activo' | 'revocado' | 'expirado' | 'bloqueado';
}

const COLOR_ESTADO: Record<EnlaceRow['estado'], { fondo: string; texto: string; label: string }> = {
  activo:    { fondo: '#DCFCE7', texto: '#15803D', label: 'Activo' },
  revocado:  { fondo: '#F1F5F9', texto: '#64748B', label: 'Revocado' },
  expirado:  { fondo: '#F1F5F9', texto: '#64748B', label: 'Expirado' },
  bloqueado: { fondo: '#FEE2E2', texto: '#B91C1C', label: 'Bloqueado por intentos' },
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function EnlacesDueno({
  propiedadId, enlaces, onCambio,
}: {
  propiedadId: string;
  enlaces: EnlaceRow[];
  onCambio: () => void;
}) {
  const [abierto, setAbierto]   = useState(false);
  const [pin, setPin]           = useState('');
  const [pin2, setPin2]         = useState('');
  const [error, setError]       = useState('');
  const [creando, setCreando]   = useState(false);
  const [nuevaUrl, setNuevaUrl] = useState('');
  const [copiado, setCopiado]   = useState(false);

  const cerrar = () => {
    setAbierto(false); setPin(''); setPin2(''); setError('');
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creando) return;

    if (!/^\d{4,10}$/.test(pin)) { setError('El PIN debe tener entre 4 y 10 dígitos.'); return; }
    if (pin !== pin2)            { setError('Los dos PIN no coinciden.'); return; }

    setCreando(true);
    setError('');
    try {
      const res = await fetch('/api/admin/visitas/enlaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propiedadId, pin }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'No se pudo generar el enlace.'); return; }
      setNuevaUrl(d.url);
      cerrar();
      onCambio();
    } catch {
      setError('No se pudo generar el enlace.');
    } finally {
      setCreando(false);
    }
  };

  const revocar = async (id: string) => {
    if (!confirm('Al revocarlo, el dueño dejará de ver el registro con ese enlace. ¿Continuar?')) return;
    const res = await fetch(`/api/admin/visitas/enlaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revocado: true }),
    });
    if (res.ok) onCambio();
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(nuevaUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch { /* si el navegador lo bloquea, el texto sigue seleccionable */ }
  };

  const hayActivo = enlaces.some(e => e.estado === 'activo');

  return (
    <div style={{ borderTop: '1px solid #F1F5F9', padding: '0.85rem 1.25rem', background: '#FCFDFE' }}>

      {/* URL recién generada — se muestra UNA vez */}
      {nuevaUrl && (
        <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '0.85rem' }}>
          <p style={{ color: '#065F46', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Enlace generado. Cópialo ahora:
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ flex: 1, minWidth: 240, background: '#fff', border: '1px solid #D1FAE5', borderRadius: 7, padding: '8px 10px', fontSize: '0.75rem', color: '#0D2D5E', wordBreak: 'break-all' }}>
              {nuevaUrl}
            </code>
            <button
              type="button" onClick={copiar}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#065F46', color: '#fff', fontWeight: 700, fontSize: '0.8rem', padding: '8px 13px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
            >
              {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
            </button>
          </div>
          <p style={{ display: 'flex', gap: 7, alignItems: 'flex-start', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '0.6rem 0.75rem', fontSize: '0.78rem', lineHeight: 1.5, margin: '0.7rem 0 0' }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Comparte el PIN aparte</strong>, por un canal distinto al del enlace. Si mandas
              los dos en el mismo mensaje, el segundo factor deja de proteger nada.
            </span>
          </p>
          <button
            type="button" onClick={() => setNuevaUrl('')}
            style={{ background: 'none', border: 'none', color: '#065F46', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', padding: '6px 0 0' }}
          >
            Listo, ya lo copié
          </button>
        </div>
      )}

      {/* Enlaces existentes */}
      {enlaces.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: '0.75rem' }}>
          {enlaces.map(e => {
            const c = COLOR_ESTADO[e.estado];
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: '0.78rem' }}>
                <Link2 size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                <span style={{ background: c.fondo, color: c.texto, fontWeight: 700, fontSize: '0.72rem', padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  {c.label}
                </span>
                <span style={{ color: '#64748B' }}>Creado {fecha(e.createdAt)}</span>
                <span style={{ color: '#94A3B8' }}>·</span>
                <span style={{ color: '#64748B' }}>Vence {fecha(e.expiraAt)}</span>
                <span style={{ color: '#94A3B8' }}>·</span>
                <span style={{ color: e.ultimoAcceso ? '#64748B' : '#94A3B8' }}>
                  {e.ultimoAcceso ? `Último acceso ${fechaHora(e.ultimoAcceso)}` : 'Nunca usado'}
                </span>
                {e.intentosFallidos > 0 && (
                  <span style={{ color: '#B45309', fontWeight: 600 }}>
                    {e.intentosFallidos} intento{e.intentosFallidos !== 1 ? 's' : ''} fallido{e.intentosFallidos !== 1 ? 's' : ''}
                  </span>
                )}
                {e.estado !== 'revocado' && (
                  <button
                    type="button" onClick={() => revocar(e.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#B91C1C', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer', marginLeft: 'auto' }}
                  >
                    <Ban size={12} /> Revocar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Generar */}
      {!abierto ? (
        <button
          type="button" onClick={() => setAbierto(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#1B56A1', fontWeight: 700, fontSize: '0.8rem', padding: '7px 13px', borderRadius: 8, border: '1.5px solid #DBEAFE', cursor: 'pointer' }}
        >
          <KeyRound size={13} /> {enlaces.length ? 'Generar enlace nuevo' : 'Generar enlace para el dueño'}
        </button>
      ) : (
        <form onSubmit={crear} style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '0.9rem 1rem' }}>
          <p style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '0.83rem', margin: '0 0 0.15rem' }}>
            Define el PIN para el dueño
          </p>
          <p style={{ color: '#64748B', fontSize: '0.76rem', lineHeight: 1.5, margin: '0 0 0.7rem' }}>
            De 4 a 10 dígitos. Se guarda cifrado: no vas a poder consultarlo después, así que
            anótalo antes de continuar.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="password" inputMode="numeric" autoComplete="off" placeholder="PIN"
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ flex: 1, minWidth: 110, padding: '8px 11px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: '0.85rem', letterSpacing: '0.18em', color: '#0D2D5E', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <input
              type="password" inputMode="numeric" autoComplete="off" placeholder="Repetir PIN"
              value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ flex: 1, minWidth: 110, padding: '8px 11px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: '0.85rem', letterSpacing: '0.18em', color: '#0D2D5E', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {error && (
            <p style={{ color: '#B91C1C', fontSize: '0.78rem', fontWeight: 600, margin: '0.6rem 0 0' }}>{error}</p>
          )}

          {hayActivo && (
            <p style={{ color: '#B45309', fontSize: '0.76rem', margin: '0.6rem 0 0', lineHeight: 1.5 }}>
              Ya hay un enlace activo para este inmueble. El nuevo no lo apaga: si quieres que el
              anterior deje de servir, revócalo.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: '0.8rem' }}>
            <button
              type="submit" disabled={creando}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1B56A1', color: '#fff', fontWeight: 700, fontSize: '0.82rem', padding: '8px 15px', borderRadius: 8, border: 'none', cursor: creando ? 'wait' : 'pointer', opacity: creando ? 0.6 : 1 }}
            >
              {creando ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generando…</> : 'Generar enlace'}
            </button>
            <button
              type="button" onClick={cerrar}
              style={{ background: '#fff', color: '#64748B', fontWeight: 700, fontSize: '0.82rem', padding: '8px 13px', borderRadius: 8, border: '1.5px solid #E2E8F0', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
