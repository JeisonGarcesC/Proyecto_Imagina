const EPSILON = 1e-12;

export function resolveDxfBulge(start, end, bulge) {
  const b = Number(bulge) || 0;
  const dx = Number(end?.x) - Number(start?.x);
  const dy = Number(end?.y) - Number(start?.y);
  const chord = Math.hypot(dx, dy);

  if (!Number.isFinite(chord) || chord <= EPSILON || Math.abs(b) <= EPSILON) {
    return { kind: 'LINE', start: copyPoint(start), end: copyPoint(end) };
  }

  const midpoint = {
    x: (Number(start.x) + Number(end.x)) / 2,
    y: (Number(start.y) + Number(end.y)) / 2,
  };
  const centerOffset = (chord * (1 - b * b)) / (4 * b);
  const normalX = -dy / chord;
  const normalY = dx / chord;
  const center = {
    x: midpoint.x + normalX * centerOffset,
    y: midpoint.y + normalY * centerOffset,
  };
  const startAngle = Math.atan2(Number(start.y) - center.y, Number(start.x) - center.x);
  const sweepAngle = 4 * Math.atan(b);

  return {
    kind: 'ARC',
    start: copyPoint(start),
    end: copyPoint(end),
    center,
    radius: (chord * (1 + b * b)) / (4 * Math.abs(b)),
    startAngle,
    endAngle: startAngle + sweepAngle,
    sweepAngle,
    clockwise: sweepAngle < 0,
    bulge: b,
  };
}

function copyPoint(point) {
  return { x: Number(point?.x), y: Number(point?.y) };
}
