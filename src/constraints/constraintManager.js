import { createConstraint2D } from './constraint2D.js';

export function addConstraint(constraints, constraint) {
  const current = Array.isArray(constraints) ? constraints : [];
  const nextConstraint = createConstraint2D(constraint);
  const existingIndex = current.findIndex((item) => item?.id === nextConstraint.id);

  if (existingIndex < 0) return Object.freeze([...current, nextConstraint]);
  return Object.freeze(
    current.map((item, index) => (index === existingIndex ? nextConstraint : item))
  );
}

export function removeConstraint(constraints, id) {
  const current = Array.isArray(constraints) ? constraints : [];
  return Object.freeze(current.filter((constraint) => constraint?.id !== id));
}

export function getConstraint(constraints, id) {
  if (!Array.isArray(constraints) || !id) return null;
  return constraints.find((constraint) => constraint?.id === id) || null;
}

export function getAllConstraints(constraints) {
  return Object.freeze([...(Array.isArray(constraints) ? constraints : [])]);
}

export function clearConstraints() {
  return Object.freeze([]);
}

