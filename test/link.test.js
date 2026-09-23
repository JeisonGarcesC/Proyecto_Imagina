import { Raycaster } from 'three';
import { buildLink } from '../src/mepal/link/builders/LinkBuilder.js';
import { LINK_FINISH_OPTIONS, LINK_SUPPORT_SHAPES } from '../src/mepal/link/catalog/linkFinishCatalog.js';
import { createLinkFinishPatch, reapplyLinkFinishes, getLinkSelectionInfo } from '../src/mepal/link/integration/linkFinishes.js';
import { createLinkComponentPatch } from '../src/mepal/link/integration/linkComponentEditing.js';
import { getLinkPartDimensions } from '../src/mepal/link/parts/linkParts.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Box3, Group, Vector3 } from 'three';
import { LINK_CATALOG, LINK_ACCESSORIES } from '../src/mepal/link/catalog/linkCatalog.js';
import { createLinkInstance } from '../src/mepal/link/factories/createLinkInstance.js';
import { rebuildLinkInstance } from '../src/mepal/link/integration/rebuildLinkInstance.js';
import { getLinkRoot, registerLinkInstance } from '../src/mepal/link/integration/linkRegistration.js';
import { persistLinkComponentTransforms } from '../src/mepal/link/integration/linkComponentIdentity.js';
import { serializeLinkEntity, restoreLinkEntity } from '../src/mepal/link/integration/linkPersistence.js';
import { resolveLinkBOM } from '../src/mepal/link/bom/linkBOM.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';
import { createObjectFromClipboardItem } from '../src/clipboard/clipboardPasteFactory.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, actual + ' != ' + expected);
const surfaces = object => object.children.filter(n => n.userData.componentRole === 'SURFACE');

test('catálogo: códigos LINK documentados y grommet y ducto intermedio disponibles', () => {
  assert.equal(LINK_CATALOG.principal[600][1200], '22000008989');
  assert.equal(LINK_CATALOG.plena[600][1200], '22000029845');
  assert.equal(LINK_CATALOG.leader[600][1500], '22000135011');
  assert.deepEqual(LINK_ACCESSORIES, ['grommet', 'ductoIntermedio']);
});

for (const widthMm of [1200, 1500, 1800]) for (const depthMm of [600, 750]) {
  test('sencillo ' + widthMm + ' × ' + depthMm + ': dimensiones nativas sin pedestal', () => {
    const { object, success } = createLinkInstance({ config: { widthMm, depthMm } });
    assert.ok(success);
    assert.equal(surfaces(object).length, 1);
    const size = new Box3().setFromObject(surfaces(object)[0]).getSize(new Vector3());
    near(size.x, widthMm / 1000); near(size.z, depthMm / 1000); near(size.y, 0.03);
    assert.equal(object.children.filter(n => n.userData.componentRole === 'PEDESTAL').length, 0);
    near(new Box3().setFromObject(object).max.y, 0.74);
  });
  test('doble principal ' + widthMm + ' × ' + depthMm + ': dos superficies y dilatación real de 26 mm', () => {
    const { object } = createLinkInstance({ config: { type: 'doble', widthMm, depthMm } });
    const tops = surfaces(object);
    assert.equal(tops.length, 2);
    const a = new Box3().setFromObject(tops[0]), b = new Box3().setFromObject(tops[1]);
    near(a.max.x - a.min.x, widthMm / 1000);
    near(a.max.z - a.min.z, depthMm / 1000);
    near(b.min.z - a.max.z, 0.026);
    near(b.max.z - a.min.z, (depthMm * 2 + 26) / 1000);
    near(tops[1].rotation.y, Math.PI);
    assert.equal(object.children.filter(n => n.userData.componentRole === 'PEDESTAL').length, 0);
  });
}

for (const depthMm of [600, 750]) test('plena: cada lado mide ' + (depthMm + 13) + ' mm y tiene resolución comercial propia', () => {
  const { object, product } = createLinkInstance({ config: { type: 'doble', depthMm, surfaceMode: 'plena' } });
  const [a, b] = surfaces(object).map(top => new Box3().setFromObject(top));
  near(a.max.z - a.min.z, (depthMm + 13) / 1000);
  near(b.min.z - a.max.z, 0);
  near(b.max.z - a.min.z, (2 * depthMm + 26) / 1000);
  assert.equal(product.codes.surface, LINK_CATALOG.plena[depthMm][1200]);
  assert.notEqual(product.codes.surface, LINK_CATALOG.principal[depthMm][1200]);
});

