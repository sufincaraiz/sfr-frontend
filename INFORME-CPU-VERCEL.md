# ⚠⚠ ESTE INFORME ESTÁ RETIRADO EN SU TESIS CENTRAL — 27 de octubre de 2026

**No lo leas como vigente.** Dos cosas de abajo son falsas, y la segunda la
repetía el siguiente encargo como lo único que se mantenía:

1. **El mecanismo estaba mal.** La ISR por tiempo **no tiene reloj propio**:
   pasado el intervalo no regenera nada; es la *siguiente petición* la que
   dispara la regeneración. Sin visitas, cero regeneraciones. El
   «145 × 24 = 3.480» de abajo es un techo, no una producción. Con el tráfico
   real (λ ≈ 1,29/h por ruta) el reloj de una hora produce como máximo
   ~1.961 regeneraciones/día: **no puede explicar lo observado.**

2. **«Las propiedades no revalidan nada» es FALSO.** Lo afirmé grepando
   `revalidatePath` literal en el archivo de la ruta, y la revalidación pasa
   por una librería: `revalidarPropiedad()` en `lib/revalidar-propiedad.ts`,
   llamada al crear, editar y borrar. Cubre ficha, catálogo, portada,
   en-condominio, **las tres familias de filtros con comodín**, `/nosotros` y
   la etiqueta `enlaces`. Es la regla del heurístico que ya tenía escrita
   —el grep no ve las capas de mapeo— y me la salté.

   Lo que **sí** falta en esa función: `/municipios/[slug]`,
   `/veredas/[slug]`, `/mac`, `/preguntas-frecuentes`, `/llms.txt`,
   `/registro-visita` y los sitemaps. Huecos reales, lejos de «nada».

El diagnóstico nuevo, con lo demostrado separado de lo indicado, está en
`## DIAGNÓSTICO 27-OCT` al final.

---

# Por qué el sitio consume 3h02m de CPU al mes

**Diagnóstico. Ningún cambio aplicado, ningún commit, ningún despliegue.**
26 de octubre de 2026.

---

## El hallazgo, en una frase

> El sitio regenera cada página una vez por hora, y recibe aproximadamente una
> visita por página por hora. Así que **casi todas las visitas pagan una
> regeneración completa** en vez de leer una copia ya hecha.

No es un defecto nuevo ni un pico: es el régimen normal del sitio desde que
existe, y por eso lleva plano en 6-7 min/día.

---

## La aritmética que lo demuestra

**Rutas ISR reales**, contadas contra producción (no estimadas):

| | |
|---|---|
| fichas de propiedad | 44 |
| municipios | 12 |
| veredas | 21 |
| artículos de blog | 10 |
| `propiedades/[filtro]` (7 tipos + 12 municipios) | ~19 |
| `propiedades/[filtro]/[municipio]` con inventario | 13 |
| en-condominio y sus municipios | ~7 |
| páginas fijas con `revalidate` (home, nosotros, directorio, mac, FAQ…) | ~10 |
| sitemaps + `llms.txt` | 7 |
| **total aproximado** | **~145** |

**Las 25 rutas con `revalidate` tienen todas el mismo valor: 3600** (una hora).
No hay ninguna excepción.

Con eso, el **techo teórico** de regeneraciones es `145 × 24 = 3.480/día`.

| medición | valor |
|---|---|
| escrituras ISR observadas | 78.728 / 30 días = **2.624/día** |
| techo teórico | 3.480/día |
| **porcentaje del techo que se está usando** | **75 %** |

**Tres de cada cuatro regeneraciones posibles están ocurriendo.** La caché casi
nunca sobrevive su hora.

Y las otras proporciones son el mismo hecho visto de lado:

- **2,03 lecturas por escritura** (159.560 / 78.728). Una página se sirve dos
  veces y a la tercera ya caducó.
- **~30 peticiones por ruta y día** (134.764 / 145 / 30) ≈ **1,25 por hora**.
  Justo el ritmo al que caduca la caché.
- **82 % de las invocaciones produce una escritura ISR**: la función se invoca
  *porque* la caché está vencida, y regenerar escribe.
- **71 % de las peticiones CDN llega a una función**: la consecuencia de lo
  mismo.

> El 71 %, el 82 % y el 2:1 **no son tres problemas. Son un solo problema
> contado tres veces.**

---

## Lo que NO es la causa

**Los despliegues no son el motor, y los datos lo descartan.** La hipótesis era
que nuestros propios despliegues inflaban el consumo. Contando la actividad:

