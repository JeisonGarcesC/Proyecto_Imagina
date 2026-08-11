// src/App.jsx
import './App.css';
import { useEffect, useRef, useState, useMemo } from 'react';

import ThreeCanvas from './components/ThreeCanvas';
import { pasteClipboard } from './clipboard/pasteClipboard';
import CatalogPanel from './components/CatalogPanel';
import PropertiesPanel from './components/PropertiesPanel';
import SurfaceModal from './components/SurfaceModal';

import TopMenuBar from './components/TopMenuBar';

import { buildCatalogFromXml, CATALOG_COUNTRIES } from './catalog/buildCatalogFromXml';
import { loadMaterialsFromGenEsp } from './data/materialLoader';

import { floorMaterials } from './materials/floorMaterials';

import {
  generatePlanSvg,
  downloadTextFile,
  exportSvgToPng,
  printSvgAsPdf,
} from './utils/planExport';

//2d
import Plan2DOverlay from './components/Plan2DOverlay';
import BOMWindow from './components/BOMWindow';
import BOMView from './components/BOMView';
import { catalogByCodigoPT } from './catalog/catalogData';

import Plan2DUploader from './components/Plan2DUploader';
import {
  createPlanDefinition,
  legacyPlanStateToDefinition,
  planDefinitionToLegacyState,
} from './core/plans/models/planDefinition';
import { deserializePlan, serializePlan } from './core/plans/serialization/serializePlan';
import { getPlanAsset, savePlanAsset } from './core/plans/storage/planAssetStore';

import { exportProjectPPT } from './exports/exportPPT';

import { useAuth, getRolePermissions } from './auth/AuthContext.jsx';

import LeftRail from './components/LeftRail';
import LeftPanel from './components/LeftPanel';

import { loadCategoriasIntranet } from './services/categoriasIntranet.js';

//import PropertiesPopup from './components/PropertiesPopup';// Antes
import PropertiesPopup from './components/properties/PropertiesPopup';

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function pdfFileToDataUrl(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return canvas.toDataURL('image/png');
}

function normalizeCode(code) {
  return String(code ?? '').trim();
}

function _getCatalogItemByAnyKey(code) {
  const k = normalizeCode(code);

  // intento 1: string
  if (catalogByCodigoPT?.get) {
    const a = catalogByCodigoPT.get(k);
    if (a) return a;
  }

  // intento 2: number (por si el Map fue construido con keys numéricas)
  const n = Number(k);
  if (Number.isFinite(n) && catalogByCodigoPT?.get) {
    const b = catalogByCodigoPT.get(n);
    if (b) return b;
  }

  // intento 3: búsqueda manual (último recurso, pero salva la vida)
  if (catalogByCodigoPT?.values) {
    for (const it of catalogByCodigoPT.values()) {
      const itKey = normalizeCode(it?.codigoPT);
      if (itKey === k) return it;
    }
  }

  return null;
}