for (const type of ['lider', 'jefatura']) test(type + ' usa costado de retorno y permite reemplazarlo por pedestal', () => {
  const { object } = createLinkInstance({ config: { type, widthMm: 1500 } });
  assert.equal(surfaces(object).length, 2);
  assert.equal(object.children.some(n => n.userData.componentRole === 'PEDESTAL'), false);
  assert.ok(object.children.find(n => n.userData.componentKey === 'return-support'));
  const [a,b] = surfaces(object).map(top => new Box3().setFromObject(top));
  assert.ok(b.min.z < a.min.z);
  const patch=createLinkComponentPatch(object,'return-support',{pedestal:true});
  const changed=createLinkInstance({config:{...object.userData.config,...patch}});
  const pedestal=changed.object.children.find(n=>n.userData.componentRole==='PEDESTAL');
  assert.ok(pedestal);assert.equal(pedestal.userData.codigoPT,null);assert.equal(changed.object.userData.bomStatus,'PARTIAL');
});

for (const [key, value] of [['pasacable', true], ['ducto', true], ['ductCover', true], ['tipoPasoCable', 'grommet'], ['accessories', ['tapa']]]) {
  test('no disponible: ' + key, () => assert.equal(createLinkInstance({ config: { [key]: value } }).success, false));
}

test('combinaciones inválidas no generan objetos ni se convierten silenciosamente', () => {
  for (const config of [{ widthMm: 1000 }, { depthMm: 1226 }, { type: 'otro' }, { surfaceMode: 'plena' },
    { type: 'lider', widthMm: 1200 }, { pedestal: true }, { surfaceColor: 'invalid' }]) {
    const result = createLinkInstance({ config }); assert.equal(result.success, false); assert.equal(result.object, null);
  }
});

test('reconstrucción 1200 → 1500 y 600 → 750 conserva raíz, identidad y transformaciones', () => {
  const { object } = createLinkInstance({ config: { type: 'doble' } });
  object.position.set(2, 0, 3); object.rotation.y = 0.45;
  const id = object.uuid, instanceId = object.userData.instanceId;
  const oldGeometry = surfaces(object)[0].children[0].geometry;
  let disposed = false; oldGeometry.addEventListener('dispose', () => { disposed = true; });
  const result = rebuildLinkInstance({ object, patch: { widthMm: 1500, depthMm: 750 } });
  assert.ok(result.success); assert.equal(result.object, object); assert.equal(object.uuid, id);
  assert.equal(object.userData.instanceId, instanceId); assert.deepEqual(object.position.toArray(), [2,0,3]); near(object.rotation.y, 0.45);
  assert.equal(object.userData.dim.depthMm, 1526); assert.equal(object.userData.dim.widthMm, 1500);
  assert.ok(disposed); near(surfaces(object)[0].children[0].geometry.parameters.depth, 0.75);
  const children = [...object.children];
  assert.equal(rebuildLinkInstance({ object, patch: { depthMm: 800 } }).success, false);
  assert.deepEqual(object.children, children);
});

test('BOM doble principal cuenta dos superficies, dos vigas y dos costados, sin duplicar la raíz', () => {
  const { product } = createLinkInstance({ config: { type: 'doble' } });
  const bom = resolveLinkBOM(product);
  assert.deepEqual(bom.rows.map(r => [r.code, r.quantity]), [['22000008989',2], ['22000032566',2], ['22000032435',2]]);
  assert.equal(bom.rows.some(row => /ducto|grommet|pasacable|tapa/i.test(row.description)), false);
});

test('selección de cualquier mesh resuelve raíz única; componentes se registran sin duplicar pickables', () => {
  const instance = createLinkInstance(), parent = new Group(), partsRegistry = [], pickables = [];
  registerLinkInstance({ instance, parent, partsRegistry, pickables });
  registerLinkInstance({ instance, parent, partsRegistry, pickables });
  assert.equal(partsRegistry.length, 1 + instance.object.children.length); assert.equal(pickables.length, 1);
  instance.object.traverse(node => {
    assert.equal(getLinkRoot(node), instance.object);
    if (node === instance.object) assert.equal(node.userData.instanceId, instance.object.userData.instanceId);
    else if (node.userData.componentEntityKind === 'LINK_COMPONENT') {
      assert.equal(node.userData.instanceId, node.userData.componentId);
      assert.equal(node.userData.parentAssemblyId, instance.object.userData.instanceId);
    } else {
      assert.equal(node.userData.instanceId, undefined);
      assert.equal(node.userData.parentAssemblyId, instance.object.userData.instanceId);
    }
  });
  assert.equal(getLinkRoot(new Group()), null);
});