| periodo | commits |
|---|---|
| 10–20 de octubre («tranquilo») | **44** |
| 22–26 de octubre («de muchos despliegues») | **19** |

Los días supuestamente tranquilos tuvieron **más del doble** de actividad. Y
hubo días enteros sin un solo commit (7–12, 17–18, 21, 24 de octubre). Si el
consumo lleva plano en 6-7 min/día **incluyendo esos días**, los despliegues no
explican el gasto.

Sí es cierto que un despliegue invalida la caché y produce un pico, y por eso
la orden de no desplegar es correcta para **poder medir**. Pero no es de donde
sale el consumo de base.

**Tampoco la extensión de Prisma ni el SHA-256**, como ya estaba descartado por
fechas: el consumo es anterior en dieciocho días.

---

## Lo que se puede hacer, por ahorro estimado

### 1 · Subir `revalidate` de 3600 a 86400 — **el 90 % del ahorro**

Las 25 rutas pasan de regenerarse 24 veces al día a una.

| | |
|---|---|
| **ahorro estimado** | escrituras ISR de ~2.624/día a ~145/día (**−94 %**) |
| | CPU: como el 82 % de las invocaciones son regeneraciones, la caída esperada está en el entorno del **70-80 %** |
| | de 3h02m/mes a aproximadamente **40-55 min/mes** |
| **riesgo** | ⚠ **no es despreciable, y está abajo** |

**⚠ NO SE PUEDE HACER SOLO. Ver el punto 2.**

### 2 · El eslabón que falta, y que hace seguro al punto 1

`revalidatePath` ya existe en **13 archivos**, así que la frescura no depende
del reloj… **excepto donde más importa**:

| ruta de escritura | ¿revalida? |
|---|---|
| `api/admin/blog/route.ts` | sí (7) |
| `api/admin/municipios/route.ts` | sí (4) |
| `api/admin/veredas/route.ts` | sí (4) |
| `api/admin/directorio/route.ts` | sí (4) |
| `api/admin/property-types/route.ts` | sí (11) |
| **`api/admin/properties/route.ts`** | **NO (0)** |
| **`api/admin/properties/[id]/route.ts`** | **NO (0)** |

**Las propiedades son el contenido que más cambia y el único importante que no
revalida bajo demanda.** Hoy eso no se nota porque el reloj de una hora lo tapa:
se edita una ficha y como mucho en 60 minutos aparece.

Si se sube `revalidate` a 24 h **sin arreglar esto**, editar una propiedad
tardaría hasta un día en verse. Sería cambiar un problema de dinero por uno de
negocio.

> **El `revalidate = 3600` está compensando una revalidación bajo demanda que
> falta.** Por eso el punto 1 y el punto 2 son un solo cambio, no dos.

| | |
|---|---|
| **ahorro propio** | ninguno directo |
| **lo que compra** | que el punto 1 no tenga coste de frescura |
| **riesgo** | bajo: es el mismo patrón ya usado en otros 13 archivos |

### 3 · Sitemaps y `llms.txt` a 86400 — pequeño y sin riesgo

Siete rutas que solo visitan rastreadores. Ya están contadas en el punto 1, pero
se pueden subir incluso más alto sin ningún riesgo de negocio.

### 4 · Las 7 consultas de la ficha de propiedad — secundario

La ficha hace 7 consultas por render; la home, 1. Con el punto 1 esas consultas
corren **24 veces menos**, así que el ahorro adicional de optimizarlas es
pequeño comparado con su coste y su riesgo.

**Recomendación: no tocarlo ahora.** Es trabajo real con riesgo de romper algo,
para recuperar una fracción de lo que ya recupera el punto 1.

### 5 · `JsonLd.tsx`, 808 líneas — medir antes de tocar

Es el sospechoso natural de los 114 ms, pero **no tengo ninguna medición que lo
señale**. Proponer reescribirlo sería adivinar.

Si después del punto 1 el CPU por invocación sigue alto, entonces vale la pena
medirlo. Antes, no.

---

## Lo que este informe no sabe

- **Cuánto cuesta cada ruta por separado.** Los 114 ms son un promedio sobre
  95.494 invocaciones. Puede que veinte rutas carguen con todo. No se puede
  saber desde el repositorio: haría falta el desglose por ruta del panel de
  Vercel.
