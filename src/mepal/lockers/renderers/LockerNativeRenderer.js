import * as THREE from 'three';
import {
  LOCKER_NATIVE_APPROXIMATIONS as A,
  LOCKER_TECHNICAL_DIMENSIONS as T,
  LOCKER_APPROXIMATION_FLAG,
  mmToWorld,
} from './native/lockerNativeConstants.js';
import { createLockerMaterial, lockerDoorMaterialRole } from './native/lockerMaterials.js';
import { calculateLockerLayout, calculateHandlePosition } from '../layout/lockerLayout.js';
import {
  resolveLockerFinishColor,
  resolveLockerFinishCode,
} from '../catalog/lockerFinishCatalog.js';

function group(name) {
  const result = new THREE.Group();
  result.name = name;
  result.userData = {
    componentRole: name,
    visualSource: 'NATIVE',
    excludeFromBOM: true,
    approximationFlags: [LOCKER_APPROXIMATION_FLAG],
  };
  return result;
}
function box(parent, name, size, center, role = 'PAINTED_METAL', color, materialCode = null) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size.map(mmToWorld)),
    createLockerMaterial(role, color)
  );
  mesh.name = name;
  mesh.position.set(...center.map(mmToWorld));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    componentRole: name,
    materialRole: role,
    materialCode: materialCode || null,
    visualSource: 'NATIVE',
    excludeFromBOM: true,
    approximationFlags: [LOCKER_APPROXIMATION_FLAG],
  };
  parent.add(mesh);
  return mesh;
}
export function createLockerBodyGeometry(c, columns) {
  const root = group('BODY');
  const { widthMm: w, heightMm: h, depthMm: d } = c;
  const bodyFinishId = c.bodyFinishId || c.bodyFinish;
  const bodyColor = resolveLockerFinishColor(bodyFinishId, c.material);
  const bodyCode = c.bodyFinishCode || resolveLockerFinishCode(bodyFinishId, c.material);
  root.userData.materialCode = bodyCode;
  const t = A.sheetThicknessMm;
  box(
    root,
    'LEFT_SIDE',
    [t, h, d],
    [-w / 2 + t / 2, h / 2, 0],
    'PAINTED_METAL',
    bodyColor,
    bodyCode
  );
  box(
    root,
    'RIGHT_SIDE',
    [t, h, d],
    [w / 2 - t / 2, h / 2, 0],
    'PAINTED_METAL',
    bodyColor,
    bodyCode
  );
  box(root, 'TOP', [w - 2 * t, t, d], [0, h - t / 2, 0], 'PAINTED_METAL', bodyColor, bodyCode);
  box(root, 'BOTTOM', [w - 2 * t, t, d], [0, t / 2, 0], 'PAINTED_METAL', bodyColor, bodyCode);
  box(
    root,
    'BACK',
    [w - 2 * t, h - 2 * t, t],
    [0, h / 2, -d / 2 + t / 2],
    'PAINTED_METAL',
    bodyColor,
    bodyCode
  );
  for (let i = 1; i < columns; i++)
    box(
      root,
      `DIVIDER_${i}`,
      [t, h - 2 * t, d - t],
      [-w / 2 + (w * i) / columns, h / 2, t / 2],
      'PAINTED_METAL',
      bodyColor,
      bodyCode
    );
  // Folded front returns retain constant width as the body grows.
  for (let i = 0; i <= columns; i++)
    box(
      root,
      `FRONT_RETURN_${i}`,
      [A.railWidthMm, h, t],
      [-w / 2 + A.railWidthMm / 2 + ((w - A.railWidthMm) * i) / columns, h / 2, d / 2 - t / 2],
      'PAINTED_METAL',
      bodyColor,
      bodyCode
    );
  for (const [name, y] of [
    ['TOP_RETURN', h - A.railWidthMm / 2],
    ['BOTTOM_RETURN', A.railWidthMm / 2],
  ])
    box(
      root,
      name,
      [w, A.railWidthMm, t],
      [0, y, d / 2 - t / 2],
      'PAINTED_METAL',
      bodyColor,
      bodyCode
    );
  return root;
}
export function createLockerDoorGeometry(c, layout, color, materialCode = null) {
  const root = group('DOOR');
  root.userData.materialCode = materialCode || null;
  const wood = ['FORMICA', 'MELAMINA'].includes(c.material);
  box(
    root,
    'DOOR_PANEL',
    [layout.doorWidth, layout.doorHeight, wood ? T.woodDoorThicknessMm : A.metalDoorThicknessMm],
    [0, layout.doorHeight / 2, 0],
    lockerDoorMaterialRole(c.material),
    color,
    materialCode
  );
  return root;
}
export function createLockerShelfGeometry(width, depth, color, materialCode = null) {
  const root = group('SHELF');
  root.userData.materialCode = materialCode || null;
  box(
    root,
    'SHELF_PANEL',
    [width, A.sheetThicknessMm, depth],
    [0, 0, 0],
    'PAINTED_METAL',
    color,
    materialCode
  );
  box(
    root,
    'SHELF_FRONT_LIP',
    [width, A.shelfLipMm, A.sheetThicknessMm],
    [0, -A.shelfLipMm / 2, depth / 2],
    'PAINTED_METAL',
    color,
    materialCode
  );
  return root;
}
export function createLockerPlinthGeometry(c) {
  const root = group('PLINTH');
  const bodyFinishId = c.bodyFinishId || c.bodyFinish;
  const plinthColor = resolveLockerFinishColor(bodyFinishId, c.material);
  const plinthCode = c.bodyFinishCode || resolveLockerFinishCode(bodyFinishId, c.material);
  root.userData.materialCode = plinthCode;
  const t = A.sheetThicknessMm,
    w = c.widthMm,
    d = c.depthMm,
    h = T.plinthHeightMm;
  for (const z of [-d / 2 + t / 2, d / 2 - t / 2])
    box(root, 'PLINTH_FACE', [w, h, t], [0, h / 2, z], 'PAINTED_METAL', plinthColor, plinthCode);
  for (const x of [-w / 2 + t / 2, w / 2 - t / 2])
    box(root, 'PLINTH_SIDE', [t, h, d], [x, h / 2, 0], 'PAINTED_METAL', plinthColor, plinthCode);
  return root;
}
export function createLockerHandleGeometry(type) {
  const root = group('HANDLE');
  root.userData.handleType = type;
  if (type === 'SIN_MANIJA') return root;
  if (type === 'BOTON') {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(
        mmToWorld(T.buttonDiameterMm / 2),
        mmToWorld(T.buttonDiameterMm / 2),
        mmToWorld(T.buttonLengthMm),
        20
      ),
      createLockerMaterial('ANODIZED')
    );
    m.rotation.x = Math.PI / 2;
    m.userData = { ...root.userData, materialRole: 'ANODIZED' };
    root.add(m);
  } else if (type === 'SCHWINN') {
    box(
      root,
      'HANDLE_BAR',
      [A.handleBarMm, T.schwinnLengthMm, A.handleBarMm],
      [0, 0, 0],
      'ANODIZED'
    );
    for (const y of [-T.schwinnLengthMm / 2, T.schwinnLengthMm / 2])
      box(
        root,
        'HANDLE_MOUNT',
        [A.handleBarMm, A.handleBarMm, A.handleMountDepthMm],
        [0, y, -A.handleMountDepthMm / 2],
        'ANODIZED'
      );
  } else {
    const size = type === 'INCRUSTAR' ? A.insetHandleMm : A.embeddedHandleMm;
    box(
      root,
      'HANDLE_FRAME',
      size,
      [0, 0, 0],
      type === 'INCRUSTAR' ? 'BRUSHED_NICKEL' : 'PAINTED_METAL'
    );
    box(
      root,
      'HANDLE_RECESS',
      [size[0] * A.recessWidthRatio, size[1] * A.recessHeightRatio, A.recessThicknessMm],
      [0, 0, (size[2] + A.recessThicknessMm) / 2],
      'BLACK'
    );
  }
  return root;
}
export function createLockerLockGeometry(type) {
  const root = group('LOCK');
  root.userData.securityType = type;
  if (type === 'NO_APLICA') return root;
  box(root, 'LOCK_HOUSING', A.lockSizeMm, [0, 0, 0], type === 'TIMBERLINE' ? 'BLACK' : 'CHROME');
  if (type === 'CLAVE_4_DIGITOS')
    for (let i = 0; i < 4; i++)
      box(
        root,
        `DIAL_${i + 1}`,
        A.dialSizeMm,
        [A.dialFirstXMm + i * A.dialSpacingMm, 0, A.lockFaceMm],
        'BLACK'
      );
  else
    box(
      root,
      type === 'PORTACANDADO' ? 'PADLOCK_OPENING' : 'KEY_SLOT',
      A.keySlotSizeMm,
      [0, 0, A.lockFaceMm],
      'BLACK'
    );
  return root;
}
export function createLockerHingeGeometry(height, width) {
  const root = group('HINGES');
  for (const y of [A.hingeMarginMm, height - A.hingeMarginMm])
    box(root, 'HINGE', A.hingeSizeMm, [width / 2, y, 0], 'CHROME');
  return root;
}
export function createLockerPunchingGeometry({ punchingType, punchingPosition }, height) {
  const root = group('PUNCHING');
  Object.assign(root.userData, { punchingType, punchingPosition });
  if (['LISO', 'NO_APLICA'].includes(punchingType)) return root;
  const levels =
    punchingPosition === 'ARRIBA_Y_ABAJO'
      ? [A.punchingMarginMm, height - A.punchingMarginMm]
      : [punchingPosition === 'ARRIBA' ? height - A.punchingMarginMm : A.punchingMarginMm];
  const count = { TIPO_1: 3, TIPO_2: 5, TIPO_3: 3, TIPO_4: 5 }[punchingType];
  for (const y of levels)
    for (let i = 0; i < count; i++) {
      const split = ['TIPO_3', 'TIPO_4'].includes(punchingType);
      for (const x of split ? A.punchingSplitCentersMm : [0])
        box(
          root,
          'VISUAL_SLOT',
          [
            split ? A.punchingSplitWidthMm : A.punchingWidthMm,
            A.punchingSlotMm,
            A.punchingMarkDepthMm,
          ],
          [x, y + (i - (count - 1) / 2) * A.punchingSpacingMm, 0],
          'BLACK'
        );
    }
  root.userData.representation = 'SIMPLIFIED_SURFACE_MARKS';
  return root;
}
export function createLockerViewerGeometry() {
  const root = group('VIEWER');
  box(root, 'ACRYLIC_VIEWER', A.viewerSizeMm, [0, 0, 0], 'ACRYLIC');
  return root;
}
export function createLockerAnchorGeometry() {
  const root = group('ANCHOR');
  box(root, 'ANCHOR_PLATE', A.anchorSizeMm, [0, 0, 0], 'HARDWARE');
  return root;
}
export function renderLockerProduct(product) {
  const c = product.config,
    root = group('LOCKER_PRODUCT'),
    layout = calculateLockerLayout(c, product.columns);
  const base = c.plinth ? T.plinthHeightMm : 0;
  const body = createLockerBodyGeometry(c, product.columns);
  body.position.y = mmToWorld(base);
  root.add(body);
  root.userData.materialCode = body.userData.materialCode || null;
  const shelves = group('SHELVES');
  root.add(shelves);
  for (let col = 0; col < product.columns; col++)
    for (let row = 0; row < c.bayCount; row++) {
      const index = col * c.bayCount + row,
        bay = group(`BAY_${index + 1}`);
      const bottom = base + layout.bottom + row * layout.pitch;
      const x = -c.widthMm / 2 + layout.columnWidth * (col + 0.5);
      const front = c.depthMm / 2 - (c.material === 'METALICA_EMBEBIDA' ? A.insetRailWidthMm : 0);
      bay.position.set(mmToWorld(x), mmToWorld(bottom), mmToWorld(front));
      const doorColor = resolveBayColor(c, index);
      const doorFinishCode = c.bayFinishCodes?.[index] || c.bodyFinishCode || null;
      Object.assign(bay.userData, {
        componentRole: 'LOCKER_BAY',
        bayIndex: index,
        columnIndex: col,
        rowIndex: row,
        material: c.material,
        materialRole: lockerDoorMaterialRole(c.material),
        materialCode: doorFinishCode,
        handleType: c.handleType,
        securityType: c.securityType,
        punchingType: c.punchingType,
        punchingPosition: c.punchingPosition,
        finishId: c.bayFinishIds?.[index] || c.bodyFinishId || c.material,
        finishCode: doorFinishCode || 'LOCKER_DEFAULT',
        codigoPT: product.codeResolution.bay.code,
      });
      bay.add(createLockerDoorGeometry(c, layout, doorColor, doorFinishCode));
      const hp = calculateHandlePosition({
        bayIndex: 0,
        bayCount: c.bayCount,
        lockerHeight: c.heightMm,
        lockerWidth: layout.columnWidth,
        handleType: c.handleType,
        material: c.material,
      });
      if (hp) {
        const handle = createLockerHandleGeometry(c.handleType);
        handle.position.set(mmToWorld(hp.x), mmToWorld(hp.y - layout.bottom), mmToWorld(hp.z));
        bay.add(handle);
      }
      const lock = createLockerLockGeometry(
        c.material === 'METALICA_EMBEBIDA' ? 'PORTACANDADO' : c.securityType
      );
      lock.userData.securityType = c.securityType;
      lock.userData.includedInKit = c.material === 'METALICA_EMBEBIDA';
      lock.position.set(
        mmToWorld(-layout.columnWidth / 2 + A.lockOffsetMm),
        mmToWorld(layout.doorHeight / 2 + A.lockHeightOffsetMm),
        mmToWorld(A.lockFrontMm)
      );
      bay.add(lock);
      bay.add(createLockerHingeGeometry(layout.doorHeight, layout.doorWidth));
      const punching = createLockerPunchingGeometry(c, layout.doorHeight);
      punching.position.z = mmToWorld(A.metalDoorThicknessMm / 2 + A.punchingMarkDepthMm);
      bay.add(punching);
      if (c.viewer) {
        const viewer = createLockerViewerGeometry();
        viewer.position.set(
          0,
          mmToWorld(layout.doorHeight - A.viewerMarginMm),
          mmToWorld(A.viewerFrontMm)
        );
        bay.add(viewer);
      }
      root.add(bay);
      if (row > 0) {
        const shelf = createLockerShelfGeometry(
          layout.columnWidth - 2 * A.sheetThicknessMm,
          c.depthMm - 2 * A.sheetThicknessMm,
          resolveLockerFinishColor(c.bodyFinishId || c.bodyFinish, c.material),
          c.bodyFinishCode || resolveLockerFinishCode(c.bodyFinishId || c.bodyFinish, c.material)
        );
        shelf.position.set(mmToWorld(x), mmToWorld(bottom - layout.gap), 0);
        shelf.userData.includedInKit = true;
        shelves.add(shelf);
      }
      if (c.extraShelves) {
        const shelf = createLockerShelfGeometry(
          layout.columnWidth - 2 * A.sheetThicknessMm,
          c.depthMm - 2 * A.sheetThicknessMm,
          resolveLockerFinishColor(c.bodyFinishId || c.bodyFinish, c.material),
          c.bodyFinishCode || resolveLockerFinishCode(c.bodyFinishId || c.bodyFinish, c.material)
        );
        shelf.position.set(mmToWorld(x), mmToWorld(bottom + layout.doorHeight / 2), 0);
        shelf.userData.includedInKit = false;
        shelves.add(shelf);
      }
    }
  if (c.plinth) root.add(createLockerPlinthGeometry(c));
  if (c.anchor) {
    const anchor = createLockerAnchorGeometry();
    anchor.position.set(0, mmToWorld(base + c.heightMm), mmToWorld(-c.depthMm / 2));
    root.add(anchor);
  }
  return root;
}

function resolveBayColor(c, index) {
  const finishId = c.bayFinishIds?.[index] || c.bodyFinishId || c.material;
  return (
    resolveLockerFinishColor(finishId, c.material) ||
    c.bayFinishes?.[index] ||
    c.bodyFinish ||
    '#9ca3af'
  );
}

export function disposeLockerGeometry(root) {
  root.traverse((node) => {
    node.geometry?.dispose();
    for (const m of Array.isArray(node.material) ? node.material : [node.material]) m?.dispose();
  });
}
