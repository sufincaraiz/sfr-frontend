#!/usr/bin/env node
/**
 * ¿HAY UNA ESCRITURA SEGUIDA DE ALGO QUE PUEDA FALLAR, EN EL MISMO `try`?
 * ======================================================================
 *
 * El defecto que esto vigila no es agrupar causas de error: es **reportar un
 * fracaso total sobre una operación que sí ocurrió**. Un `catch` no sabe qué
 * alcanzó a pasar antes del `throw`.
 *
 * Pasó el 2026-10-14: el panel notarial sembró un año entero —19 conceptos— y
 * después falló una lectura. La respuesta fue 500 y la pantalla dijo «no se
 * pudo crear». El titular se quedó creyendo que no había nada, y había todo.
 *
 * CÓMO SE RESUELVE, en orden de preferencia:
 *
 *   1. `$transaction`, si lo que falla después es otra escritura. Una operación
 *      que revierte entera no necesita un mensaje a medias: es mejor solución
 *      que cualquier texto.
 *   2. Reordenar, si lo que puede fallar no depende de la escritura.
 *   3. El ayudante, para lo que no se puede envolver ni reordenar: distingue
 *      entre «lo que falló era cosmético» y «la operación quedó a medias».
 *
 * LOS FALSOS POSITIVOS SE DETECTAN, NO SE DECLARAN. Las tres formas que la
 * primera versión marcaba por error —el `await` dentro de los argumentos de la
 * propia escritura, las escrituras en ramas excluyentes que retornan, y lo que
 * va dentro de `$transaction`— se reconocen aquí abajo. Una excepción declarada
 * a mano es una afirmación que nadie vuelve a comprobar; una detección se
 * comprueba cada vez que corre el build.
 *
 * Y LA DEUDA CONOCIDA SE DECLARA Y SE COMPRUEBA: cada entrada de `CONOCIDOS`
 * dice su grupo y su plan, y si deja de corresponder a un hallazgo real el
 * build **también** falla. Una excepción que sobrevive a su causa es una fila
 * mal declarada, y eso engaña igual que un instrumento roto.
 */
import { readFileSync, globSync } from 'node:fs'