- **Si el 71 % tiene alguna causa además del ISR vencido.** Las proporciones
  encajan sin necesidad de otra explicación, pero encajar no es demostrar. El
  middleware se revisó y es ligero —solo comprueba el host, y el JWT únicamente
  en `/admin`—, así que no parece ser él.
- **El recuento de rutas es aproximado** (~145). Las fuentes están contadas
  contra la base, pero el total depende de cuántas páginas fijas cuenten como
  ISR. Un error del 20 % no cambia la conclusión: seguiría usándose entre el
  60 % y el 90 % del techo.

---

## Lo que yo haría, y en qué orden

1. **Puntos 1 y 2 juntos, en un solo cambio**, cuando Leonel lo apruebe.
2. **Desplegarlo una vez y no volver a desplegar durante tres días**, para que
   la medición no la tape nuestro propio ruido.
3. **Mirar el consumo al tercer día.** Si no baja al entorno de 1,5-2 min/día,
   la hipótesis de este informe era incorrecta y hay que volver al dato — y en
   ese caso lo primero que pediría es el desglose de CPU por ruta.

---

# Apéndice · La tabla de dependencias (26 de octubre, antes de tocar nada)

**La corrección de alcance era correcta y cambia el trabajo.** El
`revalidate = 3600` no tapa el mapa incompleto de las propiedades: **tapa
todos**. Los 13 archivos que sí llaman `revalidatePath` nunca han sido puestos
a prueba, porque el reloj de una hora corrige cualquier olvido antes de que se
note. Al pasar a 24 h se destapan todos a la vez.

## 1 · Qué caduca cuando cambia cada cosa

Trazado por imports y por qué modelo consulta cada librería, no por intuición.

### Una PROPIEDAD cambia (alta, edición, venta, retirada)

| ruta que caduca | por qué |
|---|---|
| `/propiedad/[slug]` | su propia ficha |
| `/propiedades/[filtro]` · `/[filtro]/[municipio]` | `catalogo.ts` |
| `/propiedades/en-condominio` y sus municipios | `catalogo.ts` |
| `/municipios/[slug]` | consulta `property` directamente |
| `/veredas/[slug]` | consulta `property` + `faq-veredas` + `catalogo` |
| `/` (portada) | `cifras-derivadas`, `cobertura`, `respuestas-directas` |
| `/nosotros` · `/mac` · `/preguntas-frecuentes` · `/llms.txt` | los cuatro leen datos de propiedades |
| `/registro-visita` | consulta `property` |
| `/sitemap-propiedades.xml` · `/sitemap-imagenes.xml` · `/sitemap-paginas.xml` | los tres |

**13+ familias de rutas por una sola edición.**

### Un MUNICIPIO cambia

`/municipios/[slug]`, `/municipios`, `/`, `/propiedades/[filtro]/[municipio]`,
`/veredas/[slug]` (malla), `/mac`, `/llms.txt`, `/sitemap-municipios.xml`,
`/sitemap-paginas.xml`.

### Una VEREDA cambia

`/veredas/[slug]`, `/veredas`, `/propiedades` (catálogo),
`/municipios/[slug]` (vía `related-properties`), `/sitemap-paginas.xml`.

### Un ARTÍCULO cambia

`/blog/[slug]`, `/blog`, `/blog/pagina/[page]`, `/blog/tags/[tag]`,
`/blog/categorias/[categoria]`, `/sitemap-blog.xml`, `/sitemap-paginas.xml`.

## 2 · Lo que revalida hoy cada archivo, y sus huecos

| archivo | revalida hoy | **huecos** |
|---|---|---|
| **`admin/properties/route.ts`** | **nada** | **TODO: las 13 familias de arriba** |
| **`admin/properties/[id]/route.ts`** | **nada** | **TODO** |
| `admin/completar-fichas` | `/propiedad/[slug]`, `/propiedades` | portada, municipio, vereda, filtros con municipio, los 3 sitemaps, llms.txt |
| `admin/blog` | `/blog`, `/blog/[slug]` | paginación, tags, categorías, `sitemap-blog.xml`, `sitemap-paginas.xml` |
| `blog-writer/posts` | `/blog`, `/blog/[slug]` | lo mismo |
| `admin/municipios` | `/municipios`, `/municipios/[slug]`, `/` | filtros por municipio, veredas, mac, llms.txt, 2 sitemaps |
| `admin/veredas` | `/veredas`, `/veredas/[slug]`, `/propiedades` | `/municipios/[slug]`, `sitemap-paginas.xml` |
| `admin/directorio` | `/directorio` | `sitemap-paginas.xml` |
| `admin/cifras-publicas` | `/`, `/nosotros`, `/llms.txt` | `/mac`, `/preguntas-frecuentes` |
| `admin/registro-visita` | `/registro-visita` | — |
| `admin/property-types` | **9 rutas, con comodín `[slug]`** | el más completo de todos |
| `admin/finanzas/*` (2) | solo rutas de `/admin` | no afectan al sitio público |

