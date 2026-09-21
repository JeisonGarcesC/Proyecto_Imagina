import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from 'xlsx';
import * as THREE from 'three';
import { lockerDocumentedCatalog } from '../src/mepal/lockers/catalog/lockerDocumentedCatalog.js';
import { lockerBodyCatalog, lockerBayCatalog, LOCKER_COLUMNS } from '../src/mepal/lockers/catalog/lockerCatalog.js';
import { resolveLockerProduct } from '../src/mepal/lockers/resolvers/lockersProductResolver.js';
import { createLockerInstance } from '../src/mepal/lockers/factories/createLockerInstance.js';
import { rebuildLockerInstance } from '../src/mepal/lockers/integration/rebuildLockerInstance.js';
import { registerLockerInstance } from '../src/mepal/lockers/integration/lockerRegistration.js';
import { serializeLockerEntity } from '../src/mepal/lockers/integration/lockerPersistence.js';
import { serializeProjectEntities } from '../src/core/persistence/entitySerializers.js';
import { loadPersistedEntity } from '../src/core/persistence/entityLoaders.js';
import { calculateHandlePosition, getLockerBayWidth } from '../src/mepal/lockers/layout/lockerLayout.js';
import { createLockerBodyGeometry, createLockerAnchorGeometry, createLockerLockGeometry, disposeLockerGeometry } from '../src/mepal/lockers/renderers/LockerNativeRenderer.js';
import { createObjectFromClipboardItem } from '../src/clipboard/clipboardPasteFactory.js';
import { createHistoryManager, HISTORY_ACTION_TYPES } from '../src/history/historyManager.js';

const bays = object => object.children.filter(n => n.userData.componentRole === 'LOCKER_BAY');
const configFor = (body, material, bayCount) => ({ calibre: body.calibre, lockerType: body.type,
  heightMm: body.heightMm, widthMm: body.widthMm, depthMm: body.depthMm, material, bayCount,
  ...(material === 'METALICA_EMBEBIDA' ? { securityType: 'NO_APLICA' } : {}),
  ...(['FORMICA','MELAMINA'].includes(material) ? { punchingType: 'NO_APLICA' } : {}),
});

test('catálogo: cada código y descripción coincide con la celda original, sin ejecutar macros', () => {
  const book=XLSX.read(fs.readFileSync(new URL('../public/assets/MapaProductoYFichasTecnicas/Lockers/ayudaVentasLockers.xlsm',import.meta.url)),{type:'buffer'});
  assert.equal(lockerDocumentedCatalog.length,110);
  assert.equal(lockerBodyCatalog.length,16);
  assert.equal(lockerBayCatalog.length,64);
  for(const row of lockerDocumentedCatalog) {
    const [sheet,cell]=row.source.split('!');
    assert.equal(String(book.Sheets[sheet][cell].v),row.code);
    assert.equal(book.Sheets[sheet][cell.replace('B','C')].v,row.description);
  }
});

for(const body of lockerBodyCatalog) test(`coraza ${body.code}: módulos, materiales, kits 1–4 y BOM`, () => {
  for(const material of ['METALICA','METALICA_EMBEBIDA','FORMICA','MELAMINA']) for(const count of [1,2,3,4]) {
    const config=configFor(body,material,count), result=createLockerInstance({config});
    const inactive=material==='METALICA_EMBEBIDA' && count===1;
    if(inactive) { assert.equal(result.success,false);continue; }
    assert.equal(result.success,true,JSON.stringify(result.diagnostics));
    const root=result.object, columns=LOCKER_COLUMNS[body.type];
    assert.equal(root.userData.codigoPT,body.code);
    assert.equal(bays(root).length,columns*count);
    assert.equal(root.getObjectByName('BODY').children.filter(n=>n.name.startsWith('DIVIDER_')).length,columns-1);
    assert.equal(root.getObjectByName('SHELVES').children.length,columns*(count-1));
    assert.deepEqual(root.scale.toArray(),[1,1,1]);
    assert.equal(root.userData.bom.find(r=>r.role==='BODY').quantity,1);
    assert.equal(root.userData.bom.find(r=>r.role==='BAY_KIT').quantity,columns);
    assert.equal(root.userData.bom.some(r=>r.role==='SHELF'),false);
    assert.equal(root.userData.shape2D.geometry.widthMm,body.widthMm);
    assert.equal(root.getObjectByName('LEFT_SIDE').geometry.parameters.height,body.heightMm/1000);
    root.traverse(node=> { if(node!==root) assert.equal(node.userData.excludeFromBOM,true); });
    disposeLockerGeometry(root);
  }
});

