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
