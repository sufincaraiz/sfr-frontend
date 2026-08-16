#!/usr/bin/env node
/**
 * Ejercita `seleccionarPublicables()` con inventarios que hoy no existen.
 *
 * Ninguna vereda llega a 5 propiedades —Bulucaima, la mayor, tiene 3—, así que
 * la promoción automática no se puede observar contra producción sin escribir
 * en la base compartida. Por eso la decisión vive en un archivo sin imports de
 * runtime: aquí se compila ese archivo suelto con el tsc del proyecto y se le
 * pasan filas inventadas. Se prueba la función real, no una copia.
 *
 *     node scripts/probar-promocion.mjs
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const salida = mkdtempSync(join(tmpdir(), 'malla-'))
try {
  execFileSync(
    'npx',
    // `--skipLibCheck` evita que fallen los .d.ts ambientales del proyecto
    // (React, MDX): este archivo no depende de ninguno.
    ['tsc', 'src/lib/malla-veredas-seleccion.ts', '--outDir', salida,
     '--module', 'esnext', '--target', 'es2022', '--moduleResolution', 'bundler',
     '--skipLibCheck'],
    { stdio: 'inherit', shell: true },
  )
} catch {
  console.error('No compiló src/lib/malla-veredas-seleccion.ts')
  process.exit(1)
}

const { seleccionarPublicables } = await import(
  pathToFileURL(join(salida, 'malla-veredas-seleccion.js')).href
)

const lv = { municipio_slug: 'la-vega', municipio_name: 'La Vega' }
const fila = (slug, name, inventario) => ({ slug, name, ...lv, inventario })
const edit = (slug, name) => ({ slug, name, ...lv })

const casos = [
  {
    nombre: 'sin texto y con 4 propiedades → NO tiene página',
    filas: [fila('llano-grande', 'Llano Grande', 4)], editoriales: [], espera: [],
  },
  {
    nombre: 'sin texto y con 5 → se promociona sola',
    filas: [fila('llano-grande', 'Llano Grande', 5)], editoriales: [], espera: ['llano-grande'],
  },
  {
    nombre: 'promocionada que baja a 4 → se degrada sola',
    filas: [fila('llano-grande', 'Llano Grande', 4)], editoriales: [], espera: [],
  },
  {
    nombre: 'con texto y 0 propiedades → conserva su página',
    filas: [fila('chupal', 'Chupal', 0)], editoriales: [edit('chupal', 'Chupal')], espera: ['chupal'],
  },
  {
    nombre: 'orden por inventario, no alfabético',
    filas: [fila('argel', 'Argel', 1), fila('tabacal', 'Tabacal', 9)],
    editoriales: [edit('argel', 'Argel'), edit('tabacal', 'Tabacal')],
    espera: ['tabacal', 'argel'],
  },
  {
    nombre: 'empate de inventario → alfabético como desempate',
    filas: [fila('tabacal', 'Tabacal', 2), fila('argel', 'Argel', 2)],
    editoriales: [edit('argel', 'Argel'), edit('tabacal', 'Tabacal')],
    espera: ['argel', 'tabacal'],
  },
  {
    nombre: 'promocionada se marca como tal',
    filas: [fila('llano-grande', 'Llano Grande', 7), fila('chupal', 'Chupal', 0)],
    editoriales: [edit('chupal', 'Chupal')],
    espera: ['llano-grande', 'chupal'],
    extra: r => r[0].promocionada === true && r[0].editorial === null
             && r[1].promocionada === false && r[1].editorial !== null,
  },
]

let fallos = 0
for (const c of casos) {
  const r = seleccionarPublicables(c.filas, c.editoriales)
  const got = r.map(v => v.slug)
  const ok = JSON.stringify(got) === JSON.stringify(c.espera) && (!c.extra || c.extra(r))
  if (!ok) {
    fallos++
    console.log(`  FALLA  ${c.nombre}`)
    console.log(`         esperaba ${JSON.stringify(c.espera)}, obtuvo ${JSON.stringify(got)}`)
  } else {
    console.log(`  ok     ${c.nombre}`)
  }
}

rmSync(salida, { recursive: true, force: true })
console.log(fallos ? `\n${fallos} caso(s) fallando` : '\ntodos los casos pasan')
process.exit(fallos ? 1 : 0)