test('sin interpolación ni sustituciones para dimensiones, calibres o materiales desconocidos', () => {
  for(const patch of [{heightMm:1700},{heightMm:1900},{heightMm:2000},{heightMm:2100},{depthMm:450},{widthMm:400},{calibre:20},{material:'MDP'},{bayCount:5},{widthMm:NaN}]) {
    const result=resolveLockerProduct(patch); assert.equal(result.supported,false);assert.equal(result.codeResolution.code,null);assert.deepEqual(result.bom,[]);
  }
  assert.equal(resolveLockerProduct({calibre:22,material:'METALICA_EMBEBIDA',securityType:'NO_APLICA'}).supported,false);
});

test('restricciones comerciales de seguridad, manija y troquelado', () => {
  for(const material of ['FORMICA','MELAMINA']) {
    const r=resolveLockerProduct({material,punchingType:'NO_APLICA',securityType:'PORTACANDADO'});
    assert.equal(r.supported,false);assert.ok(r.diagnostics.some(d=>d.code==='LOCKER_INVALID_SECURITY'));
    assert.equal(resolveLockerProduct({material,punchingType:'TIPO_1',punchingPosition:'ARRIBA'}).supported,false);
  }
  assert.equal(resolveLockerProduct({securityType:'CLAVE_4_DIGITOS'}).supported,false);
  assert.equal(resolveLockerProduct({securityType:'CLAVE_4_DIGITOS',handleType:'SIN_MANIJA'}).supported,true);
  for(const securityType of ['ARMSTRONG','TIMBERLINE']) assert.equal(resolveLockerProduct({securityType}).supported,false);
  assert.equal(resolveLockerProduct({anchor:true}).supported,false);
  const pending = resolveLockerProduct({calibre:24,material:'METALICA_EMBEBIDA',securityType:'NO_APLICA',bayCount:1});
  assert.equal(pending.supported,false);
  assert.ok(pending.diagnostics.some(d=>d.code==='LOCKER_INVALID_CONFIGURATION'));
  assert.equal(pending.codeResolution.code,null);
  assert.deepEqual(pending.bom,[]);
  assert.equal(resolveLockerProduct({handleType:'UNKNOWN'}).supported,false);
  assert.equal(resolveLockerProduct({punchingType:'LISO',punchingPosition:'ARRIBA'}).supported,false);
});

test('materiales independientes por nave y de la coraza, antes y después de reconstruir', () => {
  const {object}=createLockerInstance({config:{bayCount:4,bayFinishes:['#ff0000','#00ff00','#0000ff','#ffffff']}});
  const materials=bays(object).map(b=>b.getObjectByName('DOOR_PANEL').material);
  assert.equal(new Set(materials).size,4);
  const bodyColor=object.getObjectByName('LEFT_SIDE').material.color.getHex();
  materials[0].color.set('#123456');assert.equal(materials[1].color.getHexString(),'00ff00');
  materials[1].color.set('#654321');assert.equal(materials[0].color.getHexString(),'123456');
  assert.equal(object.getObjectByName('LEFT_SIDE').material.color.getHex(),bodyColor);
  const uuid=object.uuid, instanceId=object.userData.instanceId;
  object.position.set(2,3,4); object.rotation.y=0.4;
  const result=rebuildLockerInstance({object,patch:{heightMm:2200}});
  assert.equal(result.object,object);assert.equal(object.uuid,uuid);assert.equal(object.userData.instanceId,instanceId);
  assert.deepEqual(object.position.toArray(),[2,3,4]);assert.equal(object.rotation.y,0.4);
  assert.equal(bays(object)[0].getObjectByName('DOOR_PANEL').material.color.getHexString(),'ff0000');
  assert.equal(object.getObjectByName('LEFT_SIDE').geometry.parameters.width,0.0012);
  assert.equal(object.getObjectByName('LEFT_SIDE').geometry.parameters.height,2.2);
  const oldChildren=[...object.children];
  assert.equal(rebuildLockerInstance({object,patch:{heightMm:1900}}).success,false);
  assert.deepEqual(object.children,oldChildren);
  disposeLockerGeometry(object);
});

