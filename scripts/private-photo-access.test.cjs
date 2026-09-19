require('./register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const Module = require('node:module');
let query, get, del;
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'pg') return { Pool: class { query(...args) { return query(...args); } } };
  if (name === '@vercel/blob') return { get: (...args) => get(...args), del: (...args) => del(...args) };
  return originalLoad.call(this, name, ...args);
};
const photoHandler = require('../api/profile-photo.ts').default;
const shareHandler = require('../api/portfolios.ts').default;
Module._load = originalLoad;
const { normalizePortfolioData } = require('../src/lib/portfolio.ts');
const { EXAMPLE_PORTFOLIO } = require('../src/lib/example.ts');
const id = '12345678-1234-4234-8234-123456789012';
const shareId = '22345678-1234-4234-8234-123456789012';
const owner = '32345678-1234-4234-8234-123456789012';
const stranger = '42345678-1234-4234-8234-123456789012';
const photo = { id, session_id: owner, storage_access: 'private', url: 'https://test.private.blob.vercel-storage.com/photo.jpg' };
function request(method = 'GET', session = owner, params = { id }) { return { method, cookies: session ? { session_id: session } : {}, query: params, headers: { origin: 'https://repofolio.test', host: 'repofolio.test' } }; }
function response() {
  const chunks = [];
  const res = new Writable({ write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); res.headersSent = true; done(); } });
  res.code = 200; res.headers = {}; res.headersSent = false;
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = code => { res.code = code; return res; };
  res.json = body => { res.body = body; return res; };
  res.send = body => { res.body = body; return res; };
  res.on('finish', () => { res.body = Buffer.concat(chunks); });
  return res;
}
function setup() {
  process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = 'private-test';
  process.env.BLOB_READ_WRITE_TOKEN = 'public-test';
  get = async () => ({ statusCode: 200, stream: new Response('image bytes').body, blob: { etag: 'photo-v1' } });
  del = async () => {};
}
test('owner can read private photo, anonymous and other sessions cannot', async () => {
  setup(); query = async (sql, params) => { assert.match(sql, /EXISTS/); return { rows: params[2] === owner ? [photo] : [] }; };
  const res = response(); await photoHandler(request(), res);
  assert.equal(res.code, 200); assert.equal(res.body.toString(), 'image bytes'); assert.equal(res.headers['Cache-Control'], 'private, no-cache'); assert.equal(res.headers.ETag, 'photo-v1'); assert.equal(res.headers['CDN-Cache-Control'], 'no-store');
  get = async () => { assert.fail('unauthorized read reached Blob'); };
  for (const session of [null, stranger]) { const denied = response(); await photoHandler(request('GET', session), denied); assert.equal(denied.code, 404); }
});

