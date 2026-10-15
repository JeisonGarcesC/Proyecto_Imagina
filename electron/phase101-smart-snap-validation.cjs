const { writeFileSync, readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { join, resolve, sep } = require('node:path');
const { tmpdir } = require('node:os');
const { app, BrowserWindow, pause, apiExpr, renderExpr, evaluate, assert, point, clickPoint, click,
  setGrowthWithKeyboard, state, spatial, frameScreenPoint, inspectRenderHeap } = require('./phase101-growth-ui-validation.cjs');
const scenario = process.env.PHASE101_MODE || 'GG';
assert(['GG','GN','NG','NN'].includes(scenario),'Escenario desconocido');
const firstGrowth = scenario[0] === 'G';
const secondGrowth = scenario[1] === 'G';
const residualMm = Number(process.env.PHASE101_RESIDUAL_MM || 0);
const saveReopen = process.env.PHASE101_SAVE_REOPEN === '1';
const verifyRotation = process.env.PHASE101_ROTATION === '1';
const zoomMode = process.env.PHASE101_ZOOM || 'MEDIUM';
assert(['NEAR','MEDIUM','FAR'].includes(zoomMode),'Zoom desconocido');
assert(Number.isFinite(residualMm) && residualMm >= 0 && residualMm <= 450,'Distancia residual inválida');

async function drag(win, start, end) {
  win.webContents.sendInputEvent({type:'mouseMove',x:start.x,y:start.y});
  win.webContents.sendInputEvent({type:'mouseDown',x:start.x,y:start.y,button:'left',clickCount:1});
  for(let index=1;index<=12;index+=1){
    win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x+(end.x-start.x)*index/12),
      y:Math.round(start.y+(end.y-start.y)*index/12),button:'left'});
    await pause(180);
  }
  await pause(500);
  for(let index=0;index<4;index+=1){
    win.webContents.sendInputEvent({type:'mouseMove',x:end.x+(index%2),y:end.y,button:'left'});
    await pause(180);
  }
  console.log('TARGET_ELEMENT',JSON.stringify(await evaluate(win,`(() => {let node=document.elementFromPoint(${end.x},${end.y});const chain=[];while(node&&chain.length<7){chain.push({tag:node.tagName,classes:node.className?.baseVal||node.className,style:node.getAttribute?.('style')?.slice(0,100),text:node.textContent?.slice(0,70)});node=node.parentElement;}return {chain,captured:window.__phase101Renderer.domElement.hasPointerCapture?.(1)}})()`)));
  const marker=await evaluate(win,`(() => {const scene=${renderExpr}.scene;
    return scene?.children.filter((node)=>node.userData?.isHelper && node.children?.some((child)=>child.isLine) && node.children.length===4)
      .map((node)=>({visible:node.visible,children:node.children.map((child)=>({position:child.position.toArray(),color:child.material?.color?.getHexString()}))}));})()`);
  console.log('PREVIEW',JSON.stringify(marker));
  if (!residualMm) writeFileSync(join(__dirname,`phase101-smart-snap-${scenario}.png`),(await win.webContents.capturePage()).toPNG());
  win.webContents.sendInputEvent({type:'mouseUp',x:end.x,y:end.y,button:'left',clickCount:1});
  await pause(850);
  return marker;
}

async function commercial(win, systemId) {
  return evaluate(win,`(async () => {const api=${apiExpr};const bom=api.getCritteriumOfficeSummary(${JSON.stringify(systemId)});
    const {loadCritteriumPriceCatalog}=await import('/src/mepal/critterium8/commercial/critteriumPriceCatalog.js');
    const {buildCritteriumQuotation}=await import('/src/mepal/critterium8/commercial/critteriumQuotation.js');
    const prices=await loadCritteriumPriceCatalog('CO');
    const quote=buildCritteriumQuotation({systemId:${JSON.stringify(systemId)},bom,priceCatalog:prices});
    return {bom:JSON.parse(JSON.stringify(bom)),quote:JSON.parse(JSON.stringify(quote))};})()`);
}

