# Traspaso de sesión — Su Finca Raíz

> Pega este archivo (o adjúntalo) al abrir el chat nuevo. Está escrito para que
> una sesión que arranca en frío pueda continuar sin volver a preguntar nada.
>
> **Lo primero que debes hacer:** leer `AEO-DOCTRINA.md` y `CLAUDE.md`, que ya
> están en la raíz del repositorio. No hace falta que el titular los adjunte.

---

## 1. El proyecto

Sitio de producción de **Su Finca Raíz**, inmobiliaria de La Vega, Cundinamarca
(Provincia del Gualivá, Colombia).

| | |
|---|---|
| Stack | Next.js 15 (App Router), TypeScript, Prisma + PostgreSQL, Cloudinary |
| Despliegue | Vercel, dominio canónico `https://www.sufincaraiz.com` |
| Base de datos | PostgreSQL **18.4** en Railway (plan Hobby) |
| Repositorio | `sufincaraiz/sfr-frontend`, rama `main` |
| **Código local** | **`C:\sfr\frontend`** — NO en `G:\Mi unidad\...` |

### Reglas de trabajo que ya están establecidas

- **Luz verde antes de cada commit/push.** El titular aprueba antes de desplegar.
- **Dry-run antes de cada cambio de esquema**, y esperar su OK antes del `db push`.
- Verificar contra el **HTML servido** (`curl`), no contra el navegador: el
  navegador ejecuta JavaScript, el rastreador no siempre.
