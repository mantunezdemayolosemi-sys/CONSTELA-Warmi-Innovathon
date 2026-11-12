import { z } from 'zod';

export const skills = [
  { id: 'creativity', name: 'Creatividad', verb: 'Imaginar otras posibilidades', description: 'En tus decisiones apareció la búsqueda de ideas y de caminos diferentes.', challenge: 'Elige un problema cotidiano y dibuja tres formas distintas de resolverlo.' },
  { id: 'analysis', name: 'Análisis', verb: 'Comprender antes de actuar', description: 'Elegiste observar, hacer preguntas y entender qué hay detrás de un problema.', challenge: 'Elige una situación que quieras mejorar. Anota tres posibles causas y cómo comprobarías una de ellas.' },
  { id: 'collaboration', name: 'Colaboración', verb: 'Construir con otras personas', description: 'Tus elecciones dieron espacio a escuchar y a sumar lo que cada persona puede aportar.', challenge: 'Invita a alguien a resolver un pequeño pendiente en conjunto y acuerden cómo se apoyarán.' },
  { id: 'leadership', name: 'Liderazgo', verb: 'Dar el primer paso', description: 'En estas situaciones tomaste la iniciativa para ayudar al grupo a avanzar.', challenge: 'Propón un primer paso para una idea compartida y pregunta quién quiere sumarse.' },
  { id: 'communication', name: 'Comunicación', verb: 'Conectar a través de las ideas', description: 'Elegiste expresar ideas, hacerlas comprensibles y acordar expectativas.', challenge: 'Cuenta una idea en un minuto: qué problema resuelve, a quién ayuda y por qué te importa.' },
  { id: 'organization', name: 'Organización', verb: 'Convertir ideas en pasos', description: 'En tus decisiones apareció la intención de ordenar tareas, recursos y tiempos.', challenge: 'Convierte una meta de esta semana en tres pasos pequeños y elige cuándo harás el primero.' },
];

export const missions = [
  { id: 'team', title: 'El equipo en problemas', scene: 'Estás organizando una actividad con otras personas, pero nadie se pone de acuerdo y el tiempo se acaba.', question: '¿Qué harías primero?', setting: 'Un equipo. Muchas ideas. Un primer paso.', kind: 'actions', options: [
    { id: 'leadership', title: 'Pongo al equipo en marcha', text: 'Propongo dividir las tareas para que podamos avanzar.', symbol: '↗' },
    { id: 'collaboration', title: 'Escucho las perspectivas', text: 'Converso con las personas para encontrar un punto en común.', symbol: '◎' },
    { id: 'analysis', title: 'Busco la causa del problema', text: 'Reviso qué está fallando antes de proponer una solución.', symbol: '⌕' },
    { id: 'creativity', title: 'Propongo otro camino', text: 'Imagino una alternativa para resolver el bloqueo.', symbol: '✧' },
  ] },
  { id: 'idea', title: 'Una idea que necesita brillar', scene: 'Tu amiga acaba de abrir un emprendimiento de postres, pero casi nadie conoce sus productos. Te pide ayuda.', question: 'Abre tu mochila de ideas. ¿Qué herramienta usarías primero?', setting: 'Algo rico merece encontrar su lugar.', kind: 'toolkit', options: [
    { id: 'creativity', title: 'Un cuaderno de bocetos', text: 'Diseño una forma llamativa y diferente de presentar sus productos.', symbol: '✎' },
    { id: 'communication', title: 'Un mensaje que conecte', text: 'Pienso cómo contar su propuesta a posibles clientes.', symbol: '“' },
    { id: 'analysis', title: 'Una lupa para descubrir', text: 'Investigo qué productos interesan más y por qué.', symbol: '⌕' },
    { id: 'organization', title: 'Un calendario de acciones', text: 'Organizo publicaciones y promociones para darla a conocer.', symbol: '▦' },
  ] },
  { id: 'time', title: 'El tiempo corre', scene: 'Tienen que entregar un proyecto mañana. Una compañera te avisa que no podrá completar su parte.', question: 'Elige tu siguiente movimiento.', setting: 'El plan cambió. Todavía hay posibilidades.', kind: 'actions', options: [
    { id: 'organization', title: 'Ordeno lo indispensable', text: 'Reorganizo las tareas y priorizo lo que necesitamos entregar.', symbol: '▦' },
    { id: 'leadership', title: 'Activo un nuevo plan', text: 'Tomo la iniciativa y propongo cómo seguir adelante.', symbol: '↗' },
    { id: 'communication', title: 'Pongo la situación en palabras', text: 'Comunico lo que pasó y acuerdo expectativas con el equipo.', symbol: '“' },
    { id: 'collaboration', title: 'Busco cómo apoyarnos', text: 'Redistribuimos el trabajo según la disponibilidad de cada persona.', symbol: '◎' },
  ] },
  { id: 'feedback', title: 'Algo no salió como esperabas', scene: 'Tu equipo presentó una propuesta y recibió comentarios que no esperaba. Hay desánimo y dudas sobre cómo continuar.', question: '¿Por dónde empezarías a transformar esta situación?', setting: 'Un tropiezo también puede abrir un camino.', kind: 'paths', options: [
    { id: 'analysis', title: 'Entender los comentarios', text: 'Busco patrones para identificar qué parte necesita mejorar.', symbol: '⌕' },
    { id: 'communication', title: 'Abrir una conversación', text: 'Pregunto qué esperaban ver y explico la intención de la propuesta.', symbol: '“' },
    { id: 'creativity', title: 'Explorar otra versión', text: 'Imagino una forma diferente de presentar o resolver la idea.', symbol: '✧' },
    { id: 'collaboration', title: 'Reconectar con el equipo', text: 'Escucho cómo se siente cada persona y pensamos juntas qué rescatar.', symbol: '◎' },
  ] },
  { id: 'opportunity', title: 'Una oportunidad inesperada', scene: 'Tu grupo puede participar en un concurso con una idea propia. La convocatoria cierra pronto y aún no han decidido si intentarlo.', question: '¿Qué aporte te saldría más natural?', setting: 'Una puerta abierta. Una idea por explorar.', kind: 'actions', options: [
    { id: 'leadership', title: 'Animarnos a dar el paso', text: 'Convoco al grupo y propongo un primer objetivo compartido.', symbol: '↗' },
    { id: 'organization', title: 'Convertirlo en un plan', text: 'Reviso fechas y requisitos y organizo las tareas para postular.', symbol: '▦' },
    { id: 'creativity', title: 'Imaginar qué podríamos hacer', text: 'Propongo una idea diferente que nos entusiasme desarrollar.', symbol: '✧' },
    { id: 'analysis', title: 'Explorar las posibilidades', text: 'Comparo los requisitos con nuestros recursos para entender qué es viable.', symbol: '⌕' },
  ] },
  { id: 'community', title: 'La misión final', scene: 'Tu equipo va a presentar una solución a un problema de su comunidad. Quieren que las personas comprendan la idea y puedan participar.', question: '¿Qué parte te gustaría asumir primero?', setting: 'Lo que aportas puede conectar con alguien más.', kind: 'paths', options: [
    { id: 'communication', title: 'Dar voz a la propuesta', text: 'Preparo una explicación clara y cercana para la comunidad.', symbol: '“' },
    { id: 'collaboration', title: 'Sumar otras voces', text: 'Invito a las personas de la comunidad a aportar y construir con nosotras.', symbol: '◎' },
    { id: 'leadership', title: 'Impulsar el primer encuentro', text: 'Tomo la iniciativa para reunir al grupo y dar el siguiente paso.', symbol: '↗' },
    { id: 'organization', title: 'Preparar el recorrido', text: 'Organizo los materiales, los tiempos y las responsabilidades de la presentación.', symbol: '▦' },
  ] },
];

