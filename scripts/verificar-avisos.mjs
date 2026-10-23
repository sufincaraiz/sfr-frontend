#!/usr/bin/env node
/**
 * QUIEN CREA UN LEAD, AVISA
 * =========================
 *
 * ⚠ ESTA GUARDA NACE DE UN DEFECTO QUE NINGUNA OTRA PODÍA ENCONTRAR.
 *
 * El 2026-10-23 se midió que 9 de los 12 leads de los últimos 60 días no
 * habían generado ningún aviso a Leonel. La causa no era un fallo: era que
 * `POST /api/leads` —por donde entran los cuatro formularios públicos del
 * sitio— no contenía ni una línea de notificación. Nunca la tuvo.
 *
 * Y la razón por la que el repositorio no podía delatarlo:
 *
 *   > Una llamada que falta no tiene sintaxis.
 *
 * `verificar-escrituras.mjs` busca «una escritura seguida de algo que puede
 * fallar». Aquí la escritura no iba seguida de nada, así que no había nada que
 * encontrar. Ninguna guarda de esa forma puede ver código AUSENTE: las otras
 * se cazan preguntando «¿se llega ahí?», y ésta solo preguntando «¿esto
 * debería existir?» —y esa pregunta no se le puede hacer al código—.
 *
 * Lo único que convierte esa pregunta en algo mecánico es ESCRIBIR LA
 * RESPUESTA una vez, y es lo que hace este archivo: la regla de negocio queda
 * declarada aquí, y desde ahora el build la comprueba.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA REGLA
 *
 *   Todo sitio que CREA un lead tiene que avisar, o declarar por qué no.
 *
 * Las excepciones se declaran abajo con su razón, igual que la deuda conocida
 * de `verificar-escrituras.mjs`. Lo que no vale es que aparezca un camino nuevo
 * de creación de leads y nadie se entere de que no notifica.
 *
 * Y la guarda es de DOS DIRECCIONES, como las demás del proyecto: si una
 * excepción deja de hacer falta —porque ese camino ya avisa— también se pone
 * en rojo, para que la lista no se llene de razones caducas que nadie relee.
 */
import { globSync } from 'node:fs'
import { readFileSync } from 'node:fs'

/* Sitios que crean un lead y NO avisan, con su razón. Una entrada aquí es una
 * decisión escrita, no un olvido. */
const SIN_AVISO_A_PROPOSITO = [
  /* Vacia, y eso es una afirmacion: hoy TODO camino que crea un lead avisa.
   *
   * La primera version de este archivo traia una entrada para
   * src/app/api/admin/crm/route.ts "porque lo crea un admin a mano", y la
   * segunda direccion de la guarda la rechazo en la primera ejecucion: ese
   * archivo no crea leads, solo los convierte en Contacto. La razon era
   * plausible y falsa, que es la clase de entrada que una lista de excepciones
   * acumula cuando nadie la contrasta. */
]

/* Lo que cuenta como «crear un lead» y lo que cuenta como «avisar». */
const CREA = /prisma\s*\.\s*lead\s*\.\s*(create|upsert)\s*\(/
const AVISA = /\bavisarLead\s*\(/

const archivos = [
  ...globSync('src/app/**/route.ts'),
  ...globSync('src/app/**/actions.ts'),
  ...globSync('src/lib/**/*.ts'),
]

const norm = p => p.replace(/\\/g, '/')
const creadores = []
for (const f of archivos) {
  const txt = readFileSync(f, 'utf8')
  if (CREA.test(txt)) creadores.push({ archivo: norm(f), avisa: AVISA.test(txt) })
}

const declarados = new Set(SIN_AVISO_A_PROPOSITO.map(e => e.archivo))

/* ① Crea leads, no avisa, y no está declarado → el defecto de los nueve. */
const mudos = creadores.filter(c => !c.avisa && !declarados.has(c.archivo))

/* ② Está declarado como «no avisa a propósito» y resulta que sí avisa, o ya no
 * crea leads → la razón caducó y hay que borrarla. */
const presentes = new Set(creadores.map(c => c.archivo))
const avisadores = new Set(creadores.filter(c => c.avisa).map(c => c.archivo))
const caducas = SIN_AVISO_A_PROPOSITO.filter(
  e => !presentes.has(e.archivo) || avisadores.has(e.archivo),
)

console.log('\n══ QUIEN CREA UN LEAD, AVISA ═════════════════════════════════')
console.log(`  caminos que crean leads: ${creadores.length}`)
console.log(`  de ésos, avisan: ${creadores.filter(c => c.avisa).length}`)
console.log(`  sin aviso por decisión escrita: ${SIN_AVISO_A_PROPOSITO.length}`)

if (mudos.length) {
  console.log('\n  ✗ CREAN UN LEAD Y NADIE SE ENTERA:')
  for (const m of mudos) {
    console.log(`     · ${m.archivo}`)
  }
  console.log('\n  Un lead que entra sin que nadie lo sepa es un cliente perdido en')
  console.log('  silencio. Llama a `avisarLead(lead.id, …)` después de crearlo —fuera')
  console.log('  del `try` de la escritura— o declara aquí por qué este camino no')
  console.log('  necesita avisar. Lo que no vale es dejarlo sin respuesta.')
}

if (caducas.length) {
  console.log('\n  ✗ RAZONES CADUCAS (la excepción ya no hace falta):')
  for (const c of caducas) {
    console.log(`     · ${c.archivo} — ${presentes.has(c.archivo) ? 'ya avisa' : 'ya no crea leads'}`)
  }
  console.log('\n  Bórrala de SIN_AVISO_A_PROPOSITO. Una lista de excepciones con')
  console.log('  razones vencidas se deja de leer entera, y entonces no protege nada.')
}

if (!mudos.length && !caducas.length) {
  console.log('  → todos los caminos avisan o tienen su razón escrita.')
}

process.exit(mudos.length || caducas.length ? 1 : 0)
