export const CATEGORIAS = ['Restaurante', 'Ferretería', 'Droguería', 'Vivero', 'Otros'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const MUNICIPIOS_DIR = [
  'La Vega', 'Sasaima', 'Nocaima', 'Villeta', 'San Francisco', 'Supatá', 'Vergara', 'Nimaima', 'Quebradanegra',
] as const;

export const MAX_FOTOS = 5;

export interface Business {
  id: string;
  nombre: string;
  imagen_url: string | null;
  imagenes: string[];
  descripcion: string | null;
  categoria: string;
  municipio: string;
  whatsapp: string | null;
  domicilios: boolean;
  google_maps_url: string | null;
}

/** Devuelve las fotos del negocio (nuevo campo `imagenes`, con respaldo al `imagen_url` legacy). */
export function fotosDe(b: Pick<Business, 'imagenes' | 'imagen_url'>): string[] {
  if (b.imagenes && b.imagenes.length) return b.imagenes;
  return b.imagen_url ? [b.imagen_url] : [];
}

/**
 * Versión sin recorte para verla completa en el lightbox.
 * Las fotos se guardan con un recorte 4:3 de Cloudinary (`c_fill,ar_4:3,…`) para que las
 * portadas de la grilla queden uniformes; aquí reemplazamos esa transformación por una que
 * limita el tamaño sin recortar (`c_limit`), así la foto original se ve entera. URLs que no
 * sean de Cloudinary (o sin ese recorte) se devuelven sin cambios.
 */
export function fotoCompleta(url: string | undefined): string {
  if (!url) return '';
  return url.replace(/\/upload\/[^/]*c_fill[^/]*\//, '/upload/c_limit,w_1600,f_auto,q_auto/');
}

/** Construye un enlace wa.me a partir de un número (lo normaliza a formato internacional COL). */
export function waLink(whatsapp: string | null | undefined, nombre?: string): string | null {
  if (!whatsapp) return null;
  let digits = whatsapp.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) digits = '57' + digits;      // celular COL sin indicativo
  const text = encodeURIComponent(`Hola! Te contacto desde el Directorio de Su Finca Raíz${nombre ? ` por ${nombre}` : ''}.`);
  return `https://wa.me/${digits}?text=${text}`;
}
