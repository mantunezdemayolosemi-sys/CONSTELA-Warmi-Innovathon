import './cielo.js';

// La constelación pública de Tyra es una muestra; no modifica el progreso real.
const nodes = [...document.querySelectorAll('.nodo')];
const reset = document.querySelector('#reiniciar-constelacion');
const lit = new Set();
function render() {
  nodes.forEach(node => {
    const on = lit.has(node.dataset.skill);
    node.classList.toggle('encendido', on);
    node.setAttribute('aria-pressed', String(on));
  });
  document.querySelectorAll('.arista').forEach(line => line.classList.toggle('encendida', line.dataset.nodos.split(' ').every(id => lit.has(id))));
  document.querySelector('[data-encendidas]').textContent = String(lit.size);
  reset.hidden = !lit.size;
}
for (const node of nodes) {
  function toggle() {
    const id = node.dataset.skill;
    if (lit.has(id)) lit.delete(id); else lit.add(id);
    render();
  }
  node.addEventListener('click', toggle);
  node.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) toggle(); }
  });
}
reset.addEventListener('click', () => { lit.clear(); render(); nodes[0].focus(); });
