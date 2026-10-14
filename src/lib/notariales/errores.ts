/**
 * CLASIFICACIÓN DE CAUSAS — módulo HOJA
 * =====================================
 *
 * «No se pudo guardar» ya costó un diagnóstico equivocado en el módulo de
 * gastos: un mensaje que junta causas distintas es una lupa opaca. Peor aún en
 * el caso que trajo este archivo, el 2026-10-14: la siembra del año **sí había
 * escrito** 19 conceptos y el mensaje decía «no se pudo crear». No solo
 * agrupaba: mentía sobre el resultado.
 *
 * Aquí cada causa es una rama con su frase, y la rama final **dice que no
 * sabe**. Un «falló por una causa que no supimos clasificar» es honesto y pide
 * el log; un «no se pudo guardar» suena a que el dato no se escribió, y puede
 * haberse escrito.
 *
 * Vive como función pura, sin `NextResponse` ni `server-only`, para poder
 * probarla en el arnés: una clasificación de errores que nadie prueba acaba
 * teniendo todas las ramas menos la que hace falta.
 */

export type CausaDeError =
  | 'GUARDA_DEL_MODULO'
  | 'TABLA_FALTANTE'
  | 'YA_EXISTE'
  | 'BASE_NO_RESPONDE'
  | 'ARCHIVO_FALTANTE'
  | 'SIN_CLASIFICAR'

export interface ErrorClasificado {
  error: string
  causa: CausaDeError
  status: number
}

/** Los nombres de las guardas del módulo, que ya traen su propio mensaje. */
const GUARDAS = ['ErrorEsquemaNotarial', 'RespaldoNoOficial', 'AnioNoPublicable', 'FueraDeVigencia', 'ErrorDeEntrada', 'ErrorBloqueCotejo', 'SinReglaAplicable']

export function clasificarError(e: unknown, donde: string): ErrorClasificado {
  const err = e as { name?: string; code?: string; message?: string; meta?: { table?: string } }
  const nombre = String(err?.name ?? '')
  const codigo = String(err?.code ?? '')
  const mensaje = String(err?.message ?? '')

  // Una guarda del módulo ya explica qué hay que resolver: se pasa tal cual.
  if (GUARDAS.includes(nombre)) {
    return { error: mensaje, causa: 'GUARDA_DEL_MODULO', status: 409 }
  }

  // La tabla no existe: la migración no está aplicada en la base que usa este
  // proceso. Que es distinto de «está aplicada», porque la nota de
  // prisma/migraciones-aplicadas/ no es una lectura de la base.
  if (codigo === 'P2021' || mensaje.includes('does not exist in the current database')) {
    return {
      error: `Falta una tabla en la base (${err?.meta?.table ?? 'sin nombre'}). La migración de ` +
        'este módulo no está aplicada en la base que usa esta aplicación.',
      causa: 'TABLA_FALTANTE',
      status: 500,
    }
  }

  // Unicidad. No es un fallo: es un estado, y hay que decir que no se tocó nada.
  if (codigo === 'P2002') {
    return {
      error: 'Ese registro ya existe. No se creó uno nuevo, y el que había no se modificó.',
      causa: 'YA_EXISTE',
      status: 409,
    }
  }

  // No se llegó a la base: red o credenciales, no datos.
  if (codigo === 'P1001' || codigo === 'P1017' || codigo === 'P1000') {
    return {
      error: 'La base de datos no respondió. No es un problema de lo que enviaste: inténtalo otra ' +
        'vez, y si sigue, hay que revisar la conexión.',
      causa: 'BASE_NO_RESPONDE',
      status: 503,
    }
  }

  // Un archivo que el código esperaba leer y no llegó al servidor.
  if (codigo === 'ENOENT') {
    return {
      error: 'Falta en el servidor un archivo que esta pantalla necesita leer. No es un problema ' +
        'de lo que escribiste.',
      causa: 'ARCHIVO_FALTANTE',
      status: 500,
    }
  }

  return {
    error: 'Falló por una causa que no supimos clasificar. El detalle técnico quedó en el log del ' +
      `servidor (${donde}).`,
    causa: 'SIN_CLASIFICAR',
    status: 500,
  }
}
