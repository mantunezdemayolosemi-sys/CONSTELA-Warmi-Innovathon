const $ = id => document.getElementById(id);
const el = (tag, css, value) => {
  const node=document.createElement(tag); if(css) node.className=css;
  if(value!==undefined) node.textContent=value; return node;
};
const date = value => {
  if (!value) return 'Por confirmar';
  const plain=value.length===10;
  return new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short',year:'numeric',timeZone:plain?'UTC':'America/Lima',...(!plain?{hour:'2-digit',minute:'2-digit'}:{})}).format(new Date(value));
};
export function createExplorer({send,showDiscovery,showAccount,showOpportunities,sessionExpired,navigate}) {
  const view=$('explore-view'), content=$('explore-content'), notice=$('explore-error');
  let epoch=0, saving=false, catalog=[], state=null, selected=[], onboarding=false;
  let filters={scope:'recommended',type:'all',mode:'all'};
  function button(label, callback, css='secondary-button') {
    const b=el('button',css,label); b.type='button'; b.addEventListener('click',callback); return b;
  }
  function heading(eyebrow,title,description) {
    content.replaceChildren(el('p','eyebrow',eyebrow));
    const h=el('h1','explore-title',title); h.tabIndex=-1;
    content.append(h,el('p','explore-description',description));
  }
  function focus() { content.querySelector('h1')?.focus({preventScroll:true}); }
  function fail(error,retry) {
    if(error.status===401) return sessionExpired();
    notice.replaceChildren(el('span','',error.message)); notice.hidden=false;
    if(retry) notice.append(button(error.status===409?'Recargar mis galaxias':'Volver a intentar',retry,'text-action'));
  }
  function updateSelection() {
    const exploring=selected.includes('explore');
    $('galaxy-count').textContent=exploring?'Todas las galaxias por explorar':`${selected.length} de 5 galaxias seleccionadas`;
    content.querySelectorAll('[data-galaxy]').forEach(b=>{
      const active=selected.includes(b.dataset.galaxy);
      b.setAttribute('aria-pressed',String(active));
      b.disabled=saving || (!active && !exploring && selected.length===5 && b.dataset.galaxy!=='explore');
    });
    $('save-galaxies').disabled=saving || selected.length===0;
  }
  function renderGalaxies() {
    selected=[...(state?.galaxies??[])];
    heading('ELIGE TUS GALAXIAS','¿Qué mundos te gustaría explorar?','No necesitas tener experiencia. Elige hasta cinco áreas que despierten tu curiosidad. Puedes cambiarlas cuando quieras.');
    const banner=el('div','galaxy-banner');
    banner.append(el('span','galaxy-orbit','✧'),el('p','','Tus habilidades muestran lo que podrías aportar hoy. Tus intereses muestran los caminos que te gustaría explorar mañana.'));
    content.append(banner);
    const grid=el('div','galaxy-grid'); grid.setAttribute('role','group'); grid.setAttribute('aria-label','Galaxias de interés');
    catalog.forEach(g=>{
      const b=button('',()=>{
        notice.hidden=true;
        if(selected.includes(g.id)) selected=selected.filter(id=>id!==g.id);
        else if(g.id==='explore') selected=['explore'];
        else if(selected.includes('explore') || selected.length<5) selected=[...selected.filter(id=>id!=='explore'),g.id];
        updateSelection();
      },'galaxy-card');
      b.dataset.galaxy=g.id;
      const icon=el('span','galaxy-icon',g.symbol); icon.setAttribute('aria-hidden','true');
      b.append(icon,el('strong','',g.name),el('span','galaxy-description',g.description),el('span','galaxy-check','✓')); grid.append(b);
    });
    const count=el('p','galaxy-count'); count.id='galaxy-count'; count.setAttribute('role','status'); count.setAttribute('aria-live','polite');
    content.append(grid,count);
    const actions=el('div','galaxy-actions');
    const save=button(onboarding?'Guardar y continuar al test ↗':'Guardar y ver oportunidades ↗',persist,'primary-button'); save.id='save-galaxies';
    actions.append(save);
    if(state && !onboarding) actions.append(button('Volver a mi perfil',showAccount));
    content.append(actions,el('p','explore-fine','No hay respuestas correctas. Elegir «Quiero explorar» abre todas las áreas y reemplaza tu selección. Tus intereses son privados.'));
    updateSelection(); focus();
  }
  async function persist() {
    if(saving || !selected.length) return;
    const active=epoch; saving=true; notice.hidden=true;
    content.setAttribute('aria-busy','true'); updateSelection();
    $('save-galaxies').textContent='Guardando tus galaxias…';
    try {
      const data=await send('/web/interests',{method:'PUT',body:{revision:state?.revision??0,galaxies:selected},refresh:true});
      if(active!==epoch) return;
      state=data.interests; saving=false;
      if(onboarding) await showDiscovery(); else await showOpportunities();
    } catch(error) { if(active===epoch) fail(error, error.status===409?()=>openGalaxies({onboarding}):null); }
    finally {
      if(active===epoch) {
        saving=false; content.setAttribute('aria-busy','false'); updateSelection();
        $('save-galaxies').textContent=onboarding?'Guardar y continuar al test ↗':'Guardar y ver oportunidades ↗';
      }
    }
  }
  function show(path) {
    epoch++; saving=false; view.hidden=false; notice.hidden=true;
    ['story','auth-card','account-view','discovery-view'].forEach(id=>{$(id).hidden=true;});
    $('main').classList.remove('account-layout','discovery-layout'); $('main').classList.add('explore-layout');
    navigate(path); window.scrollTo({top:0}); return epoch;
  }
  async function openGalaxies(options={}) {
    onboarding=options.onboarding??false;
    const active=show('/galaxias'); document.title='Tus galaxias · Constela';
    heading('TU UNIVERSO CONSTELA','Vamos a descubrir tus intereses.','Estamos recuperando tus galaxias…');
    content.setAttribute('aria-busy','true');
    try {
      const data=await send('/web/interests',{refresh:true}); if(active!==epoch) return;
      catalog=data.catalog; state=data.interests; renderGalaxies();
    } catch(error) { if(active===epoch) fail(error,()=>openGalaxies(options)); }
    finally { if(active===epoch) content.setAttribute('aria-busy','false'); }
  }
  function filter(label,key,choices) {
    const wrapper=el('label','opportunity-filter',label);
    const select=el('select'); select.name=key;
    choices.forEach(([value,name])=>{const option=el('option','',name);option.value=value;select.append(option);});
    select.value=filters[key]; select.addEventListener('change',()=>{filters[key]=select.value;loadOpportunities();});
    wrapper.append(select);return wrapper;
  }
  async function loadOpportunities() {
    const active=++epoch; notice.hidden=true; $('opportunity-results').setAttribute('aria-busy','true');
    content.querySelectorAll('select').forEach(s=>{s.disabled=true;});
    try {
      const data=await send('/web/opportunities?'+new URLSearchParams(filters),{refresh:true});
      if(active!==epoch)return;
      renderOpportunities(data);
    } catch(error) { if(active===epoch) fail(error,loadOpportunities); }
    finally {
      if(active===epoch) {
        $('opportunity-results')?.setAttribute('aria-busy','false');
        content.querySelectorAll('select').forEach(s=>{s.disabled=false;});
      }
    }
  }
  function renderOpportunities(data) {
    const results=$('opportunity-results'); results.replaceChildren();
    const names=data.interests?.galaxies.map(id=>catalog.find(g=>g.id===id)?.name??id)??[];
    $('opportunity-interests').textContent=names.length?`Tus galaxias: ${names.join(' · ')}`:'Elige tus galaxias para descubrir recomendaciones.';
    const status=$('opportunity-sources');status.replaceChildren(el('summary','','Fuentes y actualización'));
    status.append(el('p','',data.coverage));
    data.sources.forEach(source=>{
      const p=el('p');const link=el('a','',source.name);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
      p.append(link,document.createTextNode(` · Última consulta correcta: ${date(source.succeeded_at)}${source.status==='ok'?'':source.status==='blocked'?' · Recolección detenida por la fuente.':' · No se pudo actualizar; usamos la última copia disponible.'}`)); status.append(p);
    });
    if(!data.sources.length) status.append(el('p','','Todavía no hay una sincronización disponible.'));
    const count=el('p','opportunity-count',`${data.items.length} ${data.items.length===1?'oportunidad disponible':'oportunidades disponibles'}`);count.setAttribute('role','status');results.append(count);
    if(!data.items.length) {
      const empty=el('div','opportunity-empty');
      empty.append(el('span','empty-star','✧'),el('h2','','Todavía hay mundos por descubrir.'),el('p','',filters.scope==='recommended'?'No encontramos convocatorias vigentes que coincidan con tus galaxias y filtros. Puedes ver todo el catálogo o cambiar los filtros.':'No hay convocatorias vigentes con estos filtros. Prueba otra modalidad o tipo de oportunidad.'));
      if(filters.scope!=='all')empty.append(button('Explorar todo el catálogo',()=>{filters.scope='all';content.querySelector('select[name=scope]').value='all';loadOpportunities();}));
      results.append(empty);return;
    }
    const grid=el('div','opportunity-grid');
    const modes={online:'En línea',in_person:'Presencial',hybrid:'Híbrida',unknown:'Modalidad por confirmar'};
    const types={hackathon:'Hackathon',event:'Evento',challenge:'Reto'};
    data.items.forEach(o=>{
      const card=el('article','opportunity-card');
      const meta=el('div','opportunity-meta');meta.append(el('span','',types[o.type]),el('span','',modes[o.mode]));
      card.append(meta,el('h2','',o.title),el('p','opportunity-location',o.location),el('p','opportunity-date',`${date(o.starts_at)} — ${date(o.ends_at)}${o.ends_at.length>10?' · hora de Lima':''}`));
      const labels=el('div','opportunity-tags');o.galaxies.forEach(id=>labels.append(el('span','',catalog.find(g=>g.id===id)?.name??id)));card.append(labels);
      card.append(el('p','opportunity-reason',o.reason));
      if(o.practice)card.append(el('p','explore-fine',o.practice));
      const source=data.sources.find(s=>s.id===o.source_id);
      card.append(el('p','opportunity-source',`${source?.name??'Fuente pública'} · Consultado ${date(o.checked_at)}${o.stale?' · Copia sin actualización reciente':''}`));
      card.append(el('p','explore-fine',o.deadline?`Cierre de inscripción: ${date(o.deadline)}`:'Cierre de inscripción por verificar en la convocatoria.'));
      const link=el('a','opportunity-link','Ver convocatoria original ↗'); link.href=o.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`Ver convocatoria original: ${o.title} (abre otra pestaña)`);card.append(link);grid.append(card);
    });results.append(grid);
  }
  async function openOpportunities() {
    const active=show('/oportunidades'); document.title='Explora tu universo · Constela';
    heading('EXPLORA TU UNIVERSO','Tu curiosidad tiene nuevos caminos.','Encuentra hackathones y eventos para explorar. Una coincidencia temática no confirma que cumplas los requisitos: revísalos siempre en la convocatoria original.');
    try {
      const data=await send('/web/interests',{refresh:true});if(active!==epoch)return;
      catalog=data.catalog;
      if(!data.interests) return openGalaxies({onboarding:true});
      const interestLine=el('p','opportunity-interests');interestLine.id='opportunity-interests';
      content.append(interestLine,button('Editar mis galaxias',()=>openGalaxies(),'text-action'));
      const controls=el('div','opportunity-filters');
      controls.append(filter('Mostrar','scope',[['recommended','Para mis galaxias'],['all','Todo el catálogo']]),filter('Tipo','type',[['all','Todos los tipos'],['hackathon','Hackathones'],['event','Eventos'],['challenge','Retos']]),filter('Modalidad','mode',[['all','Todas las modalidades'],['online','En línea'],['in_person','Presencial'],['hybrid','Híbrida']]));
      const sources=el('details','opportunity-sources');sources.id='opportunity-sources';
      const results=el('div');results.id='opportunity-results';
      content.append(controls,sources,results); focus(); await loadOpportunities();
    } catch(error) { if(active===epoch)fail(error,openOpportunities); }
  }
  function close(){epoch++;saving=false;view.hidden=true;$('main').classList.remove('explore-layout');}
  function reset(){close();selected=[];state=null;catalog=[];filters={scope:'recommended',type:'all',mode:'all'};content.replaceChildren();notice.replaceChildren();}
  return {openGalaxies,openOpportunities,close,reset,isSaving:()=>saving};
}
