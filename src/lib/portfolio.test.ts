import { describe, expect, it } from 'vitest'
import type { GitHubRepo, GitHubUser, PortfolioData } from '../types'
import {
  buildSharePath,
  createPortfolioData,
  decodePortfolio,
  deriveSkills,
  encodePortfolio,
  normalizeGithubUsername,
  normalizePortfolioData,
  PROJECT_DESCRIPTION_PLACEHOLDER,
  rankRepositories,
} from './portfolio'

const user: GitHubUser = {
  login: 'dev',
  avatar_url: 'avatar',
  html_url: 'https://github.com/dev',
  name: 'Dev User',
  bio: 'Builder',
  location: 'Casablanca',
  blog: 'dev.example.com',
  email: null,
  public_repos: 2,
  followers: 0,
  following: 0,
}

function repo(overrides: Partial<GitHubRepo> & Pick<GitHubRepo, 'id' | 'name'>): GitHubRepo {
  return {
    description: 'Useful project',
    html_url: `https://github.com/dev/${overrides.name}`,
    homepage: null,
    language: 'TypeScript',
    stargazers_count: 0,
    forks_count: 0,
    fork: false,
    archived: false,
    pushed_at: '2026-08-01T00:00:00Z',
    topics: [],
    ...overrides,
  }
}

describe('normalizeGithubUsername', () => {
  it.each([
    [' aya-abounacer ', 'aya-abounacer'],
    ['HTTPS://GITHUB.COM/aya-abounacer/', 'aya-abounacer'],
    ['www.github.com/octocat?tab=repositories', 'octocat'],
    ['https://github.com/octocat/repo', 'octocat'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeGithubUsername(input)).toBe(expected)
  })

  it.each([
    '', '   ', 'https://example.com/nizarrahmoun', 'example.com/octocat',
    'https://github.com.evil.com/octocat', 'https://github.com@evil.com/octocat',
    'https://evil.com@github.com/octocat', 'ftp://github.com/octocat',
    'https://github.com', 'https://github.com/', 'https://github.com:8080/octocat',
    'not a username', '-octocat', 'octocat-', 'octo--cat', 'octo_cat', 'a'.repeat(40),
  ])('rejects invalid input %s', (input) => {
    expect(normalizeGithubUsername(input)).toBe('')
  })

  it('accepts usernames and GitHub URLs', () => {
    expect(normalizeGithubUsername('@octocat')).toBe('octocat')
    expect(normalizeGithubUsername('https://github.com/octocat/')).toBe('octocat')
    expect(normalizeGithubUsername('github.com/octocat')).toBe('octocat')
  })
})

describe('repository ranking', () => {
  it('prioritizes stronger repositories instead of alphabetical order', () => {
    const repos = [
      repo({ id: 1, name: 'aaa-small', stargazers_count: 0, pushed_at: '2024-01-01T00:00:00Z' }),
      repo({ id: 2, name: 'zzz-strong', stargazers_count: 80, forks_count: 10 }),
      repo({ id: 3, name: 'middle-fork', stargazers_count: 100, fork: true }),
    ]
    expect(rankRepositories(repos)[0].name).toBe('zzz-strong')
  })
})

