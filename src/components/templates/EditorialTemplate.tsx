import { ChevronDown } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import type { CSSProperties } from 'react'
import type { PortfolioData, PortfolioTimelineItem } from '../../types'
import { ContactLinks, ProfileMeta, ProjectActions, RepoFolioAttribution, selectedProjects, TimelineItems, VisibleNav } from './shared'
import './editorial.css'

const timelineKeys = ['experience', 'education', 'certifications', 'achievements'] as const

function hasEntryContent(item: PortfolioTimelineItem) {
  return [item.title, item.subtitle, item.meta, item.description, item.url].some(value => value?.trim())
}

function accentTextColor(accent: string) {
  const channel = (offset: number) => {
    const value = parseInt(accent.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  return luminance > 0.45 ? '#0b0b0a' : '#ffffff'
}

function EditorialName({ name }: { name: string }) {
  const reducedMotion = useReducedMotion()
  return <motion.h1 id="editorial-name" aria-label={name} style={{ '--editorial-name-length': Math.max(1, ...name.trim().split(/\s+/).map(word => word.length)) } as CSSProperties} initial={reducedMotion ? false : 'hidden'} whileInView="visible" viewport={{ once: true, amount: .4 }}>
    {name.trim().split(/\s+/).map((word, index) => <span className="editorial-name-mask" aria-hidden="true" key={`${index}-${word}`}>
      <motion.span className="editorial-name-word" variants={{ hidden: { y: '112%', rotate: 2, opacity: 0 }, visible: { y: '0%', rotate: 0, opacity: 1 } }} transition={{ duration: reducedMotion ? 0 : 1.15, delay: reducedMotion ? 0 : .15 + index * .14, ease: [.16, 1, .3, 1] }}>{word}</motion.span>
      {' '}
    </span>)}
  </motion.h1>
}

function EditorialPrint() {
  return <div className="editorial-artwork" aria-hidden="true" />
}

export function EditorialTemplate({ data }: { data: PortfolioData }) {
  const projects = selectedProjects(data)
  const showProjects = data.sections.projects.visible && projects.length > 0
  const showAbout = data.sections.about.visible && Boolean(data.sections.about.text.trim())
  const skills = data.skills.filter(skill => skill.trim())
  const showSkills = data.sections.skills.visible && skills.length > 0
  const timelines = timelineKeys.map(id => ({
    id,
    section: data.sections[id],
    items: data.sections[id].items.filter(hasEntryContent),
  })).filter(({ section, items }) => section.visible && items.length > 0)
  const navLinks: [string, string][] = []
  if (showProjects) navLinks.push(['projects', data.sections.projects.title])
  if (showAbout) navLinks.push(['about', data.sections.about.title])
  timelines.forEach(({ id, section }) => navLinks.push([id, section.title]))
  if (showSkills) navLinks.push(['skills', data.sections.skills.title])
  if (data.sections.contact.visible) navLinks.push(['contact', 'Contact'])
  const showPortrait = data.hero.showImage && Boolean(data.avatarUrl)
  const showStatus = data.hero.availabilityConfirmed && data.hero.showStatus && data.hero.status.trim()
  const hasIdentity = showPortrait || data.hero.eyebrow.trim() || showStatus
  let sectionNumber = 0
  const nextSectionNumber = () => String(++sectionNumber).padStart(2, '0')
  const style = { '--editorial-accent-ink': accentTextColor(data.appearance.accent), '--editorial-nav-count': navLinks.length } as CSSProperties

  return <div className="editorial-template tpl-page" style={style}>
    <div className="editorial-sheet">
    <div className="editorial-grid" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => <span key={index} />)}
    </div>
    <header className="editorial-masthead editorial-width">
      <a href="#top" className="editorial-signature">@{data.username}</a>
      {navLinks.length > 0 ? <>
        <details className="editorial-contents">
          <summary>Contents <ChevronDown size={15} aria-hidden="true" /></summary>
          <div onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) {
              const details = event.currentTarget.closest('details')
              if (details) details.open = false
            }
          }}><VisibleNav data={data} links={navLinks} /></div>
        </details>
      </> : null}
    </header>

    <main id="top" className="editorial-width">
      <section className={`editorial-hero${hasIdentity ? '' : ' editorial-hero-solo'}`} aria-labelledby="editorial-name">
        {hasIdentity ? <div className="editorial-identity">
          {showPortrait ? <img src={data.avatarUrl} alt={`${data.name} profile`} className="editorial-portrait" width={192} height={192} /> : null}
          <div>
            {data.hero.eyebrow.trim() ? <p className="editorial-role">{data.hero.eyebrow}</p> : null}
            {showStatus ? <p className="editorial-status">{data.hero.status}</p> : null}
          </div>
        </div> : null}
        <div className="editorial-introduction">
          <div className="editorial-hero-meta" aria-hidden="true">
            <span>@{data.username}</span>
            <span>{data.location.trim() ? data.location : `github.com/${data.username}`}</span>
          </div>
          <EditorialName name={data.name} />
          <div className="editorial-hero-details">
            <div className="editorial-hero-copy">
              {data.headline.trim() ? <p className="editorial-headline">{data.headline}</p> : null}
              {data.bio.trim() ? <p className="editorial-bio">{data.bio}</p> : null}
              <ProfileMeta data={data} />
            </div>
            <EditorialPrint />
          </div>
        </div>
      </section>

      {showProjects ? <section id="projects" className="editorial-work" aria-labelledby="editorial-work-title">
        <div className="editorial-section-heading">
          <div className="editorial-section-key"><span>{nextSectionNumber()}</span><h2 id="editorial-work-title">{data.sections.projects.title}</h2></div>
          <span className="editorial-count">{String(projects.length).padStart(2, '0')} {projects.length === 1 ? 'project' : 'projects'}</span>
        </div>
        <div className="editorial-projects">
          {projects.map((project, index) => {
            const technologies = project.technologies.filter(tech => tech.trim())
            const stack = technologies.length ? technologies : project.language ? [project.language] : []
            return <article key={project.id} className={`editorial-project${project.featured ? ' editorial-project-featured' : ''}${project.description.trim() ? '' : ' editorial-project-compact'}`}>
              <div className="editorial-project-margin">
                <span className="editorial-project-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                {project.featured ? <span className="editorial-featured">Featured</span> : null}
              </div>
              <div className="editorial-project-copy">
                <span className="editorial-project-label">Selected / {project.featured ? 'featured' : 'project'}</span>
                <h3>{project.title}</h3>
                {project.description.trim() ? <p className="editorial-project-description">{project.description}</p> : null}
                {stack.length > 0 ? <p className="editorial-stack"><span className="editorial-meta-label">Stack</span>{stack.join(' / ')}</p> : null}
                <div className="editorial-project-bottom">
                  <ProjectActions project={project} directional />
                  {project.stars > 0 || project.forks > 0 ? <p className="editorial-project-stats">
                    {project.stars > 0 ? <span>{project.stars} {project.stars === 1 ? 'star' : 'stars'}</span> : null}
                    {project.forks > 0 ? <span>{project.forks} {project.forks === 1 ? 'fork' : 'forks'}</span> : null}
                  </p> : null}
                </div>
              </div>
            </article>
          })}
        </div>
      </section> : null}

      {showAbout ? <section id="about" className="editorial-section" aria-labelledby="editorial-about-title">
        <div className="editorial-section-key"><span>{nextSectionNumber()}</span><h2 id="editorial-about-title">{data.sections.about.title}</h2></div>
        <p className="editorial-about-copy">{data.sections.about.text}</p>
      </section> : null}

      {timelines.map(({ id, section, items }) => <section key={id} id={id} className="editorial-section" aria-labelledby={`editorial-${id}-title`}>
        <div className="editorial-section-key"><span>{nextSectionNumber()}</span><h2 id={`editorial-${id}-title`}>{section.title}</h2></div>
        <TimelineItems items={items} />
      </section>)}

      {showSkills ? <section id="skills" className="editorial-section" aria-labelledby="editorial-skills-title">
        <div className="editorial-section-key"><span>{nextSectionNumber()}</span><h2 id="editorial-skills-title">{data.sections.skills.title}</h2></div>
        <ul className="editorial-skills">{skills.map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}</ul>
      </section> : null}

      {data.sections.contact.visible ? <section id="contact" className="editorial-section editorial-contact" aria-labelledby="editorial-contact-title">
        <div className="editorial-section-key"><span>{nextSectionNumber()}</span><span className="editorial-section-label">Contact</span></div>
        <div>
          <h2 id="editorial-contact-title">{data.sections.contact.title}</h2>
          {data.sections.contact.text.trim() ? <p>{data.sections.contact.text}</p> : null}
          <ContactLinks data={data} />
        </div>
      </section> : null}
    </main>

    <footer className="editorial-footer editorial-width">
      <span>{data.name}</span>
      <RepoFolioAttribution />
    </footer>
    </div>
    {navLinks.length > 0 ? <aside className="editorial-rail">
      <nav className="editorial-desktop-nav" aria-label="Portfolio sections">
        {navLinks.map(([id, label], index) => <a href={`#${id}`} key={id}>
          <span className="editorial-tab-label">{label}</span>
          <span className="editorial-tab-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        </a>)}
      </nav>
    </aside> : null}
  </div>
}
