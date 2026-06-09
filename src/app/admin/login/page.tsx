'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return; }
      router.push('/admin/dashboard');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ background: '#0D2D5E', borderRadius: 14, display: 'inline-flex', padding: '12px 20px', marginBottom: 16 }}>
            <Image
              src="/images/logo-su-finca-raiz-blanco.png"
              alt="Su Finca Raíz"
              width={160}
              height={48}
              style={{ display: 'block' }}
            />
          </div>
          <h1 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.3rem', marginBottom: 4 }}>
            Panel Administrativo
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
            Ingresa con tus credenciales
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0D2D5E' }}>
              Correo electrónico
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@sufincaraiz.com"
                required
                autoComplete="email"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 12px 11px 38px',
                  border: '1.5px solid #E2E8F0', borderRadius: 10,
                  fontSize: '0.9rem', outline: 'none', color: '#0D2D5E',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#1B56A1')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0D2D5E' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 40px 11px 38px',
                  border: '1.5px solid #E2E8F0', borderRadius: 10,
                  fontSize: '0.9rem', outline: 'none', color: '#0D2D5E',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#1B56A1')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, padding: '10px 14px',
              color: '#DC2626', fontSize: '0.85rem', fontWeight: 600,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: loading ? '#94A3B8' : '#E8B92F',
              color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem',
              border: 'none', borderRadius: 10, padding: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4, transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#d4a728'); }}
            onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = '#E8B92F'); }}
          >
            <LogIn size={17} />
            {loading ? 'Verificando…' : 'Ingresar al panel'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#CBD5E1', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          Su Finca Raíz © {new Date().getFullYear()} · Acceso restringido
        </p>
      </div>
    </div>
  );
}
