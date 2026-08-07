'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { RegistroVisitaContent } from '@/lib/registro-visita';

type Estado = 'idle' | 'loading' | 'ok' | 'error';

/** Orden de los campos. Las etiquetas vienen del contenido editable. */
const ORDEN = [
  { k: 'nombresCompletos',   type: 'text',  mode: undefined },
  { k: 'cedula',             type: 'text',  mode: 'numeric' },
  { k: 'inmuebleReferencia', type: 'text',  mode: undefined },
  { k: 'correo',             type: 'email', mode: undefined },
  { k: 'celular',            type: 'tel',   mode: 'tel' },
  { k: 'municipioOrigen',    type: 'text',  mode: undefined },
] as const;

const VACIO = {
  nombresCompletos: '', cedula: '', inmuebleReferencia: '',
  correo: '', celular: '', municipioOrigen: '',
};

const inputStyle: React.CSSProperties = {
  padding: '12px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10,
  fontSize: '0.95rem', outline: 'none', color: '#0D2D5E', background: '#fff',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6,
};

export function RegistroVisitaForm({ contenido }: { contenido: RegistroVisitaContent }) {
  const [form, setForm] = useState<Record<string, string>>(VACIO);
  const [politica, setPolitica] = useState(false);
  const [controlIngreso, setControlIngreso] = useState(false);
  const [estado, setEstado] = useState<Estado>('idle');
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // La cédula solo admite dígitos, ya desde el tecleo.
    const v = k === 'cedula' ? e.target.value.replace(/\D/g, '') : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };

  const ambasCasillas = politica && controlIngreso;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ambasCasillas) {
      setError('Debes aceptar las dos autorizaciones para poder registrarte.');
      setEstado('error');
      return;
    }
    setEstado('loading'); setError('');
    try {
      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          consentPolitica: politica,
          consentControlIngreso: controlIngreso,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'No pudimos guardar tu registro.');
        setEstado('error');
        return;
      }
      setEstado('ok');
    } catch {
      setError('Problema de conexión. Verifica tu señal e intenta de nuevo.');
      setEstado('error');
    }
  };

  // ── Confirmación ──
  if (estado === 'ok') {
    return (
      <div style={{
        background: '#fff', borderRadius: 16, border: '1.5px solid #BBF7D0',
        padding: '2.5rem 1.75rem', textAlign: 'center',
      }}>
        <CheckCircle2 size={52} color="#15803D" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.4rem', marginBottom: 10 }}>
          {contenido.confirmacion.titulo}
        </h2>
        <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.65, maxWidth: 460, margin: '0 auto' }}>
          {contenido.confirmacion.mensaje}
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block', marginTop: '1.5rem', background: '#1B56A1', color: '#fff',
            fontWeight: 800, fontSize: '0.9rem', padding: '12px 24px', borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          {contenido.confirmacion.textoBotonVolver}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      style={{
        background: '#fff', borderRadius: 16, border: '1.5px solid #E2E8F0',
        padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem',
        boxShadow: '0 4px 24px rgba(27,86,161,0.07)',
      }}
    >
      {ORDEN.map(c => {
        const textos = contenido.campos[c.k];
        return (
          <div key={c.k}>
            <label htmlFor={`v-${c.k}`} style={labelStyle}>
              {textos.label} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id={`v-${c.k}`}
              type={c.type}
              inputMode={c.mode}
              value={form[c.k] ?? ''}
              onChange={set(c.k)}
              placeholder={textos.placeholder}
              required
              autoComplete="off"
              style={inputStyle}
            />
          </div>
        );
      })}

      {/* ── Consentimiento (Ley 1581 de 2012) ──
          El texto de las dos casillas está FIJO aquí y no se edita desde el
          admin: cada registro guarda solo un booleano por casilla, así que ese
          booleano únicamente prueba algo si el texto mostrado fue siempre el
          mismo. Cambiarlo exige tocar código y desplegar, a propósito.
          Ver la nota en src/lib/registro-visita.ts. */}
      <div style={{
        background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12,
        padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <ShieldCheck size={17} color="#1B56A1" />
          <span style={{ fontWeight: 800, color: '#0D2D5E', fontSize: '0.85rem' }}>
            {contenido.consentimiento.titulo}
          </span>
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={politica}
            onChange={e => setPolitica(e.target.checked)}
            style={{ marginTop: 3, width: 17, height: 17, flexShrink: 0, accentColor: '#1B56A1', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.83rem', color: '#334155', lineHeight: 1.55 }}>
            He leído y acepto la{' '}
            <Link
              href="/politica-tratamiento-datos"
              target="_blank"
              style={{ color: '#1B56A1', fontWeight: 700, textDecoration: 'underline' }}
            >
              política de tratamiento de datos personales
            </Link>.
          </span>
        </label>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={controlIngreso}
            onChange={e => setControlIngreso(e.target.checked)}
            style={{ marginTop: 3, width: 17, height: 17, flexShrink: 0, accentColor: '#1B56A1', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.83rem', color: '#334155', lineHeight: 1.55 }}>
            Autorizo el tratamiento de mis datos con fines de <strong>control de ingreso y
            seguridad</strong> en la visita a inmuebles de Su Finca Raíz, incluido que mi
            nombre y número de documento puedan compartirse con el propietario del inmueble.
          </span>
        </label>
      </div>

      {estado === 'error' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px' }}>
          <AlertCircle size={17} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: '#B91C1C', fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={estado === 'loading' || !ambasCasillas}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: estado === 'loading' || !ambasCasillas ? '#CBD5E1' : '#E8B92F',
          color: estado === 'loading' || !ambasCasillas ? '#64748B' : '#0D2D5E',
          fontWeight: 800, fontSize: '0.98rem', padding: '14px',
          border: 'none', borderRadius: 12,
          cursor: estado === 'loading' || !ambasCasillas ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <Send size={17} /> {estado === 'loading' ? contenido.boton.enviando : contenido.boton.enviar}
      </button>

      {!ambasCasillas && (
        <p style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', margin: 0 }}>
          {contenido.boton.ayudaCasillas}
        </p>
      )}
    </form>
  );
}
