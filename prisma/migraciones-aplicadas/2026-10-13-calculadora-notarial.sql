-- CreateTable
CREATE TABLE "fuentes_normativas" (
    "id" TEXT NOT NULL,
    "dominio" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'OFICIAL',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_compilacion" BOOLEAN NOT NULL DEFAULT false,
    "advertencia" TEXT,
    "agregada_por" TEXT NOT NULL,
    "agregada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuentes_normativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respaldos_normativos" (
    "id" TEXT NOT NULL,
    "ambito" TEXT NOT NULL,
    "referencia_id" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "norma" TEXT NOT NULL,
    "articulo" TEXT,
    "url" TEXT NOT NULL,
    "fuente_id" TEXT,
    "fecha_norma" DATE,
    "caracter" TEXT NOT NULL DEFAULT 'EXIGIDO',
    "vigencia_desde" DATE NOT NULL,
    "vigencia_hasta" DATE,
    "articulo_vigencia" TEXT,
    "nota" TEXT,
    "verificado_por" TEXT NOT NULL,
    "verificado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respaldos_normativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anios_notariales" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "uvt" DECIMAL(14,2),
    "uvb" DECIMAL(14,2),
    "tarifa_iva" DECIMAL(5,2),
    "redondeo_iva_unidad" INTEGER,
    "redondeo_iva_modo" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "version_actualizada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "activado_por" TEXT,
    "activado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anios_notariales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptos_notariales" (
    "id" TEXT NOT NULL,
    "anio_id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "terminos_coloquiales" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grupo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "valor" DECIMAL(14,2),
    "unidad" TEXT,
    "redondeo_unidad" INTEGER,
    "redondeo_modo" TEXT,
    "monotonicidad" TEXT NOT NULL DEFAULT 'LIBRE',
    "grava_iva" BOOLEAN NOT NULL DEFAULT false,
    "precio_incluye_iva" BOOLEAN NOT NULL DEFAULT false,
    "es_recaudo_terceros" BOOLEAN NOT NULL DEFAULT false,
    "sujeto_legal" TEXT NOT NULL,
    "reparto_por_defecto" DECIMAL(5,2) NOT NULL,
    "reparto_editable" BOOLEAN NOT NULL DEFAULT true,
    "motivo_reparto" TEXT NOT NULL,
    "norma_reparto" TEXT,
    "solo_avanzada" BOOLEAN NOT NULL DEFAULT false,
    "opcional" BOOLEAN NOT NULL DEFAULT false,
    "activo_por_defecto" BOOLEAN NOT NULL DEFAULT true,
    "aplica_en_sencilla" BOOLEAN NOT NULL DEFAULT false,
    "es_estimacion_en_sencilla" BOOLEAN NOT NULL DEFAULT false,
    "unidad_label" TEXT,
    "unidad_plural" TEXT,
    "multiplica_cantidad_de" TEXT,
    "unidad_captura_label" TEXT,
    "unidad_captura_plural" TEXT,
    "cantidad_en_sencilla" INTEGER,
    "cantidad_sugerida" INTEGER,
    "cantidad_variable_por_notaria" BOOLEAN NOT NULL DEFAULT false,
    "cantidad_variable_por_operacion" BOOLEAN NOT NULL DEFAULT false,
    "ayuda" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conceptos_notariales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tramos_concepto" (
    "id" TEXT NOT NULL,
    "concepto_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "desde" DECIMAL(18,2) NOT NULL,
    "hasta" DECIMAL(18,2),
    "en_uvt" BOOLEAN NOT NULL DEFAULT false,
    "modo_calculo" TEXT NOT NULL,
    "valor" DECIMAL(14,4) NOT NULL,
    "unidad" TEXT NOT NULL,
    "aporte_snr" DECIMAL(14,2),
    "aporte_fondo" DECIMAL(14,2),
    "valor_en_uvb" DECIMAL(14,4),

    CONSTRAINT "tramos_concepto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_retencion_notarial" (
    "id" TEXT NOT NULL,
    "anio_id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "tipo_efecto" TEXT NOT NULL,
    "valor_efecto" DECIMAL(14,4),
    "unidad" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reglas_retencion_notarial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condiciones_regla_retencion" (
    "id" TEXT NOT NULL,
    "regla_id" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "operador" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "condiciones_regla_retencion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fuentes_normativas_dominio_key" ON "fuentes_normativas"("dominio");

-- CreateIndex
CREATE INDEX "respaldos_normativos_vigencia_desde_idx" ON "respaldos_normativos"("vigencia_desde");

-- CreateIndex
CREATE UNIQUE INDEX "respaldos_normativos_ambito_referencia_id_campo_key" ON "respaldos_normativos"("ambito", "referencia_id", "campo");

-- CreateIndex
CREATE UNIQUE INDEX "anios_notariales_anio_key" ON "anios_notariales"("anio");

-- CreateIndex
CREATE INDEX "conceptos_notariales_anio_id_orden_idx" ON "conceptos_notariales"("anio_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "conceptos_notariales_anio_id_clave_key" ON "conceptos_notariales"("anio_id", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "tramos_concepto_concepto_id_orden_key" ON "tramos_concepto"("concepto_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "reglas_retencion_notarial_anio_id_clave_key" ON "reglas_retencion_notarial"("anio_id", "clave");

-- AddForeignKey
ALTER TABLE "respaldos_normativos" ADD CONSTRAINT "respaldos_normativos_fuente_id_fkey" FOREIGN KEY ("fuente_id") REFERENCES "fuentes_normativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptos_notariales" ADD CONSTRAINT "conceptos_notariales_anio_id_fkey" FOREIGN KEY ("anio_id") REFERENCES "anios_notariales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptos_notariales" ADD CONSTRAINT "conceptos_notariales_anio_id_multiplica_cantidad_de_fkey" FOREIGN KEY ("anio_id", "multiplica_cantidad_de") REFERENCES "conceptos_notariales"("anio_id", "clave") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tramos_concepto" ADD CONSTRAINT "tramos_concepto_concepto_id_fkey" FOREIGN KEY ("concepto_id") REFERENCES "conceptos_notariales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_retencion_notarial" ADD CONSTRAINT "reglas_retencion_notarial_anio_id_fkey" FOREIGN KEY ("anio_id") REFERENCES "anios_notariales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condiciones_regla_retencion" ADD CONSTRAINT "condiciones_regla_retencion_regla_id_fkey" FOREIGN KEY ("regla_id") REFERENCES "reglas_retencion_notarial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

