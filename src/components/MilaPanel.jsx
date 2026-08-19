// src/components/MilaPanel.jsx
import { useMemo, useState } from 'react';

const MILA_QUANTITY_OPTIONS = [1, 2, 3, 4];
const MILA_VARIANT_OPTIONS = [
  { value: 'single', label: 'Mila simple' },
  { value: 'double', label: 'Mila doble' },
];
const YES_NO_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'si', label: 'Si' },
];
const GIRO_ANGLE_OPTIONS = [
  { value: 45, label: '45°' },
  { value: 60, label: '60°' },
  { value: 120, label: '120°' },
  { value: 135, label: '135°' },
  { value: 150, label: '150°' },
  { value: 180, label: '180°' },
];

function labelForQuantity(quantity) {
  return `${quantity} ${quantity === 1 ? 'puesto' : 'puestos'}`;
}

const divider = (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      margin: '4px 0',
    }}
  >
    <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
    <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      Superficie de giro
    </span>
    <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
  </div>
);

export default function MilaPanel({ onCreate }) {
  const quantityOptions = useMemo(() => MILA_QUANTITY_OPTIONS, []);
  const variantOptions = useMemo(() => MILA_VARIANT_OPTIONS, []);
  const yesNoOptions = useMemo(() => YES_NO_OPTIONS, []);
  const giroAngleOptions = useMemo(() => GIRO_ANGLE_OPTIONS, []);

  const [selectedVariant, setSelectedVariant] = useState('single');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [useTable, setUseTable] = useState('no');
  const [useTableGrommet, setUseTableGrommet] = useState('no');
  const [selectedAngle, setSelectedAngle] = useState(60);
  const [useGiroGrommet, setUseGiroGrommet] = useState('no');

  const isSingle = selectedVariant === 'single';
  const tableEnabled = isSingle && useTable === 'si';

  const handleCreateSeat = () =>
    onCreate?.({
      type: 'seat',
      quantity: selectedQuantity,
      variant: selectedVariant,
      useTable: tableEnabled,
      useTableGrommet: tableEnabled && useTableGrommet === 'si',
    });

  const handleCreateGiro = () =>
    onCreate?.({
      type: 'giro',
      angle: Number(selectedAngle),
      useGrommet: useGiroGrommet === 'si',
    });

  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <h3 style={{ margin: 0 }}>Mila</h3>

      {/* ─── SECCIÓN PUESTOS ─── */}
      <div>
        <label>Modelo</label>
        <select
          value={selectedVariant}
          onChange={(e) => setSelectedVariant(e.target.value)}
          style={{ width: '100%' }}
        >
          {variantOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Puestos</label>
        <select
          value={selectedQuantity}
          onChange={(e) => setSelectedQuantity(Number(e.target.value))}
          style={{ width: '100%' }}
        >
          {quantityOptions.map((quantity) => (
            <option key={quantity} value={quantity}>
              {labelForQuantity(quantity)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>¿Cambiar a mesa?</label>
        <select
          value={useTable}
          onChange={(e) => {
            const next = e.target.value;
            setUseTable(next);
            if (next !== 'si') setUseTableGrommet('no');
          }}
          style={{ width: '100%' }}
          disabled={!isSingle}
        >
          {yesNoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>¿Mesa con grommet?</label>
        <select
          value={useTableGrommet}
          onChange={(e) => setUseTableGrommet(e.target.value)}
          style={{ width: '100%' }}
          disabled={!tableEnabled}
        >
          {yesNoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button onClick={handleCreateSeat} style={{ padding: '8px 12px', fontWeight: 'bold' }}>
        Crear puesto
      </button>

      {/* ─── SEPARADOR ─── */}
      {divider}

      {/* ─── SECCIÓN GIRO ─── */}
      <div>
        <label>Ángulo de giro</label>
        <select
          value={selectedAngle}
          onChange={(e) => setSelectedAngle(Number(e.target.value))}
          style={{ width: '100%' }}
        >
          {giroAngleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>¿Con grommet?</label>
        <select
          value={useGiroGrommet}
          onChange={(e) => setUseGiroGrommet(e.target.value)}
          style={{ width: '100%' }}
        >
          {yesNoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleCreateGiro}
        style={{
          padding: '8px 12px',
          fontWeight: 'bold',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Agregar superficie de giro
      </button>
    </div>
  );
}