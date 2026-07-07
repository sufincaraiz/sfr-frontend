import React from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Formato en línea seguro para texto plano guardado en BD (municipios, blog
// comunidad). Soporta un subconjunto de marcadores tipo Markdown:
//   **negrita**   → <strong>
//   *cursiva*  _cursiva_  → <em>
//   ==resaltado==  → <mark>
// El texto se emite como nodos de React (que React escapa automáticamente), por
// lo que NO hay inyección de HTML: es seguro incluso para contenido de usuarios.
// ─────────────────────────────────────────────────────────────────────────────

// Orden de alternativas importante: **...** antes que *...*.
const INLINE_RE = /(\*\*([^\n]+?)\*\*|==([^\n]+?)==|\*([^\n]+?)\*|_([^\n]+?)_)/g

/** Convierte una línea/párrafo de texto con marcadores en nodos de React. */
export function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  INLINE_RE.lastIndex = 0
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[2] !== undefined) {
      nodes.push(<strong key={key++} style={{ fontWeight: 700 }}>{m[2]}</strong>)
    } else if (m[3] !== undefined) {
      nodes.push(
        <mark key={key++} style={{ background: '#FEF3C7', color: 'inherit', padding: '0 3px', borderRadius: 3 }}>{m[3]}</mark>,
      )
    } else if (m[4] !== undefined) {
      nodes.push(<em key={key++}>{m[4]}</em>)
    } else if (m[5] !== undefined) {
      nodes.push(<em key={key++}>{m[5]}</em>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

interface RichTextProps {
  text: string
  /** Estilo aplicado a cada párrafo. */
  style?: React.CSSProperties
  className?: string
}

/**
 * Renderiza texto plano de BD respetando párrafos (líneas en blanco) y los
 * marcadores en línea. Justificado + guiones automáticos por defecto.
 */
export function RichText({ text, style, className }: RichTextProps) {
  // marginBottom pasado por `style` es del bloque completo → va al contenedor,
  // no a cada párrafo (si no, el último lo pierde).
  const { marginBottom, ...pStyle } = style ?? {}
  const base: React.CSSProperties = {
    textAlign: 'justify',
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    whiteSpace: 'pre-wrap',
    ...pStyle,
  }
  const paras = (text ?? '').split(/\n{2,}/).filter(p => p.trim() !== '')
  if (paras.length === 0) return null
  return (
    <div className={className} style={marginBottom ? { marginBottom } : undefined}>
      {paras.map((para, i) => (
        <p key={i} style={{ ...base, marginBottom: i < paras.length - 1 ? '1em' : 0 }}>
          {renderInline(para)}
        </p>
      ))}
    </div>
  )
}
