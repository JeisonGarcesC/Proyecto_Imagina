const { app, BrowserWindow } = require('electron');
const { readFileSync } = require('node:fs');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (name, value) => console.log(`${name} ${JSON.stringify(value)}`);
const assert = (value, message) => { if (!value) throw new Error(message); };
async function drag(win,x1,y1,x2,y2,onMove=null) {
  win.webContents.sendInputEvent({type:'mouseMove',x:x1,y:y1});
  win.webContents.sendInputEvent({type:'mouseDown',x:x1,y:y1,button:'left',clickCount:1});
  for(let i=1;i<=8;i++){win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(x1+(x2-x1)*i/8),y:Math.round(y1+(y2-y1)*i/8),button:'left'});await sleep(90);if(i===8 && onMove) await onMove();}
  win.webContents.sendInputEvent({type:'mouseUp',x:x2,y:y2,button:'left',clickCount:1});
  await sleep(1200);
}
function changes(before,after) {
  const previous=new Map(before.physical.map(item=>[item.id,item]));
  return after.physical.filter(item=>Math.hypot(item.x-previous.get(item.id).x,item.z-previous.get(item.id).z)>1e-5);
}
async function quoteAndExport(win,path){
  const open=await win.webContents.executeJavaScript(`[...document.querySelectorAll('details')].find(el=>el.querySelector(':scope > summary')?.textContent.trim()==='Comercial · BOM y cotización')?.open`);
  if(!open) await click(win,'Comercial · BOM y cotización','summary');
  await click(win,'Cotización');
  const download=new Promise((resolve,reject)=>win.webContents.session.once('will-download',(_event,item)=>{
    item.setSavePath(path); item.once('done',(_event,state)=>state==='completed'?resolve():reject(new Error(`Cotización: ${state}`)));
  }));
  await click(win,'Exportar JSON comercial');
  await Promise.race([download,sleep(10000).then(()=>{throw new Error('Descarga de cotización no completada');})]);
  return JSON.parse(readFileSync(path,'utf8'));
}

async function click(win, label, selector = 'button', index = 0) {
  const rect = await win.webContents.executeJavaScript(`(() => {
    const list = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(el => el.textContent.trim() === ${JSON.stringify(label)} || el.title === ${JSON.stringify(label)} || el.getAttribute('aria-label') === ${JSON.stringify(label)});
    const el = list[${index}]; if (!el) return null;
    el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect();
    const centerX=r.x+r.width/2;
    return { x: Math.round(r.x<316 ? Math.min(centerX,250) : centerX), y: Math.round(r.y+r.height/2), disabled: !!el.disabled };
  })()`);
  assert(rect && !rect.disabled, `Botón no disponible: ${label}`);
  log('CLICK',{label,...rect});
  for (const type of ['mouseMove','mouseDown','mouseUp']) {win.webContents.sendInputEvent({type,x:rect.x,y:rect.y,button:'left',clickCount:1}); await sleep(80);}
  await sleep(2400);
}

