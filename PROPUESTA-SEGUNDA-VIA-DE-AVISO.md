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

**Lo que hay que decidir y no puedo decidir yo:** a qué dirección. El correo del
negocio (`sufincaraiz.comercial@gmail.com`) es el obvio, pero si es la misma
bandeja que Leonel ya tiene llena, el aviso nace siendo paisaje. Vale la pena
una dirección aparte que solo reciba esto.

### Pieza 2 · El pulso semanal (lo que de verdad cierra el agujero)

Un correo semanal que llega **pase lo que pase**, incluso —sobre todo— cuando no
hay nada que contar:

> Esta semana: 3 leads, 3 avisados por WhatsApp, 3 por correo, 0 fallidos.
> Último aviso entregado: miércoles 14:22.

Si una semana **no llega**, eso es información. Es la única forma de distinguir
«no hubo leads» de «el sistema dejó de funcionar», que hoy son el mismo silencio.

Y resuelve el problema circular de las alertas internas: hoy, si WhatsApp muere,
la alerta de que WhatsApp murió saldría por WhatsApp.

**Limitación conocida, y es de verdad:** el plan Hobby de Vercel solo permite
crons diarios. El pulso semanal tendría que ser un cron diario que solo actúa
los lunes, o aceptar que sea diario. Un pulso diario tiene más riesgo de
volverse paisaje —lo acabamos de medir con las 46 noches— así que preferiría
semanal, con la comprobación del día dentro del cron.

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

## Lo que decide el orden

Si Leonel solo quiere una cosa, **la pieza 2** — y es contraintuitivo, porque es
la que no entrega ningún lead. Pero hoy no sabemos si el canal está vivo salvo
cuando entra un cliente, y eso significa que **nos enteraríamos de que está roto
perdiendo un cliente**. Que es, exactamente, como nos enteramos esta vez.
