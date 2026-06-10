import { sectionStyle } from './shared/PropertyStyles';
import {
  getClakVariantOptionsByCode,
  isClakPuffVariantPart,
  normalizeClakPuffCode,
} from './clakPuffVariants';

export default function ClakProperties({ part, api, onClose }) {
  if (!isClakPuffVariantPart(part)) return null;

  const currentCode = normalizeClakPuffCode(part?.code);
  const options = getClakVariantOptionsByCode(currentCode) || [];
  if (!options.length) return null;

  async function handleChange(e) {
    const targetCode = e.target.value;
    if (!targetCode || targetCode === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(part.instanceId, currentCode, targetCode);
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Tamaño</div>
      <select
        value={currentCode}
        onChange={handleChange}
        style={{
          width: '100%',
          padding: '7px 8px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          background: '#fff',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
