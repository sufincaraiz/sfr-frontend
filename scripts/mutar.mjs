#!/usr/bin/env node
/**
 * MUTACIONES DECLARADAS, CON LA PROPIEDAD DENTRO
 * ==============================================
 *
 * Una verificación que pasa no demuestra nada si también pasaría estando el
 * código roto. La única forma de saber que discrimina es romper el código a
 * propósito y confirmar que se entera. Eso ya se hacía, pero a mano y en la
 * consola: las mutaciones no quedaban en el repositorio, así que eran
 * afirmaciones mías sin instrumento, imposibles de repetir y de auditar.
 *
 * ⚠ LA PROPIEDAD QUE ESTE ARCHIVO EXISTE PARA TENER
 *
 * El 2026-10-14, cuatro veces en un día, una «mutación» no mutó nada:
 *
 *   · el contador de mutantes contaba solo las ✗ y no los cuelgues;
 *   · un patrón con separadores de miles (`| 100.000.000`) no existía en un
 *     bloque que escribe las cifras sin separadores, así que el `replace` no
 *     tocó el archivo;
 *   · dos casos abrían el archivo en escritura antes de leerlo y lo truncaban,
 *     de modo que la guarda se quejaba de otra cosa.
 *
 * En los tres últimos el resultado parecía informativo y no lo era. Y el modo
 * de fallo es siempre el mismo y siempre en la dirección cómoda: **una mutación
 * que no ocurre se lee como «la verificación pasó»**, que es indistinguible de
 * «todo está bien».
 *
 * De ahí las tres reglas, y son del instrumento, no del uso:
 *
 *   1. UNA MUTACIÓN NO CUENTA HASTA QUE SE DEMUESTRA QUE EL CONTENIDO CAMBIÓ.
 *      Si el texto buscado no está, el resultado NO es «sobrevivió» ni «pasó»:
 *      es ERROR_DE_LA_PRUEBA, y la suite falla.
 *   2. LA RESTAURACIÓN SE COMPRUEBA BYTE A BYTE. Dejar el repositorio mutado
 *      sería peor que no haber probado.
 *   3. LAS TRES SALIDAS SON DISTINTAS. «Detectada», «sobrevivió» y «error de la
 *      prueba» no se agregan en un semáforo: la última no dice nada del código,
 *      dice que el instrumento está roto.
 *
 * Y una consecuencia incómoda que conviene no olvidar: de las mutaciones que
 * dimos por buenas antes de este archivo no se puede saber cuántas mutaban de
 * verdad, porque no quedaron escritas. Las que están aquí abajo son las que se
 * volvieron a correr bajo estas reglas.
 *
 *   node scripts/mutar.mjs            todas
 *   node scripts/mutar.mjs frontera   solo las que contengan «frontera»
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const H_NOTARIAL = 'node scripts/probar-notariales.mjs'
const G_TRANSCRIPCION = 'node scripts/verificar-transcripcion.mjs'
const G_ESCRITURAS = 'node scripts/verificar-escrituras.mjs'
const H_FINANZAS = 'node scripts/probar-finanzas.mjs'
const H_EDITOR = 'node scripts/probar-editor-tramos.mjs'
/* La escala vive en un modulo que usan los DOS motores, asi que su mutacion
 * tiene que correr los dos arneses: si solo corriera uno, media cobertura
 * seria una suposicion. */
const LOS_DOS = `${H_NOTARIAL} && ${H_FINANZAS}`

/**
 * Cada mutación dice qué rompe, dónde, y QUIÉN tiene que enterarse.
 *
 * `porque` no es decoración: es la afirmación que la mutación pone a prueba. Si
 * una mutación sobrevive, lo que se cae es esa frase.
 */
