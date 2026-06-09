'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Bed, Bath, Maximize2, MapPin, ArrowRight } from 'lucide-react';
import { formatPrice, TYPE_LABELS } from '@/lib/utils';
import type { Property } from '@/types';

interface FeaturedPropertiesProps {
  properties: Property[];
}

function PropertyCard({ property, index }: { property: Property; index: number }) {
  const primaryImage = property.media?.find((m) => m.is_primary && m.type === 'image');
  const typeLabel    = TYPE_LABELS[property.type] ?? property.type;
  const href = `/propiedad/${property.slug}`;

  const hectareas =
    property.area_lot_m2 && property.area_lot_m2 >= 10_000
      ? `${(property.area_lot_m2 / 10_000).toFixed(1)} ha`
      : property.area_lot_m2
        ? `${property.area_lot_m2.toLocaleString('es-CO')} m²`
        : null;

  return (
    <div
      data-prop-card
      className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 transition-all duration-400 hover:shadow-xl hover:-translate-y-1.5"
      style={{ opacity: 0, transform: 'scale(0.96) translateY(20px)' }}
    >
      {/* Imagen */}
      <div className="relative h-56 overflow-hidden bg-gray-100">
        {primaryImage && (
          <img
            src={primaryImage.url}
            alt={primaryImage.alt_text}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            className="transition-transform duration-500 group-hover:scale-[1.06]"
          />
        )}
        {/* Badge tipo */}
        <span
          className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: '#1B56A1', color: '#FFFFFF' }}
        >
          {typeLabel}
        </span>
        {/* Badge disponible */}
        <span
          className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: '#A7CB61', color: '#0D2D5E' }}
        >
          Disponible
        </span>
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-1 p-5">
        {/* Municipio */}
        <div className="flex items-center gap-1 text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>
          <MapPin size={12} />
          <span>{property.municipality?.name ?? 'La Vega'}</span>
        </div>

        {/* Título */}
        <h3
          className="font-sans font-bold text-base leading-snug mb-2 line-clamp-2"
          style={{ color: '#0D2D5E' }}
        >
          {property.title}
        </h3>

        {/* Precio destacado en #1B56A1 */}
        <p
          className="font-sans font-bold text-xl mb-4"
          style={{ color: '#1B56A1' }}
        >
          {formatPrice(property.price_cop)}
        </p>

        {/* Stats */}
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

        {/* Botón "Ver propiedad" */}
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

export function FeaturedProperties({ properties }: FeaturedPropertiesProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let ctx: { revert: () => void } | null = null;

    const init = async () => {
      const { gsap }          = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // Expansión suave al entrar al viewport
        gsap.to('[data-prop-card]', {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.65,
          ease: 'power3.out',
          stagger: 0.15,
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            once: true,
          },
        });

        // Título y subtítulo
        gsap.from('[data-props-header]', {
          opacity: 0,
          y: 28,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 85%', once: true },
        });
      }, section);
    };

    void init();
    return () => ctx?.revert();
  }, []);

  return (
    <section id="featured-properties" ref={sectionRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          data-props-header
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12"
        >
          <div>
            {/*
              CAPA SEO — H2 pequeño con keyword de sección.
              Visualmente discreto (eyebrow), semánticamente H2 para rastreo de sección.
            */}
            {/* SEO H2 eyebrow */}
            <h2
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#A7CB61',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: '0.4rem',
              }}
            >
              SELECCIÓN CURADA
            </h2>

            {/* UX H3 — titular emocional */}
            <h3
              className="font-sans font-bold"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#0D2D5E', marginBottom: '0.5rem' }}
            >
              Tu Próximo Descanso Comienza Aquí
            </h3>

            {/* Subtítulo descriptivo */}
            <p
              style={{ fontSize: '0.9rem', color: '#6B7280', maxWidth: 420, lineHeight: 1.6 }}
            >
              Explora fincas y casas campestres seleccionadas para brindarte paz,
              clima ideal y confort.
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

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p, i) => (
            <PropertyCard key={p.id} property={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
