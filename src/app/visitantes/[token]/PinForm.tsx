'use client';

import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';

// Pantalla del PIN. Solo aparece cuando el token ya resultó válido, así que la
// existencia de este formulario no revela nada por sí sola.
//
// Al acertar se recarga la página en vez de pintar la lista desde aquí: los
// datos los arma el servidor, y así ningún visitante llega al cliente por una
// respuesta JSON que alguien pudiera inspeccionar.

export function PinForm({
  token, propiedad, municipio,
}: {
  token: string;
  propiedad: string;
  municipio: string | null;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || enviando) return;

    setEnviando(true);
    setError('');
    try {
      const res = await fetch(`/api/visitantes/${token}/acceso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) { window.location.reload(); return; }
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'No se pudo validar el PIN.');
      setPin('');
    } catch {
      setError('No se pudo validar el PIN. Revisa tu conexión.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7rem 1.5rem 4rem' }}>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '2.25rem 2rem', maxWidth: 420, width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.9rem' }}>
            <KeyRound size={23} color="#1B56A1" />
          </div>
          <p style={{ color: '#B08D3F', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
            Registro de visitantes
          </p>
          <h1 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.3, margin: 0 }}>
            {propiedad}
          </h1>
          {municipio && (
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>{municipio}</p>
          )}
        </div>

        <form onSubmit={enviar}>
          <label htmlFor="pin" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
            Escribe el PIN que te compartimos
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="••••"
            style={{
              width: '100%', padding: '12px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10,
              fontSize: '1.15rem', letterSpacing: '0.3em', textAlign: 'center', color: '#0D2D5E',
              outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />

          {error && (
            <p style={{ color: '#B91C1C', fontSize: '0.82rem', fontWeight: 600, margin: '0.7rem 0 0', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit" disabled={enviando || !pin.trim()}
            style={{
              width: '100%', marginTop: '1.1rem', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, background: '#0D2D5E', color: '#fff',
              fontWeight: 700, fontSize: '0.92rem', padding: '12px', borderRadius: 10,
              border: 'none', cursor: enviando || !pin.trim() ? 'default' : 'pointer',
              opacity: enviando || !pin.trim() ? 0.55 : 1,
            }}
          >
            {enviando ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Validando…</> : 'Ver el registro'}
          </button>
        </form>

        <p style={{ color: '#94A3B8', fontSize: '0.76rem', lineHeight: 1.6, margin: '1.25rem 0 0', textAlign: 'center' }}>
          El PIN te lo compartimos por un canal distinto al de este enlace. Si no lo tienes o lo
          olvidaste, escríbenos y te generamos un acceso nuevo.
        </p>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </main>
  );
}
