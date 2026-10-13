const { app, BrowserWindow } = require('electron');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (condition, message) => { if (!condition) throw new Error(message); };
const log = (label, value) => console.log(`${label} ${JSON.stringify(value)}`);
const savedPath = join(app.getPath('temp'), 'phase852-critterium-project.json');

async function click(win, label, selector = 'button', index = 0) {
  const point = await win.webContents.executeJavaScript(`(() => {
    const el=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(x=>
      x.textContent.trim()===${JSON.stringify(label)} || x.title===${JSON.stringify(label)} ||
      x.getAttribute('aria-label')===${JSON.stringify(label)})[${index}];
    if(!el)return null;el.scrollIntoView({block:'center'});
    const r=el.getBoundingClientRect();return {x:Math.round(r.x<316?Math.min(r.x+r.width/2,250):r.x+r.width/2),y:Math.round(r.y+r.height/2),disabled:el.disabled};
  })()`);
  check(point && !point.disabled, `Control no disponible: ${label} ${index}`);
  for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
    win.webContents.sendInputEvent({ type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await sleep(80);
  }
  await sleep(1400);
}

async function compositionClick(win, label, sequenceIndex = 0, buttonIndex = 0) {
  const point = await win.webContents.executeJavaScript(`(() => {
    const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
    const details=[...root.querySelectorAll(':scope > div > details')];
    const section=details[${sequenceIndex}];if(!section)return null;section.open=true;
    const el=[...section.querySelectorAll('button')].filter(x=>x.textContent.trim()===${JSON.stringify(label)})[${buttonIndex}];
    if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();
    return {x:Math.round(Math.min(r.x+r.width/2,250)),y:Math.round(r.y+r.height/2),disabled:el.disabled};
  })()`);
  check(point && !point.disabled, `Acción de composición no disponible: ${label}`);
  for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
    win.webContents.sendInputEvent({ type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await sleep(80);
  }
  await sleep(1500);
}

const apiScript = `(() => {
  const heading=[...document.querySelectorAll('h3')].find(x=>x.textContent.trim()==='CRITERIUM 8');
  let fiber=heading?.[Object.keys(heading).find(k=>k.startsWith('__reactFiber'))];
  while(fiber&&!fiber.memoizedProps?.threeApiRef)fiber=fiber.return;
  return fiber?.memoizedProps?.threeApiRef?.current;
})()`;
async function snapshot(win) {
  return win.webContents.executeJavaScript(`(() => {
    const api=${apiScript};const model=api.getCritteriumStructure();const system=model.systems[0];
    const sequences=system?.sequenceIds.map(id=>model.sequences.find(x=>x.sequenceId===id));
    const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
    const savedTransforms=api.exportProject().entities.filter(x=>x.kind==='CRITTERIUM_8_SEQUENCE' || x.kind==='CRITERIUM_SYSTEM')
      .map(x=>({kind:x.kind,id:x.sequenceId||x.systemId,transform:x.transform})).sort((a,b)=>a.id.localeCompare(b.id));
    return {systemId:system?.systemId,sequenceIds:system?.sequenceIds,connections:system?.connections,savedTransforms,
      sequences:sequences?.map(s=>({sequenceId:s?.sequenceId,frameIds:s?.frameIds,
        frameInstanceIds:s?.frameInstanceIds,slots:s?.slots?.map(x=>({slotId:x.slotId,moduleId:x.moduleId,frameId:x.frameId,
          frameInstanceId:x.frameInstanceId,position:x.position,quaternion:x.quaternion}))})),
      panel:root?.innerText||null,bom:system?api.getCritteriumOfficeSummary(system.systemId):null,
      history:{canUndo:api.canUndoHistory?.(),canRedo:api.canRedoHistory?.()}};
  })()`);
}
async function startWindow() {
  const win=new BrowserWindow({width:1600,height:1000,show:false});
  await win.loadURL('http://localhost:5173/');await sleep(5000);
  await click(win,'Administrador');await sleep(6000);await click(win,'Critterium 8');
  return win;
}
async function downloadVia(win, label, path) {
  const done=new Promise((resolve,reject)=>{
    win.webContents.session.once('will-download',(_event,item)=>{
      item.setSavePath(path);
      item.once('done',(_e,state)=>state==='completed'?resolve(path):reject(new Error(`Descarga ${state}`)));
    });
  });
  if(label==='Guardar') await click(win,'Archivo');
  await click(win,label);
  return Promise.race([done,sleep(20000).then(()=>{throw new Error(`Descarga no iniciada: ${label}`);})]);
}

app.whenReady().then(async()=>{
  let win=await startWindow();
  log('EMPTY', (await snapshot(win)).panel);
  await click(win,'Crear oficina vacía');
  await click(win,'Crear y agregar al sistema');
  await click(win,'Crear y agregar al sistema');
  await compositionClick(win,'Agregar módulo',0);
  let before=await snapshot(win);
  check(before.sequenceIds?.length===2 && before.sequences.map(x=>x.slots.length).join(',')==='3,2','Escenario 3+2 incorrecto');
  log('CREATED',{systemId:before.systemId,sequenceIds:before.sequenceIds,slots:before.sequences.map(x=>x.slots.map(y=>y.slotId))});
  const spatialEdit=await win.webContents.executeJavaScript(`(async()=>{
    const api=${apiScript};const model=api.getCritteriumStructure();
    const moved=api.moveCritteriumSequenceBy(model.systems[0].systemId,model.systems[0].sequenceIds[0],{x:0.25,y:0,z:0});
    const sequence=model.sequences.find(x=>x.sequenceId===model.systems[0].sequenceIds[0]);
    const reordered=await api.editCritteriumSequenceSlot(sequence.sequenceId,'REORDER',{slotId:sequence.slots[1].slotId,index:0});
    return {moved:moved?.success,reordered:reordered?.success,reorderReason:reordered?.reason};
  })()`);
  log('SPATIAL_EDIT',spatialEdit);
  check(spatialEdit.moved && spatialEdit.reordered,'No se pudo mover/reordenar antes de guardar');
  await click(win,'Alinear extremos');
  for(const [label,index] of [['Secuencia origen',1],['Secuencia destino',2]]){
    await win.webContents.executeJavaScript(`(() => {const el=[...document.querySelectorAll('label')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector('select');
      const value=el?.options[${index}]?.value;if(!value)throw new Error('Secuencia no disponible');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  }
  await click(win,'Conectar extremos cercanos');
  before=await snapshot(win);
  log('BEFORE',{counts:before.panel?.match(/\d+ secuencias|\d+ módulos|\d+ frames|Conexiones \(\d+\)/g),connections:before.connections,bom:before.bom});
  check(before.connections?.length===1 && before.panel.includes('5 módulos') && before.panel.includes('5 frames'),'Conexión/contadores previos incorrectos');
  await win.webContents.executeJavaScript(`(() => {for(const el of document.querySelectorAll('details'))
    if(el.querySelector('summary')?.textContent.includes('Editar sistema seleccionado') ||
       el.querySelector('summary')?.textContent.includes('Comercial · BOM y cotización'))el.open=true;})()`);
  await click(win,'Cotización');
  await sleep(3000);
  const beforeQuotePath=join(app.getPath('temp'),'phase852-quote-before.json');
  await downloadVia(win,'Exportar JSON comercial',beforeQuotePath);
  const beforeQuote=JSON.parse(readFileSync(beforeQuotePath,'utf8'));
  log('QUOTE_BEFORE',{status:beforeQuote.status,items:beforeQuote.items?.length,diagnostics:beforeQuote.diagnostics});
  before=await snapshot(win);
  await downloadVia(win,'Guardar',savedPath);
  const saved=JSON.parse(readFileSync(savedPath,'utf8'));
  log('SAVED',{keys:Object.keys(saved),entities:saved.entities?.length,parts:saved.parts?.length,bytes:readFileSync(savedPath).length});
  const previousWindow=win;
  win=await startWindow();
  previousWindow.destroy();
  const empty=await snapshot(win);check(!empty.systemId,'La ventana nueva conservó el sistema en memoria');
  await win.webContents.debugger.attach('1.3');
  const {root:{nodeId:rootId}}=await win.webContents.debugger.sendCommand('DOM.getDocument');
  const {nodeId}=await win.webContents.debugger.sendCommand('DOM.querySelector',{nodeId:rootId,selector:'input[type=file][accept="application/json"]'});
  check(nodeId,'Entrada de archivo no encontrada');
  await win.webContents.debugger.sendCommand('DOM.setFileInputFiles',{nodeId,files:[savedPath]});
  win.webContents.debugger.detach();
  await sleep(7000);
  const after=await snapshot(win);
  log('AFTER',{systemId:after.systemId,sequenceIds:after.sequenceIds,connections:after.connections,
    counts:after.panel?.match(/\d+ secuencias|\d+ módulos|\d+ frames|Conexiones \(\d+\)/g),bom:after.bom,history:after.history});
  check(after.systemId===before.systemId,'systemId cambió');
  check(JSON.stringify(after.sequenceIds)===JSON.stringify(before.sequenceIds),'sequenceIds cambiaron');
  check(JSON.stringify(after.sequences)===JSON.stringify(before.sequences),'Slots/frames/IDs/transformaciones cambiaron');
  check(JSON.stringify(after.savedTransforms)===JSON.stringify(before.savedTransforms),'Transformaciones del sistema o secuencias cambiaron');
  check(JSON.stringify(after.connections)===JSON.stringify(before.connections),'Conexiones cambiaron');
  check(JSON.stringify(after.bom)===JSON.stringify(before.bom),'BOM cambió al reabrir');
  check(after.panel?.includes('5 módulos') && after.panel?.includes('Conexiones (1)'),'El panel no se reconstruyó sin selección');
  check(after.history.canUndo===false && after.history.canRedo===false,'La carga generó historial de modificación');
  await click(win,'CRITERIUM SYSTEM');
  const selectedSystem=await win.webContents.executeJavaScript(`document.querySelector('[aria-label="Composición CRITERIUM"] button[aria-pressed="true"]')?.textContent.trim()`);
  await compositionClick(win,'Seleccionar secuencia',0);
  const selectedSequence=await win.webContents.executeJavaScript(`document.querySelector('[aria-label="Composición CRITERIUM"] button[aria-pressed="true"]')?.textContent.trim()`);
  await compositionClick(win,'Seleccionar',0,0);
  const selectedFrame=await win.webContents.executeJavaScript(`document.querySelector('[aria-label="Composición CRITERIUM"] button[aria-pressed="true"]')?.textContent.trim()`);
  log('SELECTION_AFTER_REOPEN',{selectedSystem,selectedSequence,selectedFrame});
  check(selectedSystem?.includes('CRITERIUM SYSTEM') && selectedSequence?.includes('Seleccionar secuencia') && selectedFrame?.includes('Seleccionar'),
    'Selección del panel tras reabrir falló');
  await win.webContents.executeJavaScript(`(() => {for(const el of document.querySelectorAll('details'))
    if(el.querySelector('summary')?.textContent.includes('Editar sistema seleccionado') ||
       el.querySelector('summary')?.textContent.includes('Comercial · BOM y cotización'))el.open=true;})()`);
  await click(win,'Cotización');
  await sleep(3000);
  const afterQuotePath=join(app.getPath('temp'),'phase852-quote-after.json');
  await downloadVia(win,'Exportar JSON comercial',afterQuotePath);
  const afterQuote=JSON.parse(readFileSync(afterQuotePath,'utf8'));
  const comparableQuote=({generatedAt,...rest})=>rest;
  log('QUOTE_AFTER',{status:afterQuote.status,items:afterQuote.items?.length,diagnostics:afterQuote.diagnostics});
  check(JSON.stringify(comparableQuote(afterQuote))===JSON.stringify(comparableQuote(beforeQuote)),'Cotización cambió al reabrir');
  await compositionClick(win,'Agregar módulo',0);
  const edited=await snapshot(win);
  log('EDIT_AFTER_REOPEN',{panel:edited.panel,status:await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`),slots:edited.sequences.map(x=>x.slots.length),connections:edited.connections});
  check(edited.panel.includes('5 módulos') && edited.connections.length===1 &&
    (await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`))?.includes('Desconecte primero'),
    'La edición de un extremo conectado no dio el diagnóstico esperado');
  log('EDIT_WITH_CONNECTION','NOT_SUPPORTED: desconectar primero el extremo afectado');
  await win.webContents.executeJavaScript(`(() => {const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
    [...root.querySelectorAll('details')].find(x=>x.querySelector('summary')?.textContent.includes('CONEXIONES')).open=true;})()`);
  await click(win,'Desconectar');
  const connectionHistory=await win.webContents.executeJavaScript(`(async()=>{
    const api=${apiScript};const count=()=>api.getCritteriumStructure().systems[0].connections.length;
    const removed=count();await api.undoHistory();const restored=count();await api.redoHistory();return {removed,restored,redone:count()};
  })()`);
  log('CONNECTION_HISTORY',connectionHistory);
  check(connectionHistory.removed===0 && connectionHistory.restored===1 && connectionHistory.redone===0,'Historial de conexión restaurada falló');
  log('RESULT','PASS PERSISTENCE');
  win.destroy();app.exit(0);
}).catch(error=>{log('ERROR',error.stack||String(error));app.exit(1);});
