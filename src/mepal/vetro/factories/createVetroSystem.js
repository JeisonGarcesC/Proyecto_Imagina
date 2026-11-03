import * as THREE from 'three';
import { createVetroInstance } from './createVetroInstance.js';
import { applyVetroTransform } from '../layout/vetroLayout.js';
import { planVetroLine } from '../composition/vetroLinePlanner.js';
import { createFootprint2D } from '../../../plan2d/footprint2D.js';
import { resolveVetroPanelSize } from '../rules/vetroPanelSize.js';

// Display-only insertion: the panel plan defines H - 69.5 mm, but not the split between ends.
// The top kit's 60 mm section comes from VTAC210000; its installed Y position remains provisional.
export const VETRO_LINE_PROVISIONAL_LAYOUT_MM = Object.freeze({ panelBottom: 35, topProfileHeight: 60, plinthBottom: 0 });

function productConfig(kind, widthMm, heightMm, stockCm) {
  if (kind === 'PANEL') return { category: 'PANELS', productType: 'PANEL', material: 'TEMPERED_GLASS_10MM', nominalWidthCm: widthMm / 10, nominalHeightCm: heightMm / 10 };
  if (kind === 'JUNCTION') return { category: 'JUNCTION_KITS', productType: 'JUNCTION_KIT', variant: 'JOIN_180' };
  if (kind === 'FLOOR_ARRIVAL_PROFILE') return { category: 'PROFILES', subcategory: 'HORIZONTAL', productType: 'PROFILE', variant: kind, nominalLengthCm: 300, finish: null };
  return { category: 'PROFILES', subcategory: 'HORIZONTAL', productType: 'PROFILE', variant: kind, nominalLengthCm: stockCm, finish: 'ANODIZED' };
}

