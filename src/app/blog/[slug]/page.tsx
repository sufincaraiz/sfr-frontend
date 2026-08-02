import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Home, ChevronRight, Calendar, Clock, User, Tag, Mail } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { ogImageUrl, ogImageMeta } from '@/lib/og-image'
import { getPost, getAllPostSlugs, getRelatedPosts } from '@/lib/blog'
import { ArticleContent } from '@/components/blog/ArticleContent'
import { renderInline } from '@/lib/richtext'
import { ArticleCard, CategoryBadge, TagBadge } from '@/components/blog/ArticleCard'
import { JsonLd, breadcrumbSchema, articleSchema, howToSchema, webPageSchema } from '@/components/seo/JsonLd'

// ─── SSG ─────────────────────────────────────────────────────────────────────

export const revalidate = 3600

export async function generateStaticParams() {
  try {
    return await getAllPostSlugs()
  } catch (err) {
    console.warn('[generateStaticParams /blog/[slug]] BD no disponible en build; se generará bajo demanda:', err instanceof Error ? err.message : err)
    return []
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Artículo no encontrado' }

  // Recorta la marca si el título guardado ya la incluye (la plantilla la agrega).
  const cleanTitle = post.title.replace(/\s*\|\s*Su Finca Ra[íi]z\s*$/i, '').trim()

  return {
    title: cleanTitle,
    description: post.excerpt,
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    robots: post.noindex ? { index: false } : undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${slug}`,
      type: 'article',
      locale: 'es_CO',
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author ?? 'Su Finca Raíz'],
      section: post.category_name,
      tags: post.tags,
      // Antes se concatenaba `${SITE_URL}${post.cover_image}`, lo que producía
      // URLs rotas ("…sufincaraiz.comhttps//res.cloudinary.com/…") en los
      // artículos de BD, cuya portada ya es absoluta. `ogImageUrl` resuelve
      // ambos casos (Cloudinary absoluta y ruta relativa de los MDX).
      images: ogImageMeta(post.cover_image, post.cover_alt ?? post.title),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImageUrl(post.cover_image)],
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const related = await getRelatedPosts(post, 3)

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: post.category_name, href: `/blog/categorias/${post.category}` },
    { name: post.title, href: `/blog/${slug}` },
  ])

  const article = articleSchema({
    title:         post.title,
    excerpt:       post.excerpt,
    slug:          post.slug,
    date:          post.date,
    updated:       post.updated,
    author:        post.author,
    cover_image:   post.cover_image,
    category_name: post.category_name,
  })

  const howTo = post.howto_steps?.length
    ? howToSchema({
        name:            post.title,
        description:     post.excerpt,
        url:            `${SITE_URL}/blog/${post.slug}`,
        total_time:      post.howto_time,
        estimated_cost:  post.howto_cost,
        steps:           post.howto_steps,
      })
    : null

  const pageSchema = webPageSchema({
    url:                 `${SITE_URL}/blog/${post.slug}`,
    name:                post.title,
    description:         post.excerpt,
    speakable_selectors: ['h1', '.article-excerpt', 'article h2', 'article p'],
  })

  const dateFormatted = new Date(post.date + 'T12:00:00').toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const updatedFormatted = post.updated
    ? new Date(post.updated + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={article} />
      <JsonLd data={pageSchema} />
      {howTo && <JsonLd data={howTo} />}

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Cover hero ── */}
        {/* paddingTop reserva la franja del header fijo transparente (72px) para que
            el título nunca quede tapado por el logo en móvil, sin importar su largo. */}
        {post.cover_image ? (
          <div style={{ position: 'relative', width: '100%', minHeight: 'clamp(300px,38vw,460px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: 88, boxSizing: 'border-box', overflow: 'hidden', background: '#0D2D5E' }}>
            <Image src={post.cover_image} alt={post.cover_alt ?? post.title} fill priority style={{ objectFit: 'cover', opacity: 0.65 }} sizes="100vw" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,45,94,0.2) 0%, rgba(13,45,94,0.85) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(1.25rem,4vw,2.75rem)', maxWidth: 860 }}>
              <div style={{ marginBottom: 10 }}>
                <CategoryBadge category={post.category} name={post.category_name} inverse />
              </div>
              <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.4rem,3.5vw,2.4rem)', lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.5)', marginBottom: 10 }}>
                {post.title}
              </h1>
              <PostMeta dateFormatted={dateFormatted} post={post} />
            </div>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: '6rem 1.5rem 2.5rem' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <div style={{ marginBottom: 10 }}>
                <CategoryBadge category={post.category} name={post.category_name} inverse />
              </div>
              <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem,4vw,2.5rem)', lineHeight: 1.2, marginBottom: 12 }}>
                {post.title}
              </h1>
              <PostMeta dateFormatted={dateFormatted} post={post} />
            </div>
          </div>
        )}

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <Link href="/blog" style={{ color: '#64748B', textDecoration: 'none' }}>Blog</Link>
          <ChevronRight size={13} />
          <Link href={`/blog/categorias/${post.category}`} style={{ color: '#64748B', textDecoration: 'none' }}>{post.category_name}</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{post.title}</span>
        </nav>

        {/* ── Cuerpo ── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem 5rem' }} className="article-layout">

          {/* ── CONTENIDO PRINCIPAL ── */}
          <article>
            {/* Excerpt — marcado como speakable para AI */}
            <p className="article-excerpt sfr-speakable" style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.8, fontWeight: 500, borderLeft: '4px solid #E8B92F', paddingLeft: '1rem', marginBottom: '2rem', fontStyle: 'italic' }}>
              {post.excerpt}
            </p>

            {/* Contenido: MDX (artículos) o texto plano seguro (comunidad) */}
            {post.community ? (
              <div className="community-content" style={{ color: '#334155', fontSize: '1.02rem', lineHeight: 1.85 }}>
                {post.content.split(/\n{2,}/).map((para, i) => (
                  <p key={i} style={{ marginBottom: '1.1rem', whiteSpace: 'pre-wrap', textAlign: 'justify', hyphens: 'auto', WebkitHyphens: 'auto' }}>{renderInline(para)}</p>
                ))}
              </div>
            ) : (
              <ArticleContent content={post.content} />
            )}

            {/* Tags footer */}
            {post.tags.length > 0 && (
              <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Tag size={13} /> Tags:
                  </span>
                  {post.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
                </div>
              </div>
            )}

            {/* Fecha de actualización */}
            {updatedFormatted && (
              <p style={{ color: '#94A3B8', fontSize: '0.78rem', marginTop: '1.5rem', fontStyle: 'italic' }}>
                Última actualización: {updatedFormatted}
              </p>
            )}

            {/* CTA bottom */}
            <div style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', borderRadius: 16, padding: '1.75rem 2rem', marginTop: '2.5rem', textAlign: 'center' }}>
              <p style={{ color: '#E8B92F', fontWeight: 800, fontSize: '0.85rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>¿Listo para invertir?</p>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem' }}>
                Explora las propiedades disponibles en el Gualivá
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/propiedades" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#E8B92F', color: '#0D2D5E', fontWeight: 800, fontSize: '0.9rem', padding: '0.7rem 1.5rem', borderRadius: 10, textDecoration: 'none' }}>
                  Ver propiedades
                </Link>
                <a href="https://wa.me/573218826730" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#15803D', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.7rem 1.5rem', borderRadius: 10, textDecoration: 'none' }}>
                  Asesoría gratuita
                </a>
              </div>
            </div>
          </article>

          {/* ── SIDEBAR ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Info del autor */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem 1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
                {post.community && post.author_photo ? (
                  <div style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid #E8B92F' }}>
                    <Image src={post.author_photo} alt={post.author ?? 'Autor'} fill style={{ objectFit: 'cover' }} sizes="44px" />
                  </div>
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0D2D5E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={20} style={{ color: '#fff' }} />
                  </div>
                )}
                <div>
                  <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.9rem', margin: 0 }}>{post.author ?? 'Su Finca Raíz'}</p>
                  <p style={{ color: '#64748B', fontSize: '0.75rem', margin: 0 }}>
                    {post.community ? 'Voz de la comunidad' : 'Expertos en Gualivá'}
                  </p>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.6 }}>
                {post.community
                  ? 'Aporte de la comunidad de Su Finca Raíz — conocimiento que perdura en el tiempo.'
                  : 'Especialistas en compraventa de finca raíz en La Vega y la región del Gualivá, Cundinamarca.'}
              </p>
              {post.community && post.author_email && (
                <a
                  href={`mailto:${post.author_email}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: '0.9rem', background: '#1B56A1', color: '#fff', fontWeight: 700, fontSize: '0.8rem', padding: '8px 14px', borderRadius: 9, textDecoration: 'none' }}
                >
                  <Mail size={14} /> Contactar al autor
                </a>
              )}
            </div>

            {/* Detalles del artículo */}
            <div style={{ background: '#0D2D5E', borderRadius: 14, padding: '1.25rem 1.4rem', color: '#fff' }}>
              <p style={{ color: '#E8B92F', fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Este artículo
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem' }}>
                <SideRow label="Categoría" value={post.category_name} />
                <SideRow label="Publicado" value={dateFormatted} />
                {updatedFormatted && <SideRow label="Actualizado" value={updatedFormatted} />}
                <SideRow label="Lectura" value={post.reading_time} />
              </div>
            </div>

            {/* CTA */}
            <div style={{ background: '#F0FDF4', borderRadius: 14, border: '1.5px solid #BBF7D0', padding: '1.25rem 1.4rem' }}>
              <p style={{ color: '#15803D', fontWeight: 800, fontSize: '0.88rem', marginBottom: 6 }}>¿Tienes preguntas?</p>
              <p style={{ color: '#475569', fontSize: '0.81rem', lineHeight: 1.6, marginBottom: '0.9rem' }}>
                Nuestros asesores conocen el mercado del Gualivá en detalle.
              </p>
              <a href="https://wa.me/573218826730" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#15803D', color: '#fff', fontWeight: 700, fontSize: '0.88rem', padding: '0.65rem', borderRadius: 10, textDecoration: 'none' }}>
                Consultar gratis
              </a>
            </div>

            {/* Artículos relacionados */}
            {related.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem 1.4rem' }}>
                <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Artículos relacionados</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {related.map(p => (
                    <ArticleCard key={p.slug} post={p} variant="horizontal" />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      <style>{`
        .article-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 290px;
          gap: 2.5rem;
          align-items: start;
        }
        @media (max-width: 960px) {
          .article-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostMeta({ dateFormatted, post }: { dateFormatted: string; post: { author?: string; reading_time: string } }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', fontWeight: 600 }}>
      {post.author && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> {post.author}</span>
      )}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {dateFormatted}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {post.reading_time}</span>
    </div>
  )
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 7 }}>
      <span style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
      <strong style={{ color: '#fff', textAlign: 'right', maxWidth: '55%' }}>{value}</strong>
    </div>
  )
}
