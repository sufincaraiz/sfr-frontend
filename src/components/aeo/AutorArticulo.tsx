// ─────────────────────────────────────────────────────────────────────────────
// <AutorArticulo> — la firma visible que respalda la `Person` del marcado.
//
// POR QUÉ EXISTE. El JSON-LD de cada artículo declara `author` como una
// `Person` con `@id` estable. Una persona que solo vive en el marcado y no
// aparece en ninguna página es marcado sin respaldo: la misma falta que
// declarar un servicio sin página (§1.1), y un modelo que compara lo declarado
// con lo publicado la detecta igual.
//
// Este bloque es ese respaldo. Va al pie de cada artículo del blog y en
// `/nosotros`, y su texto sale de hechos verificables —dirige la empresa desde
// su fundación, formación en ingeniería de sistemas—, sin un solo adjetivo de
// autoridad. «Reconocido experto» no es una afirmación falsable y §3 lo trata
// como lo que es: relleno.
//
// El enlace a /nosotros es el que cierra el círculo: el `@id` de la Person
// apunta ahí, y ahí está su marcado propio.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { DATOS_OFICIALES } from '@/lib/datos-oficiales'

// Nombre completo siempre: «Mac» es el agente, no una persona.
export const AUTOR_NOMBRE = 'Leonel Macgiver López Albadán'
export const AUTOR_CARGO  = 'Director'

interface AutorArticuloProps {
  /** `true` en /nosotros, donde el bloque no cierra un artículo sino que
   *  presenta a la persona dentro de la página de la empresa. */
  enPaginaPropia?: boolean
}

export function AutorArticulo({ enPaginaPropia = false }: AutorArticuloProps) {
  const experiencia =
    `Dirige Su Finca Raíz en La Vega, Cundinamarca, desde su fundación en ` +
    `${DATOS_OFICIALES.anioFundacion}. Es ingeniero de sistemas y trabaja el mercado ` +
    'inmobiliario de la Provincia del Gualivá: uso del suelo, ordenamiento ' +
    'territorial y estudio de títulos de predios rurales.'

  return (
    <section
      style={{
        marginTop: enPaginaPropia ? 0 : '3rem',
        padding: '1.4rem 1.5rem',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
      }}
    >
      <p style={{ margin: '0 0 0.35rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#94A3B8' }}>
        {enPaginaPropia ? 'Dirección' : 'Sobre el autor'}
      </p>

      <p style={{ margin: '0 0 0.2rem', color: '#0D2D5E', fontWeight: 800, fontSize: '1.02rem' }}>
        {AUTOR_NOMBRE}
      </p>
      <p style={{ margin: '0 0 0.6rem', color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>
        {AUTOR_CARGO} · Su Finca Raíz, La Vega, Cundinamarca
      </p>

      <p style={{ margin: 0, color: '#475569', fontSize: '0.92rem', lineHeight: 1.7 }}>
        {experiencia}
      </p>

      {!enPaginaPropia && (
        <p style={{ margin: '0.7rem 0 0', fontSize: '0.85rem' }}>
          <Link href="/nosotros" style={{ color: '#1B56A1', fontWeight: 600, textDecoration: 'none' }}>
            Conocer a Su Finca Raíz →
          </Link>
        </p>
      )}
    </section>
  )
}
