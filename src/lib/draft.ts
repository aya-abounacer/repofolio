import { normalizePortfolioData } from './portfolio'
import type { PortfolioData } from '../types'

const DRAFT_PREFIX = 'repofolio:draft:v1:'

interface StoredDraft {
  savedAt: string
  portfolio: PortfolioData
}

function draftKey(username: string): string {
  return `${DRAFT_PREFIX}${username.trim().toLowerCase()}`
}

export function savePortfolioDraft(data: PortfolioData): string | null {
  if (typeof window === 'undefined') return null
  const savedAt = new Date().toISOString()
  const payload: StoredDraft = { savedAt, portfolio: data }
  window.localStorage.setItem(draftKey(data.username), JSON.stringify(payload))
  return savedAt
}

export function loadPortfolioDraft(username: string): { portfolio: PortfolioData; savedAt: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(draftKey(username))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredDraft>
    const portfolio = normalizePortfolioData(parsed.portfolio)
    if (!portfolio || portfolio.username.toLowerCase() !== username.trim().toLowerCase()) return null
    return {
      portfolio,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function clearPortfolioDraft(username: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(draftKey(username))
  } catch {
    // A blocked localStorage should never make the editor unusable.
  }
}
