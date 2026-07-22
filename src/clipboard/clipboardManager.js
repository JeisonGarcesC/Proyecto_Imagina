export const CLIPBOARD_VERSION = 1;

let clipboard = null;

function cloneSerializable(value) {
  if (value === undefined) return undefined;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    throw new TypeError(`Clipboard data must be serializable: ${error.message}`);
  }
}

export function setClipboard(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('Clipboard data must be an object.');
  }

  if (data.items !== undefined && !Array.isArray(data.items)) {
    throw new TypeError('Clipboard items must be an array.');
  }

  clipboard = cloneSerializable({
    ...data,
    version: CLIPBOARD_VERSION,
    copiedAt: Number.isFinite(Number(data.copiedAt)) ? Number(data.copiedAt) : Date.now(),
    items: data.items ?? [],
  });

  return getClipboard();
}

export function getClipboard() {
  return clipboard ? cloneSerializable(clipboard) : null;
}

export function hasClipboard() {
  return clipboard !== null;
}

export function clearClipboard() {
  const hadClipboard = hasClipboard();
  clipboard = null;
  return hadClipboard;
}

