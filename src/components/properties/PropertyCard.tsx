import Link from 'next/link';
import Image from 'next/image';
import { Bed, Bath, Maximize2, MapPin } from 'lucide-react';
import { cn, formatPrice, STATUS_LABELS, TYPE_LABELS } from '@/lib/utils';
import type { Property } from '@/types';

interface PropertyCardProps {
  property: Property;
  priority?: boolean;
}

export function PropertyCard({ property, priority = false }: PropertyCardProps) {
  const primaryImage = property.media?.find((m) => m.is_primary && m.type === 'image');
  const status       = STATUS_LABELS[property.status] ?? STATUS_LABELS['available']!;
  const typeLabel    = TYPE_LABELS[property.type]     ?? property.type;

  const href = `/fincas-en-venta/${property.municipality?.slug ?? 'la-vega'}/${property.slug}`;

  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      aria-label={`Ver ${property.title ?? typeLabel}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-bg">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt_text}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary/20 bg-bg">
            <Maximize2 size={48} />
          </div>
        )}

        {/* Status badge */}
        <span className={cn('absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full', status.color)}>
          {status.label}
        </span>

        {/* Type badge */}
        <span className="absolute top-3 right-3 text-xs font-semibold bg-white/90 text-primary-dark px-2.5 py-1 rounded-full">
          {typeLabel}
        </span>

        {/* "Ver detalles" chip — reveals on hover */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center py-3 bg-primary/85 text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Ver detalles
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-1 text-xs text-stone-light font-medium mb-1.5">
          <MapPin size={12} />
          <span>
            {property.municipality?.name ?? 'La Vega'}
            {property.vereda ? `, ${property.vereda.name}` : ''}
          </span>
        </div>

        <h3 className="font-bold text-primary-dark text-base leading-snug line-clamp-2 mb-2">
          {property.title ?? `${typeLabel} en ${property.municipality?.name ?? 'La Vega'}`}
        </h3>

        <p className="text-gold font-bold text-lg mb-3">{formatPrice(property.price_cop)}</p>

        <div className="flex items-center gap-4 text-xs text-stone-light font-semibold">
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1"><Bed size={13} />{property.bedrooms} hab.</span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1"><Bath size={13} />{property.bathrooms} baños</span>
          )}
          {(property.area_lot_m2 ?? property.area_built_m2) && (
            <span className="flex items-center gap-1">
              <Maximize2 size={13} />
              {property.area_lot_m2
                ? `${property.area_lot_m2.toLocaleString('es-CO')} m²`
                : `${property.area_built_m2?.toLocaleString('es-CO')} m²`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
