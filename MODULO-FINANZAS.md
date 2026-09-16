# Módulo tributario y financiero

> **La fuente de verdad del esquema es `prisma/schema.prisma`.** Este documento
> guarda el *porqué* de las decisiones, no una copia del esquema: una copia se
> desincroniza, que es justo el error que el módulo entero persigue.
>
> El SQL de cada migración aplicada queda en `prisma/migraciones-aplicadas/`.

## El principio que gobierna todo

Ninguna tarifa, porcentaje ni valor tributario vive en el código ni en el
esquema. Todos son **parámetros por año fiscal**, cargados desde el panel, y
nacen **vacíos**. Si falta el parámetro del año, el cálculo **se detiene y
avisa**: no cae al año anterior, no asume cero. Calcular con la tarifa
equivocada produce una declaración mal presentada, y ese error no se ve hasta
que lo ve la DIAN.

Es la misma regla del contenido: lo que cambia se deriva, no se escribe.

## Qué se GUARDA y qué se DERIVA

La regla «nunca guardes un total que pueda divergir de sus componentes» necesita
un matiz, porque hay dos cosas distintas:

- **Se GUARDA lo que ocurrió.** Las retenciones que la contraparte practicó
  constan en su comprobante: son **hechos**, no cálculos nuestros, y pueden
  diferir de lo que calculamos. El sistema guarda además **lo que sugirió** en
  el momento del registro, y **avisa cuando difieren**. Si guardáramos solo el
  cálculo, la contabilidad dejaría de cuadrar con los soportes.
- **Se DERIVA siempre:** valor neto, valor pagado, costo, utilidad, bases
  gravables y totales. Por eso `valor_neto_recibido` y `valor_pagado` **no
  existen** como columnas.
- **La discrepancia tampoco se guarda**: se deriva de practicada − sugerida.
  Un cliente que retiene de más es dinero recuperable; uno que retiene de menos
  deja un saldo que la DIAN cobrará. Ambos casos tienen que verse.

## IVA — Su Finca Raíz no es responsable, pero eso es un parámetro

`ParametroFiscal.responsable_iva` es **nullable**: `null` significa *sin
decidir* y **bloquea la activación del año**. Un `false` por defecto silencioso,
en un año donde sí se cruzaron los topes, es exactamente el error que nadie ve.

Con la bandera en `false`:

- **No se factura IVA.** `calcularIva()` devuelve 0 aunque haya tarifa cargada.
- **El IVA pagado es COSTO, no crédito.** Por eso el campo se llama
  `iva_pagado` y no `iva_descontable`: el nombre viejo habría dicho una cosa y
  el cálculo otra. `costoEgreso()` es la función que depende de la bandera —
  usar `valor_base` a secas subestimaría cada egreso en el 19 %.
- **No hay reteIVA en ninguna dirección.** No somos agentes de retención de IVA
  (no la practicamos) y, como no cobramos IVA, tampoco hay nada que retenernos.
  Va bajo la **misma** bandera, no necesita una propia.
- **El reporte 5 (IVA generado vs descontable) no se elimina: se condiciona.**
  Borrarlo obligaría a reescribirlo el día que la bandera cambie.

## Borrador y activación

`ParametroFiscal.estado` = `BORRADOR | ACTIVO`. El borrador permite trabajar a
medias sin bloquearse; el cálculo **exige ACTIVO**.

**`pendientesParaActivar()` es la única fuente** de «qué falta». La usan a la
vez la pantalla (para pintar la lista) y la activación (para validar), y además
la guarda de cálculo la vuelve a aplicar — así un año activado a mano desde la
base tampoco pasa.

La garantía no es una convención documentada: `activarAnio()` exige un
`ParametroActivable`, un tipo que **solo** produce `verificarActivable()`. Es el
compilador impidiendo que alguien active saltándose la validación.

### Obligatorios para activar un año

| Campo | Cuándo |
|---|---|
| `uvt` | Siempre — sin él no hay base mínima, que es la regla central |
| `responsable_iva` decidido | Siempre — no se asume que no |
| Al menos un `ConceptoRetencion` | Siempre — sin conceptos no se retiene nada |
| `tarifa_iva` | Solo si `responsable_iva = true` |

Las `TarifaIca` **no** bloquean la activación: no se puede saber por adelantado
en qué municipios habrá ingresos. El cálculo de reteICA lanza en el punto de uso
si falta la del municipio — misma guarda, aplicada donde sí se conoce el dato.

## Reglas de cálculo que están implementadas explícitamente

- **Base mínima en UVT**: si la base no supera el mínimo del año, **no se
  retiene**. Es de las que más se olvidan.
- **Autorretenedor**: no se le practica retención.
- **Concepto no configurado**: lanza, no asume una tarifa por defecto.
- **Frontera BigInt ↔ Decimal** (`lib/finanzas/dinero.ts`): `price_cop` es
  BigInt (pesos enteros), el módulo es Decimal(16,2) porque IVA y retenciones
  producen centavos. Todo cruce pasa por ese archivo; fuera de él **nunca** se
  usa `Number(price_cop)`.
- **Custodia**: el estado de resultados **falla, no omite**, si hay un
  `MovimientoCustodia` APLICADO sin ingreso enlazado. Es dinero causado sin
  declarar, y un reporte con un hueco es peor que uno que no se emite.

Todas se prueban **rompiéndolas** en `scripts/probar-finanzas.mjs`.

## Anticipos y arras

`MovimientoCustodia` es una tabla **aparte**, no una bandera en `Ingreso`. Con
una bandera, la fila seguiría viviendo en `ingresos` y cada consulta, suma y
reporte tendría que acordarse de excluirla: un `WHERE` olvidado infla la base
gravable y produce un impuesto que no se debe. En tabla aparte el error es
estructuralmente imposible.

**Regla:** aquí solo entra dinero **sin causación**. En cuanto hay causación,
deja de ser custodia y nace un `Ingreso`. Por eso el modelo no tiene campos de
IVA: si los necesitara, ya no era custodia.

## Comisión compartida

Las filas de `DistribucionComision` suman siempre la comisión **total**,
incluida la parte propia. Lo que cambia es qué se factura:

- `facturamos_total = true` → el ingreso es el total y cada parte ajena genera
  un **egreso** (con la retención que le practicamos).
- `facturamos_total = false` → el ingreso es solo nuestra parte y las ajenas son
  informativas: no tocan la base gravable, pero sí la rentabilidad real.

## Enlace del contador

Reutiliza el mecanismo probado de `EnlaceVisitantes` (token de 256 bits, PIN con
bcrypt, bloqueo por intentos, sesión JWT con **scope propio**). Añade:

- **Alcance por periodo.** El rango sale **siempre** de la fila del enlace. El
  endpoint **no acepta fechas**, así que no hay parámetro que manipular.
- **Un token inválido, expirado, revocado o bloqueado responde lo mismo**: no
  se revela si el token existió.
- **Bitácora de accesos** con retención de **12 meses**: cumplido el plazo el
  cron **anonimiza** (ip y userAgent a null) y **conserva** fecha y enlace. El
  rastro de auditoría sobrevive; el dato personal no se retiene de más.
  Declarado en la política de tratamiento, numeral 4.

## Orden de construcción

1. **Parámetros fiscales** — primero: sin ella no calcula nada
2. Terceros
3. Captura de egresos (tres toques + foto del soporte)
4. Captura de ingresos con distribución de comisión
5. Custodia
6. Reportes, empezando por el 1, 8 y 9

**Los reportes no se construyen hasta que haya datos reales**: un reporte
probado con datos inventados es un reporte no probado.
