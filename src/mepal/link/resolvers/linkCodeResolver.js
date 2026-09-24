import { LINK_CATALOG } from '../catalog/linkCatalog.js';
import { LINK_FINISH_CODES } from '../catalog/linkFinishCatalog.js';
import { isLinkLeader } from '../rules/linkConfigRules.js';
const ceiling = (value, options) => options.find(n => n >= value);
export function resolveLinkCodes(c) {
  const leader = isLinkLeader(c.type);
  const width = ceiling(c.widthMm,leader ? [1500,1650,1800] : [1200,1500,1800]);
  const depth = ceiling(c.depthMm,[600,750]);
  const idx = [1200,1500,1800].indexOf(width) + (depth === 750 ? 3 : 0);
  const beamNominal = ceiling(c.widthMm - (leader && c.cableAccess === 'grommet' ? 150 : 0),[1200,1350,1500,1650,1800]);
  const chrome = c.supportFinish === 'CROMADO', double = c.type === 'doble';
  const support = double ? (chrome ? {600:'22000033672',750:'22000033673'} : LINK_CATALOG.supports.doble)
    : (chrome ? {600:'22000033678',750:'22000033679'} : LINK_CATALOG.supports.sencillo);
  const intermediate = double ? (chrome ? {600:'22000033676',750:'22000033677'} : {600:'22000032439',750:'22000032440'})
    : (chrome ? {600:'22000033680',750:'22000033681'} : {600:'22000032443',750:'22000032444'});
  return {
    surface: leader ? (c.finishId === 'FORMICA_25' ? LINK_FINISH_CODES.leader25 : LINK_CATALOG.leader)[depth][width]
      : LINK_FINISH_CODES[c.surfaceMode][c.finishId][idx],
    support: c.tipoCostado === 'RECT' ? support[depth] : null,
    intermediateSupport: c.tipoCostado === 'RECT' ? intermediate[depth] : null,
    beam: ({...LINK_CATALOG.beams,1350:'22000032567'})[beamNominal],
    returnSurface: leader ? (c.finishId === 'FORMICA_25' ? LINK_FINISH_CODES.return25 : LINK_CATALOG.returns)[c.side][ceiling(c.returnLengthMm,[900,1000])] : null,
    grommet: c.cableAccess !== 'grommet' ? null : leader ? (c.grommetFinish === 'PAINTED' ? '22000126725':'22000126724') : (c.grommetFinish === 'PAINTED' ? '22000116523':'22000023626'),
    duct: c.hasDuct ? (double ? {1200:'22000021976',1500:'22000021977',1800:'22000021978'} : {1200:'22000021979',1500:'22000021980',1800:'22000021981'})[ceiling(c.widthMm,[1200,1500,1800])] : null,
    pedestal: null, billingWidthMm:width, billingDepthMm:depth, beamNominalMm:beamNominal,
  };
}
