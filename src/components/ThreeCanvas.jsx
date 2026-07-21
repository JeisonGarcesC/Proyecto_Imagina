// ThreeCanvas.jsx (MEZCLA: mantiene tu 2D/zoom/controles tal como estaban + agrega muros bien implementados)
// ✅ Lo único “nuevo” es: wallsGroupRef + crear un group en la escena + useEffect EXTERNO que reconstruye muros.
// ✅ También corregí: applyFinishToActivePart (materialDef no estaba definido) y cleanup de listeners.

import { useEffect, useRef } from 'react';
import { useState } from 'react';
import * as THREE from 'three';
import { OrbitControls, GLTFLoader } from 'three-stdlib';
import { createSurfaceMesh, createSurfaceMeta } from '../factories/surfaceFactory';

import { MODEL_TYPES } from '../catalog/catalogData';

//import { resolveSurfaceCodigoPTCeil } from '../factories/surfaceSkuResolver';
import { resolveSurfaceCodigoPT } from '../rules/surfaceRules';
import { applyMaterialToObject3D, applyMaterialToMesh } from '../materials/applyMaterial';

import { exportSceneToGLTF } from '../utils/exportGLTF';

import { exportPlanToDXF } from '../utils/exportDXF';

import { getTipologiaDetalle } from '../services/tipologiasDetalle';
import { getChairDetail } from '../services/chairsLoader';
import { getAresDetail } from '../services/aresLoader';
import { getPlantDetail } from '../services/plantsLoader';
import { getOfficeAccessoryDetail } from '../services/officeAccessoriesLoader';
import { getMepalSaludDetail } from '../services/mepalSaludLoader';
import { getMepalTekSocialDetail } from '../services/mepalTekSocialLoader';
import { getClakDetail } from '../services/clakLoader';
import { getEdukDetail } from '../services/edukLoader';

import { resolveKoncisaDucto } from '../koncisaPlus/rules/koncisaDuctoRules';

import { createKoncisaPrivacyPanelProcedural, panelHasCanto } from '../koncisaPlus/parts/pantallas';

import {
  resolvePedestalFromCostado,
  getPedestalSidesForCostado,
} from '../koncisaPlus/rules/koncisaPedestalRules';

import { resolveKoncisaPedestalReinforcement } from '../koncisaPlus/rules/koncisaPedestalReinforcementRules';
import { resolveKoncisaDuctSupport } from '../koncisaPlus/rules/koncisaDuctSupportRules';

import { resolveKoncisaSurfaceCodigoPT } from '../koncisaPlus/rules/koncisaSurfaceRules';

import {
  canAttachKoncisaIntegrationToPart,
  normalizeIntegrationDepthMm,
  normalizeIntegrationSide,
  normalizeIntegrationWidthMm,
  resolveKoncisaIntegrationPackage,
} from '../koncisaPlus/rules/koncisaIntegrationRules';

import {
  resolveDuctCoverAsset,
  defaultDuctCoverState,
  normalizeDuctCoverState,
  getDuctCoverSides,
  normalizeDuctModuleType,
  inferDuctChannelType,
} from '../koncisaPlus/rules/koncisaDuctCoverRules';
import {
  CLAK_SWAP_ALLOWED_CODES,
  getClakVariantOptionsByCode,
} from './properties/clakPuffVariants';
import {
  isSeatCode as isClakSeatCode,
  isModuleCode as isClakModuleCode,
} from './properties/clakPuffVariants';

const MM_TO_M = 1 / 1000;
const ALMACENAMIENTO_CUSHION_CODE = '22000008239';
const ALMACENAMIENTO_LAMINATE_CODE = '22000007233';

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

