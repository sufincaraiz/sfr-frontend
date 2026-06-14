'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { Bed, Bath, Maximize2, MapPin, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrice, TYPE_LABELS, cloudinarySquare } from '@/lib/utils';
import type { Property } from '@/types';

interface FeaturedPropertiesProps {
  properties: Property[];
}

// ─── Tarjeta (imagen cuadrada 1:1) ───────────────────────────────────────────

function PropertyCard({ property }: { property: Property }) {
  const primaryImage = property.media?.find((m) => m.is_primary && m.type === 'image') ?? property.media?.[0];
  const typeLabel    = TYPE_LABELS[property.type] ?? property.type;
  const href = `/propiedad/${property.slug}`;

  const hectareas =
    property.area_lot_m2 && property.area_lot_m2 >= 10_000
      ? `${(property.area_lot_m2 / 10_000).toFixed(1)} ha`
      : property.area_lot_m2
        ? `${property.area_lot_m2.toLocaleString('es-CO')} m²`
        : null;

  return (
    <div className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 transition-all duration-300 hover:shadow-xl">
      {/* Imagen cuadrada 1:1 — clickeable para entrar a la ficha */}
      <Link
        href={href}
        aria-label={`Ver ${property.title ?? typeLabel}`}
        className="relative block overflow-hidden bg-gray-100"
        style={{ aspectRatio: '1 / 1' }}
      >
        {primaryImage && (
          <img
            src={cloudinarySquare(primaryImage.url)}
            alt={primaryImage.alt_text || property.title || typeLabel}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            className="transition-transform duration-500 group-hover:scale-[1.06]"
          />
        )}
        <span
          className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: '#1B56A1', color: '#FFFFFF' }}
        >
          {typeLabel}
        </span>
        <span
          className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: '#A7CB61', color: '#0D2D5E' }}
        >
          Disponible
        </span>
      </Link>

      {/* Contenido */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-1 text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
          <MapPin size={12} />
          <span>{property.municipality?.name ?? 'La Vega'}</span>
        </div>

        <h3
          className="font-sans font-bold text-base leading-snug mb-2 line-clamp-2"
          style={{ color: '#0D2D5E' }}
        >
          {property.title}
        </h3>

        <p className="font-sans font-bold text-xl mb-4" style={{ color: '#1B56A1' }}>
          {formatPrice(property.price_cop)}
        </p>

        <div className="flex items-center gap-4 text-xs font-semibold mb-5" style={{ color: '#6B7280' }}>
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1.5">
              <Bed size={13} style={{ color: '#1B56A1' }} />
              {property.bedrooms} hab.
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1.5">
              <Bath size={13} style={{ color: '#1B56A1' }} />
              {property.bathrooms} baños
            </span>
          )}
          {hectareas && (
            <span className="flex items-center gap-1.5">
              <Maximize2 size={13} style={{ color: '#1B56A1' }} />
              {hectareas}
            </span>
          )}
        </div>

        <Link
          href={href}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
          style={{ background: '#E8B92F', color: '#0D2D5E' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#d4a728')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#E8B92F')}
        >
          Ver propiedad
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

// ─── Una fila del carrusel ────────────────────────────────────────────────────

function CarouselRow({
  properties,
  direction,
  autoplay,
}: {
  properties: Property[];
  direction: 'forward' | 'backward';
  autoplay: boolean;
}) {
  const plugins = autoplay
    ? [
        AutoScroll({
          playOnInit: true,
          speed: 0.9,
          direction,
          stopOnInteraction: false,  // reanuda tras soltar (touch/drag)
          stopOnMouseEnter: true,    // pausa al pasar el mouse (desktop)
          stopOnFocusIn: true,       // pausa al enfocar con teclado
        }),
      ]
    : [];

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, dragFree: true, align: 'start', containScroll: false },
    plugins,
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className="relative">
      <div ref={emblaRef} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          {properties.map((p) => (
            <div
              key={p.id}
              style={{
                flex: '0 0 auto',
                width: 'clamp(230px, 78vw, 290px)',
                paddingRight: 20,
                boxSizing: 'border-box',
              }}
            >
              <PropertyCard property={p} />
            </div>
          ))}
        </div>
      </div>

      {/* Flechas manuales — solo cuando NO hay auto-scroll (reduced-motion) */}
      {!autoplay && (
        <>
          <button
            onClick={scrollPrev}
            aria-label="Anterior"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full shadow-md"
            style={{ background: '#fff', color: '#0D2D5E', border: '1px solid #E2E8F0' }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={scrollNext}
            aria-label="Siguiente"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full shadow-md"
            style={{ background: '#fff', color: '#0D2D5E', border: '1px solid #E2E8F0' }}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Sección ──────────────────────────────────────────────────────────────────

export function FeaturedProperties({ properties }: FeaturedPropertiesProps) {
  // autoplay arranca apagado; se activa tras montar si NO hay reduced-motion.
  // El `key` en cada fila fuerza un re-init de Embla cuando cambia este estado.
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAutoplay(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Dos filas: primera mitad y segunda mitad
  const mid  = Math.ceil(properties.length / 2);
  const row1 = properties.slice(0, mid);
  const row2 = properties.slice(mid);

  return (
    <section id="featured-properties" className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2
              style={{
                fontSize: '0.78rem', fontWeight: 600, color: '#A7CB61',
                letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.4rem',
              }}
            >
              SELECCIÓN CURADA
            </h2>
            <h3
              className="font-sans font-bold"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#0D2D5E', marginBottom: '0.5rem' }}
            >
              Tu Próximo Descanso Comienza Aquí
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#6B7280', maxWidth: 420, lineHeight: 1.6 }}>
              Explora fincas, casas, apartamentos, lotes y condominios seleccionados
              para brindarte paz, clima ideal y confort.
            </p>
          </div>
          <Link
            href="/propiedades"
            className="text-sm font-bold underline underline-offset-4 transition-colors"
            style={{ color: '#1B56A1' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#E8B92F')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#1B56A1')}
          >
            Ver todas →
          </Link>
        </div>
      </div>

      {/* Dos filas de carrusel (full-bleed para el efecto marquee) */}
      <div className="flex flex-col gap-6">
        <CarouselRow properties={row1} direction="forward"  autoplay={autoplay} key={`r1-${autoplay}`} />
        {row2.length > 0 && (
          <CarouselRow properties={row2} direction="backward" autoplay={autoplay} key={`r2-${autoplay}`} />
        )}
      </div>

      {/* Ver más */}
      <div className="flex justify-center mt-12">
        <Link
          href="/propiedades"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
          style={{ background: '#0D2D5E', color: '#fff' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1B56A1')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#0D2D5E')}
        >
          Ver más propiedades
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
