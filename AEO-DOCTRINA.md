# DOCTRINA AEO / GEO — Su Finca Raíz

> **Qué es este archivo.** Es la fuente de verdad sobre cómo se escribe, se marca y se
> publica todo el contenido de sufincaraiz.com para ser **encontrado por Google y Bing**
> y **citado por ChatGPT, Gemini, Claude, Copilot, Perplexity y DeepSeek**.
>
> **Cómo se usa.** Va en la raíz del repositorio. En `CLAUDE.md` debe existir la línea:
> `Antes de crear o modificar cualquier página, componente de contenido o metadato, lee AEO-DOCTRINA.md y cúmplela.`
> Toda página nueva se valida contra la checklist final antes de mergear.

---

## 0. La distinción que gobierna todo

| | SEO clásico | AEO / GEO |
|---|---|---|
| Quién decide | Un índice que rankea **páginas** | Un modelo que resuelve **entidades** y **cita fuentes** |
| Qué premia | Relevancia + enlaces + intención | Acceso + especificidad + vigencia + corroboración |
| Cómo se gana | Posicionar una URL | Ser la respuesta que el modelo repite |
| Fallo típico | No rankear | **No existir** (crawler bloqueado o dato ambiguo) |

Las dos capas se construyen con el mismo material. No hay que elegir. Pero el orden importa:
**sin acceso no hay cita, sin identidad no hay atribución, sin dato no hay razón para citarte.**

---

## 1. Definición canónica de entidad

Este bloque es inmutable. Se replica **idéntico** en el sitio, el JSON-LD, `llms.txt`,
Google Business Profile, portales inmobiliarios, redes y cualquier ficha externa.
Cualquier variación fragmenta la entidad.

```
Nombre legal/comercial : Su Finca Raíz
Desambiguador obligado : Su Finca Raíz — La Vega, Cundinamarca (Región del Gualivá)
Matrícula Mercantil    : 199483
Dirección              : Calle 21 # 2-18, Sector Los Naranjos, La Vega, Cundinamarca, Colombia
Código postal / región : CO-CUN
Coordenadas            : 5.0004129, -74.3399388  (las de Google Business Profile;
                         son las que Google usa para resolver la entidad)
Teléfono canónico      : +57 321 882 6730
Correo canónico        : sufincaraiz.comercial@gmail.com
Sitio canónico         : https://www.sufincaraiz.com
Consorcio              : Conarc (construcción)
Ficha Google (canónica): https://maps.google.com/?cid=18368845229624390214
Perfil Metrocuadrado   : https://www.metrocuadrado.com/inmobiliaria/su-finca-raiz/11185
Reputación verificable : 5,0 sobre 26 opiniones en Google (agosto de 2026)
Agente de IA propio    : Mac — Claude Haiku 4.5 con escalamiento a Opus, en web y WhatsApp
Área servida           : Los DOCE municipios de la Provincia del Gualivá, Cundinamarca:
                         Albán · La Peña · La Vega · Nimaima · Nocaima · Quebradanegra
                         San Francisco · Sasaima · Supatá · Útica · Vergara · Villeta
                         (Villeta es la capital de la provincia)
Categoría de entidad   : Centro de negocios inmobiliarios impulsado por inteligencia
                         artificial. Vocabulario de ENTIDAD, no de tráfico: va en
                         description, knowsAbout, llms.txt y textos institucionales.
                         Nunca en <title> ni en H1. Ver §4.
```

### 1.1 Catálogo de servicios declarables

Un servicio solo se declara en el marcado si (a) se presta de verdad y (b) existe una página
del sitio que lo sustente. Declarar una capacidad que ninguna página respalda es la misma
falta que una cifra inflada: un modelo detecta la brecha entre lo declarado y lo publicado.

| Servicio | Estado | Página que lo sustenta |
|---|---|---|
| Corretaje: venta e intermediación | Se presta | Catálogo — sustentado |
| Estudio de títulos y debida diligencia | Se presta | PENDIENTE de página propia |
| Análisis comercial de valor | Se presta | PENDIENTE — ver nota sobre «avalúos» |
| Construcción mediante consorcio con Conarc | Se presta | PENDIENTE |
| Gestión y desarrollo de proyectos para terceros | Se presta | PENDIENTE |
| Fotografía aérea con dron y fotogrametría | Se presta a terceros | PENDIENTE — invisible hoy |