const MUTACIONES = [
  /* ─── EL DESTINO DE LA BASE · 2026-10-26 ─────────────────────────────── */
  {
    nombre: "destino: la lista de seguros se traga cualquier host",
    porque: "si todo es seguro, la guarda deja de negarse y vuelve el estado de hace dos semanas: escribir en produccion sin decidirlo.",
    archivo: 'src/lib/destino-base.ts',
    de: "export const HOSTS_SEGUROS = ['localhost', '127.0.0.1', '[::1]']",
    a: "export const HOSTS_SEGUROS = ['localhost', '127.0.0.1', '[::1]', 'acela.proxy.rlwy.net']",
    comando: 'node scripts/probar-destino-base.mjs',
  },
  {
    nombre: "destino: sin autorizacion vuelve a dejar pasar",
    porque: "es la guarda entera: una autorizacion que no hace falta no es una autorizacion.",
    archivo: 'src/lib/destino-base.ts',
    de: "  if (!dada) {",
    a: "  if (false) {",
    comando: 'node scripts/probar-destino-base.mjs',
  },
  {
    nombre: "destino: la autorizacion deja de tener que nombrar el host",
    porque: "un \u00absi\u00bb valdria para cualquier base y se podria dejar escrito en un archivo; el host obliga a mirar a donde se apunta.",
    archivo: 'src/lib/destino-base.ts',
    de: "  if (!d.host || dada !== d.host.toLowerCase()) {",
    a: "  if (false) {",
    comando: 'node scripts/probar-destino-base.mjs',
  },
  {
    nombre: "destino: exigir deja de detener y solo devuelve",
    porque: "detener y devolver no es lo mismo: un llamador puede ignorar un booleano con un if olvidado, y es exactamente como nacio este problema.",
    archivo: 'src/lib/destino-base.ts',
    de: "  if (!v.puede) {",
    a: "  if (false) {",
    comando: 'node scripts/probar-destino-base.mjs',
  },
  /* ─── EL LATIDO · 2026-10-25 ──────────────────────────────────────────── */
  {
    nombre: 'latido: /fail deja de normalizar la barra final',
    porque: 'una URL copiada del panel puede traer barra; «…uuid//fail» devuelve 404 y el aviso de FALLO se perderia justo cuando mas falta hace.',
    archivo: 'src/lib/latido.ts',
    de: "  const limpia = base.trim().replace(/\\/+$/, '')",
    a: "  const limpia = base.trim()",
    comando: 'node scripts/probar-latido.mjs',
  },
  {
    nombre: 'latido: el fallo deja de mandarse y se espera al silencio',
    porque: 'el silencio tarda el margen entero -una hora-; el /fail llega en segundos. El silencio queda solo para lo que no se puede avisar.',
    archivo: 'src/lib/latido.ts',
    de: "  return estado === 'FALLO' ? `${limpia}/fail` : limpia",
    a: "  return limpia",
    comando: 'node scripts/probar-latido.mjs',
  },
  {
    nombre: 'latido: sin URL vuelve a callarse',
    porque: 'un camino que se desactiva en silencio es indistinguible de uno que funciona. Es la leccion de los tres return mudos que dejaron 9 leads sin aviso.',
    archivo: 'src/lib/latido.ts',
    de: "    return { late: false, motivo: 'no se latió: falta HEALTHCHECKS_PING_URL en el entorno' }",
    a: "    return { late: true, base: '' }",
    comando: 'node scripts/probar-latido.mjs',
  },
  {
    nombre: 'latido: acepta http y manda la credencial en claro',
    porque: 'la URL ES la llave: por http viaja en claro hasta el vigilante, y quien la vea puede mandar «estoy vivo» en falso.',
    archivo: 'src/lib/latido.ts',
    de: "  if (!/^https:\\/\\//i.test(base)) {",
    a: "  if (false) {",
    comando: 'node scripts/probar-latido.mjs',
  },
  /* ─── EL AVISO DEL LEAD · 2026-10-23 ────────────────────────────
   * La última es la que importa de verdad: borra la LLAMADA al aviso en
   * /api/leads, que es literalmente el defecto que dejó 9 de 12 leads sin que
   * nadie se enterara. Ninguna prueba del arnés la caza —una llamada que falta
   * no tiene sintaxis— y por eso la mata una GUARDA y no una prueba. Si esa
   * mutación sobreviviera, el arreglo de hoy podría deshacerse mañana sin que
   * nada se quejara, que es exactamente como llegó a existir.
   */
  {
    nombre: 'aviso: sin destino configurado vuelve a mandar igual',
    porque: 'sin destino no hay a quien avisar; mandar de todas formas producira un rechazo de Meta que nadie pidio y una fila confusa.',
    archivo: 'src/lib/aviso-lead.ts',
    de: "  if (falta.length > 0) {",
    a: "  if (false) {",
    comando: 'node scripts/probar-aviso-lead.mjs',
  },
  {
    nombre: 'aviso: el resumen vacio vuelve a bloquear el aviso',
    porque: 'era el `if (resumen)` de tools.ts: convertia la falta de un texto de cortesia en la falta del aviso entero, y en silencio.',
    archivo: 'src/lib/aviso-lead.ts',
    de: "  return { manda: true, destino: to }",
    a: "  if (!resumen) return { manda: false, resultado: 'SIN_RESUMEN', motivo: 'sin resumen', destino: to }\n  return { manda: true, destino: to }",
    comando: 'node scripts/probar-aviso-lead.mjs',
  },
  {
    nombre: 'aviso: una lista vacia de avisos vuelve a contar como fallo',
    porque: 'vacio significa «por aqui no paso codigo de aviso» y fallo significa «Meta lo rechazo». Confundirlos es lo que mantuvo el defecto invisible medio ano.',
    archivo: 'src/lib/aviso-lead.ts',
    de: "  if (!Array.isArray(avisos) || avisos.length === 0) return 'NUNCA_SE_INTENTO'",
    a: "  if (!Array.isArray(avisos) || avisos.length === 0) return 'FALLO'",
    comando: 'node scripts/probar-aviso-lead.mjs',
  },
  {
    nombre: 'aviso: un timeout de Meta vuelve a contar como aceptado',
    porque: 'si no hubo respuesta no se sabe nada, y contarlo como aceptado es la forma mas directa de volver a tener un verde que no puede ser rojo.',
    archivo: 'src/lib/aviso-lead.ts',
    de: "  if (estado === null) return 'ERROR_DE_RED'",
    a: "  if (estado === null) return 'ACEPTADO_POR_META'",
    comando: 'node scripts/probar-aviso-lead.mjs',
  },
  {
    nombre: 'aviso: un lead nuevo sin avisar deja de pedir atencion',
    porque: 'un lead del que nadie se entero no puede verse igual que uno que ya esta esperando a Leonel: el primero espera a que alguien descubra que existe.',
    archivo: 'src/lib/aviso-lead.ts',
    de: "  return status === 'new'",
    a: "  return false",
    comando: 'node scripts/probar-aviso-lead.mjs',
  },
  {
    nombre: 'LA LLAMADA QUE FALTA: /api/leads deja de avisar',
    porque: 'es el defecto exacto del 2026-10-23: 9 de 12 leads en 60 dias sin que nadie se enterara. Ninguna PRUEBA puede cazarlo; lo caza la guarda verificar-avisos.mjs.',
    archivo: 'src/app/api/leads/route.ts',
    de: "  const intento = await avisarLead(leadId, nombre, telefono, mensaje || '')",
    a: "  const intento = { resultado: 'SIN_CONFIGURAR' }",
    comando: 'node scripts/verificar-avisos.mjs',
  },
  /* ─── N-02 · EL COTEJO MIRA EL MODO Y EL REDONDEO ──────────────────
   * Seis mutaciones, una por decisión. La cuarta y la quinta son las que
   * importan de verdad: rompen la EMISIÓN en `datos.ts`, y antes de añadir las
   * tres verificaciones sobre `FILAS` habrían sobrevivido las dos —las fixtures
   * sintéticas del bloque N-02 no pasan por `valoresDesdeAnio`, así que el
   * arnés entero se quedaba en verde con el modo sin viajar—.
   */
  {
    nombre: 'cotejo: el modo vuelve a compararse como cifra y no como texto',
    porque: 'con `normalizarValor`, «tasa_sobre_total» y «TASA_SOBRE_TOTAL» serian modos distintos y cada minuscula seria un falso hallazgo.',
    archivo: 'src/lib/notariales/cotejo.ts',
    de: "  return campo === 'redondeo.modo' || campo.endsWith('.modo')",
    a: "  return false",
    comando: 'node scripts/probar-notariales.mjs',
  },
  {
    nombre: 'cotejo: `pendiente` vuelve a ser un valor con el que comparar',
    porque: 'sin el quinto estado, un parametro que nadie leyo del PDF sale COINCIDE o DIFIERE: en los dos casos el informe afirma algo que no sabe.',
    archivo: 'src/lib/notariales/cotejo.ts',
    de: "    if (t && normalizarTexto(t.valor) === PENDIENTE) {",
    a: "    if (false) {",
    comando: 'node scripts/probar-notariales.mjs',
  },
  {
    nombre: 'cotejo: `completo` deja de mirar los que no tienen segunda lectura',
    porque: 'un parametro sin leer no contradice nada, asi que `apto` sigue cierto: si `completo` tampoco lo mira, la pareja autoriza publicar una cifra con una sola lectura.',
    archivo: 'src/lib/notariales/cotejo.ts',
    de: "    completo: sinCargar === 0 && sinLectura === 0,",
    a: "    completo: sinCargar === 0,",
    comando: 'node scripts/probar-notariales.mjs',
  },
  {
    nombre: 'datos: el modo del tramo deja de viajar al cotejo',
    porque: 'es el parametro que mueve 1.280.000 pesos sin cambiar ningun numero de la tabla. Si no se emite, no se cotejar y el informe dice COINCIDE.',
    archivo: 'src/lib/notariales/datos.ts',
    de: "      out.push({ concepto: c.clave, campo: `tramo.${t.orden}.modo`, valor: String(t.modo_calculo),",
    a: "      if (false) out.push({ concepto: c.clave, campo: `tramo.${t.orden}.modo`, valor: String(t.modo_calculo),",
    comando: 'node scripts/probar-notariales.mjs',
  },
  {
    nombre: 'datos: el redondeo deja de viajar al cotejo',
    porque: 'cargarlo al peso en vez de a la centena cambia la cifra final de cada concepto con aritmetica, y hasta N-02 no se cotejaba.',
    archivo: 'src/lib/notariales/datos.ts',
    de: "    if (c.redondeo) {",
    a: "    if (false) {",
    comando: 'node scripts/probar-notariales.mjs',
  },
  {
    nombre: 'datos: el modo viaja con una unidad inventada',
    porque: 'un modo no es una magnitud. Con unidad, el cotejo compara tambien ese campo y produce diferencias de unidad sobre algo que no la tiene.',
    archivo: 'src/lib/notariales/datos.ts',
    de: "        unidad: '', articulo: articuloTramos })",
    a: "        unidad: 'PESOS', articulo: articuloTramos })",
    comando: 'node scripts/probar-notariales.mjs',
  },
  {
    nombre: 'catalogo: publicar vuelve a admitir precio cero',
    porque: 'cero no es un precio, y un 0 en una oferta de schema.org afirma «gratis».',
    archivo: 'src/lib/publicable-propiedad.ts',
    de: "  if (!Number.isFinite(precio) || precio <= 0) falta.push('el precio (no puede ser cero)')",
    a: "  if (false) falta.push('el precio (no puede ser cero)')",
    comando: 'node scripts/probar-publicable-propiedad.mjs',
  },
  {
    nombre: 'catalogo: la puerta vuelve a mirar cualquier estado, no solo available',
    porque: 'lo que no es publico no tiene por que estar completo; exigirselo bloquearia guardar un borrador.',
    archivo: 'src/lib/publicable-propiedad.ts',
    de: "  if (estado !== 'available') return",
    a: "  if (false) return",
    comando: 'node scripts/probar-publicable-propiedad.mjs',
  },
  {
    nombre: 'firma: «admin» vuelve a poder firmar un acto',
    porque: 'era el valor por defecto. Una cifra equivocada se recalcula; quien la cargo, no.',
    archivo: 'src/lib/notariales/firma.ts',
    de: "  if (f.valor?.toLowerCase() === 'admin') throw new SinIdentidadParaFirmar(acto)",
    a: "  if (false) throw new SinIdentidadParaFirmar(acto)",
    comando: H_NOTARIAL,
  },
  {
    nombre: 'firma: un marcador vuelve a contar como persona identificable',
    porque: '«precarga» y «titular» son ciertos y no acreditan a nadie; leerlos igual que un correo es el defecto.',
    archivo: 'src/lib/notariales/firma.ts',
    de: "    return { clase: 'MARCADOR', valor: v, etiqueta: `${v} — ${marcador}`, acredita: false }",
    a: "    return { clase: 'PERSONA', valor: v, etiqueta: `${v} — ${marcador}`, acredita: true }",
    comando: H_NOTARIAL,
  },
  {
    nombre: 'vigencias: la lista que no se cargo vuelve a contar como «ninguna»',
    porque: 'un `select` incompleto desarmaria la comprobacion de vigencias y se liquidaria con tarifas vencidas.',
    archivo: 'src/lib/notariales/guardas.ts',
    de: '  if (respaldos === undefined) {',
    a: '  if (false) {',
    comando: H_NOTARIAL,
  },
  /* ── LAS BANDERAS DEL RUT: TRES ESTADOS ────────────────────────────────────
   * Si cualquiera de las dos puertas vuelve a tratar `null` como `false`, un
   * tercero sin RUT capturado vuelve a elegir tarifa de retención solo. */
  {
    nombre: 'retefuente: no saber si declara renta vuelve a contar como «no declara»',
    porque: 'la tarifa de no declarante es la más alta en servicios: suponerla cuesta dinero.',
    archivo: 'src/lib/finanzas/calculo.ts',
    de: "  if (esDeclaranteRenta === null) {",
    a: "  if (false) {",
    comando: H_FINANZAS,
  },
  {
    nombre: 'retefuente: omitir «autorretenedor» vuelve a significar que no lo es',
    porque: 'retenerle a quien se autorretiene es un error propio, y el dato sale del RUT.',
    archivo: 'src/lib/finanzas/calculo.ts',
    de: "  if (esAutorretenedor === null || esAutorretenedor === undefined) {",
    a: "  if (esAutorretenedor === null) {",
    comando: H_FINANZAS,
  },
  /* ── EL EDITOR DE TRAMOS ───────────────────────────────────────────────────
   * Las tres decisiones que sostienen la forma: si `desde` deja de ser el
   * `hasta` anterior, vuelven el hueco y el solape; si la casilla en blanco
   * vuelve a contar como tramo abierto, vuelve la tabla con dos infinitos
   * declarada liquidable; y si el límite ilegible vuelve a lanzar, el editor
   * se cae mientras alguien teclea. */
  {
    nombre: 'editor: `desde` deja de ser el `hasta` anterior y pasa a +1',
    porque: 'los límites son CONTIGUOS. Con +1 vuelve el hueco que se come a $100.000.000,50.',
    archivo: 'src/lib/notariales/editor-tramos.ts',
    de: '      desde: anterior,',
    a: '      desde: anterior === 0 ? 0 : anterior + 1,',
    comando: H_EDITOR,
  },
  {
    nombre: 'editor: la casilla en blanco deja de distinguirse del tramo abierto',
    porque: 'producía DOS tramos con `hasta: null` y `desde: 0`, y la tabla se declaraba LIQUIDABLE.',
    archivo: 'src/lib/notariales/editor-tramos.ts',
    de: "const enBlanco = f.hasta !== null && String(f.hasta).trim() === ''",
    a: 'const enBlanco = false',
    comando: H_EDITOR,
  },
  {
    nombre: 'editor: un límite incompleto vuelve a ser una excepción',
    porque: 'quien teclea pasa por estados ilegibles todo el rato; una excepción tumba la pantalla.',
    archivo: 'src/lib/notariales/editor-tramos.ts',
    de: '  } catch {\n    return { hasta: null, ilegible: true }\n  }',
    a: '  } catch (e) {\n    throw e\n  }',
    comando: H_EDITOR,
  },
  {
    nombre: 'frontera del tramo: ≤ pasa a <',
    porque: 'el límite superior del tramo PERTENECE al tramo. 100.000.000 exactos van al primero.',
    archivo: 'src/lib/notariales/tramos.ts',
    de: 'base > desde && (hasta === null || base <= hasta)',
    a: 'base > desde && (hasta === null || base < hasta)',
    comando: H_NOTARIAL,
  },
  {
    nombre: 'frontera del tramo: > pasa a ≥',
    porque: 'el límite inferior NO pertenece: si no, dos tramos se solaparían en el borde.',
    archivo: 'src/lib/notariales/tramos.ts',
    de: 'base > desde && (hasta === null || base <= hasta)',
    a: 'base >= desde && (hasta === null || base <= hasta)',
    comando: H_NOTARIAL,
  },
  {
    nombre: 'redondeo: ROUND_HALF_UP pasa a ROUND_DOWN',
    porque: 'el sentido del redondeo es una regla normativa, no una preferencia.',
    archivo: 'src/lib/notariales/iva.ts',
    de: 'D.ROUND_HALF_UP',
    a: 'D.ROUND_DOWN',
    comando: H_NOTARIAL,
  },
  {
    nombre: 'vigencia: una fecha anterior deja de quedar fuera',
    porque: 'nunca se liquida con una norma que no estaba en vigor ese día (art. 56).',
    archivo: 'src/lib/notariales/guardas.ts',
    de: 'if (fecha < r.vigencia_desde) return false',
    a: 'if (fecha < r.vigencia_desde) return true',
    comando: H_NOTARIAL,
  },
  {
    nombre: 'catálogo: un concepto nace con valor',
    porque: 'ninguna cifra entra sembrada; si naciera, el cotejo se compararía consigo mismo.',
    archivo: 'src/lib/notariales/catalogo.ts',
    de: "    clave: 'acto_sin_cuantia',",
    a: "    clave: 'acto_sin_cuantia',\n    valor: 90_600,",
    comando: H_NOTARIAL,
  },
  /* ── LOTE 1: las que hoy producen una cifra PLAUSIBLE y equivocada ────── */
  {
    nombre: 'escala: el por mil pasa a por ciento',
    porque: 'un 3 por mil leído como 3 % da diez veces la cifra y sigue pareciendo un gasto normal.',
    archivo: 'src/lib/escala-tarifa.ts',
    de: '  POR_MIL: 1000,',
    a: '  POR_MIL: 100,',
    /* Esta sola mutación vigila CUATRO sitios —los tramos notariales, las reglas
     * de retención, las tarifas sueltas y el ICA del módulo financiero— porque
     * la escala dejó de estar escrita cuatro veces. Antes hacían falta cuatro, y
     * el inventario solo había encontrado tres de los cuatro sitios. */
    comando: LOS_DOS,
  },
  {
    nombre: 'escala: el porcentaje pasa a por mil',
    porque: 'la confusión va en los dos sentidos: un 19 % leído como 19 por mil también es plausible.',
    archivo: 'src/lib/escala-tarifa.ts',
    de: '  PORCENTAJE: 100,',
    a: '  PORCENTAJE: 1000,',
    comando: LOS_DOS,
  },
  {
    nombre: 'NIT: el dígito de verificación invierte su rama',
    porque: 'el DV sale impreso en cada documento que se entrega, y otro dígito es igual de plausible.',
    archivo: 'src/lib/finanzas/empresa.ts',
    de: 'return String(r > 1 ? 11 - r : r)',
    a: 'return String(r > 1 ? r : 11 - r)',
    comando: H_FINANZAS,
  },
  {
    nombre: 'retefuente: la base mínima deja de incluir el igual',
    porque: 'un pago de exactamente la base mínima SÍ se retiene, y el único sitio donde se nota es ese peso.',
    archivo: 'src/lib/finanzas/calculo.ts',
    de: 'if (minimo.gt(0) && base.lt(minimo))',
    a: 'if (minimo.gt(0) && base.lte(minimo))',
    comando: H_FINANZAS,
  },
  {
    nombre: 'retención: el orden de las reglas se invierte',
    porque: 'con la general primero, ninguna exención se aplicaría nunca y nadie lo vería.',
    archivo: 'src/lib/notariales/retencion.ts',
    de: 'const activas = reglas.filter(r => r.activa).sort((a, b) => a.orden - b.orden)',
    a: 'const activas = reglas.filter(r => r.activa).sort((a, b) => b.orden - a.orden)',
    comando: H_NOTARIAL,
  },

  {
    nombre: 'transcripción: una cifra del bloque cambia',
    porque: 'el módulo generado no puede quedarse viejo respecto al documento.',
    archivo: 'PARAMETROS-NOTARIALES-VERIFICADOS.md',
    de: '| 90600 |',
    a: '| 90601 |',
    comando: G_TRANSCRIPCION,
  },
  {
    nombre: 'transcripción: la huella deja de normalizar los saltos',
    porque: 'la huella es del CONTENIDO, no de la copia. Esto es lo que rompió el deploy.',
    archivo: 'src/lib/notariales/huella.ts',
    de: "const texto = documento.replace(/\\r\\n/g, '\\n')",
    a: 'const texto = documento',
    /* EL ORDEN IMPORTA Y LA PRIMERA VERSIÓN LO TENÍA MAL. Generar y verificar en
     * la MISMA superficie cuadran aunque la normalización no esté: el defecto
     * solo existe CRUZANDO superficies. Así que hay que generar con LF —como mi
     * máquina— y verificar con CRLF —como el checkout del otro lado—, y es entre
     * los dos pasos donde se convierte. Con la conversión al final, la mutación
     * sobrevivía y parecía que la guarda no servía. */
    respalda: ['PARAMETROS-NOTARIALES-VERIFICADOS.md',
               'src/lib/notariales/transcripcion.generada.ts'],
    pasos: [
      'node scripts/generar-transcripcion.mjs',
      { crlf: 'PARAMETROS-NOTARIALES-VERIFICADOS.md' },
      'node scripts/verificar-transcripcion.mjs',
    ],
  },
  {
    nombre: 'evidencia: la huella del PDF normaliza los saltos',
    porque: 'la huella de un archivo es del CONTENIDO y la comprueba cualquiera con sha256sum.',
    archivo: 'src/lib/notariales/huella.ts',
    de: "return createHash('sha256').update(bytes).digest('hex')",
    a: "return createHash('sha256').update(Buffer.from(bytes.toString('latin1').replace(/\\r\\n/g, '\\n'), 'latin1')).digest('hex')",
    comando: H_NOTARIAL,
  },
  {
    nombre: 'escáner de escrituras: el return se mira antes del await',
    porque: 'así escondía los casos `return NextResponse.json(await …)`, que son la mitad.',
    archivo: 'scripts/verificar-escrituras.mjs',
    de: `      if (FALLIBLE.test(l)) despues.push({ linea: i + 1, texto: l.trim().slice(0, 76) })
      if (/^\\s*return\\b/.test(l)) {`,
    a: `      if (/^\\s*return\\b/.test(l)) {`,
    comando: G_ESCRITURAS,
  },
]

