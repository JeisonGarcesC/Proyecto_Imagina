const IMAGE_EXTENSIONS = ['png', 'jpeg', 'jpg', 'webp'];

function normalizeFolderName(folder) {
  return String(folder || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
}

export function buildImageAssetCandidates(assetName, folders = []) {
  const code = String(assetName || '').trim();
  if (!code) return [];

  const folderList = Array.isArray(folders) ? folders : [folders];
  const normalizedFolders = [...new Set(folderList.map(normalizeFolderName).filter(Boolean))];
  const basePaths = [...normalizedFolders.map((folder) => `/assets/imagen/${folder}`), '/assets/imagen'];

  return basePaths.flatMap((basePath) => IMAGE_EXTENSIONS.map((ext) => `${basePath}/${code}.${ext}`));
}