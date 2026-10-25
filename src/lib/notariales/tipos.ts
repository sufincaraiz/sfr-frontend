/**
 * MOTOR DE GASTOS NOTARIALES — TIPOS · módulo HOJA (sin imports `@/`)
 * ==================================================================
 *
 * Estos tipos son el espejo del esquema acordado. Viven aquí y no se derivan de
 * Prisma a propósito: el motor tiene que poder correr —y probarse— sin base de
 * datos, con un año construido en memoria.
 *
 * ⚠ NINGÚN VALOR VIVE EN ESTE MÓDULO. Las tarifas entran por parámetro, desde
 * la base, y cada una exige su respaldo oficial. Una tarifa escrita a mano aquí
 * sería exactamente lo que el titular bloqueó: una cifra sin PDF.
 */

import type { LiquidacionIva } from './iva.ts'
import type { ClaseDocumental } from './clase-documental.ts'

/** Versión del motor. Sube cuando cambia una REGLA de cálculo, no el formato. */
export const VERSION_MOTOR = 1

// ─────────────────────────────────────────────────────────────────────────────
// Enumeraciones del esquema
// ─────────────────────────────────────────────────────────────────────────────

/** Los cinco grupos visuales. El orden es el de la pantalla y del PDF. */
export type Grupo =
  | 'COSTOS_NOTARIALES'
  | 'IMPUESTOS'
  | 'REGISTRO'
  | 'DOCUMENTOS_PREVIOS'
  | 'OBLIGACIONES'

export const GRUPOS: { clave: Grupo; titulo: string; nota: string }[] = [
  { clave: 'COSTOS_NOTARIALES', titulo: 'Costos notariales', nota: 'Lo que cobra la notaría, con su IVA.' },
  { clave: 'IMPUESTOS', titulo: 'Impuestos', nota: 'No los cobra la notaría: los recauda.' },
  { clave: 'REGISTRO', titulo: 'Registro', nota: 'Oficina de Registro de Instrumentos Públicos.' },
  { clave: 'DOCUMENTOS_PREVIOS', titulo: 'Documentos previos', nota: 'Los consigue el vendedor antes de la firma.' },
  {
    clave: 'OBLIGACIONES',
    titulo: 'Obligaciones del inmueble',
    // Va aparte porque NO es un gasto del trámite: es una deuda del predio que
    // hay que saldar antes. Sumarla con los costos notariales haría parecer
    // «caro escriturar» algo que en realidad es un impuesto atrasado.
    nota: 'Deudas del predio que deben quedar saldadas antes de escriturar.',
  },
]

export type TipoCalculo =
  | 'FIJO'
  | 'PORCENTAJE'
  | 'POR_MIL'
  | 'TRAMOS'
  | 'POR_UNIDAD'
  | 'VALOR_LIBRE'
  /** La retención: pasa por la lista de reglas, nunca por una tarifa suelta. */
  | 'REGLAS'

/**
 * Cada valor nombra UNA función de base, con su propia norma. No hay base por
 * defecto: una base sin función es un error de esquema, no un cero.
 */
export type BaseCalculo =
  | 'NOTARIAL'
  | 'REGISTRO'
  | 'ORIP'
  | 'TIMBRE'
  | 'RETENCION'
  /** Sobre la tarifa registral ya liquidada (sistematización). */
  | 'TARIFA_REGISTRAL'
  /** Por unidades capturadas (hojas, copias, personas identificadas…). */
  | 'UNIDADES'
  | 'NINGUNA'

/** Quién es el obligado ante la autoridad. NO es quién lo paga en el negocio. */
export type SujetoLegal = 'VENDEDOR' | 'COMPRADOR' | 'AMBAS_PARTES' | 'CONTRATANTES'

