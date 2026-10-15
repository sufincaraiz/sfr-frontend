#!/usr/bin/env node
/**
 * TODAS LAS GUARDAS, Y EL FALLO AL FINAL CON LA LISTA COMPLETA
 * ===========================================================
 *
 * La cadena era `guarda && guarda && next build && guarda && guarda`. Eso tiene
 * una propiedad que para guardas es la equivocada: **el primer fallo esconde a
 * los demás**. Se descubre un problema por despliegue.
 *
 * El 2026-10-14 costó exactamente eso. La misma guarda detuvo dos builds
 * seguidos a los 17 segundos, y lo que venía detrás —el escáner de escrituras,
 * `next build`, las trazas, los enlaces— no corrió NI UNA VEZ en Vercel. Cuatro
 * eslabones sin ejecutar en la superficie que decide, y seis horas de producción
 * sirviendo el commit anterior para enterarse de un problema a la vez.
 *
 * Aquí corren todas, se acumulan los fallos, y el proceso sale con 1 al final
 * con el listado entero. `next build` sigue después y condicionado: compilar con
 * una guarda roja no tiene sentido, y además tarda minutos.
 *
 * ⚠ CADA GUARDA CORRE EN SU PROPIO PROCESO. Una que se cuelgue o que llame a
 * `process.exit` no se lleva por delante a las que faltan, y un cuelgue cuenta
 * como fallo: el criterio es «no terminó en verde», no «imprimió una ✗».
 *
 *   node scripts/verificar.mjs antes     las que van antes de compilar
 *   node scripts/verificar.mjs despues   las que necesitan el build hecho
 */
import { spawnSync } from 'node:child_process'

const GUARDAS = {
  antes: [
    { nombre: 'migraciones SQL', guion: 'verificar-migraciones-sql.mjs',
      vigila: 'que ninguna migración archivada traiga datos, solo estructura' },
    { nombre: 'portabilidad', guion: 'verificar-portabilidad.mjs',
      vigila: 'lo que Windows perdona y Linux no: CRLF y mayúsculas' },
    { nombre: 'transcripción', guion: 'verificar-transcripcion.mjs',
      vigila: 'que el módulo generado no se quede viejo respecto al documento' },
    { nombre: 'inventario de decisiones', guion: 'inventario-decisiones.mjs',
      vigila: 'que el inventario de decisiones criticas siga hablando del codigo real' },
    { nombre: 'vulnerabilidades', guion: 'inventario-vulnerabilidades.mjs',
      vigila: 'que ninguna vulnerabilidad nueva entre sin clasificar quien la alcanza' },
    { nombre: 'decisiones repetidas', guion: 'decisiones-repetidas.mjs',
      vigila: 'la misma decision escrita en mas de un archivo (informativo: no rompe)' },
    { nombre: 'escrituras', guion: 'verificar-escrituras.mjs',
      vigila: 'escrituras seguidas de algo que puede fallar en el mismo try' },
  ],
  despues: [
    { nombre: 'trazas', guion: 'verificar-trazas.mjs',
      vigila: 'que los archivos que una ruta lee viajen con la función' },
    { nombre: 'enlaces', guion: 'verificar-enlaces.mjs',
      vigila: 'que ningún enlace del menú o del pie apunte a una ruta que no existe' },
  ],
}

/**
 * CON QUÉ SE ESTÁ CONSTRUYENDO ESTO.
 *
 * ⚠ Un build que no dice con qué se construyó no se puede comparar con otro.
 *
 * El 2026-10-15 el npm de la máquina de desarrollo y el de Vercel resultaron
 * distintos —uno tiene `approve-scripts` y el otro no— y **nada lo declaraba**:
 * ni `engines` ni `packageManager`. La diferencia se descubrió por casualidad,
 * al intentar usar un comando que aquí no existía. Antes de fijar la versión
 * hay que saber cuál corre del otro lado, y eso se mide, no se deduce de la
 * documentación del proveedor.
 *
 * Esta línea se queda después de fijarla: es cómo se comprueba que el pin
 * surtió efecto, y cómo se verá el día que el proveedor cambie de imagen.
 */
function quienConstruye() {
  const npm = spawnSync('npm --version', { encoding: 'utf8', shell: true })
  const v = `${npm.stdout ?? ''}`.trim() || '(no respondio)'
  const fijado = process.env.npm_config_user_agent ?? ''
  console.log(`\n══ CON QUÉ SE CONSTRUYE ════════════════════════════════════`)
  console.log(`  node ${process.version} · npm ${v} · ${process.platform}/${process.arch}`)
  if (fijado) console.log(`  agente: ${fijado.slice(0, 90)}`)
}

const fase = process.argv[2]
if (!GUARDAS[fase]) {
  console.log('\n  Uso: node scripts/verificar.mjs antes|despues\n')
  process.exit(1)
}

if (fase === 'antes') quienConstruye()

const caidas = []
for (const g of GUARDAS[fase]) {
  const r = spawnSync(process.execPath, [`scripts/${g.guion}`], { stdio: 'inherit' })
  /* Ni código 0 ni código: una señal también es un fallo. Lo que cuenta es que
   * no terminó en verde. */
  if (r.status !== 0) {
    caidas.push({ ...g, como: r.status === null ? `señal ${r.signal}` : `código ${r.status}` })
  }
}

console.log(`\n══ GUARDAS (${fase}) ══════════════════════════════════════════`)
console.log(`  ${GUARDAS[fase].length - caidas.length} de ${GUARDAS[fase].length} en verde.`)

if (!caidas.length) {
  console.log('')
  process.exit(0)
}

console.log(`\n  ✗ ${caidas.length} guarda(s) en rojo, TODAS de una sola pasada:\n`)
for (const c of caidas) {
  console.log(`     · ${c.nombre} (${c.como})`)
  console.log(`       vigila ${c.vigila}`)
  console.log(`       su salida está más arriba, con su propia cabecera.`)
}
console.log('\n  Arréglalas juntas: enterarse de una por despliegue es lo que esto evita.\n')
process.exit(1)
