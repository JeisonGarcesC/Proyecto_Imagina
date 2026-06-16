import { sectionStyle } from './shared/PropertyStyles';
import {
  getClakVariantOptionsByCode,
  isClakPuffVariantPart,
  normalizeClakPuffCode,
  isSeatCode,
  getSeatVariantByCode,
  getSeatCodeFor,
  isModuleCode,
  getModuleVariantByCode,
  getModuleCodeFor,
} from './clakPuffVariants';

export default function ClakProperties({ part, api, onClose }) {
  if (!isClakPuffVariantPart(part)) return null;

  const currentCode = normalizeClakPuffCode(part?.code);
  const seatInfo = isSeatCode(currentCode) ? getSeatVariantByCode(currentCode) : null;
  const moduleInfo = isModuleCode(currentCode) ? getModuleVariantByCode(currentCode) : null;
  const options = seatInfo || moduleInfo ? null : getClakVariantOptionsByCode(currentCode) || [];
  if (!seatInfo && !moduleInfo && !options.length) return null;

  async function handleChange(e) {
    const targetCode = e.target.value;
    if (!targetCode || targetCode === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(part.instanceId, currentCode, targetCode);
    onClose?.();
  }

  // Seat-specific handlers
  async function handleSeatGrommetChange(e) {
    const grommet = e.target.value === 'true';
    const size = seatInfo.size;
    const target = getSeatCodeFor(grommet, size);
    if (!target || target === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(part.instanceId, currentCode, target);
    onClose?.();
  }

  async function handleSeatSizeChange(e) {
    const size = e.target.value;
    const grommet = seatInfo.grommet;
    const target = getSeatCodeFor(grommet, size);
    if (!target || target === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(part.instanceId, currentCode, target);
    onClose?.();
  }

  // Module-specific handlers
  async function handleModuleWidthChange(e) {
    const width = Number(e.target.value);
    const height = moduleInfo.height;
    const target = getModuleCodeFor(width, height);
    if (!target || target === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(part.instanceId, currentCode, target);
    onClose?.();
  }

  async function handleModuleHeightChange(e) {
    const height = Number(e.target.value);
    const width = moduleInfo.width;
    const target = getModuleCodeFor(width, height);
    if (!target || target === currentCode) return;
    if (!api?.swapClakVariant) return;
    await api.swapClakVariant(part.instanceId, currentCode, target);
    onClose?.();
  }

  return (
    <div style={sectionStyle}>
      {seatInfo ? (
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
