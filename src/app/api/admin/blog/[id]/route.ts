import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// Devuelve el artículo completo (con contenido) para editarlo en /admin/blog.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(['admin', 'autor_blog'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const a = await prisma.article.findUnique({ where: { id } })
  if (!a) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  // El autor solo puede abrir los propios; el admin, cualquiera.
  if (session.role !== 'admin' && a.author_id !== session.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  return NextResponse.json({
    id: a.id, slug: a.slug, title: a.title, content: a.content,
    cover_image_url: a.cover_image_url, author_photo_url: a.author_photo_url,
    author_name: a.author_name, author_email: a.author_email,
  })
}
