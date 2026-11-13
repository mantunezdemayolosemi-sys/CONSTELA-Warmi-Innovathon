import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../src/app.js';
import {registerBody} from '../src/validation.js';
import {publicationBody,filterCommunity} from '../src/community.js';
const id='11111111-1111-4111-8111-111111111111',postId='40000000-0000-4000-8000-000000000001';
const origin='http://localhost:3000',headers={origin,cookie:'constela_access=verified'};
const valid={kind:'challenge',title:'Un reto de prueba',description:'Un problema ficticio suficientemente detallado para practicar.',deliverable:'Tres propuestas con sus motivos.',effort:'2 horas',compensation:'Práctica simulada',level:'beginner',mode:'online',galaxies:['design'],skills:['creativity'],deadline:new Date(Date.now()+86400000).toISOString()};
async function setup(t,type='learner'){
  const calls=[];const gateway={authenticate:async()=>({id,email:'test@example.invalid'}),getProfile:async()=>({id,account_type:type,organization_name:type==='learner'?'':'Prueba'}),getCommunityPosts:async(token,owner,mine)=>{calls.push({token,owner,mine});return[{...valid,id:postId,is_simulation:true}];},getSavedChallenges:async()=>[postId],getPractices:async()=>[],getPractice:async(token,user,post)=>{calls.push({token,user,post});return {proposal:'Solo para su dueña',reflection:'Reflexión privada'};},completePractice:async(token,post,body)=>{calls.push({token,post,body});return {post_id:post,awarded:true};},getInterests:async()=>({galaxies:['design']}),publishCommunityPost:async(token,body)=>{calls.push({token,body});return {...body,id:postId,is_simulation:true};},saveChallenge:async(token,user,post,save)=>calls.push({token,user,post,save}),closeCommunityPost:async(token,post)=>calls.push({token,post}),register:async body=>calls.push({register:body})};
  const app=await buildApp({gateway,authLimit:100});t.after(()=>app.close());return{app,calls};
}
test('registro valida los tres tipos y exige organización solo al publicar',()=>{
  const base={name:'Ana',email:'ana@example.invalid',password:'frase larga 1234'};
  assert.equal(registerBody.parse(base).account_type,'learner');
  for(const account_type of ['company','entrepreneur'])assert.equal(registerBody.parse({...base,account_type,organization_name:'Proyecto'}).account_type,account_type);
  for(const extra of [{account_type:'admin'},{account_type:'company'},{account_type:'learner',organization_name:'Proyecto'},{owner_id:id}])assert.equal(registerBody.safeParse({...base,...extra}).success,false);
});
test('API de registro conserva tipo y organización sin aceptar roles administrativos',async t=>{
  const {app,calls}=await setup(t);const response=await app.inject({method:'POST',url:'/web/register',headers,payload:{name:'Ana',email:'ana@example.invalid',password:'frase larga 1234',account_type:'entrepreneur',organization_name:'Mi proyecto'}});
  assert.equal(response.statusCode,202);assert.equal(calls[0].register.organization_name,'Mi proyecto');
});
test('catálogo, filtros y guardados usan solo la identidad verificada',async t=>{
  const {app,calls}=await setup(t);assert.equal((await app.inject('/web/community')).statusCode,401);
  const result=await app.inject({url:'/web/community?kind=challenge&scope=saved&galaxy=design',headers});assert.equal(result.statusCode,200);assert.equal(result.json().posts[0].saved,true);assert.equal(result.json().can_publish,false);assert.deepEqual(calls[0],{token:'verified',owner:id,mine:false});
  for(const method of ['PUT','DELETE'])assert.equal((await app.inject({method,url:`/web/community/${postId}/save`,headers,payload:{}})).statusCode,204);
  assert.equal(calls[1].user,id);assert.equal(calls[2].save,false);
  assert.equal((await app.inject({url:'/web/community?scope=mine',headers})).statusCode,403);
});
test('publicar/cerrar exige tipo del perfil y cuerpos estrictos; no admite propietario ni simulación falsos',async t=>{
  const learner=await setup(t);assert.equal((await learner.app.inject({method:'POST',url:'/web/community',headers,payload:valid})).statusCode,403);
  const company=await setup(t,'company');
  assert.equal((await company.app.inject({method:'POST',url:'/web/community',headers,payload:valid})).statusCode,201);
  for(const extra of [{owner_id:id},{is_simulation:false},{organization_name:'Otra'},{status:'open'}])assert.equal((await company.app.inject({method:'POST',url:'/web/community',headers,payload:{...valid,...extra}})).statusCode,400);
  assert.equal((await company.app.inject({url:'/web/community?scope=mine',headers})).statusCode,200);assert.equal(company.calls.at(-1).mine,true);
  assert.equal((await company.app.inject({method:'PATCH',url:`/web/community/${postId}/close`,headers,payload:{}})).statusCode,204);
  assert.equal((await company.app.inject({method:'PUT',url:`/web/community/${postId}/save`,headers,payload:{}})).statusCode,403);
});
test('mutaciones comunitarias mantienen origen, IDs y contrato estricto',async t=>{
  const {app}=await setup(t,'entrepreneur');
  for(const [method,url,payload]of [['POST','/web/community',valid],['PATCH',`/web/community/${postId}/close`,{}],['PUT',`/web/community/${postId}/save`,{}],['DELETE',`/web/community/${postId}/save`,{}]])assert.equal((await app.inject({method,url,headers:{cookie:headers.cookie,origin:'https://otro.example'},payload})).statusCode,403);
  assert.equal((await app.inject({method:'PATCH',url:'/web/community/bad/close',headers,payload:{}})).statusCode,400);
  assert.equal((await app.inject({url:'/web/community?user_id=other',headers})).statusCode,400);
  for(const url of ['/retos','/empleos','/publicar','/assets/community.js','/assets/community.css'])assert.equal((await app.inject(url)).statusCode,200);
});
test('contenido y matching no condicionan acceso por habilidades del test',()=>{
  assert.equal(publicationBody.safeParse({...valid,galaxies:['design','design']}).success,false);
  assert.equal(publicationBody.safeParse({...valid,deadline:'2020-01-01T00:00:00Z'}).success,false);
  const posts=[{...valid,id:postId},{...valid,id:'other',kind:'job',galaxies:['data']}];
  assert.equal(filterCommunity(posts,null,[],{kind:'challenge',scope:'all',galaxy:'all'}).length,1);
  assert.equal(filterCommunity(posts,{galaxies:['arts']},[],{kind:'challenge',scope:'recommended',galaxy:'all'}).length,0);
  assert.equal(filterCommunity(posts,{galaxies:['explore']},[],{kind:'challenge',scope:'recommended',galaxy:'all'}).length,1);
});
test('la práctica exige propuesta/reflexión, identidad y origen; empresa no obtiene estrellas',async t=>{
  const learner=await setup(t),payload={proposal:'Una propuesta suficientemente detallada para practicar este reto.',reflection:'Aprendí a comunicar una idea con claridad.'};
  const url=`/web/community/${postId}/practice`;
  assert.equal((await learner.app.inject({method:'POST',url,headers,payload})).json().practice.awarded,true);
  assert.equal((await learner.app.inject({method:'POST',url,headers,payload:{...payload,stars:100}})).statusCode,400);
  assert.equal((await learner.app.inject({method:'POST',url,headers,payload:{proposal:' ',reflection:' '}})).statusCode,400);
  assert.equal((await learner.app.inject({method:'POST',url,headers:{cookie:headers.cookie,origin:'https://otro.example'},payload})).statusCode,403);
  assert.equal((await learner.app.inject({url,headers})).statusCode,200);
  assert.equal(learner.calls.at(-1).user,id);
  const company=await setup(t,'company');assert.equal((await company.app.inject({method:'POST',url,headers,payload})).statusCode,403);
});