test('cada componente LINK expone una raíz física independiente para mover y eliminar', () => {
  const { object } = createLinkInstance({ config: { type: 'doble', hasDuct: true, cableAccess: 'grommet' } });
  const components = object.children.filter((child) => child.userData.componentKey);
  assert.ok(components.length > 1);
  for (const component of components) {
    assert.match(component.userData.kind, /^LINK_COMPONENT_/);
    assert.equal(component.userData.componentEntityKind, 'LINK_COMPONENT');
    assert.equal(component.userData.isPartRoot, true);
    assert.equal(component.userData.instanceId, component.userData.componentId);
    assert.equal(component.userData.parentAssemblyId, object.userData.instanceId);
    assert.notEqual(component.uuid, object.userData.instanceId);
    component.traverse((node) => {
      if (node !== component) assert.notEqual(node.userData.isPartRoot, true);
    });
  }
});

test('rebuild reconcilia por componentKey y conserva identidad física del componente', () => {
  const instance = createLinkInstance({ config: { type: 'doble' } });
  const parent = new Group(), partsRegistry = [], pickables = [];
  registerLinkInstance({ instance, parent, partsRegistry, pickables });
  const surface = instance.object.children.find(child => child.userData.componentKey === 'surface-0');
  const componentId = surface.userData.componentId;
  const result = rebuildLinkInstance({ object: instance.object, patch: { widthMm: 1500 }, partsRegistry });
  const reconciled = instance.object.children.find(child => child.userData.componentKey === 'surface-0');
  assert.ok(result.success);
  assert.equal(reconciled, surface);
  assert.equal(reconciled.userData.componentId, componentId);
  assert.equal(reconciled.userData.instanceId, componentId);
  assert.equal(partsRegistry.length, 1 + instance.object.children.length);
  assert.equal(pickables.length, 1);
});

test('movimiento individual se guarda como override local y sobrevive rebuild y persistencia', () => {
  const instance = createLinkInstance({ config: { type: 'doble' } });
  const surface = instance.object.children.find(child => child.userData.componentKey === 'surface-0');
  surface.position.x += 0.25;
  surface.position.z -= 0.1;
  persistLinkComponentTransforms([surface]);
  const stored = instance.object.userData.config.componentTransforms['surface-0'];
  near(stored.position[0], 0.25);
  near(stored.position[1], 0);
  near(stored.position[2], -0.1);
  rebuildLinkInstance({ object: instance.object, patch: { depthMm: 750 } });
  const rebuilt = instance.object.children.find(child => child.userData.componentKey === 'surface-0');
  near(rebuilt.position.x, rebuilt.userData.parametricTransform.position[0] + 0.25);
  near(rebuilt.position.z, rebuilt.userData.parametricTransform.position[2] - 0.1);
  const restored = restoreLinkEntity(serializeLinkEntity(instance.object)).object;
  const restoredSurface = restored.children.find(child => child.userData.componentKey === 'surface-0');
  assert.deepEqual(restored.userData.config.componentTransforms['surface-0'], stored);
  near(restoredSurface.position.x, rebuilt.position.x);
  near(restoredSurface.position.z, rebuilt.position.z);
});

test('persistencia real: una entidad LINK_PRODUCT sin SKU ficticio y reconstrucción completa', async () => {
  const { object } = createLinkInstance({ config: { type: 'doble', surfaceMode: 'plena', widthMm: 1800,
    depthMm: 750, surfaceColor: '#abcdef', structureColor: '#123456' },
    transform: { position: [2,0,4], rotation: [0,0.8,0] } });
  const result = serializeProjectEntities([{ obj: object }, ...object.children.map(obj => ({ obj }))]);
  assert.equal(result.entities.length, 1);
  const entity = JSON.parse(JSON.stringify(result.entities[0]));
  assert.equal(entity.kind, 'LINK_PRODUCT'); assert.equal(entity.codigoPT, undefined);
  const loaded = await loadPersistedEntity(entity, { createLink: e => restoreLinkEntity(e).object });
  assert.deepEqual(loaded.userData.config, object.userData.config);
  assert.deepEqual(loaded.position.toArray(), object.position.toArray());
  assert.deepEqual(loaded.quaternion.toArray(), object.quaternion.toArray());
  assert.equal(loaded.userData.instanceId, object.userData.instanceId);
  assert.deepEqual(loaded.userData.bom, object.userData.bom); assert.equal(surfaces(loaded).length, 2);
  assert.throws(() => restoreLinkEntity({}), /LINK_MISSING_CONFIG/);
});

