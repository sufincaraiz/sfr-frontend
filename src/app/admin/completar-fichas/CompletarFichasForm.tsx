'use client'

import { useState } from 'react'

export interface FilaFicha {
  id: string
  slug: string
  titulo: string
  tipo: string
  municipio: string
  vereda: string | null
  /** Lo que dice `veredas-data.ts` de esa vereda. Referencia, NO se copia sola. */
  accesoVereda: string | null
  acceso: string
  servicios: string[]
  referencia: string
  faltaAcceso: boolean
  faltaServicios: boolean
}

interface Props {
  filas: FilaFicha[]
  opcionesServicio: string[]
}

export function CompletarFichasForm({ filas, opcionesServicio }: Props) {
  const [estado, setEstado] = useState<Record<string, { acceso: string; servicios: string[]; extra: string }>>(
    () => Object.fromEntries(filas.map(f => [f.id, { acceso: f.acceso, servicios: f.servicios, extra: '' }])),
  )
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const toggle = (id: string, servicio: string) =>
    setEstado(e => {
      const s = e[id]!
      const tiene = s.servicios.includes(servicio)
      return { ...e, [id]: { ...s, servicios: tiene ? s.servicios.filter(x => x !== servicio) : [...s.servicios, servicio] } }
    })

  async function guardar() {
    setGuardando(true)
    setMensaje(null)
    try {
      const cuerpo = {
        filas: filas.map(f => {
          const s = estado[f.id]!
          // El campo libre admite varios separados por coma: es lo que la gente
          // escribe sin que nadie se lo pida.
          const extras = s.extra.split(',').map(x => x.trim()).filter(Boolean)
          const servicios = [...s.servicios, ...extras]
          return {
            id: f.id,
            ...(s.acceso.trim() !== f.acceso ? { acceso: s.acceso.trim() } : {}),
            ...(servicios.length || f.servicios.length ? { servicios } : {}),
          }
        }),
      }
      const res = await fetch('/api/admin/completar-fichas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Error al guardar')
      setMensaje(`✓ ${j.guardadas} ficha(s) guardadas. Recarga para ver la lista actualizada.`)
    } catch (err) {
      setMensaje(`✗ ${err instanceof Error ? err.message : 'Error al guardar'}`)
    } finally {
      setGuardando(false)
    }
  }

  const etiqueta: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }
  const input: React.CSSProperties = { width: '100%', padding: '0.5rem 0.7rem', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: '0.9rem' }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {filas.map(f => {
          const s = estado[f.id]!
          return (
            <section key={f.id} style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: '1.1rem 1.25rem', background: '#fff' }}>
              <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <strong style={{ color: '#0D2D5E', fontSize: '1rem' }}>{f.titulo}</strong>
                <span style={{ color: '#64748B', fontSize: '0.82rem' }}>
                  {f.tipo} · {f.municipio}{f.vereda ? ` · vereda ${f.vereda}` : ' · sin vereda asignada'}
                </span>
                {f.faltaAcceso && <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '2px 9px', fontSize: '0.7rem', fontWeight: 800 }}>falta acceso</span>}
                {f.faltaServicios && <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '2px 9px', fontSize: '0.7rem', fontWeight: 800 }}>faltan servicios</span>}
              </header>

              {f.referencia && (
                <p style={{ color: '#94A3B8', fontSize: '0.78rem', lineHeight: 1.5, margin: '0 0 0.9rem' }}>
                  {f.referencia}…
                </p>
              )}

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={etiqueta}>Acceso vial</label>
                {f.accesoVereda && (
                  <p style={{ color: '#475569', fontSize: '0.78rem', margin: '3px 0 5px' }}>
                    Su vereda dice: <em>«{f.accesoVereda}»</em> — referencia; el tramo final del predio puede ser otro.
                  </p>
                )}
                <input
                  style={input}
                  value={s.acceso}
                  placeholder="Ej.: vía pavimentada hasta la entrada · vía destapada, 4x4 recomendado en lluvias"
                  onChange={e => setEstado(prev => ({ ...prev, [f.id]: { ...s, acceso: e.target.value } }))}
                />
              </div>

              <div>
                <label style={etiqueta}>Servicios públicos</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '6px 0 8px' }}>
                  {opcionesServicio.map(op => {
                    const activo = s.servicios.includes(op)
                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => toggle(f.id, op)}
                        style={{
                          border: `1.5px solid ${activo ? '#15803D' : '#CBD5E1'}`,
                          background: activo ? '#F0FDF4' : '#fff',
                          color: activo ? '#15803D' : '#475569',
                          borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem',
                          fontWeight: activo ? 800 : 600, cursor: 'pointer',
                        }}
                      >
                        {activo ? '✓ ' : ''}{op}
                      </button>
                    )
                  })}
                </div>
                <input
                  style={input}
                  value={s.extra}
                  placeholder="Otros, separados por coma (ej.: Panel solar, Tanque de reserva de 5.000 L)"
                  onChange={e => setEstado(prev => ({ ...prev, [f.id]: { ...s, extra: e.target.value } }))}
                />
              </div>
            </section>
          )
        })}
      </div>

      <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #E2E8F0', padding: '1rem 0', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={guardar}
          disabled={guardando}
          style={{
            background: '#0D2D5E', color: '#fff', fontWeight: 800, fontSize: '0.92rem',
            padding: '0.7rem 1.6rem', borderRadius: 10, border: 'none',
            cursor: guardando ? 'wait' : 'pointer', opacity: guardando ? 0.6 : 1,
          }}
        >
          {guardando ? 'Guardando…' : `Guardar las ${filas.length} fichas`}
        </button>
        {mensaje && <span style={{ fontSize: '0.88rem', fontWeight: 700, color: mensaje.startsWith('✓') ? '#15803D' : '#B91C1C' }}>{mensaje}</span>}
      </div>
    </>
  )
}
