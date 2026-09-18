import type {
  GitHubRepo,
  GitHubUser,
  PortfolioData,
  PortfolioProject,
  PortfolioSections,
  PortfolioTimelineItem,
} from '../types.js'

export const PORTFOLIO_SCHEMA_VERSION = 3 as const

export const PROJECT_DESCRIPTION_PLACEHOLDER = 'Add a short description that explains the problem, your approach, and the result.'

export function cleanProjectDescription(value: string): string {
  const description = value.trim()
  return description === PROJECT_DESCRIPTION_PLACEHOLDER ? '' : description
}

export function getProjectsMissingDescriptions(data: PortfolioData): PortfolioProject[] {
  return data.sections.projects.visible
    ? data.projects.filter((project) => project.selected && !cleanProjectDescription(project.description))
    : []
}

const FALLBACK_ACCENT = '#7cdd5b'

export function normalizeGithubUsername(input: string): string {
  const value = input.trim()
  const usernamePattern = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
  const username = value.replace(/^@/, '')
  if (usernamePattern.test(username)) return username

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
    const url = new URL(withProtocol)
    if (
      !['github.com', 'www.github.com'].includes(url.hostname) ||
      url.username || url.password || url.port
    ) return ''

    const candidate = url.pathname.split('/').filter(Boolean)[0] ?? ''
    return usernamePattern.test(candidate) ? candidate : ''
  } catch {
    return ''
  }
}

export function scoreRepository(repo: GitHubRepo): number {
  const pushedAt = new Date(repo.pushed_at).getTime()
  const ageDays = Number.isFinite(pushedAt) ? Math.max(0, (Date.now() - pushedAt) / 86_400_000) : 3650
  const freshness = Math.max(0, 24 - ageDays / 22)
  const quality =
    (repo.description ? 7 : 0) +
    (repo.language ? 5 : 0) +
    (repo.homepage ? 4 : 0) +
    Math.min(repo.topics?.length ?? 0, 5)
  const community = Math.log2(repo.stargazers_count + 1) * 10 + Math.log2(repo.forks_count + 1) * 5
  const forkPenalty = repo.fork ? 18 : 0
  const archivedPenalty = repo.archived ? 100 : 0

  return community + freshness + quality - forkPenalty - archivedPenalty
}

export function rankRepositories(repos: GitHubRepo[]): GitHubRepo[] {
  return [...repos].sort((a, b) => {
    const scoreDifference = scoreRepository(b) - scoreRepository(a)
    if (Math.abs(scoreDifference) > 0.001) return scoreDifference
    return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
  })
}

export function deriveSkills(repos: GitHubRepo[]): string[] {
  const counts = new Map<string, number>()
  repos.forEach((repo) => {
    if (!repo.language || repo.archived || repo.language.toLowerCase() === 'jupyter notebook') return
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1)
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([language]) => language)
    .slice(0, 12)
}

function cleanWebsite(blog: string | null): string {
  if (!blog) return ''
  return /^https?:\/\//i.test(blog) ? blog : `https://${blog}`
}

function fallbackBio(name: string, skills: string[]): string {
  const stack = skills.slice(0, 3).join(', ')
  return stack
    ? `${name} is a software developer building practical products with ${stack}. Explore selected projects and experience below.`
    : `${name} is a software developer focused on building useful, reliable digital products. Explore selected work below.`
}

function technologiesForRepo(repo: GitHubRepo): string[] {
  const values = [repo.language ?? '', ...(repo.topics ?? [])]
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 5)
}

function defaultSections(): PortfolioSections {
  return {
    about: {
      visible: false,
      title: 'About',
      text: '',
    },
    experience: {
      visible: false,
      title: 'Experience',
      items: [],
    },
    education: {
      visible: false,
      title: 'Education',
      items: [],
    },
    certifications: {
      visible: false,
      title: 'Certifications',
      items: [],
    },
    achievements: {
      visible: false,
      title: 'Achievements',
      items: [],
    },
    skills: {
      visible: true,
      title: 'Skills',
    },
    projects: {
      visible: true,
      title: 'Selected work',
    },
    contact: {
      visible: true,
      title: 'Let’s build something useful.',
      text: 'Have a role, project, or idea in mind? The fastest way to reach me is through the links below.',
    },
  }
}

