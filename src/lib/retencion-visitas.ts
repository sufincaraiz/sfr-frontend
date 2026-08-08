import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Retención del registro de visitas (Ley 1581 de 2012).
//
// La política de tratamiento declara: "Los datos del registro de visitas se
// conservan por un máximo de dos (2) años contados desde la fecha de la visita,
// tras lo cual son eliminados de forma automática."
//
// Este módulo es lo que hace cierta esa frase. Lo usan dos disparadores:
//   • el cron diario  → /api/cron/purge-visitas   (automático, 4am)
//   • el botón manual → /api/admin/visitas/purgar (respaldo del admin)
//
// El botón existe porque en el plan Hobby de Vercel los crons no garantizan
// ejecución puntual: si el automático se salta un día, la retención se cumple
// igual a mano. Ambos caminos borran exactamente lo mismo — de ahí que la lógica
// viva aquí y no duplicada en cada ruta.
// ─────────────────────────────────────────────────────────────────────────────

export const DIAS_RETENCION = 730 // 2 años
export const MESES_AVISO = 22 // umbral del "se acercan al límite"

/** Fecha límite: todo lo anterior a este instante ya cumplió los 2 años. */
export function fechaCorte(): Date {
  return new Date(Date.now() - DIAS_RETENCION * 24 * 60 * 60 * 1000)
}

/** Fecha desde la que una visita se considera "próxima a vencer" (~22 meses). */
export function fechaAviso(): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - MESES_AVISO)
  return d
}

/**
 * Elimina las visitas que superaron los 2 años. Idempotente: si no hay nada
 * vencido, borra 0 y no falla. Devuelve cuántas eliminó y la fecha de corte.
 */
export async function purgarVisitasVencidas(): Promise<{ eliminadas: number; corte: Date }> {
  const corte = fechaCorte()
  const { count } = await prisma.visita.deleteMany({
    where: { createdAt: { lt: corte } },
  })
  return { eliminadas: count, corte }
}

/**
 * Estado de la retención para mostrar en /admin/visitas.
 *
 * `proximasAVencer` son las que están entre los 22 y los 24 meses: todavía no se
 * pueden borrar, pero conviene saber que se acercan. `yaVencidas` son las que ya
 * pasaron los 2 años y siguen ahí — si ese número no es cero, el cron no corrió
 * y hay que ejecutar la limpieza a mano.
 */
export async function estadoRetencion(): Promise<{ proximasAVencer: number; yaVencidas: number }> {
  const corte = fechaCorte()
  const aviso = fechaAviso()

  const [proximasAVencer, yaVencidas] = await Promise.all([
    prisma.visita.count({ where: { createdAt: { lt: aviso, gte: corte } } }),
    prisma.visita.count({ where: { createdAt: { lt: corte } } }),
  ])

  return { proximasAVencer, yaVencidas }
}