/* ── el motor ──────────────────────────────────────────────────────────────── */

class ErrorDeLaPrueba extends Error {}

function correr(comando) {
  const r = spawnSync(comando, { encoding: 'utf8', shell: true })
  if (r.error) throw new ErrorDeLaPrueba(`no pude ejecutar «${comando}»: ${r.error.message}`)
  return { codigo: r.status, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

function aCrlf(archivo) {
  const s = readFileSync(archivo, 'utf8')
  writeFileSync(archivo, s.replace(/\r?\n/g, '\r\n'), 'utf8')
}

function unaMutacion(m) {
  /* Los bytes originales, en memoria. Un backup en disco es otro archivo que
   * se puede quedar a medias.
   *
   * `respalda` existe porque una mutación puede necesitar tocar archivos que no
   * son el mutado —convertir el documento a CRLF, regenerar un módulo— y
   * dejarlos cambiados sería peor que no haber probado. Se restauran todos. */
  const tocados = [m.archivo, ...(m.respalda ?? [])]
  const copias = new Map()
  for (const f of tocados) {
    try {
      copias.set(f, readFileSync(f))
    } catch (e) {
      throw new ErrorDeLaPrueba(`no pude leer ${f}: ${e.code ?? e.message}`)
    }
  }
  const original = copias.get(m.archivo)

  if (m.de === m.a) throw new ErrorDeLaPrueba('«de» y «a» son iguales: no hay mutación')

  const antes = original.toString('utf8')
  const despues = antes.replace(m.de, m.a)

  /* REGLA 1. Lo que pasó cuatro veces hoy muere aquí. */
  if (despues === antes) {
    throw new ErrorDeLaPrueba(
      `el texto buscado NO está en ${m.archivo}, así que el archivo no cambió. ` +
      'Esto no es «sobrevivió»: es que la prueba no probó nada.')
  }

  let r
  try {
    writeFileSync(m.archivo, despues, 'utf8')
    /* Comprobado en disco, no asumido: escribir puede fallar en silencio. */
    if (readFileSync(m.archivo, 'utf8') === antes) {
      throw new ErrorDeLaPrueba(`escribí ${m.archivo} y en disco sigue igual`)
    }
    /* Los pasos van en orden y el primero que falla decide: a partir de ahí la
     * verificación ya se enteró, que es lo que se quería saber. */
    const pasos = m.pasos ?? [m.comando]
    r = { codigo: 0, salida: '' }
    for (const paso of pasos) {
      if (typeof paso === 'object' && paso.crlf) { aCrlf(paso.crlf); continue }
      r = correr(paso)
      if (r.codigo !== 0) break
    }
  } finally {
    /* REGLA 2. Restaurar y COMPROBAR la restauración, de todos. */
    for (const [f, bytes] of copias) {
      writeFileSync(f, bytes)
      if (!readFileSync(f).equals(bytes)) {
        console.log(`\n  ⛔ ${f} NO quedó restaurado. Pára todo y mira ese archivo.\n`)
        process.exit(3)
      }
    }
  }

  return r.codigo === 0
    ? { estado: 'SOBREVIVIO', detalle: 'la verificación pasó con el código roto' }
    : { estado: 'DETECTADA', detalle: `salió con ${r.codigo}` }
}

/* ── la pasada ─────────────────────────────────────────────────────────────── */

const filtro = process.argv[2]
const lista = filtro
  ? MUTACIONES.filter(m => `${m.nombre} ${m.archivo}`.toLowerCase().includes(filtro.toLowerCase()))
  : MUTACIONES

console.log('\n══ MUTACIONES ════════════════════════════════════════════════')
if (!lista.length) {
  console.log(`  ✗ ningún nombre contiene «${filtro}».\n`)
  process.exit(1)
}

const cuenta = { DETECTADA: 0, SOBREVIVIO: 0, ERROR_DE_LA_PRUEBA: 0 }
const malas = []

for (const m of lista) {
  let res
  try {
    res = unaMutacion(m)
  } catch (e) {
    if (!(e instanceof ErrorDeLaPrueba)) throw e
    res = { estado: 'ERROR_DE_LA_PRUEBA', detalle: e.message }
  }
  cuenta[res.estado]++
  const marca = res.estado === 'DETECTADA' ? '✓' : res.estado === 'SOBREVIVIO' ? '✗' : '⚠'
  console.log(`  ${marca} ${res.estado.padEnd(18)} ${m.nombre}`)
  if (res.estado !== 'DETECTADA') {
    console.log(`     ${res.detalle}`)
    console.log(`     lo que queda sin demostrar: ${m.porque}`)
    malas.push(m.nombre)
  }
}

console.log(`\n  ${cuenta.DETECTADA} detectadas · ${cuenta.SOBREVIVIO} sobrevivieron · ` +
  `${cuenta.ERROR_DE_LA_PRUEBA} errores de la prueba`)

if (malas.length) {
  console.log('\n  ✗ Una mutación que sobrevive o que no muta deja su afirmación sin respaldo.')
  console.log('    Ninguna de estas cuenta como provocada.\n')
  process.exit(1)
}
console.log('  → todas las afirmaciones de arriba están respaldadas por una mutación real.\n')
