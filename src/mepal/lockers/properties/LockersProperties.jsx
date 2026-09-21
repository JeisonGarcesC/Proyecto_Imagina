import { LockerEditor } from '../ui/LockersPanel.jsx';
export default function LockersProperties({ part, api, readOnly }) {
  return <div className="pp-shell"><div className="pp-section"><LockerEditor
    key={`${part.instanceId}:${JSON.stringify(part.config)}`} initialConfig={part.config} editing readOnly={readOnly}
    onApply={config => api?.updateSelectedLocker?.(config)} /></div></div>;
}
