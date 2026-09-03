// ThreeCanvas.jsx (MEZCLA: mantiene tu 2D/zoom/controles tal como estaban + agrega muros bien implementados)
// ✅ Lo único “nuevo” es: wallsGroupRef + crear un group en la escena + useEffect EXTERNO que reconstruye muros.
// ✅ También corregí: applyFinishToActivePart (materialDef no estaba definido) y cleanup de listeners.

import { useEffect, useRef } from 'react';
import { useState } from 'react';
import * as THREE from 'three';
import { OrbitControls, GLTFLoader } from 'three-stdlib';
import { createSurfaceMesh, createSurfaceMeta } from '../factories/surfaceFactory';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../history/historyManager';
import { CreateObjectsCommand } from '../history/CreateObjectsCommand';
import { setClipboard } from '../clipboard/clipboardManager';
import { createKoncisaPlusInstance } from '../mepal/koncisaPlus/factories/createKoncisaPlusInstance';
import { resolveComponentKey } from '../mepal/koncisaPlus/serialization/serializeKoncisaPlusRecipe';
import { loadPersistedEntity } from '../core/persistence/entityLoaders';
import {
  buildVersionedProject,
  isVersionedEntityProject,
} from '../core/persistence/projectPersistence';

import { MODEL_TYPES } from '../catalog/catalogData';

//import { resolveSurfaceCodigoPTCeil } from '../factories/surfaceSkuResolver';
import { resolveSurfaceCodigoPT } from '../rules/surfaceRules';
import { applyMaterialToObject3D, applyMaterialToMesh } from '../materials/applyMaterial';

import { exportSceneToGLTF } from '../utils/exportGLTF';

import { exportPlanToDXF } from '../utils/exportDXF';
import { getFootprint2D } from '../plan2d/extractFootprint2D';
import {
  extractDetailedFootprint2D,
  getDetailedFootprint2DCacheEntry,
  hasDetailedFootprint2DCacheEntry,
} from '../plan2d/extractDetailedFootprint2D';
import { get2DDetailKey } from '../plan2d/detailSelection2D';
import { resolveFinishAppearance2D } from '../plan2d/finishAppearance2D';
import { buildWallsGeometry3D } from '../core/architecture/walls/wallGeometry3D';
import { buildColumnGeometry3D } from '../core/architecture/columns/columnGeometry3D';
import { buildDoorGeometry2D } from '../core/architecture/openings/doorGeometry2D';

import { getTipologiaDetalle } from '../services/tipologiasDetalle';
import { getChairDetail } from '../services/chairsLoader';
import { getPlantDetail } from '../services/plantsLoader';
import { getOfficeAccessoryDetail } from '../services/officeAccessoriesLoader';
import { createAresInstance } from '../mepal/ares/factories/createAresInstance';
import { getAresProductDefinition } from '../mepal/ares/products/aresProductDefinition';
import { createClakInstance } from '../mepal/clak/factories/createClakInstance';
import { createEdukInstance } from '../mepal/eduk/factories/createEdukInstance';
import { createLinkInstance } from '../mepal/link/factories/createLinkInstance';
import { createKuoGoInstance } from '../mepal/kuoGo/factories/createKuoGoInstance';
import { createKuoAVInstance } from '../mepal/kuoAV/factory/createKuoAVInstance';
import { createKuoAVDobleInstance } from '../mepal/kuoAVDoble/factory/createKuoAVDobleInstance';
import { createKuoAVPantallaInstance } from '../mepal/kuoAV/factory/createKuoAVPantallaInstance';
import { createSaludInstance } from '../mepal/salud/factories/createSaludInstance';
import {
  getSaludVariantOptionsByCode,
  normalizeSaludVariantCode,
} from '../mepal/salud/products/saludVariantDefinition';
import { createTekSocialInstance } from '../mepal/tekSocial/factories/createTekSocialInstance';
import { createZenInstance } from '../mepal/zen/factories/createZenInstance.js';
import { createCritterium8Instance } from '../mepal/critterium8/factories/createCritterium8Instance.js';
import { registerCritterium8Instance } from '../mepal/critterium8/integration/critterium8Registration.js';
import { rebuildCritterium8Instance } from '../mepal/critterium8/integration/rebuildCritterium8Instance.js';
import { patchCritterium8TileConfig } from '../mepal/critterium8/integration/critterium8Config.js';
import { disposeCritterium8FrameAssembly3D } from '../mepal/critterium8/renderers/Critterium8FrameRenderer3D.js';
import { disposeCritterium8Sequence3D } from '../mepal/critterium8/builders/Critterium8SequenceRenderBuilder.js';
import {
  partitionCritterium8Frames,
  prepareCritterium8Sequence,
  prepareCritterium8SequenceRebuild,
  validateFrameAdditionToCritterium8Sequence,
} from '../mepal/critterium8/integration/critterium8SequenceOperations.js';
import {
  registerCritterium8Sequence,
  replaceCritterium8Sequence,
  unregisterCritterium8Sequence,
} from '../mepal/critterium8/integration/critterium8SequenceRegistration.js';
import {
  getCritterium8AssemblyRoot,
  getCritterium8EditableTarget,
  getCritterium8EditablePart,
  getCritterium8FrameAssembly,
  getCritterium8SequenceRoot,
  isCritterium8AssemblyRoot,
  isCritterium8SequenceRoot,
} from '../mepal/critterium8/utils/critterium8Selection.js';
import {
  getZenVariantOptionsByCode,
  normalizeZenVariantCode,
} from '../mepal/zen/products/zenVariantDefinition.js';

import { resolveKoncisaDucto } from '../mepal/koncisaPlus/rules/koncisaDuctoRules';
import { resolveKoncisaFloorDuct } from '../mepal/koncisaPlus/rules/koncisaFloorDuctRules';
import { getDuctosConfig } from '../mepal/koncisaPlus/rules/koncisaRules';

import {
  createKoncisaPrivacyPanelProcedural,
  panelHasCanto,
} from '../mepal/koncisaPlus/parts/pantallas';

import {
  resolvePedestalFromCostado,
  getPedestalSidesForCostado,
} from '../mepal/koncisaPlus/rules/koncisaPedestalRules';

import { resolveKoncisaPedestalReinforcement } from '../mepal/koncisaPlus/rules/koncisaPedestalReinforcementRules';
import { resolveKoncisaDuctSupport } from '../mepal/koncisaPlus/rules/koncisaDuctSupportRules';

import { resolveKoncisaSurfaceCodigoPT } from '../mepal/koncisaPlus/rules/koncisaSurfaceRules';
import {
  getEditableKoncisaPartObject,
  isKoncisaAssemblyRoot,
} from '../mepal/koncisaPlus/utils/koncisaSelection';

import {
  canAttachKoncisaIntegrationToPart,
  normalizeIntegrationDepthMm,
  normalizeIntegrationSide,
  normalizeIntegrationWidthMm,
  resolveKoncisaIntegrationPackage,
} from '../mepal/koncisaPlus/rules/koncisaIntegrationRules';

import {
  resolveDuctCoverAsset,
  defaultDuctCoverState,
  normalizeDuctCoverState,
  getDuctCoverSides,
  resolveDuctCoverPhysicalSides,
  normalizeDuctModuleType,
  inferDuctChannelType,
} from '../mepal/koncisaPlus/rules/koncisaDuctCoverRules';
import {
  defaultCeilingDuctState,
  normalizeCeilingDuctState,
  resolveKoncisaCeilingDuct,
} from '../mepal/koncisaPlus/rules/koncisaCeilingDuctRules';
import {
  CLAK_SWAP_ALLOWED_CODES,
  getClakVariantOptionsByCode,
} from './properties/clakPuffVariants';
import {
  isSeatCode as isClakSeatCode,
  isModuleCode as isClakModuleCode,
  normalizeClakPuffCode,
} from './properties/clakPuffVariants';
import {
  getEdukShelfHeightInfoByCode,
  getEdukHeightInfoByCode,
  getEdukWidthInfoByCode,
  resolveEdukCodeBySelection,
} from '../mepal/eduk/products/edukShelfHeightDefinition';
import {
  MILA_ACCESSORY_CATALOG,
  MILA_ACCESSORY_OFFSETS_MM,
  MILA_MODEL_SOURCES,
  MILA_SINGLE_SEAT_MODE_OFFSETS_MM,
  resolveMilaScreenBomBreakdown,
  resolveMilaScreenCatalogItem,
} from '../mepal/mila/config/milaTunables';
import { createMilaInstance } from '../mepal/mila/factories/createMilaInstance';
import {
  createMilaConnectorMesh,
  resolveMilaAssemblyConnectors,
  findBestMilaConnectorSnap,
  unifyMilaConnectedAssemblies,
  getMilaAssemblyRoot,
  isMilaPortOccupied,
  MILA_CONNECTOR_CONFIG,
} from '../mepal/mila/connectors/milaConnectors.js';
import { MILA_GIRO_DEFINITIONS } from '../mepal/mila/factories/createMilaGiroInstance.js';

const MM_TO_M = 1 / 1000;
const ALMACENAMIENTO_CUSHION_CODE = '22000008239';
const ALMACENAMIENTO_LAMINATE_CODE = '22000007233';
const MILA_SINGLE_SEAT_VARIANTS = {
  chair: {
    code: 'TKSSI011000-W-SEAT',
    modelSrc: MILA_MODEL_SOURCES.seat,
    label: 'asiento',
  },
  table: {
    code: '22000130199',
    modelSrc: MILA_MODEL_SOURCES.tableSeat,
    label: 'mesa',
  },
  tableGrommet: {
    code: '22000130199',
    modelSrc: MILA_MODEL_SOURCES.tableSeatGrommet,
    label: 'mesa con grommet',
  },
};

function normalizeVariantText(value) {
  return String(value || '')
    .replace(/^_+/, '')
    .trim()
    .toLowerCase();
}

function getAlmacenamientoAddonCodesByVariant(variantValue) {
  const normalized = normalizeVariantText(variantValue);
  const out = [];

  if (!normalized) return out;
  if (normalized.includes('cushion')) out.push(ALMACENAMIENTO_CUSHION_CODE);
  if (normalized.includes('laminate') || normalized.includes('lamiante')) {
    out.push(ALMACENAMIENTO_LAMINATE_CODE);
  }

  return out;
}

function normalizeMilaSeatMode(mode) {
  return String(mode || '').trim();
}

function resolveMilaSeatModeByCode(code) {
  const normalizedCode = String(code || '')
    .trim()
    .toUpperCase();
  if (
    normalizedCode === 'TKSSU165000' ||
    normalizedCode === '22000130198' ||
    normalizedCode === '22000130199'
  )
    return 'table';
  if (normalizedCode === 'TKSSU165000_GROMMET') return 'tableGrommet';
  return 'chair';
}

function resolveMilaSeatVariantByMode(mode) {
  const normalizedMode = normalizeMilaSeatMode(mode);
  return MILA_SINGLE_SEAT_VARIANTS[normalizedMode] || MILA_SINGLE_SEAT_VARIANTS.chair;
}

function resolveMilaSeatOffsetMmByMode(mode) {
  const normalizedMode = normalizeMilaSeatMode(mode);
  return MILA_SINGLE_SEAT_MODE_OFFSETS_MM[normalizedMode] || MILA_SINGLE_SEAT_MODE_OFFSETS_MM.chair;
}

export default function ThreeCanvas({
  onApiReady,
  onSelectionChange,
  onBOMChange,
  walls = [],
  columns = [],
  openings = [],
  readOnly = false,
  materialsByCode,
  catalogByCode,
  country = 'CO',
  onFloatingEditorRequest,
  transformTool = 'move',
}) {
  const mountRef = useRef(null);

  // ✅ NUEVO: referencia al group de muros (para reconstruir sin romper hooks/zoom/2D)
  const wallsGroupRef = useRef(null);
  const columnsGroupRef = useRef(null);
  const architectureWallsRef = useRef(walls);
  const architectureColumnsRef = useRef(columns);
  const architectureOpeningsRef = useRef(openings);
  architectureWallsRef.current = walls;
  architectureColumnsRef.current = columns;
  architectureOpeningsRef.current = openings;

  const floorMeshRef = useRef(null);
  const gridHelperRef = useRef(null);
  const sceneRef = useRef(null);

  const refreshFloorAndGridRef = useRef(() => {});

  // ✅ (opcional) guardar refs de scene para debug
  // const sceneRef = useRef(null);

  const [pendingProject, setPendingProject] = useState(null);
  const materialsByCodeRef = useRef(new Map());
  const catalogByCodeRef = useRef(catalogByCode || new Map());
  const loadProjectRef = useRef(null);

  const countryRef = useRef(country);
  const emitBOMRef = useRef(null);
  const transformToolRef = useRef(transformTool);
  const cancelRotationRef = useRef(null);

  //mover todos los objetos del padre
  const [moveAsGroup, setMoveAsGroup] = useState(true);
  const moveAsGroupRef = useRef(true);

  const dragGroupStartRef = useRef(null);
  const dragRootStartRef = useRef(null);

  //use effect 1
  useEffect(() => {
    moveAsGroupRef.current = moveAsGroup;
  }, [moveAsGroup]);

  const [deleteAsGroup, setDeleteAsGroup] = useState(true);
  const deleteAsGroupRef = useRef(true);

  //use effect 2
  useEffect(() => {
    deleteAsGroupRef.current = deleteAsGroup;
  }, [deleteAsGroup]);

  //use effect 3
  useEffect(() => {
    countryRef.current = country;
    emitBOMRef.current?.();
  }, [country]);

  //use effect 4
  useEffect(() => {
    materialsByCodeRef.current = materialsByCode || new Map();
    //console.log('[ThreeCanvas] materialsByCodeRef size:', materialsByCodeRef.current.size);
  }, [materialsByCode]);

  //use effect 5
  useEffect(() => {
    catalogByCodeRef.current = catalogByCode || new Map();
  }, [catalogByCode]);

  useEffect(() => {
    transformToolRef.current = transformTool;
    if (transformTool !== 'rotate') cancelRotationRef.current?.();
  }, [transformTool]);

  //use effect 6
  useEffect(() => {
    if (!pendingProject) return;

    const size = materialsByCodeRef.current?.size || 0;
    if (size === 0) {
      console.log('⏳ Esperando materialsByCodeRef...');
      return;
    }

    if (typeof loadProjectRef.current !== 'function') {
      console.log('⏳ Esperando loadProjectRef...');
      return;
    }

    //console.log('✅ materialsByCodeRef listo, cargando proyecto...');
    loadProjectRef.current(pendingProject);
    setPendingProject(null);
  }, [pendingProject]);

  //use effect 7
  useEffect(() => {
    console.log('[ThreeCanvas] materialsByCode size:', materialsByCode?.size, materialsByCode);
    const container = mountRef.current;
    if (!container) return;

    // ====== Scene ======
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;
    // sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.01,
      2000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 5, 2);
    scene.add(dir);

    // Grid + axes
    //scene.add(new THREE.GridHelper(8, 80));
    //scene.add(new THREE.AxesHelper(0.6));

    scene.add(new THREE.AxesHelper(0.6));

    // ✅ NUEVO: group de muros (una sola vez)
    const wallsGroup = new THREE.Group();
    wallsGroup.name = 'WALLS_GROUP';
    scene.add(wallsGroup);
    wallsGroupRef.current = wallsGroup;

    const columnsGroup = new THREE.Group();
    columnsGroup.name = 'COLUMNS_GROUP';
    scene.add(columnsGroup);
    columnsGroupRef.current = columnsGroup;

    // ====== State / Cache ======
    const loader = new GLTFLoader();
    const catalogCache = new Map(); // code -> { base, meta }
    let lastSnapTime = 0;
    const SNAP_COOLDOWN_MS = 120;

    // Piezas en escena
    const parts = []; // { code, obj }
    let activePart = null;
    let activeEditablePart = null;
    let activeSubMesh = null; // ✅ NUEVO: parte exacta del GLB clickeada (Mesh)

    // IMPORTANT: solo objetos del catálogo (para click/drag)
    const pickables = [];

    // Snap
    let snapActive = true;
    const SNAP_THRESHOLD = 0.05; // 5 cm
    const SNAP_INTERVAL = 120; // ms (100–150 ideal)
    const MOVE_STEP = 0.02; // 2 cm
    const GRID_STEP = 0.01; // 1 cm (10 mm)

    // ====== Mouse / Drag ======
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 (piso)
    const dragPoint = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    let isDragging = false;
    let hasMoved3D = false;
    let dragSession3D = null;
    let edukHandleDragSession = null;
    let selectedIds3D = [];

    let selectionHelper = null;
    let additionalSelectionHelpers = [];
    let rotationSession = null;
    let moveSession2D = null;
    let dimensionHistoryReplayHandler = null;
    const dimensionHistoryActionTypes = new Set([
      HISTORY_ACTION_TYPES.CREATE_DIMENSION,
      HISTORY_ACTION_TYPES.UPDATE_DIMENSION,
      HISTORY_ACTION_TYPES.DELETE_DIMENSION,
    ]);
    const historyManager = createHistoryManager({
      replayAction: replayHistoryAction,
      onDiscard: discardHistoryAction,
    });
    let isRotating3D = false;
    let rotationPointerStartAngle = 0;

    const rotationHandle = new THREE.Group();
    rotationHandle.name = 'ROTATION_HANDLE';
    rotationHandle.visible = false;

    const edukTableHandleGroup = new THREE.Group();
    edukTableHandleGroup.name = 'EDUK_TABLE_WIDTH_HANDLES';
    edukTableHandleGroup.visible = false;

    const edukHandleGeometry = new THREE.ConeGeometry(0.08, 0.18, 14);
    const edukHandleMaterial = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      depthTest: false,
      transparent: true,
      opacity: 0.92,
    });

    const edukWidthHandlePrev = new THREE.Mesh(edukHandleGeometry, edukHandleMaterial);
    edukWidthHandlePrev.rotation.z = Math.PI / 2;
    edukWidthHandlePrev.renderOrder = 1004;
    edukWidthHandlePrev.userData.edukVariantHandleDir = -1;

    const edukWidthHandleNext = new THREE.Mesh(edukHandleGeometry, edukHandleMaterial.clone());
    edukWidthHandleNext.rotation.z = -Math.PI / 2;
    edukWidthHandleNext.renderOrder = 1004;
    edukWidthHandleNext.userData.edukVariantHandleDir = 1;

    const edukHeightHandlePrev = new THREE.Mesh(edukHandleGeometry, edukHandleMaterial.clone());
    edukHeightHandlePrev.rotation.x = Math.PI;
    edukHeightHandlePrev.renderOrder = 1004;
    edukHeightHandlePrev.userData.edukVariantHandleDir = -1;

    const edukHeightHandleNext = new THREE.Mesh(edukHandleGeometry, edukHandleMaterial.clone());
    edukHeightHandleNext.renderOrder = 1004;
    edukHeightHandleNext.userData.edukVariantHandleDir = 1;

    edukTableHandleGroup.add(
      edukWidthHandlePrev,
      edukWidthHandleNext,
      edukHeightHandlePrev,
      edukHeightHandleNext
    );
    scene.add(edukTableHandleGroup);

    const milaConnectorHandleGroup = new THREE.Group();
    milaConnectorHandleGroup.name = 'MILA_CONNECTOR_HANDLES';
    milaConnectorHandleGroup.visible = false;

    const milaLeftConnector = createMilaConnectorMesh({ side: 'left' });
    const milaRightConnector = createMilaConnectorMesh({ side: 'right' });
    const milaPanelLeftConnector = createMilaConnectorMesh({ side: 'panel-left' });
    const milaPanelRightConnector = createMilaConnectorMesh({ side: 'panel-right' });
    milaPanelLeftConnector.visible = false;
    milaPanelRightConnector.visible = false;
    milaConnectorHandleGroup.add(milaLeftConnector, milaRightConnector);
    milaConnectorHandleGroup.add(milaPanelLeftConnector, milaPanelRightConnector);

    const milaSnapTargetConnector = createMilaConnectorMesh({ side: 'target' });
    milaSnapTargetConnector.visible = false;
    milaConnectorHandleGroup.add(milaSnapTargetConnector);

    scene.add(milaConnectorHandleGroup);

    const rotationRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.035, 10, 72),
      new THREE.MeshBasicMaterial({ color: 0xff9800, depthTest: false })
    );
    rotationRing.rotation.x = Math.PI / 2;
    rotationRing.renderOrder = 1000;
    rotationRing.userData.isRotationHandle = true;

    const rotationKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffc107, depthTest: false })
    );
    rotationKnob.position.x = 1;
    rotationKnob.renderOrder = 1001;
    rotationKnob.userData.isRotationHandle = true;

    const rotationLabelCanvas = document.createElement('canvas');
    rotationLabelCanvas.width = 192;
    rotationLabelCanvas.height = 72;
    const rotationLabelTexture = new THREE.CanvasTexture(rotationLabelCanvas);
    const rotationLabel = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: rotationLabelTexture, depthTest: false, transparent: true })
    );
    rotationLabel.position.set(0, 0.18, 0);
    rotationLabel.renderOrder = 1002;
    let rotationLabelDegrees = null;

    rotationHandle.add(rotationRing, rotationKnob, rotationLabel);
    scene.add(rotationHandle);

    function updateRotationHandle() {
      const rotationSource = resolveRotationSource();
      if (!rotationSource || transformToolRef.current !== 'rotate') {
        rotationHandle.visible = false;
        return;
      }

      const targets = resolveRotationTargets();
      const box = new THREE.Box3();
      targets.forEach((obj) => box.expandByObject(obj));
      if (box.isEmpty()) {
        rotationHandle.visible = false;
        return;
      }

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(0.35, Math.hypot(size.x, size.z) / 2 + 0.18);
      rotationHandle.position.set(center.x, box.max.y + 0.08, center.z);
      rotationHandle.scale.setScalar(radius);
      rotationLabel.scale.set(0.7 / radius, 0.26 / radius, 1 / radius);
      const worldQuaternion = rotationSource.getWorldQuaternion(new THREE.Quaternion());
      const baseAngle = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ').y;
      const displayAngle = normalizeAngle(
        rotationSession
          ? rotationSession.initialSourceAngle + rotationSession.appliedAngle
          : baseAngle
      );
      const degrees = Math.round(THREE.MathUtils.radToDeg(displayAngle));
      if (degrees !== rotationLabelDegrees) {
        rotationLabelDegrees = degrees;
        const ctx = rotationLabelCanvas.getContext('2d');
        ctx.clearRect(0, 0, rotationLabelCanvas.width, rotationLabelCanvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.94)';
        ctx.fillRect(20, 8, 152, 56);
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 8, 152, 56);
        ctx.fillStyle = '#4e3a00';
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${degrees}°`, 96, 37);
        rotationLabelTexture.needsUpdate = true;
      }
      rotationHandle.visible = true;
      rotationHandle.updateMatrixWorld(true);
    }

    function resolveActiveEdukVariantContext() {
      if (!activePart || activePart.userData?.kind !== 'EDUK') return null;

      const code = String(activePart.userData?.codigoPT || activePart.userData?.code || '').trim();
      if (!code) return null;

      const widthInfo = getEdukWidthInfoByCode(code);
      if (widthInfo) {
        return {
          type: 'EDUK_WIDTH',
          code,
          instanceId: activePart.userData?.instanceId || activePart.uuid,
          options: [...widthInfo.widthOptions],
          currentIndex: widthInfo.currentIndex,
          propertyKey: 'width',
          dragAxis: 'x',
        };
      }

      const heightInfo = getEdukHeightInfoByCode(code);
      if (heightInfo) {
        return {
          type: 'EDUK_HEIGHT',
          code,
          instanceId: activePart.userData?.instanceId || activePart.uuid,
          options: [...heightInfo.heightOptions],
          currentIndex: heightInfo.currentIndex,
          propertyKey: 'height',
          dragAxis: 'y',
        };
      }

      return null;
    }

    function setCanvasCursor(cursor) {
      renderer.domElement.style.cursor = cursor || '';
    }

    // ===== MARCADORES VISUALES DE POSICIÓN / EXTENSIÓN CET (KUO AV) =====
    const kuoAVSnapMarkersGroup = new THREE.Group();
    kuoAVSnapMarkersGroup.visible = false;
    scene.add(kuoAVSnapMarkersGroup);

    const markerMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0x886600,
      roughness: 0.35,
      metalness: 0.2,
    });

    const markerCylGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.14, 18);
    const markerDiscGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 18);

    const snapMarkerRight = new THREE.Mesh(markerCylGeo, markerMat);
    snapMarkerRight.rotation.z = Math.PI / 2;
    snapMarkerRight.userData = { isKuoSnapMarker: true, snapType: 'EXTENSION_DER' };

    const snapMarkerLeft = new THREE.Mesh(markerCylGeo, markerMat);
    snapMarkerLeft.rotation.z = -Math.PI / 2;
    snapMarkerLeft.userData = { isKuoSnapMarker: true, snapType: 'EXTENSION_IZQ' };

    const snapMarkerFront = new THREE.Mesh(markerCylGeo, markerMat);
    snapMarkerFront.rotation.x = Math.PI / 2;
    snapMarkerFront.userData = { isKuoSnapMarker: true, snapType: 'FRONT' };

    const snapMarkerBack = new THREE.Mesh(markerCylGeo, markerMat);
    snapMarkerBack.rotation.x = -Math.PI / 2;
    snapMarkerBack.userData = { isKuoSnapMarker: true, snapType: 'BACK' };

    const snapMarkerCenter = new THREE.Mesh(markerDiscGeo, markerMat);
    snapMarkerCenter.userData = { isKuoSnapMarker: true, snapType: 'CENTER' };

    kuoAVSnapMarkersGroup.add(
      snapMarkerRight,
      snapMarkerLeft,
      snapMarkerFront,
      snapMarkerBack,
      snapMarkerCenter
    );

    function updateKuoAVSnapMarkers() {
      const assembly =
        activePart?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY' ||
        activePart?.userData?.kind === 'KUO_AV_ASSEMBLY'
          ? activePart
          : getKoncisaAssemblyObject(activePart);

      if (
        !assembly ||
        (assembly.userData?.kind !== 'KUO_AV_DOBLE_ASSEMBLY' &&
          assembly.userData?.kind !== 'KUO_AV_ASSEMBLY')
      ) {
        kuoAVSnapMarkersGroup.visible = false;
        return;
      }

      const box = new THREE.Box3().setFromObject(assembly);
      if (box.isEmpty()) {
        kuoAVSnapMarkersGroup.visible = false;
        return;
      }

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const surfaceY = box.max.y;

      const halfW = size.x / 2;
      const halfD = size.z / 2;

      snapMarkerRight.position.set(center.x + halfW + 0.05, surfaceY, center.z);
      snapMarkerLeft.position.set(center.x - halfW - 0.05, surfaceY, center.z);
      snapMarkerFront.position.set(center.x, surfaceY, center.z + halfD + 0.05);
      snapMarkerBack.position.set(center.x, surfaceY, center.z - halfD - 0.05);
      snapMarkerCenter.position.set(center.x, surfaceY + 0.015, center.z);

      kuoAVSnapMarkersGroup.visible = true;
      kuoAVSnapMarkersGroup.updateMatrixWorld(true);
    }

    function updateEdukTableHandles() {
      const context = resolveActiveEdukVariantContext();
      if (!context || isRotating3D) {
        edukTableHandleGroup.visible = false;
        return;
      }

      const box = new THREE.Box3().setFromObject(activePart);
      if (box.isEmpty()) {
        edukTableHandleGroup.visible = false;
        return;
      }

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const yOffset = Math.max(0.08, size.y * 0.08);
      const handleScale = THREE.MathUtils.clamp(Math.max(size.x, size.z) * 0.14, 0.7, 1.15);
      const spanX = Math.max(0.28, size.x * 0.5 + 0.08);
      const spanY = Math.max(0.24, size.y * 0.5 + 0.08);

      const worldQuaternion = activePart.getWorldQuaternion(new THREE.Quaternion());
      const yaw = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ').y;

      const useVertical = context.type === 'EDUK_HEIGHT';
      edukTableHandleGroup.position.set(
        center.x,
        useVertical ? center.y : box.max.y + yOffset,
        center.z
      );
      edukTableHandleGroup.rotation.set(0, yaw, 0);

      edukWidthHandlePrev.visible = context.type === 'EDUK_WIDTH';
      edukWidthHandleNext.visible = context.type === 'EDUK_WIDTH';
      edukHeightHandlePrev.visible = context.type === 'EDUK_HEIGHT';
      edukHeightHandleNext.visible = context.type === 'EDUK_HEIGHT';

      if (context.type === 'EDUK_WIDTH') {
        edukWidthHandlePrev.position.set(-spanX, 0, 0);
        edukWidthHandleNext.position.set(spanX, 0, 0);
      } else if (context.type === 'EDUK_HEIGHT') {
        edukHeightHandlePrev.position.set(0, -spanY, 0);
        edukHeightHandleNext.position.set(0, spanY, 0);
      }

      edukWidthHandlePrev.scale.setScalar(handleScale);
      edukWidthHandleNext.scale.setScalar(handleScale);
      edukHeightHandlePrev.scale.setScalar(handleScale);
      edukHeightHandleNext.scale.setScalar(handleScale);

      edukTableHandleGroup.visible = true;
      edukTableHandleGroup.updateMatrixWorld(true);
    }

    function resolveEdukHandleDirection(object) {
      let node = object;
      while (node) {
        if (typeof node.userData?.edukVariantHandleDir === 'number') {
          return Number(node.userData.edukVariantHandleDir);
        }
        if (node === edukTableHandleGroup) break;
        node = node.parent;
      }
      return 0;
    }

    function resolveEdukDragTargetIndex(startIndex, deltaPx, optionCount) {
      const STEP_PX = 28;
      const deltaSteps = Math.round(deltaPx / STEP_PX);
      return THREE.MathUtils.clamp(startIndex + deltaSteps, 0, Math.max(optionCount - 1, 0));
    }

    async function processEdukHandleDragQueue() {
      const session = edukHandleDragSession;
      if (!session || session.isApplying) return;
      if (session.targetIndex === session.currentIndex) return;

      session.isApplying = true;

      const targetValue = session.options[session.targetIndex];
      const context = resolveActiveEdukVariantContext();
      if (context && targetValue) {
        await swapEdukVariant(context.instanceId, context.code, {
          [context.propertyKey]: targetValue,
        });
      }

      const updatedContext = resolveActiveEdukVariantContext();
      if (updatedContext) {
        session.currentIndex = updatedContext.currentIndex;
        session.options = [...updatedContext.options];
        session.propertyKey = updatedContext.propertyKey;
      }

      session.isApplying = false;

      if (session.targetIndex !== session.currentIndex) {
        void processEdukHandleDragQueue();
      }
    }

    function startEdukHandleDrag(pointerEvent, direction) {
      const context = resolveActiveEdukVariantContext();
      if (!context) return false;

      edukHandleDragSession = {
        pointerId: pointerEvent.pointerId,
        pointerStartX: pointerEvent.clientX,
        pointerStartY: pointerEvent.clientY,
        dragDir: direction,
        dragAxis: context.dragAxis,
        startIndex: context.currentIndex,
        currentIndex: context.currentIndex,
        targetIndex: context.currentIndex,
        options: [...context.options],
        propertyKey: context.propertyKey,
        isApplying: false,
      };

      const initialTarget = resolveEdukDragTargetIndex(
        context.currentIndex,
        direction > 0 ? 28 : -28,
        context.options.length
      );
      edukHandleDragSession.targetIndex = initialTarget;

      controls.enabled = false;
      renderer.domElement.setPointerCapture?.(pointerEvent.pointerId);
      setCanvasCursor('grabbing');
      void processEdukHandleDragQueue();
      return true;
    }

    function updateEdukHandleDrag(pointerEvent) {
      if (!edukHandleDragSession) return;
      if (pointerEvent.pointerId !== edukHandleDragSession.pointerId) return;

      const deltaPxRaw =
        edukHandleDragSession.dragAxis === 'y'
          ? edukHandleDragSession.pointerStartY - pointerEvent.clientY
          : pointerEvent.clientX - edukHandleDragSession.pointerStartX;

      const nextIndex = resolveEdukDragTargetIndex(
        edukHandleDragSession.startIndex,
        deltaPxRaw * (edukHandleDragSession.dragDir || 1),
        edukHandleDragSession.options.length
      );

      if (nextIndex === edukHandleDragSession.targetIndex) return;
      edukHandleDragSession.targetIndex = nextIndex;
      void processEdukHandleDragQueue();
    }

    function endEdukHandleDrag(pointerId = null) {
      if (!edukHandleDragSession) return false;
      if (pointerId !== null && pointerId !== edukHandleDragSession.pointerId) return false;

      try {
        renderer.domElement.releasePointerCapture?.(edukHandleDragSession.pointerId);
      } catch (err) {
        void err;
      }

      edukHandleDragSession = null;
      if (!isDragging && !isRotating3D) controls.enabled = true;
      setCanvasCursor('');
      return true;
    }

    function setConnectorMeshColor(connectorMesh, color, coreColor) {
      if (!connectorMesh) return;
      connectorMesh.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.userData?.isConnectorCore) {
            child.material.color.setHex(coreColor || color);
          } else {
            child.material.color.setHex(color);
          }
        }
      });
    }

    function updateMilaConnectors() {
      const targetObj = getMilaAssemblyRoot(activePart);

      if (!targetObj || isRotating3D) {
        milaConnectorHandleGroup.visible = false;
        return;
      }

      const connectors = resolveMilaAssemblyConnectors(targetObj);
      if (!connectors) {
        milaConnectorHandleGroup.visible = false;
        return;
      }

      // Recolectar todos los ensambles, giros y accesorios de la escena
      const allAssemblies = [];
      const allGiroSurfaces = [];
      const allAccessories = [];
      const allPanelDivisors = [];
      scene.children.forEach((node) => {
        if (node === targetObj) return;
        const r = String(node.userData?.meta?.role || node.userData?.role || '').toLowerCase();
        if (node.userData?.kind === 'MILA_ASSEMBLY' || node.userData?.type === 'mila') {
          allAssemblies.push(node);
        } else if (
          node.userData?.kind === 'MILA_PANEL_DIVISOR_ASSEMBLY' ||
          node.userData?.type === 'mila-panel-divisor'
        ) {
          allPanelDivisors.push(node);
        } else if (
          node.userData?.kind === 'MILA_GIRO_SURFACE' ||
          node.userData?.type === 'MILA_GIRO_SURFACE' ||
          r === 'giro-surface'
        ) {
          allGiroSurfaces.push(node);
        } else if (
          r === 'armrest-left' ||
          r === 'armrest-right' ||
          r === 'armrest-center' ||
          r === 'screen'
        ) {
          allAccessories.push(node);
        }
      });
      const allSceneObjects = [
        ...allAssemblies,
        ...allGiroSurfaces,
        ...allAccessories,
        ...allPanelDivisors,
      ];

      const pLeft = connectors.ports?.left;
      const pRight = connectors.ports?.right;
      const pCenter = connectors.ports?.center;
      const pScreen = connectors.ports?.screen;

      const panelPorts = Object.values(connectors.ports || {}).filter(
        (port) => port?.portType === 'panel-wall'
      );
      const panelLeftPorts = panelPorts.filter((port) => port.side === 'left');
      const panelRightPorts = panelPorts.filter((port) => port.side === 'right');
      const panelLeftPort =
        panelLeftPorts.find((port) => Number(port.seatIndex || 0) === 0) || null;
      const panelRightPort =
        panelRightPorts.find((port) => Number(port.seatIndex || 0) === 0) || null;

      let isLeftOccupied = true;
      let isRightOccupied = true;

      if (connectors.isPanelDivisor) {
        if (panelLeftPort?.worldPos) {
          milaPanelLeftConnector.position.copy(panelLeftPort.worldPos);
          if (panelLeftPort.worldNormal) {
            milaPanelLeftConnector.quaternion.setFromUnitVectors(
              new THREE.Vector3(1, 0, 0),
              panelLeftPort.worldNormal
            );
          }
          milaPanelLeftConnector.visible = true;
        } else {
          milaPanelLeftConnector.visible = false;
        }

        if (panelRightPort?.worldPos) {
          milaPanelRightConnector.position.copy(panelRightPort.worldPos);
          if (panelRightPort.worldNormal) {
            milaPanelRightConnector.quaternion.setFromUnitVectors(
              new THREE.Vector3(1, 0, 0),
              panelRightPort.worldNormal
            );
          }
          milaPanelRightConnector.visible = true;
        } else {
          milaPanelRightConnector.visible = false;
        }

        milaLeftConnector.visible = false;
        milaRightConnector.visible = false;
      } else {
        milaPanelLeftConnector.visible = false;
        milaPanelRightConnector.visible = false;
      }

      if (connectors.isAccessory) {
        if (connectors.accessoryRole === 'armrest-left') {
          if (pRight) {
            milaRightConnector.position.copy(pRight.worldPos);
            if (pRight.worldNormal) {
              milaRightConnector.quaternion.setFromUnitVectors(
                new THREE.Vector3(1, 0, 0),
                pRight.worldNormal
              );
            }
            milaRightConnector.visible = true;
          } else {
            milaRightConnector.visible = false;
          }
          milaLeftConnector.visible = false;
        } else if (connectors.accessoryRole === 'armrest-right') {
          if (pLeft) {
            milaLeftConnector.position.copy(pLeft.worldPos);
            if (pLeft.worldNormal) {
              milaLeftConnector.quaternion.setFromUnitVectors(
                new THREE.Vector3(1, 0, 0),
                pLeft.worldNormal
              );
            }
            milaLeftConnector.visible = true;
          } else {
            milaLeftConnector.visible = false;
          }
          milaRightConnector.visible = false;
        } else if (connectors.accessoryRole === 'armrest-center') {
          if (pCenter) {
            milaLeftConnector.position.copy(pCenter.worldPos);
            if (pCenter.worldNormal) {
              milaLeftConnector.quaternion.setFromUnitVectors(
                new THREE.Vector3(1, 0, 0),
                pCenter.worldNormal
              );
            }
            milaLeftConnector.visible = true;
          }
          milaRightConnector.visible = false;
        } else if (connectors.accessoryRole === 'screen') {
          if (pScreen) {
            milaLeftConnector.position.copy(pScreen.worldPos);
            if (pScreen.worldNormal) {
              milaLeftConnector.quaternion.setFromUnitVectors(
                new THREE.Vector3(1, 0, 0),
                pScreen.worldNormal
              );
            }
            milaLeftConnector.visible = true;
          }
          milaRightConnector.visible = false;
        }
      } else {
        isLeftOccupied =
          !isDragging &&
          (pLeft?.isOccupied || isMilaPortOccupied(pLeft?.worldPos, targetObj, allSceneObjects));
        isRightOccupied =
          !isDragging &&
          (pRight?.isOccupied || isMilaPortOccupied(pRight?.worldPos, targetObj, allSceneObjects));

        if (pLeft) {
          milaLeftConnector.position.copy(pLeft.worldPos);
          if (pLeft.worldNormal) {
            milaLeftConnector.quaternion.setFromUnitVectors(
              new THREE.Vector3(1, 0, 0),
              pLeft.worldNormal
            );
          } else {
            milaLeftConnector.rotation.set(0, connectors.yaw, 0);
          }
          milaLeftConnector.visible = !isLeftOccupied;
        } else {
          milaLeftConnector.visible = false;
        }

        if (pRight) {
          milaRightConnector.position.copy(pRight.worldPos);
          if (pRight.worldNormal) {
            milaRightConnector.quaternion.setFromUnitVectors(
              new THREE.Vector3(1, 0, 0),
              pRight.worldNormal
            );
          } else {
            const rightYaw = connectors.isGiro
              ? connectors.yaw - connectors.angleRad
              : connectors.yaw;
            milaRightConnector.rotation.set(0, rightYaw, 0);
          }
          milaRightConnector.visible = !isRightOccupied;
        } else {
          milaRightConnector.visible = false;
        }
      }

      let isSnapCandidate = false;
      if (isDragging) {
        if (connectors.isAccessory) {
          if (connectors.accessoryRole === 'armrest-left') milaRightConnector.visible = true;
          else if (connectors.accessoryRole === 'armrest-right') milaLeftConnector.visible = true;
          else milaLeftConnector.visible = true;
        } else {
          milaLeftConnector.visible = !pLeft?.isOccupied;
          milaRightConnector.visible = !pRight?.isOccupied;
        }

        const activeGroupId = targetObj.userData?.groupId;
        const candidateAssemblies = allAssemblies.filter(
          (node) => !activeGroupId || node.userData?.groupId !== activeGroupId
        );
        const candidateGiroSurfaces = allGiroSurfaces.filter(
          (node) => !activeGroupId || node.userData?.groupId !== activeGroupId
        );
        const candidateAccessories = allAccessories.filter(
          (node) => !activeGroupId || node.userData?.groupId !== activeGroupId
        );
        const candidatePanelDivisors = allPanelDivisors.filter(
          (node) => !activeGroupId || node.userData?.groupId !== activeGroupId
        );

        const snapResult = findBestMilaConnectorSnap({
          activeAssembly: targetObj,
          allAssemblies: candidateAssemblies,
          allGiroSurfaces: candidateGiroSurfaces,
          allAccessories: candidateAccessories,
          allPanelDivisors: candidatePanelDivisors,
        });

        if (snapResult) {
          isSnapCandidate = true;
          const activeMesh =
            snapResult.activeSide === 'left' ||
            snapResult.activeSide === 'center' ||
            snapResult.activeSide === 'screen'
              ? milaLeftConnector
              : milaRightConnector;
          setConnectorMeshColor(
            activeMesh,
            MILA_CONNECTOR_CONFIG.COLOR_SNAP_ACTIVE,
            MILA_CONNECTOR_CONFIG.CORE_COLOR_ACTIVE
          );

          const otherMesh =
            activeMesh === milaLeftConnector ? milaRightConnector : milaLeftConnector;
          setConnectorMeshColor(
            otherMesh,
            MILA_CONNECTOR_CONFIG.COLOR_NORMAL,
            MILA_CONNECTOR_CONFIG.CORE_COLOR_NORMAL
          );

          if (snapResult.connectionPoint) {
            milaSnapTargetConnector.position.copy(snapResult.connectionPoint);
            if (snapResult.targetNormal) {
              milaSnapTargetConnector.quaternion.setFromUnitVectors(
                new THREE.Vector3(1, 0, 0),
                snapResult.targetNormal
              );
            } else {
              milaSnapTargetConnector.rotation.set(0, snapResult.targetTransform.rotY, 0);
            }
            setConnectorMeshColor(
              milaSnapTargetConnector,
              MILA_CONNECTOR_CONFIG.COLOR_SNAP_ACTIVE,
              MILA_CONNECTOR_CONFIG.CORE_COLOR_ACTIVE
            );
            milaSnapTargetConnector.visible = true;
          }
        }
      }

      if (!isSnapCandidate) {
        setConnectorMeshColor(
          milaLeftConnector,
          MILA_CONNECTOR_CONFIG.COLOR_NORMAL,
          MILA_CONNECTOR_CONFIG.CORE_COLOR_NORMAL
        );
        setConnectorMeshColor(
          milaRightConnector,
          MILA_CONNECTOR_CONFIG.COLOR_NORMAL,
          MILA_CONNECTOR_CONFIG.CORE_COLOR_NORMAL
        );
        setConnectorMeshColor(
          milaPanelLeftConnector,
          MILA_CONNECTOR_CONFIG.COLOR_NORMAL,
          MILA_CONNECTOR_CONFIG.CORE_COLOR_NORMAL
        );
        setConnectorMeshColor(
          milaPanelRightConnector,
          MILA_CONNECTOR_CONFIG.COLOR_NORMAL,
          MILA_CONNECTOR_CONFIG.CORE_COLOR_NORMAL
        );
        milaSnapTargetConnector.visible = false;
      }

      milaConnectorHandleGroup.visible =
        milaLeftConnector.visible ||
        milaRightConnector.visible ||
        milaPanelLeftConnector.visible ||
        milaPanelRightConnector.visible ||
        milaSnapTargetConnector.visible;
      milaConnectorHandleGroup.updateMatrixWorld(true);
    }

    function computeBounds2D(root, { exclude = null } = {}) {
      // Calcula bounds en el espacio LOCAL del root (robusto para GLTF con hijos y pivotes raros)
      root.updateMatrixWorld(true);

      const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
      const localBox = new THREE.Box3();
      let hasAny = false;

      const v = new THREE.Vector3();
      const corners = [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ];

      root.traverse((child) => {
        if (!child.isMesh || !child.geometry) return;
        if (exclude?.(child)) return;

        const g = child.geometry;
        if (!g.boundingBox) g.computeBoundingBox();
        const bb = g.boundingBox;
        if (!bb) return;

        // 8 corners del bbox local de la geometría del mesh
        corners[0].set(bb.min.x, bb.min.y, bb.min.z);
        corners[1].set(bb.min.x, bb.min.y, bb.max.z);
        corners[2].set(bb.min.x, bb.max.y, bb.min.z);
        corners[3].set(bb.min.x, bb.max.y, bb.max.z);
        corners[4].set(bb.max.x, bb.min.y, bb.min.z);
        corners[5].set(bb.max.x, bb.min.y, bb.max.z);
        corners[6].set(bb.max.x, bb.max.y, bb.min.z);
        corners[7].set(bb.max.x, bb.max.y, bb.max.z);

        for (let i = 0; i < 8; i++) {
          v.copy(corners[i]);

          // corner -> world (mesh)
          v.applyMatrix4(child.matrixWorld);

          // world -> rootLocal
          v.applyMatrix4(invRoot);

          if (!hasAny) {
            localBox.min.copy(v);
            localBox.max.copy(v);
            hasAny = true;
          } else {
            localBox.expandByPoint(v);
          }
        }
      });

      if (!hasAny) return null;

      const localCenter = new THREE.Vector3();
      const sizeLocal = new THREE.Vector3();
      localBox.getCenter(localCenter);
      localBox.getSize(sizeLocal);

      return { localCenter, sizeLocal };
    }

    function computeSceneXZBounds(parts = [], walls = []) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;

      for (const p of parts) {
        if (!p) continue;
        const halfW = (p.w || 0) / 2;
        const halfD = (p.d || 0) / 2;

        minX = Math.min(minX, (p.x || 0) - halfW);
        maxX = Math.max(maxX, (p.x || 0) + halfW);
        minZ = Math.min(minZ, (p.z || 0) - halfD);
        maxZ = Math.max(maxZ, (p.z || 0) + halfD);
      }

      for (const wall of walls || []) {
        for (const pt of wall?.points || []) {
          minX = Math.min(minX, pt.x);
          maxX = Math.max(maxX, pt.x);
          minZ = Math.min(minZ, pt.z);
          maxZ = Math.max(maxZ, pt.z);
        }
      }

      if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minZ) || !isFinite(maxZ)) {
        return {
          minX: -5,
          maxX: 5,
          minZ: -5,
          maxZ: 5,
        };
      }

      return { minX, maxX, minZ, maxZ };
    }

    function updateFloorAndGrid({
      floorMesh,
      gridHelper,
      scene,
      bounds,
      padding = 10,
      minSize = 40,
    }) {
      const spanX = bounds.maxX - bounds.minX;
      const spanZ = bounds.maxZ - bounds.minZ;

      const size = Math.max(minSize, Math.ceil(Math.max(spanX, spanZ) + padding * 2));

      // Piso estático anclado en el origen del mundo
      floorMesh.scale.set(size, size, 1);
      floorMesh.position.set(0, 0, 0);

      // Grid viejo fuera
      if (gridHelper.current) {
        scene.remove(gridHelper.current);
        gridHelper.current.geometry?.dispose?.();
        gridHelper.current.material?.dispose?.();
      }

      const configuredGridSize = Number(floorMesh.userData?.gridSize);
      const cellSize =
        Number.isFinite(configuredGridSize) && configuredGridSize > 0 ? configuredGridSize : 0.1;
      const divisions = Math.max(10, Math.round(size / cellSize));
      const newGrid = new THREE.GridHelper(size, divisions, 0xbcbcbc, 0xe9e9e9);
      newGrid.position.set(0, 0.001, 0);
      scene.add(newGrid);
      gridHelper.current = newGrid;
    }

    function updateFloorVisualOptions(patch = {}) {
      const floor = floorMeshRef.current;
      if (!floor) return false;

      const nextPatch = { ...patch };
      if (Object.hasOwn(nextPatch, 'gridSize')) {
        const gridSize = Number(nextPatch.gridSize);
        if (!Number.isFinite(gridSize) || gridSize <= 0) return false;
        nextPatch.gridSize = gridSize;
      }

      floor.userData = {
        ...floor.userData,
        ...nextPatch,
      };

      if (Object.hasOwn(nextPatch, 'gridSize')) refreshFloorAndGrid();
      else applyFloorVisualState();
      setActivePart(floor);

      onFloatingEditorRequest?.({
        open: true,
        x: 640,
        y: 120,
        part: {
          code: floor.userData?.codigoPT || floor.userData?.code || 'FLOOR_MAIN',
          kind: floor.userData?.kind || 'FLOOR_VISUAL',
          meta: floor.userData?.meta || null,
          groupId: floor.userData?.groupId || null,
          groupName: floor.userData?.groupName || null,
          logicalCode: floor.userData?.logicalCode || null,
          instanceId: floor.userData?.instanceId || 'FLOOR_MAIN',
          description: floor.userData?.description || 'Piso principal',
          showGrid: floor.userData?.showGrid !== false,
          gridSize: floor.userData?.gridSize || 0.1,
        },
      });

      return true;
    }

    const floorGeo = new THREE.PlaneGeometry(1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8, //color: 0xf5f5f5,
      side: THREE.DoubleSide,
    });

    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;

    floorMesh.name = 'FLOOR_MAIN';

    floorMesh.userData = {
      code: 'FLOOR_MAIN',
      codigoPT: 'FLOOR_MAIN',
      kind: 'FLOOR_VISUAL',
      description: 'Piso principal',
      materialBase: 'PISO',
      materialCode: null,
      generico: 'PISO',
      instanceId: 'FLOOR_MAIN',
      isWorldGround: true,
      lockedMovement: true,
      lockedDelete: true,
      excludeFromBOM: true,
      isFloor: true,
      showGrid: true,
      gridSize: 0.1,
    };

    scene.add(floorMesh);
    floorMeshRef.current = floorMesh;
    // importante: que pueda seleccionarse
    pickables.push(floorMesh);

    // bounds iniciales vacíos / mínimos
    const initialBounds = computeSceneXZBounds([], walls);

    updateFloorAndGrid({
      floorMesh: floorMeshRef.current,
      gridHelper: gridHelperRef,
      scene,
      bounds: initialBounds,
    });

    function refreshFloorAndGrid() {
      const floor = floorMeshRef.current;
      const sceneNow = sceneRef.current;
      if (!floor || !sceneNow) return;

      const bounds = computeSceneXZBounds(getPartsSnapshot2D(), walls);

      updateFloorAndGrid({
        floorMesh: floor,
        gridHelper: gridHelperRef,
        scene: sceneNow,
        bounds,
      });

      applyFloorVisualState();
      syncGridVisibility();

      if (selectionHelper) selectionHelper.update();
    }

    refreshFloorAndGridRef.current = refreshFloorAndGrid;

    function applyFloorVisualState() {
      const floor = floorMeshRef.current;
      if (!floor) return;

      const hasFinish = Boolean(floor.userData?.materialCode);
      const floorMaterials = Array.isArray(floor.material) ? floor.material : [floor.material];
      floorMaterials.filter(Boolean).forEach((material) => {
        material.transparent = !hasFinish;
        material.opacity = hasFinish ? 1 : 0;
        material.depthWrite = hasFinish;
        material.needsUpdate = true;
      });

      const grid = gridHelperRef.current;
      if (grid) {
        grid.visible = floor.userData?.showGrid !== false;
      }
    }

    function syncGridVisibility() {
      const grid = gridHelperRef.current;
      if (!grid) return;

      if (activePart?.userData?.isFloor) {
        grid.visible = activePart.userData?.showGrid !== false;
        return;
      }

      const floor = floorMeshRef.current;
      grid.visible = floor?.userData?.showGrid !== false;
    }

    applyFloorVisualState();

    function clearAdditionalSelectionHelpers() {
      additionalSelectionHelpers.forEach((helper) => {
        scene.remove(helper);
        helper.geometry?.dispose?.();
        helper.material?.dispose?.();
      });
      additionalSelectionHelpers = [];
    }

    function syncSelectedIds3D(ids = []) {
      clearAdditionalSelectionHelpers();
      selectedIds3D = Array.from(new Set(ids || []));
      const selectedSet = new Set(selectedIds3D);
      const activeId = activePart?.userData?.instanceId || activePart?.uuid || null;

      if (selectionHelper) selectionHelper.visible = Boolean(activeId && selectedSet.has(activeId));

      parts.forEach(({ obj }) => {
        const id = obj?.userData?.instanceId || obj?.uuid;
        if (!id || !selectedSet.has(id) || obj === activePart) return;
        // Si el objeto es un hijo interno del mismo ensamble que activePart, no dibujar helper adicional redundante
        if (
          obj.userData?.parentAssemblyId &&
          (obj.userData.parentAssemblyId === activeId ||
            obj.userData.parentAssemblyId === activePart?.userData?.parentAssemblyId)
        ) {
          return;
        }
        const helper = new THREE.BoxHelper(obj, 0xffcc00);
        scene.add(helper);
        helper.update();
        additionalSelectionHelpers.push(helper);
      });
    }

    function setActivePart(obj, selectionContext = null) {
      activePart = obj;
      activeEditablePart =
        selectionContext?.propertiesTarget ||
        (isKoncisaAssemblyRoot(obj) ||
        isCritterium8AssemblyRoot(obj) ||
        isCritterium8SequenceRoot(obj)
          ? null
          : getEditableKoncisaPartObject(obj) || getCritterium8EditableTarget(obj));
      obj = activeEditablePart || obj;
      const hasSubMeshContext =
        selectionContext && Object.prototype.hasOwnProperty.call(selectionContext, 'subMesh');
      activeSubMesh =
        hasSubMeshContext && selectionContext.subMesh?.isMesh ? selectionContext.subMesh : null;

      if (hasSubMeshContext) {
        if (activeSubMesh) {
          const activeSubKey = getMeshPathKey(obj, activeSubMesh);
          obj.userData.activeSubKey = activeSubKey;
          obj.userData.activeSubName =
            activeSubMesh.name && activeSubMesh.name.trim()
              ? activeSubMesh.name.trim()
              : activeSubKey;
        } else {
          obj.userData.activeSubKey = null;
          obj.userData.activeSubName = null;
        }
      }
      const edukWidthContext =
        obj?.userData?.kind === 'EDUK'
          ? getEdukWidthInfoByCode(obj.userData?.codigoPT || obj.userData?.code)
          : null;

      // limpia helper anterior
      if (selectionHelper) {
        scene.remove(selectionHelper);
        selectionHelper = null;
      }

      syncGridVisibility();

      if (activePart) {
        selectionHelper = new THREE.BoxHelper(activePart, 0xffcc00);
        scene.add(selectionHelper);
        selectionHelper.update();
      }
      updateRotationHandle();
      updateEdukTableHandles();
      updateKuoAVSnapMarkers();
      updateMilaConnectors();

      const subKey = obj?.userData?.activeSubKey || null;
      const finishes = obj?.userData?.finishes || {};
      const subMaterialCode = subKey ? finishes[subKey]?.materialCode || null : null;
      const subName = obj?.userData?.activeSubName || null;
      const critteriumAssembly =
        getCritterium8AssemblyRoot(activePart) || getCritterium8AssemblyRoot(obj);
      const critteriumEditablePart = getCritterium8EditablePart(obj);
      const critteriumSequence =
        getCritterium8SequenceRoot(activePart) || getCritterium8SequenceRoot(obj);

      onSelectionChange?.({
        code: obj.userData.codigoPT || obj.userData.code,
        dimMm: obj.userData?.dim || null,
        dimM: obj.userData?.dimM || obj.userData?.procedural || obj.userData?.dimMeters || null,

        // ✅ NUEVO (Fase D)
        materialCode: obj.userData?.materialCode || null,
        materialBase: obj.userData?.materialBase || null,

        // ✅ CLAVE para filtrar gen-esp_3 por COD_GENERICO
        generico: obj.userData?.generico || null,
        genericos: obj.userData?.genericos || null,

        line: obj.userData?.line || null,

        // NUEVO PARA PANTALLAS
        type: obj.userData?.type || null,
        subtype: obj.userData?.subtype || null,
        material: obj.userData?.material || null,
        finishCode: obj.userData?.finishCode || null,
        finishLabel: obj.userData?.finishLabel || null,
        hasCanto: obj.userData?.hasCanto || false,
        hasBacker: obj.userData?.hasBacker || false,
        privacyPanelFinishId: obj.userData?.privacyPanelFinishId || null,

        subKey,
        subName,
        subMaterialCode,

        //datos para los popup
        kind: obj.userData?.kind || null,
        meta: obj.userData?.meta || null,
        groupId: obj.userData?.groupId || null,
        groupName: obj.userData?.groupName || null,
        logicalCode: obj.userData?.logicalCode || null,
        instanceId: obj.userData?.instanceId || obj.uuid || null,
        config: obj.userData?.config || null,
        userData: obj.userData || null,
        parentAssemblyId: obj.userData?.parentAssemblyId || null,
        selectionToggle: selectionContext?.toggle === true,
        selectionPreserve: selectionContext?.preserve === true,
        selectionTargetIds: selectionContext?.targetIds || null,
        ductCovers: obj.userData?.ductCovers || null,
        edukWidth: edukWidthContext?.currentWidth || null,
        edukToma: edukWidthContext?.toma || null,

        showGrid: obj.userData?.isFloor ? obj.userData?.showGrid !== false : undefined,
        gridSize: obj.userData?.isFloor ? obj.userData?.gridSize || 0.1 : undefined,
        critterium8: critteriumAssembly
          ? {
              assemblyId: critteriumAssembly.userData?.assemblyId,
              instanceId: critteriumAssembly.userData?.instanceId,
              frameId: critteriumAssembly.userData?.frameId,
              config: critteriumAssembly.userData?.config,
              composition: critteriumAssembly.userData?.composition,
              diagnostics: critteriumAssembly.userData?.renderReport?.diagnostics || [],
              editablePart: critteriumEditablePart
                ? {
                    instanceId: critteriumEditablePart.userData?.instanceId,
                    partId: critteriumEditablePart.userData?.partId,
                    partType: critteriumEditablePart.userData?.partType,
                    slotId: critteriumEditablePart.userData?.slotId,
                    code: critteriumEditablePart.userData?.code,
                    provisionalGeometry:
                      critteriumEditablePart.userData?.provisionalGeometry === true,
                  }
                : null,
            }
          : null,
        critterium8Sequence: critteriumSequence
          ? {
              sequenceId: critteriumSequence.userData?.sequenceId,
              frameIds: [...(critteriumSequence.userData?.frameIds || [])],
              junctionIds: [...(critteriumSequence.userData?.junctionIds || [])],
              metadata: { ...(critteriumSequence.userData?.metadata || {}) },
            }
          : null,
      });
    }

    function selectFloor() {
      const floor = floorMeshRef.current;
      if (!floor) return false;

      setActivePart(floor);

      onFloatingEditorRequest?.({
        open: true,
        x: 340,
        y: 120,
        part: {
          code: floor.userData?.codigoPT || floor.userData?.code || 'FLOOR_MAIN',
          kind: floor.userData?.kind || 'FLOOR_VISUAL',
          meta: floor.userData?.meta || null,
          groupId: floor.userData?.groupId || null,
          groupName: floor.userData?.groupName || null,
          logicalCode: floor.userData?.logicalCode || null,
          instanceId: floor.userData?.instanceId || 'FLOOR_MAIN',
          description: floor.userData?.description || 'Piso principal',
          showGrid: floor.userData?.showGrid !== false,
          gridSize: floor.userData?.gridSize || 0.1,
        },
      });

      return true;
    }

    /*
    function getPartsSnapshot2D() {
      return parts
        .map(({ obj, code }) => {
          if (!obj) return null;
          if (obj.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') return null;
          if (obj.userData?.kind === 'CRITTERIUM_8_PART') return null;

          obj.updateMatrixWorld(true);

          const objectType = String(obj.userData?.type || obj.userData?.kind || '')
            .trim()
            .toLowerCase();

          const objectCategory = String(obj.userData?.meta?.category || '')
            .trim()
            .toLowerCase();

          const isSurface =
            objectType === 'superficie' ||
            objectType === 'surface' ||
            objectCategory === 'superficies';

          // =====================================================
          // SUPERFICIES: usar bounds mundiales ya rotados
          // =====================================================

          if (isSurface) {
            const localBounds = computeBounds2D(obj);
            if (!localBounds) return null;
            const worldCenter = localBounds.localCenter.clone().applyMatrix4(obj.matrixWorld);
            const worldScale = obj.getWorldScale(new THREE.Vector3());
            const worldQuaternion = obj.getWorldQuaternion(new THREE.Quaternion());
            const worldRotY = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ').y;

            return {
              id: obj.userData?.instanceId || obj.uuid,

              codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,

              x: worldCenter.x,
              z: worldCenter.z,

              // Estas dimensiones ya incluyen la rotación del 3D.
              w: Math.max(0.001, worldSize.x),
              d: Math.max(0.001, worldSize.z),

              // No volver a rotarla en el visor 2D.
              rotY: 0,

              kind: obj.userData?.kind || 'SURFACE',

              type: obj.userData?.type || 'superficie',

              subtype: obj.userData?.subtype || null,
            };
          }
          // Preferir bounds2d robustos (si los calculas al cargar GLB / crear procedural)
          const b = obj.userData?.bounds2d;

          if (b?.localCenter && b?.sizeLocal) {
            const localCenter = new THREE.Vector3().fromArray(b.localCenter);
            const sizeLocal = new THREE.Vector3().fromArray(b.sizeLocal);

            // Centro real en WORLD (no obj.position)
            const centerWorld = localCenter.clone().applyMatrix4(obj.matrixWorld);

            // Tamaño real en WORLD (aplica escala world)
            const ws = new THREE.Vector3();
            obj.getWorldScale(ws);

            const w = Math.max(0.001, sizeLocal.x * ws.x);
            const d = Math.max(0.001, sizeLocal.z * ws.z);

            const worldQuaternion = new THREE.Quaternion();
            obj.getWorldQuaternion(worldQuaternion);

            const worldEuler = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ');

            const worldRotY = Number(worldEuler.y || 0);

            return {
              id: obj.userData?.instanceId || obj.uuid,
              codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,
              x: centerWorld.x,
              z: centerWorld.z,
              w,
              d,
              rotY: worldRotY,
              kind: obj.userData?.kind || 'PART',
            };
          }

          //  Fallback: Box3 world (menos estable si el GLB tiene pivote raro)
          const box = new THREE.Box3().setFromObject(obj);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          return {
            id: obj.userData?.instanceId || obj.uuid,
            codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,
            x: center.x,
            z: center.z,
            w: Math.max(0.001, size.x),
            d: Math.max(0.001, size.z),
            rotY: obj.rotation.y || 0,
            kind: obj.userData?.kind || 'PART',
          };
        })
        .filter(Boolean);
    }
*/

    function extractFinishAppearanceSnapshot2D(root) {
      if (!root?.traverse) return { appearance: null, appearances: [] };
      const appearances = [];
      const finishes = root.userData?.finishes || {};
      const rootMaterialCode = root.userData?.materialCode || null;

      root.traverse((node) => {
        if (!node?.isMesh) return;
        const componentKey = node === root ? 'root' : getMeshPathKey(root, node);
        const finishMaterialCode = finishes?.[componentKey]?.materialCode || null;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        const visibleMaterial = materials.find((material) => material?.color) || null;
        const visibleColor = visibleMaterial?.color?.getHexString
          ? `#${visibleMaterial.color.getHexString()}`
          : null;
        const semanticType =
          node.userData?.semanticType ||
          node.userData?.role ||
          node.userData?.type ||
          node.userData?.meta?.category ||
          root.userData?.type ||
          root.userData?.kind ||
          null;
        const appearance = resolveFinishAppearance2D(
          {
            componentKey,
            semanticType,
            meshMaterialCode: node.userData?.materialCode || null,
            rootMaterialCode,
            finishMaterialCode,
            visibleColor,
            opacity: visibleMaterial?.transparent ? visibleMaterial.opacity : null,
          },
          materialsByCodeRef.current
        );
        if (appearance) appearances.push(appearance);
      });

      const appearance =
        appearances.find((item) =>
          String(item.semanticType || '')
            .toLowerCase()
            .includes('superfic')
        ) ||
        appearances[0] ||
        null;
      return { appearance, appearances };
    }

    function getPartsSnapshot2D(options = {}) {
      const requestedDetailKeys = new Set(options?.detailed2DIds || []);
      let detailedGenerationBudget = Math.max(0, Number(options?.detailedGenerationBudget) || 2);
      return parts
        .map(({ obj, code }) => {
          if (!obj) return null;

          obj.updateMatrixWorld(true);
          const finishSnapshot = extractFinishAppearanceSnapshot2D(obj);
          const snapshotPartMetadata = {
            type: obj.userData?.kind || obj.userData?.type || 'PART',
            subtype: obj.userData?.subtype || null,
            line: obj.userData?.line || null,
            meta: obj.userData?.meta || null,
            ...finishSnapshot,
          };
          const attachDetailed = (snapshot) => {
            if (snapshot?.kind === 'CRITTERIUM_8_ASSEMBLY') return snapshot;
            const detailKey = get2DDetailKey(snapshot);
            if (!detailKey || !requestedDetailKeys.has(detailKey)) return snapshot;
            let detailedFootprint = getDetailedFootprint2DCacheEntry(obj);
            if (!hasDetailedFootprint2DCacheEntry(obj) && detailedGenerationBudget > 0) {
              detailedGenerationBudget -= 1;
              detailedFootprint = extractDetailedFootprint2D(obj, {
                normalShape: snapshot.footprint,
              });
            }
            return { ...snapshot, detailedFootprint };
          };

          if (
            obj.userData?.kind === 'KUO_AV_ASSEMBLY' ||
            obj.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY'
          ) {
            const box = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);
            const w = obj.userData?.dimMm?.width
              ? obj.userData.dimMm.width / 1000
              : obj.userData?.dimMm?.widthMm
                ? obj.userData.dimMm.widthMm / 1000
                : size.x;
            const d = obj.userData?.dimMm?.depth
              ? obj.userData.dimMm.depth / 1000
              : obj.userData?.dimMm?.depthMm
                ? obj.userData.dimMm.depthMm / 1000
                : size.z;
            return {
              ...snapshotPartMetadata,
              id: obj.userData?.instanceId || obj.uuid,
              groupId: obj.userData?.groupId || obj.userData?.instanceId,
              codigoPT:
                obj.userData?.codigoPT || obj.userData?.code || obj.userData?.kind || 'KUO_AV',
              x: center.x,
              z: center.z,
              w: Math.max(0.001, w),
              d: Math.max(0.001, d),
              rotY: obj.rotation.y || 0,
              kind: obj.userData.kind,
              type: obj.userData.kind,
            };
          }

          const objectType = String(obj.userData?.type || obj.userData?.kind || '')
            .trim()
            .toLowerCase();

          const objectCategory = String(obj.userData?.meta?.category || '')
            .trim()
            .toLowerCase();

          const isSurface =
            objectType === 'superficie' ||
            objectType === 'surface' ||
            objectCategory === 'superficies';

          if (isSurface) {
            const localBounds = computeBounds2D(obj);
            if (!localBounds) return null;
            const worldCenter = localBounds.localCenter.clone().applyMatrix4(obj.matrixWorld);
            const worldScale = obj.getWorldScale(new THREE.Vector3());
            const worldQuaternion = obj.getWorldQuaternion(new THREE.Quaternion());
            const worldRotY = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ').y;

            return attachDetailed({
              ...snapshotPartMetadata,
              id: obj.userData?.instanceId || obj.uuid,
              instanceId: obj.userData?.instanceId || obj.uuid,
              groupId: obj.userData?.groupId || null,
              assemblyId: obj.userData?.assemblyId || null,
              parentAssemblyId: obj.userData?.parentAssemblyId || null,
              sequenceId: obj.userData?.parentSequenceId || null,

              codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,

              x: worldCenter.x,
              z: worldCenter.z,

              w: Math.max(0.001, localBounds.sizeLocal.x * Math.abs(worldScale.x)),
              d: Math.max(0.001, localBounds.sizeLocal.z * Math.abs(worldScale.z)),

              rotY: Number(worldRotY || 0),

              kind: obj.userData?.kind || 'SURFACE',

              type: obj.userData?.type || 'superficie',

              subtype: obj.userData?.subtype || null,
              footprint: getFootprint2D(obj, { fallbackBounds: localBounds }),
            });
          }

          const b = obj.userData?.bounds2d;

          if (b?.localCenter && b?.sizeLocal) {
            const localCenter = new THREE.Vector3().fromArray(b.localCenter);

            const sizeLocal = new THREE.Vector3().fromArray(b.sizeLocal);

            const centerWorld = localCenter.clone().applyMatrix4(obj.matrixWorld);

            const ws = new THREE.Vector3();
            obj.getWorldScale(ws);

            const w = Math.max(0.001, sizeLocal.x * ws.x);

            const d = Math.max(0.001, sizeLocal.z * ws.z);

            const worldQuaternion = new THREE.Quaternion();
            obj.getWorldQuaternion(worldQuaternion);

            const worldEuler = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ');

            return attachDetailed({
              ...snapshotPartMetadata,
              id: obj.userData?.instanceId || obj.uuid,
              instanceId: obj.userData?.instanceId || obj.uuid,

              groupId: obj.userData?.groupId || null,
              assemblyId: obj.userData?.assemblyId || null,
              parentAssemblyId: obj.userData?.parentAssemblyId || null,
              sequenceId: obj.userData?.parentSequenceId || null,
              codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,

              x: centerWorld.x,
              z: centerWorld.z,

              w,
              d,

              rotY: Number(worldEuler.y || 0),

              kind: obj.userData?.kind || 'PART',
              footprint:
                obj.userData?.kind === 'CRITTERIUM_8_ASSEMBLY'
                  ? obj.userData.footprint2D
                  : getFootprint2D(obj, { fallbackBounds: b }),
            });
          }

          const computedBounds = computeBounds2D(obj);
          if (computedBounds) {
            const footprint = getFootprint2D(obj, { fallbackBounds: computedBounds });
            const centerWorld = computedBounds.localCenter.clone().applyMatrix4(obj.matrixWorld);
            const worldScale = obj.getWorldScale(new THREE.Vector3());
            const worldQuaternion = obj.getWorldQuaternion(new THREE.Quaternion());
            const worldRotY = new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ').y;
            return attachDetailed({
              ...snapshotPartMetadata,
              id: obj.userData?.instanceId || obj.uuid,
              instanceId: obj.userData?.instanceId || obj.uuid,
              groupId: obj.userData?.groupId || null,
              assemblyId: obj.userData?.assemblyId || null,
              parentAssemblyId: obj.userData?.parentAssemblyId || null,
              codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,
              x: centerWorld.x,
              z: centerWorld.z,
              w: Math.max(0.001, computedBounds.sizeLocal.x * Math.abs(worldScale.x)),
              d: Math.max(0.001, computedBounds.sizeLocal.z * Math.abs(worldScale.z)),
              rotY: Number(worldRotY || 0),
              kind: obj.userData?.kind || 'PART',
              footprint,
            });
          }

          const box = new THREE.Box3().setFromObject(obj);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();

          box.getSize(size);
          box.getCenter(center);
          const footprint = getFootprint2D(obj, {
            fallbackBounds: {
              localCenter: [0, 0, 0],
              sizeLocal: [size.x, size.y, size.z],
            },
          });

          return attachDetailed({
            ...snapshotPartMetadata,
            id: obj.userData?.instanceId || obj.uuid,
            instanceId: obj.userData?.instanceId || obj.uuid,
            groupId: obj.userData?.groupId || null,
            assemblyId: obj.userData?.assemblyId || null,
            parentAssemblyId: obj.userData?.parentAssemblyId || null,

            codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,

            x: center.x,
            z: center.z,

            w: Math.max(0.001, size.x),
            d: Math.max(0.001, size.z),

            rotY: 0,

            kind: obj.userData?.kind || 'PART',
            footprint,
          });
        })
        .filter(Boolean);
    }

    function selectPartById(instanceId) {
      const found =
        parts.find(({ obj }) => (obj?.userData?.instanceId || obj?.uuid) === instanceId) ||
        parts.find(
          ({ obj }) =>
            obj?.userData?.parentAssemblyId === instanceId || obj?.userData?.groupId === instanceId
        );
      const rawObj =
        found?.obj ||
        scene.children.find((child) => (child?.userData?.instanceId || child?.uuid) === instanceId);
      if (rawObj) {
        const root = moveAsGroupRef.current
          ? getRootPartObject(rawObj) || rawObj
          : getIndividualMovementRoot(rawObj) || rawObj;
        setActivePart(root);
        frameObject?.(root); // opcional: enfocar al seleccionar desde 2D
      }
    }

    function movePartToXZInternal(instanceId, x, z) {
      const found = parts.find(
        ({ obj }) => (obj?.userData?.instanceId || obj?.uuid) === instanceId
      );
      const rawObj =
        found?.obj ||
        scene.children.find((child) => (child?.userData?.instanceId || child?.uuid) === instanceId);
      if (!rawObj || rawObj.userData?.lockedMovement) return false;

      const obj = moveAsGroupRef.current
        ? getAssemblyObject(rawObj) || rawObj
        : getIndividualMovementRoot(rawObj) || rawObj;
      if (!obj || obj.userData?.lockedMovement) return false;

      const nextX = Number(x);
      const nextZ = Number(z);
      if (!Number.isFinite(nextX) || !Number.isFinite(nextZ)) return false;

      if (obj.userData?.kind === 'KUO_AV_ASSEMBLY') {
        console.log('[KUO INTERACTION]');
        console.log('2D DRAG MOVE');
        console.log(`instanceId: ${instanceId}`);
        console.log(`x: ${(nextX * 1000).toFixed(1)}`);
        console.log(`z: ${(nextZ * 1000).toFixed(1)}`);
      }

      obj.updateMatrixWorld(true);

      const bounds2d = obj.userData?.bounds2d;
      let currentCenterWorld;

      if (bounds2d?.localCenter) {
        currentCenterWorld = new THREE.Vector3()
          .fromArray(bounds2d.localCenter)
          .applyMatrix4(obj.matrixWorld);
      } else {
        currentCenterWorld = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
      }

      const currentRootWorld = obj.getWorldPosition(new THREE.Vector3());
      const targetRootWorld = currentRootWorld.clone();
      targetRootWorld.x += nextX - currentCenterWorld.x;
      targetRootWorld.z += nextZ - currentCenterWorld.z;

      let deltaX;
      let deltaZ;

      if (obj.parent) {
        obj.parent.updateMatrixWorld(true);
        const targetLocal = obj.parent.worldToLocal(targetRootWorld.clone());
        deltaX = targetLocal.x - obj.position.x;
        deltaZ = targetLocal.z - obj.position.z;
      } else {
        deltaX = targetRootWorld.x - obj.position.x;
        deltaZ = targetRootWorld.z - obj.position.z;
      }

      moveTargetOrGroup(obj, deltaX, 0, deltaZ);
      emitBOM();
      return true;
    }

    function isPartMovementLocked(instanceId) {
      const found = parts.find(
        ({ obj }) => (obj?.userData?.instanceId || obj?.uuid) === instanceId
      );

      return found?.obj?.userData?.lockedMovement === true;
    }

    function emitBOM() {
      const rows = new Map();

      function toFiniteNumber(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }

      function normalizePrices(prices = {}) {
        return {
          CO: toFiniteNumber(prices?.CO),
          EUC: toFiniteNumber(prices?.EUC),
          USD: toFiniteNumber(prices?.USD),
        };
      }

      function normalizeText(value) {
        return String(value ?? '').trim();
      }

      function resolveCatalogDescription(code, fallbackDescription = '') {
        const normalizedCode = normalizeText(code);
        const item = normalizedCode
          ? catalogByCodeRef.current?.get?.(normalizedCode) || null
          : null;
        const catalogDescription = normalizeText(
          item?.ui?.title ||
            item?.ui?.subtitle ||
            item?.raw?.descripcion ||
            item?.raw?.description ||
            item?.raw?.DESCRIPCION_LARGA
        );
        const fallback = normalizeText(fallbackDescription);
        if (!catalogDescription) return fallback || normalizedCode;

        return /^SPECIAL:\s*/i.test(fallback)
          ? `SPECIAL: ${catalogDescription}`
          : catalogDescription;
      }

      function resolveOptionalUnitPrice(value) {
        const price = Number(value);
        return Number.isFinite(price) && price > 0 ? price : null;
      }

      function belongsToKoncisaPlusAssembly(object) {
        let current = object?.parent || null;
        while (current) {
          if (current.userData?.kind === 'KONCISA_PLUS_ASSEMBLY') return true;
          current = current.parent || null;
        }
        return false;
      }

      function addRow(
        code,
        qtyToAdd,
        forcedDescription,
        forcedUnitPrice,
        groupId,
        groupName,
        forcedPrices,
        groupCount,
        groupInstanceId
      ) {
        if (!code) return;

        const normalizedCode = normalizeText(code);
        const normalizedGroupId = normalizeText(groupId);
        const rowKey = normalizedGroupId
          ? `T:${normalizedGroupId}::${normalizedCode}`
          : `S::${normalizedCode}`;

        const item = catalogByCodeRef.current?.get?.(normalizedCode);

        const description =
          forcedDescription || item?.ui?.title || item?.ui?.subtitle || normalizedCode;

        const itemPrices = normalizePrices(item?.prices || {});
        const incomingPrices = normalizePrices(forcedPrices || {});
        const mergedIncomingPrices = {
          CO: incomingPrices.CO || itemPrices.CO,
          EUC: incomingPrices.EUC || itemPrices.EUC,
          USD: incomingPrices.USD || itemPrices.USD,
        };

        const rawPrice =
          forcedUnitPrice ??
          mergedIncomingPrices[countryRef.current] ??
          item?.prices?.[countryRef.current] ??
          0;
        const unit = Number(rawPrice || 0);

        const prev = rows.get(rowKey) || {
          code: normalizedCode,
          description,
          qty: 0,
          unitPrice: unit,
          price: unit,
          total: 0,
          prices: mergedIncomingPrices,
          groupId: normalizedGroupId || null,
          groupName: groupName || null,
          groupCount: groupCount || null,
          _groupInstanceIds: new Set(),
        };

        const groupInstanceIds = prev._groupInstanceIds || new Set();
        if (groupInstanceId) groupInstanceIds.add(String(groupInstanceId));

        const finalPrices = {
          CO: toFiniteNumber(prev?.prices?.CO) || mergedIncomingPrices.CO,
          EUC: toFiniteNumber(prev?.prices?.EUC) || mergedIncomingPrices.EUC,
          USD: toFiniteNumber(prev?.prices?.USD) || mergedIncomingPrices.USD,
        };

        const prevUnit = Number(prev.unitPrice || prev.price || 0);
        const unitBySelectedCountry = Number(finalPrices[countryRef.current] || 0);
        const finalUnit = prevUnit || unitBySelectedCountry || unit;
        const qty = Number(prev.qty || 0) + Number(qtyToAdd || 0);
        const total = finalUnit * qty;

        rows.set(rowKey, {
          ...prev,
          description,
          qty,
          unitPrice: finalUnit,
          price: finalUnit,
          total,
          prices: finalPrices,
          groupId: normalizedGroupId || prev.groupId || null,
          groupName: groupName || prev.groupName || null,
          groupCount:
            Math.max(
              Number(groupCount || 0),
              Number(prev.groupCount || 0),
              groupInstanceIds.size
            ) || null,
          _groupInstanceIds: groupInstanceIds,
        });
      }

      for (const p of parts) {
        const obj = p.obj;
        if (!obj) continue;

        if (obj.userData?.excludeFromBOM) continue;

        if (obj.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY') {
          const bomList = obj.userData?.bom || [];
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || 'PUESTO_DOBLE_KUO_AV'
          );
          const label = obj.userData?.name || 'Puesto Doble Kuo AV';
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;
          const groupId = obj.userData?.groupId || groupInstanceId;
          const groupName = obj.userData?.groupName || 'Puesto Doble Kuo AV';

          if (Array.isArray(bomList) && bomList.length) {
            for (const it of bomList) {
              const itemCode = String(it.codigo || it.code);
              addRow(
                itemCode,
                Number(it.cantidad || it.qty || it.quantity || 1),
                resolveCatalogDescription(
                  itemCode,
                  it.descripcion || it.description || it.name
                ),
                resolveOptionalUnitPrice(it.unitPrice),
                groupId,
                groupName,
                it.prices,
                null,
                groupInstanceId
              );
            }
          }
          continue;
        }

        if (obj.userData?.kind === 'KUO_AV_ASSEMBLY') {
          const bomList = obj.userData?.bom || obj.userData?.kuoAVParts || [];
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;
          const groupId = obj.userData?.groupId || groupInstanceId;
          const groupName = obj.userData?.groupName || 'Kuo AV Superficie Perimetral';

          for (const item of bomList) {
            const itemCode = String(item.codigo || item.code);
            addRow(
              itemCode,
              Number(item.cantidad || item.qty || item.quantity || 1),
              resolveCatalogDescription(itemCode, item.descripcion || item.description),
              resolveOptionalUnitPrice(item.unitPrice),
              groupId,
              groupName,
              item.prices,
              null,
              groupInstanceId
            );
          }
          continue;
        }

        // Si es una pieza hija de un ensamblaje, la raíz ya procesó el BOM
        // Excepto para piezas de Mila cuyos ensamblajes no procesan el BOM directamente en la raíz
        const isMilaPart =
          obj.userData?.line === 'MILA' ||
          obj.userData?.line === 'MILA_DOUBLE' ||
          obj.userData?.category === 'mila' ||
          obj.userData?.category === 'mila-double' ||
          obj.userData?.meta?.category === 'mila' ||
          obj.userData?.meta?.line === 'MILA' ||
          (obj.userData?.kind && String(obj.userData.kind).startsWith('MILA'));

        const isKoncisaPart = belongsToKoncisaPlusAssembly(obj);

        if (obj.userData?.parentAssemblyId && !isMilaPart && !isKoncisaPart) {
          continue;
        }

        if (obj.userData?.kind === 'TYPOLOGY') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name ||
            obj.userData?.tipologiaMeta?.descripcion ||
            `Tipología ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.typologyParts || [];

          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          } else {
            if (parentCode)
              addRow(parentCode, 1, label, 0, parentCode, label, undefined, null, groupInstanceId);
          }
          continue;
        }

        if (obj.userData?.kind === 'CHAIR') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name || obj.userData?.chairMeta?.descripcion || `Silla ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.chairParts || [];

          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          } else {
            if (parentCode)
              addRow(parentCode, 1, label, 0, parentCode, label, undefined, null, groupInstanceId);
          }
          continue;
        }

        if (obj.userData?.kind === 'ARES') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name || obj.userData?.aresMeta?.descripcion || `Ares ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.aresParts || [];

          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          } else {
            if (parentCode)
              addRow(parentCode, 1, label, 0, parentCode, label, undefined, null, groupInstanceId);
          }
          continue;
        }

        if (obj.userData?.kind === 'PLANT') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name || obj.userData?.plantMeta?.descripcion || `Planta ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.plantParts || [];

          // Solo agregamos al BOM si la planta tiene código de precio
          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          }
          // Si no hay plantParts (sin código de precio), no agregamos al BOM
          continue;
        }

        if (obj.userData?.kind === 'MEPAL_SALUD') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name ||
            obj.userData?.mepalMeta?.descripcion ||
            `MepalSalud ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.mepalParts || [];

          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          } else {
            if (parentCode)
              addRow(parentCode, 1, label, 0, parentCode, label, undefined, null, groupInstanceId);
          }
          continue;
        }

        if (obj.userData?.kind === 'MEPAL_TEK_SOCIAL') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name ||
            obj.userData?.mepalTekSocialMeta?.descripcion ||
            `Mepal TekSocial ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.mepalTekSocialParts || [];

          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          } else {
            if (parentCode)
              addRow(parentCode, 1, label, 0, parentCode, label, undefined, null, groupInstanceId);
          }
          continue;
        }

        if (obj.userData?.kind === 'CLAK') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name || obj.userData?.clakMeta?.descripcion || `Clak ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.clakParts || [];

          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          } else {
            if (parentCode)
              addRow(parentCode, 1, label, 0, parentCode, label, undefined, null, groupInstanceId);
          }
          continue;
        }

        if (obj.userData?.kind === 'EDUK') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name || obj.userData?.edukMeta?.descripcion || `Eduk ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          const list = obj.userData?.edukParts || [];

          if (Array.isArray(list) && list.length) {
            for (const it of list) {
              addRow(
                String(it.code),
                Number(it.qty || 0),
                it.description,
                it.unitPrice,
                parentCode,
                label,
                it.prices,
                null,
                groupInstanceId
              );
            }
          } else {
            if (parentCode)
              addRow(parentCode, 1, label, 0, parentCode, label, undefined, null, groupInstanceId);
          }
          continue;
        }

        if (obj.userData?.kind === 'ALMACENAMIENTO') {
          const parentCode = normalizeText(
            obj.userData?.codigoPT || obj.userData?.code || p.code || ''
          );
          const label =
            obj.userData?.name ||
            obj.userData?.description ||
            obj.userData?.almacenCategory ||
            `Zen Almacenamiento ${parentCode}`;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

          addRow(
            String(parentCode),
            1,
            obj.userData?.description || label,
            obj.userData?.unitPrice || 0,
            parentCode,
            label,
            obj.userData?.prices || undefined,
            null,
            groupInstanceId
          );

          const addonParts = Array.isArray(obj.userData?.almacenAddonParts)
            ? obj.userData.almacenAddonParts
            : [];

          for (const it of addonParts) {
            const addonCode = normalizeText(it.code || '');
            const addonGroupId = addonCode ? `ADICION_${addonCode}` : 'ADICION_ALMACENAMIENTO';
            const addonGroupName = addonCode || 'Adicion Almacenamiento';
            addRow(
              String(addonCode || it.code),
              Number(it.qty || 1),
              it.description,
              it.unitPrice,
              addonGroupId,
              addonGroupName,
              it.prices,
              null,
              `${groupInstanceId || parentCode}__${addonGroupId}`
            );
          }

          continue;
        }

        // =====================================================
        //  MILA & MILA DOBLE (Desglose de Puestos)
        // =====================================================
        if (
          obj.userData?.kind === 'GLB_PART' &&
          (obj.userData?.line === 'MILA' || obj.userData?.line === 'MILA_DOUBLE') &&
          String(obj.userData?.meta?.role || '').toLowerCase() === 'seat'
        ) {
          const groupId = obj.userData?.groupId || null;
          const groupName = obj.userData?.groupName || null;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;
          const isDouble = obj.userData?.line === 'MILA_DOUBLE';
          const seatMode =
            obj.userData?.meta?.seatMode ||
            resolveMilaSeatModeByCode(obj.userData?.codigoPT || obj.userData?.code);

          if (seatMode === 'tableGrommet') {
            addRow(
              '22000130199',
              1,
              null,
              null,
              groupId,
              groupName,
              undefined,
              null,
              groupInstanceId
            );
            addRow(
              '22000126755',
              1,
              null,
              null,
              groupId,
              groupName,
              undefined,
              null,
              `${groupInstanceId}_GROMMET`
            );
          } else if (
            seatMode === 'table' ||
            obj.userData?.code === '22000130198' ||
            obj.userData?.code === '22000130199' ||
            obj.userData?.code === 'TKSSU165000'
          ) {
            const resolvedTableCode = '22000130199';
            addRow(
              resolvedTableCode,
              1,
              null,
              null,
              groupId,
              groupName,
              undefined,
              null,
              groupInstanceId
            );
          } else if (isDouble) {
            // Mila doble: 2 asientos madera + 1 espaldar doble
            addRow(
              '22000127935',
              2,
              null,
              null,
              groupId,
              groupName,
              undefined,
              null,
              `${groupInstanceId}_SEAT`
            );
            addRow(
              '22000127980',
              1,
              null,
              null,
              groupId,
              groupName,
              undefined,
              null,
              `${groupInstanceId}_BACK`
            );
          } else {
            // Mila simple: 1 asiento madera
            addRow(
              obj.userData?.code || '22000127935',
              1,
              obj.userData?.chairMeta?.descripcion || obj.userData?.description || null,
              obj.userData?.unitPrice || null,
              groupId,
              groupName,
              obj.userData?.prices || undefined,
              null,
              groupInstanceId
            );
            addRow(
              '22000127936',
              1,
              null,
              null,
              groupId,
              groupName,
              undefined,
              null,
              `${groupInstanceId}_BACK`
            );
          }
          continue;
        }

        // =====================================================
        //  MILA SUPERFICIE PARA GIRO
        // =====================================================
        if (
          obj.userData?.kind === 'MILA_GIRO_SURFACE' ||
          obj.userData?.type === 'MILA_GIRO_SURFACE' ||
          obj.userData?.meta?.role === 'giro-surface'
        ) {
          const groupId = obj.userData?.groupId || null;
          const groupName = obj.userData?.groupName || null;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;
          const angleDeg = Number(obj.userData?.angleDeg || obj.userData?.meta?.angleDeg || 60);
          const useGrommet = Boolean(obj.userData?.useGrommet ?? obj.userData?.meta?.useGrommet);

          const def = MILA_GIRO_DEFINITIONS[angleDeg] || MILA_GIRO_DEFINITIONS[60];
          const surfaceCode = String(
            def?.code || obj.userData?.codigoPT || obj.userData?.code || ''
          );
          const surfaceDesc =
            def?.description ||
            obj.userData?.description ||
            `${def?.label || 'Superficie Giro'} Mila`;
          const surfacePrices = def?.prices || obj.userData?.prices || undefined;

          if (surfaceCode) {
            addRow(
              surfaceCode,
              1,
              surfaceDesc,
              null,
              groupId,
              groupName,
              surfacePrices,
              null,
              groupInstanceId
            );
          }

          if (useGrommet) {
            addRow(
              '22000126755',
              1,
              'KIT TOMA CORRIENTE LEVINTON CON VERTEBRA MOREA HAC020000',
              null,
              groupId,
              groupName,
              { CO: 472500, USD: 64, EUC: 124 },
              null,
              `${groupInstanceId}_GROMMET`
            );
          }
          continue;
        }

        // =====================================================
        //  MILA PANELES TERMINALES (ESPALDA + LATERALES FIJOS)
        // =====================================================
        if (
          (obj.userData?.line === 'MILA' || obj.userData?.line === 'MILA_DOUBLE') &&
          String(obj.userData?.meta?.role || obj.userData?.role || '').toLowerCase() === 'screen'
        ) {
          const groupId = obj.userData?.groupId || null;
          const groupName = obj.userData?.groupName || null;
          const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;
          const screenQuantity = Math.max(
            1,
            Math.min(4, Number(obj.userData?.meta?.quantity || obj.userData?.quantity || 1))
          );
          const screenBreakdown = resolveMilaScreenBomBreakdown(screenQuantity);

          // Panel de espalda: si no existe una pieza de 4 puestos, se descompone en dos piezas de 2.
          for (const panel of screenBreakdown) {
            const catalog =
              panel.code === '22000129109'
                ? MILA_ACCESSORY_CATALOG.screen2P
                : panel.code === '22000129112'
                  ? MILA_ACCESSORY_CATALOG.screen3P
                  : panel.code === '22000127941'
                    ? MILA_ACCESSORY_CATALOG.screen1P
                    : resolveMilaScreenCatalogItem(screenQuantity);
            addRow(
              String(
                panel.code || catalog?.code || obj.userData?.codigoPT || obj.userData?.code || ''
              ),
              Number(panel.qty || 1),
              null,
              null,
              groupId,
              groupName,
              undefined,
              null,
              `${groupInstanceId}_SCREEN_BACK_${panel.code}`
            );
          }

          // Laterales del panel envolvente: deben existir en BOM, pero no se instancian
          // como GLB separados en la ruta 3D del puesto integrado.
          addRow(
            String(MILA_ACCESSORY_CATALOG.screenSideLeft.code),
            1,
            null,
            null,
            groupId,
            groupName,
            undefined,
            null,
            `${groupInstanceId}_SCREEN_SIDE_LEFT`
          );

          addRow(
            String(MILA_ACCESSORY_CATALOG.screenSideRight.code),
            1,
            null,
            null,
            groupId,
            groupName,
            undefined,
            null,
            `${groupInstanceId}_SCREEN_SIDE_RIGHT`
          );

          continue;
        }

        const code = obj.userData?.codigoPT || obj.userData?.code || p.code;

        const groupId = obj.userData?.groupId || null;
        const groupName = obj.userData?.groupName || null;
        const groupInstanceId = obj.userData?.instanceId || obj.uuid || p.id;

        addRow(
          String(code),
          1,
          obj.userData?.description || null,
          obj.userData?.unitPrice || 0,
          groupId,
          groupName,
          obj.userData?.prices || undefined,
          null,
          groupInstanceId
        );

        // =====================================================
        //  2. AGREGAR TAPAS
        // =====================================================
        if (obj.userData?.kind === 'ducto') {
          const state = obj.userData?.ductCovers || obj.userData?.meta?.ductCovers;

          if (state) {
            const tipoModulo = obj.userData?.meta?.tipoModulo;

            const sides = getDuctCoverSides(tipoModulo, state);

            const asset = resolveDuctCoverAsset({
              tipoPuesto: obj.userData?.meta?.tipoPuesto,
              tipoCanal: obj.userData?.meta?.tipoCanal,
            });

            if (asset && sides.length) {
              sides.forEach(() => {
                addRow(
                  asset.code,
                  1,
                  null,
                  null,
                  groupId,
                  groupName,
                  undefined,
                  null,
                  groupInstanceId
                );
              });
            }
          }
        }
      }

      const bomRows = Array.from(rows.values()).map(({ _groupInstanceIds, ...row }) => ({
        ...row,
        groupCount: Number(row.groupCount || _groupInstanceIds?.size || 0) || null,
      }));

      onBOMChange?.(bomRows);
    }

    emitBOMRef.current = emitBOM;

    // Subir por padres hasta encontrar el objeto que tiene userData.code
    function getRootPartObject(intersectObj) {
      const sequence = getCritterium8SequenceRoot(intersectObj);
      if (sequence) return sequence;
      // 1. Si pertenece a un ensamble estructurado (Mila, Koncisa Plus), la raíz es el ensamble completo
      const assembly = getAssemblyObject(intersectObj);
      if (assembly) return assembly;

      let cur = intersectObj;
      let fallback = null;

      while (cur) {
        const kind = cur.userData?.kind;

        // 2. Priorizar contenedores/raíces de ensamblaje
        if (
          kind === 'FLOOR_VISUAL' ||
          kind === 'TYPOLOGY' ||
          kind === 'CHAIR' ||
          kind === 'ARES' ||
          kind === 'PLANT' ||
          kind === 'OFFICE_ACCESSORY' ||
          kind === 'MEPAL_SALUD' ||
          kind === 'MEPAL_TEK_SOCIAL' ||
          kind === 'CLAK' ||
          kind === 'EDUK' ||
          kind === 'ALMACENAMIENTO' ||
          kind === 'CRITTERIUM_8_ASSEMBLY' ||
          kind === 'KUO_AV_ASSEMBLY' ||
          kind === 'KUO_AV_DOBLE_ASSEMBLY' ||
          kind === 'MILA_ASSEMBLY' ||
          kind === 'MILA_PANEL_DIVISOR_ASSEMBLY' ||
          kind === 'KONCISA_PLUS_ASSEMBLY'
        ) {
          return cur;
        }

        // 3. Raíz explícita
        if (cur.userData?.isPartRoot) {
          return cur;
        }

        // 4. Fallback: piezas sueltas seleccionables
        if (
          !fallback &&
          [
            'PART',
            'ALMACENAMIENTO',
            'SURFACE',
            'PRIVACY_PANEL',
            'GLB_PART',
            'BLOCK_PART',

            // Koncisa Plus
            'ducto',
            'ductoPiso',
            'ductoTecho',
            'pedestal',
            'refuerzoSuperficiePedestal',
            'refuerzoSuperficieIntegracion',
            'soporteDuctoPedestal',
            'costado',
            'costadoIntegracionUnitario',
            'acopleDucto',
            'grommet',
            'pasacable',
            'viga',
          ].includes(kind)
        ) {
          fallback = cur;
        }

        cur = cur.parent;
      }

      return fallback;
    }

    function getIndividualMovementRoot(object) {
      if (!object) return null;
      const assembly = getAssemblyObject(object);
      let current = object;
      let fallback = null;

      while (current && current !== scene) {
        if (current !== assembly && current.userData?.isPartRoot) return current;

        const kind = String(current.userData?.kind || '');
        if (
          !fallback &&
          current !== assembly &&
          [
            'PART',
            'SURFACE',
            'PRIVACY_PANEL',
            'GLB_PART',
            'BLOCK_PART',
            'ducto',
            'ductoPiso',
            'ductoTecho',
            'pedestal',
            'costado',
            'costadoIntegracionUnitario',
            'acopleDucto',
            'grommet',
            'pasacable',
            'viga',
          ].includes(kind)
        ) {
          fallback = current;
        }
        if (current === assembly) break;
        current = current.parent;
      }

      return fallback || assembly || getRootPartObject(object);
    }

    function getAssemblyObject(object) {
      const sequence = getCritterium8SequenceRoot(object);
      if (sequence) return sequence;
      let current = object;

      while (current && current !== scene) {
        if (
          current.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' ||
          current.userData?.type === 'koncisa-plus' ||
          current.userData?.kind === 'CRITTERIUM_8_ASSEMBLY' ||
          current.userData?.type === 'critterium-8' ||
          current.userData?.kind === 'KUO_AV_ASSEMBLY' ||
          current.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY' ||
          current.userData?.kind === 'MILA_ASSEMBLY' ||
          current.userData?.type === 'mila' ||
          current.userData?.kind === 'MILA_PANEL_DIVISOR_ASSEMBLY' ||
          current.userData?.type === 'mila-panel-divisor' ||
          current.userData?.kind === 'MILA_GIRO_SURFACE' ||
          current.userData?.type === 'MILA_GIRO_SURFACE' ||
          current.userData?.meta?.role === 'giro-surface'
        ) {
          return current;
        }
        current = current.parent;
      }

      const parentAssemblyId = object?.userData?.parentAssemblyId;
      if (!parentAssemblyId) return null;

      let matchedAssembly = null;
      scene.traverse((candidate) => {
        if (matchedAssembly) return;
        const candidateIds = [candidate.userData?.instanceId, candidate.uuid];
        if (candidateIds.includes(parentAssemblyId)) matchedAssembly = candidate;
      });
      return matchedAssembly;
    }

    function getKoncisaAssemblyObject(object) {
      return getAssemblyObject(object);
    }

    function getActiveEditablePartObject() {
      return (
        activeEditablePart ||
        getEditableKoncisaPartObject(activePart) ||
        getCritterium8EditablePart(activePart)
      );
    }

    function resolveSelectionTargets(object, { asGroup = moveAsGroupRef.current } = {}) {
      const physicalRoot = asGroup ? getRootPartObject(object) : getIndividualMovementRoot(object);
      const physicalId = physicalRoot?.userData?.instanceId || physicalRoot?.uuid;

      if (!physicalRoot || !physicalId || !asGroup) {
        return physicalId ? [physicalId] : [];
      }

      const assembly = getAssemblyObject(object) || getAssemblyObject(physicalRoot);
      const targetGroupId = assembly?.userData?.groupId || physicalRoot?.userData?.groupId;

      const physicalObjects = parts.map(({ obj }) => obj).filter(Boolean);
      let members = [];

      if (assembly) {
        members.push(assembly);
        const assemblyIds = new Set(
          [assembly.userData?.instanceId, assembly.userData?.code, assembly.uuid].filter(Boolean)
        );
        const descendants = physicalObjects.filter((candidate) =>
          isDescendantOf(candidate, assembly)
        );
        const linkedMembers = physicalObjects.filter((candidate) =>
          assemblyIds.has(candidate.userData?.parentAssemblyId)
        );
        members = Array.from(new Set([...members, ...descendants, ...linkedMembers]));
      }

      if (targetGroupId) {
        const groupedRoots = getGroupedObjects(physicalRoot);
        groupedRoots.forEach((root) => {
          if (!root) return;
          members.push(root);
          const rootAssembly = getAssemblyObject(root);
          if (rootAssembly) {
            members.push(rootAssembly);
            const rootIds = new Set(
              [
                rootAssembly.userData?.instanceId,
                rootAssembly.userData?.code,
                rootAssembly.uuid,
              ].filter(Boolean)
            );
            const descendants = physicalObjects.filter((candidate) =>
              isDescendantOf(candidate, rootAssembly)
            );
            const linkedMembers = physicalObjects.filter((candidate) =>
              rootIds.has(candidate.userData?.parentAssemblyId)
            );
            members.push(...descendants, ...linkedMembers);
          }
        });

        const groupMembers = physicalObjects.filter(
          (candidate) => candidate.userData?.groupId === targetGroupId
        );
        members = Array.from(new Set([...members, ...groupMembers]));
      }

      const resolvedIds = members
        .map((candidate) => candidate.userData?.instanceId || candidate.uuid)
        .filter(Boolean);

      if (physicalId && !resolvedIds.includes(physicalId)) {
        resolvedIds.unshift(physicalId);
      }

      return resolvedIds.length ? resolvedIds : physicalId ? [physicalId] : [];
    }

    function resolveSelectionTargetIds(ids = [], options = {}) {
      return Array.from(
        new Set(
          Array.from(new Set(ids || []))
            .map((id) => findPartById(id))
            .filter(Boolean)
            .flatMap((object) => resolveSelectionTargets(object, options))
            .filter(Boolean)
        )
      );
    }

    function updateMouseFromEvent(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }

    async function buildAlmacenamientoAddonParts(variantValue) {
      const addonCodes = getAlmacenamientoAddonCodesByVariant(variantValue);
      if (!addonCodes.length) return [];

      const out = [];

      for (const addonCode of addonCodes) {
        const [detCO, detEUC, detUSD] = await Promise.all([
          getChairDetail(addonCode, 'CO'),
          getChairDetail(addonCode, 'EUC'),
          getChairDetail(addonCode, 'USD'),
        ]);

        out.push({
          code: addonCode,
          description:
            detCO?.descripcion ||
            detEUC?.descripcion ||
            detUSD?.descripcion ||
            (addonCode === ALMACENAMIENTO_CUSHION_CODE ? 'Cushion' : 'Laminate'),
          qty: 1,
          unitPrice: Number(
            (countryRef.current === 'EUC'
              ? detEUC?.precio
              : countryRef.current === 'USD'
                ? detUSD?.precio
                : detCO?.precio) ||
              detCO?.precio ||
              detEUC?.precio ||
              detUSD?.precio ||
              0
          ),
          prices: {
            CO: Number(detCO?.precio || 0),
            EUC: Number(detEUC?.precio || 0),
            USD: Number(detUSD?.precio || 0),
          },
        });
      }

      return out;
    }

    // ====== Helpers ======
    async function loadConnectors(code) {
      const res = await fetch(`/assets/meta/${code}.connectors.json`);
      if (!res.ok) throw new Error(`No se pudo cargar conectores para ${code}`);
      return res.json();
    }

    function getLineCenterWorld(obj, from, to) {
      obj.updateMatrixWorld(true);

      // PRIORIDAD: meta por instancia (procedural)
      const units =
        obj.userData?.meta?.units ||
        obj.userData?.units ||
        catalogCache.get(obj.userData?.code)?.meta?.units ||
        'mm';

      const v1 = new THREE.Vector3(from[0], from[1], from[2]);
      const v2 = new THREE.Vector3(to[0], to[1], to[2]);

      if (units === 'mm') {
        v1.multiplyScalar(MM_TO_M);
        v2.multiplyScalar(MM_TO_M);
      }

      const p1 = v1.applyMatrix4(obj.matrixWorld);
      const p2 = v2.applyMatrix4(obj.matrixWorld);

      return p1.add(p2).multiplyScalar(0.5);
    }

    function isCompatible(cm, ct) {
      const cmList = Array.isArray(cm?.compatibleWith) ? cm.compatibleWith : [];
      const ctList = Array.isArray(ct?.compatibleWith) ? ct.compatibleWith : [];

      // match por id (lo más confiable con tu JSON actual)
      const a = cmList.includes(ct?.id);
      const b = ctList.includes(cm?.id);

      return a || b;
    }

    function snapKuoAVAssembly(assembly, applyVariantSwap = false) {
      if (
        !assembly ||
        (assembly.userData?.kind !== 'KUO_AV_ASSEMBLY' &&
          assembly.userData?.kind !== 'KUO_AV_DOBLE_ASSEMBLY')
      )
        return false;

      // Asegurar siempre nivel de piso en Y = 0
      assembly.position.y = 0;
      assembly.updateMatrixWorld(true);

      const activeBox = new THREE.Box3().setFromObject(assembly);
      const SNAP_THRESHOLD_M = 0.25; // 250 mm de tolerancia para snap lateral
      let bestCandidate = null;
      let minDistance = Infinity;

      scene.traverse((node) => {
        if (!node || node === assembly) return;
        const isOtherKuoOrDesk =
          (node.userData?.kind === 'KUO_AV_ASSEMBLY' ||
            node.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY' ||
            node.userData?.kind === 'KONCISA_PLUS_ASSEMBLY') &&
          node.userData?.instanceId !== assembly.userData?.instanceId &&
          !isDescendantOf(node, assembly) &&
          !isDescendantOf(assembly, node);

        if (!isOtherKuoOrDesk) return;

        const targetBox = new THREE.Box3().setFromObject(node);

        // 1. Probar Snap Lateral Derecho (Active a la derecha de Target)
        const distRight = Math.abs(activeBox.min.x - targetBox.max.x);
        const zAlignRight = Math.abs(activeBox.min.z - targetBox.min.z);
        if (distRight <= SNAP_THRESHOLD_M && zAlignRight <= SNAP_THRESHOLD_M) {
          const totalDist = distRight + zAlignRight;
          if (totalDist < minDistance) {
            minDistance = totalDist;
            bestCandidate = {
              target: node,
              targetBox,
              delta: new THREE.Vector3(
                targetBox.max.x - activeBox.min.x,
                0,
                targetBox.min.z - activeBox.min.z
              ),
              type: 'LATERAL_RIGHT',
            };
          }
        }

        // 2. Probar Snap Lateral Izquierdo (Active a la izquierda de Target)
        const distLeft = Math.abs(activeBox.max.x - targetBox.min.x);
        const zAlignLeft = Math.abs(activeBox.min.z - targetBox.min.z);
        if (distLeft <= SNAP_THRESHOLD_M && zAlignLeft <= SNAP_THRESHOLD_M) {
          const totalDist = distLeft + zAlignLeft;
          if (totalDist < minDistance) {
            minDistance = totalDist;
            bestCandidate = {
              target: node,
              targetBox,
              delta: new THREE.Vector3(
                targetBox.min.x - activeBox.max.x,
                0,
                targetBox.min.z - activeBox.min.z
              ),
              type: 'LATERAL_LEFT',
            };
          }
        }

        // 3. Probar Snap Enfrentado en Z (Frente a frente)
        const distFront = Math.abs(activeBox.min.z - targetBox.max.z);
        const xAlignFront = Math.abs(activeBox.min.x - targetBox.min.x);
        if (distFront <= SNAP_THRESHOLD_M && xAlignFront <= SNAP_THRESHOLD_M) {
          const totalDist = distFront + xAlignFront;
          if (totalDist < minDistance) {
            minDistance = totalDist;
            bestCandidate = {
              target: node,
              targetBox,
              delta: new THREE.Vector3(
                targetBox.min.x - activeBox.min.x,
                0,
                targetBox.max.z - activeBox.min.z
              ),
              type: 'FACE_TO_FACE',
            };
          }
        }

        // 4. Probar Snap Perpendicular / Unión en L (90 grados)
        const rotActive = THREE.MathUtils.euclideanModulo(assembly.rotation.y, Math.PI * 2);
        const rotTarget = THREE.MathUtils.euclideanModulo(node.rotation.y, Math.PI * 2);
        const diffAngle = THREE.MathUtils.euclideanModulo(Math.abs(rotActive - rotTarget), Math.PI);
        const isPerp =
          Math.abs(diffAngle - Math.PI / 2) < 0.25 ||
          Math.abs(diffAngle - (3 * Math.PI) / 2) < 0.25;

        if (isPerp) {
          // Búsqueda de contacto entre bordes en disposición perpendicular
          const centerDist = activeBox
            .getCenter(new THREE.Vector3())
            .distanceTo(targetBox.getCenter(new THREE.Vector3()));
          const maxDimActive = activeBox.getSize(new THREE.Vector3()).length();
          const maxDimTarget = targetBox.getSize(new THREE.Vector3()).length();
          if (centerDist <= (maxDimActive + maxDimTarget) * 0.6) {
            const dMinX = Math.abs(activeBox.min.x - targetBox.max.x);
            const dMaxX = Math.abs(activeBox.max.x - targetBox.min.x);
            const dMinZ = Math.abs(activeBox.min.z - targetBox.max.z);
            const dMaxZ = Math.abs(activeBox.max.z - targetBox.min.z);
            const minEdgeDist = Math.min(dMinX, dMaxX, dMinZ, dMaxZ);
            if (minEdgeDist <= SNAP_THRESHOLD_M && minEdgeDist < minDistance) {
              minDistance = minEdgeDist;
              let deltaPerp = new THREE.Vector3(0, 0, 0);
              if (minEdgeDist === dMinX) deltaPerp.x = targetBox.max.x - activeBox.min.x;
              else if (minEdgeDist === dMaxX) deltaPerp.x = targetBox.min.x - activeBox.max.x;
              else if (minEdgeDist === dMinZ) deltaPerp.z = targetBox.max.z - activeBox.min.z;
              else if (minEdgeDist === dMaxZ) deltaPerp.z = targetBox.min.z - activeBox.max.z;

              bestCandidate = {
                target: node,
                targetBox,
                delta: deltaPerp,
                type: 'PERPENDICULAR_L',
                isPerpendicular: true,
              };
            }
          }
        }
      });

      if (bestCandidate) {
        // Ajuste angular magnético: enderezar al múltiplo de 90° más cercano si está alineado
        const nearestAngle = Math.round(assembly.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
        if (Math.abs(assembly.rotation.y - nearestAngle) < 0.15) {
          assembly.rotation.y = nearestAngle;
        }

        assembly.position.add(bestCandidate.delta);
        assembly.position.y = 0;
        assembly.updateMatrixWorld(true);

        const offsetLocal = {
          x: assembly.position.x - bestCandidate.target.position.x,
          y: 0,
          z: assembly.position.z - bestCandidate.target.position.z,
        };

        assembly.userData.attachment = {
          targetAssemblyId: bestCandidate.target.userData?.instanceId || bestCandidate.target.uuid,
          mode: bestCandidate.isPerpendicular ? 'BENCH_PERPENDICULAR' : 'BENCH_LATERAL',
          offsetLocal,
        };

        // Unión magnética bidireccional
        if (!bestCandidate.target.userData.attachedNeighbors) {
          bestCandidate.target.userData.attachedNeighbors = new Set();
        }
        bestCandidate.target.userData.attachedNeighbors.add(
          assembly.userData?.instanceId || assembly.uuid
        );

        return true;
      } else {
        if (assembly.position.y !== 0) {
          assembly.position.y = 0;
          assembly.updateMatrixWorld(true);
        }
        assembly.userData.attachment = null;
        return false;
      }
    }

    function checkAndApplyKuoAVLUnion(assembly) {
      if (!assembly || assembly.userData?.kind !== 'KUO_AV_DOBLE_ASSEMBLY') return;
      const instId = assembly.userData?.instanceId;
      if (!instId) return;

      assembly.updateMatrixWorld(true);
      const widthMm = Number(assembly.userData?.config?.anchoMm || 1200);
      const halfWidthM = widthMm / 2 / 1000;
      const leftWorld = new THREE.Vector3(-halfWidthM, 0, 0).applyMatrix4(assembly.matrixWorld);
      const rightWorld = new THREE.Vector3(halfWidthM, 0, 0).applyMatrix4(assembly.matrixWorld);

      let foundPerpNeighbor = null;
      let minPerpDist = Infinity;
      let meetingSide = null;

      scene.traverse((node) => {
        if (!node || node === assembly) return;
        const isOtherDesk =
          (node.userData?.kind === 'KUO_AV_ASSEMBLY' ||
            node.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY' ||
            node.userData?.kind === 'KONCISA_PLUS_ASSEMBLY') &&
          node.userData?.instanceId !== instId &&
          !isDescendantOf(node, assembly) &&
          !isDescendantOf(assembly, node);

        if (!isOtherDesk) return;

        const rotA = THREE.MathUtils.euclideanModulo(assembly.rotation.y, Math.PI * 2);
        const rotB = THREE.MathUtils.euclideanModulo(node.rotation.y, Math.PI * 2);
        const diffAngle = THREE.MathUtils.euclideanModulo(Math.abs(rotA - rotB), Math.PI);
        const isPerp =
          Math.abs(diffAngle - Math.PI / 2) < 0.25 ||
          Math.abs(diffAngle - (3 * Math.PI) / 2) < 0.25;

        if (!isPerp) return;

        const targetBox = new THREE.Box3().setFromObject(node);
        const distLeft = targetBox.distanceToPoint(leftWorld);
        const distRight = targetBox.distanceToPoint(rightWorld);
        const closestDist = Math.min(distLeft, distRight);

        if (closestDist < 0.45 && closestDist < minPerpDist) {
          minPerpDist = closestDist;
          foundPerpNeighbor = node;
          meetingSide = distLeft <= distRight ? 'LEFT' : 'RIGHT';
        }
      });

      const currConfig = assembly.userData?.config || {};

      if (foundPerpNeighbor && meetingSide === 'LEFT') {
        if (currConfig.pieIzquierdo !== false || currConfig.paralesIzquierdos !== false) {
          void swapKuoAVDobleVariant(instId, {
            pieIzquierdo: false,
            paralesIzquierdos: false,
            pieDerecho: true,
            paralesDerechos: true,
          });
        }
      } else if (foundPerpNeighbor && meetingSide === 'RIGHT') {
        if (currConfig.pieDerecho !== false || currConfig.paralesDerechos !== false) {
          void swapKuoAVDobleVariant(instId, {
            pieIzquierdo: true,
            paralesIzquierdos: true,
            pieDerecho: false,
            paralesDerechos: false,
          });
        }
      } else if (!foundPerpNeighbor) {
        if (currConfig.pieIzquierdo === false || currConfig.pieDerecho === false) {
          void swapKuoAVDobleVariant(instId, {
            pieIzquierdo: true,
            paralesIzquierdos: true,
            pieDerecho: true,
            paralesDerechos: true,
          });
        }
      }
    }

    function snapActivePart(applyVariantSwap = false) {
      if (!activePart) return;

      if (
        activePart.userData?.kind === 'KUO_AV_ASSEMBLY' ||
        activePart.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY' ||
        activePart.userData?.kind === 'KUO_AV_PANTALLA_ASSEMBLY'
      ) {
        if (activePart.userData?.kind !== 'KUO_AV_PANTALLA_ASSEMBLY') {
          snapKuoAVAssembly(activePart, applyVariantSwap);
        }
        if (selectionHelper) selectionHelper.update();
        return;
      }

      if (!snapActive) return;

      const activeCode = activePart.userData.code;
      const activeMeta = catalogCache.get(activeCode)?.meta;
      const activeConnectors = activeMeta?.connectors || [];

      const now = performance.now();
      if (now - lastSnapTime < SNAP_COOLDOWN_MS) return;
      lastSnapTime = now;

      if (!activeConnectors.length) return;

      let best = {
        dist: Infinity,
        delta: null,
      };

      // Recorre todas las demás piezas
      for (const p of parts) {
        if (p.obj === activePart) continue;

        const targetMeta = catalogCache.get(p.code)?.meta;
        const targetConnectors = targetMeta?.connectors || [];
        if (!targetConnectors.length) continue;

        // Compara TODOS los conectores (activo vs target)
        for (const cm of activeConnectors) {
          if (!cm?.line?.from || !cm?.line?.to) continue;

          for (const ct of targetConnectors) {
            if (!ct?.line?.from || !ct?.line?.to) continue;

            // Compatibilidad por JSON
            if (!isCompatible(cm, ct)) continue;

            const cMove = getLineCenterWorld(activePart, cm.line.from, cm.line.to);
            const cTarget = getLineCenterWorld(p.obj, ct.line.from, ct.line.to);
            const dist = cMove.distanceTo(cTarget);

            if (dist < best.dist) {
              best.dist = dist;
              best.delta = cTarget.clone().sub(cMove);
            }
          }
        }
      }

      // Aplica el mejor snap si esta dentro del umbral
      if (best.delta && best.dist <= SNAP_THRESHOLD) {
        activePart.position.add(best.delta);
        activePart.updateMatrixWorld(true);
        if (selectionHelper) selectionHelper.update();
      }
    }

    function frameObject(obj) {
      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera.fov * Math.PI) / 180;

      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 2.8;

      camera.position.set(center.x + cameraZ, center.y + cameraZ * 0.6, center.z + cameraZ);
      camera.near = Math.max(0.01, cameraZ / 100);
      camera.far = cameraZ * 800;
      camera.updateProjectionMatrix();

      controls.target.copy(center);
      controls.update();
    }

    async function addPartFromGlb(item) {
      const parentGroup = item?.parentGroup || null;
      const codigoPT = item?.codigoPT;
      const src = item?.model?.src;

      if (!codigoPT) {
        console.error('addPartFromGlb: item sin codigoPT', item);
        return;
      }
      if (!src) {
        console.error('addPartFromGlb: item sin model.src', item);
        return;
      }

      // cache por codigoPT
      if (!catalogCache.has(codigoPT)) {
        const gltf = await new Promise((resolve, reject) => {
          loader.load(src, resolve, undefined, reject);
        });

        const base = gltf.scene;

        let scale = 1;
        if (item.model?.units === 'mm') scale = 0.001;
        if (item.model?.units === 'm') scale = 1;

        base.scale.setScalar(scale);

        // conecta metadata (conectores) si existe
        let meta = null;
        if (item.connectorsMeta?.src) {
          const res = await fetch(item.connectorsMeta.src);
          if (res.ok) meta = await res.json();
        }

        catalogCache.set(codigoPT, { base, meta });
      }

      const { base } = catalogCache.get(codigoPT);
      const obj = base.clone(true);

      // bounds 2D robustos (local center + size)
      const b2d = computeBounds2D(obj);
      if (b2d) {
        obj.userData.bounds2d = {
          localCenter: b2d.localCenter.toArray(),
          sizeLocal: b2d.sizeLocal.toArray(),
        };
      }

      obj.userData = {
        codigoPT, // negocio
        code: codigoPT, // compat
        name: item.ui?.title || '',
        isPartRoot: true,
        instanceId: obj.uuid,

        // 🔑 AQUÍ SE GUARDA EL GENÉRICO
        generico: item.generico || item.raw?.generico || null,

        // Fase D
        materialBase: item.materialBase || item.raw?.material || null,
        materialCode: null,

        kind: item?.variants ? 'ALMACENAMIENTO' : 'PART',
        // Almacenamiento-specific metadata
        almacenVariant: item?.model?.variant || null,
        almacenCategory: item?.raw?.category || item?.model?.category || null,
        almacenVariants: item?.variants || null,
        almacenAddonParts: item?.variants
          ? await buildAlmacenamientoAddonParts(item?.model?.variant)
          : null,
      };
      obj.name = obj.userData.name || codigoPT;

      const spawnX = 0.5 + parts.length * 0.9;
      const spawnZ = 0.5; // fijo positivo (o 0.5 + (parts.length%3)*0.9)
      obj.position.set(spawnX, 0, spawnZ);

      //scene.add(obj);
      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push({ code: codigoPT, obj }); // BOM por codigoPT
      pickables.push(obj);

      setActivePart(obj);
      emitBOM?.();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function loadExistingGlb(possibleSrcs) {
      if (!possibleSrcs) return null;
      const srcs = Array.isArray(possibleSrcs) ? possibleSrcs : [possibleSrcs];
      for (const src of srcs) {
        try {
          const res = await fetch(src, { method: 'GET' });

          if (!res.ok) {
            console.warn('No existe:', src, res.status);
            continue;
          }

          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            console.warn('La ruta devolvió HTML y no GLB:', src);
            continue;
          }

          const arrayBuffer = await res.arrayBuffer();

          const gltf = await new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.parse(arrayBuffer, '', resolve, reject);
          });

          console.log('Modelo válido encontrado en:', src);
          return gltf;
        } catch (err) {
          console.warn('Falló carga de:', src, err);
        }
      }

      return null;
    }

    async function addTypology(codigoTipologia, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoTipologia);

      function getChildUnitPrice(hijo) {
        const precio = Number(hijo?.precio);
        if (Number.isFinite(precio) && precio > 0) return precio;
        return 0;
      }

      // 1) trae detalle por lista para construir precios por país
      const [detCO, detEUC, detUSD] = await Promise.all([
        getTipologiaDetalle(codigo, 'CO'),
        getTipologiaDetalle(codigo, 'EUC'),
        getTipologiaDetalle(codigo, 'USD'),
      ]);

      let det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.error('Tipología no encontrada en tipologias-detalle.json:', codigo);
        return;
      }

      // 2) cargar tipologias GLB del bloque padre
      //const src = `/assets/models/koncisapluss_${codigo}.glb`;

      const possibleSrcs = [
        `/assets/models/koncisapluss_${codigo}.glb`,
        `/assets/models/${codigo}.glb`,
      ];
      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró un GLB válido para ${codigo}`);
        return;
      }

      const obj = gltf.scene;

      // 3) (opcional) escala si aplica
      // obj.scale.setScalar(0.001);

      const indexByCode = (detalle) => {
        const map = new Map();
        for (const h of detalle?.hijos || []) {
          const childCode = String(h?.producto?.codigo || '').trim();
          if (childCode) map.set(childCode, h);
        }
        return map;
      };

      const hijosCO = indexByCode(detCO);
      const hijosEUC = indexByCode(detEUC);
      const hijosUSD = indexByCode(detUSD);

      // 4) construir hijos con precios por país (precio unitario real de cada lista)
      const typologyParts = (det.hijos || [])
        .map((h) => {
          const code = String(h?.producto?.codigo || '');
          const description = h?.producto?.descripcion || '';
          const qty = Number(h?.cantidad || 0);

          const prices = {
            CO: getChildUnitPrice(hijosCO.get(code) || h),
            EUC: getChildUnitPrice(hijosEUC.get(code) || h),
            USD: getChildUnitPrice(hijosUSD.get(code) || h),
          };

          const unitPrice = Number(prices[countryRef.current] || 0);

          return { code, description, qty, unitPrice, prices };
        })
        .filter((x) => x.code && x.qty > 0);

      // 5) userData: OJO con el kind y el nombre de la lista
      obj.userData = {
        ...(obj.userData || {}),
        isPartRoot: true,
        kind: 'TYPOLOGY', // ESTE ES EL QUE VA A LEER emitBOM
        codigoPT: codigo,
        code: codigo,
        name: det.descripcion || codigo,

        // ESTA ES LA LISTA QUE VA A EXPANDIR EL BOM
        typologyParts,

        tipologiaMeta: {
          categoria_costos: det.categoria_costos,
          descripcion: det.descripcion,
        },
      };

      obj.name = `TYPOLOGY_${codigo}`;

      // 6) posición inicial (ajusta a tu lógica)
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      //scene.add(obj);
      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push({ code: codigo, obj });
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function addChair(codigoSilla, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoSilla);

      // 1) trae detalle de la silla desde el XML (precio e información)
      const [detCO, detEUC, detUSD] = await Promise.all([
        getChairDetail(codigo, 'CO'),
        getChairDetail(codigo, 'EUC'),
        getChairDetail(codigo, 'USD'),
      ]);

      let det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.warn('Silla no encontrada en PriceList:', codigo, '- se cargará sin precio.');
        // fallback mínimo para permitir carga del GLB
        det = { descripcion: codigo, precio: 0, udm: 'und' };
      }

      // 2) cargar GLB de silla desde carpeta Sillas
      const possibleSrcs = [
        `/assets/models/Sillas/sillas_ecuador/${codigo}.glb`,
        `/assets/models/Sillas/${codigo}.glb`,
        `/assets/models/${codigo}.glb`,
      ];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró un GLB válido para silla ${codigo}`);
        return;
      }

      const obj = gltf.scene;

      // 3) userData: similar al de tipologías pero para CHAIR
      // Para sillas, creamos "chairParts" array con un solo items (la silla misma)
      const chairParts = [
        {
          code: codigo,
          description: det.descripcion,
          qty: 1,
          unitPrice: Number(det.precio || 0),
          prices: {
            CO: detCO?.precio || 0,
            EUC: detEUC?.precio || 0,
            USD: detUSD?.precio || 0,
          },
        },
      ];

      obj.userData = {
        ...(obj.userData || {}),
        kind: 'CHAIR', //  Tipo CHAIR para que el BOM lo reconozca
        codigoPT: codigo,
        code: codigo,
        name: det.descripcion || codigo,

        // Array de partes (solo la silla en este caso)
        chairParts,

        chairMeta: {
          descripcion: det.descripcion,
          precio: det.precio,
          udm: det.udm,
        },
      };

      obj.name = `CHAIR_${codigo}`;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      //scene.add(obj);
      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push({ code: codigo, obj });
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function addAres(codigoAres, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoAres);

      let result;
      try {
        result = await createAresInstance({
          codigoPT: codigoAres,
          country: countryRef.current,
          getProductDefinition: getAresProductDefinition,
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(`No se pudo crear el producto Ares ${codigo}`, error);
        return;
      }

      const { object: obj, partRecord } = result;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      //scene.add(obj);
      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push(partRecord);
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function addPlant(plantName, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const name = String(plantName).trim();

      if (!name) {
        console.error('Nombre de planta vacío');
        return;
      }

      // 1) Obtener detalles de la planta (busca en XML si existe precio)
      const [detCO, detEUC, detUSD] = await Promise.all([
        getPlantDetail(name, 'CO'),
        getPlantDetail(name, 'EUC'),
        getPlantDetail(name, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      // 2) Cargar GLB desde carpeta Plants and Flowers
      const possibleSrcs = [
        `/assets/models/Plants and Flowers/${name}.glb`,
        `/assets/models/${name}.glb`,
      ];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró GLB para planta: ${name}`);
        alert(
          `No se encontró el modelo 3D para "${name}". Verifica que exista en /assets/models/Plants and Flowers/`
        );
        return;
      }

      const obj = gltf.scene;

      // Normalizar escala solo para plantas (algunos GLB vienen en mm y quedan gigantes)
      obj.updateMatrixWorld(true);
      const plantBox = new THREE.Box3().setFromObject(obj);
      const plantSize = new THREE.Vector3();
      plantBox.getSize(plantSize);
      const maxDim = Math.max(plantSize.x, plantSize.y, plantSize.z);

      if (Number.isFinite(maxDim) && maxDim > 0) {
        // Si es enorme (p.ej. > 10m), lo llevamos a tamaño razonable (~1m máx)
        if (maxDim > 10) {
          const scale = 1 / maxDim;
          obj.scale.multiplyScalar(scale);
          obj.updateMatrixWorld(true);
        }
      }

      // 3) Preparar BOM: solo si tiene código de precio
      const plantParts =
        det && det.codigo
          ? [
              {
                code: det.codigo,
                description: det.descripcion,
                qty: 1,
                unitPrice: Number(det.precio || 0),
                prices: {
                  CO: detCO?.precio || 0,
                  EUC: detEUC?.precio || 0,
                  USD: detUSD?.precio || 0,
                },
              },
            ]
          : [];

      obj.userData = {
        ...(obj.userData || {}),
        kind: 'PLANT',
        codigoPT: name,
        code: name,
        name: det?.descripcion || name,
        plantName: name,
        plantParts,
        plantMeta: {
          descripcion: det?.descripcion || name,
          precio: det?.precio || 0,
          udm: det?.udm || 'und',
        },
      };

      obj.name = `PLANT_${name}`;

      // 4) Posición y agregar a escena
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      //scene.add(obj);
      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push({ code: name, obj });
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function addOfficeAccessory(accessoryName, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const name = String(accessoryName).trim();

      if (!name) {
        console.error('Nombre de accesorio vacío');
        return;
      }

      // 1) Obtener detalles del accesorio (busca en XML si existe precio)
      const [detCO, detEUC, detUSD] = await Promise.all([
        getOfficeAccessoryDetail(name, 'CO'),
        getOfficeAccessoryDetail(name, 'EUC'),
        getOfficeAccessoryDetail(name, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      // 2) Cargar GLB desde carpeta Office Accesories
      const possibleSrcs = [
        `/assets/models/Office Accesories/${name}.glb`,
        `/assets/models/${name}.glb`,
      ];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró GLB para accesorio: ${name}`);
        alert(
          `No se encontró el modelo 3D para "${name}". Verifica que exista en /assets/models/Office Accesories/`
        );
        return;
      }

      const obj = gltf.scene;

      // Normalizar escala solo para accesorios (algunos GLB vienen en mm y quedan gigantes)
      obj.updateMatrixWorld(true);
      const accBox = new THREE.Box3().setFromObject(obj);
      const accSize = new THREE.Vector3();
      accBox.getSize(accSize);
      const maxDim = Math.max(accSize.x, accSize.y, accSize.z);

      if (Number.isFinite(maxDim) && maxDim > 0) {
        // Si es enorme (p.ej. > 10m), lo llevamos a tamaño razonable (~1m máx)
        if (maxDim > 10) {
          const scale = 1 / maxDim;
          obj.scale.multiplyScalar(scale);
          obj.updateMatrixWorld(true);
        }
      }

      // 3) Preparar BOM: solo si tiene código de precio
      const accParts =
        det && det.codigo
          ? [
              {
                code: det.codigo,
                description: det.descripcion,
                qty: 1,
                unitPrice: Number(det.precio || 0),
                prices: {
                  CO: detCO?.precio || 0,
                  EUC: detEUC?.precio || 0,
                  USD: detUSD?.precio || 0,
                },
              },
            ]
          : [];

      obj.userData = {
        ...(obj.userData || {}),
        kind: 'OFFICE_ACCESSORY',
        codigoPT: name,
        code: name,
        name: det?.descripcion || name,
        accessoryName: name,
        accParts,
        accMeta: {
          descripcion: det?.descripcion || name,
          precio: det?.precio || 0,
          udm: det?.udm || 'und',
        },
      };

      obj.name = `OFFICE_ACCESSORY_${name}`;

      // 4) Posicion y agregar a escena
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      //scene.add(obj);
      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push({ code: name, obj });
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function addMepalSalud(codigoMepal, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoMepal);

      let result;
      try {
        result = await createSaludInstance({
          codigoPT: codigo,
          country: countryRef.current,
          variant: options?.variant,
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(`No se pudo crear el producto MepalSalud ${codigo}`, error);
        return;
      }

      const { object: obj, partRecord } = result;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push(partRecord);
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function addMepalTekSocial(codigoMepalTekSocial, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoMepalTekSocial);

      let result;
      try {
        result = await createTekSocialInstance({
          codigoPT: codigoMepalTekSocial,
          country: countryRef.current,
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(`No se pudo crear el producto Mepal TekSocial ${codigo}`, error);
        return;
      }

      const { object: obj, partRecord } = result;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push(partRecord);
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function addClak(codigoClak, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoClak);

      let result;
      try {
        result = await createClakInstance({
          codigoPT: codigoClak,
          country: countryRef.current,
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(`No se pudo crear el producto Clak ${codigo}`, error);
        return;
      }

      const { object: obj, partRecord } = result;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push(partRecord);
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function addEduk(codigoEduk, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoEduk);

      let result;
      try {
        result = await createEdukInstance({
          codigoPT: codigoEduk,
          country: countryRef.current,
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(`No se pudo crear el producto Eduk ${codigo}`, error);
        return;
      }

      const { object: obj, partRecord } = result;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }
      parts.push(partRecord);
      pickables.push(obj);

      setActivePart(obj);
      emitBOM();

      if (parts.length === 1) frameObject(obj);
      refreshFloorAndGrid();
      return obj;
    }

    async function addZen(codigoPT, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoPT || '').trim();

      let result;
      try {
        result = await createZenInstance({
          codigoPT: codigo,
          country: countryRef.current,
          variant: options?.variant || 'base',
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(`No se pudo crear el producto Zen Almacenamiento ${codigo}`, error);
        return;
      }

      const { object, partRecord } = result;
      object.userData = {
        ...(object.userData || {}),
        isPartRoot: true,
        materialBase: object.userData?.materialBase ?? options?.materialBase ?? null,
        materialCode: object.userData?.materialCode ?? options?.materialCode ?? null,
      };

      const bounds2d = computeBounds2D(object);
      if (bounds2d) {
        object.userData.bounds2d = {
          localCenter: bounds2d.localCenter.toArray(),
          sizeLocal: bounds2d.sizeLocal.toArray(),
        };
      }

      object.position.set(0.5 + parts.length * 0.9, 0, 0.5);

      if (parentGroup) {
        parentGroup.add(object);
      } else {
        scene.add(object);
      }
      object.updateMatrixWorld(true);

      parts.push(partRecord);
      pickables.push(object);

      setActivePart(object);
      emitBOM();

      if (parts.length === 1) frameObject(object);
      refreshFloorAndGrid();
      return object;
    }

    async function addCritterium8(config = {}, options = {}) {
      if (readOnly) return null;
      let instance;
      try {
        instance = await createCritterium8Instance({ ...config, transform: options.transform });
      } catch (error) {
        console.error('[Critterium 8] No se pudo crear la instancia.', error);
        return null;
      }

      const { assembly } = registerCritterium8Instance({
        instance,
        parent: options?.parentGroup || scene,
        partsRegistry: parts,
        pickables,
      });
      assembly.updateMatrixWorld(true);
      setActivePart(assembly);
      recordCreateObjects({ objects: [assembly] });
      emitBOM();
      if (parts.length === assembly.children.length + 1) frameObject(assembly);
      refreshFloorAndGrid();
      return instance;
    }

    function getSelectedCritterium8Sequence() {
      return (
        getCritterium8SequenceRoot(activePart) ||
        (isCritterium8SequenceRoot(activePart) ? activePart : null)
      );
    }

    function selectCritterium8Sequence(sequenceRoot) {
      syncSelectedIds3D([sequenceRoot.userData.sequenceId]);
      setActivePart(sequenceRoot, { targetIds: [sequenceRoot.userData.sequenceId] });
    }

    function createCritterium8SequenceHistoryState(frameAssemblies, groups = []) {
      return {
        frames: Array.from(new Set(frameAssemblies || [])),
        groups: groups.map((group) => ({
          sequenceId: group.sequenceId,
          frameAssemblies: Array.from(new Set(group.frameAssemblies || [])),
          sequence: group.sequence ? JSON.parse(JSON.stringify(group.sequence)) : null,
        })),
      };
    }

    function applyCritterium8SequenceHistoryState(state = {}) {
      const frames = Array.from(new Set(state.frames || []));
      const roots = Array.from(
        new Set(frames.map((frame) => getCritterium8SequenceRoot(frame)).filter(Boolean))
      );
      roots.forEach((root) =>
        unregisterCritterium8Sequence({
          sequenceRoot: root,
          partsRegistry: parts,
          pickables,
          preserveFrames: true,
          targetParent: scene,
        })
      );
      const created = [];
      for (const group of state.groups || []) {
        const prepared = prepareCritterium8Sequence({
          frameAssemblies: group.frameAssemblies,
          options: { sequenceId: group.sequenceId },
          previousSequence: group.sequence,
        });
        if (!prepared.success)
          throw new Error(prepared.reason || 'CRITTERIUM8_SEQUENCE_HISTORY_REBUILD_FAILED');
        registerCritterium8Sequence({
          sequenceRoot: prepared.sequenceRoot,
          parent: scene,
          partsRegistry: parts,
          pickables,
        });
        created.push(prepared.sequenceRoot);
      }
      if (created.length === 1) selectCritterium8Sequence(created[0]);
      else clearSelectionAfterRemoval();
      refreshFloorAndGrid();
      return created;
    }

    function createCritterium8SequenceFromFrames(frameAssemblies, options = {}) {
      if (readOnly) return { success: false, reason: 'READ_ONLY' };
      const before = createCritterium8SequenceHistoryState(frameAssemblies);
      const prepared = prepareCritterium8Sequence({ frameAssemblies, options });
      if (!prepared.success) return prepared;
      registerCritterium8Sequence({
        sequenceRoot: prepared.sequenceRoot,
        parent: scene,
        partsRegistry: parts,
        pickables,
      });
      selectCritterium8Sequence(prepared.sequenceRoot);
      historyManager.pushAction({
        type: HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_CREATE,
        sequenceId: prepared.sequence.id,
        frameIds: [...prepared.sequence.frameIds],
        before,
        after: createCritterium8SequenceHistoryState(frameAssemblies, [
          { sequenceId: prepared.sequence.id, frameAssemblies, sequence: prepared.sequence },
        ]),
      });
      refreshFloorAndGrid();
      return prepared;
    }

    function createCritterium8SequenceFromSelection(options = {}) {
      const assemblies = Array.from(
        new Set(
          selectedIds3D.map((id) => getCritterium8FrameAssembly(findPartById(id))).filter(Boolean)
        )
      );
      return createCritterium8SequenceFromFrames(assemblies, options);
    }

    function rebuildCritterium8Sequence(sequenceRoot, options = {}) {
      if (readOnly || !isCritterium8SequenceRoot(sequenceRoot))
        return { success: false, reason: 'CRITTERIUM8_SEQUENCE_ROOT_REQUIRED' };
      const frames = sequenceRoot.children.filter(
        (child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY'
      );
      const before = createCritterium8SequenceHistoryState(frames, [
        {
          sequenceId: sequenceRoot.userData.sequenceId,
          frameAssemblies: frames,
          sequence: sequenceRoot.userData.sequence,
        },
      ]);
      sequenceRoot.userData.metadata = {
        ...(sequenceRoot.userData.metadata || {}),
        dirtyConnections: true,
        dirtyJunctions: true,
      };
      const prepared = prepareCritterium8SequenceRebuild(sequenceRoot, options);
      if (!prepared.success) return prepared;
      const parent = sequenceRoot.parent || scene;
      replaceCritterium8Sequence({
        previousRoot: sequenceRoot,
        nextRoot: prepared.sequenceRoot,
        parent,
        partsRegistry: parts,
        pickables,
      });
      selectCritterium8Sequence(prepared.sequenceRoot);
      if (options.recordHistory !== false)
        historyManager.pushAction({
          type: HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_REBUILD,
          sequenceId: prepared.sequence.id,
          before,
          after: createCritterium8SequenceHistoryState(frames, [
            {
              sequenceId: prepared.sequence.id,
              frameAssemblies: frames,
              sequence: prepared.sequence,
            },
          ]),
        });
      refreshFloorAndGrid();
      return prepared;
    }

    function rebuildSelectedCritterium8Sequence(options = {}) {
      return rebuildCritterium8Sequence(getSelectedCritterium8Sequence(), options);
    }

    function dissolveCritterium8Sequence(sequenceRoot, options = {}) {
      if (readOnly || !isCritterium8SequenceRoot(sequenceRoot))
        return { success: false, reason: 'CRITTERIUM8_SEQUENCE_ROOT_REQUIRED' };
      const sequenceId = sequenceRoot.userData.sequenceId;
      const frameIds = [...(sequenceRoot.userData.frameIds || [])];
      const frames = sequenceRoot.children.filter(
        (child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY'
      );
      const before = createCritterium8SequenceHistoryState(frames, [
        { sequenceId, frameAssemblies: frames, sequence: sequenceRoot.userData.sequence },
      ]);
      const result = unregisterCritterium8Sequence({
        sequenceRoot,
        partsRegistry: parts,
        pickables,
        preserveFrames: true,
        targetParent: sequenceRoot.parent || scene,
      });
      clearSelectionAfterRemoval();
      if (options.recordHistory !== false)
        historyManager.pushAction({
          type: HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_DISSOLVE,
          sequenceId,
          frameIds,
          before,
          after: createCritterium8SequenceHistoryState(frames),
        });
      refreshFloorAndGrid();
      return { success: result.removed, frames: result.frames, sequenceId };
    }

    function dissolveSelectedCritterium8Sequence(options = {}) {
      return dissolveCritterium8Sequence(getSelectedCritterium8Sequence(), options);
    }

    function addFrameToCritterium8Sequence(sequenceRoot, frameAssembly, options = {}) {
      if (readOnly || !isCritterium8SequenceRoot(sequenceRoot))
        return { success: false, reason: 'CRITTERIUM8_SEQUENCE_ROOT_REQUIRED' };
      const frame = getCritterium8FrameAssembly(frameAssembly) || frameAssembly;
      const validation = validateFrameAdditionToCritterium8Sequence(sequenceRoot, frame, options);
      if (!validation.success) return validation;
      const existingFrames = validation.frameAssemblies.filter((item) => item !== frame);
      const before = createCritterium8SequenceHistoryState(validation.frameAssemblies, [
        {
          sequenceId: sequenceRoot.userData.sequenceId,
          frameAssemblies: existingFrames,
          sequence: sequenceRoot.userData.sequence,
        },
      ]);
      const prepared = prepareCritterium8Sequence({
        frameAssemblies: validation.frameAssemblies,
        options: { ...options, sequenceId: sequenceRoot.userData.sequenceId },
        previousSequence: sequenceRoot.userData.sequence,
      });
      if (!prepared.success) return prepared;
      replaceCritterium8Sequence({
        previousRoot: sequenceRoot,
        nextRoot: prepared.sequenceRoot,
        parent: sequenceRoot.parent || scene,
        partsRegistry: parts,
        pickables,
      });
      selectCritterium8Sequence(prepared.sequenceRoot);
      historyManager.pushAction({
        type: HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_ADD_FRAME,
        sequenceId: prepared.sequence.id,
        frameId: frame.userData.frameId,
        before,
        after: createCritterium8SequenceHistoryState(validation.frameAssemblies, [
          {
            sequenceId: prepared.sequence.id,
            frameAssemblies: validation.frameAssemblies,
            sequence: prepared.sequence,
          },
        ]),
      });
      refreshFloorAndGrid();
      return prepared;
    }

    function addFrameToSelectedCritterium8Sequence(frameOrId, options = {}) {
      const frame = typeof frameOrId === 'string' ? findPartById(frameOrId) : frameOrId;
      return addFrameToCritterium8Sequence(getSelectedCritterium8Sequence(), frame, options);
    }

    function removeFrameFromCritterium8Sequence(sequenceRoot, frameId, options = {}) {
      if (readOnly || !isCritterium8SequenceRoot(sequenceRoot))
        return { success: false, reason: 'CRITTERIUM8_SEQUENCE_ROOT_REQUIRED' };
      const parent = sequenceRoot.parent || scene;
      const allFrames = sequenceRoot.children.filter(
        (child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY'
      );
      const removedFrame = allFrames.find(
        (frame) => String(frame.userData.frameId) === String(frameId)
      );
      if (!removedFrame) return { success: false, reason: 'FRAME_NOT_FOUND_IN_SEQUENCE' };
      const remaining = allFrames.filter((frame) => frame !== removedFrame);
      const partitions = partitionCritterium8Frames(remaining, options);
      const before = createCritterium8SequenceHistoryState(allFrames, [
        {
          sequenceId: sequenceRoot.userData.sequenceId,
          frameAssemblies: allFrames,
          sequence: sequenceRoot.userData.sequence,
        },
      ]);
      unregisterCritterium8Sequence({
        sequenceRoot,
        partsRegistry: parts,
        pickables,
        preserveFrames: true,
        targetParent: parent,
      });
      const created = [];
      for (const partition of partitions) {
        if (!partition.shouldCreateSequence) continue;
        const nextSequenceId =
          partitions.length === 1 ? sequenceRoot.userData.sequenceId : partition.sequence.id;
        const prepared = prepareCritterium8Sequence({
          frameAssemblies: partition.frameAssemblies,
          options: { ...options, sequenceId: nextSequenceId },
          previousSequence: sequenceRoot.userData.sequence,
        });
        if (!prepared.success) continue;
        registerCritterium8Sequence({
          sequenceRoot: prepared.sequenceRoot,
          parent,
          partsRegistry: parts,
          pickables,
        });
        created.push(prepared.sequenceRoot);
      }
      clearSelectionAfterRemoval();
      historyManager.pushAction({
        type: HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_REMOVE_FRAME,
        sequenceId: sequenceRoot.userData.sequenceId,
        frameId: removedFrame.userData.frameId,
        before,
        after: createCritterium8SequenceHistoryState(
          allFrames,
          created.map((root) => ({
            sequenceId: root.userData.sequenceId,
            frameAssemblies: root.children.filter(
              (child) => child.userData?.kind === 'CRITTERIUM_8_ASSEMBLY'
            ),
            sequence: root.userData.sequence,
          }))
        ),
      });
      refreshFloorAndGrid();
      return { success: true, removedFrame, sequenceRoots: created, split: created.length > 1 };
    }

    function removeFrameFromSelectedCritterium8Sequence(frameId, options = {}) {
      return removeFrameFromCritterium8Sequence(getSelectedCritterium8Sequence(), frameId, options);
    }

    const buildCritterium8SequenceFromSelectedFrames = createCritterium8SequenceFromSelection;

    async function rebuildCritterium8Assembly(assembly, patch = {}, options = {}) {
      if (readOnly || !isCritterium8AssemblyRoot(assembly)) {
        return { success: false, reason: 'CRITTERIUM8_ASSEMBLY_REQUIRED', diagnostics: [] };
      }
      const beforeConfig = JSON.parse(JSON.stringify(assembly.userData.config || {}));
      const preferredSlotId =
        options.preferredSlotId ?? activeEditablePart?.userData?.slotId ?? null;
      const parent = assembly.parent || scene;
      const previousIndex = parent.children.indexOf(assembly);
      const prepared = await rebuildCritterium8Instance({ assembly, patch });
      if (!prepared.success) return prepared;

      removePartObject(assembly, { emitBom: false, disposeResources: true });
      const { assembly: nextAssembly } = registerCritterium8Instance({
        instance: prepared.instance,
        parent,
        partsRegistry: parts,
        pickables,
      });
      const appendedIndex = parent.children.indexOf(nextAssembly);
      if (previousIndex >= 0 && appendedIndex >= 0 && previousIndex !== appendedIndex) {
        parent.children.splice(appendedIndex, 1);
        parent.children.splice(Math.min(previousIndex, parent.children.length), 0, nextAssembly);
      }
      nextAssembly.updateMatrixWorld(true);
      const nextEditablePart = preferredSlotId
        ? nextAssembly.children.find((child) => child.userData?.slotId === preferredSlotId) || null
        : null;
      syncSelectedIds3D([nextAssembly.userData.instanceId]);
      setActivePart(nextAssembly, {
        propertiesTarget: nextEditablePart,
        targetIds: [nextAssembly.userData.instanceId],
      });
      emitBOM();
      refreshFloorAndGrid();

      if (options.recordHistory !== false && !historyManager.isReplaying) {
        historyManager.pushAction({
          type: HISTORY_ACTION_TYPES.CRITTERIUM_8_CONFIG_CHANGE,
          instanceId: nextAssembly.userData.instanceId,
          before: beforeConfig,
          after: JSON.parse(JSON.stringify(nextAssembly.userData.config)),
        });
      }
      return { ...prepared, assembly: nextAssembly };
    }

    function getSelectedCritterium8Assembly() {
      return (
        getCritterium8AssemblyRoot(activePart) ||
        (isCritterium8AssemblyRoot(activePart) ? activePart : null)
      );
    }

    function updateSelectedCritterium8(patch = {}) {
      const assembly = getSelectedCritterium8Assembly();
      return rebuildCritterium8Assembly(assembly, patch);
    }

    function updateSelectedCritterium8Tile(slotId, patch = {}) {
      const assembly = getSelectedCritterium8Assembly();
      if (!assembly)
        return Promise.resolve({
          success: false,
          reason: 'CRITTERIUM8_ASSEMBLY_REQUIRED',
          diagnostics: [],
        });
      const resolved = patchCritterium8TileConfig({
        config: assembly.userData.config,
        frameId: assembly.userData.frameId,
        slotId,
        patch,
      });
      if (!resolved.success) return Promise.resolve(resolved);
      return rebuildCritterium8Assembly(
        assembly,
        { tiles: resolved.config.tiles },
        { preferredSlotId: slotId }
      );
    }

    function rebuildSelectedCritterium8() {
      return rebuildCritterium8Assembly(getSelectedCritterium8Assembly(), {});
    }

    async function addLink(config = {}) {
      if (readOnly) return;

      let result;
      try {
        result = await createLinkInstance({
          config,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[addLink] Error al crear la credenza Link:', error);
        return;
      }

      if (!result) {
        // Tipo no disponible — el builder ya emitió el warn
        return;
      }

      const { object, partRecord } = result;

      object.position.set(Math.max(0, parts.length * 1.6), 0, 0);
      object.updateMatrixWorld(true);

      scene.add(object);
      parts.push(partRecord);
      pickables.push(object);

      setActivePart(object);
      emitBOM();

      if (parts.length === 1) frameObject(object);
      refreshFloorAndGrid();
    }

    async function swapLinkVariant(instanceId, nextConfig = {}) {
      if (readOnly) return;

      const found = parts.find(({ obj }) => {
        return obj?.userData?.instanceId === instanceId || obj?.uuid === instanceId;
      });

      if (!found?.obj) {
        console.warn('[swapLinkVariant] No se encontró la pieza Link:', instanceId);
        return;
      }

      const oldObj = found.obj;
      // Preserve current position/rotation/scale
      const savedPos = oldObj.position.clone();
      const savedRot = oldObj.rotation.clone();
      const savedScale = oldObj.scale.clone();
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;

      // Extract existing config from userData and merge with nextConfig
      const currentConfig = {
        tipoKey: oldObj.userData?.tipoKey || '2_archivos',
        entrega: oldObj.userData?.entrega || 'DER',
        ancho: oldObj.userData?.ancho || 120,
        instanceId: oldObj.userData?.instanceId || instanceId,
        groupId: oldObj.userData?.groupId,
      };

      const targetConfig = { ...currentConfig, ...nextConfig };

      let result;
      try {
        result = await createLinkInstance({
          config: targetConfig,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[swapLinkVariant] Error al intercambiar credenza Link:', error);
        return;
      }

      if (!result) return; // Tipo no disponible

      const { object: newObj, partRecord } = result;

      // Sincronizar el estado del floating editor (PropertiesPopup)
      Object.assign(oldObj.userData, newObj.userData);

      // Restore position/rotation/scale
      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.scale.copy(savedScale);
      newObj.updateMatrixWorld(true);

      removePartObject(oldObj);

      if (parentGroup) {
        parentGroup.add(newObj);
      } else {
        scene.add(newObj);
      }

      parts.push(partRecord);
      pickables.push(newObj);

      setActivePart(newObj);
      emitBOM();
      refreshFloorAndGrid();
    }

    async function addKuoGo(config = {}) {
      if (readOnly) return;
      let result;
      try {
        result = await createKuoGoInstance({
          config,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[addKuoGo] Error al crear Kuo Go:', error);
        return;
      }
      if (!result) return;

      const { object, partRecord } = result;
      object.position.set(Math.max(0, parts.length * 1.6), 0, 0);
      object.updateMatrixWorld(true);
      scene.add(object);
      parts.push(partRecord);
      pickables.push(object);
      setActivePart(object);
      emitBOM();
      if (parts.length === 1) frameObject(object);
      refreshFloorAndGrid();
    }

    async function swapKuoGoVariant(instanceId, nextConfig = {}) {
      if (readOnly) return;
      console.log('[swapKuoGoVariant] START', { instanceId, nextConfig });
      const found = parts.find(
        ({ obj }) => obj?.userData?.instanceId === instanceId || obj?.uuid === instanceId
      );
      if (!found?.obj) {
        console.warn(
          '[swapKuoGoVariant] No se encontró el objeto KuoGo con instanceId:',
          instanceId
        );
        return;
      }
      const oldObj = found.obj;
      const savedPos = oldObj.position.clone();
      const savedRot = oldObj.rotation.clone();
      const savedScale = oldObj.scale.clone();
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;

      const currentConfig = {
        tipoKey: oldObj.userData?.tipoKey || 'Kume200000',
        espesor: oldObj.userData?.espesor || 'Espesor Formica 18',
        especial: oldObj.userData?.especial || false,
        instanceId: oldObj.userData?.instanceId || instanceId,
        groupId: oldObj.userData?.groupId,
      };
      const targetConfig = { ...currentConfig, ...nextConfig };

      let result;
      try {
        result = await createKuoGoInstance({
          config: targetConfig,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[swapKuoGoVariant] Error en createKuoGoInstance:', error);
        return;
      }
      if (!result) {
        console.warn('[swapKuoGoVariant] createKuoGoInstance devolvió null');
        return;
      }
      const { object: newObj, partRecord } = result;
      console.log('[swapKuoGoVariant] Nuevo objeto creado:', newObj.userData);

      // Sincronizar el estado del floating editor (PropertiesPopup)
      Object.assign(oldObj.userData, newObj.userData);

      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.scale.copy(savedScale);
      newObj.updateMatrixWorld(true);
      removePartObject(oldObj);
      if (parentGroup) parentGroup.add(newObj);
      else scene.add(newObj);
      parts.push(partRecord);
      pickables.push(newObj);
      setActivePart(newObj);
      emitBOM();
      refreshFloorAndGrid();
    }

    async function addKuoAV(config = {}) {
      if (readOnly) return;
      const countKuo = parts.filter(({ obj }) => obj?.userData?.kind === 'KUO_AV_ASSEMBLY').length;
      let result;
      try {
        result = await createKuoAVInstance({
          config,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[addKuoAV] Error al crear Kuo AV:', error);
        return;
      }
      if (!result) return;

      const { object, partRecord } = result;
      object.position.set(countKuo * 1.6, 0, 0);
      object.updateMatrixWorld(true);
      scene.add(object);
      parts.push(partRecord);
      pickables.push(object);
      setActivePart(object);
      emitBOM();
      if (parts.length === 1) frameObject(object);
      refreshFloorAndGrid();
    }

    async function swapKuoAVVariant(instanceId, nextConfig = {}) {
      if (readOnly) return;
      console.log('[KUO PARAM DEBUG] swapKuoAVVariant START', { instanceId, nextConfig });
      const found = parts.find(
        ({ obj }) =>
          obj?.userData?.instanceId === instanceId ||
          obj?.userData?.parentAssemblyId === instanceId ||
          obj?.userData?.groupId === instanceId ||
          obj?.uuid === instanceId
      );
      if (!found?.obj) {
        console.warn(
          '[swapKuoAVVariant] No se encontró el objeto Kuo AV con instanceId:',
          instanceId
        );
        return;
      }
      const oldObj = getRootPartObject(found.obj) || found.obj;
      const savedPos = oldObj.position.clone();
      const savedRot = oldObj.rotation.clone();
      const savedScale = oldObj.scale.clone();
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;

      const currentConfig = {
        ...(oldObj.userData?.config || {}),
        instanceId: oldObj.userData?.instanceId || instanceId,
        groupId: oldObj.userData?.groupId,
      };
      const targetConfig = { ...currentConfig, ...nextConfig };

      console.log('[KUO PARAM DEBUG] Antes:', {
        width: currentConfig.anchoMm,
        depth: currentConfig.profundidadMm,
        height: currentConfig.alturaMm,
        thickness: currentConfig.thickMm,
      });
      console.log('[KUO PARAM DEBUG] Después del cambio:', {
        width: targetConfig.anchoMm,
        depth: targetConfig.profundidadMm,
        height: targetConfig.alturaMm,
        thickness: targetConfig.thickMm,
      });

      let result;
      try {
        result = await createKuoAVInstance({
          config: targetConfig,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[swapKuoAVVariant] Error en createKuoAVInstance:', error);
        return;
      }
      if (!result) {
        console.warn('[swapKuoAVVariant] createKuoAVInstance devolvió null');
        return;
      }
      const { object: newObj, partRecord, built } = result;

      console.log('[KUO PARAM DEBUG] buildKuoAV recibe:', {
        width: built?.config?.anchoMm,
        depth: built?.config?.profundidadMm,
        height: built?.config?.alturaMm,
        thickness: built?.config?.thickMm,
      });
      console.log('[KUO PARAM DEBUG] Resultado parts:', built?.parts?.length);

      // Sincronizar estado en userData
      Object.assign(oldObj.userData, newObj.userData);

      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.scale.copy(savedScale);
      newObj.updateMatrixWorld(true);
      removePartObject(oldObj);
      if (parentGroup) parentGroup.add(newObj);
      else scene.add(newObj);
      parts.push(partRecord);
      pickables.push(newObj);
      setActivePart(newObj);
      emitBOM();
      refreshFloorAndGrid();

      // Sincronizar PropertiesPopup
      onFloatingEditorRequest?.({
        open: true,
        x: 120,
        y: 120,
        part: {
          code: newObj.userData?.codigoPT || newObj.userData?.code || null,
          kind: newObj.userData?.kind || 'KUO_AV_ASSEMBLY',
          meta: newObj.userData?.meta || null,
          groupId: newObj.userData?.groupId || null,
          groupName: newObj.userData?.groupName || null,
          logicalCode: newObj.userData?.logicalCode || null,
          instanceId: newObj.userData?.instanceId || instanceId,
          description: newObj.userData?.description || null,
          config: newObj.userData?.config || targetConfig,
          userData: newObj.userData || null,
          parentAssemblyId: newObj.userData?.parentAssemblyId || null,
        },
      });

      const selectedBeam = built?.parts?.find((p) => p.type === 'viga')?.model?.src || 'N/A';
      const selectedDuct = built?.parts?.find((p) => p.type === 'ducto')?.model?.src || 'N/A';

      console.log(
        `[KUO PARAM]\nwidth: ${targetConfig.anchoMm}\nselected beam: ${selectedBeam}\nselected duct: ${selectedDuct}\nassembly rebuilt: true`
      );
    }

    async function addKuoAVDoble(config = {}) {
      if (readOnly) return;
      const countKuoDoble = parts.filter(
        ({ obj }) => obj?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY'
      ).length;
      let result;
      try {
        result = await createKuoAVDobleInstance({
          config,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[addKuoAVDoble] Error al crear Puesto Doble Kuo AV:', error);
        return;
      }
      if (!result) return;

      const { object, partRecord } = result;
      if (config.position) {
        if (Array.isArray(config.position)) {
          object.position.fromArray(config.position);
        } else {
          object.position.copy(config.position);
        }
      } else {
        object.position.set(countKuoDoble * 1.6, 0, 0);
      }
      object.updateMatrixWorld(true);
      scene.add(object);
      parts.push(partRecord);
      pickables.push(object);

      object.children.forEach((child) => {
        if (child.userData?.isPartRoot) {
          parts.push({
            id: child.userData.instanceId,
            code: child.userData.codigoPT || child.userData.code,
            obj: child,
            kind: child.userData.kind,
            type: child.userData.type,
            name: child.userData.name,
          });
          pickables.push(child);
        }
      });

      setActivePart(object);
      emitBOM();
      if (parts.length === 1) frameObject(object);
      refreshFloorAndGrid();
    }

    async function swapKuoAVDobleVariant(instanceId, nextConfig = {}) {
      if (readOnly) return;
      console.log('[KUO DOUBLE PARAM] swapKuoAVDobleVariant START', { instanceId, nextConfig });
      const found = parts.find(
        ({ obj }) =>
          obj?.userData?.instanceId === instanceId ||
          obj?.userData?.parentAssemblyId === instanceId ||
          obj?.userData?.groupId === instanceId ||
          obj?.uuid === instanceId
      );
      if (!found?.obj) {
        console.warn(
          '[swapKuoAVDobleVariant] No se encontró el objeto con instanceId:',
          instanceId
        );
        return;
      }
      const oldObj = getRootPartObject(found.obj) || found.obj;
      const savedPos = oldObj.position.clone();
      const savedRot = oldObj.rotation.clone();
      const savedScale = oldObj.scale.clone();
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;

      const currentConfig = oldObj.userData?.config || {};
      const targetConfig = {
        ...currentConfig,
        ...nextConfig,
        instanceId,
        groupId: oldObj.userData?.groupId || instanceId,
      };

      let result;
      try {
        result = await createKuoAVDobleInstance({
          config: targetConfig,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[swapKuoAVDobleVariant] Error en createKuoAVDobleInstance:', error);
        return;
      }
      if (!result) {
        console.warn('[swapKuoAVDobleVariant] createKuoAVDobleInstance devolvió null');
        return;
      }
      const { object: newObj, partRecord } = result;

      // Limpiar hijos anteriores de parts y pickables
      const oldChildIds = new Set(
        oldObj.children?.map((c) => c.userData?.instanceId).filter(Boolean) || []
      );
      for (let i = parts.length - 1; i >= 0; i--) {
        if (oldChildIds.has(parts[i].obj?.userData?.instanceId)) {
          parts.splice(i, 1);
        }
      }
      for (let i = pickables.length - 1; i >= 0; i--) {
        if (oldChildIds.has(pickables[i].userData?.instanceId)) {
          pickables.splice(i, 1);
        }
      }

      Object.assign(oldObj.userData, newObj.userData);
      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.scale.copy(savedScale);
      newObj.updateMatrixWorld(true);
      removePartObject(oldObj);
      if (parentGroup) parentGroup.add(newObj);
      else scene.add(newObj);
      parts.push(partRecord);
      pickables.push(newObj);

      newObj.children.forEach((child) => {
        if (child.userData?.isPartRoot) {
          parts.push({
            id: child.userData.instanceId,
            code: child.userData.codigoPT || child.userData.code,
            obj: child,
            kind: child.userData.kind,
            type: child.userData.type,
            name: child.userData.name,
          });
          pickables.push(child);
        }
      });
      setActivePart(newObj);
      emitBOM();
      refreshFloorAndGrid();

      onFloatingEditorRequest?.({
        open: true,
        x: 120,
        y: 120,
        part: {
          code: newObj.userData?.codigoPT || newObj.userData?.code || null,
          kind: newObj.userData?.kind || 'KUO_AV_DOBLE_ASSEMBLY',
          meta: newObj.userData?.meta || null,
          groupId: newObj.userData?.groupId || null,
          groupName: newObj.userData?.groupName || null,
          logicalCode: newObj.userData?.logicalCode || null,
          instanceId: newObj.userData?.instanceId || instanceId,
          description: newObj.userData?.description || null,
          config: newObj.userData?.config || targetConfig,
          userData: newObj.userData || null,
          parentAssemblyId: newObj.userData?.parentAssemblyId || null,
        },
      });
    }

    async function addKuoAVPantalla(config = {}) {
      if (readOnly) return;
      const countPan = parts.filter(
        ({ obj }) => obj?.userData?.kind === 'KUO_AV_PANTALLA_ASSEMBLY'
      ).length;
      let result;
      try {
        result = await createKuoAVPantallaInstance({
          config,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[addKuoAVPantalla] Error al crear Pantalla Kuo AV:', error);
        return;
      }
      if (!result) return;

      const { object, partRecord } = result;
      if (config.position) {
        if (Array.isArray(config.position)) {
          object.position.fromArray(config.position);
        } else {
          object.position.copy(config.position);
        }
      } else {
        // Posicionar a un lado libre elevado a la altura de mesa para no superponerse
        let spawnX = 0;
        let spawnZ = 0;
        const physicalObjects = parts.map(({ obj }) => obj).filter(Boolean);
        if (physicalObjects.length > 0) {
          const sceneBox = new THREE.Box3();
          physicalObjects.forEach((obj) => {
            sceneBox.expandByObject(obj);
          });
          if (Number.isFinite(sceneBox.max.x)) {
            spawnX = sceneBox.max.x + 1.0;
          }
        }
        const defaultY = config.tipo === 'FRONTAL_PERIMETRAL' ? 0.632 : 0.462;
        object.position.set(spawnX, defaultY, spawnZ);
      }
      object.updateMatrixWorld(true);
      scene.add(object);
      parts.push(partRecord);
      pickables.push(object);

      setActivePart(object);
      emitBOM();
      if (parts.length === 1) frameObject(object);
      refreshFloorAndGrid();
    }

    async function swapKuoAVPantallaVariant(instanceId, nextConfig = {}) {
      if (readOnly) return;
      const found = parts.find(
        ({ obj }) => obj?.userData?.instanceId === instanceId || obj?.uuid === instanceId
      );
      if (!found?.obj) return;
      const oldObj = getRootPartObject(found.obj) || found.obj;
      const savedPos = oldObj.position.clone();
      const savedRot = oldObj.rotation.clone();
      const savedScale = oldObj.scale.clone();
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;

      const currentConfig = oldObj.userData?.config || {};
      const targetConfig = {
        ...currentConfig,
        ...nextConfig,
        instanceId,
      };

      let result;
      try {
        result = await createKuoAVPantallaInstance({
          config: targetConfig,
          loadGlb: loadExistingGlb,
          country: countryRef.current,
        });
      } catch (error) {
        console.error('[swapKuoAVPantallaVariant] Error:', error);
        return;
      }
      if (!result) return;

      const { object: newObj, partRecord } = result;
      Object.assign(oldObj.userData, newObj.userData);
      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.scale.copy(savedScale);
      newObj.updateMatrixWorld(true);
      removePartObject(oldObj);
      if (parentGroup) parentGroup.add(newObj);
      else scene.add(newObj);
      parts.push(partRecord);
      pickables.push(newObj);
      setActivePart(newObj);
      emitBOM();
      refreshFloorAndGrid();
    }

    async function swapMepalSaludVariant(instanceId, codigo, targetVariant = 'desplegado') {
      if (readOnly) return;

      const codigoBase = normalizeSaludVariantCode(codigo);
      const normalizedVariant = String(targetVariant || '')
        .trim()
        .toLowerCase();
      const variantOptions = getSaludVariantOptionsByCode(codigoBase) || [];
      const targetDefinition = variantOptions.find(
        (option) => option.variant === normalizedVariant
      );
      if (!targetDefinition) {
        console.warn('[swapMepalSaludVariant] Variante no permitida para:', codigoBase);
        return;
      }

      // 1) Encontrar el objeto por instanceId o uuid
      const found = parts.find(({ obj }) => {
        return obj?.userData?.instanceId === instanceId || obj?.uuid === instanceId;
      });

      if (!found?.obj) {
        console.warn('[swapMepalSaludVariant] No se encontró la pieza:', instanceId);
        return;
      }

      const oldObj = found.obj;
      const savedPos = oldObj.position.clone();
      const savedQuaternion = oldObj.quaternion.clone();
      const savedScale = oldObj.scale.clone();
      const savedParent = oldObj.parent || scene;
      const savedUserData = { ...oldObj.userData };
      const oldIds = new Set(
        [instanceId, oldObj.userData?.instanceId, oldObj.uuid].filter(Boolean).map(String)
      );

      let result;
      try {
        result = await createSaludInstance({
          codigoPT: codigoBase,
          country: countryRef.current,
          variant: normalizedVariant,
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(
          `[swapMepalSaludVariant] No se pudo crear la variante ${normalizedVariant}:`,
          error
        );
        return;
      }

      const { object: newObj, partRecord } = result;
      newObj.userData = {
        ...savedUserData,
        ...newObj.userData,
      };
      newObj.position.copy(savedPos);
      newObj.quaternion.copy(savedQuaternion);
      newObj.scale.copy(savedScale);

      removePartObject(oldObj);
      savedParent.add(newObj);
      newObj.updateMatrixWorld(true);
      parts.push(partRecord);
      pickables.push(newObj);

      const newId = newObj.userData?.instanceId || newObj.uuid;
      const nextSelectedIds = selectedIds3D
        .map((id) => (oldIds.has(String(id)) ? newId : id))
        .filter(Boolean);
      if (!nextSelectedIds.includes(newId)) nextSelectedIds.push(newId);
      syncSelectedIds3D(Array.from(new Set(nextSelectedIds)));
      setActivePart(newObj, { targetIds: nextSelectedIds });
      emitBOM();
      refreshFloorAndGrid();
    }

    async function swapMilaSeatVariant(instanceId, _codigo, targetMode = 'chair') {
      if (readOnly) return;

      const found = parts.find(({ obj }) => {
        return obj?.userData?.instanceId === instanceId || obj?.uuid === instanceId;
      });

      if (!found?.obj) {
        console.warn('[swapMilaSeatVariant] No se encontró la pieza:', instanceId);
        return;
      }

      const oldObj = found.obj;
      const userData = oldObj.userData || {};
      const meta = userData.meta || {};
      const isMilaSimpleSeat =
        userData.kind === 'GLB_PART' &&
        userData.line === 'MILA' &&
        String(meta.role || '').toLowerCase() === 'seat';

      if (!isMilaSimpleSeat) {
        console.warn(
          '[swapMilaSeatVariant] La pieza no es un puesto editable de Mila simple:',
          instanceId
        );
        return;
      }

      const nextVariant = resolveMilaSeatVariantByMode(targetMode);
      const currentMode = meta.seatMode || resolveMilaSeatModeByCode(userData.code);
      const nextMode = normalizeMilaSeatMode(targetMode);

      if (currentMode === nextMode) return;

      let gltf = null;
      try {
        const loader = new GLTFLoader();
        gltf = await loader.loadAsync(nextVariant.modelSrc);
      } catch (loadErr) {
        console.error(
          '[swapMilaSeatVariant] Error cargando GLB destino:',
          nextVariant.modelSrc,
          loadErr
        );
        return;
      }

      if (!gltf?.scene) {
        console.error(
          '[swapMilaSeatVariant] No se pudo parsear el GLB destino:',
          nextVariant.modelSrc
        );
        return;
      }

      const newObj = gltf.scene.clone(true);
      const savedPos = oldObj.position.clone();
      const savedQuaternion = oldObj.quaternion.clone();
      const savedScale = oldObj.scale.clone();
      const savedParent = oldObj.parent || scene;
      const savedParentIndex = savedParent.children.indexOf(oldObj);
      const savedUserData = { ...userData };
      const oldIds = new Set(
        [instanceId, oldObj.userData?.instanceId, oldObj.uuid].filter(Boolean).map(String)
      );

      const currentOffset = resolveMilaSeatOffsetMmByMode(currentMode);
      const nextOffset = resolveMilaSeatOffsetMmByMode(nextMode);
      const offsetDeltaMm = {
        x: Number(nextOffset?.x || 0) - Number(currentOffset?.x || 0),
        y: Number(nextOffset?.y || 0) - Number(currentOffset?.y || 0),
        z: Number(nextOffset?.z || 0) - Number(currentOffset?.z || 0),
      };

      const catalogItem = catalogByCodeRef.current?.get?.(nextVariant.code) || null;
      const nextDescription =
        catalogItem?.ui?.title ||
        catalogItem?.ui?.subtitle ||
        catalogItem?.raw?.descripcion ||
        catalogItem?.raw?.description ||
        `${savedUserData.groupName || 'Mila'} ${nextVariant.label}`;
      const nextUnitPrice =
        Number(
          catalogItem?.prices?.[countryRef.current] ??
            catalogItem?.prices?.CO ??
            catalogItem?.prices?.co ??
            catalogItem?.raw?.prices?.[countryRef.current] ??
            catalogItem?.raw?.prices?.CO ??
            catalogItem?.raw?.price ??
            0
        ) || 0;
      const nextPrices = catalogItem?.prices ||
        catalogItem?.raw?.prices || {
          CO: nextUnitPrice,
        };

      newObj.userData = {
        ...savedUserData,
        code: nextVariant.code,
        codigoPT: nextVariant.code,
        description: nextDescription,
        unitPrice: nextUnitPrice,
        prices: nextPrices,
        modelSrc: nextVariant.modelSrc,
        model: { src: nextVariant.modelSrc },
        meta: {
          ...(savedUserData.meta || {}),
          role: 'seat',
          seatMode: nextMode,
        },
      };

      newObj.name = nextVariant.code;

      newObj.traverse((node) => {
        if (!node) return;
        node.userData = {
          ...(node.userData || {}),
          parentAssemblyId: savedUserData.parentAssemblyId || null,
          groupId: savedUserData.groupId || null,
          groupName: savedUserData.groupName || null,
        };

        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            node.material.depthTest = true;
            node.material.depthWrite = true;
            node.material.transparent = false;
            node.material.needsUpdate = true;
          }
        }
      });

      // Quitar de su padre el puesto anterior SIN borrar el ensamble raíz
      try {
        if (oldObj.parent) {
          oldObj.parent.remove(oldObj);
        } else {
          scene.remove(oldObj);
        }
      } catch (err) {
        void err;
      }
      removePartsRecordsUnder(oldObj);
      removePickablesUnder(oldObj);

      savedParent.add(newObj);

      if (savedParentIndex >= 0) {
        const appendedIndex = savedParent.children.indexOf(newObj);
        if (appendedIndex >= 0 && appendedIndex !== savedParentIndex) {
          savedParent.children.splice(appendedIndex, 1);
          savedParent.children.splice(savedParentIndex, 0, newObj);
        }
      }

      newObj.position.copy(savedPos);
      newObj.quaternion.copy(savedQuaternion);
      newObj.scale.copy(savedScale);
      newObj.position.x += offsetDeltaMm.x * MM_TO_M;
      newObj.position.y += offsetDeltaMm.y * MM_TO_M;
      newObj.position.z += offsetDeltaMm.z * MM_TO_M;
      newObj.visible = true;
      newObj.updateMatrixWorld(true);

      parts.push({ code: nextVariant.code, obj: newObj });
      pickables.push(newObj);

      const newId = newObj.userData?.instanceId || newObj.uuid;
      const nextSelectedIds = selectedIds3D
        .map((id) => (oldIds.has(String(id)) ? newId : id))
        .filter(Boolean);
      if (!nextSelectedIds.includes(newId)) nextSelectedIds.push(newId);

      syncSelectedIds3D(Array.from(new Set(nextSelectedIds)));
      const assemblyRoot = getAssemblyObject(newObj) || newObj;
      assemblyRoot.updateMatrixWorld(true);
      setActivePart(assemblyRoot, { targetIds: nextSelectedIds });
      updateMilaConnectors();
      emitBOM();
      refreshFloorAndGrid();
    }

    async function swapMilaGiroGrommet(instanceId, useGrommet = false) {
      if (readOnly) return;

      const found = parts.find(({ obj }) => {
        return (
          obj?.userData?.instanceId === instanceId ||
          obj?.userData?.meta?.instanceId === instanceId ||
          obj?.uuid === instanceId
        );
      });

      if (!found?.obj) {
        console.warn('[swapMilaGiroGrommet] No se encontró la superficie de giro:', instanceId);
        return;
      }

      const oldObj = found.obj;
      const userData = oldObj.userData || {};
      const meta = userData.meta || {};
      const angleDeg = Number(meta.angleDeg || userData.angleDeg || 60);
      const def = MILA_GIRO_DEFINITIONS[angleDeg] || MILA_GIRO_DEFINITIONS[60];

      const nextModelSrc = useGrommet ? def.grommetModelSrc : def.modelSrc;
      const nextCode = useGrommet ? def.grommetCode : def.code;
      const currentUseGrommet = Boolean(userData.useGrommet ?? meta.useGrommet);
      if (currentUseGrommet === Boolean(useGrommet)) return;

      let gltf = null;
      try {
        const loader = new GLTFLoader();
        gltf = await loader.loadAsync(nextModelSrc);
      } catch (loadErr) {
        console.error('[swapMilaGiroGrommet] Error cargando GLB:', nextModelSrc, loadErr);
        return;
      }

      if (!gltf?.scene) {
        console.error('[swapMilaGiroGrommet] No se pudo parsear el GLB:', nextModelSrc);
        return;
      }

      const newObj = gltf.scene.clone(true);
      const savedPos = oldObj.position.clone();
      const savedQuaternion = oldObj.quaternion.clone();
      const savedScale = oldObj.scale.clone();
      const savedParent = oldObj.parent || scene;
      const savedParentIndex = savedParent.children.indexOf(oldObj);
      const savedUserData = { ...userData };
      const oldIds = new Set(
        [instanceId, oldObj.userData?.instanceId, oldObj.uuid].filter(Boolean).map(String)
      );

      const catalogItem = catalogByCodeRef.current?.get?.(def.code) || null;
      const nextDescription = def.description;
      const nextPrices = def.prices || catalogItem?.prices || savedUserData.prices || undefined;

      const nextUnitPrice =
        Number(
          nextPrices?.[countryRef.current] ??
            catalogItem?.prices?.[countryRef.current] ??
            catalogItem?.prices?.CO ??
            catalogItem?.prices?.co ??
            0
        ) || 0;

      newObj.position.copy(savedPos);
      newObj.quaternion.copy(savedQuaternion);
      newObj.scale.copy(savedScale);

      newObj.userData = {
        ...savedUserData,
        code: def.code,
        codigoPT: def.code,
        name: `${def.label} Mila`,
        description: nextDescription,
        prices: nextPrices,
        unitPrice: nextUnitPrice,
        modelSrc: nextModelSrc,
        model: { src: nextModelSrc },
        useGrommet: Boolean(useGrommet),
        angleDeg: def.angleDeg,
        meta: {
          ...(savedUserData.meta || {}),
          role: 'giro-surface',
          angleDeg: def.angleDeg,
          useGrommet: Boolean(useGrommet),
          portA: def.portA,
          portB: def.portB,
          isPartRoot: true,
          instanceId: savedUserData.meta?.instanceId || instanceId,
        },
      };

      newObj.name = nextCode;

      newObj.traverse((node) => {
        if (!node) return;
        node.userData = {
          ...(node.userData || {}),
          parentAssemblyId: savedUserData.parentAssemblyId || null,
          groupId: savedUserData.groupId || null,
          groupName: savedUserData.groupName || null,
        };

        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            node.material.depthTest = true;
            node.material.depthWrite = true;
            node.material.transparent = false;
            node.material.needsUpdate = true;
          }
        }
      });

      try {
        if (oldObj.parent) {
          oldObj.parent.remove(oldObj);
        } else {
          scene.remove(oldObj);
        }
      } catch (err) {
        void err;
      }
      removePartsRecordsUnder(oldObj);
      removePickablesUnder(oldObj);

      savedParent.add(newObj);

      if (savedParentIndex >= 0) {
        const appendedIndex = savedParent.children.indexOf(newObj);
        if (appendedIndex >= 0 && appendedIndex !== savedParentIndex) {
          savedParent.children.splice(appendedIndex, 1);
          savedParent.children.splice(savedParentIndex, 0, newObj);
        }
      }

      newObj.visible = true;
      newObj.updateMatrixWorld(true);

      parts.push({ code: nextCode, obj: newObj });
      pickables.push(newObj);

      const newId = newObj.userData?.instanceId || newObj.uuid;
      const nextSelectedIds = selectedIds3D
        .map((id) => (oldIds.has(String(id)) ? newId : id))
        .filter(Boolean);
      if (!nextSelectedIds.includes(newId)) nextSelectedIds.push(newId);

      syncSelectedIds3D(Array.from(new Set(nextSelectedIds)));
      setActivePart(newObj, { targetIds: nextSelectedIds });
      updateMilaConnectors();
      emitBOM();
      refreshFloorAndGrid();
    }

    async function toggleMilaAccessory(targetIdentifier, accessoryType, enabled = true) {
      if (readOnly) return;

      let targetObj = null;
      for (const p of parts) {
        const o = p.obj;
        if (
          o?.userData?.instanceId === targetIdentifier ||
          o?.userData?.groupId === targetIdentifier ||
          o?.userData?.parentAssemblyId === targetIdentifier ||
          o?.uuid === targetIdentifier
        ) {
          targetObj = o;
          break;
        }
      }

      if (!targetObj) {
        scene.traverse((node) => {
          if (
            !targetObj &&
            (node.userData?.instanceId === targetIdentifier ||
              node.userData?.groupId === targetIdentifier ||
              node.userData?.parentAssemblyId === targetIdentifier ||
              node.uuid === targetIdentifier)
          ) {
            targetObj = node;
          }
        });
      }

      if (!targetObj) {
        console.warn(
          '[toggleMilaAccessory] No se encontró el objeto o ensamble Mila:',
          targetIdentifier
        );
        return;
      }

      let assemblyGroup = targetObj;
      while (
        assemblyGroup.parent &&
        assemblyGroup.parent !== scene &&
        (assemblyGroup.parent.userData?.kind === 'MILA_ASSEMBLY' ||
          assemblyGroup.parent.userData?.groupId === targetObj.userData?.groupId)
      ) {
        assemblyGroup = assemblyGroup.parent;
      }

      const groupId =
        assemblyGroup.userData?.groupId || targetObj.userData?.groupId || assemblyGroup.uuid;
      const groupName = assemblyGroup.userData?.groupName || 'Mila';
      const isMilaDouble =
        assemblyGroup.userData?.line === 'MILA_DOUBLE' ||
        assemblyGroup.userData?.meta?.category === 'mila-double';

      const seatNodes = [];
      assemblyGroup.traverse((node) => {
        if (
          node.userData?.kind === 'GLB_PART' &&
          String(node.userData?.meta?.role || '').toLowerCase() === 'seat'
        ) {
          seatNodes.push(node);
        }
      });
      seatNodes.sort((a, b) => a.position.x - b.position.x);
      const quantity = Math.max(1, seatNodes.length);
      const moduleSpacingMm = seatNodes[0]?.userData?.meta?.moduleSpacingMm || 600;

      const removePartsByRole = (role) => {
        const toRemove = [];
        assemblyGroup.traverse((node) => {
          if (
            node !== assemblyGroup &&
            (String(node.userData?.meta?.role || '').toLowerCase() === role.toLowerCase() ||
              String(node.userData?.role || '').toLowerCase() === role.toLowerCase())
          ) {
            toRemove.push(node);
          }
        });

        toRemove.forEach((node) => {
          try {
            if (node.parent) node.parent.remove(node);
            else scene.remove(node);
          } catch (err) {
            void err;
          }
          removePartsRecordsUnder(node);
          removePickablesUnder(node);
        });
      };

      if (accessoryType === 'armrest-left') {
        removePartsByRole('armrest-left');
        if (enabled) {
          const item = MILA_ACCESSORY_CATALOG.armrestLeft;
          const offset = MILA_ACCESSORY_OFFSETS_MM.armrestLeft;
          await addExternalGlbPart({
            kind: 'GLB_PART',
            type: 'GLB_PART',
            line: isMilaDouble ? 'MILA_DOUBLE' : 'MILA',
            groupId,
            groupName,
            code: item.code,
            codigoPT: item.code,
            name: `${groupName} ${item.label}`,
            description: item.description,
            prices: item.prices,
            model: { src: item.modelSrc },
            position: {
              x: Number(offset.x || 0),
              y: Number(offset.y || 0),
              z: Number(offset.z || 0),
            },
            rotation: { x: 0, y: 0, z: 0 },
            parentGroup: assemblyGroup,
            meta: {
              category: isMilaDouble ? 'mila-double' : 'mila',
              role: 'armrest-left',
              moduleSpacingMm,
            },
          });
        }
      } else if (accessoryType === 'armrest-right') {
        removePartsByRole('armrest-right');
        if (enabled) {
          const item = MILA_ACCESSORY_CATALOG.armrestRight;
          const offset = MILA_ACCESSORY_OFFSETS_MM.armrestRight;
          const rightAnchorX = (quantity - 1) * moduleSpacingMm;
          await addExternalGlbPart({
            kind: 'GLB_PART',
            type: 'GLB_PART',
            line: isMilaDouble ? 'MILA_DOUBLE' : 'MILA',
            groupId,
            groupName,
            code: item.code,
            codigoPT: item.code,
            name: `${groupName} ${item.label}`,
            description: item.description,
            prices: item.prices,
            model: { src: item.modelSrc },
            position: {
              x: rightAnchorX + 600 + Number(offset.x || 0),
              y: Number(offset.y || 0),
              z: Number(offset.z || 0),
            },
            rotation: { x: 0, y: 0, z: 0 },
            parentGroup: assemblyGroup,
            meta: {
              category: isMilaDouble ? 'mila-double' : 'mila',
              role: 'armrest-right',
              quantity,
              moduleSpacingMm,
            },
          });
        }
      } else if (accessoryType === 'armrest-center') {
        removePartsByRole('armrest-center');
        if (enabled && quantity > 1) {
          const item = MILA_ACCESSORY_CATALOG.armrestCenter;
          const offset = MILA_ACCESSORY_OFFSETS_MM.armrestCenter;
          for (let seamIndex = 1; seamIndex < quantity; seamIndex += 1) {
            const seamX = seamIndex * moduleSpacingMm;
            await addExternalGlbPart({
              kind: 'GLB_PART',
              type: 'GLB_PART',
              line: isMilaDouble ? 'MILA_DOUBLE' : 'MILA',
              groupId,
              groupName,
              code: item.code,
              codigoPT: item.code,
              name: `${groupName} ${item.label} ${seamIndex}`,
              description: item.description,
              prices: item.prices,
              model: { src: item.modelSrc },
              position: {
                x: seamX + Number(offset.x || 0),
                y: Number(offset.y || 0),
                z: Number(offset.z || 0),
              },
              rotation: { x: 0, y: 0, z: 0 },
              parentGroup: assemblyGroup,
              meta: {
                category: isMilaDouble ? 'mila-double' : 'mila',
                role: 'armrest-center',
                seamIndex,
                moduleSpacingMm,
              },
            });
          }
        }
      } else if (accessoryType === 'screen') {
        removePartsByRole('screen');
        if (enabled) {
          const item = resolveMilaScreenCatalogItem(quantity);
          const offset = MILA_ACCESSORY_OFFSETS_MM.screen;
          await addExternalGlbPart({
            kind: 'GLB_PART',
            type: 'GLB_PART',
            line: isMilaDouble ? 'MILA_DOUBLE' : 'MILA',
            groupId,
            groupName,
            code: item.code,
            codigoPT: item.code,
            name: `${groupName} ${item.label}`,
            description: item.description,
            prices: item.prices,
            model: { src: item.modelSrc },
            position: {
              x: Number(offset.x || 0),
              y: Number(offset.y || 0),
              z: Number(offset.z || 0),
            },
            rotation: { x: 0, y: 0, z: 0 },
            parentGroup: assemblyGroup,
            meta: {
              category: isMilaDouble ? 'mila-double' : 'mila',
              role: 'screen',
              quantity,
              moduleSpacingMm,
            },
          });
        }
      }

      emitBOM();
      refreshFloorAndGrid();
    }

    async function swapMilaAccessoryVariant(instanceId, targetKey) {
      if (readOnly) return;

      const found = parts.find(
        ({ obj }) =>
          obj?.userData?.instanceId === instanceId ||
          obj?.userData?.meta?.instanceId === instanceId ||
          obj?.uuid === instanceId
      );

      if (!found?.obj) {
        console.warn('[swapMilaAccessoryVariant] No se encontró el accesorio:', instanceId);
        return;
      }

      const oldObj = getRootPartObject(found.obj) || found.obj;
      const savedPos = oldObj.position.clone();
      const savedQuaternion = oldObj.quaternion.clone();
      const savedScale = oldObj.scale.clone();
      const savedUserData = { ...oldObj.userData };
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;

      let catalogItem = null;
      let role = null;

      if (targetKey === 'armrestLeft') {
        catalogItem = MILA_ACCESSORY_CATALOG.armrestLeft;
        role = 'armrest-left';
      } else if (targetKey === 'armrestRight') {
        catalogItem = MILA_ACCESSORY_CATALOG.armrestRight;
        role = 'armrest-right';
      } else if (targetKey === 'armrestCenter') {
        catalogItem = MILA_ACCESSORY_CATALOG.armrestCenter;
        role = 'armrest-center';
      } else if (targetKey === 'screen1' || targetKey === 'screen-1' || targetKey === 1) {
        catalogItem = MILA_ACCESSORY_CATALOG.screen1P;
        role = 'screen';
      } else if (targetKey === 'screen2' || targetKey === 'screen-2' || targetKey === 2) {
        catalogItem = MILA_ACCESSORY_CATALOG.screen2P;
        role = 'screen';
      } else if (targetKey === 'screen3' || targetKey === 'screen-3' || targetKey === 3) {
        catalogItem = MILA_ACCESSORY_CATALOG.screen3P;
        role = 'screen';
      } else if (targetKey === 'screen4' || targetKey === 'screen-4' || targetKey === 4) {
        catalogItem = MILA_ACCESSORY_CATALOG.screen4P;
        role = 'screen';
      }

      if (!catalogItem) {
        console.warn('[swapMilaAccessoryVariant] Variante no encontrada:', targetKey);
        return;
      }

      let gltf = null;
      try {
        const loader = new GLTFLoader();
        gltf = await loader.loadAsync(catalogItem.modelSrc);
      } catch (err) {
        console.error(
          '[swapMilaAccessoryVariant] Error cargando modelo:',
          catalogItem.modelSrc,
          err
        );
        return;
      }

      const newObj = gltf.scene.clone(true);
      newObj.position.copy(savedPos);
      newObj.quaternion.copy(savedQuaternion);
      newObj.scale.copy(savedScale);

      newObj.userData = {
        ...savedUserData,
        code: catalogItem.code,
        codigoPT: catalogItem.code,
        name: catalogItem.label,
        description: catalogItem.description,
        prices: catalogItem.prices,
        modelSrc: catalogItem.modelSrc,
        model: { src: catalogItem.modelSrc },
        meta: {
          ...(savedUserData.meta || {}),
          role,
          category: 'mila',
          line: 'MILA',
          isPartRoot: true,
          instanceId: savedUserData.meta?.instanceId || instanceId,
        },
      };

      newObj.traverse((node) => {
        if (!node) return;
        node.userData = {
          ...(node.userData || {}),
          parentAssemblyId: savedUserData.parentAssemblyId || null,
          groupId: savedUserData.groupId || null,
          groupName: savedUserData.groupName || null,
        };

        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            node.material.depthTest = true;
            node.material.depthWrite = true;
            node.material.transparent = false;
            node.material.needsUpdate = true;
          }
        }
      });

      removePartObject(oldObj);
      if (parentGroup) parentGroup.add(newObj);
      else scene.add(newObj);

      parts.push({
        id: instanceId,
        code: catalogItem.code,
        obj: newObj,
        kind: 'GLB_PART',
        type: 'GLB_PART',
        name: catalogItem.label,
      });
      pickables.push(newObj);

      setActivePart(newObj);
      emitBOM();
      updateMilaConnectors();
      refreshFloorAndGrid();
    }

    async function swapClakVariant(instanceId, codigo, targetCode) {
      if (readOnly) return;

      const currentCode = normalizeClakPuffCode(codigo);
      const nextCode = normalizeClakPuffCode(targetCode);

      // allow swaps for regular puff variant groups, or for seat/module combos
      const currentIsSeat = isClakSeatCode(currentCode);
      const nextIsSeat = isClakSeatCode(nextCode);
      const currentIsModule = isClakModuleCode(currentCode);
      const nextIsModule = isClakModuleCode(nextCode);

      // If either code is a seat or module, require both to be the same category
      if (currentIsSeat || nextIsSeat || currentIsModule || nextIsModule) {
        const currentCategory = currentIsSeat ? 'seat' : currentIsModule ? 'module' : null;
        const nextCategory = nextIsSeat ? 'seat' : nextIsModule ? 'module' : null;
        if (currentCategory !== nextCategory) {
          console.warn(
            '[swapClakVariant] Cambio entre familias no permitido:',
            currentCode,
            nextCode
          );
          return;
        }
        // both are seat codes OR both are module codes -> allow
      } else {
        if (!CLAK_SWAP_ALLOWED_CODES.has(currentCode)) {
          console.warn('[swapClakVariant] Código actual no permitido:', currentCode);
          return;
        }
        if (!CLAK_SWAP_ALLOWED_CODES.has(nextCode)) {
          console.warn('[swapClakVariant] Código destino no permitido:', nextCode);
          return;
        }

        const currentOptions = getClakVariantOptionsByCode(currentCode) || [];
        const sameFamily = currentOptions.some((it) => normalizeClakPuffCode(it.code) === nextCode);
        if (!sameFamily) {
          console.warn(
            '[swapClakVariant] Cambio entre familias no permitido:',
            currentCode,
            nextCode
          );
          return;
        }
      }

      if (currentCode === nextCode) return;

      const found = parts.find(({ obj }) => {
        return obj?.userData?.instanceId === instanceId || obj?.uuid === instanceId;
      });

      if (!found?.obj) {
        console.warn('[swapClakVariant] No se encontró la pieza:', instanceId);
        return;
      }

      const oldObj = found.obj;
      const savedPos = oldObj.position.clone();
      const savedRot = oldObj.rotation.clone();
      const savedUserData = { ...oldObj.userData };
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;

      let result;
      try {
        result = await createClakInstance({
          codigoPT: nextCode,
          country: countryRef.current,
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(`[swapClakVariant] No se pudo crear la variante ${nextCode}`, error);
        return;
      }

      const { object: newObj, partRecord } = result;
      newObj.userData = {
        ...savedUserData,
        ...newObj.userData,
      };

      removePartObject(oldObj);

      if (parentGroup) {
        parentGroup.add(newObj);
      } else {
        scene.add(newObj);
      }

      parts.push(partRecord);
      pickables.push(newObj);

      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.updateMatrixWorld(true);

      setActivePart(newObj);
      emitBOM();
      refreshFloorAndGrid();
    }

    async function swapAlmacenamientoVariant(instanceId, codigo, targetVariant = 'base') {
      if (readOnly) return;

      const baseCode = normalizeZenVariantCode(codigo);
      if (!baseCode) return;

      const requestedVariant = String(targetVariant || 'base')
        .trim()
        .replace(/^_+/, '')
        .replace(/\.glb$/i, '')
        .toLowerCase();
      const normalizedTarget =
        requestedVariant === 'normal'
          ? 'base'
          : requestedVariant === 'laminate'
            ? 'lamiante'
            : requestedVariant;

      const variantOptions = getZenVariantOptionsByCode(baseCode) || [];
      const targetDefinition = variantOptions.find(
        ({ variantType }) => variantType === normalizedTarget
      );

      if (!targetDefinition) {
        console.warn(
          '[swapAlmacenamientoVariant] Variante no compatible:',
          targetVariant,
          baseCode
        );
        return;
      }

      const found = parts.find(({ obj }) => {
        return obj?.userData?.instanceId === instanceId || obj?.uuid === instanceId;
      });

      if (!found?.obj) {
        console.warn('[swapAlmacenamientoVariant] No se encontró la pieza:', instanceId);
        return;
      }

      const oldObj = found.obj;
      const oldInstanceId = oldObj.userData?.instanceId || oldObj.uuid;
      const savedPosition = oldObj.position.clone();
      const savedQuaternion = oldObj.quaternion.clone();
      const savedScale = oldObj.scale.clone();
      const savedUserData = { ...oldObj.userData };
      delete savedUserData.bounds2d;
      const savedParent = oldObj.parent || scene;
      const savedParentIndex = savedParent.children.indexOf(oldObj);
      const savedSelectedIds = Array.from(new Set(selectedIds3D));
      if (!savedSelectedIds.includes(oldInstanceId)) savedSelectedIds.push(oldInstanceId);

      let result;
      try {
        result = await createZenInstance({
          codigoPT: baseCode,
          country: countryRef.current,
          variant: normalizedTarget,
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(
          `[swapAlmacenamientoVariant] No se pudo crear la variante ${normalizedTarget} de ${baseCode}`,
          error
        );
        return;
      }

      const { object: newObj, metadata, partRecord } = result;
      newObj.userData = {
        ...(newObj.userData || {}),
        ...savedUserData,
        ...metadata,
        instanceId: oldInstanceId,
      };

      newObj.position.copy(savedPosition);
      newObj.quaternion.copy(savedQuaternion);
      newObj.scale.copy(savedScale);

      const bounds2d = computeBounds2D(newObj);
      if (bounds2d) {
        newObj.userData.bounds2d = {
          localCenter: bounds2d.localCenter.toArray(),
          sizeLocal: bounds2d.sizeLocal.toArray(),
        };
      }

      removePartObject(oldObj, { emitBom: false });

      savedParent.add(newObj);

      if (savedParentIndex >= 0) {
        const appendedIndex = savedParent.children.indexOf(newObj);
        if (appendedIndex >= 0 && appendedIndex !== savedParentIndex) {
          savedParent.children.splice(appendedIndex, 1);
          savedParent.children.splice(savedParentIndex, 0, newObj);
        }
      }

      newObj.updateMatrixWorld(true);

      parts.push({ ...partRecord, obj: newObj });
      pickables.push(newObj);

      setActivePart(newObj);
      syncSelectedIds3D(savedSelectedIds);
      emitBOM();
      refreshFloorAndGrid();
    }

    async function swapEdukShelfHeight(instanceId, codigo, targetHeight = '114cm') {
      const currentInfo = getEdukShelfHeightInfoByCode(codigo);
      if (!currentInfo) {
        console.warn('[swapEdukShelfHeight] Código fuera de estanterías configuradas:', codigo);
        return;
      }
      await swapEdukVariant(instanceId, codigo, { height: targetHeight });
    }

    async function swapEdukVariant(instanceId, codigo, nextSelection = {}) {
      if (readOnly) return;

      const currentCode = String(codigo || '').trim();
      if (!currentCode) return;

      const targetCode = resolveEdukCodeBySelection(currentCode, nextSelection);
      if (!targetCode) {
        console.warn(
          '[swapEdukVariant] Combinación de propiedades inválida:',
          currentCode,
          nextSelection
        );
        return;
      }

      if (targetCode === currentCode) return;

      const found = parts.find(({ obj }) => {
        return obj?.userData?.instanceId === instanceId || obj?.uuid === instanceId;
      });

      if (!found?.obj) {
        console.warn('[swapEdukVariant] No se encontró la pieza:', instanceId);
        return;
      }

      const oldObj = found.obj;
      const savedPos = oldObj.position.clone();
      const savedRot = oldObj.rotation.clone();
      const savedScale = oldObj.scale.clone();
      const savedUserData = { ...oldObj.userData };
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;

      let result;
      try {
        result = await createEdukInstance({
          codigoPT: targetCode,
          country: countryRef.current,
          loadGlb: loadExistingGlb,
        });
      } catch (error) {
        console.error(`[swapEdukVariant] No se pudo crear la variante ${targetCode}`, error);
        return;
      }

      const { object: newObj, partRecord } = result;
      newObj.userData = {
        ...savedUserData,
        ...newObj.userData,
      };

      removePartObject(oldObj);

      if (parentGroup) {
        parentGroup.add(newObj);
      } else {
        scene.add(newObj);
      }

      parts.push(partRecord);
      pickables.push(newObj);

      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.scale.copy(savedScale);
      newObj.updateMatrixWorld(true);

      setActivePart(newObj);
      emitBOM();
      refreshFloorAndGrid();
    }

    async function addCatalogItem(codigoPT) {
      if (readOnly) return;
      const codigo = String(codigoPT);

      //  0) si el codigo es una tipología (existe en tipologias-detalle.json), úsala como tipología
      // (esto evita mezclarla con catalogData normal)
      try {
        const det = await getTipologiaDetalle(codigo, countryRef.current);
        if (det) {
          return await addTypology(codigo);
        }
      } catch (e) {
        // si falla el fetch no bloqueamos agregar catálogo normal
        console.warn('addCatalogItem: no se pudo consultar tipologías:', e);
      }

      //  1) flujo normal de catálogo
      const item = catalogByCodeRef.current?.get?.(codigo);

      if (!item) {
        console.error('addCatalogItem: codigoPT no existe en catalogData:', codigo);
        return;
      }

      if (item.model?.kind === MODEL_TYPES.GLB) {
        const previousLength = parts.length;
        await addPartFromGlb(item); // le pasas el ITEM, no el codigo
        return parts.slice(previousLength).findLast(({ obj }) => obj)?.obj || null;
      }

      if (item.model?.kind === MODEL_TYPES.PROCEDURAL) {
        const d = item.model.defaults || { widthM: 1.2, depthM: 0.6, thicknessM: 0.025 };
        return addSurface(d, item); //  le pasas item para guardar codigoPT en userData
      }

      console.error('addCatalogItem: item.model.kind inválido:', item);
    }

    function frameToObject(obj) {
      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera.fov * Math.PI) / 180;
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 2.2;

      camera.position.set(center.x + cameraZ, center.y + cameraZ * 0.6, center.z + cameraZ);
      camera.near = Math.max(0.01, cameraZ / 100);
      camera.far = cameraZ * 1000;
      camera.updateProjectionMatrix();

      controls.target.copy(center);
      controls.update();
    }

    function _addSurfaceFromRules({ line, widthMm, depthMm, thickMm }) {
      if (readOnly) return;
      // 1) resolver codigoPT real (del XML) usando reglas
      const codigoPT = resolveSurfaceCodigoPT({ line, widthMm, depthMm, thickMm });
      console.log('w:', widthMm, 'd:', depthMm, 't:', thickMm, 'line:', line);

      if (!codigoPT) {
        console.warn('No se encontró codigoPT para superficie con reglas:', {
          line,
          widthMm,
          depthMm,
          thickMm,
        });
        return;
      }

      // 2) crear mesh procedural EN METROS
      const widthM = widthMm / 1000;
      const depthM = depthMm / 1000;
      const thicknessM = thickMm / 1000;

      const mesh = createSurfaceMesh({ widthM, depthM, thicknessM });

      // 3) meta (para snap) por instancia (metros)
      const partCode = codigoPT;
      const meta = createSurfaceMeta({ partCode, widthM, depthM, thicknessM });

      // 4) userData IMPORTANTES
      mesh.userData = {
        // negocio
        codigoPT,
        code: codigoPT, // <- BOM/props se basan en esto (para cruzar XML)
        line,
        dim: { widthMm, depthMm, thickMm },

        // snap/meta por instancia
        meta,
        units: 'm',

        // id interno si quieres diferenciar instancias
        instanceId: `${codigoPT}__${Date.now()}__${Math.random().toString(16).slice(2)}`,
      };

      mesh.name = `SURFACE_${codigoPT}`;

      // 5) posición default
      mesh.position.set(parts.length * 0.9, 0, 0);

      scene.add(mesh);
      parts.push({ code: codigoPT, obj: mesh });
      pickables.push(mesh);

      // 6) seleccionar + BOM
      setActivePart(mesh);
      emitBOM();

      // 7) anti-freeze
      isDragging = false;
      controls.enabled = true;

      // opcional: encuadrar cámara en la superficie cuando se crea
      frameToObject(mesh);
    }

    function applyTransform(obj, t) {
      if (!t) return;
      if (Array.isArray(t.position)) obj.position.fromArray(t.position);
      if (Array.isArray(t.quaternion) && t.quaternion.length === 4) {
        obj.quaternion.fromArray(t.quaternion);
      } else if (Array.isArray(t.rotation)) {
        obj.rotation.set(t.rotation[0], t.rotation[1], t.rotation[2]);
      }
      if (Array.isArray(t.scale)) obj.scale.fromArray(t.scale);
      obj.updateMatrixWorld(true);
    }

    function clearProject() {
      const koncisaAssemblies = new Set();
      const critteriumAssemblies = new Set();
      const critteriumSequences = new Set();
      const critteriumObjects = new Set();
      parts.forEach(({ obj }) => {
        if (obj?.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') critteriumSequences.add(obj);
        const critteriumAssembly = getCritterium8AssemblyRoot(obj);
        if (critteriumAssembly && !getCritterium8SequenceRoot(critteriumAssembly))
          critteriumAssemblies.add(critteriumAssembly);
        let current = obj?.parent || null;
        while (current) {
          if (current.userData?.kind === 'KONCISA_PLUS_ASSEMBLY') {
            koncisaAssemblies.add(current);
            break;
          }
          current = current.parent || null;
        }
      });
      critteriumAssemblies.forEach((assembly) => {
        assembly.traverse((object) => critteriumObjects.add(object));
      });
      critteriumSequences.forEach((sequenceRoot) => {
        sequenceRoot.traverse((object) => critteriumObjects.add(object));
      });

      // remover objetos de escena
      for (const p of parts) {
        if (critteriumObjects.has(p.obj)) continue;
        if (p.obj?.parent) p.obj.parent.remove(p.obj);
        else scene.remove(p.obj);
      }
      koncisaAssemblies.forEach((assembly) => {
        if (assembly.parent) assembly.parent.remove(assembly);
        else scene.remove(assembly);
      });
      critteriumAssemblies.forEach((assembly) => {
        if (assembly.parent) assembly.parent.remove(assembly);
        else scene.remove(assembly);
        disposeCritterium8FrameAssembly3D(assembly);
      });
      critteriumSequences.forEach((sequenceRoot) => {
        if (sequenceRoot.parent) sequenceRoot.parent.remove(sequenceRoot);
        else scene.remove(sequenceRoot);
        disposeCritterium8Sequence3D(sequenceRoot, { disposeFrames: true });
      });
      parts.length = 0;

      // pickables
      pickables.length = 0;
      const floor = floorMeshRef.current;
      if (floor) pickables.push(floor);

      // selección
      activePart = null;
      activeEditablePart = null;
      if (selectionHelper) {
        scene.remove(selectionHelper);
        selectionHelper = null;
      }

      // notifica UI
      onSelectionChange?.(null);
      emitBOM();
    }

    // ====== Eliminar piezas ======
    function disposeObject3D(root) {
      if (!root) return;
      if (root.userData?.isFloor) return;
      if (root.userData?.kind === 'CRITTERIUM_8_ASSEMBLY') {
        disposeCritterium8FrameAssembly3D(root);
        return;
      }
      if (root.userData?.kind === 'CRITTERIUM_8_SEQUENCE_ASSEMBLY') {
        disposeCritterium8Sequence3D(root);
        return;
      }
      root.traverse?.((n) => {
        // geometría
        if (n.geometry?.dispose) n.geometry.dispose();

        // materiales (single o array)
        const m = n.material;
        if (Array.isArray(m)) {
          m.forEach((mm) => mm?.dispose?.());
        } else if (m?.dispose) {
          m.dispose();
        }
      });
    }

    function isDescendantOf(obj, root) {
      let cur = obj;

      while (cur) {
        if (cur === root) return true;
        cur = cur.parent;
      }

      return false;
    }

    function removePartsRecordsUnder(root) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const obj = parts[i]?.obj;

        if (!obj) continue;

        if (obj === root || isDescendantOf(obj, root)) {
          parts.splice(i, 1);
        }
      }
    }

    function removePickablesUnder(root) {
      for (let i = pickables.length - 1; i >= 0; i--) {
        const obj = pickables[i];

        if (!obj) continue;

        if (obj === root || isDescendantOf(obj, root)) {
          pickables.splice(i, 1);
        }
      }
    }

    function getAssemblyId(obj) {
      return obj?.userData?.instanceId || obj?.userData?.code || obj?.uuid || null;
    }

    function getFloatingChildrenOfAssembly(assemblyObj) {
      const assemblyId = getAssemblyId(assemblyObj);

      if (!assemblyId) return [];

      return parts
        .map((p) => p.obj)
        .filter((obj) => {
          if (!obj) return false;
          if (obj === assemblyObj) return false;

          const parentAssemblyId = obj.userData?.parentAssemblyId;

          if (!parentAssemblyId) return false;

          // Si ya es descendiente real, no se elimina aquí porque se elimina con el padre.
          if (isDescendantOf(obj, assemblyObj)) return false;

          return parentAssemblyId === assemblyId;
        });
    }

    function removeFloatingChildrenOfAssembly(assemblyObj, options = {}) {
      getFloatingChildrenOfAssembly(assemblyObj).forEach((child) => {
        removePartObject(child, {
          skipFloatingChildren: true,
          disposeResources: options.disposeResources,
          emitBom: options.emitBom,
        });
      });
    }

    function removePartObject(obj, options = {}) {
      if (!obj) return false;

      const {
        skipFloatingChildren = false,
        disposeResources = true,
        emitBom = true,
        exactTarget = false,
      } = options;
      const root = exactTarget ? obj : getRootPartObject(obj) || obj;
      if (root.userData?.lockedDelete) return false;

      const isAssembly =
        root.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' || root.userData?.type === 'koncisa-plus';

      // Si se elimina un puesto, primero elimina pantallas asociadas que estén por fuera.
      if (isAssembly && !skipFloatingChildren) {
        removeFloatingChildrenOfAssembly(root, { disposeResources, emitBom });
      }

      // Quitar de su padre real.
      try {
        if (root.parent) {
          root.parent.remove(root);
        } else {
          scene.remove(root);
        }
      } catch (err) {
        void err;
      }

      // Quitar registros internos del objeto y de todos sus hijos registrados.
      removePartsRecordsUnder(root);
      removePickablesUnder(root);

      // Si otros ensambles estaban apoyados/pegados sobre este objeto eliminado, desvincularlos (Requirement 17)
      const deletedInstanceId = root.userData?.instanceId;
      if (deletedInstanceId) {
        parts.forEach(({ obj: otherObj }) => {
          if (otherObj?.userData?.attachment?.targetAssemblyId === deletedInstanceId) {
            otherObj.userData.attachment = null;
          }
        });
      }

      // Si la selección activa era este objeto o algo dentro de él, limpiar selección.
      if (activePart === root || isDescendantOf(activePart, root)) {
        activePart = null;
        activeEditablePart = null;
        activeSubMesh = null;

        if (selectionHelper) {
          try {
            scene.remove(selectionHelper);
          } catch (err) {
            void err;
          }

          selectionHelper = null;
        }

        onSelectionChange?.(null);
        updateEdukTableHandles();
        updateMilaConnectors();
      }

      if (disposeResources) disposeObject3D(root);

      if (emitBom) emitBOM();

      return true;
    }

    function removeActivePart() {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getRootPartObject(activePart) || activePart;

      return removePartObject(root);
    }

    function removePartById(instanceId) {
      if (readOnly) return false;

      const found = parts.find(({ obj }) => {
        const ids = [
          obj?.userData?.instanceId,
          obj?.userData?.code,
          obj?.userData?.codigoPT,
          obj?.uuid,
        ]
          .filter(Boolean)
          .map(String);

        return ids.includes(String(instanceId));
      });

      if (!found?.obj) return false;

      return removePartObject(found.obj);
    }

    async function loadProject(project) {
      //console.log('[loadProject] materialsByCodeRef size:', materialsByCodeRef.current?.size || 0);

      if (!project) return;

      clearProject();

      const floor = floorMeshRef.current;
      if (floor) {
        const floorState = project.floor || {};
        const loadedGridSize = Number(floorState.gridSize);
        floor.userData.showGrid = floorState.showGrid !== false;
        floor.userData.gridSize =
          Number.isFinite(loadedGridSize) && loadedGridSize > 0 ? loadedGridSize : 0.1;
        floor.userData.materialCode = floorState.materialCode || null;

        const floorMaterialDef = floor.userData.materialCode
          ? materialsByCodeRef.current?.get?.(String(floor.userData.materialCode)) || null
          : null;
        applyMaterialToObject3D(floor, floor.userData.materialCode, floorMaterialDef);
        refreshFloorAndGrid();
      }

      // cámara (opcional)
      if (project.camera?.position) camera.position.fromArray(project.camera.position);
      if (project.camera?.target) controls.target.fromArray(project.camera.target);
      controls.update();

      //  Reaplica acabados por sub-mesh (solo para GLB/tipologías)
      function reapplyFinishesToRoot(root, finishesMap) {
        if (!root || !finishesMap || typeof finishesMap !== 'object') return;

        let applied = 0;
        let missingDefs = 0;

        root.traverse((n) => {
          if (!n?.isMesh) return;

          const key = getMeshPathKey(root, n);
          const fin = finishesMap[key];
          if (!fin?.materialCode) return;

          const codeStr = String(fin.materialCode).trim();
          const def = materialsByCodeRef.current?.get?.(codeStr) || null;

          // Persistencia en el mesh
          n.userData.materialCode = codeStr;

          if (!def) {
            missingDefs++;
            console.warn('[LOAD finishes] def NO encontrado', { key, codeStr });
            return;
          }

          //  aplicar SOLO al mesh
          applyMaterialToMesh(n, codeStr, def);
          applied++;

          // (opcional) log detallado por mesh
          // console.log('[LOAD finishes] OK', { key, codeStr, mesh: n.name });
        });

        // persistencia en el root
        root.userData.finishes = finishesMap;

        console.log('[LOAD finishes] resumen:', {
          applied,
          missingDefs,
          totalFinishesKeys: Object.keys(finishesMap).length,
        });
      }

      function createPersistedSurface(entity) {
        const dimMm = entity?.metadata?.dim;
        if (!dimMm) throw new Error('SURFACE_MISSING_DIMENSIONS');

        const codigoPT = entity.codigoPT;
        const widthM = Number(dimMm.widthMm) / 1000;
        const depthM = Number(dimMm.depthMm) / 1000;
        const thicknessM = Number(dimMm.thickMm) / 1000;
        const mesh = createSurfaceMesh({ widthM, depthM, thicknessM });
        const meta = createSurfaceMeta({ partCode: codigoPT, widthM, depthM, thicknessM });
        const item = catalogByCodeRef.current?.get?.(codigoPT);

        mesh.userData = {
          ...(mesh.userData || {}),
          code: entity.code || codigoPT,
          codigoPT,
          kind: 'SURFACE',
          line: entity.metadata?.line || null,
          dim: dimMm,
          meta,
          units: 'm',
          internalCode: codigoPT,
          instanceId: entity.instanceId || mesh.uuid,
          generico: entity.metadata?.generico || item?.generico || item?.raw?.generico || null,
          materialBase:
            entity.materialBase || item?.materialBase || item?.raw?.material || 'LAMINA',
          materialCode: entity.materialCode || null,
          finishes: null,
          activeSubKey: null,
          activeSubName: null,
        };

        mesh.name = `SURFACE_${codigoPT}`;
        scene.add(mesh);
        parts.push({ code: codigoPT, obj: mesh });
        pickables.push(mesh);
        catalogCache.set(codigoPT, { base: mesh, meta });
        return mesh;
      }

      function restorePersistedEntityState(object, entity) {
        object.userData = {
          ...(object.userData || {}),
          instanceId: entity.instanceId || object.userData?.instanceId || object.uuid,
          materialBase: entity.materialBase ?? object.userData?.materialBase ?? null,
          materialCode: entity.materialCode ?? object.userData?.materialCode ?? null,
        };
        applyTransform(object, entity.transform);

        if (object.userData.materialCode) {
          const codeStr = String(object.userData.materialCode);
          const def = materialsByCodeRef.current?.get?.(codeStr) || null;
          applyMaterialToObject3D(object, codeStr, def);
        }

        if (entity.finishes && typeof entity.finishes === 'object') {
          object.userData.activeSubKey = entity.activeSubKey || null;
          object.userData.activeSubName = entity.activeSubName || null;
          reapplyFinishesToRoot(object, entity.finishes);
        }
      }

      async function createPersistedKoncisaPlus(entity) {
        const partsStartIndex = parts.length;
        let createdAssembly = null;
        const factoryApi = {
          createKoncisaPlusAssemblyGroup: (config) => {
            createdAssembly = createKoncisaPlusAssemblyGroup(config);
            return createdAssembly;
          },
          addSurface,
          addExternalGlbPart,
          addNativeBlockPart,
          addKoncisaCostadoAssemblyPart,
          addKoncisaLeaderSkirtAssemblyPart,
          addNativeKoncisaDuctPart,
          addKoncisaPrivacyPanel,
          selectObject: (object) => object && setActivePart(object),
        };

        try {
          const result = await createKoncisaPlusInstance({
            api: factoryApi,
            config: entity.config || entity.recipe?.config,
            transformOverrides: entity.transform,
            notify: (message) => console.warn('[loadProject] Koncisa:', message),
          });
          if (!result?.assembly) throw new Error('KONCISA_FACTORY_DID_NOT_RETURN_ASSEMBLY');

          const createdRecords = parts.slice(partsStartIndex);
          const expectedCount = Number(entity.recipe?.diagnostics?.componentCount || 0);
          if (expectedCount > 0 && createdRecords.length < expectedCount) {
            throw new Error(
              `KONCISA_INCOMPLETE_ASSEMBLY:${createdRecords.length}/${expectedCount}`
            );
          }

          const assembly = result.assembly;
          const generatedAssemblyId = assembly.userData?.instanceId;
          const generatedGroupId = assembly.userData?.groupId;
          const assemblyId = entity.assemblyId || entity.instanceId || generatedAssemblyId;
          const groupId = entity.groupId || assemblyId || generatedGroupId;

          assembly.userData = {
            ...(assembly.userData || {}),
            instanceId: assemblyId,
            code: assemblyId,
            codigoPT: assemblyId,
            groupId,
            groupName: entity.metadata?.groupName || assembly.userData?.groupName,
            config: entity.config || entity.recipe?.config || assembly.userData?.config,
          };

          createdRecords.forEach(({ obj }) => {
            if (!obj) return;
            obj.traverse?.((node) => {
              node.userData = { ...(node.userData || {}) };
              if (
                node.userData.parentAssemblyId === generatedAssemblyId ||
                node.userData.parentAssemblyId === generatedGroupId
              ) {
                node.userData.parentAssemblyId = assemblyId;
              }
              if (node.userData.groupId === generatedGroupId) node.userData.groupId = groupId;
              if (node.userData.groupName === result.groupName && entity.metadata?.groupName) {
                node.userData.groupName = entity.metadata.groupName;
              }
            });
          });

          const availableByKey = new Map();
          createdRecords.forEach(({ obj }) => {
            const key = resolveComponentKey(obj);
            if (!key) return;
            const queue = availableByKey.get(key) || [];
            queue.push(obj);
            availableByKey.set(key, queue);
          });

          for (const component of entity.recipe?.components || []) {
            if (!component?.key) continue;
            const object = availableByKey.get(component.key)?.shift?.() || null;
            if (!object) continue;

            const transform = component.transform || {};
            if (Array.isArray(transform.position)) object.position.fromArray(transform.position);
            if (Array.isArray(transform.quaternion)) {
              object.quaternion.fromArray(transform.quaternion).normalize();
            }
            if (Array.isArray(transform.scale)) object.scale.fromArray(transform.scale);
            object.userData = {
              ...(object.userData || {}),
              ...(component.state || {}),
              meta: {
                ...(object.userData?.meta || {}),
                ...(component.metadata || {}),
              },
            };

            const finish = entity.recipe?.finishes?.[component.key];
            if (finish?.materialCode) {
              const codeStr = String(finish.materialCode);
              const def = materialsByCodeRef.current?.get?.(codeStr) || null;
              object.userData.materialCode = codeStr;
              applyMaterialToObject3D(object, codeStr, def);
            }
            if (finish?.submeshes) reapplyFinishesToRoot(object, finish.submeshes);
            object.updateMatrixWorld(true);
          }

          assembly.updateMatrixWorld(true);
          return assembly;
        } catch (error) {
          if (createdAssembly) {
            removePartObject(createdAssembly, { emitBom: false, disposeResources: true });
          }
          throw error;
        }
      }

      async function createPersistedCritterium8(entity) {
        if (!entity?.config || typeof entity.config !== 'object') {
          throw new Error('CRITTERIUM8_MISSING_CONFIG');
        }
        let instance = null;
        try {
          instance = await createCritterium8Instance({
            ...entity.config,
            instanceId: entity.instanceId,
            assemblyId: entity.assemblyId || entity.instanceId,
            groupId: entity.groupId || entity.assemblyId || entity.instanceId,
            frameId: entity.frameId,
            transform: entity.transform,
          });
          const errors = (instance.diagnostics || []).filter((item) => item.level === 'ERROR');
          if (errors.length) {
            const error = new Error(errors[0].code || 'CRITTERIUM8_INVALID_CONFIG');
            error.diagnostics = errors;
            throw error;
          }
          registerCritterium8Instance({
            instance,
            parent: scene,
            partsRegistry: parts,
            pickables,
          });
          instance.assembly.updateMatrixWorld(true);
          return instance.assembly;
        } catch (error) {
          if (instance?.assembly) {
            if (instance.assembly.parent) {
              removePartObject(instance.assembly, { emitBom: false, disposeResources: true });
            } else {
              disposeCritterium8FrameAssembly3D(instance.assembly);
            }
          }
          throw error;
        }
      }

      if (isVersionedEntityProject(project)) {
        const result = { loaded: [], failed: [] };
        const context = {
          createSurface: createPersistedSurface,
          addClak,
          addEduk,
          addAres,
          addMepalSalud,
          addMepalTekSocial,
          addZen,
          addOfficeAccessory,
          addCatalogItem,
          createKoncisaPlus: createPersistedKoncisaPlus,
          createCritterium8: createPersistedCritterium8,
        };

        for (const [index, entity] of project.entities.entries()) {
          try {
            const object = await loadPersistedEntity(entity, context);
            restorePersistedEntityState(object, entity);
            result.loaded.push({
              index,
              kind: entity.kind,
              codigoPT: entity.codigoPT,
              assemblyId: entity.assemblyId || null,
            });
          } catch (error) {
            const failure = {
              index,
              kind: entity?.kind || null,
              codigoPT: entity?.codigoPT || null,
              assemblyId: entity?.assemblyId || null,
              reason: error?.message || String(error),
              diagnostics: Array.isArray(error?.diagnostics) ? error.diagnostics : [],
            };
            result.failed.push(failure);
            console.error('[loadProject] No se pudo cargar entity:', failure, error);
          }
        }

        emitBOM();
        refreshFloorAndGrid();
        if (result.failed.length) console.warn('[loadProject] Carga parcial:', result);
        return result;
      }

      // reconstruir piezas
      const legacyResult = { loaded: [], failed: [] };
      for (const [index, part] of (project.parts || []).entries()) {
        //  try/catch por pieza: si una falla, no tumba el resto
        try {
          const codigoPT = part.codigoPT;

          // ===========================
          // 1) SURFACE (procedural nuevo)
          // ===========================
          if (part.kind === 'SURFACE' && part.surface?.dimMm) {
            const { line, dimMm } = part.surface;

            const widthM = dimMm.widthMm / 1000;
            const depthM = dimMm.depthMm / 1000;
            const thicknessM = dimMm.thickMm / 1000;

            const mesh = createSurfaceMesh({ widthM, depthM, thicknessM });
            const meta = createSurfaceMeta({ partCode: codigoPT, widthM, depthM, thicknessM });

            const item = catalogByCodeRef.current?.get?.(codigoPT);

            mesh.userData = {
              code: codigoPT,
              codigoPT,
              kind: 'SURFACE',
              line,
              dim: dimMm,
              meta,
              units: 'm',
              internalCode: codigoPT,
              instanceId: `${codigoPT}__${Date.now()}__${Math.random().toString(16).slice(2)}`,

              generico: item?.generico || item?.raw?.generico || null,

              materialBase:
                part.materialBase || item?.materialBase || item?.raw?.material || 'LAMINA',
              materialCode: part.materialCode || null,

              //  IMPORTANTÍSIMO: surfaces no tienen finishes
              finishes: null,
              activeSubKey: null,
              activeSubName: null,
            };

            mesh.name = `SURFACE_${codigoPT}`;
            applyTransform(mesh, part.transform);

            //  aplicar material global (surface)
            if (mesh.userData.materialCode) {
              const codeStr = String(mesh.userData.materialCode);
              const def = materialsByCodeRef.current?.get?.(codeStr) || null;

              console.log('[LOAD surface]', { codigoPT, codeStr, defFound: !!def });

              applyMaterialToObject3D(mesh, codeStr, def);
            }

            scene.add(mesh);
            parts.push({ code: codigoPT, obj: mesh });
            pickables.push(mesh);
            catalogCache.set(codigoPT, { base: mesh, meta });
            legacyResult.loaded.push({ index, kind: 'SURFACE', codigoPT });
            continue;
          }

          // ===========================
          // 2) procedural viejo (compat)
          // ===========================
          if (part.procedural) {
            const mesh = createSurfaceMesh(part.procedural);
            const partCode = codigoPT;
            const meta = createSurfaceMeta({ partCode, ...part.procedural });

            mesh.userData.code = partCode;
            mesh.userData.procedural = part.procedural;
            mesh.name = partCode;

            mesh.userData.materialBase = part.materialBase ?? mesh.userData.materialBase ?? null;
            mesh.userData.materialCode = part.materialCode ?? mesh.userData.materialCode ?? null;

            //  evitar finishes aca también
            mesh.userData.finishes = null;
            mesh.userData.activeSubKey = null;
            mesh.userData.activeSubName = null;

            applyTransform(mesh, part.transform);

            if (mesh.userData.materialCode) {
              const codeStr = String(mesh.userData.materialCode);
              const def = materialsByCodeRef.current?.get?.(codeStr) || null;

              console.log('[LOAD procedural]', { partCode, codeStr, defFound: !!def });

              applyMaterialToObject3D(mesh, codeStr, def);
            }

            scene.add(mesh);
            parts.push({ code: partCode, obj: mesh });
            pickables.push(mesh);
            catalogCache.set(partCode, { base: mesh, meta });
            legacyResult.loaded.push({ index, kind: 'PROCEDURAL', codigoPT });
            continue;
          }

          // ===========================
          // 3) GLB (incluye tipologías)
          // ===========================
          const last = await addCatalogItem(codigoPT);
          if (!last) {
            legacyResult.failed.push({
              index,
              kind: part.kind || 'LEGACY',
              codigoPT: codigoPT || null,
              reason: 'CREATOR_DID_NOT_RETURN_OBJECT',
            });
            continue;
          }

          applyTransform(last, part.transform);

          //  material global
          last.userData.materialBase = part.materialBase || last.userData.materialBase || null;
          last.userData.materialCode = part.materialCode || last.userData.materialCode || null;

          if (last.userData.materialCode) {
            const codeStr = String(last.userData.materialCode);
            const def = materialsByCodeRef.current?.get?.(codeStr) || null;

            console.log('[LOAD glb-global]', { codigoPT, codeStr, defFound: !!def });

            applyMaterialToObject3D(last, codeStr, def);
          }

          //  finishes por sub-parte (solo GLB)
          if (part.finishes && typeof part.finishes === 'object') {
            last.userData.activeSubKey = part.activeSubKey || null;
            last.userData.activeSubName = part.activeSubName || null;

            reapplyFinishesToRoot(last, part.finishes);
          }
          legacyResult.loaded.push({ index, kind: part.kind || 'LEGACY', codigoPT });
        } catch (err) {
          console.error('[loadProject] Error cargando part:', part?.codigoPT, err);
          legacyResult.failed.push({
            index,
            kind: part?.kind || 'LEGACY',
            codigoPT: part?.codigoPT || null,
            reason: err?.message || String(err),
          });
          // sigue con la siguiente pieza
        }
      }

      emitBOM();
      if (legacyResult.failed.length)
        console.warn('[loadProject] Carga legacy parcial:', legacyResult);
      return legacyResult;
    }

    loadProjectRef.current = loadProject;

    // ====== API para el catálogo ======
    async function ensureLoaded(code) {
      if (catalogCache.has(code)) return;

      const gltf = await new Promise((resolve, reject) => {
        loader.load(`/assets/models/${code}.glb`, resolve, undefined, reject);
      });

      const base = gltf.scene;

      // Heurística escala
      const box0 = new THREE.Box3().setFromObject(base);
      const size0 = new THREE.Vector3();
      box0.getSize(size0);
      const maxDim0 = Math.max(size0.x, size0.y, size0.z);

      let scale = 1;
      if (maxDim0 > 10) scale = 0.001;
      else if (maxDim0 < 0.01) scale = 1000;
      base.scale.setScalar(scale);

      const meta = await loadConnectors(code);
      catalogCache.set(code, { base, meta });
    }

    async function addPart(code) {
      await ensureLoaded(code);

      const { base } = catalogCache.get(code);

      const obj = base.clone(true);
      obj.userData.code = code;
      obj.name = code; // ayuda para debug

      const spawnX = 0.5 + parts.length * 0.9;
      const spawnZ = 0.5; // fijo positivo (o 0.5 + (parts.length%3)*0.9)
      obj.position.set(spawnX, 0, spawnZ);

      scene.add(obj);
      parts.push({ code, obj });

      // MUY IMPORTANTE: para click/drag
      pickables.push(obj);

      setActivePart(obj);

      if (parts.length === 1) {
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = (camera.fov * Math.PI) / 180;
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.8;

        camera.position.set(cameraZ, cameraZ * 0.6, cameraZ);
        camera.near = Math.max(0.01, cameraZ / 100);
        camera.far = cameraZ * 500;
        camera.updateProjectionMatrix();

        controls.target.copy(center);
        controls.update();
      }
      refreshFloorAndGrid();
    }

    function toggleSnap() {
      snapActive = !snapActive;
      console.log('Snap:', snapActive ? 'ON' : 'OFF');
    }

    function endDrag(pointerId) {
      isDragging = false;
      controls.enabled = true;

      if (pointerId != null) {
        try {
          renderer.domElement.releasePointerCapture(pointerId);
        } catch (err) {
          void err;
        }
      }
    }

    //pantllas:
    async function loadGlbCached(src, cacheKey) {
      const finalKey = cacheKey || src;

      if (!src) {
        throw new Error('No se recibió ruta del modelo GLB.');
      }

      if (!catalogCache.has(finalKey)) {
        const gltf = await new Promise((resolve, reject) => {
          loader.load(src, resolve, undefined, reject);
        });

        const base = gltf.scene;

        // Si el GLB viene en milímetros, lo bajamos a metros.
        const box = new THREE.Box3().setFromObject(base);
        const size = new THREE.Vector3();
        box.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 10) {
          base.scale.setScalar(0.001);
        }

        base.traverse((node) => {
          if (!node?.isMesh) return;
          node.castShadow = true;
          node.receiveShadow = true;
        });

        catalogCache.set(finalKey, {
          base,
          meta: null,
        });
      }

      return catalogCache.get(finalKey).base;
    }

    async function addKoncisaPrivacyPanel({
      tipo = 'lateral',
      material = 'formica',
      lengthMm = 1200,
      heightMm = 300,
      thickMm,
      finishCode = '22008689',
      finishLabel = null,
      privacyPanelFinishId = null,

      x = 0,
      y = 900,
      z = 0,

      color,
      cantoColor,

      parentGroup = null,
    } = {}) {
      if (readOnly) return null;

      const group = createKoncisaPrivacyPanelProcedural({
        tipo,
        material,
        lengthMm,
        heightMm,
        thickMm,
        finishCode,
        x,
        y,
        z,
        color,
        cantoColor,
        privacyPanelFinishId,
      });

      const parentGroupId =
        parentGroup?.userData?.groupId ||
        parentGroup?.userData?.instanceId ||
        parentGroup?.userData?.code ||
        null;

      const parentGroupName =
        parentGroup?.userData?.groupName || parentGroup?.userData?.name || 'Koncisa Plus';

      group.userData.finishLabel = finishLabel;
      group.userData.privacyPanelFinishId = privacyPanelFinishId;

      group.userData.isPartRoot = true;
      group.userData.kind = 'PRIVACY_PANEL';
      group.userData.type = 'pantalla';

      //  CLAVE PARA BOM AGRUPADO
      group.userData.groupId = parentGroupId;
      group.userData.groupName = parentGroupName;
      group.userData.parentAssemblyId = parentGroupId;
      group.userData.parentAssemblyName = parentGroupName;

      try {
        const supportConfig = group.userData.supportConfig || {
          modelSrc: '/assets/models/2KAC272000-30x60.glb',
          code: '2KAC272000',
          name: 'Soporte pantalla Koncisa Plus',
        };

        const supportBase = await loadGlbCached(
          supportConfig.modelSrc,
          `KONCISA_PRIVACY_PANEL_SUPPORT_${supportConfig.code}`
        );

        const anchors = group.userData.supportAnchors || [];

        anchors.forEach((anchor, index) => {
          const support = supportBase.clone(true);

          support.name = `SOPORTE_PANTALLA_${index + 1}`;

          support.rotation.set(
            anchor.rotation?.[0] || 0,
            anchor.rotation?.[1] || 0,
            anchor.rotation?.[2] || 0
          );

          // Los GLB de soporte no comparten un pivote de montaje consistente.
          // Se alinean por la geometría ya rotada: base en el anclaje inferior
          // y centro de profundidad sobre el plano de la pantalla.
          support.position.set(0, 0, 0);
          support.updateMatrixWorld(true);
          const supportBounds = new THREE.Box3().setFromObject(support);
          const supportCenter = supportBounds.getCenter(new THREE.Vector3());
          support.position.set(
            anchor.position?.[0] || 0,
            (anchor.position?.[1] || 0) - supportBounds.min.y,
            (anchor.position?.[2] || 0) - supportCenter.z
          );

          support.traverse((node) => {
            node.userData = {
              ...(node.userData || {}),
              isSubPart: true,
              parentType: 'pantalla',
              kind: 'SUBPART',
              category: 'soportes',
              code: supportConfig.code,
              name: supportConfig.name,
              parentCode: group.userData.code,
              groupId: parentGroupId,
              groupName: parentGroupName,
              parentAssemblyId: parentGroupId,
            };

            if (node?.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
            }
          });

          group.add(support);
        });
      } catch (err) {
        console.warn(
          'No se pudo cargar el GLB del soporte de pantalla. La pantalla se creó sin soportes:',
          err
        );
      }

      if (parentGroup) {
        parentGroup.add(group);
      } else {
        scene.add(group);
      }

      parts.push({
        code: group.userData.code,
        obj: group,
      });

      pickables.push(group);

      setActivePart(group);
      group.updateMatrixWorld(true);

      if (selectionHelper) selectionHelper.update();

      emitBOM();

      return group;
    }

    function updateActivePrivacyPanelFinish(panelFinish) {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getActiveEditablePartObject();
      if (!root) return false;

      if (root.userData?.type !== 'pantalla' && root.userData?.kind !== 'PRIVACY_PANEL') {
        console.warn('La pieza activa no es una pantalla Koncisa Plus.');
        return false;
      }

      const {
        id = null,
        privacyPanelFinishId = id,
        tipo = root.userData.subtype || 'lateral',
        material = 'formica',
        finishCode = null,
        finishLabel = '',
        hasCanto = panelHasCanto(material),
        hasBacker = material === 'tela-backer',
      } = panelFinish || {};

      root.userData.subtype = tipo;
      root.userData.material = material;
      root.userData.finishCode = finishCode;
      root.userData.finishLabel = finishLabel;
      root.userData.hasCanto = hasCanto;
      root.userData.hasBacker = hasBacker;
      root.userData.materialCode = finishCode;
      root.userData.privacyPanelFinishId = privacyPanelFinishId;

      root.traverse((node) => {
        if (!node?.isMesh) return;

        const subKey = node.userData?.subKey || node.name;

        // =========================
        // PANTALLA PRINCIPAL
        // =========================
        if (subKey === 'pantalla' || node.name === 'PANTALLA') {
          node.userData.material = material;
          node.userData.finishCode = finishCode;
          node.userData.materialCode = finishCode;

          if (material === 'vidrio') {
            node.material = new THREE.MeshStandardMaterial({
              color: 0xbfdff2,
              transparent: true,
              opacity: 0.38,
              roughness: 0.05,
              metalness: 0,
            });
          } else if (material === 'tela' || material === 'tela-backer') {
            node.material = new THREE.MeshStandardMaterial({
              color: 0x9b9b9b,
              roughness: 0.95,
              metalness: 0,
            });
          } else if (material === 'melamina') {
            node.material = new THREE.MeshStandardMaterial({
              color: 0xd8c7a3,
              roughness: 0.75,
              metalness: 0,
            });
          } else {
            node.material = new THREE.MeshStandardMaterial({
              color: 0xd9d9d9,
              roughness: 0.75,
              metalness: 0,
            });
          }

          node.material.needsUpdate = true;
        }

        // =========================
        // CANTOS
        // =========================
        const isCanto =
          subKey === 'canto' ||
          node.userData?.category === 'cantos' ||
          String(node.name || '')
            .toUpperCase()
            .includes('CANTO');

        if (isCanto) {
          node.visible = !!hasCanto;
        }
      });

      const supportConfig = root.userData.supportConfig || {
        code: '2KAC272000',
        name: 'Soporte pantalla Koncisa Plus',
      };

      root.userData.typologyParts = [
        {
          code: root.userData.code,
          description: `Pantalla ${tipo} ${material} ${root.userData.dim?.lengthMm || ''}x${
            root.userData.dim?.heightMm || ''
          }`,
          qty: 1,
          unitPrice: 0,
        },
        {
          code: supportConfig.code,
          description: supportConfig.name,
          qty: 2,
          unitPrice: 0,
        },
      ];

      if (hasCanto) {
        root.userData.typologyParts.push({
          code: `CANTO-${material}-${finishCode || 'SIN-CODIGO'}`,
          description: `Canto para pantalla ${material}`,
          qty: 1,
          unitPrice: 0,
        });
      }

      root.updateMatrixWorld(true);

      if (selectionHelper) selectionHelper.update();

      onSelectionChange?.({
        code: root.userData.codigoPT || root.userData.code,
        dimMm: root.userData?.dimMm || root.userData?.dim || null,
        dimM: root.userData?.dimM || null,

        materialCode: root.userData?.materialCode ?? null,
        materialBase: root.userData?.materialBase ?? null,

        line: root.userData?.line ?? null,

        type: root.userData?.type || null,
        subtype: root.userData?.subtype || null,
        material: root.userData?.material || null,
        finishCode: root.userData?.finishCode || null,
        finishLabel: root.userData?.finishLabel || null,
        hasCanto: root.userData?.hasCanto || false,
        hasBacker: root.userData?.hasBacker || false,
        privacyPanelFinishId: root.userData?.privacyPanelFinishId || null,

        subKey: null,
        subName: null,
        subMaterialCode: null,
      });

      emitBOM();

      return true;
    }

    function createKoncisaPlusAssemblyGroup(config = {}) {
      const now = Date.now();

      const groupId = config.groupId || `KONCISA_${now}_${Math.random().toString(16).slice(2, 8)}`;

      const groupName = config.groupName || 'Koncisa Plus';

      const group = new THREE.Group();

      group.name = groupName;

      group.userData = {
        isPartRoot: true,
        excludeFromBOM: true,

        kind: 'KONCISA_PLUS_ASSEMBLY',
        type: 'koncisa-plus',
        line: 'KONCISA.PLUS',

        code: groupId,
        codigoPT: groupId,
        instanceId: groupId,

        groupId,
        groupName,

        name: groupName,
        description: groupName,
        config,

        meta: {
          category: 'ensamble',
          line: 'KONCISA.PLUS',
        },
      };

      scene.add(group);

      // OJO:
      // No agregar a parts porque si no aparece en el BOM como producto $0.
      // parts.push({ code: groupId, obj: group });

      pickables.push(group);

      setActivePart(group);
      emitBOM();

      return group;
    }

    function createMilaAssemblyGroup(config = {}) {
      const now = Date.now();

      const groupId = config.groupId || `MILA_${now}_${Math.random().toString(16).slice(2, 8)}`;

      const groupName = config.groupName || 'Mila';

      const group = new THREE.Group();

      group.name = groupName;

      group.userData = {
        isPartRoot: true,
        excludeFromBOM: true,

        kind: config.kind || 'MILA_ASSEMBLY',
        type: config.type || 'mila',
        line: config.line || 'MILA',

        code: groupId,
        codigoPT: groupId,
        instanceId: groupId,

        groupId,
        groupName,

        name: groupName,
        description: groupName,
        config,

        meta: {
          category: 'ensamble',
          line: 'MILA',
        },
      };

      scene.add(group);

      pickables.push(group);

      if (!config?.silentCreation) {
        setActivePart(group);
        emitBOM();
      }

      return group;
    }

    onApiReady?.({
      addPart,
      addPartFromGlb,
      addSurface,
      addKoncisaPrivacyPanel,
      updateActivePrivacyPanelFinish,
      createKoncisaPlusAssemblyGroup,
      createMilaAssemblyGroup,
      getActivePart: () => activePart,
      getSelectedObject: () => activePart,
      selectObject: (obj) => {
        if (obj) setActivePart(obj);
      },
      addCatalogItem,
      addClipboardCatalogItem: async (kind, code) => {
        const normalizedKind = String(kind || '').toUpperCase();
        const previousLength = parts.length;
        const creators = {
          TYPOLOGY: addTypology,
          CHAIR: addChair,
          ARES: addAres,
          PLANT: addPlant,
          OFFICE_ACCESSORY: addOfficeAccessory,
          MEPAL_SALUD: addMepalSalud,
          MEPAL_TEK_SOCIAL: addMepalTekSocial,
          CLAK: addClak,
          EDUK: addEduk,
          KUO_AV: addKuoAV,
          KUO_AV_ASSEMBLY: addKuoAV,
        };
        const creator = creators[normalizedKind] || addCatalogItem;
        await creator(code);
        return parts.slice(previousLength).findLast(({ obj }) => obj)?.obj || null;
      },
      addExternalGlbPart,
      addKoncisaLeaderCredenza: addExternalGlbPart,
      addKoncisaLeaderCredenzaBeam: addExternalGlbPart,
      addNativeBlockPart,
      addKoncisaCostadoAssemblyPart,
      addKoncisaLeaderSkirtAssemblyPart,
      addNativeKoncisaDuctPart,
      toggleSnap,
      exportProject,
      loadProject,
      clearProject,
      removeActivePart,
      removePartById,
      applyFinishToActivePart,
      getPartsSnapshot2D,
      resolveSelectionTargetIds,
      setSelectedIds3D: syncSelectedIds3D,
      selectPartById,
      addTypology,
      addChair,
      addAres,
      addPlant,
      addOfficeAccessory,
      addMepalSalud,
      addMepalTekSocial,
      addClak,
      addEduk,
      addZen,
      addCritterium8,
      buildCritterium8SequenceFromSelectedFrames,
      createCritterium8SequenceFromSelection,
      createCritterium8SequenceFromFrames,
      rebuildSelectedCritterium8Sequence,
      dissolveSelectedCritterium8Sequence,
      addFrameToSelectedCritterium8Sequence,
      removeFrameFromSelectedCritterium8Sequence,
      updateSelectedCritterium8,
      updateSelectedCritterium8Tile,
      rebuildSelectedCritterium8,
      addLink,
      addKuoGo,
      addKuoAV,
      addKuoAVDoble,
      addKuoAVPantalla,
      swapLinkVariant,
      swapKuoGoVariant,
      swapKuoAVVariant,
      swapKuoAVDobleVariant,
      swapKuoAVPantallaVariant,
      swapMilaSeatVariant,
      swapMilaGiroGrommet,
      swapMilaAccessoryVariant,
      toggleMilaAccessory,
      swapMepalSaludVariant,
      swapClakVariant,
      swapAlmacenamientoVariant,
      swapEdukShelfHeight,
      swapEdukVariant,
      exportGLTF: () => exportSceneToGLTF(scene, { filename: 'proyecto.glb' }),
      exportDXF: ({ detailed2DIds = [] } = {}) => {
        const snap = getPartsSnapshot2D({ detailed2DIds });
        exportPlanToDXF({
          walls: architectureWallsRef.current,
          columns: architectureColumnsRef.current,
          openings: architectureOpeningsRef.current,
          partsSnapshot: snap,
          detailed2DIds,
          fileName: 'proyecto.dxf',
        });
      },
      setMoveAsGroup: (value) => {
        if (readOnly) return;
        moveAsGroupRef.current = value;
        setMoveAsGroup(value);
      },
      toggleMoveAsGroup: () => {
        const next = !moveAsGroupRef.current;
        moveAsGroupRef.current = next;
        setMoveAsGroup(next);
      },
      getMoveAsGroup: () => moveAsGroupRef.current,
      setDeleteAsGroup: (value) => {
        if (readOnly) return;
        deleteAsGroupRef.current = value;
        setDeleteAsGroup(value);
      },
      toggleDeleteAsGroup: () => {
        const next = !deleteAsGroupRef.current;
        deleteAsGroupRef.current = next;
        setDeleteAsGroup(next);
      },
      getDeleteAsGroup: () => deleteAsGroupRef.current,
      copySelection,
      recordCreateObjects,
      applyClipboardObjectState: (object, instruction) => {
        if (!object || !instruction?.transform) return false;
        const { position, quaternion, scale } = instruction.transform;
        if (Array.isArray(position)) object.position.fromArray(position);
        if (Array.isArray(quaternion)) object.quaternion.fromArray(quaternion);
        if (Array.isArray(scale)) object.scale.fromArray(scale);
        if (instruction.finishes) reapplyFinishesToRoot(object, instruction.finishes);
        object.updateMatrixWorld(true);
        emitBOM();
        refreshFloorAndGrid();
        return true;
      },
      selectCreatedObjects: selectCreatedHistoryObjects,
      mapPastedAssemblyIdentities: (instruction, assembly) => {
        if (!instruction || !assembly) return [];
        const available = [
          ...parts.map(({ obj }) => obj).filter((obj) => obj && isDescendantOf(obj, assembly)),
          ...getFloatingChildrenOfAssembly(assembly),
        ];
        const used = new Set();
        const sourceComponents = [
          ...(instruction.components?.internal || []),
          ...(instruction.components?.external || []),
        ];

        return sourceComponents.flatMap((source) => {
          const sourceCode =
            source.payload?.codigoPT || source.payload?.code || source.source?.code;
          const sourceKind = source.source?.kind;
          const object = available.find((candidate) => {
            if (used.has(candidate)) return false;
            const code = candidate.userData?.codigoPT || candidate.userData?.code;
            const kind = candidate.userData?.kind || candidate.userData?.type;
            return (!sourceCode || code === sourceCode) && (!sourceKind || kind === sourceKind);
          });
          if (!object) return [];
          used.add(object);
          const oldId = source.source?.relationships?.oldId;
          const newId = object.userData?.instanceId || object.uuid;
          return oldId && newId ? [[oldId, newId]] : [];
        });
      },
      removeTargetOrGroup: (target) => removeTargetOrGroup(target),
      removeSelectedOrActive: () => removeSelectedOrActive(),
      removeActiveOrGroup: () => removeTargetOrGroup(activePart),
      updateSelectedDuctType,
      updateSelectedDuctCovers,
      updateSelectedCeilingDucts,
      updateSelectedCeilingDuctSide,
      updateSelectedFloorDuctPosition,
      updateSelectedPartTransformPatch,
      movePartToXZ: (id, x, z) => movePartToXZInternal(id, x, z),
      isPartMovementLocked,
      beginMove2D: ({ ids, individualTargets = false } = {}) =>
        beginMove2D({ ids, individualTargets }),
      endMove2D,
      cancelMove2D,
      beginRotation: ({ sourceId } = {}) => beginRotation({ sourceId }),
      updateRotation: ({ deltaAngle, snapAngle = 0 } = {}) =>
        updateRotation({ deltaAngle, snapAngle }),
      endRotation,
      cancelRotation,
      rotateByDegrees: ({ sourceId, degrees } = {}) => rotateByDegrees({ sourceId, degrees }),
      getRotationState: ({ sourceId } = {}) => getRotationState({ sourceId }),
      undoHistory: () => historyManager.undo(),
      redoHistory: () => historyManager.redo(),
      canUndoHistory: () => historyManager.canUndo(),
      canRedoHistory: () => historyManager.canRedo(),
      recordDimensionHistoryAction: (action) => {
        if (!dimensionHistoryActionTypes.has(action?.type)) return null;
        return historyManager.pushAction(action);
      },
      setDimensionHistoryReplayHandler: (handler) => {
        dimensionHistoryReplayHandler = typeof handler === 'function' ? handler : null;
        return true;
      },
      selectFloor,
      updateFloorVisualOptions,
      replaceSelectedCostadoWithPedestal,
      replaceSelectedPedestalWithCostado,
      replaceSelectedCostadoWithIntegration,
      removeSelectedIntegrationAndRestoreCostado,
      rotateSelectedDuct180,
      toggleSelectedDuctSide,
    });

    function getGroupedObjects(target) {
      const groupId = target?.userData?.groupId;
      if (!groupId) return [target].filter(Boolean);

      const targetRoots = new Set();
      parts.forEach((p) => {
        const obj = p?.obj;
        if (obj?.userData?.groupId === groupId) {
          const assembly = getAssemblyObject(obj);
          if (assembly) {
            targetRoots.add(assembly);
          } else {
            const root = getRootPartObject(obj) || obj;
            targetRoots.add(root);
          }
        }
      });

      scene.children.forEach((child) => {
        if (child.userData?.groupId === groupId) {
          targetRoots.add(child);
        }
      });

      if (target) {
        const targetAssembly = getAssemblyObject(target);
        targetRoots.add(targetAssembly || target);
      }

      return Array.from(targetRoots).filter(Boolean);
    }

    function getFinishFamilyKey(obj) {
      if (!obj) return null;

      const groupId = String(obj.userData?.groupId || '').trim();
      if (!groupId) return null;

      const kind = String(obj.userData?.kind || '').trim();
      const category = String(obj.userData?.meta?.category || '')
        .trim()
        .toLowerCase();

      if (kind === 'SURFACE') return `${groupId}::SURFACE`;
      if (category) return `${groupId}::CAT:${category}`;
      if (kind) return `${groupId}::KIND:${kind}`;

      return `${groupId}::GENERIC`;
    }

    function getFinishGroupTargets(target) {
      if (!target) return [];

      const familyKey = getFinishFamilyKey(target);
      if (!familyKey) return [target];

      const targets = parts
        .map((p) => p?.obj)
        .filter(Boolean)
        .filter((obj) => getFinishFamilyKey(obj) === familyKey);

      return Array.from(new Set(targets));
    }

    function moveTargetOrGroup(target, dx = 0, dy = 0, dz = 0) {
      if (!target) return;
      if (target?.userData?.lockedMovement) return;

      const effectiveTarget = moveAsGroupRef.current
        ? getAssemblyObject(target) || target
        : getIndividualMovementRoot(target) || target;

      const targets =
        moveAsGroupRef.current && effectiveTarget?.userData?.groupId
          ? getGroupedObjects(effectiveTarget)
          : [effectiveTarget];

      targets.forEach((obj) => {
        obj.position.x += dx;
        obj.position.y += dy;
        obj.position.z += dz;
        if (obj.userData?.kind === 'KUO_AV_ASSEMBLY') {
          obj.position.y = 0;
        }
        obj.updateMatrixWorld(true);
      });

      // Mover ensambles anexos vinculados (attachments)
      const movingId = target.userData?.instanceId;
      if (movingId) {
        parts.forEach(({ obj }) => {
          if (obj && obj !== target && obj.userData?.attachment?.targetAssemblyId === movingId) {
            const off = obj.userData.attachment.offsetLocal;
            if (off) {
              obj.position.set(target.position.x + off.x, 0, target.position.z + off.z);
              obj.updateMatrixWorld(true);
            }
          }
        });
      }

      if (target.userData?.kind === 'KUO_AV_ASSEMBLY') {
        console.log('[KUO INTERACTION]');
        console.log('SYNC 2D → 3D');
        console.log(`instanceId: ${target.userData?.instanceId}`);
        console.log(
          `position: [${(target.position.x * 1000).toFixed(1)}, 0, ${(target.position.z * 1000).toFixed(1)}]`
        );
      }

      if (selectionHelper) selectionHelper.update();
      refreshFloorAndGrid();
    }

    function normalizeAngle(angle) {
      return THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
    }

    function findPartById(instanceId) {
      if (!instanceId) return activePart;
      const fromParts = parts.find(
        ({ obj }) => (obj?.userData?.instanceId || obj?.uuid) === instanceId
      )?.obj;
      if (fromParts) return fromParts;

      let found = null;
      scene.traverse((node) => {
        if (found) return;
        if (node.userData?.instanceId === instanceId || node.uuid === instanceId) {
          found = node;
        }
      });
      return found;
    }

    function resolveRotationSource(sourceId) {
      if (sourceId) return findPartById(sourceId);

      if (selectedIds3D.length) {
        const activeId = activePart?.userData?.instanceId || activePart?.uuid;
        if (activeId && selectedIds3D.includes(activeId)) return activePart;

        const selectedSource = findPartById(selectedIds3D[selectedIds3D.length - 1]);
        if (selectedSource) return selectedSource;
      }

      return activePart;
    }

    function getAssemblyRotationTargets(assembly) {
      const assemblyIds = new Set(
        [assembly.userData?.instanceId, assembly.userData?.code, assembly.uuid].filter(Boolean)
      );
      const targets = [assembly];

      parts.forEach(({ obj }) => {
        if (!obj || isDescendantOf(obj, assembly)) return;
        if (assemblyIds.has(obj.userData?.parentAssemblyId)) targets.push(obj);
      });

      return targets;
    }

    function toClipboardData(value, seen = new WeakSet()) {
      if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      if (Array.isArray(value)) {
        return value
          .map((item) => toClipboardData(item, seen))
          .filter((item) => item !== undefined);
      }
      if (typeof value !== 'object') return undefined;

      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) return undefined;
      if (seen.has(value)) return undefined;
      seen.add(value);

      const output = {};
      Object.entries(value).forEach(([key, item]) => {
        const serialized = toClipboardData(item, seen);
        if (serialized !== undefined) output[key] = serialized;
      });
      seen.delete(value);
      return output;
    }

    function collectCopyFinishes(object) {
      const finishes = toClipboardData(object.userData?.finishes || {}) || {};
      object.traverse?.((node) => {
        if (!node?.isMesh || !node.userData?.materialCode) return;
        const key = getMeshPathKey(object, node);
        finishes[key] = {
          materialCode: node.userData.materialCode,
          materialBase: object.userData?.materialBase || null,
          subName: node.name || key,
        };
      });
      return Object.keys(finishes).length ? finishes : null;
    }

    function getCopyObjectId(object) {
      return object?.userData?.instanceId || object?.uuid || null;
    }

    function serializeCopyObject(object, role = 'ROOT') {
      const assembly = getKoncisaAssemblyObject(object);
      const oldId = getCopyObjectId(object);
      const oldAssemblyId = object.userData?.parentAssemblyId || getAssemblyId(assembly);
      const partRecord = parts.find(({ obj }) => obj === object);
      const worldPosition = object.getWorldPosition(new THREE.Vector3());
      const worldQuaternion = object.getWorldQuaternion(new THREE.Quaternion());

      return {
        type: object.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' ? 'ASSEMBLY' : 'PHYSICAL_OBJECT',
        role,
        kind: object.userData?.kind || object.userData?.type || 'PART',
        code: object.userData?.code || partRecord?.code || null,
        codigoPT: object.userData?.codigoPT || partRecord?.code || null,
        configuration: toClipboardData({
          config: object.userData?.config || null,
          procedural: object.userData?.procedural || null,
          dim: object.userData?.dim || null,
          dimMm: object.userData?.dimMm || null,
          billingDimMm: object.userData?.billingDimMm || null,
          model: object.userData?.model || null,
          almacenVariant: object.userData?.almacenVariant || null,
          almacenCategory: object.userData?.almacenCategory || null,
        }),
        transform: {
          position: object.position.toArray(),
          quaternion: object.quaternion.toArray(),
          scale: object.scale.toArray(),
          worldPosition: worldPosition.toArray(),
          worldQuaternion: worldQuaternion.toArray(),
        },
        metadata: toClipboardData(object.userData) || {},
        finishes: collectCopyFinishes(object),
        relationships: {
          oldId,
          oldGroupId: object.userData?.groupId || null,
          oldAssemblyId: oldAssemblyId || null,
          oldParentId: object.parent === scene ? null : getCopyObjectId(object.parent),
          oldParentCostadoInstanceId: object.userData?.parentCostadoInstanceId || null,
        },
      };
    }

    function resolveCopyTargets() {
      const selectedObjects = Array.from(new Set(selectedIds3D))
        .map((id) => findPartById(id))
        .filter(Boolean);
      const sourceObjects = selectedObjects.length ? selectedObjects : [activePart].filter(Boolean);
      const targets = [];

      sourceObjects.forEach((source) => {
        const physicalRoot = getRootPartObject(source) || source;
        if (!physicalRoot || physicalRoot.userData?.isFloor) return;

        if (!moveAsGroupRef.current) {
          targets.push(physicalRoot);
          return;
        }

        if (assembly) {
          if (physicalRoot.userData?.groupId) {
            targets.push(...getGroupedObjects(physicalRoot));
          } else {
            targets.push(assembly);
          }
          return;
        }

        if (physicalRoot.userData?.groupId) {
          targets.push(...getGroupedObjects(physicalRoot));
        } else {
          targets.push(physicalRoot);
        }
      });

      const uniqueTargets = Array.from(new Set(targets));
      const targetSet = new Set(uniqueTargets);
      return uniqueTargets.filter((object) => {
        let ancestor = object.parent;
        while (ancestor) {
          if (targetSet.has(ancestor)) return false;
          ancestor = ancestor.parent;
        }
        return true;
      });
    }

    function serializeCopyTargets(targets) {
      const serializedItems = targets.map((object) => {
        const item = serializeCopyObject(object);
        const isAssembly = item.type === 'ASSEMBLY';
        if (!isAssembly) return item;

        item.components = {
          internal: parts
            .map(({ obj }) => obj)
            .filter((candidate) => candidate && isDescendantOf(candidate, object))
            .map((candidate) => serializeCopyObject(candidate, 'INTERNAL')),
          external: getFloatingChildrenOfAssembly(object).map((candidate) =>
            serializeCopyObject(candidate, 'EXTERNAL')
          ),
        };
        return item;
      });

      const allItems = serializedItems.flatMap((item) => [
        item,
        ...(item.components?.internal || []),
        ...(item.components?.external || []),
      ]);
      const copiedObjects = targets.flatMap((object) => [
        object,
        ...(object.userData?.kind === 'KONCISA_PLUS_ASSEMBLY'
          ? getFloatingChildrenOfAssembly(object)
          : []),
      ]);
      const bounds = new THREE.Box3();
      copiedObjects.forEach((object) => bounds.expandByObject(object));

      return {
        version: 1,
        copiedAt: Date.now(),
        anchor: bounds.isEmpty() ? [0, 0, 0] : bounds.getCenter(new THREE.Vector3()).toArray(),
        scope: moveAsGroupRef.current ? 'GROUP' : 'INDIVIDUAL',
        identityMap: {
          oldIds: Array.from(
            new Set(allItems.map((item) => item.relationships?.oldId).filter(Boolean))
          ),
          oldGroupIds: Array.from(
            new Set(allItems.map((item) => item.relationships?.oldGroupId).filter(Boolean))
          ),
          oldAssemblyIds: Array.from(
            new Set(allItems.map((item) => item.relationships?.oldAssemblyId).filter(Boolean))
          ),
        },
        items: serializedItems,
      };
    }

    function copySelection() {
      const targets = resolveCopyTargets();
      if (!targets.length) return null;
      if (targets.some((target) => getCritterium8AssemblyRoot(target))) {
        console.warn('[Critterium 8] Copy/Paste estará disponible en una fase posterior.');
        return null;
      }
      return setClipboard(serializeCopyTargets(targets));
    }

    function resolveRotationTargets({ sourceId } = {}) {
      const selectedSources = Array.from(new Set(selectedIds3D))
        .map((id) => findPartById(id))
        .filter(Boolean);
      const fallbackSource = resolveRotationSource(sourceId);
      const sourceObjects = selectedSources.length
        ? selectedSources
        : [fallbackSource].filter(Boolean);
      const targetsById = new Map();

      sourceObjects.forEach((sourceObject) => {
        const physicalRoot = getRootPartObject(sourceObject) || sourceObject;
        if (!physicalRoot) return;

        if (!moveAsGroupRef.current) {
          targetsById.set(physicalRoot.uuid, physicalRoot);
          return;
        }

        const assembly =
          getKoncisaAssemblyObject(sourceObject) || getKoncisaAssemblyObject(physicalRoot);
        if (assembly) {
          if (physicalRoot.userData?.groupId) {
            getGroupedObjects(physicalRoot).forEach((target) => {
              targetsById.set(target.uuid, target);
            });
          } else {
            getAssemblyRotationTargets(assembly).forEach((target) => {
              targetsById.set(target.uuid, target);
            });
          }
          return;
        }

        const candidates = physicalRoot.userData?.groupId
          ? getGroupedObjects(physicalRoot)
          : [physicalRoot];
        candidates.filter(Boolean).forEach((target) => {
          targetsById.set(target.uuid, target);
        });
      });

      const uniqueTargets = Array.from(targetsById.values());
      const targetSet = new Set(uniqueTargets);
      return uniqueTargets.filter((obj) => {
        let ancestor = obj.parent;
        while (ancestor) {
          if (targetSet.has(ancestor)) return false;
          ancestor = ancestor.parent;
        }
        return true;
      });
    }

    const TRANSFORM_HISTORY_EPSILON = 1e-8;

    function dedupeMovementTargets(targets) {
      const uniqueTargets = Array.from(new Set(targets.filter(Boolean)));
      const targetSet = new Set(uniqueTargets);
      return uniqueTargets.filter((object) => {
        let ancestor = object.parent;
        while (ancestor) {
          if (targetSet.has(ancestor)) return false;
          ancestor = ancestor.parent;
        }
        return true;
      });
    }

    function createMoveSnapshot(object, position = object.position) {
      return {
        id: object.userData?.instanceId || object.uuid,
        object,
        parent: object.parent || null,
        position: position.toArray(),
      };
    }

    function captureMoveState(targets) {
      return targets.map((object) => createMoveSnapshot(object));
    }

    function moveStateChanged(before, after) {
      if (before.length !== after.length) return true;
      return before.some((previous, index) => {
        const next = after[index];
        return (
          !next ||
          previous.id !== next.id ||
          previous.object !== next.object ||
          previous.parent !== next.parent ||
          previous.position.some(
            (value, component) =>
              Math.abs(value - next.position[component]) > TRANSFORM_HISTORY_EPSILON
          )
        );
      });
    }

    function pushMoveHistory(before, after) {
      if (historyManager.isReplaying || !moveStateChanged(before, after)) return false;
      historyManager.pushAction({
        type: HISTORY_ACTION_TYPES.MOVE,
        targets: before.map(({ id }) => id),
        before,
        after,
      });
      return true;
    }

    function beginMove2D({ ids = [], individualTargets = false } = {}) {
      const sourceTargets = Array.from(new Set(ids))
        .map((id) => findPartById(id))
        .filter(Boolean);
      if (!sourceTargets.length) return false;

      const actualTargets =
        !individualTargets && sourceTargets.length === 1 && moveAsGroupRef.current
          ? getGroupedObjects(sourceTargets[0])
          : sourceTargets;
      const targets = dedupeMovementTargets(actualTargets);
      if (!targets.length) return false;

      targets.forEach((obj) => {
        if (obj.userData?.kind === 'KUO_AV_ASSEMBLY') {
          if (obj.userData.attachment) {
            obj.userData.attachment = null;
          }
          console.log('[KUO INTERACTION]');
          console.log('2D DRAG START');
          console.log(`instanceId: ${obj.userData?.instanceId}`);
        }
      });

      moveSession2D = {
        targets,
        before: captureMoveState(targets),
      };
      return true;
    }

    function endMove2D() {
      if (!moveSession2D) return false;
      const { targets, before } = moveSession2D;
      snapActivePart();
      const after = captureMoveState(targets);
      moveSession2D = null;
      pushMoveHistory(before, after);

      targets.forEach((obj) => {
        if (obj.userData?.kind === 'KUO_AV_ASSEMBLY') {
          console.log('[KUO INTERACTION]');
          console.log('DRAG END');
          console.log(`instanceId: ${obj.userData?.instanceId}`);
          console.log(
            `position: [${(obj.position.x * 1000).toFixed(1)}, 0, ${(obj.position.z * 1000).toFixed(1)}]`
          );
        }
      });
      return true;
    }

    function cancelMove2D() {
      if (!moveSession2D) return false;
      moveSession2D = null;
      return true;
    }

    function applyMoveHistoryState(snapshots) {
      snapshots.forEach(({ object, parent, position }) => {
        if (!object || object.parent !== parent) return;
        object.position.fromArray(position);
        object.updateMatrixWorld(true);
      });

      if (selectionHelper) selectionHelper.update();
      additionalSelectionHelpers.forEach((helper) => helper.update());
      updateRotationHandle();
      refreshFloorAndGrid();
    }

    function resolveUserDeletionRoots(targets) {
      const roots = [];

      targets.forEach(({ obj, isAssembly }) => {
        if (isAssembly) {
          roots.push(obj, ...getFloatingChildrenOfAssembly(obj));
          return;
        }

        const expandedTargets =
          deleteAsGroupRef.current && obj?.userData?.groupId ? getGroupedObjects(obj) : [obj];
        roots.push(...expandedTargets);
      });

      const uniqueRoots = Array.from(new Set(roots.filter(Boolean)));
      const rootSet = new Set(uniqueRoots);
      return uniqueRoots.filter((object) => {
        let ancestor = object.parent;
        while (ancestor) {
          if (rootSet.has(ancestor)) return false;
          ancestor = ancestor.parent;
        }
        return true;
      });
    }

    function captureDeletedObject(object) {
      const parent = object.parent || null;
      return {
        id: object.userData?.instanceId || object.uuid,
        object,
        parent,
        parentIndex: parent?.children?.indexOf(object) ?? -1,
        position: object.position.toArray(),
        quaternion: object.quaternion.toArray(),
        scale: object.scale.toArray(),
        partRecords: parts
          .map((record, index) =>
            record?.obj && (record.obj === object || isDescendantOf(record.obj, object))
              ? { record, index }
              : null
          )
          .filter(Boolean),
        pickableRecords: pickables
          .map((pickable, index) =>
            pickable && (pickable === object || isDescendantOf(pickable, object))
              ? { object: pickable, index }
              : null
          )
          .filter(Boolean),
      };
    }

    function restoreArrayEntry(array, value, index) {
      if (array.includes(value)) return;
      const insertionIndex = Math.max(0, Math.min(Number(index) || 0, array.length));
      array.splice(insertionIndex, 0, value);
    }

    function restoreDeletedObjects(deletedObjects) {
      [...deletedObjects]
        .sort((a, b) => a.parentIndex - b.parentIndex)
        .forEach(({ object, parent, parentIndex, position, quaternion, scale }) => {
          if (!object || !parent) return;

          if (object.parent !== parent) parent.add(object);
          const currentIndex = parent.children.indexOf(object);
          if (currentIndex >= 0 && parentIndex >= 0 && currentIndex !== parentIndex) {
            parent.children.splice(currentIndex, 1);
            parent.children.splice(Math.min(parentIndex, parent.children.length), 0, object);
          }

          object.position.fromArray(position);
          object.quaternion.fromArray(quaternion).normalize();
          object.scale.fromArray(scale);
          object.updateMatrixWorld(true);
        });

      deletedObjects
        .flatMap(({ partRecords }) => partRecords)
        .sort((a, b) => a.index - b.index)
        .forEach(({ record, index }) => restoreArrayEntry(parts, record, index));

      deletedObjects
        .flatMap(({ pickableRecords }) => pickableRecords)
        .sort((a, b) => a.index - b.index)
        .forEach(({ object, index }) => restoreArrayEntry(pickables, object, index));

      emitBOM();
      updateRotationHandle();
      refreshFloorAndGrid();
    }

    function disconnectDeletedObjects(deletedObjects) {
      let removedAny = false;
      deletedObjects.forEach(({ object }) => {
        if (!object || (!object.parent && !parts.some(({ obj }) => obj === object))) return;
        const removed = removePartObject(object, {
          skipFloatingChildren: true,
          disposeResources: false,
          exactTarget: true,
        });
        if (removed) removedAny = true;
      });

      if (removedAny) {
        clearSelectionAfterRemoval();
        refreshFloorAndGrid();
      }
      return removedAny;
    }

    function selectCreatedHistoryObjects(objects = []) {
      const created = Array.from(new Set(objects)).filter(
        (object) => object && isConnectedToScene(object)
      );
      const ids = created
        .map((object) => object.userData?.instanceId || object.uuid)
        .filter(Boolean);
      if (!ids.length) return false;
      syncSelectedIds3D(ids);
      setActivePart(created[created.length - 1], { targetIds: ids });
      return true;
    }

    function captureCreatedObjects(objects = []) {
      const expanded = objects.flatMap((object) =>
        object?.userData?.kind === 'KONCISA_PLUS_ASSEMBLY'
          ? [object, ...getFloatingChildrenOfAssembly(object)]
          : [object]
      );
      const roots = Array.from(new Set(expanded.filter(Boolean))).filter(
        (object, _index, all) =>
          !all.some((candidate) => candidate !== object && isDescendantOf(object, candidate))
      );
      return roots.map(captureDeletedObject);
    }

    function recordCreateObjects({ objects = [], identityMap = new Map() } = {}) {
      if (historyManager.isReplaying || !objects.length) return null;
      const createdObjects = captureCreatedObjects(objects);
      if (!createdObjects.length) return null;
      return historyManager.pushAction(
        new CreateObjectsCommand({ createdObjects, selectionObjects: objects, identityMap })
      );
    }

    function isConnectedToScene(object) {
      let current = object;
      while (current) {
        if (current === scene) return true;
        current = current.parent;
      }
      return false;
    }

    function discardHistoryAction(action) {
      const retainedObjects =
        action.type === HISTORY_ACTION_TYPES.DELETE
          ? action.deletedObjects
          : action.type === HISTORY_ACTION_TYPES.CREATE_OBJECTS
            ? action.createdObjects
            : null;
      if (!retainedObjects) return;
      retainedObjects.forEach(({ object }) => {
        if (!object || isConnectedToScene(object)) return;
        const remainsRegistered = parts.some(
          ({ obj }) => obj === object || isDescendantOf(obj, object)
        );
        if (!remainsRegistered) disposeObject3D(object);
      });
    }

    function createRotationSnapshot({ obj, parent, position, quaternion, scale }) {
      return {
        id: obj.userData?.instanceId || obj.uuid,
        object: obj,
        parent,
        position: position.toArray(),
        quaternion: quaternion.toArray(),
        scale: scale.toArray(),
      };
    }

    function captureRotationState(targets, useInitialState = false) {
      return targets.map((target) =>
        createRotationSnapshot({
          obj: target.obj,
          parent: target.parent,
          position: useInitialState ? target.localPosition : target.obj.position,
          quaternion: useInitialState ? target.localQuaternion : target.obj.quaternion,
          scale: useInitialState ? target.localScale : target.obj.scale,
        })
      );
    }

    function rotationStateChanged(before, after) {
      if (before.length !== after.length) return true;

      return before.some((previous, index) => {
        const next = after[index];
        if (
          !next ||
          previous.id !== next.id ||
          previous.object !== next.object ||
          previous.parent !== next.parent
        ) {
          return true;
        }

        const positionChanged = previous.position.some(
          (value, component) =>
            Math.abs(value - next.position[component]) > TRANSFORM_HISTORY_EPSILON
        );
        const scaleChanged = previous.scale.some(
          (value, component) => Math.abs(value - next.scale[component]) > TRANSFORM_HISTORY_EPSILON
        );
        const quaternionDot = previous.quaternion.reduce(
          (sum, value, component) => sum + value * next.quaternion[component],
          0
        );

        return (
          positionChanged ||
          scaleChanged ||
          1 - Math.min(1, Math.abs(quaternionDot)) > TRANSFORM_HISTORY_EPSILON
        );
      });
    }

    function applyRotationHistoryState(snapshots) {
      snapshots.forEach(({ object, parent, position, quaternion, scale }) => {
        if (!object || object.parent !== parent) return;
        object.position.fromArray(position);
        object.quaternion.fromArray(quaternion).normalize();
        object.scale.fromArray(scale);
        object.updateMatrixWorld(true);
      });

      if (selectionHelper) selectionHelper.update();
      additionalSelectionHelpers.forEach((helper) => helper.update());
      updateRotationHandle();
      refreshFloorAndGrid();
    }

    function replayHistoryAction(action, direction) {
      const state = direction === 'undo' ? action.before : action.after;
      if (action.type === HISTORY_ACTION_TYPES.ROTATE) {
        applyRotationHistoryState(state);
      } else if (action.type === HISTORY_ACTION_TYPES.MOVE) {
        applyMoveHistoryState(state);
      } else if (action.type === HISTORY_ACTION_TYPES.DELETE) {
        if (direction === 'undo') restoreDeletedObjects(action.deletedObjects || []);
        else disconnectDeletedObjects(action.deletedObjects || []);
      } else if (action.type === HISTORY_ACTION_TYPES.CREATE_OBJECTS) {
        if (direction === 'undo') {
          disconnectDeletedObjects(action.createdObjects || []);
        } else {
          restoreDeletedObjects(action.createdObjects || []);
          selectCreatedHistoryObjects(action.selectionObjects || []);
        }
      } else if (action.type === HISTORY_ACTION_TYPES.CRITTERIUM_8_CONFIG_CHANGE) {
        const assembly = findPartById(action.instanceId);
        return rebuildCritterium8Assembly(assembly, state || {}, {
          recordHistory: false,
          preferredSlotId: null,
        }).then((result) => {
          if (!result?.success)
            throw new Error(result?.reason || 'CRITTERIUM8_HISTORY_REBUILD_FAILED');
          return result;
        });
      } else if (
        action.type === HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_CREATE ||
        action.type === HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_REBUILD ||
        action.type === HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_DISSOLVE ||
        action.type === HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_ADD_FRAME ||
        action.type === HISTORY_ACTION_TYPES.CRITTERIUM_8_SEQUENCE_REMOVE_FRAME
      ) {
        applyCritterium8SequenceHistoryState(state || {});
      } else if (dimensionHistoryActionTypes.has(action.type)) {
        if (typeof dimensionHistoryReplayHandler !== 'function') {
          throw new Error('Dimension2D history replay handler is not registered.');
        }
        return dimensionHistoryReplayHandler(action, direction);
      }
    }

    function beginRotation({ sourceId } = {}) {
      const sourceObject = resolveRotationSource(sourceId);
      const source = getRootPartObject(sourceObject) || sourceObject;
      if (
        !source ||
        source.userData?.isFloor ||
        source.userData?.lockedMovement ||
        source.userData?.lockedRotation
      ) {
        return null;
      }

      const targets = resolveRotationTargets({ sourceId });
      if (!targets.length || targets.some((obj) => obj.userData?.lockedRotation)) return null;

      const box = new THREE.Box3();
      targets.forEach((obj) => {
        obj.updateMatrixWorld(true);
        box.expandByObject(obj);
      });
      if (box.isEmpty()) return null;

      const pivot = box.getCenter(new THREE.Vector3());
      const boundsSize = box.getSize(new THREE.Vector3());
      const sourceWorldQuaternion = source.getWorldQuaternion(new THREE.Quaternion());
      const sessionTargets = targets.map((obj) => ({
        obj,
        parent: obj.parent || null,
        worldPosition: obj.getWorldPosition(new THREE.Vector3()),
        worldQuaternion: obj.getWorldQuaternion(new THREE.Quaternion()),
        localPosition: obj.position.clone(),
        localQuaternion: obj.quaternion.clone(),
        localScale: obj.scale.clone(),
      }));

      rotationSession = {
        source,
        sourceId: source.userData?.instanceId || source.uuid,
        pivot,
        boundsWidth: boundsSize.x,
        boundsDepth: boundsSize.z,
        appliedAngle: 0,
        initialSourceAngle: new THREE.Euler().setFromQuaternion(sourceWorldQuaternion, 'YXZ').y,
        targets: sessionTargets,
        historyBefore: captureRotationState(sessionTargets, true),
      };

      return getRotationState();
    }

    function applyRotationDelta(deltaAngle) {
      if (!rotationSession) return false;
      const angle = normalizeAngle(Number(deltaAngle) || 0);
      const { pivot } = rotationSession;
      const deltaQuaternion = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        angle
      );

      rotationSession.targets.forEach(({ obj, parent, worldPosition, worldQuaternion }) => {
        const nextWorld = worldPosition
          .clone()
          .sub(pivot)
          .applyQuaternion(deltaQuaternion)
          .add(pivot);
        const desiredWorldQuaternion = worldQuaternion.clone().premultiply(deltaQuaternion);

        if (parent) {
          parent.updateMatrixWorld(true);
          obj.position.copy(parent.worldToLocal(nextWorld));
          const inverseParentWorldQuaternion = parent
            .getWorldQuaternion(new THREE.Quaternion())
            .invert();
          obj.quaternion.copy(inverseParentWorldQuaternion.multiply(desiredWorldQuaternion));
        } else {
          obj.position.copy(nextWorld);
          obj.quaternion.copy(desiredWorldQuaternion);
        }
        obj.quaternion.normalize();
        obj.updateMatrixWorld(true);
      });

      rotationSession.appliedAngle = angle;
      if (selectionHelper) selectionHelper.update();
      updateRotationHandle();
      refreshFloorAndGrid();
      return true;
    }

    function updateRotation({ deltaAngle, snapAngle = 0 } = {}) {
      if (!rotationSession) return false;
      let nextAngle = Number(deltaAngle);
      if (!Number.isFinite(nextAngle)) return false;
      const snap = Number(snapAngle);
      if (Number.isFinite(snap) && snap > 0) nextAngle = Math.round(nextAngle / snap) * snap;
      return applyRotationDelta(nextAngle);
    }

    function endRotation() {
      if (!rotationSession) return false;
      const targets = rotationSession.targets || [];
      const before = rotationSession.historyBefore;
      const after = captureRotationState(rotationSession.targets);
      rotationSession = null;

      if (!historyManager.isReplaying && rotationStateChanged(before, after)) {
        historyManager.pushAction({
          type: HISTORY_ACTION_TYPES.ROTATE,
          targets: before.map(({ id }) => id),
          before,
          after,
        });
      }

      targets.forEach(({ obj }) => {
        if (obj?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY') {
          checkAndApplyKuoAVLUnion(obj);
        }
      });

      updateRotationHandle();
      return true;
    }

    function cancelRotation() {
      if (!rotationSession) return false;
      rotationSession.targets.forEach(({ obj, parent, localPosition, localQuaternion }) => {
        if (obj.parent !== parent) return;
        obj.position.copy(localPosition);
        obj.quaternion.copy(localQuaternion);
        obj.updateMatrixWorld(true);
      });
      rotationSession = null;
      isRotating3D = false;
      controls.enabled = true;
      if (selectionHelper) selectionHelper.update();
      updateRotationHandle();
      refreshFloorAndGrid();
      return true;
    }

    function rotateByDegrees({ sourceId, degrees } = {}) {
      const radians = THREE.MathUtils.degToRad(Number(degrees));
      if (!Number.isFinite(radians) || !beginRotation({ sourceId })) return false;
      applyRotationDelta(radians);
      endRotation();
      if (activePart?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY') {
        checkAndApplyKuoAVLUnion(activePart);
      }
      return true;
    }

    function getRotationState({ sourceId } = {}) {
      if (!rotationSession) {
        const sourceObject = resolveRotationSource(sourceId);
        const source = getRootPartObject(sourceObject) || sourceObject;
        if (!source) return null;
        const targets = resolveRotationTargets({ sourceId });
        const box = new THREE.Box3();
        targets.forEach((obj) => box.expandByObject(obj));
        if (box.isEmpty()) return null;
        const pivot = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const worldQuaternion = source.getWorldQuaternion(new THREE.Quaternion());
        return {
          sourceId: source.userData?.instanceId || source.uuid,
          pivotX: pivot.x,
          pivotZ: pivot.z,
          boundsWidth: size.x,
          boundsDepth: size.z,
          angle: new THREE.Euler().setFromQuaternion(worldQuaternion, 'YXZ').y,
          deltaAngle: 0,
        };
      }
      return {
        sourceId: rotationSession.sourceId,
        pivotX: rotationSession.pivot.x,
        pivotZ: rotationSession.pivot.z,
        boundsWidth: rotationSession.boundsWidth,
        boundsDepth: rotationSession.boundsDepth,
        angle: normalizeAngle(rotationSession.initialSourceAngle + rotationSession.appliedAngle),
        deltaAngle: rotationSession.appliedAngle,
      };
    }

    cancelRotationRef.current = cancelRotation;

    //eliminar por grupo
    function removeTargetOrGroup(target) {
      if (!target) return false;

      const effectiveTarget = deleteAsGroupRef.current
        ? getRootPartObject(target) || target
        : getIndividualMovementRoot(target) || target;
      const targets =
        deleteAsGroupRef.current && effectiveTarget?.userData?.groupId
          ? getGroupedObjects(effectiveTarget)
          : [effectiveTarget];

      let removedAny = false;

      targets.forEach((obj) => {
        const ok = removePartObject(obj, { exactTarget: !deleteAsGroupRef.current });
        if (ok) removedAny = true;
      });

      return removedAny;
    }

    function getDeletionTargets(ids) {
      const selectedObjects = Array.from(new Set(ids || []))
        .map((id) => findPartById(id))
        .filter(Boolean);
      let sourceObjects = selectedObjects.length ? selectedObjects : [activePart].filter(Boolean);

      if (!deleteAsGroupRef.current && sourceObjects.length === 1 && activeEditablePart) {
        const selectedAssembly = getAssemblyObject(sourceObjects[0]);
        const editableAssembly = getAssemblyObject(activeEditablePart);
        if (selectedAssembly && selectedAssembly === editableAssembly) {
          sourceObjects = [activeEditablePart];
        }
      }

      const targetsByKey = new Map();

      sourceObjects.forEach((obj) => {
        const physicalRoot = deleteAsGroupRef.current
          ? getRootPartObject(obj) || obj
          : getIndividualMovementRoot(obj) || obj;

        if (deleteAsGroupRef.current) {
          const assembly = getKoncisaAssemblyObject(obj) || getKoncisaAssemblyObject(physicalRoot);
          const groupId = assembly?.userData?.groupId || physicalRoot.userData?.groupId;
          if (groupId) {
            getGroupedObjects(physicalRoot).forEach((groupObj) => {
              const asm = getAssemblyObject(groupObj);
              const targetNode = asm || groupObj;
              targetsByKey.set('groupItem:' + targetNode.uuid, {
                obj: targetNode,
                isAssembly: !!asm,
              });
            });
            return;
          }
          if (assembly) {
            targetsByKey.set('assembly:' + assembly.uuid, { obj: assembly, isAssembly: true });
            return;
          }
        }

        const physicalAssembly = getAssemblyObject(physicalRoot);
        targetsByKey.set('part:' + physicalRoot.uuid, {
          obj: physicalRoot,
          isAssembly: physicalAssembly === physicalRoot,
        });
      });

      const targets = Array.from(targetsByKey.values());
      return targets.filter(
        ({ obj }, index) =>
          !targets.some(
            ({ obj: candidate }, candidateIndex) =>
              candidateIndex !== index && isDescendantOf(obj, candidate)
          )
      );
    }

    function clearSelectionAfterRemoval() {
      selectedIds3D = [];
      activePart = null;
      activeEditablePart = null;
      activeSubMesh = null;

      if (selectionHelper) {
        scene.remove(selectionHelper);
        selectionHelper = null;
      }

      clearAdditionalSelectionHelpers();
      updateRotationHandle();
      onSelectionChange?.(null);
    }

    function removeSelectedOrActive() {
      if (readOnly) return false;

      const targets = getDeletionTargets(selectedIds3D);
      if (!targets.length) return false;

      if (
        targets.length > 1 &&
        !window.confirm('\u00bfDesea eliminar ' + targets.length + ' elementos seleccionados\u003f')
      ) {
        return false;
      }

      const deletionRoots = resolveUserDeletionRoots(targets);
      const deletedObjects = deletionRoots.map((object) => captureDeletedObject(object));
      const removedAny = disconnectDeletedObjects(deletedObjects);

      if (removedAny) {
        historyManager.pushAction({
          type: HISTORY_ACTION_TYPES.DELETE,
          deletedObjects,
        });
      }

      return removedAny;
    }

    async function replaceSelectedCostadoWithPedestal({ placementSide = 'RIGHT' } = {}) {
      if (readOnly) return false;
      if (!activePart) return false;

      const costadoObj = getActiveEditablePartObject();

      const isCostado =
        costadoObj?.userData?.kind === 'costado' ||
        costadoObj?.userData?.meta?.category === 'costados';

      if (!isCostado) {
        console.warn('La pieza activa no es un costado.');
        return false;
      }

      const parentGroup =
        costadoObj.parent?.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' ? costadoObj.parent : null;

      const groupId =
        costadoObj.userData?.groupId ||
        parentGroup?.userData?.instanceId ||
        parentGroup?.userData?.groupId ||
        null;

      const groupName =
        costadoObj.userData?.groupName ||
        parentGroup?.userData?.name ||
        parentGroup?.userData?.groupName ||
        null;

      const basePos = costadoObj.position.clone();
      const baseRot = costadoObj.rotation.clone();

      const replaceKey =
        costadoObj.userData?.meta?.replaceKey || costadoObj.userData?.replaceKey || null;

      const moduleIndex =
        costadoObj.userData?.meta?.moduleIndex ?? costadoObj.userData?.moduleIndex ?? null;

      const replaceZone =
        costadoObj.userData?.meta?.replaceZone || costadoObj.userData?.replaceZone || null;

      const pedestalSetId = `PEDSET_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

      const originalVigaSnapshots = await replaceVigasWithPedestalReinforcement({
        parentGroup,
        moduleIndex,
        pedestalSetId,
      });

      const originalCostadoSnapshot = {
        type: 'costado',
        line: costadoObj.userData?.line || 'KONCISA.PLUS',
        code: costadoObj.userData?.code || costadoObj.userData?.codigoPT || null,
        codigoPT: costadoObj.userData?.codigoPT || costadoObj.userData?.code || null,
        logicalCode: costadoObj.userData?.logicalCode || null,
        name: costadoObj.name || 'costado',
        description: costadoObj.userData?.description || null,

        groupId,
        groupName,

        position: {
          x: basePos.x * 1000,
          y: basePos.y * 1000,
          z: basePos.z * 1000,
        },

        rotation: {
          x: baseRot.x,
          y: baseRot.y,
          z: baseRot.z,
        },

        model: {
          kind: 'glb',
          src:
            costadoObj.userData?.modelSrc ||
            costadoObj.userData?.meta?.modelSrc ||
            costadoObj.userData?.model?.src ||
            null,
        },

        meta: {
          ...(costadoObj.userData?.meta || {}),
          category: 'costados',
          moduleIndex,
          replaceZone,
          replaceKey,
          restoredFromPedestal: true,
        },
      };

      const sides = getPedestalSidesForCostado({
        costado: costadoObj,
        placementSide,
      });

      let firstPedestalObj = null;

      for (const side of sides) {
        const pedestal = resolvePedestalFromCostado({
          costado: costadoObj,
          placementSide: side,
        });

        const offset = pedestal.offsetMm || {};

        const pedestalObj = await addExternalGlbPart({
          type: 'pedestal',
          line: 'KONCISA.PLUS',
          code: pedestal.code,
          logicalCode: pedestal.logicalCode,
          name: pedestal.name,

          groupId,
          groupName,
          parentGroup,

          position: {
            x: basePos.x * 1000 + Number(offset.x || 0),
            y: basePos.y * 1000 + Number(offset.y || 0),
            z: basePos.z * 1000 + Number(offset.z || 0),
          },

          rotation: {
            x: baseRot.x,
            y: baseRot.y + Number(offset.rotY || 0),
            z: baseRot.z,
          },

          model: {
            kind: 'glb',
            src: pedestal.modelSrc,
          },

          meta: {
            category: 'pedestales',
            modelCode: pedestal.modelCode,
            replaceCostado: true,
            replaceKey,
            replaceZone,
            moduleIndex,
            placementSide: pedestal.placementSide,

            pedestalSetId,

            originalCostadoSnapshot,
            originalVigaSnapshots,

            originalCostadoCode: costadoObj.userData?.code || null,
            originalCostadoInstanceId: costadoObj.userData?.instanceId || null,
            affectsViga: true,
          },
        });

        if (!firstPedestalObj && pedestalObj) {
          firstPedestalObj = pedestalObj;
        }
      }

      console.log('PEDESTAL BASE PARA SOPORTE DUCTO:', firstPedestalObj);

      if (firstPedestalObj) {
        await addDuctSupportForPedestalSet({
          parentGroup,
          basePedestalObj: firstPedestalObj,
          tipoPuesto:
            costadoObj.userData?.meta?.tipoPuesto || costadoObj.userData?.tipoPuesto || 'sencillo',
          replaceZone,
          moduleIndex,
          pedestalSetId,
        });
      } else {
        console.warn('No se pudo crear soporte ducto: no se encontró pedestal base.');
      }

      removePartObject(costadoObj);

      emitBOM();
      refreshFloorAndGrid();

      return true;
    }

    async function replaceSelectedPedestalWithCostado() {
      if (readOnly) return false;
      if (!activePart) return false;

      const pedestalObj = getActiveEditablePartObject();

      const isPedestal =
        pedestalObj?.userData?.kind === 'pedestal' ||
        pedestalObj?.userData?.meta?.category === 'pedestales';

      if (!isPedestal) {
        console.warn('La pieza activa no es un pedestal.');
        return false;
      }

      const meta = pedestalObj.userData?.meta || {};
      const snapshot = meta.originalCostadoSnapshot || null;

      if (!snapshot?.code || !snapshot?.model?.src) {
        alert('No se puede restaurar el costado: falta información del costado original.');
        return false;
      }

      const parentGroup =
        pedestalObj.parent?.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' ? pedestalObj.parent : null;

      const pedestalSetId = meta.pedestalSetId || null;
      const originalVigaSnapshots = meta.originalVigaSnapshots || [];

      const pedestalsToRemove = [];

      if (parentGroup && pedestalSetId) {
        parentGroup.traverse((node) => {
          if (!node) return;

          const isSamePedestal =
            (node.userData?.kind === 'pedestal' ||
              node.userData?.meta?.category === 'pedestales') &&
            node.userData?.meta?.pedestalSetId === pedestalSetId;

          if (isSamePedestal) {
            pedestalsToRemove.push(node);
          }
        });
      } else {
        pedestalsToRemove.push(pedestalObj);
      }

      await addExternalGlbPart({
        ...snapshot,
        type: 'costado',
        parentGroup,
        groupId:
          snapshot.groupId ||
          pedestalObj.userData?.groupId ||
          parentGroup?.userData?.instanceId ||
          null,
        groupName:
          snapshot.groupName ||
          pedestalObj.userData?.groupName ||
          parentGroup?.userData?.name ||
          null,
      });

      await restoreVigasFromPedestalReinforcement({
        parentGroup,
        pedestalSetId,
        originalVigaSnapshots,
      });

      removeDuctSupportsByPedestalSet({
        parentGroup,
        pedestalSetId,
      });

      for (const obj of pedestalsToRemove) {
        removePartObject(obj);
      }

      emitBOM();
      refreshFloorAndGrid();

      return true;
    }

    async function replaceSelectedCostadoWithIntegration({
      side = null,
      widthMm = null,
      depthMm = null,
      cableAccessType = 'grommet',
      finishCode = null,
      thickMm = null,
      variant = '',
    } = {}) {
      if (readOnly) return false;
      if (!activePart) return false;

      const costadoObj = getActiveEditablePartObject();

      const isCostado =
        costadoObj?.userData?.kind === 'costado' ||
        costadoObj?.userData?.meta?.category === 'costados';

      if (!isCostado) {
        alert('Selecciona un costado terminal de un puesto doble.');
        return false;
      }

      const meta = costadoObj.userData?.meta || {};

      const tipoPuesto = String(meta.tipoPuesto || costadoObj.userData?.tipoPuesto || '')
        .trim()
        .toLowerCase();

      const replaceZone = String(
        meta.replaceZone || costadoObj.userData?.replaceZone || side || 'RIGHT'
      )
        .trim()
        .toUpperCase();

      const isTerminal =
        String(meta.tipo || costadoObj.userData?.tipo || '').toLowerCase() === 'terminal' ||
        replaceZone === 'LEFT' ||
        replaceZone === 'RIGHT' ||
        meta.isTerminal === true ||
        costadoObj.userData?.isTerminal === true;

      if (tipoPuesto !== 'doble' || !isTerminal) {
        alert(
          'El puesto de integración solo se puede agregar sobre costados terminales de un puesto doble.'
        );
        return false;
      }

      if (!canAttachKoncisaIntegrationToPart(costadoObj)) {
        console.warn('[Integración] Validación flexible falló, se continúa por validación local.', {
          tipoPuesto,
          replaceZone,
          meta,
        });
      }

      const parentGroup =
        costadoObj.parent?.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' ? costadoObj.parent : null;

      const groupId =
        costadoObj.userData?.groupId ||
        parentGroup?.userData?.instanceId ||
        parentGroup?.userData?.groupId ||
        null;

      const groupName =
        costadoObj.userData?.groupName ||
        parentGroup?.userData?.name ||
        parentGroup?.userData?.groupName ||
        null;

      const basePos = costadoObj.position.clone();
      const baseRot = costadoObj.rotation.clone();

      const moduleIndex = meta.moduleIndex ?? costadoObj.userData?.moduleIndex ?? 0;

      const integrationSide = normalizeIntegrationSide(side || replaceZone);

      const originalWidthMm =
        widthMm ||
        meta.nominalWidthMm ||
        meta.largoRealMm ||
        costadoObj.userData?.dim?.widthMm ||
        costadoObj.userData?.dimMm?.widthMm ||
        1200;

      const originalDepthMm =
        depthMm ||
        meta.depthMm ||
        meta.anchoRealMm ||
        costadoObj.userData?.dim?.depthMm ||
        costadoObj.userData?.dimMm?.depthMm ||
        600;

      const normalizedWidthMm = normalizeIntegrationWidthMm(originalWidthMm);
      const normalizedDepthMm = normalizeIntegrationDepthMm(originalDepthMm);

      const finalFinishCode =
        finishCode || meta.finishCode || costadoObj.userData?.finishCode || '22008689';

      const finalThickMm =
        thickMm ||
        meta.thickMm ||
        costadoObj.userData?.dim?.thickMm ||
        costadoObj.userData?.dimMm?.thickMm ||
        30;

      const integrationSetId = `INTSET_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

      const pkg = resolveKoncisaIntegrationPackage({
        widthMm: normalizedWidthMm,
        depthMm: normalizedDepthMm,
        side: integrationSide,
        cableAccessType,
        coupleType: 'duct',
      });

      const originalCostadoSnapshot = {
        type: 'costado',
        line: costadoObj.userData?.line || 'KONCISA.PLUS',
        code: costadoObj.userData?.code || costadoObj.userData?.codigoPT || null,
        codigoPT: costadoObj.userData?.codigoPT || costadoObj.userData?.code || null,
        logicalCode: costadoObj.userData?.logicalCode || null,
        name: costadoObj.name || 'costado',
        description: costadoObj.userData?.description || null,

        groupId,
        groupName,

        position: {
          x: basePos.x * 1000,
          y: basePos.y * 1000,
          z: basePos.z * 1000,
        },

        rotation: {
          x: baseRot.x,
          y: baseRot.y,
          z: baseRot.z,
        },

        model: {
          kind: 'glb',
          src:
            costadoObj.userData?.modelSrc ||
            costadoObj.userData?.meta?.modelSrc ||
            costadoObj.userData?.model?.src ||
            null,
        },

        meta: {
          ...(costadoObj.userData?.meta || {}),
          category: 'costados',
          moduleIndex,
          replaceZone,
          restoredFromIntegration: true,
        },
      };

      // Dirección hacia afuera del puesto doble.
      // LEFT sale hacia Z positivo; RIGHT sale hacia Z negativo.
      const outwardSign = integrationSide === 'left' ? 1 : -1;

      const mmToWorldX = (mm) => basePos.x * 1000 + Number(mm || 0);
      const _mmToWorldY = (mm) => basePos.y * 1000 + Number(mm || 0);
      const mmToWorldZ = (mm) => basePos.z * 1000 + Number(mm || 0) * outwardSign;

      // =====================================================
      // 1. Costado doble integración: reemplaza costado terminal
      // =====================================================
      const integrationLeg = pkg.doubleIntegrationLeg;

      let newIntegrationLegObj = null;

      if (integrationLeg?.modelSrc) {
        newIntegrationLegObj = await addExternalGlbPart({
          type: 'costado',
          line: 'KONCISA.PLUS',
          code: integrationLeg.codigoPT,
          logicalCode: integrationLeg.logicalCode,
          name: integrationLeg.name,

          groupId,
          groupName,
          parentGroup,

          position: {
            x: basePos.x * 1000,
            y: basePos.y * 1000,
            z: basePos.z * 1000,
          },

          rotation: {
            x: baseRot.x,
            y: baseRot.y,
            z: baseRot.z,
          },

          model: {
            kind: 'glb',
            src: integrationLeg.modelSrc,
          },

          meta: {
            category: 'costados',
            tipoPuesto: 'doble',
            tipoModulo: 'terminal',
            moduleIndex,
            replaceZone,
            integrationSetId,
            isIntegrationLeg: true,
            replacesCostado: true,
            originalCostadoSnapshot,
            originalCostadoCode: costadoObj.userData?.code || null,
          },
        });
      } else {
        newIntegrationLegObj = addNativeBlockPart({
          type: 'costado',
          line: 'KONCISA.PLUS',
          code: integrationLeg.codigoPT,
          logicalCode: integrationLeg.logicalCode,
          name: integrationLeg.name,

          groupId,
          groupName,
          parentGroup,

          dimMm: {
            widthMm: 35,
            heightMm: 710,
            depthMm: normalizedWidthMm,
          },

          position: {
            x: basePos.x * 1000,
            y: basePos.y * 1000,
            z: basePos.z * 1000,
          },

          rotation: {
            x: baseRot.x,
            y: baseRot.y,
            z: baseRot.z,
          },

          meta: {
            category: 'costados',
            tipoPuesto: 'doble',
            tipoModulo: 'terminal',
            moduleIndex,
            replaceZone,
            integrationSetId,
            isIntegrationLeg: true,
            replacesCostado: true,
            originalCostadoSnapshot,
            originalCostadoCode: costadoObj.userData?.code || null,
          },
        });
      }

      // =====================================================
      // 2. Superficie sencilla de integración
      // Reutiliza reglas normales de superficie sencilla.
      // =====================================================
      const resolvedSurface = resolveKoncisaSurfaceCodigoPT({
        billingWidthMm: normalizedWidthMm,
        billingDepthMm: normalizedDepthMm,
        shape: 'RECT',
        thicknessMm: finalThickMm,
        finishCode: finalFinishCode,
        variant,
      });

      const surfaceCenterOffsetZ = normalizedDepthMm / 2 + 8;

      const surfaceCatalogItem =
        catalogByCodeRef.current?.get?.(String(resolvedSurface.codigoPT)) || null;

      const surfaceDescription =
        surfaceCatalogItem?.ui?.title ||
        surfaceCatalogItem?.ui?.subtitle ||
        surfaceCatalogItem?.raw?.descripcion ||
        surfaceCatalogItem?.raw?.description ||
        surfaceCatalogItem?.raw?.Descripcion ||
        surfaceCatalogItem?.raw?.nombre ||
        null;

      const integrationSurfaceObj = addSurface(
        {
          widthM: normalizedWidthMm / 1000,
          depthM: normalizedDepthMm / 1000,
          thicknessM: finalThickMm / 1000,
          line: 'KONCISA.PLUS',
          codigoPT: resolvedSurface.codigoPT,
          code: resolvedSurface.codigoPT,
          logicalCode: resolvedSurface.logicalCode,

          name: surfaceDescription,
          description: surfaceDescription,

          dim: {
            widthMm: normalizedWidthMm,
            depthMm: normalizedDepthMm,
            thickMm: finalThickMm,
            canto: meta.canto || 'PVC-2MM',
          },

          position: {
            x: basePos.x,
            y: 0.71,
            z: (basePos.z * 1000 + surfaceCenterOffsetZ * outwardSign) / 1000,
          },

          groupId,
          groupName,
          parentGroup,
          edgeFinish: meta.canto || 'PVC-2MM',
        },
        {
          ...(surfaceCatalogItem || {}),
          materialBase: surfaceCatalogItem?.materialBase || 'LAMINA',
          materialCode: finalFinishCode,
          meta: {
            ...(surfaceCatalogItem?.meta || {}),
            canto: meta.canto || 'PVC-2MM',
          },
        }
      );

      if (integrationSurfaceObj) {
        integrationSurfaceObj.rotation.y = Math.PI / 2;
        integrationSurfaceObj.userData.meta = {
          ...(integrationSurfaceObj.userData.meta || {}),
          category: 'superficies',
          isIntegrationSurface: true,
          integrationSetId,
          moduleIndex,
          replaceZone,
          tipoPuesto: 'integracion',
          widthMm: normalizedWidthMm,
          depthMm: normalizedDepthMm,
          finishCode: finalFinishCode,
          thickMm: finalThickMm,
          variant,
          description: surfaceDescription,
          descripcion: surfaceDescription,
        };

        if (surfaceDescription) {
          integrationSurfaceObj.userData.name = surfaceDescription;
          integrationSurfaceObj.userData.description = surfaceDescription;
        }
      }

      // =====================================================
      // 3. Costados unitarios cuadrados de integración
      // Cantidad: 2
      // Se ubican en las esquinas exteriores de la superficie de integración.
      // =====================================================
      const unitLeg = pkg.unitLeg;

      const unitLegPositions = [
        {
          x: 0 - normalizedWidthMm / 2 + 35,
          z: normalizedDepthMm + 8,
        },
        {
          x: 0 + normalizedWidthMm / 2 - 35,
          z: normalizedDepthMm + 8,
        },
      ];

      for (const [index, pos] of unitLegPositions.entries()) {
        await addExternalGlbPart({
          type: 'costadoIntegracionUnitario',
          line: 'KONCISA.PLUS',
          code: unitLeg.codigoPT,
          logicalCode: unitLeg.logicalCode,
          name: unitLeg.name,

          groupId,
          groupName,
          parentGroup,

          position: {
            x: mmToWorldX(pos.x),
            y: basePos.y * 1000,
            z: mmToWorldZ(pos.z),
          },

          rotation: {
            x: baseRot.x,
            y: baseRot.y,
            z: baseRot.z,
          },

          model: {
            kind: 'glb',
            src: unitLeg.modelSrc,
          },

          meta: {
            category: 'costados-integracion-unitarios',
            integrationSetId,
            moduleIndex,
            replaceZone,
            index,
            tipoPuesto: 'integracion',
          },
        });
      }

      // =====================================================
      // 4. Ducto individual de integración
      // =====================================================
      const individualDuct = pkg.individualDuct;

      await addExternalGlbPart({
        type: 'ducto',
        line: 'KONCISA.PLUS',
        code: individualDuct.codigoPT,
        logicalCode: individualDuct.logicalCode,
        name: individualDuct.name,

        groupId,
        groupName,
        parentGroup,

        position: {
          x: basePos.x * 1000,
          y: basePos.y * 1000,
          z: mmToWorldZ(130),
        },

        rotation: {
          x: baseRot.x,
          y: baseRot.y + Math.PI / 2,
          z: baseRot.z,
        },

        model: {
          kind: 'glb',
          src: individualDuct.modelSrc,
        },

        meta: {
          category: 'ductos',
          integrationSetId,
          moduleIndex,
          replaceZone,
          tipoPuesto: 'integracion',
          tipoModulo: 'individual',
          tipoCanal: 'cableado',
          nominalWidthMm: normalizedWidthMm,
          ductCovers: {},
        },
      });

      // =====================================================
      // 5. Acople ducto a ducto
      // =====================================================
      const couple = pkg.couple;

      await addExternalGlbPart({
        type: 'acopleDucto',
        line: 'KONCISA.PLUS',
        code: couple.codigoPT,
        logicalCode: couple.logicalCode,
        name: couple.name,

        groupId,
        groupName,
        parentGroup,

        position: {
          x: basePos.x * 1000,
          y: basePos.y * 1000,
          z: mmToWorldZ(35),
        },

        rotation: {
          x: baseRot.x,
          y: baseRot.y + Math.PI / 2,
          z: baseRot.z,
        },

        model: {
          kind: 'glb',
          src: couple.modelSrc,
        },

        meta: {
          category: 'acoples-ducto',
          integrationSetId,
          moduleIndex,
          replaceZone,
          tipoPuesto: 'integracion',
          coupleType: 'duct',
        },
      });

      // =====================================================
      // 6. Grommet o pasacable
      // Por ahora se agrega al BOM como pieza nativa mínima.
      // Después podemos cambiarlo por geometría/modelo visual si quieres.
      // =====================================================
      const cableAccess = pkg.cableAccess;

      addNativeBlockPart({
        type: cableAccess.type === 'pasacable' ? 'pasacable' : 'grommet',
        line: 'KONCISA.PLUS',
        code: cableAccess.codigoPT,
        logicalCode: cableAccess.logicalCode,
        name: cableAccess.name,

        groupId,
        groupName,
        parentGroup,

        dimMm: {
          widthMm: 120,
          heightMm: 8,
          depthMm: 60,
        },

        position: {
          x: basePos.x * 1000,
          y: 740,
          z: mmToWorldZ(normalizedDepthMm / 2),
        },

        rotation: {
          x: 0,
          y: baseRot.y + Math.PI / 2,
          z: 0,
        },

        meta: {
          category: cableAccess.type === 'pasacable' ? 'pasacables' : 'grommets',
          integrationSetId,
          moduleIndex,
          replaceZone,
          tipoPuesto: 'integracion',
          cableAccessType: cableAccess.type,
        },
      });

      // =====================================================
      // 7. Refuerzo superficie a pedestal o integración
      // =====================================================
      const reinforcement = pkg.reinforcement;

      addNativeBlockPart({
        type: 'refuerzoSuperficieIntegracion',
        line: 'KONCISA.PLUS',
        code: reinforcement.codigoPT,
        logicalCode: reinforcement.logicalCode,
        name: reinforcement.name,

        groupId,
        groupName,
        parentGroup,

        dimMm: {
          widthMm: normalizedWidthMm === 1200 ? 640 : 940,
          heightMm: 35,
          depthMm: 155,
        },

        position: {
          x: basePos.x * 1000,
          y: 690,
          z: mmToWorldZ(normalizedDepthMm / 2),
        },

        rotation: {
          x: 0,
          y: baseRot.y + Math.PI / 2,
          z: 0,
        },

        meta: {
          category: 'refuerzos-superficie-integracion',
          integrationSetId,
          moduleIndex,
          replaceZone,
          tipoPuesto: 'integracion',
          nominalWidthMm: normalizedWidthMm,
        },
      });

      // Finalmente eliminamos el costado terminal original.
      removePartObject(costadoObj);

      if (newIntegrationLegObj) {
        setActivePart(newIntegrationLegObj);
      }

      emitBOM();
      refreshFloorAndGrid();

      return true;
    }

    async function removeSelectedIntegrationAndRestoreCostado() {
      if (readOnly) return false;
      if (!activePart) return false;

      const selectedObj = getActiveEditablePartObject();
      const selectedMeta = selectedObj?.userData?.meta || {};

      const integrationSetId =
        selectedMeta.integrationSetId || selectedObj?.userData?.integrationSetId || null;

      if (!integrationSetId) {
        alert('Selecciona una pieza que pertenezca a un puesto de integración.');
        return false;
      }

      const parentGroup =
        selectedObj.parent?.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' ? selectedObj.parent : null;

      let integrationLegObj = null;
      let originalCostadoSnapshot = null;

      const objectsToRemove = [];

      const scanRoot = parentGroup || scene;

      scanRoot.traverse((node) => {
        if (!node) return;

        const meta = node.userData?.meta || {};

        if (meta.integrationSetId !== integrationSetId) return;

        const isRootPart = node.userData?.isPartRoot === true;

        if (!isRootPart) return;

        objectsToRemove.push(node);

        if (meta.isIntegrationLeg === true || meta.replacesCostado === true) {
          integrationLegObj = node;
          originalCostadoSnapshot = meta.originalCostadoSnapshot || null;
        }
      });

      if (!objectsToRemove.length) {
        alert('No se encontraron piezas asociadas a esta integración.');
        return false;
      }

      if (!originalCostadoSnapshot) {
        const fromSelected = selectedMeta.originalCostadoSnapshot || null;

        if (fromSelected) {
          originalCostadoSnapshot = fromSelected;
        }
      }

      if (!originalCostadoSnapshot?.code || !originalCostadoSnapshot?.model?.src) {
        alert('No se puede restaurar el costado original porque falta el snapshot del costado.');
        return false;
      }

      // Restaurar costado terminal original
      const restoredObj = await addExternalGlbPart({
        ...originalCostadoSnapshot,
        type: 'costado',
        parentGroup,

        groupId:
          originalCostadoSnapshot.groupId ||
          integrationLegObj?.userData?.groupId ||
          parentGroup?.userData?.instanceId ||
          null,

        groupName:
          originalCostadoSnapshot.groupName ||
          integrationLegObj?.userData?.groupName ||
          parentGroup?.userData?.name ||
          null,
      });

      // Quitar todas las piezas de esta integración
      for (const obj of objectsToRemove) {
        removePartObject(obj);
      }

      if (restoredObj) {
        setActivePart(restoredObj);
      }

      emitBOM();
      refreshFloorAndGrid();

      return true;
    }

    function snapshotNativeBlockPart(obj) {
      if (!obj) return null;

      return {
        type: obj.userData?.kind || 'viga',
        line: obj.userData?.line || 'KONCISA.PLUS',
        code: obj.userData?.code || obj.userData?.codigoPT || null,
        codigoPT: obj.userData?.codigoPT || obj.userData?.code || null,
        logicalCode: obj.userData?.logicalCode || null,
        name: obj.userData?.description || obj.name || 'Pieza nativa',

        groupId: obj.userData?.groupId || null,
        groupName: obj.userData?.groupName || null,

        dimMm: obj.userData?.dim || obj.userData?.dimMm || null,

        position: {
          x: obj.position.x * 1000,
          y: obj.position.y * 1000,
          z: obj.position.z * 1000,
        },

        rotation: {
          x: obj.rotation.x,
          y: obj.rotation.y,
          z: obj.rotation.z,
        },

        meta: {
          ...(obj.userData?.meta || {}),
        },
      };
    }

    async function replaceVigasWithPedestalReinforcement({
      parentGroup,
      moduleIndex,
      pedestalSetId,
    } = {}) {
      if (!parentGroup || !pedestalSetId) return [];

      const vigasToReplace = [];

      parentGroup.traverse((node) => {
        if (!node) return;

        const isViga = node.userData?.kind === 'viga' || node.userData?.meta?.category === 'vigas';

        if (!isViga) return;

        const nodeModuleIndex = Number(
          node.userData?.meta?.moduleIndex ?? node.userData?.moduleIndex ?? 0
        );

        if (Number(moduleIndex || 0) !== nodeModuleIndex) return;

        if (node.userData?.meta?.replacedByPedestalSetId) return;

        vigasToReplace.push(node);
      });

      const originalVigaSnapshots = [];

      for (const vigaObj of vigasToReplace) {
        const snapshot = snapshotNativeBlockPart(vigaObj);

        if (snapshot) {
          originalVigaSnapshots.push(snapshot);
        }

        const nominalWidthMm =
          vigaObj.userData?.meta?.nominalWidthMm ||
          vigaObj.userData?.nominalWidthMm ||
          vigaObj.userData?.dim?.widthMm ||
          vigaObj.userData?.dimMm?.widthMm ||
          snapshot?.dimMm?.widthMm ||
          1200;

        const refuerzo = resolveKoncisaPedestalReinforcement({
          nominalWidthMm,
        });

        await addNativeBlockPart({
          type: 'refuerzoSuperficiePedestal',
          line: 'KONCISA.PLUS',
          code: refuerzo.code,
          logicalCode: refuerzo.logicalCode,
          name: refuerzo.name,

          groupId: vigaObj.userData?.groupId || parentGroup.userData?.groupId || null,
          groupName: vigaObj.userData?.groupName || parentGroup.userData?.groupName || null,
          parentGroup,

          dimMm: {
            widthMm: refuerzo.dimMm.widthMm,
            heightMm: refuerzo.dimMm.heightMm,
            depthMm: refuerzo.dimMm.depthMm,
          },

          position: {
            x: vigaObj.position.x * 1000,
            y: vigaObj.position.y * 1000,
            z: vigaObj.position.z * 1000,
          },

          rotation: {
            x: vigaObj.rotation.x,
            y: vigaObj.rotation.y,
            z: vigaObj.rotation.z,
          },

          meta: {
            category: 'refuerzos-superficie-pedestal',
            modelCode: refuerzo.modelCode,
            nominalWidthMm: refuerzo.nominalWidthMm,
            moduleIndex: Number(moduleIndex || 0),
            pedestalSetId,
            replacesViga: true,
            originalVigaCode: vigaObj.userData?.code || null,
          },
        });

        removePartObject(vigaObj);
      }

      return originalVigaSnapshots;
    }

    async function restoreVigasFromPedestalReinforcement({
      parentGroup,
      pedestalSetId,
      originalVigaSnapshots = [],
    } = {}) {
      if (!parentGroup || !pedestalSetId) return false;

      const refuerzosToRemove = [];

      parentGroup.traverse((node) => {
        if (!node) return;

        const isRefuerzo =
          node.userData?.kind === 'refuerzoSuperficiePedestal' ||
          node.userData?.meta?.category === 'refuerzos-superficie-pedestal';

        if (!isRefuerzo) return;

        if (node.userData?.meta?.pedestalSetId === pedestalSetId) {
          refuerzosToRemove.push(node);
        }
      });

      for (const snapshot of originalVigaSnapshots || []) {
        if (!snapshot?.code || !snapshot?.dimMm) continue;

        await addNativeBlockPart({
          ...snapshot,
          type: 'viga',
          parentGroup,
          groupId: snapshot.groupId || parentGroup.userData?.groupId || null,
          groupName: snapshot.groupName || parentGroup.userData?.groupName || null,
        });
      }

      for (const refuerzoObj of refuerzosToRemove) {
        removePartObject(refuerzoObj);
      }

      return true;
    }

    async function addDuctSupportForPedestalSet({
      parentGroup,
      basePedestalObj,
      tipoPuesto = 'sencillo',
      replaceZone = 'RIGHT',
      moduleIndex = 0,
      pedestalSetId,
    } = {}) {
      if (!parentGroup || !basePedestalObj || !pedestalSetId) return null;

      const support = resolveKoncisaDuctSupport({
        tipoPuesto,
        replaceZone,
      });

      const offset = support.offsetMm || {};

      const basePos = basePedestalObj.position.clone();
      const baseRot = basePedestalObj.rotation.clone();

      await addExternalGlbPart({
        type: 'soporteDuctoPedestal',
        line: 'KONCISA.PLUS',
        code: support.code,
        logicalCode: support.logicalCode,
        name: support.name,

        groupId:
          basePedestalObj.userData?.groupId ||
          parentGroup.userData?.groupId ||
          parentGroup.userData?.instanceId ||
          null,

        groupName:
          basePedestalObj.userData?.groupName ||
          parentGroup.userData?.groupName ||
          parentGroup.userData?.name ||
          null,

        parentGroup,

        position: {
          x: basePos.x * 1000 + Number(offset.x || 0),
          y: basePos.y * 1000 + Number(offset.y || 0),
          z: basePos.z * 1000 + Number(offset.z || 0),
        },

        rotation: {
          x: baseRot.x,
          y: baseRot.y + Number(offset.rotY || 0),
          z: baseRot.z,
        },

        model: {
          kind: 'glb',
          src: support.modelSrc,
        },

        meta: {
          category: 'soportes-ducto-pedestal',
          modelCode: support.modelCode,
          tipoPuesto,
          replaceZone,
          moduleIndex,
          pedestalSetId,
          onePerPedestalSet: tipoPuesto === 'doble',
          supportForPedestal: true,
        },
      });

      return true;
    }

    function removeDuctSupportsByPedestalSet({ parentGroup, pedestalSetId } = {}) {
      if (!parentGroup || !pedestalSetId) return false;

      const supportsToRemove = [];

      parentGroup.traverse((node) => {
        if (!node) return;

        const isSupport =
          node.userData?.kind === 'soporteDuctoPedestal' ||
          node.userData?.meta?.category === 'soportes-ducto-pedestal';

        if (!isSupport) return;

        if (node.userData?.meta?.pedestalSetId === pedestalSetId) {
          supportsToRemove.push(node);
        }
      });

      for (const supportObj of supportsToRemove) {
        removePartObject(supportObj);
      }

      return true;
    }

    // DUCT COVERS
    const ductCoverCache = new Map();

    async function loadDuctCoverModel(src) {
      if (ductCoverCache.has(src)) return ductCoverCache.get(src);

      //  Verificar que el archivo existe y es un GLB antes de pasarlo al loader
      const res = await fetch(src);
      if (!res.ok) {
        throw new Error(`Tapa ducto no encontrada (${res.status}): ${src}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error(`La ruta devolvió HTML en vez de GLB: ${src}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const gltf = await new Promise((resolve, reject) => {
        const tempLoader = new GLTFLoader();
        tempLoader.parse(arrayBuffer, '', resolve, reject);
      });

      ductCoverCache.set(src, gltf.scene);
      return gltf.scene;
    }

    function disposeNodeDeep(root) {
      if (!root) return;
      root.traverse((n) => {
        n.geometry?.dispose?.();
        if (Array.isArray(n.material)) n.material.forEach((m) => m?.dispose?.());
        else n.material?.dispose?.();
      });
    }

    function removeDuctCoverChildren(root) {
      if (!root) return;

      const toRemove = root.children.filter((ch) => ch?.userData?.isDuctCover);

      toRemove.forEach((ch) => {
        root.remove(ch);
        disposeNodeDeep(ch);
      });
    }

    function removeCeilingDuctChildren(root) {
      if (!root) return;
      const children = root.children.filter(
        (child) => child?.userData?.meta?.category === 'ductos-a-techo'
      );
      children.forEach((child) => removePartObject(child, { emitBom: false }));
    }

    function isDuctAttachmentDescendant(root, node) {
      let current = node;
      while (current && current !== root) {
        const category = String(current.userData?.meta?.category || '').toLowerCase();
        if (current.userData?.isDuctCover || category === 'ductos-a-techo') return true;
        current = current.parent;
      }
      return false;
    }

    function getCeilingDuctLocalTransform(duct, ceilingDuct, sideValue) {
      const side = String(sideValue || 'LEFT').toUpperCase() === 'RIGHT' ? 'RIGHT' : 'LEFT';
      const OUTSIDE_OFFSET_M = 0.07;
      const DEPTH_OFFSET_M = -0.028;
      const ductBounds = computeBounds2D(duct, {
        exclude: (node) => isDuctAttachmentDescendant(duct, node),
      });
      const ceilingBounds = computeBounds2D(ceilingDuct);
      const rotationY = side === 'RIGHT' ? Math.PI : 0;

      if (!ductBounds || !ceilingBounds) {
        return { position: new THREE.Vector3(), rotationY };
      }

      const ductMin = ductBounds.localCenter.clone().addScaledVector(ductBounds.sizeLocal, -0.5);
      const ductMax = ductBounds.localCenter.clone().addScaledVector(ductBounds.sizeLocal, 0.5);
      const ceilingMin = ceilingBounds.localCenter
        .clone()
        .addScaledVector(ceilingBounds.sizeLocal, -0.5);
      const ceilingMax = ceilingBounds.localCenter
        .clone()
        .addScaledVector(ceilingBounds.sizeLocal, 0.5);

      const rotatedMinX = side === 'RIGHT' ? -ceilingMax.x : ceilingMin.x;
      const rotatedMaxX = side === 'RIGHT' ? -ceilingMin.x : ceilingMax.x;
      const rotatedMaxZ = side === 'RIGHT' ? -ceilingMin.z : ceilingMax.z;

      return {
        position: new THREE.Vector3(
          side === 'RIGHT'
            ? ductMax.x - rotatedMaxX + OUTSIDE_OFFSET_M
            : ductMin.x - rotatedMinX - OUTSIDE_OFFSET_M,
          ductMin.y - ceilingMin.y,
          ductMax.z - rotatedMaxZ + DEPTH_OFFSET_M
        ),
        rotationY,
      };
    }

    function getDuctCoverLocalTransform(root, cover, side) {
      const ductBounds = computeBounds2D(root, {
        exclude: (node) => isDuctAttachmentDescendant(root, node),
      });
      const coverBounds = computeBounds2D(cover);

      if (!ductBounds || !coverBounds) {
        return {
          position: new THREE.Vector3(),
          rotationY: side === 'left' ? Math.PI : 0,
        };
      }

      const ductMin = ductBounds.localCenter.clone().addScaledVector(ductBounds.sizeLocal, -0.5);
      const ductMax = ductBounds.localCenter.clone().addScaledVector(ductBounds.sizeLocal, 0.5);
      const coverMin = coverBounds.localCenter.clone().addScaledVector(coverBounds.sizeLocal, -0.5);
      const coverMax = coverBounds.localCenter.clone().addScaledVector(coverBounds.sizeLocal, 0.5);
      const rotationY = side === 'left' ? Math.PI : 0;
      const moduleType = normalizeDuctModuleType(root.userData?.meta?.tipoModulo);
      const usesDuctCoverAdjustment = moduleType === 'intermedio' || moduleType === 'terminal';
      const horizontalInset = usesDuctCoverAdjustment ? 31 / 1000 : 0;
      const depthOffset = usesDuctCoverAdjustment ? -23 / 1000 : 0;
      const rotationMatrix = new THREE.Matrix4().makeRotationY(rotationY);
      const rotatedCoverBox = new THREE.Box3();

      for (const x of [coverMin.x, coverMax.x]) {
        for (const y of [coverMin.y, coverMax.y]) {
          for (const z of [coverMin.z, coverMax.z]) {
            rotatedCoverBox.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(rotationMatrix));
          }
        }
      }

      return {
        position: new THREE.Vector3(
          side === 'left'
            ? ductMin.x - rotatedCoverBox.max.x + horizontalInset
            : ductMax.x - rotatedCoverBox.min.x - horizontalInset,
          ductMin.y - rotatedCoverBox.min.y,
          ductMax.z - rotatedCoverBox.max.z + depthOffset
        ),
        rotationY,
      };
    }

    function rotateSelectedDuct180() {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getActiveEditablePartObject();

      if (!root) return false;

      if (root.userData?.kind !== 'ducto') {
        console.warn('La pieza activa no es un ducto normal:', root.userData?.kind);
        return false;
      }

      const tipoModulo = String(root.userData?.meta?.tipoModulo || '')
        .trim()
        .toUpperCase();

      if (tipoModulo !== 'TERMINAL') {
        console.warn('Solo se permite rotar ductos terminales.');
        return false;
      }

      const isCurrentlyRotated = !!root.userData?.ductRotated180;

      if (!isCurrentlyRotated) {
        const ductBounds = computeBounds2D(root, {
          exclude: (node) => isDuctAttachmentDescendant(root, node),
        });
        const pivotLocal = ductBounds?.localCenter || new THREE.Vector3();

        root.userData.ductRotationInitialTransform = {
          position: root.position.toArray(),
          rotation: [root.rotation.x, root.rotation.y, root.rotation.z],
        };

        const ductMin = ductBounds.localCenter.clone().addScaledVector(ductBounds.sizeLocal, -0.5);
        const ductMax = ductBounds.localCenter.clone().addScaledVector(ductBounds.sizeLocal, 0.5);
        const getBoundsXInParent = () => {
          let minX = Infinity;
          let maxX = -Infinity;

          for (const x of [ductMin.x, ductMax.x]) {
            for (const y of [ductMin.y, ductMax.y]) {
              for (const z of [ductMin.z, ductMax.z]) {
                const pointInParent = new THREE.Vector3(x, y, z).applyMatrix4(root.matrix);
                minX = Math.min(minX, pointInParent.x);
                maxX = Math.max(maxX, pointInParent.x);
              }
            }
          }

          return { minX, maxX };
        };

        // El extremo derecho inicial coincide con el final de la superficie.
        // Su inicio se obtiene restando el ancho real, no usando X = 0 (centro).
        root.updateMatrix();
        const initialBoundsX = getBoundsXInParent();
        const surfaceWidthMm = Number(
          root.userData?.meta?.realWidthMm ||
            root.userData?.meta?.nominalWidthMm ||
            root.userData?.dim?.widthMm ||
            0
        );
        const oppositeSurfaceStartX = initialBoundsX.maxX - surfaceWidthMm / 1000;

        // Girar alrededor del centro físico y llevar el borde visible del
        // terminal al inicio real de la superficie.
        root.updateMatrix();
        const pivotBefore = pivotLocal.clone().applyMatrix4(root.matrix);

        root.rotation.y = THREE.MathUtils.euclideanModulo(root.rotation.y + Math.PI, Math.PI * 2);
        root.updateMatrix();

        const pivotAfter = pivotLocal.clone().applyMatrix4(root.matrix);
        root.position.add(pivotBefore.sub(pivotAfter));
        root.updateMatrix();

        const { minX: rotatedMinX } = getBoundsXInParent();

        if (Number.isFinite(rotatedMinX)) {
          root.position.x += oppositeSurfaceStartX - rotatedMinX;
        }
        root.userData.ductRotated180 = true;
      } else {
        const initialTransform = root.userData?.ductRotationInitialTransform;

        if (Array.isArray(initialTransform?.position)) {
          root.position.fromArray(initialTransform.position);
        }
        if (Array.isArray(initialTransform?.rotation)) {
          root.rotation.set(...initialTransform.rotation);
        } else {
          root.rotation.y = THREE.MathUtils.euclideanModulo(root.rotation.y + Math.PI, Math.PI * 2);
        }

        root.userData.ductRotated180 = false;
        delete root.userData.ductRotationInitialTransform;
      }

      root.updateMatrixWorld(true);

      if (selectionHelper) selectionHelper.update();

      const transformMm = {
        x: Math.round(root.position.x * 1000),
        y: Math.round(root.position.y * 1000),
        z: Math.round(root.position.z * 1000),
        rotX: Math.round(THREE.MathUtils.radToDeg(root.rotation.x) * 100) / 100,
        rotY: Math.round(THREE.MathUtils.radToDeg(root.rotation.y) * 100) / 100,
        rotZ: Math.round(THREE.MathUtils.radToDeg(root.rotation.z) * 100) / 100,
      };

      onSelectionChange?.({
        code: root.userData.codigoPT || root.userData.code,
        dimMm: root.userData?.dim || null,
        dimM: root.userData?.dimM || null,

        materialCode: root.userData?.materialCode ?? null,
        materialBase: root.userData?.materialBase ?? null,

        line: root.userData?.line ?? null,
        kind: root.userData?.kind || null,
        meta: root.userData?.meta || null,
        groupId: root.userData?.groupId || null,
        groupName: root.userData?.groupName || null,
        logicalCode: root.userData?.logicalCode || null,
        instanceId: root.userData?.instanceId || null,
        ductCovers: root.userData?.ductCovers || null,
        transformMm,
      });

      //aqui se hace el movimiento de la rotacion
      onFloatingEditorRequest?.({
        open: true,
        x: window.innerWidth - 600,
        y: 220,
        part: buildDuctPopupPart(root),
        ductCovers: root.userData?.ductCovers || null,
      });

      refreshFloorAndGrid();
      emitBOM?.();

      return true;
    }

    async function toggleSelectedDuctSide() {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getActiveEditablePartObject();
      if (!root) return false;

      if (root.userData?.kind !== 'ducto') {
        console.warn('La pieza activa no es un ducto:', root.userData?.kind);
        return false;
      }

      const oldMeta = root.userData?.meta || {};

      const tipoModulo = String(oldMeta?.tipoModulo || '')
        .trim()
        .toUpperCase();

      if (tipoModulo !== 'TERMINAL') {
        console.warn('Solo se puede girar/cambiar lado en ductos terminales.');
        return false;
      }

      const currentSide = String(oldMeta?.side || 'RIGHT').toUpperCase();
      const nextSide = currentSide === 'RIGHT' ? 'LEFT' : 'RIGHT';

      const nextModelSrc = nextSide === 'LEFT' ? oldMeta?.modelSrcLeft : oldMeta?.modelSrcRight;

      if (!nextModelSrc) {
        console.warn('No hay GLB configurado para el lado:', nextSide, oldMeta);
        return false;
      }

      // Ajustes de posición por medida y lado.
      // Estos valores están en milímetros.
      const DUCT_SIDE_OFFSETS_MM = {
        1000: {
          RIGHT: { x: -162, y: 0, z: 0 },
          LEFT: { x: 0, y: 0, z: 0 },
        },
        1200: {
          RIGHT: { x: -260, y: 0, z: 0 },
          LEFT: { x: 0, y: 0, z: 0 },
        },
        1500: {
          RIGHT: { x: -410, y: 0, z: 0 },
          LEFT: { x: 0, y: 0, z: 0 },
        },
      };

      const nominalWidthMm = Number(oldMeta?.nominalWidthMm || 1200);

      const currentOffset = DUCT_SIDE_OFFSETS_MM[nominalWidthMm]?.[currentSide] || {
        x: 0,
        y: 0,
        z: 0,
      };

      const nextOffset = DUCT_SIDE_OFFSETS_MM[nominalWidthMm]?.[nextSide] || { x: 0, y: 0, z: 0 };

      const deltaOffset = {
        x: nextOffset.x - currentOffset.x,
        y: nextOffset.y - currentOffset.y,
        z: nextOffset.z - currentOffset.z,
      };

      // Guardar datos actuales antes de eliminar el ducto
      const savedPos = root.position.clone();
      const savedRot = root.rotation.clone();

      const groupId = root.userData?.groupId || null;
      const groupName = root.userData?.groupName || null;
      const line = root.userData?.line || 'KONCISA.PLUS';

      const parentGroup =
        root.parent?.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' ? root.parent : null;

      const oldCovers =
        root.userData?.ductCovers ||
        oldMeta?.ductCovers ||
        defaultDuctCoverState(oldMeta?.tipoModulo || 'terminal');
      const oldCeilingDucts =
        root.userData?.ceilingDucts ||
        oldMeta?.ceilingDucts ||
        defaultCeilingDuctState(oldMeta?.tipoModulo || 'terminal');

      const code = root.userData?.codigoPT || root.userData?.code;
      const logicalCode = root.userData?.logicalCode || oldMeta?.logicalCode || null;
      const description = root.userData?.description || root.name || 'Ducto';

      // Eliminar el GLB actual
      removePartObject(root);

      // Crear el nuevo ducto con el GLB del otro lado
      const newDuctObj = await addExternalGlbPart({
        type: 'ducto',
        subtype: oldMeta?.tipoModulo || 'terminal',
        line,

        code,
        logicalCode,
        name: description,

        groupId,
        groupName,
        parentGroup,

        position: {
          x: savedPos.x * 1000 + deltaOffset.x,
          y: savedPos.y * 1000 + deltaOffset.y,
          z: savedPos.z * 1000 + deltaOffset.z,
        },

        rotation: {
          x: savedRot.x,
          y: savedRot.y,
          z: savedRot.z,
        },

        model: {
          kind: 'glb',
          src: nextModelSrc,
        },

        meta: {
          ...oldMeta,

          category: 'ductos',
          tipoModulo: oldMeta?.tipoModulo || 'terminal',
          tipoPuesto: oldMeta?.tipoPuesto || 'sencillo',
          nominalWidthMm,

          side: nextSide,
          modelSrcLeft: oldMeta?.modelSrcLeft || null,
          modelSrcRight: oldMeta?.modelSrcRight || null,

          ductCovers: oldCovers,
          ceilingDucts: oldCeilingDucts,
        },
      });

      if (!newDuctObj) return false;

      // Mantener tapas si tenía
      await syncDuctCovers(newDuctObj, oldCovers);
      await syncCeilingDucts(newDuctObj, oldCeilingDucts);

      setActivePart(newDuctObj);

      onFloatingEditorRequest?.({
        open: true,
        x: window.innerWidth - 600,
        y: 220,
        part: buildDuctPopupPart(newDuctObj),
        ductCovers: newDuctObj.userData?.ductCovers || null,
      });

      refreshFloorAndGrid();
      emitBOM?.();

      return true;
    }

    async function addDuctCoverChild(root, side, coverAsset) {
      const base = await loadDuctCoverModel(coverAsset.modelSrc);
      const cover = base.clone(true);

      const t = getDuctCoverLocalTransform(root, cover, side);

      cover.position.copy(t.position);
      cover.rotation.set(0, t.rotationY, 0);

      cover.userData = {
        isDuctCover: true,
        coverCode: coverAsset.code,
        side,
        excludeFromBOM: true,
        meta: {
          category: 'duct_cover',
        },
      };

      cover.name = `DUCT_COVER_${side.toUpperCase()}`;

      root.add(cover);

      // Si el ducto ya tenía material, la tapa hereda el mismo
      const matCode = root.userData?.materialCode || null;
      if (matCode) {
        const def = materialsByCodeRef.current?.get?.(String(matCode)) || null;
        applyMaterialToObject3D(cover, matCode, def);
      }
    }

    function buildDuctPopupPart(root) {
      return {
        code: root.userData?.codigoPT || root.userData?.code || null,
        kind: root.userData?.kind || null,
        meta: root.userData?.meta || null,
        groupId: root.userData?.groupId || null,
        groupName: root.userData?.groupName || null,
        logicalCode: root.userData?.logicalCode || null,
        instanceId: root.userData?.instanceId || null,
        description: root.userData?.description || null,
        ductCovers: root.userData?.ductCovers || null,
        ceilingDucts: root.userData?.ceilingDucts || null,
        transformMm: {
          x: Math.round(root.position.x * 1000),
          y: Math.round(root.position.y * 1000),
          z: Math.round(root.position.z * 1000),
          rotX: Math.round(THREE.MathUtils.radToDeg(root.rotation.x) * 100) / 100,
          rotY: Math.round(THREE.MathUtils.radToDeg(root.rotation.y) * 100) / 100,
          rotZ: Math.round(THREE.MathUtils.radToDeg(root.rotation.z) * 100) / 100,
        },
      };
    }

    async function addCeilingDuctChild(root, side, asset) {
      const base = await loadDuctCoverModel(asset.modelSrc);
      const child = base.clone(true);
      const transform = getCeilingDuctLocalTransform(root, child, side);
      const catalogItem = catalogByCodeRef.current?.get?.(String(asset.code)) || null;

      child.position.copy(transform.position);
      child.rotation.set(0, transform.rotationY, 0);
      child.name = `CEILING_DUCT_${side.toUpperCase()}`;
      child.userData = {
        isPartRoot: true,
        code: asset.code,
        codigoPT: asset.code,
        kind: 'ductoTecho',
        line: 'KONCISA.PLUS',
        description: asset.name,
        unitPrice:
          Number(
            catalogItem?.prices?.[countryRef.current] ??
              catalogItem?.prices?.CO ??
              catalogItem?.raw?.price ??
              0
          ) || 0,
        prices: catalogItem?.prices || undefined,
        logicalCode: asset.logicalCode,
        modelSrc: asset.modelSrc,
        model: { kind: 'glb', src: asset.modelSrc },
        instanceId: `${asset.code}__${Date.now()}__${Math.random().toString(16).slice(2)}`,
        groupId: root.userData?.groupId || null,
        groupName: root.userData?.groupName || null,
        parentAssemblyId: root.userData?.instanceId || root.userData?.code || null,
        meta: {
          category: 'ductos-a-techo',
          attachmentKind: 'KONCISA_CEILING_DUCT',
          side: side.toUpperCase(),
          tipoPuesto: root.userData?.meta?.tipoPuesto || 'sencillo',
          referenceDuctCode: root.userData?.code || null,
          referenceDuctType: root.userData?.meta?.tipoModulo || null,
        },
      };

      child.traverse((node) => {
        node.userData = {
          ...(node.userData || {}),
          parentAssemblyId: child.userData.parentAssemblyId,
          groupId: child.userData.groupId,
          groupName: child.userData.groupName,
        };
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      root.add(child);
      parts.push({ code: asset.code, obj: child });
      pickables.push(child);
      return child;
    }

    async function syncCeilingDucts(root, requestedState) {
      if (!root || root.userData?.kind !== 'ducto') return false;
      const tipoModulo = normalizeDuctModuleType(root.userData?.meta?.tipoModulo);
      if (tipoModulo === 'INDIVIDUAL') return false;

      const tipoPuesto = root.userData?.meta?.tipoPuesto || 'sencillo';
      const nextState = normalizeCeilingDuctState(tipoModulo, requestedState);
      const asset = resolveKoncisaCeilingDuct({ tipoPuesto });

      root.userData.ceilingDucts = nextState;
      root.userData.meta = { ...(root.userData.meta || {}), ceilingDucts: nextState };
      removeCeilingDuctChildren(root);

      const sides = resolveDuctCoverPhysicalSides({
        tipoModulo,
        tipoPuesto,
        ductSide: root.userData?.meta?.side,
        state: nextState,
      });
      for (const side of sides) await addCeilingDuctChild(root, side, asset);

      root.updateMatrixWorld(true);
      if (selectionHelper) selectionHelper.update();
      onSelectionChange?.(buildDuctPopupPart(root));
      onFloatingEditorRequest?.({
        open: true,
        x: 120,
        y: 120,
        part: buildDuctPopupPart(root),
        ductCovers: root.userData?.ductCovers || null,
      });
      refreshFloorAndGrid();
      emitBOM?.();
      return true;
    }

    async function updateSelectedCeilingDucts(patch = {}) {
      if (readOnly || !activePart) return false;
      const root = getActiveEditablePartObject();
      if (!root || root.userData?.kind !== 'ducto') return false;
      const tipoModulo = normalizeDuctModuleType(root.userData?.meta?.tipoModulo);
      const current =
        root.userData?.ceilingDucts ||
        root.userData?.meta?.ceilingDucts ||
        defaultCeilingDuctState(tipoModulo);
      const next = { ...current, ...patch };
      if (tipoModulo === 'INTERMEDIO') {
        if (patch.left === true) next.right = false;
        if (patch.right === true) next.left = false;
      }
      return syncCeilingDucts(root, next);
    }

    async function syncDuctCovers(root, requestedState) {
      if (!root) return false;
      if (root.userData?.kind !== 'ducto') return false;

      const tipoModulo = normalizeDuctModuleType(root.userData?.meta?.tipoModulo);

      const tipoPuesto = root.userData?.meta?.tipoPuesto || 'sencillo';

      const tipoCanal =
        root.userData?.meta?.tipoCanal ||
        inferDuctChannelType({
          logicalCode: root.userData?.logicalCode,
          description: root.userData?.description,
          codigoPT: root.userData?.codigoPT,
          code: root.userData?.code,
        });

      const coverAsset = resolveDuctCoverAsset({
        tipoPuesto,
        tipoCanal,
      });

      if (!coverAsset) {
        console.warn('No se encontró tapa ducto para:', {
          tipoModulo,
          tipoPuesto,
          tipoCanal,
        });
        return false;
      }

      // 1. NORMALIZAR ESTADO (ANTES de usarlo)
      const nextState = normalizeDuctCoverState(tipoModulo, requestedState);

      // 2. GUARDAR ESTADO
      root.userData.ductCovers = nextState;
      root.userData.meta = {
        ...(root.userData.meta || {}),
        tipoCanal,
        ductCovers: nextState,
      };

      // 3. LIMPIAR MODELOS 3D (esto ya lo tienes bien)
      removeDuctCoverChildren(root);

      // 4. AGREGAR MODELOS 3D
      const sides = resolveDuctCoverPhysicalSides({
        tipoModulo,
        tipoPuesto,
        ductSide: root.userData?.meta?.side,
        state: nextState,
      });

      for (const side of sides) {
        await addDuctCoverChild(root, side, coverAsset);
      }

      // =====================================================
      // 5. BOM → NO lo manipules manualmente aqui
      // =====================================================
      // Tú ya usas emitBOM()
      // Entonces el BOM se recalcula SOLO
      // NO necesitas addBomItem ni removeBomItemsByCode aqui

      root.updateMatrixWorld(true);
      if (selectionHelper) selectionHelper.update();

      onSelectionChange?.({
        code: root.userData.codigoPT || root.userData.code,
        dimMm: root.userData?.dim || null,
        dimM: root.userData?.dimM || root.userData?.procedural || root.userData?.dimMeters || null,
        materialCode: root.userData?.materialCode || null,
        materialBase: root.userData?.materialBase || null,
        generico: root.userData?.generico || null,
        genericos: root.userData?.genericos || null,
        line: root.userData?.line || null,
        kind: root.userData?.kind || null,
        meta: root.userData?.meta || null,
        groupId: root.userData?.groupId || null,
        groupName: root.userData?.groupName || null,
        logicalCode: root.userData?.logicalCode || null,
        instanceId: root.userData?.instanceId || null,
        ductCovers: root.userData?.ductCovers || null,
      });

      onFloatingEditorRequest?.({
        open: true,
        x: 120,
        y: 120,
        part: buildDuctPopupPart(root),
        ductCovers: root.userData?.ductCovers || null,
      });

      refreshFloorAndGrid();

      // ESTE ES EL QUE MANDA TODO AL BOM
      emitBOM?.();

      return true;
    }

    async function updateSelectedDuctCovers(patch = {}) {
      if (readOnly) return false;
      const ductObj = getActiveEditablePartObject();
      if (!ductObj || ductObj.userData?.kind !== 'ducto') return false;

      const tipoModulo = normalizeDuctModuleType(ductObj.userData?.meta?.tipoModulo);
      const currentState = ductObj.userData?.ductCovers || defaultDuctCoverState(tipoModulo);

      const nextState = normalizeDuctCoverState(tipoModulo, {
        ...currentState,
        ...patch,
      });

      return await syncDuctCovers(ductObj, nextState);
    }

    //////////////
    async function updateSelectedDuctType(newType) {
      if (readOnly) return;
      const selectedDuct = getActiveEditablePartObject();
      if (!selectedDuct || selectedDuct.userData?.kind !== 'ducto') return;

      // Normalizar el tipo de módulo
      const normalizedType = String(newType || '')
        .trim()
        .toLowerCase();

      const oldObj = selectedDuct;

      // Información actual del ducto
      const tipoPuesto = oldObj.userData?.meta?.tipoPuesto || 'sencillo';
      const nominalWidthMm = oldObj.userData?.meta?.nominalWidthMm || 1200;
      const oldMeta = oldObj.userData?.meta || {};
      const accesoCableado =
        String(
          oldMeta.accesoCableado ||
            oldMeta.tipoCanal ||
            inferDuctChannelType({
              logicalCode: oldObj.userData?.logicalCode,
              description: oldObj.userData?.description,
              codigoPT: oldObj.userData?.codigoPT,
              code: oldObj.userData?.code,
            })
        ).toUpperCase() === 'PASACABLE'
          ? 'PASACABLE'
          : 'GROMMET';
      const oldCovers = oldObj.userData?.ductCovers || defaultDuctCoverState(normalizedType);
      const oldCeilingDucts =
        oldObj.userData?.ceilingDucts ||
        oldObj.userData?.meta?.ceilingDucts ||
        defaultCeilingDuctState(normalizedType);

      // Resolver el ducto según tipo y ancho
      const resolved = resolveKoncisaDucto({
        tipoPuesto,
        tipoModulo: normalizedType,
        nominalWidthMm,
        accesoCableado,
      });

      console.log('[updateSelectedDuctType]', { newType, normalizedType, resolved });

      if (!resolved?.codigoPT || !resolved?.modelSrc) {
        console.warn('[updateSelectedDuctType] Sin modelo para:', resolved?.logicalCode);
        alert(`No tenemos disponible ese ducto: ${resolved?.logicalCode || newType}`);
        return;
      }

      // Guardar posición, rotación y grupo
      const pos = oldObj.position.clone();
      const rot = oldObj.rotation.clone();
      const scale = oldObj.scale.clone();
      const groupId = oldObj.userData?.groupId || null;
      const groupName = oldObj.userData?.groupName || null;
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;
      const parentIndex = parentGroup?.children?.indexOf(oldObj) ?? -1;
      const side = String(oldMeta.side || 'RIGHT').toUpperCase() === 'LEFT' ? 'LEFT' : 'RIGHT';
      const modelSrc =
        side === 'LEFT'
          ? resolved.modelSrcLeft || resolved.modelSrc
          : resolved.modelSrcRight || resolved.modelSrc;
      const moduleIndex = Math.max(0, Number(oldMeta.moduleIndex) || 0);
      const assemblyConfig = parentGroup?.userData?.config || {};
      const anchoRealMm = Number(
        oldMeta.anchoRealMm || assemblyConfig.anchoRealMm || (tipoPuesto === 'doble' ? 1200 : 600)
      );
      const ductModes = Array.from({ length: moduleIndex + 1 }, () => 'TERMINAL');
      ductModes[moduleIndex] = normalizedType.toUpperCase();
      const placement = getDuctosConfig({
        puestos: moduleIndex + 1,
        tipoPuesto,
        largoRealMm: nominalWidthMm,
        anchoRealMm,
        hasDuct: true,
        ductModes,
        tipoPasoCable: accesoCableado.toLowerCase(),
        side,
      }).find((duct) => duct.moduleIndex === moduleIndex);
      const nextPositionMm = {
        x: placement?.x ?? pos.x * 1000,
        y: placement?.y ?? pos.y * 1000,
        z: placement?.z ?? pos.z * 1000,
      };
      const nextRotation = {
        x: placement?.rotX ?? rot.x,
        y: placement?.rotY ?? rot.y,
        z: placement?.rotZ ?? rot.z,
      };

      // Crear primero el reemplazo. Si el GLB falla, el ducto anterior y su
      // assembly permanecen intactos.
      const newDuctObj = await addExternalGlbPart({
        type: 'ducto',
        subtype: normalizedType,
        line: 'KONCISA.PLUS',
        code: resolved.codigoPT,
        logicalCode: resolved.logicalCode,
        groupId,
        parentGroup,
        groupName,
        position: nextPositionMm,
        rotation: nextRotation,
        model: { kind: 'glb', src: modelSrc },
        meta: {
          ...oldMeta,
          category: 'ductos',
          tipoPuesto,
          tipoModulo: normalizedType,
          nominalWidthMm,
          side,
          accesoCableado,
          modelSrcLeft: resolved.modelSrcLeft || null,
          modelSrcRight: resolved.modelSrcRight || null,
          ductCovers: oldCovers,
          ceilingDucts: oldCeilingDucts,
        },
        extraUserData: {
          instanceId: oldObj.userData?.instanceId || undefined,
          materialCode: oldObj.userData?.materialCode || null,
          materialBase: oldObj.userData?.materialBase || null,
          finishes: oldObj.userData?.finishes || null,
          activeSubKey: oldObj.userData?.activeSubKey || null,
          activeSubName: oldObj.userData?.activeSubName || null,
        },
      });

      if (!newDuctObj) return;

      newDuctObj.scale.copy(scale);
      if (oldObj.userData?.materialCode) {
        const materialCode = String(oldObj.userData.materialCode);
        const materialDef = materialsByCodeRef.current?.get?.(materialCode) || null;
        applyMaterialToObject3D(newDuctObj, materialCode, materialDef);
      }
      // Retirar exactamente la pieza física anterior. No usar removePartObject:
      // esa función escala intencionalmente hasta KONCISA_PLUS_ASSEMBLY.
      if (oldObj.parent) oldObj.parent.remove(oldObj);
      removePartsRecordsUnder(oldObj);
      removePickablesUnder(oldObj);
      disposeObject3D(oldObj);

      if (parentGroup && parentIndex >= 0) {
        const appendedIndex = parentGroup.children.indexOf(newDuctObj);
        if (appendedIndex >= 0 && appendedIndex !== parentIndex) {
          parentGroup.children.splice(appendedIndex, 1);
          parentGroup.children.splice(
            Math.min(parentIndex, parentGroup.children.length),
            0,
            newDuctObj
          );
        }
      }
      newDuctObj.updateMatrixWorld(true);

      // Actualizar popup flotante
      onFloatingEditorRequest?.({
        open: true,
        x: 120,
        y: 120,
        part: {
          code: newDuctObj.userData?.codigoPT || newDuctObj.userData?.code,
          kind: newDuctObj.userData?.kind,
          meta: newDuctObj.userData?.meta,
          groupId: newDuctObj.userData?.groupId,
          groupName: newDuctObj.userData?.groupName,
          logicalCode: newDuctObj.userData?.logicalCode,
          instanceId: newDuctObj.userData?.instanceId,
          description: newDuctObj.userData?.description,
          ductCovers: newDuctObj.userData?.ductCovers,
        },
      });

      // Sincronizar tapas en la escena 3D
      await syncDuctCovers(newDuctObj, oldCovers);
      await syncCeilingDucts(newDuctObj, oldCeilingDucts);
      setActivePart(newDuctObj);
      emitBOM();
      refreshFloorAndGrid();

      // =========================
      // AGREGAR TAPAS AL BOM
      // =========================
      const _ductCoversNormalized = normalizeDuctCoverState(normalizedType, oldCovers);
      const _coverAsset = resolveDuctCoverAsset({
        tipoPuesto,
        tipoCanal: normalizedType, // si tu inferDuctChannelType lo requiere, puedes adaptarlo
      });

      /*
      if (coverAsset) {
        if (ductCoversNormalized.left) {
          addBomItem(newDuctObj, coverAsset.code);
        }
        if (ductCoversNormalized.right) {
          addBomItem(newDuctObj, coverAsset.code);
        }
        if (ductCoversNormalized.single) {
          addBomItem(newDuctObj, coverAsset.code);
        }
      }*/
    }

    function updateSelectedFloorDuctPosition(newPosition) {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getActiveEditablePartObject();
      if (!root) return false;

      if (root.userData?.kind !== 'ductoPiso') {
        console.warn('La pieza activa no es un ducto bajante a piso.');
        return false;
      }

      const meta = root.userData?.meta || {};
      const referenceDuctType = meta.tipoModuloReferencia || 'TERMINAL';

      const floorDuct = resolveKoncisaFloorDuct({
        tipoPuesto: meta.tipoPuesto,
        tipoPasoCable: meta.tipoPasoCable,
        referenceDuctType,
        position: newPosition,
        largoRealMm: meta.largoRealMm,
        anchoRealMm: meta.anchoRealMm,
      });

      const basePositionMm = meta.basePositionMm || { x: 0, y: 0, z: 0 };
      const baseRotationRad = meta.baseRotationRad || { x: 0, y: 0, z: 0 };
      const offset = floorDuct.offsetFromReferenceMm || {};

      root.position.set(
        ((basePositionMm.x || 0) + (offset.x || 0)) / 1000,
        ((basePositionMm.y || 0) + (offset.y || 0)) / 1000,
        ((basePositionMm.z || 0) + (offset.z || 0)) / 1000
      );

      root.rotation.set(
        baseRotationRad.x || 0,
        (baseRotationRad.y || 0) + (offset.rotY || 0),
        baseRotationRad.z || 0
      );

      root.userData.meta = {
        ...meta,
        position: floorDuct.position,
      };

      root.updateMatrixWorld(true);

      if (selectionHelper) selectionHelper.update();

      onSelectionChange?.({
        code: root.userData.codigoPT || root.userData.code,
        dimMm: root.userData?.dim || null,
        dimM: root.userData?.dimM || null,

        materialCode: root.userData?.materialCode ?? null,
        materialBase: root.userData?.materialBase ?? null,

        line: root.userData?.line ?? null,
        kind: root.userData?.kind || null,
        meta: root.userData?.meta || null,
        groupId: root.userData?.groupId || null,
        groupName: root.userData?.groupName || null,
        logicalCode: root.userData?.logicalCode || null,
        instanceId: root.userData?.instanceId || null,
      });

      refreshFloorAndGrid();
      emitBOM();

      return true;
    }

    function updateSelectedCeilingDuctSide(newSide) {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getActiveEditablePartObject();
      if (!root) return false;

      if (root.userData?.kind !== 'ductoTecho') {
        console.warn('La pieza activa no es un ducto bajante a techo.');
        return false;
      }

      const side = String(newSide || 'LEFT').toUpperCase() === 'RIGHT' ? 'RIGHT' : 'LEFT';

      root.userData.meta = {
        ...(root.userData.meta || {}),
        side,
      };

      const referenceDuct = root.parent?.userData?.kind === 'ducto' ? root.parent : null;
      if (!referenceDuct) {
        console.warn('El ducto bajante a techo no tiene un ducto horizontal asociado.');
        return false;
      }

      const nextTransform = getCeilingDuctLocalTransform(referenceDuct, root, side);
      root.position.copy(nextTransform.position);
      root.rotation.set(0, nextTransform.rotationY, 0);

      root.updateMatrixWorld(true);

      if (selectionHelper) selectionHelper.update();

      onSelectionChange?.({
        code: root.userData.codigoPT || root.userData.code,
        dimMm: root.userData?.dim || null,
        dimM: root.userData?.dimM || null,

        materialCode: root.userData?.materialCode ?? null,
        materialBase: root.userData?.materialBase ?? null,

        line: root.userData?.line ?? null,
        kind: root.userData?.kind || null,
        meta: root.userData?.meta || null,
        groupId: root.userData?.groupId || null,
        groupName: root.userData?.groupName || null,
        logicalCode: root.userData?.logicalCode || null,
        instanceId: root.userData?.instanceId || null,
      });

      refreshFloorAndGrid();
      emitBOM();

      return true;
    }

    function updateSelectedPartTransformPatch(patch = {}) {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getActiveEditablePartObject();

      if (!root) return false;

      const allowedKinds = ['ductoPiso', 'ductoTecho', 'ducto'];

      if (!allowedKinds.includes(root.userData?.kind)) {
        console.warn(
          'La pieza activa no permite ajuste desde PropertiesPopup:',
          root.userData?.kind
        );
        return false;
      }

      const positionMm = patch.positionMm || {};
      const rotationDeg = patch.rotationDeg || {};

      if (Number.isFinite(Number(positionMm.x))) {
        root.position.x = Number(positionMm.x) / 1000;
      }

      if (Number.isFinite(Number(positionMm.y))) {
        root.position.y = Number(positionMm.y) / 1000;
      }

      if (Number.isFinite(Number(positionMm.z))) {
        root.position.z = Number(positionMm.z) / 1000;
      }

      if (Number.isFinite(Number(rotationDeg.x))) {
        root.rotation.x = THREE.MathUtils.degToRad(Number(rotationDeg.x));
      }

      if (Number.isFinite(Number(rotationDeg.y))) {
        root.rotation.y = THREE.MathUtils.degToRad(Number(rotationDeg.y));
      }

      if (Number.isFinite(Number(rotationDeg.z))) {
        root.rotation.z = THREE.MathUtils.degToRad(Number(rotationDeg.z));
      }

      if (patch.side) {
        root.userData.meta = {
          ...(root.userData.meta || {}),
          side: patch.side,
        };
      }

      root.updateMatrixWorld(true);

      if (selectionHelper) selectionHelper.update();

      onSelectionChange?.({
        code: root.userData.codigoPT || root.userData.code,
        dimMm: root.userData?.dim || null,
        dimM: root.userData?.dimM || null,

        materialCode: root.userData?.materialCode ?? null,
        materialBase: root.userData?.materialBase ?? null,

        line: root.userData?.line ?? null,
        kind: root.userData?.kind || null,
        meta: root.userData?.meta || null,
        groupId: root.userData?.groupId || null,
        groupName: root.userData?.groupName || null,
        logicalCode: root.userData?.logicalCode || null,
        instanceId: root.userData?.instanceId || null,

        transformMm: {
          x: Math.round(root.position.x * 1000),
          y: Math.round(root.position.y * 1000),
          z: Math.round(root.position.z * 1000),
          rotX: Math.round(THREE.MathUtils.radToDeg(root.rotation.x) * 100) / 100,
          rotY: Math.round(THREE.MathUtils.radToDeg(root.rotation.y) * 100) / 100,
          rotZ: Math.round(THREE.MathUtils.radToDeg(root.rotation.z) * 100) / 100,
        },
      });

      refreshFloorAndGrid();
      emitBOM();

      return true;
    }

    // ====== Keyboard ======
    function onKeyDown(e) {
      if (readOnly) return;

      if (e.key === 'Escape' && rotationSession) {
        e.preventDefault();
        cancelRotation();
        isRotating3D = false;
        controls.enabled = true;
        return;
      }

      if (e.key === 'Escape' && dragSession3D) {
        e.preventDefault();
        cancelDragSession();
        return;
      }

      // si estás escribiendo en un input, no interceptar teclas
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      //  Supr / Backspace para eliminar pieza seleccionada
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelectedOrActive();
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        selectFloor();
        return;
      }

      if (!activePart) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          moveTargetOrGroup(activePart, 0, 0, -MOVE_STEP);
          break;
        case 'ArrowDown':
        case 's':
          moveTargetOrGroup(activePart, 0, 0, MOVE_STEP);
          break;
        case 'ArrowLeft':
        case 'a':
          moveTargetOrGroup(activePart, -MOVE_STEP, 0, 0);
          break;
        case 'ArrowRight':
        case 'd':
          moveTargetOrGroup(activePart, MOVE_STEP, 0, 0);
          break;
        case 'q':
          moveTargetOrGroup(activePart, 0, MOVE_STEP, 0);
          break;
        case 'e':
          moveTargetOrGroup(activePart, 0, -MOVE_STEP, 0);
          break;
        case 'r': {
          const degrees = e.altKey ? 15 : 90;
          rotateByDegrees({ degrees: e.shiftKey ? -degrees : degrees });
          break;
        }
        case ' ':
          toggleSnap();
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);

    // ====== Pointer (Select + Drag) ======
    function setObjectWorldPosition(obj, worldPosition) {
      if (obj.parent) {
        obj.parent.updateMatrixWorld(true);
        obj.position.copy(obj.parent.worldToLocal(worldPosition.clone()));
      } else {
        obj.position.copy(worldPosition);
      }
      obj.updateMatrixWorld(true);
    }

    function restoreDragSession() {
      if (!dragSession3D) return;
      dragSession3D.initialPositions.forEach(({ obj, localPosition }) => {
        obj.position.copy(localPosition);
        obj.updateMatrixWorld(true);
      });
      dragSession3D = null;
      refreshFloorAndGrid();
    }

    function cancelDragSession(pointerId) {
      const sessionPointerId = pointerId ?? dragSession3D?.pointerId;
      restoreDragSession();
      dragGroupStartRef.current = null;
      dragRootStartRef.current = null;
      endDrag(sessionPointerId);
    }

    function onPointerDown(e) {
      if (readOnly) return;
      if (e.button === 2 && pickables.length) {
        updateMouseFromEvent(e);
        raycaster.setFromCamera(mouse, camera);
        const secondaryHits = raycaster.intersectObjects(pickables, true);
        const secondaryRoot = secondaryHits.length
          ? getRootPartObject(secondaryHits[0].object)
          : null;
        if (secondaryRoot?.userData?.isFloor) {
          onFloatingEditorRequest?.({ open: false });
        }
      }
      if (e.button !== 0) return;

      updateMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);

      if (edukTableHandleGroup.visible) {
        const edukHandleHits = raycaster.intersectObjects(edukTableHandleGroup.children, true);
        if (edukHandleHits.length) {
          const direction = resolveEdukHandleDirection(edukHandleHits[0].object);
          if (direction !== 0) {
            startEdukHandleDrag(e, direction);
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      if (transformToolRef.current === 'rotate' && rotationHandle.visible) {
        const handleHits = raycaster.intersectObjects(rotationHandle.children, true);
        if (handleHits.length && beginRotation({})) {
          dragPlane.set(new THREE.Vector3(0, 1, 0), -rotationSession.pivot.y);
          if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
            rotationPointerStartAngle = Math.atan2(
              dragPoint.z - rotationSession.pivot.z,
              dragPoint.x - rotationSession.pivot.x
            );
            isRotating3D = true;
            controls.enabled = false;
            renderer.domElement.setPointerCapture?.(e.pointerId);
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          cancelRotation();
        }
      }

      // ===== INTERACCIÓN CON MARCADORES VISUALES DE EXTENSIÓN CET (KUO AV) =====
      if (kuoAVSnapMarkersGroup.visible && activePart) {
        const markerHits = raycaster.intersectObjects(kuoAVSnapMarkersGroup.children, true);
        if (markerHits.length > 0) {
          const hitMarker = markerHits[0].object;
          const snapType = hitMarker.userData?.snapType;
          const assembly =
            activePart.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY' ||
            activePart.userData?.kind === 'KUO_AV_ASSEMBLY'
              ? activePart
              : getKoncisaAssemblyObject(activePart) || activePart;
          const cfg = assembly.userData?.config || {};
          const deskWidthM = (cfg.anchoMm || 1200) / 1000;
          const angle = assembly.rotation.y || 0;

          if (snapType === 'EXTENSION_DER') {
            const offset = new THREE.Vector3(deskWidthM, 0, 0).applyAxisAngle(
              new THREE.Vector3(0, 1, 0),
              angle
            );
            const targetPos = assembly.position.clone().add(offset);
            void addKuoAVDoble({
              ...cfg,
              tipoPuesto: 'EXTENSION_DER',
              rotation: angle,
              position: targetPos,
            });
            e.preventDefault();
            e.stopPropagation();
            return;
          } else if (snapType === 'EXTENSION_IZQ') {
            const offset = new THREE.Vector3(-deskWidthM, 0, 0).applyAxisAngle(
              new THREE.Vector3(0, 1, 0),
              angle
            );
            const targetPos = assembly.position.clone().add(offset);
            void addKuoAVDoble({
              ...cfg,
              tipoPuesto: 'EXTENSION_IZQ',
              rotation: angle,
              position: targetPos,
            });
            e.preventDefault();
            e.stopPropagation();
            return;
          } else if (snapType === 'CENTER') {
            // Rotar 90° alrededor del centro
            const newAngle = (angle + Math.PI / 2) % (Math.PI * 2);
            assembly.rotation.y = newAngle;
            assembly.updateMatrixWorld(true);
            checkAndApplyKuoAVLUnion(assembly);
            updateKuoAVSnapMarkers();
            if (selectionHelper) selectionHelper.update();
            emitBOM();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      if (!pickables.length) return;

      const hits = raycaster.intersectObjects(pickables, true);
      if (!hits.length) return;

      const hitObj = hits[0].object; // Mesh real clickeado
      const root = getRootPartObject(hitObj);
      if (!root) return;
      if (root.userData?.isFloor) return;
      const propertiesTarget = isKoncisaAssemblyRoot(root)
        ? getEditableKoncisaPartObject(hitObj) || root
        : isCritterium8SequenceRoot(root)
          ? getCritterium8EditableTarget(hitObj) || root
          : isCritterium8AssemblyRoot(root)
            ? getCritterium8EditablePart(hitObj) || root
            : root;
      const movementRoot = moveAsGroupRef.current
        ? root
        : getIndividualMovementRoot(hitObj) || propertiesTarget || root;

      const rootId = movementRoot.userData?.instanceId || movementRoot.uuid;
      const wantsToggle = e.ctrlKey || e.metaKey;
      const targetIsSelected = selectedIds3D.includes(rootId);
      const preserveSelection = !wantsToggle && targetIsSelected && selectedIds3D.length > 1;
      let dragIds;

      if (preserveSelection) {
        dragIds = selectedIds3D;
      } else if (wantsToggle) {
        const nextIds = new Set(selectedIds3D);
        if (targetIsSelected) nextIds.delete(rootId);
        else nextIds.add(rootId);
        dragIds = Array.from(nextIds);
      } else {
        dragIds = [rootId];
      }

      setActivePart(movementRoot, {
        toggle: wantsToggle,
        preserve: preserveSelection,
        targetIds: dragIds,
        propertiesTarget,
        subMesh: hitObj?.isMesh ? hitObj : null,
      });

      if (transformToolRef.current === 'rotate') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Para ensambles Mila, recolectar los puestos (asientos/mesas) y el puesto clickeado
      let milaSeats = null;
      let clickedMilaSeatIndex = 0;
      if (
        (root?.userData?.kind === 'MILA_ASSEMBLY' ||
          root?.userData?.type === 'mila' ||
          String(root?.userData?.line || '').toUpperCase() === 'MILA') &&
        ![
          'armrest-left',
          'armrest-right',
          'armrest-center',
          'screen',
          'giro-surface',
          'accessory',
          'panel-divisor',
          'booth-table',
          'screen-izq',
          'screen-der',
        ].includes(
          String(root?.userData?.meta?.role || root?.userData?.role || '').toLowerCase()
        ) &&
        root?.userData?.kind !== 'MILA_GIRO_SURFACE' &&
        root?.userData?.kind !== 'MILA_PANEL_DIVISOR_ASSEMBLY'
      ) {
        let clickedSeat = null;
        let c = hitObj;
        while (c && c !== scene) {
          if (
            c.userData?.kind === 'GLB_PART' &&
            String(c.userData?.meta?.role || '').toLowerCase() === 'seat'
          ) {
            clickedSeat = c;
            break;
          }
          c = c.parent;
        }

        const seatNodes = [];
        root.traverse((node) => {
          if (
            node.userData?.kind === 'GLB_PART' &&
            String(node.userData?.meta?.role || '').toLowerCase() === 'seat'
          ) {
            seatNodes.push(node);
          }
        });

        // Ordenar de izquierda a derecha (por posición X)
        seatNodes.sort((a, b) => a.position.x - b.position.x);

        milaSeats = seatNodes.map((node, idx) => ({
          instanceId: node.userData?.instanceId || node.uuid,
          code: node.userData?.codigoPT || node.userData?.code,
          seatMode:
            node.userData?.meta?.seatMode ||
            resolveMilaSeatModeByCode(node.userData?.codigoPT || node.userData?.code),
          label: `Puesto ${idx + 1}`,
          index: idx,
        }));

        let hasArmrestLeft = false;
        let hasArmrestRight = false;
        let hasArmrestCenter = false;
        let hasScreen = false;

        root.traverse((node) => {
          const role = String(node.userData?.meta?.role || node.userData?.role || '').toLowerCase();
          if (role === 'armrest-left') hasArmrestLeft = true;
          if (role === 'armrest-right') hasArmrestRight = true;
          if (role === 'armrest-center') hasArmrestCenter = true;
          if (role === 'screen') hasScreen = true;
        });

        if (clickedSeat) {
          const clickedId = clickedSeat.userData?.instanceId || clickedSeat.uuid;
          const foundIdx = milaSeats.findIndex((s) => s.instanceId === clickedId);
          if (foundIdx >= 0) clickedMilaSeatIndex = foundIdx;
        }

        // Propiedades de accesorios para el popup de propiedades
        root.userData._milaArmrestLeft = hasArmrestLeft;
        root.userData._milaArmrestRight = hasArmrestRight;
        root.userData._milaArmrestCenter = hasArmrestCenter;
        root.userData._milaHasScreen = hasScreen;
        root.userData._milaQuantity = seatNodes.length;
      }

      //para propiedades flotantes p popup:
      onFloatingEditorRequest?.({
        open: true,
        x: e.clientX,
        y: e.clientY,
        part: {
          code: propertiesTarget.userData?.codigoPT || propertiesTarget.userData?.code || null,
          kind: propertiesTarget.userData?.kind || null,
          line: propertiesTarget.userData?.line || null,
          meta: propertiesTarget.userData?.meta || null,
          role:
            propertiesTarget.userData?.role ||
            propertiesTarget.userData?.meta?.role ||
            root.userData?.role ||
            root.userData?.meta?.role ||
            null,
          groupId: propertiesTarget.userData?.groupId || null,
          groupName: propertiesTarget.userData?.groupName || null,
          logicalCode: propertiesTarget.userData?.logicalCode || null,
          instanceId: propertiesTarget.userData?.instanceId || null,
          description:
            propertiesTarget.userData?.description ||
            propertiesTarget.userData?.name ||
            root.userData?.description ||
            root.userData?.name ||
            null,
          config: propertiesTarget.userData?.config || root.userData?.config || null,
          userData: propertiesTarget.userData || root.userData || null,
          parentAssemblyId:
            propertiesTarget.userData?.parentAssemblyId || root.userData?.parentAssemblyId || null,
          ductCovers: propertiesTarget.userData?.ductCovers || null,
          showGrid: propertiesTarget.userData?.showGrid !== false,
          gridSize: propertiesTarget.userData?.isFloor
            ? propertiesTarget.userData?.gridSize || 0.1
            : undefined,
          mepalVariant: propertiesTarget.userData?.mepalVariant || 'normal',
          almacenVariant: propertiesTarget.userData?.almacenVariant || null,
          almacenCategory: propertiesTarget.userData?.almacenCategory || null,
          almacenVariants: propertiesTarget.userData?.almacenVariants || null,
          seats: milaSeats,
          clickedSeatIndex: clickedMilaSeatIndex,
          armrestLeft: milaSeats ? root.userData?._milaArmrestLeft || false : undefined,
          armrestRight: milaSeats ? root.userData?._milaArmrestRight || false : undefined,
          armrestCenter: milaSeats ? root.userData?._milaArmrestCenter || false : undefined,
          hasScreen: milaSeats ? root.userData?._milaHasScreen || false : undefined,
          quantity: milaSeats
            ? root.userData?._milaQuantity || (milaSeats?.length ?? 1)
            : undefined,
          assemblyGroupId: root.userData?.groupId || root.userData?.instanceId || root.uuid,
        },
      });

      if (movementRoot?.userData?.lockedMovement) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const isKuoAssemblyRoot =
        root?.userData?.kind === 'KUO_AV_ASSEMBLY' ||
        root?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY';

      if (
        moveAsGroupRef.current &&
        (root?.userData?.groupId || root?.userData?.parentAssemblyId || isKuoAssemblyRoot)
      ) {
        if (isKuoAssemblyRoot) {
          const assembly = root;
          const physicalObjects = parts.map(({ obj }) => obj).filter(Boolean);

          // Encontrar todas las mesas acopladas magnéticamente en el cluster
          const clusterAssemblies = new Set([assembly]);
          let changed = true;
          while (changed) {
            changed = false;
            physicalObjects.forEach((candidate) => {
              const candAssembly = candidate.userData?.kind?.includes('ASSEMBLY')
                ? candidate
                : null;
              if (!candAssembly || clusterAssemblies.has(candAssembly)) return;

              for (const clAss of clusterAssemblies) {
                const clInstId = clAss.userData?.instanceId || clAss.uuid;
                const candInstId = candAssembly.userData?.instanceId || candAssembly.uuid;
                if (
                  candAssembly.userData?.attachment?.targetAssemblyId === clInstId ||
                  clAss.userData?.attachment?.targetAssemblyId === candInstId ||
                  clAss.userData?.attachedNeighbors?.has(candInstId) ||
                  candAssembly.userData?.attachedNeighbors?.has(clInstId)
                ) {
                  clusterAssemblies.add(candAssembly);
                  changed = true;
                  break;
                }
              }
            });
          }

          const assemblyIds = new Set();
          clusterAssemblies.forEach((ass) => {
            if (ass.userData?.instanceId) assemblyIds.add(ass.userData.instanceId);
            if (ass.userData?.code) assemblyIds.add(ass.userData.code);
            assemblyIds.add(ass.uuid);
          });

          const members = physicalObjects.filter(
            (candidate) =>
              clusterAssemblies.has(candidate) ||
              [...clusterAssemblies].some((ass) => isDescendantOf(candidate, ass)) ||
              assemblyIds.has(candidate.userData?.parentAssemblyId)
          );
          dragGroupStartRef.current = members.map((obj) => ({
            obj,
            position: obj.position.clone(),
          }));
        } else {
          const grouped = getGroupedObjects(root);
          dragGroupStartRef.current = grouped.map((obj) => ({
            obj,
            position: obj.position.clone(),
          }));
        }
      } else {
        dragGroupStartRef.current = null;
      }

      dragRootStartRef.current = movementRoot.position.clone();

      // ---- DRAG ----
      const rootAssembly =
        getAssemblyObject(movementRoot) || getKoncisaAssemblyObject(movementRoot) || movementRoot;
      const targetToDrag = moveAsGroupRef.current ? rootAssembly : movementRoot;

      let dragTargets = [];
      if (
        moveAsGroupRef.current &&
        dragGroupStartRef.current &&
        dragGroupStartRef.current.length > 0
      ) {
        dragTargets = dragGroupStartRef.current.map((item) => item.obj);
      } else {
        const dragIdSet = new Set(dragIds);
        dragIdSet.add(rootId);
        if (moveAsGroupRef.current && rootAssembly.userData?.instanceId) {
          dragIdSet.add(rootAssembly.userData.instanceId);
        }

        const allSceneCandidates = Array.from(
          new Set([...parts.map(({ obj }) => obj), ...scene.children])
        ).filter(Boolean);

        const dragCandidates = allSceneCandidates.filter((obj) =>
          dragIdSet.has(obj?.userData?.instanceId || obj?.uuid)
        );

        const dragCandidateSet = new Set(dragCandidates);
        dragTargets = dragCandidates.filter((obj) => {
          let ancestor = obj.parent;
          while (ancestor) {
            if (dragCandidateSet.has(ancestor)) return false;
            ancestor = ancestor.parent;
          }
          return true;
        });

        if (!dragTargets.length && targetToDrag) {
          dragTargets = [targetToDrag];
        }

        // Si se mueve en modo individual, separar de las conexiones magnéticas del banco
        dragTargets.forEach((targetObj) => {
          const targetAssembly = targetObj.userData?.kind?.includes('ASSEMBLY') ? targetObj : null;
          if (targetAssembly) {
            targetAssembly.userData.attachment = null;
            if (targetAssembly.userData.attachedNeighbors) {
              targetAssembly.userData.attachedNeighbors.clear();
            }
          }
        });
      }

      if (!dragTargets.length) {
        dragTargets = [targetToDrag];
      }

      if (dragTargets.some((obj) => obj.userData?.lockedMovement)) return;

      dragPlane.set(new THREE.Vector3(0, 1, 0), -targetToDrag.position.y);
      if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return;
      dragOffset.copy(dragPoint).sub(targetToDrag.position);
      dragSession3D = {
        pointerId: e.pointerId,
        pointerStart: dragPoint.clone(),
        screenStartX: e.clientX,
        screenStartY: e.clientY,
        initialPositions: dragTargets.map((obj) => ({
          obj,
          localPosition: obj.position.clone(),
          worldPosition: obj.getWorldPosition(new THREE.Vector3()),
        })),
      };
      isDragging = false;
      hasMoved3D = false;

      if (root.userData?.kind === 'KUO_AV_ASSEMBLY') {
        if (root.userData?.attachment) {
          root.userData.attachment = null;
        }

        console.log('[KUO FINAL DRAG]');
        console.log(`pointerDown: true`);
        console.log(`clickedObject: ${hitObj.name || hitObj.userData?.code || 'mesh'}`);
        console.log(`rootObject: ${root.name || 'assembly'}`);
        console.log(`instanceId: ${root.userData?.instanceId}`);
        console.log(`groupId: ${root.userData?.groupId}`);
        console.log(`dragStart: true`);
        console.log(
          `position: [${(root.position.x * 1000).toFixed(1)}, ${(root.position.y * 1000).toFixed(1)}, ${(root.position.z * 1000).toFixed(1)}]`
        );

        console.log('\n[KUO DRAG TARGET]');
        console.log(`clickedObject: ${hitObj.name || hitObj.userData?.code || 'mesh'}`);
        console.log(`rootObject: ${root.name || 'assembly'}`);
        console.log(`rootKind: ${root.userData?.kind}`);
        console.log(`instanceId: ${root.userData?.instanceId}`);
        console.log(`groupId: ${root.userData?.groupId}`);
        console.log(`dragTarget: ${root.name || 'assembly'}`);
        console.log(`dragTargetKind: ${root.userData?.kind}`);
        console.log(`dragTargetParent: ${root.parent?.type || 'Scene'}`);

        console.log('\n[KUO INTERACTION]');
        console.log('POINTER DOWN');
        console.log(`clickedObject: ${hitObj.name || hitObj.userData?.code || 'mesh'}`);
        console.log(`rootObject: ${root.userData?.kind}`);
        console.log(`instanceId: ${root.userData?.instanceId}`);

        console.log('\n[KUO INTERACTION]');
        console.log('DRAG START');
        console.log(`instanceId: ${root.userData?.instanceId}`);
        console.log(
          `position: [${(root.position.x * 1000).toFixed(1)}, ${(root.position.y * 1000).toFixed(1)}, ${(root.position.z * 1000).toFixed(1)}]`
        );
      }

      controls.enabled = false;
      renderer.domElement.setPointerCapture?.(e.pointerId);

      e.preventDefault();
      e.stopPropagation();
    }

    function onPointerMove(e) {
      if (readOnly) return;

      updateMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);

      if (edukHandleDragSession) {
        updateEdukHandleDrag(e);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (edukTableHandleGroup.visible && !isDragging && !isRotating3D) {
        const edukHandleHits = raycaster.intersectObjects(edukTableHandleGroup.children, true);
        const direction = edukHandleHits.length
          ? resolveEdukHandleDirection(edukHandleHits[0].object)
          : 0;
        setCanvasCursor(direction !== 0 ? 'pointer' : '');
      } else if (!isDragging && !isRotating3D) {
        setCanvasCursor('');
      }

      if (isRotating3D && rotationSession) {
        if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
          const pointerAngle = Math.atan2(
            dragPoint.z - rotationSession.pivot.z,
            dragPoint.x - rotationSession.pivot.x
          );
          updateRotation({
            deltaAngle: pointerAngle - rotationPointerStartAngle,
            snapAngle: e.shiftKey ? THREE.MathUtils.degToRad(15) : 0,
          });
        }
        return;
      }
      if (!dragSession3D || !activePart) return;

      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        const screenDelta = Math.hypot(
          e.clientX - (dragSession3D.screenStartX || 0),
          e.clientY - (dragSession3D.screenStartY || 0)
        );
        const worldDelta = dragPoint.clone().sub(dragSession3D.pointerStart);

        if (!hasMoved3D && (screenDelta > 3 || worldDelta.length() > 0.005)) {
          hasMoved3D = true;
          isDragging = true;
        }

        if (hasMoved3D) {
          worldDelta.y = 0;
          const posBefore = activePart.position.clone();
          dragSession3D.initialPositions.forEach(({ obj, worldPosition }) => {
            setObjectWorldPosition(obj, worldPosition.clone().add(worldDelta));
            if (obj.userData?.kind === 'KUO_AV_ASSEMBLY') {
              obj.position.y = 0;
              obj.updateMatrixWorld(true);
            }
          });

          if (activePart.userData?.kind === 'KUO_AV_ASSEMBLY') {
            console.log('[KUO FINAL DRAG]');
            console.log(`dragMove: true`);
            console.log(`instanceId: ${activePart.userData?.instanceId}`);
            console.log(
              `oldPosition: [${(posBefore.x * 1000).toFixed(1)}, 0.0, ${(posBefore.z * 1000).toFixed(1)}]`
            );
            console.log(
              `newPosition: [${(activePart.position.x * 1000).toFixed(1)}, 0.0, ${(activePart.position.z * 1000).toFixed(1)}]`
            );
            console.log(`positionApplied: true`);
            console.log(
              `actualPosition: [${(activePart.position.x * 1000).toFixed(1)}, 0.0, ${(activePart.position.z * 1000).toFixed(1)}]`
            );

            console.log('\n[KUO WORLD DEBUG]');
            console.log(
              `floorPosition: [${floorMeshRef.current?.position.x.toFixed(1)}, ${floorMeshRef.current?.position.y.toFixed(1)}, ${floorMeshRef.current?.position.z.toFixed(1)}]`
            );
            console.log(
              `gridPosition: [${gridHelperRef.current?.position.x.toFixed(1)}, ${gridHelperRef.current?.position.y.toFixed(1)}, ${gridHelperRef.current?.position.z.toFixed(1)}]`
            );

            console.log('\n[KUO DRAG POSITION]');
            console.log(`instanceId: ${activePart.userData?.instanceId}`);
            console.log(
              `oldPosition: [${(posBefore.x * 1000).toFixed(1)}, 0.0, ${(posBefore.z * 1000).toFixed(1)}]`
            );
            console.log(
              `newPosition: [${(activePart.position.x * 1000).toFixed(1)}, 0.0, ${(activePart.position.z * 1000).toFixed(1)}]`
            );

            console.log('\n[KUO INTERACTION]');
            console.log('DRAG MOVE');
            console.log(`instanceId: ${activePart.userData?.instanceId}`);
            console.log(`x: ${(activePart.position.x * 1000).toFixed(1)}`);
            console.log(`y: ${(activePart.position.y * 1000).toFixed(1)}`);
            console.log(`z: ${(activePart.position.z * 1000).toFixed(1)}`);

            console.log('\n[KUO INTERACTION]');
            console.log('SYNC 3D → 2D');
            console.log(`instanceId: ${activePart.userData?.instanceId}`);
            console.log(
              `position: [${(activePart.position.x * 1000).toFixed(1)}, ${(activePart.position.y * 1000).toFixed(1)}, ${(activePart.position.z * 1000).toFixed(1)}]`
            );

            // Si este ensamble tiene otros ensambles pegados encima, moverlos juntos
            const movingId = activePart.userData?.instanceId;
            if (movingId) {
              parts.forEach(({ obj }) => {
                if (
                  obj &&
                  obj !== activePart &&
                  obj.userData?.attachment?.targetAssemblyId === movingId
                ) {
                  const off = obj.userData.attachment.offsetLocal;
                  if (off) {
                    obj.position.set(
                      activePart.position.x + off.x,
                      0,
                      activePart.position.z + off.z
                    );
                    obj.updateMatrixWorld(true);
                  }
                }
              });
            }
          }

          if (selectionHelper) selectionHelper.update();
          return;
        }
      }
      refreshFloorAndGrid();
    }

    /**
     * Snap bidireccional inteligente entre Ensambles Mila y Superficies de Giro Mila.
     * Retorna true si se aplicó un snap de Mila/Giro, evitando que el snap genérico
     * resetee la posición o distorsione la rotación.
     */
    function snapMilaAndGiroSurfaces(target) {
      if (!target) return { snapped: false, mergeCandidate: null };

      const targetObj = getMilaAssemblyRoot(target);

      if (!targetObj) return { snapped: false, mergeCandidate: null };

      const activeGroupId = targetObj.userData?.groupId;
      const allAssemblies = [];
      const allGiroSurfaces = [];
      const allAccessories = [];
      const allPanelDivisors = [];
      scene.children.forEach((node) => {
        if (node === targetObj) return;
        if (activeGroupId && node.userData?.groupId === activeGroupId) return;

        const r = String(node.userData?.meta?.role || node.userData?.role || '').toLowerCase();
        if (node.userData?.kind === 'MILA_ASSEMBLY' || node.userData?.type === 'mila') {
          allAssemblies.push(node);
        } else if (
          node.userData?.kind === 'MILA_PANEL_DIVISOR_ASSEMBLY' ||
          node.userData?.type === 'mila-panel-divisor'
        ) {
          allPanelDivisors.push(node);
        } else if (
          node.userData?.kind === 'MILA_GIRO_SURFACE' ||
          node.userData?.type === 'MILA_GIRO_SURFACE' ||
          r === 'giro-surface'
        ) {
          allGiroSurfaces.push(node);
        } else if (
          r === 'armrest-left' ||
          r === 'armrest-right' ||
          r === 'armrest-center' ||
          r === 'screen'
        ) {
          allAccessories.push(node);
        }
      });

      const snapResult = findBestMilaConnectorSnap({
        activeAssembly: targetObj,
        allAssemblies,
        allGiroSurfaces,
        allAccessories,
        allPanelDivisors,
      });

      if (snapResult && snapResult.targetTransform && snapResult.targetObj) {
        const posBefore = targetObj.position.clone();
        const rotBefore = targetObj.rotation.y;
        const posAfter = new THREE.Vector3(
          snapResult.targetTransform.x,
          snapResult.targetTransform.y,
          snapResult.targetTransform.z
        );
        const rotAfter = snapResult.targetTransform.rotY;
        const deltaRot = rotAfter - rotBefore;
        const deltaQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          deltaRot
        );

        if (activeGroupId) {
          // Si el objeto forma parte de una composición continua conectada,
          // transformar todo el grupo rígidamente manteniendo sus distancias y ángulos internos intactos
          scene.children.forEach((node) => {
            if (node.userData?.groupId === activeGroupId && node !== targetObj) {
              const rel = node.position.clone().sub(posBefore).applyQuaternion(deltaQuat);
              node.position.copy(posAfter.clone().add(rel));
              node.rotation.y += deltaRot;
              node.updateMatrixWorld(true);
            }
          });
        }

        targetObj.position.copy(posAfter);
        targetObj.rotation.set(0, rotAfter, 0);
        targetObj.updateMatrixWorld(true);

        unifyMilaConnectedAssemblies(targetObj, snapResult.targetObj);
        updateMilaConnectors();
        return {
          snapped: true,
          mergeCandidate: {
            activeObj: targetObj,
            targetObj: snapResult.targetObj,
          },
        };
      }
      return { snapped: false, mergeCandidate: null };
    }

    function isMilaSeatAssemblyRoot(obj) {
      if (!obj) return false;

      const role = String(obj.userData?.meta?.role || obj.userData?.role || '').toLowerCase();
      if (
        role === 'armrest-left' ||
        role === 'armrest-right' ||
        role === 'armrest-center' ||
        role === 'screen' ||
        role === 'giro-surface' ||
        role === 'panel-divisor' ||
        role === 'booth-table' ||
        role === 'screen-izq' ||
        role === 'screen-der'
      ) {
        return false;
      }

      if (obj.userData?.kind === 'MILA_GIRO_SURFACE') return false;
      if (obj.userData?.kind === 'MILA_PANEL_DIVISOR_ASSEMBLY') return false;
      if (obj.userData?.type === 'mila-panel-divisor') return false;
      if (obj.userData?.type === 'MILA_GIRO_SURFACE') return false;

      return (
        obj.userData?.kind === 'MILA_ASSEMBLY' ||
        obj.userData?.type === 'mila' ||
        String(obj.userData?.line || '').toUpperCase() === 'MILA' ||
        String(obj.userData?.line || '').toUpperCase() === 'MILA_DOUBLE'
      );
    }

    function collectMilaSeatParts(root) {
      const out = [];
      if (!root) return out;

      root.traverse((node) => {
        if (
          node?.userData?.kind === 'GLB_PART' &&
          String(node.userData?.meta?.role || '').toLowerCase() === 'seat'
        ) {
          out.push(node);
        }
      });

      return out;
    }

    function resolveMilaAssemblyVariant(root) {
      const variant = String(root?.userData?.config?.variant || '')
        .trim()
        .toLowerCase();
      if (variant === 'single' || variant === 'double') return variant;

      const line = String(root?.userData?.line || '')
        .trim()
        .toUpperCase();
      if (line === 'MILA_DOUBLE') return 'double';
      return 'single';
    }

    function isMilaGiroSurfaceRoot(obj) {
      if (!obj) return false;
      const role = String(obj.userData?.meta?.role || obj.userData?.role || '').toLowerCase();
      return (
        obj.userData?.kind === 'MILA_GIRO_SURFACE' ||
        obj.userData?.type === 'MILA_GIRO_SURFACE' ||
        role === 'giro-surface'
      );
    }

    function isMilaAccessoryRoot(obj) {
      if (!obj) return false;
      const role = String(obj.userData?.meta?.role || obj.userData?.role || '').toLowerCase();
      return (
        role === 'armrest-left' ||
        role === 'armrest-right' ||
        role === 'armrest-center' ||
        role === 'screen'
      );
    }

    function collectMilaAttachedGiroRoots(mergeRoots) {
      if (!Array.isArray(mergeRoots) || !mergeRoots.length) return [];

      const mergeRootIdSet = new Set(
        mergeRoots
          .map((root) => root?.userData?.instanceId || root?.uuid)
          .filter((value) => typeof value === 'string' && value.trim())
      );

      const mergeGroupIdSet = new Set(
        mergeRoots
          .map((root) => root?.userData?.groupId)
          .filter((value) => typeof value === 'string' && value.trim())
      );

      return scene.children.filter((node) => {
        if (!isMilaGiroSurfaceRoot(node)) return false;

        const groupId = node.userData?.groupId;
        if (groupId && mergeGroupIdSet.has(groupId)) return true;

        const parentAssemblyId = node.userData?.parentAssemblyId;
        return !!(parentAssemblyId && mergeRootIdSet.has(parentAssemblyId));
      });
    }

    function collectMilaAttachedAccessoryRoots(mergeRoots) {
      if (!Array.isArray(mergeRoots) || !mergeRoots.length) return [];

      const mergeRootIdSet = new Set(
        mergeRoots
          .map((root) => root?.userData?.instanceId || root?.uuid)
          .filter((value) => typeof value === 'string' && value.trim())
      );

      const mergeGroupIdSet = new Set(
        mergeRoots
          .map((root) => root?.userData?.groupId)
          .filter((value) => typeof value === 'string' && value.trim())
      );

      return scene.children.filter((node) => {
        if (!isMilaAccessoryRoot(node)) return false;

        const groupId = node.userData?.groupId;
        if (groupId && mergeGroupIdSet.has(groupId)) return true;

        const parentAssemblyId = node.userData?.parentAssemblyId;
        return !!(parentAssemblyId && mergeRootIdSet.has(parentAssemblyId));
      });
    }

    function collectMilaMergeRoots(activeObj, targetObj) {
      const rootA = getMilaAssemblyRoot(activeObj) || activeObj;
      const rootB = getMilaAssemblyRoot(targetObj) || targetObj;

      if (!isMilaSeatAssemblyRoot(rootA) || !isMilaSeatAssemblyRoot(rootB)) return [];

      const seedGroupIds = new Set(
        [rootA.userData?.groupId, rootB.userData?.groupId].filter(
          (value) => typeof value === 'string' && value.trim()
        )
      );

      const allMilaRoots = scene.children.filter((node) => isMilaSeatAssemblyRoot(node));
      const merged = [];
      allMilaRoots.forEach((node) => {
        if (node === rootA || node === rootB) {
          merged.push(node);
          return;
        }

        const gid = node.userData?.groupId;
        if (gid && seedGroupIds.has(gid)) {
          merged.push(node);
        }
      });

      const unique = [];
      const seen = new Set();
      merged.forEach((node) => {
        const id = node.userData?.instanceId || node.uuid;
        if (!id || seen.has(id)) return;
        seen.add(id);
        unique.push(node);
      });

      return unique;
    }

    function resolveMilaRecomposeTargetConfig(roots, quantity, extraRoots = []) {
      const variants = roots.map((root) => resolveMilaAssemblyVariant(root));
      const uniqueVariants = Array.from(new Set(variants));

      // Regla de negocio: no recomponer si se mezclan Mila simple y Mila doble.
      if (uniqueVariants.length > 1) {
        return null;
      }

      const variant = uniqueVariants[0] || 'single';

      const seatModes = [];
      let armrestLeft = false;
      let armrestRight = false;
      let armrestCenter = false;
      let hasScreen = false;

      const rootsForAccessoryScan = [...roots, ...(Array.isArray(extraRoots) ? extraRoots : [])];

      rootsForAccessoryScan.forEach((root) => {
        root.traverse((node) => {
          const role = String(
            node?.userData?.meta?.role || node?.userData?.role || ''
          ).toLowerCase();
          if (!role) return;

          if (role === 'seat') {
            seatModes.push(
              String(node.userData?.meta?.seatMode || 'chair')
                .trim()
                .toLowerCase()
            );
            return;
          }
          if (role === 'armrest-left') armrestLeft = true;
          if (role === 'armrest-right') armrestRight = true;
          if (role === 'armrest-center') armrestCenter = true;
          if (role === 'screen') hasScreen = true;
        });
      });

      const allTableLike =
        seatModes.length > 0 &&
        seatModes.every((mode) => mode === 'table' || mode === 'tablegrommet');
      const allTableGrommet =
        seatModes.length > 0 && seatModes.every((mode) => mode === 'tablegrommet');

      return {
        type: 'seat',
        quantity,
        variant,
        useTable: variant === 'single' ? allTableLike : false,
        useTableGrommet: variant === 'single' ? allTableLike && allTableGrommet : false,
        armrestLeft,
        armrestRight,
        armrestCenter: quantity > 1 ? armrestCenter : false,
        hasScreen,
      };
    }

    function resnapGiroSurfaceToAssembly(giroRoot, targetAssembly) {
      if (!giroRoot || !targetAssembly) return false;

      const snapResult = findBestMilaConnectorSnap({
        activeAssembly: giroRoot,
        allAssemblies: [targetAssembly],
        allGiroSurfaces: [],
        allAccessories: [],
        allPanelDivisors: [],
      });

      if (!snapResult?.targetTransform) return false;

      giroRoot.position.set(
        snapResult.targetTransform.x,
        snapResult.targetTransform.y,
        snapResult.targetTransform.z
      );
      giroRoot.rotation.set(0, snapResult.targetTransform.rotY, 0);
      giroRoot.updateMatrixWorld(true);

      unifyMilaConnectedAssemblies(giroRoot, targetAssembly);
      return true;
    }

    function resolveProjectedAnchorSeat(roots, yaw) {
      const xDir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      let best = null;

      roots.forEach((root) => {
        const seats = collectMilaSeatParts(root);
        seats.forEach((seat) => {
          const worldPos = seat.getWorldPosition(new THREE.Vector3());
          const projection = worldPos.dot(xDir);
          if (!best || projection < best.projection) {
            best = { worldPos, projection };
          }
        });
      });

      return best?.worldPos?.clone() || null;
    }

    function alignMilaAssemblyLeftAnchor(assembly, anchorWorldPos, yaw) {
      if (!assembly || !anchorWorldPos) return;

      assembly.rotation.set(0, yaw, 0);
      assembly.updateMatrixWorld(true);

      const xDir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const seats = collectMilaSeatParts(assembly);
      if (!seats.length) return;

      let leftmost = null;
      seats.forEach((seat) => {
        const worldPos = seat.getWorldPosition(new THREE.Vector3());
        const projection = worldPos.dot(xDir);
        if (!leftmost || projection < leftmost.projection) {
          leftmost = { worldPos, projection };
        }
      });

      if (!leftmost?.worldPos) return;

      const delta = anchorWorldPos.clone().sub(leftmost.worldPos);
      assembly.position.add(delta);
      assembly.updateMatrixWorld(true);
    }

    async function recomposeMilaAssembliesAfterSnap(mergeCandidate) {
      if (!mergeCandidate?.activeObj || !mergeCandidate?.targetObj) return false;

      const mergeRoots = collectMilaMergeRoots(mergeCandidate.activeObj, mergeCandidate.targetObj);
      if (mergeRoots.length < 2) return false;

      const totalSeats = mergeRoots.reduce(
        (sum, root) => sum + collectMilaSeatParts(root).length,
        0
      );
      const clampedQuantity = Math.max(1, Math.min(4, totalSeats));

      if (clampedQuantity <= 1) return false;

      const desiredYaw = Number(
        mergeCandidate.targetObj?.rotation?.y || mergeRoots[0]?.rotation?.y || 0
      );
      const anchorWorldPos = resolveProjectedAnchorSeat(mergeRoots, desiredYaw);
      const accessoryRoots = collectMilaAttachedAccessoryRoots(mergeRoots);
      const recomposeConfig = resolveMilaRecomposeTargetConfig(
        mergeRoots,
        clampedQuantity,
        accessoryRoots
      );
      if (!recomposeConfig) return false;
      const giroRoots = collectMilaAttachedGiroRoots(mergeRoots);

      const api = {
        createMilaAssemblyGroup,
        addExternalGlbPart,
        selectObject: (obj) => {
          if (obj) setActivePart(obj);
        },
      };

      let created = null;
      try {
        created = await createMilaInstance({
          api,
          config: {
            ...recomposeConfig,
            silentCreation: true,
          },
          notify: (msg) => console.warn('[MILA RECOMPOSE] ', msg),
          buildHidden: true,
          deferReveal: true,
        });
      } catch (error) {
        console.error('[MILA RECOMPOSE] Error recreando ensamblaje:', error);
        return false;
      }

      const newAssembly = created?.assembly || null;
      if (!newAssembly) return false;

      alignMilaAssemblyLeftAnchor(newAssembly, anchorWorldPos, desiredYaw);

      const rootsToRemove = Array.from(new Set([...mergeRoots, ...accessoryRoots]));
      rootsToRemove.forEach((root) => {
        removePartObject(root, { emitBom: false });
      });

      giroRoots.forEach((giroRoot) => {
        resnapGiroSurfaceToAssembly(giroRoot, newAssembly);
      });

      newAssembly.visible = true;
      newAssembly.updateMatrixWorld(true);

      setActivePart(newAssembly);
      emitBOM();
      refreshFloorAndGrid();
      updateMilaConnectors();

      return true;
    }

    async function onPointerUp(e) {
      if (endEdukHandleDrag(e.pointerId)) {
        e.preventDefault();
        return;
      }

      if (isRotating3D) {
        isRotating3D = false;
        endRotation();
        controls.enabled = true;
        snapActivePart(true);
        try {
          renderer.domElement.releasePointerCapture?.(e.pointerId);
        } catch (err) {
          void err;
        }
        return;
      }
      if (readOnly) {
        try {
          renderer.domElement.releasePointerCapture?.(e.pointerId);
        } catch (err) {
          void err;
        }
        isDragging = false;
        hasMoved3D = false;
        controls.enabled = true;
        return;
      }
      if (!dragSession3D && !isDragging) return;

      const completedDragSession = dragSession3D;
      const didActuallyMove = hasMoved3D;

      isDragging = false;
      hasMoved3D = false;
      dragSession3D = null;
      controls.enabled = true;

      try {
        renderer.domElement.releasePointerCapture?.(e.pointerId);
      } catch (err) {
        void err;
      }

      dragGroupStartRef.current = null;
      dragRootStartRef.current = null;

      // SOLO ejecutar snap e historial si el usuario REALMENTE arrastró la pieza
      if (didActuallyMove && activePart) {
        const milaSnapResult = snapMilaAndGiroSurfaces(activePart);
        const snappedMila = !!milaSnapResult?.snapped;

        let activeLocalBeforeSnap = null;
        if (!snappedMila) {
          activeLocalBeforeSnap = activePart?.position.clone();
          const activeWorldBeforeSnap = activePart?.getWorldPosition(new THREE.Vector3());
          snapActivePart(true);
          if (
            completedDragSession &&
            activeLocalBeforeSnap &&
            activeWorldBeforeSnap &&
            activePart
          ) {
            const snapDelta = activePart
              .getWorldPosition(new THREE.Vector3())
              .sub(activeWorldBeforeSnap);
            activePart.position.copy(activeLocalBeforeSnap);
            activePart.updateMatrixWorld(true);
            if (snapDelta.lengthSq() > 0) {
              completedDragSession.initialPositions.forEach(({ obj }) => {
                const currentWorld = obj.getWorldPosition(new THREE.Vector3());
                setObjectWorldPosition(obj, currentWorld.add(snapDelta));
              });
            }
          }
        }

        // Ajuste magnético interactivo de Pantalla al arrastrarla en el 3D
        if (
          activePart?.userData?.role === 'PANTALLA' ||
          activePart?.userData?.type === 'pantalla' ||
          activePart?.userData?.kind === 'KUO_AV_PANTALLA_ASSEMBLY'
        ) {
          // 1. Si es parte interna de un Puesto Doble
          const parentAss = getKoncisaAssemblyObject(activePart);
          if (
            parentAss &&
            parentAss.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY' &&
            parentAss !== activePart
          ) {
            const worldPos = activePart.getWorldPosition(new THREE.Vector3());
            const localPos = parentAss.worldToLocal(worldPos);
            let newPos = 'CENTRAL';
            if (localPos.z > 0.2) {
              newPos = 'FRONTAL';
            } else if (localPos.z < -0.2) {
              newPos = 'POSTERIOR';
            }
            const instId = parentAss.userData?.instanceId || parentAss.uuid;
            if (instId) {
              void swapKuoAVDobleVariant(instId, { pantallaPosicion: newPos, pantalla: true });
            }
          } else if (activePart?.userData?.kind === 'KUO_AV_PANTALLA_ASSEMBLY') {
            // 2. Si es una Pantalla Flotante / Independiente, buscar mesa cercana para acoplarse
            const panWorld = activePart.getWorldPosition(new THREE.Vector3());
            const isPerimetralScreen = activePart.userData?.config?.tipo === 'FRONTAL_PERIMETRAL';
            let nearestDesk = null;
            let minDeskDist = Infinity;

            parts.forEach(({ obj }) => {
              if (!obj || obj === activePart) return;

              const isDouble = obj.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY';
              const isSingle = obj.userData?.kind === 'KUO_AV_ASSEMBLY';

              // Si es pantalla Frontal Perimetral, acepta Puesto Doble Y Puesto Perimetral
              // Si es pantalla normal (FMT o Vidrio Doble), solo acepta Puesto Doble
              if (isDouble || (isPerimetralScreen && isSingle)) {
                const deskPos = obj.getWorldPosition(new THREE.Vector3());
                const d = new THREE.Vector2(
                  panWorld.x - deskPos.x,
                  panWorld.z - deskPos.z
                ).length();
                if (d < 1.8 && d < minDeskDist) {
                  minDeskDist = d;
                  nearestDesk = obj;
                }
              }
            });

            if (nearestDesk) {
              // Acople magnético sobre la mesa compatible
              activePart.rotation.y = nearestDesk.rotation.y;
              const deskPos = nearestDesk.position.clone();
              const isSingle = nearestDesk.userData?.kind === 'KUO_AV_ASSEMBLY';

              if (isSingle) {
                // En Puesto Perimetral, la pantalla siempre queda al lado de los tomas (borde posterior)
                const depthMm = nearestDesk.userData?.config?.profundidadMm || 600;
                const halfDepthM = depthMm / 2000;
                const offsetZ = -halfDepthM;
                const offsetY = 0.632;

                activePart.position.set(deskPos.x, deskPos.y + offsetY, deskPos.z + offsetZ);
                activePart.updateMatrixWorld(true);

                activePart.userData.attachment = {
                  targetAssemblyId: nearestDesk.userData?.instanceId || nearestDesk.uuid,
                  mode: 'PERIMETRAL_SCREEN_ATTACHMENT',
                  offsetLocal: {
                    x: 0,
                    y: offsetY,
                    z: offsetZ,
                  },
                };
              } else {
                // En Puesto Doble, ranura Central, Frontal o Posterior
                const depthMm = nearestDesk.userData?.config?.profundidadMm || 600;
                const halfDepthM = depthMm / 2000;
                const gapM = 0.025;

                const localZ = panWorld.z - deskPos.z;
                let offsetZ = 0;
                const offsetY = isPerimetralScreen ? 0.632 : 0.452;

                if (localZ > 0.2) {
                  offsetZ = halfDepthM * 2 + gapM;
                } else if (localZ < -0.2) {
                  offsetZ = -(halfDepthM * 2 + gapM);
                } else {
                  offsetZ = 0; // Centro exacto en la ranura
                }

                activePart.position.set(deskPos.x, deskPos.y + offsetY, deskPos.z + offsetZ);
                activePart.updateMatrixWorld(true);

                activePart.userData.attachment = {
                  targetAssemblyId: nearestDesk.userData?.instanceId || nearestDesk.uuid,
                  mode: 'DESK_SCREEN_ATTACHMENT',
                  offsetLocal: {
                    x: 0,
                    y: offsetY,
                    z: offsetZ,
                  },
                };
              }

              if (!nearestDesk.userData.attachedNeighbors) {
                nearestDesk.userData.attachedNeighbors = new Set();
              }
              nearestDesk.userData.attachedNeighbors.add(
                activePart.userData?.instanceId || activePart.uuid
              );
            } else {
              // Sin mesa compatible cerca: permanece a altura de mesa sin acoples
              activePart.position.y = isPerimetralScreen ? 0.632 : 0.462;
              activePart.updateMatrixWorld(true);
              activePart.userData.attachment = null;
            }
          }
        }

        parts.forEach(({ obj }) => {
          if (obj?.userData?.kind === 'KUO_AV_DOBLE_ASSEMBLY') {
            checkAndApplyKuoAVLUnion(obj);
          }
        });

        if (activePart?.userData?.kind === 'KUO_AV_ASSEMBLY' && activeLocalBeforeSnap) {
          console.log('[KUO FINAL DRAG]');
          console.log(`dragEnd: true`);
          console.log(`instanceId: ${activePart.userData?.instanceId}`);
          console.log(
            `finalPosition: [${(activePart.position.x * 1000).toFixed(1)}, 0.0, ${(activePart.position.z * 1000).toFixed(1)}]`
          );
          console.log(`world: { floorPosition: [0.0, 0.0, 0.0], gridPosition: [0.0, 0.0, 0.0] }`);
          console.log(`controls: { enabled: true }`);

          console.log('\n[KUO DRAG END]');
          console.log(`instanceId: ${activePart.userData?.instanceId}`);
          console.log(
            `finalPosition: [${(activePart.position.x * 1000).toFixed(1)}, 0.0, ${(activePart.position.z * 1000).toFixed(1)}]`
          );

          console.log('\n[KUO INTERACTION]');
          console.log('DRAG END');
          console.log(`instanceId: ${activePart.userData?.instanceId}`);
          console.log(
            `position: [${(activePart.position.x * 1000).toFixed(1)}, ${(activePart.position.y * 1000).toFixed(1)}, ${(activePart.position.z * 1000).toFixed(1)}]`
          );
        }

        if (completedDragSession) {
          const before = completedDragSession.initialPositions.map(({ obj, localPosition }) =>
            createMoveSnapshot(obj, localPosition)
          );
          const after = captureMoveState(
            completedDragSession.initialPositions.map(({ obj }) => obj)
          );
          pushMoveHistory(before, after);
        }

        if (milaSnapResult?.mergeCandidate) {
          await recomposeMilaAssembliesAfterSnap(milaSnapResult.mergeCandidate);
        }
      }
      refreshFloorAndGrid();
    }

    function onDoubleClick(e) {
      if (readOnly || e.button !== 0 || !pickables.length) return;

      updateMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pickables, true);
      if (!hits.length) return;

      const root = getRootPartObject(hits[0].object);
      if (root?.userData?.isFloor) selectFloor();
    }

    function onPointerCancel(e) {
      endEdukHandleDrag(e.pointerId);
      if (isRotating3D) {
        cancelRotation();
        isRotating3D = false;
        controls.enabled = true;
      }
      cancelDragSession(e.pointerId);
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown, true);
    renderer.domElement.addEventListener('pointermove', onPointerMove, true);
    renderer.domElement.addEventListener('pointerup', onPointerUp, true);
    renderer.domElement.addEventListener('dblclick', onDoubleClick, true);
    renderer.domElement.addEventListener('lostpointercapture', onPointerCancel, true);

    window.addEventListener('pointerup', onPointerUp);
    function onWindowPointerCancel(e) {
      endEdukHandleDrag(e.pointerId);
      if (rotationSession) cancelRotation();
      cancelDragSession(e.pointerId);
    }
    function onWindowBlur() {
      endEdukHandleDrag();
      if (rotationSession) cancelRotation();
      cancelDragSession();
    }
    window.addEventListener('pointercancel', onWindowPointerCancel);
    window.addEventListener('blur', onWindowBlur);

    // ====== Resize ======
    function onResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      //console.log('ThreeCanvas size:', container.clientWidth, container.clientHeight);

      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio || 1);
    }
    window.addEventListener('resize', onResize);

    // ====== Loop ======
    let rafId;
    function animate() {
      if (!isDragging && !isRotating3D && controls.enabled === false) controls.enabled = true;

      controls.update();
      if (selectionHelper) selectionHelper.update();
      additionalSelectionHelpers.forEach((helper) => helper.update());
      updateRotationHandle();
      updateEdukTableHandles();
      updateKuoAVSnapMarkers();
      updateMilaConnectors();

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }
    animate();

    function applySurfaceEdgeFinish(surfaceObj, materialCode, materialDef = null) {
      const root = getRootPartObject(surfaceObj) || surfaceObj;

      if (!root || root.userData?.type !== 'superficie') {
        console.warn('El objeto activo no es una superficie.');
        return false;
      }

      root.userData.edgeFinish = materialCode;
      root.userData.canto = materialCode;

      root.traverse((node) => {
        if (!node?.isMesh) return;

        const isSurfaceEdge =
          node.userData?.edgeGroupKey === 'SURFACE_EDGE_ALL' ||
          node.userData?.subKey === 'canto' ||
          node.userData?.category === 'cantos' ||
          String(node.name || '')
            .toUpperCase()
            .includes('CANTO');

        if (!isSurfaceEdge) return;

        node.userData.edgeFinish = materialCode;
        node.userData.materialCode = materialCode;

        if (materialDef?.rgbValue) {
          const rgb = String(materialDef.rgbValue)
            .replaceAll('_', ',')
            .split(',')
            .map((n) => Number(n.trim()));

          if (rgb.length >= 3 && rgb.every((n) => Number.isFinite(n))) {
            node.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`),
              roughness: 0.65,
              metalness: 0,
            });
          }
        }

        node.material.needsUpdate = true;
      });

      root.updateMatrixWorld(true);

      if (selectionHelper) selectionHelper.update();

      emitBOM();
      return true;
    }

    function createSurfaceEdgeMesh({
      name,
      widthM,
      heightM,
      depthM,
      position = [0, 0, 0],
      color = 0x2f2f2f,
      edgeFinish = 'PVC-2MM',
    }) {
      const geometry = new THREE.BoxGeometry(widthM, heightM, depthM);

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.65,
        metalness: 0,
      });

      const mesh = new THREE.Mesh(geometry, material);

      mesh.name = name;
      mesh.position.set(position[0], position[1], position[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      mesh.userData = {
        isSubPart: true,
        parentType: 'superficie',
        subKey: 'canto',
        subName: 'Canto superficie',
        category: 'cantos',

        //  Todos los cantos pertenecen al mismo acabado lógico
        edgeGroupKey: 'SURFACE_EDGE_ALL',
        materialScope: 'SURFACE_EDGE_ALL',

        edgeFinish,
        description: `Canto superficie ${edgeFinish}`,
        excludeFromBOM: true,
      };

      return mesh;
    }

    function getEdgeThicknessM(edgeFinish) {
      const value = String(edgeFinish || '').toUpperCase();

      if (value.includes('1MM')) return 0.001;
      if (value.includes('2MM')) return 0.002;
      if (value.includes('3MM')) return 0.003;

      return 0.002;
    }

    function addSurfaceEdgesToGroup({
      group,
      widthM,
      depthM,
      thicknessM,
      edgeFinish = 'PVC-2MM',
      edgeThicknessM = null,
      edgeColor = 0x2f2f2f,
    }) {
      if (!group) return;

      edgeThicknessM =
        Number.isFinite(edgeThicknessM) && edgeThicknessM > 0
          ? edgeThicknessM
          : getEdgeThicknessM(edgeFinish);

      // El canto debe tener exactamente el mismo alto que el espesor de la superficie
      const edgeHeightM = thicknessM;

      // Como la superficie está centrada en Y dentro del grupo,
      // el canto también debe ir centrado en Y.
      const edgeY = 0.015; //(710 - edgeThicknessM / 2) / 1000; //

      // Canto frontal
      group.add(
        createSurfaceEdgeMesh({
          name: 'CANTO_FRONTAL',
          widthM,
          heightM: edgeHeightM,
          depthM: edgeThicknessM,
          position: [0, edgeY, -depthM / 2 - edgeThicknessM / 2],
          color: edgeColor,
          edgeFinish,
        })
      );

      // Canto posterior
      group.add(
        createSurfaceEdgeMesh({
          name: 'CANTO_POSTERIOR',
          widthM,
          heightM: edgeHeightM,
          depthM: edgeThicknessM,
          position: [0, edgeY, depthM / 2 + edgeThicknessM / 2],
          color: edgeColor,
          edgeFinish,
        })
      );

      // Canto izquierdo
      group.add(
        createSurfaceEdgeMesh({
          name: 'CANTO_IZQUIERDO',
          widthM: edgeThicknessM,
          heightM: edgeHeightM,
          depthM,
          position: [-widthM / 2 - edgeThicknessM / 2, edgeY, 0],
          color: edgeColor,
          edgeFinish,
        })
      );

      // Canto derecho
      group.add(
        createSurfaceEdgeMesh({
          name: 'CANTO_DERECHO',
          widthM: edgeThicknessM,
          heightM: edgeHeightM,
          depthM,
          position: [widthM / 2 + edgeThicknessM / 2, edgeY, 0],
          color: edgeColor,
          edgeFinish,
        })
      );
    }

    function addSurface(
      {
        widthM,
        depthM,
        thicknessM,
        line,
        codigoPT,
        dim,
        position,
        rotation,
        groupId,
        groupName,
        logicalCode,
        parentGroup = null,

        edgeFinish = null,
        edgeColor = 0x2f2f2f,
      } = {},
      item
    ) {
      if (readOnly) return;

      if (!codigoPT) {
        console.warn('No se crea superficie: no hay codigoPT real (regla faltante).');
        alert(
          'No tenemos esa superficie disponible para la medida, espesor y acabado seleccionados.'
        );
        return;
      }

      const widthMm = dim?.widthMm ?? Math.round((widthM || 0) * 1000);
      const depthMm = dim?.depthMm ?? Math.round((depthM || 0) * 1000);
      const thickMm = dim?.thickMm ?? Math.round((thicknessM || 0) * 1000);

      /*
      const code = String(codigoPT);
      const catalogItem = item || catalogByCodeRef.current?.get?.(code) || null;

      const finalEdgeFinish =
        edgeFinish ||
        item?.canto ||
        item?.meta?.canto ||
        item?.raw?.canto ||
        dim?.canto ||
        'PVC-2MM';

      const description =
        item?.ui?.title || item?.ui?.subtitle || item?.raw?.descripcion || item?.raw?.description;
        */
      /*
      const description =
        catalogItem?.ui?.title ||
        catalogItem?.ui?.subtitle ||
        catalogItem?.raw?.descripcion ||
        catalogItem?.raw?.description ||
        code;
*/

      const code = String(codigoPT);

      // Catálogo real por código PT
      const catalogItem = catalogByCodeRef.current?.get?.(code) || null;

      // Datos adicionales que puedan venir desde la función que crea la superficie
      const incomingItem = item || {};

      const finalEdgeFinish =
        edgeFinish ||
        incomingItem?.canto ||
        incomingItem?.meta?.canto ||
        incomingItem?.raw?.canto ||
        catalogItem?.canto ||
        catalogItem?.meta?.canto ||
        catalogItem?.raw?.canto ||
        dim?.canto ||
        'PVC-2MM';

      // La descripción SIEMPRE debe salir primero del catálogo real.
      // Solo si no existe en catálogo, usamos lo que venga manual.
      /*const description =
        catalogItem?.ui?.title ||
        catalogItem?.ui?.subtitle ||
        catalogItem?.raw?.descripcion ||
        catalogItem?.raw?.description ||
        catalogItem?.raw?.Descripcion ||
        catalogItem?.raw?.nombre ||
        incomingItem?.ui?.title ||
        incomingItem?.ui?.subtitle ||
        incomingItem?.raw?.descripcion ||
        incomingItem?.raw?.description ||
        incomingItem?.raw?.Descripcion ||
        incomingItem?.raw?.nombre ||
        incomingItem?.description ||
        incomingItem?.name ||
        code;*/

      const catalogDescription =
        catalogItem?.ui?.title ||
        catalogItem?.ui?.subtitle ||
        catalogItem?.raw?.descripcion ||
        catalogItem?.raw?.description ||
        catalogItem?.raw?.Descripcion ||
        catalogItem?.raw?.nombre ||
        incomingItem?.ui?.title ||
        incomingItem?.ui?.subtitle ||
        incomingItem?.raw?.descripcion ||
        incomingItem?.raw?.description ||
        incomingItem?.raw?.Descripcion ||
        incomingItem?.raw?.nombre ||
        incomingItem?.description ||
        incomingItem?.name ||
        code;

      const isSpecial = !!incomingItem?.meta?.isSpecial;

      const descriptionPrefix = String(incomingItem?.meta?.descriptionPrefix || '').trim();

      const descriptionSuffix = String(incomingItem?.meta?.descriptionSuffix || '').trim();

      const description = isSpecial
        ? `${descriptionPrefix ? `${descriptionPrefix} ` : ''}${catalogDescription}${
            descriptionSuffix ? ` - ${descriptionSuffix}` : ''
          }`
        : catalogDescription;

      const rawPrice =
        catalogItem?.prices?.[countryRef.current] ??
        catalogItem?.prices?.CO ??
        catalogItem?.prices?.co ??
        catalogItem?.raw?.prices?.[countryRef.current] ??
        catalogItem?.raw?.prices?.CO ??
        catalogItem?.raw?.price ??
        0;

      const unitPrice = Number(rawPrice || 0);

      const group = new THREE.Group();

      group.name = code;

      const instanceId = `${code}__${Date.now()}__${Math.random().toString(16).slice(2)}`;

      group.userData = {
        isPartRoot: true,

        codigoPT: code,
        code,
        kind: 'SURFACE',
        type: 'superficie',
        line,

        dim: { widthMm, depthMm, thickMm },
        dimMm: { widthMm, depthMm, thickMm },

        billingDimMm: incomingItem?.billingDimMm || null,

        units: 'm',
        instanceId,

        generico: item?.generico || item?.raw?.generico || null,
        materialBase: item?.materialBase || item?.raw?.material || 'LAMINA',
        materialCode: item?.materialCode || null,

        // NUEVO
        edgeFinish: finalEdgeFinish,
        canto: finalEdgeFinish,

        description,
        unitPrice,

        groupId: groupId || parentGroup?.userData?.instanceId || null,
        groupName: groupName || parentGroup?.userData?.name || null,
        parentAssemblyId: parentGroup?.userData?.instanceId || parentGroup?.userData?.code || null,

        logicalCode: logicalCode || null,

        meta: {
          ...(createSurfaceMeta({ widthM, depthM, thicknessM }) || {}),
          ...(incomingItem?.meta || {}),

          canto: finalEdgeFinish,
          edgeFinish: finalEdgeFinish,

          isSpecial,
          descriptionPrefix,
          descriptionSuffix,
        },
      };

      const surfaceMesh = createSurfaceMesh({ widthM, depthM, thicknessM });

      surfaceMesh.name = 'TABLERO_SUPERFICIE';
      surfaceMesh.castShadow = true;
      surfaceMesh.receiveShadow = true;

      surfaceMesh.userData = {
        isSubPart: true,
        parentType: 'superficie',
        subKey: 'tablero',
        category: 'superficies',

        code,
        codigoPT: code,
        materialCode: group.userData.materialCode,
        description,
      };

      group.add(surfaceMesh);

      addSurfaceEdgesToGroup({
        group,
        widthM,
        depthM,
        thicknessM,
        edgeThicknessM: 0.002,
        edgeFinish: finalEdgeFinish,
        edgeColor,
      });

      // =====================================================
      // POSICIÓN Y ROTACIÓN DE LA SUPERFICIE
      // =====================================================

      if (position) {
        group.position.set(
          Number(position?.x || 0),
          Number(position?.y || 0),
          Number(position?.z || 0)
        );
      } else {
        group.position.set(parts.length * 0.9, 0, 0);
      }

      group.rotation.set(
        Number(rotation?.x || 0),
        Number(rotation?.y || 0),
        Number(rotation?.z || 0)
      );

      if (parentGroup) {
        parentGroup.add(group);
      } else {
        scene.add(group);
      }

      group.updateMatrixWorld(true);

      const worldPosition = new THREE.Vector3();
      group.getWorldPosition(worldPosition);

      /*
      console.log('SUPERFICIE UBICADA', {
        subtype: incomingItem?.subtype || null,

        localPosition: {
          x: group.position.x,
          y: group.position.y,
          z: group.position.z,
        },

        worldPosition: {
          x: worldPosition.x,
          y: worldPosition.y,
          z: worldPosition.z,
        },

        rotation: {
          x: group.rotation.x,
          y: group.rotation.y,
          z: group.rotation.z,
        },
      });
*/
      parts.push({ code, obj: group });
      pickables.push(group);

      catalogCache.set(code, {
        base: group,
        meta: group.userData.meta,
      });

      setActivePart(group);
      emitBOM();
      refreshFloorAndGrid();

      return group;
    }

    // VIGAS Bloque nativo
    function addNativeBlockPart(part) {
      if (readOnly) return null;
      if (!part?.dimMm) return null;

      const parentGroup = part?.parentGroup || null;

      const widthM = Number(part.dimMm.widthMm || 0) / 1000;
      const heightM = Number(part.dimMm.heightMm || 0) / 1000;
      const depthM = Number(part.dimMm.depthMm || 0) / 1000;

      if (widthM <= 0 || heightM <= 0 || depthM <= 0) {
        console.warn('addNativeBlockPart: dimensiones inválidas', part);
        return null;
      }

      const geometry = new THREE.BoxGeometry(widthM, heightM, depthM);

      const material = new THREE.MeshStandardMaterial({
        color: 0x8a8a8a,
        roughness: 0.75,
        metalness: 0.05,
      });

      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(
        Number(part.position?.x || 0) / 1000,
        Number(part.position?.y || 0) / 1000,
        Number(part.position?.z || 0) / 1000
      );

      mesh.rotation.set(
        Number(part.rotation?.x || 0),
        Number(part.rotation?.y || 0),
        Number(part.rotation?.z || 0)
      );

      const code = String(part.code || '').trim();
      const catalogItem = catalogByCodeRef.current?.get?.(code) || null;

      const catalogDescription =
        catalogItem?.ui?.title ||
        catalogItem?.ui?.subtitle ||
        catalogItem?.raw?.descripcion ||
        catalogItem?.raw?.description ||
        part.name ||
        part.code ||
        'Bloque nativo';

      const isSpecial = !!part?.meta?.isSpecial;

      const descriptionPrefix = String(part?.meta?.descriptionPrefix || '').trim();

      const descriptionSuffix = String(part?.meta?.descriptionSuffix || '').trim();

      const descriptionNote = String(part?.meta?.descriptionNote || '').trim();

      //const description = descriptionNote ? `${catalogDescription} - ${descriptionNote}`: catalogDescription;

      const description = isSpecial
        ? `${descriptionPrefix ? `${descriptionPrefix} ` : ''}${catalogDescription}${
            descriptionSuffix ? ` - ${descriptionSuffix}` : ''
          }`
        : catalogDescription;

      const unitPrice =
        Number(
          catalogItem?.prices?.[countryRef.current] ??
            catalogItem?.prices?.CO ??
            catalogItem?.prices?.co ??
            catalogItem?.raw?.prices?.[countryRef.current] ??
            catalogItem?.raw?.prices?.CO ??
            catalogItem?.raw?.price ??
            0
        ) || 0;

      mesh.userData = {
        isPartRoot: true,

        code: code || null,
        codigoPT: code || null,

        kind: part.type || 'BLOCK_PART',
        subtype: part.subtype || null,
        line: part.line || null,

        dim: part.dimMm || null,
        description,
        unitPrice,

        meta: {
          ...(part.meta || {}),
          isSpecial,
          descriptionPrefix,
          descriptionSuffix,
        },

        instanceId: `${code || 'block'}__${Date.now()}__${Math.random().toString(16).slice(2)}`,

        groupId: part?.groupId || parentGroup?.userData?.instanceId || null,

        groupName: part?.groupName || parentGroup?.userData?.name || null,

        parentAssemblyId: parentGroup?.userData?.instanceId || parentGroup?.userData?.code || null,

        logicalCode: part?.logicalCode || null,

        realWidthMm:
          part?.meta?.realWidthMm ??
          part?.dimMm?.realWidthMm ??
          part?.dimMm?.nominalWidthMm ??
          null,

        billingWidthMm: part?.meta?.billingWidthMm ?? part?.dimMm?.billingWidthMm ?? null,
      };

      mesh.name = code || part.name || 'BLOCK_PART';
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (parentGroup) {
        parentGroup.add(mesh);
      } else {
        scene.add(mesh);
      }

      parts.push({
        code: code || mesh.name,
        obj: mesh,
      });

      pickables.push(mesh);

      setActivePart(mesh);
      emitBOM();
      refreshFloorAndGrid();

      return mesh;
    }

    function getNativeDuctLengthMm(part) {
      const tipoModulo = String(part?.subtype || part?.meta?.tipoModulo || '')
        .trim()
        .toUpperCase();

      const realMm = Number(
        part?.meta?.realWidthMm || part?.dimMm?.widthMm || part?.meta?.nominalWidthMm || 1200
      );

      if (!Number.isFinite(realMm) || realMm <= 0) {
        return 1200;
      }

      if (tipoModulo === 'INTERMEDIO') {
        return realMm - 2;
      }

      if (tipoModulo === 'TERMINAL') {
        return realMm / 2 + 313.5;
      }

      if (tipoModulo === 'INDIVIDUAL') {
        return 694;
      }

      return realMm;
    }

    function getNativeDuctOffsetMm(part) {
      const tipoPuesto = String(part?.meta?.tipoPuesto || '')
        .trim()
        .toUpperCase();

      const tipoModulo = String(part?.subtype || part?.meta?.tipoModulo || '')
        .trim()
        .toUpperCase();

      const side = String(part?.meta?.side || 'RIGHT').toUpperCase();

      const accesoCableado = String(part?.meta?.accesoCableado || 'GROMMET')
        .trim()
        .toUpperCase();

      const isPasacable = accesoCableado === 'PASACABLE';

      if (tipoPuesto === 'DOBLE') {
        const zOffsetDoble = isPasacable ? 0 : 0;

        if (tipoModulo === 'INTERMEDIO') {
          return { x: 0, y: 0, z: zOffsetDoble };
        }

        if (tipoModulo === 'TERMINAL') {
          return {
            x: side === 'RIGHT' ? -422 : 422,
            y: 0,
            z: zOffsetDoble,
          };
        }

        return { x: 0, y: 0, z: zOffsetDoble };
      }

      const zOffset = isPasacable ? -65 : -78;

      if (tipoModulo === 'INTERMEDIO') {
        return { x: 0, y: 0, z: zOffset };
      }

      if (tipoModulo === 'TERMINAL') {
        return {
          x: side === 'RIGHT' ? -422 : 422,
          y: 0,
          z: zOffset,
        };
      }

      return { x: 0, y: 0, z: zOffset };
    }

    function createNativeKoncisaDoubleDuctMesh(part = {}) {
      const root = new THREE.Group();
      root.name = part.code || part.name || 'KONCISA_DUCT_NATIVE_DOUBLE';

      const lengthMm = getNativeDuctLengthMm(part);
      const lengthM = Math.max(lengthMm / 1000, 0.1);

      const tipoModulo = String(part?.meta?.tipoModulo || part?.subtype || 'terminal')
        .trim()
        .toLowerCase();

      const side = String(part?.meta?.side || 'LEFT').toUpperCase();

      const accesoCableado = String(part?.meta?.accesoCableado || 'GROMMET')
        .trim()
        .toUpperCase();

      const isPasacable = accesoCableado === 'PASACABLE';

      const depthM = isPasacable ? 0.15 : 0.204;
      const heightM = isPasacable ? 0.13 : 0.202;
      const baseHeightM = isPasacable ? 0.065 : 0.1;
      const wallM = 0.003;
      const coverDepthM = isPasacable ? 0.025 : 0.03;

      const material = new THREE.MeshStandardMaterial({
        color: isPasacable ? 0x7d7d7d : 0x6f8fbf,
        roughness: 0.7,
        metalness: 0.05,
      });

      function addBox(name, size, center) {
        const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
        const mesh = new THREE.Mesh(geo, material.clone());
        mesh.name = name;
        mesh.position.set(center[0], center[1], center[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
        return mesh;
      }

      const centerX = 0;

      addBox(
        'ducto-doble-caja-principal',
        [lengthM, baseHeightM, depthM],
        [centerX, baseHeightM / 2, 0]
      );

      addBox(
        isPasacable
          ? 'ducto-doble-pasacable-tapa-superior-frontal'
          : 'ducto-doble-grommet-tapa-superior-frontal',
        [Math.min(lengthM, 0.5), heightM - baseHeightM, coverDepthM],
        [centerX, baseHeightM + (heightM - baseHeightM) / 2, -depthM / 2 - coverDepthM / 2]
      );

      addBox(
        isPasacable
          ? 'ducto-doble-pasacable-tapa-superior-posterior'
          : 'ducto-doble-grommet-tapa-superior-posterior',
        [Math.min(lengthM, 0.5), heightM - baseHeightM, coverDepthM],
        [centerX, baseHeightM + (heightM - baseHeightM) / 2, depthM / 2 + coverDepthM / 2]
      );

      addBox(
        'ducto-doble-pared-lateral-izquierda',
        [wallM, heightM, depthM],
        [-lengthM / 2, heightM / 2, 0]
      );

      addBox(
        'ducto-doble-pared-lateral-derecha',
        [wallM, heightM, depthM],
        [lengthM / 2, heightM / 2, 0]
      );

      addBox(
        'ducto-doble-nervio-central',
        [lengthM, wallM, isPasacable ? 0.012 : 0.018],
        [centerX, baseHeightM + 0.045, 0]
      );

      addBox(
        'ducto-doble-borde-frontal',
        [lengthM, wallM, 0.012],
        [centerX, baseHeightM + 0.045, -depthM / 2]
      );

      addBox(
        'ducto-doble-borde-posterior',
        [lengthM, wallM, 0.012],
        [centerX, baseHeightM + 0.045, depthM / 2]
      );

      if (tipoModulo === 'terminal') {
        const closeX = side === 'RIGHT' ? -lengthM / 2 : lengthM / 2;

        addBox(
          isPasacable
            ? 'ducto-doble-pasacable-cierre-terminal'
            : 'ducto-doble-grommet-cierre-terminal',
          [wallM * 1.5, heightM, depthM],
          [closeX, heightM / 2, 0]
        );
      }

      return root;
    }

    function createNativeKoncisaSingleDuctMesh(part = {}) {
      const root = new THREE.Group();
      root.name = part.code || part.name || 'KONCISA_DUCT_NATIVE_SINGLE';

      const lengthMm = getNativeDuctLengthMm(part);
      const lengthM = Math.max(lengthMm / 1000, 0.1);

      const tipoModulo = String(part?.meta?.tipoModulo || part?.subtype || 'terminal')
        .trim()
        .toLowerCase();

      const side = String(part?.meta?.side || 'LEFT').toUpperCase();

      const accesoCableado = String(part?.meta?.accesoCableado || 'GROMMET')
        .trim()
        .toUpperCase();

      const isPasacable = accesoCableado === 'PASACABLE';

      const depthM = isPasacable ? 0.08 : 0.104;
      const heightM = isPasacable ? 0.13 : 0.203;
      const wallM = 0.003;
      const coverHeightM = isPasacable ? 0.025 : 0.05;

      const material = new THREE.MeshStandardMaterial({
        color: isPasacable ? 0x7d7d7d : 0x8a8a8a,
        roughness: 0.75,
        metalness: 0.05,
      });

      function addBox(name, size, center) {
        const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
        const mesh = new THREE.Mesh(geo, material.clone());
        mesh.name = name;
        mesh.position.set(center[0], center[1], center[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
        return mesh;
      }

      const startX = tipoModulo === 'intermedio' ? 0 : -lengthM / 2;
      const centerX = startX + lengthM / 2;

      addBox(
        'ducto-sencillo-caja-inferior',
        [lengthM, heightM * 0.5, depthM],
        [centerX, heightM * 0.25, 0]
      );

      addBox(
        isPasacable
          ? 'ducto-sencillo-pasacable-tapa-superior'
          : 'ducto-sencillo-grommet-tapa-superior',
        [lengthM, wallM, coverHeightM],
        [centerX, heightM * 0.75, -depthM * 0.25]
      );

      addBox(
        isPasacable
          ? 'ducto-sencillo-pasacable-tapa-posterior'
          : 'ducto-sencillo-grommet-tapa-posterior',
        [Math.min(lengthM, 0.5), wallM, heightM * 0.5],
        [centerX, heightM * 0.75, depthM * 0.25]
      );

      if (isPasacable) {
        addBox(
          'ducto-sencillo-pasacable-ranura-central',
          [Math.min(lengthM, 0.5), wallM, 0.012],
          [centerX, heightM * 0.78, 0]
        );
      }

      if (tipoModulo === 'intermedio') {
        addBox(
          'ducto-sencillo-tapa-lateral-izq',
          [wallM, heightM * 0.45, depthM],
          [startX + 0.047, heightM * 0.45, 0]
        );

        addBox(
          'ducto-sencillo-tapa-lateral-der',
          [wallM, heightM * 0.45, depthM],
          [startX + lengthM - 0.047, heightM * 0.45, 0]
        );
      } else if (tipoModulo === 'individual') {
        addBox('ducto-sencillo-cierre-izq', [wallM, heightM, depthM], [startX, heightM / 2, 0]);

        addBox(
          'ducto-sencillo-cierre-der',
          [wallM, heightM, depthM],
          [startX + lengthM, heightM / 2, 0]
        );
      } else {
        const closeAtLeft = side === 'RIGHT';
        const closeX = closeAtLeft ? startX : startX + lengthM;

        addBox(
          isPasacable
            ? 'ducto-sencillo-pasacable-cierre-terminal'
            : 'ducto-sencillo-grommet-cierre-terminal',
          [wallM, heightM * 0.9, depthM],
          [closeX, heightM * 0.45, 0]
        );
      }

      return root;
    }

    function createNativeKoncisaDuctMesh(part = {}) {
      const tipoPuesto = String(part?.meta?.tipoPuesto || '')
        .trim()
        .toUpperCase();

      if (tipoPuesto === 'DOBLE') {
        return createNativeKoncisaDoubleDuctMesh(part);
      }

      return createNativeKoncisaSingleDuctMesh(part);
    }

    function addNativeKoncisaDuctPart(part) {
      if (readOnly) return null;

      const parentGroup = part?.parentGroup || null;
      const obj = createNativeKoncisaDuctMesh(part);

      const nativeOffsetMm = getNativeDuctOffsetMm(part);

      obj.position.set(
        ((part.position?.x || 0) + nativeOffsetMm.x) / 1000,
        ((part.position?.y || 0) + nativeOffsetMm.y) / 1000,
        ((part.position?.z || 0) + nativeOffsetMm.z) / 1000
      );

      obj.rotation.set(part.rotation?.x || 0, part.rotation?.y || 0, part.rotation?.z || 0);

      const code = String(part.code || '').trim();
      const catalogItem = catalogByCodeRef.current?.get?.(code) || null;
      const prefix = part?.meta?.descriptionPrefix ? `${part.meta.descriptionPrefix} ` : '';
      const suffix = part?.meta?.descriptionSuffix ? ` - ${part.meta.descriptionSuffix}` : '';

      const baseDescription =
        catalogItem?.ui?.title ||
        catalogItem?.ui?.subtitle ||
        catalogItem?.raw?.descripcion ||
        catalogItem?.raw?.description ||
        part.name ||
        part.code ||
        'Ducto Koncisa Plus';

      const description = `${prefix}${baseDescription}${suffix}`;

      const unitPrice =
        Number(
          catalogItem?.prices?.[countryRef.current] ??
            catalogItem?.prices?.CO ??
            catalogItem?.prices?.co ??
            catalogItem?.raw?.prices?.[countryRef.current] ??
            catalogItem?.raw?.prices?.CO ??
            catalogItem?.raw?.price ??
            0
        ) || 0;

      const ductModuleType = part?.meta?.tipoModulo || 'terminal';
      const initialDuctCovers = normalizeDuctCoverState(
        ductModuleType,
        part?.meta?.ductCovers || defaultDuctCoverState(ductModuleType)
      );

      obj.userData = {
        isPartRoot: true,
        code: code || null,
        codigoPT: code || null,
        kind: part.type || 'ducto',
        line: part.line || null,
        dim: part.dimMm || null,
        description,
        unitPrice,
        meta: part.meta || {},
        instanceId: `${code || 'native-duct'}__${Date.now()}__${Math.random().toString(16).slice(2)}`,
        groupId: part?.groupId || parentGroup?.userData?.instanceId || null,
        groupName: part?.groupName || parentGroup?.userData?.name || null,
        parentAssemblyId: parentGroup?.userData?.instanceId || parentGroup?.userData?.code || null,
        logicalCode: part?.logicalCode || null,
        modelSrc: null,
        model: part?.model || { kind: 'native-koncisa-duct' },
        ductCovers: initialDuctCovers,
      };

      obj.traverse((node) => {
        if (!node) return;

        node.userData = {
          ...(node.userData || {}),
          parentAssemblyId: obj.userData.parentAssemblyId,
          groupId: obj.userData.groupId,
          groupName: obj.userData.groupName,
        };

        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      if (parentGroup) {
        parentGroup.add(obj);
      } else {
        scene.add(obj);
      }

      parts.push({ code: code || obj.name, obj });
      pickables.push(obj);
      setActivePart(obj);
      emitBOM();
      refreshFloorAndGrid();

      return obj;
    }

    const costadoModelCache = new Map();

    async function loadCostadoModel(src) {
      const modelSrc = String(src || '').trim();

      if (!modelSrc) {
        throw new Error('Se intentó cargar un modelo de costado sin ruta.');
      }

      if (!costadoModelCache.has(modelSrc)) {
        const loadPromise = loader.loadAsync(modelSrc).catch((error) => {
          // Si falla, se elimina del caché para permitir
          // un nuevo intento después de corregir la ruta.
          costadoModelCache.delete(modelSrc);

          throw new Error(
            `No fue posible cargar el modelo ${modelSrc}: ${error?.message || error}`
          );
        });

        /*
         * Se guarda la promesa, no solamente el resultado.
         * Así, si dos costados solicitan el mismo modelo
         * simultáneamente, solo se hace una carga.
         */
        costadoModelCache.set(modelSrc, loadPromise);
      }

      return costadoModelCache.get(modelSrc);
    }

    // =====================================================
    // FALDA PRINCIPAL PUESTO LÍDER
    // Cuerpo nativo + canto condicional + 2 soportes GLB
    // =====================================================

    const leaderSkirtModelCache = new Map();

    async function loadLeaderSkirtModel(src) {
      const modelSrc = String(src || '').trim();

      if (!modelSrc) {
        throw new Error('Se intentó cargar un soporte de falda sin ruta.');
      }

      if (!leaderSkirtModelCache.has(modelSrc)) {
        const loadPromise = loader.loadAsync(modelSrc).catch((error) => {
          leaderSkirtModelCache.delete(modelSrc);

          throw new Error(
            `No fue posible cargar el modelo ${modelSrc}: ${error?.message || error}`
          );
        });

        leaderSkirtModelCache.set(modelSrc, loadPromise);
      }

      return leaderSkirtModelCache.get(modelSrc);
    }

    /**
     * Crea el contorno frontal de la falda.
     *
     * La geometría se genera sobre los ejes:
     * X = longitud
     * Y = altura
     *
     * Luego se extruye sobre:
     * Z = espesor
     */
    function createLeaderSkirtShape({ lengthMm, heightMm, bottomCornerRadiusMm = 30 }) {
      const lengthM = Math.max(1, Number(lengthMm)) / 1000;
      const heightM = Math.max(1, Number(heightMm)) / 1000;

      const maximumRadiusM = Math.min(lengthM / 2, heightM / 2);

      const radiusM = Math.min(
        Math.max(0, Number(bottomCornerRadiusMm) || 0) / 1000,
        maximumRadiusM
      );

      const halfLength = lengthM / 2;
      const halfHeight = heightM / 2;

      const shape = new THREE.Shape();

      // Parte superior izquierda
      shape.moveTo(-halfLength, halfHeight);

      // Parte superior derecha
      shape.lineTo(halfLength, halfHeight);

      // Costado derecho hasta el inicio de la curva
      shape.lineTo(halfLength, -halfHeight + radiusM);

      // Esquina inferior derecha
      shape.quadraticCurveTo(halfLength, -halfHeight, halfLength - radiusM, -halfHeight);

      // Parte inferior
      shape.lineTo(-halfLength + radiusM, -halfHeight);

      // Esquina inferior izquierda
      shape.quadraticCurveTo(-halfLength, -halfHeight, -halfLength, -halfHeight + radiusM);

      // Regresar a la parte superior
      shape.lineTo(-halfLength, halfHeight);

      shape.closePath();

      return shape;
    }

    function getFinishMaterial({ materialType, finishCode }) {
      if (materialType === 'METALICA') {
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.72, 0.74, 0.76),
          roughness: 0.45,
          metalness: 0.65,
        });
      }

      if (finishCode === '22008689') {
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.95, 0.92, 0.85),
          roughness: 0.7,
        });
      }

      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.78, 0.78, 0.78),
      });
    }

    async function addKoncisaLeaderSkirtAssemblyPart(part = {}) {
      //console.log('ENTRO A CREAR FALDA LÍDER', part);

      if (readOnly) return null;

      const parentGroup = part?.parentGroup || null;

      const assembly = part?.meta?.skirtAssembly || part?.assembly || null;

      if (!assembly) {
        console.warn(
          'addKoncisaLeaderSkirtAssemblyPart: la falda no tiene configuración de ensamble',
          part
        );

        return null;
      }

      const code = String(part?.code || part?.rawCodigoPT || '').trim();

      const bodyConfig = assembly?.body || {};
      const edgeConfig = assembly?.edge || {};
      const supportConfig = assembly?.support || {};

      const lengthMm = Number(
        bodyConfig?.lengthMm ?? part?.meta?.physicalLengthMm ?? part?.dimMm?.widthMm ?? 1210
      );

      const heightMm = Number(
        bodyConfig?.heightMm ?? part?.meta?.heightMm ?? part?.dimMm?.heightMm ?? 300
      );

      const thicknessMm = Number(
        bodyConfig?.thicknessMm ?? part?.meta?.thicknessMm ?? part?.dimMm?.depthMm ?? 15
      );

      const bottomCornerRadiusMm = Number(bodyConfig?.bottomCornerRadiusMm ?? 30);

      if (
        !Number.isFinite(lengthMm) ||
        !Number.isFinite(heightMm) ||
        !Number.isFinite(thicknessMm) ||
        lengthMm <= 0 ||
        heightMm <= 0 ||
        thicknessMm <= 0
      ) {
        console.warn('addKoncisaLeaderSkirtAssemblyPart: dimensiones inválidas', {
          lengthMm,
          heightMm,
          thicknessMm,
        });

        return null;
      }

      const root = new THREE.Group();

      root.name = part?.name || code || 'KONCISA_LEADER_SKIRT_ASSEMBLY';

      // =====================================================
      // CUERPO NATIVO
      // =====================================================

      const shape = createLeaderSkirtShape({
        lengthMm,
        heightMm,
        bottomCornerRadiusMm,
      });

      const bodyGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: thicknessMm / 1000,

        bevelEnabled: false,
        curveSegments: 16,
        steps: 1,
      });

      /*
       * ExtrudeGeometry empieza en Z = 0.
       * Se desplaza medio espesor para que el cuerpo quede
       * centrado con respecto al root.
       */
      bodyGeometry.translate(0, 0, -thicknessMm / 2000);

      bodyGeometry.computeVertexNormals();

      const materialType = String(part?.meta?.materialType || 'METALICA')
        .trim()
        .toUpperCase();

      const finishCode = part?.meta?.finishCode || null;

      const bodyMaterial = getFinishMaterial({
        materialType,
        finishCode,
      });

      /*
      const bodyMaterial =
        materialType === 'METALICA'
          ? new THREE.MeshStandardMaterial({
              color: new THREE.Color(0.72, 0.74, 0.76),

              roughness: 0.45,
              metalness: 0.65,
              side: THREE.DoubleSide,
            })
          : new THREE.MeshStandardMaterial({
              color: new THREE.Color(0.78, 0.78, 0.78),

              roughness: 0.72,
              metalness: 0.05,
              side: THREE.DoubleSide,
            });
*/

      const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);

      bodyMesh.name = 'KONCISA_LEADER_SKIRT_BODY';

      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;

      bodyMesh.userData = {
        ...(bodyMesh.userData || {}),

        skirtComponent: 'BODY',

        isPartRoot: false,
        excludeFromBOM: true,
      };

      root.add(bodyMesh);

      // =====================================================
      // CANTO
      // Solo Formica y Melamina
      // =====================================================

      const hasEdge = edgeConfig?.enabled === true && materialType !== 'METALICA';

      if (hasEdge) {
        /*
         * Por ahora el canto se representa mediante el
         * contorno exterior de la falda.
         *
         * No se genera para METALICA.
         */
        const edgeGeometry = new THREE.EdgesGeometry(bodyGeometry);

        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0x353535,
        });

        const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);

        edgeLines.name = 'KONCISA_LEADER_SKIRT_EDGE';

        edgeLines.userData = {
          ...(edgeLines.userData || {}),

          skirtComponent: 'EDGE',

          isPartRoot: false,
          excludeFromBOM: true,
        };

        root.add(edgeLines);
      }

      // =====================================================
      // SOPORTES GLB
      // =====================================================

      const supportSrc = String(supportConfig?.src || part?.meta?.supportModelSrc || '').trim();

      let supportLeft = null;
      let supportRight = null;

      if (supportSrc) {
        try {
          /*
           * Se carga una sola vez y después se clona.
           */
          const supportGltf = await loadLeaderSkirtModel(supportSrc);

          const supportBase = supportGltf.scene.clone(true);

          supportLeft = supportBase;
          supportRight = supportBase.clone(true);

          supportLeft.name = 'KONCISA_LEADER_SKIRT_SUPPORT_LEFT';

          supportRight.name = 'KONCISA_LEADER_SKIRT_SUPPORT_RIGHT';

          const supportInsetMm = Math.max(
            0,
            Number(supportConfig?.insetMm ?? part?.meta?.supportInsetMm ?? 500)
          );

          /*
           * Cada soporte queda aproximadamente a 500 mm
           * del extremo correspondiente.
           */
          const supportX = Math.max(0, lengthMm / 2 - supportInsetMm);

          const supportOffsetMm = supportConfig?.offsetMm || {};

          const supportOffsetX = Number(supportOffsetMm?.x || 0);

          const supportOffsetY = Number(supportOffsetMm?.y || 0);

          const supportOffsetZ = Number(supportOffsetMm?.z || 0);

          supportLeft.position.set(
            (-supportX + supportOffsetX) / 1000,
            supportOffsetY / 1000,
            supportOffsetZ / 1000
          );

          supportRight.position.set(
            (supportX + supportOffsetX) / 1000,
            supportOffsetY / 1000,
            supportOffsetZ / 1000
          );

          const supportRotation = supportConfig?.rotation || {};

          supportLeft.rotation.set(
            Number(supportRotation?.x || 0),
            Number(supportRotation?.y || 0),
            Number(supportRotation?.z || 0)
          );

          supportRight.rotation.set(
            Number(supportRotation?.x || 0),
            Number(supportRotation?.y || 0),
            Number(supportRotation?.z || 0)
          );

          const supportScale = Number(supportConfig?.scale ?? 1);

          const finalSupportScale = Number.isFinite(supportScale) ? supportScale : 1;

          supportLeft.scale.setScalar(finalSupportScale);

          supportRight.scale.setScalar(finalSupportScale);

          supportLeft.userData = {
            ...(supportLeft.userData || {}),

            skirtComponent: 'SUPPORT_LEFT',

            isPartRoot: false,
            excludeFromBOM: true,
          };

          supportRight.userData = {
            ...(supportRight.userData || {}),

            skirtComponent: 'SUPPORT_RIGHT',

            isPartRoot: false,
            excludeFromBOM: true,
          };

          root.add(supportLeft);
          root.add(supportRight);
        } catch (error) {
          /*
           * La falda se crea aunque falle el GLB.
           * Así podrás seguir ajustando el cuerpo nativo.
           */
          console.error('No fue posible cargar los soportes de la falda', error);
        }
      } else {
        console.warn('La falda líder no tiene supportModelSrc.');
      }

      // =====================================================
      // POSICIÓN GENERAL
      // =====================================================

      root.position.set(
        Number(part?.position?.x || 0) / 1000,
        Number(part?.position?.y || 0) / 1000,
        Number(part?.position?.z || 0) / 1000
      );

      console.log('FALDA ROOT POSICION', {
        x: root.position.x,
        y: root.position.y,
        z: root.position.z,
      });

      root.rotation.set(
        Number(part?.rotation?.x || 0),
        Number(part?.rotation?.y || 0),
        Number(part?.rotation?.z || 0)
      );

      // =====================================================
      // INFORMACIÓN COMERCIAL
      // =====================================================

      const catalogItem = catalogByCodeRef.current?.get?.(code) || null;

      const catalogDescription =
        catalogItem?.ui?.title ||
        catalogItem?.ui?.subtitle ||
        catalogItem?.raw?.descripcion ||
        catalogItem?.raw?.description ||
        part?.name ||
        code ||
        'Falda puesto líder';

      const prefix = String(part?.meta?.descriptionPrefix || '').trim();

      const suffix = String(part?.meta?.descriptionSuffix || '').trim();

      const description = part?.meta?.isSpecial
        ? `${prefix ? `${prefix} ` : ''}${catalogDescription}${suffix ? ` - ${suffix}` : ''}`
        : catalogDescription;

      const unitPrice =
        Number(
          catalogItem?.prices?.[countryRef.current] ??
            catalogItem?.prices?.CO ??
            catalogItem?.prices?.co ??
            catalogItem?.raw?.prices?.[countryRef.current] ??
            catalogItem?.raw?.prices?.CO ??
            catalogItem?.raw?.price ??
            0
        ) || 0;

      const instanceId = `${code || 'leader-skirt'}__${Date.now()}__${Math.random()
        .toString(16)
        .slice(2)}`;

      root.userData = {
        isPartRoot: true,

        code: code || null,
        codigoPT: code || null,

        kind: part?.type || 'leaderSkirt',
        type: part?.type || 'leaderSkirt',
        subtype: part?.subtype || 'leader-main-skirt',

        line: part?.line || 'KONCISA.PLUS',

        name: part?.name || catalogDescription,

        description,
        unitPrice,

        dim: part?.dimMm || null,
        dimMm: part?.dimMm || null,

        instanceId,

        groupId: part?.groupId || parentGroup?.userData?.instanceId || null,

        groupName: part?.groupName || parentGroup?.userData?.name || null,

        parentAssemblyId: parentGroup?.userData?.instanceId || parentGroup?.userData?.code || null,

        logicalCode: part?.logicalCode || null,

        model: {
          kind: 'koncisa-leader-skirt-assembly',

          src: null,
        },

        modelSrc: null,

        materialType,
        finishCode: part?.meta?.finishCode || null,

        meta: {
          ...(part?.meta || {}),

          category: 'leader-skirts',

          skirtAssembly: assembly,

          physicalLengthMm: lengthMm,
          heightMm,
          thicknessMm,

          hasEdge,

          supportPositionsMm: {
            left: supportLeft
              ? {
                  x: supportLeft.position.x * 1000,
                  y: supportLeft.position.y * 1000,
                  z: supportLeft.position.z * 1000,
                }
              : null,

            right: supportRight
              ? {
                  x: supportRight.position.x * 1000,
                  y: supportRight.position.y * 1000,
                  z: supportRight.position.z * 1000,
                }
              : null,
          },
        },
      };

      /*
       * Todos los componentes visuales pertenecen a una
       * única raíz y no deben entrar individualmente al BOM.
       */
      root.traverse((node) => {
        if (!node) return;

        if (node !== root) {
          node.userData = {
            ...(node.userData || {}),

            isPartRoot: false,
            excludeFromBOM: true,

            parentSkirtInstanceId: instanceId,
            parentAssemblyId: root.userData.parentAssemblyId,

            groupId: root.userData.groupId,
            groupName: root.userData.groupName,
          };
        }

        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      root.updateMatrixWorld(true);

      const bounds2d = computeBounds2D(root);

      if (bounds2d) {
        root.userData.bounds2d = {
          localCenter: bounds2d.localCenter.toArray(),

          sizeLocal: bounds2d.sizeLocal.toArray(),
        };
      }

      if (parentGroup) {
        parentGroup.add(root);
      } else {
        scene.add(root);
      }

      /*
       * Solo la raíz entra al BOM.
       */
      parts.push({
        code: code || root.name,
        obj: root,
      });

      pickables.push(root);

      setActivePart(root);
      emitBOM();
      refreshFloorAndGrid();

      return root;
    }

    async function addKoncisaCostadoAssemblyPart(part = {}) {
      if (readOnly) return null;

      const parentGroup = part?.parentGroup || null;

      const assembly = part?.meta?.costadoAssembly || part?.assembly || null;

      if (!assembly) {
        console.warn(
          'addKoncisaCostadoAssemblyPart: el costado no tiene configuración de ensamble',
          part
        );

        return null;
      }

      const {
        positioningMode,

        leftLegSrc,
        rightLegSrc,
        centerBracketSrc,

        leftMinZFromPivotMm,
        leftMaxZFromPivotMm,
        rightMinZFromPivotMm,
        rightMaxZFromPivotMm,
        centerBracketMinZFromPivotMm,
        centerBracketMaxZFromPivotMm,
        crossbarInsetXMm = 0,

        rootOffsetMm = {},
        leftOffsetMm = {},
        rightOffsetMm = {},
        centerBracketOffsetMm = {},

        leftRotation = {},
        rightRotation = {},
        centerBracketRotation = {},

        leftScale = 1,
        rightScale = 1,
        centerBracketScale = 1,

        leftStructuralDepthMm = null,
        rightStructuralDepthMm = null,

        crossbar = {},
      } = assembly;

      if (!leftLegSrc || !rightLegSrc || !centerBracketSrc) {
        console.warn('addKoncisaCostadoAssemblyPart: faltan modelos del ensamble', {
          leftLegSrc,
          rightLegSrc,
          centerBracketSrc,
        });

        return null;
      }

      const realDepthMm = Number(
        part?.meta?.realDepthMm ??
          part?.dimMm?.realDepthMm ??
          part?.dimMm?.depthMm ??
          part?.meta?.depthMm ??
          600
      );

      if (!Number.isFinite(realDepthMm) || realDepthMm <= 0) {
        console.warn('addKoncisaCostadoAssemblyPart: profundidad inválida', realDepthMm);

        return null;
      }

      const root = new THREE.Group();

      const code = String(part?.code || '').trim();

      root.name = part?.name || code || 'KONCISA_COSTADO_ASSEMBLY';

      //Agregar la caja dentro del ensamble del costado
      const hasOutletBox = !!part?.meta?.hasOutletBox;

      const outletBoxSrc = part?.meta?.outletBoxSrc || assembly?.outletBoxSrc || null;

      const outletBoxOffsetMm = part?.meta?.outletBoxOffsetMm || assembly?.outletBoxOffsetMm || {};

      const outletBoxRotation = part?.meta?.outletBoxRotation || assembly?.outletBoxRotation || {};

      const outletBoxScale = Number(part?.meta?.outletBoxScale ?? assembly?.outletBoxScale ?? 1);

      // =====================================================
      // Cargar los tres GLB simultáneamente
      // =====================================================

      let leftGltf;
      let rightGltf;
      let centerGltf;
      let outletBoxGltf = null;

      try {
        const loadingTasks = [
          loadCostadoModel(leftLegSrc),
          loadCostadoModel(rightLegSrc),
          loadCostadoModel(centerBracketSrc),
        ];

        if (hasOutletBox && outletBoxSrc) {
          loadingTasks.push(loadCostadoModel(outletBoxSrc));
        }

        const loadedModels = await Promise.all(loadingTasks);

        leftGltf = loadedModels[0];
        rightGltf = loadedModels[1];
        centerGltf = loadedModels[2];

        outletBoxGltf = hasOutletBox && outletBoxSrc ? loadedModels[3] || null : null;
      } catch (error) {
        console.error('No fue posible cargar los modelos del costado ensamblado', error);

        return null;
      }

      const leftLeg = leftGltf.scene.clone(true);
      const rightLeg = rightGltf.scene.clone(true);
      const centerBracket = centerGltf.scene.clone(true);

      leftLeg.name = 'KONCISA_COSTADO_LEFT_LEG';
      rightLeg.name = 'KONCISA_COSTADO_RIGHT_LEG';
      centerBracket.name = 'KONCISA_COSTADO_CENTER_BRACKET';

      const outletBox = outletBoxGltf?.scene ? outletBoxGltf.scene.clone(true) : null;

      // =====================================================
      // Configuración del travesaño
      // =====================================================

      const crossbarHeightMm = Number(crossbar?.heightMm ?? 25.4);

      const crossbarWidthMm = Number(crossbar?.depthMm ?? 50.8);

      const endClearanceMm = Number(crossbar?.endClearanceMm ?? 0);

      const crossbarOffsetMm = {
        x: Number(crossbar?.offsetMm?.x || 0),
        y: Number(crossbar?.offsetMm?.y || 0),
        z: Number(crossbar?.offsetMm?.z || 0),
      };

      const tipoPuesto = String(part?.meta?.tipoPuesto || '')
        .trim()
        .toLowerCase();
      const forma = String(part?.meta?.forma || '')
        .trim()
        .toUpperCase();
      const layoutType = String(part?.meta?.layoutType || '')
        .trim()
        .toUpperCase();
      const resolvedPositioningMode = part?.meta?.positioningMode || positioningMode;
      const usesStandardBoundedDepthPositioning =
        resolvedPositioningMode === 'bounded-depth-v1' &&
        tipoPuesto === 'sencillo' &&
        forma === 'RECT' &&
        layoutType !== 'LEADER' &&
        (realDepthMm === 600 || realDepthMm === 750);
      const usesLeaderBoundedDepthPositioning =
        resolvedPositioningMode === 'bounded-depth-leader-v1' &&
        tipoPuesto === 'sencillo' &&
        forma === 'RECT' &&
        layoutType === 'LEADER' &&
        [600, 650, 700, 750].includes(realDepthMm);
      const usesMeasuredDoubleDepthPositioning =
        resolvedPositioningMode === 'measured-depth-double-v1' &&
        tipoPuesto === 'doble' &&
        forma === 'RECT';
      const usesBoundedDepthPositioning =
        usesStandardBoundedDepthPositioning || usesLeaderBoundedDepthPositioning;

      /*
       * La profundidad del costado corre sobre Z.
       * La resta permite acortar el travesaño para formas
       * trapezoidales, curvas u otras variantes.
       */
      let crossbarLengthMm = Math.max(1, realDepthMm - endClearanceMm);

      /*
       * Las patas se separan usando el largo real del travesaño.
       * Después se aplican sus offsets independientes.
       */
      const halfSpanMm = crossbarLengthMm / 2;

      const leftPositionMm = {
        x: Number(leftOffsetMm?.x || 0),
        y: Number(leftOffsetMm?.y || 0),
        z: -halfSpanMm + Number(leftOffsetMm?.z || 0),
      };

      const rightPositionMm = {
        x: Number(rightOffsetMm?.x || 0),
        y: Number(rightOffsetMm?.y || 0),
        z: halfSpanMm + Number(rightOffsetMm?.z || 0),
      };

      const bracketPositionMm = {
        x: Number(centerBracketOffsetMm?.x || 0),
        y: Number(centerBracketOffsetMm?.y || 0),
        z: Number(centerBracketOffsetMm?.z || 0),
      };

      if (usesBoundedDepthPositioning) {
        const halfDepthMm = realDepthMm / 2;
        const resolvedLeftMinZFromPivotMm = Number(leftMinZFromPivotMm);
        const resolvedLeftMaxZFromPivotMm = Number(leftMaxZFromPivotMm);
        const resolvedRightMinZFromPivotMm = Number(rightMinZFromPivotMm);
        const resolvedRightMaxZFromPivotMm = Number(rightMaxZFromPivotMm);
        const resolvedCenterBracketMinZFromPivotMm = Number(centerBracketMinZFromPivotMm);
        const resolvedCenterBracketMaxZFromPivotMm = Number(centerBracketMaxZFromPivotMm);

        leftPositionMm.z = -halfDepthMm - resolvedLeftMinZFromPivotMm;
        rightPositionMm.z = halfDepthMm - resolvedRightMaxZFromPivotMm;

        const leftInnerFaceZ = leftPositionMm.z + resolvedLeftMaxZFromPivotMm;
        const rightInnerFaceZ = rightPositionMm.z + resolvedRightMinZFromPivotMm;

        crossbarLengthMm = Math.max(1, rightInnerFaceZ - leftInnerFaceZ);
        crossbarOffsetMm.x += Number(crossbarInsetXMm);
        crossbarOffsetMm.z = (leftInnerFaceZ + rightInnerFaceZ) / 2;
        bracketPositionMm.z =
          -(resolvedCenterBracketMinZFromPivotMm + resolvedCenterBracketMaxZFromPivotMm) / 2;
      }

      if (usesMeasuredDoubleDepthPositioning) {
        // Medimos antes de trasladar los clones. Esto desacopla la receta de los
        // pivotes con los que fueron exportados los GLB izquierdo y derecho.
        leftLeg.updateMatrixWorld(true);
        rightLeg.updateMatrixWorld(true);
        centerBracket.updateMatrixWorld(true);

        const leftBounds = new THREE.Box3().setFromObject(leftLeg);
        const rightBounds = new THREE.Box3().setFromObject(rightLeg);
        const bracketBounds = new THREE.Box3().setFromObject(centerBracket);
        const boundsAreValid =
          !leftBounds.isEmpty() && !rightBounds.isEmpty() && !bracketBounds.isEmpty();

        if (boundsAreValid) {
          const halfDepthM = realDepthMm / 2000;
          const leftTranslationM =
            -halfDepthM - leftBounds.min.z + Number(leftOffsetMm?.z || 0) / 1000;
          const rightTranslationM =
            halfDepthM - rightBounds.max.z + Number(rightOffsetMm?.z || 0) / 1000;

          leftPositionMm.z = leftTranslationM * 1000;
          rightPositionMm.z = rightTranslationM * 1000;

          const measuredLeftInnerFaceMm = (leftBounds.max.z + leftTranslationM) * 1000;
          const measuredRightInnerFaceMm = (rightBounds.min.z + rightTranslationM) * 1000;
          const resolvedLeftStructuralDepthMm = Number(leftStructuralDepthMm);
          const resolvedRightStructuralDepthMm = Number(rightStructuralDepthMm);
          const usesStructuralConnectionDepths =
            Number.isFinite(resolvedLeftStructuralDepthMm) &&
            resolvedLeftStructuralDepthMm > 0 &&
            Number.isFinite(resolvedRightStructuralDepthMm) &&
            resolvedRightStructuralDepthMm > 0;

          // La geometría auxiliar incluida en algunos GLB no representa el
          // perfil que recibe el travesaño. Cuando la receta declara el fondo
          // estructural, calculamos las caras de conexión desde los límites
          // nominales del puesto y no desde el Box3 visual completo.
          const leftInnerFaceMm = usesStructuralConnectionDepths
            ? -realDepthMm / 2 + resolvedLeftStructuralDepthMm
            : measuredLeftInnerFaceMm;
          const rightInnerFaceMm = usesStructuralConnectionDepths
            ? realDepthMm / 2 - resolvedRightStructuralDepthMm
            : measuredRightInnerFaceMm;

          crossbarLengthMm = Math.max(1, rightInnerFaceMm - leftInnerFaceMm);
          crossbarOffsetMm.z = (leftInnerFaceMm + rightInnerFaceMm) / 2;

          const bracketCenterZMm = ((bracketBounds.min.z + bracketBounds.max.z) / 2) * 1000;
          bracketPositionMm.z =
            crossbarOffsetMm.z - bracketCenterZMm + Number(centerBracketOffsetMm?.z || 0);
        }
      }

      // =====================================================
      // Posicionar las piezas GLB dentro del root
      // =====================================================

      leftLeg.position.set(
        leftPositionMm.x / 1000,
        leftPositionMm.y / 1000,
        leftPositionMm.z / 1000
      );

      rightLeg.position.set(
        rightPositionMm.x / 1000,
        rightPositionMm.y / 1000,
        rightPositionMm.z / 1000
      );

      centerBracket.position.set(
        bracketPositionMm.x / 1000,
        bracketPositionMm.y / 1000,
        bracketPositionMm.z / 1000
      );

      leftLeg.rotation.set(
        Number(leftRotation?.x || 0),
        Number(leftRotation?.y || 0),
        Number(leftRotation?.z || 0)
      );

      rightLeg.rotation.set(
        Number(rightRotation?.x || 0),
        Number(rightRotation?.y || 0),
        Number(rightRotation?.z || 0)
      );

      centerBracket.rotation.set(
        Number(centerBracketRotation?.x || 0),
        Number(centerBracketRotation?.y || 0),
        Number(centerBracketRotation?.z || 0)
      );

      leftLeg.scale.setScalar(Number(leftScale || 1));
      rightLeg.scale.setScalar(Number(rightScale || 1));
      centerBracket.scale.setScalar(Number(centerBracketScale || 1));

      if (outletBox) {
        outletBox.name = 'KONCISA_COSTADO_OUTLET_BOX';

        outletBox.position.set(
          Number(outletBoxOffsetMm?.x || 0) / 1000,
          Number(outletBoxOffsetMm?.y || 0) / 1000,
          Number(outletBoxOffsetMm?.z || 0) / 1000
        );

        outletBox.rotation.set(
          Number(outletBoxRotation?.x || 0),
          Number(outletBoxRotation?.y || 0),
          Number(outletBoxRotation?.z || 0)
        );

        outletBox.scale.setScalar(Number.isFinite(outletBoxScale) ? outletBoxScale : 1);

        outletBox.userData = {
          ...(outletBox.userData || {}),

          costadoComponent: 'OUTLET_BOX',

          // No es una raíz ni una pieza adicional de BOM.
          isPartRoot: false,
          excludeFromBOM: true,
        };

        root.add(outletBox);
      }

      // =====================================================
      // Crear travesaño procedural
      // =====================================================

      //X = altura del perfil
      //Y = ancho del perfil
      //Z = largo del travesaño

      const crossbarGeometry = new THREE.BoxGeometry(
        crossbarHeightMm / 1000,
        crossbarWidthMm / 1000,
        crossbarLengthMm / 1000
      );

      //new THREE.BoxGeometry(
      //25.4 / 1000,
      //50.8 / 1000,
      //crossbarLengthMm / 1000
      //);

      const crossbarMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(254 / 255, 250 / 255, 252 / 255),
        roughness: 0.72,
        metalness: 0.08,
      });

      const crossbarMesh = new THREE.Mesh(crossbarGeometry, crossbarMaterial);

      crossbarMesh.name = 'KONCISA_COSTADO_CROSSBAR';

      crossbarMesh.position.set(
        crossbarOffsetMm.x / 1000,
        crossbarOffsetMm.y / 1000,
        crossbarOffsetMm.z / 1000
      );

      crossbarMesh.castShadow = true;
      crossbarMesh.receiveShadow = true;

      // =====================================================
      // Identificar internamente cada componente
      // =====================================================

      leftLeg.userData = {
        ...(leftLeg.userData || {}),
        costadoComponent: 'LEFT_LEG',
      };

      rightLeg.userData = {
        ...(rightLeg.userData || {}),
        costadoComponent: 'RIGHT_LEG',
      };

      centerBracket.userData = {
        ...(centerBracket.userData || {}),
        costadoComponent: 'CENTER_BRACKET',
      };

      crossbarMesh.userData = {
        ...(crossbarMesh.userData || {}),
        costadoComponent: 'CROSSBAR',
      };

      root.add(leftLeg);
      root.add(rightLeg);
      root.add(centerBracket);
      root.add(crossbarMesh);

      // =====================================================
      // Posición general del costado
      // =====================================================

      const lado = String(part?.meta?.lado || 'izq')
        .trim()
        .toLowerCase();

      const baseOffsetX = Number(rootOffsetMm?.x || 0);
      const baseOffsetY = Number(rootOffsetMm?.y || 0);
      const baseOffsetZ = Number(rootOffsetMm?.z || 0);

      const sideOffsetZMm = lado === 'der' ? -baseOffsetZ : baseOffsetZ;
      const boundedDepthRootPositionMm = part?.meta?.boundedDepthRootPositionMm || {};
      const rootPositionXMm = usesLeaderBoundedDepthPositioning
        ? Number(boundedDepthRootPositionMm?.x ?? part?.position?.x ?? 0)
        : Number(part?.position?.x || 0);
      const rootPositionYMm = usesLeaderBoundedDepthPositioning
        ? Number(boundedDepthRootPositionMm?.y ?? part?.position?.y ?? 0)
        : Number(part?.position?.y || 0);
      const rootPositionZMm = usesLeaderBoundedDepthPositioning
        ? Number(boundedDepthRootPositionMm?.z ?? part?.position?.z ?? 0)
        : usesStandardBoundedDepthPositioning
          ? 0
          : Number(part?.position?.z || 0) + sideOffsetZMm;

      root.position.set(
        (rootPositionXMm + baseOffsetX) / 1000,
        (rootPositionYMm + baseOffsetY) / 1000,
        rootPositionZMm / 1000
      );

      root.rotation.set(
        Number(part?.rotation?.x || 0),
        Number(part?.rotation?.y || 0),
        Number(part?.rotation?.z || 0)
      );

      // =====================================================
      // Código, descripción y precio
      // =====================================================

      const catalogItem = catalogByCodeRef.current?.get?.(code) || null;

      const baseDescription =
        catalogItem?.ui?.title ||
        catalogItem?.ui?.subtitle ||
        catalogItem?.raw?.descripcion ||
        catalogItem?.raw?.description ||
        part?.name ||
        code ||
        'Costado Koncisa Plus';

      const prefix = String(part?.meta?.descriptionPrefix || '').trim();

      const suffix = String(part?.meta?.descriptionSuffix || '').trim();

      const description = part?.meta?.isSpecial
        ? `${prefix ? `${prefix} ` : ''}${baseDescription}${suffix ? ` - ${suffix}` : ''}`
        : baseDescription;

      const unitPrice =
        Number(
          catalogItem?.prices?.[countryRef.current] ??
            catalogItem?.prices?.CO ??
            catalogItem?.prices?.co ??
            catalogItem?.raw?.prices?.[countryRef.current] ??
            catalogItem?.raw?.prices?.CO ??
            catalogItem?.raw?.price ??
            0
        ) || 0;

      const instanceId = `${code || 'costado'}__${Date.now()}__${Math.random()
        .toString(16)
        .slice(2)}`;

      root.userData = {
        isPartRoot: true,

        code: code || null,
        codigoPT: code || null,

        kind: part?.type || 'costado',
        type: part?.type || 'costado',
        subtype: part?.subtype || null,

        line: part?.line || 'KONCISA.PLUS',

        name: part?.name || baseDescription,
        description,
        unitPrice,

        dim: part?.dimMm || null,
        dimMm: part?.dimMm || null,

        instanceId,

        groupId: part?.groupId || parentGroup?.userData?.instanceId || null,

        groupName: part?.groupName || parentGroup?.userData?.name || null,

        parentAssemblyId: parentGroup?.userData?.instanceId || parentGroup?.userData?.code || null,

        logicalCode: part?.logicalCode || null,

        model: {
          kind: 'koncisa-costado-assembly',
          src: null,
        },

        modelSrc: null,

        meta: {
          ...(part?.meta || {}),

          category: 'costados',
          costadoAssembly: assembly,

          realDepthMm,
          crossbarLengthMm,

          componentPositionsMm: {
            LEFT_LEG: leftPositionMm,
            RIGHT_LEG: rightPositionMm,
            CENTER_BRACKET: bracketPositionMm,
            CROSSBAR: crossbarOffsetMm,
          },
        },
      };

      /*
       * Los hijos no deben ser raíces independientes.
       * Así el clic en cualquier pata selecciona el ensamble completo.
       */
      root.traverse((node) => {
        if (!node) return;

        if (node !== root) {
          node.userData = {
            ...(node.userData || {}),

            isPartRoot: false,

            parentCostadoInstanceId: instanceId,
            parentAssemblyId: root.userData.parentAssemblyId,

            groupId: root.userData.groupId,
            groupName: root.userData.groupName,
          };
        }

        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      root.updateMatrixWorld(true);

      // Bounds para vista 2D.
      const bounds2d = computeBounds2D(root);

      if (bounds2d) {
        root.userData.bounds2d = {
          localCenter: bounds2d.localCenter.toArray(),
          sizeLocal: bounds2d.sizeLocal.toArray(),
        };
      }

      if (parentGroup) {
        parentGroup.add(root);
      } else {
        scene.add(root);
      }

      /*
       * Solo se agrega el root al BOM.
       * Las patas, soporte y travesaño son componentes visuales.
       */
      parts.push({
        code: code || root.name,
        obj: root,
      });

      pickables.push(root);

      setActivePart(root);
      emitBOM();
      refreshFloorAndGrid();

      return root;
    }

    async function addExternalGlbPart(part) {
      if (readOnly) return;

      if (!part?.model?.src) {
        console.warn('No se puede cargar el GLB: falta model.src');
        return;
      }

      //  CLAVE: tomar parentGroup desde el objeto part
      const parentGroup = part?.parentGroup || null;

      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(part.model.src);

        const obj = gltf.scene.clone(true);

        obj.position.set(
          (part.position?.x || 0) / 1000,
          (part.position?.y || 0) / 1000,
          (part.position?.z || 0) / 1000
        );

        obj.rotation.set(part.rotation?.x || 0, part.rotation?.y || 0, part.rotation?.z || 0);
        obj.scale.set(
          Number(part.scale?.x ?? 1),
          Number(part.scale?.y ?? 1),
          Number(part.scale?.z ?? 1)
        );

        const code = String(part.code || '').trim();
        const catalogItem = catalogByCodeRef.current?.get?.(code) || null;

        const description =
          catalogItem?.ui?.title ||
          catalogItem?.ui?.subtitle ||
          catalogItem?.raw?.descripcion ||
          catalogItem?.raw?.description ||
          part.description ||
          part.name ||
          part.code ||
          'Pieza GLB';

        const unitPrice =
          Number(
            part.prices?.[countryRef.current] ??
              part.unitPrice ??
              catalogItem?.prices?.[countryRef.current] ??
              catalogItem?.prices?.CO ??
              catalogItem?.prices?.co ??
              catalogItem?.raw?.prices?.[countryRef.current] ??
              catalogItem?.raw?.prices?.CO ??
              catalogItem?.raw?.price ??
              0
          ) || 0;

        const ductModuleType = part?.meta?.tipoModulo || 'terminal';
        const initialDuctCovers = normalizeDuctCoverState(
          ductModuleType,
          part?.meta?.ductCovers || defaultDuctCoverState(ductModuleType)
        );
        const initialCeilingDucts = normalizeCeilingDuctState(
          ductModuleType,
          part?.meta?.ceilingDucts || defaultCeilingDuctState(ductModuleType)
        );

        obj.userData = {
          isPartRoot: true, //para usar las propiedades en los diferentes elementos
          excludeFromBOM: part?.meta?.excludeFromBOM === true,
          code: code || null,
          codigoPT: code || null,
          kind: part.kind || part.type || 'GLB_PART',
          line: part.line || part.meta?.line || null,
          dim: part.dimMm || null,
          description,
          unitPrice,
          prices: part.prices || catalogItem?.prices || undefined,
          meta: part.meta || {},
          instanceId: `${code || 'glb'}__${Date.now()}__${Math.random().toString(16).slice(2)}`,

          groupId: part?.groupId || parentGroup?.userData?.instanceId || null,
          groupName: part?.groupName || parentGroup?.userData?.name || null,
          parentAssemblyId:
            parentGroup?.userData?.instanceId || parentGroup?.userData?.code || null,

          logicalCode: part?.logicalCode || null,

          modelSrc: part?.model?.src || null,
          model: part?.model || null,

          // NUEVO: contexto de acabados
          generico: catalogItem?.generico || catalogItem?.raw?.generico || null,
          genericos: catalogItem?.raw?.genericos || catalogItem?.genericos || [],
          materialBase: catalogItem?.materialBase || catalogItem?.raw?.material || null,
          materialCode: null,

          ductCovers: part.type === 'ducto' ? initialDuctCovers : null,
          ceilingDucts: part.type === 'ducto' ? initialCeilingDucts : null,
          ...(part.extraUserData || {}),
        };

        obj.name = code || part.name || 'GLB_PART';

        obj.traverse((node) => {
          if (!node) return;

          node.userData = {
            ...(node.userData || {}),
            parentAssemblyId:
              parentGroup?.userData?.instanceId || parentGroup?.userData?.code || null,
            groupId: part?.groupId || parentGroup?.userData?.instanceId || null,
            groupName: part?.groupName || parentGroup?.userData?.name || null,
          };

          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        if (
          part?.meta?.attachmentKind === 'KONCISA_CEILING_DUCT' &&
          parentGroup?.userData?.kind === 'ducto'
        ) {
          const attachmentTransform = getCeilingDuctLocalTransform(
            parentGroup,
            obj,
            part?.meta?.side
          );
          obj.position.copy(attachmentTransform.position);
          obj.rotation.set(0, attachmentTransform.rotationY, 0);
        }

        const bounds2d = computeBounds2D(obj);
        if (bounds2d) {
          obj.userData.bounds2d = {
            localCenter: bounds2d.localCenter.toArray(),
            sizeLocal: bounds2d.sizeLocal.toArray(),
          };
        }

        if (parentGroup) {
          parentGroup.add(obj);
        } else {
          scene.add(obj);
        }

        parts.push({ code: code || obj.name, obj });
        pickables.push(obj);

        // Si es el primer objeto de la escena, encuadra cámara para evitar
        // que los GLB externos (Mila) se perciban gigantes al iniciar en vacío.
        if (parts.length === 1) {
          frameObject(parentGroup || obj);
        }

        setActivePart(obj);
        emitBOM();

        return obj;
      } catch (error) {
        console.error('Error cargando GLB externo:', part.model.src, error);
        alert(`No se pudo cargar el modelo 3D: ${part.model.src}`);
        return null;
      } finally {
        refreshFloorAndGrid();
      }
    }

    function looksLikeGuid(s) {
      return (
        typeof s === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
      );
    }

    function getMeshPathKey(root, mesh) {
      const path = [];
      let cur = mesh;

      while (cur && cur !== root) {
        const rawName = cur.name && cur.name.trim() ? cur.name.trim() : '';
        const useName = rawName && !looksLikeGuid(rawName);

        const idx =
          cur.parent && Array.isArray(cur.parent.children) ? cur.parent.children.indexOf(cur) : -1;

        path.push(useName ? `n:${rawName}` : `i:${idx}`);
        cur = cur.parent;
      }

      return path.reverse().join('/');
    }

    function applyFinishToActivePart(materialCode, materialDef = null, scope = 'PART') {
      if (readOnly) return;
      if (!activePart) return;

      const editablePart = getActiveEditablePartObject() || activePart;

      const code = materialCode || null;
      const def = materialDef || null;

      const isSurface =
        editablePart.userData?.kind === 'SURFACE' || editablePart.userData?.kind === 'FLOOR_VISUAL';

      const wantAll = scope === 'ALL';
      const wantGroup = scope === 'GROUP';

      // ===== CANTO DE SUPERFICIE =====
      // Si se hizo clic en cualquier canto de una superficie,
      // se aplica el material a TODOS los cantos de esa superficie.
      const root = editablePart;

      const clickedIsSurfaceEdge =
        activeSubMesh?.userData?.edgeGroupKey === 'SURFACE_EDGE_ALL' ||
        activeSubMesh?.userData?.materialScope === 'SURFACE_EDGE_ALL' ||
        activeSubMesh?.userData?.subKey === 'canto' ||
        activeSubMesh?.userData?.category === 'cantos' ||
        String(activeSubMesh?.name || '')
          .toUpperCase()
          .includes('CANTO');

      const rootIsSurface =
        root?.userData?.type === 'superficie' || root?.userData?.kind === 'SURFACE';

      if (!wantAll && !wantGroup && rootIsSurface && clickedIsSurfaceEdge) {
        applySurfaceEdgeFinish(root, code, def);

        const activeSubKey = root.userData?.activeSubKey || null;

        onSelectionChange?.({
          code: root.userData.codigoPT || root.userData.code,
          dimMm: root.userData?.dim || null,
          dimM: root.userData?.dimM || null,

          materialCode: root.userData?.materialCode ?? null,
          materialBase: root.userData?.materialBase ?? null,

          edgeFinish: root.userData?.edgeFinish ?? null,
          canto: root.userData?.canto ?? null,

          line: root.userData?.line ?? null,

          subKey: activeSubKey,
          subName: root.userData?.activeSubName ?? 'Canto superficie',
          subMaterialCode: code,

          kind: root.userData?.kind || null,
          meta: root.userData?.meta || null,
          groupId: root.userData?.groupId || null,
          groupName: root.userData?.groupName || null,
          logicalCode: root.userData?.logicalCode || null,
          instanceId: root.userData?.instanceId || null,
        });

        return;
      }

      // ===== GROUP =====
      if (wantGroup) {
        const targets = getFinishGroupTargets(editablePart);

        targets.forEach((obj) => {
          obj.userData.materialCode = code;
          //obj.userData.materialDef = def;

          applyMaterialToObject3D(obj, code, def);

          obj.userData.finishes = null;
          obj.userData.activeSubKey = null;
          obj.userData.activeSubName = null;
        });

        // refresca panel con la pieza activa actual
        const subKey = root.userData?.activeSubKey || null;
        const finishes = root.userData?.finishes || {};
        const subMaterialCode = subKey ? finishes[subKey]?.materialCode || null : null;
        const subName = root.userData?.activeSubName || null;

        onSelectionChange?.({
          code: root.userData.codigoPT || root.userData.code,
          dimMm: root.userData?.dim || null,
          dimM:
            root.userData?.dimM || root.userData?.procedural || root.userData?.dimMeters || null,
          materialCode: root.userData?.materialCode || null,
          materialBase: root.userData?.materialBase || null,
          generico: root.userData?.generico || null,
          genericos: root.userData?.genericos || null,
          line: root.userData?.line || null,

          // NUEVO PARA PANTALLAS
          type: root.userData?.type || null,
          subtype: root.userData?.subtype || null,
          material: root.userData?.material || null,
          finishCode: root.userData?.finishCode || null,
          finishLabel: root.userData?.finishLabel || null,
          hasCanto: root.userData?.hasCanto || false,
          hasBacker: root.userData?.hasBacker || false,
          privacyPanelFinishId: root.userData?.privacyPanelFinishId || null,

          subKey,
          subName,
          subMaterialCode,
          kind: root.userData?.kind || null,
          meta: root.userData?.meta || null,
          groupId: root.userData?.groupId || null,
          groupName: root.userData?.groupName || null,
          logicalCode: root.userData?.logicalCode || null,
          instanceId: root.userData?.instanceId || null,
        });

        emitBOM?.();
        return;
      }

      // ===== SURFACE / FLOOR =====
      if (isSurface) {
        root.userData.materialCode = code;
        //activePart.userData.materialDef = def;

        applyMaterialToObject3D(root, code, def);
        if (root.userData?.isFloor) applyFloorVisualState();

        root.userData.finishes = null;
        root.userData.activeSubKey = null;
        root.userData.activeSubName = null;

        onSelectionChange?.({
          code: root.userData.codigoPT || root.userData.code,
          dimMm: root.userData?.dim || null,
          dimM: root.userData?.dimM || null,
          materialCode: root.userData?.materialCode ?? null,
          materialBase: root.userData?.materialBase ?? null,
          generico: root.userData?.generico ?? null,
          line: root.userData?.line ?? null,
          kind: root.userData?.kind ?? null,
          instanceId: root.userData?.instanceId ?? null,
          showGrid: root.userData?.isFloor ? root.userData?.showGrid !== false : undefined,
          gridSize: root.userData?.isFloor ? root.userData?.gridSize || 0.1 : undefined,
          subKey: null,
          subName: null,
          subMaterialCode: null,
        });

        emitBOM?.();
        return;
      }

      // ===== PART / ALL =====
      if (!wantAll && activeSubMesh?.isMesh) {
        const subKey = root.userData?.activeSubKey || getMeshPathKey(root, activeSubMesh);

        activeSubMesh.userData.materialCode = code;
        applyMaterialToMesh(activeSubMesh, code, def);

        root.userData.finishes = root.userData.finishes || {};
        root.userData.finishes[subKey] = {
          materialCode: code,
          materialBase: root.userData?.materialBase || null,
          subName: root.userData?.activeSubName || activeSubMesh.name || subKey,
        };
      } else {
        root.userData.materialCode = code;
        //activePart.userData.materialDef = def;

        applyMaterialToObject3D(root, code, def);

        root.userData.finishes = null;
        root.userData.activeSubKey = null;
        root.userData.activeSubName = null;
      }

      const activeSubKey = root.userData?.activeSubKey || null;
      const finishes = root.userData?.finishes || {};
      const subMaterialCode = activeSubKey ? (finishes[activeSubKey]?.materialCode ?? null) : null;

      onSelectionChange?.({
        code: root.userData.codigoPT || root.userData.code,
        dimMm: root.userData?.dim || null,
        dimM: root.userData?.dimM || null,
        materialCode: root.userData?.materialCode ?? null,
        materialBase: root.userData?.materialBase ?? null,
        line: root.userData?.line ?? null,
        subKey: activeSubKey,
        subName: root.userData?.activeSubName ?? null,
        subMaterialCode,
      });

      emitBOM?.();
    }

    function exportProject() {
      // Helper: recolectar acabados por sub-mesh desde la escena
      function collectFinishesFromObject(root) {
        if (root?.userData?.kind === 'SURFACE') return null;
        const out = {};

        // 1) si ya existe root.userData.finishes, úsalo (pero clónalo limpio)
        const raw = root?.userData?.finishes;
        if (raw && typeof raw === 'object') {
          for (const [k, v] of Object.entries(raw)) {
            if (!k || !v || typeof v !== 'object') continue;
            out[k] = {
              materialCode: v.materialCode ?? null,
              materialBase: v.materialBase ?? root.userData?.materialBase ?? null,
              subName: v.subName ?? null,
            };
          }
        }

        // 2) además, escanea meshes (por si se guardó en mesh.userData.materialCode)
        root.traverse?.((n) => {
          if (!n?.isMesh) return;

          const mc = n.userData?.materialCode ?? null;
          if (!mc) return;

          const key = getMeshPathKey(root, n);
          out[key] = {
            materialCode: mc,
            materialBase: root.userData?.materialBase ?? null,
            subName: n.name || key,
          };
        });

        return Object.keys(out).length ? out : null;
      }

      const floor = {
        showGrid: floorMeshRef.current?.userData?.showGrid !== false,
        gridSize: floorMeshRef.current?.userData?.gridSize || 0.1,
        materialCode: floorMeshRef.current?.userData?.materialCode || null,
      };
      const cameraState = {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      };
      const legacyParts = parts.map(({ code, obj }) => {
        const codigoPT = obj.userData?.codigoPT || code;

        const entry = {
          codigoPT,
          transform: {
            position: obj.position.toArray(),
            rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
            scale: obj.scale.toArray(),
          },
        };

        // Superficie paramétrica
        if (obj.userData?.kind === 'SURFACE' && obj.userData?.dim) {
          entry.kind = 'SURFACE';
          entry.surface = {
            line: obj.userData?.line || null,
            dimMm: obj.userData?.dim,
          };
        }

        // Compat: procedural viejo
        if (obj.userData?.procedural) {
          entry.procedural = obj.userData.procedural;
        }

        // Material global (si se aplicó al objeto completo)
        entry.materialBase = obj.userData?.materialBase ?? null;
        entry.materialCode = obj.userData?.materialCode ?? null;

        const isSurface = obj.userData?.kind === 'SURFACE';

        if (isSurface) {
          // SURFACE = material global únicamente
          entry.finishes = null;
          entry.activeSubKey = null;
          entry.activeSubName = null;
        } else {
          // Tipologías/GLB = sub-acabados
          entry.finishes = collectFinishesFromObject(obj);
          entry.activeSubKey = obj.userData?.activeSubKey ?? null;
          entry.activeSubName = obj.userData?.activeSubName ?? null;
        }

        return entry;
      });

      return buildVersionedProject({
        parts,
        collectFinishes: collectFinishesFromObject,
        floor,
        camera: cameraState,
        legacyParts,
      });
    }

    // ====== Cleanup ======
    return () => {
      dimensionHistoryReplayHandler = null;
      historyManager.clearHistory();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);

      renderer.domElement.removeEventListener('pointerdown', onPointerDown, true);
      renderer.domElement.removeEventListener('pointermove', onPointerMove, true);
      renderer.domElement.removeEventListener('pointerup', onPointerUp, true);
      renderer.domElement.removeEventListener('dblclick', onDoubleClick, true);
      renderer.domElement.removeEventListener('lostpointercapture', onPointerCancel, true);

      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerCancel);
      window.removeEventListener('blur', onWindowBlur);
      endEdukHandleDrag();

      clearAdditionalSelectionHelpers();

      // limpiar muros (si existen)
      if (wallsGroupRef.current) {
        while (wallsGroupRef.current.children.length) {
          const ch = wallsGroupRef.current.children[wallsGroupRef.current.children.length - 1];
          wallsGroupRef.current.remove(ch);
          ch.geometry?.dispose?.();
          if (Array.isArray(ch.material)) ch.material.forEach((m) => m?.dispose?.());
          else ch.material?.dispose?.();
        }
        wallsGroupRef.current = null;
      }
      if (columnsGroupRef.current) {
        while (columnsGroupRef.current.children.length) {
          const child = columnsGroupRef.current.children.at(-1);
          columnsGroupRef.current.remove(child);
          child.geometry?.dispose?.();
          child.material?.dispose?.();
        }
        columnsGroupRef.current = null;
      }

      controls.dispose();
      rotationRing.geometry.dispose();
      rotationRing.material.dispose();
      rotationKnob.geometry.dispose();
      rotationKnob.material.dispose();
      rotationLabelTexture.dispose();
      rotationLabel.material.dispose();
      scene.remove(rotationHandle);
      edukHandleGeometry.dispose();
      edukHandleMaterial.dispose();
      edukWidthHandleNext.material.dispose();
      edukHeightHandlePrev.material.dispose();
      edukHeightHandleNext.material.dispose();
      scene.remove(edukTableHandleGroup);
      scene.remove(milaConnectorHandleGroup);
      renderer.domElement.style.cursor = '';
      renderer.dispose();
      if (renderer.domElement?.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      loadProjectRef.current = null;
      cancelRotationRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //use effect 8
  //  AQUi esta la mezcla correcta:
  // - NO toca OrbitControls/zoom/2D snapshot
  // - Solo reconstruye el group de muros cuando cambie `walls`
  useEffect(() => {
    const group = wallsGroupRef.current;
    if (!group) return;

    // limpiar
    while (group.children.length) {
      const ch = group.children[group.children.length - 1];
      group.remove(ch);
      ch.geometry?.dispose?.();
      if (Array.isArray(ch.material)) ch.material.forEach((m) => m?.dispose?.());
      else ch.material?.dispose?.();
    }

    const matBase = new THREE.MeshStandardMaterial({ color: 0xdddddd });

    const wallsGeometry = buildWallsGeometry3D(walls, { openings });
    for (const segment of wallsGeometry.segmentsGeometry) {
      if (segment.length < 0.001) continue;
      const geom = new THREE.BoxGeometry(segment.length, segment.height, segment.thickness);
      const mesh = new THREE.Mesh(geom, matBase.clone());

      mesh.name = segment.segmentId;
      // centro del segmento, apoyado en el piso
      mesh.position.set(segment.center.x, segment.center.y, segment.center.z);
      mesh.rotation.y = segment.rotationY;
      mesh.userData.kind = 'WALL';
      mesh.userData.wallId = segment.wallId;
      mesh.userData.segmentId = segment.segmentId;

      group.add(mesh);
    }
    for (const opening of openings || []) {
      if (opening?.visible === false) continue;
      const doorGeometry = buildDoorGeometry2D(opening, walls, openings);
      if (!doorGeometry?.valid) continue;
      const dx = doorGeometry.openEnd.x - doorGeometry.hinge.x;
      const dz = doorGeometry.openEnd.z - doorGeometry.hinge.z;
      const length = Math.hypot(dx, dz);
      const geometry = new THREE.BoxGeometry(length, opening.height, 0.04);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
      mesh.name = `DOOR_${opening.id}`;
      mesh.position.set(
        (doorGeometry.hinge.x + doorGeometry.openEnd.x) / 2,
        (walls.find((wall) => wall.id === opening.wallId)?.baseElevation || 0) +
          opening.sillHeight +
          opening.height / 2,
        (doorGeometry.hinge.z + doorGeometry.openEnd.z) / 2
      );
      mesh.rotation.y = Math.atan2(dz, dx);
      mesh.userData.kind = 'DOOR';
      mesh.userData.openingId = opening.id;
      mesh.userData.wallId = opening.wallId;
      group.add(mesh);
    }
    refreshFloorAndGridRef.current?.();
  }, [walls, openings]);

  useEffect(() => {
    const group = columnsGroupRef.current;
    if (!group) return;
    while (group.children.length) {
      const child = group.children.at(-1);
      group.remove(child);
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }

    for (const column of columns || []) {
      if (column?.visible === false) continue;
      const descriptor = buildColumnGeometry3D(column);
      const geometry =
        descriptor.geometryType === 'CYLINDER'
          ? new THREE.CylinderGeometry(
              descriptor.diameter / 2,
              descriptor.diameter / 2,
              descriptor.height,
              32
            )
          : new THREE.BoxGeometry(descriptor.width, descriptor.height, descriptor.depth);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xb7b7b7 }));
      mesh.name = `COLUMN_${column.id}`;
      mesh.position.set(descriptor.center.x, descriptor.center.y, descriptor.center.z);
      mesh.rotation.y = descriptor.rotationY;
      mesh.userData.kind = 'COLUMN';
      mesh.userData.columnId = column.id;
      group.add(mesh);
    }
    refreshFloorAndGridRef.current?.();
  }, [columns]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
