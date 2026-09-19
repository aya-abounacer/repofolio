import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migratePhotos } from './migrate-private-photos.mjs'

function fixture() {
  const row = { id: 'photo-id', session_id: 'owner', url: 'public-url', legacy_url: 'public-url', storage_access: 'public' }
  const events = []
  let copied = false
  const db = { async query(sql) {
    events.push(sql)
    if (sql.startsWith('SELECT *')) return { rows: [{ ...row }] }
    if (sql.startsWith('UPDATE profile_photo_uploads SET url')) return { rows: [{ id: row.id }] }
    return { rows: [] }
  } }
  const store = {
    async get(path, options) {
      if (options.access === 'private' && !copied) return null
      events.push(`read:${options.access}`)
      return { statusCode: 200, blob: { url: 'private-url' }, stream: new Response('same-image-bytes').body }
    },
    async put() { copied = true; events.push('copy'); return { url: 'private-url' } },
    async del() { events.push('delete-public') },
  }
  return { db, store, events, publicToken: 'public', privateToken: 'private', log() {} }
}
test('default migration only reports; copy mode verifies before updating and retains public originals', async () => {
  const run = fixture(); await migratePhotos(run)
  assert.ok(!run.events.some(event => /^(UPDATE|copy|delete-public)/.test(event)))
  await migratePhotos({ ...run, apply: true })
  assert.ok(run.events.includes('copy')); assert.ok(run.events.includes('read:private'))
  assert.ok(run.events.some(event => event.startsWith('UPDATE shared_portfolios')))
  assert.ok(!run.events.includes('delete-public'))
});
test('public deletion requires explicit purge and occurs after private verification and database commit', async () => {
  const run = fixture(); await migratePhotos({ ...run, apply: true, purge: true })
  assert.ok(run.events.indexOf('delete-public') > run.events.indexOf('COMMIT'))
  assert.equal(run.events.filter(event => event === 'read:private').length, 2)
});
test('failed verification keeps public original and database references intact', async () => {
  const run = fixture(); const read = run.store.get
  run.store.get = async (path, options) => {
    const result = await read(path, options)
    return result && options.access === 'private' ? { ...result, stream: new Response('wrong-bytes').body } : result
  }
  await assert.rejects(migratePhotos({ ...run, apply: true, purge: true }), /Verification failed/)
  assert.ok(!run.events.includes('delete-public'))
  assert.ok(!run.events.some(event => event.startsWith('UPDATE')))
});
