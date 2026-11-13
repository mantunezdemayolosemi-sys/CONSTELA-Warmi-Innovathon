import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const learner='11111111-1111-4111-8111-111111111111',company='22222222-2222-4222-8222-222222222222',entrepreneur='33333333-3333-4333-8333-333333333333';
const challenge='40000000-0000-4000-8000-000000000001',job='40000000-0000-4000-8000-000000000007';
const body={kind:'challenge',title:'Un reto de prueba',description:'Un problema ficticio suficientemente detallado para practicar.',deliverable:'Tres propuestas con sus motivos.',effort:'2 horas',compensation:'Práctica simulada',level:'beginner',mode:'online',galaxies:['design'],skills:['creativity'],deadline:new Date(Date.now()+86400000).toISOString()};
before(async()=>{
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
  grant usage on schema auth,public to anon,authenticated;
  create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null);
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;`);
  for(const name of ['202611120001_create_profiles.sql','202611130006_community_demo.sql','202611130007_practice_stars.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
  for(const [id,metadata] of [[learner,{display_name:'Ana'}],[company,{display_name:'Bea',account_type:'company',organization_name:'Empresa de prueba'}],[entrepreneur,{display_name:'Luz',account_type:'entrepreneur',organization_name:'Proyecto de prueba'}]])await db.query('insert into auth.users values($1,$2)',[id,JSON.stringify(metadata)]);
});
after(()=>db.close());
async function asRole(id,operation,{role='authenticated',anonymous=false}={}){
  await db.exec('begin');try{await db.exec(`set local role ${role}`);await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,email:id?'test@example.invalid':'',is_anonymous:anonymous})]);return await operation();}finally{await db.exec('rollback');}
}
const publish=(post=body)=>db.query('select * from public.publish_community_post($1)',[JSON.stringify(post)]);

test('006 conserva cuentas anteriores como usuarias, crea tipos nuevos y rechaza organizaciones inválidas',async()=>{
  const {rows}=await db.query('select account_type,organization_name from public.profiles where id=$1',[learner]);
  assert.deepEqual(rows,[{account_type:'learner',organization_name:''}]);
  for(const meta of [{display_name:'Mal',account_type:'admin'},{display_name:'Mal',account_type:'company'}])await assert.rejects(db.query('insert into auth.users values(gen_random_uuid(),$1)',[JSON.stringify(meta)]),/check constraint/);
  const seed=await db.query('select kind,count(*)::int n,bool_and(is_simulation) simulated from public.community_posts group by kind order by kind');
  assert.deepEqual(seed.rows,[{kind:'challenge',n:6,simulated:true},{kind:'job',n:2,simulated:true}]);
});
test('tipo y organización no pueden editarse con permisos del cliente ni cambiando metadatos Auth',async()=>{
  await assert.rejects(asRole(learner,()=>db.exec("update public.profiles set account_type='company',organization_name='Falsa'")),/permission denied/);
  await db.exec('begin');try{await db.query("update auth.users set raw_user_meta_data=raw_user_meta_data || $1::jsonb where id=$2",[JSON.stringify({account_type:'company',organization_name:'Falsa'}),learner]);assert.equal((await db.query('select account_type from public.profiles where id=$1',[learner])).rows[0].account_type,'learner');}finally{await db.exec('rollback');}
});
test('solo empresas/emprendedoras publican y la DB deriva organización, propietario y simulación',async()=>{
  await assert.rejects(asRole(learner,()=>publish()),/Publisher/);
  for(const id of [company,entrepreneur])await asRole(id,async()=>{
    const {rows}=await publish({...body,owner_id:learner,organization_name:'Suplantada',is_simulation:false,status:'closed'});
    assert.equal(rows[0].owner_id,id);assert.equal(rows[0].is_simulation,true);assert.equal(rows[0].status,'open');assert.notEqual(rows[0].organization_name,'Suplantada');
    await assert.rejects(db.exec("insert into public.community_posts(title) values('Salto de RPC')"),/permission denied/);
  });
});
test('la DB valida contenido, galaxias, modalidad y fecha aunque se omita la API',async()=>{
  for(const change of [{title:' '},{galaxies:['unknown']},{mode:'other'},{deadline:'2020-01-01T00:00:00Z'},{kind:'admin'},{skills:['unknown']}])await assert.rejects(asRole(company,()=>publish({...body,...change})),/check constraint|Invalid deadline/);
});
test('solo el propietario cierra; semillas y publicaciones ajenas quedan protegidas',async()=>{
  await asRole(company,async()=>{
    const post=(await publish()).rows[0];await db.query('select public.close_community_post($1)',[post.id]);
    assert.equal((await db.query('select status from public.community_posts where id=$1',[post.id])).rows[0].status,'closed');
  });
  await assert.rejects(asRole(entrepreneur,()=>db.query('select public.close_community_post($1)',[challenge])),/Publication not found/);
  await db.exec('begin');let owned;
  try{await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:company,email:'test@example.invalid'})]);owned=(await publish()).rows[0].id;await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:entrepreneur,email:'other@example.invalid'})]);await assert.rejects(db.query('select public.close_community_post($1)',[owned]),/Publication not found/);}finally{await db.exec('rollback');}
});
test('guardados son idempotentes, privados y exclusivos de usuarias para retos activos',async()=>{
  await asRole(learner,async()=>{
    for(let i=0;i<2;i++)await db.query('insert into public.challenge_saves(user_id,post_id) values($1,$2) on conflict do nothing',[learner,challenge]);
    assert.equal((await db.query('select * from public.challenge_saves')).rows.length,1);
    await db.exec('delete from public.challenge_saves');assert.equal((await db.query('select * from public.challenge_saves')).rows.length,0);
  });
  for(const [id,owner,post]of [[company,company,challenge],[learner,entrepreneur,challenge],[learner,learner,job]])await assert.rejects(asRole(id,()=>db.query('insert into public.challenge_saves(user_id,post_id) values($1,$2)',[owner,post])),/row-level security/);
  await db.exec('begin');try{await db.query('insert into public.challenge_saves(user_id,post_id) values($1,$2)',[learner,challenge]);await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:company,email:'test@example.invalid'})]);assert.equal((await db.query('select * from public.challenge_saves')).rows.length,0);assert.equal((await db.query('delete from public.challenge_saves returning *')).rows.length,0);}finally{await db.exec('rollback');}
});
test('RLS oculta cerrados/vencidos; visitantes y sesiones anónimas no publican ni leen el catálogo',async()=>{
  await db.exec('begin');try{await db.query("update public.community_posts set status='closed' where id=$1",[challenge]);await db.query("update public.community_posts set deadline=now()-interval '1 day' where id=$1",[job]);await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:learner,email:'test@example.invalid'})]);assert.equal((await db.query('select * from public.community_posts where id=any($1)',[[challenge,job]])).rows.length,0);await assert.rejects(db.query('insert into public.challenge_saves values($1,$2,now())',[learner,challenge]),/row-level security/);}finally{await db.exec('rollback');}
  await assert.rejects(asRole(null,()=>db.query('select * from public.community_posts'),{role:'anon'}),/permission denied/);
  await assert.rejects(asRole(null,()=>publish(),{role:'anon'}),/permission denied/);
  assert.equal((await asRole(company,()=>db.query('select * from public.community_posts'),{anonymous:true})).rows.length,0);
  await assert.rejects(asRole(company,()=>publish(),{anonymous:true}),/Publisher/);
});
const proposal='Una propuesta ficticia suficientemente detallada para el reto de práctica.',reflection='Aprendí a organizar mis ideas y explicar una propuesta.';
const practice=(post=challenge,p=proposal,r=reflection)=>db.query('select public.complete_challenge_practice($1,$2,$3) as result',[post,p,r]);
test('cada reto otorga una sola estrella y los reintentos conservan la primera práctica',async()=>{
  await asRole(learner,async()=>{
    assert.equal((await practice()).rows[0].result.awarded,true);
    assert.equal((await practice(challenge,'Otra propuesta suficientemente larga para intentar duplicar el premio.')).rows[0].result.awarded,false);
    const saved=(await db.query('select * from public.challenge_practices')).rows;
    assert.equal(saved.length,1);assert.equal(saved[0].proposal,proposal);assert.deepEqual(saved[0].practiced_skills,['creativity','communication']);
  });
});
test('no hay estrellas por empleos, contenido vacío, cuentas publicadoras o retos cerrados/vencidos',async()=>{
  for(const args of [[job,proposal,reflection],[challenge,' ',reflection]])await assert.rejects(asRole(learner,()=>practice(...args)),/no longer active|Invalid practice/);
  await assert.rejects(asRole(company,()=>practice()),/Learner/);
  await assert.rejects(asRole(learner,()=>practice(),{anonymous:true}),/Learner/);
  await db.exec('begin');try{await db.query("update public.community_posts set status='closed' where id=$1",[challenge]);await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:learner,email:'test@example.invalid'})]);await assert.rejects(practice(),/no longer active/);}finally{await db.exec('rollback');}
});
test('estrellas y propuestas son privadas y no admiten manipular contador, fecha ni autor',async()=>{
  await db.exec('begin');try{
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:learner,email:'test@example.invalid'})]);await practice();await db.exec('set local role authenticated');
    await assert.rejects(db.exec("update public.challenge_practices set completed_at=now()"),/permission denied/);
  }finally{await db.exec('rollback');}
  await db.exec('begin');try{await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:learner,email:'test@example.invalid'})]);await practice();await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:company,email:'test@example.invalid'})]);assert.equal((await db.query('select * from public.challenge_practices')).rows.length,0);}finally{await db.exec('rollback');}
  await assert.rejects(asRole(learner,()=>db.query('insert into public.challenge_practices(user_id,post_id,proposal,reflection,practiced_skills) values($1,$2,$3,$4,$5)',[learner,challenge,proposal,reflection,[]])),/permission denied/);
});