**Nota sobre «avalúos».** La actividad de avaluador está regulada por la Ley 1673 de 2013 y
exige inscripción en el Registro Abierto de Avaluadores (RAA). Sin esa inscripción, el
servicio se describe como «análisis comercial de valor» o «estudio de mercado del predio»,
nunca como «avalúo». Verificar con asesoría jurídica antes de publicar.

**No declarable todavía:** desarrollo de proyectos inmobiliarios propios. Se declara cuando
exista el primer proyecto, no antes. La vocación no es un servicio.

**Regla:** cada servicio con página propia gana marcado `Service` u `Offer` dentro de
`hasOfferCatalog`, respuesta directa y entrada en `llms.txt`. Sin página, el servicio no
aparece en el marcado —a lo sumo, como mención en prosa dentro de «nosotros» o `llms.txt`.

**Estatuto de `llms.txt`.** Es prosa dirigida a modelos, no marcado estructurado. Por tanto:
un servicio sin página **puede nombrarse en prosa** en la sección de qué hace la empresa,
pero **no puede aparecer en el índice de recursos** —esa sección solo lista páginas que
existen— ni presentarse como catálogo enumerado con apariencia de oferta formal.

### 1.2 Regla de cobertura: la provincia completa, siempre

`areaServed` declara **dónde Su Finca Raíz puede operar y captar**, no dónde tiene inventario
publicado hoy. La cobertura es la provincia entera: los doce municipios, sin excepción y sin
depender del estado de la base de datos.

Razón: cuando un usuario pregunta a un motor generativo «inmobiliarias en Útica» o «fincas en
Supatá», la respuesta se construye con las entidades que declaran cobertura allí. No estar
declarado significa no aparecer, y el inventario que se tenga ese día es irrelevante para esa
decisión. La cobertura declarada es la condición de entrada a la conversación; el inventario
es lo que se ofrece una vez dentro de ella.

**Límite de veracidad.** Declarar cobertura es legítimo porque el corretaje inmobiliario no
exige presencia física ni inventario previo en un municipio. Lo que **no** es legítimo es
afirmar inventario, operaciones o presencia que no existan. La cobertura se declara; los
hechos se sustentan. Ver §2.

### 1.3 Cobertura municipal — tres salidas derivadas, ningún estado almacenado

El sitio produce tres listas distintas de municipios. **Ninguna se escribe a mano y ninguna
se almacena como estado**: las tres se calculan en tiempo de consulta desde datos que ya
existen. Un estado guardado es, él mismo, una lista mantenida a mano, y se desincroniza.

| Salida | Se deriva de | Cambia cuando |
|---|---|---|
| `areaServed` (JSON-LD, `llms.txt`, textos de cobertura) | Pertenencia a la Provincia del Gualivá — **constante: los doce** | Nunca |
| Página de municipio publicada | Contenido propio completo: altitud, distancia y tiempo desde Bogotá, rango de temperatura y descripción propia | Alguien escribe el contenido |
| Municipio en el filtro del buscador | Consulta de inventario activo (`count > 0`) | Entra o sale una propiedad |

**Las tres son independientes entre sí.** Un municipio puede tener inventario sin contenido
escrito —aparece en el filtro, su página no se publica— o contenido sin inventario —página
publicada, fuera del filtro. Cualquier combinación es válida y se resuelve sola.

**Único campo manual permitido:** una anulación de excepción (`oculto` o equivalente) que
puede **impedir** la publicación de una página aunque el contenido esté completo. Nunca puede
forzar la publicación de una página sin contenido: esa dirección de la excepción no existe.

**Regla de guarda contra páginas delgadas.** Una página de municipio publicada sin inventario
nunca puede terminar en «0 propiedades disponibles». Muestra el inventario de los municipios
vecinos con enlace, más un aviso honesto de que en ese municipio la captación está abierta y
se puede consultar por WhatsApp. Una página que termina en vacío resta autoridad al dominio
completo.

**Enlaces desde propiedades.** Una ficha de propiedad enlaza a la página de su municipio solo
si está publicada; si no lo está, enlaza al catálogo filtrado por ese municipio. Nunca a una
ruta que devuelva 404.