/**
 * Por qué el reparto es el que es. Gobierna tres guardas y lo que se imprime:
 *   · NORMA_SUPLETIVA — la ley reparte así salvo pacto. Exige `norma_reparto`.
 *   · COSTUMBRE       — lo paga quien lo paga por práctica del mercado.
 *   · CONTRIBUYENTE   — no hay reparto que repartir: hay un obligado.
 *   · CONFIGURACION   — es una opción de la simulación. PROHÍBE `norma_reparto`.
 */
export type MotivoReparto = 'NORMA_SUPLETIVA' | 'COSTUMBRE' | 'CONTRIBUYENTE' | 'CONFIGURACION'

export type ModoTramo =
  /** Valor en pesos del tramo. Ignora la base. */
  | 'FIJO'
  /** Tasa sobre la base COMPLETA (derechos ORIP). */
  | 'TASA_SOBRE_TOTAL'
  /** Tasa sobre `(base − desde)`, acumulando los tramos anteriores (timbre). */
  | 'TASA_MARGINAL'

/**
 * Sin esto, un `3` que significa «3 por mil» leído como «3 %» es un error de
 * diez veces que NO parece un error: da una cifra plausible.
 */
export type UnidadValor = 'PESOS' | 'PORCENTAJE' | 'POR_MIL'

/**
 * Cómo redondea ESTA tarifa. No es una decisión del motor: la resolución dice a
 * qué unidad y en qué sentido se redondea, y hasta que no esté el PDF el
 * concepto no tiene redondeo y no se puede liquidar. Asumir «al peso más
 * cercano» sería inventar una regla de la norma.
 */
export type ModoRedondeo =
  | 'CERCANO'
  | 'ARRIBA'
  | 'ABAJO'
  /**
   * La cifra se toma TAL CUAL la publica la resolución y el motor no vuelve a
   * calcularla. Es el caso del recaudo del art. 50: la columna dice «ajustado a
   * la centena más próxima», pero ese ajuste YA está hecho en el documento.
   * Rehacerlo en ejecución sería sustituir el documento por nuestra aritmética.
   * Para que la declaración sea verificable, `redondear` exige que la cifra
   * publicada sea entera: si saliera con decimales, no venía publicada.
   */
  | 'PUBLICADO'

export interface Redondeo {
  /** 1 = al peso · 100 = a la centena · 1000 = al millar. */
  unidad: number
  modo: ModoRedondeo
}

/**
 * Propiedad del CONCEPTO, no creencia sobre el mundo.
 *
 *   · NO_DECRECIENTE — se configuró así: una base mayor nunca puede costar
 *     menos, y `verificarTramos` lo comprueba en cada frontera.
 *   · LIBRE — no se afirma nada. Una tabla normativa futura puede bajar.
 *
 * La diferencia importa: «esta tarifa se configuró como no decreciente» es
 * verificable; «las tarifas no bajan» es una suposición que una resolución
 * puede desmentir, y entonces la guarda estaría rechazando una tabla correcta.
 */
export type Monotonicidad = 'NO_DECRECIENTE' | 'LIBRE'

/**
 * CÓMO SE SUSTENTA UNA CIFRA. La URL nunca fue el requisito: era un sustituto
 * de la procedencia, y en el caso de la resolución notarial apunta al revés.
 * La compilación de la Cancillería TIENE enlace y es PEOR evidencia que el PDF
 * firmado —trae erratas de digitación y no es la entidad emisora—, mientras el
 * documento lleva firma, radicado y sellos.
 *
 * Lo que se amplía es el SOPORTE, no la autoridad: una tabla de notaría
 * particular, un gremio o un sitio comercial sigue sin poder ser evidencia de
 * ninguno de los dos tipos.
 */
export type TipoEvidencia = 'URL_OFICIAL' | 'DOCUMENTO_ARCHIVADO'

/** Lo que se imprime en el PDF: son dos afirmaciones distintas. */
export const FRASE_EVIDENCIA: Record<TipoEvidencia, string> = {
  URL_OFICIAL: 'enlace oficial',
  DOCUMENTO_ARCHIVADO: 'documento oficial archivado',
}

