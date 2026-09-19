// Run with: node scripts/profile-photo.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const sharp = require('sharp');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
let query, put, released;
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'pg') return { Pool: class {
    query(...args) { return query(...args); }
    async connect() { return { query: (...args) => query(...args), release: () => { released = true; } }; }
  }};
  if (name === '@vercel/blob') return { put: (...args) => put(...args) };
  return originalLoad.call(this, name, ...args);
};
require('./register-typescript.cjs');
const handler = require('../api/profile-photo.ts').default;
Module._load = originalLoad;
const { deleteProfilePhoto, getPhotoCrop, uploadProfilePhoto } = require('../src/lib/profilePhoto.ts');
const { normalizePortfolioData } = require('../src/lib/portfolio.ts');
const { EXAMPLE_PORTFOLIO } = require('../src/lib/example.ts');
const url = 'https://test.private.blob.vercel-storage.com/profile-photos/photo.jpg';
const proxyUrl = '/api/profile-photo?id=12345678-1234-4234-8234-123456789012';
const session = '22345678-1234-4234-8234-123456789012';
function response() { return { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
function request(image = '/9j/AA==') { return { method: 'POST', headers: { origin: 'https://repofolio.test', host: 'repofolio.test' }, cookies: { session_id: session }, body: { image } }; }
function setup() {
  process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = 'test-token-not-real';
  released = false;
  query = async sql => ({ rows: sql.startsWith('SELECT id') ? [{ id: session }] : sql.startsWith('SELECT count') ? [{ count: 0 }] : [] });
  put = async () => ({ url });
}

test('crop stays square and inside portrait/landscape bounds at zoom and pan extremes', () => {
  assert.deepEqual(getPhotoCrop(1200, 800, { zoom: 1, x: 50, y: 50 }), { x: 200, y: 0, size: 800 });
  for (const [w, h] of [[1200, 800], [800, 1200], [512, 512]]) {
    for (const zoom of [1, 2, 3]) for (const x of [0, 50, 100]) for (const y of [0, 50, 100]) {
      const crop = getPhotoCrop(w, h, { zoom, x, y });
      assert.ok(crop.x >= 0 && crop.y >= 0);
      assert.ok(crop.x + crop.size <= w && crop.y + crop.size <= h);
    }
  }
});
test('upload validates, re-encodes, strips metadata, stores privately and returns only a proxy URL', async () => {
  setup();
  const bytes = await sharp({ create: { width: 80, height: 120, channels: 3, background: '#abcdef' } }).jpeg().withMetadata().toBuffer();
  let updated = false;
  const db = query;
  query = async (sql, params) => { if (sql.startsWith('UPDATE')) { assert.equal(params[0], url); updated = true; } return db(sql); };
  put = async (path, photo, options) => {
    assert.match(path, /^profile-photos\/[a-f0-9-]+\.jpg$/);
    assert.equal(options.access, 'private');
    assert.equal(options.contentType, 'image/jpeg');
    const meta = await sharp(photo).metadata();
    assert.equal(meta.width, 512); assert.equal(meta.height, 512); assert.equal(meta.exif, undefined);
    return { url };
  };
  const res = response(); await handler(request(bytes.toString('base64')), res);
  assert.equal(res.code, 201); assert.match(res.body.url, /^\/api\/profile-photo\?id=[a-f0-9-]+$/); assert.ok(updated && released);
});
test('rejects wrong origins, sessions, non-images and oversized input before storing', async () => {
  setup(); put = async () => { throw new Error('must not store'); };
  for (const [patch, code] of [
    [{ method: 'PATCH' }, 405], [{ headers: { origin: 'https://other.test', host: 'repofolio.test' } }, 403],
    [{ headers: { origin: 'bad', host: 'repofolio.test' } }, 403], [{ cookies: {} }, 401],
    [{ body: { image: 'bad!' } }, 400], [{ body: { image: Buffer.from('<svg/>').toString('base64') } }, 400],
    [{ body: { image: 'x'.repeat(1_400_001) } }, 413],
  ]) {
    const res = response(); await handler({ ...request(), ...patch }, res); assert.equal(res.code, code);
  }
  const damaged = response(); await handler(request(), damaged); assert.equal(damaged.code, 400);
});
test('reports setup, quota, expired session and database errors without uploading', async () => {
  setup(); delete process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  let res = response(); await handler(request(), res); assert.equal(res.code, 503);
  setup(); query = async sql => ({ rows: sql.startsWith('SELECT id') ? [{ id: session }] : [{ count: 20 }] });
  res = response(); await handler(request(), res); assert.equal(res.code, 429); assert.ok(released);
  setup(); query = async () => ({ rows: [] });
  res = response(); await handler(request(), res); assert.equal(res.code, 401); assert.ok(released);
  setup(); query = async sql => { if (sql === 'ROLLBACK') return {}; throw Object.assign(new Error('missing table'), { code: '42P01' }); };
  res = response(); await handler(request(), res); assert.equal(res.code, 503); assert.match(res.body.error, /002/); assert.ok(released);
});
test('client refreshes expired sessions and propagates upload failure', async () => {
  const originalFetch = global.fetch;
  let uploads = 0;
  try {
    global.fetch = async endpoint => endpoint === '/api/session'
      ? { ok: true, json: async () => ({ sessionId: session }) }
      : ++uploads === 1 ? { status: 401 } : { ok: true, json: async () => ({ url: proxyUrl }) };
    assert.equal(await uploadProfilePhoto('/9j/AA=='), proxyUrl); assert.equal(uploads, 2);
    global.fetch = async () => ({ ok: false, status: 503, json: async () => ({ error: 'Storage unavailable' }) });
    await assert.rejects(uploadProfilePhoto('/9j/AA=='), /Storage unavailable/);
  } finally { global.fetch = originalFetch; }
});

test('deleting an uploaded photo calls the owner-only endpoint', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  try {
    global.fetch = async (endpoint, options) => {
      calls.push([endpoint, options]);
      return { ok: true, json: async () => ({ deleted: true }) };
    };
    await deleteProfilePhoto(proxyUrl);
    assert.deepEqual(calls, [[proxyUrl, { method: 'DELETE', credentials: 'include' }]]);
    await assert.rejects(deleteProfilePhoto('https://avatars.githubusercontent.com/u/123'), /GitHub photo/);
    assert.equal(calls.length, 1);
  } finally { global.fetch = originalFetch; }
});
test('normalization preserves uploaded and original GitHub photos for snapshots and drafts', () => {
  const portfolio = { ...EXAMPLE_PORTFOLIO, avatarUrl: proxyUrl, githubAvatarUrl: 'https://avatars.githubusercontent.com/u/123' };
  const restored = normalizePortfolioData(JSON.parse(JSON.stringify(portfolio)));
  assert.equal(restored.avatarUrl, proxyUrl); assert.equal(restored.githubAvatarUrl, portfolio.githubAvatarUrl);
  delete portfolio.githubAvatarUrl;
  assert.match(normalizePortfolioData(portfolio).githubAvatarUrl, /^https:\/\/github.com\/.+\.png/);
});
