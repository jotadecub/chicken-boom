import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Enmanuel20932026.', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@chickenboom.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@chickenboom.com',
      passwordHash,
      rol: 'ADMIN',
    },
  });

  // Métodos de pago básicos
  await prisma.metodoPago.createMany({
    data: [
      { nombre: 'Efectivo' },
      { nombre: 'Tarjeta' },
      { nombre: 'Nequi' },
      { nombre: 'Daviplata' },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completado. Usuario admin:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });