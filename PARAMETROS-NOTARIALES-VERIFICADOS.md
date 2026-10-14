# Parámetros notariales 2026 — transcripción verificada

> **Qué es este archivo.** La transcripción de lo que el titular leyó en los PDF,
> artículo por artículo, para que exista en el repositorio antes de cargarse.
>
> **Qué NO es.** No es una fuente para el código. Ninguna cifra de aquí se
> importa ni se siembra: los parámetros los carga el titular **por el panel**,
> para que el camino que va a usar en 2027 quede probado desde el primer año.
> Esto es el papel contra el que se comprueba esa carga.
>
> Fecha de la transcripción: 2026-10-13.

## 1 · Notarial — RES-2026-000964-6 del 20 de enero de 2026

Vigencia: **desde el 1 de febrero de 2026** (art. 56), que deroga la Resolución
585 de 2025. Redondeo (considerandos): «a la centena más próxima».

| Artículo | Concepto | Valor |
|---|---|---|
| art. 2 lit. a) | Acto sin cuantía | $90.600 |
| art. 2 lit. b) | Acto con cuantía | $30.900 hasta una cuantía de $259.300; sobre el excedente, 3 × 1.000 |
| art. 2 parágrafo | Hoja de papel notarial (ambas caras, papel de seguridad incluido) | $5.600 |
| art. 4 a) | Certificaciones | $4.200 c/u |
| art. 4 b) | Notas de referencia | $2.500 |
| art. 5 | Copia auténtica, por hoja (incluye fotocopia y papel de seguridad) | $5.600 |
| art. 5 | Copia simple, por cara, **IVA incluido** | $700 |
| art. 5 parágrafo | Impresión de certificados web | $5.100 |
| art. 6 | Testimonio / autenticación, por firma o diligencia | $2.800 |
| art. 6 | Identificación biométrica, por usuario | $4.800 |
| art. 6 par. 1 | Hoja adicional en reconocimiento (10 % de la autenticación) | $280 |
| art. 6 par. 2 | Firma digital | $10.400 |
| art. 7 | Declaración extraproceso | $19.900 |

**art. 50** — los siete tramos del recaudo (ya sembrados en `catalogo.ts`, sin
respaldo). **Parágrafo:** 50 % SNR / 50 % Fondo Cuenta Especial del Notariado.

**art. 51 lit. a)** — la cuantía se liquida sobre el **mayor** entre el valor
convenido, el avalúo catastral, el autoavalúo y el valor del remate. Es el
respaldo de `calcularBaseNotarial`, y **solo de esa base**.

### El escalón del art. 2 lit. b) es literal

$30.900 hasta $259.300 y 3 × 1.000 sobre el excedente. El excedente no iguala
al mínimo hasta una cuantía de $10.559.300. Parece un error y no lo es: está
verificado contra el PDF. No se «corrige» por intuición aritmética. Ver el
bloque del escalón en `src/lib/notariales/tramos.ts`.

## 2 · Registral — RES-2026-001726-6

Vigencia: **desde el 2 de febrero de 2026** (art. 29, **modificado por la
RES-2026-001896-6 del 30 de enero de 2026**), que deroga la Resolución 0179 de
2025. Redondeo (art. 25): «a la centena más cercana».

> ⚠ El texto original del art. 29 dice «rige a partir de la fecha de su
> expedición» —29 de enero—. Esa fecha **es falsa hoy**: la modificó otra
> resolución que el propio artículo no menciona.

| art. 1 lit. b) — derechos de registro | Tarifa |
|---|---|
| ≤ 1.061,28 UVB (hasta $12.852.101) | $53.100 fijo |
| ≤ 15.918,96 UVB (hasta $192.778.606) | 9,11 × mil |
| ≤ 27.592,87 UVB (hasta $334.149.656) | 11,31 × mil |
| ≤ 40.858,70 UVB (hasta $494.798.857) | 12,60 × mil |
| > 40.858,70 UVB | 13,33 × mil |

- **art. 1 lit. b), inciso 2** — en transferencia de dominio, si la cuantía es
  inferior al avalúo catastral se liquida sobre el avalúo. **Dos valores, no los
  cuatro del art. 51 a) de la notarial.** Es el respaldo de
  `calcularBaseRegistro` y `calcularBaseOrip`.
- **parágrafo 8** — sistematización y conservación documental: 2 % «una vez
  calculado el valor del derecho para cada acto». La base es la **tarifa
  registral**, no el valor del inmueble. Confirma `BaseCalculo.TARIFA_REGISTRAL`.
- **art. 14 a)** — certificado de tradición y libertad: $24.300.
- **art. 15 a)** — ídem, por medios electrónicos: $23.000.

## 3 · UVT, UVB e IVA

