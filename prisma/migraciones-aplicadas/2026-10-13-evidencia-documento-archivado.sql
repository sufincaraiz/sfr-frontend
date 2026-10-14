-- AlterTable
ALTER TABLE "respaldos_normativos" ADD COLUMN     "archivado_por" TEXT,
ADD COLUMN     "documento_hash" TEXT,
ADD COLUMN     "documento_ruta" TEXT,
ADD COLUMN     "entidad_emisora" TEXT,
ADD COLUMN     "fuente_dominio" TEXT,
ADD COLUMN     "obtenido_de" TEXT,
ADD COLUMN     "obtenido_en" DATE,
ADD COLUMN     "tipo_evidencia" TEXT NOT NULL DEFAULT 'URL_OFICIAL',
ALTER COLUMN "url" DROP NOT NULL;

