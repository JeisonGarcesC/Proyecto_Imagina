import { linkPart } from './linkParts.js';
import { resolveLinkCredenzaExe } from '../rules/linkCredenzaExeRules.js';

export function createCredenzaExe(config) {
  const r = resolveLinkCredenzaExe(config);
  const description = `LINK credenza ${r.reference} ${r.label} ${config.side} ${config.credenzaLengthMm / 10} cm`;
  return linkPart('CREDENZA', 'credenza-0', [r.widthMm, r.heightMm, r.depthMm], [0, r.heightMm / 2, 0], r.code, description, {
    materialRole: 'pedestal',
    materialBase: 'FORMICA',
    model: { kind: 'glb', src: r.modelSrc, exactSize: true },
    provisional: !r.code,
    meta: { category: 'credenzas', tipoPuesto: 'credenza', reference: r.reference, modelLabel: r.label, side: config.side, lengthMm: config.credenzaLengthMm },
  });
}
