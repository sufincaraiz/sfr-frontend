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
- **Mensajes de commit: prosa, sin tablas ni columnas.** Nada de alinear con
  espacios ni de listas de `clave   valor`: el hook las rechaza y tiene razón
  —dos espacios seguidos son indistinguibles de un mensaje mutilado—. Lo que
  pide una tabla va en el traspaso, no en el mensaje. Paró tres commits de
  cuatro por esto.
- **Mensajes de commit: a un archivo y `git commit -F`.** Nunca con `-m` si el
  texto lleva acentos graves: el shell los interpreta como sustitución de
  comandos y se come la palabra sin error visible. Ha pasado cuatro veces. El
  hook `commit-msg` rechaza las dos huellas que deja —doble espacio y espacio
  antes de dos puntos—; en un clon nuevo hay que activarlo una vez:
  `git config core.hooksPath .githooks`
- **«Empujado» y «desplegado» son dos cosas distintas, y no se puede afirmar lo
  segundo sin consultarlo: `npm run deploy:estado`.** Pregunta a Vercel por el
  commit exacto de HEAD y sale con 1 mientras no esté READY. Un build verde en
  esta máquina **no es un hecho sobre el despliegue**: son dos superficies, y el
  2026-10-14 el mismo commit dio verde aquí y recházo allí por los finales de
  línea. Decir «build limpio» sin decir en qué superficie no significa nada.
- **La máquina de desarrollo es Windows y el objetivo es Linux.** Lo que eso
  rompe en silencio —CRLF, mayúsculas en imports, separadores de ruta— lo
  vigila `scripts/verificar-portabilidad.mjs`, dentro del build. Si una
  herramienta escribe CRLF, `git diff` sale **vacío** y los bytes difieren de los
  que tendrá Vercel: `node scripts/normalizar-saltos.mjs --escribir`.
- **Al escribir archivos del repositorio desde Python: `newline='\n'`.** Sin
  eso, `io.open(..., 'w')` traduce cada salto a CRLF en Windows. Es la causa de
  los dos despliegues rechazados del 2026-10-14.
- **Una mutación no cuenta hasta que se demuestra que el contenido cambió.** Las
  mutaciones viven declaradas en `scripts/mutar.mjs` (`npm run mutar`), no en la
  consola: si el texto buscado no está, el resultado es `ERROR_DE_LA_PRUEBA`, no
  «sobrevivió». Pasó cuatro veces en un día.
- **Las guardas del build corren todas y acumulan** (`npm run verificar`). `&&`
  esconde el segundo problema y hace que se descubra uno por despliegue.
- El código vive en `C:\sfr\frontend`, no en la carpeta de Google Drive.
- Compilar requiere las variables de `.env.local`.
- `npx prisma db push` para aplicar cambios de esquema (no `migrate dev`).
- Los builds fallan a veces con `PrismaClientKnownRequestError` durante el
  prerender: es un hipo de conexión con Railway, no del código. Reintentar.
- Verificar siempre contra el **HTML servido** (`curl`), no contra el navegador:
  el navegador ejecuta JavaScript, el rastreador no siempre.
