// Constantes y tipos del CRM (contactos con embudo de ventas).
// El waLink se reutiliza del módulo de directorio para no duplicar la normalización.
export { waLink } from '@/lib/directorio';

export const ETAPAS = ['nuevo', 'contactado', 'en_seguimiento', 'cerrado'] as const;
export type Etapa = (typeof ETAPAS)[number];

export const TIPOS = ['comprador', 'vendedor', 'arrendatario'] as const;
export type TipoContacto = (typeof TIPOS)[number];

export const ORIGENES = ['manual', 'lead-web', 'referido', 'otro'] as const;
export type Origen = (typeof ORIGENES)[number];

export interface Contacto {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  tipo: string;
  interes: string | null;
  etapa: string;
  proximo_seguimiento: string | null; // ISO date
  origen: string;
  notas: string | null;
  lead_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const ETAPA_META: Record<Etapa, { label: string; color: string; bg: string }> = {
  nuevo:          { label: 'Nuevo',          color: '#1B56A1', bg: '#EFF6FF' },
  contactado:     { label: 'Contactado',     color: '#B45309', bg: '#FEF3C7' },
  en_seguimiento: { label: 'En seguimiento', color: '#7C3AED', bg: '#F5F3FF' },
  cerrado:        { label: 'Cerrado',        color: '#15803D', bg: '#F0FDF4' },
};

export const TIPO_LABEL: Record<TipoContacto, string> = {
  comprador: 'Comprador',
  vendedor: 'Vendedor',
  arrendatario: 'Arrendatario',
};

export const ORIGEN_LABEL: Record<Origen, string> = {
  manual: 'Manual',
  'lead-web': 'Lead web',
  referido: 'Referido',
  otro: 'Otro',
};

export function etapaMeta(etapa: string) {
  return ETAPA_META[etapa as Etapa] ?? { label: etapa, color: '#64748B', bg: '#F1F5F9' };
}

/** ¿El próximo seguimiento ya venció (fecha < hoy)? Solo para etapas abiertas. */
export function seguimientoVencido(iso: string | null, etapa: string): boolean {
  if (!iso || etapa === 'cerrado') return false;
  const d = new Date(iso);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return d < hoy;
}
