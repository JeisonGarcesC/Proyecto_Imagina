const { app, BrowserWindow } = require('electron');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (condition, message) => { if (!condition) throw new Error(message); };
const log = (label, value) => console.log(`${label} ${JSON.stringify(value)}`);
const savedPath = join(app.getPath('temp'), 'phase86-critterium-project.json');

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
  win.webContents.on('console-message',(_event,level,message)=>{
    if(level>=2)log('RENDERER_CONSOLE',{level,message});
  });
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
  const endpoints=await win.webContents.executeJavaScript(`(()=>{
    const api=${apiScript};const connection=api.getCritteriumStructure().systems[0].connections[0];
    return {source:api.getCritteriumConnectionPoints(connection.sourceSequenceId).find(x=>x.connectionId===connection.sourcePointId)?.type,
      target:api.getCritteriumConnectionPoints(connection.targetSequenceId).find(x=>x.connectionId===connection.targetPointId)?.type};
  })()`);
  log('ENDPOINTS',endpoints);
  check(endpoints.source==='TERMINAL_END' && endpoints.target==='TERMINAL_START','Extremos del escenario inesperados');
  const originalConnection=before.connections[0];
  await compositionClick(win,'Agregar módulo',0);
  const blocked=await snapshot(win);
  const blockedMessage=await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`);
  log('BLOCKED_CONNECTED_END',{message:blockedMessage,counts:blocked.sequences.map(x=>x.slots.length)});
  check(blocked.sequences[0].slots.length===3 && blockedMessage?.includes(originalConnection.connectionId) &&
    blockedMessage?.includes('extremo final'),'La edición del terminal conectado no fue bloqueada explícitamente');
  const guarded=await win.webContents.executeJavaScript(`(async()=>{
    const api=${apiScript};const initial=api.getCritteriumStructure();
    const sequence=initial.sequences.find(x=>x.sequenceId===initial.systems[0].sequenceIds[0]);
    const operations=[['INSERT',{index:2}],['REMOVE',{slotId:sequence.slots[1].slotId}],
      ['REORDER',{slotId:sequence.slots[2].slotId,index:0}],
      ['DUPLICATE',{slotId:sequence.slots[2].slotId}]];
    const results=[];
    for(const [operation,args] of operations){
      const result=await api.editCritteriumSequenceSlot(sequence.sequenceId,operation,args);
      const model=api.getCritteriumStructure();
      results.push({operation,success:result.success,reason:result.reason,
        slots:model.sequences.find(x=>x.sequenceId===sequence.sequenceId).slots.length,
        connectionId:model.systems[0].connections[0]?.connectionId});
    }
    return results;
  })()`);
  log('GUARDED_OPERATIONS',guarded);
  check(guarded.every(x=>x.success===false && x.slots===3 && x.connectionId===originalConnection.connectionId),
    'Una edición del extremo comprometido dejó cambios parciales');
  log('AFTER_GUARDS_DEBUG',await win.webContents.executeJavaScript(`(()=>{
    try {const api=${apiScript};return {body:document.body.innerText.slice(-500),
      structure:api.getCritteriumStructure().systems.map(x=>({systemId:x.systemId,connections:x.connections.length})),
      summary:api.getCritteriumOfficeSummary(api.getCritteriumStructure().systems[0].systemId)?.success};}
    catch(error){return {error:String(error),stack:error.stack,body:document.body?.innerText?.slice(-500)}}
  })()`));
  await compositionClick(win,'Agregar módulo',1);
  const grown=await snapshot(win);
  log('GROW_FREE_END',{counts:grown.sequences.map(x=>x.slots.length),connections:grown.connections});
  check(grown.sequences.map(x=>x.slots.length).join(',')==='3,3' &&
    grown.connections[0].connectionId===originalConnection.connectionId &&
    grown.connections[0].targetPointId===originalConnection.targetPointId,'Crecer por extremo libre rompió conexión');
  const growthHistory=await win.webContents.executeJavaScript(`(async()=>{
    const api=${apiScript};const capture=()=>{const model=api.getCritteriumStructure();const system=model.systems[0];
      return {slots:model.sequences.reduce((sum,x)=>sum+x.slots.length,0),
        connectionId:system.connections[0]?.connectionId,
        slotIds:model.sequences.find(x=>x.sequenceId===system.sequenceIds[1]).slots.map(x=>x.slotId),
        frameRows:api.getCritteriumOfficeSummary(system.systemId).rows.filter(x=>x.description.startsWith('Marco Critterium')).length};};
    const added=capture();await api.undoHistory();const undone=capture();await api.redoHistory();return {added,undone,redone:capture()};
  })()`);
  log('GROWTH_UNDO_REDO',growthHistory);
  check(growthHistory.added.slots===6 && growthHistory.undone.slots===5 && growthHistory.redone.slots===6 &&
    growthHistory.added.frameRows===6 && growthHistory.undone.frameRows===5 && growthHistory.redone.frameRows===6 &&
    growthHistory.added.connectionId===originalConnection.connectionId &&
    growthHistory.undone.connectionId===originalConnection.connectionId &&
    growthHistory.redone.connectionId===originalConnection.connectionId &&
    JSON.stringify(growthHistory.added.slotIds)===JSON.stringify(growthHistory.redone.slotIds),
    'Undo/Redo del crecimiento conectado no restauró composición, BOM e identidad');
  const freeEdits=await win.webContents.executeJavaScript(`(async()=>{
    const api=${apiScript};const structure=()=>api.getCritteriumStructure();
    const system=structure().systems[0], sequenceId=system.sequenceIds[1];
    const sequence=()=>structure().sequences.find(x=>x.sequenceId===sequenceId);
    const signature=()=>JSON.stringify(api.getCritteriumOfficeSummary(system.systemId).rows
      .map(x=>({code:x.code,description:x.description,qty:x.qty,materialCode:x.materialCode,finishCode:x.finishCode}))
      .sort((a,b)=>a.code.localeCompare(b.code)||a.description.localeCompare(b.description)));
    const before=signature(),connectedFrame=sequence().slots[0].frameId;
    const reordered=await api.editCritteriumSequenceSlot(sequenceId,'REORDER',{slotId:sequence().slots[2].slotId,index:1});
    const afterReorder=signature();
    const last=sequence().slots.at(-1);
    const duplicated=await api.editCritteriumSequenceSlot(sequenceId,'DUPLICATE',{slotId:last.slotId});
    const duplicate=sequence().slots.at(-1);
    const afterDuplicate={slots:sequence().slots.length,frameId:duplicate.frameId,
      moduleId:duplicate.moduleId,slotId:duplicate.slotId};
    const removed=await api.editCritteriumSequenceSlot(sequenceId,'REMOVE',{slotId:duplicate.slotId});
    const afterRemove={slots:sequence().slots.length,signature:signature()};
    const points=api.getCritteriumConnectionPoints(sequenceId);
    return {reordered:reordered.success,duplicated:duplicated.success,removed:removed.success,
      before,afterReorder,afterDuplicate,afterRemove,
      connectedFrame,finalConnectedFrame:sequence().slots[0].frameId,
      connection:structure().systems[0].connections[0],points,
      diagnostics:structure().systems[0].spatialDiagnostics};
  })()`);
  log('FREE_SIDE_EDITS',{reordered:freeEdits.reordered,duplicated:freeEdits.duplicated,
    removed:freeEdits.removed,afterDuplicate:freeEdits.afterDuplicate,afterRemove:freeEdits.afterRemove,
    connectedFrame:freeEdits.connectedFrame,finalConnectedFrame:freeEdits.finalConnectedFrame,
    diagnostics:freeEdits.diagnostics});
  check(freeEdits.reordered && freeEdits.duplicated && freeEdits.removed &&
    freeEdits.before===freeEdits.afterReorder && freeEdits.before===freeEdits.afterRemove.signature &&
    freeEdits.afterDuplicate.slots===4 && freeEdits.afterRemove.slots===3 &&
    freeEdits.connectedFrame===freeEdits.finalConnectedFrame &&
    freeEdits.connection.connectionId===originalConnection.connectionId &&
    freeEdits.points.some(x=>x.connectionId===freeEdits.connection.targetPointId && x.frameId===freeEdits.connectedFrame) &&
    freeEdits.diagnostics.length===0,
    'Reordenar/duplicar/eliminar en el lado libre alteró conexión, BOM o Smart Snap');
  log('BEFORE',{counts:before.panel?.match(/\d+ secuencias|\d+ módulos|\d+ frames|Conexiones \(\d+\)/g),connections:before.connections,bom:before.bom});
  before=grown;
  check(before.connections?.length===1 && before.panel.includes('6 módulos') && before.panel.includes('6 frames'),'Conexión/contadores previos incorrectos');
  await win.webContents.executeJavaScript(`(() => {for(const el of document.querySelectorAll('details'))
    if(el.querySelector('summary')?.textContent.includes('Editar sistema seleccionado') ||
       el.querySelector('summary')?.textContent.includes('Comercial · BOM y cotización'))el.open=true;})()`);
  await click(win,'Cotización');
  await sleep(3000);
  const beforeQuotePath=join(app.getPath('temp'),'phase86-quote-before.json');
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
  check(after.panel?.includes('6 módulos') && after.panel?.includes('Conexiones (1)'),'El panel no se reconstruyó sin selección');
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
  await compositionClick(win,'Seleccionar',1,0);
  const connectedSelection=await win.webContents.executeJavaScript(`(()=>{
    const heading=[...document.querySelectorAll('h3')].find(x=>x.textContent.trim()==='CRITERIUM 8');
    let fiber=heading?.[Object.keys(heading).find(k=>k.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef)fiber=fiber.return;
    const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
    return {instanceId:fiber.memoizedProps.selectedPart?.instanceId,
      highlighted:[...root.querySelectorAll('button[aria-pressed="true"]')].map(x=>x.textContent.trim()),
      moduleLabel:[...root.querySelectorAll('div')].find(x=>x.textContent.trim()==='Módulo 1 · seleccionado')?.textContent.trim()};
  })()`);
  log('CONNECTED_FRAME_SELECTION',connectedSelection);
  check(connectedSelection.instanceId===after.sequences[1].slots[0].frameInstanceId &&
    connectedSelection.moduleLabel==='Módulo 1 · seleccionado',
    'El panel no seleccionó el frame del extremo conectado');
  await win.webContents.executeJavaScript(`(() => {for(const el of document.querySelectorAll('details'))
    if(el.querySelector('summary')?.textContent.includes('Editar sistema seleccionado') ||
       el.querySelector('summary')?.textContent.includes('Comercial · BOM y cotización'))el.open=true;})()`);
  await click(win,'Cotización');
  await sleep(3000);
  const afterQuotePath=join(app.getPath('temp'),'phase86-quote-after.json');
  await downloadVia(win,'Exportar JSON comercial',afterQuotePath);
  const afterQuote=JSON.parse(readFileSync(afterQuotePath,'utf8'));
  const comparableQuote=({generatedAt,...rest})=>rest;
  log('QUOTE_AFTER',{status:afterQuote.status,items:afterQuote.items?.length,diagnostics:afterQuote.diagnostics});
  check(JSON.stringify(comparableQuote(afterQuote))===JSON.stringify(comparableQuote(beforeQuote)),'Cotización cambió al reabrir');
  await compositionClick(win,'Agregar módulo',0);
  const edited=await snapshot(win);
  log('EDIT_AFTER_REOPEN',{panel:edited.panel,status:await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`),slots:edited.sequences.map(x=>x.slots.length),connections:edited.connections});
  check(edited.panel.includes('6 módulos') && edited.connections.length===1 &&
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
