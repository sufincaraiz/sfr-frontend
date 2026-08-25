/**
 * DETECTOR DE AFIRMACIONES DE VALOR FUTURO — lógica pura
 * ======================================================
 *
 * NO IMPORTA NADA, deliberadamente: `scripts/probar-vigilancia.ts` lo carga
 * directamente con Node, y un solo `import` de `@/…` lo rompería porque Node no
 * resuelve los alias de TypeScript. Es la misma razón por la que
 * `busqueda-texto.ts` está separado de `tools.ts`: la prueba tiene que
 * ejercitar el código que corre en producción, no una copia suya.
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES Y QUÉ NO ES
 *
 * Esto NO es el método. El saneamiento del 22/08/2026 fue SEMÁNTICO —leer cada
 * frase preguntando qué afirma— y tenía que serlo: un patrón léxico sobre
 * «valorización» habría encontrado 4 de las 11 afirmaciones de las fichas. Las
 * otras siete no comparten una sola palabra con la primera.
 *
 * Lo que esto sirve es lo contrario y más modesto: avisar de que alguien
 * REINTRODUJO una de las formas YA CONOCIDAS, editando desde el admin entre
 * despliegue y despliegue. Un patrón no descubre la décima forma de esconderse;
 * sí avisa de que volvió la primera.
 */

/** Las formas ya conocidas. Ampliar solo con formas VISTAS, no imaginadas. */
export const VALOR_FUTURO =
  /valoriz|revaloriz|plusval|aval[uú]o|valor comercial|rentabilid|retorno de la inversi|inversi[oó]n segura|se valoriza|potencial de crecimiento|proyecci[oó]n inmobiliaria/i

/**
 * Frases que MENCIONAN el vocabulario para negarlo o para citar normativa. La
 * FAQ de La Vega dice que NO publicamos tasas de valorización, y el glosario
 * explica qué es un avalúo catastral: nombrar lo que no se hace, o definir un
 * término, no es afirmarlo. Sin esta excepción el aviso sería ruido diario, y
 * un aviso que suena todos los días deja de leerse.
 */
const LEGITIMAS =
  /no publicamos|solo puede emitirlo|avaluador inscrito|no puedo afirmar|no significa que|más responsable que prometer|seg[uú]n el IGAC|Ley 1673/i

/**
 * Devuelve la primera frase que afirma valor futuro, recortada para el aviso, o
 * null. Trabaja frase a frase para que el descargo de una no tape la
 * afirmación de la de al lado.
 */
export function primeraCoincidencia(texto: string | null | undefined): string | null {
  if (!texto) return null
  for (const frase of texto.split(/(?<=[.!?\n])\s+/)) {
    if (!VALOR_FUTURO.test(frase)) continue
    if (LEGITIMAS.test(frase)) continue
    return frase.trim().slice(0, 160)
  }
  return null
}
