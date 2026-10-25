# Tres cosas que solo puedes hacer tú, Leonel

Dos son de dos minutos. La tercera necesita esperar aprobación de Meta, así que
conviene pedirla hoy.

---

## 1 · Crear una plantilla nueva en Meta (es un prerrequisito, no una mejora)

### Por qué

Hoy las alertas internas del sistema —«hay contenido sin revisar», «la base de
datos se está quedando sin conexiones»— salen por `nuevo_lead_sfr`, que es **la
plantilla de leads**. Eso tiene dos problemas, y el segundo es el que bloquea:

1. El mensaje termina diciendo «Ingresa al CRM para darle seguimiento» sobre
   algo que no es un cliente. Es una instrucción que no se puede seguir.
2. **Meta cuenta esas alertas como entregas de la plantilla de leads.** Desde el
   7 de septiembre han salido unas 27. Así que el contador de Meta, que
   queríamos usar como testigo independiente para comprobar que los avisos de
   leads llegan, está mezclando dos cosas distintas.

Mientras compartan plantilla, ese contador no sirve de testigo **aunque
aclaremos el periodo**: no está midiendo lo mismo que nosotros.

### Qué pedir, exactamente

En *business.facebook.com → WhatsApp Manager → Plantillas de mensajes → Crear
plantilla*:

| Campo | Valor |
|---|---|
| **Nombre** | `alerta_interna_sfr` |
| **Categoría** | **Utilidad** (Utility) — la misma que la de leads |
| **Idioma** | **Español (COL)** — `es_CO` |
| Encabezado | ninguno |
| Pie de página | ninguno |
| Botones | ninguno |

**Cuerpo del mensaje** (pégalo tal cual, con las llaves dobles):

```
⚠ Alerta interna de Su Finca Raíz. Esto NO es un cliente.

Qué pasó: {{1}}
Dónde mirar: {{2}}
Detalle: {{3}}

Entra al panel de administración para revisarlo.
```

**Ejemplos** (Meta los pide para aprobar; son solo muestras):

- `{{1}}` → `VIGILANCIA DE CONTENIDO — 46 noches sin corregir`
- `{{2}}` → `panel de administración, sección Vigilancia`
- `{{3}}` → `2 hallazgos sin corregir; el más viejo desde el 7 de septiembre`

### Tres detalles que hacen que Meta la apruebe a la primera

- **El cuerpo no empieza ni termina con una variable**, y cada `{{n}}` va
  precedido de una palabra fija. Meta rechaza las plantillas que no cumplen eso.
- **Las variables van numeradas en orden y sin saltarse ninguna**: 1, 2, 3.
- El símbolo ⚠ va en el **texto fijo**, no dentro de una variable. Así el aviso
  se reconoce aunque el contenido cambie.

### Cuando esté aprobada

Avísame y cableo los cuatro emisores internos para que usen `alerta_interna_sfr`
en vez de la de leads. Son cuatro sitios y no toca nada del aviso de clientes.
A partir de ahí el contador de leads solo cuenta leads, y el cotejo empieza a
tener sentido.

---

## 1-bis · Verificar el dominio en Resend (va en paralelo con lo anterior)

Esto es lo otro que tarda, así que conviene arrancarlo el mismo día. Es para
que el sistema pueda avisarte **también por correo** y no solo por WhatsApp.

1. Crear una cuenta gratuita en **resend.com**.
2. Añadir el dominio **sufincaraiz.com**.
3. Resend dará **tres o cuatro registros DNS** (SPF, DKIM y uno de verificación).
   Hay que pegarlos donde esté el DNS del dominio y esperar a que Resend los dé
   por buenos. Suele tardar minutos, a veces horas.

**Y ya que estás en ese mismo panel de DNS**, deja hecha la dirección donde
quieres recibirlos — hay dos opciones y hay que elegir una:

| | **A · dirección propia** *(la que recomiendo)* | **B · solo una regla de Gmail** |
|---|---|---|
| qué es | `avisos@sufincaraiz.com` con **Cloudflare Email Routing** (gratis), que reenvía a tu correo | un filtro que etiqueta «Avisos SFR» y omite Recibidos |
| coste | 0 | 0 |
| trabajo | se hace en el mismo panel de DNS, de una sentada | cinco minutos en Gmail |
| el riesgo | ninguno: la dirección **es** el filtro | si el remitente cambia, el filtro deja de funcionar **y nada lo avisa** |

