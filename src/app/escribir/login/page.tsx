'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PenLine } from 'lucide-react';

export default function EscribirLoginPage() {
  const router = useRouter();
  const [user, setUser]   = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/blog-writer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'No pudimos iniciar sesión.');
        return;
      }
      router.push('/escribir');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '11px 14px',
    fontSize: '0.95rem', outline: 'none', color: '#0D2D5E', width: '100%', boxSizing: 'border-box',
  };

  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '3rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 8px 32px rgba(13,45,94,0.08)' }}>
        <div style={{ background: 'linear-gradient(135deg, #0D2D5E, #1B56A1)', padding: '2rem 1.75rem 1.5rem', textAlign: 'center' }}>
          <PenLine size={32} color="#E8B92F" style={{ margin: '0 auto 0.75rem' }} />
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem', marginBottom: 6 }}>Blog de la Comunidad</h1>
          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.88rem' }}>Inicia sesión para publicar tu escrito</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0D2D5E', display: 'block', marginBottom: 5 }}>Usuario</label>
            <input value={user} onChange={e => setUser(e.target.value)} required autoComplete="username" style={inputStyle} placeholder="usuario" />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0D2D5E', display: 'block', marginBottom: 5 }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" style={inputStyle} placeholder="••••••••" />
          </div>

          {error && (
            <p style={{ color: '#B91C1C', fontSize: '0.85rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 10px' }}>{error}</p>
          )}

          <button type="submit" disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: loading ? '#94A3B8' : '#1B56A1', color: '#fff', fontWeight: 800, fontSize: '0.95rem', padding: '13px', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
