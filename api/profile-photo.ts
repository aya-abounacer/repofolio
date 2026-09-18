import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put } from '@vercel/blob'
import { Pool } from 'pg'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  try {
    if (!req.headers.origin || new URL(req.headers.origin).host !== req.headers.host) {
      return res.status(403).json({ error: 'Upload photos from the RepoFolio editor.' })
    }
  } catch {
    return res.status(403).json({ error: 'Invalid upload origin.' })
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Photo uploads are not set up yet. Connect a public Vercel Blob store first.' })
  }
  const sessionId = req.cookies.session_id
  if (!sessionId || !uuid.test(sessionId)) return res.status(401).json({ error: 'Start a session before uploading.' })
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
      await client.query('INSERT INTO profile_photo_uploads (id, session_id) VALUES ($1, $2)', [id, sessionId])
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
      access: 'public', contentType: 'image/jpeg', addRandomSuffix: false,
    })
    await pool.query('UPDATE profile_photo_uploads SET url = $1 WHERE id = $2', [blob.url, id])
    return res.status(201).json({ url: blob.url })
  } catch (error) {
    if ((error as { code?: string }).code === '42P01') {
      return res.status(503).json({ error: 'Photo storage needs database migration 002_profile_photo_uploads.sql.' })
    }
    return res.status(503).json({ error: 'Could not upload your photo. Check photo storage and try again.' })
  }
}
