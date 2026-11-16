import { test } from 'node:test';
import assert from 'node:assert/strict';
import inject from 'light-my-request';
import { buildApp } from '../src/app.js';
import { createServerlessHandler } from '../api/serverless.js';

test('el adaptador serverless sirve rutas y assets y reutiliza el arranque concurrente', async t => {
  let initializations=0;
  const app=await buildApp({gateway:{},publicOrigin:'https://constela.example',secureCookies:true});
  t.after(()=>app.close());
  const handler=createServerlessHandler(async()=>{initializations++;return app;});
  const [health,moon,sky,three]=await Promise.all(['/health','/luna','/assets/luna-cielo.js','/vendor/three.module.js']
    .map(url=>inject(handler,{url})));
  assert.equal(health.statusCode,200);
  assert.equal(health.json().service,'constela-api');
  assert.match(moon.body,/moon-stage/);
  assert.match(sky.body,/makeSky/);
  assert.match(three.headers['content-type'],/javascript/);
  assert.equal(initializations,1);
  assert.equal((await inject(handler,{url:'/web/universe'})).statusCode,401);
  const forbidden=await inject(handler,{url:'/web/login',method:'POST',headers:{origin:'https://other.example'},payload:{}});
  assert.equal(forbidden.statusCode,403);
});

test('el adaptador no revela errores de configuración y permite reintentar un arranque fallido', async t => {
  let attempts=0;
  const app=await buildApp({gateway:{}});
  t.after(()=>app.close());
  const handler=createServerlessHandler(async()=>{
    if(++attempts===1)throw new Error('fixture-private-configuration');
    return app;
  });
  const failed=await inject(handler,{url:'/health'});
  assert.equal(failed.statusCode,503);
  assert.equal(failed.headers['cache-control'],'no-store');
  assert.ok(!failed.body.includes('fixture-private-configuration'));
  assert.equal((await inject(handler,{url:'/health'})).statusCode,200);
});
