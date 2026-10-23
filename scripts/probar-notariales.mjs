#!/usr/bin/env node
/**
 * PRUEBA DEL MOTOR DE GASTOS NOTARIALES.
 *
 * Ejercita el código REAL (módulos hoja, sin alias `@/`), no una copia.
 *
 * ⚠⚠ LAS TARIFAS DE ESTE ARCHIVO SON INVENTADAS. No son las tarifas de 2026, no
 * salen de ninguna resolución y NO PUEDEN COPIARSE A LA SIEMBRA. Existen para
 * poder probar aritmética y guardas sin esperar los PDF oficiales. La siembra
 * real (`CONCEPTOS_V1`) nace con `valor: null` y `tramos: []`, y así tiene que
 * seguir hasta que el titular cargue cada resolución desde el panel.
 */
import {
  evaluarTramos, evaluarTramosCrudo, verificarTramos, repartir, alPeso, redondear,
  exigirCamposConocidosDelTramo, tramoQueAplica,
} from '../src/lib/notariales/tramos.ts'
import { hashDeBytes, huellaDelBloque } from '../src/lib/notariales/huella.ts'
import { clasificarFirma, exigirFirma } from '../src/lib/notariales/firma.ts'
import { DIVISOR, divisorDe } from '../src/lib/escala-tarifa.ts'
import {
  calcularBaseNotarial, calcularBaseRetencion, calcularBaseTimbre, BASES,
} from '../src/lib/notariales/bases.ts'
import { calcularRetencion, verificarReglas, exigirValorDeCondicion, CAMPOS_CONDICION ,
  exigirContextoConocido,
} from '../src/lib/notariales/retencion.ts'
import {
  esFuenteOficial, exigirRespaldoOficial, verificarEsquema, verificarConcepto,
  pendientesParaActivar, resumenDePendientes, exigirAnioPublicable, divergenciaUvt, copiarAnio,
  SIN_PANTALLA,
  exigirOrdenDeDerivados,
  esFechaIso, cubreLaFecha, exigirVigencia,
  esHashSha256, tipoDeEvidencia, fuenteDelRespaldo, citaPublica,
} from '../src/lib/notariales/guardas.ts'
import { CONCEPTOS_V1, FUENTES_OFICIALES, camposExigidos } from '../src/lib/notariales/catalogo.ts'
import { liquidar } from '../src/lib/notariales/calculo.ts'
import { liquidarIva } from '../src/lib/notariales/iva.ts'
import { codigoTrazabilidad, AVISO_NO_ALMACENADO } from '../src/lib/notariales/trazabilidad.ts'
import { CRITERIOS_ADOPTADOS } from '../src/lib/notariales/iva.ts'
import { FRASE_EVIDENCIA } from '../src/lib/notariales/tipos.ts'
import { clasificarError } from '../src/lib/notariales/errores.ts'
import { ErrorEsquemaNotarial } from '../src/lib/notariales/tipos.ts'
import {
  leerBloqueCotejo, compararCotejo, resumirCotejo, normalizarValor,
  veredictoPorSeccion, avance, PENDIENTE,
} from '../src/lib/notariales/cotejo.ts'
import { valoresDesdeAnio, exigirEditable, subirVersion } from '../src/lib/notariales/datos.ts'
import { readFileSync } from 'node:fs'
import { calcularBaseRegistro, calcularBaseOrip } from '../src/lib/notariales/bases.ts'
import { VERSION_MOTOR } from '../src/lib/notariales/tipos.ts'

