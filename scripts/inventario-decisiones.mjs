#!/usr/bin/env node
/**
 * LAS DECISIONES QUE, INVERTIDAS, CAMBIAN UNA CIFRA QUE VE UN CLIENTE
 * ==================================================================
 *
 * Ocho mutaciones recuperadas no son una cobertura: eran las que por casualidad
 * quedaron anotadas en prosa. Cuántas se corrieron sin anotar es indeterminable.
 * Esto deriva la población del CÓDIGO y la compara con las mutaciones que
 * existen, para que la deuda sea un número y no una sensación.
 *
 * ⚠ CADA FILA SE COMPRUEBA, NO SE CREE.
 *
 *   · `ancla` tiene que aparecer en su archivo. Si alguien reescribe la línea,
 *     esta fila deja de hablar de nada y el guion falla: un inventario que
 *     sobrevive a su código es peor que no tenerlo.
 *   · `mutacion` tiene que ser el nombre exacto de una mutación declarada en
 *     `scripts/mutar.mjs`. No vale decir «esto está cubierto».
 *   · `prueba` tiene que ser un trozo literal del arnés. Igual: la afirmación
 *     «tiene prueba» se verifica abriendo el arnés, no recordándolo.
 *
 * CRITERIO DE ENTRADA, que es lo que hace la lista discutible y por tanto útil:
 * entra una decisión si al invertirla el motor **sigue funcionando y entrega
 * otra cifra**. No entran las que al invertirlas revientan (un `switch` sin
 * caso, un tipo que no compila), porque esas no pueden llegar a un cliente. Y
 * no entran las comparaciones de etiquetas —`=== 'PESOS'`— salvo cuando el otro
 * valor también es legal y produce una cifra distinta.
 *
 * `grado` separa dos cosas que no se miden igual:
 *   · CRITICA     cambia la cifra en el caso corriente.
 *   · DEGENERADA  cambia la cifra solo en un extremo —cero, lista vacía, un
 *                 solo tramo, el borde exacto—. Es donde vivía la frontera
 *                 inferior del tramo durante meses: las pruebas miran el medio
 *                 interesante y no el extremo.
 *
 *   node scripts/inventario-decisiones.mjs
 */
import { readFileSync } from 'node:fs'

const N = 'src/lib/notariales/'
const F = 'src/lib/finanzas/'
const ARNES_N = 'scripts/probar-notariales.mjs'
const ARNES_F = 'scripts/probar-finanzas.mjs'