export function createPortfolioData(user: GitHubUser, repos: GitHubRepo[]): PortfolioData {
  const name = user.name?.trim() || user.login
  const skills = deriveSkills(repos)
  const rankedRepos = rankRepositories(repos)
  const defaultSelectedIds = new Set(
    rankedRepos
      .filter((repo) => !repo.archived && !repo.fork)
      .slice(0, 6)
      .map((repo) => repo.id),
  )

  if (defaultSelectedIds.size === 0) {
    rankedRepos.filter((repo) => !repo.archived).slice(0, 6).forEach((repo) => defaultSelectedIds.add(repo.id))
  }

  const firstSelectedId = rankedRepos.find((repo) => defaultSelectedIds.has(repo.id))?.id
  const projects: PortfolioProject[] = rankedRepos.map((repo) => ({
    id: repo.id,
    originalName: repo.name,
    title: repo.name,
    description: cleanProjectDescription(repo.description ?? ''),
    url: repo.html_url,
    homepage: repo.homepage ?? '',
    language: repo.language ?? '',
    technologies: technologiesForRepo(repo),
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    selected: defaultSelectedIds.has(repo.id),
    featured: repo.id === firstSelectedId,
  }))

  const bio = user.bio?.trim() || fallbackBio(name, skills)

  return {
    version: PORTFOLIO_SCHEMA_VERSION,
    username: user.login,
    avatarUrl: user.avatar_url,
    githubAvatarUrl: user.avatar_url,
    name,
    headline: skills.length
      ? `Software developer building with ${skills.slice(0, 3).join(', ')}`
      : 'Software developer building thoughtful digital products',
    bio,
    location: user.location ?? '',
    githubUrl: user.html_url,
    website: cleanWebsite(user.blog),
    email: user.email ?? '',
    skills,
    projects,
    hero: {
      eyebrow: 'Software developer',
      status: '',
      showStatus: false,
      availabilityConfirmed: false,
      showImage: true,
    },
    appearance: {
      template: 'modern',
      mode: 'dark',
      accent: FALLBACK_ACCENT,
      font: 'sans',
    },
    sections: defaultSections(),
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeAccent(value: unknown): string {
  const accent = asString(value, FALLBACK_ACCENT)
  return /^#[0-9a-f]{6}$/i.test(accent) ? accent : FALLBACK_ACCENT
}

function normalizeTimelineItems(value: unknown): PortfolioTimelineItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const raw = item as Record<string, unknown>
      return {
        id: asString(raw.id, `item-${index + 1}`),
        title: asString(raw.title),
        subtitle: asString(raw.subtitle),
        meta: asString(raw.meta),
        description: asString(raw.description),
        ...(typeof raw.url === 'string' ? { url: raw.url } : {}),
      }
    })
}

function normalizeProject(value: unknown, index: number): PortfolioProject | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const id = typeof raw.id === 'number' ? raw.id : index + 1
  const legacyName = asString(raw.name)
  const originalName = asString(raw.originalName, legacyName || `project-${id}`)
  const title = asString(raw.title, legacyName || originalName)
  const language = asString(raw.language)
  const technologies = Array.isArray(raw.technologies)
    ? raw.technologies.filter((item): item is string => typeof item === 'string').slice(0, 8)
    : language ? [language] : []

  return {
    id,
    originalName,
    title,
    description: cleanProjectDescription(asString(raw.description)),
    url: asString(raw.url),
    homepage: asString(raw.homepage),
    language,
    technologies,
    stars: typeof raw.stars === 'number' ? raw.stars : 0,
    forks: typeof raw.forks === 'number' ? raw.forks : 0,
    selected: asBoolean(raw.selected, true),
    featured: asBoolean(raw.featured, false),
  }
}

function normalizeSections(value: unknown): PortfolioSections {
  const defaults = defaultSections()
  if (!value || typeof value !== 'object') return defaults
  const raw = value as Record<string, unknown>

  const textSection = (key: 'about') => {
    const source = raw[key] && typeof raw[key] === 'object' ? raw[key] as Record<string, unknown> : {}
    return {
      visible: asBoolean(source.visible, defaults[key].visible),
      title: asString(source.title, defaults[key].title),
      text: asString(source.text, defaults[key].text),
    }
  }

  const listSection = (key: 'experience' | 'education' | 'certifications' | 'achievements') => {
    const source = raw[key] && typeof raw[key] === 'object' ? raw[key] as Record<string, unknown> : {}
    return {
      visible: asBoolean(source.visible, defaults[key].visible),
      title: asString(source.title, defaults[key].title),
      items: normalizeTimelineItems(source.items),
    }
  }

  const simpleSection = (key: 'skills' | 'projects') => {
    const source = raw[key] && typeof raw[key] === 'object' ? raw[key] as Record<string, unknown> : {}
    return {
      visible: asBoolean(source.visible, defaults[key].visible),
      title: asString(source.title, defaults[key].title),
    }
  }

  const contactRaw = raw.contact && typeof raw.contact === 'object' ? raw.contact as Record<string, unknown> : {}

  return {
    about: textSection('about'),
    experience: listSection('experience'),
    education: listSection('education'),
    certifications: listSection('certifications'),
    achievements: listSection('achievements'),
    skills: simpleSection('skills'),
    projects: simpleSection('projects'),
    contact: {
      visible: asBoolean(contactRaw.visible, defaults.contact.visible),
      title: asString(contactRaw.title, defaults.contact.title),
      text: asString(contactRaw.text, defaults.contact.text),
    },
  }
}

