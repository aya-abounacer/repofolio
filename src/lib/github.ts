import type { GitHubRepo, GitHubUser } from '../types'
import { rankRepositories } from './portfolio'

const API = 'https://api.github.com'

export class GithubApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GithubApiError'
    this.status = status
  }
}

function headers(): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
  }
}

async function parseError(response: Response): Promise<never> {
  if (response.status === 404) {
    throw new GithubApiError('We could not find that GitHub username.', 404)
  }

  if (response.status === 403 || response.status === 429) {
    const reset = response.headers.get('x-ratelimit-reset')
    const resetText = reset
      ? ` Try again after ${new Date(Number(reset) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
      : ''
    throw new GithubApiError(`GitHub API rate limit reached.${resetText}`, response.status)
  }

  if (response.status >= 500) {
    throw new GithubApiError('GitHub is having trouble right now. Please try again in a moment.', response.status)
  }

  throw new GithubApiError('GitHub returned an unexpected error. Please try again.', response.status)
}

export async function fetchGithubPortfolioSource(username: string, languageRepoNames: string[] = []): Promise<{
  user: GitHubUser
  repos: GitHubRepo[]
}> {
  const userResponse = await fetch(`${API}/users/${encodeURIComponent(username)}`, { headers: headers() })
  if (!userResponse.ok) await parseError(userResponse)

  const reposResponse = await fetch(
    `${API}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`,
    { headers: headers() },
  )
  if (!reposResponse.ok) await parseError(reposResponse)

  const user = (await userResponse.json()) as GitHubUser
  const repos = (await reposResponse.json()) as GitHubRepo[]
  const rankedRepos = rankRepositories(repos)
  const requestedNames = new Set(languageRepoNames)
  const requestedTargets = rankedRepos.filter((repo) => requestedNames.has(repo.name) && !repo.archived && typeof repo.name === 'string')
  const primaryTargets = rankedRepos.filter((repo) => !repo.archived && !repo.fork && typeof repo.name === 'string')
  const automaticTargets = primaryTargets.length
    ? primaryTargets
    : rankedRepos.filter((repo) => !repo.archived && typeof repo.name === 'string')
  const languageTargets = (requestedTargets.length ? requestedTargets : automaticTargets).slice(0, 12)

  const languageResults = await Promise.all(languageTargets.map(async (repo): Promise<[number, string[]]> => {
    try {
      const response = await fetch(
        `${API}/repos/${encodeURIComponent(user.login)}/${encodeURIComponent(repo.name)}/languages`,
        { headers: headers() },
      )
      if (!response.ok) return [repo.id, []]

      const totals = (await response.json()) as Record<string, unknown>
      const languages = Object.entries(totals)
        .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([language]) => language)
      return [repo.id, languages]
    } catch {
      return [repo.id, []]
    }
  }))
  const languagesByRepo = new Map(languageResults)
  const enrichedRepos = repos.map((repo) => ({
    ...repo,
    ...(languagesByRepo.get(repo.id)?.length ? { languages: languagesByRepo.get(repo.id) } : {}),
  }))

  return { user, repos: enrichedRepos }
}