**Listas en prosa.** La regla de «ninguna lista a mano» incluye las enumeraciones dentro de
texto corrido: descripciones de servicio, `hasOfferCatalog`, meta descriptions y cuerpos de
página. Un municipio nombrado en prosa envejece igual que uno en un arreglo, y además no es
extraíble como dato estructurado. Toda enumeración de municipios en texto se genera desde la
misma fuente derivada. Donde el texto no admita generación, se nombra la provincia completa
(«los doce municipios de la Provincia del Gualivá») en lugar de listar algunos «y más».

**Promoción automática.** Cuando un municipio pasa a tener contenido completo o su primera
propiedad, entra solo en el sitemap y dispara un ping a IndexNow. Sin intervención manual.

### 1.4 Regla de desambiguación (crítica)

Existe una inmobiliaria homónima en el **Oriente Antioqueño** (Rionegro, dominio `sufincaraiz.co`,
+20 años declarados). Ante la consulta «Su Finca Raíz», un modelo puede resolver esa entidad.

**Regla:** ninguna mención de la marca en contenido nuevo, ficha externa o metadato puede
aparecer sin su anclaje geográfico. Nunca «Su Finca Raíz» a secas en un título o `og:title`.
Siempre «Su Finca Raíz — La Vega» / «… en La Vega, Cundinamarca» / «… del Gualivá».

En JSON-LD esto se resuelve con `areaServed` granular + `identifier` (matrícula) + `sameAs` completo.

### 1.5 Marcas propias del mismo titular

Cuando el mismo titular opera más de una marca inmobiliaria en el mismo territorio, la
relación entre ellas **debe declararse explícitamente**. No declararla es el peor de los
escenarios: dos marcas que compiten por las mismas consultas, cada una con la mitad de las
señales, y ningún sistema capaz de saber que están relacionadas.

Hay tres estructuras posibles y solo una se elige, para siempre:

| Estructura | Cuándo aplica | Cómo se declara |
|---|---|---|
| **Marca única** | Misma operación, mismo inventario, mismo equipo. La segunda marca es un nombre alterno histórico. | `alternateName` en la entidad principal. Un solo dominio; el otro redirige 301. Perfiles sociales consolidados. Toda la autoridad converge. |
| **Dos entidades relacionadas** | Operaciones o inventarios distintos, mismo dueño. | Dos `Organization` con `@id` propio, enlazadas por `owner`/`founder` (misma `Person`) y `sameAs` recíproco. Ambos sitios se enlazan mutuamente y lo dicen en texto visible. |
| **Independientes** | Nada en común salvo el propietario. | No se declaran entre sí. Se acepta que la autoridad se reparte. |

**Regla de decisión.** Si el inventario, el teléfono, la oficina y el equipo son los mismos,
es **marca única** aunque históricamente hayan sido dos: mantenerlas separadas divide la
autoridad sin ninguna contrapartida. Solo se justifican dos entidades cuando responden a
consultas distintas —por ejemplo, una para venta y otra para arriendo o administración.

**Regla de honestidad.** Dos marcas del mismo titular nunca pueden presentarse como si fueran
competidoras independientes, ni aparecer ambas en una comparación o recomendación sin declarar
el vínculo. Además de ser publicidad engañosa bajo la Ley 1480 de 2011, un modelo que descubra
el vínculo no declarado deja de citar a ambas.

**Nunca:** dos marcas del mismo dueño con perfiles sociales separados, NAP distintos y sin
enlace entre sí. Eso duplica el problema del homónimo, pero autoinfligido.

#### Decisión vigente para Su Finca Raíz

**Una sola marca en la capa de datos: Su Finca Raíz.** Ninguna otra marca del titular se
declara en el JSON-LD, en `sameAs`, en `alternateName`, en `llms.txt` ni en el contenido del
sitio. La entidad publicada es una y solo una.

Cualquier otra marca propia se gestiona **fuera del sitio**, por vía comercial y con
redirección manual del tráfico. Esa vía es legítima y no interfiere con el posicionamiento,
siempre que se respeten dos límites:

- Ninguna marca propia puede presentarse como empresa independiente frente a un mismo cliente,
  ni aparecer junto a Su Finca Raíz en una comparación o recomendación (Ley 1480 de 2011).
