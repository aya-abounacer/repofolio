import { describe, expect, it } from 'vitest'
import type { GitHubRepo, GitHubUser } from '../types'
import { createPortfolioData } from './portfolio'
import { getPortfolioReadiness } from './readiness'

const user: GitHubUser = {
  login: 'dev', avatar_url: 'avatar', html_url: 'https://github.com/dev', name: 'Dev User',
  bio: 'I build useful software products with a focus on quality.', location: 'Morocco',
  blog: 'https://dev.example.com', email: 'dev@example.com', public_repos: 3, followers: 0, following: 0,
}

const repos: GitHubRepo[] = Array.from({ length: 3 }, (_, index) => ({
  id: index + 1,
  name: `project-${index + 1}`,
  description: 'A useful project with a clear description.',
  html_url: `https://github.com/dev/project-${index + 1}`,
  homepage: index === 0 ? 'https://demo.example.com' : null,
  language: 'TypeScript',
  stargazers_count: index,
  forks_count: 0,
  fork: false,
  archived: false,
  pushed_at: '2026-08-01T00:00:00Z',
  topics: ['react'],
}))

describe('portfolio readiness', () => {
  it('reports incomplete background until experience or education is added', () => {
    const data = createPortfolioData(user, repos)
    const initial = getPortfolioReadiness(data)
    expect(initial.items.find((item) => item.id === 'background')?.complete).toBe(false)

    data.sections.education.visible = true
    data.sections.education.items.push({ id: 'edu', title: 'Software Engineering', subtitle: 'University', meta: '2026', description: '' })
    const updated = getPortfolioReadiness(data)
    expect(updated.items.find((item) => item.id === 'background')?.complete).toBe(true)
    expect(updated.ready).toBe(true)
  })
})
