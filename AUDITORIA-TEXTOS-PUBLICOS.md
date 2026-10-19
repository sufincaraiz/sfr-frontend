# Auditoría de los textos públicos — inventario, sin arreglar nada

> ## ESTADO AL 2026-10-16, tarde
>
> Este documento es un inventario y **también es un texto que puede quedarse
> viejo** — la ironía está a la vista, así que lleva su propio estado:
>
> | | estado |
> |---|---|
> | #1 «entrenar nuestros modelos» | **cerrada** 19-oct: la viñeta dice ahora solo «mejorar la experiencia de navegación», y §2 declara que **no se entrena ningún modelo** y que el contenido se transmite a Anthropic como encargado |
> | #2 «chat de texto o voz» | **cerrada** 19-oct: «por escrito, en el sitio web o por WhatsApp» |
> | #3 Google Analytics en la política de cookies | **cerrada** 19-oct: la política dice qué cookies hay —solo sesión con clave— y declara explícitamente que **no hay GA ni analítica** |
> | #4 el aviso de `/registro-visita` | **corregido el valor por defecto + vigilancia diaria del texto real**. Falta que el titular lo cambie en el panel: el texto que se publica vive en la base. |
> | #5 conversaciones «almacenadas temporalmente» | **cerrada** 19-oct **con código**: purga a 12 meses implementada (`retencion-conversaciones.ts`) y el texto dice el plazo real |
> | #6 qué cookies son necesarias | **cerrada** 19-oct: nombra las tres sesiones reales y dice que el buscador y Mac no ponen ninguna |
> | #7 «se eliminará toda la información» sin herramienta | **cerrada** 19-oct: el texto dice que **lo hace una persona, registro por registro**, nombra los tres registros y promete constancia escrita con la fecha y dónde se buscó |
> | #8 la frase que nacía falsa (política §4) | **corregida**, y los tres requisitos quedaron escritos en el esquema |
> | las fechas en UTC | **corregidas las 10**, y el detector aprendió el origen |
>
> **Las siete están cerradas.** Seis eran redacción; la de las conversaciones
> pidió código —una purga a doce meses— porque publicar «se conservan
> indefinidamente» habría sido cierto y peor.
>
> Lo que queda **medido y aplazado**, no cerrado: `JsonLd.tsx` y los seis
> archivos vivos de finanzas. Se imprimen por nombre en cada build.

**2026-10-16.** Tres días de auditoría de código con cuatro instrumentos, y los
textos publicados no los había revisado nadie. El primero que se miró —la
política de tratamiento de datos— **mentía**.

> **Un texto público es código que nadie compila.** Afirma cosas sobre el
> sistema, se lee literalmente —un cliente, un contador, una autoridad— y
> **ningún build lo contradice**.

**Esto es un inventario, no un arreglo.** Ninguna palabra de los textos se
cambió al hacerlo, salvo la sección 4 de la política, que se corrigió antes y
por separado.

---

## 0 · Lo primero: este inventario NO tiene población automatizable

El inventario de decisiones pudo dar dos números —69 decisiones, 12 vigiladas—
porque la población se **deriva del código**: comparaciones, signos, redondeos,
órdenes. La prosa publicada no tiene sintaxis. No hay forma de pedirle a un
guion «cuenta las afirmaciones sobre el sistema», porque una afirmación puede
estar en un adjetivo, en un tiempo verbal o en una lista con viñetas.

**Y eso es exactamente por qué esta superficie es la que no tiene instrumentos.**
Las cuatro clases de defecto que sí se vigilan en el contenido publicado
—valor futuro, hechos adversos, cifras infladas, promesas— se vigilan porque
alguien escribió a mano la lista de frases que las delatan. Nadie escribió la
lista de «lo que el sistema dice que hace».

Así que las dos cifras honestas hoy son: **archivos leídos completos** y
**divergencias encontradas**. La población total queda abierta.

## 1 · Lo leído, completo y sin grep

| archivo | líneas | leído |
|---|---|---|
| `src/app/politica-tratamiento-datos/page.tsx` | 173 | **completo** |
| `src/app/politica-de-cookies/page.tsx` | 58 | **completo** |
| `src/app/terminos-y-condiciones/page.tsx` | 131 | **completo** |
| `src/app/eliminacion-de-datos/page.tsx` | 90 | **completo** |
| `src/app/registro-visita/page.tsx` + `RegistroVisitaForm.tsx` (casillas) + `src/lib/registro-visita.ts` (textos por defecto) | ~320 | **completo** |
| `src/components/layout/Footer.tsx` | 264 | **completo** |
| `src/app/nosotros/page.tsx` | 267 | **completo** |
| `src/app/mac/page.tsx` | 352 | **PARCIAL** — solo el bloque «qué datos trata» y la ficha técnica |

