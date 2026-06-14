import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getBlogWriterSession } from '@/lib/auth';
import { EscribirForm } from './EscribirForm';

export const metadata: Metadata = {
  title: 'Escribe tu post | Blog de la Comunidad — Su Finca Raíz',
  robots: { index: false, follow: false },
};

export default async function EscribirPage() {
  const session = await getBlogWriterSession();
  if (!session) redirect('/escribir/login');
  return <EscribirForm />;
}
