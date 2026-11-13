const $=id=>document.getElementById(id);
const el=(tag,cls='',text='')=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;};
const button=(label,action,cls='primary-button')=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',action);return b;};
const modes={online:'En línea · Lima, Perú',in_person:'Presencial · Lima, Perú',hybrid:'Híbrida · Lima, Perú'};
const levels={beginner:'Para empezar',intermediate:'Con algo de experiencia',all:'Todos los niveles'};
const date=value=>new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeZone:'America/Lima'}).format(new Date(value));
export function createCommunity({send,navigate,sessionExpired}){
  const view=$('community-view'),content=$('community-content'),notice=$('community-error');
  let epoch=0,saving=false,profile=null,route='/retos',catalog=[],skills=[],filters={scope:'all',galaxy:'all',kind:'challenge'},data=null;
  const publishing=()=>['company','entrepreneur'].includes(profile?.account_type);
  function error(problem){if(problem.status===401)return sessionExpired();notice.textContent=problem.message;notice.hidden=false;}
  function select(label,name,options,value){const wrapper=el('label','',label),input=el('select');input.name=name;input.setAttribute('aria-label',label);for(const [id,text]of options){const option=el('option','',text);option.value=id;input.append(option);}input.value=value;wrapper.append(input);return wrapper;}
  async function load(){
    const active=epoch;notice.hidden=true;const results=$('community-results');results.setAttribute('aria-busy','true');
    content.querySelectorAll('.community-toolbar select').forEach(s=>s.disabled=true);
    try{
      const result=await send(`/web/community?${new URLSearchParams({kind:route==='/publicar'?filters.kind:route==='/empleos'?'job':'challenge',scope:route==='/publicar'?'mine':filters.scope,galaxy:filters.galaxy})}`,{refresh:true});
      if(active!==epoch)return;data=result;catalog=result.catalog;skills=result.skills;renderPosts();renderStars();
    }catch(problem){if(active===epoch){data=null;error(problem);results.replaceChildren(button('Volver a cargar',()=>open(route,{profile}),'community-link'));}}
    finally{if(active===epoch){results.setAttribute('aria-busy','false');content.querySelectorAll('.community-toolbar select').forEach(s=>s.disabled=false);}}
  }
  function renderPosts(){
    const results=$('community-results');results.replaceChildren();
    const posts=data.posts;
    const count=el('p','community-status',`${posts.length} ${posts.length===1?'publicación':'publicaciones'} · Simulaciones para la demo`);count.setAttribute('role','status');results.append(count);
    if(!posts.length){const empty=el('div','community-empty');empty.append(el('h2','','Aquí empieza una nueva posibilidad.'),el('p','',route==='/publicar'?'No hay publicaciones con estos filtros. Puedes crear una con el formulario de arriba.':filters.scope==='saved'?'Aún no guardaste retos activos. Explora el catálogo y elige uno para practicar.':'No hay simulaciones con estos filtros. Puedes explorar otras galaxias o ver todo el catálogo.'));if(route!=='/publicar')empty.append(button('Ver todas las simulaciones',()=>{filters={scope:'all',galaxy:'all',kind:'challenge'};open(route,{profile});},'community-link'));results.append(empty);return;}
    const grid=el('div','opportunity-grid');
    for(const post of posts){
      const card=el('article','opportunity-card community-card');const meta=el('div','opportunity-meta');meta.append(el('span','',post.kind==='challenge'?'Reto de práctica':'Oportunidad laboral'),el('span','','Simulación'));
      card.append(meta,el('p','community-organization',post.organization_name),el('h2','',post.title),el('p','',post.description),el('p','community-status',`${modes[post.mode]} · ${levels[post.level]}`));
      const tags=el('div','community-tags');post.galaxies.forEach(id=>tags.append(el('span','',catalog.find(g=>g.id===id)?.name??id)));card.append(tags);
      if(post.matches?.length)card.append(el('p','opportunity-reason',`Conecta con ${post.matches.map(id=>catalog.find(g=>g.id===id)?.name).join(' y ')}.`));
      const detail=el('details','community-detail');detail.append(el('summary','',post.kind==='challenge'?'Explorar este reto':'Ver condiciones ilustrativas'));
      detail.append(el('h3','',post.kind==='challenge'?'Tu misión / entregable':'Requisitos del ejemplo'),el('p','',post.deliverable),el('h3','','Dedicación'),el('p','',post.effort),el('h3','','Remuneración'),el('p','',post.compensation));
      if(post.skills.length)detail.append(el('h3','','Habilidades que podrías practicar'),el('p','',post.skills.map(id=>skills.find(s=>s.id===id)?.name??id).join(' · ')));
      detail.append(el('h3','','Cierre de la simulación'),el('p','',date(post.deadline)),el('p','community-status',post.kind==='challenge'?'Practica a tu ritmo. Registrar tu propuesta enciende una estrella de práctica; la evaluación por una empresa llegará después.':'Esta vacante es ficticia: no recibe postulaciones, CV ni mensajes a empresas.'));
      if(post.kind==='challenge'&&!publishing()){
        const practiced=data.practices.find(p=>p.post_id===post.id);
        if(practiced){
          card.append(el('p','practice-earned',`✦ Estrella encendida · Práctica registrada el ${date(practiced.completed_at)}`));
          const read=button('Ver mi práctica privada',async()=>{
            const active=epoch;read.disabled=true;
            try{const result=await send(`/web/community/${post.id}/practice`,{refresh:true});if(active!==epoch)return;detail.append(el('h3','','Tu propuesta privada'),el('p','',result.practice.proposal),el('h3','','Lo que aprendiste'),el('p','',result.practice.reflection));read.remove();}
            catch(problem){if(active===epoch){error(problem);read.disabled=false;}}
          },'community-link');detail.append(read);
        }
        else detail.append(practiceForm(post));
      }
      card.append(detail);
      if(route==='/publicar'){
        const closed=post.status==='closed'||Date.parse(post.deadline)<=Date.now();
        card.append(el('p','community-status',closed?'Cerrada o vencida':'Publicada en la demo'));
        if(!closed)card.append(button('Cerrar publicación',async event=>{const b=event.currentTarget;if(saving)return;saving=true;b.disabled=true;const active=epoch;try{await send(`/web/community/${post.id}/close`,{method:'PATCH',body:{},refresh:true});if(active===epoch)await load();}catch(problem){if(active===epoch)error(problem);}finally{if(active===epoch){saving=false;b.disabled=false;}}},'community-link'));
      }else if(post.kind==='challenge'&&!publishing()){
        card.append(button(post.saved?'✓ Guardado · Quitar de mis retos':'Guardar para practicar',async event=>{
          if(saving)return;const b=event.currentTarget,active=epoch;saving=true;b.disabled=true;notice.hidden=true;
          try{await send(`/web/community/${post.id}/save`,{method:post.saved?'DELETE':'PUT',body:{},refresh:true});if(active!==epoch)return;post.saved=!post.saved;b.textContent=post.saved?'✓ Guardado · Quitar de mis retos':'Guardar para practicar';if(filters.scope==='saved')renderPostsAfterRemoval(post);}
          catch(problem){if(active===epoch)error(problem);}finally{if(active===epoch){saving=false;b.disabled=false;}}
        }));
      }else if(post.kind==='job')card.append(el('p','community-status','Demo · Sin postulaciones reales'));
      grid.append(card);
    }results.append(grid);
  }
  function renderStars(){
    const panel=$('practice-stars');if(!panel||!data)return;panel.replaceChildren();
    const total=data.practices.length,copy=el('div');copy.append(el('p','eyebrow','TU CONSTELACIÓN DE PRÁCTICA'),el('h2','',total?`${total} ${total===1?'estrella encendida':'estrellas encendidas'}`:'Tu primera estrella te espera.'));
    const next=total<3?`${3-total} ${3-total===1?'práctica':'prácticas'} para conectar tu primera constelación.`:total<6?`${6-total} ${6-total===1?'práctica':'prácticas'} para completar tu primera órbita.`:'Primera órbita conectada. Sigue explorando nuevos retos.';
    copy.append(el('p','',next),el('p','practice-explanation','1 reto practicado = 1 estrella. Guardar un reto no da estrellas. Son autorregistros de práctica, pendientes de evaluación.'));
    const practiced=[...new Set(data.practices.flatMap(p=>p.practiced_skills))];
    if(practiced.length)copy.append(el('p','practice-explanation',`Has ejercitado: ${practiced.map(id=>skills.find(s=>s.id===id)?.name??id).join(' · ')}.`));
    const orbit=el('div','practice-orbit');orbit.setAttribute('aria-label',`${total} ${total===1?'estrella':'estrellas'} de práctica. ${next}`);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 360 190');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M35 120L95 40L175 95L260 30L325 115L235 155L175 95');path.setAttribute('fill','none');path.setAttribute('stroke','#74598f');path.setAttribute('stroke-dasharray','4 5');svg.append(path);
    [[35,120],[95,40],[175,95],[260,30],[325,115],[235,155]].forEach(([x,y],i)=>{const star=document.createElementNS(svg.namespaceURI,'text');star.setAttribute('x',x);star.setAttribute('y',y);star.setAttribute('text-anchor','middle');star.setAttribute('dominant-baseline','middle');star.setAttribute('fill',i<total?'#f9d89b':'#7b6399');star.setAttribute('font-size',i<total?'32':'23');star.textContent=i<total?'✦':'✧';svg.append(star);});
    const caption=el('p','',total>=6?'✦ Primera órbita conectada':`${Math.min(total,6)} / 6 · Primera órbita`);orbit.append(svg,caption);panel.append(copy,orbit);
  }
  function practiceForm(post){
    const form=el('form','practice-form');form.append(el('h3','','Practica y enciende una estrella'),el('p','community-status','Escribe una propuesta que responda al entregable y cuenta qué pusiste en práctica. Solo tú podrás leer estos textos; la empresa no los recibe.'));
    function textarea(label,name,min,max){const wrap=el('label','',label),input=el('textarea');input.name=name;input.minLength=min;input.maxLength=max;input.required=true;input.rows=name==='proposal'?5:3;wrap.append(input);form.append(wrap);}
    textarea('Tu propuesta para este reto','proposal',30,5000);textarea('¿Qué habilidad pusiste en práctica y qué aprendiste?','reflection',15,1000);
    const submit=el('button','primary-button','Registrar práctica · encender ✦');submit.type='submit';form.append(submit);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(saving||!form.reportValidity())return;const active=epoch;saving=true;submit.disabled=true;submit.textContent='Conectando tu estrella…';notice.hidden=true;
      try{
        const result=await send(`/web/community/${post.id}/practice`,{method:'POST',body:Object.fromEntries(new FormData(form)),refresh:true});if(active!==epoch)return;
        if(!data.practices.some(p=>p.post_id===post.id))data.practices.push(result.practice);
        renderPosts();renderStars();const celebration=$('practice-celebration');celebration.hidden=false;celebration.textContent=result.practice.awarded?'✦ ¡Encendiste una nueva estrella! Tu propuesta y reflexión están guardadas.':'✦ Esta estrella ya estaba en tu constelación. Conservamos tu primera práctica.';celebration.tabIndex=-1;celebration.focus();
      }catch(problem){if(active===epoch)error(problem);}finally{if(active===epoch){saving=false;submit.disabled=false;submit.textContent='Registrar práctica · encender ✦';}}
    });return form;
  }
  function renderPostsAfterRemoval(post){if(!post.saved){data.posts=data.posts.filter(p=>p.id!==post.id);renderPosts();}}
  function publicationForm(){
    const panel=el('section','publication-panel');panel.append(el('h2','','Una propuesta puede abrir un camino.'),el('p','community-status',`Publicarás como ${profile.organization_name}. Describe un caso ficticio y evita datos personales. Todo lo publicado aquí se identifica como simulación.`));
    const form=el('form','publication-form');
    form.append(select('Qué quieres compartir','kind',[['challenge','Reto de práctica'],['job','Oportunidad laboral']], 'challenge'));
    function field(label,name,{tag='input',min=2,max=100,type='text',wide=false}={}){const wrap=el('label',wide?'wide':'',label),input=el(tag);input.name=name;input.required=true;if(tag==='input')input.type=type;if(['text','textarea'].includes(type)){input.minLength=min;input.maxLength=max;}wrap.append(input);form.append(wrap);return input;}
    field('Título','title',{min:6,max:120});
    field('El problema o la oportunidad','description',{tag:'textarea',min:30,max:2500,wide:true});
    field('Entregable del reto / requisitos del puesto','deliverable',{tag:'textarea',min:10,max:1000,wide:true});
    field('Dedicación estimada','effort',{max:100});
    field('Remuneración o condición de práctica','compensation',{max:200});
    form.append(select('Nivel de experiencia','level',Object.entries(levels),'beginner'),select('Modalidad · sede en Lima, Perú','mode',Object.entries(modes),'online'));
    const closing=field('Fecha de cierre (hora de Lima)','deadline',{type:'date'});closing.min=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima'}).format(new Date());
    function checks(legend,name,items){const group=el('fieldset','wide'),choices=el('div','publication-checks');group.append(el('legend','',legend));for(const item of items){const label=el('label'),input=el('input');input.type='checkbox';input.name=name;input.value=item.id;label.append(input,document.createTextNode(item.name));choices.append(label);}group.append(choices);form.append(group);}
    checks('Galaxias · elige de 1 a 3','galaxies',catalog);checks('Habilidades a practicar · opcional','skills',skills);
    const status=el('p','community-status wide');status.setAttribute('role','status');form.append(status);
    const submit=el('button','primary-button','Publicar simulación');submit.type='submit';form.append(submit);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(saving||!form.reportValidity())return;const values=new FormData(form),body=Object.fromEntries(values);body.galaxies=values.getAll('galaxies');body.skills=values.getAll('skills');
      if(!body.galaxies.length||body.galaxies.length>3){status.textContent='Elige de una a tres galaxias.';return;}
      body.deadline=new Date(`${body.deadline}T23:59:59-05:00`).toISOString();const active=epoch;saving=true;submit.disabled=true;submit.textContent='Publicando…';notice.hidden=true;
      try{await send('/web/community',{method:'POST',body,refresh:true});if(active!==epoch)return;form.reset();filters.kind=body.kind;filters.galaxy='all';content.querySelector('.community-toolbar select[name=kind]').value=body.kind;content.querySelector('.community-toolbar select[name=galaxy]').value='all';status.textContent='Listo. Tu simulación está publicada y guardada.';await load();}
      catch(problem){if(active===epoch)error(problem);}finally{if(active===epoch){saving=false;submit.disabled=false;submit.textContent='Publicar simulación';}}
    });panel.append(form);return panel;
  }
  async function open(path,{profile:nextProfile}){
    close();data=null;profile=nextProfile;route=path;const active=++epoch;
    $('account-view').hidden=true;$('main').classList.add('explore-layout');view.hidden=false;content.replaceChildren();notice.hidden=true;navigate(path);
    const heading=el('h1','explore-title',path==='/publicar'?'Conecta tu proyecto con nuevas estrellas.':path==='/empleos'?'Imagina tu siguiente oportunidad.':'Pequeños retos. Nuevas posibilidades.');heading.tabIndex=-1;
    content.append(el('p','eyebrow',path==='/publicar'?'ESPACIO EMPRESAS Y EMPRENDEDORAS':path==='/empleos'?'OPORTUNIDADES LABORALES · DEMO':'PON TUS ESTRELLAS EN MOVIMIENTO'),heading,
      el('p','explore-description',path==='/retos'?'Explora situaciones de empresas y emprendedoras ficticias de Lima. Elige lo que te da curiosidad: no necesitas una puntuación ni experiencia previa.':path==='/publicar'?'Comparte retos de práctica y ejemplos de oportunidades laborales con la comunidad.':'Así se verían las oportunidades compartidas por empresas y emprendedoras de Lima.'));
    content.append(el('p','demo-banner','Simulación · Los casos precargados usan organizaciones ficticias. Todas las publicaciones de esta demo son simulaciones, sin ofertas de trabajo reales ni encargos comerciales.'));
    if(path==='/retos'&&!publishing()){
      const stars=el('section','practice-stars');stars.id='practice-stars';stars.setAttribute('aria-label','Tu constelación de práctica');
      const celebration=el('p','practice-celebration');celebration.id='practice-celebration';celebration.setAttribute('role','status');celebration.hidden=true;content.append(stars,celebration);
    }
    document.title=`${path==='/publicar'?'Mis publicaciones':path==='/empleos'?'Empleos':'Retos'} · Constela`;
    if(path==='/publicar'&&!publishing()){content.append(el('p','community-empty','Esta sección es para cuentas de empresa o emprendedora. Desde tu cuenta de usuaria puedes explorar y guardar retos.'));heading.focus();return;}
    const toolbar=el('div','community-toolbar');
    if(path==='/publicar')toolbar.append(select('Mis publicaciones','kind',[['challenge','Retos'],['job','Oportunidades laborales']],filters.kind));
    if(path!=='/publicar'){
      const scopeOptions=publishing()?[['all','Todas las simulaciones']]:[['all','Todas las simulaciones'],['recommended','Para mis galaxias'],...(path==='/retos'?[['saved','Mis retos guardados']]:[])];
      if(path==='/empleos'&&filters.scope==='saved')filters.scope='all';
      toolbar.append(select('Mostrar','scope',scopeOptions,filters.scope));
    }
    const results=el('div');results.id='community-results';content.append(toolbar,results);heading.focus();
    await load();if(active!==epoch)return;
    // Catálogos vienen de la API; no se interpolan en HTML.
    const galaxy=select('Galaxia de interés','galaxy',[['all','Todas las galaxias'],...catalog.map(g=>[g.id,g.name])],filters.galaxy);toolbar.append(galaxy);
    toolbar.querySelectorAll('select').forEach(input=>input.addEventListener('change',()=>{filters[input.name]=input.value;load();}));
    if(path==='/publicar'&&data)content.insertBefore(publicationForm(),toolbar);
  }
  function close(){epoch++;saving=false;view.hidden=true;content.replaceChildren();notice.hidden=true;}
  function reset(){close();profile=null;data=null;catalog=[];skills=[];filters={scope:'all',galaxy:'all',kind:'challenge'};}
  return{open,close,reset,isSaving:()=>saving};
}
