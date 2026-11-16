import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { missions } from '../src/discovery.js';
import { suggestChallenge } from '../src/community.js';
import { summarizeProgress } from '../public/progreso.js';

const active = {kind:'challenge',title:'Caso ficticio',deadline:'2026-12-01T00:00:00Z',galaxies:['design'],skills:['creativity']};
const answers=Object.fromEntries(missions.map(mission=>[mission.id,mission.options[0].id]));
const session={headers:{cookie:'constela_access=verified-user'}};

test('sube un nivel a las tres prácticas y los reintentos no suman puntos', () => {
  const p=Array.from({length:7},(_,i)=>({post_id:`practice-${i}`}));
  assert.deepEqual(summarizeProgress([]),{stars:0,points:0,level:1,inLevel:0,pointsToNext:75});
  assert.deepEqual(summarizeProgress([p[0],p[1],p[0]]),{stars:2,points:50,level:1,inLevel:50,pointsToNext:25});
  assert.deepEqual(summarizeProgress(p.slice(0,3)),{stars:3,points:75,level:2,inLevel:0,pointsToNext:75});
  assert.deepEqual(summarizeProgress(p),{stars:7,points:175,level:3,inLevel:25,pointsToNext:50});
});

test('recomienda por galaxias, desempata por habilidades y excluye prácticas ya registradas',()=>{
  const genderNeutralJob={...active,id:'job',kind:'job'};
  const posts=[{...active,id:'practice'}, {...active,id:'interest',skills:[]},
    {...active,id:'strength',galaxies:['data']}, {...active,id:'both'},genderNeutralJob];
  const interests={galaxies:['design']},result={highlighted:['creativity']};
  assert.equal(suggestChallenge(posts,interests,result,[{post_id:'practice'}]).id,'both');
  assert.equal(suggestChallenge(posts,interests,result,[{post_id:'practice'},{post_id:'both'}]).id,'interest');
  assert.equal(suggestChallenge([genderNeutralJob],interests,result,[]),null);
  assert.equal(suggestChallenge([{...active,id:'strength',galaxies:['data']}],interests,result,[]).id,'strength');
});

test('Mi universo usa la identidad confirmada y no incluye el contenido privado de prácticas en el resumen',async t=>{
  const user={id:'user-fixture'};
  const practices=[{post_id:'done',completed_at:'2026-11-15T00:00:00Z',practiced_skills:['creativity'],proposal:'Texto privado'}];
  const own=(token,id)=>{assert.equal(token,'verified-user');assert.equal(id,user.id);};
  let type='learner';
  const gateway={authenticate:async()=>user,getProfile:async(token,id)=>{own(token,id);return {account_type:type};},
    getInterests:async(token,id)=>{own(token,id);return {galaxies:['design']};},
    getDiscovery:async(token,id)=>{own(token,id);return {answers,self_perception:[]};},
    getPractices:async(token,id)=>{own(token,id);return practices;},
    getCommunityPosts:async(token,id)=>{own(token,id);return [{...active,id:'next'}];}};
  const app=await buildApp({gateway});t.after(()=>app.close());
  assert.equal((await app.inject('/web/universe')).statusCode,401);
  const response=await app.inject({url:'/web/universe?user_id=other',...session});
  assert.equal(response.statusCode,200);
  const data=response.json();
  assert.equal(data.progress.points,25);
  assert.equal(data.discovery.completed,true);
  assert.equal(data.suggestion.id,'next');
  assert.deepEqual(data.practices,[{post_id:'done',completed_at:practices[0].completed_at,practiced_skills:['creativity'],title:null}]);
  assert.ok(!response.body.includes('Texto privado'));
  type='company';
  assert.equal((await app.inject({url:'/web/universe',...session})).statusCode,403);
});

test('la portada de Tyra enlaza al acceso de Fastify y las secciones conservan sus rutas',async t=>{
  const app=await buildApp({gateway:{}});t.after(()=>app.close());
  const landing=await app.inject('/');
  assert.match(landing.body,/id="cielo"/);
  assert.match(landing.body,/href="\/ingresar"/);
  assert.match(landing.body,/href="\/registro"/);
  assert.match(landing.body,/\/assets\/portada\.js/);
  for (const url of ['/universo','/explorar','/descubrir','/galaxias','/retos','/empleos','/oportunidades','/publicar']) {
    const result=await app.inject(url);assert.equal(result.statusCode,200);assert.match(result.body,/\/assets\/app\.js/);
  }
});
