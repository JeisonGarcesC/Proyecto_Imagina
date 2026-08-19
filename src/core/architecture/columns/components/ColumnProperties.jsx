import { useEffect, useState } from 'react';
import { COLUMN_SHAPES } from '../columnDefinition.js';

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '7px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)' };

function NumericField({ label, value, step, disabled, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const number = Number(String(draft).replace(',', '.'));
    if (Number.isFinite(number)) onCommit(number);
    else setDraft(String(value));
  };
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
      {label}
      <input type="number" step={step} value={draft} disabled={disabled}
        onChange={(event) => setDraft(event.target.value)} onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setDraft(String(value));
        }} style={inputStyle} />
    </label>
  );
}

export default function ColumnProperties({ column, onChange, onDelete, onClose }) {
  if (!column) return null;
  const locked = column.locked === true;
  return (
    <div style={{ display: 'grid', gap: 10, padding: 10, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Propiedades de columna</strong>
        <button type="button" onClick={onClose} aria-label="Cerrar propiedades">×</button>
      </div>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
        Forma
        <select value={column.shape} disabled={locked} onChange={(event) => onChange({ shape: event.target.value })} style={inputStyle}>
          <option value={COLUMN_SHAPES.RECTANGLE}>Rectangular</option>
          <option value={COLUMN_SHAPES.CIRCLE}>Circular</option>
        </select>
      </label>
      <NumericField label="Posición X (m)" value={column.position.x} step="0.05" disabled={locked} onCommit={(x) => onChange({ position: { ...column.position, x } })} />
      <NumericField label="Posición Z (m)" value={column.position.z} step="0.05" disabled={locked} onCommit={(z) => onChange({ position: { ...column.position, z } })} />
      {column.shape === COLUMN_SHAPES.RECTANGLE ? (
        <>
          <NumericField label="Ancho (m)" value={column.width} step="0.01" disabled={locked} onCommit={(width) => onChange({ width })} />
          <NumericField label="Profundidad (m)" value={column.depth} step="0.01" disabled={locked} onCommit={(depth) => onChange({ depth })} />
          <NumericField label="Rotación (°)" value={(column.rotation * 180) / Math.PI} step="1" disabled={locked} onCommit={(degrees) => onChange({ rotation: (degrees * Math.PI) / 180 })} />
        </>
      ) : (
        <NumericField label="Diámetro (m)" value={column.diameter} step="0.01" disabled={locked} onCommit={(diameter) => onChange({ diameter })} />
      )}
      <NumericField label="Altura (m)" value={column.height} step="0.05" disabled={locked} onCommit={(height) => onChange({ height })} />
      <NumericField label="Elevación desde suelo (m)" value={column.baseElevation} step="0.05" disabled={locked} onCommit={(baseElevation) => onChange({ baseElevation })} />
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
        <input type="checkbox" checked={column.visible !== false} disabled={locked} onChange={(event) => onChange({ visible: event.target.checked })} /> Visible
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
        <input type="checkbox" checked={locked} onChange={(event) => onChange({ locked: event.target.checked })} /> Bloqueada
      </label>
      <button type="button" disabled={locked} onClick={onDelete} style={{ color: '#a11' }}>Eliminar columna</button>
    </div>
  );
}
