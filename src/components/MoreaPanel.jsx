import { useMemo, useState } from 'react';
import { MOREA_BUILDER_TUNE } from '../mepal/morea/config/moreaTunables.js';
import { MOREA_ACCESSORY_TYPE_OPTIONS } from '../mepal/morea/factories/createMoreaAccessoryInstance.js';

const YES_NO_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'si', label: 'Si' },
];

const MOREA_GIRO_OPTIONS = [
  {
    key: 'HSU020000',
    code: 'HSU020000',
    modelTag: 'HSU020000',
    angle: 45,
    variant: 'single',
    useGrommet: false,
    label: 'Superficie Curva Morea 45°',
  },
  {
    key: 'HSU060000',
    code: 'HSU060000',
    modelTag: 'HSU060000',
    angle: 60,
    variant: 'single',
    useGrommet: false,
    label: 'Superficie Curva Morea 60°',
  },
  {
    key: 'HSU030000',
    code: 'HSU030000',
    modelTag: 'HSU030000',
    angle: 90,
    variant: 'single',
    useGrommet: false,
    label: 'Superficie Curva Morea 90°',
  },
  {
    key: 'HSU070000',
    code: 'HSU070000',
    modelTag: 'HSU070000',
    angle: 90,
    variant: 'double',
    useGrommet: false,
    label: 'Superficie Curva Morea 90° Doble',
  },
  {
    key: 'HSU010000_69',
    code: 'HSU010000',
    modelTag: 'HSU010000-69cm',
    angle: 180,
    variant: 'single',
    useGrommet: false,
    label: 'Superficie Terminal Morea 69cm',
  },
  {
    key: 'HSU010000_138',
    code: 'HSU010000',
    modelTag: 'HSU010000-138cm',
    angle: 180,
    variant: 'double',
    useGrommet: false,
    label: 'Superficie Terminal Doble Morea 138cm',
  },
];

function normalizeCatalogTitle(catalogItem, fallbackCode) {
  const raw =
    catalogItem?.ui?.title ||
    catalogItem?.ui?.subtitle ||
    catalogItem?.raw?.descripcion ||
    catalogItem?.raw?.description ||
    fallbackCode ||
    '';
  return String(raw).replace(/\s+/g, ' ').trim();
}

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

export default function MoreaPanel({ onCreate, catalogByCode }) {
  const quantityOptions = useMemo(
    () => Array.from({ length: MOREA_BUILDER_TUNE.MAX_PUESTOS }, (_unused, index) => index + 1),
    []
  );
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState('single');
  const [selectedGiroKey, setSelectedGiroKey] = useState('HSU020000');
  const [armrestLeft, setArmrestLeft] = useState('no');
  const [armrestRight, setArmrestRight] = useState('no');
  const [armrestCenter, setArmrestCenter] = useState('no');
  const [selectedAccessory, setSelectedAccessory] = useState('armrest-center');
  const yesNoOptions = useMemo(() => YES_NO_OPTIONS, []);
  const accessoryTypeOptions = useMemo(() => MOREA_ACCESSORY_TYPE_OPTIONS, []);

  const giroAngleOptions = useMemo(() => {
    return MOREA_GIRO_OPTIONS.map((option) => {
      const catalogItem = catalogByCode?.get?.(option.code) || null;
      const xmlTitle = normalizeCatalogTitle(catalogItem, option.code);
      return {
        ...option,
        value: option.angle,
        label: xmlTitle && xmlTitle !== option.code
          ? `${option.label} - ${xmlTitle}`
          : option.label,
      };
    });
  }, [catalogByCode]);

  const safeSelectedGiroKey = useMemo(() => {
    const exists = giroAngleOptions.some((option) => option.key === selectedGiroKey);
    return exists ? selectedGiroKey : String(giroAngleOptions[0]?.key || 'HSU020000');
  }, [giroAngleOptions, selectedGiroKey]);

  const selectedGiroOption = useMemo(
    () =>
      giroAngleOptions.find((option) => option.key === safeSelectedGiroKey) ||
      giroAngleOptions[0],
    [giroAngleOptions, safeSelectedGiroKey]
  );

  const handleCreateSeat = () => {
    onCreate?.({
      type: 'seat',
      quantity: selectedQuantity,
      variant: selectedVariant,
      armrestLeft: armrestLeft === 'si',
      armrestRight: armrestRight === 'si',
      armrestCenter: selectedQuantity > 1 && armrestCenter === 'si',
    });
  };

  const handleCreateGiro = () =>
    onCreate?.({
      type: 'giro',
      angle: Number(selectedGiroOption?.value || 60),
      code: String(selectedGiroOption?.code || ''),
      codigoPT: String(selectedGiroOption?.code || ''),
      modelSrc: `/assets/models/Morea/${String(selectedGiroOption?.modelTag || '').trim()}.glb`,
      label: String(selectedGiroOption?.label || 'Superficie de giro Morea'),
      useGrommet: false,
      variant: String(selectedGiroOption?.variant || 'single'),
      giroVariant: String(selectedGiroOption?.variant || 'single'),
    });

  const handleCreateAccessory = () =>
    onCreate?.({
      type: 'accessory',
      accessoryType: selectedAccessory,
    });

  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <h3 style={{ margin: 0 }}>Morea</h3>

      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Configura Morea simple o Morea doble y genera el ensamble por cantidad de puestos.
      </div>

      <div>
        <label>Tipo</label>
        <select
          value={selectedVariant}
          onChange={(e) => setSelectedVariant(String(e.target.value || 'single'))}
          style={{ width: '100%' }}
        >
          <option value="single">Silla simple</option>
          <option value="double">Silla doble</option>
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
        <label>Apoyabrazos izquierdo</label>
        <select
          value={armrestLeft}
          onChange={(e) => setArmrestLeft(String(e.target.value || 'no'))}
          style={{ width: '100%' }}
        >
          {yesNoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Apoyabrazos derecho</label>
        <select
          value={armrestRight}
          onChange={(e) => setArmrestRight(String(e.target.value || 'no'))}
          style={{ width: '100%' }}
        >
          {yesNoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Apoyabrazos intermedio</label>
        <select
          value={armrestCenter}
          onChange={(e) => setArmrestCenter(String(e.target.value || 'no'))}
          style={{ width: '100%' }}
          disabled={selectedQuantity < 2}
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
        onClick={handleCreateSeat}
        style={{
          padding: '8px 12px',
          fontWeight: 'bold',
          background: '#1d4ed8',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Crear silla Morea
      </button>

      {renderDivider('Superficie de giro')}

      <div>
        <label>Superficie de giro</label>
        <select
          value={safeSelectedGiroKey}
          onChange={(e) => setSelectedGiroKey(String(e.target.value || ''))}
          style={{ width: '100%' }}
        >
          {giroAngleOptions.map((option) => (
            <option key={option.key} value={option.key}>
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
        Agregar superficie giro Morea
      </button>

      {renderDivider('Accesorios')}

      <div>
        <label>Tipo de accesorio</label>
        <select
          value={selectedAccessory}
          onChange={(e) => setSelectedAccessory(String(e.target.value || 'armrest-center'))}
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

    </div>
  );
}
