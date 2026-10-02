import { useState } from 'react';
import { CRITTERIUM8_CODED_FRAME_WIDTHS_CM, CRITTERIUM8_HALF_HEIGHTS_CM } from '../mepal/critterium8/catalog/frameCatalog.js';
import { defaultCritteriumSequenceDraft, validateCritteriumSequenceDraft, validateCritteriumSystemDraft } from '../mepal/critterium8/integration/critterium8Configurator.js';

const field = { width: '100%', boxSizing: 'border-box', padding: '7px', borderRadius: 6, border: '1px solid #cbd5e1' };
const button = { ...field, cursor: 'pointer', background: '#eef3f8', textAlign: 'left', marginTop: 6 };
const clone = (value) => structuredClone(value);

function SequenceDraft({ value, onChange, title }) {
  const updateFrame = (index, patch) => onChange({ ...value, frames: value.frames.map((frame, current) => current === index ? { ...frame, ...patch } : frame) });
  const check = validateCritteriumSequenceDraft(value);
  return <div style={{ display: 'grid', gap: 8 }}>
    <strong>{title}</strong>
    <label>Cantidad de frames
      <select style={field} value={value.frames.length} onChange={(event) => {
        const count = Number(event.target.value);
        onChange({ ...value, frames: Array.from({ length: count }, (_, index) => clone(value.frames[index] || value.frames.at(-1))) });
      }}>{[2, 3, 4, 5, 6].map((count) => <option key={count}>{count}</option>)}</select>
    </label>
    <label>Orientación
      <select style={field} value={value.orientationDeg} onChange={(event) => onChange({ ...value, orientationDeg: Number(event.target.value) })}>
        {[0, 90, 180, 270].map((angle) => <option key={angle} value={angle}>{angle}°</option>)}
      </select>
    </label>
    {value.frames.map((frame, index) => <details key={index} open={index === 0}>
      <summary>Frame {index + 1}: {frame.widthCm} × {frame.heightCm} cm</summary>
      <label>Ancho
        <select style={field} value={frame.widthCm} onChange={(event) => updateFrame(index, { widthCm: Number(event.target.value) })}>
          {CRITTERIUM8_CODED_FRAME_WIDTHS_CM.map((width) => <option key={width}>{width}</option>)}
        </select>
      </label>
      <label>Altura
        <select style={field} value={frame.heightCm} onChange={(event) => updateFrame(index, { heightCm: Number(event.target.value) })}>
          {CRITTERIUM8_HALF_HEIGHTS_CM.map((height) => <option key={height}>{height}</option>)}
        </select>
      </label>
      <label>Composición
        <select style={field} value={frame.compositionMode} onChange={(event) => updateFrame(index, { compositionMode: event.target.value })}>
          <option value="MODULAR">Modular</option><option value="FULL_TILE">Panel completo</option>
        </select>
      </label>
    </details>)}
    <div style={{ fontSize: 12, color: check.success ? '#166534' : '#b91c1c' }}>
      {check.success ? `Configuración válida · ${check.junctionCount} encuentros previstos` : `${check.field || 'Configuración'}: ${check.reason}`}
    </div>
    {check.success && <div style={{ fontSize: 12, color: '#475569' }}>
      {check.frames.map((frame, index) => <div key={index}>Frame {index + 1}: {frame.widthCm} × {frame.heightCm} cm · {frame.compositionMode}</div>)}
    </div>}
  </div>;
}

