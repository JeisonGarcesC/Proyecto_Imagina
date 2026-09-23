import { normalizeLinkConfig } from '../rules/linkConfigRules.js';
import { resolveLinkCodes } from '../resolvers/linkCodeResolver.js';
import { buildLinkStandard } from './LinkStandardBuilder.js';
import { buildLinkLeader } from '../leader/LinkLeaderBuilder.js';

export function buildLink(config={}){
  const c=normalizeLinkConfig(config);
  const product=c.type==='lider'?buildLinkLeader(c):buildLinkStandard(c);
  if(c.modoEspecial)product.parts.forEach(part=>{if(['SURFACE','SUPPORT','STRUCTURE','DUCT'].includes(part.role))part.description='ESPECIAL · '+part.description;});
  const thickMm=Math.max(...product.parts.filter(p=>p.role==='SURFACE').map(p=>p.dimensions[1]));
  return {...product,config:c,codes:resolveLinkCodes(c),thickMm,productKey:'LINK:'+JSON.stringify(c),
    diagnostics:product.parts.filter(p=>p.provisional).map(p=>p.description)};
}

