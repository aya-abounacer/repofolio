// Default: report only. --apply: copy + verify + update references.
// --apply --purge-public: additionally remove verified old public copies.
import { Client } from 'pg'
import * as blob from '@vercel/blob'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
async function readPhoto(store, path, access, token) {
  const result = await store.get(path, { access, token, useCache: false })
  if (!result || result.statusCode !== 200) throw new Error('A photo could not be read; no public copy was deleted.')
  return Buffer.from(await new Response(result.stream).arrayBuffer())
}

export async function migratePhotos({ db, store = blob, apply = false, purge = false, publicToken, privateToken, log = console.log }) {
  if (purge && !apply) throw new Error('--purge-public requires --apply')
  if (apply && (!publicToken || !privateToken)) throw new Error('Both BLOB_READ_WRITE_TOKEN (old public) and PRIVATE_BLOB_READ_WRITE_TOKEN (new private) are required.')
  await db.query('SELECT pg_advisory_lock(736291804)')
  try {
    const { rows } = await db.query('SELECT * FROM profile_photo_uploads WHERE url IS NOT NULL AND deleted_at IS NULL AND (storage_access = \'public\' OR (legacy_url IS NOT NULL AND public_deleted_at IS NULL)) ORDER BY created_at')
    log(`${rows.length} existing photo records need copying or public-copy cleanup. ${apply ? 'Applying changes.' : 'Report only; no photos or records will change.'}`)
    for (const photo of rows) {
      if (!apply) { log(`${photo.id}: ${photo.storage_access === 'public' ? 'copy to private' : 'private copy ready; public cleanup pending'}`); continue }
      const legacy = photo.legacy_url || photo.url
      if (photo.storage_access === 'public') {
        const source = await readPhoto(store, legacy, 'public', publicToken)
        const pathname = `profile-photos/${photo.id}.jpg`
        // Recover safely when a prior run copied a file but stopped before updating Neon.
        const existing = await store.get(pathname, { access: 'private', token: privateToken, useCache: false })
        const target = existing?.statusCode === 200
          ? existing.blob
          : await store.put(pathname, source, { access: 'private', token: privateToken, contentType: 'image/jpeg', addRandomSuffix: false })
        const copied = await readPhoto(store, target.url, 'private', privateToken)
        if (digest(source) !== digest(copied)) throw new Error(`Verification failed for ${photo.id}; original preserved.`)
        await db.query('BEGIN')
        try {
          const updated = await db.query("UPDATE profile_photo_uploads SET url = $1, legacy_url = $2, storage_access = 'private' WHERE id = $3 AND deleted_at IS NULL AND storage_access = 'public' RETURNING id", [target.url, legacy, photo.id])
          if (!updated.rows.length) throw new Error(`Photo ${photo.id} changed during migration. Rerun after checking it.`)
          await db.query("UPDATE shared_portfolios SET photo_id = $1, portfolio = jsonb_set(portfolio, '{avatarUrl}', to_jsonb($2::text)) WHERE session_id = $3 AND (photo_id = $1 OR portfolio->>'avatarUrl' = $4)", [photo.id, `/api/profile-photo?id=${photo.id}`, photo.session_id, legacy])
          await db.query('COMMIT')
        } catch (error) { await db.query('ROLLBACK'); throw error }
        photo.url = target.url
        log(`${photo.id}: copied, verified, and database references updated.`)
      }
      if (purge) {
        // Check the private copy is still readable before removing the public original.
        await readPhoto(store, photo.url, 'private', privateToken)
        await store.del(legacy, { token: publicToken })
        await db.query('UPDATE profile_photo_uploads SET public_deleted_at = now() WHERE id = $1', [photo.id])
        log(`${photo.id}: old public copy removed.`)
      }
    }
  } finally { await db.query('SELECT pg_advisory_unlock(736291804)') }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await db.connect()
    await migratePhotos({ db, apply: process.argv.includes('--apply'), purge: process.argv.includes('--purge-public'), publicToken: process.env.BLOB_READ_WRITE_TOKEN, privateToken: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN })
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Migration failed.')
    process.exitCode = 1
  } finally { await db.end() }
}
