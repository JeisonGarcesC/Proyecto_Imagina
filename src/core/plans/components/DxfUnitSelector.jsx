import { useEffect, useState } from 'react';
import { DXF_UNIT_SELECTION_OPTIONS } from '../utils/dxfUnits.js';

export default function DxfUnitSelector({ open, fileName, onCancel, onConfirm }) {
  const [unit, setUnit] = useState('');

  useEffect(() => {
    if (open) setUnit('');
  }, [open, fileName]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background: 'rgba(15, 23, 42, 0.48)',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dxf-unit-title"
        style={{
          width: 'min(420px, 100%)',
          display: 'grid',
          gap: 14,
          padding: 18,
          borderRadius: 12,
          border: '1px solid #dbe1e8',
          background: '#fff',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.24)',
          color: '#1f2937',
        }}
      >
        <strong id="dxf-unit-title" style={{ fontSize: 16 }}>
          El archivo DXF no especifica sus unidades.
        </strong>
        {fileName ? <span style={{ fontSize: 12, opacity: 0.7 }}>{fileName}</span> : null}
        <label style={{ display: 'grid', gap: 7, fontSize: 13 }}>
          <span>Selecciona la unidad utilizada al dibujar el plano:</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value)} autoFocus>
            <option value="">Seleccionar unidad</option>
            {DXF_UNIT_SELECTION_OPTIONS.map((option) => (
              <option key={option.name} value={option.name}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onCancel}>Cancelar</button>
          <button type="button" disabled={!unit} onClick={() => unit && onConfirm?.(unit)}>
            Continuar
          </button>
        </div>
      </section>
    </div>
  );
}
