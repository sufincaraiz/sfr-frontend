// ─────────────────────────────────────────────────────────────────────────────
// <RespuestaDirecta> — el párrafo que un modelo copia y atribuye.
//
// Todo motor generativo extrae igual: busca una respuesta autocontenida cerca
// del inicio, la atribuye a la entidad y la fecha. Si tiene que armarla juntando
// párrafos, no cita — parafrasea sin atribución, o cita a otro que se lo puso
// más fácil.
//
// LA PRUEBA QUE DEBE PASAR EL TEXTO: copiarlo fuera de la página y que siga
// siendo verdadero, comprensible y atribuible. Si al sacarlo de contexto hace
// falta saber en qué página estaba, no sirve. Por eso el texto nombra la
// entidad y el lugar aunque el `<h1>` ya lo diga: el `<h1>` no viaja con la cita.
//
// Es SERVIDOR y HTML plano. Nada de esto puede depender de JavaScript: el
// rastreador no siempre lo ejecuta, y este es justo el párrafo que no puede
// faltarle.
// ─────────────────────────────────────────────────────────────────────────────

export interface RespuestaDirectaProps {
  /**
   * La pregunta que responde, tal como la formularía un usuario.
   * Se renderiza como encabezado accesible y alimenta el FAQPage cuando aplica.
   */
  pregunta: string
  /**
   * 40–70 palabras, autocontenida. Debe incluir: qué, dónde, una cifra concreta
   * y quién lo afirma.
   */
  respuesta: string
  /** De dónde sale la cifra que contiene. Un dato sin origen no se cita. */
  fuenteDato?: string
  /** Fecha de corte del dato. */
  fechaCorte?: string
  /** `true` mientras el texto esté pendiente de aprobación editorial. */
  borrador?: boolean
}

/** Cuenta palabras para el aviso de longitud en desarrollo. */
function palabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

export function RespuestaDirecta({
  pregunta,
  respuesta,
  fuenteDato,
  fechaCorte,
  borrador = false,
}: RespuestaDirectaProps) {
  const n = palabras(respuesta)

  // Aviso solo en desarrollo: fuera de rango la respuesta deja de funcionar como
  // unidad extraíble —demasiado corta no dice nada, demasiado larga obliga al
  // modelo a recortarla y al recortarla deja de ser fiel.
  if (process.env.NODE_ENV !== 'production' && (n < 40 || n > 70)) {
    console.warn(`[RespuestaDirecta] "${pregunta}" tiene ${n} palabras (el rango citable es 40–70).`)
  }

  return (
    <section
      className="sfr-speakable"
      aria-label={pregunta}
      style={{
        margin: '0 0 1.75rem',
        padding: '1.15rem 1.35rem',
        background: '#F8FAFC',
        borderLeft: '4px solid #E8B92F',
        borderRadius: '0 12px 12px 0',
      }}
    >
      <h2
        style={{
          margin: '0 0 0.55rem',
          color: '#0D2D5E',
          fontWeight: 800,
          fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
          lineHeight: 1.35,
        }}
      >
        {pregunta}
      </h2>

      <p style={{ margin: 0, color: '#334155', fontSize: '1rem', lineHeight: 1.7 }}>
        {respuesta}
      </p>

      {(fuenteDato || fechaCorte) && (
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
          {fuenteDato}
          {fuenteDato && fechaCorte ? ' · ' : ''}
          {fechaCorte && (
            <>Corte: <time dateTime={fechaCorte}>{fechaCorte}</time></>
          )}
        </p>
      )}

      {borrador && process.env.NODE_ENV !== 'production' && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#B45309', fontWeight: 700 }}>
          BORRADOR — pendiente de aprobación
        </p>
      )}
    </section>
  )
}