export type EstadoAnio = 'BORRADOR' | 'ACTIVO'
export type TipoFuente = 'OFICIAL' | 'SECUNDARIA'
export type Modo = 'SENCILLA' | 'AVANZADA'

// ─────────────────────────────────────────────────────────────────────────────
// Filas
// ─────────────────────────────────────────────────────────────────────────────

/** Dominio autorizado para respaldar una cifra. Tabla, no lista en código. */
export interface Fuente {
  dominio: string
  entidad: string
  tipo: TipoFuente
  activo: boolean
  /**
   * Es una COMPILACIÓN, no la entidad que emitió la norma. Un normograma
   * reproduce el texto; no lo autentica. Cuando lo es, el respaldo está
   * obligado a llevar `nota` y la `advertencia` se imprime al lado de la cifra.
   */
  es_compilacion?: boolean
  /** Lo que hay que decir siempre que se cite esta fuente. */
  advertencia?: string | null
  /**
   * Quién añadió la autoridad y cuándo. Añadir una fuente es un acto
   * deliberado: sin esto, mañana nadie sabe quién abrió esa puerta.
   */
  agregada_por: string
  agregada_en: string
}

export interface Respaldo {
  campo: string
  norma: string
  /** URL_OFICIAL o DOCUMENTO_ARCHIVADO. Por defecto, el primero. */
  tipo_evidencia?: TipoEvidencia
  /**
   * DE QUÉ CLASE DE DOCUMENTO salió. Otro eje que `tipo_evidencia`, que dice el
   * SOPORTE y no la autoridad: un PDF archivado puede ser el original firmado o
   * una descarga de un normograma, mismo soporte y autoridad distinta.
   *
   * ⚠ Opcional en el TIPO y obligatoria en la REGLA, a propósito: la base puede
   * traer filas que no la tengan, y lo que no puede pasar es que la ausencia se
   * lea como una clase. `puedeActivar` devuelve SIN_CLASE y no activa.
   *
   * La decide el documento, nunca el dominio: ver `clase-documental.ts`.
   */
  clase_documental?: ClaseDocumental | null
  /**
   * ¿La norma EXIGE esto, o lo PERMITE y lo adoptamos nosotros?
   *
   * El Concepto DIAN 003550 dice «podrá aproximarse»: aproximar el IVA es una
   * decisión de Su Finca Raíz amparada en la norma, no una obligación que la
   * norma imponga. Un respaldo que dijera «la norma exige» estaría afirmando
   * algo que el documento no dice.
   */
  caracter?: 'EXIGIDO' | 'ADOPTADO'
  /**
   * Obligatoria cuando la fuente es una compilación: qué edición se consultó,
   * dónde está el texto auténtico y qué erratas tiene.
   */
  nota?: string | null
  /** El artículo donde está la CIFRA. */
  articulo?: string | null
  /** Obligatoria con URL_OFICIAL. Con DOCUMENTO_ARCHIVADO puede no existir. */
  url?: string | null
  /**
   * La autoridad, identificada por su fila en `FuenteNormativa`. Con una URL se
   * deduce del dominio; con un documento archivado hay que decirla, porque un
   * papel no trae dominio. Es lo que mantiene la AUTORIDAD intacta aunque el
   * soporte cambie.
   */
  fuente_dominio?: string | null
  // ── Solo DOCUMENTO_ARCHIVADO. La guarda exige las seis. ──
  /** Dónde quedó guardado, para que el sistema pueda volver a abrirlo. */
  documento_ruta?: string | null
  /** SHA-256 en hexadecimal, para que nadie lo sustituya en silencio. */
  documento_hash?: string | null
  /** La entidad que lo emitió, como la nombra el propio documento. */
  entidad_emisora?: string | null
  /** De dónde se obtuvo, en texto. */
  obtenido_de?: string | null
  /** Cuándo se obtuvo (AAAA-MM-DD). */
  obtenido_en?: string | null
  archivado_por?: string | null
  /**
   * DÓNDE LO CONSIGUE EL LECTOR por su cuenta. Obligatorio con
   * DOCUMENTO_ARCHIVADO, y no es un adorno: el PDF de la simulación no puede
   * enlazar nuestra copia —ver `citaPublica`—, así que sin esta frase el lector
   * se queda sin forma de comprobar la norma.
   */
  donde_conseguirlo?: string | null
  fecha_norma?: string | null
  /**
   * DESDE CUÁNDO RIGE esta norma (AAAA-MM-DD). Obligatorio.
   *
   * No es un adorno: la RES-2026-000964-6 rige desde el 1 de febrero de 2026 y
   * la RES-2026-001726-6 desde el 29 de enero. Una escritura del 15 de enero de
   * 2026 se liquida con las tarifas de 2025, y las dos resoluciones del «mismo
   * año» ni siquiera empiezan el mismo día. Sin esta fecha, el motor liquidaría
   * enero con tarifas que no regían y nadie lo notaría.
   */
  vigencia_desde: string
  /** Hasta cuándo rigió. null = sigue vigente. */
  vigencia_hasta?: string | null
  /**
   * El artículo que establece la VIGENCIA, que no es el de la cifra: la tarifa
   * está en el art. 50 y la vigencia en el art. 56. Se cita aparte para que el
   * aviso pueda nombrar el que de verdad explica por qué no se puede liquidar.
   */
  articulo_vigencia?: string | null
  verificado_en: string
  verificado_por: string
}