test('crecimiento reconstruye ancho, profundidad y altura sin escalar la coraza', () => {
  const {object}=createLockerInstance();
  const first=object.getObjectByName('BACK').geometry;
  assert.equal(rebuildLockerInstance({object,patch:{lockerType:'DOBLE',widthMm:1000,heightMm:2200}}).success,true);
  assert.notEqual(object.getObjectByName('BACK').geometry,first);
  assert.equal(object.getObjectByName('TOP').geometry.parameters.width,0.9976);
  assert.equal(bays(object).length,2); assert.deepEqual(object.scale.toArray(),[1,1,1]);
  const technicalBody=createLockerBodyGeometry({widthMm:400,heightMm:1700,depthMm:300,bodyFinish:'#ffffff'},1);
  assert.equal(technicalBody.getObjectByName('LEFT_SIDE').geometry.parameters.depth,0.3);
  assert.equal(technicalBody.getObjectByName('LEFT_SIDE').geometry.parameters.height,1.7);
  assert.equal(technicalBody.getObjectByName('LEFT_SIDE').geometry.parameters.width,0.0012);
  assert.deepEqual(technicalBody.scale.toArray(),[1,1,1]);
  assert.equal(resolveLockerProduct({widthMm:400,heightMm:1700,depthMm:300}).supported,false);
  disposeLockerGeometry(technicalBody);
  disposeLockerGeometry(object);
});

test('accesorios, cantidades y componentes incluidos sin duplicaciones', () => {
  const {object}=createLockerInstance({config:{lockerType:'TRIPLE',widthMm:1000,bayCount:4,plinth:true,viewer:true,extraShelves:true}});
  const bom=object.userData.bom;
  assert.equal(bom.find(r=>r.role==='BAY_KIT').quantity,3);
  assert.equal(bom.find(r=>r.role==='SHELF').quantity,12);
  assert.equal(bom.find(r=>r.role==='VIEWER').quantity,12);
  assert.equal(bom.find(r=>r.role==='HANDLE').quantity,12);
  assert.equal(bom.find(r=>r.role==='SECURITY').quantity,12);
  assert.equal(bom.find(r=>r.role==='PLINTH').code,'22000128633');
  assert.equal(object.getObjectByName('SHELVES').children.length,21);
  assert.equal(object.getObjectByName('BODY').position.y,0.1);
  assert.equal(object.userData.heightMm,1800);
  assert.equal(object.getObjectByName('VIEWER').getObjectByName('ACRYLIC_VIEWER').material.transparent,true);
  assert.ok(createLockerAnchorGeometry().getObjectByName('ANCHOR_PLATE'));
  assert.ok(createLockerLockGeometry('TIMBERLINE').getObjectByName('LOCK_HOUSING'));
  disposeLockerGeometry(object);
});

for(const type of ['TIPO_1','TIPO_2','TIPO_3','TIPO_4']) for(const position of ['ARRIBA','ABAJO','ARRIBA_Y_ABAJO']) test(`troquelado ${type} ${position}`, () => {
  const {object,success}=createLockerInstance({config:{punchingType:type,punchingPosition:position}});
  assert.equal(success,true);const punching=object.getObjectByName('PUNCHING');assert.ok(punching.children.length>0);
  assert.equal(punching.userData.punchingType,type);assert.equal(punching.userData.punchingPosition,position);
  assert.ok(punching.userData.approximationFlags.includes('LOCKER_NATIVE_DIMENSION_APPROXIMATED'));
  disposeLockerGeometry(object);
});

