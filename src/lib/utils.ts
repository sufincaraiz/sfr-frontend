import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export const TYPE_LABELS: Record<string, string> = {
  finca:       'Finca',
  lote:        'Lote',
  casa:        'Casa campestre',
  apartamento: 'Apartamento',
  condominio:  'Condominio',
  local:       'Local comercial',
};

export const MUNICIPALITIES = [
  { value: 'la-vega',    label: 'La Vega' },
  { value: 'sasaima',    label: 'Sasaima' },
  { value: 'nocaima',    label: 'Nocaima' },
  { value: 'villeta',    label: 'Villeta' },
  { value: 'san-francisco', label: 'San Francisco' },
  { value: 'supata',     label: 'Supatá' },
];

export const PROPERTY_TYPES = [
  { value: 'finca',       label: 'Finca' },
  { value: 'lote',        label: 'Lote' },
  { value: 'casa',        label: 'Casa campestre' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'condominio',  label: 'Condominio' },
  { value: 'local',       label: 'Local comercial' },
];
