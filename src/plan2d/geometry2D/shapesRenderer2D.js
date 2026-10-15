import { transformShapeToCanvas } from './geometryUtils2D.js';
import { SHAPE_2D_TYPES } from './shapes2D.js';

function appendCenteredPath(ctx, type, geometry) {
  ctx.translate(geometry.x, geometry.y);
  if (geometry.rotation) ctx.rotate(geometry.rotation);
  if (type === SHAPE_2D_TYPES.CIRCLE) {
    ctx.arc(0, 0, geometry.radius, 0, Math.PI * 2);
  } else if (type === SHAPE_2D_TYPES.TRIANGLE) {
    ctx.moveTo(0, -geometry.height / 2);
    ctx.lineTo(geometry.width / 2, geometry.height / 2);
    ctx.lineTo(-geometry.width / 2, geometry.height / 2);
    ctx.closePath();
  } else {
    ctx.rect(-geometry.width / 2, -geometry.height / 2, geometry.width, geometry.height);
  }
}

function appendPath(ctx, shape, geometry) {
  if (shape.type === SHAPE_2D_TYPES.LINE) {
    ctx.moveTo(geometry.x1, geometry.y1);
    ctx.lineTo(geometry.x2, geometry.y2);
    return;
  }
  if (shape.type === SHAPE_2D_TYPES.POLYGON) {
    geometry.points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    return;
  }
  appendCenteredPath(ctx, shape.type, geometry);
}

function drawAreaHatch(ctx, shape, geometry, view) {
  const type = shape.hatch?.type || 'default';
  if (shape.type !== SHAPE_2D_TYPES.RECTANGLE || !['lined', 'dashed', 'crossed'].includes(type)) return;

  const halfWidth = geometry.width / 2;
  const halfHeight = geometry.height / 2;
  const extent = halfWidth + halfHeight;
  const worldSpacingPx = 0.15 * (Number(view?.scale) || 1);
  const spacing = Math.max(8, worldSpacingPx, (2 * extent) / 256);

  ctx.save();
  ctx.clip();
  ctx.beginPath();
  ctx.strokeStyle = shape.style.stroke;
  ctx.lineWidth = Math.max(1, Math.min(2, shape.style.strokeWidth || 1));
  ctx.globalAlpha *= shape.style.fillOpacity;
  if (type === 'dashed') ctx.setLineDash([spacing * 0.65, spacing * 0.35]);

  for (let offset = -extent; offset <= extent; offset += spacing) {
    if (type === 'crossed') {
      ctx.moveTo(-extent, offset - extent);
      ctx.lineTo(extent, offset + extent);
      ctx.moveTo(-extent, offset + extent);
      ctx.lineTo(extent, offset - extent);
    } else {
      ctx.moveTo(-halfWidth, offset);
      ctx.lineTo(halfWidth, offset);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawElevationDetails(ctx, shape, geometry, view) {
  const scale = Number(view?.scale) || 1;
  ctx.save();
  ctx.strokeStyle = shape.style.stroke;
  ctx.lineWidth = Math.max(1, shape.style.strokeWidth);
  geometry.components.forEach((component) => {
    ctx.strokeRect(
      component.x * scale - component.width * scale / 2,
      component.y * scale - component.height * scale / 2,
      component.width * scale,
      component.height * scale
    );
  });
  const markerX = geometry.width / 2 + 24;
  const radius = 14;
  ctx.beginPath();
  ctx.arc(markerX, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(markerX, 0);
  ctx.rotate({ front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[shape.viewDirection] || 0);
  ctx.beginPath();
  ctx.moveTo(-radius, radius);
  ctx.lineTo(0, radius + 12);
  ctx.lineTo(radius, radius);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = shape.style.stroke;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shape.label, markerX, 0);
  ctx.restore();
}

export function drawShape2D(ctx, shape, view) {
  if (!ctx || !shape || shape.visible === false) return false;
  const geometry = transformShapeToCanvas(shape, view);
  if (!geometry) return false;

  ctx.save();
  ctx.beginPath();
  appendPath(ctx, shape, geometry);
  const isArea = shape.semanticType === 'area';
  const hatchType = shape.hatch?.type || 'default';
  const fillArea = isArea && (hatchType === 'default' || hatchType === 'solid');
  if ((isArea ? fillArea : shape.style.fill) && shape.type !== SHAPE_2D_TYPES.LINE) {
    const alpha = ctx.globalAlpha;
    ctx.fillStyle = shape.style.fillColor;
    ctx.globalAlpha = alpha * shape.style.fillOpacity;
    ctx.fill();
    ctx.globalAlpha = alpha;
  }
  if (shape.style.strokeWidth > 0) {
    ctx.strokeStyle = shape.style.stroke;
    ctx.lineWidth = shape.style.strokeWidth;
    ctx.stroke();
  }
  if (isArea) drawAreaHatch(ctx, shape, geometry, view);
  if (shape.type === SHAPE_2D_TYPES.ELEVATION) drawElevationDetails(ctx, shape, geometry, view);
  ctx.restore();
  return true;
}

export function drawShapes2D(ctx, shapes, view) {
  if (!Array.isArray(shapes)) return 0;
  return shapes.reduce((count, shape) => count + (drawShape2D(ctx, shape, view) ? 1 : 0), 0);
}
