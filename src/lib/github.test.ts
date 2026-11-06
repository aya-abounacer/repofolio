import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchGithubPortfolioSource } from './github'

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchGithubPortfolioSource', () => {
  it('returns a profile with zero repositories', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ login: 'empty', public_repos: 0 }))
      .mockResolvedValueOnce(response([]))
    vi.stubGlobal('fetch', fetchMock)

    const source = await fetchGithubPortfolioSource('empty')
    expect(source.user.login).toBe('empty')
    expect(source.repos).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('maps a missing username to a useful error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ message: 'Not Found' }, 404)))
    await expect(fetchGithubPortfolioSource('does-not-exist')).rejects.toMatchObject({ status: 404 })
  })

  it('reports rate limits and includes the reset time when present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ message: 'rate limited' }, 403, { 'x-ratelimit-reset': '2000000000' })))
    await expect(fetchGithubPortfolioSource('limited')).rejects.toThrow('GitHub API rate limit reached')
  })

  it('requests up to 100 owner repositories in one repository call', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ login: 'many' }))
      .mockResolvedValueOnce(response(Array.from({ length: 100 }, (_, index) => ({ id: index }))))
    vi.stubGlobal('fetch', fetchMock)

    await fetchGithubPortfolioSource('many')
    expect(String(fetchMock.mock.calls[1][0])).toContain('per_page=100')
    expect(String(fetchMock.mock.calls[1][0])).toContain('type=owner')
  })

  it('adds every reported language to the strongest imported projects', async () => {
    const repository = {
      id: 1,
      name: 'portfolio',
      description: 'Portfolio',
      html_url: 'https://github.com/dev/portfolio',
      homepage: null,
      language: 'TypeScript',
      stargazers_count: 4,
      forks_count: 0,
      fork: false,
      archived: false,
      pushed_at: '2026-08-01T00:00:00Z',
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ login: 'dev' }))
      .mockResolvedValueOnce(response([repository]))
      .mockResolvedValueOnce(response({ TypeScript: 8000, CSS: 2400, HTML: 1200 }))
    vi.stubGlobal('fetch', fetchMock)

    const source = await fetchGithubPortfolioSource('dev')
    expect(source.repos[0].languages).toEqual(['TypeScript', 'CSS', 'HTML'])
    expect(String(fetchMock.mock.calls[2][0])).toContain('/repos/dev/portfolio/languages')
  })
})
