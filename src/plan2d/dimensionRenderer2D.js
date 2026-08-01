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

function drawUnresolvedReferenceMarker(ctx, x, y) {
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#dc2626';
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', x, y + 0.5);
  ctx.restore();
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
  const styleColor = dimension.style?.color || '#000000';
  const configuredLineWidth = Number(dimension.style?.lineWidth);
  const configuredTextSize = Number(dimension.style?.text?.size);
  const lineWidth =
    Number.isFinite(configuredLineWidth) && configuredLineWidth > 0 ? configuredLineWidth : 1;
  const textSize =
    Number.isFinite(configuredTextSize) && configuredTextSize > 0 ? configuredTextSize : 14;
  ctx.strokeStyle = selected ? 'rgba(234, 88, 12, 1)' : styleColor;
  ctx.fillStyle = selected ? 'rgba(234, 88, 12, 1)' : styleColor;
  ctx.lineWidth = selected ? Math.max(2.5, lineWidth + 1) : lineWidth;

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
  ctx.font = `${textSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textWidth = ctx.measureText(label).width + 10;
  const textHeight = textSize + 8;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fillRect(textX - textWidth / 2, textY - textHeight / 2, textWidth, textHeight);
  ctx.fillStyle = selected ? 'rgba(154, 52, 18, 1)' : styleColor;
  ctx.fillText(label, textX, textY);

  const unresolvedStart =
    Boolean(dimension.references?.start) &&
    dimension.referenceResolution?.startResolved === false;
  const unresolvedEnd =
    Boolean(dimension.references?.end) && dimension.referenceResolution?.endResolved === false;

  if (unresolvedStart) drawUnresolvedReferenceMarker(ctx, startX, startY);
  if (unresolvedEnd) drawUnresolvedReferenceMarker(ctx, endX, endY);

  if (unresolvedStart || unresolvedEnd) {
    const warning = 'Referencia no resuelta';
    ctx.font = 'bold 11px sans-serif';
    const warningWidth = ctx.measureText(warning).width + 10;
    const warningX = textX - warningWidth / 2;
    const warningY = textY - 28;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fillRect(warningX, warningY - 9, warningWidth, 18);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1;
    ctx.strokeRect(warningX, warningY - 9, warningWidth, 18);
    ctx.fillStyle = '#b91c1c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(warning, textX, warningY);
  }
  ctx.restore();
  return true;
}
