const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (value, reason) => { if (!value) throw new Error(reason); };
const log = (name, value) => console.log(`${name} ${JSON.stringify(value)}`);
const apiExpr = `(() => {
  const heading = [...document.querySelectorAll('h3')].find(x => x.textContent.trim() === 'CRITERIUM 8');
  let fiber = heading?.[Object.keys(heading).find(k => k.startsWith('__reactFiber'))];
  while (fiber && !fiber.memoizedProps?.threeApiRef?.current) fiber = fiber.return;
  return fiber?.memoizedProps?.threeApiRef?.current;
})()`;
const sceneExpr = `(() => {
  let node = document.querySelector('canvas')?.parentElement, fiber = null;
  while (node && !fiber) { fiber = node[Object.keys(node).find(k => k.startsWith('__reactFiber'))]; node = node.parentElement; }
  while (fiber && fiber.type?.name !== 'ThreeCanvas') fiber = fiber.return;
  let hook = fiber?.memoizedState;
  while (hook) { if (hook.memoizedState?.current?.isScene) return hook.memoizedState.current; hook = hook.next; }
  return null;
})()`;
async function evaluate(win, code) { return win.webContents.executeJavaScript(code); }
async function click(win, label, selector='button') {
  const p = await evaluate(win, `(() => {const e=[...document.querySelectorAll(${JSON.stringify(selector)})]
    .find(x=>x.textContent.trim()===${JSON.stringify(label)}||x.title===${JSON.stringify(label)});
    if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
    return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),disabled:e.disabled};})()`);
  check(p && !p.disabled, `Control no disponible: ${label}`);
  for (const type of ['mouseMove','mouseDown','mouseUp']) {
    win.webContents.sendInputEvent({type,x:p.x,y:p.y,button:'left',clickCount:1});
    await sleep(90);
  }
  await sleep(500);
}
async function state(win) { return evaluate(win, `(() => {
  const api=${apiExpr},scene=${sceneExpr},s=api.getCritteriumStructure();
  const nodes=scene.children.flatMap(x=>x.userData?.kind==='CRITERIUM_SYSTEM'?[x,...x.children]:[]);
  return {system:s.systems[0],sequences:s.sequences.map(x=>({sequenceId:x.sequenceId,slots:x.slots})),
    transforms:nodes.filter(x=>x.userData?.kind==='CRITERIUM_SYSTEM'||x.userData?.kind==='CRITTERIUM_8_SEQUENCE_ASSEMBLY')
      .map(x=>({id:x.userData.systemId||x.userData.sequenceId,position:x.position.toArray(),rotation:x.rotation.y})),
    bom:api.getCritteriumOfficeSummary(s.systems[0].systemId)?.bom};})()`); }