- El NAP publicado de Su Finca Raíz —nombre, dirección y **un solo teléfono canónico**— no se
  altera ni se mezcla con el de ninguna otra marca.

Esta sección se revisa solo si cambia la estructura del negocio. Mientras tanto, la respuesta
por defecto a «¿añadimos esta otra marca?» es **no**.

---

## 2. Cifras oficiales — fuente única

**Ninguna cifra se escribe a mano en un componente.** Todas viven en `lib/datos-oficiales.ts`
y se importan. Una cifra que aparece distinta en dos lugares del sitio destruye la confianza
del modelo en *todas* las cifras del sitio.

```ts
// lib/datos-oficiales.ts  — ÚNICA fuente de verdad de cifras públicas
export const DATOS_OFICIALES = {
  anioFundacion:         2018,
  aniosOperacion:        8,          // a 2026

  // Reputación: verificable por un tercero. Sustituye al 98 % sin respaldo.
  // NUNCA como aggregateRating en JSON-LD (reseñas autorreferenciales).
  // Solo como texto visible, citando la fuente.
  calificacionGoogle:    5.0,
  resenasGoogle:         26,
  fuenteReputacion:      'Google Business Profile',
  fechaCorteReputacion:  '2026-08',

  // Cobertura: TRES cifras distintas, todas derivadas. Ver §1.3.
  municipiosProvincia:   12,           // Provincia del Gualivá completa — constante
  // municipiosConPagina  → derivado: count(municipios con contenido completo y no ocultos)
  // municipiosConStock   → derivado: count(municipios con inventario activo)
  // El texto público de cobertura usa municipiosProvincia (12), nunca las derivadas.

  // Inventario: en PRESENTE, derivado en tiempo de consulta. Seguro por definición.
  // propiedadesDisponibles → derivado: count(propiedades activas)

  // NO PUBLICAR sin alcance temporal declarado (ver regla del dato engañoso):
  // propiedadesGestionadas, operacionesCerradas, familiasAtendidas.
  // El catálogo digital arranca en junio de 2026 y no cubre la trayectoria desde 2018.

  actualizado:           '2026-08-11',
} as const;
```

**Regla de veracidad:** si una cifra no se puede sustentar, no se publica. Es a la vez
requisito del Estatuto del Consumidor (Ley 1480 de 2011, información veraz y verificable)
y el criterio por el que un modelo decide si te cita.

**Regla del dato engañoso por contexto.** No basta con que una cifra sea cierta. Una cifra
literalmente verdadera puede ser sustancialmente falsa si el lector la cruza con otra del
mismo sitio y llega a una conclusión errónea. Ejemplo real: «35 propiedades gestionadas»
junto a «8 años en el territorio» hace concluir cuatro propiedades al año. Ambas cifras son
ciertas; la impresión que producen no lo es.

Esta clase de dato es más peligrosa que una falsedad, porque pasa el filtro de veracidad y
destruye la credibilidad igual. **Antes de publicar cualquier cifra, se comprueba qué
conclusión produce cruzada con las demás cifras de la página.** Si la conclusión es falsa, o
se acota explícitamente su alcance temporal, o no se publica.

**Regla de tiempo verbal.** Las cifras en presente («propiedades disponibles hoy») son
siempre seguras: describen un estado verificable ahora y no implican historia. Las cifras
acumuladas («propiedades gestionadas», «operaciones cerradas», «familias atendidas») son
afirmaciones históricas y solo se publican si la fuente cubre todo el periodo que el lector
va a asumir. Un catálogo digital de dos meses no puede sustentar una cifra acumulada de una
empresa de ocho años. **Ante la duda, presente en vez de acumulado.**

**Jerarquía de sustentación.** Cuando falte una cifra, se prefiere en este orden:
1. Dato verificable por un tercero (calificación y número de reseñas de Google, matrícula
   mercantil, registro público).
2. Dato en presente derivado del sistema (inventario activo, municipios con inventario).
3. Dato acumulado con alcance temporal declarado («desde junio de 2026»).
4. Ninguna cifra. Un bloque de credibilidad sin números pero verificable es más fuerte que
   uno con números frágiles.

