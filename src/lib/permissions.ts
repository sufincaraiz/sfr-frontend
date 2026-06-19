// ─────────────────────────────────────────────────────────────────────────────
// Roles y permisos del panel /admin — ÚNICA fuente de verdad.
// Edge-safe: TS puro, sin React/iconos ni dependencias de Node, para poder
// importarse desde el middleware (edge), el layout (cliente) y las APIs (node).
// El aislamiento se aplica en el servidor (middleware + requireRole); este
// módulo solo describe QUÉ rol puede ver QUÉ.
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = ['admin', 'asistente_crm', 'autor_blog'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  asistente_crm: 'Asistente CRM',
  autor_blog: 'Autor de blog',
};

export interface AdminSection {
  /** Prefijo de ruta bajo /admin */
  prefix: string;
  label: string;
  /** Nombre del icono de lucide-react; el layout lo resuelve a componente */
  icon: string;
  roles: Role[];
}

/**
 * Secciones del panel. El orden define el orden del menú.
 * Notas:
 * - `autor_blog` queda definido pero todavía sin sección propia (se habilita en la fase del blog).
 * - `/admin/propiedades/nueva` es un atajo de menú; el control de acceso lo cubre el prefijo
 *   `/admin/propiedades` (mismo rol).
 */
export const ADMIN_SECTIONS: AdminSection[] = [
  { prefix: '/admin/dashboard',           label: 'Dashboard',           icon: 'LayoutDashboard', roles: ['admin'] },
  { prefix: '/admin/propiedades',         label: 'Propiedades',         icon: 'Home',            roles: ['admin'] },
  { prefix: '/admin/propiedades/nueva',   label: 'Nueva Propiedad',     icon: 'PlusCircle',      roles: ['admin'] },
  { prefix: '/admin/crm',                 label: 'CRM',                 icon: 'Contact',         roles: ['admin', 'asistente_crm'] },
  { prefix: '/admin/leads',               label: 'Leads',               icon: 'Users',           roles: ['admin'] },
  { prefix: '/admin/propuesta-comercial', label: 'Propuesta comercial', icon: 'FileText',        roles: ['admin'] },
  { prefix: '/admin/directorio',          label: 'Directorio',          icon: 'Store',           roles: ['admin'] },
  { prefix: '/admin/usuarios',            label: 'Usuarios',            icon: 'Shield',          roles: ['admin'] },
];

/** A dónde se dirige cada rol al entrar (y a dónde se le redirige si pisa una ruta ajena). */
export function roleHome(role: string): string {
  switch (role) {
    case 'asistente_crm': return '/admin/crm';
    default:              return '/admin/dashboard'; // admin (y fallback seguro)
  }
}

/**
 * ¿El rol puede acceder a esta ruta de /admin? Gana el prefijo más específico (más largo).
 * Deny-by-default: una ruta /admin no listada solo es accesible por admin.
 */
export function roleCanAccessAdminPath(role: string, pathname: string): boolean {
  const matches = ADMIN_SECTIONS.filter(
    s => pathname === s.prefix || pathname.startsWith(s.prefix + '/'),
  );
  if (matches.length === 0) return role === 'admin';
  const best = matches.reduce((a, b) => (b.prefix.length > a.prefix.length ? b : a));
  return best.roles.includes(role as Role);
}

/** Ítems de menú visibles para un rol (capa visual; el acceso real lo deciden las funciones de arriba). */
export function navForRole(role: string): { href: string; label: string; icon: string }[] {
  return ADMIN_SECTIONS
    .filter(s => s.roles.includes(role as Role))
    .map(s => ({ href: s.prefix, label: s.label, icon: s.icon }));
}
