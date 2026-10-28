import { useState, useEffect } from 'react';
import { sectionStyle } from './shared/PropertyStyles';
import {
  getClakVariantOptionsByCode,
  isClakPuffVariantPart,
  normalizeClakPuffCode,
  isMatrixCode,
  getMatrixVariantByCode,
  getMatrixCodeFor,
  isSeatCode,
  getSeatVariantByCode,
  getSeatCodeFor,
  isModuleCode,
  getModuleVariantByCode,
  getModuleCodeFor,
  getClakScalableFamily,
  getClakStandardLengthByCode,
  getClakSpecialDimensionOptions,
  resolveClakBillingTier,
} from './clakPuffVariants';

export default function ClakProperties({ part, api, onClose }) {
  const isClak = isClakPuffVariantPart(part);
  const currentCode = normalizeClakPuffCode(part?.code || part?.userData?.codigoPT);
  const scalableInfo = getClakScalableFamily(currentCode);
  const isScalable = Boolean(scalableInfo);

  const initialIsSpecial = Boolean(part?.isSpecial || part?.userData?.isSpecial);
  const initialSpecialLength =
    part?.specialLength ||
    part?.userData?.specialLength ||
    getClakStandardLengthByCode(currentCode) ||
    scalableInfo?.min ||
    60;

  const [isSpecial, setIsSpecial] = useState(initialIsSpecial);
  const [specialLength, setSpecialLength] = useState(initialSpecialLength);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const special = Boolean(part?.isSpecial || part?.userData?.isSpecial);
    setIsSpecial(special);
    const len =
      part?.specialLength ||
      part?.userData?.specialLength ||
      getClakStandardLengthByCode(currentCode) ||
      scalableInfo?.min ||
      60;
    setSpecialLength(len);
  }, [
    part?.instanceId,
    part?.code,
    part?.isSpecial,
    part?.specialLength,
    part?.userData?.isSpecial,
    part?.userData?.specialLength,
    currentCode,
    scalableInfo?.min,
  ]);

  if (!isClak) return null;

  const matrixInfo = isMatrixCode(currentCode) ? getMatrixVariantByCode(currentCode) : null;
  const seatInfo = isSeatCode(currentCode) ? getSeatVariantByCode(currentCode) : null;
  const moduleInfo = isModuleCode(currentCode) ? getModuleVariantByCode(currentCode) : null;
  const options = matrixInfo || seatInfo || moduleInfo ? null : getClakVariantOptionsByCode(currentCode) || [];

  if (!matrixInfo && !seatInfo && !moduleInfo && (!options || !options.length)) return null;

  const resolvedInstanceId = part?.instanceId || part?.userData?.instanceId;

  async function handleChange(e) {
    const targetCode = e.target.value;
    if (!targetCode || targetCode === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(resolvedInstanceId, currentCode, targetCode);
    onClose?.();
  }

  async function handleToggleSpecial(checked) {
    if (isUpdating) return;
    setIsUpdating(true);
    setIsSpecial(checked);
    try {
      if (api?.swapClakSpecial) {
        const len = checked ? specialLength : null;
        await api.swapClakSpecial(resolvedInstanceId, {
          isSpecial: checked,
          specialLengthCm: len,
          targetCode: currentCode,
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
    setSpecialLength(nextLen);
    try {
      if (api?.swapClakSpecial) {
        await api.swapClakSpecial(resolvedInstanceId, {
          isSpecial: true,
          specialLengthCm: nextLen,
        });
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function swapMatrixVariant(nextHeight, nextWidth, nextGrommet) {
    const target = getMatrixCodeFor(nextHeight, nextWidth, nextGrommet);
    if (!target || target === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(resolvedInstanceId, currentCode, target);
    onClose?.();
  }

  async function handleMatrixHeightChange(e) {
    const nextHeight = String(e.target.value || '').trim();
    await swapMatrixVariant(nextHeight, matrixInfo.width, matrixInfo.grommet);
  }

  async function handleMatrixWidthChange(e) {
    const nextWidth = String(e.target.value || '').trim();
    await swapMatrixVariant(matrixInfo.height, nextWidth, matrixInfo.grommet);
  }

  async function handleMatrixGrommetChange(e) {
    const nextGrommet = e.target.value === 'true';
    await swapMatrixVariant(matrixInfo.height, matrixInfo.width, nextGrommet);
  }

  // Seat-specific handlers
  async function handleSeatGrommetChange(e) {
    const grommet = e.target.value === 'true';
    const size = seatInfo.size;
    const target = getSeatCodeFor(grommet, size);
    if (!target || target === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(resolvedInstanceId, currentCode, target);
    onClose?.();
  }

  async function handleSeatSizeChange(e) {
    const size = e.target.value;
    const grommet = seatInfo.grommet;
    const target = getSeatCodeFor(grommet, size);
    if (!target || target === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(resolvedInstanceId, currentCode, target);
    onClose?.();
  }

  // Module-specific handlers
  async function handleModuleWidthChange(e) {
    const width = Number(e.target.value);
    const height = moduleInfo.height;
    const target = getModuleCodeFor(width, height);
    if (!target || target === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(resolvedInstanceId, currentCode, target);
    onClose?.();
  }

  async function handleModuleHeightChange(e) {
    const height = Number(e.target.value);
    const width = moduleInfo.width;
    const target = getModuleCodeFor(width, height);
    if (!target || target === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(resolvedInstanceId, currentCode, target);
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      {matrixInfo ? (
        <>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Alto</div>
          <select
            value={String(matrixInfo.height)}
            onChange={handleMatrixHeightChange}
            style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="0.71">0.71 m</option>
            <option value="0.97">0.97 m</option>
          </select>

          <div style={{ height: 8 }} />

          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Ancho</div>
          <select
            value={String(matrixInfo.width)}
            onChange={handleMatrixWidthChange}
            style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="1.5">1.5 m</option>
            <option value="1.8">1.8 m</option>
          </select>

          <div style={{ height: 8 }} />

          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Grommet</div>
          <select
            value={String(!!matrixInfo.grommet)}
            onChange={handleMatrixGrommetChange}
            style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </>
      ) : seatInfo ? (
        <>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Grommet</div>
          <select
            value={String(!!seatInfo.grommet)}
            onChange={handleSeatGrommetChange}
            style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="true">Con grommet</option>
            <option value="false">Sin grommet</option>
          </select>

          <div style={{ height: 8 }} />

          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Medida</div>
          <select
            value={String(seatInfo.size)}
            onChange={handleSeatSizeChange}
            style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="150">150cm</option>
            <option value="180">180cm</option>
          </select>
        </>
      ) : moduleInfo ? (
        <>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Alto</div>
          <select
            value={String(moduleInfo.width)}
            onChange={handleModuleWidthChange}
            style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value={174}>174cm</option>
            <option value={200}>200cm</option>
          </select>

          <div style={{ height: 8 }} />

          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Ancho</div>
          <select
            value={String(moduleInfo.height)}
            onChange={handleModuleHeightChange}
            style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value={120}>120cm</option>
            <option value={180}>180cm</option>
          </select>
        </>
      ) : isScalable ? (
        <>
          <div style={{ marginBottom: 12 }}>
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
                {scalableInfo.label}
              </span>
            </label>
          </div>

          {isSpecial ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#374151' }}>
                {scalableInfo.label} (cm)
              </div>
              <select
                value={specialLength}
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
                {getClakSpecialDimensionOptions(currentCode).map((opt) => (
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
                {resolveClakBillingTier(scalableInfo, specialLength)?.lengthCm} cm).
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: '#374151' }}>
                Tamaño estándar
              </div>
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
          )}
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

