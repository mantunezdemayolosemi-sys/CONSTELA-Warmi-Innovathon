import { z } from 'zod';

export const galaxies = [
  ['technology', '💻', 'Tecnología e IA', 'Crear con tecnología y explorar la inteligencia artificial.'],
  ['design', '🎨', 'Diseño y creatividad', 'Dar forma a ideas, experiencias y soluciones.'],
  ['business', '🚀', 'Negocios y emprendimiento', 'Impulsar proyectos y descubrir nuevas maneras de emprender.'],
  ['science', '🔬', 'Ciencia e investigación', 'Hacer preguntas, experimentar y descubrir.'],
  ['social', '💜', 'Impacto social', 'Contribuir a tu comunidad y transformar realidades.'],
  ['marketing', '📱', 'Marketing y comunicación', 'Conectar historias, personas y marcas.'],
  ['sustainability', '🌱', 'Sostenibilidad', 'Cuidar el planeta e imaginar futuros sostenibles.'],
  ['health', '🩺', 'Salud y bienestar', 'Explorar cómo mejorar la vida y el bienestar.'],
  ['education', '📚', 'Educación', 'Compartir conocimientos y transformar el aprendizaje.'],
  ['data', '📊', 'Datos y análisis', 'Encontrar patrones y respuestas en los datos.'],
  ['arts', '🎭', 'Arte y cultura', 'Expresarte y explorar distintas miradas del mundo.'],
  ['explore', '✨', 'Quiero explorar', 'Ver posibilidades de todas las galaxias, sin elegir un área todavía.'],
].map(([id, symbol, name, description]) => ({ id, symbol, name, description }));

export const interestsBody = z.strictObject({
  revision: z.number().int().min(0).max(2147483646),
  galaxies: z.array(z.enum(galaxies.map(g => g.id))).min(1).max(5)
    .refine(values => new Set(values).size === values.length, 'No repitas galaxias.')
    .refine(values => !values.includes('explore') || values.length === 1, 'Explorar abre todas las galaxias.'),
});