**El patrón que importa:** `property-types` —lo que casi nunca cambia— es el
único con el mapa completo, y usa `revalidatePath('/propiedad/[slug]', 'page')`
para alcanzar todas las rutas de un patrón de una vez. **Ese es el mecanismo que
le falta a los demás**, y ya está probado en el proyecto.

## 3 · Las ~19 rutas de filtros: la pregunta del CONJUNTO

Cuando una propiedad se publica o se vende, no cambia solo el contenido de una
página: **cambia qué combinaciones existen**. Hoy hay 13 combinaciones con
inventario, de 7 tipos y 6 municipios.

- **Nada revalida ese conjunto** cuando se toca una propiedad —porque las rutas
  de propiedades no revalidan nada en absoluto—.
- Una combinación **nueva** se genera sola en la primera visita (`ISR` bajo
  demanda), así que ese lado no preocupa.
- Una combinación que **se queda sin inventario** seguiría sirviendo una página
  con propiedades vendidas hasta que caduque el reloj. Con 3600, una hora. Con
  86400, **un día entero**.

`revalidatePath('/propiedades/[filtro]/[municipio]', 'page')` lo resuelve, y es
exactamente lo que ya hace `property-types`.

## 4 · El camino que nadie cubre: editar la base directamente

**No existe ningún endpoint de revalidación manual.** Comprobado.

Hoy eso no duele porque el reloj de una hora corrige cualquier cambio hecho por
fuera del panel —en el panel de Railway, con un guión, con `psql`—. **Con 86400
dejaría de corregirse durante un día y no habría forma de forzarlo.**

Esto es un requisito del cambio, no un extra:

> Antes de subir el reloj hace falta una forma de decir «revalida todo», y tiene
> que estar protegida igual que los crons (`CRON_SECRET`), porque una ruta que
> invalida la caché entera es una forma de hacerle gastar CPU al proyecto.

## 5 · El orden que se desprende

1. **Completar la revalidación bajo demanda** en los 10 archivos con huecos,
   usando el patrón de comodín de `property-types`.
2. **Añadir la revalidación manual protegida**, para el camino de la base.
3. **Y solo entonces subir el reloj a 86400**, como red de seguridad.

Un solo commit, un solo despliegue, revertible en una línea —el reloj—. Y el
número global está bien: lo que tiene que ser preciso es la revalidación bajo
demanda, no el reloj.

---

# LA PREDICCIÓN, escrita antes de desplegar · 26 de octubre de 2026

Una medición sin su línea base fechada no es una medición, es un número.

| | |
|---|---|
| **línea base (26 oct)** | **3h02m / 4h = 76 %**, ritmo ~7 min/día |
| **escrituras ISR observadas** | **2.624/día** (78.728 en 30 días) |
| lecturas/escrituras | 2,03 : 1 |
| invocaciones | 95.494 · 114 ms de CPU cada una |
| **predicción tras el cambio** | **~145 regeneraciones/día** y **1,5-2 min/día** de CPU |
| **condición de fracaso** | **si al tercer día no baja de 3 min/día, la hipótesis era incorrecta** |

Si se cumple la condición de fracaso, lo primero que hay que pedir es el
**desglose de CPU por ruta** del panel de Vercel, que es el dato que este
informe no tiene y que decidiría dónde mirar.


---

# DIAGNÓSTICO 27-OCT · sin código, sin commit, sin despliegue

## Descartado, por el EFECTO y no solo por el código

**CSP con nonce: NO.** No hay `nonce` en el código (la línea 206 de
`next.config.ts` dice literalmente que la CSP va sin nonce), ningún layout lee
`headers()` ni `cookies()`, y la cabecera servida tampoco lo trae. Tres
peticiones seguidas a la misma ficha: `X-Vercel-Cache: HIT` las tres,
`X-Nextjs-Prerender: 1`, y `Age` 2398 → 2401 → 2403 sobre **el mismo
objeto**. La ISR funciona.