export default function CriteriumPanel({ threeApiRef, onCreateFrame, readOnly }) {
  const [mode, setMode] = useState('FRAME');
  const [frameWidth, setFrameWidth] = useState(90);
  const [frameHeight, setFrameHeight] = useState(128);
  const [draft, setDraft] = useState(defaultCritteriumSequenceDraft);
  const [systemDrafts, setSystemDrafts] = useState([defaultCritteriumSequenceDraft()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [structure, setStructure] = useState({ sequences: [], systems: [] });
  const [selectedExisting, setSelectedExisting] = useState([]);
  const [systemId, setSystemId] = useState('');
  const [sourceSequenceId, setSourceSequenceId] = useState('');
  const [targetSequenceId, setTargetSequenceId] = useState('');
  const [layoutGapCm, setLayoutGapCm] = useState(5);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = () => setStructure(threeApiRef.current?.getCritteriumStructure?.() || { sequences: [], systems: [] });
  const run = async (callback) => {
    if (readOnly || busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await callback();
      setMessage(result?.success === false ? `${result.field || 'Configuración'}: ${result.reason}` : 'Operación realizada.');
      refresh();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const currentSystem = structure.systems.find((item) => item.systemId === systemId);
  return <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
    <h3 style={{ margin: 0 }}>CRITERIUM 8</h3>
    <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
      {['FRAME', 'SEQUENCE', 'SYSTEM'].map((value) => <button key={value} type="button" style={{ ...button, textAlign: 'center', background: mode === value ? '#dbeafe' : '#eef3f8' }} onClick={() => { setMode(value); refresh(); }}>
        {value === 'FRAME' ? 'Frame' : value === 'SEQUENCE' ? 'Secuencia' : 'Sistema'}
      </button>)}
    </nav>
    {mode === 'FRAME' && <section style={{ display: 'grid', gap: 8 }}>
      <label>Ancho (cm)<select style={field} value={frameWidth} onChange={(event) => setFrameWidth(Number(event.target.value))}>
        {CRITTERIUM8_CODED_FRAME_WIDTHS_CM.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label>Altura (cm)<select style={field} value={frameHeight} onChange={(event) => setFrameHeight(Number(event.target.value))}>
        {CRITTERIUM8_HALF_HEIGHTS_CM.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(async () => ({ success: Boolean(await onCreateFrame?.({ widthCm: frameWidth, heightCm: frameHeight, compositionMode: 'MODULAR' })) }))}>Crear frame</button>
    </section>}
    {mode === 'SEQUENCE' && <section>
      <SequenceDraft value={draft} onChange={setDraft} title="Configurar secuencia" />
      <button type="button" style={button} disabled={readOnly || busy || !validateCritteriumSequenceDraft(draft).success} onClick={() => run(() => threeApiRef.current?.createConfiguredCritteriumSequence?.(draft))}>Crear secuencia</button>
    </section>}
    {mode === 'SYSTEM' && <section style={{ display: 'grid', gap: 8 }}>
      <strong>Crear sistema desde cero</strong>
      <select style={field} value={activeIndex} onChange={(event) => setActiveIndex(Number(event.target.value))}>
        {systemDrafts.map((_, index) => <option key={index} value={index}>Secuencia {index + 1}</option>)}
      </select>
      <SequenceDraft value={systemDrafts[activeIndex]} onChange={(next) => setSystemDrafts((items) => items.map((item, index) => index === activeIndex ? next : item))} title={`Secuencia ${activeIndex + 1}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        <button type="button" style={button} onClick={() => { setSystemDrafts((items) => [...items, defaultCritteriumSequenceDraft()]); setActiveIndex(systemDrafts.length); }}>Agregar</button>
        <button type="button" style={button} onClick={() => { setSystemDrafts((items) => [...items, clone(items[activeIndex])]); setActiveIndex(systemDrafts.length); }}>Duplicar</button>
        <button type="button" style={button} disabled={systemDrafts.length === 1} onClick={() => { setSystemDrafts((items) => items.filter((_, index) => index !== activeIndex)); setActiveIndex(0); }}>Eliminar</button>
      </div>
      <div style={{ fontSize: 12 }}>{systemDrafts.length} secuencias · disposición en filas separadas</div>
      <button type="button" style={button} disabled={readOnly || busy || !validateCritteriumSystemDraft(systemDrafts).success} onClick={() => run(() => threeApiRef.current?.createConfiguredCritteriumSystem?.(systemDrafts))}>Crear sistema</button>
      <details onToggle={(event) => { if (event.currentTarget.open) refresh(); }}>
        <summary>Crear desde secuencias existentes</summary>
        {structure.sequences.filter((item) => !item.parentSystemId).map((item) => <label key={item.sequenceId} style={{ display: 'block', fontSize: 12 }}>
          <input type="checkbox" checked={selectedExisting.includes(item.sequenceId)} onChange={(event) => setSelectedExisting((ids) => event.target.checked ? [...ids, item.sequenceId] : ids.filter((id) => id !== item.sequenceId))} /> {item.sequenceId} · {item.frameCount} frames
        </label>)}
        <button type="button" style={button} disabled={readOnly || busy || !selectedExisting.length} onClick={() => run(() => threeApiRef.current?.createCritteriumSystemFromSequenceIds?.(selectedExisting))}>Crear desde selección</button>
      </details>
    </section>}
    <details onToggle={(event) => { if (event.currentTarget.open) refresh(); }}>
      <summary>Elementos existentes</summary>
      {structure.sequences.map((item) => <button key={item.sequenceId} type="button" style={button} onClick={() => threeApiRef.current?.selectCritteriumSequenceById?.(item.sequenceId)}>
        Secuencia {item.sequenceId} · {item.frameCount} frames
      </button>)}
      {structure.systems.map((item) => <button key={item.systemId} type="button" style={button} onClick={() => { setSystemId(item.systemId); threeApiRef.current?.selectCritteriumSystemById?.(item.systemId); }}>
        Sistema {item.systemId} · {item.sequenceIds.length} secuencias
      </button>)}
    </details>
    {currentSystem && <details open>
      <summary>Editar sistema seleccionado</summary>
      <button type="button" style={button} onClick={() => threeApiRef.current?.selectCritteriumSystemById?.(systemId)}>Seleccionar sistema</button>
      {currentSystem.sequenceIds.map((id) => <div key={id} style={{ display: 'flex', gap: 4 }}>
        <button type="button" style={button} onClick={() => threeApiRef.current?.selectCritteriumSequenceById?.(id)}>Secuencia {id}</button>
        <button type="button" style={{ ...button, width: 'auto' }} onClick={() => {
          const frameId = structure.sequences.find((item) => item.sequenceId === id)?.frameInstanceIds?.[0];
          if (frameId) threeApiRef.current?.selectCritteriumFrameByInstanceId?.(frameId);
          setMessage('Edita el frame seleccionado en Properties.');
        }}>Editar</button>
        <button type="button" style={{ ...button, width: 'auto' }} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.duplicateCritteriumSystemSequence?.(systemId, id))}>Duplicar</button>
        <button type="button" style={{ ...button, width: 'auto' }} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.removeSequenceFromCritteriumSystem?.(systemId, id))}>Quitar</button>
        <button type="button" style={{ ...button, width: 'auto' }} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.deleteCritteriumSystemSequence?.(systemId, id))}>Eliminar</button>
      </div>)}
      {structure.sequences.filter((item) => !item.parentSystemId).map((item) => <button key={item.sequenceId} type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.addSequenceToCritteriumSystem?.(systemId, item.sequenceId))}>Agregar {item.sequenceId}</button>)}
      {currentSystem.sequenceIds.length > 1 && <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        <strong>Organización espacial</strong>
        <label>Secuencia origen
          <select style={field} value={sourceSequenceId} onChange={(event) => setSourceSequenceId(event.target.value)}>
            <option value="">Seleccionar</option>
            {currentSystem.sequenceIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label>Secuencia destino
          <select style={field} value={targetSequenceId} onChange={(event) => setTargetSequenceId(event.target.value)}>
            <option value="">Seleccionar</option>
            {currentSystem.sequenceIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <button type="button" style={button} disabled={readOnly || busy || !sourceSequenceId || !targetSequenceId || sourceSequenceId === targetSequenceId} onClick={() => run(() => threeApiRef.current?.connectCritteriumSequencesById?.(systemId, sourceSequenceId, targetSequenceId))}>Conectar extremos cercanos</button>
        {(currentSystem.connections || []).map((connection) => <button key={connection.connectionId} type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.disconnectCritteriumSequencesById?.(systemId, connection.connectionId))}>
          Desconectar {connection.sourceSequenceId} ↔ {connection.targetSequenceId} ({connection.type})
        </button>)}
        {(currentSystem.spatialDiagnostics || []).map((diagnostic) => <div key={diagnostic.connectionId} style={{ fontSize: 12, color: '#b91c1c' }}>
          Conexión {diagnostic.connectionId}: {diagnostic.code}
        </div>)}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
          <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.alignCritteriumSystemSequences?.(systemId, currentSystem.sequenceIds, 'HORIZONTAL'))}>Alinear horizontal</button>
          <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.alignCritteriumSystemSequences?.(systemId, currentSystem.sequenceIds, 'VERTICAL'))}>Alinear vertical</button>
          <button type="button" style={button} disabled={readOnly || busy} onClick={() => run(() => threeApiRef.current?.alignCritteriumSystemSequences?.(systemId, currentSystem.sequenceIds, 'ENDPOINT'))}>Alinear extremos</button>
          <button type="button" style={button} disabled={readOnly || busy || currentSystem.sequenceIds.length < 3} onClick={() => run(() => threeApiRef.current?.distributeCritteriumSystemSequences?.(systemId, currentSystem.sequenceIds, 'X'))}>Distribuir</button>
        </div>
        <button type="button" style={button} disabled={readOnly || busy || !sourceSequenceId} onClick={() => run(() => threeApiRef.current?.rotateCritteriumSystemSequence?.(systemId, sourceSequenceId, true))}>Rotar origen 90°</button>
        <label>Separación para organizar (cm)
          <input style={field} type="number" min="0" step="1" value={layoutGapCm} onChange={(event) => setLayoutGapCm(Number(event.target.value))} />
        </label>
        <button type="button" style={button} disabled={readOnly || busy || layoutGapCm < 0} onClick={() => run(() => threeApiRef.current?.organizeCritteriumSystem?.(systemId, layoutGapCm / 100))}>Organizar linealmente</button>
      </div>}
    </details>}
    {message && <div role="status" style={{ fontSize: 12, color: message.startsWith('Operación') ? '#166534' : '#b91c1c' }}>{message}</div>}
  </div>;
}
