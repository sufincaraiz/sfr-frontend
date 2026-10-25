# De qué clase de fuente salió un respaldo

**Propuesta, no implementación.** Nada de esto está aplicado. Incluye una
migración, y las migraciones se piden.

---

## Por qué ahora y no después

**Hoy hay 0 respaldos en la base.** Un campo obligatorio nuevo en
`RespaldoNormativo` no necesita retrocarga, no necesita valor por defecto y no
necesita decidir qué hacer con lo viejo: no hay nada viejo.

El día que Leonel cargue las 53, habrá 53 respaldos sin clase y nadie va a
volver sobre ellos. Es la diferencia entre cinco minutos y una semana — y la
semana no se haría.

---

## 1 · La pregunta: ¿lo distingue ya `tipo_evidencia`?

**No.** Fui a mirarlo y distingue otra cosa:

| campo | qué distingue | ejes |
|---|---|---|
| `tipo_evidencia` | **el soporte** | `URL_OFICIAL` · `DOCUMENTO_ARCHIVADO` |
| `caracter` | **qué manda la norma** | `EXIGIDO` · `ADOPTADO` |
| `FuenteNormativa.es_compilacion` | la clase de autoridad… **pero en la fuente, no en el respaldo** | booleano |

Así que la distinción **existe a medias** y tiene tres problemas:

**a) Un booleano no puede expresar tres clases.** Hay tres, no dos: el Diario
Oficial (texto auténtico), el emisor en su propio sitio, y un normograma. Hoy
los dos primeros se leen igual.

**b) No es duradera.** El respaldo **no guarda la clase**: se deduce por
relación con `fuentes_normativas` cada vez que se valida. Si alguien cambia
`es_compilacion` en una fuente, **todos los respaldos históricos cambian de
significado en silencio**, y la nota obligatoria solo se comprobó al escribir.
Es la regla del proyecto sobre desnormalizar la decisión en el momento en que
se toma.

**c) Y hay un hueco, que además está afirmado como correcto.** En
`guardas.ts:237`:

```ts
if (tipoDeEvidencia(r) === 'URL_OFICIAL' && fuente.es_compilacion && !nota) { … }
```

La nota **solo se exige a las URL**. Un PDF archivado cuya fuente es una
compilación se escapa entero, y el arnés lo asegura con todas las letras:
*«a un documento archivado no se le exige la nota de compilación»*
(`probar-notariales.mjs:239`).

**No es un olvido: es una decisión**, y su razón está escrita en el esquema —un
PDF firmado, con radicado y sellos, vale por sí mismo—. Pero la decisión
confunde **«PDF archivado»** con **«PDF original firmado»**. Un PDF descargado
del normograma de Cancillería es un PDF archivado, no es el original, y **lleva
las erratas de digitación que la propia ficha de esa fuente declara**. Hoy
entraría sin nota.

---

## 2 · La clasificación de los 8 dominios

Pedida antes de tocar nada. Lo que hay en la base **frente a** lo que creo que
son:

| dominio | hoy | lo que creo que es | por qué |
|---|---|---|---|
| `supernotariado.gov.co` | EMISOR | **EMISOR** | expide las resoluciones registrales |
| `dian.gov.co` | EMISOR | **EMISOR** | expide resoluciones y conceptos |
| `cundinamarca.gov.co` | EMISOR | **EMISOR** | expide ordenanzas y decretos departamentales |
| `corteconstitucional.gov.co` | EMISOR | **EMISOR** | publica sus propias sentencias |
| `funcionpublica.gov.co` | EMISOR | **COMPILACIÓN** | su propio nombre lo dice: «gestor normativo». No expide resoluciones notariales ni registrales: las recopila |
| `suin-juriscol.gov.co` | EMISOR | **COMPILACIÓN** | es el Sistema Único de Información Normativa. Compilar es literalmente su función |
| `secretariasenado.gov.co` | EMISOR | **COMPILACIÓN** | publica textos **consolidados** de leyes. Cerca del origen para una ley, pero no es el texto del Diario Oficial, y para una resolución no es emisor de nada |
| `cancilleria.gov.co` | COMPILACIÓN | **COMPILACIÓN** | la única ya marcada, y con advertencia de erratas |

**Tres de ocho están mal clasificadas**, y las tres en la dirección cómoda:
marcadas como emisor cuando son recopiladores.

### Y el que falta

**El Diario Oficial no está en la lista blanca.** La advertencia de Cancillería
dice que el texto auténtico está en el **Diario Oficial 53.444 del 30 de marzo
de 2026**, y la Imprenta Nacional —`imprenta.gov.co`, donde vive el Diario—
**no es una fuente aceptada**.

De las ocho autoridades que aceptamos hoy, **ninguna es donde vive el texto
auténtico**, y una declara por escrito que tiene erratas. Eso no es un detalle
de catálogo: es que el escalón más alto de evidencia no se puede usar.

---

## 3 · Lo que propongo

### Tres clases, no un booleano

```prisma
enum ClaseDeFuente {
  /// El texto auténtico. Diario Oficial / Imprenta Nacional.
  DIARIO_OFICIAL
  /// La autoridad que la expidió, en su propio sitio.
  EMISOR
  /// Un normograma o consolidador. Puede tener erratas y no es el emisor.
  COMPILACION
}
```

Y el orden importa: `DIARIO_OFICIAL > EMISOR > COMPILACION`. Un enum ordenado
permite preguntar «¿esta cifra se apoya en algo mejor que un normograma?», que
es la pregunta que hoy no se puede hacer.

### La clase se graba en el respaldo, no se deduce