**7 completos + 1 parcial.** Lo que falta se lista en §5.

## 2 · Las divergencias: tres estados

### NO LO HACE — 3 vivas (+1 ya corregida)

| # | dónde | lo que dice | lo que hay |
|---|---|---|---|
| 1 | política §1, finalidades | «**entrenar nuestros modelos** de atención al cliente» | **No se entrena ningún modelo.** Se llama una API de terceros; no hay ajuste fino, ni dataset, ni nada que se entrene. Es una finalidad declarada que **amplía** lo autorizado sin que exista el tratamiento. |
| 2 | política §2 | «ya sea vía chat de texto **o voz**» | **Mac no tiene voz.** No hay reconocimiento ni síntesis de audio en el widget ni en el agente. |
| 3 | cookies §2 | «Cookies de **Rendimiento y Análisis**… utilizando herramientas como **Google Analytics**» | **No hay Google Analytics ni ninguna cookie analítica.** Cero referencias a `gtag`/GTM en todo el proyecto. |
| — | política §4 | el enlace de consulta contable, en presente | **Corregido el 2026-10-16**, redactado en futuro y con la constancia de que no se ha generado ninguno. |

### LO HACE DISTINTO — 4

| # | dónde | lo que dice | lo que hace |
|---|---|---|---|
| 4 | `/registro-visita`, el aviso azul | «no se publican ni **se comparten con terceros**» | **Sí se comparten**: `visitantesDe()` entrega **nombre y cédula** de cada visitante al propietario por el enlace con PIN. ⚠ Lo grave es la forma: la **casilla de consentimiento**, tres centímetros más abajo, lo dice bien («incluido que mi nombre y número de documento puedan compartirse con el propietario»), y la política §3 también. **El único texto que miente es el tranquilizador** — y es el único de los tres **editable desde el panel** sin desplegar. |
| 5 | política §2 | el contenido de las consultas se «almacena **temporalmente**» | **Se almacena sin plazo.** `conversations` y `messages` no tienen purga ni anonimización: no hay cron, no hay retención declarada, no hay borrado. Las visitas sí tienen dos años; las conversaciones, nada. |
| 6 | cookies §2 | las necesarias son «esenciales para… **usar el buscador** de inmuebles y **comunicarte con el Agente Mac**» | Las únicas cookies propias son de **sesión**: `admin`, `blog_writer_token` y la del enlace del dueño. **El buscador y Mac no ponen ninguna cookie.** La descripción es plausible y falsa. |
| 7 | `/eliminacion-de-datos` | «se eliminará **toda** la información personal asociada a ti en nuestros sistemas» en 15 días hábiles | **No existe ninguna herramienta** que localice y borre a una persona a través de `leads`, `conversations`, `messages`, `visitas` y los registros. Sería un barrido manual, tabla por tabla, hecho de memoria. El compromiso es cumplible; **el sistema no ayuda a cumplirlo y no deja constancia de haberlo hecho**. |

### UNA OCTAVA, Y NACÍA FALSA — la encontró el titular en la corrección misma

La sección 4 reescrita decía: *«no contendrán datos personales de clientes ni de
visitantes»*. **Falso antes de existir.** Los egresos llevan nombre y NIT del
proveedor, y un extracto de egresos los muestra; y no puede no mostrarlos,
porque **sin la identificación del tercero no se elabora una declaración
tributaria** —es literalmente lo que el formulario del contador nos pide por
cada proveedor—.

> **Una promesa sobre una función que no existe no es una descripción: es un
> requisito.** Restringe cómo se puede construir, y si la restricción es
> imposible, la función nacerá incumpliendo su propia política. Esta era
> imposible: el enlace sin NIT no sirve para lo que se pidió.

Elegido **corregir la frase, no la función**: la política dice ahora que el
extracto **sí** incluye nombre o razón social y documento o NIT de clientes y
proveedores, que ese dato es indispensable, y que **no** expondrá el registro de
visitas ni las conversaciones con Mac —otra finalidad—. Más un párrafo nuevo: el
contador será **encargado del tratamiento** (Ley 1581), con finalidad limitada,
reserva y prohibición de cesión.

