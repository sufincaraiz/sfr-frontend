'use client';

import { useState } from 'react';
import { MessageCircle, Link2, Check } from 'lucide-react';
import { SITE_URL } from '@/lib/site';

interface Props {
  title: string;
  slug: string;
}

/**
 * Controles para COMPARTIR la ficha con terceros (familiares, conocidos).
 *
 * No confundir con el botón verde «Consultar por WhatsApp» del formulario, que
 * escribe a la inmobiliaria (+57 321 882 6730). Aquí el visitante reenvía el
 * enlace a QUIEN ÉL elija:
 *   · WhatsApp → wa.me SIN número de destino (el cliente de WhatsApp pide a quién).
 *   · Copiar link → copia la URL canónica al portapapeles, con confirmación visible.
 *
 * La URL se arma con SITE_URL (la canónica centralizada), no con window.location,
 * para que coincida con la del <link rel="canonical"> aunque se abra tras un redirect.
 */
export function CompartirPropiedad({ title, slug }: Props) {
  const [copiado, setCopiado] = useState(false);

  const url = `${SITE_URL}/propiedad/${slug}`;
  const waText = encodeURIComponent(`Mira esta propiedad en Su Finca Raíz:\n${title}\n${url}`);
  const waShareHref = `https://wa.me/?text=${waText}`;

  const copiarLink = async () => {
    let ok = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      } else if (typeof document !== 'undefined') {
        // Fallback para navegadores sin Clipboard API (p. ej. contextos sin HTTPS)
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {
      ok = false;
    }
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    }
  };

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    padding: '9px 10px',
    borderRadius: 10,
    fontSize: '0.82rem',
    fontWeight: 700,
    lineHeight: 1,
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
    transition: 'background 0.2s, border-color 0.2s, color 0.2s',
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
        Comparte esta propiedad
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href={waShareHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Compartir esta propiedad por WhatsApp"
          style={{ ...btnBase, background: '#fff', color: '#0D2D5E', border: '1.5px solid #BBF7D0' }}
        >
          <MessageCircle size={16} color="#25D366" /> WhatsApp
        </a>
        <button
          type="button"
          onClick={copiarLink}
          aria-label="Copiar el enlace de esta propiedad"
          style={{
            ...btnBase,
            background: copiado ? '#F0FDF4' : '#fff',
            color: copiado ? '#15803D' : '#0D2D5E',
            border: `1.5px solid ${copiado ? '#BBF7D0' : '#E2E8F0'}`,
          }}
        >
          {copiado ? (
            <><Check size={16} /> ¡Copiado!</>
          ) : (
            <><Link2 size={16} /> Copiar link</>
          )}
        </button>
      </div>
    </div>
  );
}
