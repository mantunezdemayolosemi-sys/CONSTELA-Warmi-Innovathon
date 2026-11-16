export const pointsPerStar = 25;
export const pointsPerLevel = 75;

// El servidor resume únicamente prácticas del perfil verificado. El cliente
// reutiliza el cálculo al recibir una práctica confirmada por la API.
export function summarizeProgress(practices) {
  const stars = new Set(practices.map(practice => practice.post_id)).size;
  const points = stars * pointsPerStar;
  const inLevel = points % pointsPerLevel;
  return { stars, points, level: 1 + Math.floor(points / pointsPerLevel), inLevel, pointsToNext: pointsPerLevel - inLevel };
}
