import { documentPointToWorld } from '../utils/planTransform.js';

const FALLBACK_COLOR = '#334155';
const MIN_CONTRAST = 2.2;
export const MIN_TEXT_RENDER_PX = 3;
export const MIN_FONT_PX = 4;
export const MAX_FONT_PX = 120;

export function drawVectorPlan2D(ctx, plan, view, options = {}) {
  if (!ctx || plan?.renderType !== 'VECTOR' || plan?.visible === false) return false;
  const metersPerUnit = Number(plan?.calibration?.metersPerDocumentUnit);
  if (!Number.isFinite(metersPerUnit) || metersPerUnit <= 0) return false;

  const entities = Array.isArray(plan?.vector?.entities) ? plan.vector.entities : [];
  const layers = new Map(
    (plan?.vector?.layers || []).map((layer) => [String(layer?.name || '0'), layer])
  );
  const toCanvas = view?.toCanvas;
  const scale = Number(view?.scale);
  if (typeof toCanvas !== 'function' || !Number.isFinite(scale) || scale <= 0) return false;

  ctx.save();
  ctx.globalAlpha *= clamp(Number(plan.opacity), 0, 1, 0.35);
  ctx.lineWidth = Number(options.lineWidth) || 1.25;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const entity of entities) {
    const layer = layers.get(String(entity?.layer || '0'));
    if (entity?.style?.visible === false || layer?.visible === false) continue;
    if (entity?.type === 'TEXT') {
      drawTextEntity(ctx, entity, layer, plan, {
        toCanvas,
        scale,
        invertZ: view.invertZ === true,
        backgroundColor: options.backgroundColor,
      });
      continue;
    }
    if (entity?.type === 'DIMENSION') {
      drawDimensionEntity(ctx, entity, layer, plan, {
        toCanvas,
        scale,
        invertZ: view.invertZ === true,
        backgroundColor: options.backgroundColor,
      });
      continue;
    }
    if (!['LINE', 'POLYLINE', 'ARC', 'CIRCLE'].includes(entity?.type)) continue;

    ctx.strokeStyle = resolveEntityColor(entity, layer, options.backgroundColor);
    ctx.beginPath();
    appendEntityPath(ctx, entity, plan, { toCanvas, scale, invertZ: view.invertZ === true });
    ctx.stroke();
  }

  ctx.restore();
  return true;
}

function drawDimensionEntity(ctx, entity, layer, plan, view) {
  const geometry = entity?.geometry;
  if (!geometry) return;
  const color = resolveEntityColor(entity, layer, view.backgroundColor);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  for (const line of [...(geometry.extensionLines || []), ...(geometry.dimensionLines || [])]) {
    appendLine(ctx, line?.start, line?.end, plan, view);
  }
  ctx.stroke();

  for (const arrow of geometry.arrows || []) drawDimensionArrow(ctx, arrow, plan, view);

  const displayText = String(geometry.displayText ?? '');
  if (geometry.textPosition && displayText) {
    const [x, y] = pointToCanvas(geometry.textPosition, plan, view);
    const sourceHeight = Number(geometry.textHeight);
    const rawFontSize = sourceHeight > 0
      ? sourceHeight * Number(plan.calibration.metersPerDocumentUnit) * view.scale
      : 12;
    if (!Number.isFinite(rawFontSize) || (sourceHeight > 0 && rawFontSize < MIN_TEXT_RENDER_PX)) {
      ctx.restore();
      return;
    }
    const fontSize = Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, rawFontSize));
    const direction = view.invertZ ? -1 : 1;
    const rotation = screenAngle(
      (Number(plan?.transform?.rotation) || 0) + (Number(geometry.rotation) || 0),
      direction
    );
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, 0, 0);
  }
  ctx.restore();
}

function drawDimensionArrow(ctx, arrow, plan, view) {
  if (!arrow?.point || !arrow?.direction) return;
  const [x, y] = pointToCanvas(arrow.point, plan, view);
  const rotation = Number(plan?.transform?.rotation) || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const directionSign = view.invertZ ? -1 : 1;
  const dx = arrow.direction.x * cos - arrow.direction.y * sin;
  const dy = directionSign * (arrow.direction.x * sin + arrow.direction.y * cos);
  const length = 7;
  const halfWidth = 3;
  const nx = -dy;
  const ny = dx;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx * length + nx * halfWidth, y + dy * length + ny * halfWidth);
  ctx.lineTo(x + dx * length - nx * halfWidth, y + dy * length - ny * halfWidth);
  ctx.closePath();
  ctx.fill();
}

function drawTextEntity(ctx, entity, layer, plan, view) {
  const geometry = entity?.geometry;
  const value = String(geometry?.value || '');
  const height = Number(geometry?.height);
  if (!geometry?.position || !value || !Number.isFinite(height) || height <= 0) return;

  const rawFontSize = height * Number(plan.calibration.metersPerDocumentUnit) * view.scale;
  if (!Number.isFinite(rawFontSize) || rawFontSize < MIN_TEXT_RENDER_PX) return;

  const fontSize = Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, rawFontSize));
  const lines = value.split(/\r?\n/);
  const lineHeight = fontSize * 1.2;
  const [x, y] = pointToCanvas(geometry.position, plan, view);
  const direction = view.invertZ ? -1 : 1;
  const rotation = screenAngle(
    (Number(plan?.transform?.rotation) || 0) + (Number(geometry.rotation) || 0),
    direction
  );
  const textAlign = resolveTextAlign(geometry.horizontalAlignment, geometry.sourceType, geometry.verticalAlignment);
  const textBaseline = resolveTextBaseline(geometry.verticalAlignment, geometry.sourceType);
  const firstLineY = resolveFirstLineY(lines.length, lineHeight, textBaseline);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = resolveEntityColor(entity, layer, view.backgroundColor);
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  lines.forEach((line, index) => ctx.fillText(line, 0, firstLineY + index * lineHeight));
  ctx.restore();
}