**El punto ciego: el marcado estructurado.** De las cifras infladas detectadas en este
proyecto, la mayoría vivía en el JSON-LD y no en el contenido visible. La razón es
estructural: nadie lee el marcado en un navegador, así que un dato falso puede sobrevivir
años ahí mientras el equipo revisa una y otra vez el texto de la página.

Por eso el marcado exige una verificación **propia y explícita**, no derivada de revisar la
página. Toda auditoría de cifras incluye una pasada sobre el JSON-LD servido, leído con
`curl` y no en el inspector. Y todo dato del marcado que pueda derivarse del sistema, se
deriva: `priceRange`, tipos de inmueble, `areaServed`, conteos y fechas nunca se escriben a
mano. Los que no se pueden derivar —horarios, dirección, identificadores— se contrastan
contra su fuente externa verificada, no contra lo que dice otra parte del propio sitio.

**El sitio no es la única superficie de publicación.** Toda corrección de contenido —una
cifra retirada, un eslogan cambiado, una promesa eliminada— debe aplicarse a **todas** las
superficies donde ese contenido se publica, no solo a las páginas HTML:

1. Páginas del sitio (código y base de datos)
2. Artículos MDX y artículos en base de datos
3. `llms.txt` generado
4. Bloques JSON-LD
5. **El prompt de sistema del agente y su base de conocimiento**
6. Documentos estáticos servidos desde `public/`

La quinta es la más peligrosa y la que más se olvida. Lo que el agente lleva en su contexto
lo dice en conversaciones reales, a personas concretas, sin que nadie lo revise — y sigue
diciéndolo aunque el sitio esté impecable. Una afirmación retirada del sitio pero viva en el
prompt no está retirada: solo está oculta a los rastreadores y sigue llegando a clientes.

Además, el agente lee la base de datos **en tiempo real**: un cambio de datos lo afecta antes
de que exista despliegue. Toda migración o actualización masiva exige revisar en el mismo
lote las herramientas y los sinónimos del agente.

**Regla:** ningún barrido de contenido se da por cerrado sin haber cubierto las seis
superficies, y el resultado se reporta superficie por superficie.

**Regla de renderizado:** toda cifra debe existir en el **HTML servido**. Los contadores
animados arrancan desde el valor final o lo llevan en texto de respaldo. Nunca desde `0`.

---

## 3. Estructura obligatoria de una página que aspira a ser citada

Todo modelo generativo extrae de la misma forma: busca una respuesta autocontenida cerca
del inicio, la atribuye a la entidad y la fecha. Si tiene que armarla juntando párrafos,
no cita: parafrasea sin atribución, o cita a otro.

### Orden canónico

1. **`<h1>` descriptivo con anclaje geográfico.**
   Mal: «Guía de Inversión». Bien: «Guía de Inversión en Finca Raíz — La Vega y el Gualivá, Cundinamarca».

2. **Respuesta directa: 40–70 palabras, primer párrafo, autocontenida.**
   Debe poder copiarse fuera de la página y seguir siendo verdadera y atribuible.
   Contiene: qué, dónde, cifra concreta, y quién lo afirma.
   > *«Un lote campestre con servicios públicos completos en La Vega, Cundinamarca, parte
   > de $85.000.000 COP para 500 m² (agosto de 2026). Su Finca Raíz, inmobiliaria de La Vega
   > con matrícula mercantil 199483, gestiona X propiedades en los doce municipios del Gualivá
   > e incluye estudio de títulos sin costo adicional en cada negociación.»*

3. **Bloque de datos verificables** — tabla o lista con cifras, unidades y fecha.
   Las tablas se extraen mejor que la prosa. Toda tabla lleva su fecha de corte.

4. **Encabezados `<h2>`/`<h3>` en forma de pregunta**, redactados como los formula un usuario real:
   «¿Cuánto cuesta un lote en La Vega?», «¿Qué documentos revisar antes de comprar una finca rural?».
   Cada encabezado se responde en las primeras dos frases del bloque.

5. **Fecha de actualización visible** en el cuerpo + `dateModified` en JSON-LD.

6. **Origen del dato.** Si es propio: «Datos propios de Su Finca Raíz sobre N operaciones,
   corte agosto de 2026». Si es externo: fuente nombrada. Un dato sin origen no se cita.