Y lo que queda escrito **como requisito, no como frase**: los tres puntos van en
el comentario de `EnlaceContador`, y el único de los tres que se puede leer en
el código —que la consulta no toque `visita`, `conversation` ni `message`— lo
comprueba `verificar-enlace-contador.mjs` el día que la ruta exista.

### LO HACE — el resto de lo leído

Todo lo demás de los siete archivos se comprobó y **se cumple**. Lo que merece
decirse porque podía fallar y no falla:

· política §3 (registro de visitas) es **precisa, campo por campo**: enumera los
  seis datos, separa lo que va al propietario —nombre y documento— de lo que es
  interno —correo y celular—, y los dos años de retención **están
  implementados** (`purgarVisitasVencidas`, cron diario).
· Las dos casillas de consentimiento **no son editables desde el panel**, y el
  archivo explica por qué: los registros guardan dos booleanos, y un booleano
  solo acredita algo si el texto que se mostró fue siempre el mismo.
· `/nosotros` es la única página escrita ya bajo esta disciplina —«si una frase
  no se puede comprobar abriendo algo, no entra»— y **aguantó la lectura
  entera**: matrícula, año, municipios, veredas, disponibles y calificación son
  todos derivados.
· Mac: «web y WhatsApp, 24 horas, consulta el catálogo en tiempo real» → el
  webhook de WhatsApp existe y las herramientas consultan el catálogo. Cierto.
· El pie: horario y municipios salen de la misma fuente que el marcado.

### NO VERIFICABLE DESDE EL CÓDIGO — 2

No son defectos; son afirmaciones sobre **el mundo**, no sobre el sistema, y
solo el titular puede confirmarlas. Quedan anotadas para que no se cuelen como
«comprobadas»:

· «En consorcio con **Conarc**, de construcción» (`/nosotros`).
· «Matrícula mercantil **199483**, en operación desde **2006**» (todo el sitio).

## 3 · Y una divergencia de otra clase, encontrada al leer: la fecha de corte

Leyendo `/nosotros` apareció esto:

```ts
const corte = new Date().toISOString().slice(0, 10);
```

Es la **fecha de corte que se le muestra al lector** junto a los datos
verificables. `toISOString()` da el día **en UTC**: entre las 19:00 y la
medianoche de Colombia, la página publica **la fecha de mañana**.

**Hay siete sitios con esta forma**, seis de ellos publicados:

| archivo | qué fecha publica |
|---|---|
| `src/app/nosotros/page.tsx` | fecha de corte de los datos de la empresa |
| `src/lib/cifras-derivadas.ts` | fecha de corte de las cifras del catálogo |
| `src/lib/rangos-precio.ts` | fecha de corte de los rangos de precio |
| `src/lib/respuestas-directas.ts` | fecha de las respuestas directas (las que citan los modelos) |
| `src/app/llms.txt/route.ts` | la fecha del archivo que leen los modelos de IA |
| `src/lib/blog.ts` | fecha por defecto de un post sin `date` → va al `datePublished` del marcado |
| `src/app/admin/visibilidad-ia/page.tsx` | solo el **nombre de un CSV** descargado; interno |

⚠ **Y esto es un sexto punto ciego del detector de fechas, de la misma familia
que el quinto.** `inventario-fechas.mjs` reporta **0 lecturas** porque busca
**componentes locales** (`getFullYear`, `getMonth`, `getDate`). Pero
`toISOString().slice(0,10)` es correcto en un uso y falso en el otro:

· sobre una columna **DÍA PURO** —guardada a medianoche UTC— es la lectura
  correcta y **invariante a la zona**. Así se usa en todo el motor.
· sobre `new Date()` —un **instante**, el ahora— da el día de UTC, que **no es
  el día de Colombia** cinco horas al día.

> **El detector vigila la expresión; el defecto está en el uso.** La misma
> forma, dos significados opuestos según de dónde venga el valor. Es por esto
> que no lo veía: no le faltaba una regla, le faltaba saber qué entra.

El arreglo es `hoyEnColombia()`, que ya existe y ya se usa en el pie. **No se
tocó nada**: va con el lote de los textos, y el detector necesita la regla nueva
—`toISOString` aplicado a un instante, no a una columna— antes de que se cierre.

## 4 · Las dos cifras

| | |
|---|---|
| archivos de texto público **leídos completos** | **7** (+1 parcial) |
| divergencias **vivas** | **7** · 3 «no lo hace» · 4 «lo hace distinto» |
| ya corregidas en este lote | 1 (política §4) |
| afirmaciones sobre el mundo, no verificables desde el código | 2 |
| hallazgo colateral: días leídos en UTC y publicados | **6 sitios públicos** + 1 interno |

