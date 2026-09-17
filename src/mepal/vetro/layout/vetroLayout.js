function finite(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
export function applyVetroTransform(object, transform = {}) {
  if (!object) return object;
  if (Array.isArray(transform.position)) object.position.fromArray(transform.position.map((value) => finite(value)));
  else if (transform.position) object.position.set(finite(transform.position.x), finite(transform.position.y), finite(transform.position.z));
  if (Array.isArray(transform.quaternion) && transform.quaternion.length === 4) object.quaternion.fromArray(transform.quaternion.map((value, index) => finite(value, index === 3 ? 1 : 0)));
  else if (Array.isArray(transform.rotation)) object.rotation.fromArray(transform.rotation);
  if (Array.isArray(transform.scale)) object.scale.fromArray(transform.scale.map((value) => finite(value, 1)));
  object.updateMatrixWorld(true);
  return object;
}
