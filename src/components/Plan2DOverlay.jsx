import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { buildSnapGeometry, resolveSnapPoint, SNAP_LABELS } from '../plan2d/geometrySnap2D';
import {
  createDimension2D,
  dimensionHitDistance,
  dimensionTextHitDistance,
  DIMENSION_TYPES,
  updateDimension2D,
} from '../plan2d/dimension2D';
import { drawDimension2D } from '../plan2d/dimensionRenderer2D';
import { resolveDimensionTextPosition } from '../plan2d/dimensionGeometry2D';
import { getResolvedDimension2D } from '../plan2d/dimensionReferenceResolver';
import { drawFurnitureFootprint2D, FURNITURE_2D_RENDER_MODES } from '../plan2d/furnitureRenderer2D';
import { hitTestFootprint2D } from '../plan2d/footprintGeometry2D';
import {
  collectSelected2DDetailKeys,
  is2DDetailEnabled,
  updateDetailed2DIds,
} from '../plan2d/detailSelection2D';
import {
  classifySelectionWindow,
  collectSelectionCandidates,
  SELECTION_WINDOW_TYPES,
} from '../plan2d/selectionGeometry2D';
import { HISTORY_ACTION_TYPES } from '../history/historyManager';
import {
  documentPointToWorld,
  getPlanWorldBounds,
  worldPointToDocument,
} from '../core/plans/utils/planTransform';
import { drawVectorPlan2D } from '../core/plans/renderers/vectorPlanRenderer2D';
import {
  getDuctCimbras,
  pruneCimbraVisibility,
  resolveSelectedKoncisaPostId,
} from '../plan2d/koncisaCimbraGeometry2D';
import { drawShapes2D } from '../plan2d/geometry2D/shapesRenderer2D';
import { resolveFinishStyle2D } from '../plan2d/finishAppearance2D';
import { createShapeFromTool } from '../plan2d/geometry2D/shapeEditor2D';
import {
  getShapeCenter2D,
  getShapeHandles2D,
  moveShape2D,
  pickShapeHandle2D,
  resizeShape2D,
  rotateShape2D,
  selectInteractiveShapeAtPoint,
} from '../plan2d/geometry2D/shapeInteraction2D';
import { getEdukWidthInfoByCode } from '../mepal/eduk/products/edukShelfHeightDefinition';
import { createWallDefinition } from '../core/architecture/walls/wallDefinition';
import { selectWallAtPoint } from '../core/architecture/walls/wallInteraction2D';
import {
  buildJoinedWallsGeometry2D,
  getJoinedWallGeometry,
} from '../core/architecture/walls/wallJoins2D';
import {
  createColumnDefinition,
  COLUMN_SHAPES,
} from '../core/architecture/columns/columnDefinition';
import { buildColumnGeometry2D } from '../core/architecture/columns/columnGeometry2D';
import { selectColumnAtPoint } from '../core/architecture/columns/columnInteraction2D';
import { buildArchitectureSnapGeometry } from '../core/architecture/snapping/architectureSnapGeometry2D';
import {
  createDoorDefinition,
  validateDoorPlacement,
} from '../core/architecture/openings/doorDefinition';
import {
  buildDoorGeometry2D,
  buildWallSegmentPolygons2D,
  projectPointToWallSegment,
} from '../core/architecture/openings/doorGeometry2D';
import { selectOpeningAtPoint } from '../core/architecture/openings/openingInteraction2D';

//Zoom escalas del 2d
const MIN_ZOOM = 2;
const MAX_ZOOM = 50_000;
const ZOOM_FACTOR = 0.0015;
const MEASURE_SNAP_TOLERANCE_PX = 10;
const ARCHITECTURE_SNAP_TOLERANCE_PX = 10;
const VARIANT_HANDLE_HIT_RADIUS_PX = 14;
const VARIANT_HANDLE_STEP_PX = 26;
const VARIANT_HANDLE_DEADZONE_PX = 8;
const CALIBRATION_UNIT_TO_METERS = Object.freeze({ mm: 0.001, cm: 0.01, m: 1 });

function fmtMeters(m) {
  if (!isFinite(m)) return '';
  const r2 = Math.round(m * 100) / 100;
  const r0 = Math.round(m);
  return Math.abs(r2 - r0) < 0.005 ? `${r0} m` : `${r2.toFixed(2)} m`;
}

function drawDimText(ctx, x1, y1, x2, y2, label, opts = {}) {
  const {
    font = '12px sans-serif',
    pad = 3,
    bg = 'rgba(255,255,255,0.88)',
    fg = 'rgba(0,0,0,0.75)',
  } = opts;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const ang = Math.atan2(y2 - y1, x2 - x1);

  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(ang);
  ctx.font = font;

  const w = ctx.measureText(label).width;
  const h = 12;

  ctx.fillStyle = bg;
  ctx.fillRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);

  ctx.restore();
}
function fmtMeasure(m) {
  if (!isFinite(m)) return '';
  const mm = Math.round(m * 1000);

  if (m < 1) return `${mm} mm`;

  const m2 = Math.round(m * 100) / 100;
  return `${m2.toFixed(2)} m`;
}

function formatDocumentDistance(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return Number(number.toPrecision(7)).toString();
}

function drawMeasureLine(ctx, x1, y1, x2, y2, label, opts = {}) {
  const {
    preview = false,
    line = preview ? 'rgba(245, 158, 11, 0.95)' : 'rgba(37, 99, 235, 0.95)',
    text = preview ? 'rgba(146, 64, 14, 0.95)' : 'rgba(30, 64, 175, 0.95)',
    bg = 'rgba(255,255,255,0.95)',
  } = opts;

  const ang = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const tick = 8;

  ctx.save();

  ctx.strokeStyle = line;
  ctx.fillStyle = line;
  ctx.lineWidth = 2;

  if (preview) ctx.setLineDash([8, 6]);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.setLineDash([]);

  // marcas perpendiculares
  ctx.beginPath();
  ctx.moveTo(x1 + nx * tick, y1 + ny * tick);
  ctx.lineTo(x1 - nx * tick, y1 - ny * tick);
  ctx.moveTo(x2 + nx * tick, y2 + ny * tick);
  ctx.lineTo(x2 - nx * tick, y2 - ny * tick);
  ctx.stroke();

  // puntos extremos
  ctx.beginPath();
  ctx.arc(x1, y1, 3, 0, Math.PI * 2);
  ctx.arc(x2, y2, 3, 0, Math.PI * 2);
  ctx.fill();

  drawDimText(ctx, x1, y1, x2, y2, label, {
    fg: text,
    bg,
    font: '12px sans-serif',
  });

  ctx.restore();
}

function upsertDimension(dimensions, dimension) {
  if (!dimension) return dimensions;
  const index = dimensions.findIndex((candidate) => candidate.id === dimension.id);
  if (index < 0) return [...dimensions, dimension];
  return dimensions.map((candidate, candidateIndex) =>
    candidateIndex === index ? dimension : candidate
  );
}

function dimensionsAreEqual(before, after) {
  if (before === after) return true;
  if (!before || !after) return false;
  return JSON.stringify(before) === JSON.stringify(after);
}

function applySelectionOperation(selectedIds, candidateIds, operation) {
  const current = new Set(selectedIds || []);
  if (operation === 'ADD') {
    candidateIds.forEach((id) => current.add(id));
    return Array.from(current);
  }
  if (operation === 'REMOVE') {
    candidateIds.forEach((id) => current.delete(id));
    return Array.from(current);
  }
  return Array.from(new Set(candidateIds));
}

function createDimensionSnapReference(resolved) {
  if (!resolved?.snapped) return null;
  return {
    type: resolved.type,
    sourceId: resolved.sourceId,
    ...(resolved.feature ? { feature: { ...resolved.feature } } : {}),
  };
}

const EMPTY_DETAILED_2D_IDS = new Set();

