import { verifyPassword } from './passwordService.js';
import { generateRefreshToken, hashRefreshToken } from './refreshTokenService.js';
import { issueAccessToken } from './tokenService.js';
import { authUserInclude, getAuthorizationSnapshot } from './effectivePermissionsService.js';
import { invalidCredentialsError, authError } from './authErrors.js';
import { toPublicUser } from '../users/userDto.js';
import { writeAudit } from '../audit/auditService.js';

const activeStatus = 'ACTIVE';
// Hash bcrypt válido de un valor ficticio; evita distinguir usuarios inexistentes por tiempo.
const dummyPasswordHash = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.3lG7bJYj0D8jZ.zl7xTQ9EwzN3r5W6K';

function sessionExpiry(refreshTtlSeconds, now = new Date()) {
  return new Date(now.getTime() + refreshTtlSeconds * 1000);
}

function loginIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

export async function loginUser({ db, usernameOrEmail, password, refreshTtlSeconds, auditContext = {}, tokenOptions }) {
  const identifier = loginIdentifier(usernameOrEmail);
  const user = identifier
    ? await db.user.findFirst({
        where: { OR: [{ username: { equals: identifier, mode: 'insensitive' } }, { email: { equals: identifier, mode: 'insensitive' } }] },
        include: authUserInclude,
      })
    : null;
  const passwordValid = await verifyPassword(user?.passwordHash || dummyPasswordHash, password);
  const valid = user && user.status === activeStatus && passwordValid;

  if (!valid) {
    await writeAudit(db, { ...auditContext, action: 'AUTH_LOGIN_FAILED', targetId: user?.id || null });
    throw invalidCredentialsError();
  }

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const now = new Date();
  const [updatedUser] = await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { lastLoginAt: now }, include: authUserInclude }),
    db.refreshSession.create({
      data: {
        userId: user.id,
        deviceId: null,
        refreshTokenHash,
        tokenVersion: user.tokenVersion,
        expiresAt: sessionExpiry(refreshTtlSeconds, now),
        lastUsedAt: now,
      },
    }),
  ]);
  await writeAudit(db, { ...auditContext, actorUserId: user.id, action: 'AUTH_LOGIN_SUCCESS', targetId: user.id });
  const authorization = getAuthorizationSnapshot(updatedUser);
  return {
    user: toPublicUser(updatedUser),
    ...authorization,
    accessToken: issueAccessToken(updatedUser, tokenOptions),
    expiresIn: tokenOptions?.expiresInSeconds,
    refreshToken,
  };
}

export async function refreshUserSession({ db, refreshToken, refreshTtlSeconds, auditContext = {}, tokenOptions }) {
  if (!refreshToken) throw authError(401, 'INVALID_REFRESH_TOKEN', 'Sesión no válida.');
  const oldHash = hashRefreshToken(refreshToken);
  const now = new Date();
  const nextToken = generateRefreshToken();
  const nextHash = hashRefreshToken(nextToken);

  const result = await db.$transaction(async (tx) => {
    const session = await tx.refreshSession.findUnique({
      where: { refreshTokenHash: oldHash },
      include: { user: { include: authUserInclude } },
    });
    if (!session || session.revokedAt || session.expiresAt <= now) return null;
    if (session.user.status !== activeStatus || session.tokenVersion !== session.user.tokenVersion) return null;
    const rotation = await tx.refreshSession.updateMany({
      where: { id: session.id, refreshTokenHash: oldHash, revokedAt: null },
      data: { refreshTokenHash: nextHash, lastUsedAt: now, expiresAt: sessionExpiry(refreshTtlSeconds, now) },
    });
    if (rotation.count !== 1) return null;
    return session.user;
  });

  if (!result) throw authError(401, 'INVALID_REFRESH_TOKEN', 'Sesión no válida.');
  await writeAudit(db, { ...auditContext, actorUserId: result.id, action: 'AUTH_REFRESH', targetId: result.id });
  return {
    user: toPublicUser(result),
    ...getAuthorizationSnapshot(result),
    accessToken: issueAccessToken(result, tokenOptions),
    expiresIn: tokenOptions?.expiresInSeconds,
    refreshToken: nextToken,
  };
}

export async function logoutUser({ db, refreshToken, auditContext = {} }) {
  if (!refreshToken) return { revoked: false };
  const session = await db.refreshSession.findUnique({ where: { refreshTokenHash: hashRefreshToken(refreshToken) } });
  if (!session || session.revokedAt) return { revoked: false };
  await db.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  await writeAudit(db, { ...auditContext, actorUserId: session.userId, action: 'AUTH_LOGOUT', targetId: session.userId });
  return { revoked: true };
}

export async function revokeAllUserSessions(db, userId, { incrementTokenVersion = true } = {}) {
  const now = new Date();
  return db.$transaction([
    db.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
    ...(incrementTokenVersion ? [db.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } })] : []),
  ]);
}
