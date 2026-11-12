import test from 'node:test';
import assert from 'node:assert/strict';
import { skills, missions, discoveryBody, summarizeDiscovery } from '../src/discovery.js';

const answers = { team: 'creativity', idea: 'creativity', time: 'organization', feedback: 'creativity', opportunity: 'creativity', community: 'organization' };
const row = (overrides = {}) => ({ revision: 1, self_perception: ['organization'], answers, reflection: null, ...overrides });

test('las seis habilidades tienen exactamente cuatro oportunidades y cada misión cuatro elecciones distintas', () => {
  assert.equal(missions.length, 6);
  for (const mission of missions) assert.equal(new Set(mission.options.map(o => o.id)).size, 4);
  for (const skill of skills) assert.equal(missions.flatMap(m => m.options).filter(o => o.id === skill.id).length, 4);
});

test('resultados derivados de elecciones: seis puntos, sin porcentajes ni puntuaciones externas', () => {
  const result = summarizeDiscovery(row({ scores: { leadership: 999 } })).result;
  assert.equal(Object.values(result.scores).reduce((sum, value) => sum + value), 6);
  assert.equal(result.scores.creativity, 4);
  assert.equal(result.scores.organization, 2);
  assert.equal(result.scores.leadership, 0);
  assert.deepEqual(result.highlighted, ['creativity', 'organization']);
  assert.deepEqual(result.unseen, ['creativity']);
  assert.equal(summarizeDiscovery(row({ answers: { team: 'creativity' } })).result, null);
});

test('todos los empates se respetan y ninguna estrella no elegida inicialmente se inventa', () => {
  const varied = { team: 'leadership', idea: 'creativity', time: 'organization', feedback: 'analysis', opportunity: 'creativity', community: 'communication' };
  const result = summarizeDiscovery(row({ answers: varied, self_perception: ['creativity', 'organization', 'leadership'] })).result;
  assert.equal(result.highlighted.length, 5); // El empate en el corte incluye todas las habilidades con un punto.
  assert.deepEqual(new Set(result.unseen), new Set(['analysis', 'communication']));
  assert.deepEqual(summarizeDiscovery(row({ self_perception: ['creativity', 'organization'] })).result.unseen, []);
});

test('la validación rechaza identidad, resultados, opciones imposibles, duplicados y reflexión prematura', () => {
  const valid = { revision: 0, self_perception: [], answers: {} };
  assert.ok(discoveryBody.safeParse(valid).success);
  for (const bad of [
    { ...valid, user_id: 'someone-else' }, { ...valid, result: { scores: {} } },
    { ...valid, revision: -1 }, { ...valid, self_perception: ['analysis', 'analysis'] },
    { ...valid, self_perception: skills.slice(0, 4).map(s => s.id) },
    { ...valid, answers: { team: 'organization' } }, { ...valid, answers: { invented: 'creativity' } },
    { ...valid, reflection: 'surprised' },
  ]) assert.equal(discoveryBody.safeParse(bad).success, false);
});