test('materiales por rol permanecen independientes tras guardar/cargar', async () => {
  const loadAsset = loadLinkTestAsset;
  const { object } = createLinkInstance({ config: { type: 'lider', widthMm: 1500,
    components:{'return-support':{pedestal:true}}, surfaceColor: '#abcdef', structureColor: '#123456', pedestalColor: '#654321' }, loadAsset });
  const restoredResult = restoreLinkEntity(serializeLinkEntity(object), { loadAsset });
  await restoredResult.visualsReady;
  const restored = restoredResult.object;
  const colors = new Map();
  restored.traverse(node => { if (node.isMesh) colors.set(node.userData.materialRole, node.material.color.getHexString()); });
  assert.deepEqual(Object.fromEntries(colors), { surface: 'abcdef', structure: '123456', pedestal: '654321' });
});

test('clipboard selecciona constructor LINK y conserva configuración serializable', () => {
  const { object } = createLinkInstance();
  const entity = serializeLinkEntity(object);
  const instruction = createObjectFromClipboardItem({ kind: 'LINK_PRODUCT', type: 'PHYSICAL_OBJECT',
    configuration: { config: entity.config }, transform: entity.transform });
  assert.equal(instruction.constructor, 'ADD_LINK');
  assert.deepEqual(instruction.payload.configuration.config, entity.config);
  const copy = createLinkInstance({ config: instruction.payload.configuration.config }).object;
  assert.notEqual(copy.userData.instanceId, object.userData.instanceId);
});

test('historial global restaura configuración en undo/redo sin reemplazar el objeto', async () => {
  const { object } = createLinkInstance({ config: { type: 'doble' } });
  const before = { ...object.userData.config };
  rebuildLinkInstance({ object, patch: { widthMm: 1500, depthMm: 750 } });
  const after = { ...object.userData.config };
  const history = createHistoryManager({ replayAction: (action, direction) => {
    assert.equal(action.type, HISTORY_ACTION_TYPES.LINK_CONFIG_CHANGE);
    assert.ok(rebuildLinkInstance({ object, patch: direction === 'undo' ? action.before : action.after }).success);
  } });
  history.pushAction({ type: HISTORY_ACTION_TYPES.LINK_CONFIG_CHANGE, before, after });
  await history.undo(); assert.equal(object.userData.dim.depthMm, 1226);
  await history.redo(); assert.equal(object.userData.dim.depthMm, 1526);
});

test('LINK no importa módulos específicos de Koncisa ni de otras líneas', () => {
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (/\.[jt]sx?$/.test(file)) {
        const source = fs.readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /(?:from|import\s*\()\s*['"][^'"]*(?:koncisa|kuo|lockers|vetro|critterium)/i, file);
      }
    }
  }
  inspect(fileURLToPath(new URL('../src/mepal/link', import.meta.url)));
});

test('Jefatura se normaliza a Líder sin perder proyectos previos', () => {
  const a=createLinkInstance({config:{type:'jefatura',widthMm:1500}});
  assert.equal(a.config.type,'lider');
  assert.equal(serializeLinkEntity(a.object).config.type,'lider');
});

for(const type of ['sencillo','doble']) test('cantidad: banco de tres módulos '+type+' con apoyos intermedios',()=>{
  const p=buildLink({type,puestos:3});
  assert.equal(p.parts.filter(x=>x.role==='SURFACE').length,type==='doble'?6:3);
  const supports=p.parts.filter(x=>x.role==='SUPPORT');
  assert.equal(supports.length,4);
  assert.equal(supports[1].code,type==='doble'?'22000032439':'22000032443');
  const object=createLinkInstance({config:p.config}).object;
  near(new Box3().setFromObject(object).getSize(new Vector3()).x,3.6);
  assert.equal(object.userData.dim.widthMm,3600);
});

test('especial conserva medida real y cobra el nominal superior sin tomar reglas Koncisa',()=>{
  const p=buildLink({type:'doble',puestos:2,modoEspecial:true,widthMm:1400,depthMm:700});
  assert.equal(p.codes.billingWidthMm,1500);assert.equal(p.codes.billingDepthMm,750);
  assert.equal(p.codes.surface,'22000008993');assert.equal(p.layout.totalDepthMm,1426);
  assert.equal(p.parts[0].dimensions[0],1400);assert.equal(p.parts[0].dimensions[2],700);
  assert.match(p.parts[0].description,/ESPECIAL/);
  for(const config of [{widthMm:899},{widthMm:1801},{depthMm:599},{depthMm:751}]) {
    assert.equal(createLinkInstance({config:{modoEspecial:true,...config}}).success,false);
  }
});

