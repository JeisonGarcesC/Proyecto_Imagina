import { useEffect, useState } from 'react';
import KuoAVOptions from '../../KuoAVOptions.jsx';
import { sectionStyle } from './PropertyStyles';

const EMPTY_CONFIG = {};

export default function KuoAVConfigEditor({ part, api, isDoble = false }) {
  const kind = isDoble ? 'KUO_AV_DOBLE_ASSEMBLY' : 'KUO_AV_ASSEMBLY';
  const root = part?.userData?.kind === kind
    ? part
    : part?.parent?.userData?.kind === kind ? part.parent : part;
  const currentConfig = root?.userData?.config || root?.config || part?.config || EMPTY_CONFIG;
  const instanceId = part?.parentAssemblyId || part?.userData?.parentAssemblyId ||
    root?.userData?.instanceId || root?.instanceId || currentConfig.instanceId;
  const [config, setConfig] = useState(currentConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setConfig(currentConfig);
    setError('');
  }, [instanceId, currentConfig]);

  async function updateConfig(changes) {
    const previous = config;
    const next = { ...config, ...changes };
    setConfig(next);
    setSaving(true);
    setError('');
    try {
      const swap = isDoble ? api?.swapKuoAVDobleVariant : api?.swapKuoAVVariant;
      if (typeof swap !== 'function' || !instanceId) {
        throw new Error('No se encontró el puesto Kuo AV para actualizar sus opciones.');
      }
      await swap(instanceId, next);
    } catch (err) {
      console.error('[KuoAVConfigEditor] Error al actualizar el puesto:', err);
      setConfig(previous);
      setError(err.message || 'No se pudo actualizar el puesto Kuo AV.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ ...sectionStyle, padding: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>
        {isDoble ? 'Puesto Doble KUO AV' : 'KUO AV - Superficie Perimetral'}
      </div>
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0 }}>
        <KuoAVOptions config={config} onChange={updateConfig} isDoble={isDoble} />
      </fieldset>
      {saving && <div role="status" style={{ fontSize: 12 }}>Actualizando puesto…</div>}
      {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}
    </div>
  );
}
