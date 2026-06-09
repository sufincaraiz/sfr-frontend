import { RevealSection } from '@/components/ui/RevealSection';
import { MapPin, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const PILLARS = [
  {
    icon: MapPin,
    title: 'Recorridos Inmersivos 360°',
    body: 'Ahorra tiempo en desplazamientos. Explora cada rincón desde tu celular con fotografía aérea con drones y vistas panorámicas interactivas.',
  },
  {
    icon: Shield,
    title: 'Blindaje Legal Total',
    body: 'Cero riesgos. Revisión de títulos, promesas de compraventa y escrituración. Sin costos adicionales.',
  },
  {
    icon: TrendingUp,
    title: 'Acompañamiento Integral',
    body: 'Desde la búsqueda del terreno hasta la asesoría para tu proyecto de construcción. Un asesor exclusivo para ti.',
  },
];

export function ValueProp() {
  return (
    <section className="bg-primary py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <RevealSection>
          <div className="text-center mb-16">
            <p className="text-gold font-bold text-xs tracking-[0.25em] uppercase mb-3">
              Por qué elegirnos
            </p>
            <h2
              className="font-bold text-white text-balance"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}
            >
              Más que una Inmobiliaria,<br />tu Aliado Estratégico
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <RevealSection key={title}>
                <div className="flex flex-col gap-3">
                  <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                    <Icon size={22} className="text-gold" />
                  </div>
                  <h3 className="font-bold text-xl text-white">{title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed font-medium">{body}</p>
                </div>
              </RevealSection>
            ))}
          </div>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://wa.me/573218826730"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-3.5 bg-gold text-primary-dark rounded-xl text-sm font-bold hover:bg-gold/90 transition-colors"
            >
              Hablar con un asesor hoy
            </Link>
            <Link
              href="/vender-mi-finca"
              className="inline-flex items-center px-8 py-3.5 border-2 border-white/40 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
            >
              Quiero vender mi finca
            </Link>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