function _getUnitPriceCO(item) {
  const raw = item?.prices?.CO;
  if (typeof raw === 'number') return raw;
  const v = Number(raw?.value ?? raw ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function _unionAllowedCodes(genericos = [], ptCodesByGenerico) {
  const out = new Set();
  for (const gen of genericos) {
    const set = ptCodesByGenerico.get(String(gen));
    if (!set) continue;
    for (const code of set) out.add(String(code));
  }
  return Array.from(out);
}

export default function App() {
  const { user, logout } = useAuth();
  const perms = getRolePermissions(user?.role);
  const readOnly = !perms.canEdit;

  const threeApiRef = useRef(null);
  const isSelectingFromPlan2DRef = useRef(false);
  const [threeApi, setThreeApi] = useState(null);

  const [isReady, setIsReady] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);

  useEffect(() => {
    const isEditableTarget = (target) => {
      const tagName = target?.tagName?.toLowerCase?.();
      return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable === true ||
        Boolean(
          target?.closest?.(
            '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
          )
        )
      );
    };

    const onHistoryKeyDown = (event) => {
      if (!event.ctrlKey || event.altKey || isEditableTarget(event.target)) return;

      const key = event.key?.toLowerCase?.();
      const api = threeApiRef.current;

      if (key === 'c' && !event.shiftKey) {
        const copied = api?.copySelection?.();
        if (copied) event.preventDefault();
        return;
      }

      if (key === 'v' && !event.shiftKey) {
        if (!api) return;
        event.preventDefault();
        pasteClipboard({ api })
          .then((result) => api.recordCreateObjects?.(result))
          .catch((error) => {
            console.error('No se pudo pegar el contenido copiado.', error);
          });
        return;
      }

      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
      if (!isUndo && !isRedo) return;

      const canReplay = isUndo ? api?.canUndoHistory?.() : api?.canRedoHistory?.();
      if (!canReplay) return;

      event.preventDefault();
      const replay = isUndo ? api.undoHistory() : api.redoHistory();
      Promise.resolve(replay).catch((error) => {
        console.error(`No se pudo ${isUndo ? 'deshacer' : 'rehacer'} la acción.`, error);
      });
    };

    window.addEventListener('keydown', onHistoryKeyDown);
    return () => window.removeEventListener('keydown', onHistoryKeyDown);
  }, []);

  // Muros
  const [wallMode, setWallMode] = useState('NONE');
  const [wallHeight, setWallHeight] = useState(2.4);
  const [wallThickness, setWallThickness] = useState(0.1);
  const [walls, setWalls] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [moveAsGroup, setMoveAsGroup] = useState(true);
  const [surfaceOpen, setSurfaceOpen] = useState(false);

  //Tipologias
  const [leftSection, setLeftSection] = useState('catalog');
  const [categoriasRaw, setCategoriasRaw] = useState([]);
  const [categoriasAgrupadas, setCategoriasAgrupadas] = useState([]);
  const [selectedNombreCategoria, setSelectedNombreCategoria] = useState('');
  const [selectedCategoriaTipologiaId, setSelectedCategoriaTipologiaId] = useState(null);

  const [profundidadFilter, setProfundidadFilter] = useState('');
  const [longitudFilter, setLongitudFilter] = useState('');
  const [espesorFilter, setEspesorFilter] = useState('');

  //La Parte Superior o barra horizontal de opciones, archivo, etc
  const _handleSave = () => {
    const data = threeApiRef.current?.exportProject?.();
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'proyecto-imagina.json';
    a.click();
  };

  const _handleOpenFile = async (file) => {
    const text = await file.text();
    const json = JSON.parse(text);

    // IMPORTANTE: llama tu API load (la que ya tienes con pendingProject)
    threeApiRef.current?.loadProject?.(json);
    // o si tu flujo es setProjectToLoad(json), usa el tuyo.
  };

  const handleNew = () => {
    threeApiRef.current?.clearProject?.(); // si expusiste clearProject
    // o resetea el estado del proyecto como lo tengas
  };

  const _handleExit = () => {
    // en web no se puede “cerrar” la pestaña por seguridad
    // pero puedes ir a Home, limpiar, abrir modal, etc.
    handleNew();
  };

  //////////////////////////

  // Si se elimina/deselecciona en 3D, limpiamos selección 2D para evitar IDs “fantasma”
  useEffect(() => {
    if (!selectedPart) {
      const timer = setTimeout(() => setSelectedIds([]), 0);
      return () => clearTimeout(timer);
    }
  }, [selectedPart]);

  const [country, setCountry] = useState('CO');
  const [catalogItems, setCatalogItems] = useState([]);
  const [byCode, setByCode] = useState(new Map());
  const [bomItems, setBomItems] = useState([]);
  const [bomOpen, setBomOpen] = useState(false);

  const bomTotal = useMemo(() => {
    return (bomItems || []).reduce((acc, it) => {
      const qty = Number(it?.qty || 0);
      const unitPrice = Number(it?.unitPrice ?? it?.price ?? 0);
      const lineTotal = Number(it?.total ?? qty * unitPrice);
      return acc + (Number.isFinite(lineTotal) ? lineTotal : 0);
    }, 0);
  }, [bomItems]);

  const handleBOMChange = (items) => {
    //console.log('BOM rows:', items);
    setBomItems(items || []);
  };

  const [materials, setMaterials] = useState([]);
  const [materialsAcabado, setMaterialsAcabado] = useState([]);

  const materialsByCode = useMemo(() => {
    const map = new Map();
    for (const m of materials || []) {
      if (!m) continue;
      map.set(String(m.code), m);
    }
    return map;
  }, [materials]);

  //console.log('[App] materials:', materials?.length, 'materialsByCode:', materialsByCode.size);

  const getPlanData = () => {
    const parts = threeApiRef.current?.getPartsSnapshot2D?.() || [];
    return { parts, walls };
  };

  const exportPlanSvg = () => {
    const { parts, walls } = getPlanData();
    const svg = generatePlanSvg({ parts, walls, title: 'Planta 2D (Piezas + Muros)' });
    downloadTextFile('planta_2d.svg', svg, 'image/svg+xml');
  };

  const exportPlanPng = async () => {
    const { parts, walls } = getPlanData();
    const svg = generatePlanSvg({ parts, walls, title: 'Planta 2D (Piezas + Muros)' });
    await exportSvgToPng(svg, { scale: 2, filename: 'planta_2d.png' });
  };

  const exportPlanPdf = () => {
    const { parts, walls } = getPlanData();
    const svg = generatePlanSvg({ parts, walls, title: 'Planta 2D (Piezas + Muros)' });
    printSvgAsPdf(svg, { title: 'Planta 2D' });
  };

  const [plan2DVisible, setPlan2DVisible] = useState(true);
  const [plan2DSrc, setPlan2DSrc] = useState(null);
  const [plan2DKind, setPlan2DKind] = useState(null);
  const [plan2DName, setPlan2DName] = useState('');
  const [plan2DMimeType, setPlan2DMimeType] = useState('');
  const [plan2DAssetId, setPlan2DAssetId] = useState(null);
  const [plan2DId, setPlan2DId] = useState(() => createPlanDefinition().id);
  const [plan2DTransform, setPlan2DTransform] = useState({
    metersPerPixel: 0.01, // temporal, luego se calibra
    offsetX: 0,
    offsetZ: 0,
    opacity: 0.35,
  });
  const plan2DUrlRef = useRef(null);
  useEffect(
    () => () => {
      if (plan2DUrlRef.current) URL.revokeObjectURL(plan2DUrlRef.current);
    },
    []
  );
  const planDefinition = useMemo(
    () =>
      legacyPlanStateToDefinition({
        id: plan2DId,
        src: plan2DSrc,
        kind: plan2DKind,
        name: plan2DName,
        mimeType: plan2DMimeType,
        assetId: plan2DAssetId,
        visible: plan2DVisible,
        transform: plan2DTransform,
      }),
    [
      plan2DId,
      plan2DSrc,
      plan2DKind,
      plan2DName,
      plan2DMimeType,
      plan2DAssetId,
      plan2DVisible,
      plan2DTransform,
    ]
  );
  const legacyPlan2D = useMemo(
    () => planDefinitionToLegacyState(planDefinition),
    [planDefinition]
  );

  const handleLoadPlan2D = async (file, meta) => {
    if (!file) return;

    if (plan2DUrlRef.current) {
      URL.revokeObjectURL(plan2DUrlRef.current);
      plan2DUrlRef.current = null;
    }

    const type = meta?.type || 'unknown';
    const supportsDurableAsset = ['image', 'svg', 'pdf'].includes(type);
    let assetId = null;

    if (supportsDurableAsset) {
      try {
        assetId = await savePlanAsset(file, {
          fileName: meta?.name || file.name || '',
          mimeType: meta?.mime || file.type || '',
        });
      } catch (error) {
        console.error('No se pudo guardar el asset durable del plano:', error);
      }
    }

    setPlan2DId(createPlanDefinition().id);
    setPlan2DAssetId(assetId);
    setPlan2DKind(type);
    setPlan2DName(meta?.name || file.name || '');
    setPlan2DMimeType(meta?.mime || file.type || '');

    if (type === 'image' || type === 'svg') {
      const url = URL.createObjectURL(file);
      plan2DUrlRef.current = url;
      setPlan2DSrc(url);
      setPlan2DVisible(true);
      return;
    }

    if (type === 'pdf') {
      try {
        const dataUrl = await pdfFileToDataUrl(file);
        setPlan2DSrc(dataUrl);
        setPlan2DKind('image');
        setPlan2DVisible(true);
        return;
      } catch (err) {
        console.error('Error renderizando PDF:', err);
        alert('No se pudo convertir el PDF a imagen para mostrarlo en 2D.');
        setPlan2DSrc(null);
        return;
      }
    }

    if (type === 'dwg') {
      alert(
        'El DWG no se puede renderizar directo en este visor. Convierte el archivo a DXF o SVG para visualizarlo en 2D.'
      );
      setPlan2DSrc(null);
      setPlan2DVisible(true);
      return;
    }

    if (type === 'dxf') {
      alert(
        'El DXF ya fue detectado, pero todavía falta integrar su renderer/parser. Por ahora usa SVG, imagen o PDF.'
      );
      setPlan2DSrc(null);
      setPlan2DVisible(true);
      return;
    }

    setPlan2DSrc(null);
  };

  const buildProjectData = () => {
    const project = threeApiRef.current?.exportProject?.();
    if (!project) return null;

    return {
      ...project,
      plan2D: plan2DSrc ? serializePlan(planDefinition) : null,
    };
  };

  const restorePlan2DFromProject = async (project) => {
    const restoredPlan = deserializePlan(project?.plan2D);

    if (!restoredPlan) {
      if (plan2DUrlRef.current) URL.revokeObjectURL(plan2DUrlRef.current);
      plan2DUrlRef.current = null;
      setPlan2DId(createPlanDefinition().id);
      setPlan2DSrc(null);
      setPlan2DKind(null);
      setPlan2DName('');
      setPlan2DMimeType('');
      setPlan2DAssetId(null);
      setPlan2DVisible(true);
      setPlan2DTransform({
        metersPerPixel: 0.01,
        offsetX: 0,
        offsetZ: 0,
        opacity: 0.35,
        rotation: 0,
        scale: 1,
      });
      return;
    }

    const legacy = planDefinitionToLegacyState(restoredPlan);
    let restoredSrc = null;

    if (restoredPlan.assetId) {
      try {
        const asset = await getPlanAsset(restoredPlan.assetId);
        if (!asset?.blob || !(asset.blob instanceof Blob)) {
          throw new Error(`Asset no encontrado: ${restoredPlan.assetId}`);
        }

        restoredSrc =
          restoredPlan.sourceType === 'PDF'
            ? await pdfFileToDataUrl(asset.blob)
            : URL.createObjectURL(asset.blob);
      } catch (error) {
        console.warn('planDefinition asset unavailable', {
          assetId: restoredPlan.assetId,
          error,
        });
      }
    }

    if (!restoredSrc) restoredSrc = legacy.src;

    if (typeof restoredSrc === 'string' && restoredSrc.startsWith('blob:')) {
      try {
        const response = await fetch(restoredSrc);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.warn('planDefinition source unavailable', {
          source: restoredSrc,
          error,
        });
        restoredSrc = null;
      }
    }

    if (plan2DUrlRef.current && plan2DUrlRef.current !== restoredSrc) {
      URL.revokeObjectURL(plan2DUrlRef.current);
      plan2DUrlRef.current = null;
    }

    if (typeof restoredSrc === 'string' && restoredSrc.startsWith('blob:')) {
      plan2DUrlRef.current = restoredSrc;
    }

    setPlan2DId(restoredPlan.id);
    setPlan2DSrc(restoredSrc);
    setPlan2DKind(legacy.kind);
    setPlan2DName(legacy.name);
    setPlan2DMimeType(restoredPlan.mimeType);
    setPlan2DAssetId(restoredPlan.assetId);
    setPlan2DVisible(legacy.visible);
    setPlan2DTransform(legacy.transform);
  };

  const loadProjectData = async (project) => {
    await restorePlan2DFromProject(project);
    return threeApiRef.current?.loadProject?.(project);
  };

  /* =====================================================
     FILTRO DE MATERIALES POR CÓDIGO GENÉRICO (✔ correcto)
     ===================================================== */
  const allowedFinishCodes = useMemo(() => {
    const pt = String(selectedPart?.code ?? '').trim();
    if (!pt) return null;

    const item = byCode?.get?.(pt) || null;

    const genericos = [
      ...(Array.isArray(item?.raw?.genericos) ? item.raw.genericos : []),
      ...(Array.isArray(item?.genericos) ? item.genericos : []),
      item?.raw?.generico ?? null,
      item?.generico ?? null,

      // ✅ fallback para objetos que no viven en byCode, como el piso
      ...(Array.isArray(selectedPart?.genericos) ? selectedPart.genericos : []),
      selectedPart?.generico ?? null,
    ]
      .map((g) => String(g ?? '').trim())
      .filter(Boolean);

    const genericosUnicos = [...new Set(genericos)];

    if (!genericosUnicos.length) return null;

    const allowed = new Set();
    for (const m of materialsAcabado || []) {
      const g = String(m.groupCode || '').trim();
      if (g && genericosUnicos.includes(g)) {
        allowed.add(String(m.code));
      }
    }
    /*
    console.log('[allowedFinishCodes]', {
      pt,
      genericosUnicos,
      totalMaterials: materialsAcabado?.length || 0,
      matchesCount: allowed.size,
      matchesSample: (materialsAcabado || [])
        .filter((m) => genericosUnicos.includes(String(m.groupCode || '').trim()))
        .slice(0, 10)
        .map((m) => ({
          code: m.code,
          groupCode: m.groupCode,
          name: m.name,
        })),
    });
*/
    return Array.from(allowed);
  }, [selectedPart, byCode, materialsAcabado]);

  /* ==========================
     Cargar materiales (gen-esp)
     ========================== */

  useEffect(() => {
    (async () => {
      try {
        const mats = await loadMaterialsFromGenEsp('/data/xml/gen-esp_3.xml');

        const merged = [...mats, ...floorMaterials];

        setMaterials(merged);
        setMaterialsAcabado(merged);
      } catch (e) {
        console.error('Error cargando materiales:', e);
      }
    })();
  }, []);

  /* ==========================
     Cargar Tipologias por categorias (categorias_intranet)
     ========================== */

  useEffect(() => {
    async function load() {
      const data = await loadCategoriasIntranet();
      setCategoriasRaw(data);

      const map = {};

      data.forEach((c) => {
        const nombre = String(c.nombre || '').trim();
        if (!nombre) return;

        if (!map[nombre]) {
          map[nombre] = [];
        }

        map[nombre].push({
          id: c.id,
          padre_id: c.padre_id,
          slug: c.slug,
          nombre: c.nombre,
        });
      });

      const arr = Object.entries(map).map(([nombre, items]) => ({
        nombre,
        items,
      }));

      setCategoriasAgrupadas(arr);
    }

    load();
  }, []);

  const categoriasPorNombre = useMemo(() => {
    if (!selectedNombreCategoria) return [];
    return categoriasRaw.filter((c) => c.nombre === selectedNombreCategoria);
  }, [categoriasRaw, selectedNombreCategoria]);

  const categoriaIdsSeleccionados = useMemo(() => {
    if (selectedCategoriaTipologiaId) {
      return [Number(selectedCategoriaTipologiaId)];
    }

    if (selectedNombreCategoria) {
      return categoriasPorNombre.map((c) => Number(c.id));
    }

    return null;
  }, [selectedCategoriaTipologiaId, selectedNombreCategoria, categoriasPorNombre]);

  /* ==========================
     Cargar catálogo (ptsinbom)
     ========================== */
  useEffect(() => {
    (async () => {
      const { items, byCode } = await buildCatalogFromXml();
      setCatalogItems(items);
      setByCode(byCode);
    })().catch(console.error);
  }, []);

  const [floatingEditor, setFloatingEditor] = useState({
    open: false,
    x: 0,
    y: 0,
    part: null,
  });
  const [transformTool, setTransformTool] = useState('move');

  useEffect(() => {
    if (!isReady) return;
    threeApiRef.current?.setSelectedIds3D?.(selectedIds);
  }, [isReady, selectedIds]);

  const handleMoveAsGroupChange = (nextValue) => {
    const nextMoveAsGroup = Boolean(nextValue);
    if (nextMoveAsGroup === moveAsGroup) return;

    if (nextMoveAsGroup) {
      const snapshot = threeApiRef.current?.getPartsSnapshot2D?.() || [];
      const partsById = new Map(snapshot.filter((part) => part?.id).map((part) => [part.id, part]));
      const idsByGroup = new Map();

      snapshot.forEach((part) => {
        const groupId = String(part?.groupId || '').trim();
        if (!part?.id || !groupId) return;
        const memberIds = idsByGroup.get(groupId) || [];
        memberIds.push(part.id);
        idsByGroup.set(groupId, memberIds);
      });

      setSelectedIds((currentIds) => {
        const expandedIds = new Set();
        currentIds.forEach((id) => {
          const part = partsById.get(id);
          const groupId = String(part?.groupId || '').trim();
          const targetIds = groupId ? idsByGroup.get(groupId) || [id] : [id];
          targetIds.forEach((targetId) => expandedIds.add(targetId));
        });
        return Array.from(expandedIds);
      });
    }

    setMoveAsGroup(nextMoveAsGroup);
    threeApiRef.current?.setMoveAsGroup?.(nextMoveAsGroup);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* TOP BAR */}
      <TopMenuBar
        user={user}
        perms={perms}
        country={country}
        setCountry={setCountry}
        catalogCountries={CATALOG_COUNTRIES}
        materialsByCode={materialsByCode}
        threeApiRef={threeApiRef}
        transformTool={transformTool}
        onTransformToolChange={setTransformTool}
        moveAsGroup={moveAsGroup}
        onMoveAsGroupChange={handleMoveAsGroupChange}
        onLogout={logout}
        onNewProject={() => threeApiRef.current?.clearProject?.()}
        getProjectData={buildProjectData}
        onLoadProject={loadProjectData}
        debugSaveAlert={false}
        onOpenBom={() => setBomOpen(true)}
        onCloseBom={() => setBomOpen(false)}
        bomOpen={bomOpen}
        bomTotal={bomTotal}
        onExportSvg={exportPlanSvg}
        onExportPng={exportPlanPng}
        onExportPdf={exportPlanPdf}
        onExportGlb={() => threeApiRef.current?.exportGLTF?.()}
        onExportDxf={() => threeApiRef.current?.exportDXF?.()}
      />

      {/* APP GRID */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '20% 70% 10%',
          minHeight: 0,
        }}
      >
        {/* LEFT (Rail + Panel estilo CET) */}
        <div
          style={{
            display: 'flex',
            minHeight: 0,
            borderRight: '1px solid #e5e5e5',
            minWidth: 0,
            overflow: 'hidden',
            background: '#fafafa',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <LeftRail active={leftSection} onChange={setLeftSection} />
          {/* CONTENEDOR VERTICAL */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
            {/* SELECT ARRIBA */}
            {leftSection === 'typologies' && (
              <div
                style={{
                  padding: 12,
                  borderBottom: '1px solid #e8e8e8',
                  background: '#f4f4f4',
                }}
              >
                {/* Select 1: Nombre */}
                <select
                  value={selectedNombreCategoria}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedNombreCategoria(value);
                    setSelectedCategoriaTipologiaId(null);
                    setProfundidadFilter('');
                    setLongitudFilter('');
                    setEspesorFilter('');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    marginBottom: 8,
                    background: '#fff',
                    color: '#333',
                    fontSize: 13,
                  }}
                >
                  <option value="">Todas las líneas</option>

                  {categoriasAgrupadas.map((c) => (
                    <option key={c.nombre} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>

                {/* Select 2: Id dentro del nombre seleccionado */}
                <select
                  value={selectedCategoriaTipologiaId || ''}
                  onChange={(e) => {
                    setSelectedCategoriaTipologiaId(e.target.value ? Number(e.target.value) : null);

                    setProfundidadFilter('');
                    setLongitudFilter('');
                    setEspesorFilter('');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    background: '#fff',
                    color: '#333',
                    fontSize: 13,
                  }}
                  disabled={!selectedNombreCategoria}
                >
                  <option value="">
                    {selectedNombreCategoria
                      ? 'Todas las variantes de esta línea'
                      : 'Primero selecciona una línea'}
                  </option>

                  {categoriasPorNombre.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.slug}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PANEL */}
            <LeftPanel
              section={leftSection}
              threeApiRef={threeApiRef}
              readOnly={readOnly}
              catalogItems={catalogItems}
              country={country}
              categoriaTipologiaId={categoriaIdsSeleccionados}
              profundidadFilter={profundidadFilter}
              setProfundidadFilter={setProfundidadFilter}
              longitudFilter={longitudFilter}
              setLongitudFilter={setLongitudFilter}
              espesorFilter={espesorFilter}
              setEspesorFilter={setEspesorFilter}
              selectedPart={selectedPart}
              onAddCatalogItem={(codigoPT) =>
                !readOnly && threeApiRef.current?.addCatalogItem?.(codigoPT)
              }
              onAddTypology={(codigoPT) =>
                !readOnly && threeApiRef.current?.addTypology?.(codigoPT)
              }
              onAddChair={(codigoSilla) =>
                !readOnly && threeApiRef.current?.addChair?.(codigoSilla)
              }
              onAddAres={(codigoAres) => !readOnly && threeApiRef.current?.addAres?.(codigoAres)}
              onAddPlant={(plantName) => !readOnly && threeApiRef.current?.addPlant?.(plantName)}
              onAddOfficeAccessory={(accessoryName) =>
                !readOnly && threeApiRef.current?.addOfficeAccessory?.(accessoryName)
              }
              onAddMepalSalud={(codigo) =>
                !readOnly && threeApiRef.current?.addMepalSalud?.(codigo)
              }
              onAddMepalTekSocial={(codigo) =>
                !readOnly && threeApiRef.current?.addMepalTekSocial?.(codigo)
              }
              onAddClak={(codigo) =>
                !readOnly && threeApiRef.current?.addClak?.(codigo)
              }
              onAddEduk={(codigo) =>
                !readOnly && threeApiRef.current?.addEduk?.(codigo)
              }
              onToggleSnap={() => !readOnly && threeApiRef.current?.toggleSnap?.()}
              onApplyGlobalMaterial={(code, scope = 'ALL') => {
                if (readOnly) return;
                const def = code ? materialsByCode?.get?.(String(code)) || null : null;
                threeApiRef.current?.applyFinishToActivePart?.(code, def, scope);
              }}
              materials={materials}
              materialsByCode={materialsByCode}
              setSurfaceOpen={setSurfaceOpen}
              Plan2DUploader={Plan2DUploader}
              handleLoadPlan2D={handleLoadPlan2D}
              plan2DVisible={plan2DVisible}
              setPlan2DVisible={setPlan2DVisible}
              wallMode={wallMode}
              setWallMode={setWallMode}
              wallHeight={wallHeight}
              setWallHeight={setWallHeight}
              wallThickness={wallThickness}
              setWallThickness={setWallThickness}
              onUndoLastWall={() => setWalls((prev) => prev.slice(0, -1))}
              onClearWalls={() => setWalls([])}
            />
          </div>

          {!isReady && (
            <div style={{ padding: 12, fontSize: 12, opacity: 0.7 }}>Cargando visor...</div>
          )}
        </div>

        {/* CENTER */}
        <div style={{ minHeight: 0, position: 'relative', zIndex: 1, minWidth: 0, overflow: 'hidden' }}>
          {/* Export buttons */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              display: 'flex',
              gap: 8,
            }}
          >
            {/*perms.canExport && (
              <>
                <button onClick={() => threeApiRef.current?.exportGLTF?.()}>Exportar GLB</button>
                <button onClick={() => threeApiRef.current?.exportDXF?.()}>
                  Exportar DXF (planta)
                </button>
              </>
            )*/}
          </div>

          <ThreeCanvas
            walls={walls}
            readOnly={readOnly}
            materialsByCode={materialsByCode}
            catalogByCode={byCode}
            country={country}
            onApiReady={(api) => {
              threeApiRef.current = api;
              api.setMoveAsGroup?.(moveAsGroup);
              setThreeApi(api);
              setIsReady(true);
            }}
            onSelectionChange={(part) => {
              setSelectedPart(part);
              if (isSelectingFromPlan2DRef.current) return;
              if (!part?.instanceId) {
                setSelectedIds([]);
                return;
              }
              if (part.selectionPreserve) return;

              const snapshot = threeApiRef.current?.getPartsSnapshot2D?.() || [];
              const groupId = String(part.groupId || '').trim();
              const resolvedTargetIds = Array.isArray(part.selectionTargetIds)
                ? part.selectionTargetIds.filter(Boolean)
                : [];
              const targetIds = resolvedTargetIds.length
                ? resolvedTargetIds
                : moveAsGroup && groupId
                  ? snapshot
                      .filter(
                        (candidate) => String(candidate?.groupId || '').trim() === groupId
                      )
                      .map((candidate) => candidate.id)
                      .filter(Boolean)
                  : [part.instanceId];
              const normalizedTargetIds = Array.from(new Set(targetIds));

              if (!part.selectionToggle) {
                setSelectedIds(normalizedTargetIds);
                return;
              }

              setSelectedIds((currentIds) => {
                const nextIds = new Set(currentIds);
                const targetIsSelected = normalizedTargetIds.every((id) => nextIds.has(id));
                normalizedTargetIds.forEach((id) => {
                  if (targetIsSelected) nextIds.delete(id);
                  else nextIds.add(id);
                });
                return Array.from(nextIds);
              });
            }}
            onBOMChange={handleBOMChange}
            onFloatingEditorRequest={setFloatingEditor}
            transformTool={transformTool}
          />
          <PropertiesPopup
            open={floatingEditor.open}
            x={floatingEditor.x}
            y={floatingEditor.y}
            part={floatingEditor.part}
            api={threeApi}
            onClose={() =>
              setFloatingEditor((prev) => ({
                ...prev,
                open: false,
              }))
            }
          />

          <Plan2DOverlay
            historyApi={threeApi}
            getSnapshot={() => threeApiRef.current?.getPartsSnapshot2D?.() || []}
            selectedIds={selectedIds}
            moveAsGroup={moveAsGroup}
            onPickIds={(ids) => setSelectedIds(Array.from(new Set(ids || [])))}
            resolveSelectionTargetIds={(ids, options) =>
              threeApiRef.current?.resolveSelectionTargetIds?.(ids, options) || ids
            }
            onPickId={(id) => {
              isSelectingFromPlan2DRef.current = true;
              try {
                threeApiRef.current?.selectPartById?.(id);
              } finally {
                isSelectingFromPlan2DRef.current = false;
              }
            }}
            onMovePart2D={(id, x, z) => {
              if (readOnly) return;
              threeApiRef.current?.movePartToXZ?.(id, x, z);
            }}
            onMoveParts2D={(updates) => {
              if (readOnly || !updates?.length) return false;

              const api = threeApiRef.current;
              if (!api?.movePartToXZ) return false;

              const previousMoveAsGroup = api.getMoveAsGroup?.();
              if (previousMoveAsGroup === true) api.setMoveAsGroup?.(false);

              try {
                return updates.every(({ id, x, z }) => api.movePartToXZ(id, x, z) !== false);
              } finally {
                if (previousMoveAsGroup === true) api.setMoveAsGroup?.(true);
              }
            }}
            onBeginMove2D={(ids, individualTargets) =>
              threeApiRef.current?.beginMove2D?.({ ids, individualTargets })
            }
            onEndMove2D={() => threeApiRef.current?.endMove2D?.()}
            onCancelMove2D={() => threeApiRef.current?.cancelMove2D?.()}
            isPartMovementLocked2D={(id) =>
              readOnly || threeApiRef.current?.isPartMovementLocked?.(id) === true
            }
            transformTool={transformTool}
            onBeginRotation2D={(id) => threeApiRef.current?.beginRotation?.({ sourceId: id })}
            onUpdateRotation2D={(deltaAngle, snapAngle = 0) =>
              threeApiRef.current?.updateRotation?.({ deltaAngle, snapAngle })
            }
            onEndRotation2D={() => threeApiRef.current?.endRotation?.()}
            onCancelRotation2D={() => threeApiRef.current?.cancelRotation?.()}
            getRotationState2D={(id) =>
              threeApiRef.current?.getRotationState?.({ sourceId: id }) || null
            }
            walls={walls}
            wallMode={wallMode}
            wallHeight={wallHeight}
            wallThickness={wallThickness}
            onAddWall={(wall) => setWalls((prev) => [...prev, wall])}
            onSetWalls={setWalls}
            height={240}
            invertZ={false}
            plan2DSrc={legacyPlan2D.src}
            plan2DVisible={legacyPlan2D.visible}
            plan2DTransform={legacyPlan2D.transform}
            onPlan2DTransformChange={setPlan2DTransform}
          />

          <BOMWindow open={bomOpen} title="BOM - Proyecto" onClose={() => setBomOpen(false)}>
            <BOMView items={bomItems} defaultCountry="CO" catalogCountries={CATALOG_COUNTRIES} />
          </BOMWindow>

          {/* Help + PPT */}
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              zIndex: 10,
              display: 'grid',
              gap: 10,
              maxWidth: 360,
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(6px)',
                fontSize: 12,
                opacity: 0.95,
                lineHeight: 1.4,
              }}
            >
              <b>Controles</b>
              <br />• Mover pieza activa: <b>WASD</b> o <b>Flechas</b>
              <br />• Subir/Bajar: <b>Q</b> / <b>E</b>
              <br />• Snap: <b>Espacio</b>
              <br />• Eliminar pieza: <b>Supr</b> (Delete)
              {readOnly && (
                <div style={{ marginTop: 6, opacity: 0.8 }}>
                  <b>Modo comercial:</b> navegación y exportación, sin edición.
                </div>
              )}
            </div>

            {perms.canExport && (
              <button
                onClick={() => {
                  const planCanvas = document.querySelector('#plan2d-canvas');
                  const planPng = planCanvas?.toDataURL?.('image/png');
                  const threeCanvas = document.querySelector('canvas');
                  const threePng = threeCanvas?.toDataURL?.('image/png') || null;

                  exportProjectPPT({
                    projectName: 'Proyecto IMAGINA',
                    planPngDataUrl: planPng,
                    threePngDataUrl: threePng,
                    bomItems: bomItems,
                  });
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: '1px solid #111827',
                  background: '#111827',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 900,
                }}
              >
                Exportar PowerPoint
              </button>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative', zIndex: 2 }}>
          {/*
          <PropertiesPanel
            part={selectedPart}
            partAcabado={materialsForPanel}
            bomItems={bomItems}
            country={country}
            byCode={byCode}
            api={threeApi}
            materials={filteredMaterials}
            materialsAcabado={filteredMaterialsAcabado}
            materialsByCode={materialsByCode}
            readOnly={readOnly}
          />*/}
          <PropertiesPanel
            part={selectedPart}
            partAcabado={selectedPart}
            allowedFinishCodes={allowedFinishCodes ? Array.from(allowedFinishCodes) : null}
            bomItems={bomItems}
            country={country}
            byCode={byCode}
            api={threeApi}
            materials={materialsAcabado}
            materialsAcabado={materialsAcabado}
            materialsByCode={materialsByCode}
            readOnly={readOnly}
          />
        </div>

        {/* MODAL (fuera del grid interno pero dentro del return) */}
        <SurfaceModal
          open={surfaceOpen}
          onClose={() => setSurfaceOpen(false)}
          lines={['LINK.SYS', 'KONCISA.PLUS']}
          defaultLine="LINK.SYS"
          onCreate={({ line, widthMm, depthMm, thickMm, codigoPT }) => {
            setSurfaceOpen(false);
            threeApiRef.current?.addSurface?.({
              line,
              codigoPT,
              widthM: widthMm / 1000,
              depthM: depthMm / 1000,
              thicknessM: thickMm / 1000,
              dim: { widthMm, depthMm, thickMm },
            });
          }}
        />
      </div>
    </div>
  );
}
