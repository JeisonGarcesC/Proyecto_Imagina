import { useState, useEffect } from 'react';
import { sectionStyle } from './shared/PropertyStyles';
import { ZEN_ALMACENAMIENTO_PEDESTALS } from '../../mepal/link/leader/rules/leaderPedestalRules.js';
import {
  getZenBibliotecaFamily,
  isZenBibliotecaCode,
  getZenSpecialDimensionOptions,
  resolveZenBillingTier,
  ZEN_STANDARD_DIMENSION_OPTIONS,
} from '../../mepal/zen/products/zenVariantDefinition.js';

function normalizeVariantLabel(value) {
  if (!value) return 'base';
  return String(value).replace(/^_+/, '').toLowerCase();
}

export default function AlmacenamientoProperties({ part, api, onClose }) {
  const currentBaseCode = part?.code || part?.codigoPT || '';
  const resolvedInstanceId = part?.instanceId || part?.userData?.instanceId;

  const isPedestal =
    part?.almacenCategory === 'Pedestal' ||
    ZEN_ALMACENAMIENTO_PEDESTALS.some((p) => p.code === currentBaseCode);

  const biblioFamily = getZenBibliotecaFamily(currentBaseCode);
  const isBiblioteca = Boolean(
    biblioFamily ||
    part?.almacenCategory === 'Biblioteca' ||
    isZenBibliotecaCode(currentBaseCode)
  );

  const initialIsSpecial = Boolean(part?.isSpecial || part?.userData?.isSpecial);
  const initialLength =
    part?.specialLength ||
    part?.userData?.specialLength ||
    part?.almacenLength ||
    part?.userData?.almacenLength ||
    60;

  const [isSpecial, setIsSpecial] = useState(initialIsSpecial);
  const [lengthCm, setLengthCm] = useState(initialLength);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const special = Boolean(part?.isSpecial || part?.userData?.isSpecial);
    setIsSpecial(special);
    const len =
      part?.specialLength ||
      part?.userData?.specialLength ||
      part?.almacenLength ||
      part?.userData?.almacenLength ||
      60;
    setLengthCm(len);
  }, [
    part?.instanceId,
    part?.code,
    part?.isSpecial,
    part?.specialLength,
    part?.almacenLength,
    part?.userData?.isSpecial,
    part?.userData?.specialLength,
    part?.userData?.almacenLength,
    currentBaseCode,
  ]);

  if (part?.kind !== 'ALMACENAMIENTO') return null;

  const variants = Array.isArray(part?.almacenVariants) ? part.almacenVariants : [];

  const normalizedOptions = [];
  const seen = new Set();

  variants.forEach((entry) => {
    const val = normalizeVariantLabel(entry?.variant);
    if (seen.has(val)) return;
    seen.add(val);
    normalizedOptions.push(val);
  });

  if (!normalizedOptions.length) normalizedOptions.push('base');

  const current = normalizeVariantLabel(part?.almacenVariant);
  const value = normalizedOptions.includes(current) ? current : normalizedOptions[0];

  if (!isPedestal && !isBiblioteca && normalizedOptions.length <= 1) return null;

  async function handleModelChange(e) {
    const targetCode = e.target.value;
    if (!targetCode || targetCode === currentBaseCode) return;
    if (!api?.swapAlmacenamientoVariant) return;
    await api.swapAlmacenamientoVariant(resolvedInstanceId, targetCode, current || 'base');
    onClose?.();
  }

  async function handleVariantChange(e) {
    const target = e.target.value;
    if (!target || target === current) return;
    if (!api?.swapAlmacenamientoVariant) return;
    await api.swapAlmacenamientoVariant(resolvedInstanceId, currentBaseCode, target);
    onClose?.();
  }

  async function handleToggleSpecial(checked) {
    if (isUpdating) return;
    setIsUpdating(true);
    setIsSpecial(checked);
    try {
      if (api?.swapZenSpecial) {
        const nextLen = checked ? lengthCm : (lengthCm >= 90 ? 90 : 60);
        await api.swapZenSpecial(resolvedInstanceId, {
          isSpecial: checked,
          lengthCm: nextLen,
        });
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSpecialLengthChange(e) {
    if (isUpdating) return;
    const nextLen = Number(e.target.value);
    setIsUpdating(true);
    setLengthCm(nextLen);
    try {
      if (api?.swapZenSpecial) {
        await api.swapZenSpecial(resolvedInstanceId, {
          isSpecial: true,
          lengthCm: nextLen,
        });
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleStandardLengthChange(e) {
    if (isUpdating) return;
    const nextLen = Number(e.target.value);
    setIsUpdating(true);
    setLengthCm(nextLen);
    try {
      if (api?.swapZenSpecial) {
        await api.swapZenSpecial(resolvedInstanceId, {
          isSpecial: false,
          lengthCm: nextLen,
        });
      }
    } finally {
      setIsUpdating(false);
    }
  }

  const specialOptions = getZenSpecialDimensionOptions(currentBaseCode);

  return (
    <div style={sectionStyle}>
      {isPedestal && (
        <div style={{ marginBottom: normalizedOptions.length > 1 ? 12 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
            Modelo de pedestal Zen
          </div>
          <select
            value={currentBaseCode}
            onChange={handleModelChange}
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
            {ZEN_ALMACENAMIENTO_PEDESTALS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {isBiblioteca && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={isSpecial}
                onChange={(e) => handleToggleSpecial(e.target.checked)}
                style={{ margin: 0, cursor: 'pointer', width: 16, height: 16 }}
              />
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                Biblioteca especial
              </span>
            </label>
          </div>

          {isSpecial ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: '#374151' }}>
                Medida especial (cm)
              </div>
              <select
                value={lengthCm}
                onChange={handleSpecialLengthChange}
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
                {specialOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: '#4b5563',
                  lineHeight: 1.4,
                  background: '#f3f4f6',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid #e5e7eb',
                }}
              >
                Crece de 10 en 10 cm. Se factura al precio del rango superior (
                {resolveZenBillingTier(biblioFamily, lengthCm)?.lengthCm || 90} cm).
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: '#374151' }}>
                Medida
              </div>
              <select
                value={lengthCm >= 90 ? 90 : 60}
                onChange={handleStandardLengthChange}
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
                {ZEN_STANDARD_DIMENSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {normalizedOptions.length > 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Variante</div>
          <select
            value={value}
            onChange={handleVariantChange}
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
            {normalizedOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'base'
                  ? 'Base'
                  : opt === 'cushion'
                    ? 'Cushion (cojín)'
                    : opt === 'lamiante'
                      ? 'Lamiante'
                      : opt}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

