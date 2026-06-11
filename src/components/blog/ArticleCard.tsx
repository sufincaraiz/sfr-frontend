import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, ChevronRight, Tag } from 'lucide-react'
import { BLOG_CATEGORIES } from '@/types/blog'
import type { PostMeta } from '@/types/blog'

interface ArticleCardProps {
  post:     PostMeta
  priority?: boolean
  variant?: 'default' | 'horizontal' | 'featured'
}

export function ArticleCard({ post, priority = false, variant = 'default' }: ArticleCardProps) {
  const href = `/blog/${post.slug}`
  const categoryName = BLOG_CATEGORIES[post.category] ?? post.category
  const dateFormatted = new Date(post.date + 'T12:00:00').toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  if (variant === 'horizontal') {
    return (
      <Link href={href} style={{ display: 'flex', gap: '1rem', textDecoration: 'none', background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }} className="article-card-h">
        {post.cover_image && (
          <div style={{ position: 'relative', width: 140, flexShrink: 0 }}>
            <Image src={post.cover_image} alt={post.cover_alt ?? post.title} fill style={{ objectFit: 'cover' }} sizes="140px" priority={priority} />
          </div>
        )}
        <div style={{ padding: '1rem', flex: 1 }}>
          <CategoryBadge category={post.category} name={categoryName} />
          <h3 style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.4, margin: '6px 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {post.title}
          </h3>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.73rem', color: '#94A3B8', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={11} /> {dateFormatted}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {post.reading_time}</span>
          </div>
        </div>
      </Link>
    )
  }

  if (variant === 'featured') {
    return (
      <Link href={href} style={{ display: 'block', textDecoration: 'none', position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#0D2D5E', minHeight: 380 }} className="article-card-feat">
        {post.cover_image && (
          <Image src={post.cover_image} alt={post.cover_alt ?? post.title} fill style={{ objectFit: 'cover', opacity: 0.6 }} sizes="(max-width:768px) 100vw, 50vw" priority={priority} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,45,94,0.95) 0%, rgba(13,45,94,0.3) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.75rem 2rem' }}>
          <CategoryBadge category={post.category} name={categoryName} inverse />
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.1rem,2.5vw,1.5rem)', lineHeight: 1.25, margin: '10px 0 10px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {post.title}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {post.excerpt}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 14, fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={12} /> {dateFormatted}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> {post.reading_time}</span>
            </div>
            <span style={{ color: '#E8B92F', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              Leer artículo <ChevronRight size={14} />
            </span>
          </div>
        </div>
      </Link>
    )
  }

  // default card
  return (
    <Link href={href} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', height: '100%' }} className="article-card">
      {/* Cover */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#F1F5F9', flexShrink: 0, overflow: 'hidden' }}>
        {post.cover_image
          ? <Image src={post.cover_image} alt={post.cover_alt ?? post.title} fill style={{ objectFit: 'cover' }} sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" priority={priority} />
          : <BlogPlaceholder category={post.category} />
        }
      </div>

      {/* Body */}
      <div style={{ padding: '1.1rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <CategoryBadge category={post.category} name={categoryName} />

        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.4, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {post.title}
        </h3>

        <p style={{ color: '#64748B', fontSize: '0.82rem', lineHeight: 1.65, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', flex: 1 }}>
          {post.excerpt}
        </p>

        {post.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {post.tags.slice(0, 3).map(tag => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={11} /> {dateFormatted}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {post.reading_time}</span>
          </div>
          <span style={{ color: '#1B56A1', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
            Leer <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'mercado-inmobiliario':   { bg: '#DBEAFE', color: '#1D4ED8' },
  'guias-de-compra':        { bg: '#D1FAE5', color: '#065F46' },
  'vivir-en-cundinamarca':  { bg: '#FEF3C7', color: '#92400E' },
  'inversion-rural':        { bg: '#F3E8FF', color: '#6B21A8' },
  'tramites-y-legal':       { bg: '#FFE4E6', color: '#9F1239' },
  'noticias':               { bg: '#F1F5F9', color: '#475569' },
}

export function CategoryBadge({ category, name, inverse }: { category: string; name: string; inverse?: boolean }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['noticias']!
  if (inverse) {
    return (
      <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {name}
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-block', background: colors.bg, color: colors.color, fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {name}
    </span>
  )
}

export function TagBadge({ tag }: { tag: string }) {
  return (
    <Link
      href={`/blog/tags/${encodeURIComponent(tag.toLowerCase())}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#F8FAFC', color: '#475569', fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, border: '1px solid #E2E8F0', textDecoration: 'none' }}
    >
      <Tag size={9} /> {tag}
    </Link>
  )
}

function BlogPlaceholder({ category }: { category: string }) {
  const icons: Record<string, string> = {
    'mercado-inmobiliario':  '📈',
    'guias-de-compra':       '📋',
    'vivir-en-cundinamarca': '🏔️',
    'inversion-rural':       '🌱',
    'tramites-y-legal':      '⚖️',
    'noticias':              '📰',
  }
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['noticias']!
  return (
    <div style={{ position: 'absolute', inset: 0, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
      {icons[category] ?? '📝'}
    </div>
  )
}
