import { ExternalLink, GitFork, Github, Globe2, Mail, MapPin, Play, Star } from 'lucide-react'
import type { PortfolioData, PortfolioProject, PortfolioTimelineItem } from '../../types'

export function externalUrl(value: string): string {
  if (!value) return '#'
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

export function gmailComposeUrl(email: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`
}

export function ContactLinks({ data, compact = false }: { data: PortfolioData; compact?: boolean }) {
  return (
    <div className={`tpl-contact-links ${compact ? 'tpl-contact-links-compact' : ''}`}>
      <a href={data.githubUrl} target="_blank" rel="noreferrer"><Github size={16} /> GitHub</a>
      {data.website ? <a href={externalUrl(data.website)} target="_blank" rel="noreferrer"><Globe2 size={16} /> Website</a> : null}
      {data.email ? <a href={gmailComposeUrl(data.email)} target="_blank" rel="noreferrer"><Mail size={16} /> Email</a> : null}
    </div>
  )
}

export function ProfileMeta({ data }: { data: PortfolioData }) {
  return (
    <div className="tpl-profile-meta">
      {data.location ? <span><MapPin size={14} /> {data.location}</span> : null}
      <a href={data.githubUrl} target="_blank" rel="noreferrer"><Github size={14} /> @{data.username}</a>
      {data.website ? <a href={externalUrl(data.website)} target="_blank" rel="noreferrer"><Globe2 size={14} /> Website</a> : null}
    </div>
  )
}


export function selectedProjects(data: PortfolioData): PortfolioProject[] {
  return data.projects
    .filter((project) => project.selected)
    .sort((a, b) => Number(b.featured) - Number(a.featured))
}

export function ProjectActions({ project }: { project: PortfolioProject }) {
  return (
    <div className="tpl-project-actions">
      <a href={project.url} target="_blank" rel="noreferrer"><Github size={13} /> GitHub</a>
      {project.homepage ? <a href={externalUrl(project.homepage)} target="_blank" rel="noreferrer"><Play size={13} /> Live demo</a> : null}
    </div>
  )
}

export function ProjectMeta({ project }: { project: PortfolioProject }) {
  return (
    <div className="tpl-project-meta">
      {project.language ? <span>{project.language}</span> : null}
      {project.stars > 0 ? <span><Star size={12} /> {project.stars}</span> : null}
      {project.forks > 0 ? <span><GitFork size={12} /> {project.forks}</span> : null}
    </div>
  )
}

export function Technologies({ project }: { project: PortfolioProject }) {
  if (!project.technologies.length) return null
  return (
    <div className="tpl-tech-list">
      {project.technologies.slice(0, 5).map((tech) => <span key={tech}>{tech}</span>)}
    </div>
  )
}

export function TimelineItems({ items }: { items: PortfolioTimelineItem[] }) {
  if (!items.length) return <p className="tpl-empty-copy">Add entries in the editor when you are ready to show this section.</p>
  return (
    <div className="tpl-timeline">
      {items.map((item) => (
        <article key={item.id} className="tpl-timeline-item">
          <div className="tpl-timeline-heading">
            <div>
              <h3>{item.title}</h3>
              {item.subtitle ? <p>{item.subtitle}</p> : null}
            </div>
            {item.meta ? <span>{item.meta}</span> : null}
          </div>
          {item.description ? <p className="tpl-timeline-description">{item.description}</p> : null}
          {item.url ? <a className="tpl-inline-link" href={externalUrl(item.url)} target="_blank" rel="noreferrer">View <ExternalLink size={13} /></a> : null}
        </article>
      ))}
    </div>
  )
}

export function SkillsList({ skills }: { skills: string[] }) {
  if (!skills.length) return <p className="tpl-empty-copy">Add the technologies you want recruiters to notice.</p>
  return <div className="tpl-skills">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
}

export function VisibleNav({ data }: { data: PortfolioData }) {
  const links = [
    data.sections.about.visible && ['about', data.sections.about.title],
    data.sections.experience.visible && ['experience', data.sections.experience.title],
    data.sections.education.visible && ['education', data.sections.education.title],
    data.sections.projects.visible && ['projects', data.sections.projects.title],
    data.sections.contact.visible && ['contact', 'Contact'],
  ].filter(Boolean) as [string, string][]

  return (
    <nav aria-label="Portfolio navigation" className="tpl-nav-links">
      {links.slice(0, 5).map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
    </nav>
  )
}

export function RepoFolioAttribution() {
  return <a className="tpl-attribution" href="/?ref=portfolio">Made with RepoFolio</a>
}