| | Valor | Fuente |
|---|---|---|
| UVT 2026 | $52.374 | Resolución DIAN 000238 del 15 de diciembre de 2025, art. 1 |
| UVB 2026 | $12.110 | Resolución 3488 del 31 de diciembre de 2025, Ministerio de Hacienda, art. 1 (citada en la propia notarial, pág. 3) |

**Redondeo del IVA** — Concepto DIAN 003550 int 306 del 4 de marzo de 2026, que
invoca el art. 1.3.1.1.1 del Decreto 1625 de 2016. Tres cosas del texto que
cambian cómo se carga:

1. Es **permisivo**: «podrá aproximarse». Adoptarlo es decisión de Su Finca Raíz
   amparada en la norma. El respaldo se carga con `caracter: 'ADOPTADO'`, nunca
   diciendo que la norma lo exige.
2. «En cada operación» confirma el diseño: **un solo redondeo** sobre el total,
   nunca por línea.
3. El párrafo 8 exige «los soportes contables respectivos que permitan la
   comprobación de los valores asentados». Por eso `IVA_BRUTO` viaja junto a
   `IVA_LIQUIDADO`: es ese soporte, no una redundancia.

**Lo que el concepto no dice:** qué pasa en el empate exacto. El
medio-hacia-arriba sale por analogía con la doctrina del art. 577. Es criterio
**adoptado**, y está declarado como tal en `CRITERIOS_ADOPTADOS` (`iva.ts`).

## 4 · URL

| Norma | URL | Estado |
|---|---|---|
| Registral RES-2026-001726-6 | `cancilleria.gov.co/normograma/compilacion/docs/resolucion_superregistro_17266_2026.htm` | Compilación. Exige nota en el respaldo |
| Modificatoria RES-2026-001896-6 | `cancilleria.gov.co/normograma/compilacion/docs/resolucion_superregistro_18966_2026.htm` | Ídem |
| Notarial RES-2026-000964-6 | — (no publicada como página accesible) | Entra como **DOCUMENTO_ARCHIVADO** |

**La URL dejó de ser el requisito.** Un respaldo puede sustentarse con
`DOCUMENTO_ARCHIVADO`: el PDF oficial guardado, con su hash SHA-256, la entidad
emisora, de dónde se obtuvo y cuándo, y quién lo archivó. La autoridad se
comprueba contra la misma tabla, así que un PDF de una notaría particular sigue
sin valer. El PDF de la simulación imprime con cuál de los dos se sustentó cada
norma.

Las dos registrales se quedan como `URL_OFICIAL` sobre la compilación, con su
nota. Si aparece el PDF firmado de la registral, ese respaldo pasa a
`DOCUMENTO_ARCHIVADO` y la compilación queda como referencia secundaria.

`cancilleria.gov.co` quedó en `FuenteNormativa` como OFICIAL, marcada
`es_compilacion`, con la advertencia de que el texto auténtico está en el
**Diario Oficial 53.444 del 30 de marzo de 2026** y que la compilación tiene
erratas de digitación visibles. Añadida por el titular el 2026-10-13.

## 5 · Lo que esta transcripción deja a la vista y no está resuelto

- ~~La copia auténtica no está modelada.~~ **Resuelto (2026-10-13):** entra en
  v1 y no como opcional —sin copia auténtica la ORIP no inscribe—. Concepto
  `copia_autentica`, $5.600 por hoja, `precio_incluye_iva: false`, porque el
  art. 5 dice «IVA incluido» únicamente de la copia **simple**. Reparto 50/50
  por configuración, **sin** colgarle el C.C. 1862: las hojas del art. 2 son
  parte del instrumento, una copia expedida aparte por el art. 5 no.
- ~~La unidad de las autenticaciones.~~ **Resuelto (2026-10-13):** unidad «firma
  o diligencia», y la ayuda dice cuándo aplica —solo si una parte actúa por
  poder—. En una compraventa firmada ante el notario no hay autenticaciones.
- **Pendiente de decidir: el $280 del art. 6 parágrafo 1.** Hoy **no está
  modelado** en ninguna parte, y eso es correcto: el parágrafo lo ata a la
  diligencia de reconocimiento de firma y contenido, y es el 10 % de la
  autenticación por cada folio adicional de *ese* documento. No es una línea
  suelta. O se condiciona a que haya autenticación con reconocimiento, o se
  queda fuera de la v1.
- **Tarifas transcritas que no son conceptos del catálogo:** certificaciones,
  notas de referencia, impresión de certificados web, hoja adicional en
  reconocimiento, declaración extraproceso. No son de una compraventa; quedan
  aquí anotadas para no volver a leer el PDF cuando hagan falta.
- **El saneamiento del contenido.** El glosario dice «0,27 %» y el blog dice
  «0.27 %» y «0,3–0,5 %» en la misma página. La resolución dice 3 × 1.000 sobre
  el excedente. Va en el mismo lote que la publicación de la calculadora, o el
  sitio se contradice en una cifra que un comprador va a usar.
