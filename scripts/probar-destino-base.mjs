#!/usr/bin/env node
/**
 * LA GUARDA DEL DESTINO — ARNÉS
 * =============================
 *
 * La propiedad central, y se prueba en las DOS direcciones como todas:
 *
 *   · apuntando a producción SIN autorización → se niega;
 *   · apuntando a producción CON la autorización correcta → deja pasar.
 *
 * Una guarda que solo se prueba negándose podría estar negándose siempre, y
 * entonces lo que se rompe es el trabajo, no el riesgo. Y una que solo se
 * prueba dejando pasar no es una guarda.
 *
 *     node scripts/probar-destino-base.mjs
 */
import {
  clasificarDestino, puedeEscribir, exigirDestinoParaEscribir, hostDeLaBase,
  DestinoNoAutorizado, HOSTS_SEGUROS, esEscritura, OPERACIONES_DE_LECTURA,
  autorizacionDeEscritura, testigoValido, formaDeTestigo,
} from '../src/lib/destino-base.ts'
import { randomBytes, createHash } from 'node:crypto'

let ok = 0, fail = 0
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fail++; console.log(`  ✗ ${nombre} ${extra}`) }
}
const lanza = (nombre, fn, fragmento) => {
  try { fn(); fail++; console.log(`  ✗ ${nombre} — NO lanzó`) }
  catch (e) {
    const bien = e instanceof DestinoNoAutorizado && (!fragmento || e.message.includes(fragmento))
    if (bien) { ok++; console.log(`  ✓ ${nombre}`) }
    else { fail++; console.log(`  ✗ ${nombre} — lanzó ${e?.name}: ${String(e?.message).slice(0, 90)}`) }
  }
}

const PROD = 'postgresql://postgres:secreto@acela.proxy.rlwy.net:27624/railway'
const LOCAL = 'postgresql://postgres:x@localhost:5432/sfr'

console.log('\n══ LO QUE NO SE RECONOCE SE TRATA COMO PRODUCCIÓN ════════════')

check('localhost es seguro', clasificarDestino(LOCAL).clase === 'SEGURO')
check('127.0.0.1 también',
  clasificarDestino('postgresql://u:p@127.0.0.1:5432/d').clase === 'SEGURO')
check('el host de producción se reconoce como tal',
  clasificarDestino(PROD).clase === 'PRODUCCION_CONOCIDA')

/* EL CORAZÓN DE FAIL-CLOSED: un host que nadie ha visto nunca NO es seguro. */
for (const [etiqueta, u] of [
  ['un host nuevo de Railway', 'postgresql://u:p@otro.proxy.rlwy.net:5432/d'],
  ['un proveedor distinto', 'postgresql://u:p@ep-cool-123.neon.tech/d'],
  ['una errata en localhost', 'postgresql://u:p@localhsot:5432/d'],
  ['un dominio cualquiera', 'postgresql://u:p@ejemplo.com:5432/d'],
]) {
  check(`${etiqueta} → DESCONOCIDO, no seguro`,
    clasificarDestino(u).clase === 'DESCONOCIDO', clasificarDestino(u).clase)
}

for (const [etiqueta, u] of [['vacía', ''], ['undefined', undefined], ['null', null],
  ['basura', 'no-soy-una-url'], ['solo espacios', '   ']]) {
  const d = clasificarDestino(u)
  check(`una URL ${etiqueta} → DESCONOCIDO y NO seguro`, d.clase === 'DESCONOCIDO')
}

console.log('\n══ SE NIEGA SIN AUTORIZACIÓN ═════════════════════════════════')

lanza('producción sin autorización', () => exigirDestinoParaEscribir(PROD, undefined),
  'la base de PRODUCCIÓN')
lanza('un host desconocido sin autorización',
  () => exigirDestinoParaEscribir('postgresql://u:p@ep-x.neon.tech/d', undefined),
  'no se reconoce se trata como producción')
lanza('una URL rota sin autorización', () => exigirDestinoParaEscribir('basura', undefined))
lanza('con la autorización VACÍA', () => exigirDestinoParaEscribir(PROD, '   '))
lanza('con un «sí» en vez del host', () => exigirDestinoParaEscribir(PROD, 'si'),
  'Tienen que coincidir')
lanza('con el host de OTRA base', () => exigirDestinoParaEscribir(PROD, 'localhost'),
  'Tienen que coincidir')

console.log('\n══ Y DEJA PASAR CUANDO DEBE ══════════════════════════════════')

check('la base aislada pasa SIN autorización ninguna',
  (() => { const d = exigirDestinoParaEscribir(LOCAL, undefined); return d.clase === 'SEGURO' })())
check('producción pasa CON el host exacto',
  (() => { const d = exigirDestinoParaEscribir(PROD, 'acela.proxy.rlwy.net')
    return d.clase === 'PRODUCCION_CONOCIDA' })())
