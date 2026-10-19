import { parseAdminPagination } from './adminPagination.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const actorSelect = { id: true, username: true, displayName: true };
const auditSelect = {
  id: true, actorUserId: true, actorDeviceId: true, action: true, targetType: true,
  targetId: true, before: true, after: true, createdAt: true,
  actorUser: { select: actorSelect },
  actorDevice: { select: { id: true, name: true } },
};

function fail(status, code, message) {
  throw Object.assign(new Error(message), { status, code });
}

function optionalText(value, name) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 160) {
    fail(422, `INVALID_${name}`, `Filtro ${name} inválido.`);
  }
  return value.trim();
}

function dateFilter(value, name, end = false) {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(422, `INVALID_${name}`, `Fecha ${name} inválida.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    fail(422, `INVALID_${name}`, `Fecha ${name} inválida.`);
  }
  if (end) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

// Historical JSON is untrusted. Only fields written by the known administrative
// events are exposed, even when a legacy row contains additional properties.
const shapes = {
  ADMIN_USER_CREATED: { after: ['id', 'username', 'email', 'displayName', 'status', 'createdAt', 'updatedAt', 'lastLoginAt', 'roles'] },
  ADMIN_USER_UPDATED: { before: ['id', 'username', 'email', 'displayName', 'status', 'roles'], after: ['id', 'username', 'email', 'displayName', 'status', 'roles'] },
  ADMIN_USER_STATUS_CHANGED: { before: ['status'], after: ['status'] },
  ADMIN_USER_PASSWORD_RESET: {},
  ADMIN_USER_ROLES_CHANGED: { before: ['roles'], after: ['roles'] },
  ADMIN_ROLE_PERMISSIONS_UPDATED: { before: ['roleKey', 'permissionKeys'], after: ['roleKey', 'permissionKeys'] },
  ADMIN_USER_PERMISSIONS_UPDATED: { before: ['overrides'], after: ['overrides'] },
  ADMIN_SESSION_REVOKED: { before: ['userId', 'deviceId', 'status'], after: ['userId', 'deviceId', 'status', 'revokedAt'] },
  ADMIN_DEVICE_REVOKED: { before: ['userId', 'status', 'revokedAt'], after: ['userId', 'status', 'revokedAt'] },
};

function safeValue(key, value) {
  if (key === 'roles') {
    return Array.isArray(value) ? value.slice(0, 200).map((item) => typeof item === 'string' ? item
      : item && typeof item.key === 'string' ? item.key : null).filter(Boolean) : undefined;
  }
  if (key === 'permissionKeys') {
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, 200) : undefined;
  }
  if (key === 'overrides') {
    return Array.isArray(value) ? value.filter((item) => item && typeof item.permissionKey === 'string' && ['ALLOW', 'DENY'].includes(item.effect))
      .slice(0, 200).map(({ permissionKey, effect }) => ({ permissionKey, effect })) : undefined;
  }
  return value === null || typeof value === 'string' ? value : undefined;
}

function safeSnapshot(action, side, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowed = shapes[action]?.[side] || [];
  const safe = {};
  for (const key of allowed) {
    if (Object.hasOwn(value, key)) {
      const sanitized = safeValue(key, value[key]);
      if (sanitized !== undefined) safe[key] = sanitized;
    }
  }
  return Object.keys(safe).length ? safe : null;
}

function auditDto(row) {
  const before = safeSnapshot(row.action, 'before', row.before);
  const after = safeSnapshot(row.action, 'after', row.after);
  return {
    id: row.id, createdAt: row.createdAt, action: row.action,
    actor: row.actorUser ? { ...row.actorUser } : null,
    actorUserId: row.actorUserId, actorDeviceId: row.actorDeviceId,
    actorDevice: row.actorDevice ? { ...row.actorDevice } : null,
    targetType: row.targetType, targetId: row.targetId,
    affectedUserId: row.targetType === 'USER' ? row.targetId : after?.userId || before?.userId || null,
    before, after,
  };
}

export async function listAdminAudit(db, query = {}) {
  const { page, pageSize } = parseAdminPagination(query);
  const search = optionalText(query.search, 'SEARCH');
  const action = optionalText(query.action, 'ACTION');
  const user = optionalText(query.user, 'USER');
  const targetType = optionalText(query.targetType, 'TARGET_TYPE');
  const from = dateFilter(query.from, 'FROM');
  const until = dateFilter(query.until, 'UNTIL', true);
  if (from && until && from >= until) fail(422, 'INVALID_DATE_RANGE', 'Rango de fechas inválido.');
  const userMatch = user ? await db.user.findMany({
    where: { OR: [
      { username: { contains: user, mode: 'insensitive' } },
      { displayName: { contains: user, mode: 'insensitive' } },
      { email: { contains: user, mode: 'insensitive' } },
    ] }, select: { id: true },
  }) : [];
  const userIds = userMatch.map(({ id }) => id);
  const where = {
    ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
    ...(targetType ? { targetType: { equals: targetType, mode: 'insensitive' } } : {}),
    ...(from || until ? { createdAt: { ...(from ? { gte: from } : {}), ...(until ? { lt: until } : {}) } } : {}),
    ...(user ? { OR: [
      { actorUserId: { in: userIds } },
      { targetType: 'USER', targetId: { in: userIds } },
      ...(uuid.test(user) ? [{ actorUserId: user }, { targetId: user }] : []),
    ] } : {}),
    ...(search ? { AND: [{ OR: [
      { action: { contains: search, mode: 'insensitive' } },
      { targetType: { contains: search, mode: 'insensitive' } },
      { targetId: { contains: search, mode: 'insensitive' } },
      { actorUser: { is: { username: { contains: search, mode: 'insensitive' } } } },
      { actorUser: { is: { displayName: { contains: search, mode: 'insensitive' } } } },
    ] }] } : {}),
  };
  const [total, rows] = await db.$transaction([
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, select: auditSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { items: rows.map(auditDto), page, pageSize, total };
}

export async function getAdminAudit(db, id) {
  if (!uuid.test(id)) fail(422, 'INVALID_AUDIT_ID', 'Identificador de evento inválido.');
  const row = await db.auditLog.findUnique({ where: { id }, select: auditSelect });
  if (!row) fail(404, 'AUDIT_NOT_FOUND', 'Evento de auditoría no encontrado.');
  return auditDto(row);
}
