import {
  resolveDimensionScreenGeometry,
  resolveDimensionTextPosition,
} from './dimensionGeometry2D.js';
import { formatDimensionValue } from './dimensionFormat.js';
function drawArrow(ctx, tipX, tipY, towardX, towardY) {
  const angle = Math.atan2(towardY - tipY, towardX - tipX);
  const length = 8;
  const width = 4;
  const baseX = tipX + Math.cos(angle) * length;
  const baseY = tipY + Math.sin(angle) * length;
  const normalX = -Math.sin(angle) * width;
  const normalY = Math.cos(angle) * width;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(baseX + normalX, baseY + normalY);
  ctx.lineTo(baseX - normalX, baseY - normalY);
  ctx.closePath();
  ctx.fill();
}

export function drawDimension2D(ctx, dimension, view = {}) {
  if (!ctx || !dimension || typeof view.toCanvas !== 'function') return false;
  const geometry = resolveDimensionScreenGeometry(dimension, view.toCanvas);
  const [startX, startY] = geometry.start;
  const [endX, endY] = geometry.end;
  const [dimStartX, dimStartY] = geometry.dimStart;
  const [dimEndX, dimEndY] = geometry.dimEnd;
  const label = dimension.label || formatDimensionValue(dimension.value, dimension.unit);

  ctx.save();
  const selected = view.selected === true;
  ctx.strokeStyle = selected ? 'rgba(234, 88, 12, 1)' : 'rgba(37, 99, 235, 0.95)';
  ctx.fillStyle = selected ? 'rgba(234, 88, 12, 1)' : 'rgba(37, 99, 235, 0.95)';
  ctx.lineWidth = selected ? 2.5 : 1.5;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(dimStartX, dimStartY);
  ctx.moveTo(endX, endY);
  ctx.lineTo(dimEndX, dimEndY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(dimStartX, dimStartY);
  ctx.lineTo(dimEndX, dimEndY);
  ctx.stroke();
  drawArrow(ctx, dimStartX, dimStartY, dimEndX, dimEndY);
  drawArrow(ctx, dimEndX, dimEndY, dimStartX, dimStartY);

  const textPosition = resolveDimensionTextPosition(dimension, view.toCanvas);
  const textX = textPosition.x;
  const textY = textPosition.y;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textWidth = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fillRect(textX - textWidth / 2, textY - 10, textWidth, 20);
  ctx.fillStyle = selected ? 'rgba(154, 52, 18, 1)' : 'rgba(30, 64, 175, 1)';
  ctx.fillText(label, textX, textY);
  ctx.restore();
  return true;
}