check('…y da igual la caja de la autorización',
  (() => { exigirDestinoParaEscribir(PROD, 'ACELA.PROXY.RLWY.NET'); return true })())
check('un host desconocido pasa si se nombra exactamente',
  (() => { exigirDestinoParaEscribir('postgresql://u:p@ep-x.neon.tech/d', 'ep-x.neon.tech')
    return true })())

console.log('\n══ LA BASE AISLADA SE DECLARA SIN TOCAR CÓDIGO ═══════════════')

check('un host nuevo declarado en BASES_AISLADAS pasa a ser seguro',
  clasificarDestino('postgresql://u:p@ep-pruebas.neon.tech/d', 'ep-pruebas.neon.tech').clase === 'SEGURO')
check('…y la lista admite varios separados por coma',
  clasificarDestino('postgresql://u:p@b.neon.tech/d', 'a.neon.tech, b.neon.tech').clase === 'SEGURO')
check('…pero declarar OTRA no vuelve segura a producción',
  clasificarDestino(PROD, 'ep-pruebas.neon.tech').clase === 'PRODUCCION_CONOCIDA')
check('…y BASES_AISLADAS vacía no vuelve seguro a nadie',
  clasificarDestino(PROD, '').clase === 'PRODUCCION_CONOCIDA' &&
  clasificarDestino('postgresql://u:p@x.com/d', '  ,  ').clase === 'DESCONOCIDO')

console.log('\n══ LA CONTRASEÑA NO SE ESCAPA ═══════════════════════════════')

/* El mensaje de error va a una consola y a veces a un log. La URL lleva la
 * contraseña dentro, así que lo único que puede salir es el host. */
{
  const conClave = 'postgresql://postgres:CLAVE_SECRETA_NO_DEBE_SALIR@acela.proxy.rlwy.net:27624/railway'
  check('`hostDeLaBase` devuelve el host y nada más',
    hostDeLaBase(conClave) === 'acela.proxy.rlwy.net')
  const d = clasificarDestino(conClave)
  let mensaje = ''
  try { exigirDestinoParaEscribir(conClave, undefined) } catch (e) { mensaje = e.message }
  check('ni la clasificación ni el error mencionan la contraseña',
    !JSON.stringify(d).includes('CLAVE_SECRETA') && !mensaje.includes('CLAVE_SECRETA'),
    mensaje.slice(0, 100))
}

console.log('\n══ EL MOTIVO SIRVE PARA ARREGLARLO ═══════════════════════════')
{
  let m = ''
  try { exigirDestinoParaEscribir(PROD, undefined) } catch (e) { m = e.message }
  check('el error dice CÓMO autorizarlo', m.includes('ESCRIBIR_EN_PRODUCCION='))
  check('…con el host ya puesto, para no tener que buscarlo', m.includes('acela.proxy.rlwy.net'))
  check('…y recuerda que sin --env-file se usa la aislada', m.includes('.env.local'))
}

/* Que la lista no tenga entradas muertas: cada host declarado seguro tiene que
 * poder SALIR de una URL de verdad. `::1` sin corchetes no puede, y por eso no
 * está: una entrada que nunca coincide hace creer que el caso está cubierto. */
check('todos los hosts seguros declarados salen de una URL real y son seguros',
  HOSTS_SEGUROS.every(h => clasificarDestino(`postgresql://u:p@${h}:5432/d`).clase === 'SEGURO'),
  HOSTS_SEGUROS.join(', '))
check('IPv6 local, en la forma que Node devuelve de verdad',
  clasificarDestino('postgresql://u:p@[::1]:5432/d').clase === 'SEGURO')
check('…y una URL IPv6 SIN corchetes no se parsea, así que se niega',
  clasificarDestino('postgresql://u:p@::1:5432/d').clase === 'DESCONOCIDO')

console.log('\n══ LO DESCONOCIDO ES ESCRITURA ══════════════════════════')

for (const op of OPERACIONES_DE_LECTURA) {
  check(`${op} es lectura y no se comprueba`, esEscritura(op) === false)
}
for (const op of ['create', 'createMany', 'update', 'updateMany', 'upsert',
                  'delete', 'deleteMany', 'executeRaw', 'createManyAndReturn']) {
  check(`${op} es ESCRITURA`, esEscritura(op) === true)
}
/* Lo desconocido cae del lado seguro: una operación nueva de Prisma, o un
 * nombre que no conocemos, se comprueba igual. Por eso se enumeran las
 * LECTURAS y no las escrituras. */
for (const op of ['operacionDelFuturo', '', null, undefined, 'FINDMANY']) {
  check(`${JSON.stringify(op)} se trata como escritura`, esEscritura(op) === true)
}

