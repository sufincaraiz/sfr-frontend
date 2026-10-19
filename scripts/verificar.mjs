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
    /* LOS ARNESES EN MEMORIA, que estaban fuera del build POR NADA.
     *
     * 270 ms, 202 ms y 1,3 s: menos de dos segundos entre los tres, para mas de
     * 800 verificaciones. No tocan la base, asi que nada impedia que corrieran
     * en cada despliegue. Su verde era de la ultima vez que alguien se acordo. */
    { nombre: 'motor notarial', guion: 'probar-notariales.mjs',
      vigila: '552 verificaciones del motor: tramos, bases, retencion, IVA, guardas' },
    { nombre: 'motor financiero', guion: 'probar-finanzas.mjs',
      vigila: '249 verificaciones: retefuente, IVA, ICA, custodia, numeros, NIT' },
    { nombre: 'promocion', guion: 'probar-promocion.mjs',
      vigila: 'lo que el sitio promete y como se calcula' },
    /* LOS TRES DEL 2026-10-16, por la misma razon y con el mismo coste.
     *
     * Un instrumento solo se verifica donde NO vive: `probar-notariales` corrio
     * meses en verde aqui y su propio defecto aparecio el dia que toco otra
     * zona. Estos tres eran hechos sobre esta maquina: 162 ms, 109 ms y 3,0 s.
     * `mutar` es el que mas pesa y el que mas vale: sin el, las 14 afirmaciones
     * respaldadas por una mutacion son una medicion de ayer en un equipo. */
    { nombre: 'slug base', guion: 'probar-slug.ts',
      vigila: '7 casos del generador de slugs, con la trampa de «Casablanca»' },
    { nombre: 'detector de valor futuro', guion: 'probar-vigilancia.ts',
      vigila: '19 casos: las frases retiradas de verdad y los falsos positivos' },
    { nombre: 'editor de tramos', guion: 'probar-editor-tramos.mjs',
      vigila: 'la forma donde el hueco y el solape no se pueden escribir, y los cinco extremos' },
    { nombre: 'mutaciones', guion: 'mutar.mjs',
      vigila: 'que las 14 afirmaciones del motor sigan respaldadas por una mutacion real' },
    { nombre: 'enlace del contador', guion: 'verificar-enlace-contador.mjs',
      vigila: 'que lo escrito —esquema, politica PUBLICA, retencion— y lo construido coincidan' },
    { nombre: 'arneses frescos', guion: 'verificar-arneses-frescos.mjs',
      vigila: 'cuando corrio en verde por ultima vez lo que NO puede correr aqui' },
    { nombre: 'volcados de tablas', guion: 'verificar-volcados.mjs',
      vigila: 'que ningun archivo versionado sea un volcado de filas con datos de terceros' },
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
    { nombre: 'fechas invariantes a la zona', guion: 'verificar-fechas-invariantes.mjs',
      vigila: 'que el arnes de fechas de la MISMA salida con TZ=UTC y con TZ=America/Bogota' },
    { nombre: 'anio de las FAQ', guion: 'verificar-anio-faq.mjs',
      vigila: 'que el anio citado en la portada no se quede atras ni vaya adelantado' },
    { nombre: 'fechas en la zona del servidor', guion: 'inventario-fechas.mjs',
      vigila: 'donde se lee un dia a partir de componentes locales de una fecha' },
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
/**
 * El npm que DEBE construir esto, y la razón de que sea este y no el de la
 * máquina de desarrollo.
 *
 * Medido el 2026-10-15: Vercel construye con **npm 11.19.0** y node v24.21.0
 * sobre linux; esta máquina tenía npm 11.13.0 y node v24.16.0 sobre win32.
 * Nada lo declaraba, y la diferencia se descubrió por casualidad al intentar
 * `npm approve-scripts`, que existe desde 11.16 y aquí no.
 *
 * ⚠ MANDA LA SUPERFICIE QUE CONSTRUYE LO QUE LA GENTE USA. Fijar el npm de la
 * máquina de desarrollo sería fijar el de la máquina que no despliega nada.
 *
 * Y de aquí se desbloquea `allowScripts`: con el gestor fijado, el campo lo
 * genera la herramienta en vez de escribirse de memoria.
 */
const NPM_ESPERADO = '11.19.0'

function quienConstruye() {
  const npm = spawnSync('npm --version', { encoding: 'utf8', shell: true })
  const v = `${npm.stdout ?? ''}`.trim() || '(no respondio)'
  const agente = process.env.npm_config_user_agent ?? ''
  /* `ci/vercel` lo pone el propio npm en su user-agent: es cómo se distingue el
   * build que despliega del que corre en una máquina de desarrollo. */
  const enCi = /ci\/\w/.test(agente) || !!process.env.VERCEL
  console.log(`\n══ CON QUÉ SE CONSTRUYE ════════════════════════════════════`)
  console.log(`  node ${process.version} · npm ${v} · ${process.platform}/${process.arch}` +
    `${enCi ? ' · CI' : ''}`)
  console.log(`  declarado en packageManager: npm@${NPM_ESPERADO}`)
  if (v === NPM_ESPERADO) return null

  /* EN CI ROMPE; EN LOCAL AVISA. No es timidez: en CI una divergencia significa
   * que el pin no surtió efecto o que el proveedor cambió de imagen, y eso hay
   * que saberlo antes de desplegar. En la máquina de desarrollo significa que
   * falta actualizar npm, y bloquear el build por eso impediría trabajar sin
   * arreglar nada. El día que las dos coincidan, esta distinción sobra. */
  if (enCi) {
    console.log(`  ✗ el build de CI corre npm ${v} y el declarado es ${NPM_ESPERADO}.`)
    console.log('    O el pin no surtió efecto, o el proveedor cambió de imagen de build.')
    return `npm ${v} ≠ ${NPM_ESPERADO} declarado`
  }
  console.log(`  ⚠ esta máquina corre npm ${v}; el que despliega es ${NPM_ESPERADO}.`)
  console.log('    No rompe aquí, pero lo que se pruebe en local no se probó con el npm que despliega.')
  return null
}

const fase = process.argv[2]
if (!GUARDAS[fase]) {
  console.log('\n  Uso: node scripts/verificar.mjs antes|despues\n')
  process.exit(1)
}

const caidas = []

if (fase === 'antes') {
  const problema = quienConstruye()
  if (problema) {
    caidas.push({
      nombre: 'gestor de paquetes', vigila: 'que el npm que construye sea el declarado',
      como: problema,
    })
  }
}
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
