// src/components/MilaPanel.jsx
import { useMemo, useState } from 'react';
import { MILA_ACCESSORY_TYPE_OPTIONS } from '../mepal/mila/factories/createMilaAccessoryInstance.js';

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

const renderDivider = (title) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      margin: '6px 0 2px 0',
    }}
  >
    <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
    <span
      style={{
        fontSize: 9,
        color: '#9ca3af',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {title}
    </span>
    <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
  </div>
);

export default function MilaPanel({ onCreate }) {
  const quantityOptions = useMemo(() => MILA_QUANTITY_OPTIONS, []);
  const variantOptions = useMemo(() => MILA_VARIANT_OPTIONS, []);
  const yesNoOptions = useMemo(() => YES_NO_OPTIONS, []);
  const giroAngleOptions = useMemo(() => GIRO_ANGLE_OPTIONS, []);
  const accessoryTypeOptions = useMemo(() => MILA_ACCESSORY_TYPE_OPTIONS, []);

  // Estado Puestos
  const [selectedVariant, setSelectedVariant] = useState('single');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [useTable, setUseTable] = useState('no');
  const [useTableGrommet, setUseTableGrommet] = useState('no');
  const [armrestLeft, setArmrestLeft] = useState('no');
  const [armrestRight, setArmrestRight] = useState('no');
  const [armrestCenter, setArmrestCenter] = useState('no');
  const [hasScreen, setHasScreen] = useState('no');

  // Estado Giro
  const [selectedAngle, setSelectedAngle] = useState(60);
  const [useGiroGrommet, setUseGiroGrommet] = useState('no');

  // Estado Accesorio Individual
  const [selectedAccessory, setSelectedAccessory] = useState('armrest-left');

  // Estado Panel Divisor (Booth)
  const [panelTableSize, setPanelTableSize] = useState('90');
  const [panelScreenLeftSize, setPanelScreenLeftSize] = useState(0);
  const [panelScreenRightSize, setPanelScreenRightSize] = useState(0);

  const isSingle = selectedVariant === 'single';
  const tableEnabled = isSingle && useTable === 'si';

  const handleCreateSeat = () =>
    onCreate?.({
      type: 'seat',
      quantity: selectedQuantity,
      variant: selectedVariant,
      useTable: tableEnabled,
      useTableGrommet: tableEnabled && useTableGrommet === 'si',
      armrestLeft: armrestLeft === 'si',
      armrestRight: armrestRight === 'si',
      armrestCenter: selectedQuantity > 1 && armrestCenter === 'si',
      hasScreen: hasScreen === 'si',
    });

  const handleCreateGiro = () =>
    onCreate?.({
      type: 'giro',
      angle: Number(selectedAngle),
      useGrommet: useGiroGrommet === 'si',
    });

  const handleCreateAccessory = () =>
    onCreate?.({
      type: 'accessory',
      accessoryType: selectedAccessory,
    });

  const handleCreatePanelDivisor = () =>
    onCreate?.({
      type: 'panel-divisor',
      tableSize: panelTableSize,
      seatsLeft: panelScreenLeftSize,
      screenLeft: panelScreenLeftSize > 0,
      seatsRight: panelScreenRightSize,
      screenRight: panelScreenRightSize > 0,
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11 }}>Apoyabrazo Izq.</label>
          <select
            value={armrestLeft}
            onChange={(e) => setArmrestLeft(e.target.value)}
            style={{ width: '100%' }}
          >
            {yesNoOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11 }}>Apoyabrazo Der.</label>
          <select
            value={armrestRight}
            onChange={(e) => setArmrestRight(e.target.value)}
            style={{ width: '100%' }}
          >
            {yesNoOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedQuantity > 1 && (
        <div>
          <label style={{ fontSize: 11 }}>Apoyabrazos Intermedios</label>
          <select
            value={armrestCenter}
            onChange={(e) => setArmrestCenter(e.target.value)}
            style={{ width: '100%' }}
          >
            {yesNoOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label style={{ fontSize: 11 }}>Pantalla envolvente (W_2P)</label>
        <select
          value={hasScreen}
          onChange={(e) => setHasScreen(e.target.value)}
          style={{ width: '100%' }}
        >
          {yesNoOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <button onClick={handleCreateSeat} style={{ padding: '8px 12px', fontWeight: 'bold' }}>
        Crear puesto
      </button>

      {/* ─── SEPARADOR GIRO ─── */}
      {renderDivider('Superficie de giro')}

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

      {/* ─── SEPARADOR ACCESORIOS (debajo de Superficie de Giro) ─── */}
      {renderDivider('Accesorios')}

      {/* ─── SECCIÓN ACCESORIOS INDIVIDUALES ─── */}
      <div>
        <label>Tipo de accesorio</label>
        <select
          value={selectedAccessory}
          onChange={(e) => setSelectedAccessory(e.target.value)}
          style={{ width: '100%' }}
        >
          {accessoryTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleCreateAccessory}
        style={{
          padding: '8px 12px',
          fontWeight: 'bold',
          background: '#059669',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Agregar accesorio
      </button>

      {/* ─── SEPARADOR PANEL DIVISOR (BOOTH) ─── */}
      {renderDivider('Panel Divisor')}

      {/* ─── SECCIÓN PANEL DIVISOR (BOOTH) ─── */}
      <div>
        <label>Mesa central</label>
        <select
          value={panelTableSize}
          onChange={(e) => setPanelTableSize(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="90">Mesa 90 cm</option>
          <option value="150">Mesa 150 cm</option>
          <option value="0">Sin mesa</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11 }}>Pantalla Izq.</label>
          <select
            value={panelScreenLeftSize}
            onChange={(e) => setPanelScreenLeftSize(Number(e.target.value))}
            style={{ width: '100%' }}
          >
            <option value="0">Ninguna</option>
            <option value="1">Para 1 Puesto</option>
            <option value="2">Para 2 Puestos</option>
            <option value="3">Para 3 Puestos</option>
            <option value="4">Para 4 Puestos</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11 }}>Pantalla Der.</label>
          <select
            value={panelScreenRightSize}
            onChange={(e) => setPanelScreenRightSize(Number(e.target.value))}
            style={{ width: '100%' }}
          >
            <option value="0">Ninguna</option>
            <option value="1">Para 1 Puesto</option>
            <option value="2">Para 2 Puestos</option>
            <option value="3">Para 3 Puestos</option>
            <option value="4">Para 4 Puestos</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreatePanelDivisor}
        style={{
          padding: '8px 12px',
          fontWeight: 'bold',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Crear panel divisor
      </button>
    </div>
  );
}