import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { estadoRetencion } from '@/lib/retencion-visitas'
import type { RespuestaVisitasAdmin } from '@/lib/visitas-admin'

// Listado interno de visitas, AGRUPADO POR INMUEBLE. Es la vista de la casa:
// devuelve todos los datos del visitante (incluida la cédula), así que exige rol
// admin igual que /api/admin/leads.
//
// Se traen las visitas del rango y se agrupan en memoria: el volumen esperado
// es de decenas o cientos por mes, no millones, y agrupar aquí permite ordenar
// los grupos por la visita más reciente sin una segunda consulta.

const TOPE = 2000 // techo defensivo por si el rango es enorme

export async function GET(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const desde  = sp.get('desde')?.trim() || ''
  const hasta  = sp.get('hasta')?.trim() || ''
  const buscar = sp.get('buscar')?.trim() || ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (desde || hasta) {
    where.createdAt = {}
    if (desde) {
      const d = new Date(`${desde}T00:00:00`)
      if (!isNaN(d.getTime())) where.createdAt.gte = d
    }
    if (hasta) {
      // Fin del día para que el rango incluya la fecha "hasta" completa.
      const h = new Date(`${hasta}T23:59:59.999`)
      if (!isNaN(h.getTime())) where.createdAt.lte = h
    }
    if (!Object.keys(where.createdAt).length) delete where.createdAt
  }

  if (buscar) {
    where.OR = [
      { nombresCompletos: { contains: buscar, mode: 'insensitive' } },
      { cedula:           { contains: buscar } },
    ]
  }

  // El estado de retención es GLOBAL, no del filtro: responde "¿hay algo por
  // vencer en la base?", no "¿en lo que estoy viendo?". Si dependiera de los
  // filtros, acotar un rango de fechas escondería registros por vencer.
  const [visitas, retencion] = await Promise.all([
    prisma.visita.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: TOPE,
      include: {
        propiedad: { select: { slug: true, title: true, municipality: { select: { name: true } } } },
      },
    }),
    estadoRetencion(),
  ])

  // ── Agrupación ──
  // Clave: el id de la propiedad, o "otro:<referencia>" para las no listadas,
  // de modo que dos visitas al mismo inmueble de un colega caigan juntas.
  interface Grupo {
    clave: string
    esOtro: boolean
    titulo: string
    municipio: string | null
    propiedadId: string | null // null en los "Otro": no pueden tener enlace de dueño
    propiedadSlug: string | null
    visitas: typeof visitas
    ultimaVisita: string
  }
  const grupos = new Map<string, Grupo>()

  for (const v of visitas) {
    const clave = v.propiedadId
      ? `prop:${v.propiedadId}`
      : `otro:${v.inmuebleReferencia.toLowerCase().trim()}`

    let g = grupos.get(clave)
    if (!g) {
      g = {
        clave,
        esOtro: !v.propiedadId,
        titulo: v.propiedad?.title ?? v.inmuebleReferencia,
        municipio: v.propiedad?.municipality?.name ?? null,
        propiedadId: v.propiedadId,
        propiedadSlug: v.propiedad?.slug ?? null,
        visitas: [],
        ultimaVisita: v.createdAt.toISOString(),
      }
      grupos.set(clave, g)
    }
    g.visitas.push(v)
  }

  // Los grupos del catálogo primero, y dentro de cada bloque, el más reciente
  // arriba. Las visitas ya vienen ordenadas por fecha desc, así que la primera
  // de cada grupo marca su recencia.
  const lista = [...grupos.values()].sort((a, b) => {
    if (a.esOtro !== b.esOtro) return a.esOtro ? 1 : -1
    return b.ultimaVisita.localeCompare(a.ultimaVisita)
  })

  // El tipo explícito es la red de seguridad: si a este literal le falta un
  // campo de GrupoAdmin, el build falla en vez de dejar la UI a medias.
  const respuesta: RespuestaVisitasAdmin = {
    total: visitas.length,
    truncado: visitas.length === TOPE,
    retencion,
    grupos: lista.map(g => ({
      clave: g.clave,
      esOtro: g.esOtro,
      titulo: g.titulo,
      municipio: g.municipio,
      propiedadId: g.propiedadId,
      propiedadSlug: g.propiedadSlug,
      totalVisitas: g.visitas.length,
      visitas: g.visitas.map(v => ({
        id: v.id,
        createdAt: v.createdAt.toISOString(),
        nombresCompletos: v.nombresCompletos,
        cedula: v.cedula,
        correo: v.correo,
        celular: v.celular,
        municipioOrigen: v.municipioOrigen,
        inmuebleReferencia: v.inmuebleReferencia,
        consentAt: v.consentAt.toISOString(),
      })),
    })),
  }

  return NextResponse.json(respuesta)
}
