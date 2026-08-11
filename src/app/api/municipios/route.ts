import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Lista de municipios del FILTRO del buscador (home / header).
//
// Se deriva EXCLUSIVAMENTE del inventario activo (doctrina AEO §1.2): un
// municipio entra al filtro cuando tiene al menos una propiedad disponible y
// sale solo cuando deja de tenerla. Nada que ver con que tenga página.
//
// Antes esto era un OR con `oculto: false`, que metía en el filtro municipios
// sin una sola propiedad: el usuario filtraba y no encontraba nada. Filtrar por
// algo que devuelve cero resultados es peor que no ofrecer el filtro.
export async function GET() {
  try {
    const rows = await prisma.municipality.findMany({
      where: { properties: { some: { status: 'available' } } },
      orderBy: [{ demand_score: 'desc' }, { name: 'asc' }],
      select: { name: true, slug: true },
    })
    return NextResponse.json({ municipios: rows })
  } catch (err) {
    console.error('[GET /api/municipios]', err)
    return NextResponse.json({ municipios: [] })
  }
}
