import { getTextFont2D, measureText2D } from './textInteraction2D.js';

export function drawText2D(ctx, item, { toCanvas, scale = 1, selected = false } = {}) {
  if (!ctx || !item || item.visible === false || typeof toCanvas !== 'function') return false;
  const [x, y] = toCanvas(item.geometry.x, item.geometry.y);
  const metrics = measureText2D(ctx, item, scale);
  if (!metrics) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-(item.geometry.rotation || 0));
  ctx.font = getTextFont2D(item, scale);
  ctx.fillStyle = item.style.color;
  ctx.textAlign = item.style.align;
  ctx.textBaseline = 'middle';
  const lineHeightPx = metrics.lineHeight * scale;
  metrics.lines.forEach((line, index) => {
    const lineY = (index - (metrics.lines.length - 1) / 2) * lineHeightPx;
    ctx.fillText(line, 0, lineY);
  });
  if (selected) {
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(metrics.minX * scale, metrics.minY * scale, metrics.width * scale, metrics.height * scale);
  }
  ctx.restore();
  return true;
}

export function drawTexts2D(ctx, items, view = {}) {
  return items.reduce(
    (count, item) => count + (drawText2D(ctx, item, { ...view, selected: item.id === view.selectedId }) ? 1 : 0),
    0
  );
}

