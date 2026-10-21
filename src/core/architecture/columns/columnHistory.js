import { deserializeColumns, serializeColumns } from './columnPersistence.js';

export const COLUMN_HISTORY_TYPES = Object.freeze({
  CREATE: 'CREATE_COLUMN',
  UPDATE: 'UPDATE_COLUMN',
  DELETE: 'DELETE_COLUMN',
  CLEAR: 'CLEAR_COLUMNS',
});

const validTypes = new Set(Object.values(COLUMN_HISTORY_TYPES));

export function createColumnHistoryAction(type, before, after) {
  if (!validTypes.has(type)) return null;
  const previous = serializeColumns(before);
  const next = serializeColumns(after);
  if (JSON.stringify(previous) === JSON.stringify(next)) return null;
  return { type, before: { columns: previous }, after: { columns: next } };
}

export function replayColumnHistoryAction(action, direction) {
  if (!validTypes.has(action?.type)) return null;
  const snapshot = direction === 'undo' ? action.before : action.after;
  return deserializeColumns(snapshot);
}
