import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { porCobrar } from '@/lib/finanzas/egresos'

export async function GET() {
  const s = await requireRole(['admin', 'contador'])
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json({ porCobrar: await porCobrar() })
}
