const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function click(win, label) {
  const rect = await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>
      item.textContent.trim()===${JSON.stringify(label)} ||
      item.title===${JSON.stringify(label)} ||
      item.getAttribute('aria-label')===${JSON.stringify(label)});
    if (!button) return null;
    button.scrollIntoView({block:'center'});
    const r=button.getBoundingClientRect();
    return {x:Math.round(r.x<316?Math.min(r.x+r.width/2,250):r.x+r.width/2),y:Math.round(r.y+r.height/2)};
  })()`);
  assert.ok(rect, `Botón no encontrado: ${label}`);
  for(const type of ['mouseMove','mouseDown','mouseUp']) {
    win.webContents.sendInputEvent({type,x:rect.x,y:rect.y,button:'left',clickCount:1});
    await sleep(80);
  }
  await sleep(1200);
}

async function setSelect(win, label, value) {
  await win.webContents.executeJavaScript(`(() => {
    const select=[...document.querySelectorAll('label')]
      .find((item)=>item.textContent.trim()===${JSON.stringify(label)})?.nextElementSibling;
    if (!select || select.tagName!=='SELECT') throw new Error('Selector ausente: ${label}');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')
      .set.call(select,${JSON.stringify(value)});
    select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await sleep(300);
}

async function inspect(win) {
  return win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const api=fiber?.memoizedProps?.threeApiRef?.current;
    const selected=api?.getActivePart();
    const assembly=selected?.userData?.kind==='KONCISA_PLUS_ASSEMBLY' ? selected : selected?.parent;
    const duct=assembly?.children?.find((item)=>item.userData?.kind==='ducto' && item.userData?.meta?.isSpecial);
    if(!duct) throw new Error('Ducto especial ausente');
    duct.updateMatrixWorld(true);
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],names=[];
    duct.traverse((mesh)=>{
      if(!mesh.isMesh || !mesh.name.startsWith('ducto-')) return;
      names.push(mesh.name); mesh.geometry.computeBoundingBox();
      const b=mesh.geometry.boundingBox,m=mesh.matrixWorld.elements;
      for(const x of [b.min.x,b.max.x]) for(const y of [b.min.y,b.max.y]) for(const z of [b.min.z,b.max.z]) {
        const p=[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
        for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
      }
    });
    const id=duct.userData.instanceId;
    const normal=api.getPartsSnapshot2D().find((item)=>item.instanceId===id);
    const detailed=api.getPartsSnapshot2D({detailed2DIds:['ASSEMBLY:'+duct.userData.parentAssemblyId]})
      .find((item)=>item.instanceId===id);
    const cap=duct.getObjectByName('ducto-terminal-cierre');
    const skirt=duct.getObjectByName('ducto-terminal-faldon-frontal');
    return {min,max,names,rotationY:duct.rotation.y,
      capLocalX:cap?.position.x ?? null,
      capWorld:cap?.getWorldPosition(cap.position.clone()).toArray() ?? null,
      skirtWorld:skirt?.getWorldPosition(skirt.position.clone()).toArray() ?? null,
      side:duct.userData.meta.side,mode:duct.userData.meta.tipoModulo,
      access:duct.userData.meta.accesoCableado,normal,detailed};
  })()`);
}

app.whenReady().then(async () => {
  const win=new BrowserWindow({width:1600,height:1000,show:false});
  await win.loadURL('http://localhost:5173/');
  await sleep(7000);
  await click(win,'Administrador');
  await sleep(7000);
  await click(win,'Koncisa Plus');
  console.log('PANEL KONCISA');
  await win.webContents.executeJavaScript(`(() => {
    const checkbox=[...document.querySelectorAll('label')]
      .find((item)=>item.textContent.includes('Puesto especial'))?.querySelector('input');
    if(!checkbox) throw new Error('Puesto especial ausente'); checkbox.click();
  })()`);
  await setSelect(win,'Largo real','1100');
  console.log('LARGO 1100');
  await setSelect(win,'Acceso para cableado','grommet');
  console.log('GROMMET');
  if (!process.argv.includes('--double-only')) {
  await click(win,'Configurar ductos');
  await setSelect(win,'Módulo 1','INTERMEDIO');
  await click(win,'Cerrar');
  for(const [access,expectedLength,expectedDepth,feature] of [
    ['GROMMET',1.098,0.128,'ducto-intermedio-tapa-retorno'],
    ['PASACABLE',1.1571,0.1065,'ducto-intermedio-riel-posterior'],
  ]) {
    if(access==='PASACABLE') await setSelect(win,'Acceso para cableado','pasacable');
    await click(win,'Crear puesto');
    await sleep(2500);
    const result=await inspect(win);
    console.log(JSON.stringify({access,min:result.min,max:result.max,names:result.names}));
    assert.equal(result.mode.toUpperCase(),'INTERMEDIO');
    assert.equal(result.access.toUpperCase(),access);
    assert.ok(Math.abs(result.max[0]-result.min[0]-expectedLength)<0.003);
    assert.ok(Math.abs(result.max[2]-result.min[2]-expectedDepth)<0.003);
    assert.ok(result.names.includes(feature));
    assert.ok(result.normal && result.detailed?.detailedFootprint);
  }
  }
  await setSelect(win,'Tipo de puesto','doble');
  console.log('PUESTO DOBLE');
  const specialState=await win.webContents.executeJavaScript(`(() => ({
    checked:[...document.querySelectorAll('label')].find((item)=>item.textContent.includes('Puesto especial'))?.querySelector('input')?.checked,
    length:[...document.querySelectorAll('label')].find((item)=>item.textContent.trim()==='Largo real')?.nextElementSibling?.value
  }))()`);
  console.log('DOUBLE STATE',specialState);
  if(!specialState.checked) await win.webContents.executeJavaScript(`(() => {
    [...document.querySelectorAll('label')].find((item)=>item.textContent.includes('Puesto especial'))?.querySelector('input')?.click();
  })()`);
  await setSelect(win,'Largo real','1100');
  await setSelect(win,'Acceso para cableado','grommet');
  if (!process.argv.includes('--double-only')) {
    await click(win,'Configurar ductos');
    await setSelect(win,'Módulo 1','TERMINAL');
    await click(win,'Cerrar');
  }
  await click(win,'Crear puesto');
  await sleep(2500);
  const doubleBefore=await inspect(win);
  console.log(JSON.stringify({type:'DOUBLE_GROMMET_LEFT',min:doubleBefore.min,max:doubleBefore.max,rotationY:doubleBefore.rotationY,capLocalX:doubleBefore.capLocalX,capWorld:doubleBefore.capWorld,skirtWorld:doubleBefore.skirtWorld}));
  assert.equal(doubleBefore.mode.toUpperCase(),'TERMINAL');
  assert.ok(Math.abs(doubleBefore.max[0]-doubleBefore.min[0]-0.8855)<0.003);
  assert.ok(Math.abs(doubleBefore.max[2]-doubleBefore.min[2]-0.2585)<0.003);
  assert.ok(doubleBefore.capLocalX>0.8);
  await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const api=fiber.memoizedProps.threeApiRef.current;
    const duct=api.getActivePart().children.find((item)=>item.userData?.kind==='ducto');
    api.selectObject(duct);
  })()`);
  await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    return fiber.memoizedProps.threeApiRef.current.rotateSelectedDuct180();
  })()`);
  const doubleAfter=await inspect(win);
  console.log(JSON.stringify({type:'DOUBLE_GROMMET_RIGHT',min:doubleAfter.min,max:doubleAfter.max,rotationY:doubleAfter.rotationY,capLocalX:doubleAfter.capLocalX,capWorld:doubleAfter.capWorld,skirtWorld:doubleAfter.skirtWorld}));
  assert.ok(Math.abs(doubleBefore.rotationY-Math.PI)<0.001);
  assert.ok(Math.abs(doubleAfter.rotationY)<0.001);
  assert.equal(doubleAfter.side,'RIGHT');
  assert.ok(doubleAfter.capLocalX<0.06);
  assert.ok(Math.abs(doubleAfter.max[2]-doubleAfter.min[2]-0.2585)<0.003);
  assert.ok(doubleAfter.normal && doubleAfter.detailed?.detailedFootprint);
  app.exit(0);
}).catch((error)=>{console.error(error.stack||error);app.exit(1);});
