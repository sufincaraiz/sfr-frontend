/**
 * DATOS DE LA EMPRESA PARA REPORTES TRIBUTARIOS — única fuente
 * ============================================================
 *
 * Todo reporte que se entregue al contador (Excel, PDF, enlace de consulta)
 * arma su encabezado con `encabezadoReporte()`. Nadie escribe el NIT a mano.
 *
 * DATO PENDIENTE ≠ DATO VACÍO. Mientras el NIT no esté cargado, el encabezado
 * no lo omite: pone «PENDIENTE» a la vista y declara el reporte NO válido para
 * una declaración. Un reporte sin NIT que sale en silencio no sirve para
 * declarar y nadie lo nota hasta que el contador lo devuelve.
 *
 * Módulo HOJA sin imports: lo usan la pantalla, el servidor y la prueba con Node.
 */

export interface DatosEmpresa {
  nombreComercial: string
  /** null = pendiente de confirmar con el titular. */
  razonSocial: string | null
  /** Sin dígito de verificación, solo dígitos. null = pendiente. */
  nit: string | null
  /** Dígito de verificación DIAN. Se valida contra `nit`. */
  dv: string | null
  matriculaMercantil: string
  domicilio: string
}

export const EMPRESA: DatosEmpresa = {
  nombreComercial: 'Su Finca Raíz',
  razonSocial: null,
  nit: null,
  dv: null,
  matriculaMercantil: '199483',
  domicilio: 'La Vega, Cundinamarca',
}

export const MARCA_PENDIENTE = '⚠ PENDIENTE'

/**
 * Un NIT PENDIENTE se tolera (el reporte sale marcado no válido). Un NIT MAL
 * ESCRITO no: con dígito de verificación errado, cada declaración que lo lleve
 * es un documento inservible, y además parece completo. Por eso no se avisa:
 * se rechaza. La llama next.config.ts, que corre al arrancar cada `next build`
 * y `next dev`: un NIT malo rompe el build y no llega a producción. Probado
 * rompiéndolo (el primer intento, un throw al cargar este módulo, NO rompía).
 */
export function exigirNitValido(e: DatosEmpresa): void {
  if (e.nit === null && e.dv === null) return
  if (e.nit === null || e.dv === null) {
    throw new Error(`EMPRESA: NIT y dígito de verificación van juntos (nit=${e.nit}, dv=${e.dv}).`)
  }
  if (!/^\d{6,15}$/.test(e.nit)) throw new Error(`EMPRESA: NIT «${e.nit}» — solo dígitos, sin puntos, guion ni DV.`)
  const esperado = digitoVerificacion(e.nit)
  if (e.dv !== esperado) {
    throw new Error(`EMPRESA: NIT ${e.nit}-${e.dv} rechazado: el dígito de verificación DIAN es ${esperado}. Revisa el RUT.`)
  }
}

/** Dígito de verificación del NIT según el algoritmo módulo 11 de la DIAN. */
export function digitoVerificacion(nit: string): string {
  if (!/^\d{1,15}$/.test(nit)) throw new Error(`NIT «${nit}»: solo dígitos, sin puntos ni DV.`)
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  const suma = nit.split('').reverse().reduce((s, d, i) => s + Number(d) * pesos[i]!, 0)
  const r = suma % 11
  return String(r > 1 ? 11 - r : r)
}

/** Lista de lo que falta para que un reporte sirva para declarar. */
export function faltantesEmpresa(e: DatosEmpresa = EMPRESA): string[] {
  const f: string[] = []
  if (!e.nit) f.push('NIT')
  else if (!e.dv) f.push('Dígito de verificación del NIT')
  else if (digitoVerificacion(e.nit) !== e.dv) f.push(`NIT ${e.nit}-${e.dv}: el dígito de verificación no corresponde (debería ser ${digitoVerificacion(e.nit)})`)
  if (!e.razonSocial) f.push('Razón social')
  return f
}

const miles = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export interface Encabezado {
  lineas: { etiqueta: string; valor: string; pendiente: boolean }[]
  faltantes: string[]
  validoParaDeclarar: boolean
  /** Aviso a imprimir en el reporte cuando no es válido. null si lo es. */
  aviso: string | null
}

export function encabezadoReporte(periodo: string, generadoEn: Date, e: DatosEmpresa = EMPRESA): Encabezado {
  const faltantes = faltantesEmpresa(e)
  const nitOk = !faltantes.some(f => f.startsWith('NIT') || f.startsWith('Dígito'))
  const lineas = [
    { etiqueta: 'Razón social', valor: e.razonSocial ?? MARCA_PENDIENTE, pendiente: !e.razonSocial },
    { etiqueta: 'NIT', valor: nitOk ? `${miles(e.nit!)}-${e.dv}` : MARCA_PENDIENTE, pendiente: !nitOk },
    { etiqueta: 'Nombre comercial', valor: e.nombreComercial, pendiente: false },
    { etiqueta: 'Matrícula mercantil', valor: e.matriculaMercantil, pendiente: false },
    { etiqueta: 'Domicilio', valor: e.domicilio, pendiente: false },
    { etiqueta: 'Periodo', valor: periodo, pendiente: false },
    { etiqueta: 'Generado', valor: generadoEn.toISOString().slice(0, 16).replace('T', ' ') + ' UTC', pendiente: false },
  ]
  return {
    lineas,
    faltantes,
    validoParaDeclarar: faltantes.length === 0,
    aviso: faltantes.length
      ? `REPORTE NO VÁLIDO PARA DECLARAR — faltan datos de la empresa: ${faltantes.join('; ')}.`
      : null,
  }
}