for(const finish of LINK_FINISH_OPTIONS) test('acabado '+finish.id+' modifica espesor, código y persistencia',()=>{
  const {object,product}=createLinkInstance({config:{finishId:finish.id}});
  const top=surfaces(object)[0];
  near(new Box3().setFromObject(top).getSize(new Vector3()).y,finish.thickMm/1000);
  assert.match(product.codes.surface,/^\d{11}$/);
  assert.equal(restoreLinkEntity(serializeLinkEntity(object)).config.finishId,finish.id);
});

for(const shape of LINK_SUPPORT_SHAPES) test('forma de costado '+shape.value+' usa GLB independiente y estado BOM honesto',()=>{
  const {object,product}=createLinkInstance({config:{tipoCostado:shape.value}});
  const support=object.children.find(x=>x.userData.componentRole==='SUPPORT');
  const supportPart=product.parts.find(x=>x.key===support.userData.componentKey);
  assert.equal(support.children.length,0,'no se fabrica un costado nativo antes de cargar el GLB');
  assert.equal(supportPart.model.kind,'glb');
  assert.match(supportPart.model.src,/\/assets\/models\/koncisaPlus\/.+\.glb$/);
  assert.equal(supportPart.type,'costado');
  assert.equal(Array.isArray(supportPart.dimensions),false);
  assert.deepEqual(Object.keys(supportPart.position),['x','y','z']);
  assert.deepEqual(Object.keys(supportPart.rotation),['x','y','z']);
  assert.equal(object.userData.bomStatus,shape.value==='RECT'?'BASE_COMPONENTS':'PARTIAL');
  if(shape.value!=='RECT')assert.equal(support.userData.codigoPT,null);
});

test('costados cromados resuelven códigos distintos de pintados',()=>{
  assert.equal(buildLink({supportFinish:'CROMADO'}).codes.support,'22000033678');
  assert.equal(buildLink({type:'doble',supportFinish:'CROMADO',depthMm:750}).codes.support,'22000033673');
});

test('grommet perfora cada superficie y participa en BOM sin agregar ductos',()=>{
  const {object,product}=createLinkInstance({config:{type:'doble',puestos:2,cableAccess:'grommet',grommetFinish:'PAINTED'}});
  assert.equal(product.parts.filter(p=>p.role==='GROMMET').length,4);
  assert.equal(object.userData.bom.find(r=>r.code==='22000116523').quantity,4);
  assert.equal(product.parts.some(p=>/ducto/i.test(p.role)),false);
  const surface=surfaces(object)[0],part=product.parts.find(p=>p.key===surface.userData.componentKey);
  const origin=surface.localToWorld(new Vector3(0,1,part.grommetHole.zMm/1000));
  const ray=new Raycaster(origin,new Vector3(0,-1,0));
  assert.equal(ray.intersectObject(surface,true).length,0,'centro del grommet realmente vacío');
  origin.x+=0.4;ray.set(origin,new Vector3(0,-1,0));
  assert.ok(ray.intersectObject(surface,true).length>0,'resto de la superficie intacto');
});

test('acabados generales por parte/grupo/todo se guardan y reconstruyen sin materiales en JSON',()=>{
  const instance=createLinkInstance({config:{type:'doble'}}),o=instance.object;
  const a=surfaces(o)[0].children[0];
  const patch=createLinkFinishPatch(o,a,'COLOR-TEST','GROUP');
  rebuildLinkInstance({object:o,patch});
  const applied=[];
  const applyFinishes=root=>reapplyLinkFinishes(root,new Map([['COLOR-TEST',{color:'#abcdef'}]]),(child,code)=>applied.push([child.userData.componentKey,code]));
  applyFinishes(o);assert.equal(applied.length,2);
  const info=getLinkSelectionInfo(o,surfaces(o)[0].children[0]);
  assert.equal(info.code,'22000008989');assert.equal(info.materialCode,'COLOR-TEST');assert.equal(info.dimMm.thickMm,30);
  const e=JSON.parse(JSON.stringify(serializeLinkEntity(o)));
  const restored=restoreLinkEntity(e,{applyFinishes}).object;
  assert.equal(restored.userData.config.finishAssignments['role:SURFACE'],'COLOR-TEST');
  assert.equal(applied.length,4);
  const clear=createLinkFinishPatch(restored,surfaces(restored)[0].children[0],null,'PART');
  rebuildLinkInstance({object:restored,patch:clear,applyFinishes});
  assert.equal(surfaces(restored)[0].userData.materialCode,null);
  assert.equal(surfaces(restored)[1].userData.materialCode,'COLOR-TEST');
  const all=createLinkFinishPatch(restored,null,'ALL-TEST','ALL');
  assert.deepEqual(all.finishAssignments,{'*':'ALL-TEST'});
});

