import { NextResponse } from 'next/server'
import { getTiposOfrecibles } from '@/lib/property-types.server'

// Lista PÚBLICA de tipos para los selectores del buscador y de los filtros.
//
// Solo los visibles Y con inventario. Ofrecía cuatro tipos con cero
// propiedades —Lote urbano, Lote rural, Lote campestre, Local comercial—, así
// que el cliente elegía y no encontraba nada. El admin usa
// /api/admin/property-types, que sí devuelve el catálogo entero porque allí es
// donde se crean las propiedades.
export async function GET() {
  const tipos = await getTiposOfrecibles()
  return NextResponse.json({ tipos })
}