async function verifySaveReopen(win, before) {
  app.on('window-all-closed',()=>{});
  const systemId=before.systems[0].systemId;
  const beforeSpatial=await spatial(win);
  const beforeCommercial=await commercial(win,systemId);
  const directory=mkdtempSync(join(tmpdir(),'phase1012-'));
  const savedPath=join(directory,'proyecto-imagina.json');
  try {
    const download=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Archivo Guardar no inició descarga')),15000);
      win.webContents.session.once('will-download',(_event,item)=>{
        item.setSavePath(savedPath);
        item.once('done',(_event,status)=>{clearTimeout(timeout);status==='completed'?resolve():reject(new Error(`Descarga: ${status}`));});
      });
    });
    await click(win,'Archivo');
    await click(win,'Guardar');
    await download;
    const saved=JSON.parse(readFileSync(savedPath,'utf8'));
    console.log('FILE_SAVED',JSON.stringify({bytes:readFileSync(savedPath).length,entityCount:saved.entities?.length,path:savedPath}));
    assert(saved.entities?.length>0,'Archivo guardado sin entidades');
    win.destroy();
    const reopened=new BrowserWindow({width:1680,height:1000,show:false});
    await reopened.loadURL('http://127.0.0.1:5174/');
    console.log('REOPEN_WINDOW_LOADED');
    await pause(4000);
    await click(reopened,'Administrador');
    await pause(6500);
    await click(reopened,'Critterium 8');
    await click(reopened,'Archivo');
    const inputExists=await evaluate(reopened,`!!document.querySelector('input[type="file"]')`);
    assert(inputExists,'Archivo Abrir no tiene input');
    const protocol=reopened.webContents.debugger;
    protocol.attach('1.3');
    await protocol.sendCommand('DOM.enable');
    const document=await protocol.sendCommand('DOM.getDocument');
    const input=await protocol.sendCommand('DOM.querySelector',{nodeId:document.root.nodeId,selector:'input[type="file"]'});
    await protocol.sendCommand('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[savedPath]});
    console.log('REOPEN_FILE_SELECTED');
    await pause(2500);
    const after=await state(reopened);
    const afterSpatial=await spatial(reopened);
    const afterCommercial=await commercial(reopened,systemId);
    const stable=(value)=>JSON.stringify(value);
    assert(stable(after.systems)===stable(before.systems) && stable(after.sequences)===stable(before.sequences),'IDs, conexiones o slots cambiaron tras abrir archivo');
    assert(stable(afterSpatial)===stable(beforeSpatial),'Transformaciones cambiaron tras abrir archivo');
    assert(stable(afterCommercial)===stable(beforeCommercial),'BOM o cotización cambiaron tras abrir archivo');
    console.log('REOPEN_VERIFIED',JSON.stringify({systems:after.systems.length,sequences:after.sequences.length,connections:after.systems[0].connections.length,slots:after.sequences.flatMap((item)=>item.slots).length,bomRows:afterCommercial.bom.rows?.length,quoteTotal:afterCommercial.quote.total}));
    reopened.destroy();
  } finally {
    assert(resolve(directory).startsWith(resolve(tmpdir())+sep),'Directorio temporal fuera de TEMP');
    rmSync(directory,{recursive:true,force:true});
  }
}

async function verifyRotations(win, before) {
  const systemId=before.systems[0].systemId;
  const baseline=await commercial(win,systemId);
  const beforeSpatial=await spatial(win);
  await click(win,'+90°');
  const current=await state(win);
  const afterSpatial=await spatial(win);
  const commercialNow=await commercial(win,systemId);
  console.log('CONNECTED_ROTATION_STATE',JSON.stringify({beforeSpatial,afterSpatial,beforeConnections:before.systems[0].connections,afterConnections:current.systems[0].connections}));
  assert(JSON.stringify(afterSpatial)===JSON.stringify(beforeSpatial),'Giro incompatible dejó transformaciones parciales');
  assert(JSON.stringify(current.systems)===JSON.stringify(before.systems),'Giro incompatible alteró conexión');
  assert(JSON.stringify(current.sequences)===JSON.stringify(before.sequences),'Giro incompatible alteró slots o identidades');
  assert(JSON.stringify(commercialNow)===JSON.stringify(baseline),'Giro incompatible alteró BOM o cotización');
  console.log('CONNECTED_ROTATION_REJECTED',JSON.stringify({connections:current.systems[0].connections.length,spatialStable:true,commercialStable:true}));
}