test('repeat reads revalidate the photo after authorization, and revocation still denies it', async () => {
  setup(); let active = true;
  query = async () => ({ rows: active ? [photo] : [] });
  get = async (_url, options) => {
    assert.equal(options.ifNoneMatch, 'photo-v1');
    return { statusCode: 304, stream: null, blob: { etag: 'photo-v1' } };
  };
  const req = request('GET', null, { id, share: shareId });
  req.headers['if-none-match'] = 'photo-v1';
  let res = response(); await photoHandler(req, res);
  assert.equal(res.code, 304); assert.equal(res.headers['Cache-Control'], 'private, no-cache');
  active = false;
  get = async () => assert.fail('revoked photo reached Blob');
  res = response(); await photoHandler(req, res);
  assert.equal(res.code, 404); assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('public photo read requires this exact active share and stops after unpublish or when hidden', async () => {
  setup(); let active = true;
  query = async (sql, params) => {
    assert.match(sql, /revoked_at IS NULL/); assert.match(sql, /showImage/);
    assert.deepEqual(params, [id, null, null, shareId]); return { rows: active ? [photo] : [] };
  };
  let res = response(); await photoHandler(request('GET', null, { id, share: shareId }), res); assert.equal(res.code, 200);
  active = false; get = async () => assert.fail('revoked share reached Blob');
  res = response(); await photoHandler(request('GET', null, { id, share: shareId }), res); assert.equal(res.code, 404);
});
test('deletion is owner-only and revokes first, with retry after storage failure', async () => {
  setup(); let deleted = false; let purged = false;
  query = async (sql, params) => {
    if (sql.startsWith('UPDATE profile_photo_uploads SET deleted_at')) {
      assert.equal(params[0], id);
      if (params[1] !== owner) return { rows: [] };
      deleted = true; return { rows: [{ ...photo, deleted_at: 'now', purged_at: purged ? 'now' : null }] };
    }
    if (sql.startsWith('UPDATE')) { purged = true; return { rows: [] }; }
    assert.match(sql, /deleted_at IS NULL/); return { rows: deleted ? [] : [photo] };
  };
  let res = response(); await photoHandler(request('DELETE', stranger), res); assert.equal(res.code, 404); assert.equal(deleted, false);
  del = async () => { assert.ok(deleted); throw new Error('storage offline'); };
  res = response(); await photoHandler(request('DELETE'), res); assert.equal(res.code, 503); assert.ok(deleted && !purged);
  res = response(); await photoHandler(request(), res); assert.equal(res.code, 404);
  del = async () => {}; res = response(); await photoHandler(request('DELETE'), res); assert.equal(res.code, 200); assert.ok(purged);
});
test('a session cannot attach another owner photo to a new snapshot', async () => {
  setup(); query = async (sql, params) => {
    if (sql.includes('FROM sessions')) return { rows: [{ id: stranger }] };
    assert.match(sql, /session_id = \$3/); assert.equal(params[2], stranger); return { rows: [] };
  };
  const req = request('POST', stranger); req.body = { portfolio: { ...EXAMPLE_PORTFOLIO, avatarUrl: `/api/profile-photo?id=${id}&share=${shareId}` } };
  const res = response(); await shareHandler(req, res); assert.equal(res.code, 400);
});
test('unpublishing verifies owner, denies future reads, and does not delete the photo', async () => {
  setup(); let revoked = false;
  query = async (sql, params) => {
    if (sql.includes('FROM sessions')) return { rows: [{ id: params[0] }] };
    if (sql.startsWith('UPDATE shared_portfolios')) { assert.equal(params[0], shareId); if (params[1] !== owner) return { rows: [] }; revoked = true; return { rows: [{ id: shareId }] }; }
    assert.match(sql, /revoked_at IS NULL/); return { rows: revoked ? [] : [{ portfolio: EXAMPLE_PORTFOLIO }] };
  };
  del = async () => assert.fail('unpublish must retain private draft photo');
  let res = response(); await shareHandler(request('DELETE', stranger, { id: shareId }), res); assert.equal(res.code, 404); assert.equal(revoked, false);
  res = response(); await shareHandler(request('DELETE', owner, { id: shareId }), res); assert.equal(res.code, 200); assert.ok(revoked);
  res = response(); await shareHandler(request('GET', null, { id: shareId }), res); assert.equal(res.code, 404);
});
test('public snapshots expose proxy references only and omit deleted photos', async () => {
  setup(); let exists = true;
  query = async sql => {
    assert.match(sql, /LEFT JOIN profile_photo_uploads/);
    return { rows: [{ portfolio: { ...EXAMPLE_PORTFOLIO, avatarUrl: photo.url, githubAvatarUrl: 'https://avatars.githubusercontent.com/u/123' }, photo_id: id, available_photo_id: exists ? id : null }] };
  };
  let res = response(); await shareHandler(request('GET', null, { id: shareId }), res);
  assert.equal(res.body.portfolio.avatarUrl, `/api/profile-photo?id=${id}&share=${shareId}`); assert.equal(res.headers['Cache-Control'], 'no-store');
  exists = false; res = response(); await shareHandler(request('GET', null, { id: shareId }), res); assert.equal(res.body.portfolio.avatarUrl, 'https://avatars.githubusercontent.com/u/123');
});
test('old drafts route public Blob URLs through access checks', () => {
  const oldUrl = 'https://test.public.blob.vercel-storage.com/old.jpg';
  const restored = normalizePortfolioData({ ...EXAMPLE_PORTFOLIO, avatarUrl: oldUrl });
  assert.equal(restored.avatarUrl, `/api/profile-photo?legacy=${encodeURIComponent(oldUrl)}`);
});
