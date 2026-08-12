export async function writeAudit(db, {
  actorUserId = null,
  actorDeviceId = null,
  action,
  targetType = 'AUTH',
  targetId = null,
  before = undefined,
  after = undefined,
  ip = null,
  userAgent = null,
}) {
  return db.auditLog.create({
    data: { actorUserId, actorDeviceId, action, targetType, targetId, before, after, ip, userAgent },
  });
}

export function requestAuditContext(req) {
  return {
    ip: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get?.('user-agent') || null,
  };
}