async function installCameraProbe(win) { return evaluate(win, `new Promise(resolve=>{
  const scene=${sceneExpr},system=scene.children.find(x=>x.userData?.kind==='CRITERIUM_SYSTEM');
  const meshes=[];system.traverse(x=>{if(x.isMesh&&x.visible)meshes.push(x)});
  const originals=meshes.map(x=>x.onBeforeRender);window.__phase93Camera=null;
  meshes.forEach((mesh,i)=>{mesh.onBeforeRender=function(renderer,scene,camera,...rest){
    window.__phase93Camera=camera;if(originals[i])originals[i].call(this,renderer,scene,camera,...rest)}});
  setTimeout(()=>{meshes.forEach((mesh,i)=>{mesh.onBeforeRender=originals[i]});
    resolve({captured:!!window.__phase93Camera,meshCount:meshes.length})},1100);
})`); }
async function geometry(win, distanceM) { return evaluate(win, `(async()=>{try{
  const api=${apiExpr},scene=${sceneExpr},camera=window.__phase93Camera;
  if(!camera)throw new Error('Cámara no capturada');
  const structure=api.getCritteriumStructure(),system=scene.children.find(x=>x.userData?.systemId===structure.systems[0].systemId);
  const sequences=structure.sequences.map(x=>system.children.find(y=>y.userData?.sequenceId===x.sequenceId));
  const source=sequences[1],target=sequences[0];
  const [{resolveCritteriumConnectionPoints},{classifyCritteriumConnection},{Raycaster,Plane,Vector3,Vector2}]=await Promise.all([
    import('/src/mepal/critterium8/system/layout/CritteriumConnectionResolver.js'),
    import('/src/mepal/critterium8/system/layout/CritteriumConnectionRules.js'),import('/node_modules/.vite/deps/three.js')]);
  const a=resolveCritteriumConnectionPoints(source),b=resolveCritteriumConnectionPoints(target);
  const pair=a.flatMap(origin=>b.map(destination=>({origin,destination,rule:classifyCritteriumConnection(origin,destination)})))
    .find(x=>x.rule.valid&&x.rule.type==='LINEAR');
  if(!pair)throw new Error('No hay terminales LINEAR compatibles');
  const canvas=document.querySelector('canvas').getBoundingClientRect();
  const project=point=>{const p=new Vector3(...point).project(camera);return {x:canvas.left+(p.x+1)*canvas.width/2,
    y:canvas.top+(1-p.y)*canvas.height/2,z:p.z}};
  const bounds=new (await import('/node_modules/.vite/deps/three.js')).Box3().setFromObject(source);
  const meshes=[];source.traverse(x=>{if(x.isMesh&&x.visible&&x.geometry?.boundingBox){
    const box=x.geometry.boundingBox.clone().applyMatrix4(x.matrixWorld),center=box.getCenter(new Vector3());
    if(box.max.y-box.min.y>0.8||x.name.includes('BOTTOM_PLINTH'))
      meshes.push({name:x.name,world:center.toArray(),screen:project(center.toArray())})}});
  const pickable=meshes.map(mesh=>{
    const ray=new Raycaster(),x=Math.round(mesh.screen.x),y=Math.round(mesh.screen.y);
    ray.setFromCamera(new Vector2(2*(x-canvas.left)/canvas.width-1,1-2*(y-canvas.top)/canvas.height),camera);
    const hit=ray.intersectObjects(system.children,true)[0]?.object;
    let root=hit;while(root&&root.parent!==system)root=root.parent;
    return {...mesh,hitKind:root?.userData?.kind,hitSource:root===source};
  }).filter(x=>x.hitSource);
  const grip=pickable.find(x=>x.name.includes('LEFT_POST'))||pickable.find(x=>x.name.includes('RIGHT_POST'))||pickable[0];
  if(!grip)throw new Error('No hay mesh de agarre visible');
  const ray=new Raycaster();ray.setFromCamera(new Vector2(2*(grip.screen.x-canvas.left)/canvas.width-1,
    1-2*(grip.screen.y-canvas.top)/canvas.height),camera);
  const ground=new Vector3();ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),0),ground);
  const offset=new Vector3(0,0,${Number(distanceM)});
  const delta=new Vector3(...pair.destination.position).add(offset).sub(new Vector3(...pair.origin.position));delta.y=0;
  const end=project(ground.clone().add(delta).toArray());
  return {origin:pair.origin.position,destination:pair.destination.position,originId:pair.origin.connectionId,
    destinationId:pair.destination.connectionId,distanceM:${Number(distanceM)},rule:pair.rule,
    grip,ground:ground.toArray(),delta:delta.toArray(),start:grip.screen,end,sourceId:source.userData.sequenceId,
    targetId:target.userData.sequenceId,bounds:[bounds.min.toArray(),bounds.max.toArray()],canvas:canvas.toJSON()};
}catch(error){return {error:error.stack||String(error)}}})()`); }
async function drag(win, g) {
  const start={x:Math.round(g.start.x),y:Math.round(g.start.y)};
  const end={x:Math.round(g.end.x),y:Math.round(g.end.y)};
  win.webContents.sendInputEvent({type:'mouseMove',...start});
  win.webContents.sendInputEvent({type:'mouseDown',...start,button:'left',clickCount:1});
  for(let i=1;i<=8;i++) {win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x+(end.x-start.x)*i/8),
    y:Math.round(start.y+(end.y-start.y)*i/8),button:'left'});await sleep(80)}
  const expected=[g.delta[0],g.delta[1],g.delta[2]];
  let convergence=null;
  for(let attempt=0;attempt<10;attempt++){
    await sleep(180);
    const actual=await evaluate(win, `(()=>{const scene=${sceneExpr};const system=scene.children.find(x=>x.userData?.kind==='CRITERIUM_SYSTEM');
      return system.children.find(x=>x.userData?.sequenceId===${JSON.stringify(g.sourceId)})?.position.toArray()})()`);
    convergence={attempt,actual,errorM:Math.hypot(actual[0]-expected[0],actual[2]-expected[2])};
    if(convergence.errorM<0.025)break;
    win.webContents.sendInputEvent({type:'mouseMove',...end,button:'left'});
  }
  const preview=await evaluate(win, `(async()=>{
    const scene=${sceneExpr},system=scene.children.find(x=>x.userData?.kind==='CRITERIUM_SYSTEM');
    const source=system.children.find(x=>x.userData?.sequenceId===${JSON.stringify(g.sourceId)});
    const {previewCritteriumSequenceSnap}=await import('/src/mepal/critterium8/system/layout/CritteriumSnapEngine.js');
    const candidate=previewCritteriumSequenceSnap(system,source);
    const markers=scene.children.filter(x=>x.userData?.isHelper&&x.children.length===4);
    return {candidate,sourcePosition:source?.position.toArray(),sourceParent:source?.parent?.userData?.kind,
      markers:markers.map(x=>({visible:x.visible,origin:x.children[0].position.toArray(),
      destination:x.children[1].position.toArray(),linePoints:x.children[3].geometry.attributes.position?.count,
      color:x.children[0].material.color.getHexString()}))};})()`);
  win.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});
  await sleep(700);
  return {convergence,preview,after:await state(win)};
}
async function undo(win) {for(const type of ['keyDown','keyUp'])win.webContents.sendInputEvent({type,keyCode:'Z',modifiers:['control']});await sleep(650)}
app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:1600,height:1000,show:false});
  await win.loadURL('http://localhost:5174/');await sleep(4000);
  await click(win,'Administrador');await sleep(4000);await click(win,'Critterium 8');
  await click(win,'Biblioteca CRITERIUM','summary');
  await evaluate(win, `(()=>{const e=document.querySelector('[aria-label="Biblioteca CRITERIUM"] select');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'OFFICE_2_3');
    e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await click(win,'Crear oficina');await sleep(2200);
  const initial=await state(win);check(initial.sequences.length===2,'La biblioteca no creó dos secuencias');
  log('INITIAL',{systemId:initial.system.systemId,sequences:initial.sequences.map(x=>({id:x.sequenceId,slots:x.slots.length})),
    transforms:initial.transforms,connectionCount:initial.system.connections.length});
  await evaluate(win, `(()=>{const x=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Puesto completo');x.click()})()`);
  log('CAMERA_PROBE',await installCameraProbe(win));
  for(const mm of [50,100,200,250,299,300,301]){
    if(mm===299&&process.env.PHASE93_ZOOM==='1'){
      const canvas=await evaluate(win, `(()=>document.querySelector('canvas').getBoundingClientRect().toJSON())()`);
      for(let i=0;i<5;i++){
        win.webContents.sendInputEvent({type:'mouseWheel',x:Math.round(canvas.x+canvas.width/2),
          y:Math.round(canvas.y+canvas.height/2),deltaY:120,deltaX:0});
        await sleep(120);
      }
      await sleep(500);
      log('ZOOM_CLOSE',await evaluate(win, `window.__phase93Camera.position.toArray()`));
      log('ZOOM_ALIVE',await evaluate(win, `document.querySelector('canvas')?.getBoundingClientRect().toJSON()`));
    }
    await evaluate(win, `(()=>{const api=${apiExpr},s=api.getCritteriumStructure();
      api.selectCritteriumSequenceById(s.sequences[1].sequenceId)})()`);
    await sleep(220);
    const g=await geometry(win,mm/1000);log('GEOMETRY',{mm,...g});check(!g.error,g.error);
    const result=await drag(win,g);log('DRAG',{mm,convergence:result.convergence,preview:result.preview,
      connectionCount:result.after.system.connections.length,connections:result.after.system.connections,
      transforms:result.after.transforms});
    check(result.convergence.errorM<0.025,`El mouse no alcanzó la secuencia en ${mm} mm`);
    if(mm<=250){
      check(result.preview.candidate?.status==='GREEN'&&result.preview.candidate?.type==='LINEAR',
        `Snap válido ausente en ${mm} mm`);
      check(result.preview.markers.some(marker=>marker.visible&&marker.linePoints===2&&marker.color==='16a34a'),
        `Marcador verde incompleto en ${mm} mm`);
      check(result.after.system.connections.length===1,`Conexión ausente en ${mm} mm`);
      check(result.after.system.connections[0].sourcePointId===g.originId&&
        result.after.system.connections[0].targetPointId===g.destinationId,
        `La conexión no conservó los terminales proyectados en ${mm} mm`);
    }
    const image=await win.webContents.capturePage();writeFileSync(join(__dirname,`phase93-${mm}.png`),image.toPNG());
    await undo(win);const restored=await state(win);
    log('UNDO',{mm,connectionCount:restored.system.connections.length,transforms:restored.transforms});
    check(restored.system.connections.length===0,`Undo no eliminó conexión en ${mm} mm`);
  }
  win.destroy();app.exit(0);
}).catch(error=>{log('ERROR',error.stack||String(error));app.exit(1)});
