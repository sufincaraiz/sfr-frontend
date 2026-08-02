import { NextResponse } from 'next/server'
import { getTiposPropiedad } from '@/lib/property-types.server'

// Lista pública de tipos de inmueble para los selectores del buscador y de los
// filtros. Solo los visibles. Si la BD falla, `getTiposPropiedad` ya devuelve la
// lista estática, así que el filtro nunca queda vacío.
export async function GET() {
  const tipos = await getTiposPropiedad()
  return NextResponse.json({ tipos })
}
