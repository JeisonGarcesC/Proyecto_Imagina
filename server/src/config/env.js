import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const port = Number(process.env.SERVER_PORT || process.env.PORT || 3001);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un puerto TCP válido.');
}

const corsOrigins = String(process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function parseDuration(value, fallback) {
  const match = /^(\d+)(s|m|h|d)$/.exec(String(value || fallback).trim());
  if (!match) throw new Error(`Duración inválida: ${value}. Use s, m, h o d.`);
  const factors = { s: 1, m: 60, h: 3600, d: 86400 };
  return { source: `${match[1]}${match[2]}`, seconds: Number(match[1]) * factors[match[2]] };
}

const accessTtl = parseDuration(process.env.JWT_ACCESS_TTL, '15m');
const refreshTtl = parseDuration(process.env.REFRESH_TOKEN_TTL, '30d');
const rateLimitWindow = parseDuration(process.env.AUTH_RATE_LIMIT_WINDOW, '15m');
const rateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 10);

if (!Number.isInteger(rateLimitMax) || rateLimitMax < 1) {
  throw new Error('AUTH_RATE_LIMIT_MAX debe ser un entero positivo.');
}

export const env = Object.freeze({
  nodeEnv,
  port,
  isProduction: nodeEnv === 'production',
  corsOrigins: Object.freeze(corsOrigins),
  authIssuer: process.env.AUTH_ISSUER || 'proyecto-imagina-auth',
  authAudience: process.env.AUTH_AUDIENCE || 'proyecto-imagina',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  accessTtl,
  refreshTtl,
  cookieSecure: String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true' || nodeEnv === 'production',
  authRateLimitWindowMs: rateLimitWindow.seconds * 1000,
  authRateLimitMax: rateLimitMax,
});

export function assertAuthConfiguration() {
  if (env.jwtAccessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET debe contener al menos 32 caracteres.');
  }
}
