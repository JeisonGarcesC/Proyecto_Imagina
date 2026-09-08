import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/passwordService.js';

const DESIGNER_ROLE_KEY = 'DESIGNER';

function requireEnvironmentValue(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} es obligatorio.`);
  return value;
}

function normalizeEmail(environmentName) {
  const email = requireEnvironmentValue(environmentName).toLowerCase();
  if (!email.includes('@')) throw new Error(`${environmentName} no contiene un correo válido.`);
  return email;
}

const databaseUrl = requireEnvironmentValue('DATABASE_URL');
const initialPassword = requireEnvironmentValue('DESIGNER_INITIAL_PASSWORD');

const usersToCreate = Object.freeze([
  {
    username: 'andreaduarte',
    displayName: 'Andrea Duarte',
    email: normalizeEmail('ANDREA_DUARTE_EMAIL'),
  },
  {
    username: 'kevincortes',
    displayName: 'Kevin Cortes',
    email: normalizeEmail('KEVIN_CORTES_EMAIL'),
  },
  {
    username: 'juanfernandez',
    displayName: 'Juan Fernandez',
    email: normalizeEmail('JUAN_FERNANDEZ_EMAIL'),
  },
]);

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

try {
  const createdUsers = await db.$transaction(
    async (tx) => {
      const designerRole = await tx.role.findUnique({
        where: { key: DESIGNER_ROLE_KEY },
        select: { id: true, enabled: true },
      });

      if (!designerRole?.enabled) {
        throw new Error('El rol DESIGNER no existe o no está habilitado.');
      }

      for (const definition of usersToCreate) {
        const duplicateUsername = await tx.user.findFirst({
          where: {
            username: { equals: definition.username, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (duplicateUsername) {
          throw new Error(`Ya existe un usuario con username ${definition.username}.`);
        }

        const duplicateEmail = await tx.user.findFirst({
          where: {
            email: { equals: definition.email, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (duplicateEmail) {
          throw new Error(`Ya existe un usuario con el email configurado para ${definition.username}.`);
        }
      }

      const created = [];
      for (const definition of usersToCreate) {
        const passwordHash = await hashPassword(initialPassword);
        created.push(
          await tx.user.create({
            data: {
              username: definition.username,
              displayName: definition.displayName,
              email: definition.email,
              passwordHash,
              status: 'ACTIVE',
              roles: {
                create: { roleId: designerRole.id },
              },
            },
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              status: true,
              roles: { select: { role: { select: { key: true } } } },
            },
          })
        );
      }
      return created;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    }
  );

  console.log(
    `Usuarios DESIGNER creados: ${createdUsers.map(({ username }) => username).join(', ')}.`
  );
} finally {
  await db.$disconnect();
}
