'use client';
/**
 * ============================================================
 * DETALLE DE PROPIEDAD — Cliente (interactividad)
 * Galería con lightbox + GSAP parallax + 360° + Mapa
 * Archivo: /app/propiedad/[slug]/PropertyDetailClient.jsx
 * ============================================================
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import dynamic from 'next/dynamic';

// Importar Viewer360 solo en cliente (Pannellum no es SSR-compatible)
const Viewer360 = dynamic(() => import('@/components/Viewer360'), { ssr: false });

gsap.registerPlugin(ScrollTrigger);

// ─── Formato de precio colombiano ───────────────────────
const formatPrice = (price) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);

// ─── Íconos de características ───────────────────────────
const FEATURE_ICONS = {
  'Agua potable': '💧', 'Luz eléctrica': '⚡', 'Gas natural': '🔥',
  'Vía pavimentada': '🛣️', 'Alcantarillado': '🔩', 'Internet': '📶',
  'Piscina': '🏊', 'BBQ': '🍖', 'Zona de camping': '⛺',
  'Vigilancia 24h': '🔒', 'Portería': '🚪', 'Cancha': '⚽',
};

export default function PropertyDetailClient({ property }) {
  const heroRef = useRef(null);
  const heroImgRef = useRef(null);
  const contentRef = useRef(null);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [formData, setFormData] = useState({ name: '', phone: '', message: '' });
  const [formSent, setFormSent] = useState(false);

  // Construir array de imágenes (portada + adicionales)
  const allImages = [
    ...(property.cover_image_url ? [{ url: property.cover_image_url, alt: property.title }] : []),
    ...(property.images || []),
  ];

  // ── Animaciones GSAP ─────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {

      // Parallax en imagen hero al hacer scroll
      if (heroImgRef.current) {
        gsap.to(heroImgRef.current, {
          yPercent: 25,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
          },
        });
      }

      // Entrada del contenido principal
      gsap.fromTo(contentRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.3 }
      );

      // Expansión de secciones al hacer scroll
      gsap.utils.toArray('.sfr-scroll-reveal').forEach((el, i) => {
        gsap.fromTo(el,
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.8, ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
            delay: i * 0.05,
          }
        );
      });

      // Imágenes de galería: expandirse suavemente al entrar al viewport
      gsap.utils.toArray('.sfr-gallery-thumb').forEach((thumb) => {
        gsap.fromTo(thumb,
          { scale: 1.1, opacity: 0 },
          {
            scale: 1, opacity: 1, duration: 0.9, ease: 'power2.out',
            scrollTrigger: {
              trigger: thumb,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });

    });
    return () => ctx.revert();
  }, []);

  // ── Envío de formulario ──────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, property_id: property.id }),
      });
      setFormSent(true);
    } catch {
      alert('Error al enviar. Intenta por WhatsApp.');
    }
  };

  // ── Lightbox (navegación con teclado) ────────────────
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i + 1) % allImages.length);
      if (e.key === 'ArrowLeft') setLightboxIndex(i => (i - 1 + allImages.length) % allImages.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, allImages.length]);

  const statusColors = {
    activo:    { bg: '#EAF3DE', text: '#27500A', label: 'Disponible' },
    vendido:   { bg: '#FCEBEB', text: '#501313', label: 'Vendido' },
    reservado: { bg: '#FAEEDA', text: '#412402', label: 'Reservado' },
  };
  const statusStyle = statusColors[property.status] || statusColors.activo;

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: 'var(--sfr-gray, #F5F7FA)', minHeight: '100vh' }}>

      {/* ── BREADCRUMB ──────────────────────────────────── */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '12px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 2rem', fontSize: '0.8rem', color: '#666', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#1B56A1', textDecoration: 'none', fontWeight: 600 }}>Inicio</Link>
          <span>/</span>
          <Link href="/propiedades" style={{ color: '#1B56A1', textDecoration: 'none', fontWeight: 600 }}>Propiedades</Link>
          <span>/</span>
          <Link href={`/propiedades?city=${property.city}`} style={{ color: '#1B56A1', textDecoration: 'none', fontWeight: 600 }}>{property.city}</Link>
          <span>/</span>
          <span style={{ color: '#333', fontWeight: 700 }}>{property.title}</span>
        </div>
      </nav>

      {/* ── GALERÍA HERO ─────────────────────────────────── */}
      <section ref={heroRef} style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 2rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: allImages.length > 1 ? '2fr 1fr' : '1fr', gap: 6, borderRadius: 16, overflow: 'hidden', height: 480 }}>
          {/* Imagen principal */}
          <div
            style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
          >
            <div ref={heroImgRef} style={{ position: 'absolute', inset: '-15%', willChange: 'transform' }}>
              {allImages[0] ? (
                <Image src={allImages[0].url} alt={allImages[0].alt || property.title} fill style={{ objectFit: 'cover' }} priority sizes="(max-width:768px) 100vw, 60vw" />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1B56A1, #0D2D5E)' }} />
              )}
            </div>
            {/* Badges sobre imagen */}
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8, zIndex: 2 }}>
              <span style={{ background: statusStyle.bg, color: statusStyle.text, fontWeight: 700, fontSize: '0.75rem', padding: '4px 12px', borderRadius: 20 }}>{statusStyle.label}</span>
              {property.has_360_tour && (
                <span style={{ background: '#E8B92F', color: '#0D2D5E', fontWeight: 700, fontSize: '0.75rem', padding: '4px 12px', borderRadius: 20 }}>⟳ Tour 360°</span>
              )}
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)', zIndex: 1 }} />
          </div>

          {/* Miniaturas laterales */}
          {allImages.length > 1 && (
            <div style={{ display: 'grid', gridTemplateRows: `repeat(${Math.min(allImages.length - 1, 3)}, 1fr)`, gap: 6 }}>
              {allImages.slice(1, 4).map((img, i) => (
                <div
                  key={i}
                  className="sfr-gallery-thumb"
                  style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#eee' }}
                  onClick={() => { setLightboxIndex(i + 1); setLightboxOpen(true); }}
                >
                  {img.url ? (
                    <Image src={img.url} alt={img.alt || `Foto ${i + 2}`} fill style={{ objectFit: 'cover' }} sizes="25vw" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: `hsl(${210 + i * 30}, 60%, 55%)` }} />
                  )}
                  {/* Mostrar "+N fotos" en la última miniatura */}
                  {i === 2 && allImages.length > 4 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                      +{allImages.length - 4} fotos
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CONTENIDO PRINCIPAL ─────────────────────────── */}
      <main ref={contentRef} style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2.5rem', alignItems: 'start' }}>

        {/* Columna izquierda */}
        <div>
          {/* Título + Info básica */}
          <div className="sfr-scroll-reveal" style={{ background: '#fff', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 4px 24px rgba(13,45,94,0.08)' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{ background: '#E6F1FB', color: '#0C447C', fontWeight: 700, fontSize: '0.7rem', padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1 }}>{property.type}</span>
              {(property.features || []).slice(0, 3).map((f, i) => (
                <span key={i} style={{ background: '#EAF3DE', color: '#27500A', fontWeight: 600, fontSize: '0.7rem', padding: '4px 10px', borderRadius: 20 }}>{FEATURE_ICONS[f] || '✓'} {f}</span>
              ))}
            </div>

            <h1 style={{ fontWeight: 900, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#0D2D5E', lineHeight: 1.2, marginBottom: '0.75rem' }}>{property.title}</h1>

            <p style={{ color: '#555', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1.5rem' }}>
              📍 {property.address || property.neighborhood || ''}{property.neighborhood ? ', ' : ''}{property.city}, {property.department}
            </p>

            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
              {property.area_m2 && (
                <div style={{ background: '#F5F7FA', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Área</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0D2D5E' }}>{property.area_m2.toLocaleString('es-CO')}</div>
                  <div style={{ fontSize: '0.7rem', color: '#888' }}>m²</div>
                </div>
              )}
              {property.area_hectareas && (
                <div style={{ background: '#F5F7FA', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Hectáreas</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0D2D5E' }}>{property.area_hectareas}</div>
                  <div style={{ fontSize: '0.7rem', color: '#888' }}>ha</div>
                </div>
              )}
              {property.bedrooms > 0 && (
                <div style={{ background: '#F5F7FA', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Habitaciones</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0D2D5E' }}>{property.bedrooms}</div>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div style={{ background: '#F5F7FA', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Baños</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0D2D5E' }}>{property.bathrooms}</div>
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="sfr-scroll-reveal" style={{ background: '#fff', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 4px 24px rgba(13,45,94,0.08)' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0D2D5E', marginBottom: '1rem' }}>Descripción del inmueble</h2>
            <p style={{ color: '#444', lineHeight: 1.8, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>{property.description}</p>
          </div>

          {/* Características */}
          {((property.features?.length > 0) || (property.amenities?.length > 0)) && (
            <div className="sfr-scroll-reveal" style={{ background: '#fff', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 4px 24px rgba(13,45,94,0.08)' }}>
              {property.features?.length > 0 && (
                <>
                  <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0D2D5E', marginBottom: '1rem' }}>Características</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: '1.5rem' }}>
                    {property.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F5F7FA', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600 }}>
                        <span>{FEATURE_ICONS[f] || '✓'}</span> {f}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {property.amenities?.length > 0 && (
                <>
                  <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0D2D5E', marginBottom: '1rem' }}>Amenidades</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                    {property.amenities.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0F9E8', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600 }}>
                        <span>{FEATURE_ICONS[a] || '🌿'}</span> {a}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* VISOR 360° */}
          {property.has_360_tour && property.panoramas_360?.length > 0 && (
            <div className="sfr-scroll-reveal" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0D2D5E', marginBottom: '1rem' }}>Tour Virtual 360°</h2>
              <Viewer360 panoramas={property.panoramas_360} propertyTitle={property.title} />
            </div>
          )}

          {/* Videos / Renders */}
          {property.videos?.length > 0 && (
            <div className="sfr-scroll-reveal" style={{ background: '#fff', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 4px 24px rgba(13,45,94,0.08)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0D2D5E', marginBottom: '1rem' }}>Videos</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {property.videos.map((v, i) => (
                  <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                    <video
                      src={v.url}
                      controls
                      poster={v.thumbnail}
                      style={{ width: '100%', display: 'block' }}
                      preload="metadata"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Renders */}
          {property.renders?.length > 0 && (
            <div className="sfr-scroll-reveal" style={{ background: '#fff', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 4px 24px rgba(13,45,94,0.08)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0D2D5E', marginBottom: '1rem' }}>Renders Inmersivos</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                {property.renders.map((r, i) => (
                  <div
                    key={i}
                    className="sfr-gallery-thumb"
                    style={{ position: 'relative', height: 200, borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => { setLightboxIndex(allImages.length + i); setLightboxOpen(true); }}
                  >
                    <Image src={r.url} alt={r.title || `Render ${i + 1}`} fill style={{ objectFit: 'cover' }} sizes="33vw" />
                    <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.7rem', padding: '3px 8px', borderRadius: 6 }}>
                      {r.title || `Render ${i + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mapa */}
          {property.latitude && property.longitude && (
            <div className="sfr-scroll-reveal" style={{ background: '#fff', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 4px 24px rgba(13,45,94,0.08)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0D2D5E', marginBottom: '1rem' }}>📍 Ubicación</h2>
              <div style={{ borderRadius: 12, overflow: 'hidden', height: 320 }}>
                <iframe
                  title={`Mapa de ${property.title}`}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.01},${property.latitude - 0.01},${property.longitude + 0.01},${property.latitude + 0.01}&layer=mapnik&marker=${property.latitude},${property.longitude}`}
                  width="100%"
                  height="320"
                  style={{ border: 'none', display: 'block' }}
                  loading="lazy"
                />
              </div>
              <p style={{ marginTop: 8, fontSize: '0.8rem', color: '#888' }}>
                {property.address || `${property.city}, ${property.department}`}
              </p>
            </div>
          )}
        </div>

        {/* Columna derecha — Sidebar sticky */}
        <aside style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Precio */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 4px 24px rgba(13,45,94,0.1)', border: '2px solid #E8B92F' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Precio de venta</div>
            <div style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#0D2D5E', marginBottom: 4 }}>
              {formatPrice(property.price)}
            </div>
            {property.area_m2 && (
              <div style={{ fontSize: '0.8rem', color: '#888' }}>
                ~ {formatPrice(property.price / property.area_m2)} / m²
              </div>
            )}
          </div>

          {/* Formulario de contacto */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 4px 24px rgba(13,45,94,0.08)' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0D2D5E', marginBottom: '1.25rem' }}>¿Te interesa este inmueble?</h3>
            {formSent ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#27500A', background: '#EAF3DE', borderRadius: 10 }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                <strong>¡Mensaje enviado!</strong>
                <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Te contactaremos pronto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Tu nombre completo *"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.9rem', fontFamily: 'Montserrat, sans-serif' }}
                />
                <input
                  type="tel"
                  placeholder="WhatsApp / Teléfono *"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.9rem', fontFamily: 'Montserrat, sans-serif' }}
                />
                <textarea
                  placeholder="¿Cuándo puedes visitar? ¿Tienes preguntas?"
                  value={formData.message}
                  onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.9rem', resize: 'vertical', fontFamily: 'Montserrat, sans-serif' }}
                />
                <button type="submit" style={{ background: '#E8B92F', color: '#0D2D5E', fontWeight: 700, fontSize: '0.95rem', padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', transition: 'opacity 0.2s' }}>
                  Enviar consulta
                </button>
                <a
                  href={`https://wa.me/573000000000?text=Hola, me interesa el inmueble: ${property.title} (${window?.location?.href})`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', textAlign: 'center', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '11px', borderRadius: 8, textDecoration: 'none' }}
                >
                  💬 Contactar por WhatsApp
                </a>
              </form>
            )}
          </div>

          {/* Compartir */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 4px 24px rgba(13,45,94,0.08)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Compartir</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: '💾 Guardar', action: () => {} },
                { label: '📤 Compartir', action: () => navigator.share?.({ title: property.title, url: window.location.href }) },
              ].map((btn, i) => (
                <button key={i} onClick={btn.action} style={{ padding: '9px', background: '#F5F7FA', border: '1px solid #eee', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Código de referencia */}
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#aaa' }}>
            Ref: {property.id?.slice(0, 8).toUpperCase()}
          </div>
        </aside>
      </main>

      {/* ── LIGHTBOX ─────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal
          aria-label="Galería de imágenes"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false); }}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar galería"
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.5rem', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
          <button
            onClick={() => setLightboxIndex(i => (i - 1 + allImages.length) % allImages.length)}
            aria-label="Imagen anterior"
            style={{ position: 'absolute', left: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.5rem', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >‹</button>
          <div style={{ position: 'relative', width: '90vw', height: '80vh', maxWidth: 1200 }}>
            {allImages[lightboxIndex] && (
              <Image src={allImages[lightboxIndex].url} alt={allImages[lightboxIndex].alt || `Foto ${lightboxIndex + 1}`} fill style={{ objectFit: 'contain' }} sizes="90vw" priority />
            )}
          </div>
          <button
            onClick={() => setLightboxIndex(i => (i + 1) % allImages.length)}
            aria-label="Imagen siguiente"
            style={{ position: 'absolute', right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.5rem', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >›</button>
          <div style={{ position: 'absolute', bottom: 20, color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
            {lightboxIndex + 1} / {allImages.length}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 1024px) {
          main { grid-template-columns: 1fr !important; }
          aside { position: static !important; }
        }
        @media (max-width: 768px) {
          section[style] { padding: 1rem !important; }
          main { padding: 1rem !important; }
        }
      `}</style>
    </div>
  );
}
