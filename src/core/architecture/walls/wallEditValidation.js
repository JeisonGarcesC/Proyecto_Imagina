import { validateDoorPlacement } from '../openings/doorDefinition.js';

export function validateWallPointEdit(candidate, walls, openings = []) {
  if (!candidate) return { ok: false, error: 'Introduce un valor válido; los tramos deben tener largo mayor que cero.' };
  const candidateWalls = walls.map((wall) => wall.id === candidate.id ? candidate : wall);
  const invalidOpening = openings.find((opening) =>
    opening.wallId === candidate.id && !validateDoorPlacement(opening, candidateWalls, openings).valid
  );
  if (invalidOpening) return { ok: false, error: 'El cambio dejaría una abertura fuera de su tramo. Ajusta primero la abertura.' };
  return { ok: true, walls: candidateWalls };
}