**Lo que NO vale, y es decisión tomada:** que esto caiga en
`sufincaraiz.comercial@gmail.com`. Esa bandeja tiene 1.932 sin leer. Un aviso
que llega ahí nace invisible.

**Y una advertencia para cualquiera de las dos:** sacar el correo de Recibidos
lo hace *más* fácil de perder si nadie mira esa carpeta. Hay que **activar la
notificación de esa etiqueta en el móvil**. Si no, habremos cambiado «se pierde
entre 1.932» por «está en una carpeta que nadie abre».

---

## 1-ter · Una cuenta en healthchecks.io (cinco minutos, sin esperas)

Es el vigilante de fuera: el sistema le manda una señal cada día, y **si un día
la señal no llega, él te escribe**. Es lo único que puede avisar de que todo lo
demás murió, porque no depende de nada nuestro.

- Cuenta gratuita en **healthchecks.io**. El plan Hobbyist es **$0** y permite
  20 vigilados; necesitamos 1.
- Cuando entres, mira en **Integraciones** si aparece **Telegram**. Si está,
  ésa es la mejor opción de aviso: te llega al teléfono y **no pasa por Meta**,
  que es justo lo que esta pieza existe para evitar.
- En **Account Settings › Email Reports**, activa los **recordatorios diarios**
  de comprobaciones caídas. Sin eso, el aviso llega una sola vez y si se pasa
  por alto, vuelve el silencio.

Cuando la tengas, pásame la URL de ping y la cableo.

---

## 2 · Mirar de qué periodo es el «1 entregado» (dos minutos)

Cuando viste la plantilla `nuevo_lead_sfr` decía **MENSAJES ENTREGADOS: 1**,
pero esa pantalla tenía arriba un filtro que decía **«Últimos 7 días»**. No
sabemos si esa columna respeta el filtro, y de eso depende todo: si lo respeta,
ese 1 es de una semana; si no, es el total desde el 29 de julio.

**No hace falta entender la pantalla. Haz esto:**

> Cambia el filtro de arriba a otro rango —30 días, 90 días, o «todo el
> tiempo»— y mira si el número cambia.
>
> - **Si cambia** → la columna respeta el filtro. Dime cuánto sale con el rango
>   más largo que te deje elegir.
> - **Si no cambia** → es el histórico, y el 1 es de toda la vida.

Es una prueba de las que no pueden salir mal: no pregunta qué significa la
columna, le cambia una cosa y mira qué pasa.

---

## 3 · Buscar un segundo sitio donde leer lo mismo

En el menú de **WhatsApp Manager** hay una sección aparte de la lista de
plantillas, normalmente llamada **«Estadísticas»** o **«Información general»**.

Si ahí aparece un conteo de **mensajes enviados o entregados por periodo**,
dime qué número sale y de qué fechas.

Eso vale más que entender la columna anterior: serían **dos lecturas de dos
pantallas distintas del mismo hecho**. Si las dos coinciden, el dato es firme
sin que nadie tenga que interpretar nada.

---

## Y una pregunta, que decide en qué gastamos el próximo trabajo

El sistema lleva **46 noches** avisando de dos cosas sin corregir:

1. **«Acceso derivable sin publicar»** — la ficha `finca-el-cural-andres-la-vega`
   (desde el 7 de septiembre).
2. **«Valor futuro»** — la ficha `lote-campestre-parcelacion-nim…`
   (desde el 21 de septiembre).

**¿Esos dos merecen arreglarse?**

- **Si sí**, arréglalos y el problema desaparece solo.
- **Si no** —si la vigilancia los está marcando sin motivo—, entonces lo que hay
  que cambiar es el criterio que los marca, no la forma de avisar.

Lo pregunto antes de tocar nada porque **ninguna forma de avisar arregla algo
que nadie va a tocar**, y no quiero gastar el trabajo en el sitio equivocado.

---

## Lo pendiente de siempre, en una línea

- **Borrar el lead de prueba**: `PRUEBA DE AVISO - borrar`, 3000000000, del 23
  de octubre.
- **Mover de estado los 12 leads que ya llamaste** en el panel. Si no, las filas
  en ámbar se vuelven paisaje — la misma trampa de las 46 noches, en otra
  pantalla.
