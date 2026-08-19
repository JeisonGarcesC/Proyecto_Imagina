import React, { useEffect, useState } from 'react';

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '7px 8px',
  borderRadius: 6,
  border: '1px solid rgba(0,0,0,0.2)',
};

function NumericProperty({ label, value, step, disabled, onCommit }) {
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
      <input
        type="number"
        step={step}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setDraft(String(value));
        }}
        style={fieldStyle}
      />
    </label>
  );
}

export default function WallProperties({ wall, onChange, onDelete, onClose }) {
  if (!wall) return null;
  const locked = wall.locked === true;

  return (
    <div style={{ display: 'grid', gap: 10, padding: 10, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Propiedades del muro</strong>
        <button type="button" onClick={onClose} aria-label="Cerrar propiedades">×</button>
      </div>

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
