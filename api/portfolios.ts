import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Pool } from 'pg'
import { createHash, randomUUID } from 'node:crypto'
import { normalizePortfolioData, getProjectsMissingDescriptions } from '../src/lib/portfolio.js'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!['GET', 'POST'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  try {
    if (req.method === 'GET') {
      const id = req.query.id
      if (typeof id !== 'string' || !uuid.test(id)) return res.status(400).json({ error: 'Invalid portfolio link.' })
      const result = await pool.query('SELECT portfolio FROM shared_portfolios WHERE id = $1', [id])
      if (!result.rows[0]) return res.status(404).json({ error: 'This saved portfolio could not be found.' })
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600')
      return res.json({ portfolio: result.rows[0].portfolio })
    }

    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
      return res.status(403).json({ error: 'Sharing must start from RepoFolio.' })
    }
    const sessionId = req.cookies.session_id
    if (!sessionId || !uuid.test(sessionId)) return res.status(401).json({ error: 'Start a session before sharing.' })
    const session = await pool.query('SELECT id FROM sessions WHERE id::text = $1', [sessionId])
    if (!session.rows.length) return res.status(401).json({ error: 'Your session expired. Try sharing again.' })
    if (Buffer.byteLength(JSON.stringify(req.body ?? null)) > 256_000) {
      return res.status(413).json({ error: 'This portfolio is too large to share. Shorten its content and try again.' })
    }
    const portfolio = normalizePortfolioData(req.body?.portfolio)
    if (!portfolio) return res.status(400).json({ error: 'Invalid portfolio data.' })
    if (getProjectsMissingDescriptions(portfolio).length) return res.status(400).json({ error: 'Add descriptions to selected projects before sharing.' })
    portfolio.projects = portfolio.sections.projects.visible ? portfolio.projects.filter(project => project.selected) : []
    const json = JSON.stringify(portfolio)
    const hash = createHash('sha256').update(json).digest('hex')
    const existing = await pool.query('SELECT id FROM shared_portfolios WHERE session_id = $1 AND content_hash = $2', [sessionId, hash])
    if (existing.rows[0]) return res.json({ id: existing.rows[0].id })
    const count = await pool.query("SELECT count(*)::int AS count FROM shared_portfolios WHERE session_id = $1 AND created_at > now() - interval '1 day'", [sessionId])
    if (count.rows[0].count >= 100) return res.status(429).json({ error: 'You have shared many versions today. Please try again tomorrow.' })
    const result = await pool.query(`INSERT INTO shared_portfolios (id, session_id, content_hash, portfolio)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (session_id, content_hash) DO UPDATE SET content_hash = EXCLUDED.content_hash
      RETURNING id`, [randomUUID(), sessionId, hash, json])
    return res.status(201).json({ id: result.rows[0].id })
  } catch {
    return res.status(503).json({ error: 'Portfolio storage is unavailable. Please try again shortly.' })
  }
}
