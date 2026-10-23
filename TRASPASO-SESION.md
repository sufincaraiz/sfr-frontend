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
  los dos logos son de la empresa. (Desde el 2026-10-02 **sí** hay API key de
  Cloudinary en el entorno, así que ya se puede enumerar la biblioteca; lo que
  falta es una foto propia de la empresa.) El titular lo resuelve.
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

# ⚠ El HTML servido es UNA sola línea: `grep -c` cuenta LÍNEAS y daría 0 o 1
#   siempre. Contar apariciones con `grep -o … | wc -l`. Ver «Instrumentos que
#   engañan» al final.

# «Avalúo» solo debe aparecer en el glosario
for u in / /nosotros /propuesta-comercial; do
  echo "$u: $(curl -s https://www.sufincaraiz.com$u | grep -oi 'avalúo' | wc -l)"
done

# La página de dron NO debe emitir Service mientras sea borrador
curl -s https://www.sufincaraiz.com/servicios/dron-y-fotogrametria \
  | grep -o '"@type":"Service"' | wc -l
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

---

## Instrumentos que engañan — cinco casos, una regla

**Regla: el resultado de un comando se verifica leyendo el EFECTO, no confiando
en su salida.** La salida dice lo que el instrumento cree que hizo; el efecto
es lo que pasó. Las cuatro veces el instrumento respondió con normalidad y la
conclusión era falsa.

| Instrumento | Qué dijo | Qué pasaba en realidad | Cómo se verifica |
|---|---|---|---|
| `grep -c` sobre HTML o JSON-LD servido | «1» (o «0») | El HTML servido es **una sola línea**: `grep -c` cuenta LÍNEAS, no apariciones. Sobre `/nosotros` dice 1 donde hay 67. Dos comandos de la §8 de este traspaso tenían justo este defecto (corregidos). | `grep -o 'patrón' \| wc -l` |
| `next build` con `EXIT=0` | Verde | Next reintenta cada página hasta tres veces: un build con 7 `P2024` termina en verde. | Contar errores dentro del log — `npm run build:verificado` |
| `script \| Select-Object -First N` en PowerShell | Mostró N líneas y terminó | Al cerrarse la tubería se **mata el proceso**. Si el script escribía en la base, la escritura queda a medias sin ningún error visible. | Nunca truncar la salida de un script que escribe; redirigir a archivo y leerlo después, y comprobar el estado final en la base |
| `Get-Content` / `Set-Content` de PowerShell 5.1 sobre archivos UTF-8 | Sin error | Lee UTF-8 como ANSI y reescribe **doble-codificado** («Política» → «PolÃ­tica»); además los `-replace` con acentos no coinciden y fallan en silencio. Pasó con la política de tratamiento y con `MODULO-FINANZAS.md`. | Editar código con las herramientas de edición, no con PowerShell. Si ya pasó: `git checkout -- archivo` y rehacer |

Lo común: ninguno **falló**. Todos devolvieron una respuesta verosímil. Un
error ruidoso se corrige solo; uno silencioso llega a producción.

---

### 5 · El contador de mutaciones que daba por viva la que mataba el proceso

2026-10-13. El medidor de mutaciones contaba las ✗ del arnés para decidir si una
guarda estaba cubierta. Dos mutaciones salieron «no detectadas», y una era
mentira: al quitar la comprobación de autoridad, la verificación del documento
válido **lanzaba**, el proceso moría, y un proceso muerto no imprime ni una ✗.

    caidas = salida.count('✗')      # 0 → «nadie la detectó»

El instrumento medía lo que sabía contar, no lo que importaba. Y el sesgo iba en
la dirección peligrosa: daba por **no cubierta** una guarda que sí lo estaba, lo
cual invita a añadir pruebas redundantes; pero el mismo criterio habría dado por
**viva** cualquier mutación que rompiera el arranque del arnés, que es justo la
clase de mutación más grave.

Lo que cambió no fue el conteo, fue el criterio:

> **Detectada = el arnés no acaba en verde.** Por fallos o porque revienta.

Es la misma regla de la sección anterior —verificar el efecto, no la salida—
aplicada al instrumento que verifica. Un medidor también es un instrumento.

## Tercera superficie: mi máquina contra Vercel

2026-10-14. El reporte decía «tsc y build limpios». Vercel había rechazado el
mismo commit a los 17 segundos. **Las dos cosas eran ciertas**, y ahí está el
problema: no hablaban de lo mismo.

> **Un build verde en local no es un hecho sobre el despliegue.** Y «build
> limpio» sin decir en qué superficie no significa nada.

Es la tercera de la familia. Las otras dos ya estaban escritas aquí:

| superficie A | superficie B | qué las separa |
|---|---|---|
| el arnés en memoria | la base de datos | no hay esquema en memoria |
| la documentación | el código | nadie vuelve a leer la nota |
| **el build local** | **el build de Vercel** | **el checkout, el sistema operativo, la caché** |

### Qué pasó exactamente, porque la causa no era la que se supone

No fue una variable de entorno ni la caché. Fue el **checkout**.
`.gitattributes` guarda el texto con LF; la copia en Windows tenía CRLF, porque
los scripts que parcheaban el documento escribían con `io.open(..., 'w')`, que
traduce. Una guarda compara el SHA-256 del bloque de cotejo. El módulo generado
viajó con la huella del CRLF (`b13440ff…`) y Vercel calculó la del LF
(`39b59fd7…`).

> **Hasheé la superficie en vez del contenido.**

Un hash que cambia según quién hizo el checkout no identifica un documento:
identifica una copia. Mientras eso fuera así, la guarda iba a dar un sí/no
distinto en cada máquina y ninguna de las dos respuestas valía.

Y lo que lo mantenía invisible: **`git diff` salía vacío.** Para git los dos
archivos son el mismo. Un árbol de trabajo limpio no protege de esto; es
justamente lo que lo esconde.

### LA MÁQUINA DE DESARROLLO ES WINDOWS. EL OBJETIVO ES LINUX.

Esto hay que saberlo dentro de tres meses, cuando nadie recuerde por qué
importa. Lo que esa diferencia rompe **en silencio**:

1. **Finales de línea.** CRLF aquí, LF allí, `git diff` vacío. Cualquier cosa
   que lea bytes —un hash, un contador de líneas, un `replace` con `\n`— da
   resultados distintos. **Había 28 archivos versionados con CRLF**, entre ellos
   `prisma/schema.prisma`, los dos arneses y el hook de commit.
2. **Mayúsculas en los nombres de archivo.** Windows no distingue la caja,
   Linux sí. `import './Cotejo'` funciona aquí y no resuelve allí. *Revisado el
   2026-10-14: ninguno estaba mal.*
