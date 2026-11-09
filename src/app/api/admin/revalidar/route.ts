import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { revalidarTodoElSitio } from '@/lib/revalidar-sitio'

// ─────────────────────────────────────────────────────────────────────────────
// «Revalida todo». El camino que ningún endpoint cubre: editar la base por
// fuera del panel (consola de Railway, psql, un guion). Con el reloj de las
// páginas en 24 h ese cambio tardaría hasta un día en verse, y esta es la
// forma de forzarlo sin desplegar.
//
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//        https://www.sufincaraiz.com/api/admin/revalidar
//
// Protegida igual que los crons, o con sesión de admin: una ruta que invalida
// la caché entera es una forma de hacerle gastar CPU al proyecto. Falla
// cerrado: sin CRON_SECRET solo entra la sesión.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secreto = process.env.CRON_SECRET
  const porSecreto = !!secreto && req.headers.get('authorization') === `Bearer ${secreto}`
  if (!porSecreto && !(await requireRole(['admin']))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  revalidarTodoElSitio()
  return NextResponse.json({ ok: true, revalidado: 'todo el sitio' })
}
