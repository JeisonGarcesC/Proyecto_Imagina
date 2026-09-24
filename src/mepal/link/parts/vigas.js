import { linkPart } from './linkParts.js';
import { resolveLinkViga } from '../rules/linkVigaRules.js';
export function createViga({key,widthMm,position,moduleIndex=0}) {
  const rule=resolveLinkViga(widthMm);
  return linkPart('STRUCTURE',key,[rule.widthMm,rule.heightMm,rule.depthMm],position,rule.code,
    'LINK viga refuerzo nominal '+rule.nominalWidthMm+' mm',{moduleIndex,meta:{category:'vigas'}});
}