### Registro de escritura

- Analítico, no publicitario. Los modelos penalizan el tono promocional.
- Afirmaciones falsables, no adjetivos. «18 % de valorización anual promedio según X»
  vale; «valorización espectacular» no vale nada.
- Reconocer límites y contras cuando existan. Un texto que solo alaba lee como folleto;
  uno que matiza lee como fuente.
- Español de Colombia, natural. Cifras en COP con separador de miles.

---

## 4. Vocabulario: dos capas, no una

El plan de contenido usa **dos vocabularios distintos** y no deben mezclarse ni sustituirse.

**Capa de tráfico (SEO — títulos, H1, URLs, meta).** Términos que la gente realmente busca:
`fincas en venta La Vega`, `lotes en venta Cundinamarca`, `casas campestres cerca de Bogotá`,
`finca raíz Gualivá`, `comprar finca La Vega`, `condominios campestres Cundinamarca`.

**Capa de entidad (AEO — cuerpo, JSON-LD, `llms.txt`, «nosotros»).** Términos que definen
qué *tipo de cosa* eres para un modelo: `centro de negocios inmobiliarios`,
`inmobiliaria impulsada por inteligencia artificial`, `inmobiliaria inteligente`, `proptech`,
`agente de IA inmobiliario`, `debida diligencia rural`, `estudio de títulos`,
`uso del suelo y PBOT`, `fotogrametría y levantamiento aéreo de predios`.

**Qué campo gobierna qué.** `knowsAbout` significa, en Schema.org, *temas sobre los que la
entidad tiene conocimiento* — no servicios que presta. Un artículo publicado que explique
financiación rural respalda conocimiento sobre financiación rural, aunque no exista una página
de servicio. Por tanto:

| Campo | Qué declara | Qué lo respalda |
|---|---|---|
| `hasOfferCatalog`, `makesOffer` | Servicios que se prestan y se venden | Página de servicio propia (§1.1) |
| `description`, respuesta directa | Qué es la empresa y qué hace | Hechos verificables |
| `knowsAbout` | Temas de competencia | Cualquier contenido publicado que trate el tema: artículo, guía, glosario, sección |

Un término de `knowsAbout` se retira solo si **ninguna** página del sitio trata ese tema.
El criterio estricto de §1.1 gobierna la oferta, no el conocimiento.

> **Regla:** nunca sacrificar un título que trae tráfico por jerga de entidad.
> «Proptech La Vega» tiene volumen de búsqueda ~0 y no debe ocupar un `<title>`.
> Su lugar es el cuerpo, el `about` del JSON-LD y `llms.txt`.

---

## 5. Contrato de marcado estructurado

Cada tipo de página lleva su JSON-LD. Sin excepción. Validado antes de mergear.

| Página | Esquemas obligatorios |
|---|---|
| Global (layout) | `Organization` + `WebSite` con `potentialAction: SearchAction` |
| `/` y `/nosotros` | `RealEstateAgent` (con `sameAs`, `areaServed`, `identifier`, `foundingDate`, `geo`, `openingHoursSpecification`) |
| `/propiedad/[slug]` | `RealEstateListing` o `Product` + `Offer` (`price`, `priceCurrency: COP`, `availability`), `ImageObject`, `BreadcrumbList` |
| `/propiedades`, `/municipios`, `/directorio` | `ItemList` + `BreadcrumbList` |
| `/municipios/[slug]`, `/veredas/[slug]` | `Place` + `RealEstateAgent` (`areaServed`) + `FAQPage` |
| `/blog/[slug]` | `BlogPosting` con `author` (Person real), `datePublished`, `dateModified`, `image`, `publisher` |
| Cualquier página con preguntas | `FAQPage` |
| `/guia-inversion` | `Article` + `FAQPage` + `BreadcrumbList` |
| `/mac` | `SoftwareApplication` + `Organization` |

**`sameAs` es el campo más importante del archivo.** Es la declaración «estos perfiles soy yo».
Debe listar: los cuatro perfiles sociales oficiales, la ficha de Google Business Profile,
los perfiles en portales inmobiliarios y cualquier registro empresarial verificable.
Es la herramienta directa contra la fragmentación de identidad y contra el homónimo.

