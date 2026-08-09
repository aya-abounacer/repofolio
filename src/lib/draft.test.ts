import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GitHubRepo, GitHubUser } from '../types'
import { clearPortfolioDraft, loadPortfolioDraft, savePortfolioDraft } from './draft'
import { createPortfolioData } from './portfolio'

const user: GitHubUser = {
  login: 'dev', avatar_url: 'avatar', html_url: 'https://github.com/dev', name: 'Dev User',
  bio: 'A useful developer profile description.', location: 'Morocco', blog: '', email: null,
  public_repos: 1, followers: 0, following: 0,
}
const repo: GitHubRepo = {
  id: 1, name: 'project', description: 'Project', html_url: 'https://github.com/dev/project', homepage: null,
  language: 'TypeScript', stargazers_count: 0, forks_count: 0, fork: false, archived: false,
  pushed_at: '2026-08-01T00:00:00Z', topics: [],
}

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('local portfolio drafts', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves, restores, and clears a draft by GitHub username', () => {
    const data = createPortfolioData(user, [repo])
    data.name = 'Edited Dev'

    expect(savePortfolioDraft(data)).toBeTruthy()
    expect(loadPortfolioDraft('DEV')?.portfolio.name).toBe('Edited Dev')

    clearPortfolioDraft('dev')
    expect(loadPortfolioDraft('dev')).toBeNull()
  })
})
