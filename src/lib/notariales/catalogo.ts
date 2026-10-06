/**
 * CATÁLOGO DE LA SIMULACIÓN — módulo HOJA
 * =======================================
 *
 * Los conceptos de la v1, con su forma de cálculo, su base, su sujeto legal y su
 * reparto por defecto.
 *
 * **CASI TODOS NACEN SIN VALOR Y SIN TRAMOS**: las cifras entran por el panel,
 * una por una, cada una con su resolución oficial.
 *
 * La excepción son los tres conceptos ya verificados contra el PDF de la
 * RES-2026-000964-6 —el recaudo del art. 50, el recaudo de los actos sin
 * cuantía y la tarifa del acto sin cuantía del art. 2 lit. a)—. Vienen con sus
 * cifras y **sin respaldo**: la guarda sigue cerrada, porque el respaldo exige
 * la URL oficial del documento y esa todavía no está. El año NO se puede
 * activar con ellos cargados.
 *
 * Un número aquí sin su fila en `RespaldoNormativo` no habilita nada: solo
 * ahorra teclear. Si alguien añade una cifra creyendo que con eso ya calcula,
 * se encontrará con que el año sigue sin activarse, que es lo correcto.
 *
 * El IVA NO está en la lista. No tiene tarifa propia ni base propia: su base es
 * la suma de los conceptos gravados menos los recaudos para terceros, y su
 * reparto es el de cada concepto que lo genera. Es una línea derivada.
 */

import type { Concepto, Fuente, SujetoLegal } from './tipos.ts'

/**
 * Autoridades cuyos documentos sirven de respaldo. Es la PRECARGA de la tabla
 * `FuenteNormativa`, no la lista viva: el motor recibe las fuentes desde la
 * base, para que añadir una autoridad sea una fila y quede registrado quién la
 * añadió. Un sitio comercial puede existir en la tabla como SECUNDARIA —para
 * dejar constancia de que se consultó—, pero no respalda una cifra.
 */
export const FUENTES_OFICIALES: Fuente[] = [
  { dominio: 'supernotariado.gov.co', entidad: 'Superintendencia de Notariado y Registro', tipo: 'OFICIAL', activo: true },
  { dominio: 'dian.gov.co', entidad: 'Dirección de Impuestos y Aduanas Nacionales', tipo: 'OFICIAL', activo: true },
  { dominio: 'cundinamarca.gov.co', entidad: 'Gobernación de Cundinamarca', tipo: 'OFICIAL', activo: true },
  { dominio: 'funcionpublica.gov.co', entidad: 'Función Pública — gestor normativo', tipo: 'OFICIAL', activo: true },
  { dominio: 'secretariasenado.gov.co', entidad: 'Senado de la República', tipo: 'OFICIAL', activo: true },
  { dominio: 'corteconstitucional.gov.co', entidad: 'Corte Constitucional', tipo: 'OFICIAL', activo: true },
  { dominio: 'suin-juriscol.gov.co', entidad: 'SUIN-Juriscol — Ministerio de Justicia', tipo: 'OFICIAL', activo: true },
]

/** Quién tiene que traer lo que falta. El contador de pendientes se parte así. */
export type Dueno = 'titular' | 'contador' | 'entidad'

export const DUENOS: Record<Dueno, string> = {
  titular: 'esperan la resolución oficial',
  contador: 'esperan al contador',
  entidad: 'esperan la tarifa de la entidad que lo expide',
}

/** A quién le toca cada concepto cuando le falta la cifra. */
export const DUENO_DEL_CONCEPTO: Record<string, Dueno> = {
  derechos_escritura: 'titular',
  hojas_papel_notarial: 'titular',
  copias: 'titular',
  biometria: 'titular',
  firma_digital: 'titular',
  autenticaciones: 'titular',
  recaudo_snr: 'titular',
  retefuente: 'contador',
  impuesto_registro: 'titular',
  timbre: 'contador',
  derechos_orip: 'titular',
  sistematizacion: 'titular',
  certificado_tradicion: 'entidad',
  paz_salvo_predial: 'entidad',
  no_valorizacion: 'entidad',
  predial_pendiente: 'entidad',
  acto_sin_cuantia: 'titular',
  recaudo_sin_cuantia: 'titular',
}