export default function ThreeCanvas({
  onApiReady,
  onSelectionChange,
  onBOMChange,
  walls = [],
  readOnly = false,
  materialsByCode,
  catalogByCode,
  country = 'CO',
  onFloatingEditorRequest,
}) {
  const mountRef = useRef(null);

  // ✅ NUEVO: referencia al group de muros (para reconstruir sin romper hooks/zoom/2D)
  const wallsGroupRef = useRef(null);

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

    // ====== State / Cache ======
    const loader = new GLTFLoader();
    const catalogCache = new Map(); // code -> { base, meta }
    let lastSnapTime = 0;
    const SNAP_COOLDOWN_MS = 120;

    // Piezas en escena
    const parts = []; // { code, obj }
    let activePart = null;
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

    let selectionHelper = null;

    function computeBounds2D(root) {
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
      padding = 4,
      minSize = 12,
    }) {
      const spanX = bounds.maxX - bounds.minX;
      const spanZ = bounds.maxZ - bounds.minZ;

      const size = Math.max(minSize, Math.ceil(Math.max(spanX, spanZ) + padding * 2));
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;

      // Piso
      floorMesh.scale.set(size, size, 1);
      floorMesh.position.set(centerX, 0, centerZ);

      // Grid viejo fuera
      if (gridHelper.current) {
        scene.remove(gridHelper.current);
        gridHelper.current.geometry?.dispose?.();
        gridHelper.current.material?.dispose?.();
      }

      //const divisions = Math.max(10, Math.round(size));// de 1 metro en 1 metro
      const cellSize = 0.1; // 10 cm
      const divisions = Math.max(10, Math.round(size / cellSize));
      //const newGrid = new THREE.GridHelper(size, divisions, 0x999999, 0xdddddd);
      const newGrid = new THREE.GridHelper(size, divisions, 0xbcbcbc, 0xe9e9e9);
      newGrid.position.set(centerX, 0.001, centerZ);
      scene.add(newGrid);
      gridHelper.current = newGrid;
    }

    function updateFloorVisualOptions(patch = {}) {
      const floor = floorMeshRef.current;
      if (!floor) return false;

      floor.userData = {
        ...floor.userData,
        ...patch,
      };

      applyFloorVisualState();
      setActivePart(floor);

      onFloatingEditorRequest?.({
        open: true,
        x: 120,
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
      lockedMovement: true,
      lockedDelete: true,
      excludeFromBOM: true,
      isFloor: true,
      showGrid: true,
    };

    scene.add(floorMesh);
    floorMeshRef.current = floorMesh;
    // importante: que pueda seleccionarse
    //pickables.push(floorMesh);

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

    function setActivePart(obj) {
      activePart = obj;
      activeSubMesh = null; // ✅ cada vez que cambia selección, reset submesh

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

      const subKey = obj?.userData?.activeSubKey || null;
      const finishes = obj?.userData?.finishes || {};
      const subMaterialCode = subKey ? finishes[subKey]?.materialCode || null : null;
      const subName = obj?.userData?.activeSubName || null;

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
        ductCovers: obj.userData?.ductCovers || null,

        showGrid: obj.userData?.isFloor ? obj.userData?.showGrid !== false : undefined,
      });
    }

    function selectFloor() {
      const floor = floorMeshRef.current;
      if (!floor) return false;

      setActivePart(floor);

      onFloatingEditorRequest?.({
        open: true,
        x: 120,
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
        },
      });

      return true;
    }

    /*
    function getPartsSnapshot2D() {
      return parts
        .map(({ obj, code }) => {
          if (!obj) return null;

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
            const worldBox = new THREE.Box3().setFromObject(obj);

            const worldSize = new THREE.Vector3();
            const worldCenter = new THREE.Vector3();

            worldBox.getSize(worldSize);
            worldBox.getCenter(worldCenter);

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

    function getPartsSnapshot2D() {
      return parts
        .map(({ obj, code }) => {
          if (!obj) return null;

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

          if (isSurface) {
            const worldBox = new THREE.Box3().setFromObject(obj);

            const worldSize = new THREE.Vector3();
            const worldCenter = new THREE.Vector3();

            worldBox.getSize(worldSize);
            worldBox.getCenter(worldCenter);

            return {
              id: obj.userData?.instanceId || obj.uuid,

              codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,

              x: worldCenter.x,
              z: worldCenter.z,

              w: Math.max(0.001, worldSize.x),
              d: Math.max(0.001, worldSize.z),

              rotY: 0,

              kind: obj.userData?.kind || 'SURFACE',

              type: obj.userData?.type || 'superficie',

              subtype: obj.userData?.subtype || null,
            };
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

            return {
              id: obj.userData?.instanceId || obj.uuid,

              codigoPT: obj.userData?.codigoPT || obj.userData?.code || code,

              x: centerWorld.x,
              z: centerWorld.z,

              w,
              d,

              rotY: Number(worldEuler.y || 0),

              kind: obj.userData?.kind || 'PART',
            };
          }

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

            rotY: 0,

            kind: obj.userData?.kind || 'PART',
          };
        })
        .filter(Boolean);
    }

    function selectPartById(instanceId) {
      const found = parts.find(
        ({ obj }) => (obj?.userData?.instanceId || obj?.uuid) === instanceId
      );
      if (found?.obj) {
        setActivePart(found.obj);
        frameObject?.(found.obj); // opcional: enfocar al seleccionar desde 2D
      }
    }

    function movePartToXZInternal(instanceId, x, z) {
      const found = parts.find(
        ({ obj }) => (obj?.userData?.instanceId || obj?.uuid) === instanceId
      );
      const obj = found?.obj;
      if (!obj || obj.userData?.lockedMovement) return false;

      const nextX = Number(x);
      const nextZ = Number(z);
      if (!Number.isFinite(nextX) || !Number.isFinite(nextZ)) return false;

      obj.position.x = nextX;
      obj.position.z = nextZ;
      obj.updateMatrixWorld(true);

      if (selectionHelper) selectionHelper.update();
      refreshFloorAndGrid();
      emitBOM();
      return true;
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
      let cur = intersectObj;
      let fallback = null;

      while (cur) {
        // 1. Prioridad máxima: raíz explícita
        if (cur.userData?.isPartRoot) {
          return cur;
        }

        const kind = cur.userData?.kind;

        // 2. Priorizar contenedores/raíces de ensamblaje
        if (
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
          kind === 'KONCISA_PLUS_ASSEMBLY'
        ) {
          return cur;
        }

        // 3. Fallback: piezas sueltas seleccionables
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

    function snapActivePart() {
      if (!snapActive || !activePart) return;

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
    }

    async function loadExistingGlb(possibleSrcs) {
      for (const src of possibleSrcs) {
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
    }

    async function addAres(codigoAres, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoAres);

      // 1) trae detalle del producto Ares desde el XML
      const [detCO, detEUC, detUSD] = await Promise.all([
        getAresDetail(codigo, 'CO'),
        getAresDetail(codigo, 'EUC'),
        getAresDetail(codigo, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.warn(`Ares: producto ${codigo} no encontrado en PriceList, se cargará sin precio.`);
      }

      // 2) cargar GLB desde carpeta Ares
      const possibleSrcs = [`/assets/models/Ares/${codigo}.glb`, `/assets/models/${codigo}.glb`];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró un GLB válido para Ares ${codigo}`);
        return;
      }

      const obj = gltf.scene;

      // 3) userData
      const aresParts = [
        {
          code: codigo,
          description: det?.descripcion || codigo,
          qty: 1,
          unitPrice: Number(det?.precio || 0),
          prices: {
            CO: detCO?.precio || 0,
            EUC: detEUC?.precio || 0,
            USD: detUSD?.precio || 0,
          },
        },
      ];

      obj.userData = {
        ...(obj.userData || {}),
        kind: 'ARES',
        codigoPT: codigo,
        code: codigo,
        name: det?.descripcion || codigo,
        aresParts,
        aresMeta: {
          descripcion: det?.descripcion || codigo,
          precio: det?.precio || 0,
          udm: det?.udm || 'und',
        },
      };

      obj.name = `ARES_${codigo}`;

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
    }

    async function addMepalSalud(codigoMepal, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoMepal);

      // 1) trae detalle del producto MepalSalud desde el XML
      const [detCO, detEUC, detUSD] = await Promise.all([
        getMepalSaludDetail(codigo, 'CO'),
        getMepalSaludDetail(codigo, 'EUC'),
        getMepalSaludDetail(codigo, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.warn(
          `MepalSalud: producto ${codigo} no encontrado en PriceList, se cargará sin precio.`
        );
      }

      // 2) cargar GLB desde carpeta MepalSalud
      const possibleSrcs = [
        `/assets/models/MepalSalud/${codigo}.glb`,
        `/assets/models/${codigo}.glb`,
      ];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró un GLB válido para MepalSalud ${codigo}`);
        return;
      }

      const obj = gltf.scene;

      // 3) userData
      const mepalPartPrices = {
        CO: Number(detCO?.precio || 0),
        EUC: Number(detEUC?.precio || 0),
        USD: Number(detUSD?.precio || 0),
      };
      const mepalParts = [
        {
          code: codigo,
          description: det?.descripcion || codigo,
          qty: 1,
          unitPrice: Number(mepalPartPrices[countryRef.current] || 0),
          prices: mepalPartPrices,
        },
      ];

      obj.userData = {
        ...(obj.userData || {}),
        kind: 'MEPAL_SALUD',
        codigoPT: codigo,
        code: codigo,
        name: det?.descripcion || codigo,
        instanceId: obj.uuid,
        mepalVariant: 'normal',
        mepalParts,
        mepalMeta: {
          descripcion: det?.descripcion || codigo,
          precio: det?.precio || 0,
          udm: det?.udm || 'und',
        },
      };

      obj.name = `MEPAL_SALUD_${codigo}`;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

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
    }

    async function addMepalTekSocial(codigoMepalTekSocial, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoMepalTekSocial);

      // 1) trae detalle del producto Mepal TekSocial desde el XML
      const [detCO, detEUC, detUSD] = await Promise.all([
        getMepalTekSocialDetail(codigo, 'CO'),
        getMepalTekSocialDetail(codigo, 'EUC'),
        getMepalTekSocialDetail(codigo, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.warn(
          `Mepal TekSocial: producto ${codigo} no encontrado en PriceList, se cargará sin precio.`
        );
      }

      // 2) cargar GLB desde carpeta Mepal TekSocial
      const possibleSrcs = [
        `/assets/models/Mepal TekSocial/${codigo}.glb`,
        `/assets/models/${codigo}.glb`,
      ];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró un GLB válido para Mepal TekSocial ${codigo}`);
        return;
      }

      const obj = gltf.scene;

      // 3) userData
      const mepalTekSocialPartPrices = {
        CO: Number(detCO?.precio || 0),
        EUC: Number(detEUC?.precio || 0),
        USD: Number(detUSD?.precio || 0),
      };
      const mepalTekSocialParts = [
        {
          code: codigo,
          description: det?.descripcion || codigo,
          qty: 1,
          unitPrice: Number(mepalTekSocialPartPrices[countryRef.current] || 0),
          prices: mepalTekSocialPartPrices,
        },
      ];

      obj.userData = {
        ...(obj.userData || {}),
        kind: 'MEPAL_TEK_SOCIAL',
        codigoPT: codigo,
        code: codigo,
        name: det?.descripcion || codigo,
        instanceId: obj.uuid,
        mepalTekSocialParts,
        mepalTekSocialMeta: {
          descripcion: det?.descripcion || codigo,
          precio: det?.precio || 0,
          udm: det?.udm || 'und',
        },
      };

      obj.name = `MEPAL_TEK_SOCIAL_${codigo}`;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

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
    }

    async function addClak(codigoClak, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoClak);

      // 1) trae detalle del producto Clak desde el XML
      const [detCO, detEUC, detUSD] = await Promise.all([
        getClakDetail(codigo, 'CO'),
        getClakDetail(codigo, 'EUC'),
        getClakDetail(codigo, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.warn(`Clak: producto ${codigo} no encontrado en PriceList, se cargará sin precio.`);
      }

      // 2) cargar GLB desde carpeta Clak
      const possibleSrcs = [`/assets/models/Clak/${codigo}.glb`, `/assets/models/${codigo}.glb`];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró un GLB válido para Clak ${codigo}`);
        return;
      }

      const obj = gltf.scene;

      // 3) userData
      const clakPartPrices = {
        CO: Number(detCO?.precio || 0),
        EUC: Number(detEUC?.precio || 0),
        USD: Number(detUSD?.precio || 0),
      };
      const clakParts = [
        {
          code: codigo,
          description: det?.descripcion || codigo,
          qty: 1,
          unitPrice: Number(clakPartPrices[countryRef.current] || 0),
          prices: clakPartPrices,
        },
      ];

      obj.userData = {
        ...(obj.userData || {}),
        kind: 'CLAK',
        codigoPT: codigo,
        code: codigo,
        name: det?.descripcion || codigo,
        instanceId: obj.uuid,
        clakParts,
        clakMeta: {
          descripcion: det?.descripcion || codigo,
          precio: det?.precio || 0,
          udm: det?.udm || 'und',
        },
      };

      obj.name = `CLAK_${codigo}`;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

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
    }

    async function addEduk(codigoEduk, options = {}) {
      if (readOnly) return;
      const parentGroup = options?.parentGroup || null;
      const codigo = String(codigoEduk);

      // 1) trae detalle del producto Eduk desde el XML
      const [detCO, detEUC, detUSD] = await Promise.all([
        getEdukDetail(codigo, 'CO'),
        getEdukDetail(codigo, 'EUC'),
        getEdukDetail(codigo, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.warn(`Eduk: producto ${codigo} no encontrado en PriceList, se cargará sin precio.`);
      }

      // 2) cargar GLB desde carpeta Eduk
      const possibleSrcs = [`/assets/models/Eduk/${codigo}.glb`, `/assets/models/${codigo}.glb`];

      const gltf = await loadExistingGlb(possibleSrcs);

      if (!gltf) {
        console.error(`No se encontró un GLB válido para Eduk ${codigo}`);
        return;
      }

      const obj = gltf.scene;

      // 3) userData
      const edukPartPrices = {
        CO: Number(detCO?.precio || 0),
        EUC: Number(detEUC?.precio || 0),
        USD: Number(detUSD?.precio || 0),
      };
      const edukParts = [
        {
          code: codigo,
          description: det?.descripcion || codigo,
          qty: 1,
          unitPrice: Number(edukPartPrices[countryRef.current] || 0),
          prices: edukPartPrices,
        },
      ];

      obj.userData = {
        ...(obj.userData || {}),
        kind: 'EDUK',
        codigoPT: codigo,
        code: codigo,
        name: det?.descripcion || codigo,
        instanceId: obj.uuid,
        edukParts,
        edukMeta: {
          descripcion: det?.descripcion || codigo,
          precio: det?.precio || 0,
          udm: det?.udm || 'und',
        },
      };

      obj.name = `EDUK_${codigo}`;

      // 4) posición inicial
      obj.position.set(Math.max(0, parts.length * 0.9), 0, 0);
      obj.updateMatrixWorld(true);

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
    }

    async function swapMepalSaludVariant(instanceId, codigo, targetVariant = 'desplegado') {
      if (readOnly) return;

      const codigoBase = String(codigo).replace(/_2$/, '');
      const canUseDesplegado = codigoBase === '22000129632' || codigoBase === '22000127958';
      if (targetVariant === 'desplegado' && !canUseDesplegado) {
        console.warn('[swapMepalSaludVariant] Variante desplegado no permitida para:', codigoBase);
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

      // 2) Guardar posición y rotación
      const savedPos = oldObj.position.clone();
      const savedRot = oldObj.rotation.clone();

      // 3) Guardar userData relevante
      const savedUserData = { ...oldObj.userData };

      // 4) Eliminar objeto actual
      removePartObject(oldObj);

      // 5) Determinar qué GLB cargar según variante
      const glbSrc =
        targetVariant === 'normal'
          ? `/assets/models/MepalSalud/${codigoBase}.glb`
          : `/assets/models/MepalSalud/${codigoBase}_2.glb`;

      const gltf = await loadExistingGlb([glbSrc]);

      if (!gltf) {
        console.error('[swapMepalSaludVariant] No se encontró el GLB:', glbSrc);
        await addMepalSalud(codigoBase);
        return;
      }

      const newObj = gltf.scene;

      // 6) Restaurar userData y posición
      newObj.userData = {
        ...savedUserData,
        instanceId: newObj.uuid,
        mepalVariant: targetVariant,
      };
      newObj.name =
        targetVariant === 'normal' ? `MEPAL_SALUD_${codigoBase}` : `MEPAL_SALUD_${codigoBase}_2`;
      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.updateMatrixWorld(true);

      scene.add(newObj);
      parts.push({ code: codigoBase, obj: newObj });
      pickables.push(newObj);

      setActivePart(newObj);
      emitBOM();
      refreshFloorAndGrid();
    }

    async function swapClakVariant(instanceId, codigo, targetCode) {
      if (readOnly) return;

      const currentCode = String(codigo || '')
        .trim()
        .replace(/_2$/, '');
      const nextCode = String(targetCode || '')
        .trim()
        .replace(/_2$/, '');

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
        const sameFamily = currentOptions.some((it) => it.code === nextCode);
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

      const [detCO, detEUC, detUSD] = await Promise.all([
        getClakDetail(nextCode, 'CO'),
        getClakDetail(nextCode, 'EUC'),
        getClakDetail(nextCode, 'USD'),
      ]);

      const det =
        (countryRef.current === 'EUC' && detEUC) ||
        (countryRef.current === 'USD' && detUSD) ||
        detCO ||
        detEUC ||
        detUSD;

      if (!det) {
        console.warn(
          `[swapClakVariant] Producto ${nextCode} no encontrado en PriceList, se cargará sin precio.`
        );
      }

      const glbSrc = `/assets/models/Clak/${nextCode}.glb`;
      const gltf = await loadExistingGlb([glbSrc, `/assets/models/${nextCode}.glb`]);

      if (!gltf) {
        console.error('[swapClakVariant] No se encontró el GLB:', glbSrc);
        // fallback: intentar crear el Clak con el addClak normal
        // restaurar posición/rotación en la creación no es trivial aquí,
        // pero al menos añadimos el modelo para que el usuario lo vea.
        await addClak(nextCode, { parentGroup });
        return;
      }

      removePartObject(oldObj);

      const clakPartPrices = {
        CO: Number(detCO?.precio || 0),
        EUC: Number(detEUC?.precio || 0),
        USD: Number(detUSD?.precio || 0),
      };

      const newObj = gltf.scene;
      newObj.userData = {
        ...savedUserData,
        kind: 'CLAK',
        codigoPT: nextCode,
        code: nextCode,
        name: det?.descripcion || nextCode,
        instanceId: newObj.uuid,
        clakParts: [
          {
            code: nextCode,
            description: det?.descripcion || nextCode,
            qty: 1,
            unitPrice: Number(clakPartPrices[countryRef.current] || 0),
            prices: clakPartPrices,
          },
        ],
        clakMeta: {
          descripcion: det?.descripcion || nextCode,
          precio: det?.precio || 0,
          udm: det?.udm || 'und',
        },
      };

      newObj.name = `CLAK_${nextCode}`;
      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.updateMatrixWorld(true);

      if (parentGroup) {
        parentGroup.add(newObj);
      } else {
        scene.add(newObj);
      }

      parts.push({ code: nextCode, obj: newObj });
      pickables.push(newObj);

      setActivePart(newObj);
      emitBOM();
      refreshFloorAndGrid();
    }

    async function swapAlmacenamientoVariant(instanceId, codigo, targetVariant = 'base') {
      if (readOnly) return;

      const currentCode = String(codigo || '').trim();
      if (!currentCode) return;

      const found = parts.find(({ obj }) => {
        return obj?.userData?.instanceId === instanceId || obj?.uuid === instanceId;
      });

      if (!found?.obj) {
        console.warn('[swapAlmacenamientoVariant] No se encontró la pieza:', instanceId);
        return;
      }

      const oldObj = found.obj;
      const variantList = Array.isArray(oldObj?.userData?.almacenVariants)
        ? oldObj.userData.almacenVariants
        : [];

      if (!variantList.length) {
        console.warn(
          '[swapAlmacenamientoVariant] La pieza no tiene variantes disponibles:',
          currentCode
        );
        return;
      }

      const normTarget = String(targetVariant || 'base')
        .trim()
        .toLowerCase();

      const targetEntry =
        normTarget === 'base'
          ? variantList.find((v) => !v?.variant) || variantList[0]
          : variantList.find(
              (v) =>
                String(v?.variant || '')
                  .replace(/^_+/, '')
                  .toLowerCase() === normTarget
            );

      if (!targetEntry?.src) {
        console.warn(
          '[swapAlmacenamientoVariant] Variante no encontrada:',
          targetVariant,
          variantList
        );
        return;
      }

      const savedPos = oldObj.position.clone();
      const savedRot = oldObj.rotation.clone();
      const savedUserData = { ...oldObj.userData };
      const parentGroup = oldObj.parent && oldObj.parent !== scene ? oldObj.parent : null;

      const gltf = await loadExistingGlb([targetEntry.src]);
      if (!gltf) {
        console.error('[swapAlmacenamientoVariant] No se encontró el GLB:', targetEntry.src);
        return;
      }

      removePartObject(oldObj);

      const newObj = gltf.scene;
      const addonParts = await buildAlmacenamientoAddonParts(targetEntry?.variant || null);
      newObj.userData = {
        ...savedUserData,
        kind: 'ALMACENAMIENTO',
        codigoPT: currentCode,
        code: currentCode,
        name: savedUserData?.name || currentCode,
        instanceId: newObj.uuid,
        almacenVariant: targetEntry?.variant || null,
        almacenCategory: targetEntry?.category || savedUserData?.almacenCategory || null,
        almacenVariants: variantList,
        almacenAddonParts: addonParts,
      };

      newObj.name = `ALMACENAMIENTO_${currentCode}`;
      newObj.position.copy(savedPos);
      newObj.rotation.copy(savedRot);
      newObj.updateMatrixWorld(true);

      if (parentGroup) {
        parentGroup.add(newObj);
      } else {
        scene.add(newObj);
      }

      parts.push({ code: currentCode, obj: newObj });
      pickables.push(newObj);

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
          await addTypology(codigo);
          return;
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
        await addPartFromGlb(item); // le pasas el ITEM, no el codigo
        return;
      }

      if (item.model?.kind === MODEL_TYPES.PROCEDURAL) {
        const d = item.model.defaults || { widthM: 1.2, depthM: 0.6, thicknessM: 0.025 };
        addSurface(d, item); //  le pasas item para guardar codigoPT en userData
        return;
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
      if (Array.isArray(t.rotation)) obj.rotation.set(t.rotation[0], t.rotation[1], t.rotation[2]);
      if (Array.isArray(t.scale)) obj.scale.fromArray(t.scale);
      obj.updateMatrixWorld(true);
    }

    function clearProject() {
      // remover objetos de escena
      for (const p of parts) {
        scene.remove(p.obj);
      }
      parts.length = 0;

      // pickables
      pickables.length = 0;

      // selección
      activePart = null;
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

    function removeFloatingChildrenOfAssembly(assemblyObj) {
      const assemblyId = getAssemblyId(assemblyObj);

      if (!assemblyId) return;

      const floatingChildren = parts
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

      floatingChildren.forEach((child) => {
        removePartObject(child, {
          skipFloatingChildren: true,
        });
      });
    }

    function removePartObject(obj, options = {}) {
      if (!obj) return false;

      const root = getRootPartObject(obj) || obj;

      const { skipFloatingChildren = false } = options;

      const isAssembly =
        root.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' || root.userData?.type === 'koncisa-plus';

      // Si se elimina un puesto, primero elimina pantallas asociadas que estén por fuera.
      if (isAssembly && !skipFloatingChildren) {
        removeFloatingChildrenOfAssembly(root);
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

      // Si la selección activa era este objeto o algo dentro de él, limpiar selección.
      if (activePart === root || isDescendantOf(activePart, root)) {
        activePart = null;
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
      }

      disposeObject3D(root);

      emitBOM();

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

      if (!project?.parts?.length) return;

      clearProject();

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

      // reconstruir piezas
      for (const part of project.parts) {
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
            continue;
          }

          // ===========================
          // 3) GLB (incluye tipologías)
          // ===========================
          await addCatalogItem(codigoPT);
          const last = parts[parts.length - 1]?.obj;
          if (!last) continue;

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
        } catch (err) {
          console.error('[loadProject] Error cargando part:', part?.codigoPT, err);
          // sigue con la siguiente pieza
        }
      }

      emitBOM();
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

          support.position.set(
            anchor.position?.[0] || 0,
            anchor.position?.[1] || 0,
            anchor.position?.[2] || 0
          );

          support.rotation.set(
            anchor.rotation?.[0] || 0,
            anchor.rotation?.[1] || 0,
            anchor.rotation?.[2] || 0
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

      const root = getRootPartObject(activePart) || activePart;

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

    onApiReady?.({
      addPart,
      addPartFromGlb,
      addSurface,
      addKoncisaPrivacyPanel,
      updateActivePrivacyPanelFinish,
      createKoncisaPlusAssemblyGroup,
      getActivePart: () => activePart,
      selectObject: (obj) => {
        if (obj) setActivePart(obj);
      },
      addCatalogItem,
      addExternalGlbPart,
      addNativeBlockPart,
      addKoncisaCostadoAssemblyPart,
      addNativeKoncisaDuctPart,
      toggleSnap,
      exportProject,
      loadProject,
      clearProject,
      removeActivePart,
      removePartById,
      applyFinishToActivePart,
      getPartsSnapshot2D,
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
      swapMepalSaludVariant,
      swapClakVariant,
      swapAlmacenamientoVariant,
      exportGLTF: () => exportSceneToGLTF(scene, { filename: 'proyecto.glb' }),
      exportDXF: () => {
        const snap = getPartsSnapshot2D();
        exportPlanToDXF({
          walls,
          partsSnapshot: snap,
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
      removeTargetOrGroup: (target) => removeTargetOrGroup(target),
      removeActiveOrGroup: () => removeTargetOrGroup(activePart),
      updateSelectedDuctType,
      updateSelectedDuctCovers,
      updateSelectedCeilingDuctSide,
      updateSelectedPartTransformPatch,
      movePartToXZ: (id, x, z) => movePartToXZInternal(id, x, z),
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

      return parts.map((p) => p?.obj).filter((obj) => obj?.userData?.groupId === groupId);
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

      return parts
        .map((p) => p?.obj)
        .filter(Boolean)
        .filter((obj) => getFinishFamilyKey(obj) === familyKey);
    }

    function moveTargetOrGroup(target, dx = 0, dy = 0, dz = 0) {
      if (!target) return;
      if (target?.userData?.lockedMovement) return;

      const targets =
        moveAsGroupRef.current && target?.userData?.groupId ? getGroupedObjects(target) : [target];

      targets.forEach((obj) => {
        obj.position.x += dx;
        obj.position.y += dy;
        obj.position.z += dz;
        obj.updateMatrixWorld(true);
      });

      if (selectionHelper) selectionHelper.update();
      refreshFloorAndGrid();
    }

    //eliminar por grupo
    function removeTargetOrGroup(target) {
      if (!target) return false;

      const targets =
        deleteAsGroupRef.current && target?.userData?.groupId
          ? getGroupedObjects(target)
          : [target];

      let removedAny = false;

      targets.forEach((obj) => {
        const ok = removePartObject(obj);
        if (ok) removedAny = true;
      });

      return removedAny;
    }

    async function replaceSelectedCostadoWithPedestal({ placementSide = 'RIGHT' } = {}) {
      if (readOnly) return false;
      if (!activePart) return false;

      const costadoObj = getRootPartObject(activePart) || activePart;

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

      const pedestalObj = getRootPartObject(activePart) || activePart;

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

      const costadoObj = getRootPartObject(activePart) || activePart;

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

      const selectedObj = getRootPartObject(activePart) || activePart;
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

    function getDuctCoverLocalTransform(root, side) {
      const b2d = computeBounds2D(root);
      const sizeLocal = b2d?.sizeLocal || new THREE.Vector3(0.6, 0.1, 0.2);

      const halfX = sizeLocal.x / 2;

      // Ajuste base inicial.
      // Luego, si quieres, calibramos fino X/Y/Z según cómo venga el GLB.
      if (side === 'left') {
        return {
          position: new THREE.Vector3(-halfX, 0, 0),
          rotationY: Math.PI,
        };
      }

      if (side === 'right') {
        return {
          position: new THREE.Vector3(halfX, 0, 0),
          rotationY: 0,
        };
      }

      // terminal / individual
      return {
        position: new THREE.Vector3(halfX, 0, 0),
        rotationY: 0,
      };
    }

    function rotateSelectedDuct180() {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getRootPartObject(activePart) || activePart;

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

      // Rotación relativa: toma la rotación real actual y suma 180°
      root.rotation.y += Math.PI;

      // Normalizar para evitar valores infinitos: 0, PI, 2PI, 3PI...
      root.rotation.y = THREE.MathUtils.euclideanModulo(root.rotation.y, Math.PI * 2);

      if (!isCurrentlyRotated) {
        console.log('Rotando ducto 180.');
        root.position.x = 0.34; // ajustar posición cuando está rotado en x esta en metros
        root.position.z = -0.258; // ajustar posición cuando está rotado en y esta en metros
        root.userData.ductRotated180 = true;
      } else {
        console.log('no 180 grados');
        root.position.x = 0;
        root.position.z = 0;
        root.userData.ductRotated180 = false;
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

      const root = getRootPartObject(activePart) || activePart;
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
        },
      });

      if (!newDuctObj) return false;

      // Mantener tapas si tenía
      await syncDuctCovers(newDuctObj, oldCovers);

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

      const t = getDuctCoverLocalTransform(root, side);

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
      const sides = getDuctCoverSides(tipoModulo, nextState);

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
      if (!activePart) return false;
      if (activePart.userData?.kind !== 'ducto') return false;

      const tipoModulo = normalizeDuctModuleType(activePart.userData?.meta?.tipoModulo);
      const currentState = activePart.userData?.ductCovers || defaultDuctCoverState(tipoModulo);

      const nextState = normalizeDuctCoverState(tipoModulo, {
        ...currentState,
        ...patch,
      });

      return await syncDuctCovers(activePart, nextState);
    }

    //////////////
    async function updateSelectedDuctType(newType) {
      if (readOnly) return;
      if (!activePart) return;
      if (activePart.userData?.kind !== 'ducto') return;

      // Normalizar el tipo de módulo
      const normalizedType = String(newType || '')
        .trim()
        .toLowerCase();

      const oldObj = activePart;

      // Información actual del ducto
      const tipoPuesto = oldObj.userData?.meta?.tipoPuesto || 'sencillo';
      const nominalWidthMm = oldObj.userData?.meta?.nominalWidthMm || 1200;
      const oldCovers = oldObj.userData?.ductCovers || defaultDuctCoverState(normalizedType);

      // Resolver el ducto según tipo y ancho
      const resolved = resolveKoncisaDucto({
        tipoPuesto,
        tipoModulo: normalizedType,
        nominalWidthMm,
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
      const groupId = oldObj.userData?.groupId || null;
      const groupName = oldObj.userData?.groupName || null;
      const parentGroup =
        oldObj.parent?.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' ? oldObj.parent : null;

      // Remover el ducto antiguo de la escena
      removePartObject(oldObj);

      // Crear nuevo ducto
      const newDuctObj = await addExternalGlbPart({
        type: 'ducto',
        subtype: normalizedType,
        line: 'KONCISA.PLUS',
        code: resolved.codigoPT,
        logicalCode: resolved.logicalCode,
        groupId,
        parentGroup,
        groupName,
        position: { x: pos.x * 1000, y: pos.y * 1000, z: pos.z * 1000 },
        rotation: { x: rot.x, y: rot.y, z: rot.z },
        model: { kind: 'glb', src: resolved.modelSrc },
        meta: {
          category: 'ductos',
          tipoPuesto,
          tipoModulo: normalizedType,
          nominalWidthMm,
          ductCovers: oldCovers,
        },
      });

      if (!newDuctObj) return;

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

    function updateSelectedCeilingDuctSide(newSide) {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getRootPartObject(activePart) || activePart;

      if (root.userData?.kind !== 'ductoTecho') {
        console.warn('La pieza activa no es un ducto bajante a techo.');
        return false;
      }

      const side = String(newSide || 'LEFT').toUpperCase() === 'RIGHT' ? 'RIGHT' : 'LEFT';

      root.userData.meta = {
        ...(root.userData.meta || {}),
        side,
      };

      /**
       * Caso recomendado:
       * Si desde buildKoncisaPlus guardas las posiciones ya calculadas para LEFT/RIGHT,
       * se usan aquí directamente.
       */
      const sideTransforms = root.userData?.meta?.sideTransformsMm || null;
      const nextTransform = sideTransforms?.[side] || null;

      if (nextTransform?.position) {
        root.position.set(
          Number(nextTransform.position.x || 0) / 1000,
          Number(nextTransform.position.y || 0) / 1000,
          Number(nextTransform.position.z || 0) / 1000
        );
      }

      if (nextTransform?.rotation) {
        root.rotation.set(
          Number(nextTransform.rotation.x || 0),
          Number(nextTransform.rotation.y || 0),
          Number(nextTransform.rotation.z || 0)
        );
      } else {
        // Fallback temporal si aún no tienes sideTransformsMm
        root.rotation.y = side === 'RIGHT' ? Math.PI : 0;
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
      });

      refreshFloorAndGrid();
      emitBOM();

      return true;
    }

    function updateSelectedPartTransformPatch(patch = {}) {
      if (readOnly) return false;
      if (!activePart) return false;

      const root = getRootPartObject(activePart) || activePart;

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

      // si estás escribiendo en un input, no interceptar teclas
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

      //  Supr / Backspace para eliminar pieza seleccionada
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activePart) {
          e.preventDefault();
          //removeActivePart();
          removeTargetOrGroup(activePart);
        }
        return;
      }

      if (!activePart) return;

      switch (e.key) {
        case 'p':
        case 'P':
          e.preventDefault();
          selectFloor();
          break;
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
          if (!activePart) break;
          const step = e.altKey ? THREE.MathUtils.degToRad(15) : THREE.MathUtils.degToRad(90);
          activePart.rotation.y += e.shiftKey ? -step : step;
          activePart.updateMatrixWorld(true);
          if (selectionHelper) selectionHelper.update();
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
    function onPointerDown(e) {
      if (readOnly) return;
      if (!pickables.length) return;

      updateMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects(pickables, true);
      if (!hits.length) return;

      const hitObj = hits[0].object; // Mesh real clickeado
      const root = getRootPartObject(hitObj);
      if (!root) return;

      setActivePart(root);

      if (root?.userData?.lockedMovement) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      //para propiedades flotantes p popup:
      onFloatingEditorRequest?.({
        open: true,
        x: e.clientX,
        y: e.clientY,
        part: {
          code: root.userData?.codigoPT || root.userData?.code || null,
          kind: root.userData?.kind || null,
          meta: root.userData?.meta || null,
          groupId: root.userData?.groupId || null,
          groupName: root.userData?.groupName || null,
          logicalCode: root.userData?.logicalCode || null,
          instanceId: root.userData?.instanceId || null,
          description: root.userData?.description || null,
          showGrid: root.userData?.showGrid !== false,
          mepalVariant: root.userData?.mepalVariant || 'normal',
          almacenVariant: root.userData?.almacenVariant || null,
          almacenCategory: root.userData?.almacenCategory || null,
          almacenVariants: root.userData?.almacenVariants || null,
        },
      });

      const isAssemblyRoot =
        root?.userData?.kind === 'KONCISA_PLUS_ASSEMBLY' || root?.userData?.type === 'koncisa-plus';

      //if (moveAsGroup && root?.userData?.groupId) {
      if (moveAsGroupRef.current && root?.userData?.groupId && !isAssemblyRoot) {
        const grouped = getGroupedObjects(root);
        dragGroupStartRef.current = grouped.map((obj) => ({
          obj,
          position: obj.position.clone(),
        }));
      } else {
        dragGroupStartRef.current = null;
      }

      dragRootStartRef.current = root.position.clone();

      //  Guardar submesh clickeado
      activeSubMesh = hitObj?.isMesh ? hitObj : null;

      //  Guardar key estable en el root (para persistencia y UI)
      if (activeSubMesh) {
        const subKey = getMeshPathKey(root, activeSubMesh);

        root.userData.activeSubKey = subKey;
        root.userData.activeSubName =
          activeSubMesh.name && activeSubMesh.name.trim() ? activeSubMesh.name.trim() : subKey;
      } else {
        root.userData.activeSubKey = null;
        root.userData.activeSubName = null;
      }

      // ---- DRAG ----
      isDragging = true;

      dragPlane.set(new THREE.Vector3(0, 1, 0), -root.position.y);
      raycaster.ray.intersectPlane(dragPlane, dragPoint);
      dragOffset.copy(dragPoint).sub(root.position);

      controls.enabled = false;
      renderer.domElement.setPointerCapture?.(e.pointerId);

      e.preventDefault();
      e.stopPropagation();
    }

    function onPointerMove(e) {
      if (readOnly) return;
      if (!isDragging || !activePart) return;

      updateMouseFromEvent(e);
      raycaster.setFromCamera(mouse, camera);

      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        const nextPos = dragPoint.clone().sub(dragOffset);

        if (
          moveAsGroupRef.current &&
          activePart?.userData?.groupId &&
          dragGroupStartRef.current &&
          dragRootStartRef.current
        ) {
          const delta = nextPos.clone().sub(dragRootStartRef.current);

          dragGroupStartRef.current.forEach(({ obj, position }) => {
            obj.position.copy(position.clone().add(delta));
            obj.updateMatrixWorld(true);
          });
        } else {
          activePart.position.copy(nextPos);
          activePart.updateMatrixWorld(true);
        }

        if (selectionHelper) selectionHelper.update();
      }
      refreshFloorAndGrid();
    }

    function onPointerUp(e) {
      if (readOnly) {
        // en solo-lectura igual liberamos el capture si existiera
        try {
          renderer.domElement.releasePointerCapture?.(e.pointerId);
        } catch (err) {
          void err;
        }
        isDragging = false;
        controls.enabled = true;
        return;
      }
      if (!isDragging) return;
      isDragging = false;
      controls.enabled = true;
      try {
        renderer.domElement.releasePointerCapture?.(e.pointerId);
      } catch (err) {
        void err;
      }

      dragGroupStartRef.current = null;
      dragRootStartRef.current = null;
      snapActivePart();
      refreshFloorAndGrid();
    }

    function onPointerCancel(e) {
      dragGroupStartRef.current = null;
      dragRootStartRef.current = null;
      endDrag(e.pointerId);
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('lostpointercapture', onPointerCancel);

    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', () => {
      isDragging = false;
      controls.enabled = true;
    });
    window.addEventListener('blur', () => {
      isDragging = false;
      controls.enabled = true;
    });

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
      if (!isDragging && controls.enabled === false) controls.enabled = true;

      controls.update();
      if (selectionHelper) selectionHelper.update();

      if (!isDragging) snapActivePart();

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
      const usesBoundedDepthPositioning =
        positioningMode === 'bounded-depth-v1' &&
        tipoPuesto === 'sencillo' &&
        forma === 'RECT' &&
        layoutType !== 'LEADER' &&
        (realDepthMm === 600 || realDepthMm === 750);

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
        crossbarOffsetMm.z = (leftInnerFaceZ + rightInnerFaceZ) / 2;
        bracketPositionMm.z =
          -(resolvedCenterBracketMinZFromPivotMm + resolvedCenterBracketMaxZFromPivotMm) / 2;
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
      const rootPositionZMm = usesBoundedDepthPositioning
        ? 0
        : Number(part?.position?.z || 0) + sideOffsetZMm;

      root.position.set(
        (Number(part?.position?.x || 0) + baseOffsetX) / 1000,
        (Number(part?.position?.y || 0) + baseOffsetY) / 1000,
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

        const code = String(part.code || '').trim();
        const catalogItem = catalogByCodeRef.current?.get?.(code) || null;

        const description =
          catalogItem?.ui?.title ||
          catalogItem?.ui?.subtitle ||
          catalogItem?.raw?.descripcion ||
          catalogItem?.raw?.description ||
          part.name ||
          part.code ||
          'Pieza GLB';

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
          isPartRoot: true, //para usar las propiedades en los diferentes elementos
          code: code || null,
          codigoPT: code || null,
          kind: part.type || 'GLB_PART',
          line: part.line || null,
          dim: part.dimMm || null,
          description,
          unitPrice,
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

        if (parentGroup) {
          parentGroup.add(obj);
        } else {
          scene.add(obj);
        }

        parts.push({ code: code || obj.name, obj });
        pickables.push(obj);

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

      const code = materialCode || null;
      const def = materialDef || null;

      const isSurface =
        activePart.userData?.kind === 'SURFACE' || activePart.userData?.kind === 'FLOOR_VISUAL';

      const wantAll = scope === 'ALL';
      const wantGroup = scope === 'GROUP';

      // ===== CANTO DE SUPERFICIE =====
      // Si se hizo clic en cualquier canto de una superficie,
      // se aplica el material a TODOS los cantos de esa superficie.
      const root = getRootPartObject(activePart) || activePart;

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
        const targets = getFinishGroupTargets(activePart);

        targets.forEach((obj) => {
          obj.userData.materialCode = code;
          //obj.userData.materialDef = def;

          applyMaterialToObject3D(obj, code, def);

          obj.userData.finishes = null;
          obj.userData.activeSubKey = null;
          obj.userData.activeSubName = null;
        });

        // refresca panel con la pieza activa actual
        const subKey = activePart.userData?.activeSubKey || null;
        const finishes = activePart.userData?.finishes || {};
        const subMaterialCode = subKey ? finishes[subKey]?.materialCode || null : null;
        const subName = activePart.userData?.activeSubName || null;

        onSelectionChange?.({
          code: activePart.userData.codigoPT || activePart.userData.code,
          dimMm: activePart.userData?.dim || null,
          dimM:
            activePart.userData?.dimM ||
            activePart.userData?.procedural ||
            activePart.userData?.dimMeters ||
            null,
          materialCode: activePart.userData?.materialCode || null,
          materialBase: activePart.userData?.materialBase || null,
          generico: activePart.userData?.generico || null,
          genericos: activePart.userData?.genericos || null,
          line: activePart.userData?.line || null,

          // NUEVO PARA PANTALLAS
          type: activePart.userData?.type || null,
          subtype: activePart.userData?.subtype || null,
          material: activePart.userData?.material || null,
          finishCode: activePart.userData?.finishCode || null,
          finishLabel: activePart.userData?.finishLabel || null,
          hasCanto: activePart.userData?.hasCanto || false,
          hasBacker: activePart.userData?.hasBacker || false,
          privacyPanelFinishId: activePart.userData?.privacyPanelFinishId || null,

          subKey,
          subName,
          subMaterialCode,
          kind: activePart.userData?.kind || null,
          meta: activePart.userData?.meta || null,
          groupId: activePart.userData?.groupId || null,
          groupName: activePart.userData?.groupName || null,
          logicalCode: activePart.userData?.logicalCode || null,
          instanceId: activePart.userData?.instanceId || null,
        });

        emitBOM?.();
        return;
      }

      // ===== SURFACE / FLOOR =====
      if (isSurface) {
        activePart.userData.materialCode = code;
        //activePart.userData.materialDef = def;

        applyMaterialToObject3D(activePart, code, def);

        activePart.userData.finishes = null;
        activePart.userData.activeSubKey = null;
        activePart.userData.activeSubName = null;

        onSelectionChange?.({
          code: activePart.userData.codigoPT || activePart.userData.code,
          dimMm: activePart.userData?.dim || null,
          dimM: activePart.userData?.dimM || null,
          materialCode: activePart.userData?.materialCode ?? null,
          materialBase: activePart.userData?.materialBase ?? null,
          line: activePart.userData?.line ?? null,
          subKey: null,
          subName: null,
          subMaterialCode: null,
        });

        emitBOM?.();
        return;
      }

      // ===== PART / ALL =====
      if (!wantAll && activeSubMesh?.isMesh) {
        const subKey =
          activePart.userData?.activeSubKey || getMeshPathKey(activePart, activeSubMesh);

        activeSubMesh.userData.materialCode = code;
        applyMaterialToMesh(activeSubMesh, code, def);

        activePart.userData.finishes = activePart.userData.finishes || {};
        activePart.userData.finishes[subKey] = {
          materialCode: code,
          materialBase: activePart.userData?.materialBase || null,
          subName: activePart.userData?.activeSubName || activeSubMesh.name || subKey,
        };
      } else {
        activePart.userData.materialCode = code;
        //activePart.userData.materialDef = def;

        applyMaterialToObject3D(activePart, code, def);

        activePart.userData.finishes = null;
        activePart.userData.activeSubKey = null;
        activePart.userData.activeSubName = null;
      }

      const activeSubKey = activePart.userData?.activeSubKey || null;
      const finishes = activePart.userData?.finishes || {};
      const subMaterialCode = activeSubKey ? (finishes[activeSubKey]?.materialCode ?? null) : null;

      onSelectionChange?.({
        code: activePart.userData.codigoPT || activePart.userData.code,
        dimMm: activePart.userData?.dim || null,
        dimM: activePart.userData?.dimM || null,
        materialCode: activePart.userData?.materialCode ?? null,
        materialBase: activePart.userData?.materialBase ?? null,
        line: activePart.userData?.line ?? null,
        subKey: activeSubKey,
        subName: activePart.userData?.activeSubName ?? null,
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

      const data = {
        version: '1.1',
        units: 'm',
        camera: {
          position: camera.position.toArray(),
          target: controls.target.toArray(),
        },
        parts: parts.map(({ code, obj }) => {
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
        }),
      };

      return data;
    }

    // ====== Cleanup ======
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);

      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('lostpointercapture', onPointerCancel);

      window.removeEventListener('pointerup', onPointerUp);

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

      controls.dispose();
      renderer.dispose();
      if (renderer.domElement?.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      loadProjectRef.current = null;
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
    const hDefault = 2.4;
    const tDefault = 0.1;

    for (const w of walls || []) {
      const pts = w?.points || [];
      if (pts.length < 2) continue;

      const height = w.height ?? hDefault;
      const thickness = w.thickness ?? tDefault;

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.001) continue;

        const geom = new THREE.BoxGeometry(len, height, thickness);
        const mesh = new THREE.Mesh(geom, matBase.clone());

        mesh.name = `WALL_SEG_${w.id}_${i}`;
        // centro del segmento, apoyado en el piso
        mesh.position.set((a.x + b.x) / 2, height / 2, (a.z + b.z) / 2);
        mesh.rotation.y = Math.atan2(dz, dx);
        mesh.userData.kind = 'WALL';
        mesh.userData.wallId = w.id;

        group.add(mesh);
      }
    }
    refreshFloorAndGridRef.current?.();
  }, [walls]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
