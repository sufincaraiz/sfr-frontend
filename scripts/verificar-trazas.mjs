#!/usr/bin/env node
/**
 * ¿LLEGAN A PRODUCCIÓN LOS ARCHIVOS QUE EL CÓDIGO LEE EN RUNTIME?
 * ==============================================================
 *
 * Una función serverless no se despliega con el repositorio: se despliega con
 * los archivos que Next TRAZA. Un `readFile('algo.md')` compila, pasa el
 * typecheck, funciona en local —donde el proceso corre en la raíz del
 * proyecto— y en producción revienta con ENOENT, porque ese archivo no está en
 * `/var/task`.
 *
 * Ya pasó dos veces en este proyecto:
 *   · con los MDX del blog, que desaparecían del sitemap al revalidar;
 *   · con PARAMETROS-NOTARIALES-VERIFICADOS.md, el 2026-10-14: el panel
 *     notarial devolvía 500 y le decía al titular «no se pudo crear» un año
 *     que SÍ se había creado.
 *
 * La segunda ocurrió teniendo la primera resuelta y comentada en
 * `next.config.ts`. Una regla escrita que no se consulta al teclear no se
 * arregla con otra nota: se arregla con esto, que corre en el build.
 *
 * Cómo añadir un caso: una fila en LECTURAS_EN_RUNTIME. Si el código empieza a
 * leer un archivo nuevo y nadie añade la fila, esta verificación no lo protege
 * —no puede adivinar— pero sí protege lo declarado, que es lo que se olvida.
 */
import { readFileSync, existsSync } from 'node:fs'

/**
 * Qué archivo lee cada ruta en runtime. `traza` es el .nft.json de la función
 * y `espera` un trozo de ruta que tiene que aparecer en su lista de archivos.
 */
const LECTURAS_EN_RUNTIME = [
  {
    porque: 'el panel notarial lee el bloque de cotejo del documento transcrito',
    trazas: [
      '.next/server/app/api/admin/notariales/route.js.nft.json',
      '.next/server/app/api/admin/notariales/[anio]/route.js.nft.json',
    ],
    espera: 'PARAMETROS-NOTARIALES-VERIFICADOS.md',
  },
  {
    // Ojo: lo lee sitemap-BLOG.xml, no sitemap.xml. La primera versión de esta
    // verificación declaró la ruta equivocada y reportó un fallo que no
    // existía: un instrumento mal declarado engaña igual que uno roto. Por eso
    // cada fila dice QUÉ ruta y POR QUÉ, para poder comprobar la declaración.
    porque: 'el sitemap del blog y la portada del blog leen los MDX de content/blog',
    trazas: [
      '.next/server/app/sitemap-blog.xml/route.js.nft.json',
      '.next/server/app/blog/page.js.nft.json',
    ],
    espera: 'content/blog',
  },
]

let fallos = 0
console.log('\n══ ARCHIVOS QUE SE LEEN EN RUNTIME ═══════════════════════════')

for (const caso of LECTURAS_EN_RUNTIME) {
  for (const traza of caso.trazas) {
    if (!existsSync(traza)) {
      console.log(`  ✗ no existe la traza ${traza}`)
      console.log(`     (¿cambió la ruta? ${caso.porque})`)
      fallos++
      continue
    }
    const { files } = JSON.parse(readFileSync(traza, 'utf8'))
    const hay = files.some(f => f.includes(caso.espera))
    if (hay) {
      console.log(`  ✓ ${caso.espera} viaja con ${traza.replace('.next/server/app/', '')}`)
    } else {
      console.log(`  ✗ ${caso.espera} NO viaja con ${traza.replace('.next/server/app/', '')}`)
      console.log(`     ${caso.porque}`)
      console.log('     En producción eso es un ENOENT, no un error de compilación.')
      console.log("     Se arregla con outputFileTracingIncludes en next.config.ts.")
      fallos++
    }
  }
}

if (fallos) {
  console.log(`\n  ✗ ${fallos} archivo(s) que el código lee NO llegan a la función.\n`)
  process.exit(1)
}
console.log('  → todo lo que se lee en runtime viaja con su función.\n')
