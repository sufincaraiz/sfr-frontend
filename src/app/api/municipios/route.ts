import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Lista pública de municipios para el filtro del buscador (home / header).
// Incluye los municipios visibles (con página propia) y también cualquiera que
// tenga al menos una propiedad disponible — así un municipio recién publicado
// aparece automáticamente en el filtro aunque aún no tenga página de contenido.
export async function GET() {
  try {
    const rows = await prisma.municipality.findMany({
      where: {
        OR: [
          { oculto: false },
          { properties: { some: { status: 'available' } } },
        ],
      },
      orderBy: [{ demand_score: 'desc' }, { name: 'asc' }],
      select: { name: true, slug: true },
    })
    return NextResponse.json({ municipios: rows })
  } catch (err) {
    console.error('[GET /api/municipios]', err)
    return NextResponse.json({ municipios: [] })
  }
}
