import { HISTORY_ACTION_TYPES } from './historyManager.js';

export class CreateObjectsCommand {
  constructor({ createdObjects, selectionObjects, identityMap } = {}) {
    if (!Array.isArray(createdObjects) || !createdObjects.length) {
      throw new TypeError('CreateObjectsCommand requires created object snapshots.');
    }

    this.type = HISTORY_ACTION_TYPES.CREATE_OBJECTS;
    this.createdObjects = createdObjects;
    this.selectionObjects = Array.from(new Set(selectionObjects || [])).filter(Boolean);
    this.identityMap = new Map(identityMap || []);
  }
}

