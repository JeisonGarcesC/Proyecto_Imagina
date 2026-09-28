const descriptor = (key, role, description, code, visual, bom = true) => ({ componentKey: key, componentRole: role,
  commercial: { code, description, includeInBOM: bom }, visual });

export function createMultipleDoorParts(door, resolution) {
  const prefix = door.componentKey || 'door-0'; const common = { doorKey: prefix, widthCm: door.widthCm, heightCm: door.heightCm, swing: door.swing };
  return [
    descriptor(`${prefix}-frame-left`, 'DOOR_FRAME_LEFT', 'Marco puerta · lateral izquierdo', resolution.frame?.code || null, { ...common, materialRole: 'PAINTED_METAL' }),
    descriptor(`${prefix}-frame-right`, 'DOOR_FRAME_RIGHT', 'Marco puerta · lateral derecho', null, { ...common, materialRole: 'PAINTED_METAL' }, false),
    descriptor(`${prefix}-frame-top`, 'DOOR_FRAME_TOP', 'Marco puerta · perfil superior', null, { ...common, materialRole: 'PAINTED_METAL' }, false),
    descriptor(`${prefix}-leaf`, 'DOOR_LEAF', `Hoja puerta ${door.material.toLowerCase()}`, resolution.leaf?.code || null, { ...common, materialRole: door.material }),
    // El XML documenta la nave de puerta "con cerradura" y no ofrece SKU MULTIPLE
    // independiente para bisagras o herrajes. Se conservan visuales dentro del conjunto.
    descriptor(`${prefix}-hinges`, 'DOOR_HINGES', 'Bisagras incluidas en conjunto puerta', null, { ...common, materialRole: 'HARDWARE' }, false),
    descriptor(`${prefix}-hardware`, 'DOOR_HARDWARE', 'Herrajes incluidos en conjunto puerta', null, { ...common, materialRole: 'HARDWARE' }, false),
  ];
}
