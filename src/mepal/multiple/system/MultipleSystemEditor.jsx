import { useMemo, useState } from 'react';
import { MultipleSystem } from './MultipleSystem.js';
import { createMultipleConfigurationState } from '../configurator/multipleConfigurationState.js';
import { MULTIPLE_HALF_WIDTHS_CM } from '../catalog/multipleFrameCatalog.js';

const panelConfig = () => createMultipleConfigurationState({ widthCm: 90, heightCm: 90, thicknessCm: 8 });
const doorConfig = () => createMultipleConfigurationState({ widthCm: 90, heightCm: 204, thicknessCm: 8, door: { enabled: true, swing: 'RIGHT', material: 'FORMICA' } });

export default function MultipleSystemEditor({ onCreate, initialValue = null, disabled = false }) {
  const [value, setValue] = useState(() => initialValue ? MultipleSystem.from(initialValue).toJSON() : new MultipleSystem().addModule(panelConfig()).layoutLinear().toJSON());
  const system = useMemo(() => MultipleSystem.from(value), [value]); const validation = system.validate();
  const commit = (next) => setValue(MultipleSystem.from(next).toJSON());
  const add = (config) => { const next = MultipleSystem.from(value).addModule(config).layoutLinear(); commit(next); };
  const remove = (id) => commit(MultipleSystem.from(value).removeModule(id).layoutLinear());
  const duplicate = (id) => { const next = MultipleSystem.from(value); next.duplicateModule(id); next.layoutLinear(); commit(next); };
  const patch = (id, update) => commit(MultipleSystem.from(value).updateModule(id, update));
  const reconnect = () => {
    const next = MultipleSystem.from(value); next.composition.connections = [];
    next.modules.slice(1).forEach((module, index) => next.connect({ type: 'LINEAR', from: { moduleId: next.modules[index].moduleId, point: 'END' }, to: { moduleId: module.moduleId, point: 'START' } }));
    commit(next);
  };
  return <div style={{ display: 'grid', gap: 8 }}>
    <div style={{ display: 'flex', gap: 6 }}><button disabled={disabled} onClick={() => add(panelConfig())}>Agregar panel</button><button disabled={disabled} onClick={() => add(doorConfig())}>Agregar puerta</button><button disabled={disabled || system.modules.length < 2} onClick={reconnect}>Conectar secuencia</button></div>
    {system.modules.map((module, index) => <div key={module.moduleId} style={{ border: '1px solid #ddd', borderRadius: 7, padding: 8, display: 'grid', gap: 6 }}>
      <b>{index + 1}. {module.config.door?.enabled ? 'Puerta' : 'Panel'} · {module.config.widthCm} cm</b>
      <label>Frente <select value={module.config.widthCm} disabled={disabled || module.config.door?.enabled} onChange={(event) => patch(module.moduleId, { config: createMultipleConfigurationState({ ...module.config, widthCm: Number(event.target.value) }) })}>{MULTIPLE_HALF_WIDTHS_CM.map((width) => <option key={width} value={width}>{width} cm</option>)}</select></label>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}><button disabled={disabled} onClick={() => duplicate(module.moduleId)}>Duplicar</button><button disabled={disabled || system.modules.length === 1} onClick={() => remove(module.moduleId)}>Eliminar</button>
        <button disabled={disabled} onClick={() => patch(module.moduleId, { position: { x: module.position.x - 0.1 } })}>Mover −</button><button disabled={disabled} onClick={() => patch(module.moduleId, { position: { x: module.position.x + 0.1 } })}>Mover +</button>
        <button disabled={disabled} onClick={() => patch(module.moduleId, { rotation: { y: module.rotation.y + Math.PI / 2 } })}>Rotar 90°</button></div>
    </div>)}
    <div style={{ color: validation.valid ? '#18794e' : '#9a6700', fontSize: 12 }}>{validation.valid ? '✓ Sistema válido' : `⚠ ${validation.diagnostics[0]?.code}`}</div>
    <button disabled={disabled || !validation.valid} onClick={() => onCreate?.(system.toJSON())}>{initialValue ? 'Actualizar sistema MULTIPLE' : 'Crear sistema MULTIPLE'}</button>
  </div>;
}
