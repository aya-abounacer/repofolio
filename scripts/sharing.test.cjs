// Run with: node scripts/sharing.test.cjs
// Transpile in-process so these checks also run when esbuild cannot spawn.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText, filename);
let query;
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'pg') return { Pool: class { query(...args) { return query(...args); } } };
  return originalLoad.call(this, name, ...args);
};
require('./register-typescript.cjs');
const handler = require('../api/portfolios.ts').default;
Module._load = originalLoad;
const { saveSharedPortfolio, loadSharedPortfolio } = require('../src/lib/sharing.ts');
const { EXAMPLE_PORTFOLIO } = require('../src/lib/example.ts');
const id = '12345678-1234-4234-8234-123456789012';
const session = '22345678-1234-4234-8234-123456789012';
function response() { return { code:200, setHeader(){}, status(code){this.code=code;return this},json(body){this.body=body;return this} }; }
function request(method='POST') {return {method,query:{id},cookies:{session_id:session},headers:{host:'repofolio.test',origin:'https://repofolio.test'},body:{portfolio:structuredClone(EXAMPLE_PORTFOLIO)}};}

test('saves a snapshot with a short ID and excludes unselected projects', async () => {
  const req = request(); req.body.portfolio.projects[1].selected=false;
  req.body.portfolio.avatarUrl=`/api/profile-photo?id=${id}`;
  let saved;
  query = async (sql, params) => {
    if(sql.startsWith('SELECT id FROM sessions')) return {rows:[{id:session}]};
    if(sql.startsWith('SELECT id FROM profile_photo_uploads')) return {rows:[{id}]};
    if(sql.startsWith('SELECT id FROM shared')) return {rows:[]};
    if(sql.startsWith('SELECT count')) return {rows:[{count:0}]};
    saved=JSON.parse(params[3]);return {rows:[{id}]};
  };
  const res=response();await handler(req,res);
  assert.equal(res.code,201);assert.equal(res.body.id,id);
  assert.equal(saved.projects.length,EXAMPLE_PORTFOLIO.projects.length-1);
  assert.ok(saved.projects.every(p=>p.selected));
  assert.equal(saved.avatarUrl, req.body.portfolio.avatarUrl);
});
test('reuses saved snapshots without another insert',async()=>{
  query=async(sql)=>({rows:sql.includes('sessions')?[{id:session}]:[{id}]});
  const res=response();await handler(request(),res);assert.equal(res.code,200);assert.equal(res.body.id,id);
});
test('public GET works without session and missing links return 404',async()=>{
  query=async()=>({rows:[{portfolio:EXAMPLE_PORTFOLIO}]});
  const req=request('GET');req.cookies={};const res=response();await handler(req,res);assert.equal(res.body.portfolio.name,EXAMPLE_PORTFOLIO.name);
  query=async()=>({rows:[]});const missing=response();await handler(req,missing);assert.equal(missing.code,404);
});
test('rejects invalid IDs, sessions, cross-origin writes and oversized payloads',async()=>{
  for(const [patch,code] of [ [{method:'PATCH'},405], [{method:'GET',query:{id:'bad'}},400], [{cookies:{}},401], [{headers:{origin:'https://other.test',host:'repofolio.test'}},403], [{body:{portfolio:{bio:'x'.repeat(256001)}}},413] ]) {
    query=async()=>({rows:[{id:session}]});const res=response();await handler({...request(),...patch},res);assert.equal(res.code,code);
  }
});
test('reports storage failure and prevents sharing missing descriptions',async()=>{
  query=async()=>{throw new Error('database down')};let res=response();await handler(request(),res);assert.equal(res.code,503);
  query=async()=>({rows:[{id:session}]});const req=request();req.body.portfolio.projects[0].description=' ';res=response();await handler(req,res);assert.equal(res.code,400);
});
test('enforces per-session snapshot quota',async()=>{
  query=async sql=>({rows:sql.includes('FROM sessions')?[{id:session}]:sql.startsWith('SELECT count')?[{count:100}]:[]});
  const res=response();await handler(request(),res);assert.equal(res.code,429);
});
test('client returns a short path and propagates save/load errors',async()=>{
  const original=global.fetch;
  try {
    global.fetch=async url=>({ok:true,json:async()=>url==='/api/session'?{sessionId:session}:{id}});
    assert.equal(await saveSharedPortfolio(EXAMPLE_PORTFOLIO),`/p/${EXAMPLE_PORTFOLIO.username}/${id}`);
    global.fetch=async()=>({ok:true,json:async()=>({portfolio:EXAMPLE_PORTFOLIO})});
    assert.equal((await loadSharedPortfolio(id)).name,EXAMPLE_PORTFOLIO.name);
    global.fetch=async url=>({ok:url==='/api/session',json:async()=>({error:'Storage unavailable'})});
    await assert.rejects(saveSharedPortfolio({...EXAMPLE_PORTFOLIO, name: 'Changed name'}),/Storage unavailable/);
    await assert.rejects(loadSharedPortfolio(id),/Storage unavailable/);
  } finally {global.fetch=original;}
});


test('every copy checks the server so unpublished links cannot be reused from browser memory', async()=>{
  const original=global.fetch;
  try {
    let saves=0;
    global.fetch=async url=>{if(url==='/api/portfolios') saves++;return {ok:true,json:async()=>url==='/api/session'?{sessionId:session}:{id}}};
    const data={...EXAMPLE_PORTFOLIO,name:'Cache test'};
    const first=await saveSharedPortfolio(data);
    assert.equal(await saveSharedPortfolio(data),first);
    assert.equal(saves,2);
    await saveSharedPortfolio({...data,name:'Edited cache test'});
    assert.equal(saves,3);
  } finally {global.fetch=original;}
});

test('expired session is refreshed once and the save is retried',async()=>{
  const original=global.fetch;
  try {
    let attempts=0;let sessions=0;
    global.fetch=async url=>{
      if(url==='/api/session'){sessions++;return {ok:true,json:async()=>({sessionId:session})}}
      attempts++;return attempts===1?{ok:false,status:401}:{ok:true,status:201,json:async()=>({id})};
    };
    await saveSharedPortfolio({...EXAMPLE_PORTFOLIO,name:'Expired session test'});
    assert.equal(attempts,2);assert.equal(sessions,1);
  } finally {global.fetch=original;}
});
