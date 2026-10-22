const { app, BrowserWindow, pause, apiExpr, renderExpr, evaluate, assert, point, clickPoint, click, key,
  frameScreenPoint, inspectRenderHeap } = require('./phase101-growth-ui-validation.cjs');

const frameSnapshot = (win) => evaluate(win,`(async () => {const api=${apiExpr},scene=${renderExpr}.scene;
  const frame=scene.children.find((node)=>node.userData?.kind==='CRITTERIUM_8_ASSEMBLY');
  const {resolveCritterium8BOM}=await import('/src/mepal/critterium8/bom/critterium8BOM.js');
  return {instanceId:frame?.userData?.instanceId,frameId:frame?.userData?.frameId,
    growth:frame?.userData?.config?.growthModules?.length,heightCm:frame?.userData?.composition?.heightCm,
    bom:frame?resolveCritterium8BOM([{obj:frame}]).rows.map(({code,qty})=>({code,qty})):[],
    saved:api.exportProject().entities.find((entity)=>entity.kind==='CRITTERIUM_8')?.config?.growthModules?.length};})()`);

async function changeGrowth(win, count, inProperties) {
  const expression=`[...document.querySelectorAll('label')].find((node)=>node.textContent.includes('Módulos de crecimiento') && !!node.closest('.pp-shell')===${inProperties})?.querySelector('select')`;
  await clickPoint(win,await point(win,expression));
  await key(win,'Home');
  for(let index=0;index<count;index+=1) await key(win,'Down');
  await key(win,'Return');
  await pause(850);
}

app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:1680,height:1000,show:false});
  await win.loadURL('http://127.0.0.1:5174/');
  await pause(4000);
  await click(win,'Administrador');
  await pause(6500);
  await click(win,'Critterium 8');
  await click(win,'Frame');
  await changeGrowth(win,1,false);
  await click(win,'Crear frame');
  const grown=await frameSnapshot(win);
  assert(grown.growth===1 && grown.heightCm===166,'Frame inicial no creció');
  await inspectRenderHeap(win);
  const location=await frameScreenPoint(win,grown.instanceId);
  await clickPoint(win,location);
  const propertyText=await evaluate(win,`[...document.querySelectorAll('.pp-shell')].map((node)=>node.textContent.slice(0,400))`);
  assert(propertyText.some((value)=>value.includes('Módulos de crecimiento')),'Properties no mostró el frame');
  await changeGrowth(win,0,true);
  const normal=await frameSnapshot(win);
  assert(normal.instanceId===grown.instanceId && normal.frameId===grown.frameId && normal.growth===0 && normal.heightCm===128,'Properties 38→normal falló');
  assert(!normal.bom.some((row)=>row.code==='22191900165'),'BOM retuvo crecimiento retirado');
  await changeGrowth(win,1,true);
  const regrown=await frameSnapshot(win);
  assert(regrown.instanceId===grown.instanceId && regrown.frameId===grown.frameId && regrown.growth===1 && regrown.heightCm===166,'Properties normal→38 falló');
  assert(regrown.bom.some((row)=>row.code==='22191900165'),'BOM perdió crecimiento restaurado');
  await key(win,'Z',['control']);
  const undone=await frameSnapshot(win);
  assert(undone.instanceId===grown.instanceId && undone.growth===0 && undone.heightCm===128 &&
    !undone.bom.some((row)=>row.code==='22191900165'),'Ctrl+Z no revirtió una transición completa');
  await key(win,'Y',['control']);
  const redone=await frameSnapshot(win);
  assert(redone.instanceId===grown.instanceId && redone.growth===1 && redone.heightCm===166 &&
    redone.bom.some((row)=>row.code==='22191900165'),'Ctrl+Y no restauró crecimiento');
  console.log('PROPERTIES_ROUNDTRIP',JSON.stringify({grown,normal,regrown,undone,redone,propertyText}));
  win.destroy();app.exit(0);
}).catch((error)=>{console.error('ERROR',error.stack||String(error));app.exit(1);});
