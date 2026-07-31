export function resolveDimensionScreenGeometry(dimension, toCanvas) {
  const [startX, startY] = toCanvas(dimension.startPoint.x, dimension.startPoint.z);
  const [endX, endY] = toCanvas(dimension.endPoint.x, dimension.endPoint.z);
  const offset = dimension.offset || 0;

  if (dimension.type === 'LINEAR_HORIZONTAL') {
    return {
      start: [startX, startY],
      end: [endX, endY],
      dimStart: [startX, startY - offset],
      dimEnd: [endX, startY - offset],
    };
  }
  if (dimension.type === 'LINEAR_VERTICAL') {
    return {
      start: [startX, startY],
      end: [endX, endY],
      dimStart: [startX + offset, startY],
      dimEnd: [startX + offset, endY],
    };
  }

  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = (-dy / length) * offset;
  const normalY = (dx / length) * offset;
  return {
    start: [startX, startY],
    end: [endX, endY],
    dimStart: [startX + normalX, startY + normalY],
    dimEnd: [endX + normalX, endY + normalY],
  };
}

export function resolveDimensionTextPosition(dimension, toCanvas) {
  const geometry = resolveDimensionScreenGeometry(dimension, toCanvas);
  const dx = geometry.dimEnd[0] - geometry.dimStart[0];
  const dy = geometry.dimEnd[1] - geometry.dimStart[1];
  const length = Math.hypot(dx, dy) || 1;
  const along = { x: dx / length, y: dy / length };
  const normal = { x: -along.y, y: along.x };
  const alongPx = Number(dimension?.textOffset?.alongPx) || 0;
  const normalPx = Number(dimension?.textOffset?.normalPx) || 0;

  return {
    x: (geometry.dimStart[0] + geometry.dimEnd[0]) / 2 + along.x * alongPx + normal.x * normalPx,
    y: (geometry.dimStart[1] + geometry.dimEnd[1]) / 2 + along.y * alongPx + normal.y * normalPx,
    along,
    normal,
    geometry,
  };
}

export function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= Number.EPSILON) {
    return Math.hypot(point.x - start[0], point.y - start[1]);
  }
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start[0]) * dx + (point.y - start[1]) * dy) / lengthSquared)
  );
  return Math.hypot(point.x - (start[0] + dx * t), point.y - (start[1] + dy * t));
}