3. **Separadores de ruta.** `globSync` devuelve `\` en Windows —comprobado: 68
   de 68 rutas— y `/` en Linux. Comparar con una ruta escrita a mano falla en
   una de las dos. *Revisado: `verificar-escrituras` ya normalizaba.*
4. **Permisos.** Todo en `100644` y ningún script se invoca sin `node` delante,
   así que el bit de ejecución no decide nada **hoy**. El día que algo se
   invoque directamente, esto se queda corto.

Los dos primeros los vigila `scripts/verificar-portabilidad.mjs`, y se arreglan
con `scripts/normalizar-saltos.mjs`. El tercero y el cuarto no tienen guarda:
están aquí escritos, que es el nivel más bajo de la jerarquía y ya sabemos lo
que vale.

## El par del día: afirmar un resultado que no se comprobó

2026-10-14, con ocho horas de diferencia y en dos capas distintas:

- La pantalla dijo **«no se pudo crear»** de un año que sí se había creado, con
  sus 19 conceptos.
- El reporte dijo **«build limpio»** de un build que había fallado.

Es **el mismo defecto**: dar por resultado algo que no se verificó. La primera
vez el `catch` no sabía qué había alcanzado a pasar antes del `throw`; la
segunda, yo no sabía qué había pasado en una máquina que no era la mía. En los
dos casos el mensaje era cómodo y falso.

La primera ya tenía guarda (`verificar-escrituras.mjs`). La segunda es
`scripts/estado-del-deploy.mjs`:

> **«Empujado» y «desplegado» son dos cosas distintas.**

Y la disciplina sola no basta, que es lo que demostró el día: por la mañana se
consultó Vercel y se reportó bien; al tercer lote «empujado» pasó por
desplegado dos veces seguidas. Por eso el guión pregunta por
`--meta githubCommitSha` y **sale con 1 mientras el commit de HEAD no esté
READY**, y distingue tres cosas que no se pueden agregar: READY, ERROR, y **«no
pude preguntar»**. La primera versión leía «no pude preguntar» como «no hay
despliegue», y eso era tranquilizador y falso en la dirección contraria.

## `&&` es la forma equivocada para una cadena de guardas

El build era `guarda && guarda && next build && guarda && guarda`. El primer
fallo esconde a los demás: se descubre **un problema por despliegue**.

Lo que costó el 2026-10-14, con el log en la mano:

| commit | eslabones | corrieron | **nunca corrieron** |
|---|---|---|---|
| `259856d` | 6 | 3 | 3 |
| `af8dae0` | 7 | 3 | **4** |

El escáner de escrituras se añadió en `af8dae0` y **nunca se ejecutó una sola
vez en Vercel**: nació y murió en la máquina de desarrollo. La prueba no es
deducirlo de la cadena, es que el log imprime el comando entero incluyéndolo y
su cabecera no aparece en ninguna línea.

Ahora es `scripts/verificar.mjs antes|despues`: corren **todas**, acumulan, y el
proceso sale con 1 al final con el listado completo. Cada una en su propio
proceso, para que un cuelgue no se lleve a las que faltan, y un cuelgue cuenta
como fallo —el criterio es «no terminó en verde», no «imprimió una ✗»—.

## La divergencia del UVT: qué cifra habría dado distinto y a quién

2026-10-15. La frontera del tramo estaba escrita dos veces y las dos copias no
convertían los límites en UVT igual:

| | tabla en UVT y año sin UVT cargado |
|---|---|
| `tramos.ts/limite()` | **lanza** «tiene tramos en UVT y el año no tiene UVT cargado» |
| la copia en `calculo.ts/desgloseDe` | `(t.en_uvt && uvt ? uvt : 1)` → **multiplica por 1** |

**La cifra concreta.** Una tabla con límites de 0 a 1.000 **UVT** y una base de
$50.000. Con el UVT de 2026 cargado (52.374), el primer tramo llega hasta
$52.374.000 y la base cae en él. Sin UVT cargado, la copia trataría el límite
como **$1.000** —mil pesos, no mil UVT— y la base de $50.000 caería en el
**segundo** tramo. Elegiría el `aporte_snr` y el `aporte_fondo` de otra fila.

**A quién afecta.** No al comprador ni al vendedor: el desglose institucional no
cambia lo que se paga ni cómo se reparte entre las partes. Reparte lo ya cobrado
entre **la Superintendencia de Notariado y Registro y el Fondo**, y se imprime en
el PDF. O sea: una cifra equivocada en un documento que dice a qué entidad va el
dinero recaudado.

**Y por qué no se manifestó.** Estaba **sombreada por el orden de las
llamadas**: `desgloseDe` corre después de calcular la tarifa, y la tarifa ya
había lanzado por lo mismo. No produjo ninguna cifra mala.

> **Una divergencia protegida solo por el orden en que se llaman dos funciones
> está a un refactor de estar viva.** Eso no es una guarda: es una
> coincidencia afortunada.

Cerrada: las dos decisiones viven en `tramos.ts/tramoQueAplica`, que usan la
tarifa y el desglose, y el arnés prueba que una tabla en UVT sin UVT **se
detiene** en vez de multiplicar por 1.

## La lectura completa encontró en una hora más que el grep en semanas

2026-10-15. Leer siete módulos de principio a fin —sin grep, sin buscar nada
concreto— dio **18 decisiones nuevas en una hora**. El método anterior, grepear
y leer las regiones que el grep devolvía, llevaba semanas y había encontrado 49.

> **El grep solo devuelve lo que ya sospechabas.** Por eso una pasada guiada por
> grep es una **confirmación** disfrazada de descubrimiento: encuentra
> instancias de lo que ya sabes nombrar, y nunca la categoría que no se te
> había ocurrido.

### El inventario tenía 49 de 67

> **La cifra empeoró al mirar mejor, que es la única dirección en que un
> inventario puede mejorar.**

El 37 de deuda que se reportaba el día anterior no significaba nada: el
denominador estaba mal. Y de ahí sale la regla del alcance declarado —ver
`ALCANCE_LEIDO` en `inventario-decisiones.mjs`—: **un denominador sin alcance es
la misma trampa**, porque invita a leerlo como «todo el proyecto». Hoy el
inventario imprime de qué once archivos sale la cuenta y nombra los dieciséis
que nunca se han leído.

### La prueba de que el instrumento tenía que ser humano

El caso, y es el mejor de los dieciocho:

| | ¿una cadena vacía es una ausencia? |
|---|---|
| `notariales/bases.ts:103` | **Sí**: `v === ''` → el candidato no se informa |
| `finanzas/calculo.ts:32` | **No**: `vacio = v === null \|\| v === undefined` |

Dos respuestas **opuestas** a la misma pregunta, en dos archivos del mismo
proyecto. Y **ningún normalizador de formas las agrupa**, porque el código no se
parece en nada: una es una condición dentro de un bucle y la otra es la
definición de un ayudante.

> **`decisiones-repetidas.mjs` encuentra formas COPIADAS. La misma decisión
> escrita de dos maneras distintas no la encuentra ninguna herramienta: eso es
> lectura.**

Y como la lectura es cara, se gasta donde la decisión es cara. Esos siete
módulos —los que deciden dinero— son la lista.

# EL QUINTO PUNTO CIEGO, Y ES DE OTRA CLASE

2026-10-15. Los cuatro de la sección siguiente son del **instrumento**: no podían
ver lo que no preguntaban, y se arreglan con mejores preguntas. Este no.

> **«Las había visto y las descarté como cosméticas.»**
>
> No es que el instrumento no lo mostrara: lo mostró. Es que **la etiqueta lo
> enterró**. Y una etiqueta no se arregla preguntando mejor.

El caso: al barrer las fechas, siete sitios de `src/app/` aparecieron en la
salida del grep y se clasificaron como «cosméticos: el año de un pie, el año de
un desplegable». **Dos de esos siete eran rutas del servidor que decidían el año
fiscal de un reporte y de los parámetros del año** —o sea, qué tarifas aplican—.

Y «cosmético» no era mentira **en ese momento**: era cierto mientras nada
dependiera de ello. Lo que cambió fue el contexto, no el código.

## La regla

> **Lo que una pasada marca como cosmético queda marcado CON QUIÉN y CUÁNDO lo
> marcó, y vuelve a revisarse cuando cambia el contexto.**

Un «cosmético» sin firma ni fecha es una decisión que nadie puede auditar,
porque no se sabe contra qué realidad se tomó. Con firma y fecha, la pregunta
«¿sigue siendo cierto?» tiene a quién y a cuándo mirar.

Y la forma práctica, que es la que de verdad lo cierra: **no clasificar y
seguir**. Si la clasificación descarta algo, el descarte entra en el artefacto
medido —una fila, no una decisión mental—. Los siete sitios no estaban en
`inventario-fechas.mjs`: estaban en mi cabeza, clasificados y olvidados. El
detector los encontró porque **no clasifica**: cuenta.

# UN ARNÉS SIN CÓDIGO DE SALIDA ES UN INFORME, NO UN ARNÉS

2026-10-15, el hallazgo que salió de contar qué arneses están fuera del build.

`probar-panel-notarial.mjs` tenía un `ok()` que **solo imprimía**. Sin contador,
sin `process.exit`. Salía con 0 aunque la pantalla estuviera llena de ✗.

> **Su verde no lo podía leer una máquina**, así que dependía de que una persona
> mirara la pantalla hasta el final. Y nadie mira hasta el final cuando las
> primeras treinta líneas están en verde.

**Lo que apareció al ponerle código de salida: cinco fallos de treinta y seis.**
Cuatro eran verificaciones que **sobrevivieron a su premisa** —afirmaban las 29
cifras sembradas que salieron del catálogo esa misma mañana—. Y el quinto era un
defecto de verdad:

```
{"total":53,"sin_cargar":53,"coinciden":0,"apto":true}
```

**`apto: true` en un año completamente vacío.** Es correcto para lo que `apto`
significa —«nada de lo cargado contradice la transcripción», y un año vacío no
contradice nada— y es exactamente la forma de indicador que miente en la
dirección cómoda si alguien lo lee como «apto para publicar». Peor:
`cotejar-notariales.mjs` **salía con 0** basándose en él.

Resuelto separando las dos cosas: `apto` sigue siendo consistencia y nace
`completo` —`sin_cargar === 0`—, y el guión del cotejo exige las dos.

## El censo, y lo que dio

| | cuántos |
|---|---|
| verificadores en la cadena del build | 13 |
| fuera de la cadena | 9 |
| de esos, **en memoria y sin base** | **3** |

Los tres en memoria tardan **270 ms, 202 ms y 1,3 s** —menos de dos segundos
entre los tres, para más de 800 verificaciones—. Estaban fuera **por nada**, y
entraron: la cadena pasó de 13 a 15 guardas.

Para el que sí toca la base y no puede correr en cada despliegue —crea y borra
un año de prueba, y eso escribiría en producción cada vez— el build comprueba
otra cosa: **cuándo corrió en verde por última vez**. El arnés escribe su propia
fecha en `scripts/registro-de-arneses.json` al pasar, y
`verificar-arneses-frescos.mjs` rompe el build si el registro pasa de catorce
días.

> **Un arnés que nadie corre está en la misma familia que una guarda que nadie
> llama: su verde es de la última vez que alguien se acordó.** La diferencia es
> que una guarda sin llamar se encuentra leyendo el código, y un arnés sin
> correr no deja rastro de su ausencia. Por eso el rastro hay que fabricarlo.

## Lo que implica HACIA ATRÁS, que es la mitad incómoda

No basta con escribir la regla en futuro. **Cada vez que esta sesión reportó
«36 del panel en verde» estaba citando un guion que no podía decir que no.**

> El 36 era **decoración**. Y lo peor no es que estuviera mal: es que **nadie
> podía distinguirlo de un 36 real**, ni quien lo escribió ni quien lo leyó. Un
> número que solo puede subir no mide nada.

Así que todo informe de este arnés anterior al 2026-10-15 **se retira**, no se
reinterpreta. No hay forma de saber cuántas de las cinco llevaban rojas.

## El segundo piso: un verde falso que alimenta a otro instrumento

Y esto es lo que lo convierte de error en algo peor. `apto: true` sobre un año
vacío no se quedaba en la pantalla del panel: **`cotejar-notariales.mjs` salía
con 0 basándose en él.**

> **Un indicador falso que alimenta a otro instrumento no es un error: es un
> sistema de errores.** El segundo hereda la mentira del primero y le añade
> autoridad propia —ya no es «lo dice el panel», es «lo confirma el cotejo»—, y
> a esa altura nadie recuerda que las dos frases tienen la misma fuente.

Regla que queda: **cuando una guarda consume el resultado de otra, hereda su
defecto y lo lava.** Antes de encadenar dos instrumentos hay que poder decir qué
significa exactamente el indicador del primero —`apto` era *consistencia*, no
*completitud*— y comprobar que el segundo exige lo que de verdad necesita.

# UN INSTRUMENTO SOLO SE VERIFICA DONDE NO VIVE

2026-10-16. Extensión directa de lo anterior y la pregunta que lo cierra: **¿qué
instrumentos siguen corriendo en una sola superficie?**

El caso que lo motiva es el de ayer: `probar-notariales.mjs` corrió meses en
verde en esta máquina, y su verde era **un hecho sobre esta máquina**. En cuanto
tocó otra —Linux, UTC— apareció su propio defecto, un fixture con componentes
locales. No hubo que buscarlo: bastó cambiarlo de sitio.

> **El verde de un instrumento que solo ha corrido donde fue escrito no es un
> hecho sobre el proyecto: es un hecho sobre el equipo.** Y los dos se escriben
> igual en la pantalla.

## El censo, medido (no recordado)

| | cuántos |
|---|---|
| guardas declaradas en la cadena | **19 antes + 2 después** |
| arneses que la cadena lanza por dentro (comparador de invariancia) | 4 × 2 zonas |
| instrumentos que siguen corriendo SOLO aquí | **4** |
| actos de una sola vez (corregir·, fusionar·, sanear·, migrar·, sembrar·, dump·) | ~40 |

**Entraron hoy tres, y el coste vuelve a ser ridículo:**

| instrumento | medido | qué vigila |
|---|---|---|
| `probar-slug.ts` | **162 ms** | 7 casos del generador de slugs |
| `probar-vigilancia.ts` | **109 ms** | 19 casos del detector de valor futuro |
| `mutar.mjs` | **3,0 s** | las 14 mutaciones |

**El que más importa de los tres es `mutar.mjs`**, y conviene decir por qué:
hasta hoy, la frase «las 14 afirmaciones del motor están respaldadas por una
mutación real» era **un hecho sobre esta máquina a una hora concreta**. El
instrumento con el que comprobamos que los demás instrumentos sirven era el
menos verificado de todos. Ahora corre en cada despliegue.

## Los cuatro que siguen en una sola superficie, y qué es cada resultado

1. **`verificar-build.mjs` — el más grave, y es deliberado.** Detecta P2024
   (pool agotado) y errores de prerender dentro del log del build, que es
   exactamente el defecto de «build verde engañoso»: `npm run build` devolvió 0
   con siete P2024 dentro. **No corre en Vercel**, porque lanza él mismo
   `npm run build` —sería recursión— y porque su valor está en comparar contra
   `.build-historial.json`, que es local. Consecuencia que hay que tener escrita:
   > **Un build de Vercel con pool agotado sale verde y nadie se enteraría.** La
   > detección de P2024 es, hoy, un hecho sobre esta máquina. Se compensa con
   > disciplina (`npm run build:verificado` antes de empujar), y la disciplina es
   > justo lo que esta sesión aprendió a no considerar una guarda.
2. **`estado-del-deploy.mjs`** — pregunta a Vercel desde fuera. Su resultado es
   un hecho sobre **el despliegue**, y dentro del build no tendría sentido: se
   preguntaría por sí mismo. Correctamente fuera.
3. **`auditar-404.mjs`** — pide URLs a producción. Hecho sobre **producción en
   un momento**, no sobre el commit: durante un despliegue producción todavía es
   el commit anterior, y un fallo de red pondría roja una guarda de código por
   una razón de entorno. Fuera por diseño, y por la misma distinción que hace
   `verificar-enlaces` entre «los datos divergen» y «no llego a la base».
4. **`cotejar-notariales.mjs` y `probar-panel-notarial.mjs`** — tocan la base y
   escriben. El segundo crea y borra un año de prueba: en el build escribiría en
   producción en cada despliegue. Para ellos el build comprueba otra cosa —la
   frescura del último verde— y eso es lo mejor que se puede hacer sin una base
   de pruebas aparte.

Lo demás que está fuera **no son instrumentos**: son **actos**. `corregir-*`,
`fusionar-*`, `sanear-*`, `migrar-*`, `publicar-*`, `sembrar-*`, `dump-*`
corrieron una vez y su resultado es una fila cambiada, no un veredicto. Un acto
no se vuelve a correr; un instrumento sí, y por eso solo los instrumentos tienen
que vivir en las dos superficies.

## La regla

> **Un instrumento solo se verifica donde no vive.** Mientras un arnés solo haya
> corrido en la máquina donde se escribió, su verde es un hecho sobre esa
> máquina. Meterlo en la superficie que despliega no es higiene: es la única
> forma de que su resultado hable del proyecto.

Corolario práctico, que ya se cobró dos veces en dos días: **lo que se puede
meter en la cadena sin tocar la base, se mete.** Los tres de hoy costaron 3,3 s
y los tres de ayer menos de dos segundos; llevaban fuera **por nada**, y uno de
ellos escondía un defecto real.

# EL ENLACE DEL CONTADOR — LO QUE PARECÍA HECHO, Y LA MENTIRA ESTABA PUBLICADA

2026-10-16. Se fue al dato a preguntar por qué `periodo_desde` y `periodo_hasta`
estaban vacías —«ve al dato, no lo deduzcas del esquema»— y la respuesta no era
la esperada:

> **El enlace del contador no existe.** Ni ruta, ni verificación de token+PIN,
> ni filtro de periodo. `enlaces_contador`: 0 filas.
> `accesos_enlace_contador`: 0 filas.

Y es **la razón por la que se pidió el módulo financiero**: mandarle al contador
un enlace de solo lectura de un periodo, con descarga. Las tres piezas:

| pieza | estado |
|---|---|
| ruta pública que acepte el token | ⬜ no existe |
| token + PIN y sesión con scope propio | ⬜ no existe |
| consulta ACOTADA a `periodo_desde`/`periodo_hasta` | ⬜ no existe |

**NO CONFUNDIR con `/interno/datos-contador`, que sí existe** y va en la
dirección contraria: es el formulario que el contador NOS llena con los
parámetros fiscales del año. Tener uno de los dos hacía que el otro pareciera
hecho.

## Lo grave no era la columna vacía: era lo escrito alrededor

Tres textos hablaban de ello **en presente**, y el tercero es el que convierte
esto de deuda en defecto:

1. El comentario del esquema: *«fuera de este rango no devuelve nada»*, sobre un
   filtro inexistente.
2. El módulo de retención, que decía ser *«lo que hace cierta esa frase»*.
3. **La política de tratamiento de datos, PÚBLICA, en
   `/politica-tratamiento-datos`, sección 4:** *«el acceso exige un enlace
   privado y un PIN»*, *«queda limitado a un periodo contable concreto —fuera de
   ese rango no muestra información—»*, *«la dirección IP y el navegador se
   conservan por un máximo de doce (12) meses»*.

> **Un documento legal describiendo un tratamiento que no se hace.** No es una
> nota interna desactualizada: es lo que cualquier visitante de
> sufincaraiz.com puede leer, firmado como política de la empresa.

Y esta sesión lo reportó al titular como *«la frase vive solo en un comentario
del código, no publicada»*. **Era falso**, y el error tiene una forma conocida:
se buscó la frase exacta del comentario en vez de buscar el tema. La política no
repetía la frase; decía lo mismo con otras palabras. **El punto ciego del grep
otra vez, un piso más arriba** — y es exactamente la misma forma que el quinto
punto ciego: lo vi, lo clasifiqué, y la clasificación lo enterró.

## Qué se cambió, y qué NO

Corregido el 2026-10-16: los tres textos dicen ahora lo que es verdad. La
sección 4 de la política está **redactada en futuro**, encabezada por *«esta
función todavía no está en funcionamiento»* y con la constancia explícita de que
**no se ha generado ningún enlace ni se ha registrado ningún acceso**; se
conservan las condiciones previstas, porque describirlas de antemano es correcto
mientras se diga que no están en vigor. La numeración de la política **no se
tocó** —la sección 3 remite al «numeral 6», y renumerar habría roto esa
referencia en silencio—.

**El cron también mentía por omisión.** Anonimizaba cada noche una tabla que
nadie escribe y registraba «0 anonimizados»:

> **Un verde que no puede ser rojo no es un verde.** Ese 0 decía «no hay nada»,
> no «la retención funciona», y los dos se escriben igual en el log.

Ahora `anonimizarAccesosVencidos()` devuelve además `filas` y `pendientes`, y el
mensaje distingue las dos causas: con la bitácora vacía dice que **no demuestra
nada**, y si quedaran vencidas sin anonimizar lo registra como error. El JSON de
respuesta lleva `retencionContadorDemostrada`, que solo es `true` si había filas
y no quedó ninguna pendiente.

**NO se construyó el enlace**: va después del editor de tramos. Lo que se hizo
es que **deje de parecer hecho**.

## La guarda, y vigila las dos direcciones

`scripts/verificar-enlace-contador.mjs`, en la cadena del build (19 antes):

· **Mientras no exista** → los tres textos tienen que declararlo pendiente, y el
  cron tiene que distinguir sus dos ceros.
· **Cuando exista** → los tres tienen que dejar de llamarlo pendiente, y la ruta
  tiene que filtrar de verdad por `periodo_desde`.

La señal de que existe **se mide**: una ruta de `src/app` que consulte
`prisma.enlaceContador`. No vale que alguien nombre el modelo —la retención lo
nombra y no es el enlace—.

> Una guarda que solo vigilara la primera dirección **convertiría la advertencia
> en la siguiente mentira** el día que el enlace se construya. Es la cuarta vez
> en dos días que la respuesta correcta es «las dos direcciones»: las escrituras
> de fecha, las unidades escrita/declarada, el cotejo `apto`/`completo`, y esta.

Provocada en las cinco: quitar cada una de las cuatro marcas la pone en rojo, y
crear una ruta que consulte la tabla con los textos aún en «pendiente» también.
Cada provocación comprueba que el archivo cambió y lo restaura byte a byte.

Y el ⬜ queda impreso al lado de las ✅ en `estado-traspaso.mjs` (29 de 31), para
que la pieza que falta **esté en la lista** en vez de faltar de ella.

# UNA MEDICIÓN SIN LÍNEA BASE FECHADA NO ES UNA MEDICIÓN, ES UN NÚMERO

2026-10-16, salido de medir el censo anterior. `verificar-build.mjs` avisó:

```
! 1293  consultas a la base         ▲ antes 1189
```

**+104 consultas.** La reacción natural —y la que el titular dijo que habría
tenido— es buscar la regresión: algo pasó a consultar por página. No había
ninguna.

El historial guardaba **las cifras y nada más**: ni commit ni fecha. Así que ese
1189 podía ser del commit anterior o de hacía una semana y quince commits, y no
había forma de saberlo. **Un delta contra un punto desconocido en el tiempo no
se puede atribuir a ningún cambio.**

Y al comprobarlo salió lo otro, que es peor para el instrumento: **tres builds
del mismo código contaron 1293, 1251 y 1250.** La cifra tiene **~3 % de varianza
propia** entre corridas idénticas. El ▲104 era ruido.

> **Una medición sin su línea base fechada no es una medición: es un número.** Y
> un número que se compara con otro número sin fecha produce deltas que parecen
> hallazgos. Esta clase de falso positivo es caro de un modo particular: no
> rompe nada, manda a buscar un defecto que no existe.

Corregido en el guion: el historial guarda ahora `commit` y `fecha`, y la salida
dice **contra qué** compara (`comparado con e46555f · 2026-10-16T20:33Z`). Si el
historial no los trae, lo dice en vez de callarlo. Y la varianza del ~3 % quedó
escrita junto al umbral, con la razón de que el umbral sea alto: lo que se
vigila es el **salto de magnitud** —una consulta nueva POR PÁGINA—, no el delta
pequeño.

Familia: es el mismo defecto que `apto` y que el arnés sin código de salida
—**un indicador que no puede distinguir dos situaciones distintas**—, aquí en su
versión temporal.

# LA MISMA DISCIPLINA, DESDE EL OTRO LADO DE LA CONVERSACIÓN

2026-10-19. El titular escaló la gravedad de un hallazgo —`domicilios ?? false`,
que yo había descrito como «publica *no hace domicilios* sobre el negocio de un
tercero»— y la escalada era **correcta si la premisa lo fuera**. No lo era: el
distintivo solo se pinta con `true`, así que con `false` el sitio **omite una
afirmación positiva** en vez de publicar una negativa.

Lo registró él mismo así:

> **«Subí la gravedad de un hallazgo leyendo tu resumen en vez de la pantalla.
> El que pide ir al dato también escala desde prosa.»**

Va con el par de correcciones al alza y a la baja porque **es la misma
disciplina vista desde el otro lado**: la cadena fue «yo clasifico desde la
expresión → él escala desde mi clasificación», y ninguno de los dos pasos tocó
el componente. Dos lecturas de prosa seguidas, sin dato en medio.

> **Un informe es un dato de segunda mano.** Quien lo escribe sabe de dónde
> sale; quien lo lee, no, y una tabla resumida se lee con la misma confianza que
> una consulta. La forma de romper la cadena es que el informe diga **de dónde
> sale cada fila** —consulta, lectura de código o inferencia—, y esas tres no
> valen lo mismo.

# CORREGIRSE HACIA ARRIBA Y HACIA ABAJO CUESTA LO MISMO

2026-10-15 y 16. Tres correcciones sobre reportes propios, ninguna pedida:

| | lo reportado | lo cierto | dirección |
|---|---|---|---|
| deriva del `float` en `saldoEnCustodia` | «se separan en cinco puntos» | no hay pérdida demostrable a esta escala; comparé **cadenas**, no valores | **a la baja** |
| «cuatro horas de trabajo» | cuatro horas | 2 h 40 min (12:03 → 14:43) | **a la baja** |
| la frase del enlace del contador | «vive solo en un comentario, no publicada» | está **publicada** en la política, sección 4, en presente | **al alza** |

Las dos primeras rebajaban una alarma propia; la tercera **agravaba** un reporte
propio. Y es la que menos ganas dan de escribir, porque convierte «deuda
pendiente» en «documento legal falso publicado».

> **Corregirse hacia arriba y hacia abajo cuesta lo mismo, y las dos veces nadie
> lo iba a reclamar.** Si solo se corrige a la baja, el efecto neto es un
> historial que siempre acaba tranquilizando; si solo al alza, uno que siempre
> alarma. La disciplina no es la dirección: es que la corrección no dependa de
> si el resultado conviene.

Y las tres tienen la misma causa de fondo, que es la que hay que vigilar: **medí
la superficie en vez del fondo.** Cadenas en vez de valores; una impresión en
vez del reloj; la frase literal en vez del tema.

# UN TEXTO PÚBLICO ES CÓDIGO QUE NADIE COMPILA

2026-10-16, la superficie que tres días de auditoría no habían tocado.

Cuatro instrumentos, sesenta y nueve decisiones inventariadas, catorce
mutaciones, diecinueve guardas — y **los textos publicados no los había revisado
nadie**. El primero que se miró, la política de tratamiento de datos, **mentía**.

> **Un texto público es código que nadie compila.** Afirma cosas sobre el
> sistema, se lee literalmente —un cliente, un contador, una autoridad—, y
> **ningún build lo contradice**. Un comentario desactualizado engaña a quien
> programa; una frase publicada desactualizada es una declaración de la empresa.

Tres rasgos que lo hacen peor que el código:

1. **No tiene tipos.** Nada falla si la frase deja de ser cierta.
2. **Se lee en presente por defecto.** «El acceso exige un PIN» no se entiende
   como un plan, se entiende como una descripción. El tiempo verbal es la única
   marca de estado que tiene, y es invisible al revisarlo por encima.
3. **Envejece por el lado del sistema, no del texto.** Nadie lo toca y se vuelve
   falso igual: lo que cambió fue el código. Es la misma forma que «cosmético»
   dejando de ser cierto porque cambió el contexto.

Por eso la guarda del enlace del contador vigila **la política**, no solo el
esquema: es el único archivo del lote cuyo lector no es un programador.

El inventario de lo publicado —qué afirma sobre lo que el negocio hace y sobre
cómo trata los datos, y si el sistema lo cumple hoy— se hace con **lectura
completa, no con grep**, por la razón exacta del fallo de hoy: la política no
repetía la frase del comentario, **decía lo mismo con otras palabras**. El grep
busca la frase; lo que hay que buscar es el tema.

# EL SEXTO PUNTO CIEGO: EL DETECTOR VIGILABA LA EXPRESIÓN, NO EL USO

2026-10-16. `inventario-fechas.mjs` reportaba **0 lecturas** y había **siete**
sitios leyendo un día mal, seis de ellos publicando esa fecha.

```ts
const corte = new Date().toISOString().slice(0, 10);   //  /nosotros
```

`toISOString()` da el día **en UTC**: entre las 19:00 y la medianoche de
Colombia, la página publicaba **la fecha de mañana**. Y dos de los seis los leen
máquinas que no perdonan: `llms.txt` y el `datePublished` del marcado del blog.

## Por qué el detector no podía verlo

> **La misma expresión es correcta en un uso y falsa en el otro.**
>
> · sobre una columna de **DÍA PURO** —guardada a medianoche UTC— es la lectura
>   correcta, y además invariante a la zona. Así se usa en todo el motor.
> · sobre `new Date()` —un **instante**, el ahora— da el día de UTC, que no es
>   el de Colombia cinco horas al día.

El detector buscaba **componentes locales** (`getFullYear`, `getMonth`,
`getDate`), que es una de las dos formas de equivocarse. La otra no tenía
patrón porque **no está en la expresión: está en el origen del valor**.

> **El detector vigilaba la expresión; el defecto estaba en el uso. No le
> faltaba una regla: le faltaba saber de dónde viene el valor.**

## Cómo se le enseñó el origen — la mitad automática y la mitad declarada

Y esta es la parte que generaliza, porque la pregunta «¿se puede distinguir
automáticamente?» tiene **dos respuestas**:

| | qué hace la guarda |
|---|---|
| `new Date().toISOString()` | **SÍ se decide sola**: el origen está en la misma expresión. Rompe siempre. Los siete casos eran de esta forma. |
| `algo.toISOString().slice(0,10)` | **No se puede decidir leyendo la línea.** La guarda **exige una marca**: `DIA PURO` en la línea o en las tres anteriores. Sin marca, rompe. |

Exigir la marca no es burocracia: **es la única forma de que quien escribe
declare el dato que la guarda no puede deducir.** Y es la regla general de esta
sesión —no clasificar y seguir: el descarte entra en el artefacto medido—.

## Lo que la regla nueva encontró al estrenarse

Once sitios, que hubo que mirar uno por uno. **Cuatro eran defectos nuevos que
nadie había visto**, todos de la misma clase —leer en UTC el día de una columna
de **instante**, no de día puro—:

| | qué fecha publicaba mal |
|---|---|
| `blog.ts:75` | `published_at ?? created_at ?? new Date()`: un artículo publicado a las 20:00 salía fechado al día siguiente, y esa fecha va al `datePublished` |
| `cifras-derivadas.ts` ×2 | «fecha del registro más antiguo» de las cifras publicadas |
| `municipios/[slug]:446` | la fecha de corte visible de la página de municipio |

Y **siete eran correctos** y ahora lo dicen: las cuatro columnas `DATE` de
`completar.ts`, los dos límites de `periodoDelMes`/`periodoDelAnio` —construidos
con `Date.UTC`— y el ayudante de `notariales/datos.ts`.

**Total del barrido: 10 fechas públicas corregidas** —las 6 del ahora más las 4
de columnas de instante— y 7 marcadas. El detector queda en 0 de cuatro formas,
con **una excepción declarada y con su razón escrita**: el nombre de un CSV que
se descarga del panel.

Provocado en las dos reglas nuevas: `new Date().toISOString()` lo pone rojo, un
día sin marca lo pone rojo, y con la marca vuelve a verde.

# EL TEXTO QUE CALMA ES EL QUE NADIE CONTRASTA

2026-10-16, la primera de las siete divergencias de los textos públicos, y la
que tenía forma propia.

En `/registro-visita` conviven **tres** textos sobre los mismos datos:

| texto | qué decía | ¿cierto? |
|---|---|---|
| la casilla de consentimiento | «incluido que mi nombre y número de documento puedan compartirse con el propietario del inmueble» | **sí**, y es el que tiene valor legal |
| la política §3 | separa nombre+documento —al propietario— de correo+celular —internos— | **sí**, campo por campo |
| el aviso azul de la pantalla | «no se publican ni **se comparten con terceros**» | **NO.** `visitantesDe()` entrega nombre y cédula al propietario |

> **El único que mentía era el tranquilizador.** Los textos operativos se
> revisan —dicen qué pasa, y alguien comprueba que pasa—. Los que calman no:
> **no parecen prometer nada concreto**, así que nadie los contrasta con el
> sistema. Y son los que el lector cree.

Y el segundo rasgo, que es el que lo hace fácil de volver a romper:

> **Es el único de los tres que se edita desde el panel sin desplegar.** Vive en
> una fila de `PageContent`, así que **ninguna guarda del build puede verlo**: el
> build no tiene la base con esa fila delante.

Hecho: el valor por **defecto** corregido en `lib/registro-visita.ts`, y la
vigilancia del texto **real** añadida al cron diario —que es la única superficie
que ve la base entre despliegues, y existe exactamente para eso—.

La regla de la guarda también tiene su lección. El primer intento buscaba la
negación («no se comparten con terceros») y **no encontraba el texto real**
—«no se publican NI SE comparten con terceros»— mientras marcaba como falsa una
redacción correcta. Enumerar las formas de negar es **la misma trampa que buscar
la frase en vez del tema**. La regla al revés sí aguanta: *si el texto habla de
terceros y no nombra al propietario, está describiendo la circulación de los
datos omitiendo la única cesión que ocurre.*

# EL P2024: NO SE ENVOLVIÓ `next build`, Y POR QUÉ

2026-10-16. Decisión tomada con la pregunta planteada bien: «¿sirve la fase
*después*?»

**No sirve, por dos razones independientes:**

1. La fase «después» **corre dentro de `npm run build`** —el script es
   `verificar antes && next build && verificar despues`—, así que lanzar ahí un
   guion que lanza `npm run build` sigue siendo recursión.
2. Y la definitiva: **en esa fase el log ya no existe.** Trazas y enlaces pueden
   correr ahi porque miran **artefactos en disco**; el P2024 solo aparece en
   texto que ya pasó, y Next no deja los errores de prerender en ningún archivo.

La recursión **no era esencial** —viene de invocar `npm run build` en vez de
`next build`—, así que envolver era posible. **Se descartó a propósito:**

> Envolver el comando de build es **la línea de más riesgo del proyecto**: un
> fallo del envoltorio son **cero despliegues**. Y compra detección en tiempo de
> **build** de un problema que se manifiesta sobre todo en **ejecución**. No vale
> el precio. Si alguna vez vuelve a aparecer un P2024 en producción, se reabre
> **con evidencia**; hoy no la hay.

## Lo que sí se hizo, que es la mitad que el build no podía dar

**1. El tamaño del pool, declarado en ejecución.** Y aquí hay una corrección de
lo que esta sesión afirmó: «el 5 es un valor por defecto que nadie eligió» era
**falso a medias**. El `connection_limit=5` SÍ estaba elegido y razonado —pero
**solo durante `next build`**, porque la condición es
`NEXT_PHASE === 'phase-production-build'`—. En **ejecución** no se declaraba
nada, y el defecto de Prisma es `num_cpus * 2 + 1`: un número que depende de la
máquina que toque, multiplicado por cada lambda concurrente. Ahora se declara
`connection_limit=3&pool_timeout=20`, y **se respeta lo que venga en la URL**:
declarar no es imponer.

**2. El contador de P2024, que puede ponerse rojo solo.** Una extensión
`$allOperations` de Prisma envuelve toda operación, deja pasar el error intacto
y **solo cuenta por el camino**. El cron de vigilancia lo lee cada día y avisa
por WhatsApp si hay alguno.

> **⚠ Y EL CONTADOR NO PUEDE VIVIR EN POSTGRES.** Es el mismo razonamiento que
> el candado del aviso de `redis-salud.ts`, al revés y por eso mismo: ese
> candado vive en Postgres porque existe para cuando **Redis** no responde. Este
> vive en Redis porque existe para cuando **Postgres** se queda sin conexiones.
> Guardarlo en la base que acaba de agotar su pool sería pedirle la hora al
> reloj que se paró.

Y con la distinción de siempre: el resultado lleva `consultado`, porque
«0 porque no hubo» y «0 porque no pude preguntar» no son lo mismo.

# UN PENDIENTE QUE SU DUEÑO NO PUEDE RESOLVER ES UNA ACUSACIÓN

2026-10-16. El panel de `/admin/notariales/2026` decía:

> **29 esperan la resolución oficial** — *tú, con la resolución*

Esas 29 son **tablas por tramos**, y el editor de tramos **no existe**: la propia
pantalla tiene una rama que se niega a guardarlos. El titular podía tener la
resolución en la mano y **no tenía dónde escribirla**, así que se quedó mirando
una pantalla que le pedía algo imposible.

> **Un pendiente asignado a quien no tiene cómo resolverlo no es un pendiente:
> es una acusación.**

El contador ya estaba partido por **dueño** —porque «7 pendientes» mezclaba
tres acciones y tres tiempos distintos—. Le faltaba el eje que decide si hay
algo que hacer **hoy**:

| | |
|---|---|
| «te toca **y puedes ya**» | falta traer un dato |
| «te toca **pero falta que construyamos la pantalla**» | no falta nada que traer |

Hecho: `SIN_PANTALLA` —tabla declarada, no un `if` por pantalla—, `bloqueado` en
cada `Pendiente` rellenado en **un solo sitio** (`conBloqueo`, y el tipo lo
fuerza: añadir un `push` sin él no compila), y el resumen partido en
`puedeYa` / `bloqueados`. De paso, otro mensaje que engañaba: un tramo faltante
decía «falta la tarifa», y no falta **una cifra**, falta **la escala entera**.

Vigilado en las dos direcciones por `probar-notariales.mjs`, con la señal
**medida y no recordada** —mientras la pantalla contenga el rechazo «los tramos
todavía no se editan desde aquí», el editor no existe—: si el editor aparece y
`tramos` sigue en `SIN_PANTALLA`, rompe. Provocado en ambas.

# LA ESCALERA DE UN INSTRUMENTO APRENDIENDO A NO MENTIR

Tres defectos, tres días, **el mismo instrumento** —el arnés de mutaciones y el
contador que lo acompaña— y cada uno estaba un piso por encima del anterior.
Escritos juntos porque separados parecen anecdotas y juntos son una escalera.

### Primer piso — el contador solo podía contar ✓

`probar-panel-notarial.mjs` tenía un `ok()` que **solo imprimía**: sin contador,
sin `process.exit`. Salía con 0 con la pantalla llena de ✗.

> El número no podía bajar. **Un indicador que solo puede subir no mide nada**, y
> nadie podía distinguirlo de uno real.

Al ponerle código de salida: **cinco rojos de treinta y seis**.

### Segundo piso — la mutación no mutaba

Las provocaciones del arnés de mutaciones no provocaban: patrones que no
existían en el archivo, y un guión de Python que truncó el archivo al abrirlo
para escribir antes de leerlo. **El «SOBREVIVIÓ» era un «no cambié nada».**

> **Una mutación no cuenta hasta que se prueba que el contenido cambió.** Si no
> cambió, el resultado es `ERROR_DE_LA_PRUEBA`, no «sobrevivió». Y se restaura
> byte a byte, verificado.

### Tercer piso — la mutación mutó donde no cambia el comportamiento

2026-10-19. La primera mutación escrita para el defecto de la casilla en blanco
**sobrevivió**, y el arnés estaba bien: la mutación quitaba un `&& !enBlanco` de
una condición que **en ese caso ya no se alcanzaba**. Cambió el archivo, pasó la
comprobación del segundo piso, y no cambió nada.

> **No basta probar que el archivo cambió: hay que elegir el sitio donde el
> cambio altera el resultado.** Una mutación sintácticamente real sobre código
> inalcanzable es una afirmación sin respaldo **que se ve respaldada**.

Reemplazada por `enBlanco = false` en el origen del valor, y detectada.

### Lo que la escalera ensaña

Los tres pisos son la misma pregunta hecha cada vez más abajo:

| piso | lo que se daba por hecho | cómo se cayó |
|---|---|---|
| 1 | que el informe podía decir que no | no tenía código de salida |
| 2 | que la mutación tocaba el archivo | el patrón no existía |
| 3 | que tocar el archivo cambiaba el comportamiento | la línea era inalcanzable |

> **Cada piso se descubre solo después de arreglar el anterior**, porque hasta
> entonces el fallo de abajo tapa al de arriba. Lo único que los encontró fue
> **hacer que el instrumento se mida a sí mismo**, cada vez con una pregunta más
> esceptíca. No hay razón para creer que el tercero es el último.

Y el cuarto piso, por si aparece: **nada comprueba que la mutación represente un
error PLAUSIBLE.** Hoy las catorce son errores que alguien podría cometer de
verdad —porque se escribieron a mano pensando en eso—, pero no hay nada que lo
exija ni que lo mida.

# LA CUARTA GUARDA DEL MOTOR NOTARIAL, Y ES LA MÁS GRAVE

`exigirVigencia(anio.respaldos ?? [], fechaActo)`, en sus cuatro llamadores.

Una lista **vacía** pasa, y debe: «sin ningún respaldo» lo detiene otra guarda
—`pendientesParaActivar` no deja activar un año sin respaldo por cifra—. Pero
`respaldos` es **opcional en el tipo**, así que una consulta que no los incluya
devuelve `undefined`, el `??` lo vuelve «ninguno», y entonces:

> **La comprobación deja de comprobar mientras aparenta funcionar.** Se
> liquidaría con **tarifas vencidas** y ninguna guarda chistaría. Su código se
> lee bien, sus pruebas pasan, su mensaje existe. Lo único que falta es que
> alguna vez se dispare.

Es la más grave del motor porque las demás guardas notariales impiden
**publicar** una cifra sin respaldo; esta impide **usar** una cifra cuyo
respaldo ya venció, que es el caso que de verdad llega a una notaría.

## Lo que la une al `?? false` no es el `??`

Y esto es el hallazgo, no la anécdota:

> **No los une el `??`: los une que el dato llega transformado y la guarda no
> puede saberlo.** En un caso lo transforma un valor por defecto; en el otro, un
> `select` incompleto. La misma guarda, desarmada por dos vías que no se
> parecen en nada al leerlas.

De ahi la regla general:

> **Una guarda no puede validar su propia entrada.** Puede validar el VALOR que
> recibe, nunca la **fidelidad** de ese valor respecto de lo que hay en la base.
> Esa fidelidad la decide el llamador, y la guarda no tiene forma de
> comprobarla.

Corolario operativo: cuando una guarda acepte un «vacío» como caso legítimo,
hay que preguntarse si el tipo distingue **«vacío» de «no cargado»**. Si no los
distingue, la guarda está aceptando los dos y solo uno es legítimo.

Arreglada: `[]` pasa, `undefined` **detiene** con un mensaje que dice la
diferencia. 5 verificaciones y una mutación.

# UNA LLAMADA QUE FALTA NO TIENE SINTAXIS

**Categoría propia, y separada a propósito de las tres de «leer una expresión no
es leer un camino».** Aquellas son código PRESENTE que no se alcanza. Ésta es
código AUSENTE. Las primeras se cazan preguntando **«se llega ahí?»**; ésta solo
preguntando **«esto debería existir?»** —y esa pregunta no se le puede hacer al
repositorio—.

## El caso, completo

El 2026-10-23, en producción: **9 de los 12 leads de los últimos 60 días no
generaron ningún aviso a Leonel.** Clientes reales, con nombre y teléfono,
esperando una llamada que nadie sabía que había que hacer. Uno de ellos
—Martha Patricia Navarrete, el 11 de octubre— envió el formulario **dos veces
el mismo día**, probablemente porque nadie le contestó la primera.

La causa no fue un fallo. `POST /api/leads` —por donde postean los **cuatro**
formularios públicos del sitio— **no contenía ni una línea de notificación.
Nunca la tuvo.** La escritura del lead era lo último dentro del `try`, y
después no había nada.

## Por qué ninguna guarda podía encontrarlo

`verificar-escrituras.mjs` busca «una escritura seguida de algo que puede
fallar en el mismo try». Se fue a mirar si `/api/leads` estaba entre sus ocho
entradas de deuda conocida: **no estaba, y no era un fallo de la guarda.** La
guarda hacía exactamente lo que dice. Aquí la escritura no iba seguida de nada,
así que no había ninguna forma sintáctica que detectar.

Un `??` que desarma una guarda se ve leyendo el llamador. Un `!` que falsifica
una comprobación se ve leyendo el tipo. Una condición inalcanzable se ve
siguiendo el camino. **Una llamada que no está no se ve en ninguna parte**,
porque no hay dónde mirar: no deja hueco, no deja token, no deja nada. Es
indistinguible de un archivo que está bien.

## Lo que lo mantuvo escondido

Dos cosas, y la segunda es la que vale para la próxima vez.

**Primera: el único camino instrumentado era el menos usado.**
`enviarAlertaLeadWhatsApp` se llamaba desde cuatro sitios —dos crons, la salud
de Redis y el agente Mac— y ninguno era el formulario público. El único camino
de leads que sí avisaba era el del chat de Mac, que ya habíamos **medido en
Redis como apenas utilizado**. 3 de 12 leads.

**Segunda, y es la regla:**

> Las pruebas recorren el camino que el programador tiene a mano, no el que la
> gente usa.

Funcionaba en las pruebas porque en las pruebas se prueba Mac: es el camino
interesante, el que tiene lógica, el que se acaba de escribir. El formulario
de contacto es aburrido, lleva años ahi y «ya funciona». Nadie prueba el
camino aburrido, y el camino aburrido es por donde entra el 75 % de los
clientes.

Corolario práctico: **al elegir qué instrumentar, mirar el reparto de uso
REAL, no el reparto de complejidad.** Y si no se conoce el reparto de uso, eso
es lo primero que hay que medir.

## Las dos puertas mudas del camino que sí avisaba

Aun en el camino instrumentado había **tres `return` que salían sin escribir
nada**, y el defecto se habría escondido igual:

* `whatsapp.ts:41` — `if (!to) return`, sin un solo log. Si faltaba la variable
  de entorno, no se avisaba y no quedaba rastro.
* `tools.ts:630` y `:668` — `if (resumen)`. Si el LLM que genera el resumen
  fallaba o devolvía vacío, **la falta de un texto de cortesía se convertía en
  la falta del aviso entero**. El nombre y el teléfono ya bastan para devolver
  una llamada.
* `whatsapp.ts:84` — el cuerpo literal de Meta iba a `console.warn` y se iba
  con el log. Cuando se fue a buscar para los tres leads de Mac, **ya no
  existía**.

De ahí la regla que ahora sostiene `aviso-lead.ts`:

> Un camino de aviso no puede tener un solo `return` mudo. Si no se avisa, algo
> queda escrito, siempre.

Y está probada de forma **exhaustiva y no por muestreo**: se recorren las 64
combinaciones de las tres variables de configuración y el resumen, y se exige
que las 64 produzcan o un envío o un motivo decible. Si alguien añade una
condición y se le olvida el motivo, la prueba se cae.

## Lo único que convierte esta clase en algo mecanizable

No se puede escribir una guarda que adivine qué llamadas faltan. **Sí se puede
escribir la respuesta una vez y hacer que el build la compruebe.** Es lo que
hace `verificar-avisos.mjs`: declara la regla de negocio —«todo sitio que crea
un lead avisa, o declara por qué no»— y la vigila en las dos direcciones.

Y una anotación sobre el instrumento, porque se portó bien a la primera: **su
segunda dirección me cazó a mí.** La primera versión traía una excepción
declarada para `src/app/api/admin/crm/route.ts` «porque lo crea un admin a
mano». Plausible y falsa: ese archivo no crea leads. Una lista de excepciones
acumula exactamente esa clase de entrada cuando nadie la contrasta, y por eso
la guarda también se pone en rojo cuando una razón caduca.

La mutación que borra la llamada de `/api/leads` **no la caza ninguna prueba del
arnés** —una llamada que falta no tiene sintaxis—: la mata la guarda. Si
sobreviviera, el arreglo de hoy podría deshacerse mañana sin que nada se
quejara, que es exactamente cómo llegó a existir.

## LA LÍNEA BASE: UN TESTIGO QUE NO ES NUESTRO

**2026-10-23.** Leonel abrió el panel de Meta y trajo la cifra que ningún
instrumento del repositorio podía dar:

> plantilla `nuevo_lead_sfr` — **APROBADA** y activa, Utilidad, Spanish (COL),
> en vigor desde el **2026-07-29**.
> **MENSAJES ENTREGADOS: 1.** Uno, en los 86 días de vida de la plantilla.
> La columna siguiente marcaba (3), consistente con los 3 leads del agente Mac.

Es la primera vez en el proyecto que hay un **testigo externo**. Las 53 cifras
notariales se cotejan contra un documento que transcribimos nosotros: dos
lecturas, sí, pero las dos nuestras. Aquí la segunda lectura la lleva Meta, con
su propio contador, y no la controlamos. Eso la hace mejor que cualquiera de
las nuestras.

### Qué cierra, y contra qué superficie

Dos candidatos del diagnóstico, y los cierra **contra una superficie que no es
la nuestra**:

* **no era la plantilla** — estaba aprobada desde julio;
* **el token sirvió al menos una vez** — un mensaje se entregó.

Y lo que lo vuelve un hecho en vez de una conclusión: la lectura del código
—«solo el camino de Mac llama al aviso, y Mac apenas se usa»— y el contador de
Meta —«1 entregado, (3) al lado»— **coinciden sin haberse mirado**. Dos
instrumentos independientes diciendo lo mismo.

### Lo que ese 1 NO demuestra

**Que el token funcione hoy.** Un token que entregó un mensaje sirvió; si sirve
ahora solo lo prueba un envío real, no una inspección. Por eso el token **deja
de investigarse** y el criterio de aceptación pasa a ser un hecho observable:

> Un lead de prueba enviado por el **FORMULARIO WEB** —no por Mac, que es el
> camino que ya funcionaba— que llegue al WhatsApp de Leonel, y el contador de
> Meta pasando de **1 a 2**.
>
> Mientras eso no ocurra, el arreglo NO está hecho, aunque el código esté bien
> y el build en verde.

Esa última frase es la regla general, y es la misma familia que «un verde que
no puede ser rojo no es un verde»: **código correcto y cadena comprobada son
afirmaciones distintas**, y aquí la segunda la firma un instrumento ajeno.

### El cotejo permanente

`scripts/cotejar-avisos.mjs` compara nuestros `ACEPTADO_POR_META` con los
entregados de Meta. La cifra de Meta **se teclea**, no se consulta por API, por
dos razones:

1. si el guión fuera a buscarla, las dos lecturas pasarían por el mismo token y
   la misma credencial, y un fallo de permisos las movería a las dos a la vez;
2. teclearla obliga a que una persona abra el panel y la lea, que es el acto
   que la convierte en una segunda lectura y no en un eco —la misma razón por
   la que el veredicto del panel notarial no lleva la cifra transcrita—.

Y el guión distingue las dos direcciones de la diferencia, que no significan lo
mismo: si nosotros contamos **más** que Meta, es la distancia normal entre
«aceptado» y «entregado» (un número bloqueado se acepta y no se entrega); si
Meta entrega **más** de los que registramos, hay un camino de envío que no pasa
por `avisarLead`, y eso es el defecto del 2026-10-23 otra vez en otra forma.

### Y lo que ninguna de las dos cifras es

Un acuse. «Entregado» de Meta es entregado al teléfono, y nuestro
`ACEPTADO_POR_META` es menos todavía. **Un acuse no es que el emisor crea que
envió: es que el receptor cite lo recibido.**

## VARIANTE: UNA DECISIÓN CORRECTA CON UN MOTIVO INVENTADO

No es una afirmación falsa. Es algo más difícil de cazar: **la decisión
acertada acompañada de una justificación que no resiste comprobación.**

El caso, del mismo día. Al cablear el aviso en `/api/leads` lo puse FUERA del
`try` de la escritura —correcto— y escribí en el comentario que era porque un
fallo del aviso «no puede convertir un lead guardado en un 500 que le diga al
visitante que vuelva a intentarlo, **así se duplicó Martha Patricia Navarrete
el 11 de octubre**».

Eso contradice mi propio hallazgo de media hora antes: en esa ruta **no había
ningún código de aviso**, así que no podía lanzar nada ni producir ningún 500.
Ella se duplicó porque nadie le contestó. Cogí un hecho real del incidente y
lo pegué como causa de una decisión que ya había tomado por otra razón.

El motivo que sí resiste, y es el que está ahora en el archivo:

> Un aviso es un efecto secundario del registro de un lead, y un efecto
> secundario no puede decidir si el hecho principal ocurrió.

### Por qué esta variante es peor que una mentira franca

Porque **se descubre verificando el motivo, no el código — y nadie verifica los
motivos.** El código estaba bien, la prueba pasaba, la guarda estaba contenta y
el comentario sonaba a experiencia ganada en el incidente: la clase de frase
que un lector futuro cita en vez de comprobar. Habría sobrevivido a cualquier
revisión que mirara si el código hace lo que el comentario dice, porque lo hace.
Lo que no hace es hacerlo **por eso**.

Y el modo de fallo es el habitual y en la dirección cómoda: un detalle concreto
y verificable —un nombre, una fecha— presta credibilidad a una relación causal
que nadie va a reconstruir. Es la misma mecánica de las cifras infladas de la
doctrina AEO, aplicada a un comentario de código.

### Cómo se caza

No hay guarda posible. Lo único que funciona: **cuando un comentario explica un
PORQUÉ con un caso concreto, comprobar que ese caso podía ocurrir por ese
camino.** Y la señal de alarma es la propia vistosidad: si el motivo es una
anécdota y no una propiedad, probablemente llegó después de la decisión.

Un motivo basado en una propiedad —«un efecto secundario no decide si el hecho
principal ocurrió»— no se cae cuando alguien lo verifica. Uno basado en una
anécdota, sí.

## TENER EL DATO NO ES USARLO

La regla, tal cual, porque es la forma más traicionera de incumplir una regla
propia:

> Tener el dato no es usarlo. Y es más grave que no tenerlo, porque el
> documento parece cumplido.

El caso, el mismo día. `scripts/cotejar-avisos.mjs` nació para cotejar nuestros
avisos contra el contador de Meta. En su primera ejecución dio:

> ✗ DIFIEREN, y en la dirección que NO debería poder pasar. Meta entregó 1 más
> de los que registramos. Hay un camino de envío que no pasa por `avisarLead`.

Falso y alarmante. Estaba comparando **el contador de toda la vida de la
plantilla** —desde el 2026-07-29— contra una tabla nacida diez minutos antes.
Ese 1 se entregó meses antes de que `avisos_lead` existiera.

Y lo incómodo no es el fallo, es dónde estaba la respuesta: **la línea base
estaba escrita, fechada y en una constante del propio archivo.** Se usaba para
imprimir la cabecera y para nada más. El proyecto ya tenía la regla escrita
—«una medición sin su línea base fechada no es una medición, es un número»— y
la incumplí con la línea base delante.

Por eso es peor que no tenerla. Si no estuviera, el guión no habría podido
imprimir la cabecera y la falta habría sido visible. Estando —decorando— el
archivo **parece** cumplir la regla: cualquiera que lo abra ve la fecha, la
cifra y la procedencia, y concluye que está cotejado contra su línea base.

### La forma general

Un dato guardado en el sitio correcto, con su fecha y su fuente, **que no entra
en ninguna decisión**. Hermanos de la misma familia ya en este documento: el
comentario que promete un filtro que no existe, el cron que avisa de 0 filas
sobre una tabla que nadie escribe, la guarda que nadie llama. En todos, lo que
engaña no es la ausencia: es la presencia inerte.

La pregunta que lo caza, y hay que hacérsela a cada constante documentada:
**¿qué se rompe si le cambio el valor?** Si la respuesta es «una línea del
informe se imprime distinta», no está en uso. Es la misma pregunta que el
arnés de mutaciones le hace al código, hecha a mano sobre los datos.

## La consecuencia que queda abierta

La lista de lo que el sistema **debería** hacer solo no existe en ninguna parte:
vive en la cabeza de Leonel. Mientras siga ahí, el único detector de esta clase
de defecto es que un cliente se pierda. Las 15 preguntas están en
`LO-QUE-EL-SISTEMA-DEBERIA-HACER-SOLO.md`, con lo que el código hace hoy al
lado: **2 existen, 4 a medias, 8 no existen, 1 no se puede responder sin él.**

Un «no existe» de esa tabla no es una tarea todavía. Puede que la respuesta sea
que no hace falta —y entonces lo que hay que escribir es **por qué no hace
falta**, para que nadie lo vuelva a preguntar dentro de un año.

# LEER UNA EXPRESIÓN NO ES LEER UN CAMINO

**Tres defectos de la misma familia**, y los tres parecen sustancia cuando son
decoración:

| | qué parece | qué es |
|---|---|---|
| **la guarda que nadie llama** | una comprobación | código que no se ejecuta |
| **la mutación en un punto sin efecto** | una afirmación respaldada | un cambio que no altera el resultado |
| **el `??` en una rama inalcanzable** | una amenaza | código muerto |

> **Las tres se cazan con la misma pregunta, y no es «¿está escrito?» sino
> «¿SE LLEGA AHÍ?».** Lo escrito se lee; lo alcanzable hay que recorrerlo, y son
> dos trabajos distintos.

## Los dos casos de esta semana, con quién falló en cada paso

**1. `domicilios ?? false`.** Reporté que publica «no hace domicilios» sobre el
negocio de un tercero. El componente dice `{b.domicilios && (…)}`: **con
`false` no se publica nada**.

| paso | quién | qué hizo |
|---|---|---|
| 1 | yo | clasifiqué la fila **suponiendo la renderización** desde el valor por defecto, sin abrir el componente |
| 2 | el titular | **escaló** la gravedad leyendo mi resumen, no la pantalla |
| 3 | yo | fui al dato y la premisa era mía y falsa |

**2. `s.email ?? 'admin'`.** Lo reporté como «falsea quién actúa» en cinco
llamadas. `AdminSessionUser.email` es `string` y `Admin.email` es NOT NULL:
**el `??` nunca se alcanza**. 0 actos firmados por `'admin'` en producción.

| paso | quién | qué hizo |
|---|---|---|
| 1 | yo | leí la expresión y no el tipo |
| 2 | el titular | lo priorizo como prerrequisito del editor —razón correcta: el editor firma 29 actos— |
| 3 | yo | medí antes de arreglar, y el lote cambió de motivo |

Y el lote **se hizo igual**, por una razón que la medición no cancela: la
protección no podía depender de que un tipo siguiera siendo obligatorio. Eso
también es parte de la lección: **«código muerto» no es «no hay nada que
hacer»** —es «la amenaza no es la que dije»—.

## El tercer caso, el más antiguo, por si hace falta el recordatorio

La mutación no-op del 19 de octubre: quitaba un `&& !enBlanco` de una condición
**que en ese caso ya no se alcanzaba**. Cambió el archivo, pasó la comprobación
de que el contenido cambió, y no cambió nada. Es el mismo error en el
instrumento que mide a los instrumentos.

> Tres veces en cinco días, con tres formas distintas. **Lo que las une no es un
> descuido: es un atajo que se siente como lectura.** Mirar una expresión da la
> sensación de haber comprobado algo, y lo único que se ha comprobado es que
> está escrita.

# LA PROCEDENCIA POR FILA, Y EN LOS DOS SENTIDOS

De la cadena de `domicilios` sale una regla que **no es solo para mí**:

> **Cada fila de un informe dice de dónde sale: CONSULTA · LECTURA DE CÓDIGO ·
> INFERENCIA.** Las tres se leen con la misma confianza y no valen lo mismo.

Y aplica en los dos sentidos, que es lo que la hace útil:

| | |
|---|---|
| **mis informes** | una tabla resumida se lee como si cada fila fuera una consulta. La de `domicilios` era una **inferencia** y no lo decía |
| **los prompts que escalan algo** | «esto sube de categoría» apoyado en una fila de mi informe es una inferencia **sobre una inferencia** |

> La cadena de `domicilios` fueron **dos lecturas de prosa seguidas sin un dato
> en medio**, y la rompe cualquiera de los dos declarando su fuente. No hace
> falta que la rompan los dos: basta uno.

Es la versión operativa de «un informe es un dato de segunda mano». Lo escribo
aquí porque es lo único de esta semana que cambia **cómo se conversa**, no solo
cómo se programa.

# POR QUÉ LOS MÓDULOS HOJA NO PUEDEN USAR TODO TYPESCRIPT

Esto estaba escrito como **preferencia** —«módulos hoja con imports relativos,
sin alias»— y es una **restricción con motivo**:

> Los módulos hoja tienen que poder correr con **`node` directo**, en modo
> *strip-only*. Y eso no es comodidad: es lo que permite que el arnés ejercite
> **el código real** y no una copia transpilada. Un arnés que prueba el
> resultado de un compilador prueba el compilador también, y cuando algo falla
> no se sabe cuál de los dos fue.

El 2026-10-19 la restricción se defendió sola: `SinIdentidadParaFirmar` se
escribió con una *parameter property* —`constructor(public acto: string)`— y el
arnés **no compiló**:

```
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]:
TypeScript parameter property is not supported in strip-only mode
```

Lo que importa es **cuándo** se notó: en el primer segundo, no en producción.
Una comodidad de TypeScript que rompa el modo strip-only rompe la cadena entera
—arnés → mutaciones → cadena del build—, porque los tres corren el módulo con
`node`.

**La lista de lo que no se puede usar en un módulo hoja** —sabida a base de
tropezar, no de leer la documentación—: *parameter properties*, `enum`,
`namespace`, decoradores, y los alias de ruta (`@/`). Nada de eso cambia lo que
el código hace; todo eso cambia **quién puede ejecutarlo**.

# LAS TRES FORMAS DE DESARMAR UNA GUARDA

Se separan porque **se encuentran de maneras distintas**, y mezclarlas hace que
se busque solo la primera.

| | qué falsea | dónde se ve |
|---|---|---|
| **1. Falsear el dato** — `?? false`, `?? []` | el valor que la guarda recibe | **leyendo al llamador**. Desde la guarda no se ve nada raro: recibe un valor del tipo correcto |
| **2. Falsear la comprobación de que el dato existe** — el `!` de TypeScript | nada del dato: la obligación de preguntar | **leyendo el llamador Y conociendo el tipo**. No deja rastro en tiempo de ejecución hasta que revienta |
| **3. Falsear quién actúa** — `?? 'admin'` | la identidad que firma | en la columna de firma, **meses después**, cuando ya no hay forma de saber quién fue |

Sobre la segunda, la distinción que la hace reconocible:

> **El `!` no convence a la guarda: convence al compilador de que no hace falta
> preguntar.** Las otras dos formas engañan a una comprobación en tiempo de
> ejecución; esta borra una comprobación que habría ocurrido **antes de
> ejecutar nada**.

Y sobre la tercera, lo que la hace la más cara aunque no mueva ninguna cifra:

> **Una cifra equivocada se recalcula; quién la cargó, no.** La firma es el
> único dato del sistema que **no se puede derivar de ningún otro**. Las demás
> columnas son reconstruibles con suficiente trabajo; esta, no: o se guardó bien
> o se perdió.

# LA FIRMA QUE NO PUEDE SUSTITUIRSE — y una corrección más, otra vez mía

2026-10-19, lote A. El titular lo puso **antes** del editor y con la razón
correcta: el editor va a firmar 29 actos.

## ⚠ Lo primero: la amenaza que reporté no existía

Reporté `s.email ?? 'admin'` en cinco llamadas como «falsean quién actúa».
Medido después:

| | |
|---|---|
| `AdminSessionUser.email` | `string` — **no opcional** |
| `Admin.email` en el esquema | `String @unique` — NOT NULL |
| ⇒ el `??` | **nunca se alcanza: es código muerto** |
| actos firmados por `'admin'` en producción | **0** |
| años notariales | 1, en BORRADOR, `activado_por = null` |
| respaldos normativos | 0 |
| fuentes normativas | 8 — 7 `"precarga"`, 1 `"titular"` |

> **Clasifiqué desde la expresión sin comprobar si la rama es alcanzable.** Es
> el mismo error que la mutación no-op, un nivel más arriba: un cambio
> sintácticamente real sobre código que no se ejecuta. Y es la segunda vez en
> dos lotes —la otra fue `domicilios`—, así que no es mala suerte: es un
> hábito que hay que vigilar. **Leer una expresión no es leer un camino.**

## Y aun así el lote se hizo, por dos razones que la medición no cancela

1. **La protección no puede depender de que un tipo siga siendo obligatorio.**
   El día que `email` sea opcional —SSO, un usuario de servicio, una
   migración— los cinco `?? 'admin'` volverían a estar vivos **sin que nada
   avise**. Quitarlos convierte ese futuro en un **error de compilación**.
2. **La columna de firma guarda TRES clases de valor y nada las distinguía.**
   Hoy hay marcadores donde mañana habrá correos:

| clase | ejemplo | ¿acredita? |
|---|---|---|
| `PERSONA` | un correo de `admins.email` | **sí** |
| `MARCADOR` | `precarga` —la puso la siembra—, `titular`, `admin` | **no** |
| `AUSENTE` | vacío o nulo | no |

`precarga` **no es un defecto**: dice la verdad, y es mejor que un correo
inventado. Lo que no valía es que se leyera igual que si alguien hubiera
respondido por ella —y de hecho **no se leía en absoluto**: el campo no llegaba
a la pantalla—.

Hecho: `lib/notariales/firma.ts` —hoja— con `clasificarFirma` y `exigirFirma`,
que **detiene y no sustituye**; los cinco `?? 'admin'` fuera; las tres funciones
que firman un año pasan por la puerta; y el panel muestra la clase, con aviso
cuando la autoridad la dio de alta un marcador. 11 verificaciones (573
notariales) y 2 mutaciones (22).

`admin` se queda en la tabla de marcadores **para poder LEER** los actos que lo
tuvieran —hoy cero— y **se rechaza al escribir**. Es la distinción de siempre:
lo que ya pasó se lee tal cual; lo que va a pasar, se exige.

## Y el arnés cobró su cuota en el primer intento

`SinIdentidadParaFirmar` se escribió con una *parameter property*
—`constructor(public acto: string)`— y Node no la soporta en modo
**strip-only**. El arnés no compiló.

> Es la regla de los módulos hoja defendiéndose sola: **tienen que poder correr
> con `node` directo**, y eso es lo que permite que el arnés ejercite el código
> REAL y no una copia transpilada. Una comodidad de TypeScript que rompa eso se
> nota en el primer segundo, no en producción.

# UNA GUARDA DESARMADA POR SU LLAMADOR

Esto **no** es un caso de «la lección estaba cerca y no viajó», y por eso va
aparte de los cuatro de distancia. Aquí:

> El principio **estaba escrito**, era **correcto**, **se ejecutaba** —y el
> llamador lo desarmaba.

```ts
// costoEgreso: escrita para detenerse
if (vacio(responsableIva)) throw new ParametroFiscalFaltante(
  'No se ha decidido si el año es responsable de IVA…')

