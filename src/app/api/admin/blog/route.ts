import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { slugify } from '@/lib/utils'

const BLOG_ROLES = ['admin', 'autor_blog']

const BaseSchema = z.object({
  title:            z.string().trim().min(4, 'Título muy corto').max(180),
  content:          z.string().trim().min(20, 'El contenido es muy corto').max(40000),
  cover_image_url:  z.string().url().max(500).optional().or(z.literal('')),
  author_name:      z.string().trim().max(80).optional().or(z.literal('')),
  author_photo_url: z.string().url().max(500).optional().or(z.literal('')),
  author_email:     z.string().trim().email('Correo electrónico inválido').max(160),
})
const UpdateSchema = BaseSchema.partial().extend({ id: z.string().min(1) })

function excerptFrom(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim()
  return clean.length > 180 ? clean.slice(0, 177) + '…' : clean
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'post'
  let slug = base
  for (let i = 2; await prisma.article.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`
  }
  return slug
}

const LIST_SELECT = {
  id: true, slug: true, title: true, excerpt: true, cover_image_url: true,
  published_at: true, created_at: true, author_id: true, author_name: true,
} as const

export async function GET() {
  const session = await requireRole(BLOG_ROLES)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  // El autor ve solo los suyos; el admin ve todos.
  const where = session.role === 'admin' ? {} : { author_id: session.id }
  const articulos = await prisma.article.findMany({
    where, select: LIST_SELECT, orderBy: [{ created_at: 'desc' }],
  })
  return NextResponse.json({ articulos, role: session.role })
}

export async function POST(req: NextRequest) {
  const session = await requireRole(BLOG_ROLES)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = BaseSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  const slug = await uniqueSlug(d.title)
  await prisma.article.create({
    data: {
      slug,
      title:            d.title,
      excerpt:          excerptFrom(d.content),
      content:          d.content,
      cover_image_url:  d.cover_image_url || null,
      author_id:        session.id,
      author_name:      d.author_name?.trim() || session.nombre,
      author_email:     d.author_email,
      author_photo_url: d.author_photo_url || null,
      published_at:     new Date(), // publicación directa
    },
  })
  revalidatePath('/blog')
  revalidatePath(`/blog/${slug}`)
  return NextResponse.json({ ok: true, slug }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(BLOG_ROLES)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  const { id, ...d } = parsed.data

  const target = await prisma.article.findUnique({ where: { id }, select: { id: true, slug: true, author_id: true } })
  if (!target) return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
  // El autor solo puede editar los propios; el admin, cualquiera.
  if (session.role !== 'admin' && target.author_id !== session.id)
    return NextResponse.json({ error: 'No puedes editar artículos de otros autores.' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (d.title !== undefined) data.title = d.title
  if (d.content !== undefined) { data.content = d.content; data.excerpt = excerptFrom(d.content) }
  if (d.cover_image_url !== undefined) data.cover_image_url = d.cover_image_url || null
  if (d.author_photo_url !== undefined) data.author_photo_url = d.author_photo_url || null
  // Solo actualizamos seudónimo/correo si vienen con valor (no los borramos con el editor).
  if (d.author_name !== undefined && d.author_name.trim()) data.author_name = d.author_name.trim()
  if (d.author_email !== undefined && d.author_email) data.author_email = d.author_email

  await prisma.article.update({ where: { id }, data })
  revalidatePath('/blog')
  revalidatePath(`/blog/${target.slug}`)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  // Borrar queda restringido al Admin (los autores solo crean y editan).
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const target = await prisma.article.findUnique({ where: { id }, select: { slug: true } })
  if (!target) return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })

  await prisma.article.delete({ where: { id } })
  revalidatePath('/blog')
  revalidatePath(`/blog/${target.slug}`)
  return NextResponse.json({ ok: true })
}
