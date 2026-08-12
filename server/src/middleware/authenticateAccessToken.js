import { verifyAccessToken } from '../auth/tokenService.js';
import { authUserInclude, getAuthorizationSnapshot } from '../auth/effectivePermissionsService.js';
import { authError } from '../auth/authErrors.js';

function readBearerToken(req) {
  const [scheme, token] = String(req.get('authorization') || '').split(' ');
  return /^Bearer$/i.test(scheme) && token ? token : null;
}

export function createAuthenticateAccessToken({ db, tokenOptions } = {}) {
  return async function authenticateAccessToken(req, _res, next) {
    try {
      const token = readBearerToken(req);
      if (!token) throw authError(401, 'AUTHENTICATION_REQUIRED', 'Autenticación requerida.');
      let payload;
      try {
        payload = verifyAccessToken(token, tokenOptions);
      } catch {
        throw authError(401, 'INVALID_ACCESS_TOKEN', 'Token de acceso no válido.');
      }
      const user = await db.user.findUnique({ where: { id: payload.sub }, include: authUserInclude });
      if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== payload.tokenVersion) {
        throw authError(401, 'INVALID_ACCESS_TOKEN', 'Token de acceso no válido.');
      }
      req.auth = { userId: user.id, user, ...getAuthorizationSnapshot(user) };
      next();
    } catch (error) {
      next(error);
    }
  };
}
