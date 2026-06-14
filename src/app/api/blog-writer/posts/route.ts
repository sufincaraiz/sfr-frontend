import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getBlogWriterSession } from '@/lib/auth'
import { slugify } from '@/lib/utils'

const PostSchema = z.object({
  title:        z.string().trim().min(4, 'Título muy corto').max(180),
  content:      z.string().trim().min(20, 'El contenido es muy corto').max(40000),
  cover_image_url:  z.string().url().max(500).optional().or(z.literal('')),
  author_name:  z.string().trim().max(80).optional().or(z.literal('')),
  author_photo_url: z.string().url().max(500).optional().or(z.literal('')),
  author_email: z.string().trim().email().max(160),
})

function excerptFrom(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim()
  return clean.length > 180 ? clean.slice(0, 177) + '…' : clean
}

export async function POST(req: NextRequest) {
  const session = await getBlogWriterSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const d = parsed.data

  // Slug único a partir del título
  const base = slugify(d.title) || 'post'
  let slug = base
  for (let i = 2; await prisma.article.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`
  }

  try {
    await prisma.article.create({
      data: {
        slug,
        title:           d.title,
        excerpt:         excerptFrom(d.content),
        content:         d.content,
        cover_image_url: d.cover_image_url || null,
        author_name:     d.author_name || 'Anónimo',
        author_photo_url: d.author_photo_url || null,
        author_email:    d.author_email,
        published_at:    new Date(),  // publicación inmediata
      },
    })

    // El post aparece de inmediato en el blog
    revalidatePath('/blog')
    revalidatePath(`/blog/${slug}`)

    return NextResponse.json({ ok: true, slug })
  } catch (err) {
    console.error('[blog-writer/posts]', err)
    return NextResponse.json({ error: 'No pudimos publicar tu post. Intenta de nuevo.' }, { status: 500 })
  }
}