const skillIds = skills.map(skill => skill.id);
const answersSchema = z.strictObject(Object.fromEntries(missions.map(mission => [mission.id, z.enum(mission.options.map(option => option.id)).optional()])));
export const discoveryBody = z.strictObject({
  revision: z.number().int().min(0).max(2147483646),
  self_perception: z.array(z.enum(skillIds)).max(3).refine(values => new Set(values).size === values.length),
  answers: answersSchema,
  reflection: z.enum(['surprised', 'somewhat', 'knew']).nullable().default(null),
}).refine(value => !value.reflection || Object.keys(value.answers).length === missions.length, { message: 'Completa las misiones antes de guardar la reflexión.', path: ['reflection'] });

export function summarizeDiscovery(row) {
  if (!row) return null;
  // Nunca usar puntuaciones enviadas por el navegador. Se derivan de elecciones válidas.
  const answers = answersSchema.parse(row.answers);
  const completed = Object.keys(answers).length === missions.length;
  const base = { version: 1, revision: row.revision, self_perception: row.self_perception, answers, reflection: row.reflection, completed, updated_at: row.updated_at };
  if (!completed) return { ...base, result: null };
  const scores = Object.fromEntries(skillIds.map(id => [id, Object.values(answers).filter(value => value === id).length]));
  const positive = skills.filter(skill => scores[skill.id] > 0).sort((a, b) => scores[b.id] - scores[a.id]);
  const threshold = positive[Math.min(2, positive.length - 1)] && scores[positive[Math.min(2, positive.length - 1)].id];
  const highlighted = positive.filter(skill => scores[skill.id] >= threshold).map(skill => skill.id);
  const unseen = positive.filter(skill => !row.self_perception.includes(skill.id));
  const unseenMax = unseen.length ? scores[unseen[0].id] : 0;
  return { ...base, result: { scores, highlighted, unseen: unseen.filter(skill => scores[skill.id] === unseenMax).map(skill => skill.id) } };
}
