import { normalizeLinkComponentConfig } from '../rules/linkComponentRules.js';
import { buildLink } from '../builders/LinkBuilder.js';
// Validate a patch against the clicked physical component, never against a second selection state.
export function createLinkComponentPatch(object,componentKey,patch){
  if(object?.userData?.kind!=='LINK_PRODUCT')throw new Error('Selecciona una pieza LINK.');
  const config=object.userData.config;
  const part=buildLink(config).parts.find(p=>p.key===componentKey);
  if(!part)throw new Error('La pieza LINK seleccionada ya no existe.');
  const targetKey=part.configTargetKey||part.key;
  const target=buildLink(config).parts.find(p=>p.key===targetKey)||part;
  const role=target.role;
  const allowed=role==='SURFACE'?['finishId','grommet','grommetFinish','grommetPosition',...(config.type==='lider'?['floorDuct','floorSide']:[])]:
    role==='SUPPORT'?['shape','supportFinish',...(target.leaderRole==='MAIN_RETURN_JUNCTION'?['hasOutletBox']:[]),...(target.leaderRole==='RETURN_END'?['pedestal']:[])]:
    role==='DUCT'?['coverLeft','coverRight','floorDuct','floorSide','ceilingSide','supportFinish','removed']:
    role==='PEDESTAL'?['pedestal']:[];
  if(Object.keys(patch).some(key=>!allowed.includes(key)))throw new Error('Esta propiedad no corresponde a la pieza seleccionada.');
  const normalized=normalizeLinkComponentConfig(patch,config.type);
  return {components:{...config.components,[targetKey]:{...config.components?.[targetKey],...normalized}}};
}

