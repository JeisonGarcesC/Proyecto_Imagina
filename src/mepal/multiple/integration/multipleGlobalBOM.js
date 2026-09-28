export function emitMultipleGlobalBOM(object, addRow, resolveDescription = (_code, description) => description) {
  if (object?.userData?.kind !== 'MULTIPLE_PRODUCT' || typeof addRow !== 'function') return false;
  for (const item of object.userData.bom || []) {
    addRow(item.code || item.codigoPT, item.quantity, resolveDescription(item.code || item.codigoPT, item.description),
      item.price ?? null, object.userData.groupId, object.userData.groupName || 'Multiple', undefined, null, object.userData.instanceId);
  }
  return true;
}
