import { resolveVetroProductCode } from '../resolvers/vetroProductCodeResolver.js';

export function getVetroSystemBOM(system) {
  const rows = new Map();
  for (const component of system?.userData?.components || []) {
    if (component.included === true || !component.code) continue;
    const key = JSON.stringify([String(component.code), component.special || null, component.description || null]);
    const row = rows.get(key) || { code: String(component.code), quantity: 0, kind: component.kind, reference: component.reference, description: component.description || null, special: component.special || null };
    row.quantity += 1;
    rows.set(key, row);
  }
  return [...rows.values()];
}

const horizontalKinds = new Set(['TOP_KIT', 'PLINTH_KIT', 'FLOOR_ARRIVAL_PROFILE']);
const segmentId = (systemId, arm) => `${systemId}:${arm}`;

function terminalArm(system, terminalId) {
  if (terminalId === 'START') return 'MAIN';
  if (system.userData.shape === 'L' && terminalId === 'END') return 'RETURN';
  if (system.userData.shape === 'T' && terminalId === 'BRANCH_END') return 'RETURN';
  if (terminalId === 'END') return 'MAIN';
  return null;
}

function horizontalCode(kind, stockCm) {
  const resolved = resolveVetroProductCode({ productType: 'PROFILE', variant: kind, nominalLengthCm: stockCm, finish: 'ANODIZED' });
  if (!resolved.supported) throw new Error('VETRO_HORIZONTAL_KIT_NOT_DOCUMENTED');
  return resolved.entry;
}

export function getVetroContinuousRuns(systems = [], additionalRelation = null) {
  const roots = systems.filter((system) => system?.userData?.kind === 'VETRO_SYSTEM');
  const segments = new Map();
  for (const system of roots) {
    const data = system.userData;
    segments.set(segmentId(data.systemId, 'MAIN'), { system, arm: 'MAIN', lengthMm: Number(data.layoutWidthMm ?? data.nominalWidthMm) });
    if (data.shape === 'L' || data.shape === 'T')
      segments.set(segmentId(data.systemId, 'RETURN'), { system, arm: 'RETURN', lengthMm: Number(data.returnNominalWidthMm) });
  }
  const parents = new Map([...segments.keys()].map((key) => [key, key]));
  const systemParents = new Map(roots.map((system) => [system.userData.systemId, system.userData.systemId]));
  const find = (key) => {
    let root = key;
    while (parents.get(root) !== root) root = parents.get(root);
    while (parents.get(key) !== root) { const next = parents.get(key); parents.set(key, root); key = next; }
    return root;
  };
  const union = (a, b) => { if (parents.has(a) && parents.has(b)) parents.set(find(b), find(a)); };
  const findSystem = (id) => { while (systemParents.get(id) !== id) id = systemParents.get(id); return id; };
  const bySystemId = new Map(roots.map((system) => [system.userData.systemId, system]));
  for (const relation of [...roots.flatMap((system) => system.userData.externalConnections || []), ...(additionalRelation ? [additionalRelation] : [])]) {
    if (relation.type !== 'JOIN_180') continue;
    const source = bySystemId.get(relation.sourceSystemId);
    const target = bySystemId.get(relation.targetSystemId);
    if (!source || !target) continue;
    const sourceArm = terminalArm(source, relation.sourceTerminalId);
    const targetArm = terminalArm(target, relation.targetTerminalId);
    if (sourceArm && targetArm) {
      union(segmentId(source.userData.systemId, sourceArm), segmentId(target.userData.systemId, targetArm));
      systemParents.set(findSystem(target.userData.systemId), findSystem(source.userData.systemId));
    }
  }
  const runs = new Map();
  for (const [key, segment] of segments) {
    const runKey = find(key);
    if (!runs.has(runKey)) runs.set(runKey, []);
    runs.get(runKey).push(segment);
  }
  return runs;
}

export function getVetroConnectedCommercialBOM(systems = []) {
  const roots = systems.filter((system) => system?.userData?.kind === 'VETRO_SYSTEM');
  const runs = getVetroContinuousRuns(roots);
  const systemParents = new Map(roots.map((system) => [system.userData.systemId, system.userData.systemId]));
  const findSystem = (id) => { while (systemParents.get(id) !== id) id = systemParents.get(id); return id; };
  const bySystemId = new Map(roots.map((system) => [system.userData.systemId, system]));
  for (const relation of roots.flatMap((system) => system.userData.externalConnections || [])) {
    if (relation.type !== 'JOIN_180' || !bySystemId.has(relation.sourceSystemId) || !bySystemId.has(relation.targetSystemId)) continue;
    systemParents.set(findSystem(relation.targetSystemId), findSystem(relation.sourceSystemId));
  }
  const membersByRoot = new Map();
  for (const system of roots) {
    const rootId = findSystem(system.userData.systemId);
    if (!membersByRoot.has(rootId)) membersByRoot.set(rootId, []);
    membersByRoot.get(rootId).push(system.userData.systemId);
  }
  const systemGroups = new Map();
  for (const members of membersByRoot.values()) for (const id of members) systemGroups.set(id, [...members].sort()[0]);
  const rows = [];
  for (const system of roots) for (const row of getVetroSystemBOM(system)) {
    if (horizontalKinds.has(row.kind)) continue;
    rows.push({ ...row, groupId: systemGroups.get(system.userData.systemId), sourceSystemId: system.userData.systemId });
  }
  for (const run of runs.values()) {
    const totalLengthMm = run.reduce((sum, segment) => sum + segment.lengthMm, 0);
    if (!(totalLengthMm > 0)) continue;
    if (totalLengthMm > 6000) {
      for (const segment of run) for (const kind of ['TOP_KIT', 'PLINTH_KIT']) {
        const entry = horizontalCode(kind, segment.lengthMm <= 3000 ? 300 : 600);
        rows.push({ code: entry.code, quantity: 1, kind, reference: entry.reference, groupId: systemGroups.get(segment.system.userData.systemId), sourceSystemId: segment.system.userData.systemId, status: 'RUN_OVER_6000_MM_NOT_DOCUMENTED' });
      }
      continue;
    }
    const stockCm = totalLengthMm <= 3000 ? 300 : 600;
    const groupId = systemGroups.get(run[0].system.userData.systemId);
    for (const kind of horizontalKinds) {
      if (kind === 'FLOOR_ARRIVAL_PROFILE') {
        const entry = resolveVetroProductCode({ productType: 'PROFILE', variant: kind, nominalLengthCm: 300, finish: null });
        if (!entry.supported) throw new Error('VETRO_FLOOR_ARRIVAL_PROFILE_NOT_DOCUMENTED');
        rows.push({ code: entry.entry.code, quantity: Math.ceil(totalLengthMm / 3000), kind, reference: entry.entry.reference, groupId, sourceSystemId: groupId, description: null, special: null });
        continue;
      }
      const entry = horizontalCode(kind, stockCm);
      rows.push({ code: entry.code, quantity: 1, kind, reference: entry.reference, groupId, sourceSystemId: groupId, description: null, special: null });
    }
  }
  return rows;
}
