import { inputStyle, labelStyle, sectionStyle } from '../../../../components/properties/shared/PropertyStyles.js';
import {
  DANCER_CIRCULAR_MENU_ID,
  DANCER_DEFAULT_CIRCULAR_PLAN_CODE,
  formatDancerLength,
  getDancerCircularModels,
  getDancerModel,
  getDancerRectangularModels,
  normalizeDancerConfig,
} from '../dancerCatalog.js';

// Campos de configuración de una mesa Dancer. Se usa en el panel izquierdo (con selector de
// modelo) y en Propiedades (sin selector de modelo; solo la superficie de la mesa circular).
export default function DancerConfigFields({
  config,
  onChange,
  disabled = false,
  showModel = true,
}) {
  const model = getDancerModel(config.planCode);
  const isCircular = model.shape === 'circular';
  const canGrow = model.lengthsCm.length > 1;
  const change = (patch) => onChange(normalizeDancerConfig({ ...config, ...patch }));

  const select = (label, value, options, onValueChange) => (
    <label style={labelStyle}>
      {label}
      <select
        style={inputStyle}
        disabled={disabled}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  const modelOptions = [
    ...getDancerRectangularModels().map((item) => ({ value: item.planCode, label: item.label })),
    { value: DANCER_CIRCULAR_MENU_ID, label: 'Mesa circular Ø120' },
  ];

  return (
    <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div style={sectionStyle}>
        {showModel &&
          select(
            'Mesa',
            isCircular ? DANCER_CIRCULAR_MENU_ID : model.planCode,
            modelOptions,
            (value) =>
              change({
                planCode:
                  value === DANCER_CIRCULAR_MENU_ID
                    ? isCircular
                      ? config.planCode
                      : DANCER_DEFAULT_CIRCULAR_PLAN_CODE
                    : value,
              })
          )}
        {isCircular &&
          select(
            'Superficie',
            model.planCode,
            getDancerCircularModels().map((item) => ({ value: item.planCode, label: item.label })),
            (value) => change({ planCode: value })
          )}
        {canGrow &&
          select(
            'Largo',
            String(config.lengthCm),
            model.lengthsCm.map((value) => ({ value: String(value), label: formatDancerLength(value) })),
            (value) => change({ lengthCm: Number(value) })
          )}
        {!canGrow && !isCircular && (
          <div style={{ fontSize: 11 }}>Largo fijo: {formatDancerLength(model.nominalLengthCm)}.</div>
        )}
        {isCircular && <div style={{ fontSize: 11 }}>Diámetro fijo: 1.2 m.</div>}
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={config.vertebra === true}
            onChange={(e) => change({ vertebra: e.target.checked })}
          />{' '}
          Incluir vertebra
        </label>
        {config.vertebra && (
          <div style={{ fontSize: 11 }}>
            {model.vertebraCount > 1
              ? `Incluye ${model.vertebraCount} vertebras: una en la mesa rectangular y otra en la mesa circular.`
              : 'La vertebra se ubica en el círculo central bajo la mesa.'}
          </div>
        )}
      </div>
    </fieldset>
  );
}
