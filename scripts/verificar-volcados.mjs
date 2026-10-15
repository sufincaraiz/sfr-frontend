#!/usr/bin/env node
/**
 * NINGÚN VOLCADO DE TABLAS EN EL REPOSITORIO
 * ==========================================
 *
 * El 2026-10-15, antes de migrar las columnas de fecha, se exportaron las filas
 * vivas como seguro —correcto— **a `prisma/respaldos-de-datos/` dentro del
 * árbol del repositorio** —incorrecto—. Ese archivo llevaba egresos e ingresos,
 * o sea nombres y NITs de terceros.
 *
 * No llegó a commitearse: cero commits, cero en el índice, cero apariciones en
 * la historia. Se detectó antes. Pero el margen fue un `git add -A` de
 * distancia, y en este repositorio se usa `git add -A` todo el tiempo.
 *
 * > **La historia de git es permanente. Un dato personal que entra no sale sin
 * > reescribir la historia, y reescribir la historia de un repositorio
 * > desplegado no es una operación que se haga con prisa.**
 *
 * `.gitignore` es la segunda línea, no la primera: solo protege de lo que nadie
 * añade a mano, y `git add -f` lo salta. Esto es la primera, y rompe el build.
 *
 * LOS RESPALDOS VIVEN FUERA DEL ÁRBOL: `C:\\sfr\\respaldos-de-datos\\`.
 *
 * QUÉ MIRA, y por qué estas dos reglas y no un detector general:
 *
 *   1. LA RUTA. Un archivo de datos cuya ruta dice «respaldo», «backup»,
 *      «dump», «volcado» o «export» no tiene por qué estar versionado, diga lo
 *      que diga dentro. Es la regla que habría parado el caso real.
 *   2. EL CONTENIDO. Un archivo de datos con campos de identificación
 *      repetidos —NIT, cédula, correo, teléfono, IP— es un volcado de filas
 *      aunque su nombre no lo diga.
 *
 * Y una tercera que complementa `verificar-migraciones-sql.mjs`: un `INSERT
 * INTO` en un `.sql` que no sea una migración archivada.
 *
 * SIN EXCEPCIONES DECLARADAS. Hoy el repositorio tiene doce archivos de datos
 * rastreados —`package.json`, `tsconfig.json`, `vercel.json` y ocho migraciones
 * de estructura— y ninguno dispara nada. Una excepción escrita a mano es una
 * afirmación que nadie vuelve a comprobar.
 *
 *   node scripts/verificar-volcados.mjs
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

/** Extensiones donde cabe un volcado. El código fuente no se mira. */
const DATOS = /\.(json|sql|csv|tsv|ndjson|jsonl|xml|ya?ml)$/i

/** Rutas que, para un archivo de datos, ya son motivo suficiente. */
const RUTA_DE_RESPALDO = /(respald|backup|dump|volcado|export)/i

/**
 * Campos que identifican a una persona o a una empresa. No se busca «nombre» a
 * secas: aparece en cualquier configuración. Se buscan los que solo tienen
 * sentido junto a un dato real.
 */
const IDENTIFICADORES = [
  'nit', 'cedula', 'cédula', 'documento_identidad',
  'email', 'correo', 'telefono', 'teléfono', 'celular', 'whatsapp',
  'userAgent', 'user_agent', 'direccion', 'dirección',
  'razon_social', 'razón_social', 'tercero_id', 'nombre_tercero',
]

/** Cuántas veces tiene que aparecer un identificador para ser un volcado. */
const DESDE = 2

function rastreados() {
  const salida = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  return salida.split('\0').filter(Boolean)
}

const hallazgos = []

for (const f of rastreados()) {
  if (!DATOS.test(f)) continue
  const norm = f.replace(/\\/g, '/')

  /* 1. La ruta. */
  if (RUTA_DE_RESPALDO.test(norm)) {
    hallazgos.push({
      archivo: norm, por: 'la ruta dice que es un respaldo o un volcado',
      que: 'los respaldos de datos viven FUERA del arbol del repositorio',
    })
    continue
  }

  let texto
  try {
    texto = readFileSync(f, 'utf8')
  } catch {
    continue
  }

  /* 2. El contenido. */
  const encontrados = IDENTIFICADORES
    .map(k => ({ k, n: (texto.match(new RegExp(`["']?${k}["']?\\s*[:=]`, 'gi')) ?? []).length }))
    .filter(x => x.n >= DESDE)
  if (encontrados.length) {
    hallazgos.push({
      archivo: norm,
      por: `campos de identificacion repetidos: ${encontrados.map(x => `${x.k}×${x.n}`).join(', ')}`,
      que: 'parece un volcado de filas con datos de terceros',
    })
    continue
  }

  /* 3. INSERT fuera de una migración archivada. */
  if (/\.sql$/i.test(norm) && !norm.startsWith('prisma/migraciones-aplicadas/')
      && /\binsert\s+into\b/i.test(texto)) {
    hallazgos.push({
      archivo: norm, por: 'trae INSERT INTO y no es una migracion archivada',
      que: 'los datos no entran al repositorio como SQL suelto',
    })
  }
}

console.log('\n══ VOLCADOS DE TABLAS EN EL REPOSITORIO ══════════════════════')

if (!hallazgos.length) {
  console.log('  ✓ ningún archivo versionado parece un volcado de filas.')
  console.log('    Los respaldos van fuera del árbol: la historia de git es permanente.\n')
  process.exit(0)
}

for (const h of hallazgos) {
  console.log(`  ✗ ${h.archivo}`)
  console.log(`     ${h.por}`)
  console.log(`     ${h.que}`)
}
console.log('\n  La historia de git es permanente: un dato personal que entra no sale sin')
console.log('  reescribirla. Saca el archivo del árbol antes de commitear.\n')
process.exit(1)
