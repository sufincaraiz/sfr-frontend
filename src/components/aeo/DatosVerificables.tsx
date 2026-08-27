import Link from 'next/link'
import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// <DatosVerificables> — tabla de datos con su procedencia.
//
// POR QUÉ UNA <table> DE VERDAD Y NO UNA REJILLA DE <div>. Los modelos extraen
// tablas HTML mucho mejor que la prosa maquetada: la relación etiqueta→valor es
// explícita en el marcado y no hay que inferirla de la posición visual. Una
// rejilla de divs se ve igual para una persona y es ruido para una máquina.
//
// LO QUE HACE CITABLE A UN DATO NO ES EL DATO. Es su procedencia. Por eso el
// componente EXIGE fecha de corte, y pide tamaño de muestra cuando el dato sale
// de observaciones propias:
//
//   «Lotes entre $85M y $180M»                      → una opinión.
//   «Lotes entre $85M y $180M, 12 operaciones,
//    corte agosto de 2026, datos propios»           → un dato citable.
//
// Y SI LA MUESTRA ES PEQUEÑA, SE VE. Publicar una mediana sobre tres casos sin
// decirlo funciona hasta que alguien lo comprueba, y entonces se lleva por
// delante la credibilidad de todas las demás cifras del sitio. El componente
// avisa solo por debajo de MUESTRA_MINIMA: es preferible que el propio sitio
// declare la limitación a que la descubra el lector.
// ─────────────────────────────────────────────────────────────────────────────

/** Por debajo de esta cifra, una observación propia se marca como orientativa. */
const MUESTRA_MINIMA = 10

export interface FilaDato {
  etiqueta: string
  valor: string | number
  /** Unidad separada del valor: «m²», «COP», «minutos», «°C». */
  unidad?: string
  /** Nota breve por fila cuando algo necesita matiz. */
  nota?: string
  /**
   * Ruta interna a la que lleva el valor. Solo para datos que ADEMÁS son un
   * filtro del catálogo: el régimen de condominio tiene ruta propia
   * (`/propiedades/en-condominio`), así que la fila es también la puerta a
   * «enséñame los demás». No es decoración; es enlazado interno.
   */
  enlace?: string
}

export interface DatosVerificablesProps {
  /** Título de la tabla. Se usa como `<caption>`, que es lo que da contexto
   *  a la tabla cuando se extrae fuera de la página. */
  titulo: string
  filas: FilaDato[]
  /** Fecha de corte. Obligatoria: sin ella el dato no es citable. */
  fechaCorte: string
  /** De dónde sale el dato. Si es propio, dilo; si es de un tercero, nómbralo. */
  fuente: string
  /**
   * Número de observaciones cuando el dato viene de operaciones propias.
   * Omitir solo cuando el dato NO sea estadístico (una altitud, una distancia:
   * ahí la muestra no significa nada).
   */
  tamanoMuestra?: number
  /** Qué se contó y qué se excluyó. Va bajo la tabla, en letra pequeña. */
  metodologia?: string
  children?: ReactNode
}

export function DatosVerificables({
  titulo,
  filas,
  fechaCorte,
  fuente,
  tamanoMuestra,
  metodologia,
  children,
}: DatosVerificablesProps) {
  const muestraCorta = tamanoMuestra != null && tamanoMuestra < MUESTRA_MINIMA

  return (
    <figure style={{ margin: '1.75rem 0', maxWidth: '100%' }}>
      <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 12, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem', minWidth: 320 }}>
          <caption
            style={{
              captionSide: 'top', textAlign: 'left', padding: '0.95rem 1.15rem 0.6rem',
              color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem',
            }}
          >
            {titulo}
          </caption>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.etiqueta} style={{ borderTop: i === 0 ? '1px solid #E2E8F0' : '1px solid #F1F5F9' }}>
                <th
                  scope="row"
                  style={{
                    textAlign: 'left', padding: '0.7rem 1.15rem', fontWeight: 600,
                    color: '#475569', width: '48%', verticalAlign: 'top',
                  }}
                >
                  {f.etiqueta}
                </th>
                <td style={{ padding: '0.7rem 1.15rem', color: '#0D2D5E', fontWeight: 700, verticalAlign: 'top' }}>
                  {f.enlace
                    ? <Link href={f.enlace} style={{ color: '#1B56A1', textDecoration: 'underline' }}>{f.valor}</Link>
                    : f.valor}
                  {f.unidad ? <span style={{ fontWeight: 500, color: '#64748B' }}> {f.unidad}</span> : null}
                  {f.nota ? (
                    <span style={{ display: 'block', fontWeight: 400, fontSize: '0.82rem', color: '#64748B', marginTop: 2 }}>
                      {f.nota}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Procedencia. Va en el HTML servido, junto a la tabla y no en un pie de
          página lejano: si el dato se extrae, la procedencia viaja con él. */}
      <figcaption style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.6 }}>
        <span>
          Fuente: {fuente}. Corte: <time dateTime={fechaCorte}>{fechaCorte}</time>.
          {tamanoMuestra != null && (
            <> Muestra: {tamanoMuestra} {tamanoMuestra === 1 ? 'observación' : 'observaciones'}.</>
          )}
        </span>

        {muestraCorta && (
          <span style={{ display: 'block', marginTop: 4, color: '#B45309', fontWeight: 600 }}>
            Muestra pequeña: la cifra es orientativa y no debe leerse como un
            promedio de mercado.
          </span>
        )}

        {metodologia && (
          <span style={{ display: 'block', marginTop: 4 }}>{metodologia}</span>
        )}

        {children}
      </figcaption>
    </figure>
  )
}