export interface Tramo {
  orden: number
  /**
   * LÍMITES CONTIGUOS, no «hasta 100.000.000 / desde 100.000.001». El intervalo
   * es `desde < base ≤ hasta`, así que `hasta` de un tramo es `desde` del
   * siguiente y la recta queda cubierta SIN huecos. Importa porque la base
   * puede traer decimales: si viene de un avalúo catastral, un hueco entre
   * 100.000.000 y 100.000.001 se come a 100.000.000,50.
   */
  desde: string | number
  /** null = tramo abierto. Exactamente uno por concepto. */
  hasta?: string | number | null
  /** Los límites van en UVT, no en pesos (timbre). */
  en_uvt?: boolean
  modo_calculo: ModoTramo
  valor: string | number
  unidad: UnidadValor
  /**
   * DISTRIBUCIÓN INSTITUCIONAL del recaudo: cuánto del valor va a la
   * Superintendencia y cuánto al Fondo Nacional de Notariado. No tiene nada que
   * ver con la distribución económica (comprador/vendedor): el usuario paga UN
   * solo recaudo y el desglose solo aparece en el PDF. Se guardan como los
   * publica la resolución, y una guarda comprueba que sumen `valor`.
   */
  aporte_snr?: string | number | null
  aporte_fondo?: string | number | null
  /**
   * Solo TRAZABILIDAD: la equivalencia en UVB que publica la resolución. El
   * motor NO recalcula el valor a partir de ella —manda el documento, no la
   * aritmética—, así que cambiar este campo no puede mover ninguna cifra.
   */
  valor_en_uvb?: string | number | null
}

export interface Condicion {
  campo: string
  operador: 'IGUAL' | 'DISTINTO' | 'MENOR' | 'MENOR_IGUAL' | 'MAYOR' | 'MAYOR_IGUAL' | 'EN'
  valor: string
}

export interface ReglaRetencion {
  clave: string
  label: string
  orden: number
  activa: boolean
  tipo_efecto: 'TARIFA' | 'EXENCION' | 'REDUCCION_PCT_POR_ANIO' | 'TOPE'
  valor_efecto?: string | number | null
  unidad?: UnidadValor | null
  condiciones: Condicion[]
  respaldos?: Respaldo[]
}