async function verifyFreeRotations(win, systemId, sequenceId) {
  const baseline=await state(win);
  const commercialBefore=await commercial(win,systemId);
  const getDirection=()=>evaluate(win,`(() => {const api=${apiExpr};return api.getCritteriumConnectionPoints(${JSON.stringify(sequenceId)})[0]?.direction;})()`);
  const first=await getDirection();
  for(let quarter=1;quarter<=4;quarter+=1){
    await click(win,'+90°');
    const direction=await getDirection();
    const dot=first[0]*direction[0]+first[2]*direction[2];
    const expected=[0,-1,0,1][quarter-1];
    assert(Math.abs(dot-expected)<0.001,`Orientación incorrecta tras ${quarter*90}°`);
    assert(JSON.stringify((await state(win)).sequences)===JSON.stringify(baseline.sequences),'Giro libre alteró slots o identidades');
    assert(JSON.stringify(await commercial(win,systemId))===JSON.stringify(commercialBefore),'Giro libre alteró BOM o cotización');
    console.log('FREE_ROTATION',JSON.stringify({degrees:quarter*90,direction,dot,connections:baseline.systems[0].connections.length}));
  }
}

app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:1680,height:1000,show:false});
  await win.loadURL('http://127.0.0.1:5174/');
  await pause(4000);
  await click(win,'Administrador');
  await pause(6500);
  await click(win,'Critterium 8');
  await click(win,'Sistema');
  if (firstGrowth) {
    await setGrowthWithKeyboard(win,0,1);
    await clickPoint(win,await point(win,`[...document.querySelectorAll('summary')].find((node)=>node.textContent.trim().startsWith('Frame 2:'))`));
    await setGrowthWithKeyboard(win,1,1);
  }
  await click(win,firstGrowth===secondGrowth?'Duplicar':'Agregar');
  if (secondGrowth && !firstGrowth) {
    await setGrowthWithKeyboard(win,0,1,2);
    await clickPoint(win,await point(win,`(() => {const heading=[...document.querySelectorAll('strong')].find((node)=>node.textContent.trim()==='Secuencia 2');return [...heading.parentElement.querySelectorAll('summary')].find((node)=>node.textContent.trim().startsWith('Frame 2:'));})()`));
    await setGrowthWithKeyboard(win,1,1,2);
  }
  await click(win,'Crear sistema con 2 secuencia(s)');
  const initial=await state(win);
  assert(initial.systems.length===1 && initial.sequences.length===2,'Sistema de dos secuencias no creado desde UI');
  assert(initial.sequences[0].slots.every((slot)=>slot.growth===(firstGrowth?1:0) && slot.heightCm===(firstGrowth?166:128)),'Primera secuencia incorrecta');
  assert(initial.sequences[1].slots.every((slot)=>slot.growth===(secondGrowth?1:0) && slot.heightCm===(secondGrowth?166:128)),'Segunda secuencia incorrecta');
  const points=await evaluate(win,`(() => {const api=${apiExpr};return api.getCritteriumStructure().sequences.map((sequence)=>({
    sequenceId:sequence.sequenceId,points:api.getCritteriumConnectionPoints(sequence.sequenceId).map((point)=>({id:point.id,position:point.position,heightCm:point.heightCm,direction:point.direction}))}));})()`);
  console.log('INITIAL',JSON.stringify({systemId:initial.systems[0].systemId,sequenceIds:initial.sequences.map((item)=>item.sequenceId),points}));
  await inspectRenderHeap(win);
  if(zoomMode!=='MEDIUM'){
    const canvasCenter=await evaluate(win,`(() => {const rect=window.__phase101Renderer.domElement.getBoundingClientRect();return {x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2),before:window.__phase101Camera.position.toArray()};})()`);
    for(let index=0;index<3;index+=1){win.webContents.sendInputEvent({type:'mouseWheel',x:canvasCenter.x,y:canvasCenter.y,deltaX:0,deltaY:zoomMode==='NEAR'?120:-120});await pause(220);}
    console.log('ZOOM',JSON.stringify({mode:zoomMode,...canvasCenter,after:await evaluate(win,`window.__phase101Camera.position.toArray()`)}));
  }
  const movable=initial.sequences[1];
  await clickPoint(win,await point(win,`[...document.querySelectorAll('summary')].find((node)=>node.textContent.trim().startsWith('Secuencia 2 ·'))`));
  const sequenceButton=await point(win,`[...document.querySelectorAll('summary')].find((node)=>node.textContent.trim().startsWith('Secuencia 2 ·'))?.parentElement?.querySelector('button')`);
  console.log('PANEL_HIT',JSON.stringify({button:sequenceButton,actual:await evaluate(win,`document.elementFromPoint(${sequenceButton.x},${sequenceButton.y})?.textContent?.slice(0,140)`)}));
  await clickPoint(win,sequenceButton);
  console.log('PANEL_SELECTION',JSON.stringify(await evaluate(win,`[...document.querySelectorAll('.pp-shell')].map((node)=>node.textContent.slice(0,260))`)));
  if(verifyRotation) await verifyFreeRotations(win,initial.systems[0].systemId,movable.sequenceId);
  const start=await frameScreenPoint(win,movable.slots[0].frameInstanceId,secondGrowth?null:'TOP_BEVEL_0');
  assert(Number.isFinite(start.x),'No se pudo proyectar el frame móvil');
  const target=await evaluate(win,`(() => {const camera=window.__phase101Camera,renderer=window.__phase101Renderer;
    const source=${JSON.stringify(points[1].points)},fixed=${JSON.stringify(points[0].points)};
    const origin=source.find((point)=>String(point.id).includes('START')) || source[0];
    const destination=fixed.find((point)=>String(point.id).includes('END')) || fixed[1];
    const delta=destination.position.map((value,index)=>value-origin.position[index]);
    delta[2]+=${residualMm}/1000;
    const raycaster=new window.__phase101Three.Raycaster();
    raycaster.setFromCamera(new window.__phase101Three.Vector2(${start.ndc[0]},${start.ndc[1]}),camera);
    const planePoint=raycaster.ray.at(-raycaster.ray.origin.y/raycaster.ray.direction.y,new window.__phase101Three.Vector3());
    const world=planePoint.clone().add(new window.__phase101Three.Vector3(...delta));
    const projected=world.project(camera),rect=renderer.domElement.getBoundingClientRect();
    const x=Math.round(rect.left+(projected.x+1)*rect.width/2),y=Math.round(rect.top+(1-projected.y)*rect.height/2);
    const inverse=new window.__phase101Three.Raycaster();inverse.setFromCamera(new window.__phase101Three.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),camera);
    const endPlane=inverse.ray.at(-inverse.ray.origin.y/inverse.ray.direction.y,new window.__phase101Three.Vector3());
    return {x,y,delta,origin,destination,inverseDelta:endPlane.sub(planePoint).toArray()};})()`);
  console.log('DRAG_PLAN',JSON.stringify({scenario,residualMm,start,target}));
  await evaluate(win,`(() => {window.__phase101Moves=[];window.__phase101Renderer.domElement.addEventListener('pointermove',(event)=>window.__phase101Moves.push([event.clientX,event.clientY]),true);})()`);
  const marker=await drag(win,start,target);
  console.log('MOVE_EVENTS',JSON.stringify(await evaluate(win,`window.__phase101Moves.slice(-16)`)));
  const after=await state(win);
  const candidate=marker?.find((item)=>item.visible);
  const sourcePoint=candidate?.children[0]?.position,targetPoint=candidate?.children[1]?.position;
  const measuredMm=sourcePoint&&targetPoint?Math.hypot(sourcePoint[0]-targetPoint[0],sourcePoint[2]-targetPoint[2])*1000:null;
  console.log('SNAP_MEASURE',JSON.stringify({requestedMm:residualMm,measuredMm,color:candidate?.children[0]?.color,connectionCount:after.systems[0].connections.length}));
  console.log('AFTER',JSON.stringify({scenario,connections:after.systems[0].connections,positions:(await spatial(win)).filter((item)=>item.kind!=='CRITTERIUM_8_ASSEMBLY')}));
  if (firstGrowth!==secondGrowth) assert(after.systems[0].connections.length===0,'Se conectaron alturas incompatibles');
  else if (residualMm) {
    assert(Number.isFinite(measuredMm),'No se midió el candidato en coordenadas mundo');
    assert(after.systems[0].connections.length===(measuredMm<=300?1:0),'Resultado incompatible con distancia real al terminal');
  } else assert(after.systems[0].connections.length===1 && after.systems[0].connections[0].type==='LINEAR','Smart Snap compatible no conectó');
  if(saveReopen) await verifySaveReopen(win,after);
  else {
    if(verifyRotation) await verifyRotations(win,after);
    win.destroy();
  }
  app.exit(0);
}).catch((error)=>{console.error('ERROR',error.stack||String(error));app.exit(1);});
