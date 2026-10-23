# Lo que el sistema debería hacer solo

**Para que lo responda Leonel, en voz alta.** 15 preguntas, ninguna técnica.

---

## Por qué existe este documento

El 23 de octubre de 2026 se descubrió que 9 de los 12 leads de los últimos
60 días no habían generado ningún aviso. La causa no fue un fallo: la ruta por
donde entran los formularios públicos **no tenía ni una línea de notificación.
Nunca la tuvo.**

Y lo importante no es ese defecto, que ya está arreglado, sino lo que enseñó:

> Una llamada que falta no tiene sintaxis.

Ninguna herramienta del repositorio podía encontrarlo, porque **la respuesta no
está en el código**. Las demás trampas del proyecto se cazan preguntando «¿se
llega hasta ahí?»; ésta solo preguntando «¿esto debería existir?» — y esa
pregunta no se le puede hacer al código. Se le hace al negocio.

El problema es que la lista de lo que el sistema debería hacer solo **no existe
en ninguna parte**: vive en la cabeza de Leonel. Mientras siga ahí, el único
modo de encontrar uno de estos defectos es que un cliente se pierda.

Así que esto no es un inventario de lo que hay. **Es la pregunta.** Cuando esté
respondido, cada respuesta se compara con el código, y lo que no exista es otro
de los nueve.

---

## Las 15 preguntas

### Cuando entra un cliente

1. **Cuando alguien llena un formulario de la web, ¿quién tiene que enterarse,
   por dónde, y en cuánto tiempo?** (¿solo tú? ¿un asesor también? ¿WhatsApp,
   correo, los dos?)

2. **Si ese aviso no sale, ¿qué debería pasar entonces?** ¿Que se reintente?
   ¿Que te llegue por otro camino? ¿O que quede marcado en el panel y ya?

3. **¿Hay algún tipo de contacto que NO merezca aviso?** Por ejemplo quien
   descarga la guía de inversión, o quien no deja teléfono.

4. **Si un cliente lleva días sin que nadie lo llame, ¿debería saltar algo?**
   ¿A los cuántos días?

### Cuando se agenda una visita

5. **Cuando alguien agenda una visita, ¿quién se entera?** ¿Y el dueño de la
   finca, se entera solo o se lo dices tú?

6. **El día antes de una visita, ¿debería llegarte un recordatorio?** ¿Y al
   cliente?

### Cuando se mueve una propiedad

7. **Cuando se sube o se publica una propiedad, ¿se avisa a alguien?** (al
   dueño, a ti, a nadie)

8. **Cuando una propiedad se vende o se retira, ¿hay que avisar a alguien?**

9. **Si una propiedad lleva mucho tiempo publicada sin que nadie pregunte por
   ella, ¿quieres saberlo?** ¿Cada cuánto?

### Lo que debería llegar sin pedirlo

10. **¿Qué te debería llegar cada día sin que lo pidas?**

11. **¿Y cada semana? ¿Y cada mes?**

### Los demás

12. **Al dueño de una finca, ¿qué se le debe comunicar automáticamente, y
    cuándo?** (visitas, interesados, nada)

13. **¿Hay alguien más que debería recibir algo solo?** (el contador, un
    abogado, un asesor)

### Cuando algo se rompe

14. **Cuando algo del sistema falla —no se guarda una foto, caduca una clave,
    se cae la base—, ¿quién se entera y cómo?**

15. **¿Qué haces hoy a mano, todos los días o todas las semanas, que el sistema
    debería hacer solo?**

---

## Lo que el código hace HOY

Medido el 2026-10-23 leyendo los archivos, no de memoria. Esto **no** sustituye
las respuestas: sirve para que, al contestar, se vea de inmediato cuáles ya
están y cuáles no.

Todo lo que el sistema envía hoy sale por **un solo canal, WhatsApp**, y a
**un solo destinatario**, `ALERT_WHATSAPP_TO`. No hay correo: no existe
`nodemailer`, ni `resend`, ni ningún otro envío en el repositorio.

| # | Pregunta | Qué existe hoy |
|---|---|---|
| 1 | lead → ¿quién se entera? | **Existe desde hoy.** Antes no: `/api/leads` no avisaba. Ahora avisa por WhatsApp a `ALERT_WHATSAPP_TO` y deja constancia. Un solo destinatario, un solo canal. |
| 2 | si el aviso no sale | **A medias.** Queda escrito el motivo y el lead se marca en el panel. **No hay reintento y no hay segundo canal.** |
| 3 | contactos sin aviso | **No está decidido.** Hoy avisan todos, incluidos los de `guia-inversion` y los que entran sin teléfono (hay uno así, del 25 de agosto). |
| 4 | lead sin llamar X días | **NO EXISTE.** Nada vigila la antigüedad de un lead sin contactar. |
| 5 | visita agendada | **NO EXISTE.** `/api/visitas` crea la visita y no avisa a nadie — ni a ti ni al dueño. |
| 6 | recordatorio de visita | **NO EXISTE.** |
| 7 | propiedad subida o publicada | **NO EXISTE.** Ni `POST /api/admin/properties` ni el `PATCH` de `[id]` envían nada. |
| 8 | propiedad vendida o retirada | **NO EXISTE.** |
| 9 | propiedad estancada | **NO EXISTE.** |
| 10 | algo cada día | **A medias.** Dos crons diarios: `purge-visitas` (4:00) y `vigilancia` (13:00). El segundo avisa de contenido pendiente, del pool de conexiones y de la salud de Redis — pero **solo cuando hay algo malo**. No hay un resumen diario de actividad. |
| 11 | algo cada semana o cada mes | **NO EXISTE.** El plan Hobby de Vercel limita los crons a uno diario. |
| 12 | avisos al dueño de la finca | **NO EXISTE** de forma automática. El enlace del dueño existe, pero él tiene que entrar a mirarlo. |
| 13 | contador, abogado, asesor | **NO EXISTE.** El enlace del contador está en el tablero, sin construir. |
| 14 | fallos del sistema | **A medias.** El cron de vigilancia avisa del pool agotado y de Redis. Nada avisa de una foto que no subió, de un token caducado, ni de un despliegue fallido. |
| 15 | lo que hoy haces a mano | **Sin respuesta posible desde el código.** Ésta es la pregunta cuya respuesta solo tiene Leonel, y probablemente la más rentable de las quince. |

### El recuento

De las 15, hoy: **2 existen** (1 desde hace unas horas), **4 a medias**,
**8 no existen**, y **1 no se puede responder sin él**.

Cada «NO EXISTE» de esa columna **es o no es un defecto según lo que Leonel
conteste**, y hasta que conteste no se puede saber. Eso es exactamente lo que
hace a esta clase distinta de todas las demás del proyecto: el repositorio no
tiene la respuesta, y por eso ninguna guarda puede inventarla.

### Lo que no se va a hacer con esto

No construir nada a partir de esta tabla. Un «NO EXISTE» no es una tarea
todavía: puede que Leonel diga que no hace falta, y entonces la respuesta
correcta es anotar **por qué no hace falta**, para que nadie lo vuelva a
preguntar dentro de un año.