export interface Concepto {
  clave: string
  label: string
  /** Para el texto de la página. NUNCA se renderiza como nombre del concepto. */
  terminos_coloquiales: string[]
  grupo: Grupo
  orden: number
  tipo: TipoCalculo
  base: BaseCalculo
  valor?: string | number | null
  unidad?: UnidadValor | null
  tramos?: Tramo[]
  /** Dato de la resolución. null = pendiente: el concepto no liquida. */
  redondeo?: Redondeo | null
  /**
   * El precio publicado YA LLEVA el IVA dentro (copia simple, art. 5). El
   * componente se EXTRAE para poder enseñarlo; nunca se suma un 19 % encima.
   */
  precio_incluye_iva?: boolean
  /** Solo se comprueba cuando es NO_DECRECIENTE. */
  monotonicidad: Monotonicidad
  grava_iva: boolean
  es_recaudo_terceros: boolean
  sujeto_legal: SujetoLegal
  /** % que asume el comprador por defecto. */
  reparto_por_defecto: number
  reparto_editable: boolean
  motivo_reparto: MotivoReparto
  norma_reparto?: string | null
  solo_avanzada: boolean
  opcional: boolean
  activo_por_defecto: boolean
  aplica_en_sencilla: boolean
  es_estimacion_en_sencilla: boolean
  /** La unidad de la TARIFA: «hoja», «cara», «persona identificada». */
  unidad_label?: string | null
  /**
   * El plural, escrito. No se deriva añadiendo una «s»: «copia auténtica» daría
   * «copia auténticas», y «firma o diligencia» no tiene plural mecánico. Ya nos
   * pasó con «1 movimiento registrados»; la diferencia es que esto lo lee un
   * comprador al lado de una cifra en pesos.
   */
  unidad_plural?: string | null
  /**
   * CANTIDAD DERIVADA. La clave de otro concepto cuya cantidad capturada se
   * multiplica por la de este.
   *
   * El caso que lo motiva: las copias auténticas se cobran por hoja, y las
   * hojas son las de la escritura, que ya se preguntan para el papel notarial.
   * Si el formulario las preguntara dos veces se desincronizarían —8 arriba, 3
   * abajo, total mal, cero errores— y nadie lo notaría. Se pregunta UNA vez y
   * aquí se declara de dónde sale.
   */
  multiplica_cantidad_de?: string | null
  /**
   * Qué cuenta el usuario cuando la cantidad es derivada: él escribe «3 copias
   * auténticas», no «24 hojas». Obligatorio si `multiplica_cantidad_de`.
   */
  unidad_captura_label?: string | null
  unidad_captura_plural?: string | null
  /**
   * La cantidad que la calculadora SENCILLA asume cuando no la pregunta. Es un
   * supuesto declarado, no un valor por defecto escondido: solo se usa en modo
   * sencillo y la liquidación dice que se asumió.
   */
  cantidad_en_sencilla?: number | null
  /**
   * HACIA DÓNDE desvía el supuesto, escrito. Obligatorio en todo concepto
   * marcado como estimación en la sencilla: «Si la notaría expide más, el costo
   * sube». Sin la dirección, el supuesto informa de que existe y no de qué
   * hacer con él.
   */
  sesgo_en_sencilla?: string | null
  /** Texto de la pregunta: cuándo aplica este concepto y cuándo no. */
  ayuda?: string | null
  cantidad_sugerida?: number | null
  /** El VALOR depende de la notaría (hoja de papel, copia). */
  cantidad_variable_por_notaria: boolean
  /** La CANTIDAD depende de la operación (cuánta gente firma). */
  cantidad_variable_por_operacion: boolean
  respaldos?: Respaldo[]
}

