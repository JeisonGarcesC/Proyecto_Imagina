const DATABASE_NAME = 'proyecto-imagina-plans';
const DATABASE_VERSION = 1;
const STORE_NAME = 'plan-assets';

function createAssetId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `plan_${globalThis.crypto.randomUUID()}`;
  }

  return `plan_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'));
    request.onblocked = () => reject(new Error('La base de datos de planos está bloqueada.'));
  });
}

async function runRequest(mode, operation) {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      let request;

      try {
        request = operation(store);
      } catch (error) {
        reject(error);
        return;
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Transacción cancelada.'));
    });
  } finally {
    database.close();
  }
}

function buildAssetRecord(id, fileOrBlob, metadata = {}) {
  if (!(fileOrBlob instanceof Blob)) {
    throw new TypeError('El asset del plano debe ser un File o Blob.');
  }

  return {
    id,
    blob: fileOrBlob,
    fileName: String(metadata.fileName || fileOrBlob.name || ''),
    mimeType: String(metadata.mimeType || fileOrBlob.type || ''),
    size: Number(fileOrBlob.size || 0),
    createdAt: metadata.createdAt || new Date().toISOString(),
  };
}

export async function savePlanAsset(fileOrBlob, metadata = {}) {
  const asset = buildAssetRecord(createAssetId(), fileOrBlob, metadata);
  await runRequest('readwrite', (store) => store.add(asset));
  return asset.id;
}

export async function replacePlanAsset(assetId, fileOrBlob, metadata = {}) {
  const id = String(assetId || '').trim();
  if (!id) throw new Error('assetId es obligatorio.');

  const previous = await getPlanAsset(id);
  const asset = buildAssetRecord(id, fileOrBlob, {
    ...metadata,
    createdAt: metadata.createdAt || previous?.createdAt,
  });
  await runRequest('readwrite', (store) => store.put(asset));
  return id;
}

export async function getPlanAsset(assetId) {
  const id = String(assetId || '').trim();
  if (!id) return null;
  return (await runRequest('readonly', (store) => store.get(id))) || null;
}

export async function hasPlanAsset(assetId) {
  const id = String(assetId || '').trim();
  if (!id) return false;
  const key = await runRequest('readonly', (store) => store.getKey(id));
  return key !== undefined;
}

export async function deletePlanAsset(assetId) {
  const id = String(assetId || '').trim();
  if (!id) return false;
  await runRequest('readwrite', (store) => store.delete(id));
  return true;
}
