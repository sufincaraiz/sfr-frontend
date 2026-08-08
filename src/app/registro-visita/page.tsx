import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { ClipboardCheck, Lock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import {
  REGISTRO_VISITA_KEY,
  withDefaults,
  DEFAULT_REGISTRO_VISITA,
  type RegistroVisitaContent,
} from '@/lib/registro-visita';
import { RegistroVisitaForm } from './RegistroVisitaForm';

export const metadata: Metadata = {
  title: 'Registro de Visita a Inmuebles',
  description:
    'Regístrate antes de visitar un inmueble con Su Finca Raíz. Control de ingreso y seguridad, con tratamiento de datos conforme a la Ley 1581 de 2012.',
  alternates: { canonical: `${SITE_URL}/registro-visita` },
  // Es un trámite operativo, no una página que deba competir en buscadores.
  robots: { index: false, follow: true },
};

// Se revalida al guardar desde el admin (revalidatePath); la hora es la red de
// seguridad, igual que en el resto del sitio.
export const revalidate = 3600;

/**
 * Contenido editable. Resiliente a propósito: si la BD no responde (build sin
 * conexión, P1001) se cae a los textos por defecto en vez de romper la página —
 * este formulario tiene que estar disponible aunque el resto falle, porque se
 * llena en la portería del inmueble.
 */
async function getContenido(): Promise<RegistroVisitaContent> {
  try {
    const row = await prisma.pageContent.findUnique({ where: { key: REGISTRO_VISITA_KEY } });
    return withDefaults((row?.data as Partial<RegistroVisitaContent> | undefined) ?? null);
  } catch (err) {
    console.warn('[registro-visita] no se pudo leer el contenido; se usan los textos por defecto:', err instanceof Error ? err.message : err);
    return DEFAULT_REGISTRO_VISITA;
  }
}

export interface PropiedadOpcion {
  id: string;
  titulo: string;
  municipio: string;
}

/**
 * Catálogo para el selector. Solo propiedades disponibles: registrar una visita
 * a algo ya vendido no tiene sentido, y si aparece hay que usar "Otro".
 * Resiliente igual que el contenido: si falla, el selector queda vacío y el
 * visitante puede escribir la referencia con "Otro".
 */
async function getPropiedades(): Promise<PropiedadOpcion[]> {
  try {
    const rows = await prisma.property.findMany({
      where: { status: 'available' },
      orderBy: [{ published_at: 'desc' }],
      select: {
        id: true, title: true, slug: true, type: true,
        municipality: { select: { name: true } },
      },
    });
    return rows.map(r => ({
      id: r.id,
      titulo: r.title ?? r.slug,
      municipio: r.municipality?.name ?? '',
    }));
  } catch (err) {
    console.warn('[registro-visita] no se pudo leer el catálogo:', err instanceof Error ? err.message : err);
    return [];
  }
}

export default async function RegistroVisitaPage() {
  const [c, propiedades] = await Promise.all([getContenido(), getPropiedades()]);

  return (
    <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      {/* ── Encabezado ── */}
      <section style={{
        background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
        padding: '7rem 1.5rem 3rem',
        textAlign: 'center',
      }}>
        <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          {c.hero.eyebrow}
        </p>
        <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.4rem)', lineHeight: 1.15, marginBottom: '0.75rem' }}>
          {c.hero.titulo}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '1rem', maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>
          {c.hero.subtitulo}
        </p>
      </section>

      {/* ── Contenido ── */}
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

        <div style={{
          display: 'flex', gap: 11, alignItems: 'flex-start',
          background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 12,
          padding: '0.9rem 1.1rem', marginBottom: '1.5rem',
        }}>
          <ClipboardCheck size={19} style={{ color: '#1B56A1', flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: '#1D4ED8', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>
            {c.aviso}
          </p>
        </div>

        <RegistroVisitaForm contenido={c} propiedades={propiedades} />

        <div style={{
          display: 'flex', gap: 9, alignItems: 'flex-start',
          marginTop: '1.25rem', padding: '0 0.25rem',
        }}>
          <Lock size={15} style={{ color: '#94A3B8', flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: '#94A3B8', fontSize: '0.76rem', lineHeight: 1.6, margin: 0 }}>
            {c.notaLegal}
          </p>
        </div>
      </div>
    </main>
  );
}