export async function createVetroSystem({ requestedWidthMm, heightMm, panelWidthsMm, shape = 'LINE', returnWidthMm = null, returnPanelWidthsMm = null, specialPanel = null, systemId, transform, externalConnections = [] } = {}) {
  const specialSize = specialPanel ? resolveVetroPanelSize({
    material: 'TEMPERED_GLASS_10MM', nominalWidthCm: specialPanel.nominalWidthCm,
    nominalHeightCm: specialPanel.nominalHeightCm,
    specialWidthMm: specialPanel.realWidthMm ?? null,
    specialHeightMm: specialPanel.projectHeightMm ?? null,
  }) : null;
  if (specialPanel && (!specialSize?.valid || heightMm > 2800 || shape !== 'LINE' ||
    Math.abs(specialSize.projectHeightMm - Number(heightMm)) > 0.001))
    return { success: false, reason: 'VETRO_SPECIAL_SYSTEM_UNSUPPORTED' };
  const plan = specialPanel
    ? { success: true, compositions: [{ nominalWidthMm: specialSize.nominalWidthCm * 10, panelWidthsMm: [specialSize.nominalWidthCm * 10] }] }
    : planVetroLine({ requestedWidthMm, heightMm });
  if (!plan.success) return plan;
  const chosen = plan.compositions.find((item) => JSON.stringify(item.panelWidthsMm) === JSON.stringify(panelWidthsMm));
  if (!chosen) return { success: false, reason: 'VETRO_LINE_COMPOSITION_INVALID' };
  if (!['LINE', 'L', 'T'].includes(shape)) return { success: false, reason: 'VETRO_SYSTEM_SHAPE_NOT_SUPPORTED' };
  const hasBranch = shape === 'L' || shape === 'T';
  const returnPlan = hasBranch ? planVetroLine({ requestedWidthMm: returnWidthMm, heightMm }) : null;
  const returnChosen = returnPlan?.compositions.find((item) => JSON.stringify(item.panelWidthsMm) === JSON.stringify(returnPanelWidthsMm));
  if (hasBranch && !returnChosen) return { success: false, reason: 'VETRO_RETURN_COMPOSITION_INVALID' };
  const id = systemId || `vetro-system-${crypto.randomUUID()}`;
  const root = new THREE.Group();
  root.name = 'VETRO_SYSTEM';
  const components = [];
  const add = async (kind, config, xMm, yMm, scale = [1, 1, 1], zMm = 0, rotationY = 0) => {
    const result = await createVetroInstance({ config });
    if (!result.success) throw new Error(result.diagnostics?.[0]?.code || 'VETRO_COMPONENT_INVALID');
    const object = result.object;
    object.position.set(xMm / 1000, yMm / 1000, zMm / 1000);
    object.rotation.y = rotationY;
    object.scale.set(...scale);
    object.userData.isPartRoot = false;
    object.userData.systemId = id;
    object.userData.parentAssemblyId = id;
    object.userData.groupId = id;
    object.userData.vetroSystemComponent = true;
    root.add(object);
    components.push({ kind, code: object.userData.code, reference: object.userData.product?.commercial?.reference, config, instanceId: object.userData.instanceId, position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(), dimensions: object.userData.product?.dimensions, description: object.userData.description, special: object.userData.product?.special || null, included: false });
    return object;
  };
  try {
    const glassHeightMm = heightMm - 69.5;
    const nominalWidthMm = chosen.nominalWidthMm;
    const layoutWidthMm = specialPanel ? specialSize.realWidthMm : nominalWidthMm;
    async function addSegment(widths, lengthMm, centerX, centerZ, rotationY, special = null, junctionAtMm = null) {
      const stockCm = lengthMm <= 3000 ? 300 : 600;
      const localToWorld = (localX) => ({ x: centerX + localX * Math.cos(rotationY), z: centerZ - localX * Math.sin(rotationY) });
      let cursor = -lengthMm / 2;
      for (let i = 0; i < widths.length; i++) {
        const width = widths[i];
        const center = localToWorld(cursor + width / 2);
        const config = special ? {
          ...productConfig('PANEL', specialSize.nominalWidthCm * 10, specialSize.nominalHeightCm * 10),
          specialWidthMm: special.realWidthMm ?? null,
          specialHeightMm: special.projectHeightMm ?? null,
        } : productConfig('PANEL', width, heightMm);
        await add('PANEL', config, center.x, VETRO_LINE_PROVISIONAL_LAYOUT_MM.panelBottom, [1, special ? 1 : glassHeightMm / heightMm, 1], center.z, rotationY);
        cursor += width;
        if (i < widths.length - 1 && (junctionAtMm == null || Math.abs(cursor - junctionAtMm) > 0.001)) {
          const joint = localToWorld(cursor);
          await add('JOIN_180', productConfig('JUNCTION'), joint.x, VETRO_LINE_PROVISIONAL_LAYOUT_MM.panelBottom, [1, glassHeightMm / 3000, 1], joint.z, rotationY);
        }
      }
      const lengthScale = lengthMm / (stockCm * 10);
      await add('TOP_KIT', productConfig('TOP_KIT', null, null, stockCm), centerX, heightMm - VETRO_LINE_PROVISIONAL_LAYOUT_MM.topProfileHeight, [lengthScale, 1, 1], centerZ, rotationY);
      await add('PLINTH_KIT', productConfig('PLINTH_KIT', null, null, stockCm), centerX, 0, [lengthScale, 1, 1], centerZ, rotationY);
      const floorStockCount = Math.ceil(lengthMm / 3000);
      for (let stockIndex = 0; stockIndex < floorStockCount; stockIndex++) {
        const start = stockIndex * 3000;
        const cutLength = Math.min(3000, lengthMm - start);
        const position = localToWorld(start + cutLength / 2 - lengthMm / 2);
        await add('FLOOR_ARRIVAL_PROFILE', productConfig('FLOOR_ARRIVAL_PROFILE'), position.x, 0, [cutLength / 3000, 1, 1], position.z, rotationY);
      }
    }
    await addSegment(specialPanel ? [layoutWidthMm] : panelWidthsMm, layoutWidthMm, 0, 0, 0, specialPanel, shape === 'T' ? 0 : null);
    if (hasBranch) {
      const returnLengthMm = returnChosen.nominalWidthMm;
      const branchX = shape === 'T' ? 0 : nominalWidthMm / 2;
      await addSegment(returnPanelWidthsMm, returnLengthMm, branchX, returnLengthMm / 2, -Math.PI / 2);
      await add(shape === 'T' ? 'JOIN_T' : 'JOIN_90', { category: 'JUNCTION_KITS', productType: 'JUNCTION_KIT', variant: shape === 'T' ? 'JOIN_T' : 'JOIN_90' }, branchX, VETRO_LINE_PROVISIONAL_LAYOUT_MM.panelBottom, [1, glassHeightMm / 3000, 1]);
    }
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    applyVetroTransform(root, transform || {});
    root.userData = {
      kind: 'VETRO_SYSTEM', family: 'VETRO', line: 'VETRO', type: 'vetro-system',
      systemId: id, instanceId: id, groupId: id, groupName: 'Sistema Vetro', isPartRoot: true,
      excludeFromBOM: true, shape, requestedWidthMm, heightMm,
      nominalWidthMm: chosen.nominalWidthMm, panelWidthsMm: [...panelWidthsMm],
      layoutWidthMm, specialPanel: specialPanel ? { ...specialPanel } : null,
      returnWidthMm: hasBranch ? returnWidthMm : null,
      returnNominalWidthMm: hasBranch ? returnChosen.nominalWidthMm : null,
      returnPanelWidthsMm: hasBranch ? [...returnPanelWidthsMm] : null,
      components, connections: [
        ...panelWidthsMm.slice(1).map((_, index) => ({ type: 'JOIN_180', between: [index, index + 1], segment: 'MAIN', atMm: panelWidthsMm.slice(0, index + 1).reduce((sum, value) => sum + value, 0) - nominalWidthMm / 2 })).filter((connection) => shape !== 'T' || Math.abs(connection.atMm) > 0.001),
        ...(hasBranch ? [
          { type: shape === 'T' ? 'JOIN_T' : 'JOIN_90', betweenSegments: ['MAIN', 'RETURN'] },
          ...returnPanelWidthsMm.slice(1).map((_, index) => ({ type: 'JOIN_180', between: [index, index + 1], segment: 'RETURN' })),
        ] : []),
      ],
      externalConnections: structuredClone(externalConnections),
      tramos: [{ id: `${id}-line`, shape: 'LINE', panelInstanceIds: components.filter((item) => item.kind === 'PANEL').slice(0, panelWidthsMm.length).map((item) => item.instanceId) }, ...(hasBranch ? [{ id: `${id}-return`, shape: 'LINE', panelInstanceIds: components.filter((item) => item.kind === 'PANEL').slice(panelWidthsMm.length).map((item) => item.instanceId) }] : [])],
      ends: [{ side: 'START', status: 'NO_DETERMINADO' }, { side: 'END', status: 'NO_DETERMINADO' }],
      pendingComponents: [{ kind: 'WALL_ARRIVAL', status: 'NO_DETERMINADO', reason: 'WALL_CONTACT_NOT_SPECIFIED' }],
      measurement: { widthMm: size.x * 1000, heightMm: size.y * 1000, status: 'PROVISIONAL_GEOMETRY' },
      bomStatus: 'PROVISIONAL_PROFILE_QUANTITIES',
      provisionalRules: ['PANEL_VERTICAL_INSERTION', 'PROFILE_CUT_LENGTH', 'END_TREATMENT', 'JOIN_HORIZONTAL_CLEARANCE'],
    };
    const halfDepth = 0.03;
    const halfMain = layoutWidthMm / 2000;
    root.userData.footprint2D = createFootprint2D({
      type: hasBranch ? 'POLYGON' : 'RECTANGLE',
      points: shape === 'L'
        ? [
          { x: -halfMain, z: -halfDepth }, { x: halfMain + halfDepth, z: -halfDepth },
          { x: halfMain + halfDepth, z: returnChosen.nominalWidthMm / 1000 },
          { x: halfMain - halfDepth, z: returnChosen.nominalWidthMm / 1000 },
          { x: halfMain - halfDepth, z: halfDepth }, { x: -halfMain, z: halfDepth },
        ]
        : shape === 'T' ? [
          { x: -halfMain, z: -halfDepth }, { x: halfMain, z: -halfDepth },
          { x: halfMain, z: halfDepth }, { x: halfDepth, z: halfDepth },
          { x: halfDepth, z: returnChosen.nominalWidthMm / 1000 },
          { x: -halfDepth, z: returnChosen.nominalWidthMm / 1000 },
          { x: -halfDepth, z: halfDepth }, { x: -halfMain, z: halfDepth },
        ] : [
          { x: -halfMain, z: -halfDepth }, { x: halfMain, z: -halfDepth },
          { x: halfMain, z: halfDepth }, { x: -halfMain, z: halfDepth },
        ],
    });
    return { success: true, object: root, composition: chosen };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}