const ESCRITURA = /\b(prisma|tx|db)\.[a-zA-Z]+\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\b|\b(guardar|crear|sembrar|activar|borrar|encolar|causar|cerrar|actualizar|registrar|aplicar|migrar|purgar|volverABorrador|asegurar|fusionar|anonimizar)[A-Z]\w*\(/
const FALLIBLE = /\bawait\s+(?!req\.json|requireRole|params)/

/**
 * Deuda conocida, con su grupo y su plan. `desde` es la fecha en que se
 * declaró: una entrada vieja es una pregunta sin responder, no un permiso.
 */
const CONOCIDOS = [
  { archivo: 'src/app/api/admin/notariales/route.ts', grupo: 'MIXTO', desde: '2026-10-14',
    plan: 'sembrarAnio + asegurarFuentes en $transaction; anioParaPantalla queda cosmético' },
  { archivo: 'src/app/api/admin/notariales/[anio]/route.ts', grupo: 'COSMETICO', desde: '2026-10-14',
    plan: 'el ayudante: lo que falla es recalcular la pantalla' },
  { archivo: 'src/app/api/admin/finanzas/parametros/route.ts', grupo: 'COSMETICO', desde: '2026-10-14',
    plan: 'el ayudante: lo que falla es recalcular la pantalla' },
  { archivo: 'src/app/api/admin/finanzas/parametros/[accion]/route.ts', grupo: 'COSMETICO', desde: '2026-10-14',
    plan: 'el ayudante: lo que falla es recalcular la pantalla' },
  { archivo: 'src/app/api/admin/municipios/route.ts', grupo: 'COSMETICO', desde: '2026-10-14',
    plan: 'el ayudante: lo que falla es avisar a los buscadores' },
  { archivo: 'src/app/api/admin/properties/route.ts', grupo: 'PARTE_DE_LA_OPERACION', desde: '2026-10-14',
    plan: '$transaction: fusionarFeatures tiene que aceptar el cliente' },
  { archivo: 'src/app/api/admin/properties/[id]/route.ts', grupo: 'PARTE_DE_LA_OPERACION', desde: '2026-10-14',
    plan: '$transaction: fusionarFeatures tiene que aceptar el cliente' },
  { archivo: 'src/app/api/cron/purge-visitas/route.ts', grupo: 'DOS_OPERACIONES', desde: '2026-10-14',
    plan: 'informar por trabajo: son dos retenciones independientes y envolverlas desharía una purga buena' },
]

function hallazgos() {
/* AMBITO DECLARADO, y no es una casualidad.
 *
 * Barre src/app y src/lib porque ahi es donde vive el codigo que escribir seguido de algo que puede fallar;
 * los guiones de scripts/ no sirven peticiones y quedan fuera a proposito.
 *
 * ⚠ ESTE DETECTOR LLEVA SU PROPIO PATRON DENTRO, en la expresion que usa
 * para buscar. Hoy no se cuenta a si mismo UNICAMENTE porque scripts/ esta
 * fuera del ambito. Si alguien amplia esto a scripts/ -cosa razonable-, el
 * detector empieza a encontrarse a si mismo y a declararse conforme sin que
 * nadie se entere. Le paso a verificar-destinos.mjs el 2026-10-26 y su
 * cuenta paso de 0 a 1. Si amplias el ambito, excluye este archivo. */
  const archivos = globSync('src/app/**/route.ts').concat(globSync('src/app/**/actions.ts'))
  const out = []

  for (const f of archivos) {
    const lineas = readFileSync(f, 'utf8').split('\n')
    let dentro = false, prof = 0, inicio = 0
    let escrituraEn = -1, parentesis = 0, enTransaccion = false, despues = []

    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i]
      if (!dentro && /\btry\s*\{/.test(l)) {
        dentro = true; prof = 1; inicio = i
        escrituraEn = -1; parentesis = 0; enTransaccion = false; despues = []
        continue
      }
      if (!dentro) continue

      prof += (l.match(/\{/g) ?? []).length - (l.match(/\}/g) ?? []).length
      if (prof <= 0) {
        if (escrituraEn >= 0 && despues.length) out.push({ archivo: f, try: inicio + 1, escritura: escrituraEn + 1, despues })
        dentro = false
        continue
      }
      if (/^\s*(\/\/|\*|\/\*)/.test(l)) continue

      // 1. Lo que va dentro de `$transaction` revierte: no miente.
      if (/\$transaction/.test(l)) enTransaccion = true
      if (enTransaccion) continue

      if (escrituraEn < 0) {
        if (ESCRITURA.test(l)) {
          escrituraEn = i
          // 2. ¿El `await` está DENTRO de los argumentos de la escritura? Entonces
          //    se evalúa antes de escribir. Se cuentan paréntesis abiertos.
          parentesis = (l.match(/\(/g) ?? []).length - (l.match(/\)/g) ?? []).length
        }
        continue
      }

      if (parentesis > 0) {
        parentesis += (l.match(/\(/g) ?? []).length - (l.match(/\)/g) ?? []).length
        continue
      }
      // 3. Un `return` cierra la rama... pero PRIMERO hay que mirar si el
      //    `await` fallible esta en esa misma linea. La primera version miraba
      //    el `return` antes, y por eso no veia los casos de la forma
      //    `return NextResponse.json(await recalcular())`, que son justo los
      //    mas comunes aqui. El detector mentia, y hacia el lado peligroso:
      //    escondia casos reales en vez de inventarlos.
      if (FALLIBLE.test(l)) despues.push({ linea: i + 1, texto: l.trim().slice(0, 76) })
      if (/^\s*return\b/.test(l)) {
        if (despues.length) out.push({ archivo: f, try: inicio + 1, escritura: escrituraEn + 1, despues })
        escrituraEn = -1; despues = []
      }
    }
  }
  return out
}

const encontrados = hallazgos()
const norm = p => p.replace(/\\/g, '/')
const porArchivo = new Set(encontrados.map(h => norm(h.archivo)))
const declarados = new Set(CONOCIDOS.map(c => c.archivo))

console.log('\n══ ESCRITURA SEGUIDA DE ALGO QUE PUEDE FALLAR ════════════════')

const nuevos = encontrados.filter(h => !declarados.has(norm(h.archivo)))
const caducos = CONOCIDOS.filter(c => !porArchivo.has(c.archivo))

for (const h of nuevos) {
  console.log(`  ✗ ${norm(h.archivo)}`)
  console.log(`     try en ${h.try} · escritura en ${h.escritura} · luego línea ${h.despues[0].linea}`)
  console.log(`     ${h.despues[0].texto}`)
  console.log('     Un fallo ahí hace que el catch reporte fracaso total de algo que ya ocurrió.')
}
for (const c of caducos) {
  console.log(`  ✗ ${c.archivo} está declarado como deuda conocida y ya no tiene el defecto.`)
  console.log(`     Quita la entrada de CONOCIDOS: una excepción que sobrevive a su causa engaña.`)
}

const cuenta = CONOCIDOS.reduce((a, c) => ({ ...a, [c.grupo]: (a[c.grupo] ?? 0) + 1 }), {})
console.log(`  · deuda conocida: ${CONOCIDOS.length} archivo(s) — ` +
  Object.entries(cuenta).map(([g, n]) => `${n} ${g}`).join(' · '))

if (nuevos.length || caducos.length) {
  console.log(`\n  ✗ ${nuevos.length} sin declarar · ${caducos.length} declarado(s) de más.\n`)
  process.exit(1)
}
console.log('  → no hay casos nuevos.\n')
