import { useEffect, useMemo, useState } from 'react';

const LABELS = ['No determinado', 'Candidato a puesto', 'Puesto confirmado', 'No es puesto', 'Contexto', 'Suelo', 'Plano', 'Pared', 'Otro'];
const fmt = (values) => values?.map((value) => Number(value).toFixed(3)).join(' × ') || '—';
const line = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 };
const button = { fontSize: 11, padding: '4px 7px', cursor: 'pointer' };

export default function ImportedModelGroupInspector({ api }) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState('');
  const [inspector, setInspector] = useState(null);
  const [nodeId, setNodeId] = useState(null);
  const [compareId, setCompareId] = useState('');
  const [query, setQuery] = useState('');
  const [labels, setLabels] = useState({});
  const [performanceData, setPerformanceData] = useState(null);
  const [fps, setFps] = useState(null);
  const [highlightMs, setHighlightMs] = useState(null);
  const [candidateMap, setCandidateMap] = useState(false);
  const [familyMap, setFamilyMap] = useState(false);
  const [familyQuery, setFamilyQuery] = useState('');
  const [familyHash, setFamilyHash] = useState('');
  const [heapAtOpen, setHeapAtOpen] = useState(null);
  const [selectionState, setSelectionState] = useState(null);
  const groups = useMemo(() => inspector?.groups || [], [inspector]);
  const filtered = useMemo(() => groups.filter((group) => {
    const text = `${group.id} ${group.name} ${group.meshes} ${group.childCount} ${group.bounds?.size?.join(' ')}`.toLowerCase();
    return text.includes(query.toLowerCase().trim());
  }), [groups, query]);
  const current = inspector?.get(nodeId);
  const compared = inspector?.get(compareId);
  const selectedFamily = inspector?.families.find((family) => family.structureHash === familyHash)
    || inspector?.familyOf(nodeId) || null;
  const filteredFamilies = inspector?.families.filter((family) =>
    `${family.structureHash} ${family.memberIds.join(' ')} ${family.variants.map((variant) => variant.signature).join(' ')}`
      .toLowerCase().includes(familyQuery.toLowerCase().trim())) || [];
  const rootIndex = filtered.findIndex((group) => group.id === nodeId);

  useEffect(() => {
    if (!open || !api) return undefined;
    const timer = setInterval(() => {
      const items = api.listImportedModelsForInspector?.() || [];
      setModels(items);
      setPerformanceData(api.getImportedModelInspectorPerformance?.() || null);
      if (modelId) setSelectionState(api.getImportedModelGroupSelectionState?.(modelId, nodeId) || null);
    }, 1000);
    return () => clearInterval(timer);
  }, [open, api, modelId, nodeId]);
  useEffect(() => {
    if (!open) return undefined;
    let frame, count = 0, start = performance.now();
    const tick = (now) => {
      count += 1;
      if (now - start >= 1000) { setFps(Math.round(count * 1000 / (now - start))); count = 0; start = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => () => {
    api?.clearGroupInspectorHighlight?.();
    api?.clearGroupInspectorCandidateMap?.();
  }, [api]);

  function openInspector() {
    const items = api?.listImportedModelsForInspector?.() || [];
    setModels(items);
    setOpen(true);
    setHeapAtOpen(api?.getImportedModelInspectorPerformance?.()?.jsHeapBytes ?? null);
    if (items.length) selectModel(items.at(-1).id);
  }
  function selectModel(id) {
    api?.clearGroupInspectorHighlight?.();
    api?.clearGroupInspectorCandidateMap?.();
    setCandidateMap(false);
    setFamilyMap(false);
    setFamilyHash('');
    const next = api?.getImportedModelInspector?.(id) || null;
    setModelId(id);
    setInspector(next);
    setNodeId(next?.groups?.[0]?.id ?? null);
    setCompareId('');
    setLabels({});
    if (selectionState?.enabled && modelId && modelId !== id) api?.setImportedModelGroupSelectionTest?.(modelId, false);
    setSelectionState(next?.groups?.[0] ? api?.getImportedModelGroupSelectionState?.(id, next.groups[0].id) : null);
    if (next?.groups?.[0]) api?.highlightImportedModelGroup?.(id, next.groups[0].id);
  }
  function selectNode(id) {
    const elapsed = api?.highlightImportedModelGroup?.(modelId, id);
    if (typeof elapsed === 'number') setHighlightMs(elapsed);
    setNodeId(Number(id));
    setSelectionState(api?.getImportedModelGroupSelectionState?.(modelId, id) || null);
    const nextFamily = inspector?.familyOf(id);
    if (nextFamily) {
      setFamilyHash(nextFamily.structureHash);
      if (familyMap) api?.showGroupInspectorCandidateMap?.(modelId, true, nextFamily.memberIds);
    }
  }
  function markUnit(status, wholeFamily = false) {
    api?.markImportedModelGroup?.(modelId, nodeId, status, wholeFamily);
    setSelectionState(api?.getImportedModelGroupSelectionState?.(modelId, nodeId) || null);
  }
  function toggleSelectionTest() {
    const enabled = !selectionState?.enabled;
    api?.setImportedModelGroupSelectionTest?.(modelId, enabled);
    setSelectionState(api?.getImportedModelGroupSelectionState?.(modelId, nodeId) || null);
  }
  function close() { api?.clearGroupInspectorHighlight?.(); api?.clearGroupInspectorCandidateMap?.(); setCandidateMap(false); setFamilyMap(false); setOpen(false); }
  const panel = { position: 'absolute', top: 10, right: 10, zIndex: 40, width: 390,
    maxHeight: 'calc(100% - 20px)', overflow: 'auto', background: '#fffffff2', color: '#17202a',
    border: '1px solid #8997a5', borderRadius: 6, boxShadow: '0 4px 18px #0003',
    padding: 10, fontSize: 11, lineHeight: 1.35 };
  if (!open) return <button type="button" style={{ ...panel, width: 'auto', cursor: 'pointer' }} onClick={openInspector}>Inspector de grupos{selectionState?.enabled ? ' · Selección de prueba activa' : ''}</button>;
  return <aside style={panel} aria-label="Inspector de grupos GLTF">
    <div style={{ ...line, justifyContent: 'space-between' }}><strong>Inspector de grupos · diagnóstico</strong><button type="button" style={button} onClick={close}>Cerrar</button></div>
    <div style={line}><label>Modelo <select value={modelId} onChange={(event) => selectModel(event.target.value)}><option value="">Selecciona</option>{models.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    {!models.length && <p>Importa un GLB/GLTF en Electron y abre nuevamente este panel.</p>}
    {modelId && !inspector && <p>No hay índices GLTF disponibles. Abre el modelo con la bandera de diagnóstico activa.</p>}
    {inspector && <>
      <div style={line}><strong>{groups.length} grupos raíz</strong><span>· {inspector.totals.objects} Object3D · {inspector.totals.meshes} Mesh</span></div>
      <div style={line}><label><input type="checkbox" checked={candidateMap} onChange={(event) => { setCandidateMap(event.target.checked); setFamilyMap(false); api?.showGroupInspectorCandidateMap?.(modelId, event.target.checked); }} /> Mapa visual de candidatos altos (máx. 80 cajas)</label></div>
      <details style={{ border: '1px solid #ddd', padding: 5, marginBottom: 8 }}>
        <summary>Familias de grupos ({inspector.families.length})</summary>
        <input aria-label="Buscar firma de familia" placeholder="Firma, grupo o hash" value={familyQuery} onChange={(event) => setFamilyQuery(event.target.value)} style={{ width: '96%', margin: '5px 0' }} />
        <div style={{ maxHeight: 100, overflow: 'auto' }}>{filteredFamilies.slice(0, 60).map((family) => <button type="button" key={family.structureHash} onClick={() => { setFamilyHash(family.structureHash); if (familyMap) api?.showGroupInspectorCandidateMap?.(modelId, true, family.memberIds); }} style={{ ...button, display: 'block', width: '100%', textAlign: 'left', background: selectedFamily?.structureHash === family.structureHash ? '#e9e2fa' : 'transparent' }}>
          {family.structureHash} · {family.count} miembros · {family.variants.length} variantes
        </button>)}</div>
        {selectedFamily && <>
          <div style={line}><strong>Familia {selectedFamily.structureHash}</strong> · {selectedFamily.count} miembros</div>
          <div>Variantes: {selectedFamily.variants.map((variant) => `${variant.count} × ${variant.signature}`).join(' · ')}</div>
          <label><input type="checkbox" checked={familyMap} onChange={(event) => { setFamilyMap(event.target.checked); setCandidateMap(false); api?.showGroupInspectorCandidateMap?.(modelId, event.target.checked, selectedFamily.memberIds); }} /> Resaltar familia completa</label>
          <div style={{ maxHeight: 130, overflow: 'auto' }}>{selectedFamily.positions.map((item) => <button type="button" key={item.id} onClick={() => selectNode(item.id)} style={{ ...button, display: 'block', width: '100%', textAlign: 'left' }}>
            {item.id} · centro {fmt(item.center)} m · bounds {fmt(item.size)} m · vecino {item.nearestDistance ?? '—'} m {item.possibleExtensiveSurface ? '· superficie extensa' : ''}
          </button>)}</div>
        </>}
      </details>
      <div style={line}><input aria-label="Buscar grupo" placeholder="Buscar ID, nombre, meshes, bounds" value={query} onChange={(event) => setQuery(event.target.value)} style={{ flex: 1, minWidth: 150 }} /></div>
      <div style={line}>
        <button type="button" style={button} disabled={rootIndex <= 0} onClick={() => selectNode(filtered[rootIndex - 1].id)}>Anterior</button>
        <button type="button" style={button} disabled={rootIndex < 0 || rootIndex >= filtered.length - 1} onClick={() => selectNode(filtered[rootIndex + 1].id)}>Siguiente</button>
        <span>{rootIndex >= 0 ? rootIndex + 1 : 'Subgrupo'} / {filtered.length}</span>
      </div>
      <div style={{ maxHeight: 100, overflow: 'auto', border: '1px solid #ddd', marginBottom: 8 }}>
        {filtered.map((group) => <button type="button" key={group.id} onClick={() => selectNode(group.id)} style={{ ...button, display: 'block', width: '100%', textAlign: 'left', background: group.id === nodeId ? '#d9edff' : 'transparent', border: 0 }}>
          {group.id} · {group.meshes} meshes · {group.childCount} hijos · ×{group.repetitions} · Candidato {group.candidateScore} · {labels[group.id] || 'Sin clasificar'}
        </button>)}
      </div>
      {current && <>
        <div style={line}><strong>GRUPO: {current.id}</strong><span>{current.path}</span></div>
        {groups.some((group) => group.id === current.id) && <div style={{ border: '1px solid #b8a8d8', padding: 6, marginBottom: 8 }}>
          <strong>Unidad seleccionable · prueba en memoria</strong>
          <div>ID {current.id} · familia {current.structureHash} · {current.meshes} meshes · {current.childCount} hijos</div>
          <div>Bounds {fmt(current.bounds?.size)} m · centro {fmt(current.bounds?.center)} m · miembros {inspector.familyOf(current.id)?.count || 1}</div>
          <div>Posición {fmt(current.transform.position)} · rotación {fmt(current.transform.rotation)} · escala {fmt(current.transform.scale)}</div>
          <div>Estado: {selectionState?.unit?.status || 'unclassified'} · Índice: {selectionState?.indexedMeshes || '—'} meshes</div>
          <div style={line}>
            <button type="button" style={button} onClick={() => markUnit('candidate')}>Marcar candidato</button>
            <button type="button" style={button} onClick={() => markUnit('candidate', true)}>Marcar variante familiar candidata</button>
            <button type="button" style={button} onClick={() => markUnit('confirmed')}>Confirmar unidad</button>
            <button type="button" style={button} onClick={() => markUnit('ambiguous')}>Ambiguo</button>
            <button type="button" style={button} onClick={() => markUnit('context')}>Contexto</button>
            <button type="button" style={button} onClick={() => markUnit('discarded')}>Descartar</button>
            <button type="button" style={button} onClick={() => markUnit('unclassified')}>Sin clasificar</button>
          </div>
          <button type="button" style={button} onClick={toggleSelectionTest}>{selectionState?.enabled ? 'Desactivar prueba de selección' : 'Probar selección'}</button>
          {selectionState?.selected && <div>Último clic: grupo {selectionState.selected.groupId} · familia {selectionState.selected.familyId} · {selectionState.selected.lookupMs} ms (resolución y resaltado)</div>}
        </div>}
        <div>Nombre: {current.name} · Profundidad: {current.depth}</div>
        <div>Meshes: {current.meshes} · Triángulos: {Math.round(current.triangles).toLocaleString()} · Hijos: {current.childCount}</div>
        <div>Bounds: {fmt(current.bounds?.size)} m</div><div>Centro: {fmt(current.bounds?.center)} m</div>
        <div>Firma: {current.signature} · Repeticiones: {current.repetitions}</div>
        <div>Firma de árbol: {current.structureHash} · Candidato a puesto: {current.candidateScore}</div>
        {current.possibleExtensiveSurface && <strong style={{ color: '#a33' }}>POSIBLE SUPERFICIE EXTENSA</strong>}
        {current.largestChild && <div>Hijo mayor: {current.largestChild.id} · {fmt(current.largestChild.bounds?.size)} m · {current.largestChild.horizontalPercent}% del área horizontal de bounds</div>}
        <div style={line}><label>Clasificación <select value={labels[current.id] || LABELS[0]} onChange={(event) => setLabels((old) => ({ ...old, [current.id]: event.target.value }))}>{LABELS.map((label) => <option key={label}>{label}</option>)}</select></label></div>
        <details><summary>Hijos directos ({current.childCount})</summary><div style={{ maxHeight: 120, overflow: 'auto' }}>{inspector.children(current.id).map((child) => {
          const groupArea = (current.bounds?.size?.[0] || 0) * (current.bounds?.size?.[2] || 0);
          const childArea = (child.bounds?.size?.[0] || 0) * (child.bounds?.size?.[2] || 0);
          const percent = groupArea ? (childArea / groupArea * 100).toFixed(1) : '0.0';
          return <button type="button" key={child.id} onClick={() => selectNode(child.id)} style={{ ...button, display: 'block', width: '100%', textAlign: 'left' }}>{child.id} · {child.meshes} meshes · {fmt(child.bounds?.size)} m · {percent}% área bounds</button>;
        })}</div></details>
        <details><summary>Meshes descendientes (primeros 100)</summary><div style={{ maxHeight: 120, overflow: 'auto' }}>{inspector.meshDescendants(current.id).map((mesh) => <button type="button" key={mesh.id} onClick={() => selectNode(mesh.id)} style={{ ...button, display: 'block', width: '100%', textAlign: 'left' }}>{mesh.id} · {mesh.name} · {Math.round(mesh.triangles)} triángulos</button>)}</div></details>
        <details><summary>Materiales ({current.materials.length})</summary>{current.materials.join(', ')}</details>
        <details><summary>Transformación</summary><div>Posición: {fmt(current.transform.position)}</div><div>Rotación: {fmt(current.transform.rotation)}</div><div>Escala: {fmt(current.transform.scale)}</div><pre style={{ whiteSpace: 'pre-wrap', fontSize: 10 }}>matrix: {JSON.stringify(current.transform.matrix)}{'\n'}matrixWorld: {JSON.stringify(current.transform.matrixWorld)}</pre></details>
        <div style={line}><label>Comparar con <select value={compareId} onChange={(event) => setCompareId(event.target.value)}><option value="">Selecciona grupo</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.id}</option>)}</select></label></div>
        {compared && <div>Meshes {current.meshes}/{compared.meshes} · Hijos {current.childCount}/{compared.childCount} · Triángulos {Math.round(current.triangles)}/{Math.round(compared.triangles)} · Bounds {fmt(current.bounds?.size)} / {fmt(compared.bounds?.size)} · Firma {current.signature === compared.signature ? 'igual' : 'distinta'} · Subárboles directos {inspector.compare(current.id, compared.id)?.directChildSimilarityPercent}% similares · Materiales {current.materials.filter((name) => compared.materials.includes(name)).length} compartidos</div>}
      </>}
      <hr /><div>FPS de UI: {fps ?? '—'} · Draw calls: {performanceData?.calls ?? '—'} · Triángulos dibujados: {performanceData?.renderedTriangles ?? '—'}</div>
      <div>Geometrías GPU: {performanceData?.rendererGeometries ?? '—'} · Texturas GPU: {performanceData?.rendererTextures ?? '—'}</div>
      <div>Heap JS: {performanceData?.jsHeapBytes ? `${Math.round(performanceData.jsHeapBytes / 1048576)} MiB` : 'No disponible'} · Resaltado: {highlightMs ?? '—'} ms</div>
      <div>Variación heap desde apertura: {heapAtOpen && performanceData?.jsHeapBytes ? `${Math.round((performanceData.jsHeapBytes - heapAtOpen) / 1048576)} MiB` : 'No disponible'}</div>
      <small>Las etiquetas viven solo en memoria. El resaltado no modifica el modelo ni el historial.</small>
    </>}
  </aside>;
}
