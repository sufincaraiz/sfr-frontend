import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DEFAULT_TIPOS } from './property-types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  if (price >= 1_000_000_000) {
    return `$${(price / 1_000_000_000).toFixed(1).replace('.0', '')} mil millones`;
  }
  if (price >= 1_000_000) {
    return `$${(price / 1_000_000).toFixed(0)} millones`;
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Inyecta una transformación de Cloudinary justo después de `/upload/`.
 * Para tarjetas cuadradas usamos c_fill,ar_1:1,g_auto (recorte inteligente al
 * sujeto; como los banners ya son 1:1 no recorta) + f_auto,q_auto,w_<width>
 * para servir un cuadrado liviano. Si la URL no es de Cloudinary la devuelve tal cual.
 */
export function cloudinarySquare(url: string, width = 600): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  // Evita duplicar la transformación si ya se aplicó
  if (url.includes('/upload/c_fill,ar_1:1')) return url;
  const transform = `c_fill,ar_1:1,g_auto,f_auto,q_auto,w_${width}`;
  return url.replace('/upload/', `/upload/${transform}/`);
}

/**
 * Optimiza una imagen de Cloudinary para entrega liviana sin recortar:
 * f_auto (AVIF/WebP), q_auto (calidad automática) y c_limit (cap de ancho,
 * nunca agranda). Ideal para portadas del blog y fotos subidas por usuarios.
 */
export function cloudinaryOptimize(url: string, width = 1280): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  if (url.includes('/upload/f_auto') || url.includes('/upload/c_fill,ar_1:1')) return url;
  const transform = `f_auto,q_auto,c_limit,w_${width}`;
  return url.replace('/upload/', `/upload/${transform}/`);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponible', color: 'bg-green text-primary-dark' },
  reserved:  { label: 'Reservada',  color: 'bg-gold text-primary-dark' },
  sold:      { label: 'Vendida',    color: 'bg-stone text-white' },
};

// Los tipos de inmueble ahora viven en la tabla `property_types`. Lo que queda
// aquí es el respaldo estático (DEFAULT_TIPOS), que se usa en SSR y si la BD
// no responde. Para etiquetar un tipo usa `tipoLabel()` de '@/lib/property-types',
// que además maneja los tipos creados desde el admin.
export const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_TIPOS.map(t => [t.slug, t.label]),
);

// MUNICIPALITIES se eliminó: era una lista escrita a mano (seis nombres, con
// Supatá —que no existía en la base— y sin Nimaima, Vergara ni Albán) que
// alimentaba a la vez el filtro público y los formularios del admin, dos cosas
// que necesitan listas distintas.
//
// Ahora, según la doctrina AEO §1.2:
//   • Filtro público  → derivado del inventario activo (@/lib/cobertura).
//   • Formularios del admin → la provincia completa (MUNICIPIOS_PROVINCIA en
//     @/lib/datos-oficiales) como respaldo, y la BD cuando responde.

/** Respaldo estático para los selectores (se reemplaza con la lista de la BD). */
export const PROPERTY_TYPES = DEFAULT_TIPOS.map(t => ({ value: t.slug, label: t.label }));
