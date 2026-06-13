'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ContactoForm() {
  const [form, setForm]     = useState({ nombre: '', telefono: '', mensaje: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const update = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.nombre.trim().length < 2) { setStatus('error'); setErrorMsg('Por favor ingresa tu nombre.'); return; }
    if (form.telefono.trim().length < 7) { setStatus('error'); setErrorMsg('Por favor ingresa un celular válido.'); return; }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:   form.nombre,
          telefono: form.telefono,
          mensaje:  form.mensaje,
          channel:  'contacto',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMsg(data.error ?? 'No pudimos enviar tu mensaje. Intenta de nuevo.');
        return;
      }

      setStatus('success');
      setForm({ nombre: '', telefono: '', mensaje: '' });
    } catch {
      setStatus('error');
      setErrorMsg('Error de conexión. Revisa tu internet e intenta de nuevo.');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        <CheckCircle2 size={56} color="#15803D" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.3rem', marginBottom: 8 }}>
          ¡Recibido!
        </h3>
        <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          Un asesor te contactará en menos de 24 horas.
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '11px 14px',
    fontSize: '0.92rem', outline: 'none', color: '#0D2D5E', width: '100%',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem', fontWeight: 700, color: '#0D2D5E', marginBottom: 5, display: 'block',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle} htmlFor="c-nombre">Nombre *</label>
        <input
          id="c-nombre" type="text" value={form.nombre} onChange={update('nombre')}
          placeholder="Tu nombre completo" required autoComplete="name"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor="c-telefono">Celular / WhatsApp *</label>
        <input
          id="c-telefono" type="tel" value={form.telefono} onChange={update('telefono')}
          placeholder="321 000 0000" required autoComplete="tel"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor="c-mensaje">¿En qué te podemos ayudar?</label>
        <textarea
          id="c-mensaje" value={form.mensaje} onChange={update('mensaje')}
          placeholder="Cuéntanos: ¿quieres vender una propiedad, invertir, buscas tu nuevo hogar…?"
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {status === 'error' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px' }}>
          <AlertCircle size={17} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: '#B91C1C', fontSize: '0.85rem' }}>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: status === 'loading' ? '#94A3B8' : '#E8B92F',
          color: '#0D2D5E', fontWeight: 800, fontSize: '0.98rem', padding: '14px',
          border: 'none', borderRadius: 12, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s', marginTop: 4,
        }}
      >
        <Send size={17} /> {status === 'loading' ? 'Enviando…' : 'Enviar mensaje'}
      </button>

      <p style={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', lineHeight: 1.5 }}>
        Al enviar este formulario, aceptas la{' '}
        <Link href="/politica-tratamiento-datos" style={{ color: '#1B56A1', fontWeight: 600, textDecoration: 'underline' }}>
          Política de Tratamiento de Datos
        </Link>{' '}
        de Su Finca Raíz.
      </p>
    </form>
  );
}
