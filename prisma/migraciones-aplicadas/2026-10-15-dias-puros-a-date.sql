-- ════════════════════════════════════════════════════════════════════════════
-- LOS DÍAS PUROS DEJAN DE GUARDARSE EN COLUMNAS DE INSTANTE
-- ════════════════════════════════════════════════════════════════════════════
--
-- ⚠⚠ ESTA MIGRACIÓN CORRIGE DATOS, NO SOLO TIPOS. Es la primera que lo hace, y
-- va dicho aquí porque la regla del repositorio es que las migraciones
-- archivadas son de estructura. Esta es la excepción, y estas son las razones.
--
-- EL DEFECTO. Nada fija `TZ` en el repositorio: la máquina de desarrollo es
-- UTC−5 y Vercel es UTC. Un gasto capturado a las 19:36 de Colombia se guardaba
-- como `2026-09-22 00:36` y se archivaba en el día siguiente. Lo mismo valdría
-- para el año fiscal: un movimiento de las 20:00 del 31 de diciembre caía en el
-- año siguiente.
--
-- LA CAUSA RAÍZ no era la zona: era que un DÍA DEL CALENDARIO y un INSTANTE se
-- guardaban en la misma columna. El día es lo que una persona teclea; el
-- instante es lo que el sistema anota solo, y ese ya vive en `created_at`, que
-- sí es verdadero. La hora en una columna de día era precisión falsa.
--
-- Y la prueba de que la forma correcta ya existía está en esta misma base:
-- `respaldos_normativos.vigencia_desde`, `vigencia_hasta`, `fecha_norma` y
-- `obtenido_en` son DATE desde el principio, mientras `verificado_en` —que sí
-- es un instante— es timestamp. El módulo notarial lo hizo bien y el financiero
-- no lo copió.
--
-- ⚠ POR QUÉ NO SE USA EL CAST POR DEFECTO.
--
-- `ALTER COLUMN ... SET DATA TYPE DATE` —lo que propone `prisma migrate diff`—
-- aplica `fecha::date`, que recorta en UTC. Para la fila de las 00:36 daría
-- `2026-09-22`, que es el día EQUIVOCADO: el gasto se hizo el 21 en Colombia.
-- La conversión correcta reinterpreta el instante en la zona del negocio:
--
--     (fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date
--
-- QUÉ FILAS CAMBIAN DE DÍA, medido antes de aplicar:
--
--     egresos f5f06794   2026-09-22 00:36  →  2026-09-21   ← CAMBIA
--     egresos a557ffbe   2026-09-21 23:50  →  2026-09-21     igual
--     ingresos, enlaces_contador, movimientos_custodia, mac_knowledge: 0 filas
--
-- UNA fila cambia de día, y cambia para quedar bien.
--
-- VUELTA ATRÁS: las filas vivas se exportaron antes, FUERA del árbol del
-- repositorio —`C:\sfr\respaldos-de-datos\2026-10-15-antes-de-migrar-fechas.json`,
-- porque un volcado con NITs de terceros no entra en una historia permanente;
-- ver `scripts/verificar-volcados.mjs`—. Volver atrás es cambiar los tipos a
-- `timestamp` y restaurar desde ese archivo.
--
-- LO QUE ESTO NO ARREGLA, y hace falta además: Prisma devuelve una columna DATE
-- como `Date` de JavaScript a medianoche UTC, así que `.getFullYear()` sobre
-- ella SIGUE moviéndose con la zona del proceso. El patrón completo son dos
-- piezas: esta columna y leerla como cadena con `toISOString().slice(0, 10)`.
-- Ver `src/lib/dia-colombia.ts`.
-- ════════════════════════════════════════════════════════════════════════════

-- Gastos: el día del gasto y el día del reembolso.
ALTER TABLE "egresos"
  ALTER COLUMN "fecha" TYPE DATE
    USING ("fecha" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date,
  ALTER COLUMN "fecha_reembolso" TYPE DATE
    USING ("fecha_reembolso" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date;

-- Ingresos: causación y recaudo.
ALTER TABLE "ingresos"
  ALTER COLUMN "fecha_causacion" TYPE DATE
    USING ("fecha_causacion" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date,
  ALTER COLUMN "fecha_recaudo" TYPE DATE
    USING ("fecha_recaudo" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date;

-- El periodo de un reporte es un rango de DÍAS, no de instantes.
ALTER TABLE "enlaces_contador"
  ALTER COLUMN "periodo_desde" TYPE DATE
    USING ("periodo_desde" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date,
  ALTER COLUMN "periodo_hasta" TYPE DATE
    USING ("periodo_hasta" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date;

-- Custodia: las dos son el día que la persona declara. El instante de registro
-- ya está en created_at y ese sí es verdadero.
ALTER TABLE "movimientos_custodia"
  ALTER COLUMN "fecha_recibido" TYPE DATE
    USING ("fecha_recibido" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date,
  ALTER COLUMN "fecha_cierre" TYPE DATE
    USING ("fecha_cierre" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date;

-- La vigencia de una ficha de Mac sale de un <input type="date">: día puro.
ALTER TABLE "mac_knowledge"
  ALTER COLUMN "vigente_hasta" TYPE DATE
    USING ("vigente_hasta" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date;