- Commits atómicos, mensajes en español, con el *porqué* y no solo el *qué*.
- Google Drive (`G:\`) rompe `npm install`; por eso el código vive en `C:\sfr`.
- **Ante un texto que el titular ya aprobó, aplicarlo** aunque no esté en la
  lista de tareas de ese turno.

### Compilar

```bash
cd /c/sfr/frontend
DATABASE_URL="$(grep '^DATABASE_URL' .env.local | cut -d= -f2- | tr -d '"')" \
BLOG_WRITER_USER=bloglavega BLOG_WRITER_PASSWORD='conocimiento2026*' \
npm run build
```

**Trampas conocidas:**
- Si hay un servidor de preview corriendo, `prisma generate` falla con `EPERM`
  al renombrar el motor de consultas. **Detén el servidor antes de compilar.**
- El build falla a veces con `PrismaClientKnownRequestError` o
  `PrismaClientInitializationError` durante el prerender: es saturación de
  conexiones con Railway, no del código. **Reintentar** y pasa.
- No hay Python en el entorno. Usar las herramientas de edición, no scripts.
- PowerShell aquí no admite `&&`; los here-strings necesitan `'@` en columna 0.
  Para mensajes de commit largos: escribir a un archivo y `git commit -F`.
- **Node en Git Bash resuelve `/tmp` como `C:\tmp`.** Para scripts auxiliares,
  usar rutas absolutas de Windows o el directorio de scratchpad.
- **`git add -p` no está disponible** (sin flags interactivos). Si un lote toca
  varios temas dentro de un mismo archivo, no se puede partir en commits por
  tema: hay que agrupar por archivo y ordenar para que cada commit compile.

### Railway se cayó y producción aguantó — por el cambio de caché

El 14 de agosto Railway estuvo degradado casi una hora: pings que fallaban,
latencia de 4-7 s frente a los ~100 ms normales, y varios builds abortados por
timeouts de 60 s en el prerender.

**Producción siguió sirviendo 200 todo el rato.** No por casualidad: el turno
anterior había sacado el catálogo del render dinámico y lo había devuelto a la
caché del borde. Antes de ese arreglo, `/propiedades`,
`/propiedades/[municipio]` y `/propiedades/[tipo]/[municipio]` servían
`no-store` y bajaban a Railway en CADA petición: con la base caída, el catálogo
entero —el hub del que cuelgan las 35 fichas— habría caído con ella.

Es el argumento a favor de cachear que **ninguna métrica de rendimiento habría
dado**: no se notaba en tiempos de carga, se notó el día que la base falló.

**Corolario operativo:** cuando Railway falle, el sitio público aguanta pero el
BUILD no. No desplegar sin build verde; esperar y reintentar. Las únicas páginas
que se degradan en vivo son las que siguen siendo dinámicas — hoy solo
`/propiedades` con filtros.

### ⚠ La clase de defecto que solo se ve con curl

Hay defectos que **no se notan en el navegador y lo degradan todo**. Ya van
tres, y los tres se encontraron mirando lo que el servidor devuelve, no la
pagina:

| Defecto | Síntoma en el navegador | Cómo apareció |
|---|---|---|
| `new Date()` en el sitemap | Ninguno | Leyendo el XML servido |
| Contadores que arrancan en `0` | Ninguno: la animación llega al valor | `curl` del HTML, sin ejecutar JS |
| `no-store` en el catálogo y en `/directorio` | Ninguno | Leyendo las **cabeceras** de respuesta |

El patrón común: el navegador **repara** el defecto al ejecutar JavaScript,
seguir la redirección o ignorar la cabecera. Un rastreador no.

**Regla operativa:** toda verificación incluye una pasada de `curl` sobre
producción mirando **tres cosas, no una**:

1. El **HTML servido** — sin JavaScript.
2. El **JSON-LD dentro de ese HTML** — parseado, no con `grep`: un `grep` mal
   calibrado sobre JSON-LD miente en las dos direcciones.
3. Las **cabeceras de respuesta** — `Cache-Control`, `X-Vercel-Cache`,
   `X-Robots-Tag`.

La tercera es la que nadie mira, y donde vivió un fallo durante toda la vida
del sitio.

### ⚠⚠ MAC LEE LA BASE EN TIEMPO REAL — toda migración lo afecta ANTES del despliegue

**Mac no usa el build: consulta la base en cada conversación.** Un `UPDATE` o un
cambio de esquema lo afecta **en el momento en que se ejecuta**, no cuando se
despliega el código. Entre el cambio de datos y el arreglo del agente, Mac está
respondiendo mal a clientes reales.

El caso que lo demostró: al dejar `condominio` de ser un tipo, el mapeo de
sinónimos de `tools.ts` seguía diciendo `condominio: ['condominio']`. Un cliente
que preguntara «¿tienen condominios?» recibía **cero resultados habiendo doce
inmuebles en condominio**, y empezó a fallar con el `UPDATE`, no con el deploy.

**Regla:** cualquier cambio de esquema o de datos exige revisar en el MISMO lote
el mapeo de sinónimos (`lib/agent/tools.ts`) y las herramientas del agente. No
después.

Esto convive con la regla de «no tocar a Mac sin pedirlo»: reparar una regresión
que un cambio propio causó **no** es modificar el agente, es devolverlo a donde
estaba. Se avisa y se documenta, pero no se deja roto.

### Los 13 slugs con prefijo de tipo viejo — DECISIÓN TOMADA: no se tocan

Tras reclasificar los tipos, trece slugs conservan un prefijo que ya no
corresponde: `condominio-lote-buenos-aires-…` con `type = lote`,
`finca-la-alborada-…` con `type = casa`, y once más.

**No se corrigen.** El coste —trece redirects 301 permanentes— supera al
beneficio:

- El `canonical` ya es correcto y apunta a la URL real.
- El tipo va **declarado** en el JSON-LD (`RealEstateListing`), donde un modelo
  lo lee sin tener que inferirlo de la URL.
- Un slug es una cadena opaca: no rompe nada, solo desorienta a quien lee la
  barra de direcciones.

Está anotado para que no se reabra en un barrido futuro y alguien decida
«arreglarlo».

### Tarifas normativas del glosario — NO son cifras sin fuente

Un barrido futuro de porcentajes las va a marcar. **No se retiran**: son cifras
normativas verificables en la ley colombiana, no afirmaciones de rendimiento.

| Cifra | Qué es |
|---|---|
| Arras 10 % | Uso habitual del mercado, en el glosario y el blog |
| Retención en la fuente 1 % | Sobre el valor de la escritura |
| Impuesto de registro 1 % | Tributo departamental |
| Derechos notariales 0,27 % | Regulados por la Superintendencia de Notariado |
| Plusvalía hasta 50 % | Lo que puede cobrar el municipio |
| Avalúo catastral 40–70 % | Proporción habitual frente al valor comercial |
| Comisión 5 % / 2,5 % | Términos del contrato en la propuesta comercial |

Lo que **sí** se retira es cualquier porcentaje de **valorización, rentabilidad,
retorno u ocupación**. Se retiraron quince; ver §4.

### ⚠ El error E252 del logo en `next dev` NO es del sitio

En el servidor de desarrollo, la portada lanza en consola:

```
Error: Image with src "/images/logo-su-finca-raiz-blanco.png" ...
next-image-missing-loader   (__NEXT_ERROR_CODE: E252)
```

**No es un fallo del sitio y no bloquea nada.** Comprobado el 22/08/2026:

| Dónde | Resultado |
|---|---|
| Producción (`sufincaraiz.com`) | 200, el logo servido normal |
| `npm run build` | EXIT=0, 172 páginas generadas |
| `next start` sobre ese build | **cero errores de consola**, el logo renderiza |
| HTML servido por `next dev` (curl) | 200, y NO contiene el error |
| Consola del navegador en `next dev` | E252 |

Es decir: **solo el bundle de CLIENTE en modo desarrollo**. El SSR aplica el
`loaderFile` correctamente; el cliente en dev no lo recibe y `next/image` se
queja de que no hay loader.

**Turbopack NO es la causa** — se probó a propósito con `next dev` a secas,
sin la bandera, y el error es idéntico. Fue la primera hipótesis y quedó
descartada.

Y `next.config.ts` ya declara **los dos** —`loader: 'custom'` Y
`loaderFile`—, que es el requisito de Next 15, con su comentario explicando
por qué hacen falta ambos. `src/lib/cloudinary-loader.ts` existe y tiene el
guard que devuelve intactas las rutas locales `/images/*`.

**Regla:** antes de perseguir un error de consola en `dev`, comprobar si
aparece en `next start` sobre un build de producción. Si no aparece ahí, no
está en el sitio.

### ⚠ Segmentos dinámicos con nombres distintos — el fallo que `next build` no detecta

**Next exige que un mismo nivel dinámico lleve el MISMO nombre en todas las
rutas hermanas.** Esto es ilegal:

```
src/app/propiedades/[municipio]/page.tsx
src/app/propiedades/[tipo]/[municipio]/page.tsx     ← [tipo] ≠ [municipio]
```

y produce `Error: You cannot use different slug names for the same dynamic path`.

**Lo peligroso es que `next build` pasa en verde**: 164 páginas generadas, cero
avisos, el listado de rutas impecable. El error solo aparece al SERVIR, y
entonces devuelve **500 a toda la rama**, no solo a la ruta en conflicto.

La solución es un nombre compartido y desambiguar por número de segmentos:

```
src/app/propiedades/[filtro]/page.tsx              ← un segmento  = municipio
src/app/propiedades/[filtro]/[municipio]/page.tsx  ← dos segmentos = tipo + municipio
```

Es el mejor argumento de todo el proyecto a favor de la regla de verificar
contra el **HTML servido**: aquí el build mintió por completo.

---

## 2. Qué se construyó antes del trabajo de AEO

### Sistema de registro de visitas (3 fases, en producción)

**Fase 1** — Formulario público en `/registro-visita`. Captura nombre, cédula,
inmueble, correo, celular y municipio de procedencia, con dos casillas de
consentimiento (Ley 1581 de 2012). El texto de las casillas es **FIJO**, no se
toca. Rate limit propio con prefijo `visita:ip`.

**Fase 2** — El registro enlaza contra el catálogo: selector con buscador
(31 propiedades + «Otro» para inmuebles de colegas). FK `propiedadId` con
`onDelete: SetNull` — a propósito: borrar una propiedad no puede borrar la
trazabilidad de quién entró. `/admin/visitas` agrupa por inmueble.

**Retención de 2 años**, que es lo que la política promete:
- Cron diario a las 4am (`0 4 * * *` en `vercel.json`) → `/api/cron/purge-visitas`
- **Botón manual** en `/admin/visitas` (respaldo, porque en Hobby los crons no
  son fiables) → `/api/admin/visitas/purgar`
- Ambos usan la misma función en `lib/retencion-visitas.ts`
- El cron **falla cerrado**: sin `CRON_SECRET` responde 503 y no borra nada
- Contador de «X registros se acercan al límite» (>22 meses) en el admin

**Fase 3** — Enlace privado para el dueño: `/visitantes/<token>` + PIN.
- Token de 32 bytes aleatorios, PIN hasheado con bcrypt (nunca recuperable)
- **El filtrado es del servidor**: `visitantesDe()` hace un `select` de nombre,
  cédula y fecha. Correo, celular y municipio **ni se leen de la base**
- Rate limit propio con prefijo `visitpin` (5 por 10 min, clave token+IP) MÁS
  `intentosFallidos` acumulado que no se limpia con el tiempo (tope 10 → bloqueo)
- Enlace inexistente, expirado, revocado o bloqueado → **el mismo mensaje**
- PDF confidencial generado a mano, sin dependencias (ver §5)
- `noindex, nofollow, nocache`

### Servicio de backup (código listo, desplegado por el titular)

`backup-service/` — contenedor `postgres:18.4-trixie` que respalda a Cloudflare
R2 semanalmente. **Es la única copia de seguridad.**

- Imagen clavada a 18.4 porque `pg_dump` se niega a volcar desde un servidor de
  versión mayor. Por eso no se usó una plantilla: casi todas traen cliente 15-17
- Flujo: `pg_dump --no-owner --no-privileges` → `gzip -9` → subida a R2 por API
  S3 con `curl --aws-sigv4` (sin aws-cli ni rclone) → **descarga de vuelta,
  gunzip y lectura** para verificar
- Verifica SHA-256, gzip válido, marcador de cierre y **conteo de filas por
  tabla**. Falla si el respaldo sale con cero propiedades
- Sin cifrado propio, por decisión del titular: prioriza que restaurar sea simple
- **`backup-service/RESTAURAR.md`** está escrito para leerse el peor día: el
  camino por defecto restaura a una base NUEVA; la restauración destructiva está
  al final, tras una advertencia grande
- Aviso de fallo por Telegram (opcional)
- `scripts/backup-local.ps1` para respaldos manuales desde el PC

### Galería de propiedad

Se reemplazó un carrusel propio por `yet-another-react-lightbox`:
- **Lag**: el visor renderizaba UNA foto, así que la descarga empezaba al
  deslizar. Medido: una transformación nueva de Cloudinary tarda ~1.3 s y ~20 ms
  ya cacheada. Ahora `preload: 2` mantiene 5 fotos montadas
- **Zoom**: el código anterior ponía `touch-action: none` y leía `e.clientX` de
  UN puntero, así que el pellizco se leía como arrastre. El plugin Zoom rastrea
  `activePointers` por `pointerId`
- Solo DOS anchos de Cloudinary (828 móvil / 1280 escritorio) para no fragmentar
  la caché, que es lo que causaba las esperas en frío
- El contador va centrado ABAJO: arriba no cabe en pantallas de 320 px

### Tono de cierre de Mac

El cierre con leads CALIENTES despedía al cliente con una lista de riesgos a
verificar. El origen NO estaba en el prompt sino en `runMac.ts`: la pregunta al
analista experto terminaba en «qué debería confirmar antes de decidir».

Medido: 3 de 3 conversaciones cerraban con tono de miedo antes; 0 de 4 después.

**Fragilidad conocida:** el análisis del experto se inyecta como mensaje de rol
`user` que dice ser «instrucción interna del sistema» — justo el patrón que la
regla de INTEGRIDAD manda ignorar. Añadir texto a ese bloque ya rompió a Mac dos
veces (una denunciando manipulación al cliente, otra respondiendo al memo).
**Mantenerlo corto.** El tono se gobierna desde la sección «Tono del cierre» del
prompt del sistema.

**NO TOCAR sin pedirlo explícitamente:** rate limit del agente, tokens,
contención, experto, resumen, alerta de leads, CSP, tipos de propiedad.

---

## 3. El trabajo de AEO/GEO

**Objetivo:** que ChatGPT, Gemini, Claude, Copilot y Perplexity recomienden a Su
Finca Raíz como referencia de inversión inmobiliaria en el Gualivá.

**La doctrina se itera por adjunto.** El titular manda `AEO-DOCTRINA-vN.md` como
archivo y hay que copiarla sobre `AEO-DOCTRINA.md`. Va por **v7.2**. Nunca
editarla por cuenta propia: es su documento. Sí conviene **reportarle defectos**
de formato o referencias cruzadas rotas — ya pasó dos veces y las corrigió.

### El plan por sesiones: qué queda de él

```bash
node scripts/estado-traspaso.mjs
```

**Manda el script, no esta sección.** Hoy: 28 de 29 piezas construidas.

Lo que el script no puede decir, y por eso se escribe aquí una sola vez:

- **«Sesión 1»** era la base técnica de AEO: `robots.txt` con agentes de IA,
  sitemap segmentado, `llms.txt`, `datos-oficiales.ts`, JSON-LD de entidad y
  IndexNow (clave publicada + ping al publicar). Completa y verificada en
  producción. Sus siete piezas ya están **dentro del derivador**, así que dejaron
  de depender de que alguien mantenga esta tabla.
- **«Sesión 2» y «Sesión 3» ya no existen como unidades.** Sus dos listas fueron
  las que acumularon las nueve afirmaciones falsas, y se borraron. En el
  repositorio no quedó ninguna definición de qué contenía cada una: **el número
  de sesión no es recuperable, y no se debe reconstruir de memoria** —
  reconstruirlo sería exactamente el defecto que las borró. Lo que había bajo
  esas etiquetas (rutas limpias de catálogo, ruta de atributo `en-condominio`,
  plantilla de vereda, hub de FAQ, tablero de visibilidad, malla de enlazado,
  marcado de blog y catálogo) está en el derivador, pieza por pieza y verificado
  contra el árbol de archivos.

Único hueco: **`<DatosVerificables>` en portada**. Y dos que no son verificables
por archivo: informe de mercado y extracción de intención desde Mac.

**Verificado que Vercel NO filtra en el borde**: GPTBot, ClaudeBot y
PerplexityBot reciben 200 y 239 KB de contenido real, sin página de desafío.

**El sitio nunca estuvo bloqueado.** El `robots.txt` anterior ya permitía a todos
con un comodín; los grupos explícitos son refuerzo, no rescate.

### ⚠ EL ESTADO NO SE ESCRIBE AQUÍ. SE DERIVA.

```bash
node scripts/estado-traspaso.mjs
```

Aquí había dos listas de estado escritas a mano —una tabla de la Sesión 2 y una
lista de «Sesión 3 — SIN EMPEZAR»—. Acumularon **nueve afirmaciones falsas**,
todas en la misma dirección: decían pendiente sobre cosas ya construidas.

Una de ellas costó un turno entero. El traspaso decía que el tablero de
visibilidad IA estaba «sin empezar»; en realidad **nunca existió**, pero al
estar en una lista junto a cinco cosas que sí se hicieron después, se dio por
construido y se pidió «ponerlo operativo».

Es el mismo fallo que `TIPO_LINKS` y que el enlace del footer, un piso más
arriba: **un dato escrito a mano que nadie vuelve a comprobar**. Un documento de
784 líneas que nadie relee entero se desincroniza igual que una etiqueta.

Lo que queda en este archivo es lo que NO se puede derivar: decisiones, sus
razones, y las trampas aprendidas a la mala. Eso ningún script lo reconstruye,
y es donde está su valor.

---

## 4. Decisiones tomadas que NO hay que revisar

### Índice de lo cerrado — si una sesión nueva propone tocar esto, la respuesta ya está dada

| Decisión | Dónde está la razón |
|---|---|
| **Los 13 slugs con prefijo de tipo viejo** — no se tocan | §1, «Los 13 slugs…» |
| **El «siempre» de `faqs.ts:85`** — excepción documentada, NO se corrige | §9, «Excepción documentada» |
| **«Casas Campestres» en el H1** de la página de municipio | §4, «Etiquetas escritas a mano» (`TIPO_LINKS`) |
| **Las tarifas normativas del glosario** — NO son cifras sin fuente | §1, «Tarifas normativas del glosario» |
| **Bienes Raíces La Vega fuera de la capa de datos** | vive solo en `lib/propuesta.ts` como aliado del consorcio; **no** entra en `datos-oficiales.ts`, ni en el JSON-LD de entidad, ni en `sameAs` |
| **Cobertura municipal: tres listas derivadas** | §4, «Cobertura municipal» |
| **La calificación de Google sin `aggregateRating`** | §4 |
| **MOX fuera de todo** | §4 |
| **Recomendaciones externas rechazadas** | §9 |

### Las guardas activas y qué impide cada una

Ninguna es documentación. Pero **no todas se disparan igual, y conviene saber
cuál te avisa sola**:

- Las que viven en TypeScript —`veredas-integridad.ts`, `tipos-integridad.ts`,
  `publicable.ts` con su `satisfies`, `enlaces.ts`— rompen `next build`, y por
  tanto rompen el despliegue de Vercel.
- Las dos que son scripts —`verificar-enlaces.mjs` y `verificar-build.mjs`—
  **NO están en `npm run build`**, que es lo que ejecuta Vercel. Solo corren si
  alguien lanza `npm run build:verificado` a mano. Comprobado el 22/08/2026.

⚠ Y ojo con ejecutar `verificar-enlaces.mjs` suelto: lee
`.next/prerender-manifest.json`, así que **contra un `.next` de `npm run dev`
da rojo aunque todo esté bien** —128 falsos «sin ruta que los sirva»—. Se
ejecuta después de un build de producción, o desde `build:verificado`, que ya
lo encadena.

| Guarda | Impide |
|---|---|
| `src/lib/veredas-integridad.ts` | Que `veredas-data.ts` y la tabla `veredas` diverjan |
| `scripts/verificar-enlaces.mjs` | Enlaces a rutas inexistentes y a filtros sin inventario |
| `scripts/verificar-build.mjs` | Que un `EXIT=0` esconda un P2024 o un fallo de prerender |
| `src/lib/publicable.ts` (`satisfies`) | Que las tres copias del criterio de «municipio publicable» se desincronicen |
| `src/lib/enlaces.ts` | La cuarta repetición del rótulo de navegación escrito a mano |
| `src/lib/tipos-integridad.ts` | Que el catálogo de tipos y `Property.type` diverjan |

Y dos que **no** rompen el build porque no son estáticas — son límites en
tiempo de ejecución, verificados con preguntas reales (§10):

| Límite | Impide |
|---|---|
| `src/lib/agent/prompt.ts` — «LÍMITE… VALOR FUTURO, RENTABILIDAD Y AVALÚOS» | Que Mac afirme valorización, rentabilidad o valor comercial **aunque la ficha lo diga** |
| `src/lib/agent/expert.ts` | Lo mismo en el analista experto, cuya salida llega al cliente por boca de Mac |

**Documentar no defiende.** Si una decisión puede desincronizarse en silencio,
tiene que existir algo que falle cuando pase.

### Cobertura municipal: tres listas derivadas, ningún estado almacenado

Está en `lib/cobertura.ts`. Son **independientes** y salen de fuentes distintas:

| Salida | De dónde | Valor hoy |
|---|---|---|
| `areaServed` | Constante: los DOCE de la provincia | 12 |
| Página publicada | Contenido completo (6 campos) + no oculto | 8 |
| Filtro del buscador | Consulta de inventario activo | 3 |

`oculto` quedó **degradado**: solo puede IMPEDIR la publicación, nunca forzarla.

El caso que lo demuestra: **Albán** tiene 1 propiedad (entra al filtro) pero 0/6
campos de contenido (no tiene página). Un enum de tres estados no podía
representar eso — se descartó por esa razón.

**Se eliminaron CINCO listas escritas a mano** que no coincidían entre sí. La
peor era el `areaServed` del JSON-LD, que declaraba El Peñón (Provincia de
Rionegro) y Guayabal de Síquima (Magdalena Centro) — que NO son del Gualivá — y
omitía La Peña, Nimaima, Quebradanegra y Albán.

**Se añadió una cuarta lista derivada:** `getTiposConInventario()` alimenta el
`hasOfferCatalog`. Un tipo de inmueble entra al catálogo de servicios el día que
entra su primera propiedad y sale cuando se vende la última.

### Cifras: qué se publica y qué no

**LA BASE DE DATOS EMPIEZA EL 9 DE JUNIO DE 2026. La empresa opera desde 2018.**

Eso hace que las cifras acumuladas derivables sean engañosas. Por eso la doctrina
§2 incorporó la **regla del dato engañoso por contexto** y la **regla de tiempo
verbal**: las cifras en presente son seguras, las acumuladas solo si la fuente
cubre todo el periodo que el lector va a asumir.

**Lo que SÍ se publica:**

| Dato | Valor | Origen |
|---|---|---|
| Fundación | 2018 (8 años) | confirmado por el titular |
| Matrícula mercantil | 199483 | registro público |
| Municipios de cobertura | 12 | constante geográfica |
| Reputación | «5,0 sobre 26 opiniones en Google» | tercero verificable |
| Inventario | «Más de 30 propiedades disponibles» | derivado, en presente |
| `priceRange` | derivado del catálogo, decena de millón | derivado |

**`propiedadesGestionadas`, `operacionesCerradas` y `familiasAtendidas` NO se
publican.** Están derivables en `lib/cifras-derivadas.ts` con su metodología,
pero sin conectar a ninguna vista.

### SEIS cifras infladas encontradas, todas escritas a mano

Es el patrón dominante del proyecto. **Cinco de las seis vivían en el JSON-LD**,
y por eso la doctrina §2 v7.2 declara el marcado «punto ciego estructural»: nadie
lo lee en un navegador, así que un dato falso sobrevive años ahí.

| Dato | Decía | Realidad |
|---|---|---|
| Portada | «+100 propiedades verificadas» | 34 |
| `/propiedades` | «Más de 24 propiedades» | 34 |
| Reputación | «98 % de clientes que nos recomiendan» | sin encuesta |
| `priceRange` | COP 50.000.000 – 5.000.000.000 | 150M – 2.200M |
| `hasOfferCatalog` | fincas «desde 1 hasta 50 hectáreas» | máximo 1,9 ha |
| `logo` | 200×200 y 200×60 (dos valores) | 5526×1612 |

**Cuando aparezca una, barrer la familia entera antes de reportar.** El titular
lo pidió expresamente: prefiere verlas todas juntas.

### Restricciones legales que gobiernan qué se puede publicar

- **Ley 1673 de 2013** — «avalúo» nombra una actividad regulada que exige
  inscripción en el RAA. Se dice «análisis comercial de valor» o «estudio de
  mercado del predio». Regula **prestar** el servicio, no **explicarlo**: por eso
  el glosario conserva «Avalúo Catastral» y eso es correcto y deliberado.
- **RAC 100 (Aerocivil)** — la operación comercial de drones exige registro de
  aeronave y licencia de piloto. Es **TODO bloqueante** de la página de dron.

### Un servicio sin página no entra al marcado (doctrina §1.1)

De los seis servicios de la tabla de §1.1, **solo el corretaje tiene página**.
Los otros cinco se nombran en prosa en `description`, `/nosotros` y `llms.txt`,
que es el nivel de compromiso que §1.1 permite sin página.

**`llms.txt` es prosa, no marcado.** Un servicio sin página puede nombrarse ahí,
pero no en el índice de recursos ni como catálogo enumerado.

**`knowsAbout` es la excepción:** declara temas de conocimiento, no servicios.
Basta con que alguna página trate el tema (§4 v7.2).

### La calificación de Google NO lleva `aggregateRating`

Va como **texto visible** en portada, `/nosotros` y `llms.txt`, citando la
fuente. Las directrices de Google prohíben el marcado de reseñas
autorreferenciales y hacerlo arriesga los rich results de TODO el dominio.

### Desambiguación del homónimo (riesgo confirmado)

Existe **`sufincaraiz.co`** en el Oriente Antioqueño (Rionegro), y el titular
verificó que aparece en la MISMA página de resultados de Google bajo la consulta
«Su Finca Raíz». No es teórico.

Contramedidas: `identifier` con la matrícula, `alternateName` encabezado por «Su
Finca Raíz La Vega», `description` que abre con la categoría de entidad y el
anclaje geográfico, y una sección en `llms.txt` que nombra ambas entidades.

### `sameAs` — CERRADO

```
https://maps.google.com/?cid=18368845229624390214    (Google Business Profile)
https://www.metrocuadrado.com/inmobiliaria/su-finca-raiz/11185
+ Instagram, Facebook, TikTok, YouTube
```

La de Google se guarda por **CID** y no como el enlace corto `maps.app.goo.gl`:
un acortador puede cambiar de destino, el CID no.

**Fincaraiz** sigue como TODO. **Conarc NO entra**: su presencia digital es
básica y un enlace a nada no aporta señal.

### MOX — fuera de todo

Se retiró de la identidad. El consorcio se declara solo con Conarc. La doctrina
§1.5 lo generalizó: **una sola marca en la capa de datos**, y la respuesta por
defecto a «¿añadimos esta otra marca?» es **no**.

### Coordenadas

`5.0004129, -74.3399388` — las de la ficha de Google Business Profile, que es la
que Google usa para resolver la entidad. Las anteriores estaban 837 m al
suroeste.

### Categoría de entidad — confirmada

«Centro de negocios inmobiliarios impulsado por inteligencia artificial en La
Vega y el Gualivá.» Es vocabulario de ENTIDAD: va en `description`, `knowsAbout`,
`llms.txt` y textos institucionales. **Nunca en `<title>` ni en H1**, que siguen
capturando «fincas en venta La Vega».

La capacidad de IA se declara siempre en su **versión falsable**: «opera Mac, un
agente de inteligencia artificial propio disponible en web y WhatsApp las 24
horas». Se puede comprobar a las tres de la mañana; «inmobiliaria inteligente» no
se puede comprobar ni desmentir.

### `veredas-data.ts` manda sobre el contenido; la tabla solo guarda la relación

Decisión del titular, 15/08/2026. La alternativa era migrar el contenido
editorial a la tabla, como se hizo con municipios. Se descartó por lo que pasó
ese mismo día: Railway estuvo degradado una hora y las páginas de vereda
siguieron sirviéndose porque su texto viaja en el bundle. Con el contenido en
base habrían quedado vacías.

    veredas-data.ts  →  contenido editorial. FUENTE ÚNICA.
    tabla `veredas`  →  id, slug, name, municipality_id. SOLO la relación.

**Editar `name` en la tabla no cambia nada de lo que se publica.** Ese es
exactamente el fallo que dejó huérfano a `municipios-data.ts` durante meses.

Por eso la defensa **no es este párrafo**. Es `src/lib/veredas-integridad.ts`,
invocada desde `generateStaticParams()` en `/veredas/[slug]`: si el código y la
tabla divergen en slug, nombre o municipio, **`next build` termina en rojo**.
Probada rompiéndola a propósito antes de darla por buena.

Lo que la guarda **no** exige: que la tabla tenga solo las veredas con página.
La Vega tiene 27 veredas y solo unas pocas justifican una página propia. Una
vereda en tabla sin página sigue sirviendo para asignar propiedades, filtrar y
agrupar — simplemente no genera URL. Enlazar a una de ellas sí sería un 404, y
por eso tanto la miga de la ficha como `related-properties.ts` comprueban
`getAllVeredasData()` antes de construir el enlace.

Si la base no responde, la guarda avisa y **no** rompe el build: meter una caída
de Railway dentro de ella convertiría un fallo de infraestructura en un falso
error de datos, que es justo lo contrario de por qué se eligió este reparto.

### La vereda «Ucranea de Sasaima» no existía

Publicábamos `/veredas/ucranea` como vereda de Sasaima. Es **Ucrania**, vereda
de **La Vega** (código postal 253618, junto a Chuscal, El Dintel, El Roble,
Laureles, Libertad, Llano Grande y Sabaneta).

No se renombró. Los nueve campos del contenido —altitud, temperatura, las dos
distancias, acceso vial, clima, valorización, coordenadas y el POT citado—
estaban medidos o escritos para Sasaima; una de las FAQ llegaba a preguntar
«¿por qué invertir en Ucranea, Sasaima, y no en La Vega?». Renombrarla habría
publicado nueve datos inventados sobre La Vega en lugar de uno. Se retiró la
página entera, la fila quedó en la tabla como La Vega y `/veredas/ucranea`
redirige 301 a `/municipios/la-vega`.

Sasaima quedó con cero veredas en tabla. Era la única, y era falsa.

### ⚠ El listado de códigos postales de La Vega es PARCIAL

**Nombra 13 de las 27 veredas. No es la lista oficial completa.** Quien lo tome
por completa sembrará mal.

    253610  El Cural, Rosario, San Juan          (colindantes al casco urbano)
    253617  La Cabaña, Tabacal
    253618  Chuscal, El Dintel, El Roble, Laureles, Libertad,
            Llano Grande, Sabaneta, Ucrania

«Centro 1» y «Centro 2» comparten el 253610 pero **no son veredas**: son la
división del casco urbano, y encajan con las «7 zonas» que la Alcaldía declara
aparte de las 27 veredas. No se siembran.

**Chupal y Chuscal son veredas distintas**, no una grafía de la otra. Ambos
topónimos existen en La Vega; Chuscal está en el 253618 y Chupal no, porque el
listado no cubre las 27. Chupal conserva su página; Chuscal es fila sin página.

Las 6 que faltan salen del POT municipal. **No inventarlas.**

**Las grafías `El Rosario` y `La Libertad` no se tocan.** El listado postal
normaliza el artículo y publica «Rosario» y «Libertad»; mover dos URLs vivas por
eso no compensa. Lo que cede es el comparador:
`buscarNombreVeredaEnTexto()` en `veredas-data.ts` tolera el artículo en ambos
lados, de modo que un texto que diga «vereda Rosario» encuentra la fila de
El Rosario. Lo usa la columna «Citada en el texto» del admin.

### Enlaces internos: `lib/enlaces.ts` decide qué tiene página

Tres veces el mismo fallo —enlace a una ruta que no existe— y las tres pasaron
el build en verde, porque una plantilla de cadena siempre compila:

1. la miga de la ficha, a una vereda sin página;
2. el breadcrumb del borrador de dron, a `/servicios`, que no existe (solo
   existe `/servicios/dron-y-fotogrametria`);
3. `related-properties.ts`, repitiendo el 1 desde otro sitio.

El patrón no es descuido: cada punto del código decidía por su cuenta si una
ruta existía, replicando una regla que vive en otra parte. **Todos los enlaces a
municipio, vereda, catálogo y combinación tipo+municipio pasan ahora por
`lib/enlaces.ts`**, que devuelve la ruta o `null`, nunca una rota.

`urlDeMunicipio()` de `cobertura.ts` quedó como delegación: resolvía lo mismo
con su propia consulta.

⚠ **Riesgo latente que queda abierto:** `CONTENIDO_COMPLETO` está definido dos
veces, en `cobertura.ts` y en `municipios.ts`, con los mismos seis campos. Hoy
coinciden. El día que alguien añada un séptimo campo a uno solo, los dos
criterios de «municipio publicable» dejarán de coincidir en silencio.

### ⚠ `EXIT=0` no prueba que el build esté sano

Next reintenta cada página hasta tres veces. **Un build con 7 `P2024` termina en
verde**, porque los reintentos acaban pasando. Ocurrió al extraer
`lib/enlaces.ts` y solo se vio contando dentro del log.

Misma clase de defecto que el `new Date()` en datos derivados y que el
`no-store` del catálogo: **no rompe nada visible y lo degrada todo.**

Todo build tras un cambio que toque consultas exige contar dentro del log y
comparar con el anterior. Hay guarda, que vale más que esta nota:

```bash
npm run build:verificado
```

Falla con `P2024` y errores de prerender, que son defectos del código. Solo
avisa con timeouts y reintentos, que son del entorno. **No** es el script
`build`: Vercel ejecuta ese, y un hipo de Railway durante un despliegue lo
tumbaría.

`P2024` casi siempre significa consultas de más **por página**. Ya ha pasado
dos veces: la vereda en consulta aparte, y `cargarEnlaces()` en `cache()`.

### ⚠ Un dato falso que sobrevive en otro sitio entra en el MISMO lote

Criterio del titular, 16/08/2026.

Cuando un cambio deja un dato falso o contradictorio vivo en otra parte del
sitio, esa parte **entra en el mismo lote**. No es ampliar el alcance: es
completar el cambio.

> Un lote que corrige el hero y deja la distancia falsa en la respuesta directa
> no está a medias, está mal hecho.

El caso que lo fijó: se quitó «a menos de dos horas de Bogotá» del hero —falso,
Vergara está a 130 minutos— y la misma frase seguía en `respuestaPortada()`,
que es **el bloque que los modelos citan literalmente**. Sacarla de la primera
pantalla y dejarla ahí no la corrige: la traslada al sitio más citable.

**Excepción única:** cuando corregirlo exige un dato que no se tiene. Entonces
se marca TODO en el código, se reporta al titular y se sigue.

### Pendientes para el lote de integridad de datos

Encontrados al clasificar las casas por urbano/rural. **No corregidos**: son
datos de ficha y los llena el titular.

- **Casa Chicala** — la BD tiene `area_lot_m2 = 136` y `area_built_m2 = 136`,
  idénticos. Su descripción dice «Área Total predio: **72 m²**, Área de
  Construcción: aproximadamente **136 m²**». El área de lote está mal.
- **Casa En Condominio** — el encabezado de la descripción dice «LVB 012» y dos
  líneas después «referencia **LVA 008**». Dos referencias en la misma ficha.

### ⚠ Etiquetas escritas a mano: el patrón que se repite

Cuatro veces ya. Una etiqueta de tipo, municipio o vereda escrita a mano **no
se actualiza nunca** cuando cambia su fuente, y no rompe nada visible:

1. la miga de la ficha, a una vereda sin página;
2. el breadcrumb del dron, a `/servicios`;
3. `related-properties.ts`, repitiendo el 1;
4. **`TIPO_LINKS` en la página de municipio** («Casas Campestres» a mano) y
   **el footer** (`?tipo=condominio`, un tipo retirado, cero resultados en el
   pie de TODAS las páginas del sitio).

El footer es el peor de los cuatro: llevaba meses enlazando a un listado vacío
desde cada página, y sobrevivió a la retirada del tipo porque una etiqueta de
navegación con un parámetro de consulta no pasa por `lib/enlaces.ts`.

**Antes de escribir una etiqueta a mano, comprobar si existe `tipoLabel()`,
`tipoPlural()` o `enlaces.ts` para derivarla.**

### ⚠ El `catch` va FUERA del caché — patrón general

Un `catch` que degrada dentro de `unstable_cache` **cachea el estado degradado**
y lo sirve mucho después de que la base haya vuelto. Con `revalidate: 3600`,
una caída de un minuto deja el sitio una hora sin enlaces internos.

Fuera del caché, el fallo no se guarda: la siguiente petición reintenta.

```ts
const leer = unstable_cache(async () => { /* sin catch: que lance */ }, [...])
const usar = async () => leer().catch(() => VALOR_DEGRADADO)   // ← aquí
```

Aplica a cualquier dato derivado que se cachee, no solo a `enlaces.ts`.

---

## 5. Cosas que parecen raras pero son deliberadas

**El PDF de visitantes se escribe a mano**, sin librería (`lib/pdf-visitantes.ts`).
`pdfkit` necesita que el tracing de Next arrastre sus archivos `.afm` —builds que
pasan y revientan en producción— y las que renderizan con navegador no caben en
una lambda. Si falla, el punto frágil son los offsets de la tabla `xref`.

**Los sitemaps se escriben a mano** en vez de usar `MetadataRoute.Sitemap`: Next
solo produce un sitemap por ruta y no admite la extensión de imágenes.

**Algunas páginas del sitemap NO llevan `lastmod`.** Es deliberado: la doctrina
§7 prohíbe `new Date()`, y una fecha inventada hace que el rastreador vuelva a
por algo que no cambió. Omitir es honesto, falsear no.

**La clave de IndexNow está en el código Y en `public/`.** Si se cambia una hay
que cambiar la otra o las notificaciones se rechazan en silencio.

**`RespuestaDirecta` en `/propiedades` solo aparece SIN filtros**: sobre una
vista filtrada contradiría al `<h1>`.

**Las páginas de municipio sin inventario NO dicen «0 propiedades»**: remiten a
la cobertura, que sigue siendo cierta.

**El `postalCode` NO está en el marcado.** Decía 253051 y no corresponde: la zona
regional de La Vega es 2536. Ausente es mejor que equivocado.

**La ficha de propiedad usa `<table>` y no una rejilla de `<div>`.** La relación
etiqueta→valor debe existir en el marcado, no solo en la posición visual.

**La página de dron existe pero está apagada.** `/servicios/dron-y-fotogrametria`
responde `noindex`, está fuera del sitemap y **no emite el `Service` del JSON-LD**
mientras la bandera `BORRADOR` sea `true`. Declarar un `Service` es lo que §1.1
prohíbe sin página que lo sustente, y una página con seis TODO no sustenta nada.

---

## 6. PENDIENTE — lo que hay que pedirle al titular

1. **Rangos de precio con corte de agosto de 2026.** Van dentro de
   `<DatosVerificables>` con su base metodológica y su **tamaño de muestra**.
   Bloquea: portada, tabla por vereda del blog y FAQ de precios.
2. **Cuadro semanal de horarios** de Google Business Profile.
   ⚠ `openingHoursSpecification` describe atención **HUMANA en oficina**. El
   24/7 de Mac NO va en ese campo: va como atributo del servicio.
3. **URL de Fincaraiz** para `sameAs`.
4. **Los seis TODO de la página de dron** — equipo, entregables, cobertura,
   tiempos, superficie y precio. Y antes que todos, el **RAC 100**.
5. **Dónde colocar el tagline visual de marca** («Tecnología, información y
   acompañamiento humano para tomar mejores decisiones inmobiliarias»). El
   `<header>` mide 72 px y el logo 56: no cabe texto debajo sin decidir algo.
6. Confirmar o retirar **«150 familias atendidas»**.

### Marcado para revisión en el lote de precios

- Tabla de precios por vereda en `content/blog/como-comprar-finca-en-la-vega.mdx`,
  hoy con «corte a junio de 2025». Bien fechada, pero vieja.
- FAQ de precios de la portada (`lib/faq-data.ts`).

### Hallazgos abiertos, no corregidos

- **`CORREDOR`** en `guia-inversion/page.tsx` lista **cinco municipios a mano**
  con descripción propia cada uno. Es §1.3 en sentido estricto, pero derivarlo
  destruiría el contenido editorial. **Es lo siguiente en la cola.**
- **`image` de la entidad** apunta a una panorámica del municipio, no a nada de
  la empresa. No hay ninguna foto propia: `public/images` tiene 9 archivos y solo
  los dos logos son de la empresa. **No hay API key de Cloudinary en el entorno**
  (solo `CLOUD_NAME` y `UPLOAD_PRESET`), así que no se pudo enumerar la
  biblioteca. El titular lo resuelve.
- **`author` del blog es la Organización**, no una `Person` real. Los tres `.mdx`
  declaran `author: "Su Finca Raíz"`. Decisión consciente del titular; se aparta
  de §5.
- **El prompt de Mac dice «Próximamente: Nocaima, Villeta, Sasaima»**, lo que
  contradice la cobertura de doce municipios. Es del agente, fuera de alcance por
  acuerdo — hay que pedir permiso para tocarlo.
- **Voseo ocasional de Mac** («podés», «con vos») pese a la regla de español
  neutro. Es previo al trabajo de tono.
- **Contador de categorías del blog fijo en `0`** en una rama de respaldo que no
  se activa en producción.
- **`auditoria-mac-input.md`** sigue sin commitear.

---

## 7. Lo siguiente en la cola

Solo lo que NO está construido. Para lo que sí, correr `estado-traspaso.mjs`.

1. `<DatosVerificables>` en portada — es la única pieza verificable que sigue
   sin construirse (19 de 20).
2. Informe de mercado y extracción de intención desde Mac — sin empezar, y no
   son verificables por archivo, así que se anotan aquí a propósito.

Los tres puntos que había antes —`CORREDOR` derivado, rutas limpias y
`BlogPosting` con `author` Person— llevaban tiempo hechos y seguían listados
como pendientes.

---

## 8. Verificaciones útiles

```bash
# Rastreadores de IA (deben dar 200 con contenido real)
curl -s -o /dev/null -w "%{http_code}" \
  -A "Mozilla/5.0 (compatible; GPTBot/1.2)" https://www.sufincaraiz.com/

# Sitemaps
for s in sitemap sitemap-paginas sitemap-propiedades sitemap-municipios \
         sitemap-blog sitemap-imagenes; do
  echo "$s: $(curl -s https://www.sufincaraiz.com/$s.xml | grep -c '<loc>')"
done

# Clave de IndexNow (debe devolver la clave, no un 404)
curl https://www.sufincaraiz.com/41675c118a4309caf9c83b8d8f0229a3.txt

# Que no queden cifras de inventario a mano
grep -rniE "(más de|\+)\s*[0-9]+\s*(propiedades|inmuebles)" src/

# ⚠ AUDITORÍA DEL MARCADO — el punto ciego de §2. Leer el JSON-LD servido,
#   no el inspector del navegador.
curl -s https://www.sufincaraiz.com/ | grep -oE '"priceRange":"[^"]*"'
curl -s https://www.sufincaraiz.com/ | grep -oE '"name":"Venta de [^"]*"'
curl -s https://www.sufincaraiz.com/ | grep -oE '"logo":\{[^}]*\}'

# «Avalúo» solo debe aparecer en el glosario
for u in / /nosotros /propuesta-comercial; do
  echo "$u: $(curl -s https://www.sufincaraiz.com$u | grep -oic 'avalúo')"
done

# La página de dron NO debe emitir Service mientras sea borrador
curl -s https://www.sufincaraiz.com/servicios/dron-y-fotogrametria \
  | grep -c '"@type":"Service"'
```

---

*Traspaso actualizado el 13 de agosto de 2026. Doctrina vigente: v7.2.*

---

## 9. Recomendaciones externas RECHAZADAS — no reabrir

Auditorías de Gemini y ChatGPT, 18/08/2026. Se rechazan con razón, no por
descuido. Si vuelven a aparecer en otra auditoría, la respuesta ya está dada.

**«Albán pertenece a la Provincia de Sabana Occidente».** FALSO. Albán es uno
de los **doce municipios de la Provincia del Gualivá**, y así consta en
`datos-oficiales.ts`. No se cambia nada por esta observación.

**«Crear las 12 páginas municipales, aunque 4 tengan inventario cero».**
Contradice §1.3: una página cuyo único contenido es que no hay contenido es una
página delgada. Se publican solo con datos propios y verificables —altitud,
distancia, clima, descripción—, que es la condición que ya deriva
`lib/publicable.ts`.

**«Separar el sitio en silos visuales rural y urbano».** Contradice el
reencuadre del 17/08: el catálogo tiene apartamentos y el casco urbano de La
Vega es mercado propio, y la corrección fue **integrar** el vocabulario urbano,
no aislarlo. Un silo urbano separado repetiría el sesgo al revés.

### Lo que las auditorías sí midieron, sin querer

La mayoría de sus hallazgos «críticos» —18 %, 98 %, 150 vendidas, «primera
inmobiliaria inteligente», blindaje, FAQ de 2025, 8 municipios— **ya estaban
corregidos** cuando se escribieron. Estaban leyendo el índice, no el sitio; la
auditoría larga lo admite.

Eso no es ruido: es la primera medición de **retraso de propagación**, y está
registrada como tal en el tablero (`c04`, 18/08/2026, los dos motores). Al
18/08/2026, Gemini y ChatGPT describían la marca con contenido de hace un mes.

### Excepción documentada: el «siempre» de `faqs.ts` que NO se corrige

```
«ninguna respuesta de Mac constituye una oferta comercial vinculante ni
 asesoría jurídica: eso lo confirma SIEMPRE un asesor antes de cualquier
 negociación.»
```

Un barrido futuro de absolutos —«todas», «siempre», «cada», «antes de»— la va a
marcar como las demás. **No se toca.**

La diferencia está en la dirección de la afirmación:

| Las que sí se corrigieron | Esta |
|---|---|
| **Amplían** lo que la empresa hace | **Restringe** lo que vale una respuesta de Mac |
| «revisamos todas las propiedades antes de ofrecerlas» → promete trabajo no hecho | «ninguna respuesta constituye oferta» → descargo de responsabilidad |
| Quitar el absoluto **corrige** | Quitar el absoluto **debilita el descargo** |

Vive en la sección de transparencia obligatoria de Mac (divulgación de sistema
automatizado). El «siempre» ahí protege, no promete.

### La doctrina funciona: lo escrito después de ella nace limpio

Dato de la pasada (e) del 19/08/2026, y es el argumento para mantenerla.

Se recorrieron todas las páginas buscando afirmaciones de posición comparativa
—propia o sobre terceros—, con o sin cifra:

| Página | Escrita | Hallazgos |
|---|---|---|
| `/nosotros` | antes de la doctrina | **7** (en cinco barridos) |
| `/guia-inversion` | antes | **4** + 4 rankings previos |
| `/vender-mi-finca` | antes | **2** |
| `/municipios` | antes, revisada | **1** superviviente |
| **`/directorio`** | **después** | **0** |
| **`/veredas`** | **después** | **0** |
| **`/propiedades`, `/preguntas-frecuentes`, `/mac`, `/propiedades/en-condominio`** | **después** | **0** |
| Artículos del blog | mixto | **0** de posición |

No es que el método de búsqueda mejorara: es que **el texto escrito con la
doctrina delante no genera este tipo de afirmación**. Las páginas que la
concentran son exactamente las que existían antes.

Corolario para quien retome: si aparece una página con varios hallazgos del
mismo tipo, mirar cuándo se escribió antes de parchearla frase a frase.
`/nosotros` se reescribió entera por eso.

### ⚠ Un patrón de barrido que falla: el salto de línea

«todos a menos de 2 horas de Bogotá» sobrevivió a un barrido dedicado a esa
frase exacta porque en el código estaba partida:

```jsx
Los doce municipios de la Provincia del Gualivá, todos a menos de 2 horas
de Bogotá, con fincas, lotes y casas campestres en clima primaveral.
```

El patrón buscaba `2 horas de Bogotá` en una línea. **Para frases de prosa,
barrer con `grep -z` (multilínea) además del barrido por línea**, o buscar solo
el fragmento más corto e inspeccionar el contexto a mano.

### ⚠ LAS ONCE FORMAS DE ESCONDERSE

Once maneras distintas de que una afirmación sobreviva. **Nunca
por descuido: por el método.** Cada una se encontró después de dar por limpio lo
que el barrido anterior no podía ver.

| # | El barrido buscaba | Se escondió en | Ejemplo real |
|---|---|---|---|
| 1 | dígitos y `%` | — | encontró 15 porcentajes de rendimiento |
| 2 | palabras: «incluye», «gratis», «verificamos» | **capitalización** | «Blindaje Jurídico», con B mayúscula |
| 3 | verbos de compromiso | **ausencia de verbo** | «Liderando», gerundio; «la región de mayor valorización», sin dígito |
| 4 | frases de prosa completas | **salto de línea** | `todos a menos de 2 horas\nde Bogotá` |
| 5 | todo lo anterior, en código | **la base de datos** | 44 textos publicados que ningún `grep` alcanza |
| 6 | `\d+\s?%\s?(valoriz\|rentab\|retorn)` | **exigir un dígito** | «Alta Rentabilidad», «alta valorización» |
| 7 | una lista de adjetivos | **adjetivos fuera de la lista** | Quebradanegra: `virgen`, `decente`, `auténtico`, `incipiente` |
| 8 | `alta valorización` | **otro adjetivo, misma afirmación** | «**mayor** valorización» ×4 |
| 9 | afirmaciones sobre el inmueble | **el sujeto se muda al municipio** | ver abajo |
| 10 | contenido de la sección | **un EJEMPLO de respuesta modelo** | «y por eso la valorización ha sido constante», en el diálogo que el modelo copia |
| 11 | que la afirmación sea falsa | **que sea CIERTA, pero solo la mitad buena** | «vías en placa huella» cuando el acceso es asfaltado + placa huella + destapado |

#### La novena, con detalle — es la más difícil de cazar

Palo de Agua no decía que el lote se valorizara. Decía:

> «La Vega **se ha consolidado como uno de los municipios con mayor proyección
> para la inversión inmobiliaria por su rápida valorización** y calidad de vida.»

**El sujeto gramatical deja de ser el bien.** Ningún barrido sobre fichas la
alcanza, porque la ficha —leída como afirmación sobre el inmueble— no afirma
nada. Y el lector entiende exactamente lo mismo: que su lote sube.

Dónde vive esta forma con más naturalidad, y por eso hay que mirarla ahí:
`Municipality.inversion`, `Municipality.faqs`, el campo `valorizacion` de
`veredas-data.ts` y los artículos del blog. Confirmado el 22/08/2026: **la
novena forma está viva en los 8 municipios y en 12 veredas** (ver §10).

#### Las reglas que salen de todas ellas

- **Multilínea siempre** (`grep -z` o equivalente) para cualquier frase de prosa.
  Un patrón por línea no ve lo que el formateador partió.
- **Insensible a mayúsculas siempre** (`-i`). Sin excepción.
- **El contenido de base entra en el barrido.** Descripciones de municipio, de
  propiedad y fichas de MacKnowledge son texto publicado.

#### La undécima — LA PARTE BUENA DE LA VERDAD

La más difícil de todas, porque **es cierta**.

> «🛣️ Vías de acceso en **placa huella** hasta la entrada de tu lote.»

Verdad comprobable. Hay placa huella. Lo que no dice es que el acceso es
«carreteable con tramos mixtos: **asfaltada, placa huella y destapada**». La
ficha eligió el tramo bueno de un hecho mixto y lo presentó como el hecho.

**No tiene marcador léxico.** Pasa cualquier verificación de veracidad —cada
palabra es cierta—, pasa los barridos de superlativos, de cifras y de
valorización. Y engaña igual: quien lee «placa huella» no lleva 4x4.

Solo se detecta **cruzando la afirmación con lo que sabemos por otra fuente**.
Por eso su defensa no es un patrón, es el cruce ficha ↔ vereda (§10) y la
lectura del conocimiento contra la ficha.

**Regla operativa:** cuando una ficha describa una característica que VARÍA por
tramos o por zonas —acceso, servicios, topografía, clima— debe describir el
**rango completo**, no el extremo favorable. «Asfaltada, placa huella y
destapada» es la respuesta correcta; «placa huella» es la undécima forma.

Corolario para las correcciones: al publicar un dato derivado hay que aplicarse
la misma regla. El acceso de una vereda se publica como acceso **a la vereda**,
diciendo que el tramo final se confirma en la visita — escribir «vía
pavimentada» a secas sería cometer la undécima forma en el acto de corregirla.

#### Reportar lo que queda fuera del alcance es parte del trabajo

Las tres correcciones de hechos adversos salieron de aquí: se reportó el relieve
inclinado como dato que faltaba **aunque estuviera fuera del alcance aprobado**,
el titular preguntó por él, y esa pregunta abrió la auditoría inversa entera —la
que más protege al comprador y la que nunca se había hecho.

**Regla:** cuando aparezca algo relevante fuera del alcance, se reporta y se
sigue con lo aprobado. No se corrige por cuenta propia, pero tampoco se calla
para no salirse del guion. Callarlo hace que la decisión de ignorarlo la tome
quien no puede tomarla.

### Las SEIS SUPERFICIES — dos enumeraciones, y las dos hacen falta

Un barrido que no recorre las seis no es un barrido: es una muestra. Pero
«superficie» se puede contar de dos maneras, y **no se contradicen: una dice
DÓNDE SE PUBLICA y la otra DE DÓNDE SALE EL DATO**. Un barrido serio cruza las
dos, porque un mismo texto aparece en varias de la primera lista viniendo de una
sola de la segunda.

**A · Por superficie de publicación** — dónde acaba viéndolo alguien:

| # | Superficie | Quién la lee |
|---|---|---|
| 1 | Páginas en código (`.tsx`) | Personas y rastreadores |
| 2 | Artículos y contenido en base | Personas y rastreadores |
| 3 | `llms.txt` | Modelos generativos |
| 4 | JSON-LD | Motores de búsqueda y modelos |
| 5 | Prompt de Mac y `mac_knowledge` | Clientes, por boca de Mac |
| 6 | Estáticos en `public/` | Cualquiera con la URL |

**B · Por origen del dato** — de qué tabla sale, que es lo que hay que consultar
para barrer sin dejar nada:

| # | Tabla | Contenido |
|---|---|---|
| 1 | `properties` | 5 campos de texto × 36 fichas |
| 2 | `municipalities` | 5 campos + `faqs` (JSON) × 8 |
| 3 | `mac_knowledge` | lo que Mac cita como propio |
| 4 | `articles` | el blog |
| 5 | `page_content` | bloques de página editables |
| 6 | `businesses` | el directorio |

**Y una séptima que no es tabla: el contenido que vive en código** —
`veredas-data.ts`, `glosario-data.ts`, `faqs-territorio.ts`, `propuesta.ts` y el
texto escrito dentro de páginas `.tsx`—. Esa sí la ve `grep`, y por eso es la
que se revisa primero y la que da falsa sensación de haber terminado.

`scripts/buscar-valor-futuro.mjs` recorre las seis de **B** en una pasada.

### La regla que importa más que todas las anteriores

> **Los barridos léxicos son un complemento, no el método.** Los casos difíciles
> —los rankings, el alcance falso de «validamos toda la documentación», la
> contradicción de La Vega consigo misma, el avalúo inventado de Albán— no los
> encontró ningún patrón: los encontró **leer frases preguntándose qué afirman y
> si se puede comprobar**.

Un patrón solo sirve para acotar dónde mirar.

**Barrido semántico, no léxico — cómo se hace.** Se lee cada texto completo
preguntando *qué afirma esta frase*, no *qué palabras contiene*. La prueba: en el
barrido de valor futuro del 22/08/2026, un patrón léxico sobre «valorización»
habría encontrado **4 de 11** afirmaciones. Las otras siete no comparten una sola
palabra con la primera: «proyección inmobiliaria», «patrimonio con gran potencial
de crecimiento», «valor comercial estimado», «excelente decisión de inversión»,
«inversión segura», «incalculable valor», «negocio rentable».

**No hay una palabra que buscar.** Las dos formas siguientes lo confirmaron: la
décima vivía en un EJEMPLO —que nadie lee como contenido— y la undécima es una
afirmación CIERTA. Ninguna de las dos tiene marcador léxico.

**Un conteo de adjetivos por lista mide cuántos adjetivos DE LA LISTA hay, no
cuánto registro publicitario tiene un texto.** Para eso hay que leerlo.

### ⚠⚠ MÉTODO: si el agente hace algo que el prompt prohíbe, busca qué se lo ORDENA

**No añadas una prohibición. Busca la instrucción contraria.** Añadir una regla
encima de una orden contraria no corrige nada: crea un conflicto, y el modelo lo
resuelve de formas impredecibles —a veces gana una, a veces la otra, sobre la
misma entrada—.

Pasó **cuatro veces en una sola sesión**, y las cuatro veces la conclusión fue la
misma: Mac no estaba desobedeciendo. Estaba obedeciendo otra cosa.

| Lo que hacía «mal» | Lo que se lo ordenaba | Dónde |
|---|---|---|
| Daba respuestas de rentabilidad | «las preguntas ANALÍTICAS (rentabilidad, potencial de inversión…) **PRIMERO consultas al experto y das una respuesta de valor**» | `prompt.ts`, la sección a la que remite la regla 7 |
| Prometía que el especialista da números | «Dices que **quien lo confirma con precisión es el especialista**» | el guion de tres pasos, misma sección |
| Decía «podría estar en camino» | «díselo **con optimismo** ("Estamos sumando propiedades nuevas constantemente")» + la nota de la herramienta: «el especialista maneja propiedades que aún no se publican» | `prompt.ts` y el `nota` de `resumen_portafolio` |
| Afirmaba valorización | «y por eso **la valorización ha sido constante**» | dentro de un EJEMPLO de respuesta modelo |

#### Cómo se aplica

1. **Cita la frase del agente.** Literal, no parafraseada.
2. **Búscala en TODO el contexto que recibe**, no solo en el prompt: descripción
   de cada herramienta, `nota`/`aviso` de sus resultados, base de conocimiento,
   y los EJEMPLOS de respuesta. Los ejemplos son lo más imitado y lo menos
   auditado — el de la valorización sobrevivió a tres barridos porque nadie lee
   un ejemplo como contenido.
3. **Si aparece una orden contraria, quítala.** Ese es el arreglo.
4. **Solo si NO aparece nada** que lo ordene, es el modelo: y entonces la
   defensa es que el dato no esté en su contexto, no otra prohibición.

#### El método se aplica también a las correcciones del método

La quinta ocurrencia fue sobre una corrección hecha **dos turnos antes**. La
lista de preguntas «ANALÍTICAS (rentabilidad, potencial de inversión, comparar
predios como inversión)» estaba en **DOS sitios del prompt**. Se corrigió uno.
El otro siguió vivo, mandando consultar al experto sobre exactamente lo que se
acababa de establecer que no se puede responder.

Es la doctrina §7 —«si la corrección deja el dato vivo en otro sitio, ese sitio
entra en el mismo lote»— aplicándose a sí misma. **Una corrección duplicada es
una corrección a medias**, y se siente como una corrección completa, que es lo
que la hace peligrosa: se tacha de la lista.

**Regla:** al corregir una instrucción, buscar la instrucción, no el sitio.
`grep` de la frase entera sobre TODO el contexto del agente antes de dar por
cerrada la corrección — y volver a hacerlo DESPUÉS, que es cuando se ve si
quedó una copia.

La sexta llegó por el mismo camino: una entrada de conocimiento prometía que Su
Finca Raíz «puede suministrar o gestionar» documentos, contradiciendo un límite
duro del prompt que llevaba semanas escrito. El límite existía; nadie había
comprobado si algo lo contradecía desde otra superficie.

#### El corolario, medido

La instrucción que viaja **dentro del resultado de una herramienta**, en el punto
de uso, se cumple. La misma como regla número N del prompt, a cuatrocientas
líneas del uso, no. Comprobado en las dos direcciones: la corrección del buscador
—que iba en el `aviso`— se sostuvo; y el permiso para inventar inventario futuro
—que iba en el `nota` de `resumen_portafolio`— **le ganó a una prohibición
explícita del prompt** escrita el mismo día.

> Cuando algo tenga que cumplirse siempre, pregúntate si puede llegar como DATO
> en el momento, en vez de como REGLA al principio.

Y la vuelta de tuerca: si el modelo no llama a la herramienta, tampoco hay
resultado donde poner la instrucción. Ver «Por qué Mac a veces no consulta».

### ⚠ Dos fuentes que coinciden no se verifican entre sí

Seis de los ocho municipios tenían el kilometraje del texto **idéntico** al del
campo. Parecía verificación cruzada. No lo era: **campo y descripción salieron
de la misma línea del mismo archivo**, `municipios-data.ts`, escrito a mano y
borrado como código muerto el 11/08/2026.

La Vega discrepaba —74/90 en el texto, 62/60 en el campo— **solo porque alguien
editó el campo y no el texto**. La discrepancia fue lo que destapó el problema;
las coincidencias lo estaban tapando.

**Regla:** antes de dar por verificado un dato porque dos sitios coinciden,
comprobar si los dos vienen del mismo origen. Si vienen, no hay dos fuentes:
hay una copiada dos veces.

### La Vega: 60 km · 1 h 14 min — MEDIDO

Ni 74/90 del archivo original ni 62/60 de la edición sin rastro.

```
Origen   Portal 80, Bogotá        ← el borde real por donde se sale
Destino  La Vega (casco urbano)
Ruta     Puente el Cortijo – Siberia – La Punta – El Vino – La Vega
Fuente   Google Maps, 19/08/2026, en automóvil con peajes
```

Medir desde el centro habría dado una cifra que nadie recorre. **El tiempo real
es MAYOR que el que publicábamos**: 74 min frente a 60, así que la corrección
va en contra del interés comercial, que es la señal de que es una medición y no
una cifra elegida.

Los otros siete siguen siendo estimación heredada, y su bloque de datos lo dice.
Entran en `MEDICIONES` (`lib/medicion-distancia.ts`) el día que se midan.

### ⚠ Auditar «el contenido de base» no es auditar UN CAMPO

Se dio por barrido el contenido de base tras revisar `descripcion_seo` de los
ocho municipios: 8 textos, ~260 caracteres cada uno.

**Faltaban cuatro campos largos por municipio** —`historia`, `clima`, `turismo`,
`inversion`—, unos **8.000 caracteres por municipio y ~64.000 en total**.
Publicados, citables, y fuera de todos los barridos anteriores.

Es más texto que todo lo revisado en las veinte pasadas previas juntas.

**Regla:** antes de dar por barrida una tabla, **enumerar sus campos de texto
largo y confirmar uno por uno que entraron**. El nombre del campo suele decir
dónde estará el problema: `inversion` es exactamente el registro donde vivían
los quince porcentajes de rendimiento.

```sql
-- Los campos de texto largo de municipality, para no volver a olvidarlos:
descripcion_seo · historia · clima · turismo · inversion
```

Estado del barrido por campo:

| Campo | Estado |
|---|---|
| `descripcion_seo` | ✅ auditado 19/08/2026 |
| `inversion` | ✅ auditado 20/08/2026 |
| `clima`, `turismo` | ⬜ pendiente |
| `historia` | ⬜ pendiente |

### ⚠ Editar la base por script salta la revalidación

Los `UPDATE` directos sobre `municipality` o `property` **no** disparan el
`revalidatePath()` que sí ejecuta el admin al guardar. La página sigue sirviendo
la versión prerenderizada hasta que venza su ISR —una hora— o hasta el
siguiente despliegue.

Es la otra cara de la regla de Mac: **Mac lee la base en tiempo real y cambia al
instante; las páginas NO**. Un mismo `UPDATE` deja al agente y al sitio
diciendo cosas distintas durante hasta una hora.

**Regla:** tras un cambio de datos por script, o se despliega, o se edita
además desde el admin para que dispare la revalidación. Verificar contra
producción inmediatamente después de un `UPDATE` da un falso negativo: no
prueba que el cambio esté mal, prueba que aún no se ha regenerado.

### Todo script que toque contenido publicado debe revalidar al terminar

Ampliación de la regla anterior. Un `UPDATE` directo sobre `municipality` o
`property` deja **al agente y a las páginas diciendo cosas distintas** hasta que
venza el ISR: Mac lee la base en tiempo real, el HTML no.

**Al terminar un script que toque contenido publicado: desplegar, o editar el
registro desde el admin para que dispare su `revalidatePath()`.** Verificar
contra producción inmediatamente después de un `UPDATE` da un falso negativo.

**Aplicado el 22/08:** las correcciones de fichas y de `mac_knowledge`
de esta sesión se hicieron por script. Mac ya está limpio (lee en vivo); **las
páginas seguirán sirviendo el texto viejo hasta el despliegue** o hasta que venza
su ISR. No es un fallo de la corrección: es esta regla, en efecto.

---

# 10. ESTADO AL CIERRE — 22/08/2026

Sesión del 20/08: 41 commits desde `65846af`, desplegados y verificados contra el
HTML servido.

**Sesión del 22/08 (esta): 5 commits, todo desplegado y verificado.**

```
fdd7ada  retirar afirmaciones de valor futuro de las fichas y el límite en Mac
733b5cb  la búsqueda por frase completa dejaba propiedades publicadas invisibles
085836b  retirar la novena forma de municipios, veredas, la guía y el blog
1175522  traspaso al cierre
5a224ce  inversion y valorizacion desaparecen; el nombre del campo era la afirmación
```

**131 afirmaciones retiradas en total**: 33 en las 36 fichas, 3 en
`mac_knowledge`, 40 en los ocho municipios, 27 en veredas, 14 en la guía y el
blog, más la entrada Tobia Chica entera. Y dos defectos de producto corregidos:
el buscador de Mac y el límite de valor futuro del agente.

## Lo que hizo esta sesión

### Barrido semántico de valor futuro sobre las 36 fichas

Son **36**, no 35. Se leyeron los cinco campos de texto de cada una preguntando
qué afirma cada frase sobre el valor futuro del inmueble, **sin patrón léxico**.

**20 reglas, 33 reemplazos, 10 fichas.** El detalle está en
`scripts/corregir-valorizacion.mjs`, que queda en el repositorio con las frases
exactas: es el registro de qué se quitó y de dónde.

Lo retirado, por gravedad:

1. **Albán** — «Precio de Venta: $980.000.000 (**con un valor comercial estimado
   por encima de los $1.200.000.000**)». Un avalúo inventado, sin atribuir, sobre
   el patrimonio de un tercero, afirmando que vale 220 millones más de lo que se
   pide. **Retirado sin sustituto: no hay versión correcta de un avalúo que nadie
   hizo.** La valuación es actividad regulada — Ley 1673 de 2013, reservada a
   avaluadores inscritos en el RAA.
2. **Palo de Agua** — la novena forma (§9), más «Inversión Segura» de encabezado.
3. **Senderos del Bosque** — cinco afirmaciones distintas en una sola ficha. No
   era una frase colada: era la tesis del texto.
4. **Osaka / Casa Campestre en condominio** y **Finca La Ceibita** — los cuatro
   «mayor valorización» ya reportados. Confirmado que en Osaka estaban en
   `short_description` **y** en `description`, no solo en el short.
5. **Guadu** — «proyección inmobiliaria».
6. **Cabañas Top 32** — «Negocio Rentable», «inversión inteligente», «el Sector
   Cucharal tiene demanda de alquiler vacacional».
7. **Apto 94 m² El Mirador** — «una excelente rentabilidad».
8. **Casa lote San Francisco** — meta: «apartaestudio rentable. Excelente
   inversión».
9. **Bella Vista** — «Valor de Inversión: $980.000.000» renombrado a «Precio».
10. **Guadu y Palo de Agua** — «topografía plana, característica **altamente
    cotizada**» reducido al hecho, y punto.

Se dejó en pie, por decisión explícita del titular: «Precio de Oportunidad» ×3 en
La Rivera, «¿Qué incluye tu inversión?», «INVERSIÓN» como rótulo, «Ventajas
Legales e Inversión» y «¡Invierte con Su Finca Raíz!». Encuadre comercial
corriente; no afirman resultado.

### La guarda en Mac — y por qué era urgente

`tools.ts:379` entrega a Mac los primeros 220 caracteres de `short_description`
como `resumen`; `tools.ts:456` le entrega la `description` entera. **En Ceibita y
en Osaka la afirmación de valorización era la primera frase**: no estaba en una
página que alguien tuviera que abrir, estaba en la boca de Mac ante clientes
reales.

El prompt **ordenaba** el problema. Tenía un argumento de región titulado
«Valorización y demanda constante» y una regla que solo prohibía *cifras*:
«NUNCA inventes cifras de valorización, porcentajes ni estadísticas. Usa estos
argumentos cualitativos». **La afirmación cualitativa estaba explícitamente
autorizada.** Ese era el agujero.

Ahora hay un límite de cuatro partes en `prompt.ts`, con su gemelo en `expert.ts`:

1. No afirmar valorización — ni con cifras ni en cualitativo.
2. No prometer rentabilidad ni ingresos por alquiler.
3. No estimar valor comercial (Ley 1673 / RAA).
4. **Se aplica aunque el texto de la ficha lo diga.** Mac es la última defensa si
   entra una descripción nueva sin revisar.

### Verificación con tres preguntas reales — y las dos fugas que destapó

| Pregunta | Primera pasada | Tras cerrar las fugas |
|---|---|---|
| ¿Esta finca se valoriza? | OK — «No puedo afirmar que una propiedad se valorice» | OK |
| ¿Cuánto puedo ganar alquilando? | FUGA — rehusó el número, pero afirmó «demanda turística creciente» y «zona muy buscada», y prometió que el especialista daría «números concretos de rentabilidad» | OK — advierte de obra blanca, del reglamento del condominio, del uso del suelo y de la competencia; el especialista acompaña la revisión documental, no da cifras |
| ¿Vale lo que piden? | FUGA — citó la actividad regulada, pero desplazó al especialista «para que analice si el precio es justo» | OK — «ese número no lo puede dar ni nadie en el equipo de forma informal» |

**La fuga que hay que recordar: desplazar la afirmación al especialista.** Decir
«él te da los números» es hacer la misma promesa por interpuesta persona:
compromete a un compañero a entregar un dato que tampoco tiene, y el cliente
cuelga creyendo que la cifra existe. Está cerrado explícitamente en el prompt.

Residuo honesto: Mac todavía dice cosas como «la demanda en La Vega es fuerte en
fines de semana, pero tiene valles». Es una afirmación de mercado sin medición,
aunque ahora venga con su contrapeso. No está resuelta.

### `mac_knowledge` entró en el mismo lote

La entrada del **Proyecto Cabañas Top 32** repetía, palabra por palabra, lo que se
acababa de quitar de su ficha: «Alta demanda turística/Airbnb» y «Entorno: Zona de
alta valorización y tendencia turística». Corregidas — doctrina §7: si la
corrección deja el dato vivo en otro sitio, ese sitio entra en el mismo lote.

## Lo que espera UNA DECISIÓN TUYA — lista completa

| # | Decisión | Estado |
|---|---|---|
| 1 | **Conectar las guardas a `npm run build`** — propuesta redactada, sin tocar el build. Ver «Las guardas y el despliegue», abajo | esperando tu OK |
| 2 | **La Vega — los cinco campos reescritos.** El texto lo conserva el titular fuera del repositorio y lo aporta al arrancar. Con su visto bueno se generan los siete municipios restantes | pendiente |
| 3 | **El residuo de Mac no se arregla por prompt** — verificado con tres muestras. Ver «Por qué el prompt no basta», abajo | esperando tu OK |
| 4 | **Proyecto Cabañas** — reescribir su `description` entera **antes** de derivar el short | pendiente |
| 5 | **Aviso en el admin** cuando `meta_description` repita el arranque de `description` | pendiente |
| 6 | **Primera ronda real de visibilidad IA**: 11 consultas × 6 motores | pendiente |
| 7 | **Auditar `turismo` e `historia`** de los 8 municipios — ~27.000 caracteres. De ahí salió «más de 50.000 visitantes mensuales» de Villeta | pendiente |

Cerrado el 22/08: el barrido de las 36 fichas, el límite de valor futuro en Mac
y en el experto, el buscador por términos, la novena forma en municipios,
veredas, guía y blog, la desaparición de `inversion` y `valorizacion`, y la
limpieza de `mac_knowledge`. Cinco commits, todo desplegado.

### Las guardas y el despliegue — PROPUESTA, sin aplicar

El hallazgo: `verificar-enlaces.mjs` y `verificar-build.mjs` **no están en
`npm run build`**, que es lo que ejecuta Vercel. Protegen solo si alguien se
acuerda de lanzarlas.

Al mirar cómo se comportan con la base caída aparece algo que cambia la
decisión: **las guardas que consultan la base YA distinguen «los datos
divergen» de «no llego a la base»**, y en el segundo caso no fallan.

| Guarda | Consulta la base | Con Railway caído |
|---|---|---|
| `publicable.ts` (`satisfies`) | no | n/a — es de tipos, rompe `tsc` |
| `enlaces.ts` | no | n/a — es de tipos |
| `veredas-integridad.ts` | **sí** | `return { ok: true }` + aviso. **No falla** |
| `tipos-integridad.ts` | **sí** | `return { ok: true }` + aviso. **No falla** |
| `verificar-enlaces.mjs` | sí, solo la clase (b) | avisa y **omite** la clase (b); la (a) sigue |
| `verificar-build.mjs` | no | es el envoltorio que lanza el build |

**Propuesta:**

1. **`verificar-enlaces.mjs` entra en `npm run build`**, como paso posterior:
   `"build": "prisma generate && next build && node scripts/verificar-enlaces.mjs"`.
   Su clase (a) —el enlace sin ruta que lo sirva— solo lee el árbol y los
   manifiestos de `.next`, y su clase (b) se omite sola si no hay base. Una
   caída de Railway **no** puede tumbar el deploy por esta vía.
2. **`verificar-build.mjs` se queda fuera**, y no por riesgo: *es* el envoltorio
   que lanza `next build`. Meterlo dentro sería recursivo. Su papel es el de
   comprobación local antes de empujar, y así debe documentarse.
3. **Las dos de tipos ya están dentro** —`tsc` corre en `next build`— y no
   dependen de nada externo. No hay nada que hacer.
4. **⚠ `veredas-integridad.ts` y `tipos-integridad.ts` ya corren dentro del
   build**, desde `generateStaticParams()`. Nadie lo había escrito. Son
   seguras porque degradan solas, pero conviene saberlo: **el build ya depende
   de la base para más cosas de las que parecía**.

**Lo que NO cubre nada de esto:** que el contenido publicado se degrade *sin*
que haya un despliegue. Un `UPDATE` desde el admin puede dejar un municipio sin
los seis campos, y ninguna guarda se entera hasta el siguiente build. Para eso
lo correcto es lo que propusiste: **una comprobación programada que avise sin
bloquear** — un cron diario (el plan Hobby no permite más) contra un endpoint
protegido con `CRON_SECRET` que corra las integridades sobre producción y
notifique por el mismo canal de WhatsApp que ya usan los leads. Eso vigila el
hueco real, que es el tiempo entre despliegues.

### Por qué el prompt no basta — el residuo de Mac, verificado

Se comprobó de dónde salía «la demanda es fuerte los fines de semana»:

- **No estaba en las fichas** (cero coincidencias tras el barrido).
- **No estaba en `mac_knowledge`** (cero en las seis entradas activas).
- **Estaba en el prompt**, en tres sitios: «la oferta limitada de tierra bien
  ubicada **sostienen el interés por la zona**», «las novedades son **las que
  más interés despiertan**», y una autorización explícita que se había escrito
  al poner el límite: «puedes decir qué hay (**turismo de fin de semana**…)».

Los tres se retiraron. La sección de argumentos de región ahora solo contiene
hechos comprobables, y lleva escrito por qué.

**Y aun así no basta.** Tres muestras de «¿cuánto puedo ganar alquilando?»:
dos siguieron desplazando la promesa al especialista —«te da números reales y
documentados»—. La presión viene de la regla 7, *prohibido dejar al cliente sin
salida*: obliga a ofrecer algo, y lo único que hay para ofrecer es el
especialista, así que el modelo le inventa capacidades.

**La observación que importa:** la corrección del buscador **sí** se sostuvo, y
la diferencia es *dónde llegó la instrucción*. Ahí el «no existe, no digas que
podría estar en camino» viaja **dentro del resultado de la herramienta**, como
dato, en el momento exacto en que hace falta. En el prompt es una regla entre
sesenta, a cuatrocientas líneas del punto de uso.

Si esa afirmación no debe salir NUNCA, la defensa correcta no es otra regla:
es un **filtro sobre la salida** —revisar la respuesta antes de enviarla y
regenerar si contiene una promesa de rendimiento, valorización o avalúo—, o
hacer que la instrucción llegue como resultado de herramienta. Un modelo
generativo no obedece prohibiciones como un filtro; hay que ponerle un filtro.

### ⚠ Un borrador que espera aprobación se escribe en un archivo

Los cinco campos reescritos de La Vega (2.349 car.) se propusieron **dentro de
la conversación del 20/08 y nunca se guardaron en un archivo**. No estaban en el
repositorio, ni en la base, ni en este documento. El titular los conservaba
aparte, así que no se perdieron —los aporta al arrancar la sesión siguiente—,
pero la sesión nueva no habría podido retomarlos por sí sola.

**Regla:** un borrador que espera aprobación no vive en el chat. Se escribe en
un archivo del repositorio —aunque no se publique— o deja de existir cuando la
sesión termina. Es la lección del estado escrito a mano, en la otra dirección:
lo que no queda en el árbol, no queda.

Lo mismo vale para el plan por sesiones: las etiquetas «Sesión 2» y «Sesión 3»
no son recuperables desde el repositorio (§3). El titular conserva el plan
original fuera del árbol y lo aporta al arrancar. **No se reconstruye de
memoria**: reconstruirlo sería el defecto que borró las listas.

### El buscador de Mac le decía a clientes que una propiedad no existe

CORREGIDO el 22/08. El filtro de texto libre hacía `contains` con la **frase
completa**. Medido contra producción:

```
"La Ceibita"                      -> 1
"Finca La Ceibita en Guacamayas"  -> 0   <- la frase que pasó Mac
```

Y como los criterios se relajan en cascada, el texto se descartaba en silencio y
Mac recibía OTRAS propiedades, de donde concluía que la pedida no existía: «no
la tengo en el portafolio (…) podría estar en camino». Es pérdida de leads.

Al arreglarlo aparecieron **dos fallos dentro del propio arreglo**, y los dos
importan más que el original:

1. **`contains` de Postgres no ignora tildes.** «alban» no encontraba «Albán».
   Normalizar solo la consulta no sirve: hay que normalizar los dos lados. El
   filtro se movió a JS —el catálogo son decenas de fichas— porque en la base
   habría que instalar `unaccent`.
2. **Un término corto cae dentro de otra palabra:** «top» encontraba
   «topografía». Se exige inicio de palabra, y los resultados se puntúan
   (título 5, vereda 3, municipio 2, cuerpo 1) para que la ficha que SE LLAMA
   como lo que pidió el cliente salga primera.

La lógica pura vive en `src/lib/agent/busqueda-texto.ts`, **sin un solo
import**, para que `scripts/probar-busqueda.ts` ejercite el código que corre en
producción y no una copia. 19/19 casos.

### La novena forma, retirada — 81 afirmaciones el 22/08

`scripts/buscar-valor-futuro.mjs` recorre las seis superficies de la lista B en
una pasada. Encontró la novena forma viva a escala, y se retiró:

| Dónde | Afirmaciones |
|---|---|
| `municipalities` — los 8 campos `inversion` y las FAQ | 40 |
| `veredas-data.ts` y la plantilla de vereda | 27 |
| `guia-inversion` y el artículo «Cumpleaños de Cundinamarca» | 14 |

La Vega repetía **literalmente** la frase que se había quitado de la ficha de
Palo de Agua. Las FAQ eran lo peor, porque van redactadas como respuesta a una
pregunta directa: «¿Cuánto se valoriza una finca en La Vega por año?», «la mayor
tasa de valorización del Gualivá», «la mayor relación precio-valorización
esperada de la región», «oportunidad de compra antes de la valorización masiva».

**Los 90 minutos, por fin.** La FAQ seguía diciendo que la doble calzada «redujo
el trayecto a 90 minutos» y que son 74 km: la cifra del archivo original, viva
después de la medición. Sustituida por 60 km y 1 h 14 min desde el Portal 80,
con método y fecha en la propia respuesta.

**Lo que NO se tocó del blog:** los artículos «¿Dónde invertir en 2026?» y
«Posesión inmediata vs mera tenencia» dicen expresamente que «estos proyectos no
significan automáticamente que una propiedad vaya a valorizarse» y que «hablar
de potencial de inversión es mucho más responsable que prometer rentabilidad».
Son la doctrina aplicada, no el problema. Nacieron después de ella.

### El campo `valorizacion` de las veredas: qué quedó — DECISIÓN PENDIENTE

Son **once** bloques, no doce: el duodécimo `valorizacion:` es la declaración
del campo en la interfaz. 4.775 caracteres en total.

El nombre del campo ES la novena forma —su propósito declarado era afirmar
plusvalía futura por vereda— y la plantilla lo remataba con un encabezado en
forma de pregunta: «¿Qué potencial de valorización tiene la vereda X?». En el
sitio más citable de la página, presuponiendo la respuesta. Ya pregunta qué hay
que saber del mercado.

Retiradas las afirmaciones, **lo que queda es heterogéneo**, y por eso la
decisión no es una sola:

| Vereda | Qué sobrevivió |
|---|---|
| **Tabacal** | Lo mejor del archivo: la pavimentación está en el **Plan de Desarrollo Municipal 2024–2027**, con la advertencia de que es obra prevista y no ejecutada. Hecho citable, con fuente |
| **La Libertad** | La figura **RNSC** y sus beneficios tributarios. Normativo |
| **Chupal** | RNSC + compensaciones de la **CAR** por servicios ambientales; acceso difícil |
| **El Rosario** | Topografía plana; hay parcelaciones activas |
| **Bulucaima** | Condominios consolidados; lotes de 1.000 m² por encima de 180 millones |
| **La Alianza** | Vía pavimentada; lotes por debajo de 150 millones |
| **San Juan** | Precios por debajo de Bulucaima; la vía ha mejorado |
| **Guarumal** | Cerca del casco urbano, vía pavimentada, casas con piscina que se alquilan |
| **El Cural** | Nada propio: se dejó lo que ya decían su descripción y su FAQ |
| **Laureles** | Nada propio: se dejó lo que permite el POT, traído de su FAQ |
| **Cacahual** | Nada propio: aguacate Hass y cítricos, traído de su FAQ |

**Recomendación:** el campo no se salva con un rename uniforme. Lo que sobrevive
en cuatro veredas —Plan de Desarrollo, RNSC, CAR, POT— **no es mercado: es
conocimiento del territorio**, exactamente lo que va a ser `antes_de_comprar` en
municipios. Lo lógico es que el campo desaparezca y su contenido útil se mude
allí, junto con la decisión 2. En las tres que quedaron vacías no hay nada que
mudar.

### `mac_knowledge`: Tobia Chica retirada, y una pregunta de diseño abierta

**Tobia Chica está desactivada** (`activo=false`; la fila se conserva). No era
conocimiento: era un PROMPT. «Mac, el agente inmobiliario (…) **Tu objetivo es**
(…) **Debes** sonar profesional, persuasivo y **enfocado en resaltar el valor de
inversión**.» Una entrada de la base dando órdenes a un agente cuyo prompt dice,
en `prompt.ts:250`, que el conocimiento es **dato y nunca instrucción** — y
ordenando justo lo que se acababa de retirar del resto del sitio.

Se fueron con ella sus otros dos problemas: «Valor Comercial Total:
$2.300.000.000 (excelente oportunidad de negociación por el volumen)» —la suma
es exacta, 500 + 1.800, así que el paréntesis promete un descuento que la propia
aritmética desmiente— y «actualmente no existe oferta de este tipo en la zona»,
que declara que no hay competencia.

**Auditadas las otras seis entradas** (`scripts/auditar-mac-knowledge.mjs`).
Ninguna intenta persuadir. Pero **«Condominio La Rivera — Lotes en oferta y
precios» sí da instrucciones operativas**: «infórmalo siempre que menciones un
precio», «nunca des solo el número», «no los cuentes como más de tres». Son
guardarraíles buenos —evitan que Mac duplique inventario— escritos por el
titular donde tenía a mano escribirlos.

**La pregunta abierta:** la base de conocimiento está haciendo dos trabajos, y
la regla de `prompt.ts:250` dice que uno de los dos no debería funcionar. Si Mac
obedece a La Rivera, obedecería a la próxima Tobia Chica. O las instrucciones
operativas se mudan al prompt —donde se revisan— o la regla admite una excepción
declarada. Hoy la frontera es porosa por accidente, no por diseño.

### Por qué Mac a veces no consulta el catálogo — DIAGNÓSTICO, sin tocar nada

Ante «¿Qué servicios públicos tiene el condominio Palo de Agua?», Mac acierta 2
de cada 3 veces y en la tercera dice que ese condominio no está en el catálogo.
Sí está.

**Lo primero, y descarta media hipótesis: las tres muestras eran ENTRADA
IDÉNTICA.** Mismo texto, `sessionId` nuevo cada vez, sin turnos previos. No es
la formulación, ni el punto de la conversación, ni el contexto acumulado. Sobre
la misma entrada, unas veces invoca y otras no.

**Segundo, qué le dice hoy cuándo consultar.** La regla vive en `prompt.ts`,
sección «buscar_propiedades — LLAMADA INMEDIATA», y está escrita **por
ejemplos, y todos son de compra**:

> «cuando el cliente mencione cualquier tipo de inmueble, zona, uso o
> características **de búsqueda**. Ejemplos: "busco una finca", "quiero un
> lote", "¿tienen casas en La Vega?"…»

«¿Qué servicios públicos tiene X?» no se parece a ninguno. **No es una intención
de compra: es una pregunta de dato sobre un inmueble con nombre propio.** Cabe
perfectamente clasificarla como algo que se responde, no como algo que se busca.
La línea «si el cliente usa un nombre propio pásalo en "texto"» dice CÓMO buscar
si buscas; no dice que haya que buscar.

**Tercero, el hueco exacto.** La regla 1 dice «NUNCA inventes propiedades…, toda
información de inmuebles debe venir de la herramienta». Eso prohíbe **afirmar
que algo existe** sin consultar. Cuando Mac dice «no tengo Palo de Agua» no está
inventando una propiedad: está afirmando una AUSENCIA. **Y no hay ninguna regla
que diga que negar también exige consultar.** Un catálogo de 35 fichas cabe
entero en una consulta; afirmar que algo no está sin mirar es gratis y nadie lo
prohíbe.

**Por qué no es caso de filtro de salida.** Filtrar «no está en el catálogo»
bloquearía la frase, pero Mac seguiría sin saber que la propiedad existe: no
tendría con qué sustituirla. El defecto está en la decisión de invocar, no en lo
que sale.

**La dirección correcta, para decidir:** invertir la carga. Que consultar sea el
comportamiento POR DEFECTO ante cualquier mención de una propiedad, un municipio
o una vereda —se busque o se pregunte—, y responder sin consultar la excepción
que hay que justificar. Hoy es al revés: consultar se dispara con una lista de
frases de compra, y todo lo demás cae fuera.

Pendiente de decisión. No se ha tocado.

### ⚠⚠ LO QUE SE CALLA — la auditoría inversa

Ciento y pico afirmaciones retiradas por prometer de más. El 22/08 se hizo por
primera vez la pasada contraria: **qué sabemos y no publicamos**.

**Un hecho material adverso conocido y no publicado es peor que una promesa.**
La promesa infla una expectativa; el silencio hace que alguien conduzca una hora
y media para descubrir en el sitio lo que estaba escrito en nuestra propia base.
Y en Colombia el vendedor responde por los vicios que conocía —saneamiento por
vicios redhibitorios, Código Civil arts. 1893 y ss.—, así que callarlos no es
solo mala práctica comercial.

`scripts/auditar-hechos-adversos.ts` · 37 hallazgos sobre 35 fichas.

#### Corregidos: tres afirmaciones nuestras que chocaban con datos nuestros

| Ficha | Decía | Nuestra propia fuente |
|---|---|---|
| **Condominio Oeste** | «combina la tranquilidad del campo con **fácil acceso**» | `veredas-data.ts`, vereda Tabacal: «Vía destapada desde La Vega en proceso de pavimentación. **Acceso 4x4 recomendado en temporada de lluvias**» |
| **La Rivera** | «Vías de acceso en **placa huella** hasta la entrada de tu lote» | el conocimiento: «vía carreteable con **tramos mixtos (asfaltada, placa huella y destapada)**» |
| **Lote campestre 500 m²** | «Entorno: Natural y con panorámicas» | el conocimiento: «El predio posee un **relieve inclinado**» |

El de La Rivera es la variante fina: **no era falso, era la parte buena de la
verdad**. Nombrar el mejor tramo y callar el peor es la misma familia de
defecto.

Los tres se escribieron **sin suavizar**: «el predio tiene relieve inclinado»,
no «con desniveles naturales»; «vía destapada, 4x4 recomendado en lluvias», no
«acceso campestre».

#### Silencio, no contradicción — pendiente de decisión

Lo que sigue no es una afirmación falsa: es un hueco. Pero en fincas y lotes son
las dos primeras preguntas de cualquier comprador.

- **20 fichas no mencionan el acceso vial.** Entre ellas Casa Chicala, Casa Lote
  San Antonio, La Paloma, El Cural, Buenos Aires, La Ceibita, Senderos del
  Bosque, Guadu, La Alborada, Bulucaima, La Huerta Golf, Llano Grande.
- **16 fichas no mencionan servicios públicos.** Entre ellas Casa Chicala, Isaic
  Laureles, La Fontana I, Casa En Condominio, Condominio Oeste, Lepin, Alameda.

En un lote rural, «no dice si hay agua» y «no hay agua» se leen igual de mal, y
el comprador asume lo segundo. Publicar «acueducto veredal» o «sin conexión,
requiere pozo» son las dos igual de útiles; no decir nada, no.

#### Datos estructurales que siguen esperando al titular

- **Finca Agropecuaria**: área de lote de **22 m²** para una finca. Imposible.
  Falta el folio.
- **Casa En Condominio** y **Casa Central**: sin área declarada, ni de lote ni
  construida.

### Lo que Mac sabe y la ficha no publica — 29 datos recuperables

`scripts/auditar-conocimiento-vs-ficha.ts` compara cada entrada de
`mac_knowledge` con la ficha de su propiedad. Va en dirección contraria a todo
el saneamiento: **material ya escrito y verificado que hoy solo alcanza a quien
conversa con Mac.** En la ficha alcanzaría también a Google y a los motores
generativos.

**Lote campestre de 500 m²** — el que destapó esto:

| Dato | La ficha dice |
|---|---|
| Sector **El Cucharal** | no lo nombra |
| **8 minutos** en vehículo al Parque Principal | solo «1,3 km» |
| Agua: **acueducto veredal** | nada |
| Energía: **Enel-Codensa** | nada |
| Alcantarillado: **pozo séptico** | nada |
| Internet: operadores locales o **Starlink**, sujeto a disponibilidad | nada |

**Condominio La Rivera:**

- **15 a 18 minutos** en carro desde el pueblo.
- Administración: **$400.000 a $450.000** mensuales, calculada por coeficiente.
- Cada lote con **matrícula inmobiliaria independiente**.
- **Alcantarillado**, y viabilidad de pozo séptico.
- **Red eléctrica subterránea**.

**Proyecto Cabañas Top 32:**

- **1,2 km** al parque principal; la Laguna del Tabacal a **7 km**.
- **Plano topográfico** por lote.
- Internet por **fibra óptica, antena o Starlink**.

⚠ Ojo al leer la lista en bruto: parte de los 29 son **diferencias de formato**,
no huecos —la ficha de Cabañas dice «desde $285.000.000» y el conocimiento
«$285.000.000 COP»—. Los de las tablas de arriba están comprobados uno a uno.

Y una nota que no es dato: la entrada del lote incluye «NO afirmar que Starlink
está instalado». Es una instrucción, no un hecho, y por tanto tiene el mismo
problema de frontera que ya se cerró con Tobia Chica. En la ficha eso se escribe
como lo que es: «sujeto a disponibilidad».

### Datos escritos a mano en el prompt — qué queda y por qué

Tras derivar horario, altitud, clima y distancias a `datos-canonicos.ts`, se
revisó el prompt entero buscando cifras y hechos. Lo que queda:

**Legítimo, porque no se puede derivar de nada del sistema:**

| Qué | Por qué se queda |
|---|---|
| Ley 1673 de 2013, Ley 1581, Ley 1480 | Citas normativas. No cambian, y su fuente es externa |
| «Leonel Macgiver López Albadán» | Identidad del titular; hay una regla sobre cómo nombrarlo |
| `https://www.sufincaraiz.com` | Constante del despliegue |
| Formato `$150.000.000` | Es un formato, no un dato |
| «20 hectáreas» | Retórica de un ejemplo sobre no encasillar al cliente |

**Corregido en esta pasada, porque era dato a mano Y FALSO:**

- El EJEMPLO de manejo de objeciones decía «Ese clima cálido a solo **hora y
  media** de Bogotá … y por eso **la valorización ha sido constante**». Una
  distancia a ojo —son 1 h 14 medidos— y una afirmación de valorización, en el
  sitio que más se imita. Reescrito con las cifras de la ficha.
- «Proyecto destacado: **Proyecto La Vega** (lotes para cabañas)». **No existe
  en el catálogo**: el proyecto de lotes con cabaña es «Cabañas Top 32». El
  prompt llevaba meses invitando a nombrar algo inexistente. Retirado; los
  proyectos salen de `buscar_propiedades`, que sabe cuáles hay hoy.

**Regla:** si un dato puede derivarse, se deriva. Y los EJEMPLOS cuentan como
contenido: son lo que el modelo copia.

## Lo que espera un DATO que solo tienes tú — lista completa

- **Vereda de «Finca para Proyecto»** — el título dice El Cural, el cuerpo dice
  vereda Tabacal. Se contradice sola.
- **Áreas** de Casa Central y de Casa En Condominio (vacías en base).
- **Folio de la Finca Agropecuaria** — sus 22 m² son imposibles.
- **Casa Chicala** — lote de 136 m² en base; su texto dice predio de 72 m².
- **Las 6 veredas que faltan** del POT de La Vega (21 de 27 sembradas).
- **Descripciones de las 4 casas rurales** que deben decir «casa campestre».
- **Las 5 FAQ de territorio** (`lib/faqs-territorio.ts`), cada una con su guion y
  qué dato falta. No se exportan al hub hasta tener respuesta.
- **La Vega, del bloque nuevo** — que las tres figuras de agua (acueducto veredal,
  concesión CAR, nacedero) conviven; que **no** todas se transfieren
  automáticamente con la venta; que el EOT se consulta en Planeación municipal y
  no en curaduría; y la fundación **en 1605 por Juan de Borja**.

## Auditorías PENDIENTES

| Qué | Volumen | Estado |
|---|---|---|
| `clima` + `turismo` de los 8 municipios | ~12.000 car. | pendiente |
| `historia` de los 8 municipios | ~15.000 car. | pendiente |
| Enlace del propietario (token+PIN) vs política de tratamiento | — | pendiente |

## Hallazgos REPORTADOS y sin corregir

Nuevos del 22/08, fuera del alcance de «valor futuro» pero de la misma familia:

- **Villeta, faq[0]: «más de 50.000 visitantes mensuales».** Cifra sin fuente ni
  método, en un campo pensado para ser citado. Es caso 2 de §2 y no se tocó
  porque no es una afirmación de valor futuro — pero es de las peores que
  quedan.
- **La Vega, campo `turismo`: «se ha consolidado como uno de los destinos
  turísticos más atractivos de Cundinamarca».** Posición comparativa sin
  medición. Vive en los ~27.000 caracteres de `clima`/`turismo`/`historia` que
  siguen sin auditar.
- **Residuo en Mac:** todavía dice cosas como «la demanda en La Vega es fuerte
  en fines de semana, pero tiene valles». Es una afirmación de mercado sin
  medición, aunque ahora venga con su contrapeso. El prompt lo prohíbe
  explícitamente y aun así se cuela: el límite reduce, no elimina.

De antes:

- **~145 adjetivos valorativos** en los cinco campos de 7 de los 8 municipios. NO
  se parchean uno a uno: se resuelven en la reescritura completa.
- **11 «exclusivo / inigualable / de lujo»** en fichas de propiedad. Se limpian
  cuando el titular reescriba cada descripción.
- **Los dos «perfecto»** de Venta de Lotes Planos, ídem.

## Aprobado y a medio aplicar

**Derivar `short_description` de `description`** — primer párrafo o dos frases
completas, nunca truncado a caracteres. `meta_description` NO se deriva.

- Palo de Agua — hecho: estaban invertidas, intercambiadas.
- Apartamento Victoria Real — hecho: derivada sin pérdida.
- **Proyecto Cabañas** — pendiente: reescribir `description` primero.
- **Finca para Proyecto** — pendiente: dato del titular (ver arriba).

## El tablero de visibilidad

`/admin/visibilidad-ia` — operativo, **2 mediciones**: la línea base del
18/08/2026 con Gemini y ChatGPT, registrada como medición de *retraso de
propagación*, no de estado del sitio.

Las 11 consultas de control son fijas. `c11` mide si la corrección del «estudio de
títulos incluido» se propaga. `c08` lleva nota de vigilancia por la colisión de
nombre que estuvo publicada unas horas.

**Falta la primera ronda real: 11 consultas × 6 motores.** Es lo único que va a
decir si todo este trabajo se nota.

---

# 11. ESTADO FINAL DEL CICLO DE VERACIDAD — 22/08/2026

Cierre formal del ciclo que empezó el 20/08. Esta sección es el resumen
completo: si solo se lee una parte del documento, que sea esta.

## Las cifras

| | |
|---|---|
| **Afirmaciones retiradas o reencuadradas** | **≈ 220** |
| Formas de esconderse catalogadas | **11** |
| Guardas activas | **7** + 1 vigilancia diaria |
| Superficies auditadas | 6 de 6 (una parcialmente) |
| Defectos de producto corregidos | 4 |

Desglose de las ≈220:

| Lote | Cuántas |
|---|---|
| Sesión del 20/08 (cifras, gratuidad, alcance, rankings) | ~48 |
| Fichas de propiedad — valor futuro | 33 |
| `mac_knowledge` | 3 + 1 entrada entera borrada |
| Municipios — `inversion` y FAQ | 40 |
| Veredas — campo `valorizacion`, ventajas, FAQ | 27 |
| Guía de inversión y blog | 14 |
| Prompt de Mac y `expert.ts` | ~20 |
| Hechos adversos: afirmaciones que contradecían datos propios | 3 |
| Instrucciones migradas del conocimiento al prompt | 17 |

## Las once formas de esconderse

| # | Se escondió en | Ejemplo real |
|---|---|---|
| 1 | — (el primer barrido) | 15 porcentajes de rendimiento |
| 2 | **capitalización** | «Blindaje Jurídico», con B mayúscula |
| 3 | **ausencia de verbo** | «Liderando»; «la región de mayor valorización» |
| 4 | **salto de línea** | `todos a menos de 2 horas\nde Bogotá` |
| 5 | **la base de datos** | 44 textos que ningún `grep` alcanza |
| 6 | **exigir un dígito en el patrón** | «Alta Rentabilidad», sin cifra |
| 7 | **adjetivos fuera de la lista** | Quebradanegra: `virgen`, `decente`, `incipiente` |
| 8 | **otro adjetivo, misma afirmación** | «**mayor** valorización» ×4 |
| 9 | **el sujeto se muda al municipio** | «La Vega se ha consolidado… por su rápida valorización» |
| 10 | **un EJEMPLO de respuesta modelo** | «y por eso la valorización ha sido constante» |
| 11 | **ser CIERTA, pero solo la mitad buena** | «vías en placa huella», siendo asfaltado + placa huella + destapado |

Las tres últimas no tienen marcador léxico. La 9 cambia el sujeto gramatical, la
10 vive donde nadie audita, y la 11 **es verdad**.

## Las guardas, y qué impide cada una

| Guarda | Impide | Dónde corre |
|---|---|---|
| `veredas-integridad.ts` | Que `veredas-data.ts` y la tabla diverjan | dentro de `next build` |
| `tipos-integridad.ts` | Que el catálogo de tipos y `Property.type` diverjan | dentro de `next build` |
| `publicable.ts` (`satisfies`) | Que las tres copias del criterio de municipio publicable se desincronicen | `tsc` |
| `enlaces.ts` | El rótulo de navegación escrito a mano | `tsc` |
| `verificar-enlaces.mjs` | Enlaces a rutas inexistentes y a filtros sin inventario | **último paso de `npm run build`** — también en Vercel |
| `verificar-build.mjs` | Que un `EXIT=0` esconda un P2024 o un fallo de prerender | local, antes de empujar |
| `prompt.ts` + `expert.ts` | Que Mac afirme valorización, rentabilidad o valor comercial **aunque la ficha lo diga** | en cada conversación |
| **`/api/cron/vigilancia`** (13:00) | La degradación **entre despliegues**: integridad, municipios incompletos, valor futuro reintroducido desde el admin, instrucciones en el conocimiento, y **ficha que contradice a su vereda** | diario, avisa por WhatsApp y **no bloquea** |

Las que consultan la base distinguen «los datos divergen» de «no llego a la
base». Cualquier guarda nueva que consulte la base **tiene** que hacerlo, o
tumbará despliegues por caídas de Railway.

## Superficies: qué quedó auditado y qué no

| Superficie | Estado |
|---|---|
| `properties` — 5 campos × 36 fichas | ✅ valor futuro, gratuidad y hechos adversos |
| `municipalities` — `inversion`/`antes_de_comprar` + FAQ + `descripcion_seo` | ✅ |
| `municipalities` — `turismo` e `historia` | ✅ auditados el 22/08 — 30.662 car., ≈38 afirmaciones. Ver §12 |
| `veredas-data.ts` | ✅ |
| `mac_knowledge` | ✅ 0 persuasión, 0 instrucciones |
| Prompt de Mac y `expert.ts`, **ejemplos incluidos** | ✅ |
| `articles` — blog | ✅ los tres artículos |
| `page_content`, `businesses` | ✅ (sin hallazgos) |
| `llms.txt`, JSON-LD, `public/` | ✅ en la sesión del 20/08 |

**Lo que falta es una cosa concreta y está medida:** `turismo` e `historia` de
los ocho municipios, ~27.000 caracteres. De ahí salió «más de 50.000 visitantes
mensuales» de Villeta y «uno de los destinos turísticos más atractivos de
Cundinamarca» de La Vega, las dos encontradas de refilón. **No se ha leído
entero.**

## Los cuatro defectos de producto

1. **El buscador de Mac** decía que propiedades publicadas no existían. Tres
   causas encadenadas: `contains` de frase completa, tildes, y términos cortos
   dentro de otras palabras. 24/24 casos.
2. **`resumen_portafolio` contaba mal**: el `_count` por municipio no filtraba
   por `status`, así que Mac decía «34 en La Vega» y «35 en total».
3. **El clima de Mac no era el del sitio** — 22-28 °C contra 18-26. Y el
   horario respondía «24/7» habiendo un horario de sede publicado.
4. **84 servicios capturados y nunca pintados.** `serviciosKeys` era una lista
   a mano que no incluía la clave `servicio`, así que catorce fichas parecían no
   tener agua teniendo el dato guardado. El acceso, ídem: no se pintaba nunca.

## Lo que sigue esperando dato del titular

- **14 fichas sin acceso vial** y **1 sin servicios** (Senderos del Bosque):
  se llenan en `/admin/completar-fichas`, con casillas para los servicios
  frecuentes y campo libre. La lista **se deriva**: al llenarlas desaparecen, y
  una ficha nueva sin el dato aparece sola.
- **Finca Agropecuaria**: 22 m² de lote para una finca. Falta el folio.
- **Casa En Condominio** y **Casa Central**: sin área declarada.
- Y la lista larga de §10.

---

# 12. AUDITORÍA DE `turismo` E `historia` — 30.662 caracteres

La última superficie. **Son 30.662 caracteres, no 27.000.** Ocho municipios, dos
campos. Criterios: los seis del §9 más (g) contradicción con datos propios y la
undécima forma.

**Reporte, no corrección.** Es texto para reescribir con la estructura de cinco
campos: lo que hace falta es saber qué hay antes de decidir.

## El patrón, y es el hallazgo que más ahorra trabajo

**Los cuerpos son buenos. Los defectos se concentran en la primera y la última
frase.** Cinco de los ocho tienen historia específica, fechada y con nombres
propios —exactamente lo que un motor generativo cita— envuelta en un sándwich:
un ranking para abrir, una llamada a invertir para cerrar.

En esos cinco **no hay que reescribir: hay que quitar el pan del sándwich.**

Los otros tres son harina de otro costal, y ahí sí no compensa parchear.

## Municipio por municipio

### 🔴 san-francisco — turismo 1.790 · historia 1.777 · NO COMPENSA PARCHEAR

El único cuya **historia no contiene historia**: ni una fecha, ni un nombre, ni
un hecho. «Desde su constitución como municipio en el siglo XIX» es todo.

- (e) «uno de los destinos de naturaleza **más atractivos** del occidente»
- (e) «se ha convertido en **el lugar ideal**»
- (e) «bosques de niebla, **considerados uno de los ecosistemas más valiosos**» — ranking + atribución a nadie
- «una **excelente infraestructura** para el turismo rural»
- demanda «un destino **cada vez más buscado**»
- (e) cierre: «**continúa posicionándose como uno de los municipios con mayor atractivo** para vivir, vacacionar e **invertir**»
- (e) historia: «uno de los municipios **más representativos** de la provincia»
- «convirtiéndose en un **referente de desarrollo sostenible**»
- mercado: «ha impulsado el crecimiento del turismo y **del mercado inmobiliario, atrayendo a familias e inversionistas**»
- (e) cierre: «una de las zonas con **mayor atractivo natural** del departamento»

**Retirando las afirmaciones queda prosa genérica sobre café y bosques de
niebla.** Rehacer.

### 🔴 vergara — turismo 1.888 · historia 1.948 · HISTORIA: NO COMPENSA

El **turismo está bien** —Cañón del Tobia, ríos Negro y Tobia, aviturismo, «poco
masificado»— y solo pide limpiar el cierre.

La **historia no tiene ni una fecha ni un nombre propio**, igual que San
Francisco:

- (e) «uno de los municipios con **mayor tradición agrícola** de la provincia»
- (e) «un **referente de producción agrícola** en el occidente»
- cifra heredada: «aproximadamente **112 kilómetros** de Bogotá» — estimación de `municipios-data.ts`, nunca medida
- cierre entero: «**se proyecta** como un municipio con **grandes oportunidades**… **consolidándose como un destino ideal** para vivir, **invertir**»

### 🟠 la-vega — turismo 2.028 · historia 2.984 · QUITAR EL SÁNDWICH

Cuerpo histórico sólido: Doymas y Bulucaymas, nación Panche, 1605, censos del
XVIII, parroquia de San Juan de La Vega, la carretera a Bogotá a mediados del XX.

- (e) «se ha consolidado como uno de los destinos turísticos **más atractivos** de Cundinamarca»
- **cifra sin fuente: «cada fin de semana, MILES de visitantes»**
- «un **importante motor económico** de la región»
- (e) + atribución vaga: el mercado dominical «**considerado el más grande de Cundinamarca**»
- demanda: «**muy apreciadas** tanto por turistas como por **inversionistas**»
- (e) cierre: «**continúa posicionándose como uno de los mejores destinos** para vacacionar, vivir o **invertir**»
- (e) historia: «uno de los municipios con **mayor riqueza histórica** de la región»
- (e) historia: «**reconocida como uno de los municipios más atractivos** de Cundinamarca para vivir, **invertir**»

**⚠ (g) DOS CONTRADICCIONES, y las dos importan:**

1. **La misma página se contradice sobre el mercado campesino.** `turismo` dice
   que es «**el más grande** de Cundinamarca»; `historia` dice que es «**uno de
   los** mercados campesinos **más importantes**». Dos afirmaciones distintas
   sobre el mismo hecho, a dos pantallas de distancia.
2. **El fundador.** `historia` afirma, con fecha exacta, «el **3 de junio de
   1605**, cuando el licenciado **Alonso Vásquez de Cisneros** ordenó la
   fundación». En §10, entre lo que espera dato tuyo, está anotado «fundación en
   **1605 por Juan de Borja**, sin confirmar». **El campo ya publica un fundador
   distinto del que el traspaso da por pendiente.** Uno de los dos está mal.

### 🟠 villeta — turismo 2.219 · historia 1.675 · QUITAR EL SÁNDWICH

- (e) doble en la primera frase: «uno de los destinos turísticos **más
  importantes** del departamento y uno de los **preferidos**»
- (e) «Tobia, uno de los destinos **más reconocidos de Colombia** para el turismo
  de aventura»
- **⚠ VALOR FUTURO VIVO**: cierre «invertir en apartamentos, casas campestres,
  hoteles, fincas y **proyectos turísticos con gran potencial**». El barrido de
  valor futuro del 22/08 **no cubrió `turismo`**: esta es la prueba de que la
  superficie faltaba.
- (e) historia: «uno de los municipios con **mayor tradición histórica, cultural
  y agroindustrial** del departamento»
- sin fuente: Bolívar «recorrió este corredor estratégico en varias ocasiones»

«Capital panelera de Cundinamarca» es un título de uso corriente y verificable;
no lo cuento como ranking.

### 🟡 sasaima — turismo 1.997 · historia 2.374 · QUITAR EL SÁNDWICH

Historia **excelente**: Gran Cacique Cacaima, 1541 y Hernán Pérez de Quesada, la
ranchería destruida en El Cural, 1550 y fray Fernando de Montoya, la fundación
en Cocunche entre la quebrada Talauta y el río Dulce.

- (e) apertura: «uno de los destinos **más atractivos** del occidente»
- cierre turismo: «se consolida como un destino ideal para… **invertir**»
- cierre historia: «**modernas oportunidades de inversión**»

**⚠ (g) FECHA COMPARTIDA.** Sasaima declara su fundación el «**3 de junio de
1605**, cuando el oidor **Alonso Vásquez de Cisneros** ordenó el establecimiento
del nuevo pueblo». La Vega declara **exactamente la misma fecha y el mismo
oidor**. Nocaima declara el **8 de junio de 1605**, mismo oidor — coherente.
Que el mismo visitador fundara dos pueblos el mismo día es posible; que la fecha
esté copiada de un municipio a otro, también. **Hay que verificarlo: son tres
fechas de fundación publicadas y dos coinciden.**

### 🟢 nocaima — turismo 1.779 · historia 3.180 · SOLO EL SÁNDWICH

La **mejor historia de las ocho**: Ucalatatauiti, el cacique Pedro Payandá, 8 de
junio de 1605, Diego de Herrera Bustos, las minas de Cocunche y los cañones que
se conservan en museos de Bogotá, curato en 1732, parroquia en 1777, el combate
de 1899 donde capturaron a Olaya Herrera, el colegio de 1940, la Normal de 1959.

Todo eso es material citable de primera. Lo único que sobra:

- (e) apertura: «uno de los municipios con **mayor riqueza histórica** del occidente»
- (e) cierre: «uno de los **lugares preferidos** para adquirir fincas»
- cierre turismo: «se consolida como un destino **perfecto** para… **invertir**»

### 🟢 nimaima — turismo 1.875 · historia 2.433 · CASI LIMPIO

Historia impecable: 1595 y el oidor Miguel de Ibarra, Don Cristóbal Fixo, 1604,
1621 con **186 habitantes**, minas de cobre y fuentes salinas, municipio
definitivo en 1904. **Cero afirmaciones.**

Turismo, solo el cierre: «se consolida como un destino ideal para… **invertir**».

### 🟢 quebradanegra — turismo 367 · historia 348 · LIMPIO

El más corto y el más honesto de los ocho. Dice que su turismo es
«**incipiente**», que los senderos están «**sin señalización comercial**» y
ofrece «escapar de la masificación». Fundada como corregimiento de Útica,
municipio en 1959.

**Nada que retirar.** Su problema es el contrario: 715 caracteres frente a los
5.012 de La Vega. Le falta contenido, no le sobra.

## Resumen para decidir

| Municipio | Registro | Qué hacer |
|---|---|---|
| san-francisco | 🔴 alto, sin sustancia | **rehacer los dos campos** |
| vergara | 🔴 historia sin fechas | **rehacer `historia`**; `turismo` solo el cierre |
| la-vega | 🟠 alto, cuerpo bueno | quitar sándwich + **resolver las dos contradicciones** |
| villeta | 🟠 alto, cuerpo bueno | quitar sándwich + el «gran potencial» que sobrevivió |
| sasaima | 🟡 medio | quitar sándwich + **verificar la fecha de fundación** |
| nocaima | 🟢 bajo | quitar 3 frases |
| nimaima | 🟢 muy bajo | quitar 1 frase |
| quebradanegra | 🟢 limpio | ampliar, no corregir |

**≈38 afirmaciones** en total. Y la conclusión que ahorra el trabajo: **cinco de
los ocho no necesitan reescritura, necesitan que les quiten la primera y la
última frase.**

## Lo que esta auditoría prueba sobre el ciclo

El cierre de Villeta —«proyectos turísticos con **gran potencial**»— es una
afirmación de valor futuro que sobrevivió a todo el barrido del 22/08. No se
escondió de ninguna forma nueva: **estaba en la única superficie que no se
recorrió**. Cuando §11 decía «no se ha leído entero», esto es lo que había.

---

# 13. DATOS CAPTURADOS QUE NO SE PUBLICAN — el patrón NO se repitió

Después de encontrar 84 servicios y 7 accesos invisibles, la pregunta razonable
era si había más. `scripts/auditar-datos-no-publicados.ts` enumera lo que hay en
la base y busca cada nombre en las plantillas.

**Resultado honesto: no había más.** Un solo hallazgo menor, y una falsa alarma
de la propia herramienta.

| Qué | Veredicto |
|---|---|
| 11 claves de `property_features` | todas se pintan salvo una |
| `tour360_url` como feature (1 fila) | **duplica** `virtual_tour_url`, que sí se pinta. Fila redundante, no dato perdido |
| 14 columnas de `property` | todas usadas; `year_built` y `modelo3d_url` sin dato en ninguna ficha |
| **`en_condominio`** | ⚠ **solo en el JSON-LD.** 12 inmuebles están en condominio y **la ficha no lo dice a la vista** |
| 18 campos de `municipality` | todos publicados |
| 17 campos de `veredas-data.ts` | todos publicados |

**La falsa alarma, que conviene anotar:** la herramienta marcó `temp_min` y
`temp_max` como no publicados en los 8 municipios. Es falso: se renombran a
`temperatura_c` en `cobertura.ts` y salen **tres veces** en la página. El
heurístico busca el nombre del campo en la plantilla y no ve las capas de
mapeo. **Sirve para saber dónde mirar, no para concluir.** Cada hallazgo se
confirma abriendo el archivo — y este es el que no lo resistió.

**Lo único real:** el régimen de condominio. Es un dato que el comprador usa
para filtrar —hay ruta propia, `/propiedades/en-condominio`— y la ficha del
inmueble no lo muestra. Pendiente de decisión.

## Lo aplicado el 22/08 sobre §12

**Se quitó el pan del sándwich en cinco municipios.** 25 cambios, sin tocar los
cuerpos. Comprobado que los ocho textos arrancan y cierran en frase factual:

| Municipio | Ahora arranca | Ahora cierra |
|---|---|---|
| la-vega | «La Vega recibe visitantes de Bogotá cada fin de semana…» | «…cada domingo la Plaza Principal alberga uno de los mercados campesinos más importantes» |
| nocaima | «Nocaima tiene sus orígenes en los antiguos pueblos indígenas…» | «…en 1959, gracias a Ismael Bohórquez Medina, se creó la Escuela Normal» |
| nimaima | «La historia de Nimaima se remonta a la época prehispánica…» | «…la agricultura se convirtió en la principal actividad económica» |
| sasaima | «Sasaima está a poca distancia de Bogotá…» | «…el cultivo de café, caña panelera, cítricos y frutales» |
| villeta | «Villeta es un municipio de clima cálido…» | «…el patrimonio arquitectónico del centro histórico» |

**San Francisco y Vergara: `historia` VACIADA.** 3.725 caracteres de prosa
genérica retirados sin sustituto. Un campo vacío no dice nada falso y no ocupa
espacio citable con relleno; el titular los escribirá con hechos. El `turismo`
de Vergara se conserva y solo perdió su cierre.

⚠ **El `turismo` de San Francisco sigue publicado tal cual**, con sus seis
afirmaciones —«uno de los destinos más atractivos», «considerados uno de los
ecosistemas más valiosos», «cada vez más buscado», y el cierre de invertir—.
Queda así por instrucción: entra en la reescritura, no en el parche. **Pero está
vivo hoy.**

### Las tres contradicciones, resueltas

1. **El mercado campesino**: `turismo` decía «el más grande de Cundinamarca» e
   `historia` «uno de los más importantes». Ahora las dos dicen lo segundo, que
   es lo sostenible.
2. **El fundador de La Vega**: el campo publicaba «el 3 de junio de 1605, cuando
   el licenciado **Alonso Vásquez de Cisneros** ordenó la fundación» y el
   traspaso tenía anotado «**Juan de Borja**, sin confirmar». Ahora dice «Su
   historia colonial comenzó **en 1605**, con la fundación de dos pueblos
   indígenas»: sin nombre y sin día, hasta verificarlo.
3. **La fecha repetida**: Sasaima declaraba **el mismo día y el mismo oidor** que
   La Vega. Mismo tratamiento: «ocurrió en 1605». Nocaima conserva su 8 de junio
   con su oidor — es coherente y distinto, y no hay razón para tocarlo.

### Quebradanegra no se alarga

Sus 715 caracteres dicen que el turismo es «incipiente», que los senderos están
«sin señalización comercial» y que el municipio permite «escapar de la
masificación». **Es exactamente el registro que se busca**, y dice más verdad
que los 5.012 de La Vega.

**Regla:** el problema de Quebradanegra es de EXTENSIÓN, no de contenido, y se
resuelve **añadiendo hechos, no adjetivos**. Un texto corto y verdadero es mejor
punto de partida que uno largo que hay que desinfectar.

### `en_condominio`, publicado

Fila «Régimen → En condominio» en la ficha técnica, **enlazada a
`/propiedades/en-condominio`**. Doce inmuebles la tienen. Además de publicar el
dato, cierra la malla: la fila es también la puerta a «enséñame los demás».

`FilaDato` admite ahora `enlace?`, y solo para datos que ADEMÁS son un filtro del
catálogo. No es decoración: es enlazado interno.

## ⚠ La lección del falso positivo

`auditar-datos-no-publicados.ts` marcó `temp_min` y `temp_max` como no
publicados en los ocho municipios. **Era falso**: se renombran a `temperatura_c`
en `cobertura.ts` y salen tres veces en la página.

**Un heurístico que busca el NOMBRE DEL CAMPO no ve las capas de mapeo.** Entre
la columna y la plantilla puede haber un renombrado, un `select` con alias, un
DTO o un componente que recibe otra forma — y el `grep` no atraviesa ninguno.

**Regla:** una herramienta de auditoría dice DÓNDE MIRAR, no qué concluir. Cada
hallazgo se confirma abriendo el archivo. Es la misma disciplina que ya salvó
tres guardas —probar el detector con casos reales antes de creerle un cero— y
aquí evitó reportar un defecto inexistente en los ocho municipios.

---

## El 70/20/10 es un indicador de DERIVA, no un objetivo a alcanzar

`scripts/medir-70-20-10.mjs` mide la proporción de texto publicado entre tres
cubos:

- **INFORMACIÓN** (~70 %): contenido que sirve aunque no compres nada —municipios,
  veredas, guía de inversión, glosario, FAQ, blog.
- **INVENTARIO** (~20 %): descripciones de propiedad, catálogo.
- **MARCA** (~10 %): /nosotros, /mac, servicios, hero, propuesta.

**Su valor no es llegar al 70.** Es detectar la deriva: si entran 15 fichas
nuevas y nadie publica información, la proporción de inventario sube y el sitio
se convierte en catálogo sin que nadie lo note. Se re-ejecuta y se compara con la
medición anterior. **61 % de información es una proporción sana.**

**Línea base (medición de esta sesión):**

| Cubo | Caracteres | % | Objetivo |
|---|---:|---:|---:|
| Información | 166.191 | 60.8 % | 70 % |
| Inventario | 95.174 | 34.8 % | 20 % |
| Marca | 12.137 | 4.4 % | 10 % |

**Método:** INFO e INVENTARIO se miden sobre el TEXTO CRUDO de la base y archivos
de datos (exacto). MARCA sobre el HTML SERVIDO de sus rutas (su texto vive en
TSX, no en BD; parsear literales de JSX lo subcontaba a ~1.7 %, falso-bajo). No
cuenta nav, footer, código ni llms.txt. Las FAQ generadas de VEREDA no están
contadas (INFO extra, no incluida), así que el inventario real es un techo.

**Lectura:** el inventario pesa casi el doble del objetivo (35 % vs 20 %), pero
la información YA lidera —no había que recortar fichas, que son el producto, sino
que falta información publicada. Marca (4.4 %) tiene margen de sobra: el único
cubo con techo real —si pasa del 10 % hay que recortar— está lejos de él. Para
llevar inventario del 35 % al 20 % sin tocar fichas, INFO tiene que crecer ~+225
mil caracteres: las guías de territorio, las cinco FAQ y el informe de mercado.
