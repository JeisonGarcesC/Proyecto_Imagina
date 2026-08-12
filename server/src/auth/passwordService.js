import bcrypt from 'bcryptjs';

const DEFAULT_COST = 12;

export async function hashPassword(password, cost = DEFAULT_COST) {
  const value = String(password || '');
  if (value.length < 12) throw new Error('La contraseña debe contener al menos 12 caracteres.');
  return bcrypt.hash(value, cost);
}

export async function verifyPassword(passwordHash, password) {
  if (!passwordHash || typeof passwordHash !== 'string') return false;
  return bcrypt.compare(String(password || ''), passwordHash);
}
