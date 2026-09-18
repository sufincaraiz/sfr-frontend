// Parte PURA de las cifras públicas: tipos, valores por defecto, validación y
// texto. Sin imports de servidor, para que la pantalla de cliente /admin/cifras
// la use sin arrastrar Prisma al navegador. La lectura de la base vive en
// cifras-publicas.ts, que reexporta todo esto.
import { DATOS_OFICIALES } from '@/lib/datos-oficiales'

export interface CifrasPublicas {
  /** Calificación media en Google Business Profile, 0–5. */
  calificacionGoogle: number
  /** Número de opiniones en Google Business Profile. Entero ≥ 0. */
  resenasGoogle: number
  /** Fecha de corte de la cifra, formato AAAA-MM. */
  fechaCorteReputacion: string
}

export const CIFRAS_PUBLICAS_KEY = 'cifras-publicas'

// Valor por defecto = verdad actual, confirmada por el titular. Es lo que se
// sirve mientras no exista la fila y el respaldo si la base no responde. Un solo
// literal de cada cifra en todo el repo: sale de DATOS_OFICIALES.
export const DEFAULT_CIFRAS: CifrasPublicas = {
  calificacionGoogle:   DATOS_OFICIALES.calificacionGoogle,
  resenasGoogle:        DATOS_OFICIALES.resenasGoogle,
  fechaCorteReputacion: DATOS_OFICIALES.fechaCorteReputacion,
}

/**
 * Normaliza y VALIDA lo que llega de la base o del formulario. Un valor fuera de
 * rango no se guarda: cae al valor por defecto. Así una fila corrupta nunca
 * publica una calificación de 7,0 ni un número de reseñas negativo.
 */
export function withDefaultsCifras(data?: Partial<CifrasPublicas> | null): CifrasPublicas {
  const d = DEFAULT_CIFRAS
  if (!data) return d
  const calif =
    typeof data.calificacionGoogle === 'number' &&
    data.calificacionGoogle >= 0 && data.calificacionGoogle <= 5
      ? data.calificacionGoogle
      : d.calificacionGoogle
  const resenas =
    Number.isInteger(data.resenasGoogle) && (data.resenasGoogle as number) >= 0
      ? (data.resenasGoogle as number)
      : d.resenasGoogle
  const fecha =
    typeof data.fechaCorteReputacion === 'string' &&
    /^\d{4}-\d{2}$/.test(data.fechaCorteReputacion)
      ? data.fechaCorteReputacion
      : d.fechaCorteReputacion
  return { calificacionGoogle: calif, resenasGoogle: resenas, fechaCorteReputacion: fecha }
}

/**
 * Cómo se cita SIEMPRE la reputación: nunca el número solo, siempre «X sobre N
 * opiniones en Google». Antes esto era un string horneado (`googleRatingTexto`)
 * con el 26 dentro; ahora se compone en el momento con la cifra viva, para que
 * el número no pueda quedar viejo en un sitio y fresco en otro.
 */
export function textoReputacion(
  c: Pick<CifrasPublicas, 'calificacionGoogle' | 'resenasGoogle'>,
): string {
  const calif = c.calificacionGoogle.toFixed(1).replace('.', ',')
  return `${calif} sobre ${c.resenasGoogle} opiniones en Google`
}

