import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { loadDxfPlan } from '../core/plans/loaders/dxfPlanLoader.js';
import { registerImportedGltfNodes } from './importedModelGroupInspector.js';
import {
  analyzeImportedModelBounds,
  MAX_IMPORTED_MODEL_DIMENSION,
  resolveImportedModelBoundsDecision,
} from './importedModelBounds.js';

export const MAX_IMPORTED_MODEL_SIZE = 50 * 1024 * 1024;

export class ImportedModelImportCancelled extends Error {
  constructor() {
    super('Importación cancelada.');
    this.name = 'ImportedModelImportCancelled';
  }
}

export function validateImportedModelSize(size, maxSize = MAX_IMPORTED_MODEL_SIZE) {
  if (!Number.isFinite(size) || size < 0) throw new TypeError('Tamaño de archivo inválido.');
  if (size <= maxSize) return true;
  const sizeMiB = (size / (1024 * 1024)).toFixed(1);
  const limitMiB = maxSize / (1024 * 1024);
  throw new Error(`El archivo (${sizeMiB} MiB) supera el límite permitido de ${limitMiB} MiB.`);
}

export function detectImportedModelFormat(fileName = '') {
  const extension = String(fileName).split('.').pop()?.trim().toLowerCase();
  return ['glb', 'gltf', 'stl', 'obj', 'dxf', 'dwg'].includes(extension) ? extension : null;
}

export function resolveImportedModelUnitScale(unit = 'mm', format = '') {
  if (format === 'glb' || format === 'gltf') return 1;
  return { mm: 0.001, cm: 0.01, m: 1 }[unit] || 0.001;
}

export async function fileToDataUrl(file) {
  if (!(file instanceof Blob)) throw new TypeError('Se esperaba un archivo.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToArrayBuffer(dataUrl) {
  const encoded = String(dataUrl).split(',')[1] || '';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function dataUrlToText(dataUrl) {
  const [header, payload = ''] = String(dataUrl).split(',', 2);
  return header.includes(';base64')
    ? new TextDecoder().decode(dataUrlToArrayBuffer(dataUrl))
    : decodeURIComponent(payload);
}

function parseGltf(dataUrl, format) {
  const source = format === 'glb' ? dataUrlToArrayBuffer(dataUrl) : dataUrlToText(dataUrl);
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(source, '', (gltf) => {
      if (import.meta.env?.VITE_GROUP_INSPECTOR === '1') registerImportedGltfNodes(gltf);
      resolve(gltf.scene);
    }, reject);
  });
}

function appendArcPoints(target, arc, scale, segments = 40) {
  const sweep = Number(arc?.sweepAngle ?? Math.PI * 2);
  const count = Math.max(8, Math.ceil(Math.abs(sweep) / (Math.PI * 2) * segments));
  for (let index = 0; index <= count; index += 1) {
    const angle = Number(arc.startAngle || 0) + sweep * (index / count);
    target.push(
      new THREE.Vector3(
        (Number(arc.center?.x) + Number(arc.radius) * Math.cos(angle)) * scale,
        0.002,
        (Number(arc.center?.y) + Number(arc.radius) * Math.sin(angle)) * scale
      )
    );
  }
}

function buildDxfObject(normalized, scale) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0x202020 });

  for (const entity of normalized?.vector?.entities || []) {
    const paths = [];
    if (entity.type === 'LINE') paths.push([entity.geometry.start, entity.geometry.end]);
    if (entity.type === 'POLYLINE') {
      for (const segment of entity.geometry?.segments || []) paths.push(segment);
    }
    if (entity.type === 'ARC') paths.push({ kind: 'ARC', ...entity.geometry });
    if (entity.type === 'CIRCLE') {
      paths.push({ kind: 'ARC', ...entity.geometry, startAngle: 0, sweepAngle: Math.PI * 2 });
    }

    for (const path of paths) {
      const points = [];
      if (Array.isArray(path)) {
        points.push(
          ...path.map(
            (point) => new THREE.Vector3(Number(point.x) * scale, 0.002, Number(point.y) * scale)
          )
        );
      } else if (path?.kind === 'LINE') {
        points.push(
          new THREE.Vector3(Number(path.start.x) * scale, 0.002, Number(path.start.y) * scale),
          new THREE.Vector3(Number(path.end.x) * scale, 0.002, Number(path.end.y) * scale)
        );
      } else if (path?.kind === 'ARC') {
        appendArcPoints(points, path, scale);
      }
      if (points.length > 1) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }
  }
  return group;
}

