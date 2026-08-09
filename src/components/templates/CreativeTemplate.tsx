import { ArrowUpRight, ExternalLink, GitFork, Github, Globe2, Mail, MapPin, Star } from 'lucide-react'
import type { PortfolioData, PortfolioProject, PortfolioTimelineItem } from '../../types'
import { externalUrl, gmailComposeUrl, ProjectActions, RepoFolioAttribution, selectedProjects, VisibleNav } from './shared'

export function CreativeTemplate({ data }: { data: PortfolioData }) {
  const projects = selectedProjects(data)
  const [featuredProject, ...otherProjects] = projects
  let sectionNumber = 1
  const nextNumber = () => String(sectionNumber++).padStart(2, '0')

  return (
    <div className="creative-template tpl-page">
      <header className="tpl-nav creative-nav">
        <a href="#top" className="creative-brand">
          <strong>{data.name}</strong>
          <span>@{data.username}</span>
        </a>
        <VisibleNav data={data} />
      </header>

      <main id="top" className="tpl-main creative-main">
        <section className="creative-hero">
          <div className="creative-hero-copy">
            <div className="creative-hero-topline">
              <span>{data.hero.eyebrow || 'Developer portfolio'}</span>
              {data.location ? <span><MapPin size={12} /> {data.location}</span> : null}
            </div>

            <h1 className="creative-name">
              {splitName(data.name).map((line) => <span key={line}>{line}</span>)}
            </h1>

            <div className="creative-hero-bottom">
              <p className="creative-headline">{data.headline}</p>
              <div className="creative-hero-summary">
                <p>{data.bio}</p>
                <CreativeHeroLinks data={data} />
              </div>
            </div>
          </div>

          <div className="creative-portrait-column">
            <div className="creative-portrait-accent" aria-hidden="true" />
            <figure className="creative-portrait">
              {data.hero.showImage && data.avatarUrl
                ? <img src={data.avatarUrl} alt={`${data.name} profile`} />
                : <div className="creative-avatar-placeholder">{data.name.slice(0, 1)}</div>}
            </figure>
            <div className="creative-portrait-meta">
              <span>GitHub / @{data.username}</span>
              {data.hero.showStatus && data.hero.status ? <strong>{data.hero.status}</strong> : null}
            </div>
          </div>
        </section>

        <div className="creative-ticker" aria-label="Portfolio metadata">
          <div className="creative-ticker-track">
            <span>{data.hero.eyebrow || 'Software developer'}</span>
            <i />
            <span>{data.location || 'Available remotely'}</span>
            <i />
            <span>{data.hero.status || 'Open to interesting work'}</span>
            <i />
            <span>GitHub @{data.username}</span>
            <i />
            <span aria-hidden="true">{data.hero.eyebrow || 'Software developer'}</span>
            <i aria-hidden="true" />
            <span aria-hidden="true">{data.location || 'Available remotely'}</span>
            <i aria-hidden="true" />
          </div>
        </div>

        {data.sections.about.visible ? (
          <CreativeSection id="about" number={nextNumber()} label={data.sections.about.title}>
            <div className="creative-about-layout">
              <h2>{data.sections.about.title}</h2>
              <div>
                <p className="creative-large-copy">{data.sections.about.text}</p>
                <dl className="creative-facts">
                  {data.location ? <div><dt>Based</dt><dd>{data.location}</dd></div> : null}
                  <div><dt>GitHub</dt><dd>@{data.username}</dd></div>
                  {data.website ? <div><dt>Web</dt><dd>Portfolio / personal site</dd></div> : null}
                </dl>
              </div>
            </div>
          </CreativeSection>
        ) : null}

        {data.sections.skills.visible ? (
          <CreativeSection id="skills" number={nextNumber()} label={data.sections.skills.title}>
            <div className="creative-skills-layout">
              <h2>{data.sections.skills.title}</h2>
              <CreativeSkills skills={data.skills} />
            </div>
          </CreativeSection>
        ) : null}

        {data.sections.experience.visible ? (
          <CreativeSection id="experience" number={nextNumber()} label={data.sections.experience.title}>
            <CreativeTimeline title={data.sections.experience.title} items={data.sections.experience.items} />
          </CreativeSection>
        ) : null}

        {data.sections.education.visible ? (
          <CreativeSection id="education" number={nextNumber()} label={data.sections.education.title}>
            <CreativeTimeline title={data.sections.education.title} items={data.sections.education.items} />
          </CreativeSection>
        ) : null}

        {data.sections.certifications.visible ? (
          <CreativeSection id="certifications" number={nextNumber()} label={data.sections.certifications.title}>
            <CreativeTimeline title={data.sections.certifications.title} items={data.sections.certifications.items} />
          </CreativeSection>
        ) : null}

        {data.sections.achievements.visible ? (
          <CreativeSection id="achievements" number={nextNumber()} label={data.sections.achievements.title}>
            <CreativeTimeline title={data.sections.achievements.title} items={data.sections.achievements.items} />
          </CreativeSection>
        ) : null}

        {data.sections.projects.visible ? (
          <CreativeSection id="projects" number={nextNumber()} label={data.sections.projects.title} className="creative-work-section">
            <div className="creative-work-heading">
              <h2>{data.sections.projects.title}</h2>
              <p>Selected repositories, arranged by importance rather than as a wall of identical cards.</p>
            </div>

            {featuredProject ? (
              <article className="creative-featured-project">
                <div className="creative-featured-number">01</div>
                <div className="creative-featured-copy">
                  <span className="creative-project-label">Featured project</span>
                  <h3>{featuredProject.title}</h3>
                  <p>{featuredProject.description}</p>
                  <CreativeTechLine project={featuredProject} />
                  <ProjectActions project={featuredProject} />
                </div>
                <div className="creative-featured-meta">
                  <CreativeStats project={featuredProject} />
                  <ArrowUpRight size={28} />
                </div>
              </article>
            ) : <div className="tpl-empty-state">Select at least one repository to show your work here.</div>}

            {otherProjects.length ? (
              <div className="creative-project-list">
                {otherProjects.map((project, index) => (
                  <article
                    key={project.id}
                    className={`creative-project-row ${index % 2 ? 'creative-project-row-shift' : ''}`}
                  >
                    <span className="creative-project-index">{String(index + 2).padStart(2, '0')}</span>
                    <div className="creative-project-copy">
                      <h3>{project.title}</h3>
                      <p>{project.description}</p>
                      <ProjectActions project={project} />
                    </div>
                    <div className="creative-project-side">
                      <CreativeTechLine project={project} />
                      <CreativeStats project={project} />
                    </div>
                    <ArrowUpRight className="creative-project-arrow" size={18} />
                  </article>
                ))}
              </div>
            ) : null}
          </CreativeSection>
        ) : null}

        {data.sections.contact.visible ? (
          <section id="contact" className="creative-contact">
            <div className="creative-contact-index">{nextNumber()}</div>
            <div className="creative-contact-copy">
              <span>Contact</span>
              <h2>{data.sections.contact.title}</h2>
              <p>{data.sections.contact.text}</p>
            </div>
            <div className="creative-contact-links">
              <a href={data.githubUrl} target="_blank" rel="noreferrer"><Github size={16} /> GitHub <ArrowUpRight size={13} /></a>
              {data.website ? <a href={externalUrl(data.website)} target="_blank" rel="noreferrer"><Globe2 size={16} /> Website <ArrowUpRight size={13} /></a> : null}
              {data.email ? <a href={gmailComposeUrl(data.email)} target="_blank" rel="noreferrer"><Mail size={16} /> Email <ArrowUpRight size={13} /></a> : null}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="tpl-footer creative-footer">
        <span>© {new Date().getFullYear()} {data.name}</span>
        <RepoFolioAttribution />
      </footer>
    </div>
  )
}

function CreativeSection({ id, number, label, children, className = '' }: { id: string; number: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`creative-section ${className}`}>
      <aside className="creative-section-marker">
        <strong>{number}</strong>
        <span>{label}</span>
      </aside>
      <div className="creative-section-content">{children}</div>
    </section>
  )
}

function CreativeHeroLinks({ data }: { data: PortfolioData }) {
  return (
    <div className="creative-hero-links">
      <a href={data.githubUrl} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a>
      {data.website ? <a href={externalUrl(data.website)} target="_blank" rel="noreferrer">Website <ArrowUpRight size={13} /></a> : null}
      {data.email ? <a href={gmailComposeUrl(data.email)} target="_blank" rel="noreferrer">Email <ArrowUpRight size={13} /></a> : null}
    </div>
  )
}

function CreativeSkills({ skills }: { skills: string[] }) {
  if (!skills.length) return <p className="tpl-empty-copy">Add the technologies you want recruiters to notice.</p>

  return (
    <ol className="creative-skills-list">
      {skills.map((skill, index) => (
        <li key={skill}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{skill}</strong>
        </li>
      ))}
    </ol>
  )
}

function CreativeTimeline({ title, items }: { title: string; items: PortfolioTimelineItem[] }) {
  return (
    <div className="creative-timeline-layout">
      <h2>{title}</h2>
      {items.length ? (
        <div className="creative-timeline">
          {items.map((item) => (
            <article key={item.id} className="creative-timeline-row">
              <div className="creative-timeline-meta">{item.meta || '—'}</div>
              <div className="creative-timeline-copy">
                <h3>{item.title}</h3>
                {item.subtitle ? <p className="creative-timeline-subtitle">{item.subtitle}</p> : null}
                {item.description ? <p className="creative-timeline-description">{item.description}</p> : null}
                {item.url ? <a href={externalUrl(item.url)} target="_blank" rel="noreferrer">View details <ExternalLink size={12} /></a> : null}
              </div>
            </article>
          ))}
        </div>
      ) : <p className="tpl-empty-copy">Add entries in the editor when this section is ready.</p>}
    </div>
  )
}

function CreativeTechLine({ project }: { project: PortfolioProject }) {
  const technologies = project.technologies.length ? project.technologies : project.language ? [project.language] : []
  if (!technologies.length) return null
  return <div className="creative-tech-line">{technologies.slice(0, 5).join(' / ')}</div>
}

function CreativeStats({ project }: { project: PortfolioProject }) {
  return (
    <div className="creative-project-stats">
      {project.language ? <span>{project.language}</span> : null}
      {project.stars > 0 ? <span><Star size={11} /> {project.stars}</span> : null}
      {project.forks > 0 ? <span><GitFork size={11} /> {project.forks}</span> : null}
    </div>
  )
}

function splitName(name: string): string[] {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return [name]
  if (parts.length === 2) return parts
  return [parts.slice(0, Math.ceil(parts.length / 2)).join(' '), parts.slice(Math.ceil(parts.length / 2)).join(' ')]
}
