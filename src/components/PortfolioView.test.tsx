import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPortfolioData } from '../lib/portfolio'
import type { GitHubRepo, GitHubUser, PortfolioTemplate } from '../types'
import { PortfolioView } from './PortfolioView'

const user: GitHubUser = {
  login: 'dev', avatar_url: 'avatar.jpg', html_url: 'https://github.com/dev', name: 'Dev User', bio: 'Builder', location: 'Morocco', blog: '', email: 'dev@example.com', public_repos: 1, followers: 0, following: 0,
}
const repos: GitHubRepo[] = [{ id: 1, name: 'project', description: 'A project', html_url: 'https://github.com/dev/project', homepage: 'https://demo.example.com', language: 'TypeScript', stargazers_count: 3, forks_count: 1, fork: false, archived: false, pushed_at: '2026-08-01T00:00:00Z', topics: ['react'] }]

describe('PortfolioView templates', () => {
  for (const template of ['minimal', 'modern', 'creative'] as PortfolioTemplate[]) {
    it(`renders the ${template} presentation from the same portfolio model`, () => {
      const data = createPortfolioData(user, repos)
      data.appearance.template = template
      const html = renderToStaticMarkup(<PortfolioView data={data} />)
      expect(html).toContain(`${template}-template`)
      expect(html).toContain('Dev User')
      expect(html).toContain('project')
      expect(html).toContain('dev%40example.com')
      expect(html).toContain('Live demo')
    })
  }
})
