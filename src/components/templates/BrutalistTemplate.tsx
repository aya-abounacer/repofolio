import { ArrowDownRight, ArrowUpRight, ExternalLink, GitFork, Github, Globe2, Mail, MapPin, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { PortfolioData, PortfolioProject, PortfolioTimelineItem } from '../../types'
import { Tiles } from '../ui/tiles'
import { externalUrl, gmailComposeUrl, RepoFolioAttribution, selectedProjects } from './shared'
import './brutalist.css'

function accentTextColor(accent: string) {
  const channel = (offset: number) => {
    const value = parseInt(accent.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  return luminance > 0.45 ? '#0b0b0a' : '#ffffff'
}

export function BrutalistTemplate({ data }: { data: PortfolioData }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState('top')
  const projects = selectedProjects(data)
  const featured = projects.find((project) => project.featured) ?? projects[0]
  const remainingProjects = projects.filter((project) => project.id !== featured?.id)
  const timelineCandidates: [string, PortfolioData['sections']['experience']][] = [
    ['experience', data.sections.experience],
    ['education', data.sections.education],
    ['certifications', data.sections.certifications],
    ['achievements', data.sections.achievements],
  ]
  const timelines = timelineCandidates.filter(([, section]) => section.visible)
  const navLinks: [string, string][] = []
  if (data.sections.projects.visible) navLinks.push(['projects', data.sections.projects.title])
  if (data.sections.about.visible) navLinks.push(['about', data.sections.about.title])
  if (data.sections.skills.visible) navLinks.push(['skills', data.sections.skills.title])
  timelines.forEach(([id, section]) => navLinks.push([id, section.title]))
  if (data.sections.contact.visible) navLinks.push(['contact', 'Contact'])
  let sectionIndex = 0
  const nextNumber = () => String(++sectionIndex).padStart(2, '0')
  const style = { '--brutalist-accent-ink': accentTextColor(data.appearance.accent) } as CSSProperties
  const sectionOrder = ['top', ...navLinks.map(([id]) => id)]
  const activeIndex = Math.max(0, sectionOrder.indexOf(activeSection))
  const nextSection = activeIndex >= sectionOrder.length - 1 ? 'top' : sectionOrder[activeIndex + 1]
  const returningToTop = nextSection === 'top'

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.brutalist-hero[id], .brutalist-section[id], .brutalist-contact[id]'))
    if (!sections.length) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const marker = Math.min(220, window.innerHeight * .32)
        let current = sections[0].id
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= marker) current = section.id
          else break
        }
        setActiveSection(current)
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [sectionOrder.join('|')])

  return <div ref={rootRef} className="brutalist-template tpl-page" style={style}>
    <div className="brutalist-tile-field" aria-hidden="true">
      <div className="brutalist-tile-sticky">
        <Tiles rows={32} cols={24} tileSize="lg" className="brutalist-tiles" tileClassName="brutalist-background-tile" />
      </div>
    </div>
    <div className="brutalist-scroll-progress" aria-hidden="true"><i /></div>
    <header className="brutalist-nav">
      <a href="#top" className="brutalist-mark"><span>RF.</span></a>
      <p className="brutalist-handle">PORTFOLIO OF / @{data.username}</p>
      {navLinks.length ? <nav aria-label="Portfolio navigation">
        {navLinks.slice(0, 5).map(([id, label]) => <a key={id} href={`#${id}`} aria-current={activeSection === id ? 'location' : undefined}>{label}</a>)}
      </nav> : null}
      <a className="brutalist-jump" href={`#${nextSection}`} aria-label={returningToTop ? 'Return to the top' : `Go to the next section: ${navLinks.find(([id]) => id === nextSection)?.[1] ?? 'Portfolio content'}`}>
        {returningToTop ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
      </a>
    </header>

    <main className="brutalist-main">
      <section id="top" className="brutalist-hero" aria-labelledby="brutalist-name">
        <div className="brutalist-hero-copy">
          <div className="brutalist-register"><span>PERSONAL INDEX</span><span>VOL. {String(projects.length).padStart(2, '0')}</span></div>
          <p className="brutalist-role">{data.hero.eyebrow || 'Portfolio'}</p>
          <h1 id="brutalist-name">{data.name.trim().split(/\s+/).map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}</h1>
          {data.headline.trim() ? <p className="brutalist-headline">{data.headline}</p> : null}
          {data.bio.trim() ? <p className="brutalist-bio">{data.bio}</p> : null}
          <BrutalistLinks data={data} />
        </div>

        <aside className="brutalist-profile-poster">
          <div className="brutalist-poster-label"><span>FIG. 001</span><span>IDENTITY</span></div>
          {data.hero.showImage && data.avatarUrl
            ? <figure><img src={data.avatarUrl} alt={`${data.name} profile`} /></figure>
            : <div className="brutalist-monogram" aria-hidden="true">{data.name.slice(0, 1)}</div>}
          <dl>
            <div><dt>HANDLE</dt><dd>@{data.username}</dd></div>
            {data.location.trim() ? <div><dt>BASE</dt><dd><MapPin size={13} />{data.location}</dd></div> : null}
            {data.hero.availabilityConfirmed && data.hero.showStatus && data.hero.status.trim() ? <div><dt>STATUS</dt><dd>{data.hero.status}</dd></div> : null}
          </dl>
        </aside>
      </section>

      {data.sections.projects.visible ? <BrutalistSection id="projects" number={nextNumber()} title={data.sections.projects.title} stamp={`${String(projects.length).padStart(2, '0')} SELECTED`}>
        {featured ? <div className="brutalist-projects">
          <BrutalistProject project={featured} index={1} featured />
          {remainingProjects.map((project, index) => <BrutalistProject key={project.id} project={project} index={index + 2} />)}
        </div> : <p className="brutalist-empty">NO PROJECTS PUBLISHED YET.</p>}
      </BrutalistSection> : null}

      {data.sections.about.visible ? <BrutalistSection id="about" number={nextNumber()} title={data.sections.about.title} stamp="FIELD NOTES">
        <div className="brutalist-about">
          <span aria-hidden="true">“</span>
          <p>{data.sections.about.text}</p>
          <strong>@{data.username}</strong>
        </div>
      </BrutalistSection> : null}

      {data.sections.skills.visible ? <BrutalistSection id="skills" number={nextNumber()} title={data.sections.skills.title} stamp={`${String(data.skills.length).padStart(2, '0')} CAPABILITIES`}>
        {data.skills.length ? <ol className="brutalist-skills">
          {data.skills.map((skill, index) => <li key={skill}><span>{String(index + 1).padStart(2, '0')}</span><strong>{skill}</strong><ArrowUpRight aria-hidden="true" size={18} /></li>)}
        </ol> : <p className="brutalist-empty">NO SKILLS PUBLISHED YET.</p>}
      </BrutalistSection> : null}

      {timelines.map(([id, section]) => <BrutalistSection key={id} id={id} number={nextNumber()} title={section.title} stamp={`${String(section.items.length).padStart(2, '0')} RECORDS`}>
        <BrutalistRecords items={section.items} />
      </BrutalistSection>)}

      {data.sections.contact.visible ? <section id="contact" className="brutalist-contact">
        <div className="brutalist-contact-index"><span>{nextNumber()}</span><span>CONTACT</span></div>
        <div className="brutalist-contact-copy">
          <h2>{data.sections.contact.title}</h2>
          {data.sections.contact.text.trim() ? <p>{data.sections.contact.text}</p> : null}
          <BrutalistLinks data={data} />
        </div>
        <a href="#top" className="brutalist-contact-return" aria-label="Return to the top">
          <ArrowUpRight className="brutalist-contact-arrow" aria-hidden="true" />
        </a>
      </section> : null}
    </main>

    <footer className="brutalist-footer">
      <span>© {new Date().getFullYear()} / {data.name}</span>
      <span>END OF INDEX</span>
      <RepoFolioAttribution />
    </footer>
  </div>
}

function BrutalistSection({ id, number, title, stamp, children }: { id: string; number: string; title: string; stamp: string; children: ReactNode }) {
  return <section id={id} className="brutalist-section">
    <header className="brutalist-section-heading">
      <span>{number}</span>
      <h2>{title}</h2>
      <p>[ {stamp} ]</p>
    </header>
    {children}
  </section>
}

function BrutalistProject({ project, index, featured = false }: { project: PortfolioProject; index: number; featured?: boolean }) {
  const technologies = project.technologies.length ? project.technologies : project.language ? [project.language] : []
  return <article className={`brutalist-project${featured ? ' brutalist-project-featured' : ''}`}>
    <div className="brutalist-project-index"><span>{String(index).padStart(2, '0')}</span>{featured ? <strong>FEATURED</strong> : null}</div>
    <div className="brutalist-project-copy">
      <h3>{project.title}</h3>
      {project.description.trim() ? <p>{project.description}</p> : null}
      {technologies.length ? <div className="brutalist-project-stack">{technologies.map((technology) => <span key={technology}>{technology}</span>)}</div> : null}
    </div>
    <div className="brutalist-project-data">
      {project.language ? <span>LANG / {project.language}</span> : null}
      {project.stars > 0 ? <span><Star size={12} /> {project.stars}</span> : null}
      {project.forks > 0 ? <span><GitFork size={12} /> {project.forks}</span> : null}
    </div>
    <div className="brutalist-project-links">
      <a href={project.url} target="_blank" rel="noreferrer"><Github size={15} /> SOURCE <ArrowUpRight size={14} /></a>
      {project.homepage ? <a href={externalUrl(project.homepage)} target="_blank" rel="noreferrer"><Globe2 size={15} /> Live demo <ArrowUpRight size={14} /></a> : null}
    </div>
  </article>
}

function BrutalistRecords({ items }: { items: PortfolioTimelineItem[] }) {
  if (!items.length) return <p className="brutalist-empty">NO RECORDS PUBLISHED.</p>
  return <div className="brutalist-records">
    {items.map((item, index) => <article key={item.id}>
      <span className="brutalist-record-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="brutalist-record-title"><h3>{item.title}</h3>{item.subtitle ? <p>{item.subtitle}</p> : null}</div>
      {item.description ? <p className="brutalist-record-description">{item.description}</p> : null}
      <div className="brutalist-record-meta">{item.meta ? <span>{item.meta}</span> : null}{item.url ? <a href={externalUrl(item.url)} target="_blank" rel="noreferrer">VIEW <ExternalLink size={12} /></a> : null}</div>
    </article>)}
  </div>
}

function BrutalistLinks({ data }: { data: PortfolioData }) {
  return <div className="brutalist-links">
    <a href={data.githubUrl} target="_blank" rel="noreferrer"><Github size={16} /> GITHUB <ArrowUpRight size={13} /></a>
    {data.website ? <a href={externalUrl(data.website)} target="_blank" rel="noreferrer"><Globe2 size={16} /> WEBSITE <ArrowUpRight size={13} /></a> : null}
    {data.email ? <a href={gmailComposeUrl(data.email)} target="_blank" rel="noreferrer"><Mail size={16} /> EMAIL <ArrowUpRight size={13} /></a> : null}
  </div>
}
