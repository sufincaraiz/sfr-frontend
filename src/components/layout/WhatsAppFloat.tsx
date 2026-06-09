'use client';

import { useEffect, useRef } from 'react';
import { Phone } from 'lucide-react';

const PHONE     = '+573218826730';
const PHONE_DISPLAY = '321 882 6730';
const WA_MSG    = encodeURIComponent('¡Hola! Estoy interesado en una propiedad de Su Finca Raíz. ¿Me pueden ayudar?');
const WA_URL    = `https://wa.me/${PHONE}?text=${WA_MSG}&utm_source=web&utm_medium=float&utm_campaign=sufincaraiz`;
const TG_URL    = `https://t.me/+573218826730`;

// SVG inline para WhatsApp y Telegram (Lucide no los incluye)
function IconWA({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}

function IconTelegram({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

function IconHouse({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

interface FloatBtnProps {
  href: string;
  label: string;
  bg: string;
  hoverBg: string;
  children: React.ReactNode;
  btnRef: React.RefObject<HTMLAnchorElement | null>;
}

function FloatBtn({ href, label, bg, hoverBg, children, btnRef }: FloatBtnProps) {
  return (
    <div className="relative group/btn">
      {/* Tooltip */}
      <span
        className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-bold text-white px-2.5 py-1.5 rounded-lg pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"
        style={{ background: 'rgba(13,45,94,0.92)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
      >
        {PHONE_DISPLAY}
      </span>

      <a
        ref={btnRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95"
        style={{ background: bg }}
        onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
      >
        {children}
      </a>
    </div>
  );
}

export function WhatsAppFloat() {
  const waRef  = useRef<HTMLAnchorElement>(null);
  const tgRef  = useRef<HTMLAnchorElement>(null);
  const waIconRef = useRef<HTMLSpanElement>(null);
  const tgIconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const init = async () => {
      const { gsap } = await import('gsap');

      // Pulse infinito en ambos botones al cargar
      [waRef.current, tgRef.current].forEach((el) => {
        if (!el) return;
        gsap.to(el, {
          boxShadow: '0 0 0 10px rgba(37,211,102,0)',
          scale: 1.06,
          duration: 1.4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });

      // Hover WA: ícono WA → casita (scale + rotate + color)
      const waEl = waRef.current;
      if (waEl) {
        const waIcon  = waEl.querySelector('[data-icon="wa"]') as HTMLElement;
        const waHouse = waEl.querySelector('[data-icon="house-wa"]') as HTMLElement;
        if (waIcon && waHouse) {
          gsap.set(waHouse, { opacity: 0, scale: 0.5, rotate: -20 });
          waEl.addEventListener('mouseenter', () => {
            gsap.to(waIcon,  { opacity: 0, scale: 0.5, rotate: 20,  duration: 0.25, ease: 'power2.in' });
            gsap.to(waHouse, { opacity: 1, scale: 1,   rotate: 0,    duration: 0.3,  ease: 'back.out(1.6)', delay: 0.1 });
            gsap.to(waEl,    { backgroundColor: '#1B56A1', duration: 0.3 });
          });
          waEl.addEventListener('mouseleave', () => {
            gsap.to(waIcon,  { opacity: 1, scale: 1, rotate: 0,   duration: 0.3, ease: 'back.out(1.6)', delay: 0.1 });
            gsap.to(waHouse, { opacity: 0, scale: 0.5, rotate: -20, duration: 0.25, ease: 'power2.in' });
            gsap.to(waEl,    { backgroundColor: '#25D366', duration: 0.3 });
          });
        }
      }

      // Hover TG: ícono Telegram → casita
      const tgEl = tgRef.current;
      if (tgEl) {
        const tgIcon  = tgEl.querySelector('[data-icon="tg"]') as HTMLElement;
        const tgHouse = tgEl.querySelector('[data-icon="house-tg"]') as HTMLElement;
        if (tgIcon && tgHouse) {
          gsap.set(tgHouse, { opacity: 0, scale: 0.5, rotate: -20 });
          tgEl.addEventListener('mouseenter', () => {
            gsap.to(tgIcon,  { opacity: 0, scale: 0.5, rotate: 20,  duration: 0.25, ease: 'power2.in' });
            gsap.to(tgHouse, { opacity: 1, scale: 1,   rotate: 0,    duration: 0.3,  ease: 'back.out(1.6)', delay: 0.1 });
            gsap.to(tgEl,    { backgroundColor: '#1B56A1', duration: 0.3 });
          });
          tgEl.addEventListener('mouseleave', () => {
            gsap.to(tgIcon,  { opacity: 1, scale: 1, rotate: 0,   duration: 0.3, ease: 'back.out(1.6)', delay: 0.1 });
            gsap.to(tgHouse, { opacity: 0, scale: 0.5, rotate: -20, duration: 0.25, ease: 'power2.in' });
            gsap.to(tgEl,    { backgroundColor: '#229ED9', duration: 0.3 });
          });
        }
      }
    };

    void init();
  }, []);

  return (
    <>
      {/* Desktop — stack WA arriba, TG abajo, separados 12px */}
      <div className="hidden sm:flex fixed bottom-6 right-6 z-40 flex-col items-end gap-3">

        {/* WhatsApp */}
        <div className="relative group/btn">
          <span
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-bold text-white px-2.5 py-1.5 rounded-lg pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"
            style={{ background: 'rgba(13,45,94,0.92)' }}
          >
            {PHONE_DISPLAY}
          </span>
          <a
            ref={waRef}
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contáctanos por WhatsApp"
            className="relative flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg"
            style={{ background: '#25D366' }}
          >
            <span data-icon="wa"       className="absolute inset-0 flex items-center justify-center"><IconWA /></span>
            <span data-icon="house-wa" className="absolute inset-0 flex items-center justify-center"><IconHouse /></span>
          </a>
        </div>

        {/* Telegram */}
        <div className="relative group/btn">
          <span
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-bold text-white px-2.5 py-1.5 rounded-lg pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"
            style={{ background: 'rgba(13,45,94,0.92)' }}
          >
            {PHONE_DISPLAY}
          </span>
          <a
            ref={tgRef}
            href={TG_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contáctanos por Telegram"
            className="relative flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg"
            style={{ background: '#229ED9' }}
          >
            <span data-icon="tg"       className="absolute inset-0 flex items-center justify-center"><IconTelegram /></span>
            <span data-icon="house-tg" className="absolute inset-0 flex items-center justify-center"><IconHouse /></span>
          </a>
        </div>
      </div>

      {/* Mobile — sticky bottom bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-gray-200 bg-white">
        <a
          href={`tel:${PHONE}`}
          className="flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-bold border-r border-gray-200"
          style={{ color: '#1B56A1' }}
        >
          <Phone size={18} />
          Llamar
        </a>
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 py-3.5 text-white text-sm font-bold"
          style={{ background: '#25D366' }}
        >
          <IconWA size={18} />
          WhatsApp
        </a>
        <a
          href={TG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 py-3.5 text-white text-sm font-bold"
          style={{ background: '#229ED9' }}
        >
          <IconTelegram size={18} />
          Telegram
        </a>
      </div>
    </>
  );
}
