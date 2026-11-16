const el=(tag,cls='',text='')=>{
  const node=document.createElement(tag);
  node.className=cls;node.textContent=text;
  return node;
};
const labels={event:'Evento',hackathon:'Hackathon',challenge:'Reto externo'};
const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima'});
const prettyDate=new Intl.DateTimeFormat('es-PE',{dateStyle:'long',timeZone:'UTC'});
const formatDate=value=>prettyDate.format(new Date(value+'T12:00:00Z'));
function button(label,click,cls='secondary-button'){
  const node=el('button',cls,label);node.type='button';node.addEventListener('click',click);return node;
}

export function createPortfolio({send,navigate,sessionExpired}) {
  const view=document.getElementById('portfolio-view');
  let epoch=0,saving=false;
  function field(form,label,name,tag,attributes={}){
    const wrapper=el('label','portfolio-field');
    wrapper.append(el('span','',label));
    const input=el(tag);
    input.name=name;
    for (const [key,value] of Object.entries(attributes))input.setAttribute(key,value);
    wrapper.append(input);form.append(wrapper);return input;
  }
  function renderForm({event=null,existing=null,host,onSave}) {
    const active=epoch, form=el('form','portfolio-form');
    const id=existing?.id??event?.event_id??crypto.randomUUID();
    const heading=el('h3','',existing?'Editar participación':event?event.title:'Registrar un evento anterior');
    heading.tabIndex=-1;
    form.append(heading);
    if(!event && !existing){
      field(form,'Nombre del evento','title','input',{required:'',maxlength:'200'});
      const type=field(form,'Tipo de actividad','kind','select');
      Object.entries(labels).forEach(([value,label])=>{const option=el('option','',label);option.value=value;type.append(option);});
      field(form,'Enlace público (opcional)','source_url','input',{type:'url',maxlength:'1000',placeholder:'https://'});
    }
    const date=field(form,'Fecha en que participaste','attended_on','input',{type:'date',required:'',max:day.format(new Date())});
    date.value=existing?.date??day.format(new Date());
    const reflection=field(form,'¿Qué aprendiste?','learning','textarea',{
      required:'',minlength:'10',maxlength:'2000',rows:'4',placeholder:'Cuenta qué descubriste, qué hiciste o qué aplicarías después.',
    });
    reflection.value=existing?.learning??'';
    const status=el('p','portfolio-feedback');status.setAttribute('role','status');
    const actions=el('div','portfolio-actions');
    const save=el('button','primary-button','Guardar participación');save.type='submit';
    actions.append(save,button('Cancelar',()=>{host.replaceChildren();onSave(false);}));
    form.append(status,actions);
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(saving)return;
      saving=true;save.disabled=true;status.textContent='Guardando…';
      try{
        await send('/web/portfolio/events/'+encodeURIComponent(id),{
          method:existing?'PATCH':'PUT',body:Object.fromEntries(new FormData(form)),refresh:true,
        });
        if(active===epoch){saving=false;onSave(true);}
      }catch(error){
        if(active!==epoch)return;
        if(error.status===401){sessionExpired();return;}
        status.textContent=error.message;status.classList.add('is-error');
      }finally{
        if(active===epoch){saving=false;save.disabled=false;}
      }
    });
    host.replaceChildren(form);heading.focus();
  }

  async function open(eventId = null, message = '') {
    const active=++epoch;
    document.title='Mi portafolio · Constela';view.hidden=false;
    const heading=el('h1','explore-title','Mi portafolio');
    heading.id='portfolio-title';heading.tabIndex=-1;
    const progress=el('p','portfolio-feedback','Cargando tus experiencias…');progress.setAttribute('role','status');
    view.replaceChildren(el('p','eyebrow','ESTACIÓN PORTAFOLIO'),heading,progress);
    heading.focus({preventScroll:true});
    try{
      const {entries,event,can_record_events}=await send('/web/portfolio'+(eventId?'?event='+encodeURIComponent(eventId):''),{refresh:true});
      if(active!==epoch)return;
      progress.textContent=can_record_events ? message : 'El registro de eventos se habilitará al actualizar la base de datos. Ya puedes consultar y descargar tus prácticas.';
      const intro=el('p','explore-description','Reúne tus prácticas y registra lo que aprendiste en eventos. Este historial solo está disponible en tu cuenta.');
      view.insertBefore(intro,progress);
      const controls=el('div','portfolio-actions');
      const host=el('div','portfolio-editor');
      const saved=()=>{
        if(location.search)history.replaceState(null,'','/portafolio');
        return open(null,'Participación guardada.');
      };
      const add=button('Registrar un evento',()=>renderForm({host,onSave:ok=>ok?saved():add.focus()}),'secondary-button');
      const download=button('Descargar PDF',async()=>{
        download.disabled=true;progress.textContent='Preparando el PDF…';
        try{
          const blob=await send('/web/portfolio.pdf',{format:'blob',refresh:true});
          if(active!==epoch)return;
          const href=URL.createObjectURL(blob),anchor=el('a');
          anchor.href=href;anchor.download='portafolio-constela.pdf';document.body.append(anchor);anchor.click();anchor.remove();
          setTimeout(()=>URL.revokeObjectURL(href),30000);
          progress.textContent='Descarga iniciada.';
        }catch(error){
          if(active!==epoch)return;
          if(error.status===401)return sessionExpired();
          progress.textContent=error.message;
        }finally{download.disabled=false;}
      },'primary-button');
      download.disabled=!entries.length;
      controls.append(download);
      if(can_record_events)controls.append(add);
      view.append(controls,host);
      const edit=entries.find(entry=>entry.type==='event'&&entry.id===eventId);
      if(can_record_events && (event || edit))renderForm({event,existing:edit,host,onSave:ok=>ok?saved():add.focus()});
      else if(can_record_events && eventId)progress.textContent='Esta ficha ya salió del catálogo. Puedes registrarla como evento anterior.';
      if(!entries.length){
        const empty=el('section','space-panel portfolio-empty');
        empty.append(el('h2','','Tu historial empieza aquí'),
          el('p','',can_record_events?'Completa un reto para que aparezca aquí o registra un evento en el que ya participaste.':'Completa un reto para que aparezca aquí.'),
          button('Explorar retos',()=>navigate('/retos')));
        view.append(empty);return;
      }
      const list=el('div','portfolio-list');
      for(const entry of entries){
        const item=el('article','space-panel portfolio-entry');
        const badge=entry.type==='practice'?'Reto de práctica simulado':labels[entry.kind]+' · Participación registrada';
        item.append(el('p','portfolio-kind',badge),el('h2','',entry.title),
          el('p','portfolio-meta',[formatDate(entry.date),entry.organization].filter(Boolean).join(' · ')));
        if(entry.skills?.length)item.append(el('p','portfolio-meta','Habilidades practicadas · '+entry.skills.join(' · ')));
        item.append(el('h3','','Qué aprendí'),el('p','portfolio-learning',entry.learning));
        if(entry.proposal){
          const detail=el('details');detail.append(el('summary','','Ver mi propuesta'),el('p','portfolio-learning',entry.proposal));item.append(detail);
        }
        if(entry.url){
          const source=el('a','portfolio-source','Página del evento ↗');source.href=entry.url;source.target='_blank';source.rel='noopener noreferrer';item.append(source);
        }
        if(entry.type==='event'){
          const editHost=el('div');
          const editButton=button('Editar participación',()=>renderForm({existing:entry,host:editHost,onSave:ok=>ok?saved():editButton.focus()}));
          item.append(editButton,editHost);
        }
        list.append(item);
      }
      view.append(list);
    }catch(error){
      if(active!==epoch)return;
      if(error.status===401)return sessionExpired();
      progress.textContent=error.message;
      view.append(button('Volver a intentar',()=>open(eventId)));
    }
  }
  function close(){epoch++;saving=false;view.hidden=true;view.replaceChildren();}
  return {open,close,isSaving:()=>saving};
}