console.log('\n══ LA APP SE AUTORIZA POR CONFIGURACIÓN, NO POR DETECCIÓN ══════')
{
  const d = clasificarDestino(PROD)
  check('sin ninguna de las dos llaves, NO puede escribir',
    autorizacionDeEscritura(d, undefined, undefined).puede === false)
  /* ⚠ ESTA VERIFICACIÓN AFIRMABA QUE EL HOST AUTORIZABA, Y ERA EL HUECO.
   * El host no es un secreto: está en el panel de Railway, salió impreso en una
   * conversación y se deduce del proyecto. Quien lo supiera quedaba autorizado
   * como «la app desplegada» —comprobado ejecutándolo—. Ahora el valor es un
   * testigo aleatorio verificado por su huella, y se afirma lo contrario. */
  check('con el HOST como valor de despliegue, YA NO autoriza',
    autorizacionDeEscritura(d, 'acela.proxy.rlwy.net', undefined).puede === false)
  check('con la de despliegue apuntando a OTRO host, no',
    autorizacionDeEscritura(d, 'otra.base.com', undefined).puede === false)
  check('con la autorización por EJECUCIÓN, sí',
    autorizacionDeEscritura(d, undefined, 'acela.proxy.rlwy.net').puede === true)
  check('la base aislada no necesita ninguna de las dos',
    autorizacionDeEscritura(clasificarDestino(LOCAL), undefined, undefined).puede === true)
  /* Igual que la de arriba: usaba el host como testigo. La mitad de «por
   * configuración» se comprueba abajo, con un testigo de verdad. */
  check('…y el motivo de la autorización por ejecución lo dice',
    /autorización expl/.test(autorizacionDeEscritura(d, undefined, 'acela.proxy.rlwy.net').motivo))
}


console.log('\n══ EL TESTIGO: FORMA Y HUELLA, NO UNA CONSTANTE ══════════')

/* El arnés genera su PROPIO testigo. Si usara el de verdad, el secreto
 * tendría que estar aquí dentro —y entonces no sería secreto—. */
const TESTIGO = randomBytes(32).toString('base64url')
const HUELLA = createHash('sha256').update(TESTIGO).digest('hex')

check('el testigo bueno, con su huella, vale', testigoValido(TESTIGO, HUELLA))
check('otro testigo con la misma FORMA no vale',
  !testigoValido(randomBytes(32).toString('base64url'), HUELLA))

/* ⚠ ESTO ES LO QUE LA COMPROBACIÓN DE FORMA SOLA NO PODRÍA HACER: 43
 * caracteres del alfabeto correcto, forma impecable, y no es el testigo. */
check('43 caracteres de forma impecable NO abren la puerta',
  formaDeTestigo('a'.repeat(43)) === true && testigoValido('a'.repeat(43), HUELLA) === false)

check('EL HUECO VIEJO: el host ya no autoriza nada',
  !testigoValido('acela.proxy.rlwy.net', HUELLA))
check('…y tampoco tiene la forma de un testigo',
  formaDeTestigo('acela.proxy.rlwy.net') === false)

for (const [etiqueta, v] of [['corto', 'abc'], ['31 caracteres', 'a'.repeat(31)],
  ['con espacios dentro', 'a'.repeat(20) + ' ' + 'b'.repeat(20)],
  ['con símbolos', 'a'.repeat(40) + '!@#'], ['vacío', ''], ['undefined', undefined]]) {
  check(`un testigo ${etiqueta} no tiene la forma`, formaDeTestigo(v) === false)
}

/* SIN HUELLA CONFIGURADA NO ABRE NUNCA. Es el estado del repositorio hasta que
 * alguien genere el testigo, y tiene que ser fail-closed también ahí. */
for (const h of ['', '   ', 'no-es-una-huella', 'a'.repeat(63), 'A'.repeat(64)]) {
  check(`con la huella esperada «${String(h).slice(0, 18)}» no abre`,
    testigoValido(TESTIGO, h) === false)
}
check('la huella en MAYÚSCULAS también vale: es hexadecimal',
  testigoValido(TESTIGO, HUELLA.toUpperCase()))

console.log('\n══ Y LA AUTORIZACIÓN COMPLETA, CON EL TESTIGO ═════════════')
{
  const d = clasificarDestino(PROD)
  check('con el testigo bueno, la app escribe',
    autorizacionDeEscritura(d, TESTIGO, undefined, HUELLA).puede === true)
  check('con el HOST en vez del testigo, NO',
    autorizacionDeEscritura(d, 'acela.proxy.rlwy.net', undefined, HUELLA).puede === false)
  check('sin huella configurada, el testigo bueno tampoco abre',
    autorizacionDeEscritura(d, TESTIGO, undefined, '').puede === false)
  check('…pero la autorización por ejecución sigue funcionando sin huella',
    autorizacionDeEscritura(d, undefined, 'acela.proxy.rlwy.net', '').puede === true)
}


console.log(`\n${fail === 0 ? '✓ TODO EN VERDE' : '✗ HAY FALLOS'} — ${ok + fail} verificaciones, ${fail} fallos\n`)
process.exit(fail === 0 ? 0 : 1)
