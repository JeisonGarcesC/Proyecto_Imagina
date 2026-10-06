import KuoAVConfigEditor from './shared/KuoAVConfigEditor.jsx';
import { isKuoAVDobleEditablePart } from './KuoAVDobleProperties';

export function isKuoAVEditablePart(part) {
  if (!part || isKuoAVDobleEditablePart(part)) return false;
  const instanceId = String(part.instanceId || part.userData?.instanceId || '');
  const parentAssemblyId = String(part.parentAssemblyId || part.userData?.parentAssemblyId || '');
  return (
    part.kind === 'KUO_AV_ASSEMBLY' ||
    part.userData?.kind === 'KUO_AV_ASSEMBLY' ||
    part.parent?.userData?.kind === 'KUO_AV_ASSEMBLY' ||
    instanceId.startsWith('KUOAV_') ||
    parentAssemblyId.startsWith('KUOAV_')
  );
}

export default function KuoAVProperties({ part, api }) {
  if (!isKuoAVEditablePart(part)) return null;
  return <KuoAVConfigEditor part={part} api={api} />;
}