let ok = 0, fail = 0
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`) }
}
/** Prueba que algo LANZA, y que lanza lo que debe. */
const lanza = (nombre, fn, nombreError = 'ErrorEsquemaNotarial', trozo = '') => {
  try {
    fn()
    check(nombre, false, '(NO lanzó — la guarda no sirve)')
  } catch (e) {
    const bien = e.name === nombreError && (!trozo || e.message.includes(trozo))
    check(`${nombre} → lanza`, bien, `(lanzó ${e.name}: ${e.message})`)
  }
}

/** Redondeo al peso, para las pruebas que no van sobre el redondeo. */
const PESO = { unidad: 1, modo: 'CERCANO' }
/** Compara con tolerancia: los decimales de un 3 por mil no son exactos en binario. */
const cerca = (a, b) => Math.abs(a - b) < 0.005

// La transcripción del PDF, que es la OTRA lectura. Se usa en todo el arnés:
// desde el 2026-10-14 el catálogo no siembra ninguna cifra, así que las tablas
// de prueba se reconstruyen desde aquí y no desde una copia en el código.
const BLOQUE_REAL = leerBloqueCotejo(readFileSync('PARAMETROS-NOTARIALES-VERIFICADOS.md', 'utf8'))

const TRAMOS_50_DESDE_BLOQUE = (() => {
  const filas = BLOQUE_REAL.filter(f => f.concepto === 'recaudo_snr')
  const n = Math.max(...filas.map(f => Number(f.campo.split('.')[1])))
  const dato = (i, qué) => filas.find(f => f.campo === `tramo.${i}.${qué}`)?.valor
  let desde = 0
  const out = []
  for (let i = 1; i <= n; i++) {
    const hasta = dato(i, 'hasta')
    out.push({
      orden: i, desde, hasta: hasta === 'abierto' ? null : Number(hasta),
      modo_calculo: 'FIJO', valor: Number(dato(i, 'valor')), unidad: 'PESOS',
      aporte_snr: Number(dato(i, 'aporte_snr')), aporte_fondo: Number(dato(i, 'aporte_fondo')),
    })
    desde = hasta === 'abierto' ? desde : Number(hasta)
  }
  return out
})()

const RESP = (campo, url = 'https://www.supernotariado.gov.co/resolucion.pdf') => ({
  campo, norma: 'Resolución RES-2026-000964-6 (cifras INVENTADAS para la prueba)',
  articulo: 'art. 50', url, fecha_norma: '2026-01-20',
  // Art. 56: rige desde el 1 de febrero de 2026. No desde el 1 de enero.
  vigencia_desde: '2026-02-01', vigencia_hasta: null, articulo_vigencia: 'art. 56',
  verificado_en: '2026-10-06', verificado_por: 'prueba',
})

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ FUENTES: una tarifa no se respalda con un blog ══')
// ─────────────────────────────────────────────────────────────────────────────
check('acepta un PDF de la Superintendencia',
  !!esFuenteOficial('https://www.supernotariado.gov.co/x.pdf', FUENTES_OFICIALES))
check('acepta un subdominio oficial',
  !!esFuenteOficial('https://servicios.supernotariado.gov.co/x.pdf', FUENTES_OFICIALES))
check('RECHAZA el sitio comercial del que salen todas las cifras que circulan',
  esFuenteOficial('https://gastosnotariales.co/tarifas', FUENTES_OFICIALES) === null)
check('RECHAZA la tabla publicada por una notaría particular',
  esFuenteOficial('https://www.notaria19bogota.com/tarifas-notariales-2026/', FUENTES_OFICIALES) === null)
check('RECHAZA http sin cifrar', esFuenteOficial('http://www.dian.gov.co/x.pdf', FUENTES_OFICIALES) === null)
check('RECHAZA un dominio que solo CONTIENE el oficial',
  esFuenteOficial('https://supernotariado.gov.co.falso.com/x', FUENTES_OFICIALES) === null)
lanza('un respaldo sin quién verificó',
  () => exigirRespaldoOficial({ ...RESP('valor'), verificado_por: '' }, FUENTES_OFICIALES),
  'RespaldoNoOficial')
lanza('un respaldo de tipo enlace que no trae url',
  () => exigirRespaldoOficial({ ...RESP('valor'), url: null }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'no tiene url')
lanza('…ni con la url en blanco',
  () => exigirRespaldoOficial({ ...RESP('valor'), url: '   ' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'no tiene url')
lanza('un respaldo que no dice desde cuándo rige la norma',
  () => exigirRespaldoOficial({ ...RESP('valor'), vigencia_desde: undefined }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'desde cuándo rige')
lanza('un respaldo con fecha de vigencia ilegible',
  () => exigirRespaldoOficial({ ...RESP('valor'), vigencia_desde: '1 de febrero' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'desde cuándo rige')
lanza('un respaldo derogado antes de empezar a regir',
  () => exigirRespaldoOficial({ ...RESP('valor'), vigencia_hasta: '2026-01-01' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'antes de empezar a regir')
lanza('un respaldo con URL comercial',
  () => exigirRespaldoOficial(RESP('valor', 'https://gastosnotariales.co/t'), FUENTES_OFICIALES),
  'RespaldoNoOficial')
// ── Una COMPILACIÓN no es la entidad emisora ───────────────────────────────
const CANCILLERIA = FUENTES_OFICIALES.find(f => f.dominio === 'cancilleria.gov.co')
check('cancilleria.gov.co está en la lista blanca', !!CANCILLERIA)
check('…marcada como compilación', CANCILLERIA.es_compilacion === true)
check('…con su advertencia y el Diario Oficial donde está el texto auténtico',
  /Diario Oficial 53\.444/.test(CANCILLERIA.advertencia ?? ''))
check('…y con constancia de quién la añadió y cuándo',
  CANCILLERIA.agregada_por === 'titular' && CANCILLERIA.agregada_en === '2026-10-13')
const URL_COMP = 'https://cancilleria.gov.co/normograma/compilacion/docs/resolucion_superregistro_17266_2026.htm'
lanza('un respaldo que cita la compilación SIN nota',
  () => exigirRespaldoOficial({ ...RESP('tramos', URL_COMP), nota: null }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'es una COMPILACIÓN')
check('…y con la nota, pasa',
  (() => { exigirRespaldoOficial({ ...RESP('tramos', URL_COMP),
    nota: 'Compilación consultada el 2026-10-13. Texto auténtico en el Diario Oficial 53.444.' },
    FUENTES_OFICIALES); return true })())
check('a supernotariado, que SÍ es la emisora, no se le exige nota',
  (() => { exigirRespaldoOficial(RESP('tramos'), FUENTES_OFICIALES); return true })())
check('una autoridad sin constancia de quién la añadió NO sirve',
  esFuenteOficial('https://www.dian.gov.co/x.pdf',
    FUENTES_OFICIALES.map(f => f.dominio === 'dian.gov.co' ? { ...f, agregada_por: '' } : f)) === null)
check('…ni con una fecha de alta ilegible',
  esFuenteOficial('https://www.dian.gov.co/x.pdf',
    FUENTES_OFICIALES.map(f => f.dominio === 'dian.gov.co' ? { ...f, agregada_en: 'ayer' } : f)) === null)

check('una fuente oficial DESACTIVADA deja de servir',
  esFuenteOficial('https://www.dian.gov.co/x.pdf',
    FUENTES_OFICIALES.map(f => f.dominio === 'dian.gov.co' ? { ...f, activo: false } : f)) === null)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ EVIDENCIA: UN PDF FIRMADO VALE, UN BLOG NO ══')
// ─────────────────────────────────────────────────────────────────────────────
// La URL nunca fue el requisito: era un sustituto de la procedencia. La
// compilación de la Cancillería TIENE enlace y es peor evidencia que el PDF
// firmado de la resolución. Lo que se amplía es el soporte, no la autoridad.
const DOC = {
  campo: 'tramos',
  norma: 'Resolución RES-2026-000964-6',
  articulo: 'art. 50',
  tipo_evidencia: 'DOCUMENTO_ARCHIVADO',
  fuente_dominio: 'supernotariado.gov.co',
  documento_ruta: 'normas/2026/res-2026-000964-6.pdf',
  documento_hash: 'a'.repeat(64),
  entidad_emisora: 'Superintendencia de Notariado y Registro',
  obtenido_de: 'Entregado en ventanilla, con firma, radicado y sellos de aprobación.',
  obtenido_en: '2026-10-13',
  archivado_por: 'titular',
  donde_conseguirlo: 'Se solicita en la Superintendencia de Notariado y Registro ' +
    'o se consulta en el Diario Oficial.',
  vigencia_desde: '2026-02-01',
  articulo_vigencia: 'art. 56',
  verificado_en: '2026-10-13',
  verificado_por: 'titular',
}
check('un documento archivado, completo, SÍ respalda',
  (() => { exigirRespaldoOficial(DOC, FUENTES_OFICIALES); return true })())
check('…sin necesidad de URL', !DOC.url)
check('el tipo por defecto sigue siendo el enlace',
  tipoDeEvidencia({ ...DOC, tipo_evidencia: undefined }) === 'URL_OFICIAL')
for (const [campo, trozo] of [
  ['documento_ruta', 'dónde quedó archivado'],
  ['entidad_emisora', 'qué entidad lo emitió'],
  ['obtenido_de', 'de dónde se obtuvo'],
  ['archivado_por', 'quién lo archivó'],
]) {
  lanza(`un documento archivado sin ${campo}`,
    () => exigirRespaldoOficial({ ...DOC, [campo]: null }, FUENTES_OFICIALES),
    'RespaldoNoOficial', trozo)
}
lanza('un documento archivado sin hash',
  () => exigirRespaldoOficial({ ...DOC, documento_hash: null }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'sustituir el archivo no dejaría rastro')
lanza('…ni con un hash a medias',
  () => exigirRespaldoOficial({ ...DOC, documento_hash: 'abc123' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'hash SHA-256')
check('el hash se valida como 64 hexadecimales',
  esHashSha256('f'.repeat(64)) && !esHashSha256('F'.repeat(64)) &&
  !esHashSha256('a'.repeat(63)) && !esHashSha256('z'.repeat(64)))
lanza('un documento archivado sin la fecha en que se obtuvo',
  () => exigirRespaldoOficial({ ...DOC, obtenido_en: 'ayer' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'cuándo se obtuvo')
lanza('un documento archivado que no dice de qué autoridad es',
  () => exigirRespaldoOficial({ ...DOC, fuente_dominio: null }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'no trae dominio')

// LO QUE NO CAMBIA: la autoridad. Se amplía el soporte y nada más.
lanza('un PDF de una notaría particular NO es evidencia',
  () => exigirRespaldoOficial({ ...DOC, fuente_dominio: 'notaria19bogota.com' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'no corresponde a una autoridad oficial activa')
lanza('…ni de un sitio comercial',
  () => exigirRespaldoOficial({ ...DOC, fuente_dominio: 'gastosnotariales.co' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'venga como enlace o como PDF')
lanza('…ni con la autoridad desactivada en la tabla',
  () => exigirRespaldoOficial(DOC,
    FUENTES_OFICIALES.map(f => f.dominio === 'supernotariado.gov.co' ? { ...f, activo: false } : f)),
  'RespaldoNoOficial', 'no corresponde a una autoridad oficial activa')
check('la autoridad de un documento se resuelve contra la MISMA tabla',
  fuenteDelRespaldo(DOC, FUENTES_OFICIALES)?.dominio === 'supernotariado.gov.co')
lanza('un respaldo que dice ser de una entidad y enlaza a otra',
  () => exigirRespaldoOficial({ ...DOC, url: 'https://www.dian.gov.co/x.pdf' }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'y su enlace es de')
check('a un documento archivado no se le exige la nota de compilación',
  (() => { exigirRespaldoOficial({ ...DOC, fuente_dominio: 'cancilleria.gov.co', nota: null },
    FUENTES_OFICIALES); return true })())

lanza('un documento archivado que no dice dónde lo consigue el lector',
  () => exigirRespaldoOficial({ ...DOC, donde_conseguirlo: null }, FUENTES_OFICIALES),
  'RespaldoNoOficial', 'dónde puede conseguirlo')

// Y EL PDF DE LA SIMULACIÓN DICE CUÁL DE LOS DOS FUE.
check('las dos frases existen y son distintas',
  FRASE_EVIDENCIA.URL_OFICIAL === 'enlace oficial' &&
  FRASE_EVIDENCIA.DOCUMENTO_ARCHIVADO === 'documento oficial archivado')

// ── NUNCA UN ENLACE A NUESTRO DOMINIO COMO FUENTE DE LA NORMA ──────────────
// El PDF se archiva como authenticated: publicar una copia de una norma que no
// emitimos nos convertiría en un sitio desde el que citarla, y cuando la
// entidad la modifique —como la registral a los diez días— nuestra copia diría
// lo viejo con nuestra marca encima.
const CITA_DOC = citaPublica(DOC)
check('un documento archivado NO lleva enlace', CITA_DOC.enlace === null)
check('…ni menciona la ruta de nuestra copia',
  !CITA_DOC.cita.includes('normas/2026') && !/sufincaraiz/i.test(CITA_DOC.cita))
check('…nombra la norma y el artículo', /RES-2026-000964-6/.test(CITA_DOC.cita) && /art\. 50/.test(CITA_DOC.cita))
check('…la entidad emisora', /Superintendencia de Notariado y Registro/.test(CITA_DOC.cita))
check('…la fecha de verificación', /verificada contra el documento oficial el 2026-10-13/.test(CITA_DOC.cita))
check('…y dónde lo consigue el lector por su cuenta',
  /Diario Oficial/.test(CITA_DOC.cita), `(${CITA_DOC.cita})`)

const CITA_URL = citaPublica(RESP('tramos'))
check('un respaldo de enlace SÍ lleva el enlace',
  CITA_URL.enlace === 'https://www.supernotariado.gov.co/resolucion.pdf')
check('…y el enlace es del dominio de la autoridad, no del nuestro',
  !/sufincaraiz/i.test(CITA_URL.enlace))
lanza('una cita que apunte a nuestro dominio se rechaza',
  () => citaPublica({ ...RESP('tramos'), url: 'https://www.sufincaraiz.com.co/normas/res.pdf' }),
  'ErrorEsquemaNotarial', 'no se cita desde nuestro sitio')
lanza('…y una que exponga la ruta de la copia archivada, también',
  () => citaPublica({ ...DOC, donde_conseguirlo: 'Está en normas/2026/res-2026-000964-6.pdf' }),
  'ErrorEsquemaNotarial', 'evidencia interna')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ LA SIEMBRA REAL NACE VACÍA ══')
// ─────────────────────────────────────────────────────────────────────────────
check('son 19 conceptos', CONCEPTOS_V1.length === 19, `(hay ${CONCEPTOS_V1.length})`)

// ── LA SIEMBRA VACÍA ES UNA PROPIEDAD, NO UNA COSTUMBRE ───────────────────
// El 2026-10-14 se vaciaron tres conceptos que traían 29 cifras del PDF. No
// activaban nada —les faltaba el respaldo— pero el cotejo decía «coincide» 29
// veces comparando una copia de la transcripción contra la transcripción, y el
// avance marcaba medio camino antes de que nadie leyera nada dos veces. Un
// indicador que miente cuesta lo mismo en las dos direcciones.
check('NINGÚN concepto nace con valor',
  CONCEPTOS_V1.every(c => c.valor === null || c.valor === undefined),
  `(${CONCEPTOS_V1.filter(c => c.valor !== null && c.valor !== undefined).map(c => c.clave).join()})`)
check('NINGUNO nace con tramos',
  CONCEPTOS_V1.every(c => (c.tramos ?? []).length === 0),
  `(${CONCEPTOS_V1.filter(c => (c.tramos ?? []).length).map(c => c.clave).join()})`)
check('NINGUNO nace con redondeo: también es una cifra de la resolución',
  CONCEPTOS_V1.every(c => !c.redondeo),
  `(${CONCEPTOS_V1.filter(c => c.redondeo).map(c => c.clave).join()})`)
check('NINGUNO nace con respaldo',
  CONCEPTOS_V1.every(c => (c.respaldos ?? []).length === 0))
// Lo que SÍ se queda: las decisiones estructurales. No son lecturas del PDF.
check('las decisiones estructurales sí están, que son el modelo y no una lectura',
  CONCEPTOS_V1.every(c => typeof c.grava_iva === 'boolean' && !!c.sujeto_legal && !!c.motivo_reparto) &&
  CONCEPTOS_V1.find(c => c.clave === 'derechos_escritura').monotonicidad === 'NO_DECRECIENTE')
check('el IVA no es un concepto (es derivado)', !CONCEPTOS_V1.some(c => c.clave === 'iva'))
check('«beneficencia» existe como término coloquial del impuesto de registro',
  CONCEPTOS_V1.find(c => c.clave === 'impuesto_registro').terminos_coloquiales.includes('beneficencia'))
check('…y NO es el nombre de ningún concepto',
  !CONCEPTOS_V1.some(c => /beneficencia/i.test(c.label)))
check('el recaudo SNR es TRAMOS en modo fijo, no un porcentaje',
  CONCEPTOS_V1.find(c => c.clave === 'recaudo_snr').tipo === 'TRAMOS')
check('…y sale de la base del IVA',
  CONCEPTOS_V1.find(c => c.clave === 'recaudo_snr').es_recaudo_terceros === true)
check('la biometría se cobra por persona identificada',
  CONCEPTOS_V1.find(c => c.clave === 'biometria').unidad_label === 'persona identificada')
check('…y NO asume cuántas personas firman',
  CONCEPTOS_V1.find(c => c.clave === 'biometria').cantidad_sugerida === null)
check('la cantidad de biometrías varía por operación, no por notaría',
  CONCEPTOS_V1.find(c => c.clave === 'biometria').cantidad_variable_por_operacion === true &&
  CONCEPTOS_V1.find(c => c.clave === 'biometria').cantidad_variable_por_notaria === false)
check('el valor de la hoja varía por notaría, no por operación',
  CONCEPTOS_V1.find(c => c.clave === 'hojas_papel_notarial').cantidad_variable_por_notaria === true &&
  CONCEPTOS_V1.find(c => c.clave === 'hojas_papel_notarial').cantidad_variable_por_operacion === false)
check('el predial pendiente está en OBLIGACIONES, no entre los costos del trámite',
  CONCEPTOS_V1.find(c => c.clave === 'predial_pendiente').grupo === 'OBLIGACIONES')
check('solo los derechos de escritura afirman una norma de reparto',
  CONCEPTOS_V1.filter(c => c.motivo_reparto === 'NORMA_SUPLETIVA').map(c => c.clave).join() === 'derechos_escritura')
check('el IVA, las hojas y las copias NO afirman norma de reparto',
  ['hojas_papel_notarial', 'copias', 'biometria'].every(k =>
    CONCEPTOS_V1.find(c => c.clave === k).motivo_reparto === 'CONFIGURACION' &&
    CONCEPTOS_V1.find(c => c.clave === k).norma_reparto === null))
check('la retención tiene contribuyente y no se reparte',
  (() => { const c = CONCEPTOS_V1.find(x => x.clave === 'retefuente')
    return c.sujeto_legal === 'VENDEDOR' && c.reparto_editable === false && c.motivo_reparto === 'CONTRIBUYENTE' })())
check('el impuesto de registro es costumbre, no ley',
  CONCEPTOS_V1.find(c => c.clave === 'impuesto_registro').motivo_reparto === 'COSTUMBRE')
check('un concepto de valor libre no exige respaldo de tarifa',
  !camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'predial_pendiente')).includes('valor'))
check('…pero sí exige la norma de quién es el contribuyente',
  camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'predial_pendiente')).includes('sujeto_legal'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ LAS GUARDAS DEL ESQUEMA (rojo: se contradice) ══')
// ─────────────────────────────────────────────────────────────────────────────
const base = CONCEPTOS_V1.find(c => c.clave === 'copias')
lanza('norma supletiva sin norma',
  () => verificarConcepto({ ...base, motivo_reparto: 'NORMA_SUPLETIVA', norma_reparto: null }, null),
  'ErrorEsquemaNotarial', 'no la nombra')
lanza('reparto de configuración CON una norma colgada',
  () => verificarConcepto({ ...base, motivo_reparto: 'CONFIGURACION', norma_reparto: 'Código Civil, art. 1862' }, null),
  'ErrorEsquemaNotarial', 'afirmaría que la ley reparte así')
lanza('contribuyente con reparto editable',
  () => verificarConcepto({ ...base, motivo_reparto: 'CONTRIBUYENTE', reparto_editable: true }, null),
  'ErrorEsquemaNotarial', 'no hay reparto que editar')
lanza('grava IVA y es recaudo para terceros a la vez',
  () => verificarConcepto({ ...base, grava_iva: true, es_recaudo_terceros: true }, null),
  'ErrorEsquemaNotarial', 'a la vez')
lanza('se cobra por unidad y no dice de qué unidad',
  () => verificarConcepto({ ...base, unidad_label: null }, null),
  'ErrorEsquemaNotarial', 'de qué unidad')
lanza('un 3 sin decir si es porcentaje o por mil',
  () => verificarConcepto({ ...base, tipo: 'POR_MIL', valor: 3, unidad: null }, null),
  'ErrorEsquemaNotarial', 'porcentaje o por mil')
lanza('la sistematización sin los derechos de registro en el año',
  () => verificarEsquema({
    anio: 2026, estado: 'BORRADOR', version: 1, cerrado: false, reglas_retencion: [],
    conceptos: [CONCEPTOS_V1.find(c => c.clave === 'sistematizacion')],
  }),
  'ErrorEsquemaNotarial', 'no está en el año')
lanza('el catálogo real SIN reglas de retención (tiene un concepto que las usa)',
  () => verificarEsquema({ anio: 2026, estado: 'BORRADOR', version: 1, cerrado: false, conceptos: CONCEPTOS_V1, reglas_retencion: [] }),
  'ErrorEsquemaNotarial', 'No hay reglas de retención')
check('el catálogo real pasa sus propias guardas',
  (() => { try {
    verificarEsquema({
      anio: 2026, estado: 'BORRADOR', version: 1, cerrado: false, conceptos: CONCEPTOS_V1,
      reglas_retencion: [{ clave: 'general', label: 'Tarifa general', orden: 100, activa: true, tipo_efecto: 'TARIFA', valor_efecto: null, unidad: 'PORCENTAJE', condiciones: [] }],
    })
    return true
  } catch (e) { return `(${e.message})` } })() === true)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TRAMOS: la tabla mal cargada no se activa ══')
// ─────────────────────────────────────────────────────────────────────────────
const T = (o, desde, hasta, modo, valor, unidad, en_uvt = false) =>
  ({ orden: o, desde, hasta, modo_calculo: modo, valor, unidad, en_uvt })

// ORIP: fijo hasta el primer corte y tasa SOBRE EL TOTAL después (inventado).
const ORIP = [
  T(1, 0, 12852101, 'FIJO', 53100, 'PESOS'),
  T(2, 12852101, 192778606, 'TASA_SOBRE_TOTAL', 9.11, 'POR_MIL'),
  T(3, 192778606, null, 'TASA_SOBRE_TOTAL', 11.31, 'POR_MIL'),
]
check('ORIP en el tramo fijo', evaluarTramos(ORIP, 10_000_000, null, 'ORIP', PESO) === 53100)
check('ORIP justo en la frontera usa el tramo fijo', evaluarTramos(ORIP, 12_852_101, null, 'ORIP', PESO) === 53100)
check('ORIP sobre el total (9,11 por mil de 100 M)', evaluarTramos(ORIP, 100_000_000, null, 'ORIP', PESO) === 911_000)
check('ORIP en el tramo abierto', evaluarTramos(ORIP, 1_200_000_000, null, 'ORIP', PESO) === 13_572_000)
check('ORIP pasa la coherencia', (() => { verificarTramos(ORIP, null, 'ORIP'); return true })())

// Timbre: marginal y en UVT (inventado, con la forma real de la norma).
const TIMBRE = [
  T(1, 0, 20000, 'TASA_MARGINAL', 0, 'PORCENTAJE', true),
  T(2, 20000, 50000, 'TASA_MARGINAL', 1.5, 'PORCENTAJE', true),
  T(3, 50000, null, 'TASA_MARGINAL', 3, 'PORCENTAJE', true),
]
check('timbre por debajo del umbral: cero porque la tabla dice cero',
  evaluarTramos(TIMBRE, 100_000_000, 50000, 'TIMBRE', PESO) === 0)
check('timbre justo en el umbral sigue en cero',
  evaluarTramos(TIMBRE, 1_000_000_000, 50000, 'TIMBRE', PESO) === 0)
check('timbre MARGINAL: 1,5 % solo del excedente, no de todo',
  evaluarTramos(TIMBRE, 1_200_000_000, 50000, 'TIMBRE', PESO) === 3_000_000)
// La misma tabla leída SOBRE EL TOTAL, evaluada por el motor: 18 M, no 3 M.
const TIMBRE_MAL = [
  T(1, 0, 20000, 'TASA_SOBRE_TOTAL', 0, 'PORCENTAJE', true),
  T(2, 20000, null, 'TASA_SOBRE_TOTAL', 1.5, 'PORCENTAJE', true),
]
check('…la misma tabla leída sobre el total daría 18 M en vez de 3 M',
  evaluarTramos(TIMBRE_MAL, 1_200_000_000, 50000, 'TIMBRE_MAL', PESO) === 18_000_000)
// 1,5 % de 1.500 M = 22.500.000 · 3 % de 500 M = 15.000.000 · suma 37.500.000.
check('timbre en el tercer tramo acumula el segundo (37.500.000, a mano)',
  evaluarTramos(TIMBRE, 3_000_000_000, 50000, 'TIMBRE', PESO) === 37_500_000)
lanza('tramos en UVT sin UVT cargado', () => evaluarTramos(TIMBRE, 1_200_000_000, null, 'TIMBRE', PESO),
  'ErrorEsquemaNotarial', 'no tiene UVT cargado')

// Derechos notariales: EL ESCALÓN. Lectura literal — fijo + tasa sobre el excedente.
const DERECHOS = [
  T(1, 0, 259300, 'FIJO', 30900, 'PESOS'),
  T(2, 259300, null, 'TASA_MARGINAL', 3, 'POR_MIL'),
]
check('derechos: el mínimo se cobra entero desde el primer peso',
  evaluarTramos(DERECHOS, 200_000, null, 'DERECHOS', PESO) === 30_900)
check('derechos en la frontera: el excedente es cero',
  evaluarTramos(DERECHOS, 259_300, null, 'DERECHOS', PESO) === 30_900)
check('derechos de una finca de 100 M (30.900 + 3 por mil del excedente)',
  evaluarTramos(DERECHOS, 100_000_000, null, 'DERECHOS', PESO) === 330_122,
  `(dio ${evaluarTramos(DERECHOS, 100_000_000, null, 'DERECHOS', PESO)})`)
check('EL ESCALÓN existe: el excedente no iguala al mínimo hasta 10.559.300 exactos',
  evaluarTramos(DERECHOS, 5_000_000, null, 'DERECHOS', PESO) === 45_122 &&
  evaluarTramos(DERECHOS, 10_559_300, null, 'DERECHOS', PESO) === 61_800)
check('la lectura literal pasa la coherencia, incluso declarada no decreciente',
  (() => { verificarTramos(DERECHOS, null, 'derechos', { monotonicidad: 'NO_DECRECIENTE' }); return true })())

// La OTRA lectura de la misma pareja de cifras: tasa sobre el TOTAL.
lanza('la tabla que hace BAJAR la tarifa al pasar la frontera (30.900 → 778)',
  () => verificarTramos([T(1, 0, 259300, 'FIJO', 30900, 'PESOS'), T(2, 259300, null, 'TASA_SOBRE_TOTAL', 3, 'POR_MIL')], null, 'derechos', { monotonicidad: 'NO_DECRECIENTE' }),
  'ErrorEsquemaNotarial', 'la tarifa BAJA')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ FRONTERAS A MANO (valores calculados aparte, NO con la fórmula) ══')
// ─────────────────────────────────────────────────────────────────────────────
// Cada cifra de abajo se calculó a mano: 30.900 + 3 por mil de (base − 259.300).
// Ninguna sale de evaluarTramos, ni de alPeso, ni de la aritmética del motor. Si
// la fórmula del motor cambiara, estas NO cambiarían con ella: por eso son
// prueba y no eco.
const FRONTERAS = [
  [259_300, 30_900.00, 30_900],
  [259_301, 30_900.003, 30_900],
  [5_000_000, 45_122.10, 45_122],
  [10_500_000, 61_622.10, 61_622],
  [10_559_300, 61_800.00, 61_800],
  [100_000_000, 330_122.10, 330_122],
  [300_000_000, 930_122.10, 930_122],
]
for (const [base, crudo, redondo] of FRONTERAS) {
  check(`derechos sobre ${base.toLocaleString('es-CO')} → ${crudo} antes de redondeo`,
    cerca(evaluarTramosCrudo(DERECHOS, base, null, 'DERECHOS'), crudo),
    `(dio ${evaluarTramosCrudo(DERECHOS, base, null, 'DERECHOS')})`)
  check(`…y ${redondo.toLocaleString('es-CO')} al peso`,
    evaluarTramos(DERECHOS, base, null, 'DERECHOS', PESO) === redondo)
}
check('el punto donde el excedente iguala al mínimo es 10.559.300, no 10.500.000',
  evaluarTramos(DERECHOS, 10_559_300, null, 'DERECHOS', PESO) === 30_900 * 2 &&
  evaluarTramos(DERECHOS, 10_500_000, null, 'DERECHOS', PESO) !== 61_800)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ REDONDEO: lo dice la resolución, no el motor ══')
// ─────────────────────────────────────────────────────────────────────────────
lanza('una tarifa sin redondeo configurado no se liquida',
  () => evaluarTramos(DERECHOS, 100_000_000, null, 'derechos', null),
  'ErrorEsquemaNotarial', 'Lo dice la resolución')
check('al peso, cercano: 61.622,10 → 61.622', redondear(61_622.10, { unidad: 1, modo: 'CERCANO' }, 'x') === 61_622)
check('a la centena, arriba: 61.622,10 → 61.700', redondear(61_622.10, { unidad: 100, modo: 'ARRIBA' }, 'x') === 61_700)
check('a la centena, abajo: 61.622,10 → 61.600', redondear(61_622.10, { unidad: 100, modo: 'ABAJO' }, 'x') === 61_600)
check('a la centena, cercano: 61.622,10 → 61.600', redondear(61_622.10, { unidad: 100, modo: 'CERCANO' }, 'x') === 61_600)
check('a la centena, cercano, en el medio exacto: 61.650 → 61.700',
  redondear(61_650, { unidad: 100, modo: 'CERCANO' }, 'x') === 61_700)
check('arriba NO sube lo que ya es exacto', redondear(61_600, { unidad: 100, modo: 'ARRIBA' }, 'x') === 61_600)
check('los tres modos dan tres resultados distintos sobre la misma cifra',
  new Set([
    redondear(61_622.10, { unidad: 100, modo: 'ARRIBA' }, 'x'),
    redondear(61_622.10, { unidad: 100, modo: 'ABAJO' }, 'x'),
    redondear(61_622.10, { unidad: 1, modo: 'CERCANO' }, 'x'),
  ]).size === 3)
lanza('una unidad de redondeo inválida', () => redondear(100, { unidad: 0, modo: 'CERCANO' }, 'x'),
  'ErrorEsquemaNotarial', 'unidad de redondeo inválida')
check('el catálogo real nace SIN redondeo en todos los conceptos',
  CONCEPTOS_V1.every(c => !c.redondeo))
check('…y el redondeo es campo exigido en las tarifas que se calculan',
  camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'derechos_escritura')).includes('redondeo') &&
  camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'impuesto_registro')).includes('redondeo'))
check('…y NO se le exige a un valor fijo ni a uno libre',
  !camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'certificado_tradicion')).includes('redondeo') &&
  !camposExigidos(CONCEPTOS_V1.find(c => c.clave === 'predial_pendiente')).includes('redondeo'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ MONOTONICIDAD: propiedad del concepto, no ley universal ══')
// ─────────────────────────────────────────────────────────────────────────────
const CRECIENTE = [T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 100, null, 'FIJO', 20, 'PESOS')]
const CONSTANTE = [T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 100, null, 'FIJO', 10, 'PESOS')]
const DECRECIENTE = [T(1, 0, 100, 'FIJO', 20, 'PESOS'), T(2, 100, null, 'FIJO', 10, 'PESOS')]
const pasa = (tramos, monotonicidad) => {
  try { verificarTramos(tramos, null, 'x', { monotonicidad }); return true } catch { return false }
}
check('creciente pasa como LIBRE', pasa(CRECIENTE, 'LIBRE'))
check('creciente pasa como NO_DECRECIENTE', pasa(CRECIENTE, 'NO_DECRECIENTE'))
check('constante pasa como LIBRE', pasa(CONSTANTE, 'LIBRE'))
check('constante pasa como NO_DECRECIENTE (no decrece)', pasa(CONSTANTE, 'NO_DECRECIENTE'))
check('DECRECIENTE pasa como LIBRE: una tabla puede bajar si así se configuró',
  pasa(DECRECIENTE, 'LIBRE'))
check('…y NO pasa como NO_DECRECIENTE', !pasa(DECRECIENTE, 'NO_DECRECIENTE'))
check('sin opciones no se comprueba nada: LIBRE es el defecto',
  (() => { try { verificarTramos(DECRECIENTE, null, 'x'); return true } catch { return false } })())
lanza('y el mensaje dice que se CONFIGURÓ así, no que las tarifas no bajen',
  () => verificarTramos(DECRECIENTE, null, 'x', { monotonicidad: 'NO_DECRECIENTE' }),
  'ErrorEsquemaNotarial', 'está configurada como no decreciente')
// Que la guarda no desaparezca en una refactorización: estructura 2026 real.
check('derechos_escritura está declarado NO_DECRECIENTE en el catálogo',
  CONCEPTOS_V1.find(c => c.clave === 'derechos_escritura').monotonicidad === 'NO_DECRECIENTE')
check('…y es el ÚNICO del catálogo',
  CONCEPTOS_V1.filter(c => c.monotonicidad === 'NO_DECRECIENTE').length === 1)
check('…y con la estructura 2026 (fijo + 3 por mil marginal) la guarda lo deja pasar',
  pasa(DERECHOS, 'NO_DECRECIENTE'))
check('…pero con la lectura sobre el total lo rechaza',
  !pasa([T(1, 0, 259300, 'FIJO', 30900, 'PESOS'), T(2, 259300, null, 'TASA_SOBRE_TOTAL', 3, 'POR_MIL')], 'NO_DECRECIENTE'))

lanza('un hueco entre tramos',
  () => verificarTramos([T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 200, null, 'FIJO', 20, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'un hueco')
lanza('un solape entre tramos',
  () => verificarTramos([T(1, 0, 300, 'FIJO', 10, 'PESOS'), T(2, 200, null, 'FIJO', 20, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'un solape')
lanza('dos tramos abiertos',
  () => verificarTramos([T(1, 0, null, 'FIJO', 10, 'PESOS'), T(2, 0, null, 'FIJO', 20, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'tramos abiertos')
lanza('el tramo abierto no es el último',
  () => verificarTramos([T(1, 0, null, 'FIJO', 10, 'PESOS'), T(2, 100, 200, 'FIJO', 20, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'no es el último')
lanza('el primer tramo no arranca en cero',
  () => verificarTramos([T(1, 100, null, 'FIJO', 10, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'no arranca en 0')
lanza('mezcla tramos en UVT con tramos en pesos',
  () => verificarTramos([T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 100, null, 'TASA_MARGINAL', 1, 'PORCENTAJE', true)], 50000),
  'ErrorEsquemaNotarial', 'mezcla tramos en UVT')
lanza('mezcla marginal con sobre el total',
  () => verificarTramos([T(1, 0, 100, 'TASA_MARGINAL', 1, 'PORCENTAJE'), T(2, 100, null, 'TASA_SOBRE_TOTAL', 2, 'PORCENTAJE')], null),
  'ErrorEsquemaNotarial', 'ambiguo')
lanza('una tasa expresada en PESOS',
  () => verificarTramos([T(1, 0, null, 'TASA_SOBRE_TOTAL', 3, 'PESOS')], null),
  'ErrorEsquemaNotarial', 'tasa expresada en PESOS')
lanza('una tabla por tramos SIN base con más de una fila',
  () => verificarConcepto({ ...base, tipo: 'TRAMOS', base: 'NINGUNA', redondeo: PESO, tramos: [
    T(1, 0, 100, 'FIJO', 10, 'PESOS'), T(2, 100, null, 'FIJO', 20, 'PESOS'),
  ] }, null),
  'ErrorEsquemaNotarial', 'Sin cuantía no hay tramo que escoger')
lanza('una tasa que no declara base',
  () => verificarConcepto({ ...base, tipo: 'PORCENTAJE', base: 'NINGUNA', valor: 1, unidad: 'PORCENTAJE', redondeo: PESO }, null),
  'ErrorEsquemaNotarial', 'no declara base')
lanza('un valor fijo expresado en por mil',
  () => verificarTramos([T(1, 0, null, 'FIJO', 3, 'POR_MIL')], null),
  'ErrorEsquemaNotarial', 'su unidad no es PESOS')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ LAS CINCO BASES NO SON LA MISMA ══')
// ─────────────────────────────────────────────────────────────────────────────
const conAvaluoAlto = { valor_venta: 80_000_000, avaluo_catastral: 100_000_000 }
check('la base notarial toma el avalúo cuando supera el precio',
  calcularBaseNotarial(conAvaluoAlto).valor === 100_000_000)
check('…y lo DICE, para que la cifra alta no parezca un error',
  /avalúo catastral porque supera el valor pactado/.test(calcularBaseNotarial(conAvaluoAlto).motivo))
check('la base de retención NO toma el avalúo: es el valor de la enajenación',
  calcularBaseRetencion(conAvaluoAlto).valor === 80_000_000)
check('la del timbre tampoco', calcularBaseTimbre(conAvaluoAlto).valor === 80_000_000)
check('sin los otros tres se avisa de que no se pudieron comparar',
  /No se informó el avalúo catastral ni el autoavalúo ni el valor del remate/
    .test(calcularBaseNotarial({ valor_venta: 80_000_000 }).motivo))

// ── Art. 51 literal a): CUATRO valores, no dos ─────────────────────────────
check('gana el autoavalúo si es el mayor de los cuatro',
  calcularBaseNotarial({ valor_venta: 80_000_000, avaluo_catastral: 90_000_000, autoavaluo: 120_000_000 }).valor === 120_000_000)
check('…y lo dice por su nombre',
  /autoavalúo porque supera el valor pactado/
    .test(calcularBaseNotarial({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).motivo))
check('gana el valor del remate si es el mayor',
  calcularBaseNotarial({ valor_venta: 80_000_000, avaluo_catastral: 90_000_000, autoavaluo: 95_000_000, valor_remate: 99_000_000 }).valor === 99_000_000)
check('con los cuatro informados y el pactado mayor, gana el pactado',
  calcularBaseNotarial({ valor_venta: 200_000_000, avaluo_catastral: 90_000_000, autoavaluo: 95_000_000, valor_remate: 99_000_000 }).valor === 200_000_000)
check('…y entonces NO hay aviso de que falte comparar nada',
  !/No se informó/.test(calcularBaseNotarial({ valor_venta: 200_000_000, avaluo_catastral: 1, autoavaluo: 1, valor_remate: 1 }).motivo))
// Y la registral toma DOS, no cuatro: el autoavalúo y el remate son del
// art. 51 a) de la notarial. Esta es la primera vez que las bases dejan de
// coincidir, que es justo para lo que estaban separadas.
check('la base del IMPUESTO DE REGISTRO no toma el autoavalúo',
  calcularBaseRegistro({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).valor === 80_000_000)
check('…ni el valor del remate',
  calcularBaseRegistro({ valor_venta: 80_000_000, valor_remate: 150_000_000 }).valor === 80_000_000)
check('…pero sí el avalúo catastral',
  calcularBaseRegistro({ valor_venta: 80_000_000, avaluo_catastral: 100_000_000 }).valor === 100_000_000)
check('la de los DERECHOS ORIP, igual',
  calcularBaseOrip({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).valor === 80_000_000 &&
  calcularBaseOrip({ valor_venta: 80_000_000, avaluo_catastral: 100_000_000 }).valor === 100_000_000)
check('…y la notarial sí lo toma: mismas entradas, bases distintas',
  calcularBaseNotarial({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).valor === 120_000_000 &&
  calcularBaseRegistro({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).valor === 80_000_000)
check('la registral no avisa de que falte el autoavalúo: no es de su regla',
  !/autoavalúo/.test(calcularBaseRegistro({ valor_venta: 80_000_000 }).motivo))
check('…y la notarial sí avisa',
  /autoavalúo/.test(calcularBaseNotarial({ valor_venta: 80_000_000 }).motivo))
check('la base de RETENCIÓN sigue siendo el valor de la enajenación, no el mayor de cuatro',
  calcularBaseRetencion({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).valor === 80_000_000)
check('la del TIMBRE tampoco toma el autoavalúo',
  calcularBaseTimbre({ valor_venta: 80_000_000, autoavaluo: 120_000_000 }).valor === 80_000_000)
lanza('un autoavalúo negativo lo rechaza la lectura del número',
  () => calcularBaseNotarial({ valor_venta: 100, autoavaluo: -5 }),
  'ErrorNumero', 'no es un número válido')
check('son cinco bases con su propio campo de respaldo',
  BASES.length === 5 && new Set(BASES.map(b => b.campo_respaldo)).size === 5)
lanza('un valor de venta en cero', () => calcularBaseNotarial({ valor_venta: 0 }),
  'ErrorEsquemaNotarial', 'mayor que cero')
check('«52.374» se lee como cincuenta y dos mil, no como 52,374',
  calcularBaseNotarial({ valor_venta: '52.374' }).valor === 52374)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ RETENCIÓN: motor de excepciones con una sola regla ══')
// ─────────────────────────────────────────────────────────────────────────────
const GENERAL = {
  clave: 'general', label: 'Tarifa general', orden: 100, activa: true,
  tipo_efecto: 'TARIFA', valor_efecto: 1, unidad: 'PORCENTAJE', condiciones: [],
  respaldos: [RESP('tarifa', 'https://www.dian.gov.co/x.pdf')],
}
check('la regla general aplica y da el 1 %',
  calcularRetencion([GENERAL], 100_000_000).valor === 1_000_000)
check('…y dice con qué regla se calculó',
  calcularRetencion([GENERAL], 100_000_000).regla === 'general')
lanza('sin ninguna regla', () => calcularRetencion([], 100_000_000),
  'ErrorEsquemaNotarial', 'No hay reglas')
lanza('dos reglas generales', () => verificarReglas([GENERAL, { ...GENERAL, clave: 'otra' }]),
  'ErrorEsquemaNotarial', 'exactamente una regla')
lanza('la general no es la última (una excepción nunca se evaluaría)',
  () => verificarReglas([GENERAL, {
    ...GENERAL, clave: 'exc', orden: 200, condiciones: [{ campo: 'valor_en_uvt', operador: 'MAYOR', valor: '1' }],
  }]),
  'ErrorEsquemaNotarial', 'nunca se evaluaría')
lanza('una regla ACTIVA que depende de una pregunta que el formulario no hace',
  () => verificarReglas([
    { ...GENERAL, clave: 'casa', orden: 10, condiciones: [{ campo: 'es_casa_habitacion', operador: 'IGUAL', valor: 'true' }] },
    GENERAL,
  ]),
  'ErrorEsquemaNotarial', 'es código, no una fila')
check('…y el motivo está declarado en el catálogo de campos',
  CAMPOS_CONDICION.find(c => c.campo === 'es_casa_habitacion').pregunta_en_formulario === false)
check('una excepción sobre un campo que SÍ se pregunta es una fila',
  calcularRetencion([
    { ...GENERAL, clave: 'grande', orden: 10, tipo_efecto: 'TARIFA', valor_efecto: 2, unidad: 'PORCENTAJE',
      condiciones: [{ campo: 'valor_en_uvt', operador: 'MAYOR', valor: '1000' }] },
    GENERAL,
  ], 100_000_000, { valor_en_uvt: 2000 }).valor === 2_000_000)
check('una exención da cero CON regla nombrada',
  (() => { const r = calcularRetencion([
    { ...GENERAL, clave: 'exenta', label: 'Exenta', orden: 10, tipo_efecto: 'EXENCION', valor_efecto: null,
      condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'JURIDICA' }] },
    GENERAL,
  ], 100_000_000, { tipo_persona_vendedor: 'JURIDICA' })
    return r.valor === 0 && r.regla === 'exenta' })())
lanza('una condición cuyo dato no viene: se detiene, NO se da por cumplida',
  () => calcularRetencion([
    { ...GENERAL, clave: 'exenta', orden: 10, tipo_efecto: 'EXENCION', valor_efecto: null,
      condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'JURIDICA' }] },
    GENERAL,
  ], 100_000_000, {}),
  'SinReglaAplicable')
lanza('ninguna regla aplica: jamás devuelve cero',
  () => calcularRetencion([{ ...GENERAL, activa: false }], 100_000_000),
  'SinReglaAplicable', 'devolver cero')
lanza('la regla general no puede ser una reducción',
  () => verificarReglas([{ ...GENERAL, tipo_efecto: 'REDUCCION_PCT_POR_ANIO' }]),
  'ErrorEsquemaNotarial', 'fijar una TARIFA')

/* EL CAMINO DEL EFECTO, que la guarda no vigilaba.
 *
 * `verificarReglas` exigía que toda CONDICIÓN se apoyara en un campo que el
 * formulario pregunta. El EFECTO de `REDUCCION_PCT_POR_ANIO` lee
 * `ctx.anios_tenencia` y ese campo no estaba declarado en ninguna parte: había
 * un camino al contexto que esquivaba entera la guarda construida para
 * vigilarlo. Ahora se exige por los dos lados. */
lanza('una reducción ACTIVA cuyo efecto necesita un dato que el formulario no pregunta',
  () => verificarReglas([
    { ...GENERAL, clave: 'reduccion', orden: 10, activa: true, tipo_efecto: 'REDUCCION_PCT_POR_ANIO',
      valor_efecto: 10, unidad: 'PORCENTAJE',
      // La condicion se apoya en un campo que el formulario SI pregunta: asi lo
      // unico que puede fallar es el EFECTO, que es lo que se esta probando.
      condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'NATURAL' }] },
    GENERAL,
  ]),
  'ErrorEsquemaNotarial', 'su efecto necesita')
check('…y la misma regla DESACTIVADA sí pasa: lo que se prohíbe es activarla',
  (() => {
    verificarReglas([
      { ...GENERAL, clave: 'reduccion', orden: 10, activa: false, tipo_efecto: 'REDUCCION_PCT_POR_ANIO',
        valor_efecto: 10, unidad: 'PORCENTAJE',
      // La condicion se apoya en un campo que el formulario SI pregunta: asi lo
      // unico que puede fallar es el EFECTO, que es lo que se esta probando.
      condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'NATURAL' }] },
      GENERAL,
    ])
    return true
  })())

/* EL CONTEXTO QUE LLEGA DE FUERA.
 *
 * El `valor_en_uvt` lo deriva el motor de la base. Se esparcía ANTES del
 * contexto del cliente, así que el cliente lo pisaba. Hoy ninguna regla lo usa
 * y era inofensivo; el día que una regla por umbral sea «una fila», quien
 * pregunta podría dispararla mandando el valor que le convenga. */
lanza('el cliente no puede mandar un valor que el motor deriva',
  () => exigirContextoConocido({ valor_en_uvt: 0 }),
  'ErrorEsquemaNotarial', 'lo deriva el motor')
lanza('una clave de contexto desconocida DETIENE, no se descarta en silencio',
  () => exigirContextoConocido({ es_amigo_del_notario: true }),
  'ErrorEsquemaNotarial', 'no es un campo del contexto')
check('un campo declarado sí pasa',
  (() => { exigirContextoConocido({ tipo_persona_vendedor: 'NATURAL' }); return true })())
check('un contexto vacío pasa',
  (() => { exigirContextoConocido({}); return true })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ EL AÑO VACÍO NO LIQUIDA, Y DICE QUÉ FALTA Y A QUIÉN ══')
// ─────────────────────────────────────────────────────────────────────────────
const ANIO_VACIO = {
  anio: 2026, estado: 'BORRADOR', uvt: null, uvb: null, tarifa_iva: null,
  version: 1, cerrado: false, respaldos: [],
  conceptos: CONCEPTOS_V1, reglas_retencion: [GENERAL],
}
lanza('el año en borrador no liquida',
  () => liquidar(ANIO_VACIO, { valor_venta: 100_000_000 }, { fuentes: FUENTES_OFICIALES }),
  'AnioNoPublicable')
lanza('ni siquiera ACTIVO liquida si falta una tarifa',
  () => liquidar({ ...ANIO_VACIO, estado: 'ACTIVO' }, { valor_venta: 100_000_000 }, { fuentes: FUENTES_OFICIALES }),
  'AnioNoPublicable')
const pend = pendientesParaActivar(ANIO_VACIO, FUENTES_OFICIALES)
const resumen = resumenDePendientes(pend)
check('hay pendientes de los tres dueños', resumen.porDueno.length === 3, `(${resumen.porDueno.length})`)
check('el contador NO aparece como dueño de las tarifas notariales',
  !resumen.porDueno.find(d => d.dueno === 'contador').items.some(i => /notarial/i.test(i)))
check('la retención espera al contador',
  resumen.porDueno.find(d => d.dueno === 'contador').items.some(i => /Retención/i.test(i)))
check('el certificado de tradición espera a la entidad que lo expide',
  resumen.porDueno.find(d => d.dueno === 'entidad').items.some(i => /tradición/i.test(i)))
check('el contador agregado existe solo como suma secundaria',
  resumen.total === pend.length && resumen.total > resumen.porDueno.length)
check('las cinco bases están entre lo pendiente',
  BASES.every(b => pend.some(p => p.campo === b.campo_respaldo)))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ AÑO COMPLETO (TARIFAS INVENTADAS) — LIQUIDACIÓN ══')
// ─────────────────────────────────────────────────────────────────────────────
const VALORES = {
  derechos_escritura: { redondeo: PESO, tramos: DERECHOS },
  hojas_papel_notarial: { valor: 7000 },
  copias: { valor: 3000 },
  copia_autentica: { valor: 5600 },
  biometria: { valor: 8000 },
  firma_digital: { valor: 12000 },
  autenticaciones: { valor: 5000 },
  // El catálogo ya NO siembra el art. 50: se teclea en el panel. Aquí se
  // reconstruye desde el bloque de cotejo para poder liquidar en las pruebas.
  recaudo_snr: { redondeo: { unidad: 1, modo: 'PUBLICADO' }, tramos: TRAMOS_50_DESDE_BLOQUE },
  recaudo_sin_cuantia: {
    redondeo: { unidad: 1, modo: 'PUBLICADO' },
    tramos: [{
      orden: 1, desde: 0, hasta: null, modo_calculo: 'FIJO', unidad: 'PESOS',
      valor: Number(BLOQUE_REAL.find(f => f.concepto === 'recaudo_sin_cuantia' && f.campo === 'tramo.1.valor').valor),
      aporte_snr: Number(BLOQUE_REAL.find(f => f.concepto === 'recaudo_sin_cuantia' && f.campo === 'tramo.1.aporte_snr').valor),
      aporte_fondo: Number(BLOQUE_REAL.find(f => f.concepto === 'recaudo_sin_cuantia' && f.campo === 'tramo.1.aporte_fondo').valor),
    }],
  },
  acto_sin_cuantia: { valor: 90_600 },
  impuesto_registro: { valor: 1, unidad: 'PORCENTAJE', redondeo: PESO },
  timbre: { redondeo: PESO, tramos: TIMBRE },
  derechos_orip: { redondeo: PESO, tramos: ORIP },
  sistematizacion: { valor: 2, unidad: 'PORCENTAJE', redondeo: PESO },
  certificado_tradicion: { valor: 25000 },
  paz_salvo_predial: { valor: 15000 },
  no_valorizacion: { valor: 20000 },
}
const ANIO = {
  anio: 2026, estado: 'ACTIVO', uvt: 50000, uvb: 10000, tarifa_iva: 19,
  // INVENTADA, como todo lo demás de este arnés: aproximación al múltiplo de
  // $10, medio hacia arriba. La real entra con el PDF.
  redondeo_iva: { unidad: 10, modo: 'CERCANO' },
  version: 7, cerrado: false,
  respaldos: [RESP('uvt', 'https://www.dian.gov.co/uvt.pdf'), RESP('uvb'), RESP('tarifa_iva'),
    { ...RESP('redondeo_iva', 'https://www.dian.gov.co/concepto.pdf'),
      norma: 'Concepto DIAN 003550 int 306 del 4 de marzo de 2026',
      articulo: 'art. 1.3.1.1.1 del Decreto 1625 de 2016',
      // «Podrá aproximarse»: lo permite, no lo exige.
      caracter: 'ADOPTADO' },
    ...BASES.map(b => RESP(b.campo_respaldo, 'https://www.suin-juriscol.gov.co/norma.pdf'))],
  conceptos: CONCEPTOS_V1.map(c => ({
    ...c, ...(VALORES[c.clave] ?? {}),
    respaldos: camposExigidos(c).map(campo => RESP(campo)),
  })),
  reglas_retencion: [GENERAL],
}
check('el año completo YA es publicable',
  (() => { try { exigirAnioPublicable(ANIO, FUENTES_OFICIALES); return true } catch (e) { return `(${e.message})` } })() === true)

// ── DESACTIVAR UNA FUENTE NO PUEDE SER LA PUERTA TRASERA ───────────────────
// Un respaldo cuya fuente ya no está activa, o ya no existe, NO es «fuente
// desconocida, sigo»: es SIN FUENTE VÁLIDA, y bloquea la activación.
const SIN_SUPERNOTARIADO = FUENTES_OFICIALES.map(
  f => f.dominio === 'supernotariado.gov.co' ? { ...f, activo: false } : f)
const SIN_LISTA = []
lanza('con la Superintendencia desactivada, el año deja de activarse',
  () => exigirAnioPublicable(ANIO, SIN_SUPERNOTARIADO), 'AnioNoPublicable')
check('…y el aviso dice QUÉ fuente y por qué',
  (() => { const p = pendientesParaActivar(ANIO, SIN_SUPERNOTARIADO)
    return p.some(x => /no corresponde a una autoridad oficial activa/.test(x.que)) &&
      p.some(x => /supernotariado\.gov\.co/.test(x.que)) })(),
  `(${JSON.stringify(pendientesParaActivar(ANIO, SIN_SUPERNOTARIADO).slice(0, 2))})`)
check('…y no dice «falta la tarifa», que sería mentira: la tarifa está',
  !pendientesParaActivar(ANIO, SIN_SUPERNOTARIADO).some(x => /falta la tarifa/.test(x.que)))
lanza('sin NINGUNA fuente en la tabla, tampoco se activa',
  () => exigirAnioPublicable(ANIO, SIN_LISTA), 'AnioNoPublicable')
lanza('ni con la fuente borrada de la tabla en vez de desactivada',
  () => exigirAnioPublicable(ANIO,
    FUENTES_OFICIALES.filter(f => f.dominio !== 'supernotariado.gov.co')),
  'AnioNoPublicable')
// Aísla la rama del AÑO: solo la DIAN desactivada, que es de donde salen el
// UVT y el redondeo del IVA. Si el motivo no viajara, el aviso diría «está
// cargada sin su resolución oficial» y sería falso: la resolución está.
const SIN_DIAN = FUENTES_OFICIALES.map(f => f.dominio === 'dian.gov.co' ? { ...f, activo: false } : f)
check('con la DIAN desactivada, el pendiente del UVT dice el motivo',
  pendientesParaActivar(ANIO, SIN_DIAN)
    .some(x => x.campo === 'uvt' && /no corresponde a una autoridad oficial activa/.test(x.que)),
  `(${JSON.stringify(pendientesParaActivar(ANIO, SIN_DIAN).filter(x => x.campo === 'uvt'))})`)
check('…y nombra el dominio, no un «sin respaldo» genérico',
  pendientesParaActivar(ANIO, SIN_DIAN).some(x => x.campo === 'uvt' && /dian\.gov\.co/.test(x.que)))
check('el año vuelve a activarse al reactivar la fuente',
  (() => { exigirAnioPublicable(ANIO, FUENTES_OFICIALES); return true })())

const ENTRADA = {
  valor_venta: 100_000_000,
  // 3 copias auténticas × 10 hojas = 30 hojas. Las hojas NO se repiten aquí:
  // se leen de hojas_papel_notarial, que es donde se preguntan.
  cantidades: { hojas_papel_notarial: 10, copias: 2, biometria: 3, copia_autentica: 3 },
  // El comprador asume el 100 % de las copias y de la biometría. La biometría
  // es la que mueve el reparto del IVA: las copias ya lo traen dentro.
  repartos: { copias: 100, biometria: 100 },
  opcionales: ['biometria', 'certificado_tradicion', 'paz_salvo_predial', 'no_valorizacion', 'predial_pendiente'],
  valores_libres: { predial_pendiente: '450.000' },
}
/* MEDIODIA DE COLOMBIA, escrito con su desplazamiento.
 *
 * Antes era `new Date(2026, 9, 6)`, que construye con componentes LOCALES: en
 * una maquina UTC-5 da el 6 a las 00:00 de Colombia y en Vercel, que corre en
 * UTC, da el 5 a las 19:00 de Colombia. La PRUEBA construia su entrada con el
 * mismo patron que estaba verificando, y solo se vio al meter este arnes en el
 * build, que corre en la otra superficie. Los dos instrumentos se cazaron. */
const L = liquidar(ANIO, ENTRADA, { fuentes: FUENTES_OFICIALES, fecha: new Date('2026-10-06T12:00:00-05:00') })
const linea = k => L.lineas.find(l => l.clave === k)

// El año 2026 deja de estar bloqueado por un enlace que puede no existir, y
// sigue bloqueado por lo que importa: que cada cifra tenga su documento.
const ANIO_CON_DOCUMENTO = {
  ...ANIO,
  conceptos: ANIO.conceptos.map(c => c.clave !== 'derechos_escritura' ? c : {
    ...c,
    respaldos: (c.respaldos ?? []).map(r => ({ ...DOC, campo: r.campo })),
  }),
}
check('un año respaldado con el PDF archivado también es publicable',
  (() => { try { exigirAnioPublicable(ANIO_CON_DOCUMENTO, FUENTES_OFICIALES); return true }
    catch (e) { return `(${e.message})` } })() === true)
check('…y liquida igual', liquidar(ANIO_CON_DOCUMENTO, ENTRADA, { fuentes: FUENTES_OFICIALES })
  .totales.total === 3_728_742)
check('…y la línea DICE que su evidencia es un documento archivado',
  liquidar(ANIO_CON_DOCUMENTO, ENTRADA, { fuentes: FUENTES_OFICIALES })
    .lineas.find(l => l.clave === 'derechos_escritura').normas
    .some(n => /documento oficial archivado/.test(n)))
check('…y las demás siguen diciendo enlace oficial',
  liquidar(ANIO_CON_DOCUMENTO, ENTRADA, { fuentes: FUENTES_OFICIALES })
    .lineas.find(l => l.clave === 'impuesto_registro').normas
    .some(n => /enlace oficial/.test(n)))
check('la liquidación resume con qué se sustenta cada norma',
  (() => { const e = liquidar(ANIO_CON_DOCUMENTO, ENTRADA, { fuentes: FUENTES_OFICIALES }).evidencias
    return e.length >= 2 && e.some(x => x.tipo === 'DOCUMENTO_ARCHIVADO') &&
      e.some(x => x.tipo === 'URL_OFICIAL') })())
check('…con la cita ya redactada para el PDF',
  liquidar(ANIO_CON_DOCUMENTO, ENTRADA, { fuentes: FUENTES_OFICIALES }).evidencias
    .every(x => x.cita.length > 0))
check('…y NINGUNA evidencia enlaza a nuestro dominio',
  liquidar(ANIO_CON_DOCUMENTO, ENTRADA, { fuentes: FUENTES_OFICIALES }).evidencias
    .every(x => !/sufincaraiz/i.test(x.cita) && !/sufincaraiz/i.test(x.enlace ?? '')))
check('…y la del documento archivado no trae enlace ninguno',
  liquidar(ANIO_CON_DOCUMENTO, ENTRADA, { fuentes: FUENTES_OFICIALES }).evidencias
    .filter(x => x.tipo === 'DOCUMENTO_ARCHIVADO').every(x => x.enlace === null))
lanza('un año cuyo documento archivado está incompleto NO se activa',
  () => exigirAnioPublicable({
    ...ANIO_CON_DOCUMENTO,
    conceptos: ANIO_CON_DOCUMENTO.conceptos.map(c => c.clave !== 'derechos_escritura' ? c : {
      ...c, respaldos: (c.respaldos ?? []).map(r => ({ ...r, documento_hash: null })),
    }),
  }, FUENTES_OFICIALES),
  'AnioNoPublicable')


check('derechos notariales: 330.122', linea('derechos_escritura').valor === 330_122)
check('ORIP: 911.000', linea('derechos_orip').valor === 911_000)
check('sistematización: 2 % de la tarifa registral, no del inmueble',
  linea('sistematizacion').valor === 18_220 && linea('sistematizacion').base.valor === 911_000)
check('timbre: cero porque la tabla dice cero bajo el umbral', linea('timbre').valor === 0)
check('retención: 1 % del valor de la enajenación', linea('retefuente').valor === 1_000_000)
check('…y la soporta el vendedor entero',
  linea('retefuente').vendedor === 1_000_000 && linea('retefuente').comprador === 0)
check('el impuesto de registro lo paga el comprador por costumbre',
  linea('impuesto_registro').comprador === 1_000_000 && linea('impuesto_registro').motivo_reparto === 'COSTUMBRE')
check('el recaudo SNR no lleva IVA', linea('recaudo_snr').iva_exacto === '0')
check('…y su valor NO está dentro de BASE_IVA',
  Number(L.iva.base) === 592_122 && 592_122 + 28_900 !== Number(L.iva.base))
// A mano: 330.122 derechos + 70.000 hojas + 24.000 biometría + 168.000 de
// copias auténticas = 592.122. Las copias SIMPLES no están: su precio ya trae
// el IVA dentro. Las AUTÉNTICAS sí, porque el art. 5 no dice «IVA incluido» de
// ellas.
check('BASE_IVA es la remuneración gravada: 592.122',
  L.iva.base === '592122', `(dio ${L.iva.base})`)
check('IVA_BRUTO conserva los decimales: 112.503,18 (19 % de 592.122, a mano)',
  L.iva.bruto === '112503.18', `(dio ${L.iva.bruto})`)
check('IVA_LIQUIDADO aproxima al múltiplo de 10: 112.500', L.iva.liquidado === 112_500, `(dio ${L.iva.liquidado})`)
check('ninguna línea lleva el IVA redondeado: lo aporta exacto',
  L.lineas.find(l => l.clave === 'derechos_escritura').iva_exacto === '62723.18')

// La decisión aprobada: el IVA SIGUE el reparto de cada concepto.
check('las copias son del comprador por el precio completo, IVA incluido',
  linea('copias').comprador === 6_000 && linea('copias').vendedor === 0)
check('…así que el IVA total NO queda 50/50', L.iva.comprador !== L.iva.vendedor)
// A mano: ponderado = 165.061 + 35.000 + 24.000 + 84.000 = 308.061 de 592.122.
// 112.500 × 308.061/592.122 = 58.529,94 → la MENOR es la del vendedor
// (53.970,06 → 53.970) y el comprador se queda con el residual, 58.530.
check('el IVA reparte 58.530 / 53.970 (se redondea la MENOR, la mayor es residual)',
  L.iva.comprador === 58_530 && L.iva.vendedor === 53_970,
  `(dio ${L.iva.comprador} / ${L.iva.vendedor})`)
check('…y suman exactamente el liquidado',
  L.iva.comprador + L.iva.vendedor === L.iva.liquidado)
check('un 50/50 plano habría dado 56.250 / 56.250, y no es lo que salió',
  L.iva.comprador !== 56_250)

check('las partes suman el total, al peso',
  L.totales.comprador + L.totales.vendedor === L.totales.total)
// ── EL CENTINELA DEL TOTAL ─────────────────────────────────────────────────
// A mano: 3.448.242 de conceptos del trámite + 80.580 de IVA liquidado.
//
// Este número ha cambiado dos veces, y las dos por un motivo escrito:
//   · 3.526.065 → 3.524.922 al pasar a UN SOLO redondeo del IVA sobre el total
//     en vez de uno por línea (y al salir las copias de BASE_IVA, porque su
//     precio ya trae el IVA dentro).
//   · 3.524.922 → 3.528.822 al sembrar el recaudo REAL del art. 50: para una
//     cuantía de 100 M son $28.900, no los $25.000 inventados que tenía antes
//     el arnés.
//   · 3.528.822 → 3.728.742 al entrar las COPIAS AUTÉNTICAS, que son gasto de
//     todo cierre: 3 copias × 10 hojas × $5.600 = 168.000, más su IVA. Sin
//     copia auténtica la ORIP no inscribe, así que faltaba un gasto real.
// El centinela vale por el motivo, no por el número: si vuelve a moverse sin
// una razón escrita aquí, es un fallo.
check('total del trámite: 3.728.742', L.totales.total === 3_728_742, `(dio ${L.totales.total})`)
check('…del que 2.316.261 son del comprador y 1.412.481 del vendedor',
  L.totales.comprador === 2_316_261 && L.totales.vendedor === 1_412_481,
  `(dio ${L.totales.comprador} / ${L.totales.vendedor})`)
check('el predial pendiente va APARTE del trámite',
  L.obligaciones.total === 450_000 && !L.lineas.filter(l => l.grupo !== 'OBLIGACIONES').some(l => l.clave === 'predial_pendiente'))
check('…y el total del trámite es exactamente lo demás más el IVA',
  L.lineas.reduce((s, l) => s + l.total, 0) + L.iva.liquidado === 3_728_742 + 450_000)
check('los grupos visuales son los cinco acordados',
  L.grupos.map(g => g.clave).join() === 'COSTOS_NOTARIALES,IMPUESTOS,REGISTRO,DOCUMENTOS_PREVIOS,OBLIGACIONES')
check('la firma digital y las autenticaciones no entraron (no se activaron)',
  !linea('firma_digital') && !linea('autenticaciones'))
check('el reparto con norma se imprime como supletivo, no como obligatorio',
  linea('derechos_escritura').normas.some(n => /salvo pacto/.test(n)))
check('avisa de que no se indicó el avalúo catastral',
  L.avisos.some(a => /avalúo catastral/.test(a) && /por debajo/.test(a)))
check('avisa de que el valor de la hoja cambia por notaría',
  linea('hojas_papel_notarial').avisos.some(a => /de una notaría a otra/.test(a)))
check('el valor libre queda marcado como dato de quien simula, no como tarifa',
  linea('predial_pendiente').avisos.some(a => /no una tarifa/.test(a)))

// ── Bases distintas en la misma liquidación ────────────────────────────────
const L2 = liquidar(ANIO, { ...ENTRADA, valor_venta: 80_000_000, avaluo_catastral: 100_000_000 },
  { fuentes: FUENTES_OFICIALES })
check('con avalúo alto, los derechos se liquidan sobre el avalúo',
  L2.lineas.find(l => l.clave === 'derechos_escritura').base.valor === 100_000_000)
check('…pero la retención sigue sobre el precio pactado',
  L2.lineas.find(l => l.clave === 'retefuente').base.valor === 80_000_000 &&
  L2.lineas.find(l => l.clave === 'retefuente').valor === 800_000)
check('…y la liquidación lo explica', L2.avisos.some(a => /avalúo catastral porque supera el valor pactado/.test(a)))

// ── Timbre en la operación grande ──────────────────────────────────────────
const L3 = liquidar(ANIO, { ...ENTRADA, valor_venta: 1_200_000_000 }, { fuentes: FUENTES_OFICIALES })
check('timbre marginal en una finca de 1.200 M: 3.000.000',
  L3.lineas.find(l => l.clave === 'timbre').valor === 3_000_000)
check('…y leerla sobre el total habría errado en 15 millones',
  evaluarTramos(TIMBRE_MAL, 1_200_000_000, 50000, 'TIMBRE_MAL', PESO)
    - L3.lineas.find(l => l.clave === 'timbre').valor === 15_000_000)

// ── Calculadora sencilla ───────────────────────────────────────────────────
const S = liquidar(ANIO, { valor_venta: 100_000_000, cantidades: { hojas_papel_notarial: 10 } },
  { modo: 'SENCILLA', fuentes: FUENTES_OFICIALES })
check('la sencilla no incluye copias ni servicios adicionales',
  !S.lineas.some(l => ['copias', 'biometria', 'firma_digital', 'autenticaciones'].includes(l.clave)))
check('…y lo dice', S.avisos.some(a => /Es una estimación/.test(a) && /copias/.test(a)))
check('…y marca las hojas como estimación',
  S.lineas.find(l => l.clave === 'hojas_papel_notarial').avisos.some(a => /estimación/.test(a)))
check('la sencilla sí trae los impuestos y el registro',
  ['retefuente', 'impuesto_registro', 'derechos_orip'].every(k => S.lineas.some(l => l.clave === k)))

// ── Lo que manda el cliente no se confía ───────────────────────────────────
lanza('un reparto para la retención (que tiene contribuyente, no reparto)',
  () => liquidar(ANIO, { ...ENTRADA, repartos: { retefuente: 50 } }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'no se reparte')
lanza('un reparto fuera de 0–100',
  () => liquidar(ANIO, { ...ENTRADA, repartos: { copias: 140 } }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'entre 0 y 100')
lanza('una clave de concepto que no existe en el año',
  () => liquidar(ANIO, { ...ENTRADA, cantidades: { ...ENTRADA.cantidades, inventado: 2 } }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'no es un concepto')
lanza('falta cuántas hojas lleva la escritura',
  () => liquidar(ANIO, { valor_venta: 100_000_000 }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'Falta cuántas')
lanza('cero copias en vez de desactivar el concepto',
  () => liquidar(ANIO, { ...ENTRADA, cantidades: { ...ENTRADA.cantidades, copias: 0 } }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'entero de 1 o más')
lanza('un predial pendiente activado y sin valor',
  () => liquidar(ANIO, { ...ENTRADA, valores_libres: {} }, { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'Falta el valor')
lanza('una liquidación con una fuente de respaldo retirada',
  () => liquidar(ANIO, ENTRADA, { fuentes: FUENTES_OFICIALES.map(f => ({ ...f, activo: false })) }),
  'AnioNoPublicable')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ IVA: LOS SIETE VALORES Y UN SOLO REDONDEO ══')
// ─────────────────────────────────────────────────────────────────────────────
// Los esperados están calculados aparte, a mano. La regla de aproximación que
// se usa aquí (múltiplo de $10, medio hacia arriba) es INVENTADA para probar la
// mecánica: la real es normativa y entra con su PDF.
const DIEZ = { unidad: 10, modo: 'CERCANO' }
const unIva = (base, pct = 50, tarifa = 19, regla = DIEZ) =>
  liquidarIva([{ clave: 'x', base, pct_comprador: pct }], tarifa, regla)

lanza('sin la regla de aproximación, el IVA NO liquida',
  () => unIva('216965.35', 50, 19, null),
  'ErrorEsquemaNotarial', 'regla normativa')

check('216.965,35 → IVA_BRUTO 41.223,4165', unIva('216965.35').bruto === '41223.4165',
  `(dio ${unIva('216965.35').bruto})`)
// Las dos fronteras: prueban el corte sin depender de decimales infinitos.
check('216.973,68 → IVA_BRUTO 41.224,9992', unIva('216973.68').bruto === '41224.9992',
  `(dio ${unIva('216973.68').bruto})`)
check('…y liquida 41.220 (queda por debajo del medio)', unIva('216973.68').liquidado === 41_220)
check('216.973,69 → IVA_BRUTO 41.225,0011', unIva('216973.69').bruto === '41225.0011',
  `(dio ${unIva('216973.69').bruto})`)
check('…y liquida 41.230 (pasa el medio: medio hacia arriba)', unIva('216973.69').liquidado === 41_230)
check('un céntimo de base mueve la liquidación 10 pesos',
  unIva('216973.69').liquidado - unIva('216973.68').liquidado === 10)

const NOVENTA = unIva('999999.00', 37)
check('999.999,00 → IVA_BRUTO 189.999,81', NOVENTA.bruto === '189999.81', `(dio ${NOVENTA.bruto})`)
check('…liquida 190.000', NOVENTA.liquidado === 190_000)
check('…y al 37/63 reparte 70.300 / 119.700',
  NOVENTA.comprador === 70_300 && NOVENTA.vendedor === 119_700,
  `(dio ${NOVENTA.comprador} / ${NOVENTA.vendedor})`)
check('…que suman el liquidado', NOVENTA.comprador + NOVENTA.vendedor === 190_000)

// EL ERROR QUE SE BUSCA: redondear por línea en vez de sobre el total.
// Con tarifa del 20 %, dos bases de 100.020 dan 20.004 de IVA cada una, exacto.
const DOS = liquidarIva(
  [{ clave: 'a', base: 100020, pct_comprador: 50 }, { clave: 'b', base: 100020, pct_comprador: 50 }],
  20, DIEZ,
)
check('dos conceptos de 20.004 de IVA → IVA_BRUTO 40.008', DOS.bruto === '40008', `(dio ${DOS.bruto})`)
check('…liquidan 40.010, nunca 40.000', DOS.liquidado === 40_010 && DOS.liquidado !== 40_000)
check('…que es lo que habría dado redondear cada línea por su cuenta',
  unIva('100020', 50, 20).liquidado * 2 === 40_000)
check('…diez pesos que no aparecen en ninguna línea y sí en el total',
  DOS.liquidado - unIva('100020', 50, 20).liquidado * 2 === 10)

// EL MEDIO EXACTO. Las dos fronteras de arriba (…,9992 y …,0011) prueban de qué
// lado cae el corte, pero NO distinguen medio-arriba de medio-abajo: ninguna
// está en el medio. Hace falta un cociente que termine en ,5 exacto, y con el
// 19 % no existe. Con el 20 %: 206.125 × 20 % = 41.225 → /10 = 4.122,5 clavado.
check('en el medio EXACTO, medio hacia arriba: 41.225 → 41.230',
  unIva('206125', 50, 20).liquidado === 41_230, `(dio ${unIva('206125', 50, 20).liquidado})`)
check('…y medio hacia abajo habría dado 41.220',
  unIva('206125', 50, 20, { unidad: 10, modo: 'ABAJO' }).liquidado === 41_220)

// CUÁL DE LAS DOS PARTES SE REDONDEA. Con la mayoría de repartos da igual: las
// dos ramas coinciden. Solo se separan cuando la parte cae en ,5 exacto.
// 41.230 × 25 % = 10.307,5 → se redondea la MENOR (10.308) y la mayor es el
// residual (30.922). Redondeando la mayor saldría 10.307 / 30.923.
check('al 25 %, redondear la MENOR da 10.308 / 30.922',
  (() => { const r = unIva('216973.69', 25)
    return r.comprador === 10_308 && r.vendedor === 30_922 })(),
  `(dio ${unIva('216973.69', 25).comprador} / ${unIva('216973.69', 25).vendedor})`)
check('…y nunca 10.307 / 30.923, que es redondear la mayor',
  unIva('216973.69', 25).comprador !== 10_307)

// EL EMPATE. Con múltiplos de 10 el 50/50 siempre parte exacto, así que la rama
// del empate solo se ve con aproximación al peso: 41.225 / 2 = 20.612,5.
const AL_PESO_REGLA = { unidad: 1, modo: 'CERCANO' }
check('en el empate, el residual es del COMPRADOR: 20.612 / 20.613',
  (() => { const r = unIva('216973.69', 50, 19, AL_PESO_REGLA)
    return r.liquidado === 41_225 && r.comprador === 20_612 && r.vendedor === 20_613 })(),
  `(dio ${JSON.stringify(unIva('216973.69', 50, 19, AL_PESO_REGLA))})`)
check('…y es determinista: dos llamadas idénticas dan lo mismo',
  unIva('216973.69', 50, 19, AL_PESO_REGLA).comprador ===
  unIva('216973.69', 50, 19, AL_PESO_REGLA).comprador)

// CONCILIACIÓN: una docena de repartos, incluidos los extremos y el empate.
const REPARTOS = [0, 5, 17, 33, 37, 50, 63, 66.6, 75, 88, 99, 100]
let descuadres = 0
for (const pct of REPARTOS) {
  const r = unIva('216973.69', pct)
  if (r.comprador + r.vendedor !== r.liquidado) descuadres++
  if (r.comprador < 0 || r.vendedor < 0) descuadres++
}
check(`conciliación en ${REPARTOS.length} repartos: comprador + vendedor = liquidado siempre`,
  descuadres === 0, `(${descuadres} descuadres)`)
check('el 0 % deja todo el IVA al vendedor', unIva('216973.69', 0).vendedor === 41_230)
check('el 100 % deja todo el IVA al comprador', unIva('216973.69', 100).comprador === 41_230)
check('en el empate 50/50 el residual es del comprador (determinismo)',
  (() => { const r = unIva('216973.69', 50)
    // 41.230 / 2 = 20.615 exactos: no hay residuo que repartir, pero la rama
    // del empate es la que decide, y tiene que dar siempre lo mismo.
    return r.comprador === 20_615 && r.vendedor === 20_615 })())
check('con reparto impar, el residual lo absorbe la parte MAYOR',
  (() => { const r = unIva('216973.69', 33)
    // menor = comprador = 41.230 × 0,33 = 13.605,9 → 13.606; mayor = 27.624.
    return r.comprador === 13_606 && r.vendedor === 27_624 })())
check('los valores EXACTOS se conservan para el PDF',
  unIva('216973.69', 33).comprador_exacto === '13605.9')
check('una base de cero no revienta ni inventa IVA',
  (() => { const r = liquidarIva([], 19, DIEZ)
    return r.base === '0' && r.liquidado === 0 && r.comprador === 0 && r.vendedor === 0 })())
check('la aproximación hacia ABAJO da otra cosa que la cercana',
  unIva('216973.69', 50, 19, { unidad: 10, modo: 'ABAJO' }).liquidado === 41_220)
check('…y hacia ARRIBA también',
  unIva('216973.68', 50, 19, { unidad: 10, modo: 'ARRIBA' }).liquidado === 41_230)
// La aproximación del IVA es PERMISIVA: el concepto dice «podrá aproximarse».
check('el respaldo del redondeo del IVA se carga como ADOPTADO, no como exigido',
  (() => { const r = ANIO.respaldos.find(x => x.campo === 'redondeo_iva')
    return r.caracter === 'ADOPTADO' })())
check('los criterios que la norma NO define están declarados aparte',
  CRITERIOS_ADOPTADOS.length === 2 &&
  CRITERIOS_ADOPTADOS.every(c => c.adoptado_por === 'Su Finca Raíz'))
check('…incluido el del empate, con su analogía al art. 577',
  CRITERIOS_ADOPTADOS.some(c => c.clave === 'empate_aproximacion_iva' && /art\. 577/.test(c.porque)))
check('…y el del reparto al peso, diciendo por qué no es norma',
  CRITERIOS_ADOPTADOS.some(c => c.clave === 'reparto_del_iva_al_peso' && /pacto entre particulares/.test(c.porque)))
// El bruto viaja en la liquidación porque es el SOPORTE que pide el párrafo 8.
check('IVA_BRUTO viaja junto al liquidado, como soporte de la aproximación',
  L.iva.bruto === '112503.18' && L.iva.liquidado === 112_500)
check('…y la diferencia entre los dos es comprobable',
  Math.abs(Number(L.iva.bruto) - L.iva.liquidado) < 10)

lanza('un reparto fuera de rango en un aporte',
  () => liquidarIva([{ clave: 'x', base: 100, pct_comprador: 140 }], 19, DIEZ),
  'ErrorEsquemaNotarial', 'fuera de 0–100')
check('el redondeo del IVA es un pendiente del año, a nombre del titular',
  pendientesParaActivar({ ...ANIO_VACIO }, FUENTES_OFICIALES)
    .some(x => x.campo === 'redondeo_iva' && x.quien === 'titular'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ LÍMITES CONTIGUOS: la base puede traer decimales ══')
// ─────────────────────────────────────────────────────────────────────────────
// Si la base viene de un avalúo, puede tener centavos. Con límites del tipo
// «hasta 100.000.000 / desde 100.000.001», una base de 100.000.000,50 no cae
// en ningún tramo. El convenio es `desde < base ≤ hasta`, contiguo.
check('una base con decimales cae en su tramo (100.000.000,50 → 9,11 por mil)',
  evaluarTramos(ORIP, 100_000_000.5, null, 'ORIP', PESO) === 911_000,
  `(dio ${evaluarTramos(ORIP, 100_000_000.5, null, 'ORIP', PESO)})`)
// A mano: 12.852.101,50 × 9,11 / 1.000 = 117.082,644665 → 117.083.
check('medio peso por encima de una frontera ya está en el tramo siguiente',
  evaluarTramos(ORIP, 12_852_101.5, null, 'ORIP', PESO) === 117_083,
  `(dio ${evaluarTramos(ORIP, 12_852_101.5, null, 'ORIP', PESO)})`)
check('…y justo EN la frontera sigue en el tramo fijo',
  evaluarTramos(ORIP, 12_852_101, null, 'ORIP', PESO) === 53_100)
/* LA FRONTERA INFERIOR, que no tenía prueba.
 *
 * `desde < base`: el límite inferior NO pertenece al tramo. Faltaba
 * comprobarlo, y el hueco lo encontró una mutación: cambiar `base > desde` por
 * `base >= desde` SOBREVIVÍA al arnés entero. La razón es que en los bordes
 * interiores gana el primer tramo que coincide, así que el resultado no cambia;
 * el único sitio donde se nota es `base = 0`, que con `>` no cae en ningún
 * tramo y mutado se calcularía con el primero como si nada.
 *
 * Una base de 0 en una compraventa es un dato imposible y tiene que doler. */
lanza('una base de 0 no cae en ningún tramo: el límite inferior no pertenece',
  () => evaluarTramos(ORIP, 0, null, 'ORIP', PESO),
  'ErrorEsquemaNotarial', 'no cae en ningún tramo')
check('un avalúo escrito a la colombiana con centavos se lee bien',
  calcularBaseNotarial({ valor_venta: 1, avaluo_catastral: '100.000.000,50' }).valor === 100_000_000.5)
lanza('la tabla NO contigua del documento: hasta 100.000.000 / desde 100.000.001',
  () => verificarTramos([
    T(1, 0, 100_000_000, 'FIJO', 10, 'PESOS'),
    T(2, 100_000_001, null, 'FIJO', 20, 'PESOS'),
  ], null, 'x'),
  'ErrorEsquemaNotarial', 'un hueco')
check('…y el mensaje dice los dos números para poder arreglarlo',
  (() => { try {
    verificarTramos([T(1, 0, 100_000_000, 'FIJO', 10, 'PESOS'), T(2, 100_000_001, null, 'FIJO', 20, 'PESOS')], null, 'x')
    return false
  } catch (e) { return /100000000 → 100000001/.test(e.message) } })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ UN SOLO SITIO PARA CADA DATO DEL TRAMO ══')
// ─────────────────────────────────────────────────────────────────────────────
lanza('un tramo que trae su propio IVA',
  () => exigirCamposConocidosDelTramo({ ...T(1, 0, null, 'FIJO', 10, 'PESOS'), iva: 19 }, 'x'),
  'ErrorEsquemaNotarial', 'El IVA se declara en el concepto')
lanza('un tramo con una condición en texto libre',
  () => exigirCamposConocidosDelTramo({ ...T(1, 0, null, 'FIJO', 10, 'PESOS'), condicion: 'SIN_CUANTIA' }, 'x'),
  'ErrorEsquemaNotarial', 'no va como texto libre')
lanza('cualquier otro campo desconocido, para que migrar no pierda datos en silencio',
  () => exigirCamposConocidosDelTramo({ ...T(1, 0, null, 'FIJO', 10, 'PESOS'), observacion: 'algo' }, 'x'),
  'ErrorEsquemaNotarial', 'no conoce')
check('la verificación de la tabla también los caza',
  (() => { try {
    verificarTramos([{ ...T(1, 0, null, 'FIJO', 10, 'PESOS'), iva: 19 }], null, 'x')
    return false
  } catch (e) { return /grava_iva/.test(e.message) } })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ RECAUDO: valor publicado, aportes y UVB de trazabilidad ══')
// ─────────────────────────────────────────────────────────────────────────────
check('PUBLICADO devuelve la cifra tal cual, sin recalcular',
  redondear(15000, { unidad: 1, modo: 'PUBLICADO' }, 'x') === 15000)
check('…y no la mueve aunque la unidad diga centena',
  redondear(15050, { unidad: 100, modo: 'PUBLICADO' }, 'x') === 15050)
lanza('una cifra «publicada» que sale con decimales delata que se recalculó',
  () => redondear(15000.5, { unidad: 1, modo: 'PUBLICADO' }, 'x'),
  'ErrorEsquemaNotarial', 'se declaró PUBLICADA y sale con decimales')

const RECAUDO = TRAMOS_50_DESDE_BLOQUE
check('los aportes que suman el valor publicado pasan',
  (() => { verificarTramos(RECAUDO, null, 'recaudo'); return true })())
lanza('aportes que NO suman el recaudo publicado',
  () => verificarTramos([
    { ...T(1, 0, null, 'FIJO', 25000, 'PESOS'), aporte_snr: 17000, aporte_fondo: 7000 },
  ], null, 'recaudo'),
  'ErrorEsquemaNotarial', 'no suman el recaudo')
lanza('aportes institucionales sobre un tramo que no es un valor fijo',
  () => verificarTramos([
    { ...T(1, 0, null, 'TASA_SOBRE_TOTAL', 3, 'POR_MIL'), aporte_snr: 1, aporte_fondo: 2 },
  ], null, 'recaudo'),
  'ErrorEsquemaNotarial', 'no es un valor fijo')
check('el usuario ve UN solo recaudo: 28.900 para una cuantía de 100 M',
  linea('recaudo_snr').valor === 28_900, `(dio ${linea('recaudo_snr').valor})`)
check('…y el desglose institucional queda aparte, para el PDF (mitad y mitad)',
  linea('recaudo_snr').desglose_institucional?.snr === 14_450 &&
  linea('recaudo_snr').desglose_institucional?.fondo === 14_450)
check('…que suma el recaudo que paga',
  linea('recaudo_snr').desglose_institucional.snr + linea('recaudo_snr').desglose_institucional.fondo === 28_900)
check('el desglose NO altera el reparto entre comprador y vendedor',
  linea('recaudo_snr').comprador === 14_450 && linea('recaudo_snr').vendedor === 14_450)
// La UVB es solo trazabilidad: si moviera una cifra, no sería trazabilidad.
const ANIO_UVB_TOCADA = {
  ...ANIO,
  conceptos: ANIO.conceptos.map(c => c.clave !== 'recaudo_snr' ? c : {
    ...c, tramos: c.tramos.map(t => ({ ...t, valor_en_uvb: 999 })),
  }),
}
check('cambiar la UVB del tramo no mueve ninguna cifra',
  liquidar(ANIO_UVB_TOCADA, ENTRADA, { fuentes: FUENTES_OFICIALES }).totales.total === L.totales.total)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ ART. 50 TRANSCRITO: cada cifra contra su UVB ══')
// ─────────────────────────────────────────────────────────────────────────────
// La comprobación del titular, replicada: cada valor publicado sale de
// UVB × $12.110 ajustado a la centena más próxima, y cada mitad es exacta. Si
// alguna no cuadra, el error está en la transcripción, no en la tabla.
//
// Esto NO es un eco: el esperado se deriva de la UVB, que es otro dato de la
// misma fila, no del valor que estamos comprobando.
const UVB_2026 = 12_110
const aLaCentena = n => Math.round(n / 100) * 100
// Del BLOQUE, que es la transcripción. El catálogo ya no las siembra.
const TRAMOS_50 = BLOQUE_REAL
  .filter(f => /^recaudo_(snr|sin_cuantia)$/.test(f.concepto))
  .reduce((acc, f) => {
    const [, orden, qué] = f.campo.split('.')
    const llave = `${f.concepto}.${orden}`
    acc[llave] ??= {}
    acc[llave][qué] = f.valor
    return acc
  }, {})
check('son las siete filas del artículo 50', Object.keys(TRAMOS_50).length === 7,
  `(${Object.keys(TRAMOS_50).length})`)
// La UVB no está en el bloque —no es una tarifa, es la unidad— así que la
// comprobación que queda es la de las mitades, que sí está transcrita entera.
let malTranscritos = 0
for (const t of Object.values(TRAMOS_50)) {
  if (Number(t.aporte_snr) !== Number(t.valor) / 2) malTranscritos++
  if (Number(t.aporte_fondo) !== Number(t.valor) / 2) malTranscritos++
}
check('en las siete, cada aporte es la mitad exacta del recaudo',
  malTranscritos === 0, `(${malTranscritos} descuadres)`)
check('y los siete valores salen de UVB × 12.110 a la centena, con la UVB a mano',
  (() => {
    const uvb = { 19300: 1.59, 28900: 2.39, 43700: 3.61, 52700: 4.35, 71900: 5.94, 84800: 7.00, 96400: 7.96 }
    return Object.values(TRAMOS_50).every(t => aLaCentena(uvb[Number(t.valor)] * UVB_2026) === Number(t.valor))
  })())
check('los valores publicados, en orden: 19.300 · 28.900 · 43.700 · 52.700 · 71.900 · 84.800 · 96.400',
  Object.values(TRAMOS_50).map(t => Number(t.valor)).sort((a, b) => a - b).join() ===
  '19300,28900,43700,52700,71900,84800,96400')
// Los tramos del art. 50 ya no están sembrados: se teclean. Para seguir
// probando la frontera que dice el documento se reconstruyen AQUÍ, desde el
// bloque de cotejo, que es la transcripción y no una copia en el catálogo.
check('el art. 50 se reconstruye desde el bloque: 6 tramos por cuantía',
  TRAMOS_50_DESDE_BLOQUE.length === 6)
check('la tabla por cuantía cubre la recta y pasa sus guardas',
  (() => { verificarTramos(TRAMOS_50_DESDE_BLOQUE, null, 'art. 50'); return true })())

// LA FRONTERA QUE DICE EL DOCUMENTO: «De $0 hasta $100.000.000».
const recaudoDe = base => evaluarTramos(
  TRAMOS_50_DESDE_BLOQUE, base, null, 'art. 50', { unidad: 1, modo: 'PUBLICADO' })
check('$100.000.000 EXACTOS van al PRIMER tramo: 28.900', recaudoDe(100_000_000) === 28_900)
check('…y un peso más, al segundo: 43.700', recaudoDe(100_000_001) === 43_700)
check('…y medio peso más también, que es lo que el «+1» dejaba fuera',
  recaudoDe(100_000_000.5) === 43_700)
check('una cuantía de 1.500 M exactos todavía es del quinto tramo: 84.800',
  recaudoDe(1_500_000_000) === 84_800)
check('…y por encima, del abierto: 96.400', recaudoDe(1_500_000_001) === 96_400)
check('la cuantía más pequeña posible paga el primer tramo', recaudoDe(1) === 28_900)

// ── Actos sin cuantía: catalogados y calculables, fuera de la sencilla ──────
check('el acto sin cuantía NO está en la calculadora sencilla',
  CONCEPTOS_V1.find(c => c.clave === 'acto_sin_cuantia').aplica_en_sencilla === false)
check('…y no viene activado por defecto',
  CONCEPTOS_V1.find(c => c.clave === 'acto_sin_cuantia').activo_por_defecto === false)
const CON_SIN_CUANTIA = liquidar(ANIO, {
  ...ENTRADA,
  opcionales: [...ENTRADA.opcionales, 'acto_sin_cuantia', 'recaudo_sin_cuantia'],
}, { fuentes: FUENTES_OFICIALES })
const lsc = k => CON_SIN_CUANTIA.lineas.find(l => l.clave === k)
check('…pero activado y con su tarifa cargada, calcula: 90.600', lsc('acto_sin_cuantia').valor === 90_600)
check('…grava IVA: 17.214 exactos (19 % de 90.600, a mano)',
  lsc('acto_sin_cuantia').iva_exacto === '17214')
check('…y su recaudo es el de la primera fila: 19.300', lsc('recaudo_sin_cuantia').valor === 19_300)
check('…con su desglose mitad y mitad: 9.650 / 9.650',
  lsc('recaudo_sin_cuantia').desglose_institucional.snr === 9_650 &&
  lsc('recaudo_sin_cuantia').desglose_institucional.fondo === 9_650)
check('…y el recaudo del acto sin cuantía tampoco entra en BASE_IVA',
  lsc('recaudo_sin_cuantia').iva_exacto === '0')

// ── Y lo que de verdad importa: la cifra cargada NO habilita el cálculo ────
lanza('el catálogo REAL, con los tres verificados, sigue sin poder activarse',
  () => liquidar({ ...ANIO_VACIO, estado: 'ACTIVO' }, { valor_venta: 100_000_000 }, { fuentes: FUENTES_OFICIALES }),
  'AnioNoPublicable')
// Desde el vaciado, a los tres les falta la CIFRA, no solo el respaldo: es lo
// que hace que el avance arranque en 0 de 53 y que el cotejo no diga «coincide»
// sobre una copia de la transcripción.
check('a los tres que estaban sembrados ahora les falta la tarifa',
  (() => { const p = pendientesParaActivar(ANIO_VACIO, FUENTES_OFICIALES)
    return ['recaudo_snr', 'recaudo_sin_cuantia', 'acto_sin_cuantia'].every(k => {
      const label = CONCEPTOS_V1.find(c => c.clave === k).label
      return p.some(x => x.que.startsWith(label) && /falta/.test(x.que))
    }) })())
check('el avance de un año recién sembrado es 0 de 53',
  (() => { const a = avance(BLOQUE_REAL, valoresDesdeAnio(ANIO_VACIO))
    return a.cargadas === 0 && a.total === 53 && a.porcentaje === 0 })(),
  `(${JSON.stringify(avance(BLOQUE_REAL, valoresDesdeAnio(ANIO_VACIO)))})`)
check('…y el cotejo no dice «coincide» ni una vez',
  resumirCotejo(compararCotejo(BLOQUE_REAL, valoresDesdeAnio(ANIO_VACIO))).coinciden === 0)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ COPIA SIMPLE: EL IVA VA DENTRO DEL PRECIO ══')
// ─────────────────────────────────────────────────────────────────────────────
// Art. 5: $700 por cara, IVA incluido. Es el único concepto así.
check('la unidad de la copia es la CARA, no la copia',
  CONCEPTOS_V1.find(c => c.clave === 'copias').unidad_label === 'cara')
check('…y está marcada como precio con IVA incluido',
  CONCEPTOS_V1.find(c => c.clave === 'copias').precio_incluye_iva === true)
check('…y es la única del catálogo',
  CONCEPTOS_V1.filter(c => c.precio_incluye_iva).length === 1)
check('el precio no se toca: 2 caras × 3.000 = 6.000', linea('copias').valor === 6_000)
// A mano: 6.000 / 1,19 = 5.042,0168… de base y 957,9831… de IVA incluido.
check('el componente de IVA se EXTRAE: 957,98',
  Number(linea('copias').iva_incluido_exacto).toFixed(2) === '957.98',
  `(dio ${linea('copias').iva_incluido_exacto})`)
check('…y nunca se suma un 19 % encima (serían 1.140, y 7.140 de total)',
  Number(linea('copias').iva_incluido_exacto) !== 1_140 && linea('copias').valor !== 7_140)
check('el neto más el IVA incluido devuelven el precio publicado',
  Math.abs((6_000 - Number(linea('copias').iva_incluido_exacto)) +
    Number(linea('copias').iva_incluido_exacto) - 6_000) < 0.0001)
check('no aporta a BASE_IVA: su IVA ya venía liquidado en el precio',
  Number(L.iva.base) === 592_122)
check('la liquidación informa el IVA que ya venía dentro de precios',
  Number(L.iva_incluido_en_precios).toFixed(2) === '957.98',
  `(dio ${L.iva_incluido_en_precios})`)
check('…aparte del liquidado, para que el PDF pueda sumar el IVA total pagado',
  L.iva.liquidado === 112_500 && Number(L.iva_incluido_en_precios) > 0)
// Art. 5: 700 × 19/119 = 111,76 por cara. Dos caras → 223,53.
check('la extracción es precio × 19/119, no precio × 19 %',
  Math.abs(Number(linea('copias').iva_incluido_exacto) - (6_000 * 19) / 119) < 0.0001)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ UNA ENTRADA, DOS CONCEPTOS: la cantidad derivada ══')
// ─────────────────────────────────────────────────────────────────────────────
// Las hojas de la escritura alimentan dos conceptos: el papel notarial y las
// copias auténticas. Se preguntan UNA vez. Si se preguntaran dos veces se
// desincronizarían —8 arriba, 3 abajo— y el total saldría mal sin un solo error.
check('la copia auténtica declara de dónde saca las hojas',
  CONCEPTOS_V1.find(c => c.clave === 'copia_autentica').multiplica_cantidad_de === 'hojas_papel_notarial')
check('…y qué cuenta el usuario: copias, no hojas',
  CONCEPTOS_V1.find(c => c.clave === 'copia_autentica').unidad_captura_label === 'copia auténtica' &&
  CONCEPTOS_V1.find(c => c.clave === 'copia_autentica').unidad_label === 'hoja')
// A mano: 3 copias × 10 hojas = 30 hojas × $5.600 = $168.000.
check('3 copias × 10 hojas × 5.600 = 168.000', linea('copia_autentica').valor === 168_000,
  `(dio ${linea('copia_autentica').valor})`)
check('…y el desglose se imprime, no se deja adivinar',
  linea('copia_autentica').avisos.some(a => a === '3 copias auténticas × 10 hojas = 30 hojas.'),
  `(${JSON.stringify(linea('copia_autentica').avisos)})`)
check('las hojas del papel notarial siguen siendo 10, no 30',
  linea('hojas_papel_notarial').valor === 70_000)
// Cambiar las hojas mueve LOS DOS conceptos, que es el punto.
const MAS_HOJAS = liquidar(ANIO, {
  ...ENTRADA, cantidades: { ...ENTRADA.cantidades, hojas_papel_notarial: 12 },
}, { fuentes: FUENTES_OFICIALES })
check('subir las hojas a 12 mueve el papel notarial',
  MAS_HOJAS.lineas.find(l => l.clave === 'hojas_papel_notarial').valor === 84_000)
check('…y arrastra las copias auténticas: 3 × 12 × 5.600 = 201.600',
  MAS_HOJAS.lineas.find(l => l.clave === 'copia_autentica').valor === 201_600)
check('…sin que exista ninguna segunda entrada de hojas que pudiera discrepar',
  !Object.keys(ENTRADA.cantidades).some(k => /hoja/i.test(k) && k !== 'hojas_papel_notarial'))

// ── La copia AUTÉNTICA no es la simple ─────────────────────────────────────
check('la auténtica NO lleva el IVA dentro del precio',
  !CONCEPTOS_V1.find(c => c.clave === 'copia_autentica').precio_incluye_iva)
check('…así que sí entra en BASE_IVA, con sus 168.000',
  Number(L.iva.base) === 330_122 + 70_000 + 24_000 + 168_000)
check('…y la simple sigue fuera, con su IVA dentro del precio',
  linea('copias').iva_exacto === '0' && Number(linea('copias').iva_incluido_exacto) > 0)
check('la auténtica aporta IVA exacto: 31.920 (19 % de 168.000, a mano)',
  linea('copia_autentica').iva_exacto === '31920')
check('el reparto de la auténtica NO cuelga del Código Civil',
  (() => { const c = CONCEPTOS_V1.find(x => x.clave === 'copia_autentica')
    return c.motivo_reparto === 'CONFIGURACION' && c.norma_reparto === null })())
check('…mientras las hojas del art. 2 tampoco lo afirman',
  CONCEPTOS_V1.find(c => c.clave === 'hojas_papel_notarial').motivo_reparto === 'CONFIGURACION')
check('…y los derechos de escritura siguen siendo el único con norma supletiva',
  CONCEPTOS_V1.filter(c => c.motivo_reparto === 'NORMA_SUPLETIVA').length === 1)

// ── El supuesto de la sencilla, declarado ──────────────────────────────────
const S2 = liquidar(ANIO, { valor_venta: 100_000_000, cantidades: { hojas_papel_notarial: 10 } },
  { modo: 'SENCILLA', fuentes: FUENTES_OFICIALES })
const ls2 = S2.lineas.find(l => l.clave === 'copia_autentica')
check('la sencilla incluye la copia auténtica: sin ella la ORIP no inscribe', !!ls2)
check('…asumiendo 1 copia: 1 × 10 × 5.600 = 56.000', ls2.valor === 56_000)
check('…y DICIENDO que la asumió', ls2.avisos.some(a => /Se asumió 1 copia auténtica/.test(a)))
check('…y HACIA DÓNDE desvía: si expiden más, sube',
  ls2.avisos.some(a => a === 'Se asumió 1 copia auténtica. Si la notaría expide más, el costo sube.'),
  `(${JSON.stringify(ls2.avisos)})`)
check('la estimación de las hojas también dice su dirección',
  S2.lineas.find(l => l.clave === 'hojas_papel_notarial').avisos
    .some(a => /puede subir o bajar/.test(a)))
check('…marcada como estimación', ls2.avisos.some(a => /Es una estimación/.test(a)))
lanza('en la avanzada no se asume: si falta la cantidad, se detiene',
  () => liquidar(ANIO, { ...ENTRADA, cantidades: { hojas_papel_notarial: 10, copias: 2, biometria: 3 } },
    { fuentes: FUENTES_OFICIALES }),
  'ErrorDeEntrada', 'copias auténticas')
check('un supuesto de la sencilla no puede existir sin declararse como estimación',
  (() => { try {
    verificarConcepto({ ...CONCEPTOS_V1.find(c => c.clave === 'copia_autentica'),
      es_estimacion_en_sencilla: false }, null)
    return false
  } catch (e) { return /supuesto que no se declara/.test(e.message) } })())

// ── Las guardas de la derivación ───────────────────────────────────────────
lanza('una estimación de la sencilla que no dice hacia dónde desvía',
  () => verificarConcepto({ ...CONCEPTOS_V1.find(c => c.clave === 'copia_autentica'),
    sesgo_en_sencilla: null }, null),
  'ErrorEsquemaNotarial', 'dirección del sesgo es parte del supuesto')
check('las dos estimaciones de la sencilla declaran su dirección',
  CONCEPTOS_V1.filter(c => c.es_estimacion_en_sencilla)
    .every(c => String(c.sesgo_en_sencilla ?? '').trim().length > 0))
check('…y la de las hojas admite que puede ir en los dos sentidos',
  /puede subir o bajar/.test(CONCEPTOS_V1.find(c => c.clave === 'hojas_papel_notarial').sesgo_en_sencilla))
lanza('una etiqueta de varias palabras sin su plural escrito',
  () => verificarConcepto({ ...CONCEPTOS_V1.find(c => c.clave === 'copia_autentica'),
    unidad_captura_plural: null }, null),
  'ErrorEsquemaNotarial', 'no pluraliza añadiendo')
lanza('…y lo mismo en la unidad de la tarifa',
  () => verificarConcepto({ ...CONCEPTOS_V1.find(c => c.clave === 'autenticaciones'),
    unidad_plural: null }, null),
  'ErrorEsquemaNotarial', 'no pluraliza añadiendo')
check('una etiqueta de una sola palabra no necesita plural escrito',
  (() => { verificarConcepto({ ...CONCEPTOS_V1.find(c => c.clave === 'hojas_papel_notarial'),
    unidad_plural: null }, null); return true })())
lanza('un concepto que multiplica su propia cantidad',
  () => verificarConcepto({ ...CONCEPTOS_V1.find(c => c.clave === 'copia_autentica'),
    multiplica_cantidad_de: 'copia_autentica' }, null),
  'ErrorEsquemaNotarial', 'su propia cantidad')
lanza('una cantidad derivada sin decir qué cuenta el usuario',
  () => verificarConcepto({ ...CONCEPTOS_V1.find(c => c.clave === 'copia_autentica'),
    unidad_captura_label: null }, null),
  'ErrorEsquemaNotarial', 'no dice qué cuenta el usuario')
lanza('una cantidad derivada en un concepto que no se cobra por unidad',
  () => verificarConcepto({ ...CONCEPTOS_V1.find(c => c.clave === 'copia_autentica'),
    tipo: 'FIJO' }, null),
  'ErrorEsquemaNotarial', 'no se cobra por unidad')
lanza('multiplicar la cantidad de un concepto que no está en el año',
  () => verificarEsquema({
    anio: 2026, estado: 'BORRADOR', version: 1, cerrado: false, reglas_retencion: [GENERAL],
    conceptos: [{ ...CONCEPTOS_V1.find(c => c.clave === 'copia_autentica'),
      multiplica_cantidad_de: 'inventado' }],
  }),
  'ErrorEsquemaNotarial', 'no está en el año')
lanza('una cadena de derivaciones, aunque respete el orden',
  () => liquidar({
    ...ANIO,
    conceptos: ANIO.conceptos.map(c => {
      if (c.clave === 'copias') {
        return { ...c, multiplica_cantidad_de: 'hojas_papel_notarial',
          unidad_captura_label: 'juego', unidad_captura_plural: 'juegos' }
      }
      if (c.clave === 'copia_autentica') return { ...c, multiplica_cantidad_de: 'copias' }
      return c
    }),
  }, ENTRADA, { fuentes: FUENTES_OFICIALES }),
  'ErrorEsquemaNotarial', 'Sin cadenas')
lanza('un derivado cuyo origen va DESPUÉS en el orden de inserción',
  () => verificarEsquema({
    ...ANIO,
    conceptos: ANIO.conceptos.map(c => c.clave !== 'hojas_papel_notarial' ? c : {
      ...c, multiplica_cantidad_de: 'biometria',
      unidad_captura_label: 'juego', unidad_captura_plural: 'juegos',
    }),
  }),
  'ErrorEsquemaNotarial', 'que va después')
check('el catálogo real cumple el orden: las hojas van antes que las copias auténticas',
  (() => { exigirOrdenDeDerivados(CONCEPTOS_V1); return true })())
check('…y el origen tiene un orden menor, que es lo que exige la clave ajena',
  CONCEPTOS_V1.find(c => c.clave === 'hojas_papel_notarial').orden <
  CONCEPTOS_V1.find(c => c.clave === 'copia_autentica').orden)

// ── Autenticaciones: la unidad y cuándo aplica ─────────────────────────────
check('la unidad es «firma o diligencia», no «autenticación»',
  CONCEPTOS_V1.find(c => c.clave === 'autenticaciones').unidad_label === 'firma o diligencia')
check('…y la ayuda dice cuándo aplica: solo si alguna parte actúa por poder',
  /por poder/.test(CONCEPTOS_V1.find(c => c.clave === 'autenticaciones').ayuda ?? ''))
check('…y que en una compraventa firmada ante el notario no hay',
  /no hay autenticaciones/.test(CONCEPTOS_V1.find(c => c.clave === 'autenticaciones').ayuda ?? ''))
check('sigue opcional y apagada por defecto',
  (() => { const c = CONCEPTOS_V1.find(x => x.clave === 'autenticaciones')
    return c.opcional === true && c.activo_por_defecto === false })())
check('la copia auténtica, en cambio, NO es opcional: es gasto de todo cierre',
  CONCEPTOS_V1.find(c => c.clave === 'copia_autentica').opcional === false)
// El $280 del art. 6 par. 1 sigue SIN modelar, a propósito.
check('la hoja adicional de reconocimiento no está en el catálogo',
  !CONCEPTOS_V1.some(c => /hoja adicional|reconocimiento/i.test(c.label)))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ CONDICIONES: ni texto libre ni comparación muda ══')
// ─────────────────────────────────────────────────────────────────────────────
check('el campo de texto declara sus valores admitidos',
  CAMPOS_CONDICION.find(c => c.campo === 'tipo_persona_vendedor').valores.join() === 'NATURAL,JURIDICA')
lanza('«juridica» en minúscula se rechaza al cargar la regla',
  () => exigirValorDeCondicion({ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'juridica' }),
  'ErrorEsquemaNotarial', 'Mayúsculas incluidas')
check('«JURIDICA» se acepta',
  (() => { exigirValorDeCondicion({ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'JURIDICA' }); return true })())
lanza('un valor que no está en la lista',
  () => exigirValorDeCondicion({ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'SOCIEDAD' }),
  'ErrorEsquemaNotarial', 'solo admite')
lanza('un «sí» en un campo de sí o no',
  () => exigirValorDeCondicion({ campo: 'es_casa_habitacion', operador: 'IGUAL', valor: 'si' }),
  'ErrorEsquemaNotarial', 'true o false')
lanza('una palabra en un campo numérico',
  () => exigirValorDeCondicion({ campo: 'valor_en_uvt', operador: 'MAYOR', valor: 'mucho' }),
  'ErrorEsquemaNotarial', 'es numérico')
lanza('una condición sin valor',
  () => exigirValorDeCondicion({ campo: 'valor_en_uvt', operador: 'MAYOR', valor: '' }),
  'ErrorEsquemaNotarial', 'no tiene valor')
lanza('una regla cargada con el valor en minúscula no se guarda',
  () => verificarReglas([
    { ...GENERAL, clave: 'exc', orden: 10, condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'juridica' }] },
    GENERAL,
  ]),
  'ErrorEsquemaNotarial', 'Mayúsculas incluidas')
lanza('y si la simulación manda «juridica», tampoco falla en silencio',
  () => calcularRetencion([
    { ...GENERAL, clave: 'exenta', orden: 10, tipo_efecto: 'EXENCION', valor_efecto: null,
      condiciones: [{ campo: 'tipo_persona_vendedor', operador: 'IGUAL', valor: 'JURIDICA' }] },
    GENERAL,
  ], 100_000_000, { tipo_persona_vendedor: 'juridica' }),
  'ErrorEsquemaNotarial', 'solo admite')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ VIGENCIA: EL AÑO ES UNA ETIQUETA, NO UN RANGO ══')
// ─────────────────────────────────────────────────────────────────────────────
// RES-2026-000964-6, art. 56: rige desde el 1 de febrero de 2026.
// RES-2026-001726-6, art. 29: rige desde el 2 de febrero de 2026 — NO desde el
// 29 de enero, que es lo que dice el texto original de ese artículo. Lo modificó
// la RES-2026-001896-6 del 30 de enero, un documento que el art. 29 no menciona
// y que solo aparece si se busca si esa norma fue modificada.
// Las dos son «de 2026», ninguna empieza en enero y no empiezan el mismo día.

check('las fechas se leen como texto ISO', esFechaIso('2026-02-01'))
check('…y el 31 de febrero no existe aunque cumpla el formato', !esFechaIso('2026-02-31'))
check('…ni «1 de febrero»', !esFechaIso('1 de febrero'))
check('…ni un mes 13', !esFechaIso('2026-13-01'))
check('el orden alfabético ES el cronológico: 2026-01-15 < 2026-02-01',
  '2026-01-15' < '2026-02-01')

const NOTARIAL = RESP('uvt')
check('la norma cubre el día en que empieza a regir', cubreLaFecha(NOTARIAL, '2026-02-01'))
check('…y no el día anterior', !cubreLaFecha(NOTARIAL, '2026-01-31'))
check('…ni un acto de mediados de enero', !cubreLaFecha(NOTARIAL, '2026-01-15'))
// La anterior: Resolución 585 de 2025, derogada por el art. 56 desde el 1 de
// febrero de 2026. Es la que SÍ cubre un acto del 15 de enero de 2026.
const ANTERIOR = {
  ...NOTARIAL, norma: 'Resolución 585 de 2025',
  vigencia_desde: '2025-02-01', vigencia_hasta: '2026-01-31',
}
check('la resolución de 2025 SÍ cubre un acto del 15 de enero de 2026',
  cubreLaFecha(ANTERIOR, '2026-01-15'))
check('…y el día de su derogatoria todavía', cubreLaFecha(ANTERIOR, '2026-01-31'))
check('…y ya no el 1 de febrero, cuando entra la nueva',
  !cubreLaFecha(ANTERIOR, '2026-02-01'))
check('las dos normas no se solapan ni dejan hueco en la frontera',
  cubreLaFecha(ANTERIOR, '2026-01-31') && !cubreLaFecha(NOTARIAL, '2026-01-31') &&
  !cubreLaFecha(ANTERIOR, '2026-02-01') && cubreLaFecha(NOTARIAL, '2026-02-01'))

// EL CASO QUE PEDISTE: una escritura del 15 de enero de 2026 contra el año 2026.
let fuera = null
try {
  liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-01-15' }, { fuentes: FUENTES_OFICIALES })
} catch (e) { fuera = e }
check('un acto del 15 de enero de 2026 NO se liquida con las tarifas de 2026',
  fuera?.name === 'FueraDeVigencia', `(lanzó ${fuera?.name})`)
check('…y el aviso nombra el artículo de la vigencia (art. 56)',
  /art\. 56/.test(fuera?.message ?? ''))
check('…y dice desde cuándo rige',
  /rige desde el 2026-02-01/.test(fuera?.message ?? ''))
check('…y dice qué hacer: cargar el año que SÍ regía',
  /Carga el año tarifario que estaba vigente/.test(fuera?.message ?? ''))
check('…y trae las normas en el error, no solo en el texto',
  Array.isArray(fuera?.normas) && fuera.normas.length > 0 &&
  fuera.normas.every(n => n.vigencia_desde === '2026-02-01'))
check('…nombrándolas TODAS, no solo la primera', fuera.normas.length > 1,
  `(${fuera?.normas?.length} normas)`)

check('el 1 de febrero de 2026 sí liquida',
  liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-02-01' }, { fuentes: FUENTES_OFICIALES })
    .totales.total === 3_728_742)
check('el 31 de enero de 2026 no',
  (() => { try {
    liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-01-31' }, { fuentes: FUENTES_OFICIALES })
    return false
  } catch (e) { return e.name === 'FueraDeVigencia' } })())

// LAS DOS RESOLUCIONES NO EMPIEZAN EL MISMO DÍA: la notarial el 1 de febrero,
// la registral el 2. Hay un día —el 1 de febrero— en que ya rige una y no la
// otra, y en ese día no se puede liquidar una escritura completa.
const ES_REGISTRAL = r => r.campo === 'base_orip' || r.campo === 'base_registro'
const ANIO_DOS_NORMAS = {
  ...ANIO,
  respaldos: ANIO.respaldos.map(r => ES_REGISTRAL(r)
    ? {
      ...r, norma: 'Resolución RES-2026-001726-6', vigencia_desde: '2026-02-02',
      articulo_vigencia: 'art. 29, modificado por la RES-2026-001896-6',
    }
    : r),
}
let elUno = null
try {
  liquidar(ANIO_DOS_NORMAS, { ...ENTRADA, fecha_acto: '2026-02-01' }, { fuentes: FUENTES_OFICIALES })
} catch (e) { elUno = e }
check('el 1 de febrero se detiene SOLO por la registral, que empieza el 2',
  elUno?.name === 'FueraDeVigencia' &&
  elUno.normas.length > 0 && elUno.normas.every(n => n.vigencia_desde === '2026-02-02'),
  `(${elUno?.name}: ${elUno?.normas?.map(n => n.vigencia_desde).join()})`)
check('…y la notarial NO aparece: el 1 de febrero ya regía',
  !elUno.normas.some(n => /000964/.test(n.norma)))
check('…y el aviso nombra la modificatoria, no solo el art. 29',
  /RES-2026-001896-6/.test(elUno.message))

let elTreinta = null
try {
  liquidar(ANIO_DOS_NORMAS, { ...ENTRADA, fecha_acto: '2026-01-30' }, { fuentes: FUENTES_OFICIALES })
} catch (e) { elTreinta = e }
check('el 30 de enero se detiene por LAS DOS',
  elTreinta?.name === 'FueraDeVigencia' &&
  elTreinta.normas.some(n => n.vigencia_desde === '2026-02-01') &&
  elTreinta.normas.some(n => n.vigencia_desde === '2026-02-02'),
  `(${elTreinta?.normas?.map(n => n.vigencia_desde).join()})`)
check('…y el 2 de febrero ya liquida con las dos',
  liquidar(ANIO_DOS_NORMAS, { ...ENTRADA, fecha_acto: '2026-02-02' }, { fuentes: FUENTES_OFICIALES })
    .totales.total === 3_728_742)
check('el único día con una norma vigente y la otra no es el 1 de febrero',
  (() => {
    const liquida = f => { try {
      liquidar(ANIO_DOS_NORMAS, { ...ENTRADA, fecha_acto: f }, { fuentes: FUENTES_OFICIALES }); return true
    } catch { return false } }
    return !liquida('2026-01-31') && !liquida('2026-02-01') && liquida('2026-02-02')
  })())

// La fecha del acto sale en la liquidación, para que el PDF la imprima.
check('sin fecha del acto se usa hoy, y se devuelve',
  liquidar(ANIO, ENTRADA, { fuentes: FUENTES_OFICIALES, fecha: new Date('2026-10-06T12:00:00-05:00') }).fecha_acto === '2026-10-06')
check('con fecha del acto, se devuelve esa',
  liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-03-15' }, { fuentes: FUENTES_OFICIALES }).fecha_acto === '2026-03-15')
lanza('una fecha del acto ilegible',
  () => liquidar(ANIO, { ...ENTRADA, fecha_acto: '15/01/2026' }, { fuentes: FUENTES_OFICIALES }),
  'ErrorEsquemaNotarial', 'la fecha del acto')
lanza('una fecha del acto que no existe',
  () => liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-02-30' }, { fuentes: FUENTES_OFICIALES }),
  'ErrorEsquemaNotarial', 'la fecha del acto')

// Un concepto OPCIONAL y apagado cuya norma empieza más tarde no estorba.
const ANIO_OPCIONAL_FUTURO = {
  ...ANIO,
  conceptos: ANIO.conceptos.map(c => c.clave !== 'firma_digital' ? c : {
    ...c, respaldos: (c.respaldos ?? []).map(r => ({ ...r, vigencia_desde: '2027-01-01' })),
  }),
}
check('una tarifa apagada cuya norma rige el año que viene no detiene la liquidación',
  liquidar(ANIO_OPCIONAL_FUTURO, ENTRADA, { fuentes: FUENTES_OFICIALES }).totales.total === 3_728_742)
check('…pero encendida, sí la detiene',
  (() => { try {
    liquidar(ANIO_OPCIONAL_FUTURO, { ...ENTRADA, opcionales: [...ENTRADA.opcionales, 'firma_digital'],
      cantidades: { ...ENTRADA.cantidades, firma_digital: 1 } }, { fuentes: FUENTES_OFICIALES })
    return false
  } catch (e) { return e.name === 'FueraDeVigencia' } })())

// AISLAR LA COMPROBACIÓN DEL AÑO: si solo el UVT queda fuera de vigencia y
// todas las tarifas están en regla, lo único que puede detener la liquidación
// es la comprobación de los respaldos DEL AÑO.
const ANIO_UVT_FUTURO = {
  ...ANIO,
  respaldos: ANIO.respaldos.map(r => r.campo === 'uvt' ? { ...r, vigencia_desde: '2026-03-01' } : r),
}
check('el año de referencia sí liquida un acto del 15 de febrero',
  liquidar(ANIO, { ...ENTRADA, fecha_acto: '2026-02-15' }, { fuentes: FUENTES_OFICIALES })
    .totales.total === 3_728_742)
let soloAnio = null
try {
  liquidar(ANIO_UVT_FUTURO, { ...ENTRADA, fecha_acto: '2026-02-15' }, { fuentes: FUENTES_OFICIALES })
} catch (e) { soloAnio = e }
check('…y con el UVT rigiendo desde marzo, se detiene',
  soloAnio?.name === 'FueraDeVigencia', `(lanzó ${soloAnio?.name})`)
check('…nombrando el UVT y solo el UVT',
  soloAnio?.normas?.length === 1 && soloAnio.normas[0].campo === 'uvt')

check('exigirVigencia con todo en regla no lanza',
  (() => { exigirVigencia([NOTARIAL], '2026-05-05'); return true })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ COPIAR UN AÑO NO COPIA LOS RESPALDOS ══')
// ─────────────────────────────────────────────────────────────────────────────
const C2027 = copiarAnio(ANIO, 2027)
check('el año copiado conserva la estructura', C2027.conceptos.length === 19)
check('…y NINGUNA tarifa', C2027.conceptos.every(c => c.valor === null && (c.tramos ?? []).length === 0))
check('…ni un solo respaldo', C2027.conceptos.every(c => (c.respaldos ?? []).length === 0) && C2027.respaldos.length === 0)
check('…ni el UVT', C2027.uvt === null)
check('…y nace en borrador con versión 1', C2027.estado === 'BORRADOR' && C2027.version === 1)
lanza('el año copiado NO puede liquidar con los PDF del año viejo',
  () => liquidar({ ...C2027, estado: 'ACTIVO' }, ENTRADA, { fuentes: FUENTES_OFICIALES }),
  'AnioNoPublicable')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TRAZABILIDAD DEL PDF (sin identificador recuperable) ══')
// ─────────────────────────────────────────────────────────────────────────────
check('el código lleva año, versión de parámetros, versión de motor y fecha',
  L.trazabilidad === `SFR-N2026/P07/M${String(VERSION_MOTOR).padStart(2, '0')}/2026-10-06`,
  `(dio ${L.trazabilidad})`)
check('cambia si cambian los parámetros del año',
  codigoTrazabilidad({ anio: 2026, version: 8, fecha: new Date('2026-10-06T12:00:00-05:00') }) !== L.trazabilidad)
check('el aviso de no almacenado existe y lo dice en claro',
  /no se almacena/.test(AVISO_NO_ALMACENADO))
lanza('una versión de parámetros inválida', () => codigoTrazabilidad({ anio: 2026, version: 0 }),
  'ErrorEsquemaNotarial', 'Versión de parámetros')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ DIVERGENCIA CON EL AÑO FISCAL: AVISA, NO BLOQUEA ══')
// ─────────────────────────────────────────────────────────────────────────────
check('UVT distinto en los dos módulos → avisa', !!divergenciaUvt(50000, 49799))
check('…nombrando los dos valores', /50000/.test(divergenciaUvt(50000, 49799)) && /49799/.test(divergenciaUvt(50000, 49799)))
check('iguales → no avisa', divergenciaUvt(50000, 50000) === null)
check('el fiscal en borrador y vacío NO produce un aviso falso', divergenciaUvt(50000, null) === null)
check('y la divergencia no impide liquidar',
  (() => { try { exigirAnioPublicable(ANIO, FUENTES_OFICIALES); return true } catch { return false } })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ REPARTO AL PESO ══')
// ─────────────────────────────────────────────────────────────────────────────
check('un impar al 50 % no pierde ni inventa un peso',
  (() => { const r = repartir(30901, 50); return r.comprador + r.vendedor === 30901 })())
check('el 0 % deja todo al vendedor', repartir(1000, 0).vendedor === 1000)
check('el 100 % deja todo al comprador', repartir(1000, 100).comprador === 1000)
check('un reparto raro (37 %) sigue cuadrando',
  (() => { const r = repartir(999_999, 37); return r.comprador + r.vendedor === 999_999 })())

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ COTEJO: DOS LECTURAS DEL MISMO PAPEL ══')
// ─────────────────────────────────────────────────────────────────────────────
// Lo que esto verifica no lo puede verificar ningún otro arnés: que la cifra
// CARGADA sea la que dice el PDF. El motor puede calcular impecablemente sobre
// un número mal leído, con todo en verde.
check('el bloque del documento parsea', BLOQUE_REAL.length === 53, `(${BLOQUE_REAL.length} filas)`)
check('…sin filas repetidas', new Set(BLOQUE_REAL.map(f => `${f.concepto}·${f.campo}`)).size === BLOQUE_REAL.length)
check('…y cada fila dice de qué artículo sale', BLOQUE_REAL.every(f => f.articulo.length > 0))
// El bloque de cotejo sigue teniendo las 53 cifras: la transcripción no se
// tocó. Lo que se vació es la SIEMBRA, que era una copia suya.
check('cubre los siete tramos del art. 50',
  BLOQUE_REAL.filter(f => /^recaudo_(snr|sin_cuantia)$/.test(f.concepto) && /\.valor$/.test(f.campo)).length === 7)
check('…y sus catorce aportes institucionales',
  BLOQUE_REAL.filter(f => /aporte_(snr|fondo)$/.test(f.campo)).length === 14)
check('cubre los cinco tramos registrales',
  BLOQUE_REAL.filter(f => f.concepto === 'derechos_orip' && /\.valor$/.test(f.campo)).length === 5)
check('los tramos abiertos se transcriben como «abierto»',
  BLOQUE_REAL.filter(f => f.valor === 'abierto').length === 4)

lanza('un bloque sin las marcas', () => leerBloqueCotejo('nada aquí'), 'ErrorBloqueCotejo', 'faltan las marcas')
lanza('un bloque con la cabecera cambiada',
  () => leerBloqueCotejo('<!-- COTEJO:INICIO -->\n| a | b |\n<!-- COTEJO:FIN -->'),
  'ErrorBloqueCotejo', 'la cabecera tiene que ser')
lanza('un bloque vacío',
  () => leerBloqueCotejo('<!-- COTEJO:INICIO -->\n| concepto | campo | valor | unidad | articulo |\n<!-- COTEJO:FIN -->'),
  'ErrorBloqueCotejo', 'ni una fila')
lanza('una cifra transcrita dos veces',
  () => leerBloqueCotejo('<!-- COTEJO:INICIO -->\n| concepto | campo | valor | unidad | articulo |\n' +
    '| x | valor | 1 | PESOS | art. 1 |\n| x | valor | 2 | PESOS | art. 1 |\n<!-- COTEJO:FIN -->'),
  'ErrorBloqueCotejo', 'dos veces')
lanza('una fila sin artículo',
  () => leerBloqueCotejo('<!-- COTEJO:INICIO -->\n| concepto | campo | valor | unidad | articulo |\n' +
    '| x | valor | 1 | PESOS |  |\n<!-- COTEJO:FIN -->'),
  'ErrorBloqueCotejo', 'falta articulo')

// ── Las cuatro conclusiones, no dos ────────────────────────────────────────
const FT = f => ({ concepto: 'x', campo: 'valor', valor: '100', unidad: 'PESOS', articulo: 'art. 1', ...f })
check('dos lecturas iguales: COINCIDE',
  compararCotejo([FT({})], [FT({})])[0].estado === 'COINCIDE')
check('valor distinto: DIFIERE',
  compararCotejo([FT({})], [FT({ valor: '110' })])[0].estado === 'DIFIERE')
check('…diciendo las dos cifras',
  compararCotejo([FT({})], [FT({ valor: '110' })])[0].diferencias
    .some(d => /el documento dice 100 y la base tiene 110/.test(d)))
check('UNIDAD distinta: DIFIERE, y es tan grave como el valor',
  (() => { const r = compararCotejo([FT({ valor: '3', unidad: 'POR_MIL' })], [FT({ valor: '3', unidad: 'PORCENTAJE' })])[0]
    return r.estado === 'DIFIERE' && r.diferencias.some(d => /unidad/.test(d)) })())
// EL ARTÍCULO ES NAVEGACIÓN EN LA PANTALLA Y DATO EN EL RESPALDO. Solo se
// compara cuando el respaldo ya lo trae: mientras no hay respaldo no hay
// segunda lectura, y reportar «difiere» contra un vacío convertiría una carga
// a medias en un falso hallazgo.
check('ARTÍCULO distinto: DIFIERE, porque uno de los dos leyó otro artículo',
  compararCotejo([FT({})], [FT({ articulo: 'art. 2' })])[0].estado === 'DIFIERE')
// Las dos lecturas no tienen la misma granularidad: un respaldo cubre todos los
// tramos con «art. 50» y la transcripción distingue el parágrafo. Eso es un
// refinamiento, no una contradicción.
check('un artículo MÁS específico no es una diferencia',
  compararCotejo([FT({ articulo: 'art. 50 parágrafo' })], [FT({ articulo: 'art. 50' })])[0].estado === 'COINCIDE')
check('…ni al revés', 
  compararCotejo([FT({ articulo: 'art. 50' })], [FT({ articulo: 'art. 50 parágrafo' })])[0].estado === 'COINCIDE')
check('pero art. 50 contra art. 51 sí lo es',
  compararCotejo([FT({ articulo: 'art. 50' })], [FT({ articulo: 'art. 51' })])[0].estado === 'DIFIERE')
check('…y el mensaje lo dice así',
  compararCotejo([FT({})], [FT({ articulo: 'art. 2' })])[0].diferencias
    .some(d => /leyó otro artículo/.test(d)))
check('sin respaldo todavía, el artículo NO se reporta como diferencia',
  compararCotejo([FT({})], [FT({ articulo: '' })])[0].estado === 'COINCIDE')
check('…pero una CIFRA distinta sigue difiriendo aunque falte el respaldo',
  compararCotejo([FT({})], [FT({ articulo: '', valor: '110' })])[0].estado === 'DIFIERE')
check('cargado y no transcrito: SIN_TRANSCRIBIR',
  compararCotejo([], [FT({})])[0].estado === 'SIN_TRANSCRIBIR')
check('transcrito y no cargado: SIN_CARGAR',
  compararCotejo([FT({})], [])[0].estado === 'SIN_CARGAR')

check('«52.374» y «52374» son la misma cifra', normalizarValor('52.374') === normalizarValor('52374'))
check('«3,00» y «3» también', normalizarValor('3,00') === normalizarValor('3'))
check('«12.60» y «12,6» también', normalizarValor('12.60') === normalizarValor('12,6'))
check('«abierto» y vacío son lo mismo', normalizarValor('abierto') === normalizarValor(''))
check('pero 3 y 30 NO', normalizarValor('3') !== normalizarValor('30'))
check('y «9.11» por mil no se confunde con 911',
  normalizarValor('9.11') !== normalizarValor('911'))

// ── `apto`: lo que bloquea activar y lo que no ─────────────────────────────
check('una diferencia impide activar',
  resumirCotejo(compararCotejo([FT({})], [FT({ valor: '110' })])).apto === false)
check('una cifra cargada SIN transcribir también lo impide',
  resumirCotejo(compararCotejo([], [FT({})])).apto === false)
check('lo que falta por cargar NO lo impide: eso ya lo bloquea el respaldo',
  resumirCotejo(compararCotejo([FT({})], [])).apto === true)

// ── La derivación de las filas desde el año cargado ────────────────────────
const FILAS = valoresDesdeAnio(ANIO)
check('el año de prueba produce filas de cotejo', FILAS.length > 20, `(${FILAS.length})`)
check('los tramos salen uno por uno, no agrupados',
  FILAS.filter(f => f.concepto === 'recaudo_snr' && /^tramo\.\d+\.valor$/.test(f.campo)).length === 6)
check('el límite abierto se deriva como «abierto»',
  FILAS.some(f => f.campo === 'tramo.6.hasta' && f.valor === 'abierto'))
check('la unidad de la tarifa viaja con el tramo',
  FILAS.some(f => f.concepto === 'derechos_escritura' && f.campo === 'tramo.2.valor' && f.unidad === 'POR_MIL'))
check('la unidad de un límite es la del límite, no la de la tarifa',
  FILAS.find(f => f.concepto === 'derechos_escritura' && f.campo === 'tramo.1.hasta').unidad === 'PESOS')
check('un concepto sin valor no produce fila',
  !FILAS.some(f => f.concepto === 'predial_pendiente'))
check('los aportes institucionales se cotejan uno a uno, sin deducir la mitad',
  FILAS.filter(f => /aporte_(snr|fondo)$/.test(f.campo)).length === 14)

/* N-02 · LA EMISIÓN DE LOS DOS PARÁMETROS QUE ANTES NO VIAJABAN.
 * Sin estas dos verificaciones, borrar los `out.push` del modo o del redondeo
 * en `datos.ts` dejaría el arnés entero en verde: las fixtures sintéticas del
 * bloque N-02 no pasan por `valoresDesdeAnio`, así que no lo notarían. */
check('N-02 · el MODO de cada tramo viaja al cotejo, uno por tramo',
  FILAS.filter(f => f.concepto === 'recaudo_snr' && /^tramo\.\d+\.modo$/.test(f.campo)).length === 6,
  `(${FILAS.filter(f => f.concepto === 'recaudo_snr' && /\.modo$/.test(f.campo)).length})`)
/* El `length > 0` no es decorativo: un `every` sobre la lista vacía pasa, y
 * esta verificación existe justo para el caso en que la lista podría vaciarse. */
check('…y sin unidad: un modo es un nombre, no una magnitud',
  (() => { const m = FILAS.filter(f => /^tramo\.\d+\.modo$/.test(f.campo))
    return m.length > 0 && m.every(f => f.unidad === '') })())
check('N-02 · el REDONDEO viaja en dos filas, unidad y modo por separado',
  FILAS.some(f => f.concepto === 'recaudo_snr' && f.campo === 'redondeo.unidad') &&
  FILAS.some(f => f.concepto === 'recaudo_snr' && f.campo === 'redondeo.modo'))

// EL CASO QUE JUSTIFICA TODO ESTO: la cifra mal leída del papel.
const CON_ERRATA = valoresDesdeAnio(ANIO).map(f =>
  f.concepto === 'recaudo_snr' && f.campo === 'tramo.1.valor' ? { ...f, valor: '28090' } : f)
check('un 28.900 teclado como 28.090 se detecta',
  (() => { const r = compararCotejo(BLOQUE_REAL, CON_ERRATA)
      .find(x => x.concepto === 'recaudo_snr' && x.campo === 'tramo.1.valor')
    return r.estado === 'DIFIERE' && r.diferencias.some(d => /28900/.test(d) && /28090/.test(d)) })())
check('…y deja el cotejo como NO apto',
  resumirCotejo(compararCotejo(BLOQUE_REAL, CON_ERRATA)).apto === false)

// ── EL VEREDICTO DEL PANEL NO PUEDE LLEVAR LA CIFRA TRANSCRITA ─────────────
// Si la llevara, el titular la leería y la copiaría, y el cotejo pasaría de
// comparar dos lecturas del PDF a comparar una consigo misma.
const CARGADO_MAL = valoresDesdeAnio(ANIO).map(f =>
  f.concepto === 'recaudo_snr' && f.campo === 'tramo.1.valor' ? { ...f, valor: '28090' } : f)
const VEREDICTO = veredictoPorSeccion(BLOQUE_REAL, CARGADO_MAL)
const SERIALIZADO = JSON.stringify(VEREDICTO)
check('el veredicto NO contiene la cifra transcrita (28900)',
  !SERIALIZADO.includes('28900'), '(¡la lleva!)')
check('…ni ninguna otra cifra del documento',
  !BLOQUE_REAL.some(f => /^\d{4,}$/.test(f.valor) && SERIALIZADO.includes(f.valor)),
  '(alguna se cuela)')
check('…pero SÍ dice que difiere, y solo en esa cifra',
  (() => { const r = VEREDICTO.find(v => v.concepto === 'recaudo_snr')
    return r.difieren === 1 && r.campos.find(c => c.estado === 'DIFIERE').campo === 'tramo.1.valor' })(),
  `(difieren=${VEREDICTO.find(v => v.concepto === 'recaudo_snr').difieren})`)
check('…y en qué aspecto', VEREDICTO.find(v => v.concepto === 'recaudo_snr')
  .campos.find(c => c.campo === 'tramo.1.valor').difiere_en.join() === 'valor')
check('…y en qué artículo mirar', VEREDICTO.find(v => v.concepto === 'recaudo_snr')
  .campos.find(c => c.campo === 'tramo.1.valor').mirar_en === 'art. 50')
check('una unidad distinta se reporta como unidad, no como valor',
  veredictoPorSeccion([FT({ valor: '3', unidad: 'POR_MIL' })], [FT({ valor: '3', unidad: 'PORCENTAJE' })])[0]
    .campos[0].difiere_en.join() === 'unidad')
check('el veredicto va agrupado por concepto, que es como se guarda',
  VEREDICTO.length === new Set([...BLOQUE_REAL.map(f => f.concepto), ...CARGADO_MAL.map(f => f.concepto)]).size,
  `(${VEREDICTO.length} secciones)`)
check('cada sección trae su propio recuento',
  VEREDICTO.every(v => v.coinciden + v.difieren + v.sin_transcribir + v.sin_cargar === v.total))

// ── El avance, para no cargar a ciegas ────────────────────────────────────
check('el avance cuenta sobre las 53 transcritas',
  avance(BLOQUE_REAL, []).total === 53 && avance(BLOQUE_REAL, []).cargadas === 0)
check('…y sube con lo cargado',
  avance(BLOQUE_REAL, valoresDesdeAnio(ANIO)).cargadas > 0)
check('…con su porcentaje', avance(BLOQUE_REAL, []).porcentaje === 0)

// ── Un año ACTIVO no se edita ──────────────────────────────────────────────
check('un año en borrador se edita',
  (() => { exigirEditable({ anio: 2026, estado: 'BORRADOR', cerrado: false }); return true })())
lanza('un año ACTIVO no se edita sin devolverlo a borrador',
  () => exigirEditable({ anio: 2026, estado: 'ACTIVO', cerrado: false }),
  'ErrorEsquemaNotarial', 'devolverlo a borrador')
lanza('un año cerrado tampoco',
  () => exigirEditable({ anio: 2025, estado: 'BORRADOR', cerrado: true }),
  'ErrorEsquemaNotarial', 'está cerrado')
check('la versión sube de uno en uno, y con su fecha',
  (() => { const v = subirVersion()
    return v.version.increment === 1 && v.version_actualizada_en instanceof Date })())

// ───────────────────────────────────────────────────────────────────────────────
console.log('\n══ CADA CAUSA, SU FRASE: NUNCA «NO SE PUDO GUARDAR» ══')
// ───────────────────────────────────────────────────────────────────────────────
// El 2026-10-14 el panel dijo «no se pudo crear» de un año que SÍ se creó: la
// siembra había escrito 19 conceptos y lo que falló fue una lectura posterior.
// Un mensaje que agrupa causas no solo estorba: miente sobre el resultado.
const cl = (e) => clasificarError(e, 'prueba')

check('una guarda del módulo pasa su propio mensaje',
  (() => { const r = cl(new ErrorEsquemaNotarial('Los tramos tienen un hueco.', 'tramos'))
    return r.causa === 'GUARDA_DEL_MODULO' && r.error === 'Los tramos tienen un hueco.' && r.status === 409 })())
check('tabla que no existe: lo dice, y dice que la migración no está en ESTA base',
  (() => { const r = cl({ code: 'P2021', meta: { table: 'anios_notariales' } })
    return r.causa === 'TABLA_FALTANTE' && /anios_notariales/.test(r.error) &&
      /no está aplicada en la base que usa esta aplicación/.test(r.error) })())
check('…también por el mensaje de Prisma sin código',
  cl({ message: 'The table X does not exist in the current database.' }).causa === 'TABLA_FALTANTE')
check('ya existe: dice que NO se tocó lo que había',
  (() => { const r = cl({ code: 'P2002' })
    return r.causa === 'YA_EXISTE' && /no se modificó/.test(r.error) && r.status === 409 })())
check('la base no responde: 503, y dice que no es culpa del dato',
  (() => { const r = cl({ code: 'P1001' })
    return r.causa === 'BASE_NO_RESPONDE' && r.status === 503 &&
      /No es un problema de lo que enviaste/.test(r.error) })())
check('falta un archivo: lo distingue de un dato mal escrito',
  (() => { const r = cl({ code: 'ENOENT', message: "open 'X.md'" })
    return r.causa === 'ARCHIVO_FALTANTE' && /no es un problema de lo que escribiste/i.test(r.error) })())
check('lo que no se sabe, se DICE que no se sabe',
  (() => { const r = cl(new Error('algo raro'))
    return r.causa === 'SIN_CLASIFICAR' && /no supimos clasificar/.test(r.error) })())
check('…y manda al log, nombrando dónde', /prueba/.test(cl(new Error('algo raro')).error))
check('las seis causas son distintas entre sí',
  new Set([
    cl(new ErrorEsquemaNotarial('x')).causa, cl({ code: 'P2021' }).causa, cl({ code: 'P2002' }).causa,
    cl({ code: 'P1001' }).causa, cl({ code: 'ENOENT' }).causa, cl(new Error('x')).causa,
  ]).size === 6)
check('NINGUNA de las seis dice «no se pudo guardar»',
  ![cl(new ErrorEsquemaNotarial('x')), cl({ code: 'P2021' }), cl({ code: 'P2002' }),
    cl({ code: 'P1001' }), cl({ code: 'ENOENT' }), cl(new Error('x'))]
    .some(r => /no se pudo guardar/i.test(r.error)))
check('todas las guardas del módulo están en la lista',
  ['AnioNoPublicable', 'FueraDeVigencia', 'ErrorDeEntrada', 'ErrorBloqueCotejo', 'SinReglaAplicable']
    .every(n => cl({ name: n, message: 'su mensaje' }).causa === 'GUARDA_DEL_MODULO'))


// ────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────
console.log('\n══ QUÉ TRAMO APLICA: UNA SOLA FRONTERA ══')
// ────────────────────────────────────────────────────────────────────────
/*
 * La frontera estaba escrita dos veces: en el bucle de la tarifa y otra vez en
 * `desgloseDe`, que reparte el recaudo entre la Superintendencia y el Fondo. Las
 * dos decían lo mismo, así que ninguna cifra salió mal —pero las dos mutaciones
 * de la frontera vigilaban una sola, y corregir una sin la otra no habría roto
 * nada—. Ahora hay una.
 */
const TQA = [
  T(1, 0, 100_000_000, 'FIJO', 10, 'PESOS'),
  T(2, 100_000_000, null, 'FIJO', 20, 'PESOS'),
]
check('el límite superior pertenece al tramo: 100 M exactos van al primero',
  tramoQueAplica(TQA, 100_000_000, null, 'x')?.orden === 1)
check('un peso más pasa al segundo',
  tramoQueAplica(TQA, 100_000_001, null, 'x')?.orden === 2)
check('el límite inferior NO pertenece: base 0 no cae en ninguno',
  tramoQueAplica(TQA, 0, null, 'x') === null)
check('no lanza cuando no hay tramo: devuelve null y el mensaje se queda en casa',
  tramoQueAplica([], 500, null, 'x') === null)

/* EL FILTRO, que es lo que deja al desglose conservar su comportamiento: allí
 * solo cuentan los tramos que traen aporte_snr. */
check('con filtro, se salta el tramo que no lo pasa y sigue buscando',
  tramoQueAplica(TQA, 100_000_000, null, 'x', t => t.orden !== 1) === null)
check('…y encuentra el que sí lo pasa',
  tramoQueAplica(TQA, 100_000_001, null, 'x', t => t.orden === 2)?.orden === 2)

/* LA DIVERGENCIA QUE SE CERRÓ, y es la razón de que esto exista.
 *
 * La copia de `calculo.ts` convertía los límites en UVT con
 * `(t.en_uvt && uvt ? uvt : 1)`: sin UVT cargado multiplicaba por 1 y trataba
 * los límites en UVT como pesos, EN SILENCIO. Ahora hay un solo camino y
 * lanza. */
const TQA_UVT = [
  { ...T(1, 0, 1000, 'FIJO', 10, 'PESOS'), en_uvt: true },
  { ...T(2, 1000, null, 'FIJO', 20, 'PESOS'), en_uvt: true },
]
lanza('una tabla en UVT sin UVT cargado se detiene, no multiplica por 1',
  () => tramoQueAplica(TQA_UVT, 500, null, 'x'),
  'ErrorEsquemaNotarial', 'UVT')
check('con UVT cargado, los límites se convierten: 500 UVT × 100 = 50.000 cae en el primero',
  tramoQueAplica(TQA_UVT, 50_000, 100, 'x')?.orden === 1)
check('…y 150.000 cae en el segundo (1.000 UVT × 100 = 100.000)',
  tramoQueAplica(TQA_UVT, 150_000, 100, 'x')?.orden === 2)

// ────────────────────────────────────────────────────────────────────────
console.log('\n══ LA ESCALA DE UNA TARIFA, EN UN SOLO SITIO ══')
// ────────────────────────────────────────────────────────────────────────
/*
 * Vale 100 o 1.000, y confundirlos da una cifra DIEZ VECES mayor y plausible.
 * Estaba escrito cuatro veces —tramos, retención, tarifa suelta y el ICA del
 * módulo financiero— y el inventario solo encontró tres: la cuarta se pasó,
 * que es el modo de fallo de una decisión repetida. Ahora vive en
 * `src/lib/escala-tarifa.ts` y una sola mutación la vigila en los cuatro.
 */
check('un porcentaje se divide por 100', DIVISOR.PORCENTAJE === 100)
check('un por mil se divide por 1.000', DIVISOR.POR_MIL === 1000)
check('los dos divisores NO son el mismo', DIVISOR.PORCENTAJE !== DIVISOR.POR_MIL)
check('PESOS no es una tasa: no tiene divisor', divisorDe('PESOS') === null)
check('una unidad en blanco tampoco', divisorDe(null) === null && divisorDe(undefined) === null)
check('…y una unidad inventada tampoco pasa por porcentaje', divisorDe('PORCIENTO') === null)

console.log('\n══ LA HUELLA DE LA EVIDENCIA ES DEL CONTENIDO ══')
// ────────────────────────────────────────────────────────────────────────
/*
 * La constante NO sale de nuestro código: se calculó con `sha256sum` y se
 * confirmó con `certutil -hashfile ... SHA256`, dos herramientas ajenas que
 * coinciden. Es lo único que convierte la huella en evidencia: alguien con el
 * mismo PDF y sin nuestro código tiene que obtener los mismos 64 dígitos.
 *
 * Los bytes llevan CRLF A PROPÓSITO. Si alguien añadiera una normalización
 * —copiando el patrón de `huellaDelBloque`, que sí la necesita— esta
 * verificación se cae, y es justo lo que tiene que pasar.
 */
const BYTES_PDF = Buffer.from('%PDF-1.4\r\nlinea dos\r\n', 'latin1')
const HUELLA_EXTERNA = '2d77a43d4ce3f5d2504a56af277c5d2f1a88552af9d262cf48e86792ed509cc9'

check('la huella de unos bytes coincide con la de sha256sum y certutil',
  hashDeBytes(BYTES_PDF) === HUELLA_EXTERNA,
  `(dio ${hashDeBytes(BYTES_PDF)})`)
check('…y por tanto NO se normalizan los saltos de línea del archivo',
  hashDeBytes(BYTES_PDF) !== hashDeBytes(Buffer.from('%PDF-1.4\nlinea dos\n', 'latin1')))
check('la huella de un documento de TEXTO sí ignora los saltos, que es lo contrario',
  huellaDelBloque('<!-- COTEJO:INICIO -->\r\na\r\n<!-- COTEJO:FIN -->')
  === huellaDelBloque('<!-- COTEJO:INICIO -->\na\n<!-- COTEJO:FIN -->'))
check('un byte distinto da una huella distinta',
  hashDeBytes(Buffer.from('%PDF-1.4\r\nlinea tres\r\n', 'latin1')) !== HUELLA_EXTERNA)

/* ──────────────────────────────────────────────────────────────────────────
 * LA FIRMA: DETIENE, NO SUSTITUYE
 *
 * Una cifra equivocada se recalcula; quién la cargó, no. Y la columna de firma
 * guarda TRES clases de valor —persona, marcador, nada— que hasta el
 * 2026-10-19 se leían igual porque ni siquiera llegaban a la pantalla. */
{
  check('un correo acredita a una persona',
    clasificarFirma('leonel@sufincaraiz.com').clase === 'PERSONA' &&
    clasificarFirma('leonel@sufincaraiz.com').acredita)
  check('«precarga» es un MARCADOR legítimo y NO acredita a nadie',
    clasificarFirma('precarga').clase === 'MARCADOR' && !clasificarFirma('precarga').acredita)
  check('…y dice qué significa, en vez de solo mostrarlo',
    /la siembra/.test(clasificarFirma('precarga').etiqueta))
  check('«titular» también es marcador: es cierto y no es identificable',
    clasificarFirma('titular').clase === 'MARCADOR' && !clasificarFirma('titular').acredita)
  check('vacío es AUSENTE, no un marcador',
    clasificarFirma('').clase === 'AUSENTE' && clasificarFirma(null).clase === 'AUSENTE' &&
    clasificarFirma('   ').clase === 'AUSENTE')
  check('un valor que no es correo ni marcador conocido NO acredita',
    !clasificarFirma('pepito').acredita &&
    /no es un correo ni un marcador conocido/.test(clasificarFirma('pepito').etiqueta))

  const noFirma = v => { try { exigirFirma(v, 'activar un año'); return false } catch { return true } }
  check('firmar sin identidad DETIENE', noFirma('') && noFirma(null) && noFirma(undefined))
  check('…y «admin» —el valor por defecto de antes— también DETIENE al escribir',
    noFirma('admin') && noFirma('ADMIN'))
  check('…pero «admin» sí se puede LEER, para los actos que ya lo tuvieran',
    clasificarFirma('admin').clase === 'MARCADOR' &&
    /valor por defecto/.test(clasificarFirma('admin').etiqueta))
  check('un correo pasa la puerta y vuelve tal cual',
    exigirFirma(' leonel@sufincaraiz.com ', 'activar un año') === 'leonel@sufincaraiz.com')
  check('«precarga» pasa la puerta: es verdadera, aunque no acredite',
    exigirFirma('precarga', 'sembrar un año') === 'precarga')
}

/* ──────────────────────────────────────────────────────────────────────────
 * UNA GUARDA QUE LLEGA CON EL DATO YA FALSEADO
 *
 * `exigirVigencia` pasa en silencio ante una lista VACÍA —y debe, porque «sin
 * ningún respaldo» lo detiene otra guarda—. Pero los cuatro llamadores
 * escribían `anio.respaldos ?? []`, y `respaldos` es OPCIONAL en el tipo: una
 * consulta que olvide incluirlos devuelve `undefined`, el `??` lo convierte en
 * «ninguno», y la comprobación de vigencias no comprueba nada mientras
 * aparenta funcionar. Se liquidaría con tarifas vencidas.
 *
 * La integridad de una guarda depende de lo que le LLEGA, no solo de lo que
 * hace. */
{
  const DENTRO = [{ campo: 'tarifa', norma: 'R-1', vigencia_desde: '2026-01-01', vigencia_hasta: null }]
  const VENCIDO = [{ campo: 'tarifa', norma: 'R-0', vigencia_desde: '2025-01-01', vigencia_hasta: '2025-12-31' }]

  check('una lista VACÍA de respaldos pasa: «sin ninguno» lo detiene otra guarda',
    (() => { try { exigirVigencia([], '2026-06-15'); return true } catch { return false } })())
  check('un respaldo vigente pasa',
    (() => { try { exigirVigencia(DENTRO, '2026-06-15'); return true } catch { return false } })())
  check('un respaldo vencido DETIENE',
    (() => { try { exigirVigencia(VENCIDO, '2026-06-15'); return false } catch { return true } })())
  check('y `undefined` —la lista que no se cargó— también DETIENE, en vez de pasar',
    (() => { try { exigirVigencia(undefined, '2026-06-15'); return false } catch { return true } })())
  check('…y el mensaje distingue «no hay» de «no me los trajeron»',
    (() => {
      try { exigirVigencia(undefined, '2026-06-15'); return false }
      catch (e) { return /no se carg/.test(e.message) && /lista vac/.test(e.message) }
    })())
}

/* ──────────────────────────────────────────────────────────────────────────
 * «TE TOCA Y PUEDES YA» FRENTE A «TE TOCA PERO FALTA LA PANTALLA»
 *
 * El panel decía «29 esperan la resolución oficial — tú, con la resolución».
 * Esas 29 son tablas por tramos y el editor de tramos no existe: el titular
 * podía tener la resolución en la mano y no tenía dónde escribirla.
 *
 *   > Un pendiente asignado a quien no tiene cómo resolverlo no es un
 *   > pendiente: es una acusación.
 *
 * `SIN_PANTALLA` declara los campos que el panel todavía no sabe editar. Esto
 * lo vigila EN LAS DOS DIRECCIONES, porque una advertencia que sobrevive a su
 * causa es la siguiente mentira.
 *
 * LA SEÑAL SE MIDE, no se recuerda: la pantalla del año tiene una rama que se
 * NIEGA a guardar tramos («todavía no se editan desde aquí»). Mientras ese
 * rechazo exista, el editor no existe. */
const PANTALLA_DEL_ANIO = 'src/app/admin/notariales/[anio]/page.tsx'
const rechazo = readFileSync(PANTALLA_DEL_ANIO, 'utf8')
  .includes('Los tramos todav\u00eda no se editan desde aqu\u00ed')
const editorExiste = !rechazo

check('el panel declara que los tramos no se pueden editar todav\u00eda, o que ya s\u00ed',
  (SIN_PANTALLA.tramos !== undefined) === !editorExiste,
  editorExiste
    ? '(el editor YA existe: `tramos` tiene que salir de SIN_PANTALLA)'
    : '(el editor NO existe: `tramos` tiene que estar en SIN_PANTALLA)')

{
  /* Y que el pendiente lo lleve puesto, no solo la tabla. */
  const pend = pendientesParaActivar(ANIO_VACIO, FUENTES_OFICIALES)
  const deTramos = pend.filter(p => p.campo === 'tramos')
  /* ⚠ ESTA AFIRMACIÓN DECÍA LO CONTRARIO HASTA EL 2026-10-20: «todo pendiente
   * de tramos sale marcado como bloqueado». Era cierta mientras el editor no
   * existía, y al construirlo **sobrevivió a su premisa** —la tercera vez en
   * cinco días, después de las cuatro del panel y de la lista de extremos—.
   *
   * > Una afirmación que codifica una LIMITACIÓN tiene que morir con la
   * > limitación. Y no se acuerda nadie: lo que la mató fue que el arnés se
   * > puso rojo al quitar el rechazo de la pantalla.
   *
   * Ahora afirma lo verdadero, que es justo lo contrario. */
  check('NINGÚN pendiente de tramos sigue bloqueado: el editor existe',
    deTramos.length > 0 && deTramos.every(p => !p.bloqueado),
    `(bloqueados: ${deTramos.filter(p => p.bloqueado).length} de ${deTramos.length})`)
  check('…y ninguno dice «falta la tarifa», que era una cifra y es una escala',
    deTramos.every(p => /tabla por tramos/.test(p.que)))
  const r = resumenDePendientes(pend)
  const titular = r.porDueno.find(d => d.dueno === 'titular')
  check('el resumen sigue partiendo en «puede ya» y «bloqueados», y la suma cuadra',
    !!titular && titular.puedeYa + titular.bloqueados === titular.cantidad,
    titular ? `(puede ya ${titular.puedeYa} · bloqueados ${titular.bloqueados})` : '(sin titular)')
  check('…y hoy el titular puede hacerlos TODOS: no queda ninguno esperando pantalla',
    !!titular && titular.bloqueados === 0 && titular.puedeYa === titular.cantidad,
    titular ? `(puede ya ${titular.puedeYa} de ${titular.cantidad})` : '(sin titular)')
  /* El mecanismo se queda vivo aunque hoy no bloquee nada: SIN_PANTALLA sigue
   * existiendo vacía, y estas dos verificaciones lo prueban por los dos lados
   * —la suma cuadra, y el total bloqueado es cero—. */
  check('…y el total de bloqueados del año es la suma, no una cifra aparte',
    r.bloqueados === r.porDueno.reduce((a, d) => a + d.bloqueados, 0))
}

/* ───────────────────────────────────────────────────────────────────────
 * LOS DOS EXTREMOS QUE FALTABAN
 *
 * Eran DOS, y la cuenta del titular era la correcta: yo la «corregí» a tres y
 * la corrección estaba mal. De los cinco que el inventario marca sin prueba,
 * dos los cubre el arnés del editor y uno ya estaba probado aquí —«cero copias
 * en vez de desactivar el concepto»—. Lo que estaba desactualizado era el
 * inventario, no el código. Ir al dato valia también para contar extremos.
 *
 * Encuadre: no son bordes raros. Una lista de aportes vacía es el año REAL de
 * Su Finca Raíz —hoy no es responsable de IVA— y un empate 50/50 es el reparto
 * por defecto de la mitad de los conceptos. */

// ── EXTREMO 1: lista de aportes de IVA VACÍA ───────────────────────
{
  const REGLA = { unidad: 1, modo: 'CERCANO' }
  const v = liquidarIva([], 19, REGLA)
  check('sin ningún aporte, el IVA liquidado es CERO y no lanza',
    v.liquidado === 0, `(dio ${v.liquidado})`)
  check('…y el reparto es cero por los dos lados',
    v.comprador === 0 && v.vendedor === 0)
  check('…sin dividir por cero: con base cero la proporción se corta antes',
    Number(v.comprador_exacto) === 0 && Number(v.vendedor_exacto) === 0,
    `(exactos: ${v.comprador_exacto} / ${v.vendedor_exacto})`)
  check('la regla de redondeo sigue siendo OBLIGATORIA aunque no haya aportes',
    (() => { try { liquidarIva([], 19, null); return false } catch { return true } })())
  check('…y una unidad de redondeo inválida también se rechaza con la lista vacía',
    (() => { try { liquidarIva([], 19, { unidad: 0, modo: 'CERCANO' }); return false } catch { return true } })())
}

// ── EXTREMO 2: reparto 50/50 con IVA en empate exacto ───────────────
{
  const REGLA = { unidad: 1, modo: 'CERCANO' }

  /* Total PAR: 19 % de 53.157,894736842105 = 10.100, mitad exacta de 5.050. */
  const par = liquidarIva([{ clave: 'x', base: '53157.894736842105', pct_comprador: 50 }], 19, REGLA)
  check('empate con total PAR: las dos mitades son iguales…',
    par.comprador === par.vendedor, `(${par.comprador} / ${par.vendedor})`)
  check('…y suman exactamente el liquidado',
    par.comprador + par.vendedor === par.liquidado,
    `(${par.comprador} + ${par.vendedor} = ${par.liquidado})`)

  /* Total IMPAR: 101, con las dos mitades exactas en 50,5. Es el caso que de
   * verdad decide algo, porque un peso no se parte en dos. */
  const impar = liquidarIva([{ clave: 'x', base: '531.5789473684211', pct_comprador: 50 }], 19, REGLA)
  check('empate con total IMPAR: la suma sigue siendo exacta, sin peso perdido',
    impar.comprador + impar.vendedor === impar.liquidado,
    `(${impar.comprador} + ${impar.vendedor} = ${impar.liquidado})`)

  /* ⚠ MEDIDO, NO SUPUESTO: comprador 50, vendedor 51.
   *
   * El código dice «se redondea la MENOR; la mayor es el residual. Empate → el
   * residual es del comprador», y esto es exactamente eso: la cifra del
   * COMPRADOR es la residual —la que sale por resta—, así que el peso que no
   * parte en dos se queda del lado del vendedor.
   *
   * Leí ese comentario de dos maneras y estuve a punto de «arreglar» código
   * correcto. Esta verificación fija la lectura buena, que es lo que un
   * comentario ambiguo no puede hacer. */
  check('en el empate, la cifra del COMPRADOR es la residual: 50 y 51',
    impar.comprador === 50 && impar.vendedor === 51,
    `(comprador ${impar.comprador} · vendedor ${impar.vendedor})`)
  check('el reparto se hace sobre el LIQUIDADO, no sobre el bruto',
    impar.liquidado === 101, `(liquidado ${impar.liquidado})`)

  /* Y el empate con reparto desigual NO es empate: control negativo, para que
   * la verificación de arriba no pase por casualidad. */
  const desigual = liquidarIva([{ clave: 'x', base: '531.5789473684211', pct_comprador: 70 }], 19, REGLA)
  check('con 70/30 ya no hay empate y la menor es la del vendedor',
    desigual.comprador > desigual.vendedor &&
    desigual.comprador + desigual.vendedor === desigual.liquidado,
    `(${desigual.comprador} / ${desigual.vendedor})`)
}

/* ───────────────────────────────────────────────────────────────────────
 * N-02 · EL COTEJO MIRA EL MODO Y EL REDONDEO
 *
 * Dos parámetros mueven la cifra sin cambiar ningún número de la tabla, y hasta
 * el 2026-10-22 el cotejo daba COINCIDE con los dos cambiados:
 *
 *   la MISMA tabla ORIP, mismos valores y unidades, solo el modo
 *     base $200.000.000 → SOBRE_TOTAL 2.262.000 · MARGINAL 1.773.900
 *     base $600.000.000 → SOBRE_TOTAL 7.998.000 · MARGINAL 6.717.600
 *
 * Las fixtures de aqui son SINTÉTICAS: no salen del documento ni de la base, y
 * por eso pueden afirmar un esperado sin convertir la prueba en un eco. */
{
  const fila = (concepto, campo, valor, unidad = '', articulo = 'art. 1') =>
    ({ concepto, campo, valor, unidad, articulo })

  // Una tabla de dos tramos, en los dos lados, IDENTICA salvo lo que se indique.
  const docBase = [
    fila('x', 'tramo.1.hasta', '1000', 'PESOS'),
    fila('x', 'tramo.1.valor', '500', 'PESOS'),
    fila('x', 'tramo.1.modo', 'FIJO'),
    fila('x', 'tramo.2.hasta', 'abierto', 'PESOS'),
    fila('x', 'tramo.2.valor', '9.11', 'POR_MIL'),
    fila('x', 'tramo.2.modo', 'TASA_SOBRE_TOTAL'),
    fila('x', 'redondeo.unidad', '100', 'PESOS'),
    fila('x', 'redondeo.modo', 'CERCANO'),
  ]
  const clonar = (filas, cambios = {}) => filas.map(f => {
    const llave = `${f.concepto}·${f.campo}`
    return llave in cambios ? { ...f, ...cambios[llave] } : { ...f }
  })

  // ── 1. coincidencia completa ──────────────────────────────────────────────
  {
    const r = resumirCotejo(compararCotejo(docBase, clonar(docBase)))
    check('N-02 · coincidencia completa: 8 de 8 y nada pendiente',
      r.coinciden === 8 && r.difieren === 0 && r.sin_lectura === 0 && r.apto && r.completo,
      JSON.stringify(r))
  }

  // ── 2. SOLO el modo cambia ────────────────────────────────────────────────
  {
    const cargado = clonar(docBase, { 'x·tramo.2.modo': { valor: 'TASA_MARGINAL' } })
    const res = compararCotejo(docBase, cargado)
    const modo = res.find(x => x.campo === 'tramo.2.modo')
    const r = resumirCotejo(res)
    check('N-02 · mismo valor y misma unidad, MODO distinto → DIFIERE',
      modo.estado === 'DIFIERE', `(${modo.estado})`)
    check('…y el resto de la tabla sigue coincidiendo: la diferencia está localizada',
      r.difieren === 1 && r.coinciden === 7, JSON.stringify(r))
    check('…y el año deja de ser apto',
      !r.apto)
  }

  // ── 3. SOLO el redondeo cambia ────────────────────────────────────────────
  {
    const porUnidad = compararCotejo(docBase, clonar(docBase, { 'x·redondeo.unidad': { valor: '1' } }))
    check('N-02 · solo la UNIDAD de redondeo cambia → DIFIERE',
      porUnidad.find(x => x.campo === 'redondeo.unidad').estado === 'DIFIERE')
    const porModo = compararCotejo(docBase, clonar(docBase, { 'x·redondeo.modo': { valor: 'ARRIBA' } }))
    check('N-02 · solo el MODO de redondeo cambia → DIFIERE',
      porModo.find(x => x.campo === 'redondeo.modo').estado === 'DIFIERE')
    check('…y las dos mitades del redondeo se señalan por separado',
      resumirCotejo(porUnidad).difieren === 1 && resumirCotejo(porModo).difieren === 1)
  }

  // ── 4. el modo se compara como TEXTO, no como cifra ───────────────────────
  {
    const igual = compararCotejo(docBase, clonar(docBase, { 'x·tramo.2.modo': { valor: ' tasa_sobre_total ' } }))
    check('N-02 · un modo con otra caja y espacios es el MISMO modo, no una diferencia',
      igual.find(x => x.campo === 'tramo.2.modo').estado === 'COINCIDE')
    /* Si se comparara con el normalizador de cifras, «TASA_SOBRE_TOTAL» y
     * «tasa_sobre_total» serian distintos y el informe tendria un falso
     * hallazgo cada vez que alguien escribe en minuscula. */
  }

  // ── 5. unidad y limite incorrectos siguen detectandose ────────────────────
  {
    const u = compararCotejo(docBase, clonar(docBase, { 'x·tramo.2.valor': { unidad: 'PORCENTAJE' } }))
    check('N-02 · unidad incorrecta → DIFIERE (un 9,11 % no es 9,11 por mil)',
      u.find(x => x.campo === 'tramo.2.valor').estado === 'DIFIERE')
    const l = compararCotejo(docBase, clonar(docBase, { 'x·tramo.1.hasta': { valor: '1001' } }))
    check('N-02 · límite incorrecto → DIFIERE',
      l.find(x => x.campo === 'tramo.1.hasta').estado === 'DIFIERE')
  }

  // ── 6. AUSENTE no es COINCIDENTE ──────────────────────────────────────────
  {
    const sinModoEnDoc = docBase.filter(f => f.campo !== 'tramo.2.modo')
    const res = compararCotejo(sinModoEnDoc, clonar(docBase))
    const x = res.find(y => y.campo === 'tramo.2.modo')
    check('N-02 · el modo cargado y NO transcrito sale SIN_TRANSCRIBIR, no COINCIDE',
      x.estado === 'SIN_TRANSCRIBIR', `(${x.estado})`)
    check('…y eso basta para que el año NO sea apto: una sola lectura no es cotejo',
      !resumirCotejo(res).apto)

    const sinRedondeoEnDoc = docBase.filter(f => !f.campo.startsWith('redondeo.'))
    const res2 = compararCotejo(sinRedondeoEnDoc, clonar(docBase))
    check('N-02 · el redondeo cargado y no transcrito también: 2 SIN_TRANSCRIBIR',
      resumirCotejo(res2).sin_transcribir === 2 && !resumirCotejo(res2).apto)
  }

  // ── 7. «pendiente»: leído el PDF y el PDF no lo dice ──────────────────────
  {
    const conPendiente = clonar(docBase, { 'x·tramo.2.modo': { valor: PENDIENTE } })
    const res = compararCotejo(conPendiente, clonar(docBase))
    const x = res.find(y => y.campo === 'tramo.2.modo')
    const r = resumirCotejo(res)
    check('N-02 · `pendiente` en el documento → SIN_LECTURA, ni coincide ni difiere',
      x.estado === 'SIN_LECTURA' && r.coinciden === 7 && r.difieren === 0, JSON.stringify(r))
    check('…y lo dice: hay valor en la base y no hay segunda lectura',
      /no hay segunda lectura/.test(x.diferencias.join(' ')), x.diferencias.join(' '))
    check('…NO autoriza a publicar: bloquea `completo`',
      r.completo === false && r.sin_lectura === 1)
    check('…y NO se cuenta como contradicción: `apto` sigue siendo cierto',
      r.apto === true)
    /* La distinción cuesta un defecto descubrirla: `apto` es consistencia
     * —nada de lo cargado contradice— y `completo` es completitud. Un parametro
     * sin transcribir no contradice nada, y tampoco autoriza nada. */

    const pendienteYSinCargar = compararCotejo(conPendiente, clonar(docBase).filter(f => f.campo !== 'tramo.2.modo'))
    const y = pendienteYSinCargar.find(z => z.campo === 'tramo.2.modo')
    check('N-02 · `pendiente` y sin cargar sigue siendo SIN_LECTURA, y lo dice',
      y.estado === 'SIN_LECTURA' && /tampoco está cargado/.test(y.diferencias.join(' ')),
      y.diferencias.join(' '))
  }

  // ── 8. transcripción de referencia incompleta ─────────────────────────────
  {
    const soloDosFilas = [docBase[0], docBase[1]]
    const r = resumirCotejo(compararCotejo(soloDosFilas, clonar(docBase)))
    /* ⚠ ESTA VERIFICACIÓN AFIRMABA `!r.completo` Y LA EQUIVOCADA ERA ELLA.
     * `completo` significa «nada de lo que el documento transcribe falta en la
     * base», y con una transcripción de dos filas eso es cierto: no falta nada.
     * Lo que sobra son seis cargados sin transcribir, y de eso se encarga
     * `apto`. No se ensanchó `completo` para que la prueba pasara: se corrigió
     * la prueba, porque la pareja es la que autoriza. */
    check('N-02 · una transcripción a medias no produce coincidencias falsas',
      r.coinciden === 2 && r.sin_transcribir === 6, JSON.stringify(r))
    check('…y la PAREJA cierra la puerta: apto es falso, así que apto && completo también',
      r.apto === false && (r.apto && r.completo) === false, JSON.stringify(r))
  }

  // ── 9. el veredicto del panel cuenta los pendientes, SIN la cifra ─────────
  {
    const conPendiente = clonar(docBase, { 'x·tramo.2.modo': { valor: PENDIENTE } })
    const v = veredictoPorSeccion(conPendiente, clonar(docBase))[0]
    check('N-02 · el veredicto del panel lleva `sin_lectura`',
      v.sin_lectura === 1 && v.total === 8, JSON.stringify({ sl: v.sin_lectura, t: v.total }))
    const serializado = JSON.stringify(v)
    check('…y NO lleva la cifra esperada: el panel no puede copiarla',
      !serializado.includes('9.11') && !serializado.includes('TASA_SOBRE_TOTAL'),
      serializado.slice(0, 120))
  }
}

console.log(`\n${fail === 0 ? '✓ TODO EN VERDE' : '✗ HAY FALLOS'} — ${ok} verificaciones, ${fail} fallos\n`)
process.exit(fail === 0 ? 0 : 1)
