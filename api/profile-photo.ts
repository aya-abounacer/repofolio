import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, get, del } from '@vercel/blob'
import { Pool } from 'pg'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import sharp from 'sharp'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (!['GET', 'POST', 'DELETE'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  const sessionId = req.cookies.session_id
  if (req.method === 'GET') {
    try {
      if (req.query.mine === '1') {
        if (!sessionId || !uuid.test(sessionId)) return res.status(401).json({ error: 'Use the browser where you uploaded your photos.' })
        const photos = await pool.query('SELECT id, created_at, deleted_at, legacy_url FROM profile_photo_uploads WHERE session_id = $1 AND url IS NOT NULL AND purged_at IS NULL ORDER BY created_at DESC', [sessionId])
        return res.json({ photos: photos.rows })
      }
      const id = typeof req.query.id === 'string' && uuid.test(req.query.id) ? req.query.id : null
      const legacy = typeof req.query.legacy === 'string' ? req.query.legacy : null
      if (!id && !legacy) return res.status(400).json({ error: 'Invalid photo reference.' })
      const share = typeof req.query.share === 'string' && uuid.test(req.query.share) ? req.query.share : null
      const result = await pool.query(`SELECT p.* FROM profile_photo_uploads p
        WHERE (p.id = $1::uuid OR p.legacy_url = $2) AND p.deleted_at IS NULL
          AND (p.session_id = $3 OR EXISTS (
            SELECT 1 FROM shared_portfolios s
            WHERE s.id = $4::uuid AND s.photo_id = p.id AND s.revoked_at IS NULL
              AND s.portfolio->'hero'->>'showImage' = 'true'
          ))`, [id, legacy, sessionId && uuid.test(sessionId) ? sessionId : null, share])
      const photo = result.rows[0]
      if (!photo) return res.status(404).json({ error: 'Photo unavailable.' })
      if (photo.storage_access !== 'private') return res.status(409).json({ error: 'This photo is awaiting private-storage migration.' })
      const blob = await get(photo.url, {
        access: 'private', token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN,
        ifNoneMatch: typeof req.headers['if-none-match'] === 'string' ? req.headers['if-none-match'] : undefined,
      })
      if (!blob) return res.status(404).json({ error: 'Photo unavailable.' })
      res.setHeader('Cache-Control', 'private, no-cache')
      res.setHeader('ETag', blob.blob.etag)
      if (blob.statusCode === 304) return res.status(304).end()
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Content-Disposition', 'inline')
      await pipeline(Readable.fromWeb(blob.stream as import('node:stream/web').ReadableStream), res)
      return
    } catch {
      if (res.headersSent) return res.destroy()
      return res.status(503).json({ error: 'Photo storage is unavailable.' })
    }
  }
  try {
    if (!req.headers.origin || new URL(req.headers.origin).host !== req.headers.host) {
      return res.status(403).json({ error: 'Upload photos from the RepoFolio editor.' })
    }
  } catch {
    return res.status(403).json({ error: 'Invalid upload origin.' })
  }
  if (!process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Connect a private Blob store with PRIVATE_BLOB_READ_WRITE_TOKEN first.' })
  }
  if (!sessionId || !uuid.test(sessionId)) return res.status(401).json({ error: 'Start a session before uploading.' })
  if (req.method === 'DELETE') {
    const id = req.query.id
    if (typeof id !== 'string' || !uuid.test(id)) return res.status(400).json({ error: 'Invalid photo.' })
    try {
      // Revoke first, even if the storage provider is temporarily unavailable. A retry completes deletion.
      const result = await pool.query('UPDATE profile_photo_uploads SET deleted_at = COALESCE(deleted_at, now()) WHERE id = $1 AND session_id = $2 RETURNING *', [id, sessionId])
      const photo = result.rows[0]
      if (!photo) return res.status(404).json({ error: 'Photo unavailable in this browser session.' })
      if (photo.purged_at) return res.json({ deleted: true })
      if (photo.storage_access === 'private' && photo.url) await del(photo.url, { token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN })
      if (photo.legacy_url && !photo.public_deleted_at) {
        if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Legacy token required')
        await del(photo.legacy_url, { token: process.env.BLOB_READ_WRITE_TOKEN })
      }
      await pool.query('UPDATE profile_photo_uploads SET purged_at = now(), public_deleted_at = CASE WHEN legacy_url IS NOT NULL THEN now() ELSE public_deleted_at END WHERE id = $1', [id])
      return res.json({ deleted: true })
    } catch {
      return res.status(503).json({ error: 'Deletion could not finish. Access through RepoFolio is blocked once the request is recorded; retry to finish removing stored copies.' })
    }
  }
  const image = req.body?.image
  if (typeof image !== 'string' || !image.length) return res.status(400).json({ error: 'Choose a photo first.' })
  if (image.length > 1_400_000) return res.status(413).json({ error: 'This photo is too large. Choose a smaller image.' })
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length % 4 !== 0) {
    return res.status(400).json({ error: 'The uploaded photo could not be read.' })
  }
  const bytes = Buffer.from(image, 'base64')
  if (bytes.length > 1_000_000) return res.status(413).json({ error: 'This photo is too large.' })
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return res.status(400).json({ error: 'Apply the photo crop before uploading.' })
  }

  try {
    // Serialize reservations per session so simultaneous uploads cannot bypass the limit.
    const client = await pool.connect()
    const id = randomUUID()
    try {
      await client.query('BEGIN')
      const session = await client.query('SELECT id FROM sessions WHERE id::text = $1 FOR UPDATE', [sessionId])
      if (!session.rows.length) {
        await client.query('ROLLBACK')
        return res.status(401).json({ error: 'Your session expired. Try again.' })
      }
      const count = await client.query("SELECT count(*)::int AS count FROM profile_photo_uploads WHERE session_id = $1 AND created_at > now() - interval '1 day'", [sessionId])
      if (count.rows[0].count >= 20) {
        await client.query('ROLLBACK')
        return res.status(429).json({ error: 'You have reached today’s photo upload limit. Try again tomorrow.' })
      }
      await client.query("INSERT INTO profile_photo_uploads (id, session_id, storage_access) VALUES ($1, $2, 'private')", [id, sessionId])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    let photo: Buffer
    try {
      // Decode and re-encode rather than trust a file name or MIME type. This also strips metadata.
      photo = await sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' })
        .rotate().resize(512, 512, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()
    } catch {
      return res.status(400).json({ error: 'This photo is damaged or unsupported. Choose another image.' })
    }
    const blob = await put(`profile-photos/${id}.jpg`, photo, {
      access: 'private', token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN, contentType: 'image/jpeg', addRandomSuffix: false,
    })
    await pool.query('UPDATE profile_photo_uploads SET url = $1 WHERE id = $2', [blob.url, id])
    return res.status(201).json({ url: `/api/profile-photo?id=${id}` })
  } catch (error) {
    if (['42P01', '42703'].includes((error as { code?: string }).code || '')) {
      return res.status(503).json({ error: 'Photo storage needs migrations 002_profile_photo_uploads.sql and 003_private_photos.sql.' })
    }
    return res.status(503).json({ error: 'Could not upload your photo. Check photo storage and try again.' })
  }
}