export default function Plan2DOverlay({
  historyApi,
  getSnapshot,
  selectedIds = [],
  detailed2DIds = EMPTY_DETAILED_2D_IDS,
  onDetailed2DIdsChange,
  moveAsGroup = false,
  onPickIds,
  resolveSelectionTargetIds,
  onPickId,
  walls = [],
  wallMode = false,
  selectedWallId = null,
  onSelectWall,
  wallHeight = 2.4,
  wallThickness = 0.1,
  onAddWall,
  onSetWalls,
  columns = [],
  columnMode = 'NONE',
  columnShape = COLUMN_SHAPES.RECTANGLE,
  columnWidth = 0.3,
  columnDepth = 0.3,
  columnDiameter = 0.3,
  columnHeight = 2.4,
  selectedColumnId = null,
  onSelectColumn,
  onAddColumn,
  openings = [],
  openingMode = 'NONE',
  doorWidth = 0.9,
  doorHeight = 2.1,
  selectedOpeningId = null,
  onSelectOpening,
  onAddOpening,
  width = '100%',
  height = 220,
  defaultVisible = true,
  title = 'Planta 2D',
  invertZ = true,
  plan2DSrc,
  plan2DVisible = true,
  plan2DTransform = {
    metersPerPixel: 0.01,
    offsetX: 0,
    offsetZ: 0,
    opacity: 0.35,
  },
  plan2DDefinition = null,
  planEditMode = false,
  onPlanPositionChange,
  onPlan2DRasterChange,
  calibrationRequestId = 0,
  onPlanCalibrationChange,
  onPlan2DTransformChange,
  onMovePart2D,
  onMoveParts2D,
  onBeginMove2D,
  onEndMove2D,
  onCancelMove2D,
  isPartMovementLocked2D,
  transformTool = 'move',
  onBeginRotation2D,
  onUpdateRotation2D,
  onEndRotation2D,
  onCancelRotation2D,
  getRotationState2D,
  shapes2D = [],
  shapeTool2D = null,
  selectedShape2DId = null,
  onAddShape2D,
  onSelectShape2D,
  onReplaceShape2D,
  onDeleteSelectedShape2D,
}) {
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState(null);
  const [measureHover, setMeasureHover] = useState(null);
  const [measureSnap, setMeasureSnap] = useState(null);
  const [dimensions, setDimensions] = useState([]);
  const [selectedDimensionId, setSelectedDimensionId] = useState(null);
  const selectedDimension =
    dimensions.find((dimension) => dimension.id === selectedDimensionId) || null;

  const recordDimensionHistoryAction = useCallback(
    (action) => historyApi?.recordDimensionHistoryAction?.(action) || null,
    [historyApi]
  );

  const replayDimensionHistoryAction = useCallback((action, direction) => {
    const snapshot = direction === 'undo' ? action.before : action.after;
    const sourceDimension = snapshot?.dimension || null;
    const dimension = sourceDimension ? createDimension2D(sourceDimension) : null;

    if (action.type === HISTORY_ACTION_TYPES.CREATE_DIMENSION) {
      if (direction === 'undo') {
        const dimensionId = action.after?.dimension?.id;
        setDimensions((current) => current.filter((item) => item.id !== dimensionId));
        setSelectedDimensionId((current) => (current === dimensionId ? null : current));
      } else if (dimension) {
        setDimensions((current) => upsertDimension(current, dimension));
        setSelectedDimensionId(dimension.id);
      }
      return true;
    }

    if (action.type === HISTORY_ACTION_TYPES.UPDATE_DIMENSION && dimension) {
      setDimensions((current) => upsertDimension(current, dimension));
      return true;
    }

    if (action.type === HISTORY_ACTION_TYPES.DELETE_DIMENSION) {
      if (direction === 'undo' && dimension) {
        setDimensions((current) => upsertDimension(current, dimension));
        setSelectedDimensionId(dimension.id);
      } else {
        const dimensionId = action.before?.dimension?.id;
        setDimensions((current) => current.filter((item) => item.id !== dimensionId));
        setSelectedDimensionId((current) => (current === dimensionId ? null : current));
      }
      return true;
    }

    return false;
  }, []);

  useEffect(() => {
    if (!historyApi?.setDimensionHistoryReplayHandler) return undefined;
    historyApi.setDimensionHistoryReplayHandler(replayDimensionHistoryAction);
    return () => historyApi.setDimensionHistoryReplayHandler(null);
  }, [historyApi, replayDimensionHistoryAction]);

  const applyDimensionUpdate = useCallback(
    (id, changes) => {
      const targetId = id || selectedDimensionId;
      if (!targetId) return false;
      const before = dimensions.find((dimension) => dimension.id === targetId);
      if (!before) return false;
      const nextDimensions = updateDimension2D(dimensions, targetId, changes);
      const after = nextDimensions.find((dimension) => dimension.id === targetId);
      if (!after || dimensionsAreEqual(before, after)) return false;

      setDimensions(nextDimensions);
      recordDimensionHistoryAction({
        type: HISTORY_ACTION_TYPES.UPDATE_DIMENSION,
        dimensionId: targetId,
        before: { dimension: before },
        after: { dimension: after },
      });
      return true;
    },
    [dimensions, selectedDimensionId, recordDimensionHistoryAction]
  );

  const [scaleMode, setScaleMode] = useState(false);
  const [scaleStartPx, setScaleStartPx] = useState(null);
  const [scaleHoverPx, setScaleHoverPx] = useState(null);
  const [calibrationDraft, setCalibrationDraft] = useState(null);

  const [dragPieceId, setDragPieceId] = useState(null);
  const [hoveredMovablePieceId, setHoveredMovablePieceId] = useState(null);
  const [hoveredVariantHandleDir, setHoveredVariantHandleDir] = useState(0);
  const [isVariantHandleDragging, setIsVariantHandleDragging] = useState(false);
  const dragPieceRef = useRef(null);
  const variantHandleDragRef = useRef(null);
  const [selectionDrag, setSelectionDrag] = useState(null);
  const selectionDragRef = useRef(null);
  const dimensionTextDragRef = useRef(null);
  const suppressNextClickRef = useRef(false);
  const rotationDragRef = useRef(null);
  const shapeDragRef = useRef(null);
  const [isRotatingPiece, setIsRotatingPiece] = useState(false);

  const planImageRef = useRef(null);
  const planDragRef = useRef(null);
  const [isPlanHovered, setIsPlanHovered] = useState(false);
  const [isPlanDragging, setIsPlanDragging] = useState(false);
  const onPlan2DRasterChangeRef = useRef(onPlan2DRasterChange);
  onPlan2DRasterChangeRef.current = onPlan2DRasterChange;

  const getRuntimePlan = useCallback(() => {
    const img = planImageRef.current;
    const widthPx = img?.naturalWidth || img?.width || plan2DDefinition?.raster?.widthPx || 0;
    const heightPx = img?.naturalHeight || img?.height || plan2DDefinition?.raster?.heightPx || 0;
    const {
      metersPerPixel = 0.01,
      offsetX = 0,
      offsetZ = 0,
      rotation = 0,
      scale = 1,
      opacity = 0.35,
    } = plan2DTransform || {};

    return {
      ...(plan2DDefinition || {}),
      raster: { widthPx, heightPx },
      transform: {
        ...(plan2DDefinition?.transform || {}),
        position: { x: offsetX, z: offsetZ },
        rotation,
        scale,
      },
      calibration: {
        ...(plan2DDefinition?.calibration || {}),
        metersPerDocumentUnit: metersPerPixel,
      },
      opacity,
    };
  }, [plan2DDefinition, plan2DTransform]);

  const canvasToPlanPixel = useCallback(
    (mx, my) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || canvas.width;
      const height = rect.height || canvas.height;
      const { cx, cz, s } = viewRef.current;
      const sign = invertZ ? -1 : 1;
      const worldPoint = {
        x: (mx - width / 2) / s + cx,
        z: ((my - height / 2) / s) * sign + cz,
      };
      const runtimePlan = getRuntimePlan();
      const documentPoint = worldPointToDocument(worldPoint, runtimePlan);
      const isVector = runtimePlan.renderType === 'VECTOR';
      const bounds = runtimePlan.vector?.bounds;
      const minX = isVector ? Number(bounds?.minX) : 0;
      const minY = isVector ? Number(bounds?.minY) : 0;
      const maxX = isVector ? Number(bounds?.maxX) : Number(runtimePlan.raster?.widthPx);
      const maxY = isVector ? Number(bounds?.maxY) : Number(runtimePlan.raster?.heightPx);
      if (
        ![minX, minY, maxX, maxY].every(Number.isFinite) ||
        documentPoint.x < minX ||
        documentPoint.y < minY ||
        documentPoint.x > maxX ||
        documentPoint.y > maxY
      ) {
        return null;
      }

      return documentPoint;
    },
    [getRuntimePlan, invertZ]
  );

  const canInteractWithPlan = Boolean(
    plan2DDefinition &&
    plan2DVisible &&
    (plan2DDefinition.renderType === 'VECTOR' || planImageRef.current) &&
    planEditMode &&
    plan2DDefinition.locked === false
  );

  useEffect(() => {
    if (!plan2DSrc || plan2DDefinition?.renderType === 'VECTOR') {
      planImageRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      planImageRef.current = img;
      onPlan2DRasterChangeRef.current?.({
        widthPx: img.naturalWidth || img.width,
        heightPx: img.naturalHeight || img.height,
      });
    };
    img.onerror = () => {
      console.error('No se pudo cargar el plano 2D:', plan2DSrc);
      planImageRef.current = null;
    };
    img.src = plan2DSrc;
  }, [plan2DSrc, plan2DDefinition?.renderType]);

  useEffect(() => {
    setScaleStartPx(null);
    setScaleHoverPx(null);
    setCalibrationDraft(null);
    setScaleMode(false);
  }, [plan2DSrc, plan2DDefinition?.id]);

  useEffect(() => {
    if (!calibrationRequestId || (!plan2DSrc && plan2DDefinition?.renderType !== 'VECTOR')) return;
    setCalibrationDraft(null);
    setScaleStartPx(null);
    setScaleHoverPx(null);
    setScaleMode(true);
    setMeasureMode(false);
    setMeasureStart(null);
    setMeasureHover(null);
    setMeasureSnap(null);
  }, [calibrationRequestId, plan2DSrc, plan2DDefinition?.renderType]);

  const isWallDrawMode = wallMode === true || wallMode === 'DRAW';

  const canvasRef = useRef(null);

  useEffect(() => {
    if (canInteractWithPlan) return;

    const session = planDragRef.current;
    planDragRef.current = null;
    setIsPlanDragging(false);
    setIsPlanHovered(false);

    if (session && canvasRef.current?.hasPointerCapture?.(session.pointerId)) {
      canvasRef.current.releasePointerCapture(session.pointerId);
    }
  }, [canInteractWithPlan]);

  // visible toggle
  const [visible, setVisible] = useState(defaultVisible);
  const [viewMode, setViewMode] = useState('normal');
  const [cimbraVisiblePostIds, setCimbraVisiblePostIds] = useState(() => new Set());
  const [showFinishes2D, setShowFinishes2D] = useState(false);
  const latestSnapshotRef = useRef([]);

  // draft muros
  const [draftPts, setDraftPts] = useState([]); // [{x,z}...]
  const [mouseWorld, setMouseWorld] = useState(null);
  const [architectureSnap, setArchitectureSnap] = useState(null);
  const [doorPreview, setDoorPreview] = useState(null);

  // View transform (pan/zoom)
  const viewRef = useRef({
    cx: 0, // centro world X
    cz: 0, // centro world Z
    s: 80, // pixeles por metro (zoom)
    initialized: false,
  });

  // drag/pan
  const dragRef = useRef({
    isDown: false,
    mode: null, // 'PAN'
    startMx: 0,
    startMy: 0,
    startCx: 0,
    startCz: 0,
  });

  const resolveCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { w: 0, h: 0 };
    // width puede venir en px o '100%'
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width || canvas.width, h: rect.height || canvas.height };
  }, []);

  const getAllBounds = useCallback(() => {
    const snap = (getSnapshot?.() || []).filter(Boolean);

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    // 1) Piezas
    for (const p of snap) {
      minX = Math.min(minX, p.x - p.w / 2);
      maxX = Math.max(maxX, p.x + p.w / 2);
      minZ = Math.min(minZ, p.z - p.d / 2);
      maxZ = Math.max(maxZ, p.z + p.d / 2);
    }

    // 2) Muros existentes
    const joinedWallsBounds = buildJoinedWallsGeometry2D(walls);
    for (const wallGeometry of joinedWallsBounds.wallGeometries) {
      const wallBounds = wallGeometry.bounds;
      if (!wallBounds) continue;
      minX = Math.min(minX, wallBounds.minX);
      maxX = Math.max(maxX, wallBounds.maxX);
      minZ = Math.min(minZ, wallBounds.minZ);
      maxZ = Math.max(maxZ, wallBounds.maxZ);
    }

    for (const column of columns || []) {
      if (column?.visible === false) continue;
      const columnBounds = buildColumnGeometry2D(column).bounds;
      minX = Math.min(minX, columnBounds.minX);
      maxX = Math.max(maxX, columnBounds.maxX);
      minZ = Math.min(minZ, columnBounds.minZ);
      maxZ = Math.max(maxZ, columnBounds.maxZ);
    }

    // 3) Muro en construcción
    for (const pt of draftPts || []) {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minZ = Math.min(minZ, pt.z);
      maxZ = Math.max(maxZ, pt.z);
    }

    // 4) Preview del mouse
    if (mouseWorld) {
      minX = Math.min(minX, mouseWorld.x);
      maxX = Math.max(maxX, mouseWorld.x);
      minZ = Math.min(minZ, mouseWorld.z);
      maxZ = Math.max(maxZ, mouseWorld.z);
    }

    // 5) Plano importado (SVG / PDF convertido / imagen)
    if (plan2DVisible && (planImageRef.current || plan2DDefinition?.renderType === 'VECTOR')) {
      const planBounds = getPlanWorldBounds(getRuntimePlan());
      minX = Math.min(minX, planBounds.minX);
      maxX = Math.max(maxX, planBounds.maxX);
      minZ = Math.min(minZ, planBounds.minZ);
      maxZ = Math.max(maxZ, planBounds.maxZ);
    }

    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minZ) || !isFinite(maxZ)) {
      return null;
    }

    return { minX, maxX, minZ, maxZ, snap };
  }, [getSnapshot, walls, columns, draftPts, mouseWorld, plan2DVisible, getRuntimePlan]);

  const ensureInitializedView = useCallback(() => {
    const b = getAllBounds();
    if (!b) return;

    const { minX, maxX, minZ, maxZ } = b;

    const { w, h } = resolveCanvasSize();
    if (!w || !h) return;

    const pad = 18;
    const spanX = Math.max(0.001, maxX - minX);
    const spanZ = Math.max(0.001, maxZ - minZ);

    const sx = (w - pad * 2) / spanX;
    const sz = (h - pad * 2) / spanZ;

    const fitS = Math.min(sx, sz);

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    viewRef.current = {
      cx,
      cz,
      s: Math.max(MIN_ZOOM, Math.min(260, fitS)), // clamp zoom razonable
      initialized: true,
    };
  }, [getAllBounds, resolveCanvasSize]);

  // World <-> Canvas
  const toCanvas = useCallback(
    (x, z) => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];

      const rect = canvas.getBoundingClientRect();
      const w = rect.width || canvas.width;
      const h = rect.height || canvas.height;

      const { cx, cz, s } = viewRef.current;

      const px = (x - cx) * s + w / 2;

      // ✅ Este es el punto de “al revés”
      // invertZ=true => canvas Y sube cuando Z baja (como “plano” típico)
      // invertZ=false => canvas Y sube cuando Z sube
      const sign = invertZ ? -1 : 1;
      const py = sign * (z - cz) * s + h / 2;

      return [px, py];
    },
    [invertZ]
  );

  const canvasToWorld = useCallback(
    (mx, my) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width || canvas.width;
      const h = rect.height || canvas.height;

      const { cx, cz, s } = viewRef.current;

      const x = (mx - w / 2) / s + cx;

      const sign = invertZ ? -1 : 1;
      const z = ((my - h / 2) / s) * sign + cz;

      return { x, z };
    },
    [invertZ]
  );

  const hitTestPlanAtCanvasPoint = useCallback(
    (mx, my) => {
      if (!canInteractWithPlan) return null;
      const worldPoint = canvasToWorld(mx, my);
      if (!worldPoint) return null;
      const runtimePlan = getRuntimePlan();
      const documentPoint = worldPointToDocument(worldPoint, runtimePlan);
      const isVector = runtimePlan.renderType === 'VECTOR';
      const bounds = runtimePlan.vector?.bounds;
      const minX = isVector ? bounds?.minX : 0;
      const minY = isVector ? bounds?.minY : 0;
      const maxX = isVector ? bounds?.maxX : runtimePlan.raster?.widthPx;
      const maxY = isVector ? bounds?.maxY : runtimePlan.raster?.heightPx;
      const inside =
        documentPoint.x >= minX &&
        documentPoint.y >= minY &&
        documentPoint.x <= maxX &&
        documentPoint.y <= maxY;

      return inside ? { worldPoint, documentPoint } : null;
    },
    [canInteractWithPlan, canvasToWorld, getRuntimePlan]
  );

  const resolveMeasureSnap = useCallback(
    (mx, my) => {
      const worldPoint = canvasToWorld(mx, my);
      if (!worldPoint) return null;
      return resolveSnapPoint({
        worldPoint,
        screenPoint: { x: mx, y: my },
        scale: viewRef.current.s,
        geometry: buildSnapGeometry(getSnapshot?.() || []),
        tolerancePx: MEASURE_SNAP_TOLERANCE_PX,
      });
    },
    [canvasToWorld, getSnapshot]
  );

  const pickDimensionAtCanvasPoint = useCallback(
    (mx, my) => {
      const mouseWorldPoint = canvasToWorld(mx, my);
      if (!mouseWorldPoint) return null;
      const snapGeometry = buildSnapGeometry(getSnapshot?.() || []);
      let closest = null;
      let closestDistance = Infinity;
      dimensions.forEach((dimension) => {
        const resolvedDimension = getResolvedDimension2D({ dimension, snapGeometry });
        const distance = dimensionHitDistance({
          mouseWorldPoint,
          screenPoint: { x: mx, y: my },
          dimension: resolvedDimension,
          tolerance: 8,
          view: { toCanvas },
        });
        if (distance < closestDistance) {
          closest = { dimension, resolvedDimension };
          closestDistance = distance;
        }
      });
      return closest;
    },
    [canvasToWorld, dimensions, getSnapshot, toCanvas]
  );

  const commitWall = useCallback(() => {
    if ((draftPts?.length || 0) < 2) return;

    const wall = createWallDefinition({
      id: `WALL_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      points: draftPts,
      height: wallHeight,
      thickness: wallThickness,
    });

    if (wall) onAddWall?.(wall);
    setDraftPts([]);
    setMouseWorld(null);
  }, [draftPts, wallHeight, wallThickness, onAddWall]);

  const clearDraft = useCallback(() => {
    setDraftPts([]);
    setMouseWorld(null);
  }, []);

  const clearMeasureDraft = useCallback(() => {
    setMeasureStart(null);
    setMeasureHover(null);
    setMeasureSnap(null);
  }, []);

  const clearMeasurements = useCallback(() => {
    setDimensions([]);
    setSelectedDimensionId(null);
    clearMeasureDraft();
  }, [clearMeasureDraft]);

  // fit view button
  const fitView = useCallback(() => {
    viewRef.current.initialized = false;
    ensureInitializedView();
  }, [ensureInitializedView]);

  const pickFootprintHit = useCallback(
    (mx, my, p) => {
      const [px, py] = toCanvas(p.x, p.z);
      const worldPoint = canvasToWorld(mx, my);
      if (!worldPoint || !hitTestFootprint2D(p, worldPoint)) return null;
      const dx = mx - px;
      const dy = my - py;
      return dx * dx + dy * dy;
    },
    [toCanvas, canvasToWorld]
  );

  const architectureSnapGeometry = useMemo(
    () =>
      buildArchitectureSnapGeometry({
        walls,
        columns,
        furniture: getSnapshot?.() || [],
      }),
    [walls, columns, getSnapshot, selectedIds]
  );

  const resolveArchitectureSnap = useCallback(
    (mx, my) => {
      const worldPoint = canvasToWorld(mx, my);
      if (!worldPoint) return null;
      return resolveSnapPoint({
        worldPoint,
        screenPoint: { x: mx, y: my },
        scale: viewRef.current.s,
        geometry: architectureSnapGeometry,
        tolerancePx: ARCHITECTURE_SNAP_TOLERANCE_PX,
      });
    },
    [architectureSnapGeometry, canvasToWorld]
  );

  const resolveDoorAtCanvasPoint = useCallback(
    (mx, my) => {
      const worldPoint = canvasToWorld(mx, my);
      if (!worldPoint) return null;
      const joined = buildJoinedWallsGeometry2D(walls);
      let best = null;
      joined.wallGeometries.forEach((wallGeometry) =>
        wallGeometry.segmentsGeometry.forEach((segment) => {
          const projection = projectPointToWallSegment(worldPoint, segment);
          if (!best || projection.distance < best.distance)
            best = { wallId: wallGeometry.wallId, segment, ...projection };
        })
      );
      const tolerance = 12 / Math.max(viewRef.current.s, Number.EPSILON);
      if (!best || best.distance > tolerance) return null;
      const door = createDoorDefinition({
        wallId: best.wallId,
        segmentId: best.segment.segmentId,
        offset: best.offset,
        width: doorWidth,
        height: doorHeight,
      });
      const validation = validateDoorPlacement(door, walls, openings);
      return { door, validation, geometry: buildDoorGeometry2D(door, walls, openings) };
    },
    [canvasToWorld, walls, openings, doorWidth, doorHeight]
  );

  useEffect(() => {
    if (isWallDrawMode || columnMode === 'PLACE' || openingMode === 'PLACE') return;
    setArchitectureSnap(null);
  }, [isWallDrawMode, columnMode, openingMode]);

  useEffect(() => {
    if (openingMode === 'PLACE') return;
    setDoorPreview(null);
  }, [openingMode]);

  const pickPartAtCanvasPoint = useCallback(
    (mx, my) => {
      const snap = getAllBounds()?.snap || [];
      let best = null;
      let bestDist = Infinity;

      for (const p of snap) {
        const dist = pickFootprintHit(mx, my, p);
        if (dist == null || dist >= bestDist) continue;
        bestDist = dist;
        best = p;
      }

      return best;
    },
    [getAllBounds, pickFootprintHit]
  );

  const getSelectionTargetIds = useCallback(
    (part, snapshot) => {
      if (!part?.id) return [];
      const groupId = String(part.groupId || '').trim();
      if (!moveAsGroup || !groupId) return [part.id];

      return Array.from(
        new Set(
          snapshot
            .filter((candidate) => String(candidate?.groupId || '').trim() === groupId)
            .map((candidate) => candidate.id)
            .filter(Boolean)
        )
      );
    },
    [moveAsGroup]
  );

  const getRotationHandle = useCallback(() => {
    if (transformTool !== 'rotate') return null;
    const sourceId = selectedIds?.[selectedIds.length - 1];
    if (!sourceId) return null;
    const snap = getAllBounds()?.snap || [];
    const source = snap.find((part) => part.id === sourceId);
    const state = getRotationState2D?.(sourceId);
    if (!source || !state) return null;

    const [pivotPx, pivotPy] = toCanvas(state.pivotX, state.pivotZ);
    const { s } = viewRef.current;
    const boundsWidth = Number(state.boundsWidth) || source.w;
    const boundsDepth = Number(state.boundsDepth) || source.d;
    const radiusPx = Math.max(
      38,
      Math.min(110, Math.hypot(boundsWidth * s, boundsDepth * s) / 2 + 24)
    );
    const screenAngle = -(state.angle || 0);
    return {
      sourceId,
      pivotX: state.pivotX,
      pivotZ: state.pivotZ,
      pivotPx,
      pivotPy,
      radiusPx,
      knobX: pivotPx + Math.cos(screenAngle) * radiusPx,
      knobY: pivotPy + Math.sin(screenAngle) * radiusPx,
      angle: state.angle || 0,
    };
  }, [transformTool, selectedIds, getAllBounds, getRotationState2D, toCanvas]);

  const resolveActiveVariantControl2D = useCallback(
    (snapList = null) => {
      if (transformTool !== 'move') return null;
      if (measureMode || scaleMode || isWallDrawMode) return null;

      const sourceId = selectedIds?.[selectedIds.length - 1];
      if (!sourceId) return null;

      const snap = snapList || getAllBounds()?.snap || [];
      const source = snap.find((part) => part.id === sourceId);
      if (!source || source.kind !== 'EDUK') return null;

      const widthInfo = getEdukWidthInfoByCode(source.codigoPT);
      if (!widthInfo) return null;

      const [cx, cy] = toCanvas(source.x, source.z);
      const { s } = viewRef.current;
      const halfWidthPx = Math.max(8, (source.w * s) / 2);
      const spanPx = halfWidthPx + 16;

      const angle = -(source.rotY || 0);
      const axisX = Math.cos(angle);
      const axisY = Math.sin(angle);

      const left = {
        x: cx - axisX * spanPx,
        y: cy - axisY * spanPx,
        dir: -1,
      };
      const right = {
        x: cx + axisX * spanPx,
        y: cy + axisY * spanPx,
        dir: 1,
      };

      return {
        type: 'EDUK_WIDTH',
        source,
        sourceId,
        code: source.codigoPT,
        instanceId: source.id,
        options: [...widthInfo.widthOptions],
        currentIndex: widthInfo.currentIndex,
        propertyKey: 'width',
        center: { x: cx, y: cy },
        axis: { x: axisX, y: axisY },
        dragAxis: { x: axisX, y: axisY },
        handles: [left, right],
        family: source.kind,
      };
    },
    [transformTool, measureMode, scaleMode, isWallDrawMode, selectedIds, getAllBounds, toCanvas]
  );

  const pickVariantHandleDirection = useCallback((mx, my, control) => {
    if (!control?.handles?.length) return 0;
    let bestDir = 0;
    let bestDist = Infinity;
    for (const handle of control.handles) {
      const dist = Math.hypot(mx - handle.x, my - handle.y);
      if (dist <= VARIANT_HANDLE_HIT_RADIUS_PX && dist < bestDist) {
        bestDist = dist;
        bestDir = handle.dir;
      }
    }
    return bestDir;
  }, []);

  const resolveVariantDragTargetIndex = useCallback((startIndex, projectedDeltaPx, optionCount) => {
    if (Math.abs(projectedDeltaPx) <= VARIANT_HANDLE_DEADZONE_PX) {
      return Math.max(0, Math.min(optionCount - 1, startIndex));
    }
    const deltaSteps = Math.round(projectedDeltaPx / VARIANT_HANDLE_STEP_PX);
    return Math.max(0, Math.min(optionCount - 1, startIndex + deltaSteps));
  }, []);

  const processVariantHandleDragQueue = useCallback(async () => {
    const session = variantHandleDragRef.current;
    if (!session || session.isApplying) return;
    if (session.targetIndex === session.currentIndex) return;

    session.isApplying = true;

    try {
      while (variantHandleDragRef.current === session) {
        if (session.targetIndex === session.currentIndex) break;

        const targetValue = session.options?.[session.targetIndex];
        if (!targetValue || !session.propertyKey) break;

        await historyApi?.swapEdukVariant?.(session.instanceId, session.code, {
          [session.propertyKey]: targetValue,
        });

        const latestSource = (getSnapshot?.() || []).find((item) => item.id === session.instanceId);
        if (latestSource?.codigoPT) {
          session.code = latestSource.codigoPT;
          const refreshed = getEdukWidthInfoByCode(session.code);
          if (refreshed) {
            session.currentIndex = refreshed.currentIndex;
            session.options = [...refreshed.widthOptions];
            continue;
          }
        }

        // Fallback to avoid tight retry loops if snapshot refresh lags one frame.
        session.currentIndex = session.targetIndex;
      }
    } finally {
      if (variantHandleDragRef.current === session) {
        session.isApplying = false;
      }
    }

    const active = variantHandleDragRef.current;
    if (active === session && session.targetIndex !== session.currentIndex && !session.isApplying) {
      Promise.resolve().then(() => {
        void processVariantHandleDragQueue();
      });
    }
  }, [historyApi, getSnapshot]);

  const cancelVariantHandleDrag = useCallback((pointerId = null) => {
    const session = variantHandleDragRef.current;
    if (!session) return false;
    if (pointerId != null && session.pointerId !== pointerId) return false;

    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture?.(session.pointerId)) {
      canvas.releasePointerCapture(session.pointerId);
    }

    variantHandleDragRef.current = null;
    setIsVariantHandleDragging(false);
    setHoveredVariantHandleDir(0);
    return true;
  }, []);

  // Pointer move for wall preview, pan and piece dragging.
  const handlePointerMove = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const shapeDrag = shapeDragRef.current;
      if (shapeDrag?.pointerId === e.pointerId) {
        const world = canvasToWorld(mx, my);
        if (!world) return;
        const point = { x: world.x, y: world.z };
        let nextShape = shapeDrag.initialShape;
        if (shapeDrag.mode === 'move') {
          nextShape = moveShape2D(shapeDrag.initialShape, {
            x: point.x - shapeDrag.startWorld.x,
            y: point.y - shapeDrag.startWorld.y,
          });
        } else if (shapeDrag.mode === 'resize') {
          nextShape = resizeShape2D(shapeDrag.initialShape, shapeDrag.handleId, point);
        } else if (shapeDrag.mode === 'rotate') {
          const center = getShapeCenter2D(shapeDrag.initialShape);
          const angle = Math.atan2(point.y - center.y, point.x - center.x);
          nextShape = rotateShape2D(
            shapeDrag.initialShape,
            shapeDrag.startRotation + angle - shapeDrag.startPointerAngle
          );
        }
        shapeDrag.hasMoved = true;
        onReplaceShape2D?.(nextShape);
        e.preventDefault();
        return;
      }

      if (scaleMode && scaleStartPx) {
        const w = rect.width || canvas.width;
        const h = rect.height || canvas.height;
        const p = canvasToPlanPixel(mx, my, w, h);
        if (!p) return;
        setScaleHoverPx(p);
        return;
      }

      const planDrag = planDragRef.current;
      if (planDrag?.pointerId === e.pointerId) {
        if (!canInteractWithPlan) {
          planDragRef.current = null;
          setIsPlanDragging(false);
          return;
        }

        const worldPoint = canvasToWorld(mx, my);
        if (!worldPoint) return;
        onPlanPositionChange?.({
          x: planDrag.initialPosition.x + worldPoint.x - planDrag.startWorld.x,
          z: planDrag.initialPosition.z + worldPoint.z - planDrag.startWorld.z,
        });
        e.preventDefault();
        return;
      }

      const variantDrag = variantHandleDragRef.current;
      if (variantDrag?.pointerId === e.pointerId) {
        const projectedDeltaPxRaw =
          (mx - variantDrag.startMx) * variantDrag.dragAxis.x +
          (my - variantDrag.startMy) * variantDrag.dragAxis.y;
        const projectedDeltaPx = projectedDeltaPxRaw * (variantDrag.dragDir || 1);
        const nextTarget = resolveVariantDragTargetIndex(
          variantDrag.startIndex,
          projectedDeltaPx,
          variantDrag.options.length
        );
        if (nextTarget !== variantDrag.targetIndex) {
          variantDrag.targetIndex = nextTarget;
          void processVariantHandleDragQueue();
        }
        if ((variantDrag.dragDir || 0) !== hoveredVariantHandleDir) {
          setHoveredVariantHandleDir(variantDrag.dragDir || 0);
        }
        e.preventDefault();
        return;
      }

      if (
        !dragRef.current.isDown &&
        !selectionDragRef.current &&
        !dimensionTextDragRef.current &&
        !dragPieceRef.current &&
        !rotationDragRef.current
      ) {
        const planHit =
          !measureMode && !scaleMode && !isWallDrawMode ? hitTestPlanAtCanvasPoint(mx, my) : null;
        setIsPlanHovered(Boolean(planHit));
        if (planHit) {
          setHoveredMovablePieceId(null);
          setHoveredVariantHandleDir(0);
          return;
        }

        const variantControl = resolveActiveVariantControl2D();
        const variantDir = variantControl ? pickVariantHandleDirection(mx, my, variantControl) : 0;
        if (variantDir !== hoveredVariantHandleDir) {
          setHoveredVariantHandleDir(variantDir);
        }
      }

      // pan dragging
      if (dragRef.current.isDown && dragRef.current.mode === 'PAN') {
        const { startMx, startMy, startCx, startCz } = dragRef.current;
        const dx = mx - startMx;
        const dy = my - startMy;

        const { s } = viewRef.current;

        const nx = startCx - dx / s;

        const sign = invertZ ? -1 : 1;
        const nz = startCz - (dy / s) * sign;

        viewRef.current.cx = nx;
        viewRef.current.cz = nz;
        return;
      }

      const activeSelectionDrag = selectionDragRef.current;
      if (activeSelectionDrag?.pointerId === e.pointerId) {
        const currentWorld = canvasToWorld(mx, my);
        if (!currentWorld) return;
        const currentScreen = { x: mx, y: my };
        const nextSelectionDrag = {
          ...activeSelectionDrag,
          currentScreen,
          currentWorld,
          direction: classifySelectionWindow(activeSelectionDrag.startScreen, currentScreen),
        };
        selectionDragRef.current = nextSelectionDrag;
        setSelectionDrag(nextSelectionDrag);
        return;
      }

      const dimensionTextDrag = dimensionTextDragRef.current;
      if (dimensionTextDrag?.pointerId === e.pointerId) {
        const deltaX = e.clientX - dimensionTextDrag.startClientX;
        const deltaY = e.clientY - dimensionTextDrag.startClientY;
        const movedPx = Math.hypot(deltaX, deltaY);
        if (!dimensionTextDrag.hasMoved && movedPx < 2) return;

        const textOffset = {
          alongPx:
            dimensionTextDrag.initialTextOffset.alongPx +
            deltaX * dimensionTextDrag.along.x +
            deltaY * dimensionTextDrag.along.y,
          normalPx:
            dimensionTextDrag.initialTextOffset.normalPx +
            deltaX * dimensionTextDrag.normal.x +
            deltaY * dimensionTextDrag.normal.y,
        };
        const nextDimension = createDimension2D({
          ...dimensionTextDrag.before,
          textOffset,
        });
        if (!nextDimension) return;

        dimensionTextDrag.hasMoved = true;
        dimensionTextDrag.after = nextDimension;
        setDimensions((current) => upsertDimension(current, nextDimension));
        return;
      }

      const pieceDrag = dragPieceRef.current;

      const rotationDrag = rotationDragRef.current;
      if (rotationDrag?.pointerId === e.pointerId) {
        const world = canvasToWorld(mx, my);
        if (!world) return;
        const pointerAngle = Math.atan2(
          world.z - rotationDrag.pivotZ,
          world.x - rotationDrag.pivotX
        );
        onUpdateRotation2D?.(
          pointerAngle - rotationDrag.startPointerAngle,
          e.shiftKey ? Math.PI / 12 : 0
        );
        return;
      }

      if (pieceDrag && pieceDrag.pointerId === e.pointerId) {
        const movedPx = Math.hypot(
          e.clientX - pieceDrag.startClientX,
          e.clientY - pieceDrag.startClientY
        );
        if (!pieceDrag.hasMoved && movedPx < 4) return;

        if (!pieceDrag.hasMoved && pieceDrag.replaceSelectionOnDrag) {
          onPickIds?.(pieceDrag.selectionIds);
        }
        pieceDrag.hasMoved = true;
        const world = canvasToWorld(mx, my);
        if (!world) return;

        const deltaX = world.x - pieceDrag.startWorldX;
        const deltaZ = world.z - pieceDrag.startWorldZ;

        if (pieceDrag.initialPositions.length > 1) {
          onMoveParts2D?.(
            pieceDrag.initialPositions.map(({ id, x, z }) => ({
              id,
              x: x + deltaX,
              z: z + deltaZ,
            }))
          );
        } else {
          const initial = pieceDrag.initialPositions[0];
          onMovePart2D?.(pieceDrag.id, initial.x + deltaX, initial.z + deltaZ);
        }
        return;
      }

      if (measureMode) {
        const resolved = resolveMeasureSnap(mx, my);
        if (!resolved) return;
        setMeasureSnap(resolved.snapped ? resolved : null);
        if (measureStart) setMeasureHover(resolved.point);
        return;
      }

      if (isWallDrawMode) {
        const resolved = resolveArchitectureSnap(mx, my);
        if (!resolved) return;
        setArchitectureSnap(resolved.snapped ? resolved : null);
        setMouseWorld({ x: resolved.point.x, z: resolved.point.z });
        return;
      }

      if (openingMode === 'PLACE') {
        setDoorPreview(resolveDoorAtCanvasPoint(mx, my));
        return;
      }

      if (columnMode === 'PLACE') {
        const resolved = resolveArchitectureSnap(mx, my);
        setArchitectureSnap(resolved?.snapped ? resolved : null);
        return;
      }

      if (!measureMode && !scaleMode) {
        const hovered = pickPartAtCanvasPoint(mx, my);
        const isMovable = hovered?.id && !isPartMovementLocked2D?.(hovered.id);
        setHoveredMovablePieceId(isMovable ? hovered.id : null);
      }
    },
    [
      measureMode,
      measureStart,
      isWallDrawMode,
      columnMode,
      canvasToWorld,
      resolveArchitectureSnap,
      openingMode,
      resolveDoorAtCanvasPoint,
      invertZ,
      scaleMode,
      scaleStartPx,
      canvasToPlanPixel,
      onMovePart2D,
      onMoveParts2D,
      onPickIds,
      onUpdateRotation2D,
      pickPartAtCanvasPoint,
      isPartMovementLocked2D,
      resolveActiveVariantControl2D,
      pickVariantHandleDirection,
      resolveVariantDragTargetIndex,
      processVariantHandleDragQueue,
      hoveredVariantHandleDir,
      canInteractWithPlan,
      canvasToWorld,
      onPlanPositionChange,
      hitTestPlanAtCanvasPoint,
      onReplaceShape2D,
    ]
  );

  const cancelPieceDrag = useCallback(() => {
    const pieceDrag = dragPieceRef.current;
    if (!pieceDrag) return;

    if (pieceDrag.hasMoved) {
      if (pieceDrag.initialPositions.length > 1) {
        onMoveParts2D?.(pieceDrag.initialPositions);
      } else {
        const initial = pieceDrag.initialPositions[0];
        onMovePart2D?.(pieceDrag.id, initial.x, initial.z);
      }
      suppressNextClickRef.current = true;
    }

    dragPieceRef.current = null;
    setDragPieceId(null);

    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture?.(pieceDrag.pointerId)) {
      canvas.releasePointerCapture(pieceDrag.pointerId);
    }
    onCancelMove2D?.();
  }, [onMovePart2D, onMoveParts2D, onCancelMove2D]);

  const cancelDimensionTextDrag = useCallback((pointerId) => {
    const session = dimensionTextDragRef.current;
    if (!session || (pointerId != null && session.pointerId !== pointerId)) return false;

    dimensionTextDragRef.current = null;
    if (session.hasMoved) {
      setDimensions((current) => upsertDimension(current, session.before));
      suppressNextClickRef.current = true;
    }

    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture?.(session.pointerId)) {
      canvas.releasePointerCapture(session.pointerId);
    }
    return true;
  }, []);

  const cancelSelectionDrag = useCallback((pointerId) => {
    const session = selectionDragRef.current;
    if (!session || (pointerId != null && session.pointerId !== pointerId)) return false;
    selectionDragRef.current = null;
    setSelectionDrag(null);
    return true;
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      const activeSelectionDrag = selectionDragRef.current;
      const dimensionTextDrag = dimensionTextDragRef.current;
      const pieceDrag = dragPieceRef.current;
      const rotationDrag = rotationDragRef.current;
      const variantDrag = variantHandleDragRef.current;
      const planDrag = planDragRef.current;
      const shapeDrag = shapeDragRef.current;

      if (shapeDrag?.pointerId === e.pointerId) {
        shapeDragRef.current = null;
        suppressNextClickRef.current = true;
        if (canvas?.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }

      if (planDrag?.pointerId === e.pointerId) {
        planDragRef.current = null;
        setIsPlanDragging(false);
        setIsPlanHovered(false);
        suppressNextClickRef.current = true;
        dragRef.current.isDown = false;
        dragRef.current.mode = null;
        if (canvas?.hasPointerCapture?.(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
        e.preventDefault();
        return;
      }

      if (variantDrag?.pointerId === e.pointerId) {
        cancelVariantHandleDrag(e.pointerId);
        suppressNextClickRef.current = true;
        dragRef.current.isDown = false;
        dragRef.current.mode = null;
        return;
      }

      if (activeSelectionDrag?.pointerId === e.pointerId) {
        const rect = canvas?.getBoundingClientRect?.();
        const currentScreen = rect
          ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
          : activeSelectionDrag.currentScreen;
        const currentWorld = currentScreen
          ? canvasToWorld(currentScreen.x, currentScreen.y)
          : activeSelectionDrag.currentWorld;
        const completedSelection = {
          ...activeSelectionDrag,
          currentScreen,
          currentWorld: currentWorld || activeSelectionDrag.currentWorld,
          direction: classifySelectionWindow(activeSelectionDrag.startScreen, currentScreen),
        };
        const candidates = collectSelectionCandidates(getSnapshot?.() || [], completedSelection);
        const resolvedCandidates =
          resolveSelectionTargetIds?.(candidates, {
            asGroup: moveAsGroup,
          }) || candidates;
        onPickIds?.(
          applySelectionOperation(selectedIds, resolvedCandidates, completedSelection.operation)
        );
        selectionDragRef.current = null;
        setSelectionDrag(null);
        suppressNextClickRef.current = true;
      }

      if (dimensionTextDrag?.pointerId === e.pointerId) {
        dimensionTextDragRef.current = null;
        suppressNextClickRef.current = dimensionTextDrag.hasMoved;
        if (
          dimensionTextDrag.hasMoved &&
          dimensionTextDrag.after &&
          !dimensionsAreEqual(dimensionTextDrag.before, dimensionTextDrag.after)
        ) {
          recordDimensionHistoryAction({
            type: HISTORY_ACTION_TYPES.UPDATE_DIMENSION,
            dimensionId: dimensionTextDrag.before.id,
            before: { dimension: dimensionTextDrag.before },
            after: { dimension: dimensionTextDrag.after },
          });
        }
      }

      if (rotationDrag?.pointerId === e.pointerId) {
        rotationDragRef.current = null;
        setIsRotatingPiece(false);
        suppressNextClickRef.current = true;
        onEndRotation2D?.();
      }

      if (pieceDrag?.pointerId === e.pointerId) {
        suppressNextClickRef.current = pieceDrag.hasMoved;
        dragPieceRef.current = null;
        setDragPieceId(null);
        onEndMove2D?.();
      }

      dragRef.current.isDown = false;
      dragRef.current.mode = null;

      if (canvas?.hasPointerCapture?.(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    },
    [
      canvasToWorld,
      getSnapshot,
      moveAsGroup,
      resolveSelectionTargetIds,
      selectedIds,
      onPickIds,
      onEndRotation2D,
      onEndMove2D,
      recordDimensionHistoryAction,
      cancelVariantHandleDrag,
    ]
  );

  const handlePointerCancel = useCallback(
    (e) => {
      cancelVariantHandleDrag(e.pointerId);
      shapeDragRef.current = null;
      cancelSelectionDrag(e.pointerId);
      cancelDimensionTextDrag(e.pointerId);
      cancelPieceDrag();
      handlePointerUp(e);
    },
    [
      cancelSelectionDrag,
      cancelDimensionTextDrag,
      cancelPieceDrag,
      handlePointerUp,
      cancelVariantHandleDrag,
    ]
  );

  // zoom wheel
  const handleWheel = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const before = canvasToWorld(mx, my);
      if (!before) return;

      const deltaUnit =
        e.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? rect.height
            : 1;
      const deltaPixels = e.deltaY * deltaUnit;
      const factor = Math.exp(-deltaPixels * ZOOM_FACTOR);

      const s0 = viewRef.current.s;
      const s1 = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s0 * factor));
      viewRef.current.s = s1;

      // zoom al cursor: mantener el punto bajo el mouse fijo
      const after = canvasToWorld(mx, my);
      if (!after) return;

      viewRef.current.cx += before.x - after.x;
      viewRef.current.cz += before.z - after.z;

      e.preventDefault();
    },
    [canvasToWorld]
  );

  const handleDoubleClick = useCallback(() => {
    if (!isWallDrawMode) return;
    commitWall();
  }, [isWallDrawMode, commitWall]);

  const handlePointerDown = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // pan
      if (e.button === 1 || e.button === 2) {
        dragRef.current.isDown = true;
        dragRef.current.mode = 'PAN';
        dragRef.current.startMx = mx;
        dragRef.current.startMy = my;
        dragRef.current.startCx = viewRef.current.cx;
        dragRef.current.startCz = viewRef.current.cz;
        canvas.setPointerCapture?.(e.pointerId);
        e.preventDefault();
        return;
      }

      // drag de pieza con botón izquierdo
      if (e.button !== 0) return;

      const shapeWorld = canvasToWorld(mx, my);
      if (shapeTool2D && shapeWorld) {
        onAddShape2D?.(createShapeFromTool(shapeTool2D, { x: shapeWorld.x, y: shapeWorld.z }));
        onPickIds?.([]);
        e.preventDefault();
        return;
      }

      if (shapeWorld) {
        const point = { x: shapeWorld.x, y: shapeWorld.z };
        const tolerance = 10 / Math.max(viewRef.current.s, Number.EPSILON);
        const selectedShape = shapes2D.find((shape) => shape.id === selectedShape2DId);
        const handle = selectedShape
          ? pickShapeHandle2D(
              selectedShape,
              point,
              tolerance,
              28 / Math.max(viewRef.current.s, Number.EPSILON)
            )
          : null;
        const pickedShape = handle
          ? selectedShape
          : selectInteractiveShapeAtPoint(shapes2D, point, tolerance);

        if (pickedShape) {
          onSelectShape2D?.(pickedShape.id);
          onPickIds?.([]);
          const center = getShapeCenter2D(pickedShape);
          shapeDragRef.current = {
            pointerId: e.pointerId,
            initialShape: pickedShape,
            startWorld: point,
            mode: handle?.kind || 'move',
            handleId: handle?.id || null,
            startRotation: pickedShape.geometry.rotation || 0,
            startPointerAngle: Math.atan2(point.y - center.y, point.x - center.x),
            hasMoved: false,
          };
          canvas.setPointerCapture?.(e.pointerId);
          e.preventDefault();
          return;
        }
        onSelectShape2D?.(null);
      }

      if (openingMode === 'PLACE') {
        const preview = resolveDoorAtCanvasPoint(mx, my);
        setDoorPreview(preview);
        if (preview?.validation?.valid) onAddOpening?.(preview.door);
        return;
      }

      if (openingMode === 'EDIT') {
        const worldPoint = canvasToWorld(mx, my);
        const tolerance = 8 / Math.max(viewRef.current.s, Number.EPSILON);
        onSelectOpening?.(selectOpeningAtPoint(worldPoint, openings, walls, tolerance));
        setSelectedDimensionId(null);
        return;
      }

      if (columnMode === 'PLACE') {
        const resolved = resolveArchitectureSnap(mx, my);
        if (!resolved) return;
        const position = resolved.point;
        const column = createColumnDefinition({
          shape: columnShape,
          position,
          width: columnWidth,
          depth: columnDepth,
          diameter: columnDiameter,
          height: columnHeight,
        });
        if (column) onAddColumn?.(column);
        return;
      }

      if (columnMode === 'EDIT') {
        const worldPoint = canvasToWorld(mx, my);
        const tolerance = 8 / Math.max(viewRef.current.s, Number.EPSILON);
        onSelectColumn?.(selectColumnAtPoint(worldPoint, columns, tolerance));
        setSelectedDimensionId(null);
        return;
      }

      if (wallMode === 'EDIT') {
        const worldPoint = canvasToWorld(mx, my);
        const tolerance = 8 / Math.max(viewRef.current.s, Number.EPSILON);
        const wallId = selectWallAtPoint(worldPoint, walls, tolerance);
        onSelectWall?.(wallId);
        setSelectedDimensionId(null);
        return;
      }

      if (!measureMode && !scaleMode && !isWallDrawMode) {
        const planHit = hitTestPlanAtCanvasPoint(mx, my);
        if (planHit) {
          const runtimePlan = getRuntimePlan();
          planDragRef.current = {
            pointerId: e.pointerId,
            startWorld: planHit.worldPoint,
            initialPosition: {
              x: runtimePlan.transform.position.x,
              z: runtimePlan.transform.position.z,
            },
          };
          setIsPlanDragging(true);
          setIsPlanHovered(true);
          setHoveredMovablePieceId(null);
          canvas.setPointerCapture?.(e.pointerId);
          e.preventDefault();
          return;
        }
      }

      if (!measureMode && !scaleMode && !isWallDrawMode && transformTool === 'move') {
        const variantControl = resolveActiveVariantControl2D();
        const variantDir = variantControl ? pickVariantHandleDirection(mx, my, variantControl) : 0;

        if (variantControl && variantDir !== 0) {
          const startIndex = variantControl.currentIndex;
          const optionCount = variantControl.options.length;
          const initialTarget = resolveVariantDragTargetIndex(
            startIndex,
            variantDir * VARIANT_HANDLE_STEP_PX,
            optionCount
          );

          variantHandleDragRef.current = {
            type: variantControl.type,
            pointerId: e.pointerId,
            code: variantControl.code,
            instanceId: variantControl.instanceId,
            family: variantControl.family || 'EDUK',
            axis: variantControl.axis,
            dragAxis: variantControl.dragAxis,
            dragDir: variantDir,
            startMx: mx,
            startMy: my,
            startIndex,
            currentIndex: startIndex,
            targetIndex: initialTarget,
            options: [...variantControl.options],
            propertyKey: variantControl.propertyKey,
            isApplying: false,
          };

          setIsVariantHandleDragging(true);
          setHoveredVariantHandleDir(variantDir);
          canvas.setPointerCapture?.(e.pointerId);
          void processVariantHandleDragQueue();
          e.preventDefault();
          return;
        }
      }

      if (!measureMode && !scaleMode && !isWallDrawMode) {
        const pickedDimension = pickDimensionAtCanvasPoint(mx, my);
        if (pickedDimension) {
          const { dimension, resolvedDimension } = pickedDimension;
          setSelectedDimensionId(dimension.id);
          const textDistance = dimensionTextHitDistance({
            screenPoint: { x: mx, y: my },
            dimension: resolvedDimension,
            view: { toCanvas },
          });
          if (dimension.id === selectedDimensionId && textDistance <= 4) {
            const textPosition = resolveDimensionTextPosition(resolvedDimension, toCanvas);
            dimensionTextDragRef.current = {
              pointerId: e.pointerId,
              startClientX: e.clientX,
              startClientY: e.clientY,
              initialTextOffset: dimension.textOffset || { alongPx: 0, normalPx: 0 },
              along: textPosition.along,
              normal: textPosition.normal,
              before: dimension,
              after: dimension,
              hasMoved: false,
            };
            canvas.setPointerCapture?.(e.pointerId);
          }
          e.preventDefault();
          return;
        }
      }
      if (measureMode || scaleMode || isWallDrawMode) return;

      if (transformTool === 'rotate') {
        const handle = getRotationHandle();
        if (handle && Math.hypot(mx - handle.knobX, my - handle.knobY) <= 14) {
          const world = canvasToWorld(mx, my);
          const started = world && onBeginRotation2D?.(handle.sourceId);
          if (!started) return;
          rotationDragRef.current = {
            pointerId: e.pointerId,
            pivotX: started.pivotX,
            pivotZ: started.pivotZ,
            startPointerAngle: Math.atan2(world.z - started.pivotZ, world.x - started.pivotX),
          };
          setIsRotatingPiece(true);
          canvas.setPointerCapture?.(e.pointerId);
          e.preventDefault();
          return;
        }

        const pickedForRotation = pickPartAtCanvasPoint(mx, my);
        if (pickedForRotation?.id && !e.ctrlKey && !e.metaKey) {
          onPickId?.(pickedForRotation.id);
        }
        e.preventDefault();
        return;
      }

      const picked = pickPartAtCanvasPoint(mx, my);
      if (!picked?.id) {
        const startWorld = canvasToWorld(mx, my);
        if (!startWorld) return;
        const startScreen = { x: mx, y: my };
        const nextSelectionDrag = {
          pointerId: e.pointerId,
          startScreen,
          currentScreen: startScreen,
          startWorld,
          currentWorld: startWorld,
          direction: SELECTION_WINDOW_TYPES.WINDOW,
          operation: e.ctrlKey || e.metaKey ? 'REMOVE' : e.shiftKey ? 'ADD' : 'REPLACE',
        };
        selectionDragRef.current = nextSelectionDrag;
        setSelectionDrag(nextSelectionDrag);
        setHoveredMovablePieceId(null);
        canvas.setPointerCapture?.(e.pointerId);
        e.preventDefault();
        return;
      }

      const world = canvasToWorld(mx, my);
      if (!world) return;

      const selectedSet = new Set(selectedIds || []);
      const snapshot = getSnapshot?.() || [];
      const selectionIds = getSelectionTargetIds(picked, snapshot);
      const targetIsSelected = selectionIds.every((id) => selectedSet.has(id));
      const useMultipleSelection = targetIsSelected && selectedSet.size > 1;
      const dragIds = useMultipleSelection ? Array.from(selectedSet) : selectionIds;
      const snapshotById = new Map(
        snapshot.filter((part) => part?.id).map((part) => [part.id, part])
      );
      const initialPositions = dragIds
        .map((id) => snapshotById.get(id))
        .filter(Boolean)
        .map(({ id, x, z }) => ({ id, x, z }));

      if (
        initialPositions.length !== dragIds.length ||
        dragIds.some((id) => isPartMovementLocked2D?.(id))
      ) {
        return;
      }

      onPickId?.(picked.id);

      onBeginMove2D?.(
        initialPositions.map(({ id }) => id),
        initialPositions.length > 1
      );

      setDragPieceId(picked.id);
      dragPieceRef.current = {
        id: picked.id,
        selectionIds,
        initialPositions,
        startWorldX: world.x,
        startWorldZ: world.z,
        startClientX: e.clientX,
        startClientY: e.clientY,
        hasMoved: false,
        replaceSelectionOnDrag: !targetIsSelected,
        pointerId: e.pointerId,
      };
      canvas.setPointerCapture?.(e.pointerId);

      e.preventDefault();
    },
    [
      measureMode,
      scaleMode,
      isWallDrawMode,
      transformTool,
      getRotationHandle,
      onBeginRotation2D,
      pickPartAtCanvasPoint,
      canvasToWorld,
      resolveMeasureSnap,
      selectedIds,
      getSnapshot,
      getSelectionTargetIds,
      onPickId,
      onBeginMove2D,
      isPartMovementLocked2D,
      pickDimensionAtCanvasPoint,
      selectedDimensionId,
      toCanvas,
      resolveActiveVariantControl2D,
      pickVariantHandleDirection,
      resolveVariantDragTargetIndex,
      processVariantHandleDragQueue,
      hitTestPlanAtCanvasPoint,
      getRuntimePlan,
      shapes2D,
      shapeTool2D,
      selectedShape2DId,
      onAddShape2D,
      onSelectShape2D,
      onPickIds,
    ]
  );

  useEffect(() => {
    const onEscape = (e) => {
      if (e.key !== 'Escape') return;
      shapeDragRef.current = null;
      if (rotationDragRef.current) {
        rotationDragRef.current = null;
        setIsRotatingPiece(false);
        onCancelRotation2D?.();
      }
      cancelVariantHandleDrag();
      cancelSelectionDrag();
      cancelDimensionTextDrag();
      cancelPieceDrag();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [
    onCancelRotation2D,
    cancelSelectionDrag,
    cancelDimensionTextDrag,
    cancelPieceDrag,
    cancelVariantHandleDrag,
  ]);

  useEffect(() => {
    const cancelActiveDrag = () => {
      shapeDragRef.current = null;
      cancelVariantHandleDrag();
      cancelSelectionDrag();
      cancelDimensionTextDrag();
      cancelPieceDrag();
    };
    window.addEventListener('blur', cancelActiveDrag);
    return () => window.removeEventListener('blur', cancelActiveDrag);
  }, [cancelSelectionDrag, cancelDimensionTextDrag, cancelPieceDrag, cancelVariantHandleDrag]);

  useEffect(() => {
    if (transformTool === 'rotate' || !rotationDragRef.current) return;
    rotationDragRef.current = null;
    setIsRotatingPiece(false);
    onCancelRotation2D?.();
  }, [transformTool, onCancelRotation2D]);

  useEffect(() => {
    if (transformTool !== 'move' || measureMode || scaleMode || isWallDrawMode) {
      cancelVariantHandleDrag();
    }
  }, [transformTool, measureMode, scaleMode, isWallDrawMode, cancelVariantHandleDrag]);

  const handleClick = useCallback(
    (e) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // CALIBRAR ESCALA
      if (scaleMode) {
        const w = rect.width || canvas.width;
        const h = rect.height || canvas.height;
        const p = canvasToPlanPixel(mx, my, w, h);
        if (!p) return;

        if (!scaleStartPx) {
          setScaleStartPx(p);
          setScaleHoverPx(p);
          return;
        }

        const end = p;

        const sourceDistance = Math.hypot(end.x - scaleStartPx.x, end.y - scaleStartPx.y);

        if (sourceDistance > Number.EPSILON) {
          setCalibrationDraft({
            sourceDistance,
            points: {
              a: { x: scaleStartPx.x, y: scaleStartPx.y },
              b: { x: end.x, y: end.y },
            },
            value: '1',
            unit: plan2DDefinition?.calibration?.inputUnit || 'm',
          });
        }

        setScaleStartPx(null);

        setScaleHoverPx(null);
        setScaleMode(false);
        return;
      }

      // REGLA
      if (measureMode) {
        const resolved = resolveMeasureSnap(mx, my);
        if (!resolved) return;
        const wpt = resolved.point;
        setMeasureSnap(resolved.snapped ? resolved : null);

        if (!measureStart) {
          setMeasureStart({
            x: wpt.x,
            z: wpt.z,
            reference: createDimensionSnapReference(resolved),
          });
          setMeasureHover({ x: wpt.x, z: wpt.z });
          return;
        }

        const len = Math.hypot(wpt.x - measureStart.x, wpt.z - measureStart.z);

        if (len > 0.001) {
          const dimension = createDimension2D({
            type: DIMENSION_TYPES.ALIGNED,
            startPoint: measureStart,
            endPoint: wpt,
            references: {
              start: measureStart.reference || null,
              end: createDimensionSnapReference(resolved),
            },
          });
          if (dimension) {
            setDimensions((prev) => [...prev, dimension]);
            setSelectedDimensionId(dimension.id);
            recordDimensionHistoryAction({
              type: HISTORY_ACTION_TYPES.CREATE_DIMENSION,
              dimensionId: dimension.id,
              before: null,
              after: { dimension },
            });
          }
        }

        setMeasureStart(null);
        setMeasureHover(null);
        return;
      }

      if (!isWallDrawMode) {
        const pickedDimension = pickDimensionAtCanvasPoint(mx, my);
        if (pickedDimension) {
          setSelectedDimensionId(pickedDimension.dimension.id);
          return;
        }
        setSelectedDimensionId(null);
      }

      // MUROS
      if (isWallDrawMode) {
        const resolved = resolveArchitectureSnap(mx, my);
        if (!resolved) return;
        setArchitectureSnap(resolved.snapped ? resolved : null);
        setDraftPts((prev) => [...prev, { x: resolved.point.x, z: resolved.point.z }]);
        return;
      }

      // PICK piezas
      const b = getAllBounds();
      const snap = b?.snap || [];
      const wantsMulti = e.ctrlKey || e.metaKey;
      if (!snap.length) {
        if (!wantsMulti) onPickIds?.([]);
        return;
      }

      let best = null;
      let bestDist = Infinity;

      for (const p of snap) {
        const dist = pickFootprintHit(mx, my, p);
        if (dist == null) continue;
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }

      if (!best?.id) {
        if (!wantsMulti) onPickIds?.([]);
        return;
      }

      const targetIds = getSelectionTargetIds(best, snap);

      if (!wantsMulti) {
        onPickIds?.(targetIds);
        return;
      }

      const next = new Set(selectedIds || []);
      const targetIsSelected = targetIds.every((id) => next.has(id));
      targetIds.forEach((id) => {
        if (targetIsSelected) next.delete(id);
        else next.add(id);
      });

      const arr = Array.from(next);
      onPickIds?.(arr);
    },
    [
      measureMode,
      measureStart,
      isWallDrawMode,
      canvasToWorld,
      resolveArchitectureSnap,
      resolveMeasureSnap,
      getAllBounds,
      pickFootprintHit,
      getSelectionTargetIds,
      onPickIds,
      selectedIds,
      scaleMode,
      scaleStartPx,
      canvasToPlanPixel,
      onPlan2DTransformChange,
      plan2DDefinition,
      pickDimensionAtCanvasPoint,
      recordDimensionHistoryAction,
      wallMode,
      walls,
      onSelectWall,
      columnMode,
      columnShape,
      columnWidth,
      columnDepth,
      columnDiameter,
      columnHeight,
      columns,
      onAddColumn,
      onSelectColumn,
      openingMode,
      resolveDoorAtCanvasPoint,
      onAddOpening,
      onSelectOpening,
      openings,
      shapes2D,
      shapeTool2D,
      onAddShape2D,
      onSelectShape2D,
    ]
  );

  // keys
  useEffect(() => {
    const onKey = (ev) => {
      const target = ev.target;
      const isEditableTarget =
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';
      if (isEditableTarget) return;

      const key = ev.key?.toLowerCase?.();

      if (ev.key === 'Escape') {
        if (scaleMode || calibrationDraft) {
          setScaleMode(false);
          setScaleStartPx(null);
          setScaleHoverPx(null);
          setCalibrationDraft(null);
          return;
        }
        if (measureMode) {
          clearMeasureDraft();
          return;
        }
        clearDraft();
        return;
      }

      if (ev.key === 'Enter') {
        if (isWallDrawMode) commitWall();
      }

      if (key === 'f') fitView();

      if (key === 'r') {
        setMeasureMode((prev) => {
          const next = !prev;
          if (!next) {
            setMeasureStart(null);
            setMeasureHover(null);
            setMeasureSnap(null);
          }
          return next;
        });
      }

      if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedShape2DId) {
        ev.preventDefault();
        ev.stopPropagation();
        onDeleteSelectedShape2D?.();
        return;
      }

      if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedDimensionId) {
        ev.preventDefault();
        ev.stopPropagation();
        const deletedDimension = dimensions.find(
          (dimension) => dimension.id === selectedDimensionId
        );
        setDimensions((prev) => prev.filter((dimension) => dimension.id !== selectedDimensionId));
        setSelectedDimensionId(null);
        if (deletedDimension) {
          recordDimensionHistoryAction({
            type: HISTORY_ACTION_TYPES.DELETE_DIMENSION,
            dimensionId: deletedDimension.id,
            before: { dimension: deletedDimension },
            after: null,
          });
        }
        return;
      }

      if ((ev.key === 'Delete' || ev.key === 'Backspace') && measureMode && !measureStart) {
        ev.preventDefault();
        ev.stopPropagation();
        setDimensions((prev) => prev.slice(0, -1));
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    measureMode,
    measureStart,
    isWallDrawMode,
    commitWall,
    clearDraft,
    clearMeasureDraft,
    fitView,
    selectedDimensionId,
    dimensions,
    recordDimensionHistoryAction,
    scaleMode,
    calibrationDraft,
    selectedShape2DId,
    onDeleteSelectedShape2D,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => {
      handleWheel?.(e);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => canvas.removeEventListener('wheel', onWheel);
  }, [handleWheel]);

  // Inicializa view una vez que haya contenido
  useEffect(() => {
    if (!viewRef.current.initialized) ensureInitializedView();
  }, [walls, ensureInitializedView]);

  // Draw loop
  useEffect(() => {
    let raf = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // adaptar canvas a tamaño real si width='100%'
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width || canvas.width || 1));
      const h = Math.max(1, Math.floor(rect.height || canvas.height || 1));

      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      // si no hay view init, intenta
      if (!viewRef.current.initialized) ensureInitializedView();

      const snap = (
        getSnapshot?.({
          detailed2DIds: Array.from(detailed2DIds),
        }) || []
      ).filter(Boolean);
      latestSnapshotRef.current = snap;
      const prunedCimbraPostIds = pruneCimbraVisibility(cimbraVisiblePostIds, snap);
      if (prunedCimbraPostIds.size !== cimbraVisiblePostIds.size) {
        setCimbraVisiblePostIds(prunedCimbraPostIds);
      }
      const snapGeometry = buildSnapGeometry(snap);
      const { s, cx, cz } = viewRef.current;

      const sign = invertZ ? -1 : 1;

      // helpers inline
      const toCanvasLocal = (x, z) => {
        const px = (x - cx) * s + w / 2;
        const py = sign * (z - cz) * s + h / 2;
        return [px, py];
      };

      // Fondo
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(0, 0, w, h);

      // Plano 2D de fondo
      if (plan2DVisible && planImageRef.current) {
        const img = planImageRef.current;
        const runtimePlan = getRuntimePlan();
        const metersPerDocumentUnit = runtimePlan.calibration.metersPerDocumentUnit;
        const planScale = runtimePlan.transform.scale || 1;
        const drawW = img.width * metersPerDocumentUnit * planScale * s;
        const drawH = img.height * metersPerDocumentUnit * planScale * s;
        const centerWorld = documentPointToWorld(
          { x: img.width / 2, y: img.height / 2 },
          runtimePlan
        );
        const [centerX, centerY] = toCanvasLocal(centerWorld.x, centerWorld.z);

        ctx.save();
        ctx.globalAlpha = runtimePlan.opacity;
        ctx.translate(centerX, centerY);
        ctx.rotate(sign * runtimePlan.transform.rotation);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

        ctx.restore();
      }

      if (plan2DVisible && plan2DDefinition?.renderType === 'VECTOR') {
        drawVectorPlan2D(ctx, getRuntimePlan(), {
          toCanvas: toCanvasLocal,
          scale: s,
          invertZ,
        });
      }

      // borde
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

      // grid suave
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.lineWidth = 1;

      const stepM = 1;
      const stepPx = stepM * s;

      if (stepPx > 25) {
        const xMinW = cx - w / 2 / s;
        const xMaxW = cx + w / 2 / s;
        const zMinW = cz - h / 2 / s;
        const zMaxW = cz + h / 2 / s;

        const xStart = Math.floor(xMinW / stepM) * stepM;
        const xEnd = Math.ceil(xMaxW / stepM) * stepM;

        for (let x = xStart; x <= xEnd; x += stepM) {
          const px = (x - cx) * s + w / 2;
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, h);
          ctx.stroke();
        }

        const zStart = Math.floor(zMinW / stepM) * stepM;
        const zEnd = Math.ceil(zMaxW / stepM) * stepM;

        for (let z = zStart; z <= zEnd; z += stepM) {
          const py = sign * (z - cz) * s + h / 2;
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(w, py);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Muros existentes
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const joinedWallsGeometry = buildJoinedWallsGeometry2D(walls);

      for (const wall of walls || []) {
        if (wall?.visible === false) continue;
        const pts = wall?.points || [];
        if (pts.length < 2) continue;

        const isSelected = wall.id === selectedWallId;
        const geometry = getJoinedWallGeometry(joinedWallsGeometry, wall.id);
        if (!geometry) continue;
        for (const segment of geometry.segmentsGeometry) {
          const segmentOpenings = openings.filter(
            (opening) =>
              opening.wallId === wall.id &&
              opening.segmentId === segment.segmentId &&
              validateDoorPlacement(opening, walls, openings).valid
          );
          const polygons = segmentOpenings.length
            ? buildWallSegmentPolygons2D(segment, segmentOpenings)
            : [segment.polygon];
          polygons.forEach((polygon) => {
            ctx.beginPath();
            polygon.forEach((point, index) => {
              const [x, y] = toCanvasLocal(point.x, point.z);
              if (index === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fillStyle = isSelected ? 'rgba(0,145,180,0.32)' : 'rgba(20,20,20,0.32)';
            ctx.strokeStyle = isSelected ? 'rgba(0,145,180,0.95)' : 'rgba(20,20,20,0.78)';
            ctx.lineWidth = isSelected ? 3 : 1;
            ctx.fill();
            ctx.stroke();
          });
        }

        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          const len = Math.hypot(b.x - a.x, b.z - a.z);
          const [x1, y1] = toCanvasLocal(a.x, a.z);
          const [x2, y2] = toCanvasLocal(b.x, b.z);
          const pixLen = Math.hypot(x2 - x1, y2 - y1);
          if (pixLen > 40) drawDimText(ctx, x1, y1, x2, y2, fmtMeters(len));
        }
      }

      for (const join of joinedWallsGeometry.joins) {
        if (!join.patch?.length) continue;
        const isSelected = join.wallIds.includes(selectedWallId);
        ctx.beginPath();
        join.patch.forEach((point, index) => {
          const [x, y] = toCanvasLocal(point.x, point.z);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = isSelected ? 'rgba(0,145,180,0.32)' : 'rgba(20,20,20,0.32)';
        ctx.fill();
      }

      for (const column of columns || []) {
        if (column?.visible === false) continue;
        const geometry = buildColumnGeometry2D(column);
        const isSelected = column.id === selectedColumnId;
        ctx.beginPath();
        if (geometry.shape === COLUMN_SHAPES.CIRCLE) {
          const [x, y] = toCanvasLocal(geometry.center.x, geometry.center.z);
          ctx.arc(x, y, geometry.radius * s, 0, Math.PI * 2);
        } else {
          geometry.polygon.forEach((point, index) => {
            const [x, y] = toCanvasLocal(point.x, point.z);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
        }
        ctx.fillStyle = isSelected ? 'rgba(168,92,0,0.32)' : 'rgba(70,70,70,0.28)';
        ctx.strokeStyle = isSelected ? 'rgba(190,100,0,0.95)' : 'rgba(35,35,35,0.82)';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.fill();
        ctx.stroke();
      }

      const drawDoorSymbol = (geometry, selected, preview = false) => {
        if (!geometry) return;
        const [hx, hy] = toCanvasLocal(geometry.hinge.x, geometry.hinge.z);
        const [lx, ly] = toCanvasLocal(geometry.openEnd.x, geometry.openEnd.z);
        const [cx, cy] = toCanvasLocal(geometry.closedEnd.x, geometry.closedEnd.z);
        ctx.save();
        ctx.strokeStyle =
          geometry.valid === false
            ? '#dc2626'
            : selected
              ? '#d97706'
              : preview
                ? '#16a34a'
                : '#505050';
        ctx.lineWidth = selected ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(lx, ly);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
          hx,
          hy,
          geometry.arc.radius * s,
          Math.atan2(cy - hy, cx - hx),
          Math.atan2(ly - hy, lx - hx),
          geometry.arc.counterClockwise !== invertZ
        );
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hx, hy, 3, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.restore();
      };

      for (const opening of openings || []) {
        if (opening?.visible === false) continue;
        drawDoorSymbol(
          buildDoorGeometry2D(opening, walls, openings),
          opening.id === selectedOpeningId
        );
      }
      if (openingMode === 'PLACE' && doorPreview?.geometry) {
        drawDoorSymbol(doorPreview.geometry, false, true);
        const [tx, ty] = toCanvasLocal(
          doorPreview.geometry.center.x,
          doorPreview.geometry.center.z
        );
        ctx.fillStyle = doorPreview.validation.valid ? '#166534' : '#b91c1c';
        ctx.font = '12px sans-serif';
        ctx.fillText(
          `${doorWidth.toFixed(2)} m${doorPreview.validation.valid ? '' : ' · no cabe'}`,
          tx + 10,
          ty - 10
        );
      }

      // Muro en construcción
      if (isWallDrawMode && (draftPts?.length || 0) > 0) {
        const pts = [...draftPts];
        if (mouseWorld) pts.push(mouseWorld);

        if (pts.length >= 2) {
          ctx.beginPath();
          for (let i = 0; i < pts.length; i++) {
            const [x, y] = toCanvasLocal(pts[i].x, pts[i].z);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = 'rgba(56, 194, 212, 0.95)';
          ctx.lineWidth = Math.max(1, wallThickness * s);
          ctx.stroke();

          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            const len = Math.hypot(b.x - a.x, b.z - a.z);
            const [x1, y1] = toCanvasLocal(a.x, a.z);
            const [x2, y2] = toCanvasLocal(b.x, b.z);
            const pixLen = Math.hypot(x2 - x1, y2 - y1);

            if (pixLen > 36) {
              drawDimText(ctx, x1, y1, x2, y2, fmtMeters(len), {
                fg: 'rgba(20, 80, 90, 0.95)',
                bg: 'rgba(255,255,255,0.88)',
              });
            }
          }
        }
      }

      if (scaleMode && scaleStartPx && scaleHoverPx) {
        const runtimePlan = getRuntimePlan();
        const startWorld = documentPointToWorld(scaleStartPx, runtimePlan);
        const hoverWorld = documentPointToWorld(scaleHoverPx, runtimePlan);
        const [x1, y1] = toCanvasLocal(startWorld.x, startWorld.z);
        const [x2, y2] = toCanvasLocal(hoverWorld.x, hoverWorld.z);

        const sourceLength = Math.hypot(
          scaleHoverPx.x - scaleStartPx.x,
          scaleHoverPx.y - scaleStartPx.y
        );
        const sourceLabel =
          getRuntimePlan().renderType === 'VECTOR'
            ? `${formatDocumentDistance(sourceLength)} unidades`
            : `${Math.round(sourceLength)} px`;

        drawMeasureLine(ctx, x1, y1, x2, y2, sourceLabel, {
          preview: true,
        });
      }

      // Piezas
      const selSet = new Set(selectedIds || []);

      for (const p of snap) {
        const [px, py] = toCanvasLocal(p.x, p.z);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-(p.rotY || 0));

        const isSel = selSet.has(p.id);
        // color 2D estandar o normal. azul clarito
        const normalFill = isSel ? 'rgba(56, 194, 212, 0.28)' : 'rgba(0,0,0,0.07)';
        const finishStyle = resolveFinishStyle2D(
          { fill: true, fillColor: normalFill, fillOpacity: 1 },
          p.appearance,
          showFinishes2D,
          p.type || p.kind
        );
        ctx.fillStyle = finishStyle.fillColor;
        ctx.strokeStyle = isSel ? 'rgba(56, 194, 212, 0.95)' : 'rgba(0,0,0,0.30)';
        ctx.lineWidth = isSel ? 2.2 : 1;

        drawFurnitureFootprint2D(ctx, p, {
          scale: s,
          invertZ,
          mode: is2DDetailEnabled(p, detailed2DIds)
            ? FURNITURE_2D_RENDER_MODES.DETAILED
            : FURNITURE_2D_RENDER_MODES.NORMAL,
        });
        const previousAlpha = ctx.globalAlpha;
        ctx.globalAlpha = previousAlpha * (finishStyle.fillOpacity ?? 1);
        ctx.fill();
        ctx.globalAlpha = previousAlpha;
        ctx.stroke();

        ctx.fillStyle = isSel ? 'rgba(56, 194, 212, 1)' : 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Capa visual derivada: se dibuja sobre las huellas, sin participar
      // en selección, movimiento ni persistencia.
      if (cimbraVisiblePostIds.size) {
        const cimbras = getDuctCimbras(snap, { visiblePostIds: cimbraVisiblePostIds });
        drawShapes2D(ctx, cimbras, { toCanvas: toCanvasLocal, scale: s });
      }

      drawShapes2D(ctx, shapes2D, { toCanvas: toCanvasLocal, scale: s });
      const selectedShape = shapes2D.find((shape) => shape.id === selectedShape2DId);
      if (selectedShape) {
        drawShapes2D(
          ctx,
          [
            {
              ...selectedShape,
              style: { ...selectedShape.style, stroke: '#06b6d4', strokeWidth: 3 },
            },
          ],
          { toCanvas: toCanvasLocal, scale: s }
        );
        const handles = getShapeHandles2D(selectedShape, 28 / Math.max(s, Number.EPSILON));
        const resizeHandles = handles.filter((handle) => handle.kind === 'resize');
        const rotationHandle = handles.find((handle) => handle.kind === 'rotate');
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        if (resizeHandles.length > 2 && selectedShape.type !== 'circle') {
          ctx.beginPath();
          resizeHandles.forEach((handle, index) => {
            const [hx, hy] = toCanvasLocal(handle.x, handle.y);
            if (index === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          });
          ctx.closePath();
          ctx.stroke();
        }
        if (rotationHandle) {
          const center = getShapeCenter2D(selectedShape);
          const [cx, cy] = toCanvasLocal(center.x, center.y);
          const [rx, ry] = toCanvasLocal(rotationHandle.x, rotationHandle.y);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(rx, ry);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        handles.forEach((handle) => {
          const [hx, hy] = toCanvasLocal(handle.x, handle.y);
          ctx.beginPath();
          ctx.arc(hx, hy, handle.kind === 'rotate' ? 6 : 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        ctx.restore();
      }

      const activeVariantControl = resolveActiveVariantControl2D(snap);
      if (activeVariantControl?.type === 'EDUK_WIDTH') {
        const { handles, center, axis, type } = activeVariantControl;

        ctx.save();
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(handles[0].x, handles[0].y);
        ctx.lineTo(handles[1].x, handles[1].y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(37, 99, 235, 0.20)';
        ctx.beginPath();
        ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
        ctx.fill();

        for (const handle of handles) {
          const isActive =
            hoveredVariantHandleDir === handle.dir ||
            (isVariantHandleDragging && variantHandleDragRef.current?.dragDir === handle.dir);

          const radius = isActive ? 11 : 9;

          ctx.fillStyle = isActive ? 'rgba(37, 99, 235, 0.95)' : 'rgba(37, 99, 235, 0.80)';
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(handle.x, handle.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          const nx = axis.x * handle.dir;
          const ny = axis.y * handle.dir;
          const tx = -ny;
          const ty = nx;

          const tipX = handle.x + nx * 6;
          const tipY = handle.y + ny * 6;
          const baseCenterX = handle.x - nx * 4;
          const baseCenterY = handle.y - ny * 4;
          const leftX = baseCenterX + tx * 3.5;
          const leftY = baseCenterY + ty * 3.5;
          const rightX = baseCenterX - tx * 3.5;
          const rightY = baseCenterY - ty * 3.5;

          ctx.fillStyle = 'rgba(255,255,255,0.98)';
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(leftX, leftY);
          ctx.lineTo(rightX, rightY);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      const rotationHandle = getRotationHandle();
      if (rotationHandle) {
        const degrees = ((rotationHandle.angle * 180) / Math.PI + 360) % 360;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.95)';
        ctx.fillStyle = 'rgba(255, 193, 7, 1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(
          rotationHandle.pivotPx,
          rotationHandle.pivotPy,
          rotationHandle.radiusPx,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(rotationHandle.pivotPx, rotationHandle.pivotPy);
        ctx.lineTo(rotationHandle.knobX, rotationHandle.knobY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rotationHandle.knobX, rotationHandle.knobY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const label = `${Math.round(degrees)}°`;
        ctx.font = 'bold 12px sans-serif';
        const labelWidth = ctx.measureText(label).width + 12;
        ctx.fillStyle = 'rgba(255,255,255,0.94)';
        ctx.fillRect(
          rotationHandle.pivotPx - labelWidth / 2,
          rotationHandle.pivotPy - 10,
          labelWidth,
          20
        );
        ctx.fillStyle = 'rgba(80,60,0,0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, rotationHandle.pivotPx, rotationHandle.pivotPy);
        ctx.restore();
      }

      // Cotas permanentes
      for (const dimension of dimensions) {
        const renderDimension = getResolvedDimension2D({ dimension, snapGeometry });
        drawDimension2D(ctx, renderDimension, {
          toCanvas: toCanvasLocal,
          selected: dimension.id === selectedDimensionId,
        });
      }

      // Medida en preview
      if (measureMode && measureStart && measureHover) {
        const [x1, y1] = toCanvasLocal(measureStart.x, measureStart.z);
        const [x2, y2] = toCanvasLocal(measureHover.x, measureHover.z);
        const len = Math.hypot(measureHover.x - measureStart.x, measureHover.z - measureStart.z);

        if (len > 0.001) {
          drawMeasureLine(ctx, x1, y1, x2, y2, fmtMeasure(len), {
            preview: true,
          });
        }
      }

      if (measureMode && measureSnap?.snapped) {
        const [snapX, snapY] = toCanvasLocal(measureSnap.point.x, measureSnap.point.z);
        const sourceLabel = measureSnap.sourceId ? ` · ${measureSnap.sourceId}` : '';
        const label = `${SNAP_LABELS[measureSnap.type] || 'Punto detectado'}${sourceLabel}`;
        ctx.save();
        ctx.strokeStyle = 'rgba(22, 163, 74, 1)';
        ctx.fillStyle = 'rgba(220, 252, 231, 0.96)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(snapX, snapY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(snapX - 9, snapY);
        ctx.lineTo(snapX + 9, snapY);
        ctx.moveTo(snapX, snapY - 9);
        ctx.lineTo(snapX, snapY + 9);
        ctx.stroke();

        ctx.font = '12px sans-serif';
        const labelWidth = ctx.measureText(label).width + 12;
        const labelX = Math.min(w - labelWidth - 4, snapX + 12);
        const labelY = Math.max(18, snapY - 12);
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.fillRect(labelX, labelY - 15, labelWidth, 20);
        ctx.strokeStyle = 'rgba(22, 163, 74, 0.75)';
        ctx.strokeRect(labelX, labelY - 15, labelWidth, 20);
        ctx.fillStyle = 'rgba(21, 128, 61, 1)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX + 6, labelY - 5);
        ctx.restore();
      }

      if (architectureSnap?.snapped && (isWallDrawMode || columnMode === 'PLACE')) {
        const [snapX, snapY] = toCanvasLocal(architectureSnap.point.x, architectureSnap.point.z);
        const label = SNAP_LABELS[architectureSnap.type] || 'Punto detectado';
        ctx.save();
        ctx.strokeStyle = 'rgba(22, 163, 74, 1)';
        ctx.fillStyle = 'rgba(220, 252, 231, 0.96)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(snapX, snapY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(snapX - 9, snapY);
        ctx.lineTo(snapX + 9, snapY);
        ctx.moveTo(snapX, snapY - 9);
        ctx.lineTo(snapX, snapY + 9);
        ctx.stroke();
        ctx.font = '12px sans-serif';
        const labelWidth = ctx.measureText(label).width + 12;
        const labelX = Math.min(w - labelWidth - 4, snapX + 12);
        const labelY = Math.max(18, snapY - 12);
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.fillRect(labelX, labelY - 15, labelWidth, 20);
        ctx.strokeStyle = 'rgba(22, 163, 74, 0.75)';
        ctx.strokeRect(labelX, labelY - 15, labelWidth, 20);
        ctx.fillStyle = 'rgba(21, 128, 61, 1)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX + 6, labelY - 5);
        ctx.restore();
      }

      if (selectionDrag) {
        const startX = selectionDrag.startScreen.x;
        const startY = selectionDrag.startScreen.y;
        const currentX = selectionDrag.currentScreen.x;
        const currentY = selectionDrag.currentScreen.y;
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const crossing = selectionDrag.direction === SELECTION_WINDOW_TYPES.CROSSING;

        ctx.save();
        ctx.fillStyle = crossing ? 'rgba(34, 197, 94, 0.10)' : 'rgba(37, 99, 235, 0.10)';
        ctx.strokeStyle = crossing ? 'rgba(22, 163, 74, 0.95)' : 'rgba(37, 99, 235, 0.95)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash(crossing ? [7, 5] : []);
        ctx.fillRect(left, top, width, height);
        ctx.strokeRect(left, top, width, height);
        ctx.restore();
      }

      // Header
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.font = '13px sans-serif';
      ctx.fillText(title, 12, 20);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    getSnapshot,
    selectedIds,
    walls,
    isWallDrawMode,
    draftPts,
    mouseWorld,
    wallThickness,
    title,
    ensureInitializedView,
    measureMode,
    measureStart,
    measureHover,
    measureSnap,
    architectureSnap,
    columnMode,
    openings,
    openingMode,
    doorPreview,
    selectedOpeningId,
    doorWidth,
    dimensions,
    selectedDimensionId,
    selectionDrag,
    plan2DTransform,
    getRuntimePlan,
    scaleMode,
    scaleStartPx,
    scaleHoverPx,
    getRotationHandle,
    resolveActiveVariantControl2D,
    hoveredVariantHandleDir,
    isVariantHandleDragging,
    detailed2DIds,
    cimbraVisiblePostIds,
    showFinishes2D,
    shapes2D,
    selectedShape2DId,
  ]);

  const selectedDetailKeys = collectSelected2DDetailKeys(selectedIds, latestSnapshotRef.current);
  const selectedAreDetailed =
    selectedDetailKeys.length > 0 && selectedDetailKeys.every((key) => detailed2DIds.has(key));
  const selectedCimbraPostId = resolveSelectedKoncisaPostId(latestSnapshotRef.current, selectedIds);
  const selectedPostCimbraVisible = selectedCimbraPostId
    ? cimbraVisiblePostIds.has(selectedCimbraPostId)
    : false;

  if (!visible) {
    return (
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          pointerEvents: 'auto',
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setVisible(true)}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
            cursor: 'pointer',
          }}
        >
          Mostrar 2D
        </button>
      </div>
    );
  }

  return (
    <div
      className={`plan2d-overlay plan2d-overlay--${viewMode}`}
      style={{
        '--plan2d-normal-height': typeof height === 'number' ? `${height}px` : height,
      }}
    >
      {/* barra superior */}
      <div className="plan2d-overlay__controls">
        <span
          aria-live="polite"
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.92)',
            color: '#243042',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Seleccionados: {selectedIds.length} piezas
        </span>

        <button
          onClick={fitView}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'rgba(255,255,255,0.92)',
            cursor: 'pointer',
          }}
          title="Fit (F)"
        >
          Fit
        </button>

        <button
          type="button"
          disabled={!selectedDetailKeys.length}
          onClick={() =>
            onDetailed2DIdsChange?.(
              updateDetailed2DIds(detailed2DIds, selectedDetailKeys, !selectedAreDetailed)
            )
          }
          aria-pressed={selectedAreDetailed}
          title={
            selectedDetailKeys.length
              ? 'Alternar representación 2D de la selección'
              : 'Seleccione uno o varios objetos'
          }
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: selectedAreDetailed ? 'rgba(37, 99, 235, 0.14)' : 'rgba(255,255,255,0.92)',
            color: selectedAreDetailed ? 'rgba(30, 64, 175, 1)' : 'inherit',
            cursor: selectedDetailKeys.length ? 'pointer' : 'not-allowed',
            opacity: selectedDetailKeys.length ? 1 : 0.55,
          }}
        >
          {selectedAreDetailed ? 'Vista normal 2D' : 'Vista detallada 2D'}
        </button>

        {viewMode !== 'normal' && (
          <button
            onClick={() => setViewMode('normal')}
            className="plan2d-overlay__size-button"
            title="Restaurar tamaño normal"
            aria-label="Restaurar vista 2D al tamaño normal"
          >
            Restaurar
          </button>
        )}

        <button
          onClick={() => setViewMode((current) => (current === 'half' ? 'normal' : 'half'))}
          className={`plan2d-overlay__size-button ${
            viewMode === 'half' ? 'plan2d-overlay__size-button--active' : ''
          }`}
          title={viewMode === 'half' ? 'Restaurar tamaño normal' : 'Usar media área del visor'}
          aria-label={viewMode === 'half' ? 'Restaurar vista 2D' : 'Ampliar vista 2D a mitad'}
          aria-pressed={viewMode === 'half'}
        >
          Mitad
        </button>

        <button
          onClick={() =>
            setViewMode((current) => (current === 'maximized' ? 'normal' : 'maximized'))
          }
          className={`plan2d-overlay__size-button ${
            viewMode === 'maximized' ? 'plan2d-overlay__size-button--active' : ''
          }`}
          title={viewMode === 'maximized' ? 'Restaurar tamaño normal' : 'Maximizar vista 2D'}
          aria-label={viewMode === 'maximized' ? 'Restaurar vista 2D' : 'Maximizar vista 2D'}
          aria-pressed={viewMode === 'maximized'}
        >
          Maximizar
        </button>

        <button
          onClick={() => {
            setMeasureMode((prev) => {
              const next = !prev;
              if (!next) {
                setMeasureStart(null);
                setMeasureHover(null);
                setMeasureSnap(null);
              }
              return next;
            });
          }}
          disabled={isWallDrawMode}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: measureMode ? 'rgba(37, 99, 235, 0.14)' : 'rgba(255,255,255,0.92)',
            color: measureMode ? 'rgba(30, 64, 175, 1)' : 'inherit',
            cursor: isWallDrawMode ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            opacity: isWallDrawMode ? 0.6 : 1,
          }}
          title={isWallDrawMode ? 'Desactiva muros para acotar' : 'Cota (R)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 21L21 3M14 4l2 2M11 7l2 2M8 10l2 2M5 13l2 2M16 8l2 2M13 11l2 2M10 14l2 2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Cota
        </button>

        <button
          onClick={() => {
            const next = !scaleMode;
            setScaleMode(next);
            setCalibrationDraft(null);
            setScaleStartPx(null);

            setScaleHoverPx(null);
            if (next) {
              setMeasureMode(false);
              setMeasureStart(null);
              setMeasureHover(null);
              setMeasureSnap(null);
            }
          }}
          disabled={(!plan2DSrc && plan2DDefinition?.renderType !== 'VECTOR') || isWallDrawMode}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: scaleMode ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255,255,255,0.92)',
            color: scaleMode ? 'rgba(6, 95, 70, 1)' : 'inherit',
            cursor:
              (!plan2DSrc && plan2DDefinition?.renderType !== 'VECTOR') || isWallDrawMode
                ? 'not-allowed'
                : 'pointer',
            opacity:
              (!plan2DSrc && plan2DDefinition?.renderType !== 'VECTOR') || isWallDrawMode ? 0.6 : 1,
          }}
          title={
            !plan2DSrc && plan2DDefinition?.renderType !== 'VECTOR'
              ? 'Carga un plano primero'
              : 'Calibrar escala del plano'
          }
        >
          Escala
        </button>

        {measureMode && (
          <button
            onClick={clearMeasurements}
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.14)',
              background: 'rgba(255,255,255,0.92)',
              cursor: 'pointer',
            }}
            title="Borrar cotas"
          >
            Limpiar cotas
          </button>
        )}

        {isWallDrawMode ? (
          <>
            <button
              onClick={commitWall}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'rgba(56, 194, 212, 0.14)',
                cursor: 'pointer',
              }}
              title="Enter"
            >
              Terminar muro
            </button>
            <button
              onClick={clearDraft}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'rgba(255,255,255,0.92)',
                cursor: 'pointer',
              }}
              title="Esc"
            >
              Cancelar
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => setShowFinishes2D((current) => !current)}
          aria-pressed={showFinishes2D}
          title="Mostrar los colores reales de los acabados del modelo 3D"
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: showFinishes2D
              ? '1px solid rgba(37, 99, 235, 0.9)'
              : '1px solid rgba(0,0,0,0.14)',
            background: showFinishes2D ? 'rgba(219, 234, 254, 0.96)' : 'rgba(255,255,255,0.92)',
            color: showFinishes2D ? '#1d4ed8' : 'inherit',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Acabados: {showFinishes2D ? 'ON' : 'OFF'}
        </button>

        <button
          type="button"
          onClick={() => {
            const postId = resolveSelectedKoncisaPostId(latestSnapshotRef.current, selectedIds);
            if (!postId) return;
            setCimbraVisiblePostIds((current) => {
              const next = new Set(current);
              if (next.has(postId)) next.delete(postId);
              else next.add(postId);
              return next;
            });
          }}
          disabled={!selectedCimbraPostId}
          aria-pressed={selectedPostCimbraVisible}
          title={
            selectedCimbraPostId
              ? 'Mostrar u ocultar cimbras del puesto KONCISA PLUS seleccionado'
              : 'Selecciona un puesto KONCISA PLUS para controlar sus cimbras'
          }
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: selectedPostCimbraVisible
              ? '1px solid rgba(220, 38, 38, 0.9)'
              : '1px solid rgba(0,0,0,0.14)',
            background: selectedPostCimbraVisible
              ? 'rgba(254, 226, 226, 0.96)'
              : 'rgba(255,255,255,0.92)',
            color: selectedPostCimbraVisible ? '#b91c1c' : 'inherit',
            cursor: selectedCimbraPostId ? 'pointer' : 'not-allowed',
            opacity: selectedCimbraPostId ? 1 : 0.55,
            fontWeight: 700,
          }}
        >
          Cimbra: {selectedPostCimbraVisible ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() => setVisible(false)}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.14)',
            background: 'rgba(255,255,255,0.92)',
            cursor: 'pointer',
          }}
        >
          Ocultar
        </button>
      </div>

      {calibrationDraft ? (
        <section
          aria-label="Confirmar calibración del plano"
          style={{
            position: 'absolute',
            top: 54,
            right: 12,
            zIndex: 35,
            width: 260,
            display: 'grid',
            gap: 9,
            padding: 12,
            border: '1px solid rgba(0,0,0,0.18)',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.98)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
            fontSize: 12,
          }}
        >
          <strong>Distancia real</strong>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px', gap: 8 }}>
            <input
              type="text"
              inputMode="decimal"
              value={calibrationDraft.value}
              onChange={(event) =>
                setCalibrationDraft((current) => ({ ...current, value: event.target.value }))
              }
            />
            <select
              value={calibrationDraft.unit}
              onChange={(event) =>
                setCalibrationDraft((current) => ({ ...current, unit: event.target.value }))
              }
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                const enteredValue = Number(String(calibrationDraft.value || '').replace(',', '.'));
                const unitFactor = CALIBRATION_UNIT_TO_METERS[calibrationDraft.unit];
                const realDistanceMeters = enteredValue * unitFactor;
                if (!Number.isFinite(realDistanceMeters) || realDistanceMeters <= 0) return;

                const calibration = {
                  metersPerDocumentUnit: realDistanceMeters / calibrationDraft.sourceDistance,
                  sourceDistance: calibrationDraft.sourceDistance,
                  realDistanceMeters,
                  units: plan2DDefinition?.renderType === 'VECTOR' ? 'dxf-unit' : 'px',
                  inputUnit: calibrationDraft.unit,
                  points: calibrationDraft.points,
                  source: 'MANUAL',
                  originalMetersPerDocumentUnit:
                    plan2DDefinition?.calibration?.originalMetersPerDocumentUnit ??
                    (plan2DDefinition?.vector?.units?.detected
                      ? plan2DDefinition.vector.units.metersPerUnit
                      : null),
                };
                if (onPlanCalibrationChange) {
                  onPlanCalibrationChange(calibration);
                } else {
                  onPlan2DTransformChange?.((current) => ({
                    ...current,
                    metersPerPixel: calibration.metersPerDocumentUnit,
                    scale: 1,
                  }));
                }
                setCalibrationDraft(null);
              }}
            >
              Confirmar
            </button>
            <button type="button" onClick={() => setCalibrationDraft(null)}>
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      {selectedDimension && (
        <section
          aria-label="Propiedades de la cota seleccionada"
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 31,
            display: 'grid',
            gridTemplateColumns: 'auto minmax(120px, 1fr)',
            alignItems: 'center',
            gap: '8px 10px',
            width: 280,
            padding: 12,
            border: '1px solid rgba(0,0,0,0.14)',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.96)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
            color: '#243042',
            fontSize: 12,
          }}
        >
          <strong style={{ gridColumn: '1 / -1', fontSize: 13 }}>Propiedades de cota</strong>

          <label htmlFor="dimension-type">Tipo</label>
          <select
            id="dimension-type"
            value={selectedDimension.type}
            onChange={(event) =>
              applyDimensionUpdate(selectedDimension.id, { type: event.target.value })
            }
          >
            <option value={DIMENSION_TYPES.LINEAR_HORIZONTAL}>LINEAR_HORIZONTAL</option>
            <option value={DIMENSION_TYPES.LINEAR_VERTICAL}>LINEAR_VERTICAL</option>
            <option value={DIMENSION_TYPES.ALIGNED}>ALIGNED</option>
          </select>

          <label htmlFor="dimension-unit">Unidad</label>
          <select
            id="dimension-unit"
            value={selectedDimension.unit}
            onChange={(event) =>
              applyDimensionUpdate(selectedDimension.id, { unit: event.target.value })
            }
          >
            <option value="m">m</option>
            <option value="cm">cm</option>
            <option value="mm">mm</option>
          </select>

          <label htmlFor="dimension-label">Label</label>
          <input
            id="dimension-label"
            type="text"
            value={selectedDimension.label || ''}
            placeholder="Valor automático"
            onChange={(event) =>
              applyDimensionUpdate(selectedDimension.id, {
                label: event.target.value || null,
              })
            }
          />

          <label htmlFor="dimension-offset">Offset</label>
          <input
            id="dimension-offset"
            type="number"
            step="1"
            value={selectedDimension.offset}
            onChange={(event) => {
              const offset = Number(event.target.value);
              if (Number.isFinite(offset)) {
                applyDimensionUpdate(selectedDimension.id, { offset });
              }
            }}
          />

          <label htmlFor="dimension-color">Color</label>
          <input
            id="dimension-color"
            type="color"
            value={selectedDimension.style?.color || '#000000'}
            onChange={(event) =>
              applyDimensionUpdate(selectedDimension.id, {
                style: {
                  ...(selectedDimension.style || {}),
                  color: event.target.value,
                },
              })
            }
          />

          <label htmlFor="dimension-line-width">Espesor</label>
          <input
            id="dimension-line-width"
            type="number"
            min="0.1"
            step="0.1"
            value={selectedDimension.style?.lineWidth ?? 1}
            onChange={(event) => {
              const lineWidth = Number(event.target.value);
              if (Number.isFinite(lineWidth) && lineWidth > 0) {
                applyDimensionUpdate(selectedDimension.id, {
                  style: {
                    ...(selectedDimension.style || {}),
                    lineWidth,
                  },
                });
              }
            }}
          />

          <label htmlFor="dimension-text-size">Tamaño de texto</label>
          <input
            id="dimension-text-size"
            type="number"
            min="1"
            step="1"
            value={selectedDimension.style?.text?.size ?? 14}
            onChange={(event) => {
              const size = Number(event.target.value);
              if (Number.isFinite(size) && size > 0) {
                applyDimensionUpdate(selectedDimension.id, {
                  style: {
                    ...(selectedDimension.style || {}),
                    text: {
                      ...(selectedDimension.style?.text || {}),
                      size,
                    },
                  },
                });
              }
            }}
          />
        </section>
      )}

      <canvas
        id="plan2d-canvas"
        ref={canvasRef}
        style={{
          width,
          height: '100%',
          display: 'block',
          touchAction: 'none',
          cursor:
            measureMode || isWallDrawMode || shapeTool2D || scaleMode || selectionDrag
              ? 'crosshair'
              : isPlanDragging
                ? 'grabbing'
                : isPlanHovered
                  ? 'grab'
                  : isVariantHandleDragging
                    ? 'grabbing'
                    : hoveredVariantHandleDir
                      ? 'pointer'
                      : isRotatingPiece
                        ? 'grabbing'
                        : transformTool === 'rotate'
                          ? 'default'
                          : dragPieceId
                            ? 'grabbing'
                            : hoveredMovablePieceId
                              ? 'grab'
                              : 'default',
        }}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={(event) => {
          if (shapeDragRef.current?.pointerId === event.pointerId) shapeDragRef.current = null;
          if (planDragRef.current?.pointerId === event.pointerId) {
            planDragRef.current = null;
            setIsPlanDragging(false);
            setIsPlanHovered(false);
          }
          cancelVariantHandleDrag(event.pointerId);
          cancelSelectionDrag(event.pointerId);
          cancelDimensionTextDrag(event.pointerId);
          cancelPieceDrag();
        }}
        onPointerLeave={() => {
          if (
            !dimensionTextDragRef.current &&
            !selectionDragRef.current &&
            !dragPieceRef.current &&
            !rotationDragRef.current &&
            !planDragRef.current &&
            !dragRef.current.isDown
          ) {
            setIsPlanHovered(false);
            setHoveredMovablePieceId(null);
            setHoveredVariantHandleDir(0);
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