const comun = {
  valor: null,
  tramos: [],
  // El redondeo lo dice la resolución, no el motor: nace pendiente.
  redondeo: null,
  // Por defecto no se afirma nada sobre la forma de la curva.
  monotonicidad: 'LIBRE' as const,
  respaldos: [],
  activo_por_defecto: true,
  opcional: false,
  solo_avanzada: false,
  aplica_en_sencilla: false,
  es_estimacion_en_sencilla: false,
  cantidad_variable_por_notaria: false,
  cantidad_variable_por_operacion: false,
}

/** Reparto 50/50 que es solo configuración de la simulación: SIN norma. */
const mitades = {
  sujeto_legal: 'AMBAS_PARTES' as SujetoLegal,
  reparto_por_defecto: 50,
  reparto_editable: true,
  motivo_reparto: 'CONFIGURACION' as const,
  norma_reparto: null,
}

/** A cargo del comprador por práctica del mercado, no por norma. */
const delComprador = {
  sujeto_legal: 'CONTRATANTES' as SujetoLegal,
  reparto_por_defecto: 100,
  reparto_editable: true,
  motivo_reparto: 'COSTUMBRE' as const,
  norma_reparto: null,
}

/** A cargo del vendedor por práctica del mercado. */
const delVendedor = {
  sujeto_legal: 'VENDEDOR' as SujetoLegal,
  reparto_por_defecto: 0,
  reparto_editable: true,
  motivo_reparto: 'COSTUMBRE' as const,
  norma_reparto: null,
}

/**
 * ⚠ LA TABLA QUE NO VA AQUÍ.
 *
 * La resolución trae DOS tablas que se parecen y no son lo mismo:
 *
 *  · Art. 50 — recaudo por cuantía del acto. SÍ entra: es lo que paga el
 *    usuario, y es el concepto `recaudo_snr`.
 *  · Arts. 48 y 49 (la tabla de la página 24, por número de escrituras
 *    anuales) — es el APORTE DEL NOTARIO según su volumen de trabajo. No es un
 *    cobro al usuario y NO ENTRA EN LA CALCULADORA.
 *
 * Están escritas aquí juntas a propósito: la segunda parece «la parte que
 * falta» de la primera, y cargarla sumaría al usuario un aporte que no le
 * corresponde. Si alguien la trae, el sitio correcto es ninguno.
 */
