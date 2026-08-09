import type { PortfolioData } from '../types'

export interface ReadinessItem {
  id: 'profile' | 'about' | 'projects' | 'background' | 'contact'
  label: string
  complete: boolean
}

export interface PortfolioReadiness {
  items: ReadinessItem[]
  completed: number
  total: number
  percent: number
  ready: boolean
}

export function getPortfolioReadiness(data: PortfolioData): PortfolioReadiness {
  const selectedProjects = data.projects.filter((project) => project.selected)
  const hasBackground =
    (data.sections.experience.visible && data.sections.experience.items.some((item) => item.title.trim())) ||
    (data.sections.education.visible && data.sections.education.items.some((item) => item.title.trim()))

  const items: ReadinessItem[] = [
    {
      id: 'profile',
      label: 'Strong profile intro',
      complete: Boolean(data.name.trim() && data.headline.trim() && data.bio.trim().length >= 20),
    },
    {
      id: 'about',
      label: 'About section',
      complete: data.sections.about.visible && data.sections.about.text.trim().length >= 20,
    },
    {
      id: 'projects',
      label: 'At least 3 selected projects',
      complete: selectedProjects.length >= 3 || (data.projects.length > 0 && selectedProjects.length === data.projects.length),
    },
    {
      id: 'background',
      label: 'Experience or education',
      complete: hasBackground,
    },
    {
      id: 'contact',
      label: 'Contact route beyond GitHub',
      complete: Boolean(data.email.trim() || data.website.trim()),
    },
  ]

  const completed = items.filter((item) => item.complete).length
  const total = items.length
  return {
    items,
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    ready: completed >= 4,
  }
}