describe('createPortfolioData', () => {
  it('derives skills, technologies and keeps the full ranked repository list', () => {
    const repos = [
      repo({ id: 1, name: 'tiny', language: 'JavaScript' }),
      repo({ id: 2, name: 'popular', language: 'TypeScript', stargazers_count: 50, forks_count: 2, topics: ['react', 'vite'] }),
    ]
    const result = createPortfolioData(user, repos)
    expect(result.version).toBe(3)
    expect(result.projects).toHaveLength(2)
    expect(result.projects[0].title).toBe('popular')
    expect(result.projects[0].technologies).toEqual(expect.arrayContaining(['TypeScript', 'react', 'vite']))
    expect(result.skills).toContain('TypeScript')
    expect(result.appearance.template).toBe('modern')
  })

  it('handles users with zero repositories', () => {
    const result = createPortfolioData({ ...user, public_repos: 0 }, [])
    expect(result.projects).toEqual([])
    expect(result.sections.projects.visible).toBe(true)
  })

  it('keeps the intro distinct from About and omits notebook file labels from imported skills', () => {
    const result = createPortfolioData(user, [
      repo({ id: 1, name: 'analysis', language: 'Jupyter Notebook' }),
      repo({ id: 2, name: 'website', language: 'TypeScript' }),
    ])
    expect(result.bio).toBe(user.bio)
    expect(result.sections.about.visible).toBe(false)
    expect(result.sections.about.text).toBe('')
    expect(result.skills).toEqual(['TypeScript'])
    expect(result.projects.find((project) => project.originalName === 'analysis')?.language).toBe('Jupyter Notebook')
  })

  it('can reimport repository languages without notebook or archived repository labels', () => {
    const repos = [
      repo({ id: 1, name: 'site', language: 'TypeScript' }),
      repo({ id: 2, name: 'notebook', language: 'Jupyter Notebook' }),
      repo({ id: 3, name: 'old', language: 'Cobol', archived: true }),
    ]
    expect(deriveSkills(repos)).toEqual(['TypeScript'])
  })

  it('removes duplicate About text from older drafts without changing distinct About content', () => {
    const data = createPortfolioData(user, [])
    data.sections.about = { visible: true, title: 'About', text: data.bio }
    expect(normalizePortfolioData(data)?.sections.about).toEqual({ visible: false, title: 'About', text: '' })
    data.sections.about.text = 'I focus on accessible tools for education.'
    expect(normalizePortfolioData(data)?.sections.about.text).toBe(data.sections.about.text)
    expect(normalizePortfolioData(data)?.sections.about.visible).toBe(true)
  })

  it('keeps many repositories manageable and selects only the strongest six by default', () => {
    const repos = Array.from({ length: 100 }, (_, index) => repo({
      id: index + 1,
      name: `repo-${index + 1}`,
      stargazers_count: index,
    }))
    const result = createPortfolioData({ ...user, public_repos: 100 }, repos)
    expect(result.projects).toHaveLength(100)
    expect(result.projects.filter((project) => project.selected)).toHaveLength(6)
    expect(result.projects.filter((project) => project.featured)).toHaveLength(1)
    expect(result.projects[0].featured).toBe(true)
    expect(result.projects[0].stars).toBe(99)
  })
})

describe('portfolio URL codec', () => {
  it('round-trips the complete v3 data model with unicode content', () => {
    const data = createPortfolioData({ ...user, name: 'Ali العماري' }, [repo({ id: 1, name: 'portfolio' })])
    data.appearance.template = 'creative'
    data.appearance.mode = 'light'
    data.sections.experience.visible = true
    data.sections.experience.items.push({ id: 'job-1', title: 'Engineer', subtitle: 'Studio', meta: '2026', description: 'Built things.' })
    expect(decodePortfolio(encodePortfolio(data))).toEqual(data)
  })

  it('restores legacy v1 links into the new shared model', () => {
    const legacy = {
      username: 'ali', avatarUrl: 'x', name: 'Ali', headline: 'Developer', bio: 'Builds things', location: 'Casablanca',
      githubUrl: 'https://github.com/ali', website: '', email: '', skills: ['TypeScript'],
      projects: [{ id: 1, name: 'old-project', description: 'Legacy', url: '#', homepage: '', language: 'TypeScript', stars: 2, forks: 1, selected: true }],
    }
    const json = JSON.stringify(legacy)
    const bytes = new TextEncoder().encode(json)
    let binary = ''
    bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
    const oldEncoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const restored = decodePortfolio(oldEncoded)
    expect(restored?.version).toBe(3)
    expect(restored?.projects[0].title).toBe('old-project')
    expect(restored?.projects[0].featured).toBe(true)
    expect(restored?.appearance.template).toBe('modern')
  })

  it('removes deselected projects from public share payloads', () => {
    const data = createPortfolioData(user, [repo({ id: 1, name: 'visible' }), repo({ id: 2, name: 'hidden' })])
    data.projects[1].selected = false
    const path = buildSharePath(data)
    const encoded = new URL(`https://example.com${path}`).searchParams.get('data')
    const restored = encoded ? decodePortfolio(encoded) : null
    expect(restored?.projects).toHaveLength(1)
    expect(restored?.projects[0].title).toBe(data.projects[0].title)
  })
})


describe('project description content', () => {
  it('leaves missing GitHub descriptions empty', () => {
    const data = createPortfolioData(user, [repo({ id: 1, name: 'empty', description: null })])
    expect(data.projects[0].description).toBe('')
  })

  it('cleans instructions from legacy drafts and exported links while preserving real content', () => {
    const data = createPortfolioData(user, [repo({ id: 1, name: 'legacy' }), repo({ id: 2, name: 'real' })])
    data.projects[0].description = PROJECT_DESCRIPTION_PLACEHOLDER
    data.projects[1].description = 'Built a useful tool.'
    expect(normalizePortfolioData(data)?.projects.map((project) => project.description)).toEqual(['', 'Built a useful tool.'])
    const encoded = new URL(buildSharePath(data), 'https://example.com').searchParams.get('data')!
    const raw = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))
    expect(raw.portfolio.projects[0].description).toBe('')
    expect(decodePortfolio(encoded)?.projects[1].description).toBe('Built a useful tool.')
  })
})
