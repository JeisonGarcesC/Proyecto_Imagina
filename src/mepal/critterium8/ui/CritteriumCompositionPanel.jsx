import { buildCritteriumComposition } from './critteriumComposition.js';

const action = { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 5,
  padding: '3px 6px', cursor: 'pointer', fontSize: 11, maxWidth: '100%',
  whiteSpace: 'normal', overflowWrap: 'normal', wordBreak: 'normal' };

export default function CritteriumCompositionPanel({ structure, systemId, selectedPart,
  selectedConnectionId, readOnly, busy, onSelectSystem, onSelectSequence, onSelectFrame,
  onSelectConnection, onEditSlot, onAddModule, onAddSequence, onDisconnect }) {
  const model = buildCritteriumComposition(structure, systemId, selectedPart, selectedConnectionId);
  if (!model.systemId && !model.sequences.length) return <section aria-label="Composición CRITERIUM"
    style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, fontSize: 12 }}>
    <strong>COMPOSICIÓN</strong><p style={{ marginBottom: 0 }}>Aún no hay secuencias. Crea una oficina o una secuencia para empezar.</p>
  </section>;
  return <section aria-label="Composición CRITERIUM" style={{ border: '1px solid #cbd5e1',
    borderRadius: 8, padding: 10, background: '#f8fafc', fontSize: 12, minWidth: 0,
    width: '100%', maxWidth: 230, boxSizing: 'border-box', overflowX: 'hidden',
    whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
    <strong>COMPOSICIÓN</strong>
    {model.systemId && <div style={{ marginTop: 8, padding: 7, borderRadius: 6,
      maxWidth: '100%', boxSizing: 'border-box',
      border: model.systemSelected ? '2px solid #2563eb' : '1px solid #d7dee8', background: '#fff' }}>
      <button type="button" onClick={() => onSelectSystem(model.systemId)} aria-pressed={model.systemSelected}
        style={{ ...action, width: '100%', textAlign: 'left', fontWeight: 700 }}>Sistema de oficina {model.systemSelected ? '· seleccionado' : ''}</button>
      <div style={{ color: '#475569', marginTop: 4, whiteSpace: 'normal' }}>{model.counts.sequences} secuencias · {model.counts.modules} módulos · {model.counts.frames} frames · {model.counts.connections} conexiones</div>
    </div>}
    <div style={{ maxHeight: 360, overflowY: 'auto', marginTop: 6, maxWidth: '100%', overflowX: 'hidden' }}>
      {model.sequences.map((sequence) => <details key={sequence.sequenceId} open={sequence.containsSelection || undefined}
        style={{ marginTop: 6, background: '#fff', border: sequence.containsSelection ? '2px solid #2563eb' : '1px solid #d7dee8', borderRadius: 6, padding: 6 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Secuencia {sequence.number} · {sequence.slots.length} módulos {sequence.containsSelection ? '· seleccionada' : ''}</summary>
        <button type="button" style={{ ...action, marginTop: 6 }} onClick={() => onSelectSequence(sequence.sequenceId)} aria-pressed={sequence.selected}>Seleccionar secuencia</button>
        {sequence.diagnostics.map((diagnostic, index) => <div key={`${diagnostic.code}-${index}`} role="status" style={{ color: '#9a3412', marginTop: 4 }}>Advertencia: {diagnostic.code}</div>)}
        {sequence.slots.map((slot) => <div key={slot.slotId} style={{ marginTop: 6, padding: 6,
          border: slot.selected ? '2px solid #2563eb' : '1px solid #e2e8f0', borderRadius: 5, background: slot.selected ? '#eff6ff' : '#fff' }}>
          <div style={{ fontWeight: 600 }}>Módulo {slot.number} {slot.selected ? '· seleccionado' : ''}</div>
          <div>{slot.frameMode === 'FLOOR_TO_CEILING' ? 'Frame piso a techo' : 'Frame media altura'} · {slot.widthCm} × {slot.heightCm} cm</div>
          <div style={{ color: slot.status === 'READY' ? '#475569' : '#b91c1c' }}>{slot.status === 'READY' ? 'Frame disponible' : 'Error: frame faltante'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            <button type="button" style={action} disabled={!slot.frameInstanceId} aria-pressed={slot.selected} onClick={() => onSelectFrame(slot.frameInstanceId)}>Seleccionar</button>
            <button type="button" style={action} disabled={readOnly || busy} onClick={() => onEditSlot(sequence.sequenceId, 'DUPLICATE', { slotId: slot.slotId })}>Duplicar</button>
            <button type="button" style={action} disabled={readOnly || busy || sequence.slots.length <= 2} onClick={() => onEditSlot(sequence.sequenceId, 'REMOVE', { slotId: slot.slotId })}>Eliminar</button>
          </div>
        </div>)}
        <button type="button" style={{ ...action, marginTop: 6 }} disabled={readOnly || busy || !sequence.slots.length} onClick={() => onAddModule(sequence.sequenceId)}>Agregar módulo</button>
      </details>)}
    </div>
    {model.systemId && <button type="button" style={{ ...action, marginTop: 8 }} onClick={onAddSequence}>Agregar secuencia</button>}
    {model.systemId && <details style={{ marginTop: 8 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Conexiones · {model.connections.length}</summary>
      {model.connections.length === 0 && <div style={{ color: '#475569', padding: 5 }}>Sin conexiones</div>}
      {model.connections.map((connection) => <div key={connection.connectionId} style={{ marginTop: 5, padding: 6,
        border: connection.selected ? '2px solid #2563eb' : '1px solid #d7dee8', borderRadius: 5, background: '#fff' }}>
        <button type="button" style={action} aria-pressed={connection.selected} onClick={() => onSelectConnection(connection.connectionId)}>
          Conexión {connection.sourceNumber} ↔ {connection.targetNumber} · {connection.type}{connection.selected ? ' · seleccionada' : ''}
        </button>
        <button type="button" style={{ ...action, marginLeft: 4 }} disabled={readOnly || busy} onClick={() => onDisconnect(model.systemId, connection.connectionId)}>Desconectar</button>
      </div>)}
    </details>}
  </section>;
}
