import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import Link from 'next/link'
import Image from 'next/image'
import type { MDXComponents } from 'mdx/types'

// ─── Custom MDX components ────────────────────────────────────────────────────

const components: MDXComponents = {
  // Headings con anclas
  h2: (props) => (
    <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: 'clamp(1.2rem,2.5vw,1.5rem)', marginTop: '2.5rem', marginBottom: '1rem', lineHeight: 1.3, scrollMarginTop: '5rem' }} {...props} />
  ),
  h3: (props) => (
    <h3 style={{ color: '#0D2D5E', fontWeight: 700, fontSize: 'clamp(1rem,2vw,1.15rem)', marginTop: '2rem', marginBottom: '0.75rem', lineHeight: 1.4, scrollMarginTop: '5rem' }} {...props} />
  ),
  h4: (props) => (
    <h4 style={{ color: '#1B56A1', fontWeight: 700, fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }} {...props} />
  ),

  // Párrafos y texto
  p: (props) => (
    <p style={{ color: '#374151', lineHeight: 1.85, fontSize: '1rem', marginBottom: '1.25rem' }} {...props} />
  ),
  strong: (props) => (
    <strong style={{ color: '#0D2D5E', fontWeight: 700 }} {...props} />
  ),
  em: (props) => (
    <em style={{ color: '#475569', fontStyle: 'italic' }} {...props} />
  ),

  // Listas
  ul: (props) => (
    <ul style={{ color: '#374151', paddingLeft: '1.5rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }} {...props} />
  ),
  ol: (props) => (
    <ol style={{ color: '#374151', paddingLeft: '1.5rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }} {...props} />
  ),
  li: (props) => (
    <li style={{ lineHeight: 1.75, fontSize: '1rem' }} {...props} />
  ),

  // Blockquote
  blockquote: (props) => (
    <blockquote style={{
      borderLeft: '4px solid #1B56A1',
      paddingLeft: '1.25rem',
      margin: '1.5rem 0',
      color: '#475569',
      fontStyle: 'italic',
      background: '#EFF6FF',
      borderRadius: '0 12px 12px 0',
      padding: '1rem 1.25rem',
    }} {...props} />
  ),

  // Código inline
  code: (props) => (
    <code style={{
      background: '#F1F5F9',
      color: '#0D2D5E',
      fontSize: '0.88em',
      padding: '2px 6px',
      borderRadius: 5,
      fontFamily: 'ui-monospace, monospace',
      border: '1px solid #E2E8F0',
    }} {...props} />
  ),

  // Bloque de código
  pre: (props) => (
    <pre style={{
      background: '#0F172A',
      color: '#E2E8F0',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
      overflowX: 'auto',
      fontSize: '0.88rem',
      lineHeight: 1.7,
      margin: '1.5rem 0',
      fontFamily: 'ui-monospace, monospace',
      border: '1px solid #1E293B',
    }} {...props} />
  ),

  // Tabla
  table: (props) => (
    <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }} {...props} />
    </div>
  ),
  thead: (props) => (
    <thead style={{ background: '#0D2D5E', color: '#fff' }} {...props} />
  ),
  th: (props) => (
    <th style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem' }} {...props} />
  ),
  td: (props) => (
    <td style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #E2E8F0', color: '#374151' }} {...props} />
  ),
  tr: (props) => (
    <tr style={{ borderBottom: '1px solid #E2E8F0' }} className="blog-tr" {...props} />
  ),

  // Separador
  hr: () => (
    <hr style={{ border: 'none', borderTop: '2px solid #F1F5F9', margin: '2.5rem 0' }} />
  ),

  // Imágenes dentro del MDX
  img: ({ src, alt, ...props }) => {
    if (!src) return null
    return (
      <span style={{ display: 'block', position: 'relative', borderRadius: 12, overflow: 'hidden', margin: '1.5rem 0' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ''} style={{ width: '100%', height: 'auto', borderRadius: 12 }} loading="lazy" {...props} />
        {alt && (
          <span style={{ display: 'block', textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem', marginTop: 6, fontStyle: 'italic' }}>
            {alt}
          </span>
        )}
      </span>
    )
  },

  // Links (internos vs externos)
  a: ({ href, children, ...props }) => {
    const isInternal = href?.startsWith('/')
    if (isInternal) {
      return (
        <Link href={href!} style={{ color: '#1B56A1', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }} {...props}>
          {children}
        </Link>
      )
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#1B56A1', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }} {...props}>
        {children}
      </a>
    )
  },

  // Componente de llamada a la acción (uso en MDX: <CTA href="/propiedades">Texto</CTA>)
  CTA: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <div style={{ background: '#EFF6FF', borderRadius: 14, border: '1.5px solid #BFDBFE', padding: '1.5rem 1.75rem', margin: '2rem 0', textAlign: 'center' }}>
      <p style={{ color: '#1D4ED8', fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>{children}</p>
      <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0D2D5E', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.65rem 1.5rem', borderRadius: 10, textDecoration: 'none' }}>
        Ver propiedades disponibles →
      </Link>
    </div>
  ),

  // Callout informativo (uso: <Callout type="tip">Texto</Callout>)
  Callout: ({ type = 'info', children }: { type?: 'info' | 'warning' | 'tip'; children: React.ReactNode }) => {
    const styles = {
      info:    { bg: '#EFF6FF', border: '#BFDBFE', icon: 'ℹ️', color: '#1D4ED8' },
      warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '⚠️', color: '#92400E' },
      tip:     { bg: '#F0FDF4', border: '#BBF7D0', icon: '💡', color: '#065F46' },
    }
    const s = styles[type] ?? styles.info
    return (
      <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12, padding: '1rem 1.25rem', margin: '1.5rem 0', display: 'flex', gap: 12 }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</span>
        <div style={{ color: s.color, fontSize: '0.92rem', lineHeight: 1.7 }}>{children}</div>
      </div>
    )
  },

  // Imagen optimizada con Next.js (uso: <BlogImage src="/..." alt="..." width={800} height={400} />)
  BlogImage: ({ src, alt, width = 800, height = 450 }: { src: string; alt: string; width?: number; height?: number }) => (
    <span style={{ display: 'block', margin: '1.5rem 0' }}>
      <Image src={src} alt={alt} width={width} height={height} style={{ width: '100%', height: 'auto', borderRadius: 12 }} />
      {alt && (
        <span style={{ display: 'block', textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem', marginTop: 6, fontStyle: 'italic' }}>
          {alt}
        </span>
      )}
    </span>
  ),
}

// ─── MDX options ──────────────────────────────────────────────────────────────

const mdxOptions = {
  remarkPlugins: [remarkGfm],
  rehypePlugins: [
    rehypeSlug,
    [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: ['heading-anchor'] } }],
  ],
} as const

// ─── Main component ───────────────────────────────────────────────────────────

interface ArticleContentProps {
  content: string
}

export async function ArticleContent({ content }: ArticleContentProps) {
  return (
    <div className="blog-content">
      {/* @ts-expect-error rehype plugins typing */}
      <MDXRemote source={content} options={{ mdxOptions }} components={components} />
      <style>{`
        .blog-content { max-width: 100%; overflow-x: hidden; }
        .blog-tr:nth-child(even) { background: #F8FAFC; }
        .heading-anchor { color: inherit; text-decoration: none; }
        .heading-anchor:hover::after { content: ' #'; color: #94A3B8; font-weight: 400; }
      `}</style>
    </div>
  )
}
