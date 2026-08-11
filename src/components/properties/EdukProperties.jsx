import { sectionStyle } from './shared/PropertyStyles';
import {
  getEdukVariantByCode,
  getEdukVariantGroupByCode,
  normalizeEdukCode,
} from '../../mepal/eduk/products/edukShelfHeightDefinition';

export function isEdukShelfEditablePart(part) {
  if (part?.kind !== 'EDUK') return false;
  return Boolean(getEdukVariantGroupByCode(part?.code || part?.codigoPT));
}

export default function EdukProperties({ part, api, onClose }) {
  if (!isEdukShelfEditablePart(part)) return null;

  const currentCode = normalizeEdukCode(part?.code || part?.codigoPT);
  const currentGroup = getEdukVariantGroupByCode(currentCode);
  const currentVariant = getEdukVariantByCode(currentCode);
  if (!currentGroup || !currentVariant) return null;

  async function handlePropertyChange(propertyKey, value) {
    if (!propertyKey) return;
    if (!value || String(value) === String(currentVariant[propertyKey])) return;
    if (!api?.swapEdukVariant) return;
    await api.swapEdukVariant(part.instanceId, currentCode, {
      [propertyKey]: value,
    });
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      {(currentGroup.properties || []).map((property, idx) => (
        <div key={property.key}>
          {idx > 0 && <div style={{ height: 8 }} />}
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>{property.label}</div>
          <select
            value={String(currentVariant[property.key] || '')}
            onChange={(e) => handlePropertyChange(property.key, e.target.value)}
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
            {(property.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}