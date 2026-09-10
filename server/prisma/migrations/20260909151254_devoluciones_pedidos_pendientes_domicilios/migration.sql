-- AlterEnum
ALTER TYPE "TipoEntrega" ADD VALUE 'DOMICILIO';

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "cliente_nombre" TEXT,
ADD COLUMN     "cliente_telefono" TEXT,
ADD COLUMN     "costo_domicilio" DECIMAL(10,2),
ADD COLUMN     "direccion_entrega" TEXT,
ADD COLUMN     "nota_cliente" TEXT;

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "anulada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "anulada_en" TIMESTAMP(3),
ADD COLUMN     "motivo_anulacion" TEXT;
