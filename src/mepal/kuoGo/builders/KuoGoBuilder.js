// src/mepal/kuoGo/builders/KuoGoBuilder.js
import { v4 as uuidv4 } from 'uuid';
import { buildGLBPath } from '../config/kuoGoTunables';
import { KUOGO_MODELOS } from '../parts/kuoGoParts';

export function buildKuoGo(config = {}) {
  const { 
    tipoKey = 'Kume200000', 
    espesor = 'Espesor Formica 18',
    especial = false,
    instanceId,
    groupId: existingGroupId,
  } = config;

  const tipoDef = KUOGO_MODELOS.find(m => m.tipoKey === tipoKey);

  if (!tipoDef) {
    console.warn(`[KuoGoBuilder] Tipo desconocido: "${tipoKey}" — se omite.`);
    return { error: `Modelo Kuo Go desconocido: "${tipoKey}"` };
  }

  const groupId   = existingGroupId || uuidv4();
  const groupName = `KuoGo_${tipoDef.tipoKey}`;

  // Usamos el espesor para resolver el GLB
  const glbPath = buildGLBPath(espesor);

  const parts = [
    {
      instanceId: instanceId || uuidv4(),
      role:       'kuoGo',
      src:        glbPath,
      label:      tipoDef.label,
      tipoKey,
      espesor,
      especial,
      codigo:     tipoDef.tipoKey,
    },
  ];

  console.log(`[KuoGoBuilder] → ${groupName} | GLB: ${glbPath}`);

  return { groupId, groupName, parts };
}

export default buildKuoGo;