## 5 · Lo que falta leer, en orden de exposición

Declarado para que el punto ciego tenga tamaño, no para dejarlo en la cabeza:

1. `src/app/mac/page.tsx` — 352 líneas, **leído a medias**. Es la página que
   describe qué hace el agente; es la que más afirma sobre el sistema.
2. `src/components/seo/JsonLd.tsx` — 787 líneas. **Afirmaciones estructuradas**:
   lo que el sitio le declara a Google y a los modelos en `schema.org`
   (`areaServed`, `priceRange`, `openingHours`, `knowsAbout`, `offers`). Un
   `aggregateRating` o un `Service` de más es una afirmación falsa en formato
   que las máquinas leen literalmente.
3. `src/app/contacto/page.tsx` (158) y `src/app/vender-mi-finca/page.tsx` (146)
   — tienen formularios: lo que prometen sobre los datos que capturan.
4. `src/app/servicios/dron-y-fotogrametria/page.tsx` (240) — **borrador**:
   afirma un servicio cuyo marcado se retiene a propósito.
5. `src/lib/faq-data.ts`, `faqs.ts`, `faqs-territorio.ts`, `faq-municipios.ts`,
   `faq-veredas.ts`, `glosario-data.ts` — 783 líneas de respuestas publicadas.
6. `src/app/page.tsx` (224), `guia-inversion` (336), `directorio` (115),
   `propiedades` (217), `municipios` (214), `veredas` (211).
7. `content/blog/*.mdx` — 256 líneas, 3 artículos.

**Matiz importante sobre 6 y 7:** el contenido de mercado —cifras, valorización,
hechos adversos— **sí tiene instrumentos** (`probar-vigilancia.ts`,
`auditar-hechos-adversos.ts`, `probar-promocion.mjs`, la guarda de valor futuro
en el prompt de Mac). Lo que **no** tiene instrumento es la otra mitad: lo que el
sitio afirma **sobre sí mismo y sobre cómo trata los datos**. Las siete
divergencias de hoy son todas de esa mitad, y no es casualidad.

## 5.b · Las dos comprobaciones del 2026-10-19, al código y no de memoria

Antes de publicar el lote, el titular pidió verificar dos afirmaciones que los
textos nuevos hacen. Queda escrito **qué se buscó y dónde**, porque una
comprobación que no deja rastro hay que repetirla.

### ¿A qué proveedor llama Mac? — **Anthropic, confirmado**

| dónde | línea |
|---|---|
| `src/lib/agent/runMac.ts:19` | `const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` |
| `src/lib/agent/expert.ts:6` | idéntica —el modelo experto— |
| `src/lib/agent/tools.ts:12` | idéntica —el resumen del lead— |

Cliente `@anthropic-ai/sdk`, variable `ANTHROPIC_API_KEY`, **sin `baseURL`**, así
que el destino es el de la librería (`api.anthropic.com`): no hay pasarela ni
proxy. Y no hay ningún otro proveedor de modelo en el proyecto.

### ¿Hay más de un proveedor en el camino? — **SÍ: Meta, y faltaba**

El párrafo nombraba solo a Anthropic. **El canal de WhatsApp es la API de
WhatsApp Business de Meta**:

```
src/app/api/whatsapp/webhook/route.ts:88   graph.facebook.com/v21.0/{phoneId}/messages
src/lib/whatsapp.ts:56                     graph.facebook.com/v21.0/{phoneId}/messages
```

Todo mensaje de ese canal **entra desde Meta y sale por Meta**, así que Meta ve
el texto completo y el número de teléfono. Y no es teórico —medido contra
producción el 2026-10-19—:

| canal | conversaciones |
|---|---|
| WEB | 71 |
| WHATSAPP | **45** |

Añadido a la §2 un párrafo propio para Meta. **Lo encontró la pregunta del
titular, no la auditoría:** al corregir «entrenar modelos» nombré al proveedor
que sí ve el texto y me quedé ahí, sin preguntarme **por dónde llega** el texto.

> **Nombrar a un destinatario y detenerse es peor que no nombrar a ninguno:**
> una lista incompleta se lee como completa.

Lo que **no** ve el texto, comprobado: Upstash Redis guarda solo claves de
límite de tasa y una marca de tiempo (`redis-salud.ts:64`); no hay transcripción
de voz —Mac no tiene voz—; y Telegram aparece en el `enum` del canal y en un
enlace de contacto, pero **no hay ninguna ruta ni llamada a su API**: 0 filas.

