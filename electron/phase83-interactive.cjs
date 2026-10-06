// Recorrido de entrada nativa de Electron. Ejecutar con phase83-interactive.cmd.
const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (label, value) => console.log(`${label} ${JSON.stringify(value)}`);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const samePosition = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.z - b.z) < 1e-6;
function assertFrameDrag(before, moved, undone, redone) {
  const initial = new Map(before.physical.map(item => [item.id, item]));
  const result = new Map(moved.physical.map(item => [item.id, item]));
  assert(initial.size === 4 && result.size === 4, 'El escenario debe conservar cuatro frames físicos');
  const changed = [...initial.keys()].filter(id => !samePosition(initial.get(id), result.get(id)));
  assert(changed.length === 1, `El arrastre debe mover un solo frame; movió ${changed.length}`);
  const id = changed[0];
  for (const state of [undone, redone]) assert(state.physical.map(item => item.id).sort().join('|') === [...initial.keys()].sort().join('|'), 'El historial cambió los IDs de los frames');
  assert(undone.physical.every(item => samePosition(item, initial.get(item.id))), 'Ctrl+Z no restauró todos los frames');
  assert(redone.physical.every(item => samePosition(item, result.get(item.id))), 'Ctrl+Y no reaplicó todas las posiciones');
  log('FRAME_DRAG_ASSERTION', { pass: true, movedFrameId: id, before: initial.get(id), after: result.get(id) });
}
const readStructure = (win) => win.webContents.executeJavaScript(`(() => {
  const heading = [...document.querySelectorAll('h3')].find(el => el.textContent.trim() === 'CRITERIUM 8');
  if (!heading) return { error: 'CRITERIUM_HEADING_MISSING' };
  const key = Object.keys(heading).find(item => item.startsWith('__reactFiber'));
  let fiber = heading[key];
  while (fiber && !fiber.memoizedProps?.threeApiRef?.current) fiber = fiber.return;
  const structure = fiber?.memoizedProps?.threeApiRef?.current?.getCritteriumStructure?.();
  const physical = fiber?.memoizedProps?.threeApiRef?.current?.getPartsSnapshot2D?.() || [];
  return structure ? {
    systems: structure.systems.map(({ systemId, sequenceIds, connections }) => ({ systemId, sequenceIds, connections })),
    sequences: structure.sequences.map(({ sequenceId, slots }) => ({ sequenceId, slots: slots.map(({ slotId, moduleId, frameId, position, transformOverride }) => ({ slotId, moduleId, frameId, position, transformOverride })) })),
    physical: physical.filter(item => item.kind === 'CRITTERIUM_8_ASSEMBLY').map(({ id, kind, x, z }) => ({ id, kind, x, z }))
  } : { error: 'THREE_API_MISSING' };
})()`);

async function findRect(win, selector, label, index = 0) {
  return win.webContents.executeJavaScript(`(() => {
    const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .filter(el => el.textContent.trim() === ${JSON.stringify(label)} || el.title === ${JSON.stringify(label)} || el.getAttribute('aria-label') === ${JSON.stringify(label)});
    const el = nodes[${index}];
    if (!el) return { found: false, matches: nodes.length };
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = el.getBoundingClientRect();
    return { found: true, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, disabled: !!el.disabled, matches: nodes.length };
  })()`);
}

async function click(win, selector, label, index = 0) {
  const rect = await findRect(win, selector, label, index);
  if (!rect.found || rect.disabled) throw new Error(`Click unavailable ${label}: ${JSON.stringify(rect)}`);
  win.webContents.sendInputEvent({ type: 'mouseMove', x: Math.round(rect.x), y: Math.round(rect.y) });
  win.webContents.sendInputEvent({ type: 'mouseDown', x: Math.round(rect.x), y: Math.round(rect.y), button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: Math.round(rect.x), y: Math.round(rect.y), button: 'left', clickCount: 1 });
  log('MOUSE_CLICK', { label, index, x: rect.x, y: rect.y });
  await sleep(1600);
}

