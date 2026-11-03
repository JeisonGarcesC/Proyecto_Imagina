import { useState } from 'react';
import DancerConfigFields from '../../mepal/tekSocial/dancer/ui/DancerConfigFields.jsx';
import { normalizeDancerConfig } from '../../mepal/tekSocial/dancer/dancerCatalog.js';

export function isTekSocialDancerPart(part) {
  return part?.kind === 'MEPAL_TEK_SOCIAL' && Boolean(part?.userData?.tekSocialDancer);
}

export default function TekSocialDancerProperties({ part, api }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!isTekSocialDancerPart(part)) return null;

  const config = normalizeDancerConfig(part.userData.tekSocialDancer);

  async function handleChange(nextConfig) {
    if (busy || !api?.updateTekSocialDancer) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await api.updateTekSocialDancer(part.instanceId, nextConfig);
      if (!result?.success) setMessage(result?.reason || 'No se pudo actualizar la mesa Dancer.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: '#111827' }}>Mesa Dancer</div>
      <DancerConfigFields config={config} onChange={handleChange} disabled={busy} showModel={false} />
      {message && (
        <div role="status" style={{ fontSize: 12 }}>
          {message}
        </div>
      )}
    </div>
  );
}
