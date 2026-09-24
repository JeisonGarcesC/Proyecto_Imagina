import { LINK_SUPPORT_SHAPES, getLinkFinishOptions } from './linkSurfaceFinishOptions.js';
const booleans=['grommet','hasOutletBox','floorDuct','coverLeft','coverRight','removed','pedestal'];
const sides=['LEFT','CENTER','RIGHT'];
export function normalizeLinkComponentConfig(value={},type='sencillo') {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Propiedades LINK inválidas.');
  const result={};
  for(const key of booleans)if(Object.hasOwn(value,key)){if(typeof value[key]!=='boolean')throw new Error('Propiedad LINK inválida: '+key);result[key]=value[key];}
  const options={shape:LINK_SUPPORT_SHAPES.map(s=>s.value),supportFinish:['PINTADO','CROMADO'],grommetFinish:['ALUMINIUM','PAINTED'],
    finishId:getLinkFinishOptions(type).map(f=>f.id),floorSide:sides,ceilingSide:['NONE','LEFT','RIGHT'],grommetPosition:sides};
  for(const [key,allowed] of Object.entries(options))if(Object.hasOwn(value,key)){
    if(!allowed.includes(value[key]))throw new Error('Propiedad LINK inválida: '+key);result[key]=value[key];
  }
  return result;
}
export function normalizeLinkComponents(input={},type='sencillo') {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Componentes LINK inválidos.');
  const result={};
  for(const [key,value] of Object.entries(input)) {
    if(!/^[a-z][a-z0-9-]*$/.test(key)||key.length>100)throw new Error('Identificador LINK inválido.');
    result[key]=normalizeLinkComponentConfig(value,type);
  }
  return result;
}
export function linkComponentConfig(config,key,defaults={}) {return {...defaults,...(config.components?.[key]||{})};}