const DECISIONES = [
  /* ── notariales/tramos.ts ─────────────────────────────────────────────── */
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'el límite SUPERIOR del tramo pertenece al tramo',
    ancla: 'base > desde && (hasta === null || base <= hasta)',
    invertida: 'una base en la frontera salta al tramo siguiente, con otra tarifa',
    mutacion: 'frontera del tramo: ≤ pasa a <' },
  { archivo: `${N}tramos.ts`, grado: 'DEGENERADA', decide: 'el límite INFERIOR del tramo NO pertenece',
    ancla: 'base > desde && (hasta === null || base <= hasta)',
    invertida: 'una base de 0 se liquida con el primer tramo en vez de detenerse',
    mutacion: 'frontera del tramo: > pasa a ≥', prueba: 'una base de 0 no cae en ningún tramo', arnes: ARNES_N },
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'en una tabla marginal, dónde corta la acumulación',
    ancla: 'if (base <= desde) break',
    invertida: 'se acumula un tramo de más o de menos en el excedente', mutacion: null },
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'el excedente gravado en un tramo marginal',
    ancla: 'total += multiplicador(t, etiqueta) * (Math.min(base, hasta) - desde)',
    invertida: 'con max en vez de min, el último tramo grava más de lo que existe', mutacion: null },
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'si la tabla se lee marginal o por tramo único',
    ancla: "const marginal = orden.some(t => t.modo_calculo === 'TASA_MARGINAL')",
    invertida: 'con every, una tabla mixta (mínimo fijo + marginal) se lee como tramo único', mutacion: null },
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'el orden en que se recorren los tramos',
    ancla: 'const orden = [...tramos].sort((a, b) => a.orden - b.orden)',
    invertida: 'gana otro tramo: el primero que coincide es el que devuelve', mutacion: null },
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'un límite en UVT se convierte a pesos',
    ancla: 'return n * uvt',
    invertida: 'los límites quedan en UVT y ninguna base cae donde debe', mutacion: null },
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'el sentido del redondeo de la tarifa',
    ancla: "const entero = r.modo === 'ARRIBA' ? Math.ceil(q) : r.modo === 'ABAJO' ? Math.floor(q) : Math.round(q)",
    invertida: 'la cifra se aparta del múltiplo que manda la resolución', mutacion: null,
    prueba: 'a la centena, arriba: 61.622,10 → 61.700', arnes: ARNES_N },
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'quién se queda el peso del reparto y quién el residuo',
    ancla: 'const comprador = alPeso((total * pctComprador) / 100)',
    invertida: 'el peso impar cambia de parte en cada concepto', mutacion: null },
  { archivo: `${N}tramos.ts`, grado: 'DEGENERADA', decide: 'una tabla sin tramos se detiene',
    ancla: 'if (!tramos.length) throw new ErrorEsquemaNotarial',
    invertida: 'devolvería cero y el concepto desaparecería de la liquidación', mutacion: null },

  /* ── escala-tarifa.ts: UNA decisión que antes vivía en CUATRO sitios ──────
   *
   * Estaba en `tramos.ts`, `retencion.ts`, `calculo.ts` y, con un 1000 literal,
   * en `finanzas/calculo.ts`. El primer inventario encontró TRES de los cuatro:
   * la de `calculo.ts` se pasó, y ese es el modo de fallo de una decisión
   * repetida —cada copia es una ocasión de no verla—. Ahora una sola mutación
   * vigila los cuatro usos. */
  { archivo: 'src/lib/escala-tarifa.ts', grado: 'CRITICA', decide: 'un por mil se divide por 1.000',
    ancla: '  POR_MIL: 1000,',
    invertida: 'diez veces la cifra en tarifas notariales, retenciones e ICA, y plausible',
    mutacion: 'escala: el por mil pasa a por ciento',
    prueba: 'un por mil se divide por 1.000', arnes: ARNES_N },
  { archivo: 'src/lib/escala-tarifa.ts', grado: 'CRITICA', decide: 'un porcentaje se divide por 100',
    ancla: '  PORCENTAJE: 100,',
    invertida: 'la confusión en el otro sentido, igual de plausible',
    mutacion: 'escala: el porcentaje pasa a por mil',
    prueba: 'un porcentaje se divide por 100', arnes: ARNES_N },
  { archivo: 'src/lib/escala-tarifa.ts', grado: 'CRITICA', decide: 'PESOS no es una tasa y no tiene divisor',
    ancla: '  return null',
    invertida: 'un valor en pesos se trataría como tasa y se dividiría',
    mutacion: null,
    prueba: 'PESOS no es una tasa: no tiene divisor', arnes: ARNES_N },

  /* ── notariales/iva.ts ────────────────────────────────────────────────── */
  { archivo: `${N}iva.ts`, grado: 'CRITICA', decide: 'el IVA se aproxima hacia ARRIBA cuando la regla lo dice',
    ancla: "regla.modo === 'ARRIBA' ? q.ceil()",
    invertida: 'el IVA liquidado se aparta del múltiplo normativo', mutacion: null },
  { archivo: `${N}iva.ts`, grado: 'CRITICA', decide: 'el IVA se aproxima al múltiplo más cercano por defecto',
    ancla: 'q.toDecimalPlaces(0, D.ROUND_HALF_UP)',
    invertida: 'el IVA baja sistemáticamente al múltiplo inferior',
    mutacion: 'redondeo: ROUND_HALF_UP pasa a ROUND_DOWN' },
  { archivo: `${N}iva.ts`, grado: 'DEGENERADA', decide: 'en el empate exacto, el residuo del IVA es del comprador',
    ancla: 'const compradorEsMenor = compradorExacto.lessThan(vendedorExacto)',
    invertida: 'con lessThanOrEqualTo, en el 50/50 exacto el peso cambia de parte', mutacion: null },
  { archivo: `${N}iva.ts`, grado: 'DEGENERADA', decide: 'una base de IVA de cero no divide por cero',
    ancla: 'const proporcion = base.isZero() ? new D(0) : ponderado.div(base)',
    invertida: 'NaN recorrería el reparto sin lanzar', mutacion: null },
  { archivo: `${N}iva.ts`, grado: 'CRITICA', decide: 'la tarifa de IVA se lee como porcentaje',
    ancla: 'const bruto = base.mul(tarifa).div(100)',
    invertida: 'el IVA se multiplica por cien', mutacion: null },
  { archivo: `${N}iva.ts`, grado: 'CRITICA', decide: 'se reparte el IVA LIQUIDADO, no el bruto',
    ancla: 'const compradorExacto = liquidado.mul(proporcion)',
    invertida: 'las partes no suman el total liquidado', mutacion: null },

  /* ── notariales/bases.ts ──────────────────────────────────────────────── */
  { archivo: `${N}bases.ts`, grado: 'CRITICA', decide: 'la base es el MAYOR de los candidatos',
    ancla: 'const ganador = candidatos.reduce((a, b) => (b.valor > a.valor ? b : a))',
    invertida: 'se liquida sobre el menor: menos impuesto del que corresponde', mutacion: null },
  { archivo: `${N}bases.ts`, grado: 'DEGENERADA', decide: 'en empate gana el primero, que es el valor pactado',
    ancla: 'const ganador = candidatos.reduce((a, b) => (b.valor > a.valor ? b : a))',
    invertida: 'con >=, el motivo diría «supera el valor pactado» de un valor igual', mutacion: null },
  { archivo: `${N}bases.ts`, grado: 'CRITICA', decide: 'el registro toma DOS candidatos y lo notarial CUATRO',
    ancla: "return { ...mayor(e, 'impuesto de registro', DOS), clave: 'REGISTRO' }",
    invertida: 'el autoavalúo entraría en una base en la que la norma no lo pone', mutacion: null },
  { archivo: `${N}bases.ts`, grado: 'DEGENERADA', decide: 'un valor de venta de cero o negativo se detiene',
    ancla: "if (venta <= 0) throw new ErrorEsquemaNotarial",
    invertida: 'toda la liquidación saldría en cero y parecería válida', mutacion: null,
    prueba: 'un valor de venta en cero', arnes: ARNES_N },

  /* ── notariales/retencion.ts ──────────────────────────────────────────── */
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'el orden en que se prueban las reglas de retención',
    ancla: 'const activas = reglas.filter(r => r.activa).sort((a, b) => a.orden - b.orden)',
    invertida: 'la regla general taparía las excepciones y nadie se eximiría',
    mutacion: 'retención: el orden de las reglas se invierte',
    prueba: 'una exención da cero CON regla nombrada', arnes: ARNES_N },
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'las condiciones de una regla se exigen TODAS',
    ancla: 'if (!cumple(c, ctx)) { aplica = false; break }',
    invertida: 'con una sola condición bastaría: exenciones aplicadas de más', mutacion: null },
  { archivo: `${N}retencion.ts`, grado: 'DEGENERADA', decide: 'el borde de una condición MENOR no incluye el igual',
    ancla: "case 'MENOR': return Number(actual) < Number(esperado)",
    invertida: 'justo en el umbral, la exención entra o no entra', mutacion: null },
  { archivo: `${N}retencion.ts`, grado: 'DEGENERADA', decide: 'el borde de MAYOR_IGUAL incluye el igual',
    ancla: "case 'MAYOR_IGUAL': return Number(actual) >= Number(esperado)",
    invertida: 'igual, en el otro sentido', mutacion: null },
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'la reducción por años se topa en 100 %',
    ancla: 'const pct = Math.min(100, tasa(r.valor_efecto',
    invertida: 'con muchos años, una retención negativa', mutacion: null },
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'un TOPE limita por arriba',
    ancla: 'valor: alPeso(Math.min(plena, tope))',
    invertida: 'con max, el tope se convierte en un mínimo', mutacion: null },
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'solo se llega a cero por una EXENCION con nombre',
    /* El ancla anterior era `throw new SinReglaAplicable(`, que aparece TRES veces
     * en el archivo: un ancla que coincide en tres sitios no ancla nada, y el
     * contador de ocurrencias lo delato. Ahora apunta al mensaje, que es unico. */
    ancla: "'Ninguna regla de retención aplicó a esta operación. El cálculo se detiene: ' +",
    invertida: 'un cero por caerse de la lista se leería como «no hay retención»', mutacion: null,
    prueba: 'ninguna regla aplica: jamás devuelve cero', arnes: ARNES_N },

  /* ── LA SEGUNDA COPIA DE LA FRONTERA: cerrada el 2026-10-15 ───────────
   *
   * Había dos filas aquí, para la frontera y la conversión UVT reescritas dentro
   * de `desgloseDe`. Ya no existen: las dos decisiones viven en
   * `tramos.ts/tramoQueAplica`, que usan la tarifa y el desglose. Las filas se
   * BORRARON en vez de marcarse como resueltas, por la misma razón por la que se
   * borraron las 29 cifras sembradas: lo que no existe no necesita guarda.
   *
   * La divergencia que tenían —la copia multiplicaba los límites en UVT por 1
   * cuando no había UVT, en vez de detenerse— está probada en el arnés:
   * «una tabla en UVT sin UVT cargado se detiene, no multiplica por 1». */

  { archivo: `${N}guardas.ts`, grado: 'CRITICA', decide: 'el orden en que se recorren los conceptos para las guardas',
    ancla: 'const orden = [...conceptos].sort((a, b) => a.orden - b.orden)',
    invertida: 'las guardas de derivados comprobarían el orden al revés',
    mutacion: null },

  /* ── notariales/guardas.ts: no es cálculo, pero decide QUÉ norma calcula ── */
  { archivo: `${N}guardas.ts`, grado: 'CRITICA', decide: 'una norma que no estaba en vigor ese día no liquida',
    ancla: 'if (fecha < r.vigencia_desde) return false',
    invertida: 'se liquidaría enero de 2026 con tarifas que empezaron el 2 de febrero',
    mutacion: 'vigencia: una fecha anterior deja de quedar fuera' },

  /* ── notariales/calculo.ts ────────────────────────────────────────────── */
  { archivo: `${N}calculo.ts`, grado: 'CRITICA', decide: 'extraer el IVA de un precio que ya lo incluye',
    ancla: 'const neto = bruto.div(new Prisma.Decimal(1).add(new Prisma.Decimal(tarifaIva).div(100)))',
    invertida: 'el IVA se cobraría dos veces sobre la copia auténtica', mutacion: null },
  { archivo: `${N}calculo.ts`, grado: 'CRITICA', decide: 'un precio con IVA incluido NO aporta a la base de IVA',
    ancla: 'if (c.grava_iva && !c.precio_incluye_iva) {',
    invertida: 'su base entraría dos veces en el IVA del total', mutacion: null },
  { archivo: `${N}calculo.ts`, grado: 'CRITICA', decide: 'las OBLIGACIONES no entran en el total del trámite',
    ancla: 'const tramite = lineas.filter(l => !esObligacion(l.grupo))',
    invertida: 'las deudas del vendedor se sumarían a los gastos de escrituración', mutacion: null },
  { archivo: `${N}calculo.ts`, grado: 'CRITICA', decide: 'el IVA liquidado se suma una vez al total',
    ancla: 'total: tramite.reduce((s, l) => s + l.total, 0) + iva.liquidado',
    invertida: 'el total no cuadra con las partes', mutacion: null },

  /* ── notariales/huella.ts: la evidencia tiene que ser comprobable sin nosotros ── */
  { archivo: `${N}huella.ts`, grado: 'CRITICA', decide: 'la huella de un PDF de evidencia es de los bytes, sin tocarlos',
    ancla: "return createHash('sha256').update(bytes).digest('hex')",
    invertida: 'la huella solo la reproduce nuestro código y deja de ser evidencia',
    mutacion: 'evidencia: la huella del PDF normaliza los saltos',
    prueba: 'la huella de unos bytes coincide con la de sha256sum y certutil', arnes: ARNES_N },
  { archivo: `${N}huella.ts`, grado: 'CRITICA', decide: 'la huella de un documento de TEXTO sí normaliza los saltos',
    ancla: "const texto = documento.replace(/\\r\\n/g, '\\n')",
    invertida: 'la misma transcripción da dos huellas según quién hizo el checkout',
    mutacion: 'transcripción: la huella deja de normalizar los saltos' },

  /* ══ LO QUE ENCONTRÓ LA LECTURA COMPLETA, 2026-10-15 ════════════════
   *
   * El inventario anterior salió de grepear los conceptos que ya se sospechaban
   * y leer esas regiones. Esto salió de leer siete módulos de principio a fin,
   * sin buscar nada concreto: tramos, bases, retencion, calculo, iva,
   * finanzas/calculo y dinero. Son DIECIOCHO decisiones que el método anterior
   * no podía encontrar, y la medida del punto ciego: el inventario tenía 49 de
   * 67 reales, o sea le faltaba el 27 %.
   *
   * Para la siguiente pasada: la lectura completa es el único instrumento para
   * la clase «la misma decisión escrita de dos maneras distintas», y es cara, así
   * que se gasta donde la decisión es cara. Estos siete archivos son esa lista.
   */

  /* ── bases.ts ── */
  { archivo: `${N}bases.ts`, grado: 'CRITICA', decide: 'una cadena vacía cuenta como candidato NO informado',
    ancla: "if (v === null || v === undefined || v === '') continue",
    invertida: 'un avaluo que llega en blanco se leeria como cero y la base bajaria, o al contrario',
    mutacion: null },
  { archivo: `${N}bases.ts`, grado: 'CRITICA', decide: 'el timbre y la retencion toman la venta, NO el mayor',
    ancla: "    motivo: 'Se tomó el valor de la enajenación.',",
    invertida: 'el avaluo entraria en dos bases donde la norma no lo pone y subiria el impuesto',
    mutacion: null },

  /* ── tramos.ts ── */
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'el redondeo interno del motor es al peso mas cercano',
    ancla: 'export const alPeso = (n: number): number => Math.round(n)',
    invertida: 'el reparto entre partes y la retencion se desvian un peso cada uno, siempre al mismo lado',
    mutacion: null },
  { archivo: `${N}tramos.ts`, grado: 'CRITICA', decide: 'leer un numero como PESOS y no como TASA',
    ancla: "const s = leerNumero(v, 'pesos', campo)",
    invertida: '52.374 pasaria de cincuenta y dos mil a 52,374: un factor de mil elegido por sitio de llamada',
    mutacion: null },

  /* ── retencion.ts ── */
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'una condicion sobre un dato que no llega DETIENE',
    ancla: 'throw new SinReglaAplicable(`La regla depende de',
    invertida: 'la regla se saltaria y aplicaria la general: una exencion perdida sin aviso',
    mutacion: null },
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'IGUAL compara texto exacto, sensible a mayusculas',
    ancla: "case 'IGUAL': return String(actual) === esperado",
    invertida: 'una regla aplicaria donde hoy no aplica, o al contrario, segun la caja de una letra',
    mutacion: null },
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'la retencion se redondea al peso',
    ancla: 'valor: alPeso(base * m),',
    invertida: 'un peso de diferencia en la cifra con la que alguien cierra un negocio',
    mutacion: null },

  /* ── calculo.ts ── */
  { archivo: `${N}calculo.ts`, grado: 'CRITICA', decide: 'la fecha del acto por defecto es el dia de COLOMBIA',
    ancla: '? diaEnColombia(hoy)',
    invertida: 'con el reloj del servidor, que en Vercel es UTC, una liquidacion de las 19:30 del ' +
      '1 de febrero se fechaba el 2, que es justo la frontera de vigencia registral',
    mutacion: null,
    prueba: '1 feb 19:30 de Colombia es el 1 de febrero, no el 2', arnes: 'scripts/probar-fechas.mjs' },
  { archivo: `${N}calculo.ts`, grado: 'CRITICA', decide: 'el valor derivado gana al contexto del cliente',
    ancla: '{ ...(entrada.contexto ?? {}), ...(uvt ? { valor_en_uvt: base!.valor / uvt } : {}) },',
    invertida: 'el orden al reves deja que quien pregunta pise un valor que el motor deriva, ' +
      'y basta con que una regla por umbral se convierta en una fila para que importe',
    mutacion: null,
    prueba: 'el cliente no puede mandar un valor que el motor deriva', arnes: ARNES_N },
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'una clave de contexto desconocida DETIENE',
    ancla: 'export function exigirContextoConocido(ctx: Contexto): void {',
    invertida: 'descartarla en silencio es como se pierde una condicion sin que nadie lo note',
    mutacion: null,
    prueba: 'una clave de contexto desconocida DETIENE', arnes: ARNES_N },
  { archivo: `${N}retencion.ts`, grado: 'CRITICA', decide: 'el EFECTO de una regla tambien exige el campo preguntado',
    ancla: 'for (const nombre of CAMPOS_DEL_EFECTO[r.tipo_efecto] ?? []) {',
    invertida: 'habia un camino al contexto que esquivaba entera la guarda construida para vigilarlo',
    mutacion: null,
    prueba: 'su efecto necesita', arnes: ARNES_N },
  { archivo: `${N}calculo.ts`, grado: 'CRITICA', decide: 'la lista de opcionales REEMPLAZA los valores por defecto',
    ancla: '.filter(c => !c.opcional || (elegidos ? elegidos.includes(c.clave) : c.activo_por_defecto))',
    invertida: 'entrarian conceptos apagados o se caerian los encendidos, y el total cambia',
    mutacion: null },
  { archivo: `${N}calculo.ts`, grado: 'DEGENERADA', decide: 'una cantidad de 0 se rechaza: el camino es apagar el concepto',
    ancla: 'if (!Number.isInteger(n) || n < 1) {',
    invertida: 'un 0 daria valor cero en silencio en vez de pedir que se desactive el concepto',
    mutacion: null },
  { archivo: `${N}calculo.ts`, grado: 'CRITICA', decide: 'la tarifa registral derivada sale de derechos_orip',
    ancla: "if (c.clave === 'derechos_orip') tarifaRegistral = valor",
    invertida: 'los conceptos que se liquidan sobre la tarifa registral tomarian otra cifra',
    mutacion: null },
  { archivo: `${N}calculo.ts`, grado: 'CRITICA', decide: 'el IVA liquidado se atribuye al grupo COSTOS_NOTARIALES',
    ancla: "const suIva = g.clave === 'COSTOS_NOTARIALES'",
    invertida: 'el total de dos grupos cambiaria y el usuario veria el IVA donde no se genera',
    mutacion: null },

  /* ── finanzas ─────────────────────────────────────────────────────────── */
  { archivo: `${F}calculo.ts`, grado: 'DEGENERADA', decide: 'la base mínima en UVT: el igual SÍ retiene',
    ancla: 'if (minimo.gt(0) && base.lt(minimo))',
    invertida: 'justo en la base mínima se retiene o no se retiene',
    mutacion: 'retefuente: la base mínima deja de incluir el igual',
    prueba: 'base EXACTAMENTE igual al mínimo', arnes: ARNES_F },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'la tarifa depende de si el tercero declara renta',
    ancla: 'const tarifa = dec(esDeclaranteRenta ? c.tarifa_declarante : c.tarifa_no_declarante)',
    invertida: 'se retiene la tarifa del otro, y el tercero reclama', mutacion: null },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'a un autorretenedor no se le practica retención',
    ancla: "motivo: 'El tercero es autorretenedor: no se le practica retención.'",
    invertida: 'se le retiene a quien se autorretiene: doble retención', mutacion: null },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'la tarifa de ICA exacta por CIIU gana a la general',
    ancla: 'const tarifa = exacta ?? general',
    invertida: 'se liquida ICA con la tarifa del municipio y no de la actividad', mutacion: null },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'el ICA va por mil',
    ancla: 'div(DIVISOR.POR_MIL).toDecimalPlaces(2)',
    invertida: 'diez veces el ICA declarado',
    mutacion: 'escala: el por mil pasa a por ciento',
    prueba: 'CIIU exacto usa su tarifa', arnes: ARNES_F },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'los signos del neto: el IVA suma y las retenciones restan',
    ancla: 'return dec(a.valor_base).plus(dec(a.iva_generado))',
    invertida: 'el neto que se espera recibir queda mal en cada factura', mutacion: null },
  { archivo: `${F}calculo.ts`, grado: 'DEGENERADA', decide: 'la tolerancia de discrepancia es estricta',
    ancla: 'hay: diff.abs().gt(dec(toleranciaPesos))',
    invertida: 'una diferencia de exactamente un peso se reporta o se calla', mutacion: null },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'por defecto se asume que el servicio GENERA IVA',
    ancla: 'export function calcularIva(base: Num, parametros: ParametrosAnioLike, generaIva = true)',
    invertida: 'el defecto decide si se cobra IVA a quien no lleva: el lado comodo es cobrarlo',
    mutacion: null },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'sin tarifa de reteIVA devuelve CERO, y sin tarifa de IVA LANZA',
    ancla: 'if (parametros.responsable_iva === false || vacio(parametros.tarifa_reteiva)) {',
    invertida: 'la asimetria ya existe: una tarifa que falta detiene y la otra no, en silencio',
    mutacion: null },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'el IVA pagado es costo solo si NO somos responsables',
    ancla: '    : dec(e.valor_base).plus(dec(e.iva_pagado)).toDecimalPlaces(2)',
    invertida: 'cada egreso quedaria subestimado o inflado en el 19 % y el reporte de gastos mentiria',
    mutacion: null },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'un egreso REEMBOLSABLE no entra al estado de resultados',
    ancla: "return egresos.filter(e => e.naturaleza !== 'REEMBOLSABLE')",
    invertida: 'se pagaria impuesto sobre plata adelantada por cuenta del cliente',
    mutacion: null },
  { archivo: `${F}calculo.ts`, grado: 'CRITICA', decide: 'una cadena vacia NO es un vacio en el modulo financiero',
    ancla: 'const vacio = (v: unknown): boolean => v === null || v === undefined',
    invertida: 'convencion OPUESTA a la del modulo notarial, donde la cadena vacia SI es ausencia; ' +
      'ninguna herramienta de formas las agrupa porque el codigo no se parece',
    mutacion: null },
  { archivo: `${F}dinero.ts`, grado: 'CRITICA', decide: 'volver al peso entero redondea al más cercano',
    ancla: 'return BigInt(valor.toDecimalPlaces(0).toFixed(0))',
    invertida: 'cada comisión pierde o gana un peso, y se nota al cuadrar', mutacion: null },
  { archivo: `${F}dinero.ts`, grado: 'CRITICA', decide: 'la comisión se guarda con dos decimales',
    ancla: '.div(100)\n    .toDecimalPlaces(2)',
    invertida: 'el IVA sobre la comisión arrastra el error', mutacion: null },
  { archivo: `${F}empresa.ts`, grado: 'CRITICA', decide: 'el dígito de verificación del NIT, módulo 11 de la DIAN',
    ancla: 'return String(r > 1 ? 11 - r : r)',
    invertida: 'el NIT sale mal en todo documento que se entregue',
    mutacion: 'NIT: el dígito de verificación invierte su rama',
    prueba: 'DV DIAN: 800197268', arnes: ARNES_F },
  { archivo: `${F}empresa.ts`, grado: 'CRITICA', decide: 'los pesos del módulo 11 se aplican de derecha a izquierda',
    ancla: "const suma = nit.split('').reverse().reduce",
    invertida: 'otro dígito, igual de plausible', mutacion: null },
]

