import { useEffect, useRef, type CSSProperties } from 'react'
import { MapPin } from 'lucide-react'
import type { PortfolioData, PortfolioProject } from '../../types'
import { ContactLinks, ProjectActions, RepoFolioAttribution, selectedProjects, TimelineItems, VisibleNav } from './shared'
import './studio.css'

const timelineKeys = ['experience', 'education', 'certifications', 'achievements'] as const

// The featured project is a solid user-selected accent, so its ink is calculated
// instead of assuming that every accent is light or dark.
function accentTextColor(accent: string) {
  const channels = [1, 3, 5].map(offset => {
    const value = parseInt(accent.slice(offset, offset + 2), 16) / 255
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
  })
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
  return luminance > .179 ? '#000000' : '#ffffff'
}

export function StudioTemplate({ data }: { data: PortfolioData }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const projects = selectedProjects(data)
  const showProjects = data.sections.projects.visible && projects.length > 0
  const showAbout = data.sections.about.visible && Boolean(data.sections.about.text.trim())
  const skills = data.skills.filter(skill => skill.trim())
  const showSkills = data.sections.skills.visible && skills.length > 0
  const timelines = timelineKeys.map(id => ({
    id,
    section: data.sections[id],
    items: data.sections[id].items.filter(item => [item.title, item.subtitle, item.meta, item.description, item.url].some(value => value?.trim())),
  })).filter(({ section, items }) => section.visible && items.length > 0)
  const navLinks: [string, string][] = []
  if (showProjects) navLinks.push(['projects', data.sections.projects.title])
  if (showAbout) navLinks.push(['about', data.sections.about.title])
  if (data.sections.contact.visible) navLinks.push(['contact', 'Contact'])
  const showPortrait = data.hero.showImage && Boolean(data.avatarUrl)
  const showStatus = data.hero.availabilityConfirmed && data.hero.showStatus && data.hero.status.trim()

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cleanup: () => void = () => {}
    let cancelled = false

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, triggerModule]) => {
      if (cancelled || !rootRef.current) return
      const gsap = gsapModule.gsap
      const ScrollTrigger = triggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)
      const context = gsap.context(() => {
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
        intro
          .from('.workshop-cover-index', { x: -14, duration: .55 })
          .from('.workshop-cover-copy > *', { y: 24, duration: .65, stagger: .08 }, '-=.35')
          .from('.workshop-photo-frame', { y: 20, scale: .97, duration: .75 }, '-=.55')
          .from('.workshop-cover-facts > *', { y: 10, duration: .4, stagger: .06 }, '-=.25')

        gsap.utils.toArray<HTMLElement>('.workshop-project').forEach(project => {
          gsap.from(project, {
            y: 28,
            duration: .7,
            ease: 'power3.out',
            scrollTrigger: { trigger: project, start: 'top 88%', once: true },
          })
        })

        const photo = root.querySelector<HTMLElement>('.workshop-photo')
        if (photo && window.matchMedia('(min-width: 901px)').matches && !root.closest('.portfolio-embedded')) {
          gsap.to(photo, {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: { trigger: '.workshop-cover', start: 'top top', end: 'bottom top', scrub: .5 },
          })
        }
      }, root)
      cleanup = () => context.revert()
    }).catch(() => undefined)

    return () => {
      cancelled = true
      cleanup()
    }
  }, [data.username])

  const rootStyle = {
    '--workshop-feature-ink': accentTextColor(data.appearance.accent),
  } as CSSProperties

  return <div ref={rootRef} className="studio-template tpl-page" style={rootStyle}>
    <header className="workshop-nav workshop-width">
      <a className="workshop-signature" href="#top"><i aria-hidden="true" />@{data.username}</a>
      {navLinks.length > 0 ? <VisibleNav data={data} links={navLinks} /> : null}
    </header>

    <main id="top" className="workshop-width">
      <section className="workshop-cover" aria-labelledby="workshop-name">
        <div className="workshop-cover-index" aria-hidden="true">
          <span>Atelier</span>
          <b>{String(projects.length).padStart(2, '0')}</b>
          <i />
        </div>

        <div className="workshop-cover-copy">
          {data.hero.eyebrow.trim() ? <p className="workshop-role">{data.hero.eyebrow}</p> : null}
          <h1 id="workshop-name"><span>{data.name}</span></h1>
          {data.headline.trim() ? <p className="workshop-headline">{data.headline}</p> : null}
          <ContactLinks data={data} compact />
        </div>

        <div className={`workshop-cover-visual${showPortrait ? '' : ' workshop-cover-visual-text-only'}`}>
          {showPortrait ? <div className="workshop-photo-frame"><img className="workshop-photo" src={data.avatarUrl} alt={`${data.name} profile`} width={320} height={400} /></div> : null}
          <div className="workshop-cover-facts">
            {showStatus ? <p className="workshop-status"><i aria-hidden="true" />{data.hero.status}</p> : null}
            {data.location.trim() ? <p className="workshop-location"><MapPin size={15} aria-hidden="true" />{data.location}</p> : null}
          </div>
        </div>

        {data.bio.trim() ? <p className="workshop-bio">{data.bio}</p> : null}
      </section>

      {showProjects ? <section id="projects" className="workshop-work workshop-split-section" aria-labelledby="workshop-projects-title">
        <header className="workshop-section-guide">
          <p>Work index</p>
          <h2 id="workshop-projects-title">{data.sections.projects.title}</h2>
          <span>{String(projects.length).padStart(2, '0')} {projects.length === 1 ? 'project' : 'projects'}</span>
        </header>
        <div className="workshop-project-list">
          {projects.map((project, index) => <StudioProject key={project.id} project={project} index={index + 1} />)}
        </div>
      </section> : null}

      {showAbout ? <section id="about" className="workshop-notes workshop-split-section" aria-labelledby="workshop-about-title">
        <header className="workshop-section-guide">
          <p>Profile note</p>
          <h2 id="workshop-about-title">{data.sections.about.title}</h2>
        </header>
        <p className="workshop-prose">{data.sections.about.text}</p>
      </section> : null}

      {showSkills ? <section id="skills" className="workshop-skills-section workshop-split-section" aria-labelledby="workshop-skills-title">
        <header className="workshop-section-guide">
          <p>Toolbox</p>
          <h2 id="workshop-skills-title">{data.sections.skills.title}</h2>
        </header>
        <ol className="workshop-skills">{skills.map((skill, index) => <li key={`${skill}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{skill}</li>)}</ol>
      </section> : null}

      {timelines.map(({ id, section, items }) => <section key={id} id={id} className="workshop-resume workshop-split-section" aria-labelledby={`workshop-${id}-title`}>
        <header className="workshop-section-guide">
          <p>Record</p>
          <h2 id={`workshop-${id}-title`}>{section.title}</h2>
        </header>
        <TimelineItems items={items} />
      </section>)}

      {data.sections.contact.visible ? <section id="contact" className="workshop-contact workshop-split-section" aria-labelledby="workshop-contact-title">
        <header className="workshop-section-guide"><p>Next</p><h2 id="workshop-contact-title">{data.sections.contact.title}</h2></header>
        <div>
          {data.sections.contact.text.trim() ? <p className="workshop-prose">{data.sections.contact.text}</p> : null}
          <ContactLinks data={data} />
        </div>
      </section> : null}
    </main>

    <footer className="workshop-footer workshop-width">
      <span>{data.name}</span>
      <RepoFolioAttribution />
    </footer>
  </div>
}

function StudioProject({ project, index }: { project: PortfolioProject; index: number }) {
  const technologies = project.technologies.filter(technology => technology.trim())
  const stack = technologies.length ? technologies : project.language.trim() ? [project.language] : []
  return <article className={`workshop-project${project.featured ? ' workshop-project-featured' : ''}`}>
    <div className="workshop-project-index" aria-hidden="true"><span>{String(index).padStart(2, '0')}</span><i /></div>
    <div className="workshop-project-body">
      {project.featured ? <p className="workshop-project-label">Featured project</p> : null}
      <h3>{project.title}</h3>
      {project.description.trim() ? <p className="workshop-project-description">{project.description}</p> : null}
      {stack.length > 0 ? <p className="workshop-stack"><span>Stack</span>{stack.join(' · ')}</p> : null}
      <div className="workshop-project-bottom">
        <ProjectActions project={project} directional />
        {project.stars > 0 || project.forks > 0 ? <p className="workshop-project-stats">
          {project.stars > 0 ? <span>{project.stars} {project.stars === 1 ? 'star' : 'stars'}</span> : null}
          {project.forks > 0 ? <span>{project.forks} {project.forks === 1 ? 'fork' : 'forks'}</span> : null}
        </p> : null}
      </div>
    </div>
  </article>
}
