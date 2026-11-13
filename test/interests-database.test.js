import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {galaxies,interestsBody} from '../src/interests.js';
const db=new PGlite();
const ana='11111111-1111-4111-8111-111111111111', luz='22222222-2222-4222-8222-222222222222';
before(async()=>{
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
    grant usage on schema auth,public to anon,authenticated;
    create table auth.users(id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    insert into auth.users values('${ana}'),('${luz}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/202611120003_create_interests.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202611120004_interest_conflict_http.sql',import.meta.url),'utf8'));
});
after(()=>db.close());
async function asUser(operation,{role='authenticated',id=ana,anonymous=false}={}){
  await db.exec('begin');
  try{
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,email:'test@example.invalid',is_anonymous:anonymous})]);
    return await operation();
  }finally{await db.exec('rollback');}
}
const save=(revision,selected)=>db.query('select public.save_user_interests($1,$2::text[]) as saved',[revision,selected]);
test('las doce galaxias coinciden entre catálogo SQL y API; selección válida de una a cinco',async()=>{
  const {rows}=await db.query('select id,name,description from public.interest_areas order by id');
  assert.deepEqual(rows,galaxies.map(({symbol,...g})=>g).sort((a,b)=>a.id.localeCompare(b.id)));
  for(const list of [[],['technology','technology'],['bad'],['explore','data'],galaxies.slice(0,6).map(g=>g.id)]){
    assert.equal(interestsBody.safeParse({revision:0,galaxies:list}).success,false);
    await assert.rejects(asUser(()=>save(0,list)),e=>e.code==='22023');
  }
  assert.equal(interestsBody.safeParse({revision:0,galaxies:['explore']}).success,true);
  assert.equal(interestsBody.safeParse({revision:0,galaxies:['data'],user_id:luz}).success,false);
});
test('escritura atómica con identidad propia, edición y aislamiento de intereses',async()=>{
  await asUser(async()=>{
    const first=await save(0,['technology','design']);assert.equal(first.rows[0].saved.revision,1);
    assert.equal((await db.query('select * from public.user_interests')).rows.length,2);
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:luz,email:'luz@example.invalid'})]);
    assert.equal((await db.query('select * from public.interest_profiles')).rows.length,0);
    assert.equal((await db.query('select * from public.user_interests')).rows.length,0);
    await save(0,['data']);
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:ana,email:'ana@example.invalid'})]);
    await save(1,['explore']);
    assert.deepEqual((await db.query('select interest_id from public.user_interests')).rows,[{interest_id:'explore'}]);
  });
});
test('una revisión antigua no reemplaza elecciones más recientes',async()=>{
  await assert.rejects(asUser(async()=>{await save(0,['data']);await save(0,['arts']);}),e=>e.code==='PT409');
  await assert.rejects(asUser(async()=>{await save(0,['data']);await save(1,['arts']);await save(1,['health']);}),e=>e.code==='PT409');
});
test('RPC y RLS rechazan sesiones anónimas y escrituras directas incluso a áreas propias',async()=>{
  await assert.rejects(asUser(()=>save(0,['data']),{role:'anon'}),e=>e.code==='42501');
  await assert.rejects(asUser(()=>save(0,['data']),{anonymous:true}),e=>e.code==='42501');
  for(const statement of [
    `insert into public.user_interests values('${luz}','data')`,
    'delete from public.user_interests', 'update public.interest_profiles set revision=999',
    "update public.interest_areas set name='otra'",
  ])await assert.rejects(asUser(()=>db.exec(statement)),e=>e.code==='42501');
});
