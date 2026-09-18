#!/usr/bin/env node
/**
 * GUARDA DE prisma/migraciones-aplicadas/ — solo estructura, nunca datos.
 * ======================================================================
 *
 * `.gitignore` excluye todo `*.sql` porque los respaldos de la base llevan
 * cédulas (Ley 1581/2012). Esta carpeta es la ÚNICA excepción: guarda el SQL de
 * cada migración aplicada, que es rastro de auditoría del módulo tributario.
 *
 * La excepción es segura mientras nadie deje ahí un dump. Un comentario en el
 * .gitignore no lo impide; esta guarda sí: corre al inicio de `npm run build`
 * y rompe si algún archivo trae sentencias que mueven DATOS.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'prisma/migraciones-aplicadas'
// Sentencias de datos. DDL (CREATE/ALTER/DROP/COMMENT/INDEX) no está aquí.
const DATOS = /^\s*(INSERT\s+INTO|COPY\s+\S+|UPDATE\s+\S+\s+SET|DELETE\s+FROM|TRUNCATE)\b/im
const PISTAS_DUMP = /pg_dump|^\\\.$|SELECT\s+pg_catalog\.setval/im

let fallos = 0
const archivos = readdirSync(DIR).filter(f => f.endsWith('.sql'))
for (const f of archivos) {
  const txt = readFileSync(join(DIR, f), 'utf8')
  // Los comentarios pueden mencionar «UPDATE» al explicar algo: se ignoran.
  const sinComentarios = txt.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const d = sinComentarios.match(DATOS)
  const p = txt.match(PISTAS_DUMP)
  if (d || p) {
    fallos++
    console.error(`✗ ${f}: contiene «${(d ?? p)[0].trim()}». Esta carpeta es solo para DDL de migraciones; un dump con datos personales NO puede ir al repo.`)
  }
}
if (fallos) process.exit(1)
console.log(`✓ migraciones-aplicadas: ${archivos.length} archivo(s), solo estructura.`)
