import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMlh,parseGhw,collect,recommend,robotsAllows,safePublicUrl,opportunitiesQuery} from '../src/opportunities.js';
import {buildApp} from '../src/app.js';
const now=new Date('2026-11-12T18:00:00Z'), checked=now.toISOString();
const event={name:'Community Data Hack',url:'/events/test/prizes',websiteUrl:'https://event.example.org/',startsAt:'2026-12-01T12:00:00Z',endsAt:'2026-12-02T12:00:00Z',formatType:'digital',location:'Worldwide',venueAddress:{country:'Worldwide'},customFields:{hackathon_focus:[]}};
const mlh=events=>`<script data-page="app" type="application/json">${JSON.stringify({props:{upcomingEvents:events}})}</script>`;
const ghw=`<a href="./events/open-source"><p>Open Source Week</p><p>December 4th - 10th, 2026</p><p>Explore open source</p></a>`;
const snapshot={version:1,items:parseMlh(mlh([event]),checked),sources:[]};
test('extrae metadatos públicos de ambos HTML sin ejecutar código y rechaza cambios de estructura',()=>{
  const items=parseMlh(mlh([event]),checked);assert.equal(items[0].mode,'online');
  assert.deepEqual(items[0].galaxies,['technology','social','data']);assert.equal(items[0].deadline,null);
  assert.equal(parseGhw(ghw,checked)[0].ends_at,'2026-12-10');
  assert.throws(()=>parseMlh('<html>Error</html>',checked));assert.throws(()=>parseGhw('<html>Error</html>',checked));
  assert.deepEqual(parseMlh(mlh([]),checked),[]);
  assert.equal(parseMlh(mlh([{...event,formatType:'hybrid_physical'}]),checked)[0].mode,'hybrid');
  for(const url of ['javascript:alert(1)','https://localhost/','https://127.0.0.1/','https://[::1]/','https://foo.local/','http://example.org/','https://user:secret@example.org/'])assert.equal(safePublicUrl(url),null);
});
test('recomienda por curiosidad, permite explorar todo y excluye vencidos o copias de más de siete días',()=>{
  const options=opportunitiesQuery.parse({});
  assert.equal(recommend(snapshot,{galaxies:['data']},null,options,+now).items.length,1);
  assert.equal(recommend(snapshot,{galaxies:['arts']},{completed:true},options,+now).items.length,0);
  const broad=recommend(snapshot,{galaxies:['arts']},{completed:true},{...options,scope:'all'},+now);assert.equal(broad.items.length,1);
  assert.match(broad.items[0].reason,/fuera/);
  assert.equal(recommend(snapshot,{galaxies:['explore']},null,options,+now).items.length,1);
  assert.equal(recommend(snapshot,{galaxies:['data']},null,{...options,mode:'in_person'},+now).items.length,0);
  const stale={...snapshot,items:[{...snapshot.items[0],checked_at:'2026-10-01T00:00:00Z'}]};
  assert.equal(recommend(stale,{galaxies:['explore']},null,options,+now).items.length,0);
  const expired={...snapshot,items:[{...snapshot.items[0],ends_at:'2026-11-01T00:00:00Z'}]};
  assert.equal(recommend(expired,{galaxies:['explore']},null,options,+now).items.length,0);
});
test('robots respeta agente específico, patrones y la regla más larga',()=>{
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /events','/events'),true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /events/*/private$','/events/a/private'),false);
  assert.equal(robotsAllows('User-agent: ConstelaOpportunities\nDisallow: /\nUser-agent: *\nAllow: /','/events'),false);
  assert.equal(robotsAllows('User-agent: OtherBot\nDisallow: /','/'),true);
});
test('recolector deduplica, conserva la última fuente útil y elimina datos si robots lo prohíbe',async()=>{
  const response=(body,status=200)=>new Response(body,{status,headers:{'content-type':'text/html'}});
  const calls=[];
  const fetchImpl=async url=>{
    calls.push(url); if(url.endsWith('/robots.txt'))return response('User-agent: *\nAllow: /');
    if(url.includes('ghw.'))throw new Error('offline');return response(mlh([event,event]));
  };
  const saved=await collect(snapshot,{fetchImpl,now});assert.equal(saved.items.length,1);
  assert.deepEqual(saved.sources.map(s=>s.status),['ok','unavailable']);
  assert.equal(calls.length,4);
  const denied=await collect(saved,{now,fetchImpl:async()=>response('User-agent: *\nDisallow: /')});
  assert.equal(denied.items.length,0);assert.ok(denied.sources.every(s=>s.status==='blocked'));
  const failed=await collect(saved,{now,fetchImpl:async()=>{throw new Error('offline');}});
  assert.deepEqual(failed.items,saved.items);assert.ok(failed.sources.every(s=>s.status==='unavailable'));
});
test('redirecciones a hosts ajenos nunca se siguen y una fuente rota no vacía la otra',async()=>{
  const visited=[];
  const result=await collect(snapshot,{now,fetchImpl:async url=>{
    visited.push(url);
    if(url.endsWith('/robots.txt'))return new Response('User-agent: *\nAllow: /',{headers:{'content-type':'text/plain'}});
    if(url.includes('ghw.'))return new Response(ghw,{headers:{'content-type':'text/html'}});
    return new Response(null,{status:302,headers:{location:'http://127.0.0.1:8000/private'}});
  }});
  assert.equal(visited.some(url=>url.includes('127.0.0.1')),false);
  assert.deepEqual(result.sources.map(s=>s.status),['unavailable','ok']);assert.equal(result.items.length,2);
});
test('rutas privadas derivan identidad y rechazan origen externo y filtros no reconocidos',async t=>{
  const writes=[];
  const gateway={authenticate:async()=>({id:'ana'}),getInterests:async(token,id)=>{assert.equal(id,'ana');return {revision:1,galaxies:['data']};},getDiscovery:async()=>null,saveInterests:async(token,body)=>{writes.push(body);return body;}};
  const app=await buildApp({gateway,opportunities:{get:()=>snapshot}});t.after(()=>app.close());
  assert.equal((await app.inject('/web/interests')).statusCode,401);
  const headers={cookie:'constela_access=test',origin:'http://localhost:3000'};
  assert.equal((await app.inject({url:'/web/interests',headers})).json().interests.revision,1);
  assert.equal((await app.inject({url:'/web/opportunities?url=http://localhost',headers})).statusCode,400);
  assert.equal((await app.inject({method:'PUT',url:'/web/interests',headers:{...headers,origin:'https://evil.example'},payload:{revision:1,galaxies:['arts']}})).statusCode,403);
  assert.equal((await app.inject({method:'PUT',url:'/web/interests',headers,payload:{revision:1,galaxies:['arts'],user_id:'luz'}})).statusCode,400);
  assert.equal((await app.inject({method:'PUT',url:'/web/interests',headers,payload:{revision:1,galaxies:['arts']}})).statusCode,200);
  assert.deepEqual(writes,[{revision:1,galaxies:['arts']}]);
});
