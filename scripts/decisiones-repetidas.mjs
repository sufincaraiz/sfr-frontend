#!/usr/bin/env node
/**
 * LA MISMA DECISIÓN ESCRITA EN DOS SITIOS
 * =======================================
 *
 * Existe por un punto ciego con forma, medido el 2026-10-15.
 *
 * El inventario de decisiones tiene UNA FILA POR DECISIÓN. El riesgo vive en la
 * OCURRENCIA. Cuando la escala de una tarifa apareció en `tramos.ts` y en
 * `retencion.ts`, la fila quedó escrita y dejé de buscar: una segunda
 * ocurrencia de una decisión ya registrada **no tiene dónde ir** en ese modelo,
 * así que nada obliga a contarlas. Había cuatro sitios y el inventario encontró
 * tres; el cuarto apareció solo cuando el titular preguntó si la escala debía
 * existir una vez.
 *
 * > **Un inventario organizado por decisión no puede decirte cuántas veces está
 * > escrita cada decisión. Eso hay que contarlo aparte.**
 *
 * Y lo agrava el método: inventariar leyendo las regiones a las que un grep te
 * lleva solo encuentra lo que ya sospechabas. De `calculo.ts` se leyeron las
 * líneas de la extracción del IVA y de los totales, y nunca las 30-50, donde
 * estaba el cuarto `multiplicador`.
 *
 * QUÉ HACE ESTO, que no es un detector de código duplicado al uso: busca
 * **formas de decisión repetidas**. Normaliza cada línea sustituyendo los
 * identificadores por un hueco y deja en pie los operadores, las palabras clave
 * y los literales. `if (t.unidad === 'POR_MIL') return v / 1000` y
 * `if (c.unidad === 'POR_MIL') return v / 1000` colapsan en la misma forma
 * aunque ningún detector de copia exacta las vea iguales.
 *
 * Solo mira los módulos que producen una cifra que ve un cliente. Dos líneas
 * iguales en dos pantallas son cosméticas; dos escalas iguales en dos motores
 * son una cifra diez veces mayor esperando.
 *
 * ⚠ ESTO NO ROMPE EL BUILD. Repetir una decisión no siempre es un defecto
 * —puede ser una coincidencia de forma sin significado compartido—, así que
 * decidir pide leerlas. Lo que sí hace es IMPRIMIR la cuenta, para que no haya
 * que acordarse de buscarla.
 *
 *   node scripts/decisiones-repetidas.mjs
 */
import { readFileSync, globSync } from 'node:fs'

/** Los módulos de los que sale una cifra. No las pantallas. */
const MODULOS = [
  'src/lib/escala-tarifa.ts',
  ...globSync('src/lib/notariales/*.ts'),
  ...globSync('src/lib/finanzas/*.ts'),
]

const NO_MIRAR = /(tipos|catalogo|transcripcion\.generada|cotejo)\.ts$/

/** Palabras que SÍ distinguen una decisión de otra: no se borran. */
const CLAVE = new Set([
  'if', 'else', 'return', 'throw', 'new', 'const', 'let', 'for', 'of', 'in',
  'while', 'switch', 'case', 'break', 'continue', 'function', 'await', 'async',
  'true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'void',
  'Math', 'Number', 'String', 'Boolean', 'Array', 'Object',
])

/**
 * La forma de una línea: los identificadores pasan a `·` y lo demás se queda.
 * Lo que sobrevive es la estructura de la decisión —qué operador, qué literal,
 * qué palabra clave—, que es lo que se repite cuando alguien copia una regla.
 */
function forma(linea) {
  /* LAS CADENAS SE PROTEGEN ANTES DE BORRAR IDENTIFICADORES.
   *
   * La primera version sustituia tambien el interior de las cadenas, asi que
   * `x !== 'POR_UNIDAD'` y `y !== 'ACTIVO'` colapsaban en la misma forma y el
   * informe salia con 46 grupos de ruido. El literal es PARTE de la identidad
   * de la decision: dos lineas que comparan contra valores distintos no son la
   * misma decision escrita dos veces. */
  const cadenas = []
  const conHuecos = linea
    .replace(/\/\/.*$/, '')
    .trim()
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, m => {
      cadenas.push(m)
      return `\u0000${cadenas.length - 1}\u0000`
    })
    .replace(/\b[A-Za-z_$][\w$]*\b/g, t => (CLAVE.has(t) ? t : '\u00b7'))
    .replace(/\s+/g, ' ')
  /* Y vuelven a su sitio, para que la forma conserve contra QUE se compara. */
  return conHuecos.replace(/\u0000(\d+)\u0000/g, (_, i) => cadenas[Number(i)])
}


/**
 * ¿Es una línea que DECIDE? Sin esto, el ruido tapa el hallazgo.
 *
 * ⚠ LA FLECHA NO ES UNA COMPARACIÓN. La primera versión daba por comparación
 * cualquier `>` seguido de algo que no fuera `=`, y en `=>` eso se cumple: el
 * informe salía lleno de `.map(x => ({`, que es un idiom de mapeo y no una
 * decisión. Se excluye mirando el carácter anterior.
 */
