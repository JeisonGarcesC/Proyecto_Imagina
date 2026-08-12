import { hashPassword } from '../auth/passwordService.js';
import { SUPERADMIN_ROLE_KEY } from './lastSuperadminGuard.js';

function requireValue(value, name) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${name} es obligatorio.`);
  return normalized;
}

export async function bootstrapSuperadmin({ db, username, email, displayName, password }) {
  const existing = await db.userRole.count({
    where: { user: { status: 'ACTIVE' }, role: { key: SUPERADMIN_ROLE_KEY, enabled: true } },
  });
  if (existing > 0) {
    const error = new Error('El sistema ya tiene un SUPERADMIN activo.');
    error.code = 'SUPERADMIN_ALREADY_EXISTS';
    throw error;
  }

  const role = await db.role.findUnique({ where: { key: SUPERADMIN_ROLE_KEY } });
  if (!role?.enabled) throw new Error('El rol SUPERADMIN no existe o no está habilitado. Ejecute primero db:seed.');

  const data = {
    username: requireValue(username, 'BOOTSTRAP_ADMIN_USERNAME').toLowerCase(),
    email: requireValue(email, 'BOOTSTRAP_ADMIN_EMAIL').toLowerCase(),
    displayName: requireValue(displayName, 'BOOTSTRAP_ADMIN_DISPLAY_NAME'),
    passwordHash: await hashPassword(password),
    status: 'ACTIVE',
    roles: { create: { roleId: role.id } },
  };
  return db.user.create({ data, select: { id: true, username: true, email: true, displayName: true, status: true } });
}