test('edición conserva cantidad, especial, acabado, costado y grommet después de guardar/cargar',()=>{
  const {object}=createLinkInstance();
  const result=rebuildLinkInstance({object,patch:{type:'doble',puestos:4,modoEspecial:true,widthMm:1400,depthMm:700,
    finishId:'FORMICA_25',tipoCostado:'O',cableAccess:'grommet',grommetFinish:'PAINTED'}});
  assert.ok(result.success);
  const loaded=restoreLinkEntity(serializeLinkEntity(object)).object;
  assert.deepEqual(loaded.userData.config,object.userData.config);
  assert.equal(surfaces(loaded).length,8);
});

for (const [type, codes] of [['sencillo',['22000021979','22000021980','22000021981']],['doble',['22000021976','22000021977','22000021978']]]) {
  test('ducto '+type+': códigos LINK, cantidades y espacio en extremos según mapa', () => {
    for (const [index,widthMm] of [1200,1500,1800].entries()) {
      const {product,object}=createLinkInstance({config:{type,widthMm,puestos:3,hasDuct:true,cableAccess:'grommet'}});
      const ducts=product.parts.filter(p=>p.role==='DUCT');
      assert.equal(ducts.length,3);
      assert.ok(ducts.every(p=>p.code===codes[index]));
      assert.deepEqual(ducts.map(p=>p.dimensions[0]),[widthMm-25,widthMm,widthMm-25]);
      near(ducts[0].position[0]-ducts[0].dimensions[0]/2,-widthMm*1.5+25);
      near(ducts[2].position[0]+ducts[2].dimensions[0]/2,widthMm*1.5-25);
      assert.equal(object.userData.bom.find(row=>row.code===codes[index]).quantity,3);
      assert.ok(object.userData.bom.every(row=>!['22000132408','22000132409','22000132410'].includes(row.code)));
    }
  });
}

test('ductos especiales/líder conservan medidas reales y SKU LINK nominal superior',()=>{
  const special=buildLink({type:'doble',modoEspecial:true,widthMm:1400,hasDuct:true});
  assert.equal(special.codes.duct,'22000021977');
  assert.equal(special.parts.find(p=>p.role==='DUCT').dimensions[0],1350);
  const leader=buildLink({type:'lider',widthMm:1650,hasDuct:true});
  assert.equal(leader.codes.duct,'22000021981');
  assert.equal(leader.parts.filter(p=>p.role==='DUCT').length,1);
  const {object}=createLinkInstance({config:special.config});
  assert.deepEqual(restoreLinkEntity(serializeLinkEntity(object)).object.userData.bom,object.userData.bom);
  assert.equal(createLinkInstance({config:{hasDuct:'true'}}).success,false);
});

async function loadLinkTestAsset(src) {
  const {GLTFLoader}=await import('three-stdlib');
  const b=fs.readFileSync(fileURLToPath(new URL('../public'+src,import.meta.url)));
  return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;
}

