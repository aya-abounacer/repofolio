export interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
  name: string | null
  bio: string | null
  location: string | null
  blog: string | null
  email: string | null
  public_repos: number
  followers: number
  following: number
}

export interface GitHubRepo {
  id: number
  name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  fork: boolean
  archived: boolean
  pushed_at: string
  topics?: string[]
}

export type PortfolioTemplate = 'minimal' | 'modern' | 'creative'
export type PortfolioColorMode = 'dark' | 'light'
export type PortfolioFont = 'sans' | 'editorial' | 'mono'

export interface PortfolioAppearance {
  template: PortfolioTemplate
  mode: PortfolioColorMode
  accent: string
  font: PortfolioFont
}

export interface PortfolioHero {
  eyebrow: string
  status: string
  showStatus: boolean
  showImage: boolean
}

export interface PortfolioProject {
  id: number
  originalName: string
  title: string
  description: string
  url: string
  homepage: string
  language: string
  technologies: string[]
  stars: number
  forks: number
  selected: boolean
  featured: boolean
}

export interface PortfolioTimelineItem {
  id: string
  title: string
  subtitle: string
  meta: string
  description: string
  url?: string
}

export interface TextPortfolioSection {
  visible: boolean
  title: string
  text: string
}

export interface ListPortfolioSection {
  visible: boolean
  title: string
  items: PortfolioTimelineItem[]
}

export interface PortfolioSections {
  about: TextPortfolioSection
  experience: ListPortfolioSection
  education: ListPortfolioSection
  certifications: ListPortfolioSection
  achievements: ListPortfolioSection
  skills: { visible: boolean; title: string }
  projects: { visible: boolean; title: string }
  contact: { visible: boolean; title: string; text: string }
}

export interface PortfolioData {
  version: 3
  username: string
  avatarUrl: string
  name: string
  headline: string
  bio: string
  location: string
  githubUrl: string
  website: string
  email: string
  skills: string[]
  projects: PortfolioProject[]
  hero: PortfolioHero
  appearance: PortfolioAppearance
  sections: PortfolioSections
}
