import { normalizeLinkComponentConfig } from '../rules/linkComponentRules.js';
import { buildLink } from '../builders/LinkBuilder.js';
import { LINK_CREDENZA_EXE_LENGTHS, LINK_CREDENZA_EXE_MODELS, LINK_CREDENZA_EXE_SIDES } from '../rules/linkCredenzaExeRules.js';
// Validate a patch against the clicked physical component, never against a second selection state.
export function createLinkComponentPatch(object,componentKey,patch){
  if(object?.userData?.kind!=='LINK_PRODUCT')throw new Error('Selecciona una pieza LINK.');
  const config=object.userData.config;
  const rootKeys=config.type==='lider'?['modoEspecial','widthMm','depthMm','returnLengthMm','returnDepthMm']:['modoEspecial','widthMm','depthMm'];
  if(['sencillo','doble','lider'].includes(config.type)&&Object.keys(patch).some(key=>rootKeys.includes(key))){
    // Medidas del puesto: viven en la configuración raíz (en el líder, de la principal y del retorno) y se valida el rango completo al reconstruir.
    if(Object.keys(patch).some(key=>!rootKeys.includes(key)))throw new Error('Esta propiedad no corresponde a la pieza seleccionada.');
    return {...patch};
  }
  const part=buildLink(config).parts.find(p=>p.key===componentKey);
  if(!part)throw new Error('La pieza LINK seleccionada ya no existe.');
  if((config.type==='credenza'||(config.type==='lider'&&config.leaderCredenza))&&part.role==='CREDENZA'){
    // La credenza (sola o en lugar del retorno del líder): modelo, lado y largo viven en la configuración raíz y se reconstruye en sitio.
    if(Object.keys(patch).some(key=>!['credenzaModel','side','credenzaLengthMm'].includes(key)))throw new Error('Esta propiedad no corresponde a la pieza seleccionada.');
    if(Object.hasOwn(patch,'credenzaModel')&&!LINK_CREDENZA_EXE_MODELS.some(m=>m.value===patch.credenzaModel))throw new Error('Modelo de credenza LINK no válido.');
    if(Object.hasOwn(patch,'side')&&!LINK_CREDENZA_EXE_SIDES.some(s=>s.value===patch.side))throw new Error('Lado de credenza LINK no válido.');
    if(Object.hasOwn(patch,'credenzaLengthMm')&&!LINK_CREDENZA_EXE_LENGTHS.includes(patch.credenzaLengthMm))throw new Error('Largo de credenza LINK no válido.');
    return {...patch};
  }
  const targetKey=part.configTargetKey||part.key;
  const target=buildLink(config).parts.find(p=>p.key===targetKey)||part;
  const role=target.role;
  const allowed=role==='SURFACE'?['finishId','grommet','grommetFinish','grommetPosition',...(config.type==='lider'?['floorDuct','floorSide']:[])]:
    role==='SUPPORT'?['shape','supportFinish',...(target.leaderRole==='MAIN_RETURN_JUNCTION'?['hasOutletBox']:[]),...(target.leaderRole==='RETURN_END'?['pedestal']:[])]:
    role==='DUCT'?['coverLeft','coverRight','floorDuct','floorSide','ceilingSide','supportFinish','removed']:
    role==='PEDESTAL'?['pedestal']:
    role==='PANTALLA_FRONTAL_BOARD'||role==='PANTALLA_LATERAL_BOARD'?['heightMm']:[];
  if(Object.keys(patch).some(key=>!allowed.includes(key)))throw new Error('Esta propiedad no corresponde a la pieza seleccionada.');
  const normalized=normalizeLinkComponentConfig(patch,config.type);
  return {components:{...config.components,[targetKey]:{...config.components?.[targetKey],...normalized}}};
}

