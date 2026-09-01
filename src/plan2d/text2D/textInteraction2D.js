import { rotatePoint2D } from '../geometry2D/shapeInteraction2D.js';

export function getTextFont2D(item, scale = 1) {
  const sizePx = Math.max(1, item.style.fontSize * scale);
  return `${item.style.fontStyle} ${item.style.fontWeight} ${sizePx}px ${item.style.fontFamily}`;
}

export function measureText2D(ctx, item, scale = 1) {
  if (!ctx || !item) return null;
  ctx.save();
  ctx.font = getTextFont2D(item, scale);
  const lines = String(item.text || '').split('\n');
  const widthPx = Math.max(1, ...lines.map((line) => ctx.measureText(line || ' ').width));
  ctx.restore();
  const width = widthPx / scale;
  const lineHeight = item.style.fontSize * 1.2;
  const height = Math.max(lineHeight, lines.length * lineHeight);
  const minX = item.style.align === 'center' ? -width / 2 : item.style.align === 'right' ? -width : 0;
  return { width, height, minX, maxX: minX + width, minY: -height / 2, maxY: height / 2, lineHeight, lines };
}

export function hitTestText2D(ctx, item, point, scale = 1, tolerance = 0) {
  if (!item || item.visible === false) return false;
  const bounds = measureText2D(ctx, item, scale);
  if (!bounds) return false;
  const local = rotatePoint2D(point, item.geometry, -(item.geometry.rotation || 0));
  const x = local.x - item.geometry.x;
  const y = local.y - item.geometry.y;
  return x >= bounds.minX - tolerance && x <= bounds.maxX + tolerance &&
    y >= bounds.minY - tolerance && y <= bounds.maxY + tolerance;
}

export function selectTextAtPoint2D(ctx, items, point, scale, tolerance) {
  return [...items].reverse().find((item) => hitTestText2D(ctx, item, point, scale, tolerance)) || null;
}

export function getTextHandles2D(ctx, item, scale = 1, rotationOffset = 0.35) {
  const bounds = measureText2D(ctx, item, scale);
  if (!bounds) return [];
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const localHandle = {
    x: item.geometry.x + centerX,
    y: item.geometry.y + bounds.minY - rotationOffset,
  };
  return [{ id: 'rotate', kind: 'rotate', ...rotatePoint2D(localHandle, item.geometry, item.geometry.rotation || 0) }];
}

export function pickTextHandle2D(ctx, item, point, tolerance, scale, rotationOffset) {
  return getTextHandles2D(ctx, item, scale, rotationOffset).find((handle) =>
    Math.hypot(point.x - handle.x, point.y - handle.y) <= tolerance
  ) || null;
}