test('GLB reales de Koncisa se adaptan conservando selección, BOM, dimensiones y acabados LINK',async()=>{
  const assets=new Map();
  const loadAsset=async src=>{
    if(!assets.has(src))assets.set(src,await loadLinkTestAsset(src));
    return assets.get(src);
  };
  const callbacks=[];
  const applyFinishes=root=>{
    callbacks.push(root);
    reapplyLinkFinishes(root,new Map(),child=>child.traverse(node=>{if(node.isMesh)node.material.color.set('#abcdef');}));
  };
  const instance=createLinkInstance({config:{type:'doble',puestos:2,hasDuct:true,cableAccess:'grommet',
    finishAssignments:{'role:DUCT':'TEST'}},loadAsset,applyFinishes});
  const before=JSON.stringify(instance.object.userData.bom);
  const results=await instance.visualsReady;
  assert.equal(results.length,instance.product.parts.filter(part=>part.model?.kind==='glb'&&part.model?.src).length);assert.ok(results.every(r=>r.status==='READY'));
  assert.equal(JSON.stringify(instance.object.userData.bom),before);
  for(const part of instance.product.parts.filter(p=>p.model?.kind==='glb'&&p.model?.src)) {
    const component=instance.object.children.find(c=>c.userData.componentKey===part.key);
    assert.equal(component.userData.visualSource,'GLB');
    const box=new Box3().setFromObject(component),size=box.getSize(new Vector3());
    const dimensions=getLinkPartDimensions(part);
    near(size.x,(dimensions[0]+(part.role==='GROMMET'?2:0))/1000);
    if(part.role==='DUCT') {near(size.y,dimensions[1]/1000);near(size.z,dimensions[2]/1000);}
    component.traverse(node=>{
      assert.equal(node.userData.line,'LINK');
      assert.equal(node.userData.codigoPT,part.code);
      assert.equal(getLinkRoot(node),instance.object);
      if(node.isMesh&&part.role==='DUCT')assert.equal(node.material.color.getHexString(),'abcdef');
    });
  }
  assert.equal(callbacks.at(-1),instance.object);
  // Loading/cloning does not modify or dispose cached source geometry.
  const source=assets.get('/assets/models/koncisaPlus/2KSO326000_120.glb');
  near(new Box3().setFromObject(source).getSize(new Vector3()).x,1.1980098485946655);
  const restored=restoreLinkEntity(serializeLinkEntity(instance.object),{loadAsset,applyFinishes});
  assert.ok((await restored.visualsReady).every(r=>r.status==='READY'));
  assert.deepEqual(restored.config,instance.config);
  const result=rebuildLinkInstance({object:instance.object,patch:{widthMm:1500},loadAsset,applyFinishes});
  await result.visualsReady;
  assert.equal(callbacks.at(-1),instance.object,'callback apunta a la raíz persistente tras mover los componentes');
});

test('carga tardía de GLB no resucita componentes eliminados al editar',async()=>{
  const asset=await loadLinkTestAsset('/assets/models/koncisaPlus/2KSO326000_120.glb');
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  const instance=createLinkInstance({config:{hasDuct:true},loadAsset:()=>pending});
  const old=instance.object.children.find(c=>c.userData.componentRole==='DUCT');
  rebuildLinkInstance({object:instance.object,patch:{hasDuct:false}});
  release(asset);
  assert.equal((await instance.visualsReady)[0].status,'CANCELLED');
  assert.equal(old.children.length,0,'no se añade GLB al componente retirado');
  assert.equal(instance.object.children.some(c=>c.userData.componentRole==='DUCT'),false);
});

test('fallo de GLB conserva metadatos y BOM LINK sin fabricar un bloque nativo',async()=>{
  const instance=createLinkInstance({config:{hasDuct:true},loadAsset:async()=>{throw Error('asset unavailable');}});
  assert.equal((await instance.visualsReady)[0].status,'FALLBACK');
  const duct=instance.object.children.find(c=>c.userData.componentRole==='DUCT');
  assert.equal(duct.children.length,0);
  assert.equal(duct.userData.codigoPT,'22000021979');
  assert.match(duct.userData.visualError,/asset unavailable/);
});

test('arquitectura LINK separa reglas y piezas estándar del módulo líder',()=>{
  const root=fileURLToPath(new URL('../src/mepal/link',import.meta.url));
  for(const file of [
    'builders/LinkStandardBuilder.js','leader/LinkLeaderBuilder.js','leader/ui/LinkLeaderFields.jsx',
    'parts/superficies.js','parts/costados.js','parts/vigas.js','parts/ductos.js','parts/grommets.js',
    'rules/linkCostadoRules.js','rules/linkVigaRules.js','rules/linkDuctoRules.js',
    'rules/linkFloorDuctRules.js','rules/linkCeilingDuctRules.js','rules/linkDuctCoverRules.js',
  ]) assert.ok(fs.existsSync(path.join(root,file)),file);
  const properties=fs.readFileSync(fileURLToPath(new URL('../src/components/properties/linkCarpetaProperties/LinkProperties.jsx',import.meta.url)),'utf8');
  assert.doesNotMatch(properties,/LinkEditor/);
  assert.match(properties,/LinkDuctProperties/);
  const ductProperties=fs.readFileSync(fileURLToPath(new URL('../src/components/properties/linkCarpetaProperties/LinkDuctProperties.jsx',import.meta.url)),'utf8');
  assert.doesNotMatch(ductProperties,/Tipo de ducto|INDIVIDUAL|TERMINAL|INTERMEDIO/i);
  assert.match(ductProperties,/Tapas ducto/);
  assert.match(ductProperties,/Ducto bajante a piso/);
  assert.match(ductProperties,/Ducto bajante a techo/);
  const koncisaProperties=fs.readFileSync(fileURLToPath(new URL('../src/components/properties/koncisaPlusCarpetaProperties/KoncisaPlusProperties.jsx',import.meta.url)),'utf8');
  assert.match(koncisaProperties,/if \(isLinkPart\(part\)\) return null/);
  assert.match(koncisaProperties,/!part \|\| isLinkPart\(part\)/);
});

