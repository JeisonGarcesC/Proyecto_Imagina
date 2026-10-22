const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const apiExpr = `(() => {
  const heading = [...document.querySelectorAll('h3')].find((node) => node.textContent.trim() === 'CRITERIUM 8');
  let fiber = heading?.[Object.keys(heading).find((key) => key.startsWith('__reactFiber'))];
  while (fiber && !fiber.memoizedProps?.threeApiRef?.current) fiber = fiber.return;
  return fiber?.memoizedProps?.threeApiRef?.current;
})()`;
const renderExpr = `(() => {
  let node = document.querySelector('canvas')?.parentElement;
  let fiber = null;
  while (node && !fiber) { fiber = node[Object.keys(node).find((key) => key.startsWith('__reactFiber'))]; node = node.parentElement; }
  while (fiber && fiber.type?.name !== 'ThreeCanvas') fiber = fiber.return;
  let hook = fiber?.memoizedState; const found = {hooks:[]};
  while (hook) { const value = hook.memoizedState?.current;
    found.hooks.push([hook.memoizedState?.constructor?.name,value?.constructor?.name]);
    if (value?.isScene) found.scene = value;
    if (value?.isCamera) found.camera = value;
    if (value?.isWebGLRenderer) found.renderer = value;
    hook = hook.next; }
  return found;
})()`;
const evaluate = (win, code) => win.webContents.executeJavaScript(code);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function point(win, expression) {
  await evaluate(win,`(() => {const element=${expression};element?.scrollIntoView({block:'center',behavior:'instant'});return !!element;})()`);
  await pause(180);
  const position = await evaluate(win, `(() => { const element = ${expression}; if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2),width:rect.width,height:rect.height,disabled:element.disabled}; })()`);
  const viewport = await evaluate(win,`({width:window.innerWidth,height:window.innerHeight})`);
  if (!position || position.disabled || position.width < 2 || position.height < 2 || position.x<0 || position.x>=viewport.width || position.y<0 || position.y>=viewport.height) {
    const buttons = await evaluate(win, `[...document.querySelectorAll('button')].map((button)=>button.textContent.trim()).filter(Boolean).slice(0,80)`);
    throw new Error(`Elemento no disponible: ${expression}; botones: ${buttons.join(' | ')}`);
  }
  return position;
}
async function clickPoint(win, position) {
  for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
    win.webContents.sendInputEvent({ type, x: position.x, y: position.y, button: 'left', clickCount: 1 });
    await pause(80);
  }
  await pause(500);
}
async function click(win, label) {
  const quoted = JSON.stringify(label);
  await clickPoint(win, await point(win, `[...document.querySelectorAll('button')].find((button) => button.textContent.trim() === ${quoted} || button.title === ${quoted} || button.getAttribute('aria-label') === ${quoted})`));
}
async function key(win, keyCode, modifiers = []) {
  win.webContents.sendInputEvent({ type:'keyDown', keyCode, modifiers });
  win.webContents.sendInputEvent({ type:'keyUp', keyCode, modifiers });
  await pause(220);
}
async function setGrowthWithKeyboard(win, frameIndex, count, sequenceNumber = 1) {
  const expression = `(() => { const heading = [...document.querySelectorAll('strong')].find((node) => node.textContent.trim() === 'Secuencia ${sequenceNumber}');
    const details = [...heading.parentElement.querySelectorAll('details')].filter((node) => node.querySelector('summary')?.textContent.startsWith('Frame '));
    return [...details[${frameIndex}].querySelectorAll('label')].find((node) => node.textContent.includes('Módulos de crecimiento'))?.querySelector('select'); })()`;
  const select = await point(win, expression);
  await clickPoint(win, select);
  await key(win, 'Home');
  for (let index = 0; index < count; index += 1) await key(win, 'Down');
  await key(win, 'Return');
  const actual = await evaluate(win, `(${expression})?.value`);
  assert(actual === String(count), `Selector de crecimiento frame ${frameIndex + 1}: ${actual}`);
}
async function state(win) {
  return evaluate(win, `(() => { const api=${apiExpr}; const structure=api.getCritteriumStructure();
    return {systems:structure.systems.map(({systemId,sequenceIds,connections})=>({systemId,sequenceIds,connections})),
      sequences:structure.sequences.map(({sequenceId,parentSystemId,slots})=>({sequenceId,parentSystemId,
        slots:slots.map(({slotId,moduleId,frameId,frameInstanceId,heightCm,config})=>({slotId,moduleId,frameId,frameInstanceId,heightCm,growth:config?.growthModules?.length}))})),
      selected:api.getSelectedCritterium?.()}; })()`);
}
async function spatial(win) {
  return evaluate(win,`(() => {const scene=${renderExpr}.scene;const roots=[];scene.traverse((node)=>{if(['CRITERIUM_SYSTEM','CRITTERIUM_8_SEQUENCE_ASSEMBLY','CRITTERIUM_8_ASSEMBLY'].includes(node.userData?.kind)){
    roots.push({kind:node.userData.kind,id:node.userData.systemId||node.userData.sequenceId||node.userData.instanceId,
      position:node.getWorldPosition(new node.position.constructor()).toArray(),rotationY:node.rotation.y});}});return roots;})()`);
}
async function frameScreenPoint(win, frameInstanceId, preferredMesh = null) {
  return evaluate(win, `(() => { const found=${renderExpr}; const scene=found.scene,camera=window.__phase101Camera || found.camera,renderer=window.__phase101Renderer || found.renderer;
    if (!scene || !camera || !renderer) return {error:'Falta escena, cámara o renderer',found:{scene:!!scene,camera:!!camera,renderer:!!renderer,hooks:${renderExpr}.hooks,children:scene?.children?.slice(0,12).map((node)=>[node.type,node.name])}};
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    let frame; scene.traverse((node)=>{if(node.userData?.kind==='CRITTERIUM_8_ASSEMBLY' && node.userData.instanceId===${JSON.stringify(frameInstanceId)}) frame=node;});
    if (!frame) return {error:'Frame no encontrado'};
    const meshes=[]; frame.traverse((node)=>{if(node.isMesh && node.visible && node.geometry?.boundingBox){
      const size=node.geometry.boundingBox.getSize(node.position.constructor.prototype.constructor ? new node.position.constructor() : null);
      meshes.push({node,area:size.x*size.y}); }});
    meshes.sort((a,b)=>b.area-a.area); const chosen=meshes.find(({node})=>node.name===${JSON.stringify(preferredMesh)})?.node || meshes[0]?.node;
    if(!chosen) return {error:'Sin mesh visible'};
    const world=chosen.getWorldPosition(new chosen.position.constructor());
    const projected=world.clone().project(camera); const rect=renderer.domElement.getBoundingClientRect();
    const raycaster=new window.__phase101Three.Raycaster(); raycaster.setFromCamera(new window.__phase101Three.Vector2(projected.x,projected.y),camera);
    const hits=raycaster.intersectObjects(scene.children,true).slice(0,6).map(({object,distance})=>{const ancestors=[];for(let node=object;node&&ancestors.length<6;node=node.parent)if(node.userData?.kind)ancestors.push([node.userData.kind,node.userData.instanceId||node.userData.sequenceId]);return {name:object.name,kind:object.userData?.kind,distance,ancestors};});
    return {x:Math.round(rect.left+(projected.x+1)*rect.width/2),y:Math.round(rect.top+(1-projected.y)*rect.height/2),
      world:world.toArray(),ndc:projected.toArray(),mesh:chosen.name,candidates:meshes.slice(0,12).map(({node,area})=>[node.name,area]),hits,canvas:[rect.left,rect.top,rect.width,rect.height],
      camera:camera.position.toArray()}; })()`);
}
async function inspectRenderHeap(win) {
  const protocol = win.webContents.debugger;
  if (!protocol.isAttached()) protocol.attach('1.3');
  await protocol.sendCommand('Runtime.enable');
  const imported = await protocol.sendCommand('Runtime.evaluate', {
    expression:"import('/node_modules/.vite/deps/three.js').then((module)=>{window.__phase101Three=module;return [!!module.PerspectiveCamera,!!module.WebGLRenderer]})",
    awaitPromise:true,returnByValue:true,
  });
  if (imported.exceptionDetails) return {error:imported.exceptionDetails.text};
  const result = {};
  for (const [name,property] of [['cameras','PerspectiveCamera'],['renderers','WebGLRenderer']]) {
    const prototype = await protocol.sendCommand('Runtime.evaluate', {expression:`window.__phase101Three.${property}.prototype`});
    const objects = await protocol.sendCommand('Runtime.queryObjects',{prototypeObjectId:prototype.result.objectId});
    const details = await protocol.sendCommand('Runtime.callFunctionOn',{
      objectId:objects.objects.objectId,returnByValue:true,
      functionDeclaration:`function(){const active=this.find((item)=>${property === 'PerspectiveCamera' ? "item.isPerspectiveCamera && item.position.length()>1" : "item.domElement?.isConnected"});window.__phase101${property === 'PerspectiveCamera' ? 'Camera' : 'Renderer'}=active;return this.map((item)=>({name:item.constructor.name,position:item.position?.toArray(),connected:item.domElement?.isConnected,rect:item.domElement?.getBoundingClientRect()?.toJSON()}))}`,
    });
    result[name]=details.result.value;
  }
  return result;
}