### ¿La afirmación de cookies cubre a Meta? — **limpio**

Buscado en `src/` y `public/`: `connect.facebook.net`, `fbq(`, `fbevents`,
`facebook-jssdk`, `FB_PIXEL`, `dataLayer`, `gtag`, GTM. **Cero resultados.**
No hay píxel de Meta ni SDK de Facebook ni capá de analítica.

Y el inventario completo de dominios externos referenciados, para que la frase
del §2 se pueda contrastar con algo y no con un recuerdo:

| tercero | qué es | ¿pone cookies? |
|---|---|---|
| `www.youtube.com` | vídeos incrustados | sí — **nombrado** |
| `www.google.com` / `maps.google.com` | mapa incrustado | sí — **nombrado** |
| `tour.panoee.net`, `app.panoee.com` | recorridos 360° | sí — **nombrado** («recorridos 360°») |
| `www.tiktok.com` | vídeos | sí — **nombrado** |
| `fonts.googleapis.com`, `fonts.gstatic.com` | tipografías | no pone cookies (sí transmite la IP) |
| `cdn.jsdelivr.net` | `model-viewer` y `pannellum` | no pone cookies |
| `res.cloudinary.com`, `api.cloudinary.com` | imágenes | no pone cookies |
| `graph.facebook.com` | WhatsApp Business, **servidor** | no toca el navegador |
| `www.facebook.com`, `instagram.com`, `wa.me`, `t.me` | enlaces salientes del pie | no, hasta que se pulsan |

Así que la frase del §2 se queda tal cual: **es cierta**. Lo que queda anotado
es que las tipografías y los CDN **transmiten la IP** a un tercero sin poner
cookies, que es otra cosa y no es lo que ese numeral promete.

## 6 · Las deudas al tablero — anotadas, no construidas

2026-10-19, por decisión del titular: **se anotan y no se hacen**.

1. **TRANSFERENCIA INTERNACIONAL DE DATOS — pregunta para un abogado, no para
   nosotros.** La §2 dice ahora **a quién** se transmite el contenido (Anthropic,
   Meta) y **no dice que sale del país**, que bajo la Ley 1581 y el Decreto 1377
   es una obligación **aparte** de declarar al encargado. Ni el titular ni quien
   escribe esto son abogados, así que **no se redacta de oído**: la pregunta es
   qué exige declarar y con qué base de legitimación. Alcance real medido: 45
   conversaciones por WhatsApp y 116 en total.
2. **CONSTANCIA DEL LADO DEL RESPONSABLE.** El principio de *responsabilidad
   demostrada* no se cumple cumpliendo: hay que **poder probarlo**. Hoy la única
   constancia de una eliminación la tiene **el solicitante**. Es una tabla
   —fecha, qué se buscó, quién lo ejecutó— y no existe.
3. **EL VALOR DE MERCADO DE LAS PREGUNTAS, Y LA FORMA CORRECTA DE QUEDARSE CON
   ÉL.** Borrar el texto a los doce meses es la decisión correcta de privacidad,
   pero saber qué preguntan los compradores del Gulivá vale dinero y eso se
   pierde. La forma correcta **no es conservar el texto un año**: es extraer el
   **agregado en el momento en que llega** —tema, municipio, rango de precio— y
   guardar eso, que no identifica a nadie y **no caduca**.

   > Y la razón por la que el agregado al llegar es mejor que separar el texto
   > después la dio el titular corrigiendo su propia propuesta: **el texto de una
   > conversación identifica a su autor por sí solo** —«soy Juan, el de la finca
   > de la vereda»— y separarlo de forma fiable no se puede. Un «corpus
   > anónimo» de texto libre no es anónimo: es el mismo dato en otra tabla.

## 6 · La regla

> **Un texto público es código que nadie compila.** Afirma cosas sobre el
> sistema, se lee literalmente, y ningún build lo contradice. Tres rasgos lo
> hacen peor que un comentario desactualizado: **no tiene tipos** —nada falla si
> deja de ser cierto—; **se lee en presente por defecto** —el tiempo verbal es
> su única marca de estado, y es invisible al revisarlo por encima—; y
> **envejece por el lado del sistema** —nadie lo toca y se vuelve falso igual,
> porque lo que cambió fue el código—.

Y el método, que es el que falló hoy y el que lo encontró:

> **Buscar el tema, no la frase.** La política no repetía el comentario del
> esquema: decía lo mismo con otras palabras, y por eso el grep la pasó por
> alto. Las siete divergencias de este inventario salieron de **leer**, ninguna
> de buscar.