function resolveTextAlign(value, sourceType, verticalAlignment) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'CENTER' || normalized === 'MIDDLE' || Number(value) === 1) return 'center';
  if (normalized === 'RIGHT' || Number(value) === 2) return 'right';

  if (sourceType === 'MTEXT') {
    const attachment = Number(verticalAlignment);
    if ([2, 5, 8].includes(attachment)) return 'center';
    if ([3, 6, 9].includes(attachment)) return 'right';
  }
  return 'left';
}

function resolveTextBaseline(value, sourceType) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'TOP') return 'top';
  if (normalized === 'MIDDLE' || normalized === 'CENTER') return 'middle';
  if (normalized === 'BOTTOM') return 'bottom';
  if (normalized === 'BASELINE' || normalized === 'ALPHABETIC') return 'alphabetic';

  const numeric = Number(value);
  if (sourceType === 'MTEXT') {
    if ([1, 2, 3].includes(numeric)) return 'top';
    if ([4, 5, 6].includes(numeric)) return 'middle';
    if ([7, 8, 9].includes(numeric)) return 'bottom';
  } else {
    if (numeric === 1) return 'bottom';
    if (numeric === 2) return 'middle';
    if (numeric === 3) return 'top';
  }
  return 'alphabetic';
}

function resolveFirstLineY(lineCount, lineHeight, baseline) {
  if (lineCount <= 1 || baseline === 'top') return 0;
  if (baseline === 'middle') return -((lineCount - 1) * lineHeight) / 2;
  if (baseline === 'bottom') return -(lineCount - 1) * lineHeight;
  return 0;
}

function appendEntityPath(ctx, entity, plan, view) {
  const geometry = entity.geometry || {};
  if (entity.type === 'LINE') {
    appendLine(ctx, geometry.start, geometry.end, plan, view);
    return;
  }
  if (entity.type === 'ARC') {
    appendArc(ctx, geometry, plan, view);
    return;
  }
  if (entity.type === 'CIRCLE') {
    appendCircle(ctx, geometry, plan, view);
    return;
  }

  if (Array.isArray(geometry.segments) && geometry.segments.length) {
    for (const segment of geometry.segments) {
      if (segment?.kind === 'ARC') appendArc(ctx, segment, plan, view);
      else if (segment?.start && segment?.end) appendLine(ctx, segment.start, segment.end, plan, view);
    }
    return;
  }

  const points = geometry.points || [];
  points.forEach((point, index) => {
    const [x, y] = pointToCanvas(point, plan, view);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (geometry.closed && points.length > 1) ctx.closePath();
}

function appendLine(ctx, start, end, plan, view) {
  if (!start || !end) return;
  const [x1, y1] = pointToCanvas(start, plan, view);
  const [x2, y2] = pointToCanvas(end, plan, view);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function appendArc(ctx, arc, plan, view) {
  if (!arc?.center || !(Number(arc.radius) > 0)) return;
  const [cx, cy] = pointToCanvas(arc.center, plan, view);
  const radius = Number(arc.radius) * Number(plan.calibration.metersPerDocumentUnit) * view.scale;
  const rotation = Number(plan?.transform?.rotation) || 0;
  const direction = view.invertZ ? -1 : 1;
  const start = screenAngle(Number(arc.startAngle) + rotation, direction);
  const sweep = (Number(arc.sweepAngle) || 0) * direction;
  ctx.moveTo(cx + Math.cos(start) * radius, cy + Math.sin(start) * radius);
  ctx.arc(cx, cy, radius, start, start + sweep, sweep < 0);
}

function appendCircle(ctx, circle, plan, view) {
  if (!circle?.center || !(Number(circle.radius) > 0)) return;
  const [cx, cy] = pointToCanvas(circle.center, plan, view);
  const radius = Number(circle.radius) * Number(plan.calibration.metersPerDocumentUnit) * view.scale;
  ctx.moveTo(cx + radius, cy);
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
}

function pointToCanvas(point, plan, view) {
  const world = documentPointToWorld(point, plan);
  return view.toCanvas(world.x, world.z);
}

function screenAngle(angle, direction) {
  return Math.atan2(direction * Math.sin(angle), Math.cos(angle));
}

function resolveEntityColor(entity, layer, backgroundColor = '#ffffff') {
  const explicit = entity?.style?.colorMode === 'EXPLICIT' ? entity.style.color : null;
  const candidate = explicit || layer?.color || FALLBACK_COLOR;
  return contrastRatio(candidate, backgroundColor) >= MIN_CONTRAST ? candidate : FALLBACK_COLOR;
}

function contrastRatio(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function luminance(color) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(color || ''));
  if (!match) return 0;
  const channels = [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
  return channels.reduce((sum, value, index) => {
    const linear = value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}

function clamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
