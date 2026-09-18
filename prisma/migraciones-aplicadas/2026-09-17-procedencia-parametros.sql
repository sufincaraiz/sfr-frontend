-- AlterTable
ALTER TABLE "parametros_fiscales" ADD COLUMN     "activado_en" TIMESTAMP(3),
ADD COLUMN     "activado_por" TEXT,
ADD COLUMN     "procedencia" JSONB;

-- AlterTable
ALTER TABLE "conceptos_retencion" ADD COLUMN     "cargado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cargado_por" TEXT,
ADD COLUMN     "copiado_de_anio" INTEGER,
ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "revisado" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "tarifas_ica" ADD COLUMN     "cargado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cargado_por" TEXT,
ADD COLUMN     "copiado_de_anio" INTEGER,
ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "revisado" BOOLEAN NOT NULL DEFAULT true;

