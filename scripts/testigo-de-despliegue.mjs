#!/usr/bin/env node
/**
 * GENERA EL TESTIGO QUE AUTORIZA A LA APP DESPLEGADA
 * ==================================================
 *
 * No escribe nada: imprime. Lo que hace con cada mitad lo decide una persona.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE
 *
 * La primera versión de la autorización usaba el HOST de la base como valor, y
 * era un hueco: `acela.proxy.rlwy.net` está en el panel de Railway, salió
 * impreso en una conversación y se deduce del proyecto. Exportándolo,
 * cualquiera quedaba autorizado como «la app desplegada».
 *
 * Nadie teclea 32 caracteres aleatorios por inercia. Ponerlos exige ir a Vercel
 * a copiarlos, que es justo el acto consciente que esto existe para forzar.
 *
 * ⚠ EL SECRETO NO PASA POR EL REPOSITORIO NI POR NADIE MÁS. Este guión lo
 * genera en la máquina de quien lo corre; esa persona pega el TESTIGO en Vercel
 * y commitea solo la HUELLA. De las dos mitades, la que viaja es la que no
 * revela nada.
 *
 *     node scripts/testigo-de-despliegue.mjs
 */
import { randomBytes, createHash } from 'node:crypto'

/* base64url: 32 bytes → 43 caracteres sin `+`, `/` ni `=`, que se rompen al
 * pasar por una URL, por un .env o por un panel web. */
const testigo = randomBytes(32).toString('base64url')
const huella = createHash('sha256').update(testigo).digest('hex')

console.log(`
══ TESTIGO DEL DESPLIEGUE ════════════════════════════════════

  ① ESTO VA A VERCEL, y a ningún otro sitio:

     Nombre:  SFR_DESTINO_DE_DESPLIEGUE
     Valor:   ${testigo}

     ⚠ SOLO EN «Production». NO en Preview: mientras no haya una base
       aislada para Preview, un despliegue de Preview con autorización
       escribiría en la base real.

     ⚠ Y en ningún archivo del repositorio. \`verificar-destinos.mjs\`
       rompe el build si esta variable aparece en cualquier .env* del
       disco, precisamente para eso.

  ② ESTO VA AL CÓDIGO, en src/lib/destino-base.ts:

     export const HUELLA_DEL_TESTIGO = '${huella}'

     La huella no revela el testigo y puede vivir en el repositorio.
     Es lo que permite VERIFICAR en vez de solo comprobar la forma:
     32 caracteres cualesquiera tienen la forma buena y no son el
     testigo.

  ③ DESPUÉS, Y EN ESTE ORDEN:

     1. la variable en Vercel (Production)
     2. un despliegue NUEVO, para que entre
     3. y solo entonces, empujar el commit con la huella

     Al revés, la app deja de poder escribir y los leads vuelven a
     perderse.

  Si alguna vez hay que rotarlo: se vuelve a correr esto, se cambia la
  variable en Vercel y se commitea la huella nueva. Que la rotación
  exija un commit es deseable: deja rastro de cuándo se hizo.

══════════════════════════════════════════════════════════════
`)
