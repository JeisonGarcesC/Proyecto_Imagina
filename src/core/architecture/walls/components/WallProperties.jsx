import React, { useState } from 'react';
import { getWallSegmentLength } from '../wallDefinition.js';

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '7px 8px',
  borderRadius: 6,
  border: '1px solid rgba(0,0,0,0.2)',
};

function NumericProperty({ label, value, step, disabled, onCommit }) {
  const [draft, setDraft] = useState(null);

  const commit = () => {
    if (draft === null) return;
    const number = Number(String(draft).replace(',', '.'));
    if (Number.isFinite(number)) onCommit(number);
    setDraft(null);
  };

  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
      {label}
      <input
        type="number"
        step={step}
        value={draft ?? String(value)}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setDraft(null);
        }}
        style={fieldStyle}
      />
    </label>
  );
}

function SegmentNumber({ label, value, disabled, onCommit, onError }) {
  const [draft, setDraft] = useState(null);
  const commit = () => {
    if (draft === null) return;
    const normalized = String(draft).trim().replace(',', '.');
    const number = normalized ? Number(normalized) : NaN;
    if (!Number.isFinite(number)) {
      onError('Introduce un número válido en metros.');
      return;
    }
    const result = onCommit(number);
    if (result?.ok) { setDraft(null); onError(''); }
    else onError(result?.error || 'No se pudo modificar el muro.');
  };
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
      {label}
      <input type="number" step="any" value={draft ?? String(value)} disabled={disabled}
        onChange={(event) => setDraft(event.target.value)} onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') { setDraft(null); onError(''); }
        }} style={fieldStyle} />
    </label>
  );
}

export default function WallProperties({ wall, onChange, onSegmentLength, onPointChange, onDelete, onClose }) {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [editError, setEditError] = useState('');
  if (!wall) return null;
  const locked = wall.locked === true;
  const selectedIndex = Math.min(segmentIndex, Math.max(0, wall.points.length - 2));
  const start = wall.points[selectedIndex];
  const end = wall.points[selectedIndex + 1];
  const length = getWallSegmentLength(wall, selectedIndex);

  return (
    <div style={{ display: 'grid', gap: 10, padding: 10, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Propiedades del muro</strong>
        <button type="button" onClick={onClose} aria-label="Cerrar propiedades">×</button>
      </div>

      {wall.points.length > 2 && (
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          Segmento
          <select value={selectedIndex} onChange={(event) => { setSegmentIndex(Number(event.target.value)); setEditError(''); }} style={fieldStyle}>
            {wall.points.slice(0, -1).map((point, index) =>
              <option key={point.id} value={index}>Segmento {index + 1} (P{index + 1} → P{index + 2})</option>)}
          </select>
        </label>
      )}
      <SegmentNumber key={`${wall.id}:${selectedIndex}:length`} label="Largo (m) — inicio fijo" value={length} disabled={locked}
        onCommit={(value) => onSegmentLength(selectedIndex, value)} onError={setEditError} />
      <div style={{ fontSize: 12, opacity: 0.75 }}>Al cambiar el largo, se mueve P{selectedIndex + 2} en la dirección actual.</div>
      {[[selectedIndex, start], [selectedIndex + 1, end]].map(([pointIndex, point]) => (
        <div key={point.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <SegmentNumber label={`P${pointIndex + 1} X (m)`} value={point.x} disabled={locked}
            onCommit={(value) => onPointChange(pointIndex, 'x', value)} onError={setEditError} />
          <SegmentNumber label={`P${pointIndex + 1} Z (m)`} value={point.z} disabled={locked}
            onCommit={(value) => onPointChange(pointIndex, 'z', value)} onError={setEditError} />
        </div>
      ))}
      {editError && <div role="alert" style={{ color: '#a11', fontSize: 12 }}>{editError}</div>}

      <NumericProperty label="Altura (m)" value={wall.height} step="0.05" disabled={locked} onCommit={(height) => onChange({ height })} />
      <NumericProperty label="Espesor (m)" value={wall.thickness} step="0.01" disabled={locked} onCommit={(thickness) => onChange({ thickness })} />
      <NumericProperty label="Elevación desde suelo (m)" value={wall.baseElevation} step="0.05" disabled={locked} onCommit={(baseElevation) => onChange({ baseElevation })} />

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
        <input type="checkbox" checked={wall.visible !== false} disabled={locked} onChange={(event) => onChange({ visible: event.target.checked })} />
        Visible
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
        <input type="checkbox" checked={locked} onChange={(event) => onChange({ locked: event.target.checked })} />
        Bloqueado
      </label>

      <button type="button" disabled={locked} onClick={onDelete} style={{ color: '#a11' }}>
        Eliminar muro
      </button>
    </div>
  );
}