async function chooseSequence(win, label, index) {
  const rect = await win.webContents.executeJavaScript(`(() => {
    const el = [...document.querySelectorAll('label')].find(el => el.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector('select');
    if (!el) return null; el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect();
    return {x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2), options:el.options.length};
  })()`);
  assert(rect?.options > index, `Selector no disponible: ${label}`);
  win.webContents.sendInputEvent({type:'mouseDown',x:rect.x,y:rect.y,button:'left',clickCount:1});
  win.webContents.sendInputEvent({type:'mouseUp',x:rect.x,y:rect.y,button:'left',clickCount:1});
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Home'});
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Home'});
  for(let i=0;i<index;i++) {win.webContents.sendInputEvent({type:'keyDown',keyCode:'Down'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Down'});}
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Return'});
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Return'});
  await sleep(300);
  let value = await win.webContents.executeJavaScript(`(() => [...document.querySelectorAll('label')].find(el => el.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector('select')?.value)()`);
  if (!value) {
    value = await win.webContents.executeJavaScript(`(() => {
      const el=[...document.querySelectorAll('label')].find(el=>el.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector('select');
      const next=el?.options[${index}]?.value; if(!next) return '';
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,next);
      el.dispatchEvent(new Event('change',{bubbles:true})); return next;
    })()`);
    log('SELECT_FALLBACK_DOM_CHANGE',{label,index,value});
  }
  log('SELECT', {label,index,value});
  assert(value, `No se seleccionó ${label}`);
}

const read = win => win.webContents.executeJavaScript(`(() => {
  const heading = [...document.querySelectorAll('h3')].find(el => el.textContent.trim()==='CRITERIUM 8');
  let fiber = heading?.[Object.keys(heading).find(key => key.startsWith('__reactFiber'))];
  while(fiber && !fiber.memoizedProps?.threeApiRef?.current) fiber=fiber.return;
  const api=fiber?.memoizedProps?.threeApiRef?.current;
  const structure=api?.getCritteriumStructure?.();
  if(!structure) return {error:'NO_STRUCTURE'};
  const systemId=structure.systems[0]?.systemId;
  const bom=systemId?api.getCritteriumOfficeSummary?.(systemId):null;
  return {systems:structure.systems.map(item=>({systemId:item.systemId,sequenceIds:item.sequenceIds,connections:item.connections})),
    bom:bom?{rows:bom.rows.map(row=>({code:row.code,reference:row.reference,qty:row.qty,material:row.materialCommercial,finish:row.finishCommercial})),moduleCount:bom.moduleCount}:null,
    sequences:structure.sequences.map(item=>({sequenceId:item.sequenceId,slots:item.slots.map(slot=>({slotId:slot.slotId,moduleId:slot.moduleId,frameId:slot.frameId,position:slot.position,transformOverride:slot.transformOverride}))})),
    physical:(api.getPartsSnapshot2D?.()||[]).filter(item=>item.kind==='CRITTERIUM_8_ASSEMBLY').map(item=>({id:item.id,x:item.x,z:item.z}))};
})()`);

app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:1600,height:1000,show:false});
  await win.loadURL('http://localhost:5173/'); await sleep(5000);
  await click(win,'Administrador'); await sleep(6000);
  log('POST_LOGIN', (await win.webContents.executeJavaScript('document.body.innerText')).slice(0,500));
  await click(win,'Critterium 8'); await click(win,'Crear oficina vacía');
  const requestedSequences=process.env.PHASE83_DIAG_SNAP?2:3;
  for(let i=0;i<requestedSequences;i++) {await click(win,'Crear y agregar al sistema'); log('CREATE_COUNT',{count:(await read(win)).systems[0]?.sequenceIds.length,status:await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`)});}
  const initial=await read(win); log('INITIAL', initial);
  if(process.env.PHASE83_DIAG_SNAP){
    await click(win,'Alinear extremos');
    const aligned=await read(win);
    const points=await win.webContents.executeJavaScript(`(() => {
      const heading=[...document.querySelectorAll('h3')].find(el=>el.textContent.trim()==='CRITERIUM 8');
      let fiber=heading?.[Object.keys(heading).find(key=>key.startsWith('__reactFiber'))];
      while(fiber&&!fiber.memoizedProps?.threeApiRef?.current) fiber=fiber.return;
      const api=fiber.memoizedProps.threeApiRef.current;
      return ${JSON.stringify(initial.systems[0].sequenceIds)}.map(id=>({id,points:api.getCritteriumConnectionPoints(id)}));
    })()`);
    log('SNAP_ALIGNED',{physical:aligned.physical,points});
    writeFileSync(join(__dirname,'phase83-snap-aligned.png'),(await win.webContents.capturePage()).toPNG());
    app.exit(0);return;
  }
  assert(initial.systems.length===1 && initial.systems[0].sequenceIds.length===3,'No se creó sistema de tres secuencias');
  if(process.env.PHASE83_DIAG_SYSTEM){
    await click(win,'Seleccionar sistema');
    log('SYSTEM_FRESH_SELECTION',await win.webContents.executeJavaScript(`document.body.innerText.slice(-260)`));
    await drag(win,874,460,974,460,async()=>log('SYSTEM_FRESH_INTERMEDIATE',{changedFrames:changes(initial,await read(win)).length}));
    const after=await read(win);
    log('SYSTEM_FRESH_DRAG',{changedFrames:changes(initial,after).length,before:initial.physical,after:after.physical});
    assert(changes(initial,after).length===6,'El sistema debe mover sus seis frames');
    assert(after.systems[0].systemId===initial.systems[0].systemId,'SystemId cambió al mover');
    const start=new Map(initial.physical.map(item=>[item.id,item]));
    const deltas=after.physical.map(item=>({x:item.x-start.get(item.id).x,z:item.z-start.get(item.id).z}));
    assert(deltas.every(item=>Math.hypot(item.x-deltas[0].x,item.z-deltas[0].z)<1e-6),'Los frames no comparten el delta del sistema');
    for(const [key,expected] of [['Z',initial],['Y',after]]){
      win.webContents.sendInputEvent({type:'keyDown',keyCode:key,modifiers:['control']});
      win.webContents.sendInputEvent({type:'keyUp',keyCode:key,modifiers:['control']});
      await sleep(1000);
      const state=await read(win);
      assert(state.physical.every(item=>{const target=expected.physical.find(frame=>frame.id===item.id);return target&&Math.hypot(item.x-target.x,item.z-target.z)<1e-6;}),`Ctrl+${key} no restauró el sistema`);
      log('SYSTEM_HISTORY',{key,pass:true});
    }
    log('SYSTEM_MOVEMENT_ASSERTION',{pass:true,frames:6,delta:deltas[0],systemId:after.systems[0].systemId});
    app.exit(0);return;
  }
  await drag(win,874,460,974,460);
  const movedSequence=await read(win);
  const sequenceChanged=changes(initial,movedSequence);
  assert(sequenceChanged.length===2,'El arrastre de secuencia no movió exactamente dos frames');
  assert(movedSequence.systems[0].systemId===initial.systems[0].systemId,'El arrastre cambió el systemId');
  assert(JSON.stringify(movedSequence.bom.rows)===JSON.stringify(initial.bom.rows),'El arrastre de secuencia cambió el BOM');
  log('SEQUENCE_DRAG',{changedFrames:sequenceChanged.length,systemId:movedSequence.systems[0].systemId,bomUnchanged:true});
  writeFileSync(join(__dirname,'phase83-before-system-drag.png'),(await win.webContents.capturePage()).toPNG());
  await click(win,'Seleccionar sistema');
  log('SYSTEM_SELECTION_DIAGNOSTIC',await win.webContents.executeJavaScript(`({properties:document.body.innerText.slice(-500),stack:document.elementsFromPoint(840,470).slice(0,5).map(el=>({tag:el.tagName,klass:el.className,text:el.textContent?.slice(0,35)}))})`));
  await win.webContents.executeJavaScript(`(() => { window.__phase83SystemPointer=[]; const canvas=document.querySelector('canvas'); for(const type of ['pointerdown','pointermove','pointerup']) canvas.addEventListener(type,e=>window.__phase83SystemPointer.push({type,x:e.clientX,y:e.clientY,buttons:e.buttons}),true); })()`);
  await drag(win,840,470,940,470,async()=>log('SYSTEM_INTERMEDIATE',{changedFrames:changes(movedSequence,await read(win)).length}));
  const movedSystem=await read(win);
  log('SYSTEM_DRAG',{changedFrames:changes(movedSequence,movedSystem).length,systemId:movedSystem.systems[0].systemId});
  log('SYSTEM_POINTER_EVENTS',await win.webContents.executeJavaScript(`window.__phase83SystemPointer`));
  log('SYSTEM_AFTER_PROPERTIES',await win.webContents.executeJavaScript(`document.body.innerText.slice(-450)`));
  if(process.env.PHASE83_DIAG_SYSTEM) {
    let previous=movedSystem;
    for(const [x,y] of [[620,550],[700,600],[900,440],[735,480]]){
      await click(win,'Seleccionar sistema');
      await drag(win,x,y,x+100,y);
      const after=await read(win);
      log('SYSTEM_PROBE',{x,y,changedFrames:changes(previous,after).length,properties:await win.webContents.executeJavaScript(`document.body.innerText.slice(-160)`)});
      previous=after;
    }
    app.exit(0);return;
  }
  await click(win,'Alinear extremos');
  const aligned=await read(win);
  log('ALIGNED',{connections:aligned.systems[0].connections.length,bom:aligned.bom});
  await chooseSequence(win,'Secuencia origen',1);
  await chooseSequence(win,'Secuencia destino',2);
  await click(win,'Conectar extremos cercanos');
  const connected=await read(win);
  log('CONNECT_RESULT',{connections:connected.systems[0].connections,status:await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`)});
  assert(connected.systems[0].connections.length===1,'La conexión A-B no se registró');
  assert(JSON.stringify(connected.bom.rows)===JSON.stringify(aligned.bom.rows),'Conectar cambió el BOM');
  if(connected.systems[0].connections.length===1){
    await chooseSequence(win,'Secuencia origen',2);
    await chooseSequence(win,'Secuencia destino',1);
    await click(win,'Conectar extremos cercanos');
    const inverse=await read(win);
    log('INVERSE_RESULT',{count:inverse.systems[0].connections.length,status:await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`)});
    assert(inverse.systems[0].connections.length===1,'La conexión inversa creó un duplicado');
    await click(win,'Organizar oficina');
    const organized=await read(win);
    log('ORGANIZE_RESULT',{count:organized.systems[0].connections.length,status:await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`)});
    assert(organized.systems[0].connections.length===1,'Organizar perdió la conexión');
    assert(JSON.stringify(organized.bom.rows)===JSON.stringify(aligned.bom.rows),'Organizar cambió el BOM');
    const buttons=await win.webContents.executeJavaScript(`[...document.querySelectorAll('button')].map(el=>el.textContent.trim()).filter(text=>text.startsWith('Desconectar '))`);
    assert(buttons.length===1,'No aparece control para desconectar');
    await click(win,buttons[0]);
    const disconnected=await read(win);
    log('DISCONNECT_RESULT',{count:disconnected.systems[0].connections.length,frames:disconnected.physical.length});
    assert(disconnected.systems[0].connections.length===0,'No se eliminó la conexión');
    assert(disconnected.physical.length===6,'Desconectar eliminó frames');
    assert(JSON.stringify(disconnected.bom.rows)===JSON.stringify(aligned.bom.rows),'Desconectar cambió el BOM');
    log('BOM_SPATIAL_INVARIANCE',{pass:true,moduleCount:disconnected.bom.moduleCount,rows:disconnected.bom.rows.length});
    for(const [key,expected] of [['Z',1],['Y',0]]) {
      win.webContents.sendInputEvent({type:'keyDown',keyCode:key,modifiers:['control']});
      win.webContents.sendInputEvent({type:'keyUp',keyCode:key,modifiers:['control']});
      await sleep(1200);
      const state=await read(win);
      assert(state.systems[0].connections.length===expected,`Ctrl+${key} no restauró la conexión esperada`);
      log('CONNECTION_HISTORY',{key,connections:state.systems[0].connections.length});
    }
    await click(win,'Comercial · BOM y cotización','summary');
    await click(win,'Cotización');
    const quotationText=await win.webContents.executeJavaScript(`document.body.innerText.slice(-2500)`);
    log('QUOTATION_UI',quotationText.slice(-700));
    const exportPath=join(__dirname,'phase83-export.json');
    const download=new Promise((resolve,reject)=>{
      win.webContents.session.once('will-download',(_event,item)=>{
        item.setSavePath(exportPath);
        item.once('done',(_event,state)=>state==='completed'?resolve():reject(new Error(`Exportación: ${state}`)));
      });
    });
    await click(win,'Exportar JSON comercial');
    await Promise.race([download,sleep(10000).then(()=>{throw new Error('Descarga JSON no completada');})]);
    const exported=JSON.parse(readFileSync(exportPath,'utf8'));
    log('EXPORT_JSON',{keys:Object.keys(exported),systemId:exported.systemId,bytes:readFileSync(exportPath).length});
    assert(!JSON.stringify(exported).includes('Object3D'),'La exportación contiene Object3D');
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'Z',modifiers:['control']});
    win.webContents.sendInputEvent({type:'keyUp',keyCode:'Z',modifiers:['control']});
    await sleep(900);
    const beforeSave=await read(win);
    assert(beforeSave.systems[0].connections.length===1,'No se restauró la conexión para persistencia');
    const quoteBefore=await quoteAndExport(win,join(__dirname,'phase83-quote-before.json'));
    const projectPath=join(__dirname,'phase83-project.json');
    const projectDownload=new Promise((resolve,reject)=>win.webContents.session.once('will-download',(_event,item)=>{
      item.setSavePath(projectPath);
      item.once('done',(_event,state)=>state==='completed'?resolve():reject(new Error(`Guardar: ${state}`)));
    }));
    await click(win,'Archivo'); await click(win,'Guardar');
    await Promise.race([projectDownload,sleep(10000).then(()=>{throw new Error('Guardado no completado');})]);
    const project=JSON.parse(readFileSync(projectPath,'utf8'));
    log('PROJECT_SAVED',{bytes:readFileSync(projectPath).length,keys:Object.keys(project)});
    const newVisible=await win.webContents.executeJavaScript(`[...document.querySelectorAll('button')].some(el=>el.textContent.trim()==='Nuevo')`);
    if(!newVisible) await click(win,'Archivo');
    await click(win,'Nuevo');
    await sleep(1200);
    log('PROJECT_CLEARED',await read(win));
    const source=readFileSync(projectPath,'utf8');
    await win.webContents.executeJavaScript(`(() => {
      const input=document.querySelector('input[type=file][accept="application/json"]');
      if(!input) throw new Error('Input de abrir proyecto no encontrado');
      const file=new File([${JSON.stringify(source)}],'proyecto-imagina.json',{type:'application/json'});
      const transfer=new DataTransfer(); transfer.items.add(file); input.files=transfer.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await sleep(5500);
    const reopened=await read(win);
    log('PROJECT_REOPENED',{systemId:reopened.systems[0]?.systemId,sequences:reopened.systems[0]?.sequenceIds.length,connections:reopened.systems[0]?.connections.length,physical:reopened.physical.length});
    assert(reopened.systems[0]?.systemId===beforeSave.systems[0].systemId,'SystemId cambió al reabrir');
    assert(JSON.stringify(reopened.systems[0].sequenceIds)===JSON.stringify(beforeSave.systems[0].sequenceIds),'SequenceIds cambiaron al reabrir');
    assert(reopened.systems[0].connections.length===1,'Conexión no persistió');
    assert(JSON.stringify(reopened.systems[0].connections)===JSON.stringify(beforeSave.systems[0].connections),'IDs o terminales de conexión cambiaron al reabrir');
    assert(JSON.stringify(reopened.sequences)===JSON.stringify(beforeSave.sequences),'Slots, módulos, frames, orden o posiciones lógicas cambiaron al reabrir');
    assert(reopened.physical.length===6,'Frames no persistieron');
    for(const frame of beforeSave.physical){
      const result=reopened.physical.find(item=>item.id===frame.id);
      assert(result && Math.hypot(result.x-frame.x,result.z-frame.z)<1e-6,`Posición física cambió al reabrir: ${frame.id}`);
    }
    assert(JSON.stringify(reopened.bom.rows)===JSON.stringify(beforeSave.bom.rows),'BOM cambió al reabrir');
    log('PERSISTENCE_ASSERTION',{pass:true,systemId:reopened.systems[0].systemId,sequenceCount:3,frameCount:6,bomRows:reopened.bom.rows.length,slotAndModuleIds:true,physicalPositions:true,connectionEndpoints:true});
    const quoteAfter=await quoteAndExport(win,join(__dirname,'phase83-quote-after.json'));
    const commercial=value=>({systemId:value.systemId,currency:value.currency,items:value.items,subtotal:value.subtotal,total:value.total,diagnostics:value.diagnostics});
    assert(JSON.stringify(commercial(quoteBefore))===JSON.stringify(commercial(quoteAfter)),'Cotización cambió al reabrir');
    log('QUOTATION_PERSISTENCE',{pass:true,items:quoteAfter.items.length,total:quoteAfter.total,currency:quoteAfter.currency});
  }
  app.exit(0);
}).catch(error=>{log('ERROR',error.stack||String(error));app.exit(1);});