// gastosPorCategoria, una línea antes de entregárselo
gastoDeResultado({ …f }, responsableIva ?? false)
```

## La consecuencia práctica

> **La integridad de una guarda depende de lo que le LLEGA, no solo de lo que
> hace.** Una guarda perfecta sobre un dato ya falseado no comprueba nada, y
> además **parece estar comprobando**: su código se lee bien, sus pruebas pasan,
> su mensaje existe. Lo único que falta es que alguna vez se dispare.

## Lo que la distingue de «una guarda que nadie llama»

Son parientes y se encuentran de maneras **opuestas**:

| | cómo se encuentra |
|---|---|
| una guarda que **nadie llama** | **leyendo el código de la guarda** —o buscando sus referencias—: está ahi y no aparece en ningún sitio |
| una guarda **desarmada por su llamador** | **solo leyendo a quien la llama.** Desde la guarda no se ve nada raro: recibe un `boolean` perfectamente válido |

Y ese asimétrico es lo que la hace peligrosa: **leyendo la guarda es donde todo
el mundo mira.**

## Por eso se buscó al revés, y a máquina

Es el único de los cinco casos que se puede buscar mecánicamente: qué funciones
lanzan un error de guarda, y de ahí a **todos** sus llamadores, mirando si el
argumento llega con `??`, `||`, `Boolean(`, `Number(` o un default.

**61 guardas · 25 llamadas coercionan · 2 falseaban la decisión.** Detalle en
`AUDITORIA-TEXTOS-PUBLICOS.md` §5.f.

La segunda es la que vale como ejemplo, porque falsea **por otra vía**:
`exigirVigencia(anio.respaldos ?? [], fechaActo)`. Una lista vacía pasa —y
debe—; pero `respaldos` es **opcional en el tipo**, así que un `select` que no
los incluya devuelve `undefined`, el `??` lo vuelve «ninguno» y **la
comprobación de vigencias deja de comprobar mientras aparenta funcionar**: se
liquidaría con tarifas vencidas.

> **La misma guarda, desarmada por un valor por defecto en un caso y por una
> consulta incompleta en el otro.** Lo que las une no es el `??`: es que el dato
> llega transformado y la guarda no puede saberlo.

Arreglada distinguiendo los dos estados: `[]` pasa, `undefined` **detiene** con
un mensaje que dice la diferencia —«esto no es "no hay respaldos" —eso sería
una lista vacía—: es que la consulta no los trajo»—.

## Y dos formas de desarmar que no son `??`

**El `!` de TypeScript** merece su propia línea: `calcularRetencion(…, base!.valor)`.

> Las demás formas **falsean el dato**; el `!` **falsea la comprobación de que
> el dato existe**. No convence a la guarda: convence al compilador de que no
> hace falta preguntar.

Y **la identidad por defecto**: `s.email ?? 'admin'` en las cuatro llamadas que
firman un acto —activar un año tarifario, verificar un respaldo—. No falsea una
cifra: falsea la **trazabilidad**, que es el único dato del sistema que **no se
puede recalcular después**.

# HACER VISIBLE UN VALOR SILENCIOSO, COMO TÉCNICA

No es una anécdota de cómo apareció un defecto: es una técnica repetible, y
conviene usarla a propósito.

> **Cuando algo se resuelva solo y en silencio, hazlo visible aunque no haga
> falta, y mira a dónde va.**

El caso que la produjo: la captura de un gasto no tenía campo de fecha y el
servidor la resolvía como «hoy». Prerrellenar la casilla era **ergonomía**, no
una búsqueda de defectos. Pero para prerrellenarla hubo que **meter `fecha` en
el cuerpo de la petición**, y para eso hubo que mirar qué más manda ese cuerpo
—y lo que manda es también **lo que se encola sin conexión**—.

Ahí estaba el defecto: un gasto capturado el **31 de diciembre** y sincronizado
el **1 de enero** se fechaba en enero. **Cambio de año fiscal.**

Por qué funciona, que es lo que la hace repetible:

1. **Un valor silencioso no tiene llamadores visibles.** No se puede seguir lo
   que no se pasa: el `?? hoy` del servidor era el final de un camino que no
   empezaba en ninguna parte.
2. **Hacerlo explícito le crea un camino**, y un camino se recorre. El dato pasa
   a tener origen, tránsito y destino, y cada tramo se puede mirar.
3. **Y obliga a decidir qué pasa en los bordes** —sin conexión, en cola, al
   reintentar—, que es donde vivía el defecto.

Es la pariente de «el primer estado no es un extremo»: aquella pregunta por el
**origen** del dato, esta por su **recorrido**. Y las dos encuentran cosas que
ningún barrido de patrones encuentra, porque lo que buscan no tiene forma
léxica.

# LA DISTANCIA QUE SE ENCOGE

Cuatro veces ha pasado lo mismo: **una regla escrita y su incumplimiento cerca.**
Y la distancia se ha ido acortando cada vez, hasta volverse absurda.

| | la regla | el incumplimiento | distancia |
|---|---|---|---|
| 1 | el comentario de `next.config.ts` sobre no desactivar comprobaciones | la opción desactivada más abajo en el mismo archivo | **~30 líneas** |
| 2 | los días puros, resueltos en un archivo | `respaldos_normativos` con la misma clase de fecha sin tocar | **el archivo vecino** |
| 3 | «**NO se infieren**: se capturan del RUT del tercero» | `es_declarante_renta Boolean @default(false)` | **UNA LÍNEA** |
| 4 | `calcularIva`: «no se asume que no lo es» y lanza | `calcularRetefuente` eligiendo tarifa sobre un dato no capturado | **dos funciones, mismo archivo** |

Y hay un quinto que no es distancia sino **dirección**, y por eso cierra la
serie: el `?? false` de `reportes.ts` llamaba a `costoEgreso` —la función
escrita para detenerse ante lo no decidido— **para anularla**, desde otro
archivo.

> **La guarda existía, era correcta, y el llamador la desarmaba una línea antes
> de entregarle el dato.** No faltaba el principio: faltaba no desactivarlo al
> usarlo. Un principio implementado no protege a quien lo llama con un valor por
> defecto.

## La regla operativa, que es lo único que de verdad sirve de esto

> **Al establecer un principio hay que buscar la misma pregunta en TODO el
> proyecto, nunca en lo cercano.** Lo cercano es donde uno deja de buscar
> —«esto ya lo acabo de revisar»— y por eso es donde el defecto sobrevive más.

La prueba está en la tabla: el caso 3 estaba a **una línea** de su regla y el 4
a **dos funciones** de su solución. Si la cercanía protegiera, esos dos serían
imposibles.

Corolario práctico: **el barrido se hace con la pregunta, no con la ruta.** La
del 2026-10-19 fue «¿dónde más un *no decidido* se lee como un *no*?», buscada
en `src/` entero: once sitios, cuatro que eligen una cifra. Está en
`AUDITORIA-TEXTOS-PUBLICOS.md` §5.e.

# LA CUARTA FECHA DE LA FAMILIA, Y APARECIÓ SIN BUSCARLA

La familia de las fechas lleva cuatro casos, y el cuarto es el más revelador por
**cómo** apareció:

| | el caso |
|---|---|
| 1 | el año del pie, con `new Date()` en el servidor —UTC—: cinco horas al año decía el año siguiente |
| 2 | los nueve días puros guardados en columnas de instante |
| 3 | las diez fechas leídas en UTC y publicadas —`toISOString()` sobre el ahora— |
| 4 | **la cola sin conexión** |

El cuarto: la captura de un gasto funciona **sin señal** y encola el gasto en el
teléfono. La fecha no viajaba en el elemento de la cola —el servidor la
resolvía como «hoy» al recibirlo—, así que **un gasto capturado el 31 de
diciembre y sincronizado el 1 de enero se fechaba en enero: cambio de AÑO
FISCAL.**

> **Y no apareció buscándolo.** Apareció al prerrellenar la casilla de la fecha
> —una tarea de ergonomía—: al meter `fecha` en el cuerpo de la petición hubo
> que mirar qué más manda ese cuerpo, y lo que manda también es lo que se
> encola.
>
> **Hacer visible un valor silencioso obliga a seguirlo**, y seguirlo es lo que
> encuentra el defecto. Las tres fechas anteriores salieron de barridos
> dirigidos; esta salió de tocar la interfaz.

# LA CUARTA CORRECCIÓN DE LA SERIE, Y ES AL ALZA SOBRE MÍ MISMO

A la tabla de «corregirse hacia arriba y hacia abajo cuesta lo mismo» se añade
la cuarta, y es de una clase nueva: **corregir una cifra que yo mismo
documenté.**

El 2026-10-16 escribí en `verificar-build.mjs` que el contador de consultas
tiene «~3 % de varianza propia», medido con dos corridas (1293 y 1251). El
2026-10-19 marcó **1311 ▲** sobre 1250 —fuera de mi propia banda—.

Lo honesto habría sido fácil de evitar: el delta cabía en «ruido» con solo no
mirar la banda que yo mismo había escrito. En vez de eso se reconstruyó **sin
tocar nada** y volvió a **1251**.

> **La banda real es 1250–1311, ~5 %**, no el ~3 % documentado. Corregido en el
> guion, con las cinco mediciones y con la frase de que se comprobó
> reconstruyendo en vez de suponer.

Las cuatro juntas: dos a la baja —la deriva del `float`, las «cuatro horas»—,
una al alza sobre un reporte propio —la frase publicada— y esta, al alza sobre
**una medición propia ya escrita en el código**. La última es la más fácil de
no hacer, porque el único que iba a notar la contradicción era quien escribió
las dos cosas.

# EL TIPO DECIDE SI EL « NO SÉ » PUEDE EXISTIR

2026-10-19. Hermana de **«el modelo de datos decide qué se puede ver»**, y la
relación es exacta: aquella limita lo que se puede **inspeccionar**, esta limita
lo que se puede **decir**.

> **Un `Boolean` no tiene tercer estado.** Si el dato admite «no se sabe» y el
> tipo no, el «no se sabe» **no se pierde en la interfaz: no existe nunca**. Y
> entonces alguien tiene que elegir qué significa su ausencia, y lo elige el que
> escribió el `@default`, no el que conoce el caso.

## Caso 1 — las banderas del RUT, y es «la lección ya estaba escrita» en su forma más pura

```prisma
// ── Banderas del RUT. NO se infieren: se capturan del RUT del tercero. ──
es_declarante_renta   Boolean @default(false)
```

**Una línea de distancia entre la regla y su incumplimiento.** El comentario
prohíbe inferir; la línea siguiente infiere. Y no es una inferencia inocua:
`es_declarante_renta` **elige la tarifa de retención** (`calculo.ts`:
`esDeclaranteRenta ? tarifa_declarante : tarifa_no_declarante`), y en el
concepto «servicios» la de **no declarante es la más alta**, así que suponerla
cuesta dinero en la dirección de retener de más.

Lo que lo cierra es que **el principio ya estaba implementado dos funciones más
abajo, en el mismo archivo**:

```ts
// calcularIva
if (vacio(parametros.responsable_iva)) {
  throw new ParametroFiscalFaltante('No se ha decidido si … El cálculo se detiene: no se asume que no lo es.')
}
```

> El mismo autor, el mismo archivo, el mismo día probablemente — y en una
> función el «no decidido» detiene el cálculo y en la de al lado el «no
> capturado» elige una tarifa. **El rigor no se contagia ni dentro de un
> archivo.**

Corregido: las cuatro banderas son `Boolean?` **sin default** —migración
aditiva, archivada, con **0 filas en producción**, que es el momento más barato
posible— y `calcularRetefuente` distingue **tres** estados. El `null` no elige:
**lanza**, y el llamador ya tenía el camino hecho —deja el sugerido en `null` y
escribe la nota—, que es exactamente «movimiento anotado como incompleto».

Y el alta rápida deja ahora un marcador **que algo lee**: las cuatro banderas en
`null` explícito. Antes dejaba un `SIN-DOC-…` que **nadie leía** y una nota que
remitía a `/admin/finanzas/terceros`, **una ruta que no existe** —el patrón del
enlace del contador, esta vez dentro del código—.

## Caso 2 — el `'0'` de las habitaciones

`bedrooms` nace en `'0'` y **el 0 es a la vez «no lo he puesto» y «no tiene»**.
Aquí el tipo es `Int` y sí admite `null`, pero el **formulario** no ofrece la
forma de decirlo: nace con un cero escrito.

Y las dos superficies lo leían distinto:

| | cómo trataba el 0 |
|---|---|
| ficha, catálogo, meta descripción | **ausencia** — `p.bedrooms > 0 ? …` |
| `JsonLd.propertySchema` | **afirmación** — `numberOfRooms: property.bedrooms` |

> **El mismo valor, dos lecturas, y solo la de la máquina afirma.** Medido en
> producción: **15 inmuebles públicos con `bedrooms: 0`** y **14 con
> `bathrooms: 0`** le estaban declarando «cero habitaciones» a Google y a los
> modelos sobre un tercio del catálogo, **sin nada en la página que lo
> contradijera porque ahí no se muestra**.

Lo más revelador: en el **mismo objeto**, `floorSize` y `lotSize` **ya eran
condicionales**. La regla estaba aplicada a las áreas y no a los conteos, tres
líneas más arriba.

Corregido: `numberOfRooms`, `numberOfBathroomsTotal` y el bloque `offers`
completo —un precio de 0 afirmaría «gratis»— se omiten cuando valen 0. Un
campo **ausente** en schema.org es «no lo digo»; un campo **en 0** es «es
cero». Y el payload de Mac manda `null` en vez de 0, porque a un modelo
hay que decirle «no lo sé» con un null.

## Y lo encontró un barrido dirigido, no la lectura completa

`JsonLd.tsx` —787 líneas— tiene la lectura completa **aplazada** y sigue
apazada. Esto apareció preguntando por **el primer estado de un formulario** y
siguiendo el dato hasta donde se publica.

> **Un barrido dirigido encontró en un archivo caro lo que la lectura cara
> todavía no ha mirado. Las dos sirven, y no se sustituyen:** la lectura
> completa encuentra lo que no se sospechaba; un barrido con una pregunta buena
> atraviesa archivos que la lectura no ha alcanzado. Lo que no sirve es creer
> que haber aplazado una deja el archivo sin mirar.

## Lo que la fecha invisible enseñó de paso

La captura de un gasto **no tenía campo de fecha**: el servidor resolvía
`?? hoyComoDiaPuro()`. Que el valor por defecto sea hoy está bien; que sea
invisible, no.

> **Si la casilla muestra 19/10/2026, la persona lo ve y lo corrige. Si está en
> blanco, no sabe a qué está diciendo que sí.** Un valor silencioso no se puede
> contradecir.

⚠ Y hay una consecuencia que no se había visto: la captura funciona **sin
conexión** y encola el gasto. Con la fecha resuelta al guardar, **un gasto
capturado el 31 de diciembre y sincronizado el 1 de enero se fechaba en enero**
—cambio de AÑO FISCAL—. Ahora la fecha viaja dentro del elemento de la cola,
así que es la del día en que se capturó.

# EL CUARTO PISO DE LA ESCALERA, PENDIENTE Y NO RESUELTO

Queda escrito como **deuda conocida**, no como algo cerrado:

> **Nada comprueba que una mutación represente un error PLAUSIBLE.** Las
> diecinueve de hoy lo son porque se escribieron a mano pensando en errores que
> alguien podría cometer de verdad —invertir un `≤`, cambiar el sentido de un
> redondeo, tratar un `null` como `false`—, pero **no hay nada que lo exija ni
> que lo mida**. Una batería de mutaciones absurdas daría el mismo «19
> detectadas» y la misma sensación de respaldo.

Los tres pisos anteriores están en «LA ESCALERA DE UN INSTRUMENTO APRENDIENDO A
NO MENTIR». Este es el siguiente, y se nombra ahora para que no haya que
descubrirlo con un defecto.

# EL PRIMER ESTADO NO ES UN EXTREMO

2026-10-19, la pregunta que salió del editor de tramos y vale para todo
formulario: **«¿qué hay en la casilla justo después de pulsar añadir?»**

> Un extremo degenerado es un caso límite **del funcionamiento**. El primer
> estado es **lo que existe antes de que haya funcionamiento**, así que ninguna
> lista derivada de cómo funciona algo lo contiene. Y es **el único estado por
> el que pasan todos los registros**.

El barrido está en `AUDITORIA-TEXTOS-PUBLICOS.md` §5.d: **nueve sitios con el
patrón —un vacío que significa «todavía no» y que el código lee como un valor
legítimo—, cuatro de ellos públicos, y uno donde «no se sabe» no es
representable.**

Los dos que hay que recordar sin abrir el informe:

**1. El esquema se contradice a sí mismo en la misma línea.**

```prisma
// ── Banderas del RUT. NO se infieren: se capturan del RUT del tercero. ──
es_declarante_renta   Boolean @default(false)
```

Un `Boolean` no tiene tercer estado, así que un tercero creado sin esos datos
**nace afirmando que no declara renta**, y eso **elige la tarifa de retención**.
El comentario dice «no se infieren» y la línea siguiente infiere.

**2. La página esconde el cero y el marcado lo afirma.** Un inmueble nace con
`bedrooms: '0'`. La ficha y el catálogo filtran `> 0` —tratan el 0 como «no se
sabe», que es lo correcto— y `JsonLd.tsx:614` emite `numberOfRooms: 0` sin
condición.

> **El mismo valor, dos lecturas, y solo la de la máquina afirma.** En la página
> no hay nada que la contradiga, porque ahi no se muestra.

## La regla, y lo que distingue a los nueve de los que están bien

> **Un formulario no empieza vacío: empieza con lo que alguien eligió poner en
> él**, y esa elección se lee después como si la hubiera hecho el usuario.

Y la diferencia con los cinco casos bien resueltos **no es cuidado**: es si
existe una forma de decir «todavía no». Donde el tipo admite `null` o hay un
estado «por completar», el vacío sobrevive —la descripción vacía de un egreso
se guarda como el nombre de la categoría **y marca el egreso POR COMPLETAR**—.
Donde el campo es un `Boolean`, un `'0'` o un enum con valor inicial, **el vacío
se pierde en el primer renderizado** y ya nadie puede distinguirlo de una
respuesta.

# EL EDITOR DE TRAMOS: `desde` NO SE TECLEA

2026-10-19. La decisión la tomó el titular y es la que decide todo lo demás.

Se teclea **`hasta` y el valor**. `desde` se deriva del `hasta` de la fila
anterior —literal, **sin `+1`**, porque el intervalo es `desde < base ≤ hasta` y
los límites son contiguos; eso ya estaba escrito en `tipos.ts` por el caso de
$100.000.000,50—.

> **Lo que eso compra no es comodidad: el hueco y el solape dejan de poder
> escribirse.** No es una validación que los caza: es una forma donde no
> existen.

Es el primer nivel de la jerarquía —que no pueda ocurrir— y hasta ahora se
había aplicado poco: casi todas las guardas del proyecto son del tercer nivel
—que se note—. Y de paso, 29 filas pasan de **58 campos a 29**.

## Lo que deja de ser posible, y lo que queda por verificar

| imposible por construcción | sigue posible, y se verifica |
|---|---|
| un hueco entre dos tramos | dos `hasta` iguales → tramo de anchura cero |
| un solape | más de un tramo abierto |
| un `desde` que no case con el `hasta` anterior | ninguno abierto → la tabla no cubre el infinito |
| dos tramos con el mismo `orden` | la tabla vacía, un solo tramo, borrar la última fila |

Las verificaciones **dejaron de comprobar continuidad** —ya no hace falta— y
pasaron a comprobar lo que sí sigue siendo posible. 52 en
`scripts/probar-editor-tramos.mjs`, en la cadena del build (20 guardas).

## EL ORDEN CANÓNICO: «insertar una fila en medio» deja de ser una operación

Las filas se ordenan por `hasta` creciente y el abierto va siempre al final. Da
igual dónde se inserte una fila: **el resultado es idéntico**, y está probado
comparando los tres órdenes posibles. La pantalla no tiene que saber colocar
nada y no hay forma de dejar la tabla desordenada.

## UNA TABLA A MEDIAS NO ESTÁ ROTA, ESTÁ A MEDIAS

El diagnóstico tiene **dos severidades**, y esa es la parte que la pantalla
hereda sin decidir nada:

| | qué significa |
|---|---|
| `INCOMPLETA` | todavía no has terminado. No hay nada que corregir: faltan filas |
| `ERROR` | lo escrito se contradice. Hay algo que arreglar |

> **Si el editor grita desde la primera fila, en la fila 14 nadie lo lee.**

Así que la tabla vacía —cómo nace **todo** concepto sembrado— es `INCOMPLETA` y
no error; borrar la fila abierta deja la tabla `INCOMPLETA` y no la rompe; y una
fila recén añadida sin valor es `INCOMPLETA`. El tono de la pantalla lo decide
`resumenParaPantalla()`, en el módulo hoja: *OK / A_MEDIAS / MAL*.

## ⚠ EL PEOR DEFECTO QUE HA TENIDO ESTE MÓDULO, Y NO ESTABA EN LA LISTA DE CINCO

Al probar un estado que **nadie había listado** —la casilla del límite **en
blanco**, que es el estado en el que NACE toda fila— salió esto:

```
tramosDesdeFilas([{hasta: ''}, {hasta: null}])
  → DOS tramos con hasta: null y desde: 0
  → liquidable: true
```

**Dos infinitos y la tabla declarada apta para liquidar.** El segundo tramo no
se alcanza nunca, y la cifra habría salido plausible.

La causa: confundir «no hay límite» con «todavía no se ha escrito el límite».
Son el mismo valor para el código —`null`— y cosas opuestas para la persona.

> **Los cinco extremos degenerados eran una lista, y una lista tiene el punto
> ciego de toda lista: lo que no está en ella.** Los cinco venían del inventario
> de decisiones; este sexto solo aparece si se pregunta «¿qué contiene la
> casilla justo después de pulsar ‹añadir fila›?», y eso no es un extremo: es el
> **primer** estado.

Y el arnés encontró además que `leerNumero` **lanza** ante «-5», que es correcto
en el motor y **inaceptable en un editor**: quien teclea pasa por estados
ilegibles todo el rato —«-», «1.», «»— y una excepción ahí tumba la pantalla
en vez de señalar la fila.

> **Un número a medio teclear no es una excepción**, igual que una tabla a
> medias no está rota. El motor y el editor necesitan severidades distintas
> ante el **mismo** dato ilegible.

## Y una mutación que sobrevivió porque no mutaba nada

La primera mutación escrita para el defecto de la casilla en blanco
**sobrevivió**. No porque el arnés fuera flojo: porque la mutación era un
**no-op** —quitaba un `&& !enBlanco` de una condición que ya no se alcanzaba en
ese caso—. Reemplazada por la que sí cambia el comportamiento (`enBlanco = false`
en el origen), y detectada.

> Es la regla 1 del arnés de mutaciones aplicándose a sí misma un nivel más
> arriba: **no basta con probar que el ARCHIVO cambió; hay que elegir el sitio
> donde el cambio altera el comportamiento.** Una mutación sintácticamente real
> sobre código inalcanzable es una afirmación sin respaldo que se ve respaldada.

## La frontera entre los dos módulos, escrita y probada

El editor vigila la **FORMA**; el motor vigila la **TARIFA**. Una tabla donde un
inmueble más caro paga menos es **coherente para el editor** —no hay hueco, no
hay solape, los límites crecen— y la rechaza `verificarTramos` por no monótona.
Hay una verificación dedicada a que esa frontera no se mueva sin que se note.

## El viaje redondo, que se comprobó ANTES de construir la pantalla

`tramosDesdeFilas(filasDesdeTramos(t)) === t` para tablas de los tres modos, con
aportes institucionales, UVT y equivalencia en UVB. **Si una tabla válida no se
pudiera expresar en esta forma, la forma estaría mal**, y eso hay que saberlo
antes de dibujar nada.

# LA AFIRMACIÓN CON FECHA DE CADUCIDAD

2026-10-19. **Categoría propia, por encima de las doce formas de esconderse y de
los puntos ciegos del instrumento**, porque no es una forma de ocultar ni un
límite de una herramienta: es una propiedad del **tiempo** que ninguna de las
dos contempla.

> **Todas nuestras guardas comparan el texto con el estado de HOY, y hoy
> coinciden.** Una frase que deja de ser cierta **por el mero paso del tiempo**
> no la ve ninguna guarda, porque en el instante en que se comprueba **todavía
> es verdad**.

No es una hipótesis. Las guardas de este proyecto están construidas todas sobre
la misma pregunta —«¿lo escrito y lo construido coinciden?»— y la respuesta es
sí en el momento de preguntar. El 31 de diciembre siguen coincidiendo. El 1 de
enero una de las dos cambió sola, y **nadie tocó nada**: por eso ninguna guarda
se dispara.

## El caso que la descubrió fue uno que yo mismo creé

La §2 de la política dice que el contenido de las conversaciones se elimina a
los **doce meses**. Es cierta hoy porque **nada ha llegado a doce meses**: la
conversación más antigua de producción es del 2026-06-11. Consultado, no
supuesto: la fecha en que esa frase pasa de gratis a tener consecuencias es el
**2027-06-11**, y esa noche se vacían 3 conversaciones y 22 mensajes.

> **Escribí una afirmación pública verdadera con fecha de activación de su
> propia falsedad.** Si ese día la purga está apagada, la política publicada es
> falsa esa misma noche, y nada en el código cambió.

Se cerró con una alarma —el cron avisa por WhatsApp si algo vence con la purga
apagada—, que es lo correcto, pero conviene no maquillarlo: **la alarma es deuda
medida, no solución.** La solución de verdad está en «E», más abajo.

## El inventario, en `AUDITORIA-TEXTOS-PUBLICOS.md` §5.c

Siete afirmaciones caducan en **fecha conocida** —y solo tres están vigiladas—;
seis grupos caducan **sin fecha**, por un hecho ajeno; tres **se enfrían** sin
volverse falsas; cuatro sitios **parecen** caducar y no caducan porque la cifra
se deriva en cada renderizado.

Las cuatro sin vigilancia y con fecha, para que no se pierdan aquí:

| | caduca |
|---|---|
| el **0,27 %** de derechos notariales del glosario, y su ejemplo en pesos | 2027-01-01 |
| el **1 %** de impuesto de registro | 2027-01-01 |
| el **1 %** del tributo departamental | 2027-01-01 |

⚠ Y una que **saló del inventario al comprobarla**: los «421 años de La Vega».
El titular lo puso en duda antes de que se tocara nada, y la pregunta que lo
decide es si el título aparece en algún sitio **sin su fecha al lado**.
Comprobadas las siete superficies —listado, destacados, relacionados, la propia
página, `BlogPosting`, Open Graph, `llms.txt`—: **nunca viaja desnudo**. Un
artículo fechado que dice «hoy celebramos 421 años» no se vuelve falso en 2027:
se vuelve **histórico**.

> Es mi propia distinción aplicada a un caso que yo había clasificado mal:
> **caducar es volverse falso; enfriarse es seguir siendo cierto y comunicar
> otra cosa.** Lo metí en la columna equivocada porque vi una cifra que
> incrementa y me detuve ahí, sin preguntar dónde se lee.

Y el slug **no se toca**: una URL publicada no se cambia por una cifra del
título, ni siquiera si caducara.

⚠ **Y la ironía que hay que leer dos veces:** la calculadora notarial existe
**precisamente porque esas tarifas cambian cada año**. El módulo entero está
construido sobre «ninguna cifra sin su resolución y su vigencia» —con tabla de
respaldos, dominios autorizados y fechas de vigencia— y a treinta metros de ahí
el glosario publica un 0,27 % como si fuera una constante de la física.

> **El rigor no se contagia entre módulos.** Haber construido la maquinaria de
> la vigencia no protege al texto que está al lado y no la usa.

## Tres distinciones que el inventario obligó a hacer

1. **Caducar no es enfriarse.** «Última actualización: agosto de 2026» no se
   vuelve falsa nunca —era cierta al escribirse—; lo que cambia es **lo que
   comunica**: leída en 2028 dice «nadie ha mirado esto en dos años». *Una
   afirmación que caduca necesita una guarda; una que se enfría necesita una
   revisión.* Confundirlas pone alarmas donde hacía falta un calendario.
2. **Lo derivado no caduca.** «Hoy hay N municipios con página» es cierto **por
   construcción**. Es «lo que se puede derivar no se escribe» haciendo su
   trabajo, visto desde el otro lado.
3. **Hay caducidades cuya fecha no se puede calcular.** `aniosOperacion: 8`
   caduca cuando la empresa cumpla nueve, en 2027, y **el día exacto no se puede
   saber con el dato que tenemos**: solo está registrado el AÑO de fundación.
   Para vigilarla primero hay que capturar un dato que no existe.

## E. La solución buena ya está escrita en el proyecto, una vez

`src/components/eventos/EventoPopup.tsx` —la ventana del evento de los 421
años— es la **única** afirmación con caducidad que **lleva su caducidad
consigo**: ventana declarada con offset de Colombia, y si la fecha pasó **el
componente no se monta**. Nadie tiene que acordarse de retirarla y no necesita
guarda.

> **La mejor guarda contra una afirmación que caduca es que la afirmación sepa
> cuándo caduca.** Es el primer nivel de la jerarquía —que no pueda ocurrir—
> aplicado al tiempo: en vez de vigilar que alguien actualice la frase, **la
> frase se retira sola**.

Y el segundo nivel, cuando la frase tiene que seguir ahí: el literal con guarda,
como `ANIO_FAQ`. Lo que no vale es el literal a secas, que es lo que son hoy el
0,27 % y los 421 años.

## El corolario que me tocó

El párrafo que caduca en junio de 2027 **lo escribí yo**, no estaba en ninguna
lista de correcciones. Y el párrafo incompleto de Anthropic —el que nombraba a
un destinatario y se detuvo— también.

> **Un párrafo que uno añade por iniciativa propia no viene revisado por
> nadie.** El titular pidió corregir tres frases falsas; la cuarta la escribí
> yo, y fue la incompleta. La quinta también la escribí yo, y fue la que caduca.
> Las correcciones pedidas pasan por dos pares de ojos; **las añadidas de oficio,
> por uno**, y es el del que ya demostró que se le escapan cosas.

# LA SEGUNDA FORMA DE ESCONDERSE DICIENDO LA VERDAD

2026-10-19. Hay ya **dos** maneras de que una afirmación verdadera deje intacta
una creencia equivocada, y conviene tenerlas juntas porque la segunda se
descubrió cayendo en ella el mismo día que se escribió la primera.

| | la frase | qué esconde |
|---|---|---|
| **1. La respuesta literal verdadera** | contesta exactamente lo que se preguntó | **lo que no se preguntó** |
| **2. La lista incompleta** | enumera destinatarios reales | **lo que no se enumeró** |

> **Nombrar a un destinatario y detenerse es peor que no nombrar a ninguno: una
> lista incompleta se lee como completa.**

Sin la lista, el lector sabe que no sabe. Con una lista de uno, **cree que sabe**
—y la creencia la produjo una frase cierta—.

## El caso, que es mío

Al corregir «entrenar nuestros modelos» en la §2 de la política, añadí por
iniciativa propia el párrafo que faltaba: que el contenido **se transmite a
Anthropic**, encargado del tratamiento. Era verdad, era necesario y nadie lo
había pedido.

Y me quedé ahí.

> **Nombré al proveedor que ve el texto y no me pregunté por dónde LLEGA el
> texto.** El canal de WhatsApp *es* la API de WhatsApp Business: todo mensaje
> de ese canal entra desde Meta y sale por Meta. **45 de las 116 conversaciones
> de producción** son de ese canal, así que Meta ve el texto completo y el
> número de teléfono de casi la mitad de la gente que ha hablado con Mac.

Lo encontró el titular preguntando «¿hay más de un proveedor en el camino?».
Igual que la cuarta ocurrencia de la escala de tarifas apareció porque preguntó
si la escala debería existir una sola vez: **las dos veces, la pregunta que
abrió el hallazgo no era sobre el defecto, era sobre la FORMA de lo que yo había
afirmado.**

## Por qué el instrumento no podía verlo

Ninguna guarda compara una lista publicada con la lista real de terceros que ven
un dato: **no existe la lista real en ninguna parte del código**. Se deduce
mirando a dónde sale cada `fetch`, y eso no es una afirmación que se pueda
verificar —es un inventario que hay que construir—. Por eso queda escrito en
`AUDITORIA-TEXTOS-PUBLICOS.md` el **inventario de dominios externos** con quién
pone cookies y quién solo recibe la IP: es el artefacto que la frase necesitaba
para ser contrastable.

## La regla práctica

> Cuando un texto nombre **a quién** le llega un dato, la pregunta obligatoria
> no es «¿es cierto?» sino **«¿están todos?»**. Y se responde siguiendo el dato
> por el camino entero —quién lo recibe, quién lo transporta, quién lo guarda,
> quién lo procesa—, no listando los que uno recuerda.

Y el corolario, porque esto se repetirá: **un párrafo que yo añado por
iniciativa propia no viene revisado por nadie.** El titular pidió corregir tres
frases falsas; la cuarta la escribí yo, y la incompleta fue justo esa.

# LA PURGA QUE HACÍA FALTA PARA QUE UNA FRASE FUERA CIERTA

2026-10-19. De las siete divergencias de los textos públicos, **una no se podía
cerrar escribiendo**: la política decía que el contenido de las consultas se
almacena «temporalmente» y `conversations`/`messages` **no tenían purga, ni
plazo, ni anonimización**. Se guardaban para siempre.

Dos salidas, y el criterio para elegir:

| salida | por qué no / por qué sí |
|---|---|
| cambiar el texto a «indefinidamente» | **cierto y peor.** Y habría que cambiarlo igual el día que se implementara |
| implementar la purga | **elegida** |

Tres razones, en orden de peso:

1. **La minimización no es una frase de la política: es la obligación de la Ley
   1581.** La finalidad declarada es «que un asesor pueda devolver el
   contacto»; pasado un año esa finalidad ya se cumplió o ya no se va a
   cumplir, y el contenido pierde la razón de estar.
2. **La maquinaria estaba escrita dos veces** —visitas a dos años, accesos del
   contador a doce meses— y el disparador diario ya existía. El coste marginal
   era una función.
3. Doce meses, **el mismo plazo que la bitácora de accesos**. Dos plazos
   distintos para dos datos de la misma familia son dos fechas que alguien tiene
   que recordar, y la política tendría que explicar por qué.

Anonimiza en vez de borrar, igual que los accesos: la fila del mensaje se queda
con su `role` y su `createdAt`, y se vacía el **contenido**. Sobrevive lo que
tiene valor —cuántos turnos, cuándo, si escaló a una persona, cuánto costó— y
desaparece el dato personal. La marca es la propia cadena vacía, que es también
el filtro que hace la pasada idempotente: ninguna columna nueva.

## ⚠ Y LA PURGA ROMPÍA A MAC PARA QUIEN YA HABÍA HABLADO CON ÉL

Esto no se vio al diseñarla, se vio al buscar quién lee esos mensajes:

> `runMac` arma el historial con **los últimos 30 mensajes de la conversación**,
> y un bloque de contenido vacío hace que la API de Anthropic **rechace la
> petición entera**. En WhatsApp la conversación se identifica por el **número
> de teléfono**: alguien que vuelve a escribir al año siguiente cae exactamente
> en ese caso.

Sin el filtro, la purga habría dejado a Mac mudo **precisamente para las
personas que ya habían hablado con él**, y el síntoma habría aparecido meses
después de desplegarla, sin relación aparente con la causa. Filtrado en los dos
sitios que leen contenido: el historial y el transcript del resumen del lead
—donde un transcript de líneas vacías daría un resumen **inventado**, que es
peor que no tenerlo—.

> **Una retención no es solo «qué se borra»: es «quién lee eso después».** La
> pregunta no es si el dato sobra, es qué código cuenta con que esté.

# UN RECORDATORIO QUE NO ENVEJECE SE VUELVE PAISAJE

2026-10-19. El cron de vigilancia avisa del aviso falso de `/registro-visita`
hasta que el titular lo cambie en el panel. Está bien que se queje —un pendiente
que se queja solo es lo que queremos— pero el mensaje decía **lo mismo cada
vez**:

```
⚠ VIGILANCIA DE CONTENIDO — 1 sin corregir hace +3 días
```

> A la tercera repetición idéntica el aviso deja de leerse: el lector ya sabe
> qué dice sin abrirlo. **Un recordatorio que no envejece se vuelve paisaje**, y
> entonces el instrumento sigue funcionando y la señal ya no llega —que es la
> misma familia que un arnés sin código de salida: funciona y no comunica—.

La edad es **lo único que cambia** entre un aviso y el siguiente, así que es lo
único que puede hacer que el texto no sea el mismo texto. Ahora el mensaje
nombra el más viejo, **desde cuándo** está y **cuántas noches** lleva, y a partir
de siete noches el título cambia. Sin columna nueva: `primero_visto` ya estaba.

# POR QUÉ SE APLAZA LA LECTURA COMPLETA, Y CÓMO SE APLAZA SIN PERDERLA

2026-10-19. Quedan **siete archivos** por leer, lista cerrada, y **no se leen
ahora**. El criterio:

> La lectura completa va **4 de 4**: cuatro veces de cuatro encontró lo que
> ningún instrumento podía, y el defecto resultó **peor** que el reporte previo.
> Por eso mismo **encontraría cosas para siempre**. Un método que nunca falla no
> se detiene solo, y **sin un final declarado no se construye nunca.**

Lo que hace que aplazarlo no sea olvidarlo es que **está medido y se imprime en
cada build**: `inventario-decisiones.mjs` enumera los siete por nombre, con su
exposición, y dice que están aplazados a propósito y desde cuándo. *Lo medido se
puede aplazar; lo invisible no.*

## La lista cerrada creció, y eso lleva firma

`JsonLd.tsx` **no estaba** en los seis: entró el 2026-10-16 por decisión del
titular, sobre una lista declarada cerrada. Queda escrito **quién la reabrió y
cuándo**, porque *una lista cerrada que crece sin firma deja de ser un final y
vuelve a ser una cola*. La razón es buena: son las afirmaciones **estructuradas**
—`areaServed`, `priceRange`, `openingHours`, `knowsAbout`, `offers`— que Google
y los modelos leen **literalmente, sin matiz**, y son de la mitad del sitio que
no tiene instrumentos: la que habla **sobre nosotros mismos**.

## ⚠ Y DOS CIFRAS QUE ESTABAN MAL, LAS DOS MÍAS

Al tocar este contador aparecieron dos errores propios, en direcciones opuestas:

1. **El instrumento decía 10 lecturas completas y eran 12.** `numeros.ts` y
   `custodia.ts` se leyeron el 15 de octubre —lo prueba el código que salió de
   ahi: la unidad escrita frente a la declarada, y la medición de la deriva del
   `float` con su trampa de `toFixed`— y **nunca se subieron a la lista**. El
   hallazgo se escribió en el traspaso y **la lectura se quedó en mi cabeza**.
   Es el quinto punto ciego otra vez, dentro del instrumento que lo nombró.
2. **Y yo escribí «los cuatro archivos vivos» en un informe.** Son **seis**, y
   siempre fueron seis: resté `numeros` y `custodia` de una lista en la que
   nunca estuvieron —son de la tanda anterior—, o sea que los resté dos veces.

> La cifra sale del array, no de la prosa del informe. **Un contador que alguien
> tiene que acordarse de subir no mide: recuerda.** Y se descubrió porque el
> titular contó por su cuenta y su número no cuadraba con el mío.

# CUATRO INSTRUMENTOS, CUATRO PUNTOS CIEGOS, LA MISMA FORMA

2026-10-15. En un día, cuatro instrumentos distintos dejaron pasar algo, y los
cuatro por la misma razón:

| instrumento | no veía | lo encontró |
|---|---|---|
| `inventario-decisiones` | **copias** de una decisión ya registrada | una pregunta del titular |
| el grep de la auditoría | lo que no se sospechaba | la lectura completa |
| `decisiones-repetidas` | la misma decisión escrita de **otra forma** | la lectura completa |
| el barrido de fechas | la **dirección** que no preguntó | una pregunta del titular |

> **La pregunta decide lo que se puede encontrar.** Un instrumento no tiene un
> punto ciego por descuido: lo tiene por la forma de lo que pregunta. Y esa
> forma es invisible desde dentro del instrumento, porque todo lo que devuelve
> cae dentro de ella.

El cuarto caso es el más limpio de los cuatro. El barrido de fechas buscó dónde
se **LEEN** componentes locales de un `Date` —`getFullYear`, `getMonth`,
`getDate`— y dio doce sitios. Nunca buscó dónde se **ESCRIBE** un instante en una
columna de día. Son dos preguntas y solo se corrió una.

Al correr la segunda aparecieron **cinco escrituras** más —dos en archivos que
ya se creían revisados— y, al añadir el detector al build, **siete lecturas
más** en `src/app/`, que el barrido original no había mirado porque solo recorrió
`src/lib/` y `src/components/`. De esas siete, **dos eran rutas del servidor que
decidían el año fiscal de un reporte y de los parámetros** —y yo las había visto
y descartado como cosméticas—.

**La regla operativa:** al escribir un detector, enunciar la pregunta en voz
alta y después buscar su contraria. Lectura y escritura. Lo que entra y lo que
sale. Lo que existe y lo que falta. Y declarar el ÁMBITO: «barrí `src/lib`» no
es «barrí el proyecto».

## La trampa de `toFixed(2)` contra `Decimal.toString()`

Nota aparte, porque **no es una trampa para el dinero sino para las
verificaciones**, y por eso es más peligrosa a largo plazo.

```
saldoEnCustodia   -> total.toFixed(2)        -> "51228.50"
resumenDeCustodia -> Decimal.toString()      -> "51228.5"
```

**El mismo número, dos cadenas distintas.** Cualquier comparación entre las
salidas de las dos funciones falla sin que nada esté mal.

Y pasó de verdad: al medir si la suma en coma flotante derívaba, la medición
comparó **texto** en vez de valor y dio «✗ SE SEPARAN» en 50, 100, 500, 1.000 y
5.000 filas. Todas falsas. Comparando valores con `Decimal`, ninguna se separa:
50.000 filas coinciden, y 2.000 movimientos de millones coinciden. **Estuve a
punto de reportar una pérdida de dinero que no existe.**

> **Una verificación sobre dinero no compara cadenas.** Y si una cadena viene de
> `toFixed` y la otra de `Decimal.toString()`, no son comparables ni con el ojo.

# LAS CUATRO CLASES DE FECHA

2026-10-15. Nada fijaba `TZ` en el repositorio: la máquina de desarrollo es
UTC−5 y Vercel es UTC. Doce sitios construían o comparaban un día a partir de
componentes locales de un `Date`, y cuatro de ellos decidían **qué norma aplica
o de qué año fiscal es un movimiento**.

> **Lo que una persona escribe es un DÍA. Lo que el sistema anota por su cuenta
> es un INSTANTE.**

## 1. DÍA PURO

Lo que teclea una persona: la fecha de un acto, de un gasto, de un ingreso, la
vigencia de una resolución, el periodo de un reporte. **Sin hora y sin zona.**
Columna `DATE`, cadena `AAAA-MM-DD`, comparada lexicográficamente. Nunca se
convierte.

## 2. INSTANTE

Lo que el sistema anota solo: `created_at`, el acceso al enlace del contador, la
subida de un archivo. UTC, comparado como instante.

## 3. EL PUENTE

Un instante convertido al día de Bogotá **en el momento de usarlo**: la fecha por
defecto de un acto, la del código de trazabilidad, el año del pie. Existe UNA
VEZ, con nombre, en `src/lib/dia-colombia.ts`.

## 4. LITERAL — la que apareció al mirar el décimo sitio

`faq-data.ts` calculaba el año con `new Date().getFullYear()` **al construir**.
No es ninguna de las tres: es una **constante de tiempo de build**, con la zona
de la máquina que compila. Cinco horas al año el build habría horneado el año
siguiente, y lo que queda horneado en una página estática lo indexa un buscador.

Se eligió literal, con una guarda que rompe el build cuando se queda atrás **o
cuando va adelantado**. Y la razón generaliza mucho más allá de las fechas:

> **Un valor por petición en una página que no se renderiza por petición es la
> misma mentira con más pasos.**

Vale para cualquier dato que parezca dinámico en una página estática: un precio,
un contador, un «actualizado hace», un «quedan 3 disponibles». Si la página se
hornea, el dato se hornea con ella, y calcularlo «en vivo» solo mueve la mentira
al sitio donde nadie la busca. O se hornea con una guarda que avise cuando
caduque, o la página deja de ser estática. No hay tercera.

## POR QUÉ `TZ=America/Bogota` NO ERA EL ARREGLO

La idea era poner la variable y terminar. Se midió antes de moverla, y **la
medición mató el arreglo**: las fechas iban en DOS DIRECCIONES OPUESTAS según de
dónde vinieran.

| de dónde viene la fecha | hoy, con TZ=UTC | con TZ=America/Bogota |
|---|---|---|
| escrita `'2026-12-31'` | 31 dic 2026 ✓ | **30 dic 2026** ✗ |
| escrita `'2027-01-01'` | año 2027 ✓ | **año 2026** ✗ |
| del reloj, 31 dic 20:00 Colombia | **1 ene 2027** ✗ | 31 dic 2026 ✓ |

Arreglaba el tercer caso y rompía los dos primeros, **retroactivamente sobre
fechas ya guardadas**. Una variable de entorno cambia los doce sitios a la vez,
en silencio, y quien lea el código después no sabe cuál de los doce quería qué.

**La causa raíz no era la zona: era que un día del calendario y un instante se
guardaban en la misma columna.**

## MIGRAR LA COLUMNA ERA NECESARIO Y NO SUFICIENTE

Prisma devuelve una columna `DATE` como un `Date` de JavaScript **a medianoche
UTC**. Medido:

```
DATE 2026-12-31  ->  2026-12-31T00:00:00.000Z
getDate() con TZ=America/Bogota  ->  30
```

Así que `.getFullYear()` o `.getDate()` sobre una columna ya migrada **siguen
moviéndose con la zona del proceso**. El patrón completo son DOS piezas:

1. columna `DATE`, y
2. lectura como cadena con `toISOString().slice(0, 10)`, comparada
   lexicográficamente.

Con una sola de las dos, el arreglo no está hecho.

## La lección ya estaba escrita en el archivo vecino — TERCER CASO

El patrón completo **ya existía en esta misma base de datos**, al lado del módulo
que no lo usaba:

| | tipo | qué es |
|---|---|---|
| `respaldos_normativos.vigencia_desde` | `DATE` | día puro ✓ |
| `respaldos_normativos.vigencia_hasta` | `DATE` | día puro ✓ |
| `respaldos_normativos.fecha_norma` | `DATE` | día puro ✓ |
| `respaldos_normativos.obtenido_en` | `DATE` | día puro ✓ |
| `respaldos_normativos.verificado_en` | `timestamp` | instante ✓ |
| `egresos.fecha` | `timestamp` | día puro ✗ |
| `ingresos.fecha_causacion` | `timestamp` | día puro ✗ |

Y `notariales/datos.ts` ya leía esas columnas con `toISOString().slice(0, 10)`.
El módulo notarial lo había hecho bien y el financiero no lo copió.

**Los tres casos de esta familia han sido en archivos vecinos**, no en
documentación olvidada ni en otro repositorio: la escala de tarifas, la frontera
del tramo y ahora las fechas. La conclusión operativa es incómoda y útil:
**antes de diseñar algo, mirar cómo lo resolvió el módulo de al lado** —no la
documentación, el código—. Es más rápido que diseñarlo, y además delata cuando
uno de los dos está mal.

## La coincidencia afortunada que creamos NOSOTROS

Y esta es la nota que más vale de todo el lote.

A las **12:03** se desplegó `1a4c5a9`: las nueve columnas migradas a `DATE`. A
las **14:43** se desplegó `5c4c3af`: los doce sitios reconectados. **Durante dos
horas y cuarenta minutos**, producción dio el resultado correcto por una sola
razón: **Vercel corre en UTC**, que es justo la zona donde `.getFullYear()`
sobre una columna `DATE` acierta.

El día anterior se había escrito, en este mismo archivo:

> Una divergencia protegida solo por el orden en que se llaman dos funciones
> está a un refactor de estar viva. Eso no es una guarda: es una coincidencia
> afortunada.

Y a las 12:03 se creó una, a propósito, con la frase a dos pantallas de
distancia. No se detectó revisándolo: **lo nombró el titular**.

> **La regla vale también cuando el que la incumple la acaba de escribir.** Y
> sobre todo entonces: haberla escrito da la sensación de haberla aplicado.

Lo operativo: **un lote que deja el sistema correcto por accidente no está
cerrado, está interrumpido.** Si hay que partirlo —y a veces hay que partirlo,
porque la migración tenía una ventana de 2 filas—, el mensaje del commit dice
qué queda y por qué el sistema acierta mientras tanto. El de `1a4c5a9` lo decía,
y aun así la coincidencia estuvo ahí dos horas y cuarenta minutos.

# LA LECTURA COMPLETA VA 3 DE 3

2026-10-15. Tres veces se ha leído un archivo o un grupo de archivos de
principio a fin, sin grep y sin buscar nada concreto. Las tres encontró lo que
ningún instrumento podía, y **las tres veces el defecto resultó PEOR que el
reporte previo**:

| lectura | qué encontró | el reporte previo decía |
|---|---|---|
| siete módulos del motor | 18 decisiones que el grep no podía ver | 49 de 67 inventariadas |
| la cadena vacía | es ausencia en el notarial y no lo es en el financiero | nada: ningún normalizador las agrupa |
| `mac_knowledge` | la vigencia perdía **casi dos días** | «vence cinco horas antes» |

Ese «peor que el reporte previo» es la parte que importa: no es que la lectura
encuentre **más** cosas, es que corrige la **magnitud** de las que ya se creían
entendidas. Un defecto estimado a la baja se aplaza con tranquilidad.

> **La lectura completa no es una medida excepcional para cuando un instrumento
> falla. Es el instrumento de mayor rendimiento que tenemos, y dieciséis
> archivos no la han recibido nunca.**

Por eso `scripts/inventario-decisiones.mjs` imprime, junto a la deuda de
mutaciones, **cuántos archivos han recibido lectura completa y cuántos no**. Lo
medido se puede aplazar; lo invisible no.

Y el orden en que se gasta, con el criterio ya fijado —exposición primero,
gravedad después—: los que están vivos y tocan dinero antes que los
instrumentos y las pantallas.

# LO QUE ESCONDE EL QUE RECIBE LA ORDEN

Las doce formas son del que **informa**. Las cuatro de la sección siguiente son
del **instrumento**. Esta es del que **recibe la orden**, y es la única de las
tres que se evita desobedeciendo.

## Cumplir una instrucción que uno sabe que produce el defecto recién nombrado

> **Una orden correcta cuando se dio puede dejar de serlo por lo que se
> descubrió entre que se dio y que se ejecuta. Cumplirla entonces no es
> obediencia: es esconderse detrás de ella.**

2026-10-15, el caso. El titular pidió declarar `allowScripts` con los cinco
paquetes que ejecutan scripts de instalación, en el mismo lote que la frontera.
Dos mensajes antes había escrito la regla contraria sobre `cache-dir`: *«lo que
no puede quedarse es una línea que aparenta configurar algo»*.

Al ir a hacerlo apareció que el npm de esta máquina (11.13.0) no tiene
`approve-scripts` ni `deny-scripts`, que el de Vercel sí, y que ni `engines` ni
`packageManager` fijan cuál corre. Las entradas van pinneadas por versión.
Escribir el campo a mano, de memoria, para que lo lea un npm que no se puede
ejecutar aquí, habría sido **exactamente** la línea prohibida —y encima dentro
del lote cuyo propósito era cerrar divergencias—.

No se hizo. Se reportó en dos frases, con el camino verificable: fijar primero
el gestor de paquetes, y después dejar que la herramienta genere el campo.

**La regla operativa**, y es difícil de aplicar porque se parece a una excusa:

1. Si una instrucción produce el defecto que la persona que la dio acaba de
   nombrar, lo que falla es la instrucción y no el criterio.
2. Se dice **en dos frases**, no en un ensayo, y **se entrega todo lo demás del
   lote completo**. Lo que no se hizo se nombra explicitamente: media entrega
   silenciosa es peor que la línea que no se escribió.
3. Lo que **no** vale como motivo: que sea trabajoso, que haya una forma más
   elegante, o que uno preferiría otro orden. Solo vale un defecto ya
   establecido en esta misma conversación.

El titular confirmó que la desobediencia era correcta y que la orden era suya.
Eso es lo que la convierte en regla y no en anécdota: **el que recibe la orden
es el último que puede ver el choque, porque es el único que tiene delante la
regla y la tarea a la vez.**

# LO QUE ESCONDE LA HERRAMIENTA — va por encima de las doce formas

Las doce formas de esconderse son del que **informa**: afirmaciones falsas
disfrazadas, o una verdad literal que deja en pie la creencia equivocada. Se
cazan leyendo lo que se dijo.

Estas cuatro son de la **herramienta**. No las comete nadie: las impone el
instrumento, y por eso ninguna cantidad de honestidad al informar las evita.
Van por encima porque limitan lo que se puede llegar a saber.

## 1. El modelo de datos decide qué se puede ver

> **Un inventario con una fila por decisión no puede reportar duplicación
> aunque uno quiera. No es un descuido: es una imposibilidad.**

2026-10-15. La escala de una tarifa estaba escrita en cuatro sitios y el
inventario encontró tres. No por falta de atención: cuando la decisión quedó
registrada desde `tramos.ts` y `retencion.ts`, **la segunda copia no tenía dónde
ir**. La fila era la decisión y el riesgo era la ocurrencia, y el formato no
admitía la pregunta «¿cuántas veces?».

Lo mismo volvió a pasar el mismo día con la frontera del tramo: dos copias, una
en la tarifa y otra en el desglose institucional, y las dos mutaciones vigilaban
solo la primera.

**La regla operativa:** antes de confiar en un informe, preguntar qué preguntas
su formato **no puede** responder. Si la respuesta a una de ellas importa, hace
falta otro instrumento, no más cuidado. De ahí salieron el contador de
ocurrencias de `inventario-decisiones.mjs` y `scripts/decisiones-repetidas.mjs`.

## 2. Un inventario guiado por grep solo contiene lo que ya se sospechaba

> **Una pasada de confirmación disfrazada de descubrimiento.**

Para inventariar las 48 decisiones no se leyeron los archivos de principio a
fin: se grepearon los conceptos esperados —`119`, `precio_incluye_iva`,
`OBLIGACIONES`, `ROUND_HALF_UP`— y se leyeron **esas regiones**. De
`notariales/calculo.ts` se leyeron las líneas 344-375 y 444-460, y nunca las
30-50, donde estaba el cuarto `multiplicador`.

Un grep solo encuentra lo que se sabe nombrar. Sirve para acotar la **población
candidata** —621 sitios— y nunca para la respuesta: hay que abrir las líneas.
Es la misma regla que ya estaba escrita para las capas de mapeo, una capa más
arriba.

## 3. Una herramienta que mide no puede heredar su configuración del entorno

> **Si el resultado depende de una variable que no pusimos nosotros, el
> resultado no es un hecho.**

2026-10-15. El guión que cuenta vulnerabilidades llamaba a `npm audit` sin
banderas. Aquí cuenta 19; en Vercel contó **8**, porque allí `NODE_ENV=production`
y npm omite las devDependencies del audit. El guión concluyó que once paquetes
declarados «ya no aparecen» y rompió el despliegue.

Es la misma forma que la huella sobre CRLF: **medir la superficie en vez del
contenido**. El arreglo es el mismo, bandera explícita siempre —`--omit=dev` y
`--include=dev`—, y de paso el informe pasó de un número a dos.

**Y el corolario, que apareció al intentar declarar `allowScripts`:** el npm de
esta máquina (11.13.0) y el de Vercel **no son el mismo**, y ni `engines` ni
`packageManager` lo fijan. Una configuración que solo el npm del otro lado puede
leer, escrita sin poder comprobarla, es la línea que aparenta configurar algo.
Primero se fija el gestor, después se declara.

## 4. Lo que decide no es si el código vulnerable se ejecuta, sino quién controla la entrada

> **El reparto «desarrollo o producción» es más cómodo y peor. Lo que decide es
> de quién viene lo que el código procesa.**

2026-10-15. La primera clasificación de las 19 vulnerabilidades decía
«dependencia de desarrollo» de seis paquetes que **sí** están en el árbol de
producción y **sí** corren sirviendo peticiones:

- `js-yaml` → `argparse` → `sprintf-js`, vía **`gray-matter`**, que parsea el
  frontmatter del blog, y esas rutas leen el MDX en runtime;
- `postcss` → `nanoid`, `source-map-js`, vía **`next`** y **`critters`** con
  `optimizeCss` activo.

Lo que los separa de la crítica no es que no corran: es que **procesan nuestro
repositorio y nuestra configuración, no lo que mande un visitante**. De ahí las
tres categorías de `scripts/inventario-vulnerabilidades.mjs` —VISITANTE,
ENTRADA_NUESTRA, SOLO_DESARROLLO— y de ahí que la tercera **se compruebe**
contra el audit en vez de afirmarse: la categoría que se afirmaba era justo la
que estaba mal.

Vale más allá de las dependencias: es el mismo criterio que decide si una
inyección importa, si un límite de tamaño hace falta, o si un parseo lento es un
problema.

## Cuarta superficie, y esta la causó el instrumento que medía las otras

2026-10-15, el mismo día. El guión recién escrito para contar vulnerabilidades
llamaba a `npm audit` **sin banderas**. Aquí cuenta 19; en Vercel contó **8**,
porque allí `NODE_ENV=production` y npm omite las devDependencies del audit. El
guión concluyó que once paquetes declarados «ya no aparecen» y rompió el
despliegue.

> **Es el mismo error que la huella del documento: medir la superficie en vez
> del contenido.** Un recuento que cambia según la máquina no cuenta nada.

El arreglo es el mismo también: **bandera explícita siempre**. `--omit=dev` para
el árbol de producción y `--include=dev` para el completo, con lo que las dos
cifras dan igual en cualquier máquina. Y de paso el informe gana: son **dos**
números y no uno, 8 y 19, y la diferencia es exactamente lo que no se despliega.

La lección de forma, que vale para el próximo instrumento: **una herramienta que
mide no puede heredar su configuración del entorno.** Si el resultado depende de
una variable que no pusimos nosotros, el resultado no es un hecho.

### Y la clasificación estaba mal en seis de diecinueve

El fallo rojo obligó a mirar quién arrastra cada paquete, y ahí se vio que
«dependencia de desarrollo» era **falso** para seis:

- `js-yaml` → `argparse` → `sprintf-js` vienen de **`gray-matter`**, que parsea
  el frontmatter del blog, y esas rutas leen el MDX **en runtime**.
- `postcss` → `nanoid`, `source-map-js` vienen de **`next`** y de **`critters`**,
  con `optimizeCss` activo.

Su código **sí corre sirviendo peticiones**. Lo que los separa de la crítica no
es que no corran:

> **Lo que decide no es si el código vulnerable se ejecuta, sino QUIÉN CONTROLA
> LA ENTRADA que procesa.**

De ahí las tres categorías de `scripts/inventario-vulnerabilidades.mjs`:
VISITANTE —alcanza la ruta y controla la entrada—, ENTRADA_NUESTRA —corre, pero
procesa lo que hay en nuestro repositorio o nuestra configuración— y
SOLO_DESARROLLO. Y la tercera **se comprueba**: tiene que estar ausente del audit
sin dev y presente en el audit con dev. Una categoría que se afirma es la que
estaba mal; una que se comprueba contra la herramienta no puede estarlo.

Provocado cruzando dos clasificaciones a mano: denuncia las dos, cada una por su
lado.

## El punto ciego de un inventario: la fila es la decisión, el riesgo es la ocurrencia

2026-10-15. El inventario de decisiones no vio el cuarto sitio de la escala de
tarifas. El titular preguntó **cómo** apareció, y la respuesta importa más que el
arreglo: apareció por un `grep` de `POR_MIL` que se corrió **después** de que
él preguntara si la escala debería existir una sola vez. Sin esa pregunta no se
habría visto.

El punto ciego tiene dos capas, y la segunda es estructural:

**1. De método: un inventario guiado por grep solo contiene lo que ya se
sospechaba.** No se leyeron los archivos de principio a fin: se grepearon los
conceptos esperados —`119`, `precio_incluye_iva`, `OBLIGACIONES`,
`ROUND_HALF_UP`— y se leyeron esas regiones. De `calculo.ts` se leyeron las
líneas 344-375 y 444-460, y nunca las 30-50, donde estaba. Era una pasada de
**confirmación** disfrazada de descubrimiento.

**2. Estructural, y es la que predice dónde habrá más:**

> **Un inventario con una fila por decisión no puede representar «esto está
> escrito en cuatro sitios». La fila es la decisión; el riesgo es la
> ocurrencia.**

Cuando la escala apareció en `tramos.ts` y en `retencion.ts`, la fila quedó
escrita y la búsqueda se detuvo: una segunda ocurrencia **no tenía dónde ir** en
ese modelo, así que nada obligaba a contarlas.

### Lo que encontró al medirlo, que es el punto

Se añadieron dos instrumentos en vez de una promesa: un contador de ocurrencias
dentro del inventario, y `scripts/decisiones-repetidas.mjs`, que normaliza cada
línea —identificadores a un hueco, operadores y literales en pie— y agrupa
formas de decisión repetidas entre archivos. En la primera pasada:

- **Una grave:** `calculo.ts` tiene una SEGUNDA implementación de la frontera
  del tramo y de la conversión UVT, dentro de `desgloseDe`, para repartir el
  recaudo entre la SNR y el Fondo. Las dos mutaciones de la frontera vigilan la
  copia de `tramos.ts` y **no** esa. Y **las dos copias no se comportan igual**:
  con una tabla en UVT y el año sin UVT cargado, `tramos.ts/limite()` LANZA y la
  copia multiplica por 1, tratando los límites en UVT como pesos, en silencio.
  No es solo duplicación: es una divergencia que falla hacia el lado cómodo.
- **Una real y hoy inocua:** `sort((a, b) => a.orden - b.orden)` en cinco sitios
  de cuatro archivos. Una sola tiene mutación.
- **Un defecto del propio inventario:** el ancla de una fila era
  `throw new SinReglaAplicable(`, que aparece **tres veces** en su archivo. Un
  ancla que coincide en tres sitios no ancla nada. Lo delató el contador de
  ocurrencias el día que se añadió.

El resto de los 33 grupos son coincidencias de forma —comprobaciones de `null`
sueltas, idioms de mapeo—. **Por eso el barrido imprime y no rompe el build:**
repetir una forma no siempre es repetir una decisión, y decidirlo pide leerlas.

### La regla reutilizable

Al inventariar, **las decisiones repetidas van antes que las únicas**, aunque
parezcan menos graves: una decisión en N sitios necesita N mutaciones, se queda
sin cobertura en cuanto alguien añade el N+1, y es **la que el inventario cuenta
mal**. Y el grep da la población candidata, nunca la respuesta.

## Un build verde también es una superficie sin inspeccionar

2026-10-15. El log de Vercel imprimía «19 vulnerabilities (4 moderate, 14 high,
1 critical)» y «npm warn Unknown env config "cache-dir"» en **cada** build desde
hacía meses. Nadie lo había leído, porque el log solo se abre cuando sale rojo.

> **Un build verde dice lo mismo que uno rojo sobre todo lo que no hizo fallar
> el build. Que nadie lo lea no lo convierte en silencio.**

Es la misma familia que el resto de la semana: el arnés en memoria contra la
base, el build local contra el de Vercel, la mutación que no mutaba. Una
superficie que produce información que nadie mira.

Y el número agregado no servía para decidir, por lo mismo que no servía el
indicador agregado del módulo financiero: metía en la misma cuenta una
dependencia de `eslint` y el marco que sirve cada petición. Ahora
`scripts/inventario-vulnerabilidades.mjs` imprime **dos** cifras —alcanzables
por un visitante e internas—, clasifica cada paquete con su por qué, y **rompe
el build si aparece una sin clasificar**.

## Una deuda se prioriza por EXPOSICIÓN ACTUAL, no por gravedad

2026-10-15. Con el inventario de decisiones en la mano, el primer orden que
propuse fue por gravedad del fallo: las escalas por mil primero, porque un error
de diez veces da una cifra plausible. El titular lo corrigió, y la corrección es
la regla:

> **La prioridad de una deuda se decide por quién está expuesto hoy, y la
> gravedad desempata.**

El módulo notarial no le entrega una cifra a nadie —cero de 53 cargadas, sin
página pública—. El financiero sí: se captura cada semana, y el dígito de
verificación del NIT sale impreso en cada documento que sale de aquí. La misma
gravedad en los dos módulos no es la misma urgencia.

### El corolario, que es lo que compró el inventario

> **Una deuda medida e impresa en cada build se puede aplazar. Una invisible,
> no.**

Por eso las dos cifras del inventario salen en el log de cada despliegue y los
extremos sin prueba se nombran uno a uno. Aplazar 36 decisiones sin vigilar es
una decisión; no saber que son 36 es un accidente esperando.

### El primer lote, y lo que se encontró al abrirlo

Seis decisiones, elegidas por exposición: el por mil del ICA, el dígito del NIT
y la base mínima en UVT estaban expuestas hoy; el por mil de los tramos, el de
la retención y el orden de las reglas iban a estarlo. Lo que las une es que
**todas producen una cifra plausible**: un diez veces en un por mil no se ve, y
una exención que nunca se aplica tampoco.

Al abrirlo apareció lo que el inventario no había visto: **la escala estaba en
CUATRO sitios, no en tres.** El cuarto, `notariales/calculo.ts`, se me pasó. Y
ese es el modo de fallo propio de una decisión repetida: cada copia es una
ocasión más de no verla, y la que falta nunca es la que uno busca.

Así que la respuesta a «¿debería existir una sola vez?» fue sí, y el lote de
seis se cubrió con **cinco** mutaciones: tres de las seis eran la misma
decisión. Lo que NO se unificó, y es deliberado: los mensajes de error —cada
sitio sabe si habla de un tramo, de una regla o de un concepto— y la
aritmética, porque el motor notarial trabaja en `number` y el financiero en
`Prisma.Decimal`. Se comparte la ESCALA, no la cuenta. Ver `src/lib/escala-tarifa.ts`.

## El filtro para inventariar decisiones

> **Lo que al invertirse revienta no puede llegar a un cliente.**

Ese filtro es lo que convirtió 621 sitios candidatos en 48 decisiones reales.
Entra una decisión en el inventario si al invertirla **el motor sigue
funcionando y entrega otra cifra**. No entran:

- las que al invertirse no compilan o revientan —un `switch` sin caso, un tipo
  incompatible—, porque un fallo ruidoso no llega a nadie;
- las comparaciones de etiquetas (`=== 'PESOS'`) **salvo** cuando el otro valor
  también es legal y produce una cifra distinta.

Y el corolario de método: el grep da la **población candidata** y nunca la
respuesta. 621 líneas con un operador de comparación no distinguen una frontera
de tarifa de un `=== 'PESOS'`; hay que abrirlas. Es la misma regla que ya estaba
escrita para los mapeos.

### Y dónde mirar primero dentro del inventario

Las decisiones **repetidas** antes que las únicas, aunque parezcan menos graves:
una decisión en cuatro sitios necesita cuatro mutaciones, se queda sin cobertura
en cuanto alguien añade un quinto sitio, y es la que el inventario cuenta mal.
Unificarla primero hace que todo lo demás cueste menos.

## La simetría que nos faltó: evidencia para los datos, ninguna para el instrumento

2026-10-14. Al módulo notarial le exigimos evidencia **reproducible** en cada
capa, y con dureza:

- ninguna cifra entra sin su respaldo —norma, artículo, URL oficial, fecha de
  verificación y quién verificó—;
- la transcripción lleva una huella SHA-256 y el build se rompe si el módulo
  derivado se queda viejo;
- las resoluciones se archivan con su hash para poder volver al documento;
- el cotejo exige **dos lecturas independientes** de la misma cifra, porque una
  sola lectura puede estar mal y nadie lo vería.

Y al instrumento que valida todo eso nunca le exigimos nada.

> **Un instrumento cuyo resultado no se puede volver a producir mañana no es un
> instrumento: es un recuerdo.**

La mutación era un **rito**. Se hacía, producía un informe en la consola, el
informe se citaba en un mensaje de commit y se borraba la edición. No quedaba
nada que otro pudiera volver a correr: ni el archivo tocado, ni el texto
cambiado, ni el comando. Exactamente lo que no le toleramos a una cifra.

Y el precio, medido el mismo día que se arregló:

- De 8 mutaciones recuperadas —las que por casualidad quedaron anotadas en
  prosa— **2 no mutaban nada**. El `replace` no encontraba su texto y el
  resultado se leía como verificación en verde.
- Una tercera **destapó un hueco real de meses**: la frontera INFERIOR del tramo
  no tenía prueba. `base >= desde` sobrevivía al arnés entero porque en los
  bordes interiores gana el primer tramo que coincide; solo se nota en
  `base = 0`.
- Cuántas se corrieron en los meses anteriores sin anotarlas es
  **indeterminable**. Ese es el verdadero coste y no se puede recuperar.

Lo que queda en su lugar: `scripts/mutar.mjs` (las mutaciones declaradas, con la
regla de que una mutación que no muta es `ERROR_DE_LA_PRUEBA`) y
`scripts/inventario-decisiones.mjs`, que deriva del código la población de
decisiones cuya inversión cambia una cifra que ve un cliente y la compara con las
mutaciones que existen. Las dos cifras del primer barrido: **46 decisiones
inventariadas, 4 vigiladas por una mutación.** La deuda nunca se había medido.

Cada fila del inventario lleva un **ancla**: un trozo literal de la línea que
decide. Si alguien reescribe esa línea, el guión falla, porque un inventario que
sobrevive a su código engaña igual que una nota vieja.

### Y el corolario sobre dónde mirar

`base = 0` no fue casualidad. **Las pruebas miran el medio interesante y no el
extremo degenerado**, porque el medio es donde está la cuenta que uno quiere
comprobar a mano. El barrido de extremos —cero, lista vacía, un solo tramo, el
tramo superior abierto, el importe exactamente igual al límite— vale más que
diez mutaciones nuevas, y la sección `EXTREMOS` del inventario lleva la cuenta:
**7 de 13 tenían prueba** la primera vez que se miró.

## Una mutación no cuenta hasta que se demuestra que mutó

2026-10-14, **cuatro veces el mismo día**:

- el contador de mutantes contaba solo las ✗ y no los cuelgues;
- un patrón con separadores de miles (`| 100.000.000`) no existía en un bloque
  que escribe las cifras sin separadores, así que el `replace` no tocó nada;
- dos casos abrían el archivo en escritura antes de leerlo y lo truncaban, de
  modo que la guarda se quejaba de otra cosa.

> **Una mutación que no ocurre se lee como «la verificación pasó», que es
> indistinguible de «todo está bien».** El modo de fallo apunta siempre a la
> dirección cómoda.

Arreglarlo en cada script no servía. Es propiedad del instrumento,
`scripts/mutar.mjs`:

1. Si el texto buscado no está, el resultado **no** es «sobrevivió» ni «pasó»:
   es `ERROR_DE_LA_PRUEBA`, y la suite falla.
2. La restauración se comprueba **byte a byte**, de todos los archivos que la
   mutación tocó.
3. Las tres salidas no se agregan: `DETECTADA`, `SOBREVIVIO` y
   `ERROR_DE_LA_PRUEBA`. La última no dice nada del código —dice que el
   instrumento está roto—.

**Y el precio de no haberlo tenido antes:** de las mutaciones que dimos por
buenas durante meses no se puede saber cuántas mutaban de verdad, porque eran
ediciones de consola que no quedaron escritas. En la primera pasada bajo las
reglas nuevas, de 8 mutaciones declaradas: 4 detectadas, **2 sobrevivieron y 2
no mutaban**. Una de las que sobrevivían descubrió un hueco real —la frontera
INFERIOR del tramo no tenía prueba: `base >= desde` solo se nota en `base = 0`,
porque en los bordes interiores gana el primer tramo que coincide—.

## Duodécima forma de esconderse: la respuesta literal verdadera

2026-10-14. El titular preguntó: «¿alguno de los valores que quedan sembrados en
la base sale de ese archivo?» —el documento de la transcripción—. La respuesta
era **no**, y era verdad: `sembrarAnio(db, anio, por)` recibe tres parámetros,
siembra desde `CONCEPTOS_V1` de `catalogo.ts`, y la transcripción solo se usa
para ordenar la pantalla y cotejar.

Pero la condición que la pregunta protegeía **sí se cumplía por otro camino**:
las cifras de `catalogo.ts` las había escrito yo a partir de esa misma
transcripción. No venían del archivo en ejecución; compartían origen con él. El
cotejo iba a decir «coincide» 29 veces comparándose consigo mismo.

> **Una respuesta literal verdadera es la mejor forma de esconderse que existe,
> porque no hay nada que reprocharle.**

Si me hubiera quedado en el «no» —con el código citado, que era lo que se pedía—
el titular se habría ido tranquilo y las 29 cifras seguirían ahí, marcando medio
camino andado en el avance y 29 coincidencias en el cotejo.

Las otras once formas de la lista son afirmaciones falsas disfrazadas. Esta es
una afirmación **verdadera** que deja intacta la creencia equivocada. No se caza
revisando si lo dicho es cierto: se caza preguntando **qué iba a hacer el otro
con la respuesta**. La pregunta no era sobre el flujo de datos de una función:
era «¿puedo confiar en lo que me diga el cotejo de esas cifras?».

**La regla operativa:** cuando una pregunta tiene una respuesta literal que
tranquiliza, hay que decir también si la preocupación de fondo se cumple por
algún otro camino. Contestar la pregunta y dejar en pie el error es cumplir con
la letra y fallar en el encargo.

## Lo que no existe no necesita guarda

2026-10-14, el mismo día. Una ruta leía un `.md` del repositorio en runtime y
eso dio un ENOENT en producción. El arreglo inmediato fue hacer que el archivo
viajara con la función (`outputFileTracingIncludes`) y poner una guarda que lo
vigilara en el build (`verificar-trazas.mjs`). Funcionaba.

El arreglo bueno fue otro: **quitar la lectura**. El bloque se convierte en
módulo en tiempo de generación, y en runtime no se toca el disco. Con eso la
fila correspondiente salió de `verificar-trazas.mjs`, porque ya no hay nada que
vigilar.

> **Eliminar el peligro gana a verificarlo.** Una guarda es lo segundo mejor:
> admite que el peligro sigue ahí y confiía en que alguien mantenga la guarda.

La jerarquía, de mejor a peor:

1. **Que no pueda ocurrir.** No hay lectura, no hay ENOENT. No hay cifra
   sembrada, no hay coincidencia falsa.
2. **Que rompa el build si ocurre.** Las guardas de `scripts/verificar-*`.
3. **Que avise en ejecución.** Un mensaje clasificado.
4. **Que esté documentado.** Lo último, y ya sabemos lo que vale solo.

Vale para más cosas que un archivo: las 29 cifras sembradas se **borraron** en
vez de marcarlas como «sembradas» en la pantalla, que era el plan anterior. Una
cifra que no está no puede aparentar estar verificada, y eso no necesita ni
etiqueta ni explicación en la interfaz.

## La guarda va ANTES del arreglo

Hasta este lote el orden era: corregir el defecto y después añadir la guarda
que impide que vuelva. El orden bueno es el inverso:

1. **Instalar la defensa** con el defecto todavía en el código.
2. **Provocar el fallo**: compilar o ejecutar y exigir que rompa.
3. **Leer el diagnóstico** que da la herramienta.
4. Solo entonces **corregir**, y comprobar que vuelve a verde.

Sale mejor diagnóstico (la herramienta dice más que la búsqueda a mano) y la
defensa queda puesta y probada contra un caso REAL, no contra uno inventado.
Si el paso 2 no rompe, la guarda no sirve, y eso se descubre antes de confiar en ella.

| Caso | Guarda | Lo que dijo al provocarla |
|---|---|---|
| Prisma en el bundle de `/admin/cifras` | `import 'server-only'` en `src/lib/prisma.ts` | La cadena exacta: `admin/cifras/page.tsx → lib/cifras-publicas.ts → lib/prisma.ts`. Arreglo: la parte pura a `cifras-publicas-base.ts` |
| `*.sql` de migraciones fuera de git | `scripts/verificar-migraciones-sql.mjs` al inicio de `npm run build` | Con un `INSERT` de prueba, `EXIT=1` y el archivo nombrado. Un «UPDATE» dentro de un comentario NO la dispara. Solo después se abrió la excepción en `.gitignore` |
| NIT con dígito de verificación errado | `exigirNitValido(EMPRESA)` en `next.config.ts` | **Primer intento FALLIDO**: el `throw` al cargar `lib/finanzas/empresa.ts` dio `EXIT=0`, porque el layout de admin no renderiza a sus hijos en el prerender (espera la sesión). Movida a `next.config.ts`: `EXIT=1`, «NIT 800197268-5 rechazado: el dígito de verificación DIAN es 4» |

### ⚠ El caso del NIT: la guarda estaba MUERTA

La guarda del NIT se escribió, se comentó como «rompe `next build`», pasó
typecheck y 105 pruebas, y **no rompía nada**. Se descubrió solo porque se
provocó el fallo en el build real: NIT de prueba 800197268 con DV 5 (el correcto
es 4) → **`EXIT=0`, build verde**. El `throw` vivía en un módulo que solo
importan páginas de admin, y el layout de admin no renderiza a sus hijos en el
prerender (espera la sesión): el código nunca se ejecutaba.

Sin el paso 2 habría quedado **escrita, commiteada y documentada como
funcionando**. Un NIT con dígito errado habría llegado a los encabezados de las
declaraciones con todas las luces en verde. Movida a `next.config.ts`, que corre
al arrancar todo `next build`: `EXIT=1` con «NIT 800197268-5 rechazado: el
dígito de verificación DIAN es 4».

**Es el tercer caso del mismo tipo en el proyecto:**

| Guarda | Qué decía que hacía | Qué hacía | Cómo apareció |
|---|---|---|---|
| `build:verificado` (324ba68) | Comparar cada build con el anterior | Guardaba el historial en `.next`, que el propio build borra: **nunca comparó nada** | Al mirar si la comparación ocurría de verdad (corregido en 4a664d5: historial fuera de `.next`) |
| El detector de valor futuro | Cazar las promesas de valorización | Un cero sobre datos limpios no probaba nada: nunca se le había visto cazar una | Dándole las frases reales ya retiradas (DEBE marcarlas) y textos legítimos (NO debe marcarlos). Lo que se aprendió: a un detector se le prueba con casos que tiene que cazar, no con un corpus limpio |
| `exigirNitValido` | Romper el build con un NIT malo | Nada: nunca se ejecutaba en el build | Provocando el fallo con un NIT de DV errado |

> **Regla: una guarda no probada rompiéndola no es una guarda, es un
> comentario con más pasos.**

Es otro instrumento que engaña (sección anterior), y el más peligroso: aquí no
mentía la salida de un comando, mentía nuestra propia documentación, que
afirmaba un efecto que nadie había visto.

### Un supuesto declarado tiene que decir HACIA DÓNDE desvía

2026-10-13. La calculadora sencilla no pregunta cuántas copias auténticas se
expiden, así que asume una y lo dice: «Se asumió 1 copia auténtica». Correcto
y **incompleto**: quien lo lee no sabe si el número real será mayor o menor.
Y aquí siempre es mayor —si se expiden más copias, sube—.

    Se asumió 1 copia auténtica. Si la notaría expide más, el costo sube.

**La regla, y aplica a todo supuesto, no solo a este: la dirección del sesgo es
parte del supuesto.** Un aviso que dice que un supuesto existe informa de que
hay incertidumbre; uno que dice hacia dónde desvía permite decidir con ella.

Es el mismo criterio que ya gobierna el aviso de muestra pequeña en
`DatosVerificables`, que no dice «la muestra es corta» sino **qué no se puede
concluir de ella**. Y el mismo que el criterio de colores: lo útil no es
señalar que algo está pendiente, es decir de quién es la pelota.

Puesto en el esquema como `sesgo_en_sencilla`, obligatorio en todo concepto
marcado como estimación: una guarda lo exige, así que no se puede añadir una
estimación nueva sin declarar su dirección. Cuando de verdad va en los dos
sentidos, se dice —«el valor de la hoja cambia de una notaría a otra, así que
puede subir o bajar»—, que también es información.

### El entorno de prueba que costó más que el cambio

2026-10-02. Para validar un cambio en las subidas a Cloudinary —firma de
servidor en lugar de un preset sin firma— se montó un entorno de Preview
completo: rama propia, despliegue aparte, URL de Preview, y el nombre de la
rama acortado porque pasaba del límite de 63 caracteres del dominio. Luego el
login de Preview falló («Error interno»), que era `DATABASE_URL` y `JWT_SECRET`
sin ámbito Preview en Vercel. Para seguir había que configurar variables y
redesplegar.

Coste de la vía de prueba: varias horas y aún sin probar nada.

El titular cortó: fusionar a producción con la reversa preparada. Coste real:
**un push, un deploy y la prueba hecha en minutos**, con el comando de reversa
escrito antes de empezar y autorización para ejecutarlo sin consultar. No hubo
que revertir.

> **Regla: lo que decide no es si el cambio es pequeño, es si el daño es
> REVERSIBLE.**
>
> Un cambio de CÓDIGO con la reversa lista se prueba en producción: el peor caso
> es un rato con el sitio raro y un `git revert`. Un cambio que deja daño
> IRREVERSIBLE no, por pequeño que sea: un script que borra filas, un correo o
> un WhatsApp a clientes, un pago, un archivo borrado en Cloudinary, una
> migración que tira una columna. Ahí el entorno de prueba —o una copia de los
> datos— no es ceremonia: es lo único que separa el error del desastre.
>
> El tamaño engaña en las dos direcciones. Un `DELETE` de una línea es pequeño e
> irreversible; una reescritura de doscientas líneas de una pantalla es grande y
> se revierte con un comando.

Lo que hace que probar en producción no sea imprudencia, y que conviene exigir
junto:
1. **La reversa escrita y probada mentalmente ANTES de desplegar**, no buscada
   cuando ya falló (`git revert -m 1 --no-edit <merge>` para una fusión).
2. **Autorización previa para revertir sin preguntar.** Volver atrás rápido
   vale más que dejarlo roto mientras se consulta.
3. **Que el daño sea reversible**: aquí, el camino de subida; si falla, se
   revierte el código y no quedó rastro. Si el cambio borra datos, envía
   mensajes o altera el esquema, la reversa de código NO deshace el daño y el
   cálculo cambia por completo.
4. **Verificación inmediata de lo que sí se puede ver sin sesión** (el endpoint
   de firma en 401, el sitio en pie, cero referencias al preset) y la prueba
   real del titular acto seguido.

El entorno de prueba se justifica cuando lo que puede romperse no se puede
revertir: datos borrados, correos enviados, pagos. Para un cambio de código en
un solo camino, era desproporcionado.

### Criterio de color del módulo financiero: de quién es la pelota

2026-10-04. Nació de una pregunta del titular sobre el CIIU —«¿la pantalla
distingue un pendiente esperado de una falla?»— y vale para todo el módulo.

**La regla tiene tres colores y un reloj.**

| Color | Significa | Ejemplos |
|---|---|---|
| **Rojo** | Algo no cuadra y hay que mirarlo | el cliente retuvo distinto del sugerido; el recibo no subió; una espera de más de 60 días |
| **Ámbar** | Falta algo NUESTRO | sin factura, sin proveedor, sin revisar un parámetro copiado, cambios sin guardar |
| **Gris** | Esperamos a un TERCERO | CIIU pendiente del contador, año fiscal sin activar, ingreso causado sin cobrar, adelanto reciente por cobrar |

**El porqué: un color de alarma sobre algo que no pide acción se vuelve ruido.**
El CIIU lo llevan hoy los cinco tipos de servicio y el año fiscal no está
activo: en ámbar, cada captura habría salido con dos alarmas permanentes que no
se pueden atender, y la próxima alarma real —una retención que no cuadra— se
leería igual que el ruido de siempre.

#### El escalamiento es parte de la regla: GRIS NO ES PERMANENTE

Una espera ajena **se vuelve asunto propio cuando se alarga**, y el color tiene
que reflejarlo. No es una nota al pie del criterio: es el criterio.

    0–30 días   gris    esperar es razonable, no hay nada que hacer
    31–60 días  ámbar   ya hay que insistir: la espera es nuestra
    +60 días    rojo    dejó de ser espera y es un problema

· **Cuenta por cobrar:** nace gris; a los 31 días hay que llamar al cliente; a
  los 60, cobrar o asumirlo como gasto de operación. El hub usa el adelanto más
  viejo, con el mismo criterio que la pantalla de por cobrar.
· **CIIU pendiente del contador:** nace gris, porque es razonable esperar unos
  días. Pasado un mes desde que se causó el ingreso, insistirle al contador es
  nuestra tarea y la etiqueta pasa a ámbar («hace más de un mes»); a los dos
  meses, a rojo.

**Y escala SOLO.** `colorDeEspera(fecha)` en `lib/finanzas/captura.ts` deriva el
color del tiempo transcurrido, con los mismos tramos que la antigüedad de
cartera. Si dependiera de que alguien se acuerde de revisarlo, el gris sería
permanente de hecho — y un pendiente eterno pintado de «tranquilo» es la misma
clase de silencio que el recibo que no subía.

#### Pregunta obligatoria al crear un contador nuevo

**¿Esta cifra suma causas que piden acciones distintas? Si sí, se desglosa
ANTES de publicarla, no después.**

Lo que obliga a escribirlo: el indicador agregado **volvió a aparecer en código
nuevo**, dos semanas después de que la regla quedara escrita en este mismo
traspaso. La tarjeta de ingresos del hub contaba «N ingresos sin factura, sin
recaudo o sin CIIU» — tres esperas con tres dueños distintos (nosotros, el
cliente, el contador) en una sola cifra ámbar. Es exactamente el defecto de
«1 gasto sin proveedor, factura o recibo», cometido otra vez por quien acababa
de documentarlo.

**No basta con tener la regla escrita: hay que aplicarla al construir.** Una
regla en el traspaso que no se consulta al escribir el contador siguiente es
documentación, no defensa — lo mismo que ya pasó con las guardas. De ahí la
pregunta, formulada para hacerse en el momento de teclear la consulta, no en la
revisión.

**PRIMERA VEZ QUE PREVINO EN VEZ DE CORREGIR** (2026-10-04, pantalla de
custodia). El contador evidente era «saldo en custodia: $X». La pregunta se
hizo ANTES de escribir la consulta y la respuesta fue sí: ese total suma arras
del vendedor —que se ENTREGAN— con anticipos propios —que se CAUSAN como
ingreso—, dos acciones opuestas. Un solo número podría esconder tres millones
de ingreso nuestro sin declarar detrás de veinte de plata ajena. Nació
desglosado por naturaleza, con el total solo como suma secundaria etiquetada
«en la cuenta, sin ser utilidad».

Las dos veces anteriores la regla sirvió para explicar un defecto ya
publicado; esta lo atajó en el teclado. La diferencia práctica: no hubo
diagnóstico equivocado, ni corrección, ni despliegue de arreglo.

**Auditoría del módulo** al fijar la regla — cinco sitios estaban en ámbar
esperando a un tercero:

1. El aviso de «parámetros del año sin activar» en cada captura de ingreso.
2. El CIIU dentro de la lista ámbar de «falta completar» de la confirmación.
3. La nota del sugerido: ahora distingue «no hay año activo» (gris) de «el
   cliente retuvo distinto» (ámbar).
4. El estado CAUSADO del listado de ingresos: que el cliente no haya pagado
   todavía no es un descuido nuestro.
5. La tarjeta «por cobrar» del hub, en ámbar sin mirar la antigüedad.

Y lo que se dejó en ámbar a propósito: los datos pendientes de la empresa (NIT
y razón social los consigue el titular, es su pelota) y la etiqueta «Por
cobrar» de la lista de gastos, que **no es un pendiente sino una
clasificación** —dice que ese egreso no es gasto— y por eso conserva el color
que la hace notar.

### 25 comandos en Redis: un dato de uso, no un fallo

2026-10-02. Upstash avisó de que iba a archivar la base `sufincaraiz-mac` por
inactividad. La base funciona: 25 comandos y 70 B almacenados, de un plan de
500.000 comandos al mes.

Lo que ese número dice del negocio, no del código: **los únicos tres caminos
que tocan Redis son de visitante** —el chat de Mac (`mac:ip`, `mac:sess`), el
PIN del enlace del propietario (`visitpin`) y el registro de visitas a
inmuebles (`visita:ip`)—. 25 comandos en semanas significa que esos tres
**apenas se usan**. Siete de esos comandos fueron de una prueba hecha ese
mismo día desde aquí.

No es un problema técnico y no hay nada que arreglar en ellos, pero es
información real sobre el uso del sitio: el chat, el enlace del dueño y el
registro de visitas no están moviendo tráfico. Si en algún momento se decide
invertir en uno de los tres, conviene saber de qué base se parte.

Lo que sí se construyó a partir del aviso:

| Qué | Dónde |
|---|---|
| Latido diario a Redis para que no se archive (clave `vigilancia:ultimo`, caduca a los 7 días) | `/api/cron/vigilancia`, al terminar |
| Aviso por WhatsApp la primera vez al día que un limitador cae al respaldo en memoria | `lib/redis-salud.ts`, llamado por los tres limitadores |

El candado del aviso vive en **Postgres**, no en Redis. Tampoco puede vivir en
memoria del proceso: en Vercel cada lambda tendría su propio «ya avisé» y el
titular recibiría un mensaje por instancia. Probado con diez llamadas
simultáneas: avisa una. Probar la CONCURRENCIA y no solo la secuencia es parte
de la prueba: un candado que funciona llamándolo dos veces seguidas puede
fallar con dos lambdas a la vez, que es el caso real.

> **Regla: un mecanismo que avisa de la caída de un sistema no puede guardar su
> estado en ese sistema.**
>
> El «ya avisé» de una alarma sobre Redis no va en Redis; el registro de un
> fallo de la base no va en la base; una alerta de que el disco está lleno no se
> escribe en ese disco. Si el sistema vigilado cae, se lleva consigo la memoria
> de que había que avisar, y la alarma queda muda justo cuando hacía falta — el
> mismo patrón que la guarda muerta y el silencio del recibo: nada falla a la
> vista.
>
> Al diseñar una alarma, la pregunta es: *si lo que vigilo deja de funcionar,
> ¿sigue existiendo lo que necesito para avisar?* En este proyecto el estado de
> esas alarmas va a Postgres, que es independiente de Redis, de Cloudinary y de
> la API de WhatsApp. Si algún día la alarma vigila Postgres, su estado tendrá
> que salir de Postgres.

### La prueba que no probaba: la llave «rota» que no rompía nada

2026-09-22, verificando los recibos privados. Para comprobar que una subida
fallida avisa en vez de callar, la prueba cambiaba la llave en memoria:

    process.env.CLOUDINARY_API_SECRET = 'llave-rota-a-proposito'
    await subirRecibo(...)   // debía fallar

**Y la subida funcionó.** `lib/finanzas/recibos.ts` lee la llave en una
constante de módulo, al cargarse, así que mutar `process.env` después no
cambia nada. La prueba no probaba lo que decía su nombre, y encima **subió a
Cloudinary un archivo llamado NO-DEBE-SUBIR.png**, que hubo que borrar.

Solo se supo mirando el efecto: el listado final de la carpeta privada tenía
dos archivos donde debía haber uno. Si la prueba se hubiera dado por buena por
su nombre —«la subida falla con la llave rota»— habríamos declarado verificado
justo lo contrario de lo que pasaba.

La forma correcta fue un **proceso aparte** con la llave mala desde el
arranque, sin tocar el `.env.local` del titular: ahí sí falla, con
«Invalid Signature» como motivo.

Es la misma clase que la guarda del NIT muerta: una afirmación sobre el
comportamiento que nadie había visto ocurrir. La regla de la sección anterior
—verificar el efecto, no la salida— vale igual para las pruebas: **el nombre
de una prueba no es prueba de nada; lo es el efecto que deja.**

### La URL no era el requisito: era un sustituto de la procedencia

2026-10-13. La guarda de respaldos exigía una URL de dominio oficial, y con eso
bloqueaba el año 2026 entero porque la resolución notarial no está publicada
como página accesible —el listado de la Superintendencia tiene 3.224 resultados
por fecha y la de enero queda sepultada; el normograma de la Cancillería solo
compiló las registrales—.

Y al mirarlo de cerca, **el requisito se invertía**:

| | Compilación de la Cancillería | PDF de la resolución |
|---|---|---|
| Tiene enlace | **Sí** | No |
| Es la entidad emisora | No, es un normograma | **Sí** |
| Erratas de digitación | **Sí**, visibles | No |
| Firma, radicado y sellos | No | **Sí** |

La que pasaba la guarda era la **peor** evidencia de las dos.

**La regla.** La URL nunca fue el requisito: era un **sustituto** de la
procedencia, cómodo de comprobar porque un dominio se valida en una línea. Donde
el sustituto y lo sustituido apuntan en direcciones opuestas, manda lo
sustituido.

Por eso el respaldo gana `tipo_evidencia`: `URL_OFICIAL` o
`DOCUMENTO_ARCHIVADO`, y el segundo exige las seis cosas que un enlace daba
gratis —el archivo guardado, su hash SHA-256, la entidad emisora, de dónde se
obtuvo, cuándo, y quién lo archivó—.

**Lo que NO se amplió es la autoridad.** Un PDF de una notaría particular, de un
gremio o de un sitio comercial sigue sin valer, y la comprobación es la misma
tabla de siempre: un documento archivado nombra su autoridad y se resuelve
contra `FuenteNormativa`. Se amplió el soporte, no quién puede sustentar.

Y el PDF de la simulación imprime **cuál de los dos fue**, porque «Resolución
RES-2026-000964-6, documento oficial archivado» es una afirmación distinta de un
enlace público, y quien lee la simulación tiene derecho a saber cuál tiene
delante.

### El artículo de vigencia que ya estaba derogado

2026-10-13, calculadora de gastos notariales. Dos hallazgos encadenados del
titular, y el segundo es más duro que el primero.

**Primero:** la vigencia no es el año calendario. La RES-2026-000964-6
(notarial) rige desde el 1 de febrero de 2026 por su art. 56; la
RES-2026-001726-6 (registral) por su art. 29 decía regir desde su expedición,
el 29 de enero. Las dos son «las de 2026» y ninguna empieza el 1 de enero. Una
escritura del 15 de enero de 2026 se liquida con las tarifas de 2025. El motor
las habría aplicado a enero sin decir nada, porque trataba el año como un rango
de fechas cuando es solo una **etiqueta**.

**Segundo, y es la regla que importa:** ese art. 29 **ya estaba modificado**.
La RES-2026-001896-6 del 30 de enero cambió la fecha al 2 de febrero. El PDF
que teníamos era el texto original —correcto como documento, falso como dato
vigente— y la modificatoria **no aparece mencionada en el artículo que
modifica**. Solo se encuentra si se busca expresamente si esa norma fue
modificada.

> **Leer el PDF correcto no basta. Hay que comprobar si esa norma fue
> modificada.**

Un artículo de vigencia es el último sitio donde uno esperaría un dato caduco,
y es justo donde más daño hace: gobierna si todas las demás cifras del
documento aplican o no.

Y nótese el efecto combinado, que no se ve mirando una norma sola: con la
notarial desde el 1 de febrero y la registral desde el 2, **hay un día —el 1 de
febrero— en el que ya rige una y no la otra**, y en ese día no se puede
liquidar una escritura completa. Eso no está escrito en ninguno de los dos
documentos: aparece solo al cruzarlos.

Es la misma familia que [la exención muerta] y [la prueba que hace eco]: un
resultado plausible y equivocado que nadie nota. Por eso la vigencia vive en
cada **respaldo** y no en el año, cada norma declara `vigencia_desde` y
`vigencia_hasta`, y el artículo que fija la vigencia se cita aparte del que
trae la cifra —la tarifa está en el art. 50 y la vigencia en el art. 56—.

**Dos corolarios de implementación**, por si se pierden:

- Las fechas van como texto ISO y se comparan como texto. Con `new Date()` de
  por medio, «2026-02-01» es medianoche UTC y en nuestro huso retrocede al 31
  de enero: justo el día que decide qué resolución aplica.
- Una **compilación** no es la entidad emisora. El normograma reproduce el
  texto, no lo autentica, y el de Cancillería tiene erratas de digitación
  visibles. Citarla obliga a decir que lo es y dónde está el texto auténtico
  —Diario Oficial—. La guarda no deja guardar un respaldo de una compilación
  sin esa nota.

### Incompleto se ve; incoherente no

2026-10-13, al ampliar la evidencia a documentos archivados. Un respaldo puede
traer ahora las dos cosas: la URL y la autoridad declarada. Añadí una guarda que
nadie pidió: si dice ser de la Superintendencia y su enlace es de la DIAN, se
rechaza.

La razón, que es la que la hace valer la pena:

> **Un respaldo incompleto se ve. Uno incoherente no.**

A un respaldo al que le falta el hash se le nota: hay un hueco, y la guarda lo
nombra. Uno que tiene todos los campos llenos y dos de ellos se contradicen
**parece completo**, pasa cualquier revisión a ojo, y la contradicción solo
aparece el día que alguien va a comprobar la cifra contra el documento
equivocado.

Es la misma familia que el indicador agregado —que sumaba causas distintas y
parecía un dato— y que la exención muerta —que daba la cifra que daría si la
excepción no existiera—. Las tres se ven igual que lo correcto desde fuera.

**La regla operativa:** cuando dos campos de una misma fila pueden decir lo
mismo por caminos distintos, la guarda no es que estén llenos: es que coincidan.

### La exención muerta: una comparación de cadenas que no avisa

2026-10-06, motor de gastos notariales. El cálculo de la retención recorre una
lista de reglas y la primera que encaja gana. Las condiciones se comparaban
así:

    case 'IGUAL': return String(actual) === cond.valor

Si la regla dice `JURIDICA` y la simulación manda `juridica`, **no coincide**.
Y no coincidir no es un error: el motor pasa a la regla siguiente, encuentra la
general, aplica el 1 % y devuelve un número perfectamente plausible. La
exención queda muerta y **nadie se entera nunca**, porque el resultado tiene
exactamente la forma de un resultado correcto.

Es la misma familia que la guarda del NIT: una afirmación sobre el
comportamiento —«las excepciones se aplican»— que nadie había visto ocurrir, y
que además era imposible ver fallar.

La diferencia con un error de cálculo es la que importa: un cálculo mal da una
cifra que alguien puede cuadrar a mano. Esto da la cifra que daría si la
excepción no existiera, que es indistinguible de la verdad desde fuera.

**La regla.** Una comparación entre un valor configurado y un dato de entrada
no puede limitarse a no coincidir. Cualquiera de los dos lados que salga del
conjunto de valores admitidos tiene que **detener el cálculo**, no desviarlo:

- cada campo declara sus valores (`['NATURAL', 'JURIDICA']`), su tipo y si el
  formulario lo pregunta;
- se valida al CARGAR la regla —una regla con `juridica` no se guarda— y
  también al EJECUTAR, porque el dato de entrada viene de otro sitio;
- un campo sobre el que el formulario no pregunta no puede sostener una regla
  activa: añadir la pregunta es código, no una fila.

Corolario, por si vuelve a aparecer en otra forma: **el silencio no es un
resultado.** Donde una condición no se pueda evaluar, se lanza; donde una regla
no aplique, se dice cuál aplicó. Un camino que «simplemente no entra» es un
camino que no se puede auditar.

### La prueba que hace eco: verde para siempre, sin probar nada

2026-10-06, motor de gastos notariales. 152 verificaciones en verde, y en el
informe una afirmación numérica falsa. El titular hizo la pregunta correcta
**antes** de pedir una corrección:

> ¿la prueba calcula con la misma fórmula que el motor —y entonces pasó
> comparándose consigo misma—, o la prueba tenía el número escrito y pasó, y
> entonces el motor está mal?

Son dos arreglos distintos, y responder primero evita arreglar lo que no está
roto. (Esa vez no era ninguna de las dos: el arnés y el código estaban bien, y
el número equivocado estaba en mi prosa. Lo cual no es inocuo: quien lee el
informe no lee el arnés.)

Pero la auditoría que disparó la pregunta encontró **seis** verificaciones que
no verificaban:

| Clase | Ejemplo real | Por qué no sirve |
|---|---|---|
| **Eco** | `evaluarTramos(T, x) === alPeso(0.015*1.5e9 + 0.03*5e8)` | El lado esperado recalcula la fórmula que se está probando, con sus mismos ayudantes de redondeo |
| **Autoconsistencia** | `iva.total === lineas.reduce(sumar ivas)` | Compara dos salidas del mismo cálculo. Vale como invariante, **no** como comprobación de valor |
| **Tautología** | `total < total + obligaciones` | Con `obligaciones > 0` es cierta siempre. Verde para siempre, pase lo que pase |

**La regla.** Una prueba cuyo lado esperado se calcula con la lógica que
prueba no es una prueba. El valor esperado de una frontera se calcula **aparte
y se escribe como literal**: si la fórmula del código cambiara, el literal no
cambia con ella, que es justamente lo que lo convierte en testigo.

**Y cómo se verifica que el arnés sirve: rompiendo el motor a propósito.** Se
muta una expresión del código y se cuenta cuántas verificaciones caen. Si no
cae ninguna, eran eco. Dos ejemplos del mismo día:

- Cambiar el acumulado marginal por «tasa sobre el total» → **26 caen**,
  incluidas las siete fronteras. Son prueba, no eco.
- En el IVA, cuatro mutaciones (redondear por línea, medio hacia abajo,
  repartir el bruto en vez del liquidado, redondear la parte mayor). Las dos
  primeras rondas dejaron **dos mutaciones vivas**: faltaban el caso del medio
  exacto —`,50011` prueba de qué lado cae el corte, pero no distingue
  medio-arriba de medio-abajo, porque no está en el medio— y un reparto que
  cayera en `,5` clavado, que es el único donde se separa redondear la parte
  menor de redondear la mayor. Con esos dos casos añadidos, las cuatro caen.

Es la hermana de la regla anterior —el nombre de una prueba no prueba nada— y
de la del detector: **a un arnés se le prueba rompiendo lo que vigila**, igual
que a un detector se le prueba con las frases que tiene que cazar.

### El indicador agregado que inventó un fallo

2026-09-22. El hub de finanzas decía «1 gasto sin proveedor, factura o recibo».
El titular registró un gasto de $20.000 con foto, leyó esa línea y concluyó que
la subida del recibo había fallado en producción. La conclusión parecía sólida:
había una corrección reciente del nombre de una variable de Cloudinary, y
encajaba. **Las dos conclusiones eran falsas.** En la base, el gasto tenía su
`soporte_public_id`; en Cloudinary, el archivo existía, era `authenticated` y
el enlace firmado lo servía. El recibo estaba donde debía desde el principio.

Lo que el indicador escondía: ese gasto estaba «por completar» por **proveedor
y factura**, dos causas distintas mezcladas con una tercera —el recibo— en una
sola frase. Agrupar causas distintas en un indicador convierte cualquier
lectura en una suposición.

**Regla: cuando un indicador agrupa causas distintas, no se diagnostica desde
él. Se va al dato.** Aquí bastaron dos consultas —la fila del egreso y el
recurso en Cloudinary— para cerrar en minutos algo que iba camino de ser una
investigación de logs de producción.

El indicador ya está desglosado: «N sin recibo» (primero y resaltado, porque es
el que no se puede reponer) · «N sin proveedor · N sin factura».

Y algo que el susto sí destapó: había un silencio real en el camino. Si la
subida de la foto fallaba, el gasto se guardaba igual y la pantalla decía
«Guardado» sin mencionarla; la foto se perdía al salir. Corregido: el fallo
ahora es rojo, dice el motivo, y la foto queda en una cola local atada al
gasto hasta que suba. En un módulo contable el silencio es peor que el fallo:
el fallo se corrige, el silencio se descubre en una revisión de la DIAN.

### Tercera reaparición: el plural derivado con una «s»

2026-10-13, en el desglose de las copias auténticas:

    3 copia auténticas × 10 hojas = 30 hojas

Es **el mismo defecto que «1 movimiento registrados»**, en código nuevo, dos
semanas después, y esta vez al lado de una cifra en pesos que lee un comprador.

Y es el mismo patrón que la reaparición del indicador agregado. Son dos
defectos distintos con **una sola causa**: una regla escrita en este documento
que no se consulta al teclear el siguiente texto. Documentar no basta —ya lo
sabíamos para las decisiones (§ «Documentar no es defender»)—; tampoco basta
para la redacción.

**La pregunta operativa**, que es lo único que sobrevive al olvido:

> ¿este texto compone una frase con una cantidad variable?
> Si sí, el plural se **declara**, no se deriva añadiendo una «s».

Puesto en el esquema como `unidad_plural` y `unidad_captura_plural`, con una
guarda que los **exige** cuando la etiqueta tiene más de una palabra —porque
«copia auténtica» y «firma o diligencia» no pluralizan mecánicamente—. Ahí la
regla deja de depender de que alguien se acuerde.

#### Segundo caso de la misma familia: el comentario de `next.config.ts`

2026-10-14, el panel notarial. Una ruta leía
`PARAMETROS-NOTARIALES-VERIFICADOS.md` con `readFile` y una ruta relativa.
Compiló, pasó el typecheck, funcionó en local —donde el proceso corre en la
raíz del proyecto— y en producción dio **ENOENT**: una función serverless no se
despliega con el repositorio.

Lo que lo pone en esta familia: **el mecanismo para evitarlo ya estaba en el
proyecto, resuelto y comentado**, en `next.config.ts`, para los MDX del blog. El
comentario dice textualmente que sin `outputFileTracingIncludes` el `readdirSync`
no encuentra los archivos en `/var/task`. Esa nota estaba a treinta líneas de
donde hacía falta y no se consultó.

Es la segunda vez que pasa exactamente esto. La primera fue la guarda del dígito
de verificación del NIT: puesta, documentada, y muerta —nunca se ejecutaba—
hasta que se provocó.

> Una nota junto al código no se lee cuando se escribe código nuevo en otro
> archivo. Solo se lee cuando ya se está mirando ese sitio, que es después.

El camino que lo hace imposible es `scripts/verificar-trazas.mjs`: declara qué
archivos lee cada ruta en runtime y comprueba, contra los `.nft.json`, que viajen
con su función. Corre en el build. Se provocó antes de arreglar nada y falló en
las dos rutas del panel.

**Y dos cosas que vale más recordar que la guarda misma:**

Primero, la guarda casó un tercer «fallo» que no existía: declaré que
`sitemap.xml` leía los MDX del blog, y quién los lee es `sitemap-blog.xml`. Un
instrumento mal declarado engaña igual que uno roto —§ «Instrumentos que
engañan»—, así que cada fila declara QUÉ ruta y POR QUÉ, para poder comprobar
la declaración antes de creerle.

Segundo, y es lo mejor del caso: al final la lectura en runtime se **eliminó**.
El bloque de cotejo se convierte en módulo en tiempo de generación
(`scripts/generar-transcripcion.mjs`), con una huella del bloque y una guarda
que rompe el build si la copia se queda vieja. **Una lectura que no existe no
necesita guarda**, y eso es mejor que vigilarla. La fuente sigue siendo una —el
documento— y el panel no la escribe, que es lo que hace valer el cotejo.

#### El cierre del patrón: una regla que no se consulta hay que hacerla imposible

El 2026-10-14 el mismo patrón apareció una **cuarta** vez, en otro sitio: los
acentos graves de un `git commit -m` se comieron dos palabras del mensaje. La
regla —escribir el mensaje a un archivo y usar `-F`— estaba escrita en este
documento desde la primera vez.

Cuatro reincidencias de tres defectos distintos con una sola causa bastan para
cambiar de instrumento:

> **Una regla escrita que se olvida en el momento de usarla no se arregla con
> otra nota. Se arregla con un camino que la haga imposible de incumplir.**

Para el plural fue una guarda en el esquema. Para el mensaje de commit es el
hook `commit-msg` de `.githooks/`, que rechaza las dos huellas que deja una
sustitución vacía —doble espacio y espacio antes de dos puntos— y explica el
camino bueno. El commit no se hace: no hay nada que recordar.

Y nótese el criterio para elegir la huella: no se detecta «falta una palabra»,
que es indecidible, sino el **rastro tipográfico** que deja el fallo. Las dos
huellas son además erratas de verdad, así que rechazarlas no cuesta nada.

#### Y la regla general que sale de aquí

No lo vio una revisión: lo vio **el arnés**, porque había una verificación que
comparaba el texto del desglose carácter por carácter.

> **Todo texto que lee un cliente necesita al menos una verificación que lo
> compare carácter por carácter. Sin eso, la regla de redacción es decoración.**

Es la hermana de «documentar no es defender», aplicada a lo que se escribe en
pantalla. Y tiene una consecuencia incómoda que conviene aceptar de frente: una
verificación así es **frágil a propósito** —cambiar una coma la rompe—, y eso es
exactamente lo que se quiere. Si el texto cambia, alguien tiene que mirarlo.
Una comprobación laxa —«que contenga la palabra copias»— habría dejado pasar
«3 copia auténticas» sin un fallo.

Donde el texto todavía no existe —la pantalla del panel, el PDF— la regla se
cumple el día que se escriba, no antes: lo que no se puede es escribirlo y
dejarlo sin nada que lo compare.

### La variable de entorno que el código inventó

`src/lib/finanzas/recibos.ts` leía `CLOUDINARY_CLOUD_NAME`. Esa variable **no
existe**: en este proyecto el cloud name siempre se ha llamado
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. El typecheck pasaba, 156 pruebas pasaban y
el build salía sano, porque `process.env.LO_QUE_SEA` es `undefined` y no
rompe nada. El efecto habría aparecido solo en producción: con las llaves ya
configuradas, la subida de recibos respondiendo «no configurado» y cada gasto
guardándose sin foto, en silencio.

**Regla: una variable de entorno se verifica contra la lista REAL del entorno
—Vercel, `.env.local`— no contra lo que el código espera encontrar.**

    grep -o "^[A-Z_]*CLOUDINARY[A-Z_]*" .env.local | sort -u

Es la misma familia que las guardas muertas: nada falla, todo parece verde, y
la afirmación («lee las llaves») no se había comprobado nunca contra el efecto.
Y el arreglo tampoco puede ser leer dos nombres «por si acaso»: dos nombres
para el mismo dato son dos verdades en cuanto alguien los define distintos.
Una sola fuente, y si falta, que falle con un mensaje claro.

### Verificado en local ≠ verificado en producción

Estado de las verificaciones de este lote, con su alcance exacto:

| Qué | Dónde se verificó |
|---|---|
| Ningún chunk del navegador lleva `PrismaClient` (incluido `/admin/cifras`) | **LOCAL** — build local, 0 archivos en `.next/static`. En producción no se pudo: la página está tras el login y el hash del chunk de Vercel no coincide con el local. El build local es la misma salida que despliega Vercel, pero eso es una inferencia, no una observación |
| Deploy de `4b1b1cc` completado | Producción — estado de Vercel en GitHub |
| Reputación en home, nosotros y `llms.txt` tras separar `cifras-publicas` | Producción — `grep -o … \| wc -l` sobre lo servido |
| `/interno/datos-contador` con `noindex, nofollow` y fuera de los 5 sitemaps | Producción |
| Guarda del NIT y guarda de migraciones `.sql` | Local, provocando el fallo. En Vercel solo consta que el build pasó con NIT vacío (el camino verde), no que rompa con uno malo |

# 14. CALCULADORA DE GASTOS NOTARIALES — las decisiones y su porqué

> **Para qué es esta sección.** El motor, las guardas y la capa servidor están
> en el repositorio y se leen solos. Lo que no se reconstruye leyendo el código
> es **por qué** cada cosa es como es: qué error concreto evita, qué alternativa
> se descartó y con qué caso real. Está escrita para arranque en frío, sin
> contexto de la conversación que la produjo.
>
> **Dónde está el código.** Motor en `src/lib/notariales/` —módulos hoja, sin
> alias `@/`, probados con `node scripts/probar-notariales.mjs` (494
> verificaciones)—. La capa de base en `datos.ts` y `panel.ts`, probada contra
> la base real con `node scripts/probar-panel-notarial.mjs` (35). El cotejo con
> `node scripts/cotejar-notariales.mjs`. Siete tablas en Prisma. **Las pantallas
> del panel NO existen todavía.**
>
> **Estado:** el año 2026 no se puede activar, y es correcto. Faltan la URL
> oficial de la resolución notarial y la ordenanza de Cundinamarca.

## 14.1 Las cinco bases no son una, y ya divergieron

Cada concepto se liquida sobre **su** base, con **su** norma. Hay cinco
funciones —`calcularBaseNotarial`, `...Registro`, `...Orip`, `...Timbre`,
`...Retencion`— y durante semanas las tres primeras dieron el mismo resultado.
Separarlas parecía ceremonia.

Dejó de parecerlo al transcribir los PDF:

| Base | Qué toma | Norma |
|---|---|---|
| Notarial | el mayor entre **cuatro** valores: pactado, avalúo catastral, autoavalúo y valor del remate | art. 51 lit. a) de la RES-2026-000964-6 |
| Registro y ORIP | el mayor entre **dos**: cuantía y avalúo catastral | art. 1 lit. b) inciso 2 de la RES-2026-001726-6 |
| Timbre y Retención | el valor de la enajenación, sin avalúo | E.T. |

Con precio 80 M y autoavalúo 120 M, **en la misma liquidación** los derechos
notariales van sobre 120 M y el impuesto de registro sobre 80 M. Si las bases
hubieran estado unificadas, el registro habría cobrado sobre 120 M: una cifra
más alta que la que cobra la oficina, plausible y equivocada.

**La regla:** dos reglas que hoy coinciden no son la misma regla. Separar por
NORMA y no por resultado cuesta una función de más y ahorra el día en que una
de las dos normas se mueve.

## 14.2 La vigencia va por respaldo. El año es una etiqueta

`AnioNotarial.anio` **no es un rango de fechas**. Ninguna de las resoluciones
de 2026 empieza el 1 de enero:

- La notarial rige **desde el 1 de febrero de 2026** (art. 56), derogando la
  Resolución 585 de 2025.
- La registral rige **desde el 2 de febrero de 2026** (art. 29), derogando la
  0179 de 2025.

Consecuencias que el modelo tiene que soportar y soporta:

1. Una escritura del **15 de enero de 2026** se liquida con las tarifas de
   2025. El motor se detiene con `FueraDeVigencia` nombrando el art. 56, en vez
   de aplicar tarifas que no regían.
2. **El 1 de febrero rige una norma y no la otra.** Ese día no se puede
   liquidar una escritura completa, y eso no está escrito en ninguno de los dos
   documentos: aparece solo al cruzarlos.

Por eso `vigencia_desde` es **obligatoria en cada respaldo**, `vigencia_hasta`
nullable, y el artículo que fija la vigencia se cita **aparte** del que trae la
cifra: la tarifa está en el art. 50 y la vigencia en el art. 56.

### El artículo de vigencia que ya estaba derogado

El art. 29 de la registral decía regir «desde la fecha de su expedición» —29 de
enero—. **Esa fecha ya era falsa**: la modificó la RES-2026-001896-6 del 30 de
enero, un documento que el art. 29 no menciona y que solo aparece si se busca
expresamente si esa norma fue modificada.

> **Leer el PDF correcto no basta. Hay que comprobar si esa norma fue
> modificada.**

Un artículo de vigencia es el último sitio donde uno espera un dato caduco, y
es donde más daño hace: gobierna si todas las demás cifras del documento
aplican.

**Detalle de implementación que no es cosmético:** las fechas van como texto
ISO y se comparan como texto. Con `new Date()` de por medio, «2026-02-01» es
medianoche UTC y en nuestro huso retrocede al 31 de enero — justo el día que
decide qué resolución aplica.

## 14.3 La evidencia: la URL no era el requisito

La guarda exigía una URL de dominio oficial. Eso bloqueaba el año 2026 entero,
porque la resolución notarial no está publicada como página accesible. Y al
mirarlo de cerca, **el requisito se invertía**:

| | Compilación de la Cancillería | PDF de la resolución |
|---|---|---|
| Tiene enlace | **Sí** | No |
| Es la entidad emisora | No, es un normograma | **Sí** |
| Erratas de digitación | **Sí**, visibles | No |
| Firma, radicado y sellos | No | **Sí** |

La que pasaba la guarda era la **peor** evidencia de las dos.

> La URL nunca fue el requisito: era un **sustituto** de la procedencia, cómodo
> porque un dominio se valida en una línea. **Donde el sustituto y lo sustituido
> apuntan en direcciones opuestas, manda lo sustituido.**

De ahí `tipo_evidencia`: `URL_OFICIAL` o `DOCUMENTO_ARCHIVADO`. El segundo
exige las seis cosas que un enlace daba gratis —archivo guardado, hash SHA-256,
entidad emisora, de dónde se obtuvo, cuándo, y quién lo archivó—.

**Lo que NO se amplió es la autoridad.** Un PDF de una notaría particular, un
gremio o un sitio comercial sigue sin valer: un documento archivado nombra su
autoridad y se resuelve contra la misma tabla `FuenteNormativa`.

### Por qué el PDF se archiva autenticado y nunca se publica

Publicar una copia de una norma que **no emitimos** nos convertiría en un sitio
desde el que se puede citar esa norma. Y cuando la entidad la modifique —como
pasó con la registral a los diez días— nuestra copia pública diría lo viejo con
nuestra marca encima. **El PDF es evidencia interna, no contenido.**

Consecuencia resuelta en `citaPublica`: con `DOCUMENTO_ARCHIVADO` el PDF de la
simulación **no enlaza nada**. Nombra la norma, el artículo, la entidad emisora
y la fecha de verificación, y dice dónde la consigue el lector por su cuenta
(`donde_conseguirlo`, obligatorio). Con `URL_OFICIAL` sí va el enlace. Y una
guarda de último recurso rechaza cualquier cita que contenga nuestro dominio o
la ruta de la copia, porque eso se cuela al editar un texto, no al diseñar.

Detalle: el archivo va con `resource_type: 'raw'`. Como imagen, Cloudinary
podría recomprimirlo, y un documento recomprimido ya no cuadra con su hash. Y
**el hash se calcula sobre los bytes que llegan**, antes de subir: calcularlo
después sería comprobar nuestra copia contra sí misma.

## 14.4 El IVA: siete valores y un solo redondeo

`BASE_IVA` · `IVA_BRUTO` · `IVA_LIQUIDADO` · los dos exactos · los dos enteros.
`Decimal` en todo el camino, nunca `number`.

- **Nada se redondea antes de sumar.** Dos conceptos con IVA de 20.004 dan
  40.008 y liquidan 40.010; redondeando por línea darían 20.000 + 20.000 =
  40.000. Diez pesos que no aparecen en ninguna línea y sí en el total.
- **El IVA sigue el reparto de cada concepto** que lo genera, ponderado por lo
  que aporta a la base. Si el comprador asume el 100 % de las copias, el IVA de
  esas copias es suyo. Un 50/50 plano contradiría el reparto configurado arriba
  en la misma pantalla.
- **Se reparte el LIQUIDADO, no el bruto**, o las partes no sumarían el
  liquidado. Se redondea la parte **menor** y la mayor es el residual. Empate →
  el residual es del comprador, por determinismo.

### Lo que es norma y lo que decidimos nosotros

El Concepto DIAN 003550 int 306 de 2026 dice «**podrá** aproximarse»: adoptar la
aproximación es decisión de Su Finca Raíz amparada en la norma, **no una
obligación**. El respaldo se carga con `caracter: 'ADOPTADO'` y nunca diciendo
que la norma lo exige.

Lo que el concepto **no** define —el empate exacto— sale por analogía con la
doctrina del art. 577. Está declarado en `CRITERIOS_ADOPTADOS` como criterio
nuestro, junto con el reparto al peso, y el panel tiene que mostrarlos en su
propia sección, **leyéndose distinto de una tarifa**.

Y `IVA_BRUTO` viaja en la liquidación porque el párrafo 8 de ese concepto exige
«los soportes contables que permitan la comprobación de los valores asentados».
No es redundancia: es el soporte que la norma pide.

### La copia simple lleva el IVA dentro

Art. 5: $700 **por cara, IVA incluido**. Es el único concepto así. El componente
se **extrae** —precio × 19/119 = 111,76— y **no vuelve a `BASE_IVA`**: un precio
publicado con IVA incluido ya viene liquidado, así que la copia cuesta $700 y
sigue costando $700 después de liquidar el IVA del resto.

⚠ La copia **auténtica** ($5.600 por hoja, mismo art. 5) **no** dice «IVA
incluido», así que grava normal y sí entra en `BASE_IVA`. Modelarlas con la
misma bandera dejaría una de las dos mal. Hay una mutación que lo prueba: ponerles
la misma bandera tumba 21 verificaciones.

## 14.5 El cotejo: dos lecturas del mismo papel

`PARAMETROS-NOTARIALES-VERIFICADOS.md` tiene un bloque de columnas fijas con las
53 cifras transcritas del PDF. `scripts/cotejar-notariales.mjs` lee la base y lo
compara fila por fila.

**Por qué no es un eco, que es lo único que lo hace valer:** el titular
transcribió del PDF al documento, y después cargó del **mismo PDF** al panel, a
mano y en otro momento. Ninguna ruta deriva de la otra. Si divergen, alguien leyó
mal el papel — y ese es el único error que ningún arnés puede encontrar, porque
el motor calcularía impecablemente sobre la cifra equivocada, con todo en verde.

### ⚠ No todas las 53 tienen dos lecturas. La cuenta honesta

Aquí hay un eco que se cuela si no se mira de cerca, y me lo corrigió el
titular después de que yo lo presentara mal:

| Filas | De dónde salen | Qué prueba su «coincide» |
|---|---|---|
| **29 sembradas** —los 7 tramos del art. 50 y el acto sin cuantía— | de la MISMA lectura: se transcribieron al bloque y se sembraron desde ahí | **consistencia interna**: que no hay errata entre el seed y la transcripción |
| **24 por cargar** | el titular las teclea del PDF, en otro momento | **dos lecturas**: la del bloque y la de la carga |

Un «24 de 24 coinciden» en `recaudo_snr` **no es la verificación de dos
lecturas**. Es el cotejo comparándose consigo mismo, que es exactamente el
defecto contra el que existe. Presentarlo como buena señal da una confianza que
no corresponde.

Y una precisión más, por no inflar tampoco las otras 24: las dos lecturas son
del **mismo lector en dos momentos**, no de dos personas. Eso caza un error de
tecleo y un despiste de una de las dos veces; no caza un malentendido estable
—leer siempre el artículo equivocado—. Es lo que hay, y es muchísimo mejor que
una sola lectura, pero conviene saber qué compra.

**Consecuencia para el panel**, pendiente de construir: el veredicto de una
sección sembrada y el de una que el titular cargó **no valen lo mismo y no
pueden verse igual**. Hay que marcarlos distinto —«sembrado» frente a
«cargado»— y el informe final tiene que decir **cuántas de las 53 tienen dos
lecturas de verdad**. Esa es la cifra que decide si el año se activa con
confianza, no el total de coincidencias.

**Cuatro conclusiones, no dos:**

| | |
|---|---|
| `COINCIDE` | dos lecturas que dicen lo mismo |
| `DIFIERE` | volver al PDF antes de publicar |
| `SIN_TRANSCRIBIR` | está en la base y no en el documento: **una sola lectura, o ninguna** |
| `SIN_CARGAR` | falta cargarlo |

La tercera es la incómoda y la que más vale. El 1 % del impuesto de registro de
Cundinamarca va a salir así: está en el catálogo de memoria, viene de una fuente
secundaria y **nadie ha leído la ordenanza**. Es la misma situación del «0,27 %»
que todavía está publicado en el glosario. La Ley 223 de 1995 fija el rango
entre 0,5 % y 1 %, así que el 1 % es el techo y es plausible — y «plausible» es
exactamente lo que ha costado caro cada vez.

`apto` exige dos cosas: que nada difiera **y que nada esté cargado sin
transcribir**. Lo que falta por cargar no bloquea: eso ya lo hace la guarda de
respaldos.

## 14.6 Decisiones cerradas, para no reabrirlas

- **El escalón de los derechos es LITERAL.** Art. 2 lit. b): $30.900 hasta una
  cuantía de $259.300, y 3 por mil sobre el excedente. El excedente no iguala al
  mínimo hasta $10.559.300, así que una finca de 5 M y otra de 9 M pagan casi lo
  mismo. **Parece un error y está verificado contra el PDF.** No se «corrige»
  por intuición aritmética. Lo único que se rechaza es una tabla **no monótona**
  —que un inmueble más caro pague menos—, y solo en los conceptos declarados
  `NO_DECRECIENTE`.
- **La monotonicidad es propiedad del concepto**, no creencia sobre el mundo.
  `NO_DECRECIENTE` solo en `derechos_escritura`; todo lo demás `LIBRE`, porque
  una tabla normativa futura puede bajar y la guarda estaría rechazando una
  tabla correcta.
- **El redondeo de cada tarifa lo dice su resolución**, no el motor. `PUBLICADO`
  significa que la cifra se toma tal cual —el art. 50 ya viene ajustado a la
  centena— y exige que sea entera: una cifra «publicada» con decimales delata
  que alguien la derivó.
- **El reparto del IVA entre las partes se redondea al peso**, no al múltiplo
  normativo: el múltiplo manda sobre la liquidación del impuesto, que es norma;
  el reparto es un pacto entre particulares.
- **El $280 del art. 6 parágrafo 1 queda FUERA de la v1.** Depende de que haya
  reconocimiento de firma y contenido y de cuántos folios tenga *ese* documento,
  y el formulario no pregunta ninguna de las dos. Mismo criterio que las
  excepciones de retención: una regla que necesita una pregunta que el
  formulario no hace es **código, no una fila**. Hay una verificación que
  comprueba que no esté en el catálogo.
- **El reparto 50/50 de los derechos tiene norma** —C.C. art. 1862, supletiva:
  la ley reparte así *salvo pacto*—. El del IVA, las hojas y las copias **no**:
  es configuración de la simulación, y una guarda prohíbe colgarle una norma,
  porque imprimirla afirmaría que la ley reparte así.
- **La tabla de los arts. 48 y 49** (página 24, por número de escrituras
  anuales) es el aporte del NOTARIO según su volumen. **No es un cobro al
  usuario y no entra en la calculadora.** Está anotado junto al seed porque
  parece «la parte que falta» del art. 50.

## 14.7 La regla que salió de los tres huecos

Tres fallos aparecieron **solo** al probar contra la base, con 494
verificaciones en memoria en verde:

1. `sesgo_en_sencilla` estaba en los tipos y **no** en el esquema de Prisma:
   sembrar un año reventaba.
2. `fuentes_normativas` estaba **vacía**. La precarga vivía en código y la
   guarda resuelve contra la tabla, así que un respaldo legítimo de la DIAN se
   rechazaba por «no corresponde a una autoridad oficial activa» — cierto, y
   desconcertante.
3. Borrar un año dejaba sus respaldos **huérfanos**: la referencia es
   polimórfica y no cascadea.

> **El arnés en memoria y la base son DOS superficies. Una guarda probada en la
> primera no está probada en la segunda.**

Es la misma forma que «verificado en local ≠ verificado en producción», un piso
más abajo. Y el detalle que la hace urgente: **los tres habrían aparecido con el
titular delante del panel**, cargando parámetros con la resolución en la mano.
El arnés en memoria no puede ver un campo que falta en el esquema, una tabla
vacía ni una clave ajena que no existe.

De ahí `scripts/probar-panel-notarial.mjs`: siembra un año de prueba, ejercita
las escrituras rompiéndolas, y se limpia solo. Lo que prueba no es el cálculo
—eso ya está— sino lo que solo se ve con la base delante.

## 14.8 Lo que falta

- **Distinguir «sembrado» de «cargado» en el veredicto**, y que el informe del
  cotejo diga cuántas de las 53 tienen dos lecturas de verdad en vez del total
  de coincidencias. Va con el editor de tramos. Ver §14.5: un «24 de 24» de una
  sección sembrada es consistencia interna, no verificación.
- **Las pantallas del panel.** Orden por norma y artículo con el artículo a la
  vista como NAVEGACIÓN, la unidad pegada al campo, pendientes por dueño,
  BORRADOR/ACTIVO con un año activo que no se edita, botón de activar con el
  motivo visible, tramos como tabla con las guardas en vivo,
  `CRITERIOS_ADOPTADOS` en su sección, y la subida del PDF con su procedencia.
- **La URL oficial de la resolución notarial** o su Diario Oficial.
- **La ordenanza de Cundinamarca** para el impuesto de registro.
- **El saneamiento del contenido**, en el mismo lote que la publicación: el
  glosario dice «0,27 %» y el blog dice «0.27 %» y «0,3–0,5 %» en la misma
  página. La resolución dice 3 por mil sobre el excedente. Si la calculadora
  sale antes, el sitio se contradice en una cifra que un comprador va a usar.
- **La página pública**, que no muestra ni un número mientras el año no esté
  ACTIVO: con el año a medio cargar solo podría mostrar ceros.

