/**
 * TRAZABILIDAD DEL PDF — módulo HOJA
 * ==================================
 *
 * No hay identificador recuperable: ninguna simulación se guarda. Lo que lleva
 * el PDF es un código que NO sirve para buscarlo en el sistema; sirve para que,
 * con el papel en la mano, se pueda saber con qué reglas se calculó.
 *
 *   SFR-N2026/P07/M01/2026-10-06
 *       │     │   │   └── fecha de la simulación
 *       │     │   └────── versión del motor de cálculo
 *       │     └────────── versión de los parámetros del año
 *       └──────────────── año tarifario
 *
 * La versión de parámetros sube con CUALQUIER escritura sobre el año, sus
 * conceptos, sus tramos o sus reglas, y en la misma transacción. Si subiera
 * aparte, dos PDF calculados con tarifas distintas podrían llevar el mismo
 * código, que es justo lo que el código tiene que impedir.
 */

import { ErrorEsquemaNotarial, VERSION_MOTOR } from './tipos.ts'

const dos = (n: number): string => String(n).padStart(2, '0')

export function codigoTrazabilidad(opciones: {
  anio: number
  version: number
  fecha?: Date
}): string {
  const { anio, version } = opciones
  if (!Number.isInteger(anio) || anio < 2000) {
    throw new ErrorEsquemaNotarial(`Año tarifario inválido: ${anio}.`, 'anio')
  }
  if (!Number.isInteger(version) || version < 1) {
    throw new ErrorEsquemaNotarial(`Versión de parámetros inválida: ${version}.`, 'version')
  }
  const f = opciones.fecha ?? new Date()
  const fecha = `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`
  return `SFR-N${anio}/P${dos(version)}/M${dos(VERSION_MOTOR)}/${fecha}`
}

/**
 * Que el propio documento diga que no se puede recuperar. Sin esta línea,
 * alguien asumirá que «lo tienen en el sistema» y lo pedirá dentro de un año.
 */
export const AVISO_NO_ALMACENADO =
  'Este documento no se almacena; consérvelo si lo necesita.'
