import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Crear técnico ADMIN por defecto
  const passwordHash = await bcrypt.hash('Admin1234!', 12);

  const admin = await prisma.technician.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@empresa.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Admin creado: ${admin.email}`);

  // Crear tags de ejemplo
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { name: 'red' }, update: {}, create: { name: 'red' } }),
    prisma.tag.upsert({ where: { name: 'servidor' }, update: {}, create: { name: 'servidor' } }),
  ]);

  console.log(`Tags creados: ${tags.map((t) => t.name).join(', ')}`);
}

main()
  .catch((err: unknown) => {
    console.error('Error en seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
