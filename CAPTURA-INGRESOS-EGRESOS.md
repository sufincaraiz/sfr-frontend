# Captura de ingresos y egresos — diseño para aprobación

> Estado: **APROBADO Y EN CONSTRUCCIÓN** (2026-09-21).
>
> Decisiones del titular: sin señal → **opción B** (cola local con reintento y
> aviso imposible de ignorar); recibos → **carpeta privada con enlaces firmados
> de vida corta**, declarado en la política de datos; CIIU en blanco → vale
> «todas las actividades» **solo en TarifaIca**; en un INGRESO significa NO
> CALCULABLE y el cálculo se detiene.
>
> Ya construido: migración (CIIU, naturalezas, reembolsos, `soporte_public_id`),
> guardas `gastoDeResultado` y `calcularIca` (probadas rompiéndolas), captura
> móvil de egresos, listado, por-cobrar, cola local, recibos privados por proxy,
> CIIU en el formulario del contador y en los parámetros.
>
> Pendiente del siguiente lote: pantalla de terceros, captura de ingresos con
> CIIU heredado del tipo de servicio, y los reportes (solo con datos reales).

Contexto confirmado del RUT: persona natural, régimen ordinario (resp. 05), **no
responsable de IVA** (resp. 49), inicio de actividad 2018-05-10, código postal
253610. NIT, dígito de verificación y razón social **no van en el código**: se
leen de `EMPRESA_NIT`, `EMPRESA_DV` y `EMPRESA_RAZON_SOCIAL` (Vercel y
`.env.local`). Sin ellas, el encabezado sigue diciendo PENDIENTE y el reporte
sale marcado no válido, que es el comportamiento que ya existe.

---

## 1 · Las tres naturalezas del egreso

```
enum NaturalezaEgreso {
  DEL_NEGOCIO    // gasto general: internet, papelería, arriendo
  DE_OPERACION   // gasto propio imputado a una propiedad u operación
  REEMBOLSABLE   // pagado por cuenta del cliente: NO es gasto, es por cobrar
}
enum EstadoReembolso { PENDIENTE, REEMBOLSADO, ASUMIDO }
```

Campos nuevos en `Egreso`:

| Campo | Para qué |
|---|---|
| `naturaleza NaturalezaEgreso @default(DEL_NEGOCIO)` | Quién lo paga al final |
| `reembolsa_tercero_id String?` | Cliente que devuelve la plata (solo REEMBOLSABLE) |
| `estado_reembolso EstadoReembolso?` | PENDIENTE al crear un reembolsable |
| `fecha_reembolso DateTime?` | Cuándo devolvió |
| `reclasificado_de NaturalezaEgreso?` · `reclasificado_por String?` · `reclasificado_en DateTime?` · `motivo_reclasificacion String?` | Rastro de «el cliente no pagó, lo absorbió el negocio» |
| `por_completar Boolean @default(false)` | Capturado en la calle sin los datos opcionales |

### Cómo convive con `MovimientoCustodia`

Son la misma idea aplicada a los dos sentidos del dinero, y por eso **no se
mezclan**:

| | `MovimientoCustodia` | `Egreso` REEMBOLSABLE |
|---|---|---|
| Dirección | Dinero que ENTRA y no es nuestro | Dinero que SALE y no es nuestro gasto |
| En el balance | Pasivo: se lo debemos a alguien | Activo: alguien nos lo debe |
| En el estado de resultados | No aparece | No aparece |
| Cómo termina | ENTREGADO, DEVUELTO o APLICADO (si se causa, nace un `Ingreso`) | REEMBOLSADO (el cliente pagó) o ASUMIDO (reclasificado a DE_OPERACION) |

La simetría importa: en custodia el error sería contar como ingreso lo que
solo estamos guardando; aquí, contar como gasto lo que solo estamos
adelantando. **Los dos inflan las cifras y hacen pagar impuesto sobre plata que
no se ganó.** Un reembolsable **no** genera `MovimientoCustodia` y su reembolso
**no** genera `Ingreso`: solo cambia `estado_reembolso` y `fecha_reembolso`.

Cuando el reembolsable se reclasifica a DE_OPERACION, ahí sí pasa a ser gasto,
con `reclasificado_de = REEMBOLSABLE` y quién y cuándo lo hizo.

### La guarda (se probará rompiéndola ANTES de arreglar nada)

En el módulo hoja de cálculo, junto a `costoEgreso()`:

```ts
// Un REEMBOLSABLE que llega al estado de resultados no se corrige: se detiene.
export function gastoDeResultado(e: EgresoLike): Decimal {
  if (e.naturaleza === 'REEMBOLSABLE') {
    throw new ErrorNaturalezaEgreso(
      `Egreso ${e.id} es REEMBOLSABLE (por cobrar a ${…}): no es gasto. ` +
      `Si el cliente no va a pagar, reclasifícalo a DE_OPERACION con motivo.`)
  }
  …
}
```