function decide(l) {
  if (/^\s*(\/\/|\*|\/\*)/.test(l)) return false
  const t = l.trim()
  if (t.length < 18) return false
  const comparacion = /(?<![=!<>])[<>]=?(?![=>])/.test(t) || /[!=]==/.test(t)
  const escala = /\/\s*\d|\*\s*\d/.test(t)
  const redondeo = /ROUND_|toDecimalPlaces|Math\.(round|floor|ceil|min|max)/.test(t)
  const orden = /\.sort\(/.test(t)
  /* Un ternario cuenta solo si no es parte de un `?.` ni de un `??`. */
  const ternario = /[^?]\?\s[^:]{1,60}\s:/.test(t)
  return comparacion || escala || redondeo || orden || ternario
}

/**
 * EL NÚCLEO DE LA CONDICIÓN, SIN EL ENVOLTORIO.
 *
 * ⚠ Esto se añadió porque el guión falló en el caso para el que existía.
 *
 * La frontera del tramo está escrita dos veces: en `tramos.ts` como
 * `const dentro = base > desde && (...)` y en `calculo.ts` como
 * `if (base > desde && (...)) {`. **Es la misma decisión y el normalizador las
 * daba por distintas**, porque compara la línea entera y el envoltorio difiere.
 * El hallazgo llegó por el grupo vecino —la comprobación de `hasta`— y
 * leyendo alrededor, o sea por la lectura y no por el instrumento.
 *
 * Así que cada línea se indexa DOS veces: por su forma completa y por el
 * núcleo de su condición. `if (X) {`, `const · = X`, `return X` y `while (X)`
 * comparten núcleo si X es el mismo.
 */
function nucleo(f) {
  let x = f
    .replace(/^(if|while)\s*\(/, '')
    .replace(/^(const|let|var)\s+·\s*=\s*/, '')
    .replace(/^return\s+/, '')
    .replace(/\{\s*$/, '')
    .trim()
  /* EL RECORTE DEL PARÉNTESIS FINAL VA POR BALANCE, no por patrón.
   *
   * La primera versión quitaba un `)` final con una expresión regular, y eso
   * se comía el paréntesis legítimo de `const · = · > · && (…)`, dejando el
   * núcleo desbalanceado mientras el de `if (…) {` quedaba entero. Las dos
   * líneas eran la misma decisión y seguían sin agruparse: el guión fallaba
   * otra vez en el caso para el que se escribió. */
  let sobran = (x.match(/\)/g) ?? []).length - (x.match(/\(/g) ?? []).length
  while (sobran > 0 && x.endsWith(')')) { x = x.slice(0, -1).trim(); sobran-- }
  /* Un núcleo sin ningún operador de decisión no distingue nada. */
  if (!/[<>]=?|[!=]==|&&|\|\|/.test(x)) return null
  return x.length >= 14 ? x : null
}

const porForma = new Map()

for (const f of MODULOS) {
  if (NO_MIRAR.test(f)) continue
  let src
  try {
    src = readFileSync(f, 'utf8')
  } catch {
    continue
  }
  const lineas = src.split('\n')
  let enComentario = false
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]
    if (/^\s*\/\*/.test(l)) enComentario = true
    if (enComentario) {
      if (/\*\//.test(l)) enComentario = false
      continue
    }
    if (!decide(l)) continue
    const k = forma(l)
    if (!k || k.length < 14) continue
    const sitio = { archivo: f.replace(/\\/g, '/'), linea: i + 1, texto: l.trim() }
    for (const clave of [k, nucleo(k)]) {
      if (!clave) continue
      if (!porForma.has(clave)) porForma.set(clave, [])
      porForma.get(clave).push(sitio)
    }
  }
}

/* Una forma repetida DENTRO del mismo archivo suele ser un patrón local
 * legítimo —dos ramas de un switch, dos validaciones seguidas—. Lo que
 * interesa es la misma forma en archivos DISTINTOS: ahí es donde una se
 * corrige y la otra no. */
let repetidas = [...porForma.entries()]
  .map(([k, sitios]) => ({ k, sitios, archivos: new Set(sitios.map(s => s.archivo)) }))
  .filter(r => r.archivos.size > 1)
  .sort((a, b) => b.sitios.length - a.sitios.length || b.archivos.size - a.archivos.size)

/* Indexar por forma Y por núcleo hace que un mismo hallazgo pueda salir dos
 * veces. Se queda el grupo MÁS GRANDE que cubre cada conjunto de sitios: un
 * informe que repite el mismo hallazgo con otro título se deja de leer. */
const yaVistos = new Set()
repetidas = repetidas.filter(r => {
  const firma = r.sitios.map(s => `${s.archivo}:${s.linea}`).sort().join('|')
  if (yaVistos.has(firma)) return false
  yaVistos.add(firma)
  return true
})

console.log('\n══ LA MISMA DECISIÓN EN MÁS DE UN ARCHIVO ════════════════════')
console.log(`  ${porForma.size} formas de decisión en ${MODULOS.filter(f => !NO_MIRAR.test(f)).length} módulos.`)
console.log(`  ${repetidas.length} forma(s) escritas en más de un archivo.\n`)

for (const r of repetidas) {
  console.log(`  ✦ en ${r.archivos.size} archivos · ${r.sitios.length} sitios`)
  for (const s of r.sitios) {
    console.log(`      ${s.archivo}:${s.linea}`)
    console.log(`        ${s.texto.slice(0, 94)}`)
  }
  console.log('')
}

if (!repetidas.length) {
  console.log('  → ninguna forma de decisión se repite entre archivos.\n')
} else {
  console.log('  Repetir una decisión no es siempre un defecto: puede ser coincidencia de')
  console.log('  forma sin significado compartido. Hay que leerlas. Lo que no vale es no')
  console.log('  saber que están repetidas, que es como se perdió el cuarto sitio de la escala.\n')
}
