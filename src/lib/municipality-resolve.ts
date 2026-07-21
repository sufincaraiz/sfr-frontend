import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

/**
 * Resuelve un municipio por nombre. Si no existe, lo crea (oculto, para no
 * generar una página pública vacía) y lo devuelve. Así el admin puede asignar
 * una propiedad a un municipio nuevo escribiendo su nombre, y luego enriquecer
 * su contenido desde /admin/municipios.
 */
export async function resolveMunicipality(
  rawName: string,
): Promise<{ id: string; name: string; slug: string }> {
  const name = (rawName ?? '').trim()
  if (name.length < 2) throw new Error('Nombre de municipio inválido')

  const slug = slugify(name)
  const found = await prisma.municipality.findFirst({
    where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug }] },
    select: { id: true, name: true, slug: true },
  })
  if (found) return found

  const created = await prisma.municipality.create({
    data: { name, slug, provincia: 'Gualivá', oculto: true },
    select: { id: true, name: true, slug: true },
  })
  return created
}
