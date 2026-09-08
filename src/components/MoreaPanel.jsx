import { useMemo, useState } from 'react';
import { MOREA_BUILDER_TUNE } from '../mepal/morea/config/moreaTunables.js';

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
    key: 'HSU060000_INV_120',
    code: 'HSU060000',
    modelTag: 'HSU060000',
    angle: 120,
    variant: 'single',
    useGrommet: false,
    label: 'Superficie Curva Morea 120° (Invertida)',
  },
  {
    key: 'HSU020000_INV_135',
    code: 'HSU020000',
    modelTag: 'HSU020000',
    angle: 135,
    variant: 'single',
    useGrommet: false,
    label: 'Superficie Curva Morea 135° (Invertida)',
  },
  {
    key: 'HSU030000_INV_270',
    code: 'HSU030000',
    modelTag: 'HSU030000',
    angle: 270,
    variant: 'single',
    useGrommet: false,
    label: 'Superficie Curva Morea 270° (Invertida)',
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

export default function MoreaPanel({ onCreate, catalogByCode }) {
  const quantityOptions = useMemo(
    () => Array.from({ length: MOREA_BUILDER_TUNE.MAX_PUESTOS }, (_unused, index) => index + 1),
    []
  );
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState('single');
  const [selectedGiroKey, setSelectedGiroKey] = useState('HSU020000');

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

  const handleCreateSeat = () =>
    onCreate?.({
      type: 'seat',
      quantity: selectedQuantity,
      variant: selectedVariant,
    });

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

      <div style={{ height: 1, background: '#e5e7eb', margin: '6px 0 2px 0' }} />

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
    </div>
  );
}
