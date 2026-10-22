const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value, message) => { if (!value) throw new Error(message); };
const apiExpr = `(() => {
  const heading = [...document.querySelectorAll('h3')].find((node) => node.textContent.trim() === 'CRITERIUM 8');
  let fiber = heading?.[Object.keys(heading).find((key) => key.startsWith('__reactFiber'))];
  while (fiber && !fiber.memoizedProps?.threeApiRef?.current) fiber = fiber.return;
  return fiber?.memoizedProps?.threeApiRef?.current;
})()`;
const sceneExpr = `(() => {
  let node = document.querySelector('canvas')?.parentElement;
  let fiber = null;
  while (node && !fiber) { fiber = node[Object.keys(node).find((key) => key.startsWith('__reactFiber'))]; node = node.parentElement; }
  while (fiber && fiber.type?.name !== 'ThreeCanvas') fiber = fiber.return;
  let hook = fiber?.memoizedState;
  while (hook) { if (hook.memoizedState?.current?.isScene) return hook.memoizedState.current; hook = hook.next; }
  return null;
})()`;
async function evaluate(win, script) { return win.webContents.executeJavaScript(script); }
async function click(win, label) {
  const position = await evaluate(win, `(() => { const element = [...document.querySelectorAll('button')].find((button) =>
    button.textContent.trim() === ${JSON.stringify(label)} || button.title === ${JSON.stringify(label)} || button.getAttribute('aria-label') === ${JSON.stringify(label)});
    if (!element) return null; element.scrollIntoView({block:'center'}); const rect = element.getBoundingClientRect();
    return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2), disabled: element.disabled }; })()`);
  if (!position || position.disabled) {
    const buttons = await evaluate(win, `([...document.querySelectorAll('button')].map((button) => button.textContent.trim()).filter(Boolean))`);
    throw new Error(`Botón no disponible: ${label}; visibles: ${buttons.slice(0, 45).join(' | ')}`);
  }
  for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
    win.webContents.sendInputEvent({ type, x: position.x, y: position.y, button: 'left', clickCount: 1 });
    await sleep(90);
  }
  await sleep(500);
}
async function selectGrowth(win, count, properties = false) {
  const result = await evaluate(win, `(() => { const candidates = [...document.querySelectorAll('label')];
    const label = candidates.find((element) => element.textContent.includes('Módulos de crecimiento') &&
      ${properties} === Boolean(element.closest('.pp-shell')));
    const select = label?.querySelector('select'); if (!select) return null;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, String(${count}));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return { values: [...select.options].map((option) => option.value), selected: String(${count}) }; })()`);
  check(result && result.values.includes(String(count)), 'Selector de crecimiento no disponible');
  await sleep(750);
}
async function snapshot(win) {
  return evaluate(win, `(async () => { const api = ${apiExpr}; const scene = ${sceneExpr};
    const frame = scene.children.find((node) => node.userData?.kind === 'CRITTERIUM_8_ASSEMBLY');
    const { resolveCritterium8BOM } = await import('/src/mepal/critterium8/bom/critterium8BOM.js');
    return { frameId: frame?.userData?.frameId, instanceId: frame?.userData?.instanceId,
      base: frame?.userData?.config?.heightCm, final: frame?.userData?.composition?.heightCm,
      growthCount: frame?.userData?.config?.growthModules?.length,
      boundsMaxY: frame?.userData?.layout?.bounds?.maxY,
      codes: frame ? resolveCritterium8BOM([{obj:frame}]).rows.map((row) => [row.code,row.qty]) : [],
      savedGrowth: api.exportProject().entities.find((entity) => entity.kind === 'CRITTERIUM_8')?.config?.growthModules?.length,
    }; })()`);
}
async function shortcut(win, keyCode) {
  for (const type of ['keyDown', 'keyUp']) win.webContents.sendInputEvent({ type, keyCode, modifiers: ['control'] });
  await sleep(900);
}
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1600, height: 1000, show: false });
  await win.loadURL('http://127.0.0.1:5174/');
  await sleep(4000);
  await click(win, 'Administrador');
  await sleep(6500);
  await click(win, 'Critterium 8');
  await click(win, 'Frame');
  await selectGrowth(win, 1);
  await click(win, 'Crear frame');
  const created = await snapshot(win);
  check(created.base === 128 && created.final === 166 && created.growthCount === 1, 'Creación con crecimiento incorrecta');
  check(created.codes.some(([code, qty]) => code === '22191900165' && qty === 1), 'Código de crecimiento ausente');
  console.log('CREATED', JSON.stringify(created));
  writeFileSync(join(__dirname, 'phase101-growth-frame.png'), (await win.webContents.capturePage()).toPNG());
  await selectGrowth(win, 0, true);
  const removed = await snapshot(win);
  check(removed.final === 128 && removed.growthCount === 0, 'Retiro de crecimiento incorrecto');
  console.log('REMOVED', JSON.stringify(removed));
  await shortcut(win, 'Z');
  const undone = await snapshot(win);
  check(undone.final === 166 && undone.instanceId === created.instanceId, 'Ctrl+Z no restauró crecimiento');
  console.log('UNDO', JSON.stringify(undone));
  await shortcut(win, 'Y');
  const redone = await snapshot(win);
  check(redone.final === 128 && redone.instanceId === created.instanceId, 'Ctrl+Y no retiró crecimiento');
  console.log('REDO', JSON.stringify(redone));
  await selectGrowth(win, 1, true);
  const beforeLoad = await snapshot(win);
  const afterLoad = await evaluate(win, `(async () => { const api = ${apiExpr}; const project = api.exportProject();
    await api.clearProject(); await api.loadProject(project); return project.entities.length; })()`);
  await sleep(1300);
  const reopened = await snapshot(win);
  check(afterLoad > 0 && reopened.frameId === beforeLoad.frameId && reopened.final === 166 && reopened.savedGrowth === 1,
    'Reapertura no conservó crecimiento e identidad');
  console.log('REOPENED', JSON.stringify(reopened));
  const office = await evaluate(win, `(async () => { const api = ${apiExpr};
    await api.clearProject();
    const frame = { widthCm: 60, heightCm: 90, frameMode: 'HALF_HEIGHT', compositionMode: 'MODULAR', growthModules: [{ index: 0 }], tiles: [] };
    const created = await api.createConfiguredCritteriumSystem([{ frames: [frame, frame], orientationDeg: 0 }]);
    if (!created.success) return { error: created.reason };
    const before = api.getCritteriumStructure();
    const source = before.systems[0];
    const sourceSequence = before.sequences.find((item) => item.parentSystemId === source.systemId);
    const sourceBom = api.getCritteriumOfficeSummary(source.systemId);
    const points = api.getCritteriumConnectionPoints(sourceSequence.sequenceId);
    api.selectCritteriumFrameByInstanceId(sourceSequence.slots[0].frameInstanceId);
    const invalidEdit = await api.updateSelectedCritterium8({ growthModules: [] });
    if (invalidEdit.success) return { error: 'Se permitió una transición de altura sin kit validado' };
    const duplicate = await api.duplicateCritteriumSystemById(source.systemId);
    if (!duplicate.success) return { error: duplicate.reason };
    const after = api.getCritteriumStructure();
    const copy = after.systems.find((item) => item.systemId !== source.systemId);
    const copySequence = after.sequences.find((item) => item.parentSystemId === copy.systemId);
    const copyBom = api.getCritteriumOfficeSummary(copy.systemId);
    const { loadCritteriumPriceCatalog } = await import('/src/mepal/critterium8/commercial/critteriumPriceCatalog.js');
    const { buildCritteriumQuotation } = await import('/src/mepal/critterium8/commercial/critteriumQuotation.js');
    const prices = await loadCritteriumPriceCatalog('CO');
    const sourceQuote = buildCritteriumQuotation({ systemId: source.systemId, bom: sourceBom, priceCatalog: prices });
    const copyQuote = buildCritteriumQuotation({ systemId: copy.systemId, bom: copyBom, priceCatalog: prices });
    const project = api.exportProject();
    await api.clearProject(); await api.loadProject(project);
    const reopened = api.getCritteriumStructure();
    return { sourceId: source.systemId, copyId: copy.systemId,
      invalidEditReason: invalidEdit.reason,
      reopenedSystemIds: reopened.systems.map((item) => item.systemId),
      reopenedGrowthCounts: reopened.sequences.flatMap((item) => item.slots.map((slot) => slot.config?.growthModules?.length)),
      sourceSlots: sourceSequence.slots.map((slot) => ({ moduleId: slot.moduleId, frameId: slot.frameId, heightCm: slot.heightCm, growthCount: slot.config?.growthModules?.length })),
      copySlots: copySequence.slots.map((slot) => ({ moduleId: slot.moduleId, frameId: slot.frameId, heightCm: slot.heightCm, growthCount: slot.config?.growthModules?.length })),
      points: points.map((point) => point.heightCm),
      sourceCodes: sourceBom.rows.map((row) => [row.code,row.qty]).sort(),
      copyCodes: copyBom.rows.map((row) => [row.code,row.qty]).sort(),
      sourceTotal: sourceQuote.total, copyTotal: copyQuote.total, currency: sourceQuote.currency };
  })()`);
  check(!office.error, office.error);
  check(office.sourceId !== office.copyId, 'Duplicación conservó systemId');
  check(office.sourceSlots.every((slot) => slot.growthCount === 1 && slot.heightCm === 128), 'Sistema original perdió crecimiento');
  check(office.copySlots.every((slot) => slot.growthCount === 1 && slot.heightCm === 128), 'Sistema duplicado perdió crecimiento');
  check(office.copySlots.every((slot) => !office.sourceSlots.some((old) => old.moduleId === slot.moduleId || old.frameId === slot.frameId)), 'Duplicación reutilizó IDs');
  check(office.points.every((height) => height === 128), 'Puntos de Smart Snap usan altura incorrecta');
  check(office.reopenedSystemIds.includes(office.sourceId) && office.reopenedSystemIds.includes(office.copyId) &&
    office.reopenedGrowthCounts.every((count) => count === 1), 'Reapertura de sistemas perdió crecimiento o identidad');
  check(JSON.stringify(office.sourceCodes) === JSON.stringify(office.copyCodes) && office.sourceTotal === office.copyTotal,
    'BOM/cotización del sistema duplicado difieren');
  console.log('SYSTEM_DUPLICATE', JSON.stringify(office));
  win.destroy(); app.exit(0);
}).catch((error) => { console.error('ERROR', error.stack || String(error)); app.exit(1); });
