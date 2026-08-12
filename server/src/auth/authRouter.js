import { Router } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { loginUser, logoutUser, refreshUserSession } from './authService.js';
import { requestAuditContext } from '../audit/auditService.js';
import { createAuthenticateAccessToken } from '../middleware/authenticateAccessToken.js';
import { toPublicUser } from '../users/userDto.js';

export const REFRESH_COOKIE_NAME = 'imagina.refresh';

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    path: '/auth',
    maxAge: env.refreshTtl.seconds * 1000,
  };
}

function tokenOptions() {
  return { expiresIn: env.accessTtl.source, expiresInSeconds: env.accessTtl.seconds };
}

function responseWithoutRefresh(result) {
  const { refreshToken: _refreshToken, ...body } = result;
  return body;
}

export function createAuthRouter({ db }) {
  const router = Router();
  const authenticate = createAuthenticateAccessToken({ db });
  const loginIpLimiter = rateLimit({
    windowMs: env.authRateLimitWindowMs,
    limit: env.authRateLimitMax * 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'AUTH_RATE_LIMITED', message: 'Demasiados intentos. Intente más tarde.' },
  });
  const loginIdentityLimiter = rateLimit({
    windowMs: env.authRateLimitWindowMs,
    limit: env.authRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.usernameOrEmail || '').trim().toLowerCase()}`,
    message: { error: 'AUTH_RATE_LIMITED', message: 'Demasiados intentos. Intente más tarde.' },
  });

  router.post('/login', loginIpLimiter, loginIdentityLimiter, async (req, res, next) => {
    try {
      const result = await loginUser({
        db,
        usernameOrEmail: req.body?.usernameOrEmail,
        password: req.body?.password,
        refreshTtlSeconds: env.refreshTtl.seconds,
        auditContext: requestAuditContext(req),
        tokenOptions: tokenOptions(),
      });
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
      res.json(responseWithoutRefresh(result));
    } catch (error) { next(error); }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      const result = await refreshUserSession({
        db,
        refreshToken: req.cookies?.[REFRESH_COOKIE_NAME],
        refreshTtlSeconds: env.refreshTtl.seconds,
        auditContext: requestAuditContext(req),
        tokenOptions: tokenOptions(),
      });
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
      res.json(responseWithoutRefresh(result));
    } catch (error) { next(error); }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      await logoutUser({ db, refreshToken: req.cookies?.[REFRESH_COOKIE_NAME], auditContext: requestAuditContext(req) });
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
      res.status(204).end();
    } catch (error) { next(error); }
  });

  router.get('/me', authenticate, (req, res) => {
    res.json({ user: toPublicUser(req.auth.user), roles: req.auth.roles, permissions: req.auth.permissions });
  });

  return router;
}
