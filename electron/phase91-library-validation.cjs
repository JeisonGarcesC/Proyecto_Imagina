const { app, BrowserWindow } = require('electron');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value, message) => { if (!value) throw new Error(message); };
const log = (label, value) => console.log(`${label} ${JSON.stringify(value)}`);
const savedPath = join(app.getPath('temp'), 'phase91-library-project.json');
async function waitFor(read, expected, label) {
  for (let attempt=0;attempt<20;attempt++) {
    const value=await read();if(expected(value))return value;
    await sleep(500);
  }
  throw new Error(`Tiempo agotado: ${label}`);
}

async function click(win, label, selector = 'button', index = 0) {
  const point = await win.webContents.executeJavaScript(`(() => {
    const el=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(x=>
      x.textContent.trim()===${JSON.stringify(label)} || x.title===${JSON.stringify(label)} ||
      x.getAttribute('aria-label')===${JSON.stringify(label)})[${index}];
    if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();
    const x=Math.round(r.x<316?Math.min(r.x+r.width/2,250):r.x+r.width/2);
    const y=Math.round(r.y+r.height/2);const hit=document.elementFromPoint(x,y);
    return {x,y,disabled:el.disabled,covered:hit!==el&&!el.contains(hit)};
  })()`);
  if (!point) log('MISSING_CONTROL', await win.webContents.executeJavaScript(`({body:document.body.innerText.slice(0,1800),matches:[...document.querySelectorAll('button')].filter(x=>/crit|criter/i.test(x.textContent+' '+x.title+' '+x.getAttribute('aria-label'))).map(x=>({text:x.textContent.trim(),title:x.title,aria:x.getAttribute('aria-label')}))})`));
  check(point && !point.disabled, `Control no disponible: ${label}`);
  if (point.covered) {
    log('DOM_CLICK_FALLBACK',{label,reason:'control cubierto en coordenadas del harness'});
    await win.webContents.executeJavaScript(`(() => {
      const el=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(x=>
        x.textContent.trim()===${JSON.stringify(label)}||x.title===${JSON.stringify(label)}||
        x.getAttribute('aria-label')===${JSON.stringify(label)})[${index}];el.click();})()`);
    await sleep(1400);return;
  }
  for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
    win.webContents.sendInputEvent({ type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await sleep(80);
  }
  await sleep(1200);
}

async function choose(win, key) {
  await win.webContents.executeJavaScript(`(() => {
    const el=document.querySelector('[aria-label="Biblioteca CRITERIUM"] select');
    if(!el)throw new Error('Biblioteca cerrada');
    const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
    setter.call(el,${JSON.stringify(key)});el.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await sleep(400);
  const preview = await win.webContents.executeJavaScript(`document.querySelector('[aria-label="Vista previa de biblioteca"]')?.innerText`);
  check(preview, `Preview ausente: ${key}`);
  log('PREVIEW', { key, preview });
  await click(win, key.startsWith('SEQUENCE_') ? 'Agregar secuencia' : 'Crear oficina');
}

const apiScript = `(() => {
  const heading=[...document.querySelectorAll('h3')].find(x=>x.textContent.trim()==='CRITERIUM 8');
  let fiber=heading?.[Object.keys(heading).find(k=>k.startsWith('__reactFiber'))];
  while(fiber&&!fiber.memoizedProps?.threeApiRef)fiber=fiber.return;
  return fiber?.memoizedProps?.threeApiRef?.current;
})()`;

async function snapshot(win) {
  return win.webContents.executeJavaScript(`(() => {
    const api=${apiScript};const structure=api.getCritteriumStructure();
    const panel=document.querySelector('[aria-label="Composición CRITERIUM"]');
    return {systems:structure.systems,sequences:structure.sequences,
      panel:panel?.innerText||'',exported:api.exportProject().entities
        .filter(x=>x.kind==='CRITERIUM_8_SEQUENCE'||x.kind==='CRITERIUM_SYSTEM'),
      summaries:structure.systems.map(s=>api.getCritteriumOfficeSummary(s.systemId))};
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
  if(label==='Guardar')await click(win,'Archivo');
  await click(win,label);
  return Promise.race([done,sleep(20000).then(()=>{throw new Error(`Descarga no iniciada: ${label}`);})]);
}

app.whenReady().then(async () => {
  let win=await startWindow();
  await click(win,'Biblioteca CRITERIUM','summary');
  const initial=await snapshot(win);check(initial.sequences.length===0&&initial.systems.length===0,'Proyecto inicial no vacío');
  await choose(win,'SEQUENCE_2');
  let state=await snapshot(win);
  check(state.sequences.length===1&&state.sequences[0].slots.length===2,'Secuencia de dos módulos incorrecta');
  log('SEQUENCE_2',{sequence:state.sequences[0].sequenceId,slots:state.sequences[0].slots.length,panel:state.panel});
  await choose(win,'SEQUENCE_3');
  state=await snapshot(win);
  check(state.sequences.length===2&&state.sequences[1].slots.length===3,'Secuencia de tres módulos incorrecta');
  await choose(win,'OFFICE_EMPTY');
  state=await snapshot(win);
  check(state.systems.length===1&&state.systems[0].sequenceIds.length===0&&state.panel.includes('0 secuencias')&&state.panel.includes('0 módulos'),'Oficina vacía incorrecta');
  log('OFFICE_EMPTY',{systemId:state.systems[0].systemId,panel:state.panel});
  await choose(win,'OFFICE_2');
  state=await snapshot(win);
  check(state.systems.length===2&&state.systems[1].sequenceIds.length===1,'Oficina de una secuencia incorrecta');
  await choose(win,'OFFICE_2_3');
  state=await snapshot(win);
  const office=state.systems[2];
  const members=office.sequenceIds.map(id=>state.sequences.find(s=>s.sequenceId===id));
  check(state.systems.length===3&&members.map(s=>s.slots.length).join(',')==='2,3','Oficina de dos secuencias incorrecta');
  const ids=[office.systemId,...members.flatMap(s=>[s.sequenceId,...s.slots.flatMap(x=>[x.slotId,x.moduleId,x.frameId])])];
  check(ids.every(Boolean)&&new Set(ids).size===ids.length,'Identidades duplicadas o ausentes');
  check(office.connections.length===0,'La biblioteca creó conexiones automáticas');
  check(state.panel.includes('2 secuencias')&&state.panel.includes('5 módulos')&&state.panel.includes('5 frames'),'Panel de oficina incorrecto');
  log('OFFICE_2_3',{systemId:office.systemId,sequenceIds:office.sequenceIds,ids:ids.length,panel:state.panel});
  const creationHistory=await win.webContents.executeJavaScript(`(async()=>{
    const api=${apiScript};const before=api.getCritteriumStructure();
    await api.undoHistory();const undone=api.getCritteriumStructure();
    await api.redoHistory();const redone=api.getCritteriumStructure();
    return {beforeSystems:before.systems.length,undoneSystems:undone.systems.length,
      redoneSystems:redone.systems.length,beforeId:before.systems.at(-1).systemId,
      redoneId:redone.systems.at(-1).systemId,
      beforeSequences:before.sequences.length,undoneSequences:undone.sequences.length,
      redoneSequences:redone.sequences.length};
  })()`);
  check(creationHistory.undoneSystems===creationHistory.beforeSystems-1&&
    creationHistory.undoneSequences===creationHistory.beforeSequences-2&&
    creationHistory.redoneSystems===creationHistory.beforeSystems&&
    creationHistory.redoneSequences===creationHistory.beforeSequences&&
    creationHistory.redoneId===creationHistory.beforeId,'Historial de creación de oficina no atómico');
  log('CREATION_HISTORY',creationHistory);
  const before=state;
  const edit=await win.webContents.executeJavaScript(`(async()=>{
    const api=${apiScript};const model=api.getCritteriumStructure();const system=model.systems.at(-1);
    const id=system.sequenceIds[0];const seq=()=>api.getCritteriumStructure().sequences.find(s=>s.sequenceId===id);
    const added=await api.editCritteriumSequenceSlot(id,'ADD');
    const afterAdd=seq().slots.length;const addedSlot=seq().slots.at(-1);
    await api.undoHistory();const afterUndo=seq().slots.length;
    await api.redoHistory();const afterRedo=seq().slots.length;
    const duplicated=await api.editCritteriumSequenceSlot(id,'DUPLICATE',{slotId:addedSlot.slotId});
    const duplicate=seq().slots.at(-1);
    const removed=await api.editCritteriumSequenceSlot(id,'REMOVE',{slotId:duplicate.slotId});
    const reordered=await api.editCritteriumSequenceSlot(id,'REORDER',{slotId:seq().slots[1].slotId,index:0});
    return {added:added.success,afterAdd,afterUndo,afterRedo,duplicated:duplicated.success,removed:removed.success,
      reordered:reordered.success,duplicateIds:[duplicate.slotId,duplicate.moduleId,duplicate.frameId],
      finalSlots:seq().slots.length};
  })()`);
  check(edit.added&&edit.duplicated&&edit.removed&&edit.reordered&&edit.afterAdd===3&&
    edit.afterUndo===2&&edit.afterRedo===3&&edit.finalSlots===3,'Edición modular o historial falló');
  log('EDIT',edit);
  const spatial=await win.webContents.executeJavaScript(`(async()=>{
    const api=${apiScript};const model=api.getCritteriumStructure();const system=model.systems.at(-1);
    const ids=system.sequenceIds;const before=api.getCritteriumOfficeSummary(system.systemId).rows;
    const aligned=api.alignCritteriumSystemSequences(system.systemId,ids,'ENDPOINT');
    const connected=api.connectCritteriumSequencesById(system.systemId,ids[0],ids[1]);
    const current=api.getCritteriumStructure().systems.at(-1);
    const connection=current.connections[0];
    const points=connection?{
      source:api.getCritteriumConnectionPoints(ids[0]).find(p=>p.connectionId===connection.sourcePointId)?.type,
      target:api.getCritteriumConnectionPoints(ids[1]).find(p=>p.connectionId===connection.targetPointId)?.type}:null;
    const inverse=api.connectCritteriumSequencesById(system.systemId,ids[1],ids[0]);
    const disconnected=connection?api.disconnectCritteriumSequencesById(system.systemId,connection.connectionId):null;
    const afterDisconnect=api.getCritteriumStructure().systems.at(-1);
    await api.undoHistory();const undoConnections=api.getCritteriumStructure().systems.at(-1).connections.length;
    await api.redoHistory();const redoConnections=api.getCritteriumStructure().systems.at(-1).connections.length;
    const organized=api.organizeCritteriumSystem?.(system.systemId,0.05);
    const after=api.getCritteriumOfficeSummary(system.systemId).rows;
    const status=x=>({success:x?.success,reason:x?.reason});
    return {aligned:status(aligned),connected:status(connected),inverse:status(inverse),connection,points,
      disconnected:status(disconnected),organized:status(organized),
      undoConnections,redoConnections,
      remainingConnections:afterDisconnect.connections.length,
      remainingSequences:afterDisconnect.sequenceIds.length,
      bomStable:JSON.stringify(before)===JSON.stringify(after)};
  })()`);
  log('SPATIAL',spatial);
  check(spatial.aligned?.success&&spatial.connected?.success&&spatial.connection?.connectionId&&
    spatial.inverse?.success===false&&spatial.disconnected?.success&&
    spatial.remainingConnections===0&&spatial.remainingSequences===2&&spatial.bomStable&&
    spatial.undoConnections===1&&spatial.redoConnections===0&&
    spatial.points?.source?.startsWith('TERMINAL_')&&spatial.points?.target?.startsWith('TERMINAL_'),
    'Conexión, duplicado inverso, desconexión o BOM espacial incorrecto');
  await win.webContents.executeJavaScript(`(() => {for(const el of document.querySelectorAll('details'))
    if(el.querySelector('summary')?.textContent.includes('Comercial · BOM y cotización'))el.open=true;})()`);
  await click(win,'Cotización');await sleep(2000);
  const quotePath=join(app.getPath('temp'),'phase91-library-quote.json');
  await downloadVia(win,'Exportar JSON comercial',quotePath);
  const quote=JSON.parse(readFileSync(quotePath,'utf8'));
  check(quote.items?.length>0,'Cotización de biblioteca vacía');
  log('QUOTE',{status:quote.status,currency:quote.currency,items:quote.items.length,total:quote.total,diagnostics:quote.diagnostics});
  const duplicated=await win.webContents.executeJavaScript(`(async()=>{
    const api=${apiScript};const system=api.getCritteriumStructure().systems.at(-1);
    const sequence=await api.duplicateCritteriumSystemSequence(system.systemId,system.sequenceIds[1]);
    const copy=await api.duplicateCritteriumSystemById(system.systemId);
    return {sequence:sequence.success,system:copy.success,
      structure:api.getCritteriumStructure()};
  })()`);
  check(duplicated.sequence&&duplicated.system,'Duplicación falló');
  const allIds=duplicated.structure.systems.flatMap(s=>[s.systemId,...s.connections.map(c=>c.connectionId)]).concat(
    duplicated.structure.sequences.flatMap(s=>[s.sequenceId,...s.slots.flatMap(x=>[x.slotId,x.moduleId,x.frameId])]));
  check(allIds.every(Boolean)&&new Set(allIds).size===allIds.length,'La duplicación compartió IDs físicos');
  log('DUPLICATE',{systems:duplicated.structure.systems.length,sequences:duplicated.structure.sequences.length});
  await win.webContents.executeJavaScript(`(() => {${apiScript}.selectCritteriumSystemById(${JSON.stringify(before.systems[1].systemId)});})()`);
  await sleep(700);await click(win,'Cotización');await sleep(1700);
  const libraryQuotePath=join(app.getPath('temp'),'phase91-library-2-quote.json');
  await downloadVia(win,'Exportar JSON comercial',libraryQuotePath);
  const libraryQuote=JSON.parse(readFileSync(libraryQuotePath,'utf8'));
  await click(win,'Sistema');
  await win.webContents.executeJavaScript(`(() => {const button=[...document.querySelectorAll('button')]
    .find(x=>x.textContent.trim()==='Crear sistema con 1 secuencia(s)');
    if(!button||button.disabled)throw new Error('Control manual no disponible');button.click();})()`);
  log('MANUAL_INPUT','DOM click instrumentado: el clic nativo del harness quedó cubierto por la barra lateral');
  const manualState=await waitFor(()=>snapshot(win),x=>x.systems.length===5,'oficina manual');
  const manualSystem=manualState.systems.at(-1);
  check(manualSystem.sequenceIds.length===1,'Flujo manual no creó una secuencia');
  await win.webContents.executeJavaScript(`(() => {for(const el of document.querySelectorAll('details'))
    if(el.querySelector('summary')?.textContent.includes('Comercial · BOM y cotización'))el.open=true;})()`);
  await click(win,'Cotización');await sleep(1700);
  const manualQuotePath=join(app.getPath('temp'),'phase91-manual-2-quote.json');
  await downloadVia(win,'Exportar JSON comercial',manualQuotePath);
  const manualQuote=JSON.parse(readFileSync(manualQuotePath,'utf8'));
  const commercial=x=>({currency:x.currency,status:x.status,subtotal:x.subtotal,total:x.total,
    items:x.items.map(i=>({code:i.code,reference:i.reference,description:i.description,
      quantity:i.quantity,materialCommercial:i.materialCommercial,finishCommercial:i.finishCommercial,
      unitPrice:i.unitPrice,subtotal:i.subtotal}))});
  const equal=JSON.stringify(commercial(libraryQuote))===JSON.stringify(commercial(manualQuote));
  log('EQUIVALENCE',{equal,library:commercial(libraryQuote),manual:commercial(manualQuote)});
  check(equal,'Cotización manual y biblioteca difieren');
  await downloadVia(win,'Guardar',savedPath);
  const saved=JSON.parse(readFileSync(savedPath,'utf8'));
  const savedState=await snapshot(win);
  check(saved.entities?.length>0,'Proyecto exportado sin entidades');
  const old=win;win=await startWindow();old.destroy();
  await win.webContents.debugger.attach('1.3');
  const {root:{nodeId:rootId}}=await win.webContents.debugger.sendCommand('DOM.getDocument');
  const {nodeId}=await win.webContents.debugger.sendCommand('DOM.querySelector',{nodeId:rootId,selector:'input[type=file][accept="application/json"]'});
  check(nodeId,'Input de proyecto ausente');
  await win.webContents.debugger.sendCommand('DOM.setFileInputFiles',{nodeId,files:[savedPath]});
  win.webContents.debugger.detach();await sleep(7000);
  const reopened=await snapshot(win);
  check(JSON.stringify(reopened.systems)===JSON.stringify(savedState.systems),'Sistemas cambiaron al reabrir');
  check(JSON.stringify(reopened.sequences)===JSON.stringify(savedState.sequences),'Secuencias o módulos cambiaron al reabrir');
  check(JSON.stringify(reopened.summaries)===JSON.stringify(savedState.summaries),'BOM cambió al reabrir');
  log('PERSISTENCE',{systems:reopened.systems.length,sequences:reopened.sequences.length,panels:reopened.panel.slice(0,250)});
  await win.webContents.executeJavaScript(`(() => {${apiScript}.selectCritteriumSystemById(${JSON.stringify(before.systems[1].systemId)});for(const el of document.querySelectorAll('details'))
    if(el.querySelector('summary')?.textContent.includes('Comercial · BOM y cotización'))el.open=true;})()`);
  await sleep(500);await click(win,'Cotización');await sleep(1700);
  const reopenedQuotePath=join(app.getPath('temp'),'phase91-reopened-2-quote.json');
  await downloadVia(win,'Exportar JSON comercial',reopenedQuotePath);
  const reopenedQuote=JSON.parse(readFileSync(reopenedQuotePath,'utf8'));
  check(JSON.stringify(commercial(reopenedQuote))===JSON.stringify(commercial(libraryQuote)),
    'Cotización cambió después de reabrir');
  log('QUOTE_PERSISTENCE',{same:true,total:reopenedQuote.total,currency:reopenedQuote.currency});
  log('RESULT','PASS INSTRUMENTAL: presets, identidades, edición API, duplicación API, persistencia y BOM');
  win.destroy();app.exit(0);
}).catch(error=>{log('ERROR',error.stack||String(error));app.exit(1);});
