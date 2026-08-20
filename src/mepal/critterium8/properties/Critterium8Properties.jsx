import { useState } from 'react';
import Critterium8FrameProperties from './Critterium8FrameProperties.jsx';
import { CRITTERIUM8_TILE_CATALOG } from '../catalog/tileCatalog.js';

const sectionStyle = { padding: 12, border: '1px solid #e1e1e1', borderRadius: 10, background: '#fff', display: 'grid', gap: 10 };
const selectStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #d8d8d8', borderRadius: 8, background: '#fff' };

export default function Critterium8Properties({ part, api, readOnly = false }) {
  const context = part?.critterium8;
  const sequence = part?.critterium8Sequence;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!context && !sequence) return null;
  const { config = {}, composition = {}, editablePart = null } = context || {};

  const run = async (operation) => {
    if (readOnly || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await operation();
      if (!result?.success) setMessage(result?.reason || 'No fue posible actualizar Critterium 8.');
      else if (result.diagnostics?.length) setMessage(result.diagnostics.map((item) => item.code).join(', '));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pp-shell">
      <div className="pp-header"><p className="pp-title">Critterium 8</p></div>
      {readOnly && <div className="pp-readonly-banner">Modo solo lectura.</div>}
      {sequence && (
        <div style={sectionStyle}>
          <strong>FrameSequence</strong>
          <div>ID: {sequence.sequenceId}</div>
          <div>Frames: {sequence.frameIds.length}</div>
          <div>Junctions: {sequence.junctionIds.length}</div>
          <button type="button" disabled={readOnly || busy} onClick={() => run(() => api?.rebuildSelectedCritterium8Sequence?.())}>Reconectar secuencia</button>
          <button type="button" disabled={readOnly || busy} onClick={() => run(() => api?.dissolveSelectedCritterium8Sequence?.())}>Disolver secuencia</button>
        </div>
      )}
      {!sequence && Array.isArray(part?.selectionTargetIds) && part.selectionTargetIds.length > 1 && (
        <div style={sectionStyle}>
          <strong>FrameSequence</strong>
          <button type="button" disabled={readOnly || busy} onClick={() => run(() => api?.createCritterium8SequenceFromSelection?.())}>Crear secuencia</button>
        </div>
      )}
      {context && (
        <>
      <div style={sectionStyle}>
        <strong>Configuración del Frame</strong>
        <Critterium8FrameProperties
          config={config}
          disabled={readOnly || busy}
          onChange={(patch) => run(() => api?.updateSelectedCritterium8?.(patch))}
        />
      </div>

      <div style={sectionStyle}>
        <strong>{config.compositionMode === 'FULL_TILE' ? 'Baldosa plena' : 'Slots modulares'}</strong>
        {(composition?.tileSlots || []).map((slot) => {
          const focused = editablePart?.partType === 'TILE' && editablePart?.slotId === slot.id;
          return (
            <label key={slot.id} style={{ display: 'grid', gap: 5, padding: focused ? 8 : 0, border: focused ? '1px solid #16a34a' : 'none', borderRadius: 8, fontSize: 12 }}>
              Slot {slot.index + 1} — {slot.heightCm} cm
              <select
                style={selectStyle}
                value={slot.tile?.tileType || ''}
                disabled={readOnly || busy}
                onChange={(event) => run(() => api?.updateSelectedCritterium8Tile?.(slot.id, { tileType: event.target.value }))}
              >
                <option value="">Ninguno</option>
                {(slot.allowedTileTypes || []).map((type) => <option key={type} value={type}>{CRITTERIUM8_TILE_CATALOG[type]?.displayName || type}</option>)}
              </select>
            </label>
          );
        })}
      </div>

      {editablePart && editablePart.partType !== 'TILE' && (
        <div style={sectionStyle}>
          <strong>Parte seleccionada</strong>
          <div>Tipo: {editablePart.partType}</div>
          <div>Código: {editablePart.code || 'No documentado'}</div>
          {editablePart.provisionalGeometry && <div style={{ color: '#92400e' }}>Representación provisional</div>}
        </div>
      )}
        </>
      )}
      {message && <div style={{ padding: 10, color: '#92400e', fontSize: 12 }}>{message}</div>}
    </div>
  );
}