test('propiedades contextuales modifican únicamente la pieza seleccionada',()=>{
  const {object}=createLinkInstance({config:{type:'doble'}});
  const patch=createLinkComponentPatch(object,'surface-0',{finishId:'FORMICA_25',grommet:true,grommetFinish:'PAINTED'});
  const changed=createLinkInstance({config:{...object.userData.config,...patch}});
  const first=changed.product.parts.find(part=>part.key==='surface-0');
  const second=changed.product.parts.find(part=>part.key==='surface-1');
  assert.equal(first.dimensions[1],25);assert.ok(first.grommetHole);
  assert.equal(second.dimensions[1],30);assert.equal(second.grommetHole,null);
  assert.throws(()=>createLinkComponentPatch(object,'surface-0',{coverLeft:true}),/no corresponde/);
});

test('ducto intermedio expone tapas y bajantes con reglas LINK por componente',()=>{
  const base=createLinkInstance({config:{type:'doble',hasDuct:true}});
  const patch=createLinkComponentPatch(base.object,'duct-0',{coverLeft:true,coverRight:true,floorDuct:true,
    floorSide:'LEFT',ceilingSide:'RIGHT',supportFinish:'CROMADO'});
  const {product,object}=createLinkInstance({config:{...base.config,...patch}});
  assert.equal(product.parts.filter(part=>part.role==='DUCT_COVER').length,2);
  assert.equal(product.parts.find(part=>part.role==='FLOOR_DUCT').code,'22000119705');
  assert.equal(product.parts.find(part=>part.role==='CEILING_DUCT').code,'22000009983');
  assert.equal(object.userData.bomStatus,'PARTIAL','las tapas no reciben un SKU inventado');
  const duct=object.children.find(child=>child.userData.componentKey==='duct-0');
  assert.equal(duct.userData.meta.tipoModulo,'INTERMEDIO');
});

test('líder independiente ofrece retorno, credenza LINK y edición de sus piezas',()=>{
  const normal=buildLink({type:'lider',widthMm:1500});
  assert.ok(normal.parts.find(part=>part.key==='return-surface'));
  const unionPlates=normal.parts.filter(part=>part.role==='UNION_PLATE');
  assert.equal(unionPlates.length,2);
  assert.ok(unionPlates.every(part=>part.model?.kind==='glb'));
  assert.ok(unionPlates.every(part=>part.model.src==='/assets/models/koncisaPlus/MPR050004.glb'));
  assert.ok(unionPlates.every(part=>part.dimensions[1]===9));
  assert.ok(unionPlates.every(part=>part.position[1]===705));
  const credenza=buildLink({type:'lider',widthMm:1500,leaderCredenza:true,leaderCredenzaLengthMm:1200,side:'derecha'});
  assert.equal(credenza.parts.some(part=>part.key==='return-surface'),false);
  assert.equal(credenza.parts.find(part=>part.role==='CREDENZA').code,'22000044144');
  assert.equal(credenza.parts.find(part=>part.key==='surface-0').code,'22000044163');
  assert.equal(credenza.parts.find(part=>part.key==='beam-0').code,'22000044169');
});

test('láminas de unión líder cargan el GLB de Koncisa con espesor físico de 9 mm',async()=>{
  const instance=createLinkInstance({config:{type:'lider',widthMm:1500},loadAsset:loadLinkTestAsset});
  const results=await instance.visualsReady;
  const unionResults=results.filter(result=>result.key.startsWith('leader-union-'));
  assert.equal(unionResults.length,2);
  assert.ok(unionResults.every(result=>result.status==='READY'));
  for(const key of ['leader-union-0','leader-union-1']) {
    const component=instance.object.children.find(child=>child.userData.componentKey===key);
    assert.equal(component.userData.visualSource,'GLB');
    const size=new Box3().setFromObject(component).getSize(new Vector3());
    near(size.x,0.15);near(size.y,0.009);near(size.z,0.085);
  }
});
