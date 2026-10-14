const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (value, reason) => { if (!value) throw new Error(reason); };
const log = (label, value) => console.log(`${label} ${JSON.stringify(value)}`);
const shot = async (win, name) => {
  const path=join(__dirname,`phase92-${name}.png`);
  writeFileSync(path,(await win.webContents.capturePage()).toPNG());
  log('SCREENSHOT',path);
};
async function click(win, label, selector='button', index=0) {
  const point=await win.webContents.executeJavaScript(`(() => {
    const el=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(x=>
      x.textContent.trim()===${JSON.stringify(label)}||x.title===${JSON.stringify(label)}||
      x.getAttribute('aria-label')===${JSON.stringify(label)})[${index}];
    if(!el)return null;el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();
    const x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2),hit=document.elementFromPoint(x,y);
    return {x,y,disabled:el.disabled,covered:hit!==el&&!el.contains(hit)};
  })()`);
  check(point&&!point.disabled,`Control no disponible: ${label}`);
  if(point.covered){
    log('DOM_CLICK_FALLBACK',{label});
    await win.webContents.executeJavaScript(`(() => {
      [...document.querySelectorAll(${JSON.stringify(selector)})].filter(x=>x.textContent.trim()===${JSON.stringify(label)}||x.title===${JSON.stringify(label)}||x.getAttribute('aria-label')===${JSON.stringify(label)})[${index}].click();})()`);
  }else{
    for(const type of ['mouseMove','mouseDown','mouseUp']){
      win.webContents.sendInputEvent({type,x:point.x,y:point.y,button:'left',clickCount:1});await sleep(100);
    }
  }
  await sleep(1400);
}
const apiScript=`(() => {
  const heading=[...document.querySelectorAll('h3')].find(x=>x.textContent.trim()==='CRITERIUM 8');
  let fiber=heading?.[Object.keys(heading).find(k=>k.startsWith('__reactFiber'))];
  while(fiber&&!fiber.memoizedProps?.threeApiRef?.current)fiber=fiber.return;
  return fiber?.memoizedProps?.threeApiRef?.current;
})()`;
async function read(win){return win.webContents.executeJavaScript(`(() => {
  const api=${apiScript};const structure=api.getCritteriumStructure();
  const heading=[...document.querySelectorAll('h3')].find(x=>x.textContent.trim()==='CRITERIUM 8');
  let fiber=heading?.[Object.keys(heading).find(k=>k.startsWith('__reactFiber'))];
  while(fiber&&!fiber.memoizedProps?.threeApiRef?.current)fiber=fiber.return;
  const canvas=[...document.querySelectorAll('canvas')].map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}});
  return {systems:structure.systems,sequences:structure.sequences,
    transforms:api.exportProject().entities.filter(x=>x.kind==='CRITTERIUM_8_SEQUENCE'||x.kind==='CRITERIUM_SYSTEM')
      .map(x=>({kind:x.kind,id:x.sequenceId||x.systemId,transform:x.transform})),
    selectedPart:{instanceId:fiber?.memoizedProps?.selectedPart?.instanceId,
      kind:fiber?.memoizedProps?.selectedPart?.kind,
      sequenceId:fiber?.memoizedProps?.selectedPart?.critterium8Sequence?.sequenceId,
      systemId:fiber?.memoizedProps?.selectedPart?.critteriumSystem?.systemId},
    panel:document.querySelector('[aria-label="Composición CRITERIUM"]')?.innerText,
    canvas};
})()`);}
app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:1600,height:1000,show:false});
  await win.loadURL('http://localhost:5174/');await sleep(5000);
  await click(win,'Administrador');await sleep(6000);
  await click(win,'Critterium 8');
  await click(win,'Biblioteca CRITERIUM','summary');
  await win.webContents.executeJavaScript(`(() => {const el=document.querySelector('[aria-label="Biblioteca CRITERIUM"] select');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,'OFFICE_2_3');
    el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(400);await click(win,'Crear oficina');
  const initial=await read(win);
  check(initial.systems.length===1&&initial.systems[0].sequenceIds.length===2&&
    initial.sequences.map(s=>s.slots.length).join(',')==='2,3','Escenario base incorrecto');
  log('INITIAL',initial);
  await sleep(4000);
  await shot(win,'base');
  await click(win,'Fit');
  await shot(win,'fit');
  await click(win,'CRITERIUM SYSTEM · seleccionado');
  log('PANEL_SYSTEM', (await read(win)).selectedPart);
  await win.webContents.executeJavaScript(`(() => {const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
    [...root.querySelectorAll('details')].forEach(x=>x.open=true);})()`);
  await click(win,'Seleccionar secuencia');
  log('PANEL_SEQUENCE',(await read(win)).selectedPart);
  await shot(win,'panel-sequence');
  await click(win,'Seleccionar');
  log('PANEL_FRAME',(await read(win)).selectedPart);
  await shot(win,'panel-frame');
  await click(win,'Pieza individual','button',0);
  const hit=await win.webContents.executeJavaScript(`(() => {const el=document.elementFromPoint(800,500);return {tag:el?.tagName,canvas:el===document.querySelector('canvas')}})()`);
  log('THREE_HIT',hit);
  for(const type of ['mouseMove','mouseDown','mouseUp']){
    win.webContents.sendInputEvent({type,x:800,y:500,button:'left',clickCount:1});await sleep(120);
  }
  await sleep(900);
  log('THREE_SELECTION',(await read(win)).selectedPart);
  await shot(win,'three-selection');
  log('UX_METRICS',await win.webContents.executeJavaScript(`(() => {
    const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
    const panel=root?.parentElement;
    const rows=[root,panel,document.querySelector('[aria-label="Biblioteca CRITERIUM"]')];
    return rows.map(x=>({tag:x?.tagName,scrollLeft:x?.scrollLeft,scrollWidth:x?.scrollWidth,
      clientWidth:x?.clientWidth,rect:x?.getBoundingClientRect().toJSON(),overflowX:x&&getComputedStyle(x).overflowX}));
  })()`));
  for(const type of ['mouseMove','mouseDown','mouseUp']){
    win.webContents.sendInputEvent({type,x:875,y:455,button:'left',clickCount:1});await sleep(120);
  }
  await sleep(700);
  log('THREE_OTHER_FRAME',(await read(win)).selectedPart);
  await shot(win,'other-frame');
  await win.webContents.executeJavaScript(`(() => {
    const button=[...document.querySelectorAll('button')].filter(x=>x.textContent.trim()==='Puesto completo')[0];
    if(!button)throw new Error('Alcance de puesto no disponible');button.click();})()`);
  log('SCOPE_INPUT','DOM click instrumentado sobre alcance Puesto completo');
  await sleep(500);
  for(const type of ['mouseMove','mouseDown','mouseUp']){
    win.webContents.sendInputEvent({type,x:875,y:455,button:'left',clickCount:1});await sleep(120);
  }
  await sleep(700);
  log('THREE_GROUP_SELECTION',(await read(win)).selectedPart);
  await click(win,'Pieza individual','button',0);
  for(const [x,y] of [[749,480],[792,465],[855,450],[902,450],[945,470]]){
    for(const type of ['mouseMove','mouseDown','mouseUp']){
      win.webContents.sendInputEvent({type,x,y,button:'left',clickCount:1});await sleep(100);
    }
    await sleep(300);
    log('PART_HIT',{x,y,selected:(await read(win)).selectedPart});
  }
  await win.webContents.executeJavaScript(`(() => {const root=document.querySelector('[aria-label="Composición CRITERIUM"]');
    [...root.querySelectorAll('details')].forEach(x=>x.open=true);})()`);
  await click(win,'Seleccionar secuencia','button',1);
  await click(win,'Puesto completo','button',0);
  const dragBefore=await read(win);
  log('DRAG_SELECTED',dragBefore.selectedPart);
  win.webContents.sendInputEvent({type:'mouseMove',x:749,y:480});
  win.webContents.sendInputEvent({type:'mouseDown',x:749,y:480,button:'left',clickCount:1});
  await sleep(250);
  log('DRAG_POINTER_DOWN',(await read(win)).selectedPart);
  for(let index=1;index<=12;index++){
    win.webContents.sendInputEvent({type:'mouseMove',x:749+Math.round(index*189/12),y:480+Math.round(index*16/12),button:'left'});
    await sleep(80);
  }
  await shot(win,'drag-preview');
  win.webContents.sendInputEvent({type:'mouseUp',x:938,y:496,button:'left',clickCount:1});
  await sleep(1000);
  const dragAfter=await read(win);
  log('DRAG_RESULT',{before:dragBefore.transforms,after:dragAfter.transforms,
    selectedBefore:dragBefore.selectedPart,selectedAfter:dragAfter.selectedPart,
    connections:dragAfter.systems[0].connections});
  await shot(win,'drag-after');
  await click(win,'Seleccionar secuencia','button',1);
  const refineBefore=await read(win);
  win.webContents.sendInputEvent({type:'mouseMove',x:923,y:461});
  win.webContents.sendInputEvent({type:'mouseDown',x:923,y:461,button:'left',clickCount:1});
  for(let index=1;index<=10;index++){
    win.webContents.sendInputEvent({type:'mouseMove',x:923+Math.round(index*19/10),y:461-Math.round(index*14/10),button:'left'});
    await sleep(90);
  }
  await shot(win,'refine-preview');
  win.webContents.sendInputEvent({type:'mouseUp',x:942,y:447,button:'left',clickCount:1});
  await sleep(900);
  const refineAfter=await read(win);
  log('REFINE_RESULT',{before:refineBefore.transforms,after:refineAfter.transforms,
    connections:refineAfter.systems[0].connections});
  check(refineAfter.systems[0].connections.length===1,'El arrastre 3D no creó una conexión');
  check(refineAfter.sequences.map(x=>x.sequenceId).join()===initial.sequences.map(x=>x.sequenceId).join(),
    'El arrastre reemplazó la identidad de alguna secuencia');
  check(refineAfter.systems[0].systemId===initial.systems[0].systemId,
    'El arrastre reemplazó la identidad del sistema');
  const ux=await win.webContents.executeJavaScript(`(() => {const root=document.querySelector('[aria-label="Composición CRITERIUM"]');const r=root.getBoundingClientRect();const nav=root.querySelector('nav').getBoundingClientRect();return {rootWidth:r.width,navRight:nav.right,rootRight:r.right,scrollWidth:root.scrollWidth,clientWidth:root.clientWidth}})()`);
  check(ux.navRight<=ux.rootRight+1&&ux.scrollWidth<=ux.clientWidth+1,'La composición queda cortada en el panel');
  log('UX_FIT',ux);
  await shot(win,'refine-after');
  for(const type of ['keyDown','keyUp'])win.webContents.sendInputEvent({type,keyCode:'Z',modifiers:['control']});
  await sleep(900);
  const undo=await read(win);
  log('UNDO_RESULT',{connections:undo.systems[0].connections,transforms:undo.transforms});
  for(const type of ['keyDown','keyUp'])win.webContents.sendInputEvent({type,keyCode:'Y',modifiers:['control']});
  await sleep(900);
  const redo=await read(win);
  log('REDO_RESULT',{connections:redo.systems[0].connections,transforms:redo.transforms});
  win.destroy();app.exit(0);
}).catch(error=>{log('ERROR',error.stack||String(error));app.exit(1);});