async function clickSlot(win, label, sequenceId, buttonIndex = 0) {
  const rect = await win.webContents.executeJavaScript(`(() => {
    const details = [...document.querySelectorAll('details')].find(el => el.querySelector(':scope > summary')?.textContent.trim() === 'Slots / módulos');
    const section = [...(details?.querySelectorAll(':scope > section') || [])].find(el => el.querySelector('strong')?.textContent.includes(${JSON.stringify(sequenceId)}));
    const button = [...(section?.querySelectorAll('button') || [])].filter(el => el.textContent.trim() === ${JSON.stringify(label)})[${buttonIndex}];
    if (!button) return { found: false };
    button.scrollIntoView({ block: 'center' });
    const r = button.getBoundingClientRect();
    return { found: true, disabled: button.disabled, x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  if (!rect.found || rect.disabled) throw new Error(`Slot button unavailable ${label} ${buttonIndex}`);
  win.webContents.sendInputEvent({ type: 'mouseMove', x: Math.round(rect.x), y: Math.round(rect.y) });
  win.webContents.sendInputEvent({ type: 'mouseDown', x: Math.round(rect.x), y: Math.round(rect.y), button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x: Math.round(rect.x), y: Math.round(rect.y), button: 'left', clickCount: 1 });
  await sleep(1800);
  log('SLOT_CLICK', { label, sequenceId, buttonIndex });
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 1000, show: false });
  win.webContents.on('console-message', ({ level, message }) => { if (level === 'error') log('RENDER_ERROR', message); });
  await win.loadURL('http://localhost:5173/');
  await sleep(5000);
  await click(win, 'button', 'Administrador');
  await sleep(7000);
  await click(win, 'button', 'Critterium 8');
  await click(win, 'button', 'Crear oficina vacía');
  await click(win, 'button', 'Crear y agregar al sistema');
  await sleep(1800);
  const firstImage = await win.webContents.capturePage();
  const firstSize = firstImage.getSize();
  writeFileSync(join(__dirname, 'phase83-first.png'), firstImage.toPNG());
  const firstPixels = firstImage.toBitmap();
  let darkPixels = 0;
  for (let y = 350; y < 630; y += 1) {
    for (let x = 750; x < 1050; x += 1) {
      const offset = (y * firstSize.width + x) * 4;
      if (firstPixels[offset] < 90 && firstPixels[offset + 1] < 90 && firstPixels[offset + 2] < 90) darkPixels += 1;
    }
  }
  log('THREE_CANVAS_DARK_PIXELS_AFTER_FIRST_SEQUENCE', { darkPixels, firstSize, bytes: firstPixels.length });
  if (darkPixels < 500) throw new Error(`Primera secuencia invisible en 3D: ${darkPixels} píxeles oscuros`);
  await click(win, 'button', 'Crear y agregar al sistema');
  const text = await win.webContents.executeJavaScript(`document.body.innerText.slice(-2200)`);
  log('UI_STATE', text);
  const canvases = await win.webContents.executeJavaScript(`[...document.querySelectorAll('canvas')].map((el, index) => { const r = el.getBoundingClientRect(); return { index, x: r.x, y: r.y, width: r.width, height: r.height, attrWidth: el.width, attrHeight: el.height }; })`);
  log('CANVASES', canvases);
  const image = await win.webContents.capturePage();
  const screenshot = join(__dirname, 'phase83-base.png');
  writeFileSync(screenshot, image.toPNG());
  log('SCREENSHOT', screenshot);
  await click(win, 'button', 'Seleccionar sistema');
  log('SYSTEM_SELECTION', await win.webContents.executeJavaScript(`document.body.innerText.slice(-500)`));
  for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
    win.webContents.sendInputEvent({ type, x: 874, y: 460, button: 'left', clickCount: 1 });
    await sleep(120);
  }
  await sleep(700);
  log('MODEL_CLICK_SELECTION', await win.webContents.executeJavaScript(`document.body.innerText.slice(-500)`));
  await click(win, 'button', 'Pieza individual', 0);
  for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
    win.webContents.sendInputEvent({ type, x: 806, y: 470, button: 'left', clickCount: 1 });
    await sleep(120);
  }
  await sleep(700);
  log('FRAME_CLICK_SELECTION', await win.webContents.executeJavaScript(`document.body.innerText.slice(-500)`));
  await click(win, 'summary', 'Slots / módulos');
  await click(win, 'button', 'Seleccionar frame del módulo', 0);
  log('FRAME_PANEL_SELECTION', await win.webContents.executeJavaScript(`document.body.innerText.slice(-700)`));
  const dragStartImage = await win.webContents.capturePage();
  writeFileSync(join(__dirname, 'phase83-drag-before.png'), dragStartImage.toPNG());
  const beforeDrag = await readStructure(win);
  log('STRUCTURE_BEFORE_DRAG', beforeDrag);
  await win.webContents.executeJavaScript(`(() => { window.__phase83PointerEvents = []; const canvas = document.querySelector('canvas'); for (const type of ['pointerdown', 'pointermove', 'pointerup']) canvas.addEventListener(type, event => window.__phase83PointerEvents.push({ type, x: event.clientX, y: event.clientY, buttons: event.buttons }), true); })()`);
  win.webContents.sendInputEvent({ type: 'mouseMove', x: 806, y: 470 });
  win.webContents.sendInputEvent({ type: 'mouseDown', x: 806, y: 470, button: 'left', clickCount: 1 });
  for (let index = 1; index <= 10; index += 1) {
    win.webContents.sendInputEvent({ type: 'mouseMove', x: 806 + index * 15, y: 470, button: 'left' });
    await sleep(80);
  }
  win.webContents.sendInputEvent({ type: 'mouseUp', x: 956, y: 470, button: 'left', clickCount: 1 });
  await sleep(1400);
  writeFileSync(join(__dirname, 'phase83-drag-after.png'), (await win.webContents.capturePage()).toPNG());
  const afterDrag = await readStructure(win);
  log('STRUCTURE_AFTER_DRAG', afterDrag);
  log('POINTER_EVENTS', await win.webContents.executeJavaScript(`window.__phase83PointerEvents`));
  log('FRAME_DRAG_COMPLETE', await win.webContents.executeJavaScript(`document.body.innerText.slice(-500)`));
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Z', modifiers: ['control'] });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Z', modifiers: ['control'] });
  await sleep(1200);
  writeFileSync(join(__dirname, 'phase83-drag-undo.png'), (await win.webContents.capturePage()).toPNG());
  const afterUndo = await readStructure(win);
  log('STRUCTURE_AFTER_UNDO', afterUndo);
  log('CTRL_Z_SENT', await win.webContents.executeJavaScript(`document.body.innerText.slice(-500)`));
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Y', modifiers: ['control'] });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Y', modifiers: ['control'] });
  await sleep(1200);
  writeFileSync(join(__dirname, 'phase83-drag-redo.png'), (await win.webContents.capturePage()).toPNG());
  const afterRedo = await readStructure(win);
  log('STRUCTURE_AFTER_REDO', afterRedo);
  assertFrameDrag(beforeDrag, afterDrag, afterUndo, afterRedo);
  log('CTRL_Y_SENT', await win.webContents.executeJavaScript(`document.body.innerText.slice(-500)`));
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Z', modifiers: ['control'] });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Z', modifiers: ['control'] });
  await sleep(800);
  const initialSlotStructure = await readStructure(win);
  const targetSequenceId = initialSlotStructure.sequences.find(item => item.slots[0]?.position?.[2] === 0)?.sequenceId;
  if (!targetSequenceId) throw new Error('No se identificó la secuencia A por su posición inicial');
  const slotSteps = [
    ['Crecer: agregar módulo', 0],
    ['Insertar', 0],
    ['Duplicar', 0],
    ['↑', 1],
    ['Reducir: eliminar', 0],
  ];
  let previousSlots = initialSlotStructure.sequences.find(item => item.sequenceId === targetSequenceId).slots;
  const expectedCounts = [3, 4, 5, 5, 4];
  for (const [step, [label, index]] of slotSteps.entries()) {
    await clickSlot(win, label, targetSequenceId, index);
    const structure = await readStructure(win);
    const slots = structure.sequences.find(item => item.sequenceId === targetSequenceId)?.slots || [];
    assert(slots.length === expectedCounts[step], `${label}: número de slots inesperado ${slots.length}`);
    for (const field of ['slotId', 'moduleId', 'frameId']) assert(new Set(slots.map(item => item[field])).size === slots.length, `${label}: ${field} duplicado`);
    assert(slots.every((item, slotIndex) => Math.abs(item.position[0] - (0.45 + slotIndex * 0.9)) < 1e-6), `${label}: orden o posiciones incoherentes`);
    if (label === '↑') assert(slots[0].slotId === previousSlots[1].slotId && slots[1].slotId === previousSlots[0].slotId, 'El botón subir no intercambió los slots');
    log('SLOT_STATE', { action: label, count: slots.length, idsUnique: new Set(slots.map(item => item.slotId)).size === slots.length,
      moduleIdsUnique: new Set(slots.map(item => item.moduleId)).size === slots.length,
      frameIdsUnique: new Set(slots.map(item => item.frameId)).size === slots.length,
      slots });
    previousSlots = slots;
  }
  log('SLOT_ASSERTION', { pass: true, counts: [2, ...expectedCounts], sequenceId: targetSequenceId });
  for (const [type, x, y] of [['mouseDown', 900, 250], ['mouseMove', 925, 265], ['mouseMove', 950, 280], ['mouseUp', 950, 280]]) {
    win.webContents.sendInputEvent({ type, x, y, button: 'left' });
    await sleep(100);
  }
  await sleep(1200);
  const orbitImage = await win.webContents.capturePage();
  const orbitScreenshot = join(__dirname, 'phase83-orbit.png');
  writeFileSync(orbitScreenshot, orbitImage.toPNG());
  log('ORBIT_SCREENSHOT', orbitScreenshot);
  for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
    win.webContents.sendInputEvent({ type, x: 1100, y: 800, button: 'left', clickCount: 1 });
    await sleep(120);
  }
  await sleep(1200);
  const selectedImage = await win.webContents.capturePage();
  const selectedScreenshot = join(__dirname, 'phase83-select-2d.png');
  writeFileSync(selectedScreenshot, selectedImage.toPNG());
  log('SELECT_2D_SCREENSHOT', selectedScreenshot);
  app.exit(0);
}).catch((error) => {
  log('ERROR', error?.stack || String(error));
  app.exit(1);
});
