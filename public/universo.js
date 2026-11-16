import { pointsPerLevel, pointsPerStar } from './progreso.js';

const el = (tag, cls='', text='') => {
  const node = document.createElement(tag); node.className=cls; node.textContent=text; return node;
};
function action(label, run, cls='secondary-button') {
  const button = el('button',cls,label); button.type='button'; button.addEventListener('click',run); return button;
}
function svg(tag, attrs={}) {
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value)); return node;
}
const coords=[[32,45],[110,23],[210,35],[267,78],[215,126],[75,123]];
const orbit=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,4]];
const list=new Intl.ListFormat('es-PE',{style:'long',type:'conjunction'});
export function createUniverse({send,navigate,sessionExpired}) {
  const view=document.getElementById('universe-view');
  let epoch=0;
  function summaryMap(skills, discovery) {
    const panel=el('section','space-panel sky-map');
    const title=el('h2','','Tu constelación de habilidades');
    const explanation=el('p','journey-muted','Selecciona una estrella para saber qué representa.');
    explanation.setAttribute('role','status');
    const graph=svg('svg',{viewBox:'0 0 300 160',role:'group','aria-label':'Mapa interactivo de seis habilidades'});
    const found=skills.map(skill=>(discovery?.result?.scores?.[skill.id]??0)>0);
    const unseen=new Set(discovery?.result?.unseen??[]);
    orbit.forEach(([i,j])=>graph.append(svg('line',{x1:coords[i][0],y1:coords[i][1],x2:coords[j][0],y2:coords[j][1],class:found[i]&&found[j]?'sky-path sky-path-lit':'sky-path'})));
    skills.forEach((skill,i)=>{
      const [x,y]=coords[i];
      const node=svg('g',{class:`sky-node${found[i]?' is-lit':''}${unseen.has(skill.id)?' is-unseen':''}`,tabindex:'0',role:'button','aria-label':`${skill.name}: ${found[i]?'descubierta':'por explorar'}`});
      node.append(svg('circle',{cx:x,cy:y,r:14,class:'sky-ring'}),svg('circle',{cx:x,cy:y,r:found[i]?5:3,class:'map-dot'}));
      const label=svg('text',{x,y:y+22,'text-anchor':'middle'});label.textContent=skill.name;node.append(label);
      const select=()=>{explanation.textContent=found[i]?`${unseen.has(skill.id)?'La estrella que no veías · ':''}${skill.name}. ${skill.description}`:`${skill.name} · Una posibilidad por explorar. El test no mide todo lo que puedes hacer.`;};
      node.addEventListener('click',select);node.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();select();}});
      graph.append(node);
    });
    panel.append(title,graph,explanation); return panel;
  }
  function nextStep(data) {
    if(!data.interests)return {label:'Elige tus galaxias',description:'Empieza por las áreas que te dan curiosidad.',path:'/galaxias',options:{onboarding:true}};
    if(!data.discovery?.completed)return {label:'Descubre tus estrellas',description:'Retoma las seis misiones desde tu último avance.',path:'/descubrir'};
    if(data.suggestion && !data.progress.stars){
      const {id,title,matches,skills}=data.suggestion;
      const labels=matches.map(id=>data.galaxies.find(item=>item.id===id)?.name).filter(Boolean);
      const strengths=skills.map(id=>data.skills.find(item=>item.id===id)?.name).filter(Boolean);
      const reason=[labels.length?`Conecta con ${list.format(labels)}.`:'Un reto para explorar una nueva posibilidad.',strengths.length?`Puedes practicar ${list.format(strengths)}.`:''].filter(Boolean).join(' ');
      return {label:title,description:reason,path:`/retos?reto=${encodeURIComponent(id)}`};
    }
    return {label:'Abre una nueva órbita',description:'Explora oportunidades de Lima o continúa sumando estrellas en Retos.',path:'/explorar'};
  }
  function render(data, profile) {
    const current=epoch;
    const {progress,discovery,interests}=data;
    const panel=el('header','journey-heading');
    const identity=el('div','journey-identity');
    const avatar=el('span','journey-avatar','✦');avatar.setAttribute('aria-hidden','true');
    const copy=el('div');copy.append(el('p','eyebrow','MI UNIVERSO · BITÁCORA PERSONAL'));
    const name=profile.display_name.trim().split(/\s+/)[0];
    const heading=el('h1','explore-title',`Tu universo, ${name}.`);heading.id='universe-title';heading.tabIndex=-1;
    copy.append(heading,el('p','journey-muted','Cada práctica conecta una nueva luz en tu recorrido.'));
    identity.append(avatar,copy);panel.append(identity);view.replaceChildren(panel);

    const grid=el('div','journey-grid');
    const next=nextStep(data),nextCard=el('section','space-panel next-orbit');
    nextCard.append(el('p','eyebrow','TU SIGUIENTE PASO'),el('h2','',next.label),el('p','journey-muted',next.description),
      action('Continuar mi viaje ↗',()=>navigate(next.path,next.options),'primary-button'));
    const level=el('section','space-panel light-level');
    const stats=el('div','light-stats');
    for(const [value,label] of [[progress.level,'Nivel'],[progress.points,'Puntos'],[progress.stars,'Estrellas de práctica']]){
      const group=el('div');group.append(el('strong','',String(value)),el('span','',label));stats.append(group);
    }
    const bar=el('progress','light-bar');bar.max=pointsPerLevel;bar.value=progress.inLevel;bar.setAttribute('aria-label',`Progreso hacia el nivel ${progress.level+1}`);
    level.append(el('p','eyebrow','TU PROGRESO'),stats,bar,el('p','journey-muted',`${progress.pointsToNext} puntos para llegar al nivel ${progress.level+1}. Cada práctica aporta 1 estrella y ${pointsPerStar} puntos.`));
    grid.append(nextCard,level);view.append(grid);

    const steps=el('ol','journey-path'); const count=Object.keys(discovery?.answers??{}).length;
    [ ['Elige tus galaxias',interests?'Guardadas':'Por explorar','/galaxias'], ['Descubre tus estrellas',`${count}/${data.missionCount} misiones`,'/descubrir'], ['Practica con retos',`${progress.stars} ${progress.stars===1?'estrella':'estrellas'}`,'/retos'], ['Explora oportunidades','Lima y simulaciones','/explorar'] ].forEach(([label,status,path],i)=>{
      const item=el('li');const control=action('',()=>navigate(path),'journey-step');
      control.append(el('span','journey-number',`0${i+1}`),el('strong','',label),el('small','',status));item.append(control);steps.append(item);
    });view.append(steps);

    const details=el('div','journey-grid journey-details');
    const sky=summaryMap(data.skills,discovery);
    const galaxies=el('section','space-panel');
    const interestNames=(interests?.galaxies??[]).map(id=>data.galaxies.find(g=>g.id===id)?.name).filter(Boolean);
    const tags=el('ul','journey-tags');interestNames.forEach(label=>tags.append(el('li','',label)));
    galaxies.append(el('h2','','Tus galaxias de interés'),interestNames.length?tags:el('p','journey-muted','¿Qué temas te gustaría explorar?'),action(interestNames.length?'Editar mis galaxias':'Elegir galaxias',()=>navigate('/galaxias',{onboarding:!interests})));
    const stars=el('section','space-panel practice-library');
    stars.append(el('h2','','Estrellas de práctica'),el('p','journey-muted',data.practices.length?'Estas prácticas son privadas. La estrella reconoce tu práctica; todavía no es una evaluación.':'Completa un reto para encender tu primera estrella.'));
    const ordered=[...data.practices].sort((a,b)=>Date.parse(b.completed_at)-Date.parse(a.completed_at));
    for(const practice of ordered){
      const format=new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeZone:'America/Lima'});
      const entry=el('details','practice-entry');
      const summary=el('summary','',`✦ ${practice.title??'Práctica registrada'} · ${format.format(new Date(practice.completed_at))}`);
      const body=el('div','practice-copy');entry.append(summary,body);
      let loading=false, loaded=false;
      entry.addEventListener('toggle',async()=>{
        if(!entry.open||loading||loaded)return;
        loading=true;body.textContent='Cargando tu práctica…';
        try{
          const {practice: saved}=await send(`/web/community/${practice.post_id}/practice`,{refresh:true});
          if(current!==epoch)return;
          body.replaceChildren(el('h3','','Tu propuesta'),el('p','',saved.proposal),el('h3','','Tu reflexión'),el('p','',saved.reflection));loaded=true;
        }catch(error){
          if(current!==epoch)return;
          if(error.status===401)sessionExpired();else body.textContent=`${error.message} Cierra y vuelve a abrir para reintentar.`;
        }finally{loading=false;}
      });stars.append(entry);
    }
    details.append(sky,galaxies,stars);view.append(details);heading.focus({preventScroll:true});
  }
  async function open(profile) {
    const active=++epoch;
    document.title='Mi universo · Constela';view.hidden=false;
    const heading=el('h1','explore-title','Mi universo');heading.id='universe-title';
    view.replaceChildren(heading,el('p','journey-muted','Estamos conectando tus estrellas…'));view.setAttribute('aria-busy','true');
    try{
      const data=await send('/web/universe',{refresh:true});
      if(active!==epoch)return;
      render(data,profile);
    }catch(error){
      if(active!==epoch)return;
      if(error.status===401)return sessionExpired();
      const notice=el('p','notice error-notice',error.message);notice.setAttribute('role','alert');
      view.replaceChildren(heading,notice,action('Volver a intentar',()=>open(profile)));
    }finally{if(active===epoch)view.setAttribute('aria-busy','false');}
  }
  function close(){epoch++;view.hidden=true;view.replaceChildren();}
  return {open,close};
}