export function normalizePortfolioData(value: unknown): PortfolioData | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const username = asString(raw.username)
  const name = asString(raw.name)
  if (!username || !name) return null

  const bio = asString(raw.bio)
  let projects = Array.isArray(raw.projects)
    ? raw.projects.map(normalizeProject).filter((project): project is PortfolioProject => project !== null)
    : []

  // Keep a single featured project. Older v2 links did not have this field, so
  // the first selected project becomes featured during migration.
  const firstFeaturedIndex = projects.findIndex((project) => project.selected && project.featured)
  const featuredIndex = firstFeaturedIndex >= 0 ? firstFeaturedIndex : projects.findIndex((project) => project.selected)
  projects = projects.map((project, index) => ({
    ...project,
    featured: project.selected && index === featuredIndex,
  }))
  const skills = Array.isArray(raw.skills)
    ? raw.skills.filter((skill): skill is string => typeof skill === 'string').slice(0, 24)
    : []

  const heroRaw = raw.hero && typeof raw.hero === 'object' ? raw.hero as Record<string, unknown> : {}
  const appearanceRaw = raw.appearance && typeof raw.appearance === 'object' ? raw.appearance as Record<string, unknown> : {}
  const template = appearanceRaw.template === 'minimal' || appearanceRaw.template === 'creative' ? appearanceRaw.template : 'modern'
  const mode = appearanceRaw.mode === 'light' ? 'light' : 'dark'
  const font = appearanceRaw.font === 'editorial' || appearanceRaw.font === 'mono' ? appearanceRaw.font : 'sans'
  const sections = normalizeSections(raw.sections)
  if (bio.trim() && sections.about.text.trim() === bio.trim()) {
    sections.about = { ...sections.about, visible: false, text: '' }
  }

  return {
    version: PORTFOLIO_SCHEMA_VERSION,
    username,
    avatarUrl: asString(raw.avatarUrl),
    githubAvatarUrl: asString(raw.githubAvatarUrl) || `https://github.com/${encodeURIComponent(username)}.png?size=512`,
    name,
    headline: asString(raw.headline, 'Software developer'),
    bio,
    location: asString(raw.location),
    githubUrl: asString(raw.githubUrl, `https://github.com/${username}`),
    website: asString(raw.website),
    email: asString(raw.email),
    skills,
    projects,
    hero: {
      eyebrow: asString(heroRaw.eyebrow, 'Software developer'),
      status: asString(heroRaw.status),
      showStatus: heroRaw.availabilityConfirmed === true && asBoolean(heroRaw.showStatus, false),
      availabilityConfirmed: heroRaw.availabilityConfirmed === true,
      showImage: asBoolean(heroRaw.showImage, true),
    },
    appearance: {
      template,
      mode,
      accent: normalizeAccent(appearanceRaw.accent),
      font,
    },
    sections,
  }
}

interface PortfolioEnvelope {
  schemaVersion: typeof PORTFOLIO_SCHEMA_VERSION
  portfolio: PortfolioData
}

export function encodePortfolio(data: PortfolioData): string {
  const envelope: PortfolioEnvelope = {
    schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    portfolio: { ...data, projects: data.projects.map((project) => ({ ...project, description: cleanProjectDescription(project.description) })) },
  }
  const json = JSON.stringify(envelope)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodePortfolio(encoded: string): PortfolioData | null {
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown

    if (parsed && typeof parsed === 'object' && 'portfolio' in parsed) {
      return normalizePortfolioData((parsed as Record<string, unknown>).portfolio)
    }

    // Backward compatibility with v1 links that serialized PortfolioData directly.
    return normalizePortfolioData(parsed)
  } catch {
    return null
  }
}

export function buildSharePath(data: PortfolioData): string {
  const publicData: PortfolioData = {
    ...data,
    projects: data.projects.filter((project) => project.selected),
  }
  return `/portfolio/${encodeURIComponent(data.username)}?data=${encodeURIComponent(encodePortfolio(publicData))}`
}

export function futurePortfolioPath(username: string): string {
  return `/${encodeURIComponent(username)}`
}
