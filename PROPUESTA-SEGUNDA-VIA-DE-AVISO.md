# Propuesta: una segunda vía para que un lead no dependa de un solo canal

**Propuesta, no implementación.** Nada de esto está construido.

---

Hoy el negocio entero se entera de lo que pasa por **un solo número de WhatsApp
a través de la API de un tercero**, y no hay ningún otro emisor en todo el
repositorio: ni correo, ni SMS, ni notificación push. No existe `nodemailer`, ni
`resend`, ni nada equivalente.

Eso no es falta de redundancia. Es que **si Meta suspende la cuenta, cambia una
política o caduca el token, Su Finca Raíz deja de enterarse de sus propios
clientes — y nadie se entera de que dejó de enterarse.**

Esa segunda mitad es la que importa, y es exactamente el defecto del 23 de
octubre repetido a otra escala. Entonces fue que no había código de aviso;
ahora sería que el único canal murió. En los dos casos el síntoma es el mismo y
es el peor posible: **silencio indistinguible del silencio normal.**

---

## Lo que ya cambió, y lo que no

El arreglo del 23 de octubre dejó dos cosas que esta propuesta aprovecha:

- **La tabla `avisos_lead`** ya guarda un intento por fila, con su canal. La
  columna `canal` existe desde el primer día con `@default("whatsapp")`,
  precisamente para esto.
- **El panel** ya distingue «avisado», «aviso fallido» y «nunca se intentó».

Lo que **no** resuelve: si WhatsApp deja de funcionar, cada lead quedará
correctamente marcado como fallido… en una pantalla que nadie abre porque nadie
recibió el aviso que le diría que la abriera. La constancia sin un segundo canal
es un diario que se escribe solo para el día que alguien pregunte.

---

## Tres principios, antes de elegir herramienta

**1 · Una segunda vía que comparta infraestructura no es una segunda vía.**
Otro proveedor, otra credencial, otro dominio de fallo. Mandar el correo con una
librería que use la misma API de Meta, o alojar las dos credenciales en la misma
variable, deja un único punto de fallo con dos nombres.

**2 · El canal de respaldo tiene que usarse a diario, no solo en la emergencia.**
Ésta es la lección de esta misma sesión, literal: *el único camino instrumentado
era el menos usado, y por eso nadie vio que estaba roto.* Un canal que solo se
enciende en el desastre llega al desastre sin probar. Si el correo solo sale
cuando WhatsApp falla, el día que WhatsApp falle descubriremos que el correo
también.

**3 · Un canal silencioso es indistinguible de un canal muerto.**
Por eso hace falta algo que **demuestre que la cadena sigue viva cuando no pasa
nada**. Una alarma informa de lo malo; lo que falta aquí es lo contrario.

---

## La propuesta, en tres piezas y por orden de valor

### Pieza 1 · El correo como canal paralelo, no como respaldo

**Para cada lead, se intenta WhatsApp Y correo, siempre.** Dos filas en
`avisos_lead`, una por canal. No «correo si WhatsApp falla»: los dos a la vez.

Por qué paralelo y no en cascada, que es lo que suele hacerse:

- cumple el principio 2 sin esfuerzo extra: el correo se ejercita con cada lead;
- un fallo del primero deja de ser crítico, porque el segundo ya salió;
- y permite comparar: si durante dos semanas el correo llega y WhatsApp no, eso
  está en la tabla y se ve sin investigar nada.

El coste de que Leonel reciba dos avisos del mismo lead es trivial comparado con
el de perder uno. Y son **~12 leads cada 60 días**: no hay problema de volumen.

**Herramienta recomendada: Resend.** Dominio propio (`sufincaraiz.com`, que ya
es suyo), API simple, plan gratuito muy por encima de lo que este sitio
necesita, y ninguna relación con Meta. La alternativa —SMTP de Gmail con una
contraseña de aplicación— evita tocar DNS, pero reutiliza la cuenta de Google
que ya sostiene otras cosas del negocio y entrega peor; no la recomiendo.

#### A qué dirección — decidido el 2026-10-25

**Nada de esto va a `sufincaraiz.comercial@gmail.com`.** Esa bandeja tenía 1.932
correos sin leer: ya perdió la pelea, y un aviso que cae ahí nace siendo
paisaje. Dos opciones concretas para que Leonel elija, las dos de coste cero:

**Opción A — dirección propia, fuera del flujo general** *(recomendada)*

