import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function issueAccessToken(user, options = {}) {
  const secret = options.secret || env.jwtAccessSecret;
  const expiresIn = options.expiresIn || env.accessTtl.source;
  return jwt.sign(
    { username: user.username, tokenVersion: user.tokenVersion },
    secret,
    {
      algorithm: 'HS256',
      subject: user.id,
      issuer: options.issuer || env.authIssuer,
      audience: options.audience || env.authAudience,
      expiresIn,
    }
  );
}

export function verifyAccessToken(token, options = {}) {
  return jwt.verify(token, options.secret || env.jwtAccessSecret, {
    algorithms: ['HS256'],
    issuer: options.issuer || env.authIssuer,
    audience: options.audience || env.authAudience,
  });
}