Toda suma de gastos pasa por esa función; ningún reporte suma `valor_base` por
su cuenta. Pruebas: un reembolsable lanza; el mismo reclasificado suma; la
consulta de «por cobrar» solo trae REEMBOLSABLE PENDIENTE; el total de gastos
del mes no cambia al crear un reembolsable.

Lo que la guarda **no** puede impedir: que alguien registre a mano el reembolso
recibido como un `Ingreso`. Mitigación: no habrá un tipo de servicio
«reembolso», y la pantalla de por-cobrar se salda con un botón, no tecleando un
ingreso.

---

## 2 · CIIU por línea de servicio

El RUT registra 6820 (principal), 5911, 7010 y 6201. La tarifa de ICA depende
de la actividad, así que el CIIU tiene que viajar con cada ingreso.

- `TipoServicio.ciiu String?` — **null = pendiente de que lo confirme el
  contador**. No se precarga ninguna suposición.
- `TarifaIca` pasa a municipio + CIIU.
- `Ingreso.ciiu String?` — **foto del CIIU al momento de causar**, igual que
  `municipio_ica`. Si mañana se corrige el CIIU de un tipo de servicio, los
  ingresos ya declarados no cambian.
- El formulario del contador gana la pregunta: para cada línea de servicio, qué
  CIIU aplica; y la tabla de ICA pasa a pedir municipio + CIIU + tarifa.
- La suposición del titular (6820 comisión y títulos; 5911 dron y
  fotogrametría; 7010 gestión de proyectos) va en el formulario **como
  pregunta con la sugerencia a la vista**, marcada como no confirmada, para que
  él la valide o la corrija. No entra al código como valor por defecto.

### ¿Es aditiva la migración?

Casi. El detalle honesto:

| Paso | ¿Aditivo? |
|---|---|
| `ALTER TABLE tipos_servicio ADD COLUMN ciiu` | Sí |
| `ALTER TABLE ingresos ADD COLUMN ciiu` | Sí |
| `ALTER TABLE tarifas_ica ADD COLUMN ciiu` | Sí |
| `CREATE UNIQUE INDEX (parametro_id, municipio, ciiu)` | Sí |
| `DROP CONSTRAINT tarifas_ica_parametro_id_municipio_key` | **NO**: hay que quitar el único actual, o sería imposible tener dos CIIU en el mismo municipio |
| Enums y columnas de `Egreso` del punto 1 | Sí |

Ese `DROP CONSTRAINT` no borra datos —quita una restricción—, y **hoy
`tarifas_ica` tiene 0 filas**, igual que el resto de tablas de finanzas
(comprobado en la base). Aun así se verificará con `prisma migrate diff` antes
de aplicar, y el SQL queda archivado en `prisma/migraciones-aplicadas/`, que
ahora sí va al repo.

Con `ciiu` nullable, Postgres trata los NULL como distintos, así que el único
de tres columnas no protegería filas sin CIIU. Propuesta: `ciiu String` **no
nulo con `@default("")`**, donde `""` significa «tarifa del municipio sin
distinguir actividad», y la pantalla lo muestra como «todas las actividades».

---

## 3 · Categorías operativas

Precargadas (por un script de siembra, no por la migración: el SQL de
migraciones solo admite estructura):

1. Atención a clientes — almuerzos, refrigerios, cafetería en visitas
2. Transporte a visitas — combustible, peajes, parqueaderos
3. Trámites y documentos — certificados, copias, autenticaciones, notaría, registro
4. Mensajería y envíos
5. Publicidad de una propiedad — pauta, letreros, vallas
6. Fotografía y dron de una propiedad
7. Viáticos

**El orden en pantalla se calcula**, no se fija: número de egresos de esa
categoría en los últimos 90 días, y `orden` solo como desempate inicial. Así la
lista se adapta al uso real sin que nadie la mantenga.

`es_deducible_por_defecto` de «Atención a clientes» queda como pregunta para el
contador (límites de deducibilidad), no como decisión nuestra.

---

## 4 · Captura sin señal — tres opciones y su coste

Las visitas son en veredas. La foto del recibo es lo pesado.

| Opción | Qué da | Qué cuesta | Riesgo |
|---|---|---|---|
| **A. Nada** | El registro falla sin señal y se pierde lo tecleado | 0 | Alto: es justo el caso de uso (visita en vereda) |
| **B. Cola local con reintento** ← recomendada | Al fallar el envío, el egreso y la foto se guardan en IndexedDB. Aparece «3 gastos sin subir · Subir ahora», y se reintenta solo al volver la señal (evento `online`). Nada se pierde | **~1 día**: módulo de cola (hoja, con pruebas), UI del indicador, subida diferida de la foto | Bajo. Limitación honesta: la app tiene que seguir abierta en el navegador; si se cierra la pestaña, la cola espera a la próxima visita a `/admin/finanzas` y sube entonces |
| **C. PWA con service worker y background sync** | La app abre sin señal y sube sola en segundo plano, con la pestaña cerrada | **~2–3 días** | Medio: hay que cachear el shell de admin sin cachear nunca datos financieros, y el service worker introduce versiones viejas servidas desde caché (otra forma de instrumento que engaña). Además background sync no existe en Safari/iOS |