**Bucle sitemap/`lastmod = ahora`: NO.** Los sitemaps usan fechas reales
(`updated_at`, frontmatter); `sitemap-propiedades` lo dice textual —«Nunca de
new Date()»—. IndexNow solo se dispara desde rutas de edición: las tres
menciones en una página y dos librerías son comentarios.

**Tabla de rutas del build:** 29 Static y 10 SSG con `Revalidate 1h`; solo dos
públicas `ƒ`: `/escribir` y **`/propiedades`**.

## Demostrado: invocaciones que NO son regeneraciones

**`/api/municipios` y `/api/property-types` nunca se cachean.** Son `GET()`
sin `revalidate` ni `dynamic`, y en **Next 15 los `GET` no se cachean por
defecto**. Las pide `SearchBar.tsx` en un `useEffect` al montarse.

Y `SearchBar` se monta **en el cajón móvil de la cabecera, que está siempre
en el DOM** (oculto con CSS y `aria-hidden`, no con `{open && …}`). Así que:

| página | llamadas a la API por carga |
|---|---|
| cualquiera que no sea la portada | **2** (el cajón) |
| … si el usuario hace scroll en escritorio | **4** (se monta la compacta) |
| la portada | **2** (la del hero) |

**`/propiedades` es dinámica** (lee `searchParams`) y el menú enlaza ahí con
filtros. Cada visita es un render.

En la muestra de logs, de 11 invocaciones de función orgánicas, **6 eran
esas dos APIs** y 1 el catálogo dinámico.

## Indicado, NO demostrado

- **Ráfagas con aspecto de rastreador**: cuatro fichas y tres filtros en ~50
  segundos (16:03:16–16:04:06 UTC), y tres sitemaps pedidos juntos. Sin user
  agent no se distingue un bot de una persona navegando rápido.
- **`/veredas/san-juan` con `Age: 18352`**: nadie la pidió en ~4 horas. Un
  barredor de todas las rutas cada ~65 min no lo permitiría. Es una ruta sola.

## La contradicción que no puedo resolver desde aquí

Si en la muestra el 55 % de las invocaciones son APIs que **no escriben ISR**,
el «82 % de invocaciones produce una escritura ISR» no cuadra. Una explicación
posible: que Vercel cuente **dos escrituras por regeneración** (el HTML y el
`.rsc`). **No lo he comprobado**, y la muestra son 50 líneas de 32 minutos.

## Lo que el instrumento no da

`vercel logs` devuelve **50 líneas como máximo** pida lo que pida, y su
filtro `--source` no se aplicó. No hay user agent en el JSON. El desglose de
24 h por ruta, user agent y ASN **solo está en Firewall**, y eso es de Leonel.

---

# DESPLIEGUE 1 · la lectura del resultado, ESCRITA ANTES (27 de octubre)

## Qué cambia

| | antes | después |
|---|---|---|
| `/api/municipios` | `ƒ` dinámica — una invocación por llamada | `○` estática, revalidación `1h` |
| `/api/property-types` | `ƒ` dinámica | `○` estática, revalidación `1h` |
| buscador del cajón móvil | montado en **cada** carga de página | montado solo con el cajón **abierto** |

Comprobado con el mismo instrumento en los dos lados: la tabla de rutas del build
de producción de esta mañana (`ƒ`) y un build local contra la base real (`○ 1h`),
este último con **cero escrituras** bloqueadas durante el render.

**No se toca el reloj de las páginas** (siguen en 3600) **ni el mapa de
dependencias** (los siete huecos de `revalidarPropiedad()` van después).

## La línea base

> ⚠ **PENDIENTE.** No la puedo medir: `vercel metrics` exige *Observability
> Plus* (Pro/Enterprise) incluso para la consulta mínima, y `vercel usage`
> devuelve 404 en Hobby. Hace falta que Leonel la lea en **Usage, filtrado por
> el proyecto `sfr-frontend`** (no por el equipo): invocaciones/día y CPU
> activa/día, de los últimos días.
>
> **No se despliega hasta que este número esté escrito aquí.**

| | |
|---|---|
| invocaciones/día (proyecto, producción) | **______** |
| CPU activa/día | **______** |
| fecha y hora de la lectura | **______** |

## Cómo se lee el resultado — escrito antes de desplegar

| si las invocaciones/día… | entonces |
|---|---|
| **caen por debajo de ~1.500** | era **(B)**: invocaciones que no eran regeneraciones. Cerrado. |
| **caen poco o nada** | es **(A)**: un barredor. Entonces sí se piden las capturas de Firewall |

Un día de datos basta para ver la dirección; dos, para confirmarla.
