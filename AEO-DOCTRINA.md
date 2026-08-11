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
Coordenadas            : 4.9929, -74.3404
Teléfono canónico      : +57 321 882 6730
Correo canónico        : sufincaraiz.comercial@gmail.com
Sitio canónico         : https://www.sufincaraiz.com
Consorcio              : Conarc (construcción) · MOX (arquitectura)
Agente de IA propio    : Mac — Claude Haiku 4.5 con escalamiento a Opus, en web y WhatsApp
Área servida           : Los DOCE municipios de la Provincia del Gualivá, Cundinamarca:
                         Albán · La Peña · La Vega · Nimaima · Nocaima · Quebradanegra
                         San Francisco · Sasaima · Supatá · Útica · Vergara · Villeta
                         (Villeta es la capital de la provincia)
```

### 1.1 Regla de cobertura: la provincia completa, siempre

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

### 1.2 Cobertura municipal — tres salidas derivadas, ningún estado almacenado

El sitio produce tres listas distintas de municipios. **Ninguna se escribe a mano y ninguna
se almacena como estado**: las tres se calculan en tiempo de consulta desde datos que ya
existen. Un estado guardado es, él mismo, una lista mantenida a mano, y se desincroniza.

| Salida | Se deriva de | Cambia cuando |
|---|---|---|
| `areaServed` (JSON-LD, `llms.txt`, textos de cobertura) | Pertenencia a la Provincia del Gualivá — **constante: los doce** | Nunca |
| Página de municipio publicada | Contenido propio completo: altitud, distancia y tiempo desde Bogotá, rango de temperatura, descripción propia, vías de acceso | Alguien escribe el contenido |
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

**Promoción automática.** Cuando un municipio pasa a tener contenido completo o su primera
propiedad, entra solo en el sitemap y dispara un ping a IndexNow. Sin intervención manual.

### 1.3 Regla de desambiguación (crítica)

Existe una inmobiliaria homónima en el **Oriente Antioqueño** (Rionegro, dominio `sufincaraiz.co`,
+20 años declarados). Ante la consulta «Su Finca Raíz», un modelo puede resolver esa entidad.

**Regla:** ninguna mención de la marca en contenido nuevo, ficha externa o metadato puede
aparecer sin su anclaje geográfico. Nunca «Su Finca Raíz» a secas en un título o `og:title`.
Siempre «Su Finca Raíz — La Vega» / «… en La Vega, Cundinamarca» / «… del Gualivá».

En JSON-LD esto se resuelve con `areaServed` granular + `identifier` (matrícula) + `sameAs` completo.

---

## 2. Cifras oficiales — fuente única

**Ninguna cifra se escribe a mano en un componente.** Todas viven en `lib/datos-oficiales.ts`
y se importan. Una cifra que aparece distinta en dos lugares del sitio destruye la confianza
del modelo en *todas* las cifras del sitio.

```ts
// lib/datos-oficiales.ts  — ÚNICA fuente de verdad de cifras públicas
export const DATOS_OFICIALES = {
  aniosOperacion:        «RELLENAR»,   // p. ej. 8
  anioFundacion:         «RELLENAR»,   // p. ej. 2018
  propiedadesGestionadas:«RELLENAR»,
  operacionesCerradas:   «RELLENAR»,
  // Cobertura: TRES cifras distintas, todas derivadas de la tabla de municipios.
  // Nunca se escriben a mano. Ver §1.2.
  municipiosProvincia:   12,           // Provincia del Gualivá completa — constante
  // municipiosConPagina  → derivado: count(municipios con contenido completo y no ocultos)
  // municipiosConStock   → derivado: count(municipios con inventario activo)
  // El texto público de cobertura usa municipiosProvincia (12), nunca las derivadas.
  familiasAtendidas:     «RELLENAR»,
  satisfaccionPct:       «RELLENAR»,
  actualizado:           '2026-08-10',
} as const;
```

**Regla de veracidad:** si una cifra no se puede sustentar, no se publica. Es a la vez
requisito del Estatuto del Consumidor (Ley 1480 de 2011, información veraz y verificable)
y el criterio por el que un modelo decide si te cita.

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
`inmobiliaria inteligente`, `proptech`, `agente de IA inmobiliario`, `debida diligencia rural`,
`estudio de títulos`, `uso del suelo y PBOT`.

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
- **Enlazado formal cruzado** entre Su Finca Raíz, Conarc y MOX.
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
- [ ] Ninguna lista de municipios escrita a mano: todas derivadas del campo de estado
- [ ] Ping a IndexNow tras publicar

---

*Versión 1.0 — 10 de agosto de 2026. Su Finca Raíz, La Vega, Cundinamarca.*