**Recomendación: B ahora.** Cubre el caso real (registrar en la finca y que
suba al volver a la señal o al llegar a casa) con una fracción del coste y sin
service worker. C solo si el uso demuestra que se pierde trabajo con la pestaña
cerrada.

En los tres casos la foto se comprime en el teléfono antes de subir
(`canvas`, lado largo 1600 px, JPEG ~0.7, de ~4 MB a ~300 KB).

### Aparte: la foto del recibo es un documento privado

Hoy las imágenes del sitio suben a Cloudinary con un preset **sin firmar** y
quedan en una URL pública. Para fotos de propiedades está bien; un recibo lleva
nombres, valores y a veces NIT de terceros. Propuesta: subirlos por nuestro
propio endpoint con firma, a una carpeta `finanzas/recibos` de tipo
`authenticated`, y servirlos con URL firmada y caducidad desde el admin.
Coste ~medio día. Si se prefiere arrancar con el preset actual, que sea una
decisión tomada, no un descuido.

---

## 5 · Boceto de la captura en móvil

**Botón flotante `+ Gasto`** abajo a la derecha, visible en todo
`/admin/finanzas`. Un toque abre una hoja a pantalla completa.

```
┌──────────────────────────────┐
│ ✕            Nuevo gasto     │   Paso 1 de 4 ·  ●○○○
│                              │
│         $ 45.000             │   ← teclado numérico del teléfono,
│                              │      fuente grande; el lector de números
│  [ 1 ][ 2 ][ 3 ]             │      colombianos ya acepta 45.000, $45.000,
│  [ 4 ][ 5 ][ 6 ]             │      45000 y 45.000,00
│  [ 7 ][ 8 ][ 9 ]             │
│  [   ][ 0 ][ ⌫ ]             │
│                              │
│  ↺ Repetir el último:        │   ← un toque rellena valor + categoría +
│    Gasolina · $60.000        │      naturaleza del último gasto y salta
└──────────────────────────────┘      al paso 4
```

**Paso 2 · ¿Qué compró?** Seis botones grandes con ícono en dos columnas,
ordenados por uso de los últimos 90 días. Abajo, «Otra categoría ⌄».

**Paso 3 · ¿Quién lo paga?** Tres botones apilados, alto de dedo:

```
┌──────────────────────────────┐
│  🏢  El negocio               │  gasto general
│  🏠  Una operación            │  lo absorbe esta venta
│  💵  Me lo reembolsan         │  el cliente lo devuelve
└──────────────────────────────┘
```

Si se elige una de las dos últimas, aparece en el acto el selector: buscador
arriba y **los recientes primero** (propiedades con actividad, clientes con
egresos recientes). Nada de listas alfabéticas de 200 filas.

**Paso 4 · Foto del recibo.** Un botón grande «📷 Tomar foto» que abre la
cámara trasera directamente (`capture="environment"`). Debajo, «Guardar sin
foto». Al tomarla se ve la miniatura y se comprime mientras tanto.

**Guardar.** Confirmación breve («Guardado · $45.000 Atención a clientes») con
dos acciones: «Añadir detalles» y «Otro gasto». Si no hay señal: «Guardado en
el teléfono · se subirá solo».

Todo lo demás (proveedor, NIT, descripción, número de factura, método de pago)
es opcional: el egreso nace con `por_completar = true`, **cuenta en los
reportes desde el primer momento** y aparece en «Por completar» del hub para
rematarlo en el escritorio.

**Ingreso**: mismo patrón en tres pasos — valor, tipo de servicio (botones),
propiedad o cliente. Retenciones, factura y CIIU heredado quedan para después,
también marcado `por_completar`.

---

## 6 · Pantallas

| Ruta | Contenido |
|---|---|
| `/admin/finanzas` | Resumen del mes, `+ Gasto`, `+ Ingreso`, y los dos pendientes: **por completar** y **por cobrar** |
| `/admin/finanzas/egresos` | Listado con filtros por naturaleza y categoría |
| `/admin/finanzas/ingresos` | Listado |
| `/admin/finanzas/por-cobrar` | Reembolsables PENDIENTE con antigüedad (0-30, 31-60, +60 días) y los botones «Reembolsado» y «Lo asumió el negocio» |
| `/admin/finanzas/terceros` | Alta rápida desde la captura: si el proveedor no existe se crea solo con el nombre, y los datos del RUT se completan después (queda `por_completar`) |

El aviso del hub pierde la ruta `src/lib/finanzas/empresa.ts`: en pantalla de
usuario dirá solo qué falta y que los reportes salen marcados no válidos.

---

## Lo que NO se construye todavía

Reportes. Entran cuando haya datos reales capturados, y se diseñan sobre esos
datos.
