const byId = id => document.getElementById(id);
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function createDiscovery({ send, showAccount, showOpportunities, sessionExpired }) {
  const view = byId('discovery-view');
  const content = byId('discovery-content');
  let catalog;
  let state;
  let step = 0;
  let selectedSkills = [];
  let selectedOption;
  let epoch = 0;
  let saving = false;
  const points = [[62,205],[122,88],[265,60],[337,178],[274,286],[145,279]];

  byId('discovery-profile').addEventListener('click', () => { if (!saving) showAccount(); });
  function title(text, eyebrow) {
    content.replaceChildren();
    content.append(element('p', 'eyebrow mission-eyebrow', eyebrow));
    const h1 = element('h1', 'mission-title', text);
    h1.tabIndex = -1;
    content.append(h1);
    return h1;
  }
  function focusTitle(scroll = false) {
    content.querySelector('h1')?.focus({ preventScroll: true });
    if (scroll) content.parentElement.scrollIntoView({ block: 'start' });
  }
  function paragraph(text, className = 'mission-description') { const p = element('p', className, text); content.append(p); return p; }
  function button(text, callback, className = 'primary-button') {
    const b = element('button', className, text);
    b.type = 'button';
    b.addEventListener('click', callback);
    return b;
  }
  function hideError() { byId('discovery-error').hidden = true; }
  function fail(error) {
    if (error.status === 401) { sessionExpired(); return; }
    byId('discovery-error').textContent = error.message;
    byId('discovery-error').hidden = false;
    if (error.status === 409) {
      byId('discovery-error').append(button('Recargar mi progreso', () => open(), 'text-action'));
    }
  }
  function drawUniverse() {
    const done = Object.keys(state?.answers || {}).length;
    const group = byId('universe-nodes');
    group.replaceChildren();
    points.forEach(([x, y], i) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      node.setAttribute('transform', `translate(${x} ${y})`);
      node.setAttribute('class', `universe-node${i < done ? ' lit' : ''}`);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M0-15L4-4L15 0L4 4L0 15L-4 4L-15 0L-4-4Z');
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('y', '34');
      label.textContent = String(i + 1).padStart(2, '0');
      node.append(path, label); group.append(node);
    });
    byId('universe-map').setAttribute('aria-label', `Constelación: ${done} de 6 estrellas iluminadas`);
    byId('universe-count').textContent = done ? `${done} de 6 estrellas iluminadas` : 'Seis misiones. Muchas formas de aportar.';
    byId('universe-caption').textContent = done === 6 ? 'Tu constelación es un comienzo. Puede seguir creciendo.' : 'Cada decisión conecta una nueva estrella.';
    byId('mission-progress').value = done;
  }
  function progress(show, text = '') {
    byId('discovery-progress').hidden = !show;
    byId('discovery-step').textContent = text;
    byId('discovery-save-status').textContent = state?.revision ? 'Progreso guardado' : '';
  }
  async function persist(next) {
    if (saving) return false;
    const activeEpoch = epoch;
    saving = true;
    hideError();
    content.setAttribute('aria-busy', 'true');
    view.querySelectorAll('button,input').forEach(control => { control.disabled = true; });
    byId('discovery-save-status').textContent = 'Guardando…';
    try {
      const data = await send('/web/discovery', { method: 'PUT', body: {
        revision: state?.revision || 0,
        self_perception: next.self_perception ?? state?.self_perception ?? [],
        answers: next.answers ?? state?.answers ?? {},
        reflection: next.reflection === undefined ? (state?.reflection ?? null) : next.reflection,
      }, refresh: true });
      if (activeEpoch !== epoch) return false;
      state = data.discovery;
      drawUniverse();
      byId('discovery-save-status').textContent = 'Progreso guardado';
      return true;
    } catch (error) {
      if (activeEpoch === epoch) { fail(error); byId('discovery-save-status').textContent = 'Sin guardar. Intenta de nuevo.'; }
      return false;
    } finally {
      if (activeEpoch === epoch) {
        saving = false;
        content.setAttribute('aria-busy', 'false');
        view.querySelectorAll('button,input').forEach(control => { control.disabled = false; });
        updateContinue();
      }
    }
  }
  function intro() {
    hideError(); progress(false);
    selectedSkills = [...(state?.self_perception || [])];
    title('Descubre las estrellas que ya brillan en ti.', 'TU PRIMERA MISIÓN');
    paragraph('Algunas aparecen cuando escuchas, organizas, resuelves o imaginas. En seis pequeñas historias, explorarás lo que aportas a tu manera.');
    const meta = element('div', 'mission-meta');
    meta.append(element('span', '', '6 misiones'), element('span', '', 'A tu ritmo'), element('span', '', 'Sin respuestas correctas'));
    content.append(meta);
    const box = element('section', 'perception-box');
    box.append(element('h2', '', 'Antes de empezar, ¿qué habilidades reconoces en ti?'), element('p', '', 'Elige hasta tres. Si aún no lo tienes claro, también está bien.'));
    const chips = element('div', 'skill-choices');
    catalog.skills.forEach(skill => {
      const b = button(skill.name, () => {
        const index = selectedSkills.indexOf(skill.id);
        if (index >= 0) selectedSkills.splice(index, 1);
        else if (selectedSkills.length < 3) selectedSkills.push(skill.id);
        else { hint.textContent = 'Puedes elegir hasta tres. Quita una para seleccionar otra.'; return; }
        chips.querySelectorAll('button').forEach(c => c.setAttribute('aria-pressed', String(selectedSkills.includes(c.dataset.skill))));
        hint.textContent = selectedSkills.length ? `${selectedSkills.length} de 3 seleccionadas` : 'Puedes comenzar sin elegir ninguna.';
        unsure.setAttribute('aria-pressed', String(selectedSkills.length === 0));
      }, 'skill-chip');
      b.dataset.skill = skill.id;
      b.setAttribute('aria-pressed', String(selectedSkills.includes(skill.id)));
      chips.append(b);
    });
    const unsure = button('Aún estoy descubriéndolo', () => {
      selectedSkills = []; chips.querySelectorAll('button').forEach(c => c.setAttribute('aria-pressed', 'false'));
      unsure.setAttribute('aria-pressed', 'true'); hint.textContent = 'Puedes comenzar sin elegir ninguna.';
    }, 'unsure-button');
    unsure.setAttribute('aria-pressed', String(selectedSkills.length === 0));
    const hint = element('p', 'selection-hint', selectedSkills.length ? `${selectedSkills.length} de 3 seleccionadas` : 'Puedes comenzar sin elegir ninguna.');
    hint.setAttribute('role', 'status');
    box.append(chips, unsure, hint); content.append(box);
    content.append(button(state?.revision ? 'Continuar mi misión ↗' : 'Comenzar mi misión ↗', async () => {
      if (await persist({ self_perception: selectedSkills, reflection: null })) {
        const first = catalog.missions.findIndex(m => !state.answers[m.id]);
        step = first < 0 ? 0 : first; mission(); focusTitle(true);
      }
    }));
    paragraph('Una exploración personal para reconocer posibilidades, no una evaluación psicológica ni una certificación de habilidades.', 'mission-fine-print');
  }
  function updateContinue() {
    const next = byId('mission-continue');
    if (next) next.disabled = saving || !selectedOption;
  }
  function mission() {
    hideError();
    const data = catalog.missions[step];
    selectedOption = state?.answers[data.id];
    progress(true, `MISIÓN ${step + 1} DE 6`);
    title(data.title, data.setting);
    paragraph(data.scene);
    const fieldset = element('fieldset', `mission-options ${data.kind}`);
    fieldset.append(element('legend', '', data.question));
    const grid = element('div', 'option-grid');
    data.options.forEach((option, i) => {
      const label = element('label', 'option-card');
      const input = element('input');
      input.type = 'radio'; input.name = 'mission-choice'; input.value = option.id; input.checked = selectedOption === option.id;
      const symbol = element('span', 'option-symbol', option.symbol); symbol.setAttribute('aria-hidden', 'true');
      const copy = element('span', 'option-copy'); copy.append(element('strong', '', option.title), element('span', '', option.text));
      const marker = element('span', 'option-marker', String.fromCharCode(65 + i)); marker.setAttribute('aria-hidden', 'true');
      label.append(input, symbol, copy, marker);
      input.addEventListener('change', () => { selectedOption = input.value; updateContinue(); });
      grid.append(label);
    });
    fieldset.append(grid); content.append(fieldset);
    const actions = element('div', 'mission-actions');
    const back = button('← Volver', () => { if (step === 0) intro(); else { step--; mission(); } focusTitle(true); }, 'secondary-button');
    const next = button(step === 5 ? 'Conectar mi constelación ✦' : 'Iluminar mi siguiente estrella ↗', async () => {
      if (!selectedOption) return;
      const answers = { ...state.answers, [data.id]: selectedOption };
      if (await persist({ answers, reflection: null })) {
        if (step === 5) result(); else { step++; mission(); }
        focusTitle(true);
      }
    });
    next.id = 'mission-continue';
    actions.append(back, next); content.append(actions); updateContinue();
    paragraph('Elige lo que se parece a ti hoy. Guardamos tu avance al continuar.', 'mission-fine-print');
  }
  function result() {
    hideError(); progress(true, 'MISIÓN COMPLETADA');
    title('Hay algo valioso en cómo haces las cosas.', 'TU CONSTELACIÓN INICIAL');
    paragraph('Tal vez algunas de estas acciones te parecían normales. También son maneras de aportar a un equipo: estas estrellas aparecieron en tus decisiones.');
    const highlights = element('div', 'result-highlights');
    state.result.highlighted.forEach(id => {
      const skill = catalog.skills.find(s => s.id === id);
      const card = element('article', 'strength-card');
      card.append(element('span', 'strength-spark', '✦'), element('h2', '', skill.name), element('p', '', skill.description)); highlights.append(card);
    });
    content.append(highlights);
    const unseen = element('section', 'unseen-star');
    unseen.append(element('span', 'unseen-symbol', '✧'), element('p', 'eyebrow', 'LA ESTRELLA QUE NO VEÍAS'));
    if (state.result.unseen.length) {
      const names = state.result.unseen.map(id => catalog.skills.find(s => s.id === id).name);
      unseen.append(element('h2', '', names.join(' · ')), element('p', '', `${names.length > 1 ? 'No las habías elegido al comenzar y aparecieron' : 'No la habías elegido al comenzar y apareció'} en tus decisiones. Quizá aquí haya una posibilidad que quieras poner a prueba.`));
    } else {
      unseen.append(element('h2', '', 'Ya reconocías estas estrellas.'), element('p', '', 'Las habilidades que aparecieron ya estaban entre las que elegiste al comenzar. Explorar cómo las usas también puede enseñarte algo nuevo.'));
    }
    const perception = state.self_perception.map(id => catalog.skills.find(s => s.id === id).name);
    unseen.append(element('p', 'perception-recap', perception.length ? `Al comenzar reconocías: ${perception.join(' · ')}.` : 'Al comenzar preferiste seguir descubriéndolo. Este puede ser tu primer punto de partida.'));
    content.append(unseen);
    const details = element('details', 'score-details');
    details.append(element('summary', '', 'Cómo se conectaron tus elecciones'));
    details.append(element('p', '', 'Cada elección suma un punto. Cada habilidad apareció como opción en cuatro misiones. Los empates se muestran juntos.'));
    const list = element('ul', 'score-list');
    catalog.skills.forEach(skill => {
      const li = element('li'); const value = state.result.scores[skill.id];
      li.append(element('span', '', skill.name), element('span', '', `${value} de 4 elecciones posibles`)); list.append(li);
    });
    details.append(list, element('p', '', 'Un cero solo significa que elegiste otras formas de actuar en estas historias. No significa que te falte esa habilidad. Esta exploración no es una medición psicológica validada.')); content.append(details);
    const reflection = element('section', 'reflection-box');
    reflection.append(element('h2', '', '¿Alguna de estas habilidades te sorprendió?'));
    const choices = element('div', 'reflection-choices');
    [['surprised','Sí, nunca lo había pensado'],['somewhat','Más o menos'],['knew','Ya lo sabía']].forEach(([id, label]) => {
      const b = button(label, async () => { if (await persist({ reflection: id })) { result(); byId('reflection-saved')?.focus({ preventScroll: true }); } }, 'reflection-choice');
      b.setAttribute('aria-pressed', String(state.reflection === id)); choices.append(b);
    });
    reflection.append(choices);
    if (state.reflection) { const saved = element('p', 'reflection-saved', 'Gracias. Guardamos tu reflexión.'); saved.id = 'reflection-saved'; saved.tabIndex = -1; saved.setAttribute('role', 'status'); reflection.append(saved); }
    content.append(reflection);
    const challenges = element('section', 'discovery-challenges');
    challenges.append(element('p', 'eyebrow', 'DE RECONOCER A EXPLORAR'), element('h2', '', 'Un primer paso para ponerlas en práctica.'), element('p', '', 'Estas ideas son invitaciones. Completar la misión identifica posibilidades; practicar y demostrar una habilidad requerirá experiencias y evidencias.'));
    state.result.highlighted.forEach(id => {
      const skill = catalog.skills.find(s => s.id === id);
      const card = element('article', 'mini-challenge'); card.append(element('span', 'challenge-label', skill.name), element('p', '', skill.challenge)); challenges.append(card);
    });
    content.append(challenges);
    const stages = element('ol', 'skill-stages');
    ['Identificada en tus elecciones', 'Por practicar en un reto', 'Por demostrar con evidencia'].forEach(text => stages.append(element('li', '', text))); content.append(stages);
    const actions = element('div', 'result-actions');
    actions.append(button('Volver a explorar mis respuestas', () => { step = 0; mission(); focusTitle(true); }, 'secondary-button'), button('Explorar mis oportunidades ↗', showOpportunities)); content.append(actions);
    paragraph('Tu constelación no es una etiqueta definitiva. Puede crecer y cambiar con nuevas experiencias.', 'mission-fine-print');
  }
  async function open() {
    const activeEpoch = ++epoch;
    saving = false;
    view.hidden = false;
    ['story','auth-card','account-view'].forEach(id => { byId(id).hidden = true; });
    byId('main').classList.remove('account-layout'); byId('main').classList.add('discovery-layout');
    document.title = 'Tu universo de habilidades · Constela';
    if (location.pathname !== '/descubrir') history.pushState(null, '', '/descubrir');
    window.scrollTo({ top: 0 });
    hideError(); progress(false); state = null; drawUniverse();
    title('Vamos a conectar tus estrellas.', 'TU UNIVERSO DE HABILIDADES'); paragraph('Estamos recuperando tu misión…');
    content.setAttribute('aria-busy', 'true');
    try {
      const data = await send('/web/discovery', { refresh: true });
      if (activeEpoch !== epoch) return;
      catalog = data.catalog; state = data.discovery;
      drawUniverse();
      if (state?.completed) result();
      else if (state?.revision) { step = catalog.missions.findIndex(m => !state.answers[m.id]); mission(); }
      else intro();
      focusTitle();
    } catch (error) {
      if (activeEpoch !== epoch) return;
      title('Tu misión te espera.', 'VAMOS A INTENTARLO DE NUEVO');
      paragraph('No pudimos recuperar tu progreso. Puedes volver a intentarlo sin perder lo que ya guardaste.');
      content.append(button('Volver a cargar mi misión ↗', open)); fail(error);
    } finally { if (activeEpoch === epoch) content.setAttribute('aria-busy', 'false'); }
  }
  function close() { epoch++; saving = false; view.hidden = true; byId('main').classList.remove('discovery-layout'); }
  function reset() { close(); state = null; catalog = null; selectedSkills = []; selectedOption = null; content.replaceChildren(); }
  return { open, close, reset };
}
