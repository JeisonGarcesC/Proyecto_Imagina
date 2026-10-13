const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function click(win, label) {
  const rect = await win.webContents.executeJavaScript(`(() => {
    const element = [...document.querySelectorAll('button')].find((item) =>
      item.textContent.trim() === ${JSON.stringify(label)} || item.title === ${JSON.stringify(label)} ||
      item.getAttribute('aria-label') === ${JSON.stringify(label)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center' });
    const r = element.getBoundingClientRect();
    return { x: Math.round(r.x < 316 ? Math.min(r.x + r.width / 2, 250) : r.x + r.width / 2),
      y: Math.round(r.y + r.height / 2) };
  })()`);
  assert.ok(rect, `Botón no encontrado: ${label}`);
  for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
    win.webContents.sendInputEvent({ type, x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await sleep(80);
  }
  await sleep(1200);
}

async function inspect(win, rotate = false) {
  return win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const api=fiber?.memoizedProps?.threeApiRef?.current;
    if(!api) throw new Error('API 3D no disponible');
    const assembly=api.getActivePart();
    const root=assembly?.userData?.kind==='KONCISA_PLUS_ASSEMBLY' ? assembly : assembly?.parent;
    const duct=root?.children?.find((item)=>item.userData?.kind==='ducto' && item.userData?.meta?.isSpecial);
    if(!duct) throw new Error('Ducto terminal especial no encontrado');
    if(${rotate}) { api.selectObject(duct); return {selected:true}; }
    duct.updateMatrixWorld(true);
    const box={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
    duct.traverse((mesh)=>{
      if(!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      const local=mesh.geometry.boundingBox;
      const m=mesh.matrixWorld.elements;
      for(const x of [local.min.x,local.max.x]) for(const y of [local.min.y,local.max.y]) for(const z of [local.min.z,local.max.z]) {
        const point=[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
        for(let axis=0;axis<3;axis++) {box.min[axis]=Math.min(box.min[axis],point[axis]);box.max[axis]=Math.max(box.max[axis],point[axis]);}
      }
    });
    const meshes=[];
    duct.traverse((item)=>{if(item.isMesh && item.name.startsWith('ducto-terminal-')) meshes.push(item);});
    const cap=meshes.find((item)=>item.name==='ducto-terminal-cierre');
    const capX=cap ? cap.getWorldPosition(cap.position.clone()).x : null;
    const details=meshes.filter((item)=>
      ['ducto-terminal-cierre','ducto-terminal-riel-inferior'].includes(item.name)).map((item)=>{
      item.geometry.computeBoundingBox();
      return {name:item.name,min:item.geometry.boundingBox.min.clone().add(item.position).toArray(),
        max:item.geometry.boundingBox.max.clone().add(item.position).toArray()};
    });
    return {position:duct.position.toArray(),rotationY:duct.rotation.y,box,capX,details,
      meta:{tipoModulo:duct.userData.meta.tipoModulo,realWidthMm:duct.userData.meta.realWidthMm,
        baseX:duct.userData.meta.baseX,side:duct.userData.meta.side},
      meshes:meshes.length,features:meshes.map((item)=>item.name),
      rotated:!!duct.userData.ductRotated180,
      colors:meshes.map((item)=>item.material.color.getHexString()),
      snapshot2D:api.getPartsSnapshot2D().find((item)=>item.instanceId===duct.userData.instanceId),
      detailed2D:api.getPartsSnapshot2D({detailed2DIds:['ASSEMBLY:'+duct.userData.parentAssemblyId]})
        .find((item)=>item.instanceId===duct.userData.instanceId)};
  })()`);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 1000, show: false });
  await win.loadURL('http://localhost:5173/');
  await sleep(5000);
  await click(win, 'Administrador');
  await sleep(7000);
  await click(win, 'Koncisa Plus');
  await win.webContents.executeJavaScript(`(() => {
    const special=[...document.querySelectorAll('label')].find((item)=>item.textContent.includes('Puesto especial'))?.querySelector('input');
    if(!special) throw new Error('Opción de puesto especial ausente'); special.click();
    const length=[...document.querySelectorAll('label')].find((item)=>item.textContent.trim()==='Largo real')?.nextElementSibling;
    if(!length) throw new Error('Selector de largo ausente');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(length,'1100');
    length.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await sleep(700);
  await click(win, 'Crear puesto');
  await sleep(3500);
  const before = await inspect(win);
  console.log('ANTES', JSON.stringify({position:before.position,side:before.meta.side,box:before.box,meshes:before.meshes}));
  assert.ok(before.snapshot2D && before.detailed2D?.detailedFootprint);
  assert.ok(Math.abs(before.snapshot2D.x-(before.box.min[0]+before.box.max[0])/2)<0.003);
  assert.equal(before.meta.realWidthMm, 1100);
  assert.equal(before.meta.tipoModulo.toUpperCase(), 'TERMINAL');
  assert.ok(before.meshes >= 4);
  assert.ok(before.features.includes('ducto-terminal-tapa-retorno'));
  assert.ok(before.features.includes('ducto-terminal-soporte-2'));
  assert.ok(Math.abs(before.box.max[0] - 0.55) < 0.003);
  assert.equal(before.rotationY, 0);
  assert.ok(before.capX < (before.box.min[0] + before.box.max[0]) / 2);
  assert.ok(before.colors.every((color) => color === 'fefafc'));
  await inspect(win, true);
  await sleep(700);
  const rotated = await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    return fiber.memoizedProps.threeApiRef.current.rotateSelectedDuct180();
  })()`);
  assert.equal(rotated, true);
  const after = await inspect(win);
  console.log('DESPUÉS', JSON.stringify({position:after.position,side:after.meta.side,box:after.box,meshes:after.meshes}));
  assert.ok(after.snapshot2D && after.detailed2D?.detailedFootprint);
  assert.equal(after.snapshot2D.meta.side,'RIGHT');
  assert.ok(Math.abs(after.snapshot2D.x-(after.box.min[0]+after.box.max[0])/2)<0.003);
  assert.notDeepEqual(after.detailed2D.detailedFootprint, before.detailed2D.detailedFootprint);
  assert.ok(Math.abs(after.box.min[0] + 0.55) < 0.003);
  assert.ok(after.capX > (after.box.min[0] + after.box.max[0]) / 2);
  assert.ok(after.box.max[0] <= 0.55 + 0.003);

  await win.webContents.executeJavaScript(`(() => {
    const change=(label,value)=>{
      const sibling=[...document.querySelectorAll('label')].find((item)=>item.textContent.trim()===label)?.nextElementSibling;
      if(label==='Tipo de puesto') {
        const option=[...sibling.querySelectorAll('button')].find((item)=>item.textContent.trim().toLowerCase()===value);
        if(!option) throw new Error('Opción ausente: '+value);
        option.click();
        return;
      }
      const select=sibling?.matches?.('select') ? sibling : sibling?.querySelector?.('select');
      if(!select) throw new Error('Selector ausente: '+label+' ('+sibling?.tagName+')');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,value);
      select.dispatchEvent(new Event('change',{bubbles:true}));
    };
    change('Tipo de puesto','doble');
  })()`);
  await sleep(500);
  await win.webContents.executeJavaScript(`(() => {
    const change=(label,value)=>{
      const select=[...document.querySelectorAll('label')].find((item)=>item.textContent.trim()===label)?.nextElementSibling;
      if(!select) throw new Error('Selector ausente: '+label);
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,value);
      select.dispatchEvent(new Event('change',{bubbles:true}));
    };
    change('Largo real','1100');
    change('Acceso para cableado','pasacable');
  })()`);
  await sleep(700);
  await click(win, 'Crear puesto');
  await sleep(3500);
  const doubleBefore = await inspect(win);
  console.log('DOBLE ANTES', JSON.stringify({position:doubleBefore.position,side:doubleBefore.meta.side,box:doubleBefore.box,meshes:doubleBefore.meshes}));
  assert.ok(Math.abs(doubleBefore.box.min[0] + 0.55) < 0.003);
  assert.ok(doubleBefore.colors.every((color) => color === 'fefafc'));
  assert.ok(doubleBefore.box.min[2] >= -0.6 && doubleBefore.box.max[2] <= 0.6);
  await inspect(win, true);
  await sleep(700);
  const doubleRotated = await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    return fiber.memoizedProps.threeApiRef.current.rotateSelectedDuct180();
  })()`);
  assert.equal(doubleRotated, true);
  const doubleAfter = await inspect(win);
  console.log('DOBLE DESPUÉS', JSON.stringify({position:doubleAfter.position,side:doubleAfter.meta.side,box:doubleAfter.box,meshes:doubleAfter.meshes}));
  assert.ok(doubleAfter.snapshot2D && doubleAfter.detailed2D?.detailedFootprint);
  assert.notDeepEqual(doubleAfter.detailed2D.detailedFootprint, doubleBefore.detailed2D.detailedFootprint);
  assert.ok(Math.abs(doubleAfter.box.max[0] - 0.55) < 0.003);
  assert.ok(doubleAfter.box.max[0] <= 0.55 + 0.003);
  await win.webContents.executeJavaScript(`(() => {
    const group=document.querySelector('[role="group"][aria-label="Tipo de puesto"]');
    [...group.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Sencillo').click();
  })()`);
  await sleep(500);
  await win.webContents.executeJavaScript(`(() => {
    const select=[...document.querySelectorAll('label')].find((item)=>item.textContent.trim()==='Largo real')?.nextElementSibling;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'1100');
    select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await sleep(500);
  await click(win, 'Crear puesto');
  await sleep(3500);
  const simplePasacable = await inspect(win);
  console.log('SENCILLO PASACABLE', JSON.stringify({position:simplePasacable.position,side:simplePasacable.meta.side,box:simplePasacable.box,meshes:simplePasacable.meshes}));
  assert.ok(Math.abs(simplePasacable.box.max[0] - 0.55) < 0.003);
  assert.ok(Math.abs(simplePasacable.box.max[1] - simplePasacable.box.min[1] - 0.1355) < 0.003);
  assert.ok(simplePasacable.features.includes('ducto-terminal-riel-posterior'));
  assert.ok(simplePasacable.colors.every((color) => color === 'fefafc'));
  await win.webContents.executeJavaScript(`(() => {
    const change=(label,value)=>{
      const select=[...document.querySelectorAll('label')].find((item)=>item.textContent.trim()===label)?.nextElementSibling;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,value);
      select.dispatchEvent(new Event('change',{bubbles:true}));
    };
    const special=[...document.querySelectorAll('label')].find((item)=>item.textContent.includes('Puesto especial'))?.querySelector('input');
    special.click(); change('Acceso para cableado','grommet'); change('Largo real','1200');
  })()`);
  await sleep(700);
  await click(win, 'Crear puesto');
  await sleep(4500);
  const glbPieces=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const api=fiber.memoizedProps.threeApiRef.current;
    const assembly=api.getActivePart();
    const root=assembly?.userData?.kind==='KONCISA_PLUS_ASSEMBLY' ? assembly : assembly?.parent;
    const duct=root?.children?.find((item)=>item.userData?.kind==='ducto');
    if(!duct) throw new Error('GLB duct absent');
    duct.updateMatrixWorld(true);
    const out=[];
    duct.traverse((mesh)=>{
      if(!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox(); const box=mesh.geometry.boundingBox;
      const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
      for(const x of [box.min.x,box.max.x]) for(const y of [box.min.y,box.max.y]) for(const z of [box.min.z,box.max.z]) {
        const p=duct.worldToLocal(mesh.localToWorld(mesh.position.clone().set(x,y,z)));
        for(let i=0;i<3;i++){min[i]=Math.min(min[i],p.getComponent(i));max[i]=Math.max(max[i],p.getComponent(i));}
      }
      out.push({name:mesh.name,min,max});
    });
    return {position:duct.position.toArray(),rotation:duct.rotation.toArray(),pieces:out};
  })()`);
  console.log('GLB PIECES',JSON.stringify(glbPieces));
  assert.equal(glbPieces.rotation[1], 0);
  assert.ok(Math.abs(glbPieces.position[2] - before.position[2]) < 0.003);
  const glbCap = glbPieces.pieces.find((piece) => piece.name === '18');
  assert.ok(glbCap);
  assert.ok(Math.abs(before.capX - before.position[0] -
    (glbCap.min[0] + glbCap.max[0]) / 2) < 0.003);
  const nativeCap=before.details.find((piece)=>piece.name==='ducto-terminal-cierre');
  const nativeRail=before.details.find((piece)=>piece.name==='ducto-terminal-riel-inferior');
  const glbRail=glbPieces.pieces.find((piece)=>piece.name==='16');
  assert.ok(nativeCap&&nativeRail&&glbRail);
  assert.ok(Math.abs(nativeCap.max[2]-glbCap.max[2])<0.003);
  assert.ok(Math.abs(nativeRail.min[0]-glbRail.min[0])<0.003);
  const standardBefore=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const api=fiber.memoizedProps.threeApiRef.current;
    const assembly=api.getActivePart();
    const duct=assembly.children.find((item)=>item.userData?.kind==='ducto');
    api.selectObject(duct);
    const cap=duct.getObjectByName('18');
    cap?.geometry?.computeBoundingBox();
    return {id:duct.userData.instanceId,side:duct.userData.meta.side,
      src:duct.userData.modelSrc,rotationY:duct.rotation.y,
      capLocalX:cap?.geometry?.boundingBox?.getCenter(cap.position.clone()).x,
      assemblyId:assembly.userData.instanceId};
  })()`);
  const standardRotate=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    return fiber.memoizedProps.threeApiRef.current.rotateSelectedDuct180();
  })()`);
  const standardAfter=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const api=fiber.memoizedProps.threeApiRef.current;
    const duct=api.getActivePart();
    const cap=duct.getObjectByName('18');
    cap?.geometry?.computeBoundingBox();
    return {id:duct.userData.instanceId,side:duct.userData.meta.side,
      src:duct.userData.modelSrc,rotationY:duct.rotation.y,
      capLocalX:cap?.geometry?.boundingBox?.getCenter(cap.position.clone()).x,
      assemblyId:duct.parent?.userData?.instanceId,
      persistedSide:duct.parent?.userData?.config?.ductSides?.[0]};
  })()`);
  console.log('STANDARD ROTATE',JSON.stringify({standardBefore,standardRotate,standardAfter}));
  assert.equal(standardRotate,true);
  assert.equal(standardAfter.id,standardBefore.id);
  assert.equal(standardAfter.assemblyId,standardBefore.assemblyId);
  assert.equal(standardAfter.side,'RIGHT');
  assert.equal(standardAfter.persistedSide,'RIGHT');
  assert.match(standardAfter.src,/_DER\.glb$/);
  assert.equal(standardAfter.rotationY,0);
  assert.ok(standardBefore.capLocalX < 0.1);
  assert.ok(standardAfter.capLocalX > 0.8);
  const standardRotateBack=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    return fiber.memoizedProps.threeApiRef.current.rotateSelectedDuct180();
  })()`);
  assert.equal(standardRotateBack,true);
  const standardRestored=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const duct=fiber.memoizedProps.threeApiRef.current.getActivePart();
    return {id:duct.userData.instanceId,side:duct.userData.meta.side,src:duct.userData.modelSrc};
  })()`);
  assert.equal(standardRestored.id,standardBefore.id);
  assert.equal(standardRestored.side,'LEFT');
  assert.equal(standardRestored.src,standardBefore.src);
  await win.webContents.executeJavaScript(`(() => {
    const group=document.querySelector('[role="group"][aria-label="Tipo de puesto"]');
    [...group.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Doble').click();
  })()`);
  await sleep(500);
  await click(win,'Crear puesto');
  await sleep(3500);
  const doubleStandardBefore=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const api=fiber.memoizedProps.threeApiRef.current;
    const assembly=api.getActivePart();
    const duct=assembly.children.find((item)=>item.userData?.kind==='ducto');
    api.selectObject(duct);
    duct.updateMatrixWorld(true);
    const details=[];
    duct.traverse((child)=>{if(child.isMesh){child.geometry.computeBoundingBox();const box=child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);details.push({name:child.name,min:box.min.toArray(),max:box.max.toArray()});}});
    return {id:duct.userData.instanceId,side:duct.userData.meta.side,
      src:duct.userData.modelSrc,rotationY:duct.rotation.y,details};
  })()`);
  const doubleStandardRotate=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    return fiber.memoizedProps.threeApiRef.current.rotateSelectedDuct180();
  })()`);
  const doubleStandardAfter=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const duct=fiber.memoizedProps.threeApiRef.current.getActivePart();
    duct.updateMatrixWorld(true);
    const details=[];
    duct.traverse((child)=>{if(child.isMesh){child.geometry.computeBoundingBox();const box=child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);details.push({name:child.name,min:box.min.toArray(),max:box.max.toArray()});}});
    return {id:duct.userData.instanceId,side:duct.userData.meta.side,
      src:duct.userData.modelSrc,rotationY:duct.rotation.y,details,
      persistedSide:duct.parent?.userData?.config?.ductSides?.[0]};
  })()`);
  console.log('DOUBLE STANDARD ROTATE',JSON.stringify({doubleStandardBefore,doubleStandardRotate,doubleStandardAfter}));
  assert.equal(doubleStandardRotate,true);
  assert.equal(doubleStandardAfter.id,doubleStandardBefore.id);
  assert.match(doubleStandardBefore.src,/2KSO349000_120_DER\.glb$/);
  assert.match(doubleStandardAfter.src,/2KSO349000_120_IZQ\.glb$/);
  assert.equal(doubleStandardAfter.side,'RIGHT');
  assert.equal(doubleStandardAfter.persistedSide,'RIGHT');
  assert.equal(doubleStandardAfter.rotationY,Math.PI);
  const closureX=(details)=>details.find((mesh)=>
    mesh.max[0]-mesh.min[0]<0.06 && mesh.max[1]-mesh.min[1]>0.19)?.min[0];
  assert.ok(closureX(doubleStandardBefore.details)>0);
  assert.ok(closureX(doubleStandardAfter.details)<0);
  assert.equal(await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    return fiber.memoizedProps.threeApiRef.current.rotateSelectedDuct180();
  })()`),true);
  const doubleRestored=await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Crear puesto');
    let fiber=button?.[Object.keys(button).find((key)=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef) fiber=fiber.return;
    const duct=fiber.memoizedProps.threeApiRef.current.getActivePart();
    return {id:duct.userData.instanceId,side:duct.userData.meta.side,
      src:duct.userData.modelSrc,rotationY:duct.rotation.y};
  })()`);
  assert.equal(doubleRestored.id,doubleStandardBefore.id);
  assert.equal(doubleRestored.side,'LEFT');
  assert.equal(doubleRestored.src,doubleStandardBefore.src);
  assert.equal(doubleRestored.rotationY,Math.PI);
  app.exit(0);
}).catch((error) => { console.error(error.stack || error); app.exit(1); });
