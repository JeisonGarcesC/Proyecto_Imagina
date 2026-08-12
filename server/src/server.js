import { createApp } from './app.js';
import { assertAuthConfiguration, env } from './config/env.js';
import { prisma } from './db/prisma.js';

assertAuthConfiguration();

const server = createApp().listen(env.port, () => {
  console.log(`Proyecto Imagina API escuchando en el puerto ${env.port}.`);
});

async function shutdown(signal) {
  console.log(`Cerrando API por ${signal}.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
