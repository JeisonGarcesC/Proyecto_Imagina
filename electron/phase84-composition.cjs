const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (name, value) => console.log(`${name} ${JSON.stringify(value)}`);
const assert = (value, message) => { if (!value) throw new Error(message); };

async function click(win, label, selector = 'button', index = 0) {
  const rect = await win.webContents.executeJavaScript(`(() => {
    const el=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(item =>
      item.textContent.trim()===${JSON.stringify(label)} || item.title===${JSON.stringify(label)} || item.getAttribute('aria-label')===${JSON.stringify(label)})[${index}];
    if(!el) return null; el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect();
    const center=r.x+r.width/2; return {x:Math.round(r.x<316?Math.min(center,250):center),y:Math.round(r.y+r.height/2),disabled:!!el.disabled};
  })()`);
  assert(rect&&!rect.disabled,`Control no disponible: ${label} ${index}`);
  for(const type of ['mouseMove','mouseDown','mouseUp']) {win.webContents.sendInputEvent({type,x:rect.x,y:rect.y,button:'left',clickCount:1});await sleep(80);}
  await sleep(1700);
}

async function clickComposition(win, label, sequenceIndex = 0, buttonIndex = 0) {
  const rect=await win.webContents.executeJavaScript(`(() => {
    const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
    const details=[...root.querySelectorAll(':scope > div > details')];
    const section=details[${sequenceIndex}];
    if(!section.open) section.open=true;
    const el=[...section.querySelectorAll('button')].filter(item=>item.textContent.trim()===${JSON.stringify(label)})[${buttonIndex}];
    if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();
    return {x:Math.round(Math.min(r.x+r.width/2,250)),y:Math.round(r.y+r.height/2),disabled:!!el.disabled};
  })()`);
  assert(rect&&!rect.disabled,`Acción de composición no disponible: ${label}`);
  for(const type of ['mouseMove','mouseDown','mouseUp']) {win.webContents.sendInputEvent({type,x:rect.x,y:rect.y,button:'left',clickCount:1});await sleep(80);}
  await sleep(1800);
}

const inspect=win=>win.webContents.executeJavaScript(`(() => {
  const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
  const headings=[...root.querySelectorAll(':scope > div > details')].map(el=>el.querySelector('summary')?.textContent.trim());
  return {text:root.innerText,headings,selected:[...root.querySelectorAll('[aria-pressed="true"]')].map(el=>el.textContent.trim())};
})()`);
async function showComposition(win){
  return win.webContents.executeJavaScript(`(() => {
    const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
    let parent=root.parentElement;
    while(parent&&parent!==document.body){if(parent.scrollHeight>parent.clientHeight+20){parent.scrollTop=Math.max(0,root.offsetTop-70);break;}parent=parent.parentElement;}
    root.scrollIntoView({block:'start'});
    const r=root.getBoundingClientRect();return {x:r.x,y:r.y,height:r.height,parentScrollTop:parent?.scrollTop};
  })()`);
}

