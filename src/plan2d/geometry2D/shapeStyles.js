export const DEFAULT_SHAPE_STYLE = Object.freeze({
  stroke: '#000000',
  strokeWidth: 1,
  fill: false,
  fillColor: '#000000',
  fillOpacity: 1,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeShapeStyle(style = {}) {
  const strokeWidth = Number(style.strokeWidth);
  const fillOpacity = Number(style.fillOpacity);
  return {
    stroke: typeof style.stroke === 'string' ? style.stroke : DEFAULT_SHAPE_STYLE.stroke,
    strokeWidth:
      Number.isFinite(strokeWidth) && strokeWidth >= 0
        ? strokeWidth
        : DEFAULT_SHAPE_STYLE.strokeWidth,
    fill: style.fill === true,
    fillColor:
      typeof style.fillColor === 'string' ? style.fillColor : DEFAULT_SHAPE_STYLE.fillColor,
    fillOpacity: Number.isFinite(fillOpacity)
      ? clamp(fillOpacity, 0, 1)
      : DEFAULT_SHAPE_STYLE.fillOpacity,
  };
}
