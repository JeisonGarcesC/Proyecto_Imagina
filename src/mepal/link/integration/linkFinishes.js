// Generic material creation is injected by ThreeCanvas; this module stores only codes.
export function resolveLinkFinishCode(config, component) {
  const assignments=config.finishAssignments || {}, d=component.userData || component;
  for(const key of ['component:'+d.componentKey,'role:'+d.componentRole,'*']) {
    if(Object.hasOwn(assignments,key))return assignments[key] || null;
  }
  return null;
}
export function createLinkFinishPatch(object, selectedNode, code, scope='PART') {
  const data=selectedNode?.userData || {}, assignments={...object.userData.config.finishAssignments};
  const key=scope==='ALL'||!data.componentKey ? '*' : scope==='GROUP' ? 'role:'+data.componentRole : 'component:'+data.componentKey;
  if(key==='*') for(const previous of Object.keys(assignments))delete assignments[previous];
  else if(scope==='GROUP') {
    for(const child of object.children) if(child.userData.componentRole===data.componentRole)delete assignments['component:'+child.userData.componentKey];
  }
  assignments[key]=code ? String(code):'';
  return {finishAssignments:assignments};
}
export function reapplyLinkFinishes(object, materialsByCode, applyMaterial) {
  for(const child of object.children) {
    const code=resolveLinkFinishCode(object.userData.config,child);
    child.userData.materialCode=code;
    child.traverse(node=>{node.userData.materialCode=code;});
    if(code)applyMaterial(child,code,materialsByCode?.get?.(code) || {});
  }
}
export function getLinkSelectionInfo(object, node) {
  const d=node?.userData?.componentKey ? node.userData : object.userData;
  const materialCode=resolveLinkFinishCode(object.userData.config,d);
  return {code:d.codigoPT || null,description:d.description,dimMm:d.dim || object.userData.dim,
    materialBase:d.materialBase || null,materialCode,subMaterialCode:materialCode,
    componentRole:d.componentRole || null,componentKey:d.componentKey || null,
    componentConfig:d.componentConfig || null,configTargetKey:d.configTargetKey || d.componentKey || null,
    leaderRole:d.leaderRole || null,meta:d.meta || null,
    subName:d.componentKey ? d.description:null,config:object.userData.config,kind:'LINK_PRODUCT',line:'LINK'};
}
