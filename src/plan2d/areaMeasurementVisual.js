import { formatArea } from './areaMeasurement.js';

export function formatAreaDistance(meters) {
  if (meters < 1) return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(meters * 100)} cm`;
  return `${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(meters)} m`;
}

export function formatAreaSegmentDistance(start, end) {
  return formatAreaDistance(Math.hypot(end.x - start.x, end.z - start.z));
}

export function areaSegmentLabelLayout(start, end, toCanvas, offsetPx = 14) {
  const [x1, y1] = toCanvas(start.x, start.z);
  const [x2, y2] = toCanvas(end.x, end.z);
  const lengthPx = Math.hypot(x2 - x1, y2 - y1);
  if (lengthPx < 16) return null;
  return {
    x: (x1 + x2) / 2 - ((y2 - y1) / lengthPx) * offsetPx,
    y: (y1 + y2) / 2 + ((x2 - x1) / lengthPx) * offsetPx,
    label: formatAreaSegmentDistance(start, end),
  };
}

export function circleMeasurementLabels(circle) {
  return [
    `Radio: ${formatAreaDistance(circle.radius)}`,
    `Diámetro: ${formatAreaDistance(circle.radius * 2)}`,
    `Área: ${formatArea(circle.area).squareMeters}`,
    `Circunferencia: ${formatAreaDistance(circle.circumference)}`,
  ];
}

export function circleCanvasGeometry(circle, toCanvas, scale) {
  const [centerX, centerY] = toCanvas(circle.center.x, circle.center.z);
  return { centerX, centerY, radiusPx: circle.radius * scale };
}
