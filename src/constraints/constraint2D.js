import { CONSTRAINT_TYPES } from './constraintTypes.js';

const CONSTRAINT_TYPE_VALUES = new Set(Object.values(CONSTRAINT_TYPES));
let constraintSequence = 0;

function cloneFrozenValue(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => cloneFrozenValue(item)));
  }
  if (value && typeof value === 'object') {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, cloneFrozenValue(item)])
      )
    );
  }
  return value;
}

function normalizeReference(reference) {
  if (!reference || typeof reference !== 'object') {
    throw new TypeError('Constraint2D references must be objects.');
  }

  const sourceId = String(reference.sourceId || '').trim();
  if (!sourceId) {
    throw new TypeError('Constraint2D references must contain a sourceId.');
  }

  return Object.freeze({
    ...reference,
    sourceId,
    ...(reference.feature ? { feature: cloneFrozenValue(reference.feature) } : {}),
  });
}

function normalizeReferences(references) {
  if (!Array.isArray(references)) {
    throw new TypeError('Constraint2D references must be an array.');
  }
  return Object.freeze(references.map((reference) => normalizeReference(reference)));
}

export function createConstraint2D({
  id,
  type,
  references = [],
  value = null,
  enabled = true,
} = {}) {
  if (!CONSTRAINT_TYPE_VALUES.has(type)) {
    throw new RangeError(`Unsupported Constraint2D type: ${type}.`);
  }

  constraintSequence += 1;
  return Object.freeze({
    id: id || `CONSTRAINT_${Date.now()}_${constraintSequence}`,
    type,
    references: normalizeReferences(references),
    value: cloneFrozenValue(value),
    enabled: enabled !== false,
  });
}

export function cloneConstraint2D(constraint, changes = {}) {
  if (!constraint || typeof constraint !== 'object') {
    throw new TypeError('A Constraint2D is required.');
  }

  const next = changes && typeof changes === 'object' ? changes : {};
  return createConstraint2D({
    ...constraint,
    ...next,
    id: constraint.id,
  });
}