export const CONCEPTOS_V1: Concepto[] = [
  // ── COSTOS NOTARIALES ─────────────────────────────────────────────────────
  {
    ...comun,
    clave: 'derechos_escritura',
    label: 'Derechos notariales por la escritura',
    terminos_coloquiales: ['gastos de notaría', 'gastos notariales'],
    grupo: 'COSTOS_NOTARIALES',
    orden: 10,
    // TRAMOS, no PORCENTAJE: la tarifa tiene un valor fijo hasta una cuantía de
    // corte y una tasa sobre el excedente. Ver el escalón en tramos.ts.
    tipo: 'TRAMOS',
    base: 'NOTARIAL',
    grava_iva: true,
    es_recaudo_terceros: false,
    // El único reparto del catálogo con norma detrás, y es supletiva: la ley
    // divide por mitades SALVO PACTO. No es costumbre, y no es inamovible.
    sujeto_legal: 'AMBAS_PARTES',
    reparto_por_defecto: 50,
    reparto_editable: true,
    motivo_reparto: 'NORMA_SUPLETIVA',
    norma_reparto: 'Código Civil, art. 1862',
    // El único concepto del que SÍ se afirma: escriturar más caro no puede
    // costar menos. Si una resolución futura lo desmiente, se cambia esta
    // propiedad —con el PDF delante—, no la guarda.
    monotonicidad: 'NO_DECRECIENTE',
    aplica_en_sencilla: true,
  },
  {
    ...comun,
    ...mitades,
    clave: 'hojas_papel_notarial',
    label: 'Hojas de papel notarial',
    terminos_coloquiales: [],
    grupo: 'COSTOS_NOTARIALES',
    orden: 20,
    tipo: 'POR_UNIDAD',
    base: 'UNIDADES',
    grava_iva: true,
    es_recaudo_terceros: false,
    unidad_label: 'hoja',
    cantidad_sugerida: null,
    // El VALOR y el número de hojas que gasta una escritura cambian de notaría
    // a notaría. En la sencilla va como estimación declarada.
    cantidad_variable_por_notaria: true,
    aplica_en_sencilla: true,
    es_estimacion_en_sencilla: true,
  },
  {
    ...comun,
    ...mitades,
    clave: 'copias',
    label: 'Copias de la escritura',
    terminos_coloquiales: [],
    grupo: 'COSTOS_NOTARIALES',
    orden: 30,
    tipo: 'POR_UNIDAD',
    base: 'UNIDADES',
    grava_iva: true,
    // Art. 5: la copia simple se cobra POR CARA y el precio publicado ya lleva
    // el IVA dentro. Es el único concepto así, y por eso el componente se
    // extrae del precio en vez de sumarse encima.
    precio_incluye_iva: true,
    es_recaudo_terceros: false,
    // Por CARA, no por copia: una escritura de diez hojas son veinte caras.
    unidad_label: 'cara',
    cantidad_sugerida: null,
    cantidad_variable_por_operacion: true,
    solo_avanzada: true,
  },
  {
    ...comun,
    ...mitades,
    clave: 'biometria',
    label: 'Biometría',
    terminos_coloquiales: ['huellero', 'identificación biométrica'],
    grupo: 'COSTOS_NOTARIALES',
    orden: 40,
    tipo: 'POR_UNIDAD',
    base: 'UNIDADES',
    grava_iva: true,
    es_recaudo_terceros: false,
    // Por persona identificada, y la cantidad NO se asume: una compraventa
    // puede tener dos compradores y un vendedor, o seis herederos.
    unidad_label: 'persona identificada',
    cantidad_sugerida: null,
    cantidad_variable_por_operacion: true,
    solo_avanzada: true,
    opcional: true,
  },
  {
    ...comun,
    ...mitades,
    clave: 'firma_digital',
    label: 'Firma digital',
    terminos_coloquiales: [],
    grupo: 'COSTOS_NOTARIALES',
    orden: 50,
    tipo: 'POR_UNIDAD',
    base: 'UNIDADES',
    grava_iva: true,
    es_recaudo_terceros: false,
    unidad_label: 'firma',
    cantidad_sugerida: null,
    cantidad_variable_por_operacion: true,
    solo_avanzada: true,
    opcional: true,
    activo_por_defecto: false,
  },
  {
    ...comun,
    ...mitades,
    clave: 'autenticaciones',
    label: 'Autenticaciones',
    terminos_coloquiales: [],
    grupo: 'COSTOS_NOTARIALES',
    orden: 60,
    tipo: 'POR_UNIDAD',
    base: 'UNIDADES',
    grava_iva: true,
    es_recaudo_terceros: false,
    unidad_label: 'autenticación',
    cantidad_sugerida: null,
    cantidad_variable_por_operacion: true,
    solo_avanzada: true,
    opcional: true,
    activo_por_defecto: false,
  },
  {
    ...comun,
    ...mitades,
    clave: 'recaudo_snr',
    label: 'Recaudo Superintendencia / Fondo Nacional de Notariado',
    terminos_coloquiales: [],
    grupo: 'COSTOS_NOTARIALES',
    orden: 70,
    // Art. 50: valor FIJO por cuantía. La columna dice «ajustado a la centena
    // más próxima», pero ese ajuste YA viene hecho en el documento: el redondeo
    // se declara PUBLICADO para que el motor tome la cifra tal cual.
    //
    // Cada valor sale de UVB × $12.110 ajustado a la centena, y el parágrafo
    // reparte el recaudo mitad para la Superintendencia y mitad para el Fondo
    // Cuenta Especial del Notariado. Eso es distribución INSTITUCIONAL: no
    // cambia lo que paga el usuario, que ve un único recaudo.
    //
    // ⚠ Los `desde` guardados son el `hasta` del tramo anterior, no el «+1»
    // impreso en la resolución. Ver el convenio de frontera en tramos.ts.
    redondeo: { unidad: 1, modo: 'PUBLICADO' },
    tramos: [
      { orden: 1, desde: 0, hasta: 100_000_000, modo_calculo: 'FIJO', valor: 28_900, unidad: 'PESOS', aporte_snr: 14_450, aporte_fondo: 14_450, valor_en_uvb: 2.39 },
      { orden: 2, desde: 100_000_000, hasta: 300_000_000, modo_calculo: 'FIJO', valor: 43_700, unidad: 'PESOS', aporte_snr: 21_850, aporte_fondo: 21_850, valor_en_uvb: 3.61 },
      { orden: 3, desde: 300_000_000, hasta: 500_000_000, modo_calculo: 'FIJO', valor: 52_700, unidad: 'PESOS', aporte_snr: 26_350, aporte_fondo: 26_350, valor_en_uvb: 4.35 },
      { orden: 4, desde: 500_000_000, hasta: 1_000_000_000, modo_calculo: 'FIJO', valor: 71_900, unidad: 'PESOS', aporte_snr: 35_950, aporte_fondo: 35_950, valor_en_uvb: 5.94 },
      { orden: 5, desde: 1_000_000_000, hasta: 1_500_000_000, modo_calculo: 'FIJO', valor: 84_800, unidad: 'PESOS', aporte_snr: 42_400, aporte_fondo: 42_400, valor_en_uvb: 7.00 },
      { orden: 6, desde: 1_500_000_000, hasta: null, modo_calculo: 'FIJO', valor: 96_400, unidad: 'PESOS', aporte_snr: 48_200, aporte_fondo: 48_200, valor_en_uvb: 7.96 },
    ],
    // Valores fijos por rango de cuantía: TRAMOS en modo FIJO, no un porcentaje.
    tipo: 'TRAMOS',
    base: 'NOTARIAL',
    // Lo cobra la notaría pero no es su remuneración: sale de la base del IVA.
    grava_iva: false,
    es_recaudo_terceros: true,
    aplica_en_sencilla: true,
  },

  // ── IMPUESTOS ─────────────────────────────────────────────────────────────
  {
    ...comun,
    clave: 'retefuente',
    label: 'Retención en la fuente',
    terminos_coloquiales: ['retefuente', 'retención', 'el 1% de la DIAN'],
    grupo: 'IMPUESTOS',
    orden: 80,
    tipo: 'REGLAS',
    base: 'RETENCION',
    grava_iva: false,
    es_recaudo_terceros: false,
    // Aquí no hay reparto que repartir: hay un contribuyente. La interfaz tiene
    // que decir eso, no «no editable», que se leería como «lo manda la ley que
    // lo pague el vendedor y no se puede negociar el precio».
    sujeto_legal: 'VENDEDOR',
    reparto_por_defecto: 0,
    reparto_editable: false,
    motivo_reparto: 'CONTRIBUYENTE',
    norma_reparto: null,
    aplica_en_sencilla: true,
  },
  {
    ...comun,
    ...delComprador,
    clave: 'impuesto_registro',
    label: 'Impuesto de registro',
    // «Beneficencia» es la palabra con la que se busca; nunca el nombre del
    // concepto. Esta lista alimenta el texto de la página, no la etiqueta.
    terminos_coloquiales: ['beneficencia', 'rentas de beneficencia'],
    grupo: 'IMPUESTOS',
    orden: 90,
    tipo: 'PORCENTAJE',
    base: 'REGISTRO',
    grava_iva: false,
    es_recaudo_terceros: false,
    aplica_en_sencilla: true,
  },
  {
    ...comun,
    ...mitades,
    clave: 'timbre',
    label: 'Impuesto de timbre',
    terminos_coloquiales: [],
    grupo: 'IMPUESTOS',
    orden: 100,
    // Tramos MARGINALES en UVT. Por debajo del umbral la tarifa es 0 %, así que
    // el concepto no se «activa»: da cero porque la tabla dice cero.
    tipo: 'TRAMOS',
    base: 'TIMBRE',
    grava_iva: false,
    es_recaudo_terceros: false,
    aplica_en_sencilla: true,
  },

  // ── REGISTRO ──────────────────────────────────────────────────────────────
  {
    ...comun,
    ...delComprador,
    clave: 'derechos_orip',
    label: 'Derechos de registro (ORIP)',
    terminos_coloquiales: ['gastos de registro', 'registro de la escritura'],
    grupo: 'REGISTRO',
    orden: 110,
    tipo: 'TRAMOS',
    base: 'ORIP',
    grava_iva: false,
    es_recaudo_terceros: false,
    aplica_en_sencilla: true,
  },
  {
    ...comun,
    ...delComprador,
    clave: 'sistematizacion',
    label: 'Sistematización y conservación documental',
    terminos_coloquiales: [],
    grupo: 'REGISTRO',
    orden: 120,
    tipo: 'PORCENTAJE',
    // Se calcula sobre la tarifa registral ya liquidada, no sobre el inmueble.
    base: 'TARIFA_REGISTRAL',
    grava_iva: false,
    es_recaudo_terceros: false,
    aplica_en_sencilla: true,
  },

  // ── DOCUMENTOS PREVIOS ────────────────────────────────────────────────────
  {
    ...comun,
    ...delVendedor,
    clave: 'certificado_tradicion',
    label: 'Certificado de tradición y libertad',
    terminos_coloquiales: ['certificado de libertad', 'CTL'],
    grupo: 'DOCUMENTOS_PREVIOS',
    orden: 130,
    tipo: 'FIJO',
    base: 'NINGUNA',
    grava_iva: false,
    es_recaudo_terceros: false,
    solo_avanzada: true,
    opcional: true,
  },
  {
    ...comun,
    ...delVendedor,
    clave: 'paz_salvo_predial',
    label: 'Paz y salvo predial',
    terminos_coloquiales: [],
    grupo: 'DOCUMENTOS_PREVIOS',
    orden: 140,
    tipo: 'FIJO',
    base: 'NINGUNA',
    grava_iva: false,
    es_recaudo_terceros: false,
    solo_avanzada: true,
    opcional: true,
  },
  {
    ...comun,
    ...delVendedor,
    clave: 'no_valorizacion',
    label: 'Certificado de no valorización',
    terminos_coloquiales: [],
    grupo: 'DOCUMENTOS_PREVIOS',
    orden: 150,
    tipo: 'FIJO',
    base: 'NINGUNA',
    grava_iva: false,
    es_recaudo_terceros: false,
    solo_avanzada: true,
    opcional: true,
  },

  // ── ACTOS SIN CUANTÍA ─────────────────────────────────────────────────────
  // No se muestran en la calculadora sencilla, pero quedan catalogados,
  // parametrizables y calculables: una cancelación de hipoteca o una
  // afectación a vivienda familiar se otorgan en la misma notaría y el día que
  // haya que cotizarlas, el concepto ya existe.
  {
    ...comun,
    ...mitades,
    clave: 'acto_sin_cuantia',
    label: 'Acto sin cuantía',
    terminos_coloquiales: ['escritura sin cuantía'],
    grupo: 'COSTOS_NOTARIALES',
    orden: 155,
    tipo: 'FIJO',
    base: 'NINGUNA',
    grava_iva: true,
    es_recaudo_terceros: false,
    // Art. 2 literal a). Verificado contra el PDF; respaldo pendiente del enlace.
    valor: 90_600,
    solo_avanzada: true,
    opcional: true,
    activo_por_defecto: false,
  },
  {
    ...comun,
    ...mitades,
    clave: 'recaudo_sin_cuantia',
    label: 'Recaudo Superintendencia / Fondo — acto sin cuantía',
    terminos_coloquiales: [],
    grupo: 'COSTOS_NOTARIALES',
    orden: 156,
    // Un solo tramo, no un valor fijo del concepto: así el desglose
    // institucional vive donde viven todos —en el tramo— y lo alcanza la guarda
    // que comprueba que los aportes sumen el recaudo. Un `aporte_snr` en el
    // concepto sería el mismo dato en dos sitios.
    tipo: 'TRAMOS',
    base: 'NINGUNA',
    grava_iva: false,
    es_recaudo_terceros: true,
    // Primera fila del art. 50: «actos sin cuantía y escrituras exentas».
    redondeo: { unidad: 1, modo: 'PUBLICADO' },
    tramos: [
      { orden: 1, desde: 0, hasta: null, modo_calculo: 'FIJO', valor: 19_300, unidad: 'PESOS', aporte_snr: 9_650, aporte_fondo: 9_650, valor_en_uvb: 1.59 },
    ],
    solo_avanzada: true,
    opcional: true,
    activo_por_defecto: false,
  },

  // ── OBLIGACIONES DEL INMUEBLE ─────────────────────────────────────────────
  {
    ...comun,
    clave: 'predial_pendiente',
    label: 'Impuesto predial pendiente',
    terminos_coloquiales: ['predial atrasado', 'deuda de predial'],
    grupo: 'OBLIGACIONES',
    orden: 160,
    // Valor libre: depende del predio, no de ninguna tarifa.
    tipo: 'VALOR_LIBRE',
    base: 'NINGUNA',
    grava_iva: false,
    es_recaudo_terceros: false,
    // El sujeto pasivo del predial es el propietario. Tampoco es un reparto.
    sujeto_legal: 'VENDEDOR',
    reparto_por_defecto: 0,
    reparto_editable: false,
    motivo_reparto: 'CONTRIBUYENTE',
    norma_reparto: null,
    solo_avanzada: true,
    opcional: true,
    activo_por_defecto: false,
  },
]

