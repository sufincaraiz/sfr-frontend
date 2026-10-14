/**
 * ⚠ ARCHIVO GENERADO. NO SE EDITA A MANO.
 *
 * Sale de PARAMETROS-NOTARIALES-VERIFICADOS.md con:
 *   node scripts/generar-transcripcion.mjs
 *
 * Existe para que el panel NO lea el documento del disco en runtime: eso causó
 * un 500 en producción el 2026-10-14, porque una función serverless no se
 * despliega con el repositorio. La fuente sigue siendo UNA: el documento. Si
 * este archivo se queda viejo, `scripts/verificar-transcripcion.mjs` rompe el
 * build.
 */
import type { FilaTranscrita } from './cotejo'

/** SHA-256 del bloque de cotejo del documento del que salió esto. */
export const HUELLA_DEL_BLOQUE = 'b13440ff4d230e5d7fababbce6174301cc793be2eccb71b2800c9dbf6f5c630f'

export const TRANSCRIPCION: readonly FilaTranscrita[] = [
  {
    concepto: '(anio)',
    campo: 'uvt',
    valor: '52374',
    unidad: 'PESOS',
    articulo: 'Res. DIAN 000238 de 2025, art. 1'
  },
  {
    concepto: '(anio)',
    campo: 'uvb',
    valor: '12110',
    unidad: 'PESOS',
    articulo: 'Res. MinHacienda 3488 de 2025, art. 1'
  },
  {
    concepto: 'acto_sin_cuantia',
    campo: 'valor',
    valor: '90600',
    unidad: 'PESOS',
    articulo: 'art. 2 lit. a)'
  },
  {
    concepto: 'derechos_escritura',
    campo: 'tramo.1.hasta',
    valor: '259300',
    unidad: 'PESOS',
    articulo: 'art. 2 lit. b)'
  },
  {
    concepto: 'derechos_escritura',
    campo: 'tramo.1.valor',
    valor: '30900',
    unidad: 'PESOS',
    articulo: 'art. 2 lit. b)'
  },
  {
    concepto: 'derechos_escritura',
    campo: 'tramo.2.hasta',
    valor: 'abierto',
    unidad: 'PESOS',
    articulo: 'art. 2 lit. b)'
  },
  {
    concepto: 'derechos_escritura',
    campo: 'tramo.2.valor',
    valor: '3',
    unidad: 'POR_MIL',
    articulo: 'art. 2 lit. b)'
  },
  {
    concepto: 'hojas_papel_notarial',
    campo: 'valor',
    valor: '5600',
    unidad: 'PESOS',
    articulo: 'art. 2 parágrafo'
  },
  {
    concepto: 'copias',
    campo: 'valor',
    valor: '700',
    unidad: 'PESOS',
    articulo: 'art. 5'
  },
  {
    concepto: 'copia_autentica',
    campo: 'valor',
    valor: '5600',
    unidad: 'PESOS',
    articulo: 'art. 5'
  },
  {
    concepto: 'autenticaciones',
    campo: 'valor',
    valor: '2800',
    unidad: 'PESOS',
    articulo: 'art. 6'
  },
  {
    concepto: 'biometria',
    campo: 'valor',
    valor: '4800',
    unidad: 'PESOS',
    articulo: 'art. 6'
  },
  {
    concepto: 'firma_digital',
    campo: 'valor',
    valor: '10400',
    unidad: 'PESOS',
    articulo: 'art. 6 parágrafo 2'
  },
  {
    concepto: 'recaudo_sin_cuantia',
    campo: 'tramo.1.hasta',
    valor: 'abierto',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_sin_cuantia',
    campo: 'tramo.1.valor',
    valor: '19300',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_sin_cuantia',
    campo: 'tramo.1.aporte_snr',
    valor: '9650',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_sin_cuantia',
    campo: 'tramo.1.aporte_fondo',
    valor: '9650',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.1.hasta',
    valor: '100000000',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.1.valor',
    valor: '28900',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.1.aporte_snr',
    valor: '14450',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.1.aporte_fondo',
    valor: '14450',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.2.hasta',
    valor: '300000000',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.2.valor',
    valor: '43700',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.2.aporte_snr',
    valor: '21850',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.2.aporte_fondo',
    valor: '21850',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.3.hasta',
    valor: '500000000',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.3.valor',
    valor: '52700',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.3.aporte_snr',
    valor: '26350',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.3.aporte_fondo',
    valor: '26350',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.4.hasta',
    valor: '1000000000',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.4.valor',
    valor: '71900',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.4.aporte_snr',
    valor: '35950',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.4.aporte_fondo',
    valor: '35950',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.5.hasta',
    valor: '1500000000',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.5.valor',
    valor: '84800',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.5.aporte_snr',
    valor: '42400',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.5.aporte_fondo',
    valor: '42400',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.6.hasta',
    valor: 'abierto',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.6.valor',
    valor: '96400',
    unidad: 'PESOS',
    articulo: 'art. 50'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.6.aporte_snr',
    valor: '48200',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'recaudo_snr',
    campo: 'tramo.6.aporte_fondo',
    valor: '48200',
    unidad: 'PESOS',
    articulo: 'art. 50 parágrafo'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.1.hasta',
    valor: '12852101',
    unidad: 'PESOS',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.1.valor',
    valor: '53100',
    unidad: 'PESOS',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.2.hasta',
    valor: '192778606',
    unidad: 'PESOS',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.2.valor',
    valor: '9.11',
    unidad: 'POR_MIL',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.3.hasta',
    valor: '334149656',
    unidad: 'PESOS',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.3.valor',
    valor: '11.31',
    unidad: 'POR_MIL',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.4.hasta',
    valor: '494798857',
    unidad: 'PESOS',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.4.valor',
    valor: '12.60',
    unidad: 'POR_MIL',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.5.hasta',
    valor: 'abierto',
    unidad: 'PESOS',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'derechos_orip',
    campo: 'tramo.5.valor',
    valor: '13.33',
    unidad: 'POR_MIL',
    articulo: 'art. 1 lit. b)'
  },
  {
    concepto: 'sistematizacion',
    campo: 'valor',
    valor: '2',
    unidad: 'PORCENTAJE',
    articulo: 'parágrafo 8'
  },
  {
    concepto: 'certificado_tradicion',
    campo: 'valor',
    valor: '24300',
    unidad: 'PESOS',
    articulo: 'art. 14 a)'
  }
] as const