---

## 6. Capa de acceso — sin esto nada de lo anterior sirve

`robots.txt` debe permitir explícitamente todos los agentes de IA. Un sitio que los bloquea
—por defecto, por plantilla o por CDN— es invisible para los motores generativos por perfecto
que sea su contenido.

Agentes que deben estar permitidos:
`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-User`, `Claude-SearchBot`,
`Google-Extended`, `Googlebot`, `Bingbot`, `PerplexityBot`, `Perplexity-User`,
`Applebot`, `Applebot-Extended`, `CCBot`, `Amazonbot`, `Meta-ExternalAgent`,
`cohere-ai`, `DuckAssistBot`, `Bytespider`, `YouBot`, `Diffbot`, `Timpibot`.

`llms.txt` en la raíz: presentación de la entidad en lenguaje natural + índice de recursos.
Es la única oportunidad de escribir, sin ruido de plantilla, cómo quieres que un modelo te describa.

**IndexNow** para Bing (y por tanto para Copilot): al publicar o modificar una propiedad o
artículo, notificar a `api.indexnow.org`. Es indexación en minutos en vez de semanas y
prácticamente nadie en el sector lo usa.

---

## 7. Vigencia — el segundo factor más fuerte después del acceso

Los modelos descartan agresivamente lo que se autodeclara viejo.

- Ninguna página puede decir «2025» en agosto de 2026. Los años en títulos y cuerpos se
  parametrizan o se revisan trimestralmente.
- `dateModified` real en todo `BlogPosting`, `Article` y `FAQPage`.
- Fecha de corte visible en todo bloque de precios o de mercado.
- Toda propiedad vendida sale del sitemap y devuelve `410` o `301` a su categoría.

---

## 8. Corroboración externa — la mitad que no está en el código

Un modelo no cita lo que solo tú dices de ti mismo. Necesita ver la misma afirmación
en fuentes independientes. Ninguna optimización onsite sustituye esto.

- **Reseñas en Google Business Profile.** Factor número uno. Solicitud sistemática por
  WhatsApp tras cada cierre, pidiendo que mencionen el servicio concreto recibido.
- **Enlaces recíprocos con los negocios del directorio.** La palanca más barata disponible.
- **Enlazado formal cruzado** entre Su Finca Raíz y Conarc, y con cualquier otra marca
  propia del mismo titular (ver §1.5).
- **Consistencia literal de marca** en Fincaraiz, Metrocuadrado y todo portal.
- **Cobertura de prensa regional y proptech** sobre Mac. Es un hecho noticiable real.
- **Datos propios publicados** (informe de precios por municipio). Convierte la marca en
  fuente primaria: los modelos citan a quien origina el dato, no a quien lo repite.

---

## 9. Checklist de aceptación — toda página nueva o modificada

- [ ] `<h1>` único, descriptivo, con anclaje geográfico
- [ ] Respuesta directa de 40–70 palabras autocontenida en el primer párrafo
- [ ] Al menos un bloque de datos verificables con cifra, unidad y fecha
- [ ] Encabezados en forma de pregunta respondidos en las dos primeras frases
- [ ] Cifras importadas de `lib/datos-oficiales.ts`, nunca escritas a mano
- [ ] Todas las cifras presentes en el HTML servido (no solo tras animación)
- [ ] JSON-LD del tipo que corresponde, validado en Rich Results Test
- [ ] `title`, `description`, `og:*` y `twitter:*` específicos de la página y alineados entre sí
- [ ] `og:locale: es_CO` y `og:type` presentes
- [ ] `canonical` correcto
- [ ] Fecha de actualización visible + `dateModified` en el marcado
- [ ] Incluida en el sitemap correspondiente
- [ ] URLs sin espacios sin codificar; rutas limpias donde sea posible
- [ ] Ninguna mención de marca sin anclaje geográfico
- [ ] Si es página de municipio: nunca termina en «0 propiedades»; hay contenido propio
      verificable y fallback a municipios vecinos
- [ ] Ninguna lista de municipios escrita a mano: todas derivadas en tiempo de consulta
- [ ] Ping a IndexNow tras publicar

---

*Versión 7.3 — 14 de agosto de 2026. Su Finca Raíz, La Vega, Cundinamarca.*
