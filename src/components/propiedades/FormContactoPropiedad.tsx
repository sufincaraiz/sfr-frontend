'use client';

import { useState } from 'react';
import { MessageCircle, Send, Phone } from 'lucide-react';

interface Props {
  propertyTitle: string;
  propertySlug: string;
  price: number;
  whatsapp?: string;
}

const WA_NUM = '573218826730';

export function FormContactoPropiedad({ propertyTitle, propertySlug, price, whatsapp = WA_NUM }: Props) {
  const [form, setForm] = useState({ nombre: '', telefono: '', mensaje: '' });
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const priceStr = price > 0
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price)
    : 'Consultar precio';

  const waText = encodeURIComponent(
    `Hola! Estoy interesado en la propiedad *${propertyTitle}* (${priceStr}).\n🔗 sufincaraiz.com/propiedad/${propertySlug}`
  );
  const waHref = `https://wa.me/${whatsapp}?text=${waText}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simular envío (en producción: POST /api/leads)
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    setSent(true);
  };

  const field = (
    label: string,
    key: keyof typeof form,
    type = 'text',
    placeholder = '',
    isTextarea = false,
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0D2D5E' }}>{label}</label>
      {isTextarea ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          required
          style={{ border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '9px 12px', fontSize: '0.85rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', color: '#0D2D5E' }}
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          required
          style={{ border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '9px 12px', fontSize: '0.85rem', outline: 'none', color: '#0D2D5E' }}
        />
      )}
    </div>
  );

  return (
    <div>
      {/* Precio */}
      <div style={{ background: 'linear-gradient(135deg,#0D2D5E,#1B56A1)', borderRadius: '12px 12px 0 0', padding: '1.2rem 1.4rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Precio</p>
        <p style={{ color: '#E8B92F', fontWeight: 900, fontSize: '1.4rem', lineHeight: 1 }}>
          {price > 0 ? priceStr : 'Consultar precio'}
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', border: '1.5px solid #E2E8F0', borderTop: 'none', padding: '1.4rem' }}>
        {/* WhatsApp primero */}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.95rem',
            padding: '12px', borderRadius: 10, textDecoration: 'none', marginBottom: 16,
            boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
          }}
        >
          <MessageCircle size={18} /> Consultar por WhatsApp
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#94A3B8', fontSize: '0.8rem' }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          o envíanos un mensaje
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#0D2D5E' }}>
            <p style={{ fontSize: '2rem', marginBottom: 8 }}>✅</p>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>¡Mensaje enviado!</p>
            <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Te contactaremos en menos de 24 horas.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {field('Nombre', 'nombre', 'text', 'Tu nombre completo')}
            {field('Teléfono / WhatsApp', 'telefono', 'tel', '321 000 0000')}
            {field('Mensaje', 'mensaje', 'text', `Hola, me interesa esta ${propertyTitle.toLowerCase().includes('finca') ? 'finca' : 'propiedad'}...`, true)}

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading ? '#94A3B8' : '#1B56A1', color: '#fff',
                fontWeight: 700, fontSize: '0.9rem', padding: '12px',
                border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <Send size={16} /> {loading ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>
        )}

        {/* Teléfono directo */}
        <a
          href="tel:+573218826730"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, color: '#64748B', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 600 }}
        >
          <Phone size={14} /> 321 882 6730 · Lunes a Sábado 8am–6pm
        </a>
      </div>
    </div>
  );
}
