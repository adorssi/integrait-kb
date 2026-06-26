import app from './app';
import { prisma } from './utils/prisma';
import { initScheduler } from './utils/scheduler';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  // Verificar conexión a la base de datos antes de arrancar
  await prisma.$connect();
  console.log('Base de datos conectada');

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV ?? 'development'}`);
    initScheduler();
  });
}

main().catch((err: unknown) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