export interface AnioNotarial {
  /**
   * ⚠ ES UNA ETIQUETA, NO UN RANGO DE FECHAS.
   *
   * «2026» agrupa las resoluciones que llamamos «las de 2026», pero ninguna
   * empieza el 1 de enero: la notarial rige desde el 1 de febrero y la registral
   * desde el 29 de enero. Qué norma aplica a un acto NO se decide por este
   * número, se decide por la fecha del acto contra la `vigencia_desde` de cada
   * respaldo. Tratar este campo como un rango es el error que esta nota existe
   * para impedir.
   */
  anio: number
  estado: EstadoAnio
  uvt?: string | number | null
  uvb?: string | number | null
  tarifa_iva?: string | number | null
  /**
   * A qué múltiplo aproxima el IVA y en qué sentido. Es REGLA NORMATIVA, no
   * decisión del motor: sin respaldo oficial el IVA no liquida.
   */
  redondeo_iva?: Redondeo | null
  /** Sube con CUALQUIER escritura del año. Alimenta el código del PDF. */
  version: number
  cerrado: boolean
  conceptos: Concepto[]
  reglas_retencion: ReglaRetencion[]
  respaldos?: Respaldo[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Entrada y salida de una liquidación
// ─────────────────────────────────────────────────────────────────────────────

export interface Entrada {
  /**
   * FECHA DEL ACTO (AAAA-MM-DD). Decide qué normas aplican. Si se omite se usa
   * hoy, y la liquidación la devuelve para que el PDF la imprima: una
   * liquidación sin fecha del acto no se puede auditar después.
   */
  fecha_acto?: string | null
  valor_venta: string | number
  avaluo_catastral?: string | number | null
  /** Autoavalúo declarado por el propietario. Entra en la base del art. 51 a). */
  autoavaluo?: string | number | null
  /** Valor del remate o de la adjudicación, cuando el acto viene de uno. */
  valor_remate?: string | number | null
  /** Por clave de concepto: cuántas hojas, copias, personas… */
  cantidades?: Record<string, number>
  /** Por clave: % del comprador, solo si el concepto lo permite. */
  repartos?: Record<string, number>
  /** Claves de conceptos opcionales activados. */
  opcionales?: string[]
  /** Por clave: valor escrito a mano (predial pendiente). */
  valores_libres?: Record<string, string | number>
  /** Contexto para las reglas de retención. */
  contexto?: Record<string, string | number | boolean>
}

export interface Linea {
  clave: string
  label: string
  grupo: Grupo
  /** Base usada y por qué, para que el PDF lo pueda imprimir. */
  base: { clave: BaseCalculo; valor: number; motivo: string } | null
  /**
   * Lo que paga el usuario por este concepto. En un precio con IVA incluido es
   * el precio publicado completo: la copia cuesta $700 la cara y no $588 + IVA.
   */
  valor: number
  /** El componente de IVA que ya venía DENTRO de `valor`, exacto. */
  iva_incluido_exacto?: string
  /** Desglose institucional del recaudo, solo para el PDF. */
  desglose_institucional?: { snr: number; fondo: number } | null
  /**
   * Lo que ESTA línea aporta al IVA, exacto y sin redondear. El IVA se liquida
   * una sola vez sobre el total: redondear aquí haría que dos líneas de
   * 20.004 sumaran 40.000 en vez de 40.010.
   */
  iva_exacto: string
  /** Solo el valor del concepto. El IVA se reparte en su propio bloque. */
  total: number
  comprador: number
  vendedor: number
  pct_comprador: number
  sujeto_legal: SujetoLegal
  motivo_reparto: MotivoReparto
  norma_reparto: string | null
  /** De dónde sale la cifra. Se imprime al lado, siempre. */
  normas: string[]
  es_recaudo_terceros: boolean
  avisos: string[]
}

export interface Liquidacion {
  /** La fecha con la que se escogieron las normas. */
  fecha_acto: string
  /**
   * Con qué se sustenta cada norma usada, ya redactado para el PDF público.
   * `enlace` es null cuando la evidencia es un documento archivado: nuestra
   * copia no se publica. Ver `citaPublica`.
   */
  evidencias: { norma: string; tipo: TipoEvidencia; frase: string; cita: string; enlace: string | null }[]
  lineas: Linea[]
  grupos: { clave: Grupo; titulo: string; nota: string; total: number; comprador: number; vendedor: number }[]
  /**
   * El IVA es DERIVADO: no tiene tarifa propia ni reparto propio. Los siete
   * valores van completos para que el PDF pueda enseñar de dónde sale cada uno.
   */
  iva: LiquidacionIva
  /**
   * IVA que ya venía dentro de precios publicados (la copia simple). No se
   * liquida otra vez: se informa, porque el PDF tiene que poder decir cuánto
   * IVA se pagó en total.
   */
  iva_incluido_en_precios: string
  /**
   * Costo del TRÁMITE. Excluye las obligaciones del inmueble a propósito: un
   * predial atrasado de dos años no es lo que cuesta escriturar, y sumarlo haría
   * parecer carísimo el trámite por una deuda que ya existía.
   */
  totales: { total: number; comprador: number; vendedor: number }
  /** Las deudas del predio, aparte y con su propio total. */
  obligaciones: { total: number; comprador: number; vendedor: number }
  bases: { clave: BaseCalculo; valor: number; motivo: string }[]
  avisos: string[]
  trazabilidad: string
  modo: Modo
}

// ─────────────────────────────────────────────────────────────────────────────
// Errores — todos LANZAN. Ninguno devuelve cero.
// ─────────────────────────────────────────────────────────────────────────────

/** El esquema se contradice. Es ROJO en la interfaz: no espera a nadie. */
export class ErrorEsquemaNotarial extends Error {
  campo: string
  constructor(mensaje: string, campo = '') {
    super(mensaje)
    this.name = 'ErrorEsquemaNotarial'
    this.campo = campo
  }
}

/** Falta una tarifa, un respaldo o el UVT. Es ÁMBAR: espera a un tercero. */
export class AnioNoPublicable extends Error {
  faltantes: { que: string; quien: string }[]
  constructor(faltantes: { que: string; quien: string }[]) {
    super(
      `El año no está publicable: ${faltantes.length} dato(s) sin cargar o sin respaldo oficial.`,
    )
    this.name = 'AnioNoPublicable'
    this.faltantes = faltantes
  }
}

/**
 * Lo que mandó quien usa la calculadora no sirve: falta una cantidad, o viene
 * un reparto para un concepto que no se reparte. Se rechaza, no se corrige: es
 * la misma lección de la lista blanca del panel de propiedades.
 */
export class ErrorDeEntrada extends Error {
  campo: string
  constructor(mensaje: string, campo = '') {
    super(mensaje)
    this.name = 'ErrorDeEntrada'
    this.campo = campo
  }
}

/**
 * La fecha del acto cae fuera de la vigencia de alguna de las normas cargadas.
 * Es ÁMBAR: no está mal el esquema ni falta un dato del año: falta el año
 * tarifario que SÍ regía ese día. La acción es cargar esa resolución, no
 * corregir esta.
 */
export class FueraDeVigencia extends Error {
  fecha: string
  normas: {
    campo: string
    norma: string
    articulo_vigencia: string | null
    vigencia_desde: string
    vigencia_hasta: string | null
  }[]
  constructor(fecha: string, normas: FueraDeVigencia['normas']) {
    const detalle = normas
      .map(n => `${n.norma}${n.articulo_vigencia ? ` (${n.articulo_vigencia})` : ''} rige desde el ` +
        `${n.vigencia_desde}${n.vigencia_hasta ? ` hasta el ${n.vigencia_hasta}` : ''}`)
      .join('; ')
    super(
      `No se liquida un acto del ${fecha} con normas que no regían ese día: ${detalle}. ` +
      'Carga el año tarifario que estaba vigente en esa fecha.',
    )
    this.name = 'FueraDeVigencia'
    this.fecha = fecha
    this.normas = normas
  }
}

/** Ninguna regla de retención aplicó. Jamás se devuelve cero en su lugar. */
export class SinReglaAplicable extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'SinReglaAplicable'
  }
}

/** La URL del respaldo no pertenece a una autoridad oficial y activa. */
export class RespaldoNoOficial extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'RespaldoNoOficial'
  }
}
