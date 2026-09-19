import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Pool } from 'pg'
import { createHash, randomUUID } from 'node:crypto'
import { normalizePortfolioData, getProjectsMissingDescriptions } from '../src/lib/portfolio.js'
import { photoReference, isBlobPhotoUrl } from '../src/lib/photoReference.js'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
  if (!['GET', 'POST', 'DELETE'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  try {
    if (req.method === 'GET') {
      if (req.query.mine === '1') {
        const sessionId = req.cookies.session_id
        if (!sessionId || !uuid.test(sessionId)) return res.status(401).json({ error: 'Use the browser where you shared this portfolio.' })
        const result = await pool.query("SELECT id, created_at, portfolio->>'name' AS name, portfolio->>'username' AS username FROM shared_portfolios WHERE session_id = $1 AND portfolio->>'username' = $2 AND revoked_at IS NULL ORDER BY created_at DESC", [sessionId, req.query.username])
        return res.json({ portfolios: result.rows })
      }
      const id = req.query.id
      if (typeof id !== 'string' || !uuid.test(id)) return res.status(400).json({ error: 'Invalid portfolio link.' })
      const result = await pool.query(`SELECT s.portfolio, s.photo_id, p.id AS available_photo_id
        FROM shared_portfolios s
        LEFT JOIN profile_photo_uploads p ON p.id = s.photo_id AND p.deleted_at IS NULL AND p.storage_access = 'private'
        WHERE s.id = $1 AND s.revoked_at IS NULL`, [id])
      if (!result.rows[0]) return res.status(404).json({ error: 'This saved portfolio could not be found.' })
      const portfolio = { ...result.rows[0].portfolio }
      if (result.rows[0].photo_id) {
        portfolio.avatarUrl = result.rows[0].available_photo_id && portfolio.hero?.showImage
          ? `/api/profile-photo?id=${result.rows[0].photo_id}&share=${id}`
          : portfolio.githubAvatarUrl || `https://github.com/${encodeURIComponent(portfolio.username)}.png?size=512`
      } else if (photoReference(portfolio.avatarUrl || '') || isBlobPhotoUrl(portfolio.avatarUrl || '')) {
        portfolio.avatarUrl = ''
      }
      return res.json({ portfolio })
    }

    if (!req.headers.origin || new URL(req.headers.origin).host !== req.headers.host) {
      return res.status(403).json({ error: 'Sharing must start from RepoFolio.' })
    }
    const sessionId = req.cookies.session_id
    if (!sessionId || !uuid.test(sessionId)) return res.status(401).json({ error: 'Start a session before sharing.' })
    const session = await pool.query('SELECT id FROM sessions WHERE id::text = $1', [sessionId])
    if (!session.rows.length) return res.status(401).json({ error: 'Your session expired. Try sharing again.' })
    if (req.method === 'DELETE') {
      const id = req.query.id
      if (typeof id !== 'string' || !uuid.test(id)) return res.status(400).json({ error: 'Invalid portfolio link.' })
      const result = await pool.query('UPDATE shared_portfolios SET revoked_at = COALESCE(revoked_at, now()) WHERE id = $1 AND session_id = $2 RETURNING id', [id, sessionId])
      if (!result.rows.length) return res.status(404).json({ error: 'This link is not owned by your current browser session.' })
      return res.json({ unpublished: true })
    }
    if (Buffer.byteLength(JSON.stringify(req.body ?? null)) > 256_000) {
      return res.status(413).json({ error: 'This portfolio is too large to share. Shorten its content and try again.' })
    }
    const portfolio = normalizePortfolioData(req.body?.portfolio)
    if (!portfolio) return res.status(400).json({ error: 'Invalid portfolio data.' })
    if (getProjectsMissingDescriptions(portfolio).length) return res.status(400).json({ error: 'Add descriptions to selected projects before sharing.' })
    portfolio.projects = portfolio.sections.projects.visible ? portfolio.projects.filter(project => project.selected) : []
    let photoId: string | null = null
    const reference = photoReference(portfolio.avatarUrl)
    if (reference) {
      const photo = await pool.query("SELECT id FROM profile_photo_uploads WHERE (id = $1::uuid OR legacy_url = $2) AND session_id = $3 AND deleted_at IS NULL AND storage_access = 'private'", [reference.id || null, reference.legacy || null, sessionId])
      if (!photo.rows.length) return res.status(400).json({ error: 'Your photo is unavailable in this session or needs migration. Upload it again or use your GitHub photo.' })
      photoId = photo.rows[0].id
      portfolio.avatarUrl = `/api/profile-photo?id=${photoId}`
    } else if (portfolio.avatarUrl.startsWith('/api/profile-photo')) {
      return res.status(400).json({ error: 'Invalid photo reference.' })
    }
    const json = JSON.stringify(portfolio)
    const hash = createHash('sha256').update(json).digest('hex')
    const existing = await pool.query('SELECT id FROM shared_portfolios WHERE session_id = $1 AND content_hash = $2 AND revoked_at IS NULL', [sessionId, hash])
    if (existing.rows[0]) return res.json({ id: existing.rows[0].id })
    const count = await pool.query("SELECT count(*)::int AS count FROM shared_portfolios WHERE session_id = $1 AND created_at > now() - interval '1 day'", [sessionId])
    if (count.rows[0].count >= 100) return res.status(429).json({ error: 'You have shared many versions today. Please try again tomorrow.' })
    const result = await pool.query(`INSERT INTO shared_portfolios (id, session_id, content_hash, portfolio, photo_id)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      ON CONFLICT (session_id, content_hash) WHERE revoked_at IS NULL DO UPDATE SET content_hash = EXCLUDED.content_hash
      RETURNING id`, [randomUUID(), sessionId, hash, json, photoId])
    return res.status(201).json({ id: result.rows[0].id })
  } catch {
    return res.status(503).json({ error: 'Portfolio storage is unavailable. Please try again shortly.' })
  }
}