export async function createImportedModelObject({
  dataUrl, sourceUrl, format, unit = 'mm', fileName = '', assetRef = null,
  confirmAmbiguous, restoring = false,
}) {
  const normalizedFormat = String(format || '').toLowerCase();
  const scale = resolveImportedModelUnitScale(unit, normalizedFormat);
  let object;

  if (normalizedFormat === 'glb' || normalizedFormat === 'gltf') {
    object = sourceUrl && normalizedFormat === 'glb'
      ? await new GLTFLoader().loadAsync(sourceUrl).then((gltf) => {
        if (import.meta.env?.VITE_GROUP_INSPECTOR === '1') registerImportedGltfNodes(gltf);
        return gltf.scene;
      })
      : await parseGltf(dataUrl, normalizedFormat);
  } else if (normalizedFormat === 'stl') {
    const geometry = new STLLoader().parse(dataUrlToArrayBuffer(dataUrl));
    geometry.computeVertexNormals();
    object = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0xb7b7b7, roughness: 0.7, metalness: 0.05 })
    );
    object.scale.setScalar(scale);
  } else if (normalizedFormat === 'obj') {
    object = new OBJLoader().parse(dataUrlToText(dataUrl));
    object.scale.setScalar(scale);
  } else if (normalizedFormat === 'dxf') {
    const blob = new Blob([dataUrlToText(dataUrl)], { type: 'application/dxf' });
    Object.defineProperty(blob, 'name', { value: fileName || 'modelo.dxf' });
    object = buildDxfObject(
      await loadDxfPlan(blob, { maxFileSize: MAX_IMPORTED_MODEL_SIZE }),
      scale
    );
  } else {
    throw new Error(`Formato no soportado: ${normalizedFormat || 'desconocido'}.`);
  }

  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) throw new Error('El archivo no contiene geometría compatible.');
  const size = bounds.getSize(new THREE.Vector3());
  if (normalizedFormat === 'glb' || normalizedFormat === 'gltf') {
    if (![size.x, size.y, size.z].every(Number.isFinite) || Math.max(size.x, size.y, size.z) > MAX_IMPORTED_MODEL_DIMENSION) {
      const analysis = analyzeImportedModelBounds(object);
      console.info('[IMPORTED_MODEL_BOUNDS]', {
        format: normalizedFormat, unit, calculatedScale: scale, assetRef,
        preparedModel: Boolean(sourceUrl?.endsWith('/model.gltf')),
        totalBounds: analysis.total, validatedBounds: analysis.principal,
        estimatedPrincipalBounds: analysis.estimatedPrincipal,
        renderableCount: analysis.renderableCount,
        contextCount: analysis.context.length, ambiguousCount: analysis.ambiguous.length,
        context: analysis.context, ambiguous: analysis.ambiguous, decision: analysis.decision,
      });
      const decision = await resolveImportedModelBoundsDecision(analysis, {
        confirm: confirmAmbiguous, restoring,
      });
      if (decision !== analysis.decision) {
        console.info('[IMPORTED_MODEL_BOUNDS]', { assetRef, decision });
      }
      if (decision === 'cancelled') throw new ImportedModelImportCancelled();
      if (decision === 'requires_confirmation') {
        throw new Error('El modelo supera el límite de 1000 m y contiene superficies extensas cuya función no pudo determinarse con seguridad.');
      }
      if (!['accept', 'confirmed', 'restored'].includes(decision)) {
        throw new Error('La escala del objeto no es válida. El modelo supera el límite máximo de 1000 m.');
      }
    }
  } else if (![size.x, size.y, size.z].every(Number.isFinite) || Math.max(size.x, size.y, size.z) > MAX_IMPORTED_MODEL_DIMENSION) {
    console.warn('[IMPORTED_MODEL_BOUNDS]', {
      format: normalizedFormat,
      unit,
      min: bounds.min.toArray(),
      max: bounds.max.toArray(),
      width: size.x,
      height: size.y,
      depth: size.z,
      calculatedScale: scale,
      invalidNumber: ![size.x, size.y, size.z, ...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite),
      assetRef,
      preparedModel: Boolean(sourceUrl?.endsWith('/model.gltf')),
    });
    throw new Error('La escala del objeto no es válida. Revisa la unidad seleccionada.');
  }
  const center = bounds.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.y -= bounds.min.y;
  object.position.z -= center.z;
  object.updateMatrixWorld(true);
  return object;
}
