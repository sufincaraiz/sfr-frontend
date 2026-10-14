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

/**
 * Cada mutación dice qué rompe, dónde, y QUIÉN tiene que enterarse.
 *
 * `porque` no es decoración: es la afirmación que la mutación pone a prueba. Si
 * una mutación sobrevive, lo que se cae es esa frase.
 */
const MUTACIONES = [
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