`avisos@sufincaraiz.com`, creada con **Cloudflare Email Routing**: gratis,
reenvía a la cuenta que él quiera, y se configura **en el mismo panel de DNS que
ya hay que tocar para verificar el dominio en Resend**. Un solo sitio nuevo, y
se hace de una sentada con la otra tarea.

Ventaja real: la dirección **es** el filtro. No depende de que una regla acierte
a reconocer el mensaje.

**Opción B — solo una regla de Gmail**

Un filtro por remitente → etiqueta «Avisos SFR» + *omitir Recibidos*. Cero DNS,
cinco minutos.

Pero tiene un fallo que hay que decir: **el filtro puede dejar de funcionar en
silencio.** Si cambia el remitente, el aviso vuelve al montón y nada lo anuncia
— es la misma familia de defecto que estuvimos cazando toda la semana.

**Y una trampa que vale para las dos:** sacar el correo de Recibidos lo hace
*más* invisible si nadie mira esa etiqueta. Con cualquiera de las dos hay que
**activar la notificación de esa etiqueta en el móvil**; si no, habremos
cambiado «se pierde entre 1.932» por «está en una carpeta que nadie abre».

### Pieza 2 · El testigo externo que espera el pulso

> ⚠ **Esta pieza está reescrita (2026-10-25).** La primera versión proponía un
> correo semanal que, al no llegar, informaría de que el sistema murió. Está
> mal, y por una razón que ya es regla del proyecto: **le pedía a una persona
> que advirtiera un silencio.** La bandeja de Leonel tenía 1.932 correos sin
> leer; uno que falta ahí no se distingue de los que sobran. Un detector que
> depende de que alguien note una ausencia no es un detector.

**Se invierte: que un servicio de fuera espere el pulso y escriba si no llega.**

El cron diario hace un `GET` a una URL. Si ese ping no llega cuando toca, el
servicio manda el aviso. **La ausencia deja de ser algo que advertir y pasa a
ser un aviso que llega.**

Y cumple el principio 1 mejor que el correo: **no comparte infraestructura con
nada nuestro.** No depende de Vercel, ni de Meta, ni de nuestra base de datos,
ni de nuestro código. Si todo lo nuestro muere a la vez, ése es justo el caso en
que avisa.

#### El servicio: healthchecks.io

Comprobado en su propia página de precios el 2026-10-25, no de memoria:

| | |
|---|---|
| Plan **Hobbyist** | **$0/mes** |
| Trabajos vigilados | **20** (necesitamos 1) |
| Historial | 100 entradas por trabajo |
| Lo que sí es de pago | créditos de SMS, WhatsApp y llamada telefónica |

Está hecho exactamente para esto: vigilar crons por ausencia de ping. Lo que
necesitamos cabe de sobra en el plan gratuito.

**Un dato que NO pude confirmar:** si la integración de **Telegram** está
disponible sin pagar. Su página de precios solo limita por plan los créditos de
SMS, WhatsApp y llamada, así que casi seguro que Telegram no está limitado —
pero «casi seguro» no es comprobado, y se ve en dos segundos en la página de
Integraciones de la cuenta. Lo menciono porque Telegram sería el mejor destino:
llega al teléfono y **no es Meta**, mientras que WhatsApp como destino de la
alerta volvería a meter a Meta en el camino que esta pieza existe para evitar.

#### Aplicando la regla corregida al propio diseño

> ¿Qué tiene que hacer alguien para que este aviso deje de llegar?

- **Al pulso semanal por correo, la respuesta es «nada, llega siempre».** No
  exige ningún acto y se despacha con el mismo gesto. Por eso **deja de ser el
  detector**: pasa a ser el resumen que se lee cuando hay algo que leer. Son dos
  funciones distintas y en la primera versión las había juntado en una.
- **A la alerta del servicio externo, la respuesta es: arreglar el cron, o
  entrar en healthchecks.io y pausar la comprobación a mano.** Eso es un acto, y
  es lo que le da coste a ignorarla.

Pero hay un matiz que la documentación de healthchecks deja claro y conviene no
pasar por alto: **no tiene un ajuste general de aviso repetido.** Por defecto
avisa en la transición, así que una alerta ignorada una vez devuelve el
silencio — el fallo contrario y igual de malo. Tres formas de darle insistencia,
de su propia documentación:

1. **Recordatorios por correo, cada hora o cada día**, sobre cualquier
   comprobación caída (*Account Settings › Email Reports*). Gratis, y convierte
   el aviso en algo que vuelve hasta que se arregla.
