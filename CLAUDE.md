# Su Finca Raíz — instrucciones del repositorio

Antes de crear o modificar cualquier página, componente de contenido o metadato, lee AEO-DOCTRINA.md y cúmplela.

## Qué es este proyecto

Sitio de producción de **Su Finca Raíz**, inmobiliaria de La Vega, Cundinamarca
(Provincia del Gualivá). Next.js 15 con App Router, TypeScript, Prisma sobre
PostgreSQL en Railway, imágenes en Cloudinary, desplegado en Vercel.

## Reglas que no dependen de la doctrina

**Cifras públicas.** Ninguna se escribe a mano en un componente. Todas se
importan de `src/lib/datos-oficiales.ts`. Si una cifra no se puede sustentar, no
se publica: es requisito del Estatuto del Consumidor (Ley 1480 de 2011) y el
criterio por el que un modelo generativo decide si citarnos.

**Valor futuro, rentabilidad y avalúos.** No se publica —ni en una ficha, ni en
un municipio, ni en una vereda, ni por boca de Mac— que un inmueble se valorizará,
cuánta renta dejará o cuánto vale realmente. Tampoco en cualitativo: «alta
valorización», «gran proyección» e «inversión segura» son la misma afirmación sin
el número. La valuación es actividad regulada (Ley 1673 de 2013). El límite está
además dentro de `src/lib/agent/prompt.ts` y `src/lib/agent/expert.ts`, y aplica
aunque el texto de la ficha diga lo contrario.

**Listas de municipios.** No existen escritas a mano. Las tres salidas se derivan
en `src/lib/cobertura.ts`:

| Salida | De dónde sale |
|---|---|
| `areaServed` | Constante: los doce de la provincia (`MUNICIPIOS_PROVINCIA`) |
| Página publicada | Contenido completo + no oculto |
| Filtro del buscador | Consulta de inventario activo |

`oculto` solo puede **impedir** la publicación, nunca forzarla.

**Datos personales.** El registro de visitas guarda cédulas. Se retienen máximo
2 años y se purgan solo (cron + botón manual en `/admin/visitas`). El enlace del
dueño (`/visitantes/<token>`) filtra los campos **en el servidor**: al propietario
solo le llegan nombre, cédula y fecha. Nunca correo, celular ni municipio.

**Copias de seguridad.** `backup-service/` respalda la base a Cloudflare R2 cada
semana. Es la única copia. Ver `backup-service/RESTAURAR.md`.

## Cómo se trabaja aquí

- **Para saber qué está construido: `node scripts/estado-traspaso.mjs`.** Manda
  el script, no TRASPASO-SESION.md — el documento ya acumuló nueve afirmaciones
  falsas de estado, y por eso el estado se deriva.
- El código vive en `C:\sfr\frontend`, no en la carpeta de Google Drive.
- Compilar requiere las variables de `.env.local`.
- `npx prisma db push` para aplicar cambios de esquema (no `migrate dev`).
- Los builds fallan a veces con `PrismaClientKnownRequestError` durante el
  prerender: es un hipo de conexión con Railway, no del código. Reintentar.
- Verificar siempre contra el **HTML servido** (`curl`), no contra el navegador:
  el navegador ejecuta JavaScript, el rastreador no siempre.
