import { createSession } from './backend'
import { normalizePortfolioData } from './portfolio'
import type { PortfolioData } from '../types'

export async function saveSharedPortfolio(portfolio: PortfolioData): Promise<string> {
  const payload = JSON.stringify({ portfolio: { ...portfolio, projects: portfolio.sections.projects.visible ? portfolio.projects.filter(project => project.selected) : [] } })
  await createSession()
  const save = () => fetch('/api/portfolios', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: payload,
  })
  let response = await save()
  if (response.status === 401) {
    await createSession(true)
    response = await save()
  }
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not save your portfolio. Try again.')
  if (typeof result.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(result.id)) throw new Error('The saved portfolio link could not be read.')
  const path = `/p/${encodeURIComponent(portfolio.username)}/${result.id}`
  return path
}

export async function loadSharedPortfolio(id: string): Promise<PortfolioData> {
  const response = await fetch(`/api/portfolios?id=${encodeURIComponent(id)}`)
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not load this saved portfolio.')
  const data = normalizePortfolioData(result.portfolio)
  if (!data) throw new Error('The saved portfolio data could not be read.')
  return data
}
