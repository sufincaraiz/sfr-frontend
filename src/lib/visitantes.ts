import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Enlace privado del dueño: /visitantes/<token> + PIN.
//
// Dos factores porque detrás hay cédulas. El token va en la URL (algo que se
// tiene) y el PIN se comparte por otro canal (algo que se sabe). Si el enlace se
// reenvía por error en un grupo de WhatsApp, el PIN sigue tapando los datos.
//
// TODO el filtrado de campos ocurre aquí, en el servidor. El dueño tiene un
// interés legítimo en saber QUIÉN entró a su propiedad — nombre, documento y
// fecha — pero el correo, el celular y el municipio de procedencia son de uso
// interno de Su Finca Raíz y no salen nunca hacia él. La política de tratamiento
// lo dice explícitamente, así que la promesa se cumple en el borde del servidor
// y no confiando en que el cliente no los pinte.
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!

/** Tope de intentos fallidos acumulados antes de bloquear el enlace por completo. */
export const TOPE_INTENTOS = 10

/** Duración de la sesión que se abre tras acertar el PIN. */
const SESION_HORAS = 2

export const DIAS_VIGENCIA = 365

// ─── Creación ────────────────────────────────────────────────────────────────

/** Token de 32 bytes aleatorios en base64url: 256 bits, no se adivina. */
export function generarToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function hashearPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

/** El PIN debe ser de 4 a 10 dígitos. Devuelve el error o null si está bien. */
export function validarPin(pin: unknown): string | null {
  if (typeof pin !== 'string' || !/^\d{4,10}$/.test(pin)) {
    return 'El PIN debe tener entre 4 y 10 dígitos.'
  }
  return null
}

// ─── Estado de un enlace ─────────────────────────────────────────────────────

export type EstadoEnlace = 'activo' | 'revocado' | 'expirado' | 'bloqueado'

export function estadoDe(e: {
  revocado: boolean
  expiraAt: Date
  intentosFallidos: number
}): EstadoEnlace {
  if (e.revocado) return 'revocado'
  if (e.expiraAt.getTime() < Date.now()) return 'expirado'
  if (e.intentosFallidos >= TOPE_INTENTOS) return 'bloqueado'
  return 'activo'
}

/**
 * Busca el enlace por token y dice si sirve. A quien pregunta se le responde
 * siempre lo mismo cuando NO sirve: no se distingue "no existe" de "expiró" ni
 * de "revocado", porque esa diferencia le diría a un curioso si acertó un token
 * válido. Quien llama solo recibe el enlace o null.
 */
export async function buscarEnlaceUsable(token: string) {
  if (!token || token.length < 20) return null
  const enlace = await prisma.enlaceVisitantes.findUnique({
    where: { token },
    include: {
      propiedad: {
        select: { id: true, slug: true, title: true, municipality: { select: { name: true } } },
      },
    },
  })
  if (!enlace) return null
  return estadoDe(enlace) === 'activo' ? enlace : null
}

// ─── PIN ─────────────────────────────────────────────────────────────────────

/**
 * Compara el PIN contra el hash. bcrypt.compare es de tiempo constante respecto
 * al contenido, así que no filtra información por cuánto tarda.
 *
 * Acertar resetea el contador de fallos; fallar lo incrementa. El contador es
 * ACUMULADO y no se limpia solo: junto al rate limit por ventana, evita que
 * alguien pruebe 5 PINs cada 10 minutos indefinidamente. Al llegar al tope el
 * enlace queda bloqueado y el admin tiene que regenerarlo — preferimos molestar
 * al dueño antes que arriesgar una cédula.
 */
export async function verificarPin(
  enlaceId: string,
  pinHash: string,
  pin: string
): Promise<boolean> {
  const ok = await bcrypt.compare(pin, pinHash)

  if (ok) {
    await prisma.enlaceVisitantes.update({
      where: { id: enlaceId },
      data: { ultimoAcceso: new Date(), intentosFallidos: 0 },
    })
  } else {
    await prisma.enlaceVisitantes.update({
      where: { id: enlaceId },
      data: { intentosFallidos: { increment: 1 } },
    })
  }

  return ok
}

// ─── Sesión posterior al PIN ─────────────────────────────────────────────────

export const COOKIE_SESION = 'visitantes_sesion'

interface SesionVisitantes {
  enlaceId: string
  scope: 'visitantes'
}

/**
 * JWT corto atado a UN enlace. `scope` lo separa de los tokens del admin: aunque
 * compartan secreto, este no sirve para entrar al panel ni al revés.
 */
export function crearSesion(enlaceId: string): string {
  const payload: SesionVisitantes = { enlaceId, scope: 'visitantes' }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESION_HORAS}h` })
}

export function verificarSesion(token: string | undefined, enlaceId: string): boolean {
  if (!token) return false
  try {
    const p = jwt.verify(token, JWT_SECRET) as Partial<SesionVisitantes>
    // La sesión vale solo para el enlace que la abrió: tener el PIN de una
    // propiedad no puede abrir la lista de otra.
    return p.scope === 'visitantes' && p.enlaceId === enlaceId
  } catch {
    return false
  }
}

export const MAX_EDAD_COOKIE = SESION_HORAS * 60 * 60

// ─── Datos que SÍ puede ver el dueño ─────────────────────────────────────────

export interface VisitanteVisible {
  id: string
  nombresCompletos: string
  cedula: string
  fecha: string
}

/**
 * Visitas de UNA propiedad, reducidas a los tres campos que el dueño puede ver.
 *
 * El `select` es la garantía: correo, celular y municipioOrigen ni siquiera se
 * leen de la base, así que no hay forma de que se cuelen en una respuesta por
 * descuido. Las visitas "Otro" (inmuebles de colegas) no tienen propiedadId, de
 * modo que nunca caen aquí.
 */
export async function visitantesDe(propiedadId: string): Promise<VisitanteVisible[]> {
  const visitas = await prisma.visita.findMany({
    where: { propiedadId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, nombresCompletos: true, cedula: true, createdAt: true },
  })
  return visitas.map(v => ({
    id: v.id,
    nombresCompletos: v.nombresCompletos,
    cedula: v.cedula,
    fecha: v.createdAt.toISOString(),
  }))
}
