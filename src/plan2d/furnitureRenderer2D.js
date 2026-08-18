import { FOOTPRINT2D_TYPES } from './footprint2D.js';

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function drawRectangleFallback(ctx, widthPx, depthPx) {
  ctx.beginPath();
  ctx.rect(-widthPx / 2, -depthPx / 2, widthPx, depthPx);
  return { renderedType: FOOTPRINT2D_TYPES.RECTANGLE, fallback: true };
}

function resolveFootprintScale(footprint, widthPx, depthPx) {
  const footprintWidth = Math.abs(finiteNumber(footprint?.bounds?.w));
  const footprintDepth = Math.abs(finiteNumber(footprint?.bounds?.d));
  if (footprintWidth <= Number.EPSILON || footprintDepth <= Number.EPSILON) return null;
  return { x: widthPx / footprintWidth, z: depthPx / footprintDepth };
}

function resolvePolygonPoints(footprint, scale, zSign) {
  if (!Array.isArray(footprint?.points) || footprint.points.length < 3) return null;
  const centerX = finiteNumber(footprint?.center?.x);
  const centerZ = finiteNumber(footprint?.center?.z);
  const points = footprint.points.map((point) => {
    const x = Number(point?.x);
    const z = Number(point?.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    return {
      x: (x - centerX) * scale.x,
      y: (z - centerZ) * scale.z * zSign,
    };
  });
  return points.every(Boolean) ? points : null;
}

function drawPolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.closePath();
}

export function drawFurnitureFootprint2D(
  ctx,
  part,
  { scale = 1, invertZ = true } = {}
) {
  if (!ctx?.beginPath || !ctx?.rect) return null;
  const normalizedScale = Math.max(0, finiteNumber(scale, 1));
  const widthPx = Math.max(0, finiteNumber(part?.w)) * normalizedScale;
  const depthPx = Math.max(0, finiteNumber(part?.d)) * normalizedScale;
  const footprint = part?.footprint;
  const footprintScale = resolveFootprintScale(footprint, widthPx, depthPx);
  if (!footprint || !footprintScale) {
    return drawRectangleFallback(ctx, widthPx, depthPx);
  }

  try {
    if (footprint.type === FOOTPRINT2D_TYPES.RECTANGLE) {
      ctx.beginPath();
      ctx.rect(-widthPx / 2, -depthPx / 2, widthPx, depthPx);
      return { renderedType: FOOTPRINT2D_TYPES.RECTANGLE, fallback: false };
    }

    if (footprint.type === FOOTPRINT2D_TYPES.CIRCLE && typeof ctx.arc === 'function') {
      const radiusX = Math.abs(
        finiteNumber(footprint.radiusX, footprint.bounds.w / 2) * footprintScale.x
      );
      const radiusZ = Math.abs(
        finiteNumber(footprint.radiusZ, footprint.bounds.d / 2) * footprintScale.z
      );
      if (radiusX <= Number.EPSILON || radiusZ <= Number.EPSILON) {
        return drawRectangleFallback(ctx, widthPx, depthPx);
      }
      ctx.beginPath();
      if (Math.abs(radiusX - radiusZ) <= 1e-9) {
        ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
      } else if (typeof ctx.save === 'function' && typeof ctx.scale === 'function') {
        ctx.save();
        ctx.scale(radiusX / radiusZ, 1);
        ctx.arc(0, 0, radiusZ, 0, Math.PI * 2);
        ctx.restore();
      } else if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(0, 0, radiusX, radiusZ, 0, 0, Math.PI * 2);
      } else {
        return drawRectangleFallback(ctx, widthPx, depthPx);
      }
      return { renderedType: FOOTPRINT2D_TYPES.CIRCLE, fallback: false };
    }

    if (footprint.type === FOOTPRINT2D_TYPES.ELLIPSE && typeof ctx.ellipse === 'function') {
      const radiusX = Math.abs(
        finiteNumber(footprint.radiusX, footprint.bounds.w / 2) * footprintScale.x
      );
      const radiusZ = Math.abs(
        finiteNumber(footprint.radiusZ, footprint.bounds.d / 2) * footprintScale.z
      );
      if (radiusX <= Number.EPSILON || radiusZ <= Number.EPSILON) {
        return drawRectangleFallback(ctx, widthPx, depthPx);
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusZ, 0, 0, Math.PI * 2);
      return { renderedType: FOOTPRINT2D_TYPES.ELLIPSE, fallback: false };
    }

    if (
      footprint.type === FOOTPRINT2D_TYPES.POLYGON ||
      footprint.type === FOOTPRINT2D_TYPES.TRIANGLE
    ) {
      const points = resolvePolygonPoints(footprint, footprintScale, invertZ ? -1 : 1);
      if (!points) return drawRectangleFallback(ctx, widthPx, depthPx);
      drawPolygon(ctx, points);
      return { renderedType: footprint.type, fallback: false };
    }
  } catch {
    return drawRectangleFallback(ctx, widthPx, depthPx);
  }

  return drawRectangleFallback(ctx, widthPx, depthPx);
}

