import { useState, useEffect } from 'react';
import { sectionStyle } from './shared/PropertyStyles';
import {
  getEdukVariantByCode,
  getEdukVariantGroupByCode,
  normalizeEdukCode,
} from '../../mepal/eduk/products/edukShelfHeightDefinition';
import {
  isEdukAbatible,
  EDUK_ABATIBLE_PROPERTY_DEFINITIONS,
} from '../../mepal/eduk/products/edukAbatibleDefinition';

export function isEdukShelfEditablePart(part) {
  if (isEdukAbatible(part)) return true;
  if (part?.kind !== 'EDUK') return false;
  return Boolean(getEdukVariantGroupByCode(part?.code || part?.codigoPT));
}

export default function EdukProperties({ part, api, onClose }) {
  if (!isEdukShelfEditablePart(part)) return null;

  const currentAbatible = part?.edukAbatible || part?.userData?.edukAbatible || null;
  const [localAbatible, setLocalAbatible] = useState(currentAbatible);

  useEffect(() => {
    const nextVal = part?.edukAbatible || part?.userData?.edukAbatible || null;
    setLocalAbatible(nextVal);
  }, [part?.instanceId, part?.edukAbatible, part?.userData?.edukAbatible]);

  if (isEdukAbatible(part)) {
    const baseSaved = part?.edukAbatible || part?.userData?.edukAbatible || {};
    const abatibleConfig = {
      width: '120cm',
      depth: '60cm',
      corners: 'curvas',
      ...baseSaved,
      ...(localAbatible || {}),
    };

    const handleAbatibleChange = async (key, val) => {
      const nextConfig = {
        ...abatibleConfig,
        [key]: val,
      };
      setLocalAbatible(nextConfig);
      if (api?.updateEdukAbatible) {
        await api.updateEdukAbatible(part.instanceId, nextConfig);
      }
    };

    return (
      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: '#111827' }}>
          Mesa Abatible Eduk
        </div>
        {EDUK_ABATIBLE_PROPERTY_DEFINITIONS.map((prop, idx) => (
          <div key={prop.key}>
            {idx > 0 && <div style={{ height: 8 }} />}
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{prop.label}</div>
            <select
              value={String(abatibleConfig[prop.key] || prop.options[0].value)}
              onChange={(e) => handleAbatibleChange(prop.key, e.target.value)}
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
              {prop.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

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