app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:1600,height:1000,show:false});
  await win.loadURL('http://localhost:5173/');await sleep(5000);
  await click(win,'Administrador');await sleep(6000);
  await click(win,'Critterium 8');
  log('EMPTY',await inspect(win));
  await click(win,'Crear oficina vacía');
  for(let i=0;i<3;i++)await click(win,'Crear y agregar al sistema');
  const base=await inspect(win);
  log('THREE_SEQUENCES',base);
  assert(base.headings.length===3,'La composición no muestra tres secuencias');
  assert(base.text.includes('6 módulos')&&base.text.includes('6 frames'),'Contadores de módulos/frames incorrectos');
  log('COMPOSITION_VIEW',await showComposition(win));
  win.showInactive();
  await sleep(400);
  writeFileSync(join(__dirname,'phase84-composition.png'),(await win.webContents.capturePage()).toPNG());
  win.hide();
  await clickComposition(win,'Seleccionar',0,1);
  const selected=await inspect(win);
  log('PANEL_TO_3D_SELECTION',{selected:selected.selected,properties:await win.webContents.executeJavaScript(`document.body.innerText.slice(-450)`)});
  log('SELECTION_PROPS',await win.webContents.executeJavaScript(`(() => {
    const heading=[...document.querySelectorAll('h3')].find(el=>el.textContent.trim()==='CRITERIUM 8');
    let fiber=heading?.[Object.keys(heading).find(key=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef)fiber=fiber.return;
    const selected=fiber?.memoizedProps?.selectedPart;
    const structure=fiber?.memoizedProps?.threeApiRef?.current?.getCritteriumStructure?.();
    return {selected:{kind:selected?.kind,instanceId:selected?.instanceId,critterium8:selected?.critterium8,critterium8Sequence:selected?.critterium8Sequence},
      slots:structure?.sequences?.[0]?.slots?.map(item=>({frameInstanceId:item.frameInstanceId,status:item.status}))};
  })()`));
  assert(selected.text.includes('Módulo 2 · seleccionado'),'El módulo seleccionado no quedó resaltado');
  await click(win,'Pieza individual', 'button', 0);
  for(const type of ['mouseMove','mouseDown','mouseUp']) {win.webContents.sendInputEvent({type,x:806,y:470,button:'left',clickCount:1});await sleep(100);}
  await sleep(900);
  const from3D=await inspect(win);
  log('THREE_D_TO_PANEL_SELECTION',from3D);
  assert(from3D.text.includes('· seleccionado'),'La selección 3D no resaltó ningún elemento de composición');
  await clickComposition(win,'Agregar módulo',0);
  log('AFTER_ADD',await inspect(win));
  await clickComposition(win,'Duplicar',0,0);
  log('AFTER_DUPLICATE',await inspect(win));
  await clickComposition(win,'Eliminar',0,0);
  log('AFTER_REMOVE',await inspect(win));
  log('STRUCTURE_AFTER_REMOVE',await win.webContents.executeJavaScript(`(() => {
    const heading=[...document.querySelectorAll('h3')].find(el=>el.textContent.trim()==='CRITERIUM 8');
    let fiber=heading?.[Object.keys(heading).find(key=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef)fiber=fiber.return;
    const model=fiber.memoizedProps.threeApiRef.current.getCritteriumStructure();
    return {systems:model.systems.map(item=>({systemId:item.systemId,sequenceIds:item.sequenceIds})),
      sequences:model.sequences.map(item=>({sequenceId:item.sequenceId,parentSystemId:item.parentSystemId,slots:item.slots.length}))};
  })()`));
  await click(win,'Alinear extremos');
  log('AFTER_ALIGN_STATUS',await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`));
  for(const [label,index] of [['Secuencia origen',1],['Secuencia destino',2]]) {
    await win.webContents.executeJavaScript(`(() => {const el=[...document.querySelectorAll('label')].find(item=>item.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector('select');
      const value=el?.options[${index}]?.value;if(!value)throw new Error('Secuencia no disponible');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  }
  await click(win,'Conectar extremos cercanos');
  const connected=await inspect(win);
  log('AFTER_CONNECT',{...connected,status:await win.webContents.executeJavaScript(`document.querySelector('[role=status]')?.textContent`)});
  assert(connected.text.includes('Conexiones · 1'),'La conexión no apareció en la composición');
  await win.webContents.executeJavaScript(`(() => { const row=[...document.querySelectorAll('section[aria-label="Composición CRITERIUM"] details')].find(item=>item.querySelector('summary')?.textContent.startsWith('Conexiones')); if (!row) throw new Error('Lista de conexiones ausente'); row.open=true; })()`);
  const connectionLabel=await win.webContents.executeJavaScript(`[...document.querySelectorAll('section[aria-label="Composición CRITERIUM"] button')].find(item=>item.textContent.trim().startsWith('Conexión 1'))?.textContent.trim()`);
  assert(connectionLabel,'Tarjeta de conexión ausente');
  await click(win,connectionLabel);
  const selectedConnection=await inspect(win);
  log('CONNECTION_SELECTED',selectedConnection);
  assert(selectedConnection.selected.some((label)=>label.startsWith('Conexión 1')),'La conexión no quedó seleccionada en el panel');
  const marker=await win.webContents.executeJavaScript(`(() => {
    const heading=[...document.querySelectorAll('h3')].find(el=>el.textContent.trim()==='CRITERIUM 8');
    let fiber=heading?.[Object.keys(heading).find(key=>key.startsWith('__reactFiber'))];
    while(fiber&&!fiber.memoizedProps?.threeApiRef)fiber=fiber.return;
    const api=fiber?.memoizedProps?.threeApiRef?.current;
    return {selected:api?.getSelectedCritteriumConnectionId?.(),
      expected:api?.getCritteriumStructure?.().systems?.[0]?.connections?.[0]?.connectionId};
  })()`);
  log('CONNECTION_MARKER_3D',marker);
  assert(marker.selected && marker.selected===marker.expected,'La conexión no mostró el marcador espacial 3D');
  log('COMPOSITION_VIEW_EDITED',await showComposition(win));
  win.showInactive();
  await sleep(400);
  writeFileSync(join(__dirname,'phase84-composition-edited.png'),(await win.webContents.capturePage()).toPNG());
  win.hide();
  app.exit(0);
}).catch(error=>{log('ERROR',error.stack||String(error));app.exit(1);});