/* ── los extremos degenerados, barridos aparte ─────────────────────────────── */

/**
 * `base = 0` no fue casualidad: las pruebas miran el medio interesante. Esta es
 * la lista de los extremos del motor notarial y de si el arnés los toca.
 */
const EXTREMOS = [
  { caso: 'base exactamente igual al límite superior del tramo',
    prueba: 'ORIP justo en la frontera usa el tramo fijo', arnes: ARNES_N },
  { caso: 'base exactamente en el umbral del timbre',
    prueba: 'timbre justo en el umbral sigue en cero', arnes: ARNES_N },
  { caso: 'base en el tramo superior abierto',
    prueba: 'ORIP en el tramo abierto', arnes: ARNES_N },
  { caso: 'el excedente marginal es exactamente cero',
    prueba: 'derechos en la frontera: el excedente es cero', arnes: ARNES_N },
  { caso: 'el redondeo cae en el medio exacto del múltiplo',
    prueba: 'a la centena, cercano, en el medio exacto', arnes: ARNES_N },
  { caso: 'valor de venta igual a cero',
    prueba: 'un valor de venta en cero', arnes: ARNES_N },
  { caso: 'base igual a cero contra la tabla de tramos',
    prueba: 'una base de 0 no cae en ningún tramo', arnes: ARNES_N },
  { caso: 'tabla con UN SOLO tramo', prueba: null, arnes: ARNES_N },
  { caso: 'lista de tramos vacía', prueba: null, arnes: ARNES_N },
  { caso: 'lista de aportes de IVA vacía', prueba: null, arnes: ARNES_N },
  { caso: 'reparto 50/50 con IVA en empate exacto', prueba: null, arnes: ARNES_N },
  { caso: 'base exactamente igual a la base mínima en UVT',
    prueba: 'base EXACTAMENTE igual al mínimo', arnes: ARNES_F },
  { caso: 'cantidad capturada igual a cero en un concepto por cantidad', prueba: null, arnes: ARNES_N },
]

