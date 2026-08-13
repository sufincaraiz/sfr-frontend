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

### Sesión 1 — COMPLETA y verificada en producción

| Bloque | Estado |
|---|---|
| Auditoría | ✅ |
| `robots.txt` con 23 agentes de IA explícitos | ✅ |
| Sitemap segmentado (índice + 5 hijos) | ✅ |
| `llms.txt` | ✅ |
| `lib/datos-oficiales.ts` | ✅ |
| JSON-LD de entidad | ✅ |
| IndexNow | ✅ |

**Verificado que Vercel NO filtra en el borde**: GPTBot, ClaudeBot y
PerplexityBot reciben 200 y 239 KB de contenido real, sin página de desafío.

**El sitio nunca estuvo bloqueado.** El `robots.txt` anterior ya permitía a todos
con un comodín; los grupos explícitos son refuerzo, no rescate.

### Sesión 2 — casi completa

| Bloque | Estado |
|---|---|
| 1. Contadores en cero | ✅ |
| 2. Vigencia (años, slug de ejemplo, títulos) | ✅ |
| 3. Metadatos por página | 🟡 parcial |
| 4. URLs limpias `/propiedades/[municipio]` | ⬜ **siguiente** |
| 5. `<RespuestaDirecta>` | ✅ componente + 7 páginas |
| 6. `<DatosVerificables>` | ✅ municipios y fichas de propiedad |
| 7. Encabezados en forma de pregunta | ✅ municipios, veredas, guía |
| 8. JSON-LD de contenido y catálogo | 🟡 falta `BlogPosting` con `author` Person |

### Sesión 3 — SIN EMPEZAR

Página de Mac, hub de preguntas frecuentes, plantilla de vereda, informe de
mercado, extracción de intención desde Mac, tablero de visibilidad IA, malla de
enlazado interno.

---

## 4. Decisiones tomadas que NO hay que revisar

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

1. **`CORREDOR`**: los cinco municipios a mano de la guía de inversión
2. **Rutas limpias `/propiedades/[municipio]`** (Sesión 2, bloque 4)
3. **JSON-LD de contenido**: `BlogPosting` con `author` como `Person` real
   (Sesión 2, bloque 8) — necesita que el titular nombre a quien firma
4. `<DatosVerificables>` en portada (espera los precios)
5. Sesión 3 completa

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