```prisma
model RespaldoNormativo {
  …
  /// De qué CLASE de fuente salió, grabado al escribir y NO deducido después.
  /// Si se dedujera de `fuentes_normativas`, reclasificar un dominio cambiaría
  /// en silencio el significado de todos los respaldos históricos.
  clase_fuente ClaseDeFuente
}
```

**Obligatorio, sin valor por defecto.** Un `@default` aquí sería exactamente el
patrón que llevamos dos semanas desarmando: el valor que significa «no se
decidió» leyéndose como una decisión.

### Y la guarda deja de mirar el soporte

```ts
// antes: solo las URL
if (tipoDeEvidencia(r) === 'URL_OFICIAL' && fuente.es_compilacion && !nota)
// después: la clase, venga como venga
if (r.clase_fuente === 'COMPILACION' && !nota)
```

Eso cierra el hueco del PDF descargado de un normograma, y **habrá que dar
vuelta a la verificación del arnés que hoy afirma lo contrario** — con su
comentario explicando por qué cambió, no borrándola.

---

## 4 · El SQL, para que se vea lo que correría

```sql
CREATE TYPE "ClaseDeFuente" AS ENUM ('DIARIO_OFICIAL', 'EMISOR', 'COMPILACION');

ALTER TABLE "fuentes_normativas" ADD COLUMN "clase" "ClaseDeFuente";
UPDATE "fuentes_normativas" SET "clase" = CASE
  WHEN "es_compilacion" THEN 'COMPILACION'::"ClaseDeFuente"
  ELSE 'EMISOR'::"ClaseDeFuente" END;
ALTER TABLE "fuentes_normativas" ALTER COLUMN "clase" SET NOT NULL;

-- Sin DEFAULT y NOT NULL de entrada: hay 0 filas, así que no hay retrocarga.
ALTER TABLE "respaldos_normativos" ADD COLUMN "clase_fuente" "ClaseDeFuente" NOT NULL;
```

**Toca `fuentes_normativas` (8 filas) y `respaldos_normativos` (0 filas).** No
borra nada y no cambia ninguna cifra. `es_compilacion` se deja de momento, para
no romper lo que lo lee, y se retira en otro lote.

**Las tres reclasificaciones y el Diario Oficial NO van en este SQL**, porque
son decisiones tuyas y no mías. Van después, cuando me digas cuáles aceptas.

---

## Lo que necesito

1. **¿Apruebas la migración?** Es la parte que vale, y es ahora o es una semana
   después.
2. **¿Aceptas las tres reclasificaciones** (`funcionpublica`, `suin-juriscol`,
   `secretariasenado` → COMPILACIÓN)?
3. **¿Se añade `imprenta.gov.co`** como `DIARIO_OFICIAL`? Mi recomendación es
   que sí, y que sea la clase preferida para cualquier norma publicada ahí.

No toco `schema.prisma` hasta que contestes: si lo cambio sin migrar, el cliente
de Prisma esperaría una columna que no existe y rompería el desarrollo local.

---

# Apéndice · La identidad del documento (2026-10-25)

Inspeccionado contra el esquema, no supuesto.

**Lo que hay:** `@@unique([ambito, referencia_id, campo])`, `url String?`,
`documento_hash String?`, y `hashDeBytes()` en `huella.ts`, ya probada.

## La hipótesis se sostiene en el fondo y se rompe al implementarla

Poner la identidad en la clave es correcto. Pero **no puede entrar como dos
columnas anulables**:

> En SQL, una restricción UNIQUE **no considera iguales dos NULL**. Si la clave
> fuera `(ambito, referencia_id, campo, documento_hash)`, cada respaldo de tipo
> URL —que no tiene hash— llevaría NULL ahí, y **la restricción dejaría de
> impedir nada para ellos**: el mismo respaldo se podría insertar sin límite.

Es la clase de defecto que llevamos la sesión entera cazando: una guarda que
parece puesta y no muerde. **Una sola columna `identidad_documento`, `NOT
NULL`**, calculada al escribir: el hash cuando hay documento archivado, la URL
normalizada cuando no. Así la restricción muerde siempre.

*(Postgres 15+ tiene `NULLS NOT DISTINCT`, que sería la alternativa. No he
comprobado si Prisma 5.22 lo expone, así que no lo propongo.)*

## El tercer caso: una URL es un lugar, no un documento

Las dos mitades de la identidad **no son la misma clase de cosa**. El hash
identifica unos bytes; la URL identifica dónde miraste. Falla en las dos
direcciones:

- **el mismo documento en dos URL** (con y sin `www`, dos rutas, un redirect) →
  se cuentan como dos lecturas independientes que no lo son;
- **la misma URL sirviendo otro contenido con el tiempo** —una compilación que
  se actualiza en su sitio— → se cuenta como una, y la lectura vieja pasa a ser
  silenciosamente una lectura del texto nuevo. Hoy lo único que ata un respaldo
  de URL a lo que había ahí es su `verificado_en`: **no guardamos el hash de lo
  que se descargó.**

De ahí la consecuencia: **la identidad por URL es un escalón más débil y no
puede contar por sí sola como segunda lectura independiente.** Lo que encaja
exactamente con que la independencia se declare y se firme.

## Y una consecuencia concreta del cambio de clave

`guardarRespaldo` hace `upsert` sobre `ambito_referencia_id_campo`. Con la
clave nueva ese upsert deja de identificar una fila: **habría que decidir si
reemplaza el respaldo de ese documento o añade uno nuevo**, y hoy el formulario
no distingue «corrijo esto» de «añado una segunda fuente». Es parte del lote.