test('manijas con códigos diferenciados por material y posiciones dependientes de altura/naves', () => {
  for(const handleType of ['EMBEBIDA','BOTON','SCHWINN','INCRUSTAR','SIN_MANIJA']) for(const material of ['METALICA','FORMICA','MELAMINA']) {
    const result=createLockerInstance({config:{handleType,material,...(material==='METALICA'?{}:{punchingType:'NO_APLICA'})}});
    assert.equal(result.success,true);assert.equal(result.object.userData.bom.some(r=>r.role==='HANDLE'),handleType!=='SIN_MANIJA');
    disposeLockerGeometry(result.object);
  }
  assert.equal(resolveLockerProduct({handleType:'BOTON'}).accessories.handle.code,'22000128635');
  assert.equal(resolveLockerProduct({material:'FORMICA',punchingType:'NO_APLICA',handleType:'BOTON'}).accessories.handle.code,'22000128769');
  const p={bayIndex:0,bayCount:1,lockerHeight:1800,lockerWidth:500,handleType:'BOTON',material:'METALICA'};
  assert.equal(calculateHandlePosition(p).y,895.5);
  assert.equal(calculateHandlePosition({...p,lockerHeight:2200}).y,1095.5);
  assert.equal(getLockerBayWidth({totalWidth:1000,numberOfBays:3}),1000/3);
});

test('guardar/cargar conserva identidad, configuración, acabados y transformaciones en proyecto mixto', async () => {
  const original=createLockerInstance({config:{bayCount:3,bayFinishes:['#ff0000','#ffffff','#0000ff'],visualState:{doorDisplay:'CLOSED'}},transform:{position:[1,0,2],rotation:[0,0.7,0],scale:[1.2,1,1]}}).object;
  const other=new THREE.Group();other.userData={kind:'PART',codigoPT:'OTHER'};
  const serialized=serializeProjectEntities([{obj:original},{obj:original},{obj:other}]);
  assert.equal(serialized.entities.length,2);
  const entity=JSON.parse(JSON.stringify(serialized.entities[0]));
  assert.equal(JSON.stringify(entity).includes('geometry'),false);
  const restored=await loadPersistedEntity(entity,{createLocker:e=>createLockerInstance({config:e.config,instanceId:e.instanceId,transform:e.transform}).object});
  assert.deepEqual(restored.userData.config,original.userData.config);assert.equal(restored.userData.instanceId,original.userData.instanceId);
  assert.deepEqual(restored.position.toArray(),original.position.toArray());assert.deepEqual(restored.quaternion.toArray(),original.quaternion.toArray());assert.deepEqual(restored.scale.toArray(),original.scale.toArray());
  assert.deepEqual(restored.userData.bom,original.userData.bom);
  const parent=new THREE.Group(), parts=[],pickables=[];
  registerLockerInstance({instance:{object:restored},parent,partsRegistry:parts,pickables});
  registerLockerInstance({instance:{object:restored},parent,partsRegistry:parts,pickables});
  assert.equal(parts.length,1);assert.equal(pickables.length,1);
  disposeLockerGeometry(original);disposeLockerGeometry(restored);
});

test('clipboard usa configuración serializable y constructor LOCKER, con identidad nueva', () => {
  const {object}=createLockerInstance({config:{bayCount:2,bayFinishes:['#123456','#abcdef']}});
  const entity=serializeLockerEntity(object);
  const instruction=createObjectFromClipboardItem({kind:entity.kind,transform:entity.transform,configuration:{config:entity.config},relationships:{oldId:entity.instanceId}});
  assert.equal(instruction.constructor,'ADD_LOCKER');
  const copied=createLockerInstance({config:instruction.payload.configuration.config}).object;
  assert.notEqual(copied.userData.instanceId,object.userData.instanceId);assert.deepEqual(copied.userData.config,object.userData.config);
  disposeLockerGeometry(object);disposeLockerGeometry(copied);
});

test('historial global: una operación completa de configuración, undo y redo conservan raíz', async () => {
  const {object}=createLockerInstance();const before=structuredClone(object.userData.config);
  const history=createHistoryManager({replayAction:(action,direction)=>{
    const r=rebuildLockerInstance({object,patch:direction==='undo'?action.before:action.after});assert.equal(r.success,true);
  }});
  rebuildLockerInstance({object,patch:{heightMm:2200,bayCount:4}});
  history.pushAction({type:HISTORY_ACTION_TYPES.LOCKER_CONFIG_CHANGE,before,after:structuredClone(object.userData.config)});
  await history.undo();assert.equal(object.userData.heightMm,1800);assert.equal(bays(object).length,1);
  await history.redo();assert.equal(object.userData.heightMm,2200);assert.equal(bays(object).length,4);
  disposeLockerGeometry(object);
});
