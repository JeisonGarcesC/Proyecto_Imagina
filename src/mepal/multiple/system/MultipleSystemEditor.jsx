import { useMemo, useState } from 'react';
import { MultipleSystem } from './MultipleSystem.js';
import { createMultipleConfigurationState } from '../configurator/multipleConfigurationState.js';
import { MULTIPLE_HALF_WIDTHS_CM } from '../catalog/multipleFrameCatalog.js';
import { getMultipleConnectionPoints, resolveMultipleConnection } from './layout/MultipleConnectionResolver.js';
import { findMultipleSnap } from './layout/MultipleSnapEngine.js';
import { moveMultipleModule, moveMultipleSystem, alignMultipleSystem, duplicateMultipleSystem } from './layout/MultipleSmartLayoutEngine.js';

const panelConfig = () => createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });
const doorConfig = () => createMultipleConfigurationState({ widthCm: 90, heightCm: 204, thicknessCm: 8, door: { enabled: true, swing: 'RIGHT', material: 'FORMICA' } });

export default function MultipleSystemEditor({ onCreate, onDuplicate, initialValue = null, disabled = false }) {
  const [value, setValue] = useState(() => initialValue ? MultipleSystem.from(initialValue).toJSON() : new MultipleSystem().addModule(panelConfig()).layoutLinear().toJSON());
  const system = useMemo(() => MultipleSystem.from(value), [value]); const validation = system.validate();
  const commit = (next) => setValue(MultipleSystem.from(next).toJSON());
  const commitSpatial = (next, actionType) => { const state = MultipleSystem.from(next).toJSON(); setValue(state); if (initialValue) onCreate?.(state, actionType); };
  const [showPoints, setShowPoints] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);
  const [selected, setSelected] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const move = (module, dx) => {
    const next = MultipleSystem.from(value);
    moveMultipleModule(next, module.moduleId, { x: module.position.x + dx });
    commitSpatial(next, 'MULTIPLE_LAYOUT_MOVE');
  };
  const add = (config) => { const next = MultipleSystem.from(value).addModule(config).layoutLinear(); commit(next); };
  const remove = (id) => commit(MultipleSystem.from(value).removeModule(id).layoutLinear());
  const duplicate = (id) => { const next = MultipleSystem.from(value); next.duplicateModule(id); next.layoutLinear(); commit(next); };
  const patch = (id, update) => commit(MultipleSystem.from(value).updateModule(id, update));
  const reconnect = () => {
    const next = MultipleSystem.from(value); next.composition.connections = [];
    next.modules.slice(1).forEach((module, index) => {
      const connection = resolveMultipleConnection(next.modules[index], 'END', module, 'START');
      if (connection) next.connect(connection);
    });
    commitSpatial(next, 'MULTIPLE_CONNECT_MODULES');
  };
  return <div style={{ display: 'grid', gap: 8 }}>
    <div style={{ display: 'flex', gap: 6 }}><button disabled={disabled} onClick={() => add(panelConfig())}>Agregar panel</button><button disabled={disabled} onClick={() => add(doorConfig())}>Agregar puerta</button><button disabled={disabled || system.modules.length < 2} onClick={reconnect}>Conectar secuencia</button></div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <label><input type="checkbox" checked={system.layout.snapEnabled} disabled={disabled} onChange={(event) => { const next = MultipleSystem.from(value); next.layout.snapEnabled = event.target.checked; commitSpatial(next, 'MULTIPLE_LAYOUT_MOVE'); }} /> Snap</label>
      <label>Tolerancia (mm) <input type="number" min="0" value={system.layout.snapToleranceMm} disabled={disabled} style={{ width: 65 }} onChange={(event) => { const next = MultipleSystem.from(value); next.layout.snapToleranceMm = Number(event.target.value); commitSpatial(next, 'MULTIPLE_LAYOUT_MOVE'); }} /></label>
      <label><input type="checkbox" checked={showPoints} onChange={(event) => setShowPoints(event.target.checked)} /> Puntos de conexión</label>
      <label><input type="checkbox" checked={showWarnings} onChange={(event) => setShowWarnings(event.target.checked)} /> Advertencias</label>
    </div>
    <svg viewBox="0 0 500 200" style={{ width: '100%', height: 200, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, touchAction: 'none' }} aria-label="Vista de diseño MULTIPLE">
      {system.modules.map((module) => {
        const position = dragPreview?.moduleId === module.moduleId ? dragPreview.position : module.position;
        const preview = dragPreview?.moduleId === module.moduleId ? findMultipleSnap({ ...module, position }, system.modules, system.layout) : null;
        const x = 24 + position.x * 80; const y = 100 - position.z * 80;
        const width = Number(module.config.widthCm || 0) * 0.8;
        return <g key={module.moduleId} transform={`translate(${x} ${y}) rotate(${-Number(module.rotation.y || 0) * 180 / Math.PI})`}>
          <rect x="0" y="-5" width={width} height="10" fill={preview ? '#0f766e' : module.config.door?.enabled ? '#d97706' : '#2563eb'} opacity="0.8" style={{ cursor: disabled ? 'default' : 'grab' }}
            onPointerDown={(event) => { if (disabled) return; event.currentTarget.setPointerCapture(event.pointerId); setDragging({ moduleId: module.moduleId, startX: event.clientX, startY: event.clientY, position: module.position }); setDragPreview({ moduleId: module.moduleId, position: module.position }); }}
            onPointerMove={(event) => { if (dragging?.moduleId !== module.moduleId) return; const scale = event.currentTarget.ownerSVGElement.getBoundingClientRect().width / 500; setDragPreview({ moduleId: module.moduleId, position: { ...dragging.position, x: dragging.position.x + (event.clientX - dragging.startX) / (80 * scale), z: dragging.position.z - (event.clientY - dragging.startY) / (80 * scale) } }); }}
            onPointerUp={() => { if (dragging?.moduleId !== module.moduleId) return; const next = MultipleSystem.from(value); moveMultipleModule(next, module.moduleId, dragPreview?.position || module.position); commitSpatial(next, 'MULTIPLE_LAYOUT_MOVE'); setDragging(null); setDragPreview(null); }} />
          {showPoints && <><circle cx="0" cy="0" r="4" fill="#16a34a" /><circle cx={width} cy="0" r="4" fill="#16a34a" /></>}
        </g>;
      })}
    </svg>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {['base', 'height', 'x', 'z'].map((axis) => <button key={axis} disabled={disabled || selected.length < 2} onClick={() => commitSpatial(alignMultipleSystem(MultipleSystem.from(value), selected, axis), 'MULTIPLE_ALIGN_MODULES')}>Alinear {axis}</button>)}
      <button disabled={disabled || selected.length === 0} onClick={() => commitSpatial(moveMultipleSystem(MultipleSystem.from(value), { x: 0.1 }), 'MULTIPLE_SYSTEM_MOVE')}>Mover sistema +10 cm</button>
      <button disabled={disabled || !initialValue} onClick={() => onDuplicate?.(duplicateMultipleSystem(MultipleSystem.from(value)))}>Duplicar sistema</button>
    </div>
    {system.modules.map((module, index) => <div key={module.moduleId} style={{ border: '1px solid #ddd', borderRadius: 7, padding: 8, display: 'grid', gap: 6 }}>
      <b>{index + 1}. {module.config.door?.enabled ? 'Puerta' : 'Panel'} · {module.config.widthCm} cm</b>
      <label><input type="checkbox" checked={selected.includes(module.moduleId)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, module.moduleId] : current.filter((id) => id !== module.moduleId))} /> Seleccionar módulo</label>
      {showPoints && <div style={{ fontSize: 11 }}>Conexiones: {getMultipleConnectionPoints(module).map((point) => `${point.id} (${point.type})`).join(' · ')}</div>}
      {system.layout.snapEnabled && <div style={{ fontSize: 11 }}>Snap cercano: {findMultipleSnap(module, system.modules, system.layout)?.connection?.from?.moduleId || 'ninguno'}</div>}
      <label>Frente <select value={module.config.widthCm} disabled={disabled || module.config.door?.enabled} onChange={(event) => patch(module.moduleId, { config: createMultipleConfigurationState({ ...module.config, widthCm: Number(event.target.value) }) })}>{MULTIPLE_HALF_WIDTHS_CM.map((width) => <option key={width} value={width}>{width} cm</option>)}</select></label>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}><button disabled={disabled} onClick={() => duplicate(module.moduleId)}>Duplicar</button><button disabled={disabled || system.modules.length === 1} onClick={() => remove(module.moduleId)}>Eliminar</button>
        <button disabled={disabled} onClick={() => move(module, -0.1)}>Mover −</button><button disabled={disabled} onClick={() => move(module, 0.1)}>Mover +</button>
        <button disabled={disabled} onClick={() => patch(module.moduleId, { rotation: { y: module.rotation.y + Math.PI / 2 } })}>Rotar 90°</button></div>
    </div>)}
    <div style={{ color: validation.valid ? '#18794e' : '#9a6700', fontSize: 12 }}>{validation.valid ? '✓ Sistema válido' : `⚠ ${validation.diagnostics[0]?.code}`}</div>
    {showWarnings && validation.diagnostics.filter((item) => item.level === 'WARNING').map((item, index) => <div key={`${item.code}:${index}`} style={{ color: '#9a6700', fontSize: 12 }}>{item.code}</div>)}
    <button disabled={disabled || !validation.valid} onClick={() => onCreate?.(system.toJSON())}>{initialValue ? 'Actualizar sistema MULTIPLE' : 'Crear sistema MULTIPLE'}</button>
  </div>;
}
