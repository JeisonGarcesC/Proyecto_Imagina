import { createText2D } from './text2D.js';

function nextTextId() {
  return `TEXT_2D_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function createTextAtPoint2D(point, { id = nextTextId() } = {}) {
  return createText2D({ id, geometry: { x: point?.x, y: point?.y, rotation: 0 } });
}

export function updateText2D(items, id, patch = {}) {
  return items.map((item) =>
    item.id === id
      ? createText2D({
          ...item,
          ...patch,
          geometry: { ...item.geometry, ...(patch.geometry || {}) },
          style: { ...item.style, ...(patch.style || {}) },
        })
      : item
  );
}

export function moveText2D(item, delta) {
  return createText2D({
    ...item,
    geometry: {
      ...item.geometry,
      x: item.geometry.x + Number(delta.x || 0),
      y: item.geometry.y + Number(delta.y || 0),
    },
  });
}

export function rotateText2D(item, rotation) {
  return createText2D({ ...item, geometry: { ...item.geometry, rotation } });
}

export function deleteText2D(items, id) {
  return items.filter((item) => item.id !== id);
}