/* ── la comprobación ───────────────────────────────────────────────────────── */

const cache = new Map()
const leer = f => {
  if (!cache.has(f)) {
    try {
      cache.set(f, readFileSync(f, 'utf8'))
    } catch {
      cache.set(f, null)
    }
  }
  return cache.get(f)
}

const mutarFuente = leer('scripts/mutar.mjs') ?? ''
const NOMBRES_MUTACION = new Set(
  [...mutarFuente.matchAll(/^\s*nombre: '([^']+)'/gm)].map(m => m[1]))

const problemas = []

for (const d of DECISIONES) {
  const src = leer(d.archivo)
  if (src === null) { problemas.push(`no existe ${d.archivo}`); continue }
  if (!src.includes(d.ancla)) {
    problemas.push(`${d.archivo}: el ancla ya no está en el archivo → «${d.ancla.slice(0, 60)}»`)
  }
  if (d.mutacion && !NOMBRES_MUTACION.has(d.mutacion)) {
    problemas.push(`mutación declarada que no existe en mutar.mjs: «${d.mutacion}»`)
  }
  if (d.prueba) {
    const a = leer(d.arnes)
    if (a === null) problemas.push(`no existe ${d.arnes}`)
    else if (!a.includes(d.prueba)) problemas.push(`${d.arnes}: no contiene «${d.prueba}»`)
  }
}

for (const e of EXTREMOS) {
  if (!e.prueba) continue
  const a = leer(e.arnes)
  if (a === null) problemas.push(`no existe ${e.arnes}`)
  else if (!a.includes(e.prueba)) problemas.push(`${e.arnes}: no contiene «${e.prueba}»`)
}

/* ── el informe ────────────────────────────────────────────────────────────── */

const criticas = DECISIONES.filter(d => d.grado === 'CRITICA')
const degeneradas = DECISIONES.filter(d => d.grado === 'DEGENERADA')
const conMutacion = DECISIONES.filter(d => d.mutacion)
const sinMutacion = DECISIONES.filter(d => !d.mutacion)
const extremosSinPrueba = EXTREMOS.filter(e => !e.prueba)

/**
 * ⚠ A QUÉ ARCHIVOS CORRESPONDE ESTA CUENTA, Y CUÁNTOS NO LA HAN RECIBIDO.
 *
 * Un denominador sin alcance declarado invita a leerse como «todo el proyecto».
 * No lo es. Y la distinción que importa no es «mirado» contra «no mirado», sino
 * **lectura completa** contra el resto: tres de tres veces, leer un archivo de
 * principio a fin —sin grep— encontró lo que ningún instrumento podía, y las
 * tres el defecto resultó PEOR que el reporte previo.
 */

/** Leídos de principio a fin, sin grep. La fecha es cuándo. */
const LECTURA_COMPLETA = [
  { archivo: 'src/lib/notariales/tramos.ts', cuando: '2026-10-15' },
  { archivo: 'src/lib/notariales/bases.ts', cuando: '2026-10-15' },
  { archivo: 'src/lib/notariales/retencion.ts', cuando: '2026-10-15' },
  { archivo: 'src/lib/notariales/calculo.ts', cuando: '2026-10-15' },
  { archivo: 'src/lib/notariales/iva.ts', cuando: '2026-10-15' },
  { archivo: 'src/lib/finanzas/calculo.ts', cuando: '2026-10-15' },
  { archivo: 'src/lib/finanzas/dinero.ts', cuando: '2026-10-15' },
  { archivo: 'src/app/api/admin/mac/route.ts', cuando: '2026-10-15' },
  { archivo: 'src/lib/agent/knowledge.ts', cuando: '2026-10-15' },
  { archivo: 'src/app/admin/mac/page.tsx', cuando: '2026-10-15' },
  /* ⚠ ESTAS DOS SE LEYERON EL 2026-10-15 Y EL INSTRUMENTO NO SE ACTUALIZÓ.
   *
   * Se descubrió el 2026-10-19 porque el titular contó «cuatro archivos vivos
   * sin leer» y el instrumento imprimía OCHO. Ganó él: faltaban estas dos, y lo
   * que prueba que se leyeron es el código que salió de esas lecturas —la unidad
   * ESCRITA frente a la declarada en `numeros.ts`, y la medición de la deriva
   * del `float` en `saldoEnCustodia`, con su trampa de `toFixed`—.
   *
   * Es el quinto punto ciego otra vez, en el instrumento que lo nombró: el
   * hallazgo se escribió en el traspaso y la LECTURA se quedó en mi cabeza. Un
   * contador que alguien tiene que acordarse de subir no mide: recuerda. */
  { archivo: 'src/lib/finanzas/numeros.ts', cuando: '2026-10-15' },
  { archivo: 'src/lib/finanzas/custodia.ts', cuando: '2026-10-15' },
]

/**
 * Tocados por una pasada anterior, sin lectura completa. Aportan filas al
 * inventario, así que la cuenta los cubre EN PARTE —y eso es justo lo que una
 * lectura completa suele desmentir—.
 */
const TOCADOS_SIN_LECTURA = [
  'src/lib/escala-tarifa.ts',
  'src/lib/notariales/huella.ts',
  'src/lib/notariales/guardas.ts',
  'src/lib/finanzas/empresa.ts',
  'src/lib/dia-colombia.ts',
]

/**
 * NUNCA leídos de principio a fin. `expuesto` aplica el criterio ya fijado:
 * exposición actual primero, gravedad después.
 */
/**
 * EL FINAL DE LA AUDITORIA, DECLARADO.
 *
 * La lectura completa va 4 de 4 y seguiria encontrando cosas para siempre. Sin
 * un final declarado no se vuelve a construir nunca, asi que la lista esta
 * CERRADA: son los seis que quedan marcados VIVO aqui abajo. Despues de ellos
 * el trabajo vuelve a ser construir, y lo que aparezca entra al tablero medido
 * y aplazado salvo que sea dinero vivo.
 */
const AUDITORIA_TERMINA_CON = [
  'src/lib/finanzas/parametros.ts',
  'src/lib/finanzas/ingresos.ts',
  'src/lib/finanzas/egresos.ts',
  'src/lib/finanzas/completar.ts',
  'src/lib/finanzas/reportes.ts',
  'src/lib/finanzas/recibos.ts',
  /* AÑADIDO EL 2026-10-16, por decisión del titular, sobre una lista que estaba
   * declarada cerrada en SEIS. Queda escrito QUIÉN la reabrió y CUÁNDO, porque
   * una lista cerrada que crece sin firma deja de ser un final y vuelve a ser
   * una cola. Razón: son las afirmaciones que leen las máquinas, literalmente.
   *
   * ⚠ Y DE PASO, UNA CIFRA MÍA QUE ERA FALSA: el 2026-10-18 escribí «los cuatro
   * archivos vivos» en un informe. Son SEIS y siempre fueron seis: `numeros.ts`
   * y `custodia.ts` sí se leyeron, pero nunca estuvieron en esta lista —son de
   * la tanda anterior—, así que restarlos de aquí fue restar dos veces. La cifra
   * sale de este array, no de la prosa del informe. */
  'src/components/seo/JsonLd.tsx',
]

const SIN_LECTURA_COMPLETA = [
  /* ⚠ LAS AFIRMACIONES QUE LEEN LAS MÁQUINAS. No es un módulo de dinero, y por
   * eso no estaba en esta lista; es lo que el sitio le declara a Google y a los
   * modelos en schema.org —areaServed, priceRange, openingHours, knowsAbout,
   * offers— y se lee LITERALMENTE, sin matiz. La auditoría de textos públicos
   * del 2026-10-16 lo dejó señalado como el siguiente y se APLAZÓ a propósito
   * (ver AUDITORIA-TEXTOS-PUBLICOS.md y el traspaso): lo medido se puede
   * aplazar. Esta fila es la medición. */
  { archivo: 'src/components/seo/JsonLd.tsx', expuesto: 'AFIRMACIONES ESTRUCTURADAS que leen Google y los modelos' },
  { archivo: 'src/lib/finanzas/parametros.ts', expuesto: 'VIVO, decide tarifas del año' },
  { archivo: 'src/lib/finanzas/ingresos.ts', expuesto: 'VIVO, causa ingresos' },
  { archivo: 'src/lib/finanzas/egresos.ts', expuesto: 'VIVO, causa gastos' },
  { archivo: 'src/lib/finanzas/completar.ts', expuesto: 'VIVO, edita lo causado' },
  { archivo: 'src/lib/finanzas/reportes.ts', expuesto: 'VIVO, de aquí sale lo que declara el contador' },
  { archivo: 'src/lib/finanzas/recibos.ts', expuesto: 'VIVO, entrega documentos' },
  { archivo: 'la generación del PDF notarial', expuesto: 'lo que recibe un cliente' },
  { archivo: 'src/lib/notariales/datos.ts', expuesto: 'instrumento del panel' },
  { archivo: 'src/lib/notariales/panel.ts', expuesto: 'instrumento del panel' },
  { archivo: 'src/lib/notariales/cotejo.ts', expuesto: 'instrumento del panel' },
  { archivo: 'src/lib/notariales/evidencia.ts', expuesto: 'instrumento del panel' },
  { archivo: 'src/lib/notariales/trazabilidad.ts', expuesto: 'instrumento del panel' },
  { archivo: 'src/lib/finanzas/pendientes.ts', expuesto: 'instrumento del panel' },
  { archivo: 'src/lib/finanzas/captura*.ts', expuesto: 'pantallas de captura' },
  { archivo: 'las rutas de src/app/api', expuesto: 'pantallas y rutas' },
]

console.log('\n══ DECISIONES CRÍTICAS Y SU COBERTURA ════════════════════════')
console.log(`  decisiones inventariadas: ${DECISIONES.length}` +
  `  (${criticas.length} críticas · ${degeneradas.length} degeneradas)`)
console.log(`  con una mutación que las vigile: ${conMutacion.length}`)
console.log(`  DEUDA: ${sinMutacion.length} sin mutación\n`)
const vivos = SIN_LECTURA_COMPLETA.filter(x => x.expuesto.startsWith('VIVO'))
console.log(`  ⚠ ALCANCE. El número de arriba NO es «todo el proyecto».`)
console.log(`    lectura completa:      ${LECTURA_COMPLETA.length} archivos`)
console.log(`    tocados sin leer:      ${TOCADOS_SIN_LECTURA.length}`)
console.log(`    SIN lectura completa:  ${SIN_LECTURA_COMPLETA.length}, de los cuales ${vivos.length} están vivos y tocan dinero:`)
for (const v of vivos) console.log(`       ${v.archivo.padEnd(34)} ${v.expuesto}`)
console.log(`    La auditoria TERMINA con ${AUDITORIA_TERMINA_CON.length} archivos, lista cerrada:`)
for (const a of AUDITORIA_TERMINA_CON) console.log(`       · ${a}`)
console.log('    APLAZADOS A PROPOSITO el 2026-10-19: lo siguiente es construir el editor')
console.log('    de tramos. Una lectura completa encontraria cosas para siempre, y sin un')
console.log('    final declarado no se construye nunca. Lo medido se puede aplazar; por eso')
console.log('    esta lista se imprime en cada build en vez de quedarse en una conversacion.')
console.log(`    Cuatro de cuatro veces, una lectura completa encontro lo que ningun`)
console.log(`    instrumento podía, y el defecto resultó peor que el reporte previo.\n`)

const porArchivo = new Map()
for (const d of sinMutacion) {
  if (!porArchivo.has(d.archivo)) porArchivo.set(d.archivo, [])
  porArchivo.get(d.archivo).push(d)
}
for (const [f, ds] of porArchivo) {
  console.log(`  ${f}  — ${ds.length} sin vigilar`)
  for (const d of ds) console.log(`     ${d.grado === 'DEGENERADA' ? '·' : '!'} ${d.decide}`)
}

console.log(`\n══ EXTREMOS DEGENERADOS ══════════════════════════════════════`)
console.log(`  ${EXTREMOS.length - extremosSinPrueba.length} de ${EXTREMOS.length} tienen prueba.`)
for (const e of extremosSinPrueba) console.log(`     ✗ sin prueba: ${e.caso}`)

if (problemas.length) {
  console.log(`\n  ✗ el inventario no cuadra con el código (${problemas.length}):`)
  for (const p of problemas) console.log(`     ${p}`)
  console.log('\n  Un inventario que sobrevive a su código engaña igual que una nota vieja.\n')
  process.exit(1)
}
/* ¿ALGUNA ANCLA APARECE MÁS DE UNA VEZ EN SU ARCHIVO?
 *
 * El punto ciego del 2026-10-15: el inventario tiene una fila por DECISIÓN y el
 * riesgo vive en la OCURRENCIA, así que una segunda copia no tenía dónde ir.
 * Esto cuenta las copias dentro del mismo archivo; las que están en archivos
 * distintos las busca `scripts/decisiones-repetidas.mjs`, porque ahí hace falta
 * comparar formas y no texto. */
const repetidas = DECISIONES
  .map(d => ({ d, veces: (leer(d.archivo) ?? '').split(d.ancla).length - 1 }))
  .filter(r => r.veces > 1)

if (repetidas.length) {
  console.log(`\n  ⚠ ${repetidas.length} ancla(s) aparecen más de una vez en su archivo:`)
  for (const r of repetidas) console.log(`     ${r.d.archivo} ×${r.veces} — ${r.d.decide}`)
  console.log('     Una mutación sobre la primera copia no dice nada de las otras.')
}

console.log('\n  ✓ cada ancla existe, cada mutación declarada existe, cada prueba citada existe.\n')