if (require.main === module) app.whenReady().then(async () => {
  const win = new BrowserWindow({width:1680,height:1000,show:false});
  await win.loadURL('http://127.0.0.1:5174/');
  await pause(4000);
  await click(win,'Administrador');
  await pause(6500);
  await click(win,'Critterium 8');
  await click(win,'Sistema');
  const before = await state(win);
  console.log('BEFORE',JSON.stringify(before));
  await setGrowthWithKeyboard(win,0,1);
  await clickPoint(win,await point(win,`[...document.querySelectorAll('summary')].find((node)=>node.textContent.trim().startsWith('Frame 2:'))`));
  await setGrowthWithKeyboard(win,1,1);
  await click(win,'Crear sistema con 1 secuencia(s)');
  const created = await state(win);
  assert(created.systems.length===1 && created.sequences.length===1 && created.sequences[0].slots.length>=2,'Sistema no creado desde UI');
  assert(created.sequences[0].slots.every((slot)=>slot.growth===1 && slot.heightCm===166),'Crecimiento no aplicado en sistema desde UI');
  console.log('CREATED_UI',JSON.stringify(created));
  console.log('RENDER_HEAP',JSON.stringify(await inspectRenderHeap(win)));
  const projectedFrame = await frameScreenPoint(win,created.sequences[0].slots[0].frameInstanceId);
  console.log('FRAME_PROJECTION',JSON.stringify(projectedFrame));
  assert(Number.isFinite(projectedFrame.x) && Number.isFinite(projectedFrame.y),'No se pudo proyectar el frame');
  await clickPoint(win,projectedFrame);
  console.log('THREE_CLICK_PROPERTIES',JSON.stringify(await evaluate(win,`[...document.querySelectorAll('.pp-shell')].map((node)=>node.textContent.slice(0,500))`)));
  const invalidSelect = `[...document.querySelectorAll('.pp-shell label')].find((node)=>node.textContent.includes('Módulos de crecimiento'))?.querySelector('select')`;
  await clickPoint(win,await point(win,invalidSelect));
  await key(win,'Home');
  await key(win,'Return');
  await pause(800);
  const invalidState = await state(win);
  const invalidMessages = await evaluate(win,`[...document.querySelectorAll('.pp-shell')].map((node)=>node.textContent.slice(-400))`);
  assert(invalidState.sequences[0].slots.every((slot)=>slot.growth===1 && slot.heightCm===166),'Edición inválida alteró el sistema');
  assert(invalidMessages.some((message)=>message.includes('HEIGHT_TRANSITION_REQUIRED')),'Properties no mostró el diagnóstico de incompatibilidad');
  console.log('INVALID_PROPERTY',JSON.stringify({slots:invalidState.sequences[0].slots.map(({growth,heightCm})=>({growth,heightCm})),messages:invalidMessages}));
  console.log('SPATIAL_BEFORE_DRAG',JSON.stringify(await spatial(win)));
  win.webContents.sendInputEvent({type:'mouseMove',x:projectedFrame.x,y:projectedFrame.y});
  win.webContents.sendInputEvent({type:'mouseDown',x:projectedFrame.x,y:projectedFrame.y,button:'left',clickCount:1});
  for (let step=1;step<=6;step+=1){
    win.webContents.sendInputEvent({type:'mouseMove',x:projectedFrame.x+step*20,y:projectedFrame.y+step*4,button:'left'});
    await pause(100);
  }
  win.webContents.sendInputEvent({type:'mouseUp',x:projectedFrame.x+120,y:projectedFrame.y+24,button:'left',clickCount:1});
  await pause(850);
  console.log('SPATIAL_AFTER_DRAG',JSON.stringify(await spatial(win)));
  await clickPoint(win,await point(win,`[...document.querySelectorAll('summary')].find((node)=>node.textContent.trim()==='Slots / módulos')`));
  await click(win,'Pieza individual');
  const frameButton = await point(win, `[...document.querySelectorAll('button')].find((button)=>button.textContent.trim()==='Seleccionar frame del módulo')`);
  await clickPoint(win,frameButton);
  console.log('SELECTED_UI',JSON.stringify(await state(win)));
  console.log('PANEL_FRAME_PROPS',JSON.stringify(await evaluate(win,`[...document.querySelectorAll('.pp-shell')].map((node)=>node.textContent.slice(0,280))`)));
  const framePointAfterSystemMove = await frameScreenPoint(win,created.sequences[0].slots[0].frameInstanceId);
  const beforeFrameDrag = await spatial(win);
  win.webContents.sendInputEvent({type:'mouseMove',x:framePointAfterSystemMove.x,y:framePointAfterSystemMove.y});
  win.webContents.sendInputEvent({type:'mouseDown',x:framePointAfterSystemMove.x,y:framePointAfterSystemMove.y,button:'left',clickCount:1});
  for(let step=1;step<=5;step+=1){win.webContents.sendInputEvent({type:'mouseMove',x:framePointAfterSystemMove.x+step*12,y:framePointAfterSystemMove.y,button:'left'});await pause(100);}
  win.webContents.sendInputEvent({type:'mouseUp',x:framePointAfterSystemMove.x+60,y:framePointAfterSystemMove.y,button:'left',clickCount:1});
  await pause(700);
  console.log('PANEL_FRAME_DRAG',JSON.stringify({projection:framePointAfterSystemMove,before:beforeFrameDrag,after:await spatial(win)}));
  writeFileSync(join(__dirname,'phase101-growth-ui-system.png'),(await win.webContents.capturePage()).toPNG());
  win.destroy(); app.exit(0);
}).catch((error)=>{console.error('ERROR',error.stack||String(error));app.exit(1);});

module.exports = { app, BrowserWindow, pause, apiExpr, renderExpr, evaluate, assert, point, clickPoint, click, key, setGrowthWithKeyboard, state, spatial, frameScreenPoint, inspectRenderHeap };