/**
 * Qué campos de un concepto exigen respaldo oficial para poder activar el año.
 *
 *   · la cifra                — `tramos` o `valor`, según cómo se calcule
 *   · el reparto              — solo si se afirma una norma supletiva
 *   · el sujeto legal         — si se afirma QUIÉN es el contribuyente
 *
 * VALOR_LIBRE no exige nada: lo escribe el usuario, y el PDF lo marca como
 * dato suyo. REGLAS tampoco: su respaldo vive en cada regla de retención.
 */
export function camposExigidos(c: Concepto): string[] {
  const campos: string[] = []
  if (c.tipo === 'TRAMOS') campos.push('tramos')
  else if (c.tipo !== 'VALOR_LIBRE' && c.tipo !== 'REGLAS') campos.push('valor')
  // A qué unidad y en qué sentido redondea: es un dato de la resolución, y sin
  // él la tarifa no se puede liquidar. Solo donde hay aritmética que redondear.
  if (c.tipo === 'TRAMOS' || c.tipo === 'PORCENTAJE' || c.tipo === 'POR_MIL') campos.push('redondeo')
  if (c.motivo_reparto === 'NORMA_SUPLETIVA') campos.push('reparto')
  if (c.motivo_reparto === 'CONTRIBUYENTE') campos.push('sujeto_legal')
  return campos
}
