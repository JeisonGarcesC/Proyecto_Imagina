export function formatAreaDistance(meters) {
  if (meters < 1) return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(meters * 100)} cm`;
  return `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(meters)} m`;
}

export function formatAreaSegmentDistance(start, end) {
  return formatAreaDistance(Math.hypot(end.x - start.x, end.z - start.z));
}

export function circleCanvasGeometry(circle, toCanvas, scale) {
  const [centerX, centerY] = toCanvas(circle.center.x, circle.center.z);
  return { centerX, centerY, radiusPx: circle.radius * scale };
}
