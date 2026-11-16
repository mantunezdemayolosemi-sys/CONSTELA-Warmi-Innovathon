import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('luna y portafolio sirven las vistas y el motor 3D desde el mismo origen', async t => {
  const app=await buildApp({gateway:{}});t.after(()=>app.close());
  const [moon,pdf,motor,core]=await Promise.all(['/luna','/portafolio','/vendor/three.module.js','/vendor/three.core.js'].map(url=>app.inject(url)));
  assert.match(moon.body,/id="moon-stage"/);
  assert.match(pdf.body,/id="portfolio-view"/);
  assert.equal(motor.statusCode,200);
  assert.equal(core.statusCode,200);
  assert.match(motor.body,/\.\/three\.core\.js/);
});

test('portafolio combina prácticas antiguas y asistencias privadas y autentica el PDF',async t=>{
  const mine='my-user', cookie={constela_access:'session'};
  const assertOwner=(token,id)=>{assert.equal(token,'session');assert.equal(id,mine);};
  const events=new Map();
  const getProfile=async(token,id)=>{assertOwner(token,id);return {display_name:'Ana Núñez',account_type:'learner'};};
  const gateway={
    authenticate:async()=>({id:mine}),
    getProfile,
    getPortfolioPractices:async(token,id)=>{
      assertOwner(token,id);
      return [{post_id:'finished',community_posts:{title:'Un reto que cerró',organization_name:'Empresa ficticia'},
        completed_at:'2024-09-17T00:20:00Z',proposal:'Una propuesta de prueba.',reflection:'Aprendí a dividir el trabajo.',practiced_skills:['organization']}];
    },
    getPortfolioEvents:async(token,id)=>{assertOwner(token,id);return [...events.values()];},
    registerPortfolioEvent:async(token,id,event)=>{assertOwner(token,id);if(!events.has(event.event_id))events.set(event.event_id,event);},
    updatePortfolioEvent:async(token,id,event,reflection)=>{assertOwner(token,id);Object.assign(events.get(event),reflection);},
  };
  const opportunities={get:()=>({items:[
    {id:'original',title:'Hackathon en Lima',type:'hackathon',url:'https://example.org/lima',starts_at:'2024-09-20',country:'PE',city:'lima',mode:'hybrid'},
    {id:'foreign',title:'Otro país',url:'https://example.org/us',country:'US',city:'nyc',mode:'in_person'},
  ],sources:[]})};
  const app=await buildApp({gateway,opportunities});t.after(()=>app.close());
  const base='/web/portfolio', eventPath=base+'/events/';
  const write=(method,id,payload,origin='http://localhost:3000')=>app.inject({
    method,url:eventPath+id,cookies:cookie,headers:{origin},payload,
  });
  assert.equal((await app.inject(base)).statusCode,401);
  assert.equal((await app.inject(base+'.pdf')).statusCode,401);
  const first=(await app.inject({url:base+'?event=original&user_id=other',cookies:cookie})).json();
  assert.equal(first.entries[0].title,'Un reto que cerró');
  assert.equal(first.entries[0].date,'2024-09-16');
  assert.equal(first.event.title,'Hackathon en Lima');

  const record={attended_on:'2024-09-21',learning:'Aprendí a diseñar una prueba con usuarias.'};
  assert.equal((await write('PUT','original',record,'https://example.org')).statusCode,403);
  assert.equal((await write('PUT','original',{...record,attended_on:'2024-09-01'})).statusCode,400);
  assert.equal((await write('PUT','foreign',record)).statusCode,404);
  assert.equal((await write('PUT','original',{...record,user_id:'other'})).statusCode,400);
  assert.equal((await write('PUT','original',record)).statusCode,204);
  await write('PUT','original',{...record,learning:'Contenido de un reintento.'});
  assert.equal(events.get('original').learning,record.learning);
  assert.equal((await write('PATCH','original',{...record,learning:'Aprendí a preparar el pitch.'})).statusCode,204);
  assert.equal((await write('PUT','manual',{...record,title:'Un taller anterior',kind:'event',source_url:'https://example.org/taller'})).statusCode,204);
  assert.equal((await write('PUT','invalid',{...record,title:'Enlace inválido',kind:'event',source_url:'javascript:alert(1)'})).statusCode,400);
  const saved=(await app.inject({url:base,cookies:cookie})).json();
  assert.equal(saved.entries.length,3);
  assert.equal(saved.entries.find(entry=>entry.id==='original').learning,'Aprendí a preparar el pitch.');
  const pdf=await app.inject({url:base+'.pdf',cookies:cookie});
  assert.equal(pdf.statusCode,200);
  assert.equal(pdf.headers['content-type'],'application/pdf');
  assert.match(pdf.headers['content-disposition'],/attachment.*portafolio-constela.pdf/);
  assert.match(pdf.body,/^%PDF-/);
  gateway.getPortfolioEvents=async()=>null;
  const partial=(await app.inject({url:base,cookies:cookie})).json();
  assert.equal(partial.can_record_events,false);
  assert.equal(partial.entries.length,1);
  assert.equal((await app.inject({url:base+'.pdf',cookies:cookie})).statusCode,200);
  gateway.getProfile=async()=>({account_type:'company'});
  assert.equal((await app.inject({url:base+'.pdf',cookies:cookie})).statusCode,403);
});
