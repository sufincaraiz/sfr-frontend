-- ─────────────────────────────────────────────────────────────────────────────
-- LAS CUATRO BANDERAS DEL RUT ADMITEN «NO SE SABE»
--
-- 2026-10-19. ESTRUCTURA SOLO: no toca ni una fila de datos, y no puede
-- tocarla, porque `terceros` tiene CERO filas en producción (consultado el
-- 2026-10-19). Es el momento más barato posible para este cambio: no hay
-- retrocarga que decidir ni ambigüedad que heredar.
--
-- ⚠ QUÉ ESTABA MAL. El esquema decía esto:
--
--     -- ── Banderas del RUT. NO se infieren: se capturan del RUT del tercero.
--     es_declarante_renta   Boolean @default(false)
--
-- El comentario prohíbe inferir y la línea siguiente infiere. Un `Boolean` no
-- tiene tercer estado, así que un tercero creado sin esos datos NACÍA
-- afirmando que no declara renta — y `es_declarante_renta` ELIGE la tarifa de
-- retención (`finanzas/calculo.ts`: `esDeclaranteRenta ? tarifa_declarante :
-- tarifa_no_declarante`). Un dato que nadie capturó decidía una cifra fiscal.
--
-- Es el mismo principio que ya gobierna el módulo notarial —ninguna cifra sin
-- su respaldo activa nada— y que `calcularIva` ya aplicaba dos funciones más
-- abajo: «no se ha decidido si el año es responsable de IVA → se detiene, no se
-- asume que no lo es». Esto lo extiende a las banderas del tercero.
--
-- DESPUÉS DE ESTA MIGRACIÓN hay tres estados y el motor los distingue:
--   NULL   no se sabe  → el cálculo NO elige tarifa: se detiene y el
--                        movimiento queda anotado sin sugerido
--   true   declara
--   false  no declara  → ahora es una AFIRMACIÓN, no un valor por defecto
--
-- Se quita el DEFAULT a propósito: dejarlo en `false` mantendría el defecto con
-- una columna nullable al lado.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "terceros" ALTER COLUMN "es_responsable_iva"    DROP DEFAULT;
ALTER TABLE "terceros" ALTER COLUMN "es_responsable_iva"    DROP NOT NULL;

ALTER TABLE "terceros" ALTER COLUMN "es_autorretenedor"     DROP DEFAULT;
ALTER TABLE "terceros" ALTER COLUMN "es_autorretenedor"     DROP NOT NULL;

ALTER TABLE "terceros" ALTER COLUMN "es_gran_contribuyente" DROP DEFAULT;
ALTER TABLE "terceros" ALTER COLUMN "es_gran_contribuyente" DROP NOT NULL;

ALTER TABLE "terceros" ALTER COLUMN "es_declarante_renta"   DROP DEFAULT;
ALTER TABLE "terceros" ALTER COLUMN "es_declarante_renta"   DROP NOT NULL;

-- Comprobación: las cuatro tienen que quedar nullable y sin default.
-- SELECT column_name, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'terceros'
--    AND column_name IN ('es_responsable_iva','es_autorretenedor',
--                        'es_gran_contribuyente','es_declarante_renta');
