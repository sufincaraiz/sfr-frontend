export const CATEGORIAS = ['Restaurante', 'Ferretería', 'Droguería', 'Vivero', 'Otros'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const MUNICIPIOS_DIR = [
  'La Vega', 'Sasaima', 'Nocaima', 'Villeta', 'San Francisco', 'Supatá', 'Vergara', 'Nimaima', 'Quebradanegra',
] as const;

export interface Business {
  id: string;
  nombre: string;
  imagen_url: string | null;
  categoria: string;
  municipio: string;
  whatsapp: string | null;
  domicilios: boolean;
  google_maps_url: string | null;
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
