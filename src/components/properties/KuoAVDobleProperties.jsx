import KuoAVConfigEditor from './shared/KuoAVConfigEditor.jsx';

export function isKuoAVDobleEditablePart(part) {
  if (!part) return false;
  const instanceId = String(part.instanceId || part.userData?.instanceId || '');
  const parentAssemblyId = String(part.parentAssemblyId || part.userData?.parentAssemblyId || '');
  const kind = String(part.kind || part.userData?.kind || part.parent?.userData?.kind || '');
  return kind === 'KUO_AV_DOBLE_ASSEMBLY' ||
    instanceId.startsWith('KUOAVD_') || parentAssemblyId.startsWith('KUOAVD_');
}

export default function KuoAVDobleProperties({ part, api }) {
  if (!isKuoAVDobleEditablePart(part)) return null;
  return <KuoAVConfigEditor part={part} api={api} isDoble />;
}
