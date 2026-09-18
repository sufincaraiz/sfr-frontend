-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CC', 'NIT', 'CE', 'PPT', 'PASAPORTE', 'TI');

-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('NATURAL', 'JURIDICA');

-- CreateEnum
CREATE TYPE "RolTercero" AS ENUM ('CLIENTE', 'PROVEEDOR', 'AMBOS', 'ASESOR');

-- CreateEnum
CREATE TYPE "EstadoIngreso" AS ENUM ('CAUSADO', 'FACTURADO', 'COBRADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "NaturalezaCustodia" AS ENUM ('DINERO_DE_TERCEROS', 'ANTICIPO_PROPIO');

-- CreateEnum
CREATE TYPE "EstadoCustodia" AS ENUM ('RECIBIDO', 'ENTREGADO', 'DEVUELTO', 'APLICADO');

-- CreateEnum
CREATE TYPE "RolParticipacion" AS ENUM ('PROPIA', 'CORREDOR_EXTERNO', 'ASESOR_INTERNO');

-- CreateTable
CREATE TABLE "terceros" (
    "id" TEXT NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "numero_documento" TEXT NOT NULL,
    "dv" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo_persona" "TipoPersona" NOT NULL,
    "es_responsable_iva" BOOLEAN NOT NULL DEFAULT false,
    "es_autorretenedor" BOOLEAN NOT NULL DEFAULT false,
    "es_gran_contribuyente" BOOLEAN NOT NULL DEFAULT false,
    "es_declarante_renta" BOOLEAN NOT NULL DEFAULT false,
    "regimen" TEXT,
    "direccion" TEXT,
    "municipio" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "rol" "RolTercero" NOT NULL DEFAULT 'CLIENTE',
    "contacto_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terceros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_fiscales" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "uvt" DECIMAL(14,2),
    "tarifa_iva" DECIMAL(5,2),
    "tarifa_reteiva" DECIMAL(5,2),
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametros_fiscales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptos_retencion" (
    "id" TEXT NOT NULL,
    "parametro_id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tarifa_declarante" DECIMAL(5,2) NOT NULL,
    "tarifa_no_declarante" DECIMAL(5,2) NOT NULL,
    "base_minima_uvt" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "conceptos_retencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifas_ica" (
    "id" TEXT NOT NULL,
    "parametro_id" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "tarifa_por_mil" DECIMAL(6,3) NOT NULL,

    CONSTRAINT "tarifas_ica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_servicio" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "concepto_retencion_sugerido" TEXT,
    "genera_iva" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_egreso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "grupo" TEXT NOT NULL DEFAULT 'variable',
    "es_deducible_por_defecto" BOOLEAN NOT NULL DEFAULT true,
    "genera_iva_descontable" BOOLEAN NOT NULL DEFAULT true,
    "concepto_retencion_sugerido" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_egreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingresos" (
    "id" TEXT NOT NULL,
    "tipo_servicio_id" TEXT NOT NULL,
    "property_id" TEXT,
    "tercero_id" TEXT NOT NULL,
    "fecha_causacion" TIMESTAMP(3) NOT NULL,
    "fecha_recaudo" TIMESTAMP(3),
    "valor_base" DECIMAL(16,2) NOT NULL,
    "iva_generado" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "retefuente_practicada" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "reteica_practicada" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "reteiva_practicada" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "iva_sugerido" DECIMAL(16,2),
    "retefuente_sugerida" DECIMAL(16,2),
    "reteica_sugerida" DECIMAL(16,2),
    "reteiva_sugerida" DECIMAL(16,2),
    "nota_discrepancia" TEXT,
    "numero_factura" TEXT,
    "cufe" TEXT,
    "estado" "EstadoIngreso" NOT NULL DEFAULT 'CAUSADO',
    "municipio_ica" TEXT,
    "facturamos_total" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "registrado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingresos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "egresos" (
    "id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "tercero_id" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "valor_base" DECIMAL(16,2) NOT NULL,
    "iva_descontable" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "retefuente_practicada" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "reteica_practicada" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "reteiva_practicada" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "iva_sugerido" DECIMAL(16,2),
    "retefuente_sugerida" DECIMAL(16,2),
    "reteica_sugerida" DECIMAL(16,2),
    "reteiva_sugerida" DECIMAL(16,2),
    "nota_discrepancia" TEXT,
    "es_deducible" BOOLEAN NOT NULL DEFAULT true,
    "property_id" TEXT,
    "soporte_url" TEXT,
    "metodo_pago" TEXT,
    "numero_factura_proveedor" TEXT,
    "registrado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "egresos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_custodia" (
    "id" TEXT NOT NULL,
    "naturaleza" "NaturalezaCustodia" NOT NULL,
    "concepto" TEXT NOT NULL,
    "tercero_id" TEXT NOT NULL,
    "property_id" TEXT,
    "fecha_recibido" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(16,2) NOT NULL,
    "estado" "EstadoCustodia" NOT NULL DEFAULT 'RECIBIDO',
    "fecha_cierre" TIMESTAMP(3),
    "entregado_a_tercero_id" TEXT,
    "ingreso_id" TEXT,
    "soporte_url" TEXT,
    "notas" TEXT,
    "registrado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimientos_custodia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribuciones_comision" (
    "id" TEXT NOT NULL,
    "ingreso_id" TEXT NOT NULL,
    "tercero_id" TEXT,
    "rol" "RolParticipacion" NOT NULL,
    "porcentaje" DECIMAL(5,2),
    "valor" DECIMAL(16,2) NOT NULL,
    "genera_egreso" BOOLEAN NOT NULL DEFAULT false,
    "egreso_id" TEXT,
    "notas" TEXT,

    CONSTRAINT "distribuciones_comision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "terceros_contacto_id_key" ON "terceros"("contacto_id");

-- CreateIndex
CREATE INDEX "terceros_nombre_idx" ON "terceros"("nombre");

-- CreateIndex
CREATE INDEX "terceros_rol_idx" ON "terceros"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "terceros_tipo_documento_numero_documento_key" ON "terceros"("tipo_documento", "numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "parametros_fiscales_anio_key" ON "parametros_fiscales"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "conceptos_retencion_parametro_id_concepto_key" ON "conceptos_retencion"("parametro_id", "concepto");

-- CreateIndex
CREATE UNIQUE INDEX "tarifas_ica_parametro_id_municipio_key" ON "tarifas_ica"("parametro_id", "municipio");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_servicio_slug_key" ON "tipos_servicio"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_egreso_nombre_key" ON "categorias_egreso"("nombre");

-- CreateIndex
CREATE INDEX "ingresos_fecha_causacion_idx" ON "ingresos"("fecha_causacion");

-- CreateIndex
CREATE INDEX "ingresos_fecha_recaudo_idx" ON "ingresos"("fecha_recaudo");

-- CreateIndex
CREATE INDEX "ingresos_estado_idx" ON "ingresos"("estado");

-- CreateIndex
CREATE INDEX "ingresos_property_id_idx" ON "ingresos"("property_id");

-- CreateIndex
CREATE INDEX "ingresos_tercero_id_idx" ON "ingresos"("tercero_id");

-- CreateIndex
CREATE INDEX "egresos_fecha_idx" ON "egresos"("fecha");

-- CreateIndex
CREATE INDEX "egresos_categoria_id_idx" ON "egresos"("categoria_id");

-- CreateIndex
CREATE INDEX "egresos_property_id_idx" ON "egresos"("property_id");

-- CreateIndex
CREATE INDEX "egresos_tercero_id_idx" ON "egresos"("tercero_id");

-- CreateIndex
CREATE INDEX "movimientos_custodia_estado_idx" ON "movimientos_custodia"("estado");

-- CreateIndex
CREATE INDEX "movimientos_custodia_property_id_idx" ON "movimientos_custodia"("property_id");

-- CreateIndex
CREATE INDEX "movimientos_custodia_tercero_id_idx" ON "movimientos_custodia"("tercero_id");

-- CreateIndex
CREATE UNIQUE INDEX "distribuciones_comision_egreso_id_key" ON "distribuciones_comision"("egreso_id");

-- CreateIndex
CREATE INDEX "distribuciones_comision_ingreso_id_idx" ON "distribuciones_comision"("ingreso_id");

-- AddForeignKey
ALTER TABLE "terceros" ADD CONSTRAINT "terceros_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptos_retencion" ADD CONSTRAINT "conceptos_retencion_parametro_id_fkey" FOREIGN KEY ("parametro_id") REFERENCES "parametros_fiscales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifas_ica" ADD CONSTRAINT "tarifas_ica_parametro_id_fkey" FOREIGN KEY ("parametro_id") REFERENCES "parametros_fiscales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_tipo_servicio_id_fkey" FOREIGN KEY ("tipo_servicio_id") REFERENCES "tipos_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_tercero_id_fkey" FOREIGN KEY ("tercero_id") REFERENCES "terceros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egresos" ADD CONSTRAINT "egresos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_egreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egresos" ADD CONSTRAINT "egresos_tercero_id_fkey" FOREIGN KEY ("tercero_id") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egresos" ADD CONSTRAINT "egresos_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_custodia" ADD CONSTRAINT "movimientos_custodia_tercero_id_fkey" FOREIGN KEY ("tercero_id") REFERENCES "terceros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_custodia" ADD CONSTRAINT "movimientos_custodia_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_custodia" ADD CONSTRAINT "movimientos_custodia_entregado_a_tercero_id_fkey" FOREIGN KEY ("entregado_a_tercero_id") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_custodia" ADD CONSTRAINT "movimientos_custodia_ingreso_id_fkey" FOREIGN KEY ("ingreso_id") REFERENCES "ingresos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribuciones_comision" ADD CONSTRAINT "distribuciones_comision_ingreso_id_fkey" FOREIGN KEY ("ingreso_id") REFERENCES "ingresos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribuciones_comision" ADD CONSTRAINT "distribuciones_comision_tercero_id_fkey" FOREIGN KEY ("tercero_id") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribuciones_comision" ADD CONSTRAINT "distribuciones_comision_egreso_id_fkey" FOREIGN KEY ("egreso_id") REFERENCES "egresos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

