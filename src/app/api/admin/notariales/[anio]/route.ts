import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parametrosDelAnio } from '@/lib/finanzas/parametros'
import {
  anioParaPantalla, guardarCampoAnio, guardarConcepto, guardarTramos, guardarRespaldo,
  activarAnio, volverABorrador, borrarAnio,
} from '@/lib/notariales/panel'
import { ErrorEsquemaNotarial, type Respaldo, type Tramo } from '@/lib/notariales/tipos'
import { transcripcion, respuestaDeError } from '@/lib/notariales/api'

const ROLES = ['admin']

function anioDe(params: { anio: string }): number {
  const a = Number(params.anio)
  if (!Number.isInteger(a) || a < 2000 || a > 2100) {
    throw new ErrorEsquemaNotarial(`Año inválido: ${params.anio}.`, 'anio')
  }
  return a
}

/** El UVT del módulo fiscal, solo para avisar si divergen. Nunca bloquea. */
async function uvtFiscal(anio: number): Promise<string | null> {
  try {
    const p = await parametrosDelAnio(anio)
    return p?.uvt ? String(p.uvt) : null
  } catch {
    // El año fiscal puede estar en borrador o no existir: no es un problema
    // de esta pantalla, y hacerlo fallar aquí la bloquearía por nada.
    return null
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ anio: string }> }) {
  if (!(await requireRole(ROLES))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const anio = anioDe(await ctx.params)
    const pantalla = await anioParaPantalla(prisma, anio, await transcripcion(), await uvtFiscal(anio))
    if (!pantalla) return NextResponse.json({ error: 'No existe' }, { status: 404 })
    return NextResponse.json(pantalla)
  } catch (e) {
    return respuestaDeError(e, 'anio')
  }
}

/**
 * GUARDA UNA SECCIÓN, no el formulario entero.
 *
 * 53 cifras repartidas en 14 conceptos no son un formulario: son una sesión
 * larga con la resolución en la mano. Con un solo «Guardar» al final, un
 * navegador que se cae cuesta la mañana. Cada sección se guarda sola, en
 * borrador, y se retoma donde iba.
 *
 * Y devuelve la pantalla completa recalculada, para que el veredicto de esa
 * sección aparezca al guardar: si algo difiere, el PDF todavía está abierto.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ anio: string }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const anio = anioDe(await ctx.params)
    const cuerpo = await req.json()

    switch (cuerpo.seccion) {
      case 'anio': {
        // Campo por campo, con la lista blanca de `guardarCampoAnio`.
        for (const [campo, valor] of Object.entries((cuerpo.campos ?? {}) as Record<string, unknown>)) {
          await guardarCampoAnio(prisma, anio, campo, valor)
        }
        break
      }
      case 'concepto':
        await guardarConcepto(prisma, anio, String(cuerpo.clave), cuerpo.campos ?? {})
        break
      case 'tramos':
        await guardarTramos(prisma, anio, String(cuerpo.clave), (cuerpo.tramos ?? []) as Tramo[])
        break
      case 'respaldo':
        await guardarRespaldo(
          prisma, anio,
          { ambito: cuerpo.ambito, clave: cuerpo.clave },
          { ...(cuerpo.respaldo as Respaldo), verificado_por: s.email ?? 'admin' },
        )
        break
      default:
        throw new ErrorEsquemaNotarial(`Sección desconocida: ${String(cuerpo.seccion)}.`, 'seccion')
    }

    const pantalla = await anioParaPantalla(prisma, anio, await transcripcion(), await uvtFiscal(anio))
    return NextResponse.json(pantalla)
  } catch (e) {
    return respuestaDeError(e, 'anio')
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ anio: string }> }) {
  const s = await requireRole(ROLES)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const anio = anioDe(await ctx.params)
    const { accion } = await req.json()
    if (accion === 'activar') await activarAnio(prisma, anio, s.email ?? 'admin')
    else if (accion === 'borrador') await volverABorrador(prisma, anio, s.email ?? 'admin')
    else throw new ErrorEsquemaNotarial(`Acción desconocida: ${String(accion)}.`, 'accion')
    const pantalla = await anioParaPantalla(prisma, anio, await transcripcion(), await uvtFiscal(anio))
    return NextResponse.json(pantalla)
  } catch (e) {
    return respuestaDeError(e, 'anio')
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ anio: string }> }) {
  if (!(await requireRole(ROLES))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    await borrarAnio(prisma, anioDe(await ctx.params))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return respuestaDeError(e, 'anio')
  }
}
