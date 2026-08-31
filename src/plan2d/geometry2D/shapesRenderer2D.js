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

export function drawShape2D(ctx, shape, view) {
  if (!ctx || !shape || shape.visible === false) return false;
  const geometry = transformShapeToCanvas(shape, view);
  if (!geometry) return false;

  ctx.save();
  ctx.beginPath();
  appendPath(ctx, shape, geometry);
  if (shape.style.fill && shape.type !== SHAPE_2D_TYPES.LINE) {
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
  ctx.restore();
  return true;
}

export function drawShapes2D(ctx, shapes, view) {
  if (!Array.isArray(shapes)) return 0;
  return shapes.reduce((count, shape) => count + (drawShape2D(ctx, shape, view) ? 1 : 0), 0);
}
