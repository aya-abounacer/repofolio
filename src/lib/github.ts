import type { GitHubRepo, GitHubUser } from '../types'

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

export async function fetchGithubPortfolioSource(username: string): Promise<{
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

  return { user, repos }
}
