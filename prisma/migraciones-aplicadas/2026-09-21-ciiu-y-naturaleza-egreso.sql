-- CreateEnum
CREATE TYPE "NaturalezaEgreso" AS ENUM ('DEL_NEGOCIO', 'DE_OPERACION', 'REEMBOLSABLE');

-- CreateEnum
CREATE TYPE "EstadoReembolso" AS ENUM ('PENDIENTE', 'REEMBOLSADO', 'ASUMIDO');

-- DropIndex
DROP INDEX "tarifas_ica_parametro_id_municipio_key";

-- AlterTable
ALTER TABLE "tarifas_ica" ADD COLUMN     "ciiu" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "tipos_servicio" ADD COLUMN     "ciiu" TEXT;

-- AlterTable
ALTER TABLE "ingresos" ADD COLUMN     "ciiu" TEXT;

-- AlterTable
ALTER TABLE "egresos" ADD COLUMN     "estado_reembolso" "EstadoReembolso",
ADD COLUMN     "fecha_reembolso" TIMESTAMP(3),
ADD COLUMN     "motivo_reclasificacion" TEXT,
ADD COLUMN     "naturaleza" "NaturalezaEgreso" NOT NULL DEFAULT 'DEL_NEGOCIO',
ADD COLUMN     "por_completar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reclasificado_de" "NaturalezaEgreso",
ADD COLUMN     "reclasificado_en" TIMESTAMP(3),
ADD COLUMN     "reclasificado_por" TEXT,
ADD COLUMN     "reembolsa_tercero_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tarifas_ica_parametro_id_municipio_ciiu_key" ON "tarifas_ica"("parametro_id", "municipio", "ciiu");

-- CreateIndex
CREATE INDEX "egresos_naturaleza_estado_reembolso_idx" ON "egresos"("naturaleza", "estado_reembolso");

-- CreateIndex
CREATE INDEX "egresos_por_completar_idx" ON "egresos"("por_completar");

-- AddForeignKey
ALTER TABLE "egresos" ADD CONSTRAINT "egresos_reembolsa_tercero_id_fkey" FOREIGN KEY ("reembolsa_tercero_id") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