2. **Pushover con prioridad «Emergency»**, que repite cada ~5 minutos **hasta
   que alguien lo reconoce**. Ése es literalmente «exige un acto distinto para
   cerrarse». Pushover es una compra única de unos $5 por plataforma, no una
   suscripción.
3. Sistemas de guardia tipo PagerDuty — desproporcionado para este negocio.

**Recomiendo la 1 de entrada** (gratis, y suficiente), y dejar la 2 anotada por
si alguna vez un aviso caído pasa inadvertido.

#### El correo semanal, con su función nueva

Se queda, pero ya no es el detector. Es el resumen:

> Esta semana: 3 leads · 3 avisados por WhatsApp · 3 por correo · 0 fallidos.
> Último aviso entregado: miércoles 14:22.

**Limitación real:** el plan Hobby de Vercel solo permite crons diarios. El
resumen semanal sería un cron diario que solo escribe los lunes. El **ping** al
servicio externo, en cambio, sale todos los días, que es como debe ser: cuanto
más seguido se espera el pulso, antes se nota su falta.

### Pieza 3 · La alerta de racha (barata, y solo si las dos anteriores existen)

Si los últimos **N** intentos de un canal fallaron, avisar por el otro. Tres o
cinco basta; con ~12 leads cada 60 días, una racha de tres fallos ya es señal.

Va tercera a propósito: sin la pieza 1 no hay otro canal por el que avisar, y
sin la pieza 2 esta alerta tiene el mismo problema circular que intenta
resolver. Construida sola, no sirve.

---

## Lo que NO propongo

- **Mandar las alertas internas por los dos canales.** Son ~27 mensajes en 46
  días que ya nadie lee. Duplicarlas es duplicar el paisaje. Las internas se
  quedan en WhatsApp (con su plantilla propia) y el panel; el pulso semanal
  cubre el caso de que ese canal muera.
- **SMS.** Un proveedor más, con coste por mensaje y otra cuenta que mantener,
  para un volumen de 12 leads cada dos meses. No se justifica.
- **Reintentos automáticos de WhatsApp.** Si Meta rechaza, suele ser por una
  causa que un reintegro inmediato no arregla (plantilla, token, número). Un
  reintento enmascara el fallo en los registros y no entrega más. El segundo
  canal resuelve el problema que el reintento intentaría resolver.

---

## Esfuerzo estimado, para decidir con un número

| pieza | trabajo | requisito externo |
|---|---|---|
| 1 · correo paralelo | módulo de envío + canal en `avisarLead` + arnés y mutaciones | cuenta de Resend y **registros DNS** en el dominio |
| 2 · pulso semanal | consulta + plantilla del correo + condición de día en el cron diario | ninguno (reusa la pieza 1) |
| 3 · alerta de racha | consulta sobre `avisos_lead` + el aviso | ninguno |

La pieza 1 es la única que necesita algo de fuera: **verificar el dominio en
Resend tocando DNS**, que lo hace Leonel y tarda lo que tarde la propagación.
Conviene pedirlo con tiempo, igual que la plantilla de Meta.

---

## El orden, decidido el 2026-10-25

**Piezas 1 y 2 juntas** —la 1 salva un lead, la 2 hace verificable a la 1— y la
**3 después**: sin la 1 no hay por dónde avisar, y sin la 2 la 3 es circular.

**Nada se construye hasta que lleguen las dos aprobaciones externas**, que van
en paralelo y las dos dependen de Leonel:

| dependencia | quién | espera |
|---|---|---|
| plantilla `alerta_interna_sfr` | Meta | aprobación |
| dominio verificado en Resend | DNS de `sufincaraiz.com` | propagación |

Mejor nada que código que no se puede probar.

### Cómo se acepta la plantilla nueva

Con **el mismo criterio que la de leads**: no «aprobada» — **llegada**. Un envío
real que llegue al teléfono de Leonel, y el contador que se mueva. Aprobada es
lo que dice Meta de su formulario; llegada es lo que dice el teléfono.

---

## Lo que decide el orden

Si Leonel solo quiere una cosa, **la pieza 2** — y es contraintuitivo, porque es
la que no entrega ningún lead. Pero hoy no sabemos si el canal está vivo salvo
cuando entra un cliente, y eso significa que **nos enteraríamos de que está roto
perdiendo un cliente**. Que es, exactamente, como nos enteramos esta vez.
