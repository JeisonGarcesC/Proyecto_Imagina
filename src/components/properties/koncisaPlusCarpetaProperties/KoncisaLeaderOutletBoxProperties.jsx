import { useState } from 'react';
import { labelStyle, sectionStyle } from '../shared/PropertyStyles.js';

export default function KoncisaLeaderOutletBoxProperties({ part, api }) {
  const config = part?.meta?.componentConfig || {};
  const [floorDuctEnabled, setFloorDuctEnabled] = useState(config.floorDuctEnabled === true);
  const [outletCouplingEnabled, setOutletCouplingEnabled] = useState(
    config.outletCouplingEnabled === true
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function update(patch) {
    setBusy(true);
    setError('');
    try {
      const result = await api?.updateSelectedKoncisaSurface?.(
        part?.meta?.componentKey,
        patch,
        part?.parentAssemblyId
      );
      if (!result?.success) throw new Error(result?.reason || 'No se pudo actualizar la caja.');
      if ('floorDuctEnabled' in patch) setFloorDuctEnabled(patch.floorDuctEnabled);
      if ('outletCouplingEnabled' in patch) setOutletCouplingEnabled(patch.outletCouplingEnabled);
    } catch (cause) {
      setError(cause?.message || 'No se pudo actualizar la caja.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset disabled={busy} style={{ ...sectionStyle, border: 0, minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>Caja de tomas LEADER</div>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={floorDuctEnabled}
          onChange={(event) => update({ floorDuctEnabled: event.target.checked })}
        />{' '}
        Ducto bajante a piso
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={outletCouplingEnabled}
          onChange={(event) => update({ outletCouplingEnabled: event.target.checked })}
        />{' '}
        Acople de caja a pared
      </label>
      {error && (
        <div role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>
          {error}
        </div>
      )}
    </fieldset>
  );
}
