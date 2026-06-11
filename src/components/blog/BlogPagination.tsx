import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface BlogPaginationProps {
  page:       number
  totalPages: number
  baseHref:   string   // e.g. "/blog/pagina" or "/blog/categorias/foo/pagina"
  firstHref?: string   // href of page 1 (may differ from base)
}

export function BlogPagination({ page, totalPages, baseHref, firstHref }: BlogPaginationProps) {
  if (totalPages <= 1) return null

  const pageHref = (p: number) =>
    p === 1 ? (firstHref ?? `${baseHref}/1`) : `${baseHref}/${p}`

  // Ventana de páginas a mostrar (máx 5)
  const delta = 2
  const range: number[] = []
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    range.push(i)
  }

  return (
    <nav aria-label="Paginación" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: '2.5rem' }}>
      {/* Anterior */}
      {page > 1 ? (
        <Link href={pageHref(page - 1)} style={navBtn(false)}>
          <ChevronLeft size={15} /> Anterior
        </Link>
      ) : (
        <span style={navBtn(true)}><ChevronLeft size={15} /> Anterior</span>
      )}

      {/* Primera página si no está en el rango */}
      {(range[0] ?? 1) > 1 && (
        <>
          <Link href={pageHref(1)} style={pageBtn(page === 1)}>1</Link>
          {(range[0] ?? 1) > 2 && <span style={{ color: '#94A3B8', fontSize: '0.85rem', padding: '0 4px' }}>…</span>}
        </>
      )}

      {/* Rango */}
      {range.map(p => (
        <Link key={p} href={pageHref(p)} style={pageBtn(p === page)} aria-current={p === page ? 'page' : undefined}>
          {p}
        </Link>
      ))}

      {/* Última página si no está en el rango */}
      {(range[range.length - 1] ?? totalPages) < totalPages && (
        <>
          {(range[range.length - 1] ?? totalPages) < totalPages - 1 && (
            <span style={{ color: '#94A3B8', fontSize: '0.85rem', padding: '0 4px' }}>…</span>
          )}
          <Link href={pageHref(totalPages)} style={pageBtn(page === totalPages)}>{totalPages}</Link>
        </>
      )}

      {/* Siguiente */}
      {page < totalPages ? (
        <Link href={pageHref(page + 1)} style={navBtn(false)}>
          Siguiente <ChevronRight size={15} />
        </Link>
      ) : (
        <span style={navBtn(true)}>Siguiente <ChevronRight size={15} /></span>
      )}
    </nav>
  )
}

const pageBtn = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 38,
  height: 38,
  borderRadius: 8,
  fontSize: '0.88rem',
  fontWeight: active ? 800 : 600,
  textDecoration: 'none',
  background: active ? '#0D2D5E' : '#fff',
  color: active ? '#fff' : '#374151',
  border: `1.5px solid ${active ? '#0D2D5E' : '#E2E8F0'}`,
  pointerEvents: active ? 'none' : 'auto',
})

const navBtn = (disabled: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '0 14px',
  height: 38,
  borderRadius: 8,
  fontSize: '0.85rem',
  fontWeight: 600,
  textDecoration: 'none',
  background: disabled ? '#F8FAFC' : '#fff',
  color: disabled ? '#CBD5E1' : '#374151',
  border: '1.5px solid #E2E8F0',
  pointerEvents: disabled ? 'none' : 'auto',
  cursor: disabled ? 'default' : 'pointer',
})
