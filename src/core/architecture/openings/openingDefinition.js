export const OPENING_SCHEMA_VERSION = 1;
export const OPENING_TYPES = Object.freeze({ DOOR: 'DOOR' });

export function createOpeningId(prefix = 'OPENING') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function cloneOpeningData(value, fallback) {
  try { return value == null ? fallback : JSON.parse(JSON.stringify(value)); } catch { return fallback; }
}
