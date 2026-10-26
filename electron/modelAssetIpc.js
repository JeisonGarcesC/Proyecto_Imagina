export function registerModelAssetIpcHandlers(ipcMain, modelAssets) {
  ipcMain.handle('model-asset:import', async (_event, { sourcePath, fileName } = {}) =>
    modelAssets.importGlb(sourcePath, fileName));
  ipcMain.handle('model-asset:load-url', (_event, assetRef) => modelAssets.getLoadUrl(assetRef));
  ipcMain.handle('model-asset:discard-import', (_event, assetRef) => modelAssets.discardImported(assetRef));
  ipcMain.handle('model-asset:clear-project', () => modelAssets.clearProject());
}
