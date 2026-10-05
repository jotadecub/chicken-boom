-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "turno_caja_id" TEXT;

-- CreateTable
CREATE TABLE "turnos_caja" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "fecha_apertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMP(3),
    "monto_inicial" DECIMAL(10,2) NOT NULL,
    "monto_contado" DECIMAL(10,2),
    "observaciones" TEXT,

    CONSTRAINT "turnos_caja_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_turno_caja_id_fkey" FOREIGN KEY ("turno_caja_id") REFERENCES "turnos_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caja" ADD CONSTRAINT "turnos_caja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
