export function resolveCritteriumConnectedSystems(systems, startingSystemId) {
  const byId = new Map(
    systems
      .filter((system) => system?.userData?.kind === 'CRITERIUM_SYSTEM' && system.userData.systemId)
      .map((system) => [system.userData.systemId, system])
  );
  if (!byId.has(startingSystemId)) return [];

  const neighbours = new Map([...byId.keys()].map((id) => [id, new Set()]));
  for (const system of byId.values()) {
    const sourceId = system.userData.systemId;
    for (const connection of system.userData.connections || []) {
      const targetId = connection.targetSystemId;
      if (!targetId || !byId.has(targetId) || targetId === sourceId) continue;
      neighbours.get(sourceId).add(targetId);
      neighbours.get(targetId).add(sourceId);
    }
  }

  const visited = new Set([startingSystemId]);
  const queue = [startingSystemId];
  for (let index = 0; index < queue.length; index += 1) {
    for (const id of neighbours.get(queue[index])) {
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push(id);
    }
  }
  return queue.map((id) => byId.get(id));
}
