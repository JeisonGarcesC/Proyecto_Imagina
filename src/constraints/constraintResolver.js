export const CONSTRAINT_RESOLUTION_STATUS = Object.freeze({
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
});

export function resolveConstraint({ constraint, snapshot } = {}) {
  void constraint;
  void snapshot;

  return Object.freeze({
    resolved: false,
    corrections: Object.freeze([]),
    status: CONSTRAINT_RESOLUTION_STATUS.NOT_IMPLEMENTED,
  });
}
