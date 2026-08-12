import { authError } from '../auth/authErrors.js';

export function requirePermission(permissionKey) {
  return function permissionMiddleware(req, _res, next) {
    if (!req.auth) return next(authError(401, 'AUTHENTICATION_REQUIRED', 'Autenticación requerida.'));
    if (!req.auth.permissions?.includes(permissionKey)) {
      return next(authError(403, 'PERMISSION_DENIED', 'Permiso insuficiente.'));
    }
    return next();
  };
}
