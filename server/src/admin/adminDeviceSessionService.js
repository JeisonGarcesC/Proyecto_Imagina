import { writeAudit } from '../audit/auditService.js';
import { parseAdminPagination } from './adminPagination.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const deviceStatuses = new Set(['ACTIVE', 'REVOKED', 'LOST']);
const sessionStatuses = new Set(['ACTIVE', 'EXPIRED', 'REVOKED']);
const userSelect = { id: true, username: true, displayName: true };
const deviceSelect = {
  id: true, userId: true, name: true, platform: true, status: true,
  enrolledAt: true, lastSeenAt: true, revokedAt: true,
  user: { select: userSelect },
};
const sessionSelect = {
  id: true, userId: true, deviceId: true, createdAt: true, lastUsedAt: true,
  expiresAt: true, revokedAt: true,
  user: { select: userSelect },
  device: { select: { id: true, name: true, platform: true, status: true } },
};

function fail(status, code, message) {
  throw Object.assign(new Error(message), { status, code });
}

function validId(value, name) {
  if (!uuidPattern.test(value)) fail(400, `INVALID_${name}_ID`, 'Identificador inválido.');
  return value;
}

function optionalText(value, name) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 160) {
    fail(400, `INVALID_${name}`, `Filtro ${name} inválido.`);
  }
  return value.trim();
}

function sessionStatus(session, now) {
  if (session.revokedAt) return 'REVOKED';
  return session.expiresAt <= now ? 'EXPIRED' : 'ACTIVE';
}

function publicSession(session, now) {
  return { ...session, status: sessionStatus(session, now) };
}

export async function listAdminDevices(db, query = {}) {
  const { page, pageSize } = parseAdminPagination(query);
  const search = optionalText(query.search, 'SEARCH');
  const platform = optionalText(query.platform, 'PLATFORM');
  const status = optionalText(query.status, 'STATUS');
  if (status && !deviceStatuses.has(status)) fail(400, 'INVALID_STATUS', 'Estado de dispositivo inválido.');
  const userId = query.userId ? validId(query.userId, 'USER') : undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(platform ? { platform: { contains: platform, mode: 'insensitive' } } : {}),
    ...(userId ? { userId } : {}),
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { platform: { contains: search, mode: 'insensitive' } },
      { user: { is: { username: { contains: search, mode: 'insensitive' } } } },
      { user: { is: { displayName: { contains: search, mode: 'insensitive' } } } },
    ] } : {}),
  };
  const [total, items] = await db.$transaction([
    db.device.count({ where }),
    db.device.findMany({ where, select: deviceSelect,
      orderBy: [{ enrolledAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { items, total, page, pageSize };
}

export async function getAdminDevice(db, id) {
  validId(id, 'DEVICE');
  const device = await db.device.findUnique({ where: { id }, select: deviceSelect });
  if (!device) fail(404, 'DEVICE_NOT_FOUND', 'Dispositivo no encontrado.');
  return device;
}

export async function revokeAdminDevice(db, id, actor, context = {}) {
  validId(id, 'DEVICE');
  return db.$transaction(async (tx) => {
    const device = await tx.device.findUnique({ where: { id }, select: deviceSelect });
    if (!device) fail(404, 'DEVICE_NOT_FOUND', 'Dispositivo no encontrado.');
    if (device.status === 'REVOKED') fail(409, 'DEVICE_ALREADY_REVOKED', 'El dispositivo ya fue revocado.');
    const now = new Date();
    const result = await tx.device.updateMany({
      where: { id, status: { not: 'REVOKED' } },
      data: { status: 'REVOKED', revokedAt: now },
    });
    if (result.count !== 1) fail(409, 'CONCURRENT_UPDATE', 'El dispositivo cambió durante la operación.');
    await writeAudit(tx, {
      actorUserId: actor.userId, action: 'ADMIN_DEVICE_REVOKED', targetType: 'DEVICE', targetId: id,
      before: { userId: device.userId, status: device.status, revokedAt: device.revokedAt },
      after: { userId: device.userId, status: 'REVOKED', revokedAt: now },
      ...context,
    });
    return getAdminDevice(tx, id);
  }, { isolationLevel: 'Serializable' });
}

export async function listAdminSessions(db, query = {}) {
  const { page, pageSize } = parseAdminPagination(query);
  const search = optionalText(query.search, 'SEARCH');
  const status = optionalText(query.status, 'STATUS');
  if (status && !sessionStatuses.has(status)) fail(400, 'INVALID_STATUS', 'Estado de sesión inválido.');
  const userId = query.userId ? validId(query.userId, 'USER') : undefined;
  const deviceId = query.deviceId ? validId(query.deviceId, 'DEVICE') : undefined;
  const now = new Date();
  const where = {
    ...(userId ? { userId } : {}),
    ...(deviceId ? { deviceId } : {}),
    ...(status === 'REVOKED' ? { revokedAt: { not: null } } : {}),
    ...(status === 'EXPIRED' ? { revokedAt: null, expiresAt: { lte: now } } : {}),
    ...(status === 'ACTIVE' ? { revokedAt: null, expiresAt: { gt: now } } : {}),
    ...(search ? { OR: [
      { user: { is: { username: { contains: search, mode: 'insensitive' } } } },
      { user: { is: { displayName: { contains: search, mode: 'insensitive' } } } },
      { device: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ] } : {}),
  };
  const [total, sessions] = await db.$transaction([
    db.refreshSession.count({ where }),
    db.refreshSession.findMany({ where, select: sessionSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { items: sessions.map((session) => publicSession(session, now)), total, page, pageSize };
}

export async function revokeAdminSession(db, id, actor, context = {}) {
  validId(id, 'SESSION');
  return db.$transaction(async (tx) => {
    const session = await tx.refreshSession.findUnique({
      where: { id }, select: { id: true, userId: true, deviceId: true, expiresAt: true, revokedAt: true },
    });
    if (!session) fail(404, 'SESSION_NOT_FOUND', 'Sesión no encontrada.');
    if (session.revokedAt) fail(409, 'SESSION_ALREADY_REVOKED', 'La sesión ya fue revocada.');
    const now = new Date();
    if (session.expiresAt <= now) fail(409, 'SESSION_EXPIRED', 'La sesión ya expiró.');
    const result = await tx.refreshSession.updateMany({
      where: { id, revokedAt: null, expiresAt: { gt: now } }, data: { revokedAt: now },
    });
    if (result.count !== 1) fail(409, 'CONCURRENT_UPDATE', 'La sesión cambió durante la operación.');
    await writeAudit(tx, {
      actorUserId: actor.userId, action: 'ADMIN_SESSION_REVOKED', targetType: 'SESSION', targetId: id,
      before: { userId: session.userId, deviceId: session.deviceId, status: 'ACTIVE' },
      after: { userId: session.userId, deviceId: session.deviceId, status: 'REVOKED', revokedAt: now },
      ...context,
    });
    return { id, userId: session.userId, deviceId: session.deviceId, status: 'REVOKED', revokedAt: now };
  }, { isolationLevel: 'Serializable' });
}
