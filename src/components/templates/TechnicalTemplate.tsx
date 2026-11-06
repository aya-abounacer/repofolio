import { useEffect, useRef, useState } from 'react'
import { Blocks, Code2, Files, GitBranch, MapPin, Search } from 'lucide-react'
import type { PortfolioData, PortfolioProject, PortfolioTimelineItem } from '../../types'
import { ContactLinks, ProjectActions, RepoFolioAttribution, selectedProjects } from './shared'
import { DecryptedName } from './DecryptedName'
import { Floating3DParticles } from './Floating3DParticles'
import { FolderFloat } from './FolderFloat'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './technical.css'

const timelineKeys = ['experience', 'education', 'certifications', 'achievements'] as const

export function TechnicalTemplate({ data }: { data: PortfolioData }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState('top')
  const [inspectedSkill, setInspectedSkill] = useState('')
  const [skillsOpen, setSkillsOpen] = useState(true)
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
  const showPortrait = data.hero.showImage && Boolean(data.avatarUrl)
  const showStatus = data.hero.availabilityConfirmed && data.hero.showStatus && Boolean(data.hero.status.trim())
  const visibleLanguages = showProjects ? new Set(projects.map(project => project.language.trim()).filter(Boolean)).size : 0
  const visibleLiveDemos = showProjects ? projects.filter(project => project.homepage.trim()).length : 0
  const navLinks: [string, string][] = []

  if (showProjects) navLinks.push(['projects', data.sections.projects.title])
  if (showAbout) navLinks.push(['about', data.sections.about.title])
  if (showSkills) navLinks.push(['skills', data.sections.skills.title])
  timelines.forEach(({ id, section }) => navLinks.push([id, section.title]))
  if (data.sections.contact.visible) navLinks.push(['contact', 'Contact'])

  const navigationSignature = ['top', ...navLinks.map(([id]) => id)].join('|')
  const editorTabs: [string, string][] = [['top', 'profile.tsx'], ...navLinks.map(([id]) => [id, technicalTabFileName(id)] as [string, string])]
  const particleProfile = technicalParticleProfile(activeSection, skillsOpen)

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof window === 'undefined') return

    const sections = Array.from(root.querySelectorAll<HTMLElement>('.technical-hero[id], .technical-section[id]'))
    const navigationObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))
      if (visible[0]?.target.id) setActiveSection(visible[0].target.id)
    }, { rootMargin: '-18% 0px -68%', threshold: 0 })
    sections.forEach(section => navigationObserver.observe(section))

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const motionTargets = Array.from(root.querySelectorAll<HTMLElement>(
      '.technical-section-heading, .technical-project-browser, .technical-system-summary > div, .technical-readme-document, .technical-skills-workspace, .technical-history-item, .technical-contact-panel',
    ))
    let motionObserver: IntersectionObserver | undefined
    if (!reducedMotion) {
      root.classList.add('technical-motion-ready')
      motionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('technical-in-view')
          motionObserver?.unobserve(entry.target)
        })
      }, { rootMargin: '0px 0px -8%', threshold: .08 })
      motionTargets.forEach(target => motionObserver?.observe(target))
    }

    return () => {
      navigationObserver.disconnect()
      motionObserver?.disconnect()
      root.classList.remove('technical-motion-ready')
    }
  }, [navigationSignature])

  return <div ref={rootRef} className="technical-template tpl-page">
    <div className="technical-particle-environment" aria-hidden="true">
      <Floating3DParticles
        className="technical-particles"
        color={data.appearance.accent}
        quantity={particleProfile.quantity}
        size={particleProfile.size}
        opacity={particleProfile.opacity}
        drift={particleProfile.drift}
        depth={particleProfile.depth}
      />
    </div>
    <header className="technical-topbar technical-width">
      <a href="#top" className="technical-app-mark" aria-label="Open profile"><Code2 size={18} aria-hidden="true" /></a>
      <div className="technical-top-menu" aria-hidden="true"><span>File</span><span>Edit</span><span>View</span><span>Go</span><span>Run</span></div>
      <p className="technical-workspace-title"><span>repofolio</span> / @{data.username}</p>
      <p>{showProjects ? `${String(projects.length).padStart(2, '0')} selected repositories` : 'Engineering portfolio'}</p>
    </header>

    <div className="technical-width technical-shell">
      <aside className="technical-index">
        <div className="technical-activity-rail" aria-hidden="true">
          <span data-active><Files size={18} /></span>
          <span><Search size={18} /></span>
          <span><GitBranch size={18} /></span>
          <span><Blocks size={18} /></span>
        </div>
        <div className="technical-index-sticky">
          <div className="technical-explorer-heading"><p className="technical-label">Explorer</p><span aria-hidden="true">•••</span></div>
          <p className="technical-explorer-root"><span aria-hidden="true">v</span>portfolio-{data.username}/</p>
          <nav aria-label="Portfolio contents">
            <ol>
              <li><a href="#top" aria-label="Profile" aria-current={activeSection === 'top' ? 'location' : undefined} data-entry="file"><span>00</span><i aria-hidden="true" /><strong>profile.tsx</strong></a></li>
              {navLinks.map(([id, label], index) => <li key={id}><a href={`#${id}`} aria-label={label} aria-current={activeSection === id ? 'location' : undefined} data-entry={technicalEntryType(id)}><span>{String(index + 1).padStart(2, '0')}</span><i aria-hidden="true" /><strong>{technicalFileName(id)}</strong></a></li>)}
            </ol>
          </nav>
          {data.location.trim() || showStatus ? <div className="technical-index-meta">
            {data.location.trim() ? <p><MapPin size={13} aria-hidden="true" />{data.location}</p> : null}
            {showStatus ? <p className="technical-availability"><i aria-hidden="true" />{data.hero.status}</p> : null}
          </div> : null}
        </div>
      </aside>

      <main className="technical-main">
        <nav className="technical-editor-tabs" aria-label="Open portfolio files">
          <div className="technical-tab-list">
            {editorTabs.map(([id, file]) => <a key={id} href={`#${id}`} className="technical-tab" data-file={id} aria-current={activeSection === id ? 'page' : undefined}>
              <i aria-hidden="true">{technicalFileBadge(id)}</i><span>{file}</span><b aria-hidden="true">×</b>
            </a>)}
          </div>
          <p>UTF-8&nbsp;&nbsp; LF</p>
        </nav>
        <section id="top" className="technical-hero" aria-labelledby="technical-name">
          <div className="technical-hero-copy">
            <p className="technical-path"><span>src</span> / profile.tsx</p>
            <h1 id="technical-name"><DecryptedName text={data.name} /></h1>
            {data.headline.trim() ? <p className="technical-headline">{data.headline}</p> : null}
            {data.bio.trim() ? <p className="technical-bio">{data.bio}</p> : null}
            <ContactLinks data={data} compact />
          </div>

          <div className="technical-profile-sheet">
            {showPortrait ? <figure className="technical-photo-frame">
              <img src={data.avatarUrl} alt={`${data.name} profile`} width={320} height={320} />
            </figure> : null}
            <dl>
              {data.hero.eyebrow.trim() ? <div><dt>Focus</dt><dd>{data.hero.eyebrow}</dd></div> : null}
              <div><dt>Handle</dt><dd>@{data.username}</dd></div>
              {showProjects ? <div><dt>Selected work</dt><dd>{projects.length}</dd></div> : null}
              {data.location.trim() ? <div><dt>Location</dt><dd>{data.location}</dd></div> : null}
            </dl>
          </div>
        </section>

        {showProjects || showSkills ? <dl className="technical-system-summary" aria-label="Portfolio data summary">
          {showProjects ? <TechnicalMetric label="Repositories" value={projects.length} /> : null}
          {visibleLanguages > 0 ? <TechnicalMetric label="Languages" value={visibleLanguages} /> : null}
          {showProjects ? <TechnicalMetric label="Live demos" value={visibleLiveDemos} /> : null}
          {showSkills ? <TechnicalMetric label="Capabilities" value={skills.length} /> : null}
        </dl> : null}

        {showProjects ? <section id="projects" className="technical-section technical-projects" aria-labelledby="technical-projects-title">
          <TechnicalSectionHeader code="repo[]" title={data.sections.projects.title} id="technical-projects-title" note={`${projects.length} selected`} />
          <TechnicalProjectBrowser projects={projects} />
        </section> : null}

        {showAbout ? <section id="about" className="technical-section technical-prose-section" aria-labelledby="technical-about-title">
          <TechnicalSectionHeader code="readme" title={data.sections.about.title} id="technical-about-title" />
          <article className="technical-readme-document">
            <header><span>README.md</span><i aria-hidden="true" /></header>
            <p>{data.sections.about.text}</p>
          </article>
        </section> : null}

        {showSkills ? <section id="skills" className="technical-section technical-skills-section" aria-labelledby="technical-skills-title">
          <TechnicalSectionHeader code="skills/" title={data.sections.skills.title} id="technical-skills-title" note={`${skills.length} files`} />
          <div className="technical-skills-workspace">
            <div className="technical-skills-instructions">
              <p>Open the folder</p>
              <span>Drag, throw, or inspect a capability file.</span>
            </div>
            <FolderFloat
              items={skills}
              defaultOpen
              label="skills/"
              sublabel={`${skills.length} imported files`}
              trigger="hover"
              closeOnSelect={false}
              onSelect={setInspectedSkill}
              onOpenChange={setSkillsOpen}
              folderColor="var(--portfolio-surface)"
              frontColor="color-mix(in srgb, var(--portfolio-accent) 16%, var(--portfolio-surface))"
              paperColor="var(--portfolio-text)"
              itemColor="var(--portfolio-text)"
              itemTextColor="var(--portfolio-bg)"
              labelColor="var(--portfolio-text)"
              width={216}
              height={146}
              radius={2}
              spread={164}
            />
            <p className="technical-skill-readout" aria-live="polite"><span>inspect</span>{inspectedSkill || 'Select a capability file'}</p>
          </div>
        </section> : null}

        {timelines.map(({ id, section, items }) => <section key={id} id={id} className="technical-section technical-timeline-section" aria-labelledby={`technical-${id}-title`}>
          <TechnicalSectionHeader code="records[]" title={section.title} id={`technical-${id}-title`} note={`${items.length} ${items.length === 1 ? 'entry' : 'entries'}`} />
          <TechnicalHistory items={items} kind={id} />
        </section>)}

        {data.sections.contact.visible ? <section id="contact" className="technical-section technical-contact" aria-labelledby="technical-contact-title">
          <TechnicalSectionHeader code="handoff" title={data.sections.contact.title} id="technical-contact-title" />
          <div className="technical-contact-panel">
            <p className="technical-contact-label">Available endpoints</p>
            {data.sections.contact.text.trim() ? <p>{data.sections.contact.text}</p> : null}
            <ContactLinks data={data} />
          </div>
        </section> : null}
      </main>
    </div>

    <footer className="technical-footer technical-width">
      <span><i aria-hidden="true" />Portfolio ready</span>
      <span>{data.name}</span>
      <RepoFolioAttribution />
    </footer>
  </div>
}

function technicalParticleProfile(section: string, skillsOpen: boolean) {
  if (section === 'skills') return { quantity: skillsOpen ? 360 : 280, size: 2.6, opacity: .48, drift: .07, depth: .84 }
  if (section === 'projects') return { quantity: 320, size: 2.4, opacity: .42, drift: .1, depth: .78 }
  if (section === 'contact') return { quantity: 250, size: 2.7, opacity: .46, drift: -.04, depth: .66 }
  return { quantity: 280, size: 2.35, opacity: .4, drift: .08, depth: .72 }
}

function technicalFileName(id: string) {
  const files: Record<string, string> = {
    top: 'profile.tsx',
    projects: 'projects/',
    about: 'README.md',
    skills: 'skills/',
    experience: 'experience.json',
    education: 'education.json',
    certifications: 'certifications.json',
    achievements: 'achievements.json',
    contact: 'contact.ts',
  }
  return files[id] ?? `${id}.md`
}

function technicalTabFileName(id: string) {
  if (id === 'projects') return 'projects.json'
  if (id === 'skills') return 'skills.json'
  return technicalFileName(id)
}

function technicalFileBadge(id: string) {
  if (id === 'top' || id === 'contact') return 'TS'
  if (id === 'about') return 'MD'
  return '{}'
}

function technicalEntryType(id: string) {
  return id === 'projects' || id === 'skills' ? 'folder' : 'file'
}

function TechnicalSectionHeader({ code, title, id, note }: { code: string; title: string; id: string; note?: string }) {
  return <header className="technical-section-heading">
    <p>{code}</p>
    <h2 id={id}>{title}</h2>
    {note ? <span>{note}</span> : null}
  </header>
}

function TechnicalMetric({ label, value }: { label: string; value: number }) {
  const valueRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = valueRef.current
    if (!element || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      const startedAt = performance.now()
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / 650)
        element.textContent = String(Math.round(value * (1 - Math.pow(1 - progress, 3))))
        if (progress < 1) frame = window.requestAnimationFrame(animate)
      }
      element.textContent = '0'
      frame = window.requestAnimationFrame(animate)
    }, { threshold: .5 })
    observer.observe(element)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [value])

  return <div><dt>{label}</dt><dd ref={valueRef}>{value}</dd></div>
}

function TechnicalProjectBrowser({ projects }: { projects: PortfolioProject[] }) {
  const [activeId, setActiveId] = useState(projects[0]?.id)
  const projectSignature = projects.map(project => project.id).join('|')

  useEffect(() => {
    if (!projects.some(project => project.id === activeId)) setActiveId(projects[0]?.id)
  }, [activeId, projectSignature, projects])

  const activeIndex = Math.max(0, projects.findIndex(project => project.id === activeId))
  const activeProject = projects[activeIndex] ?? projects[0]

  return <div className="technical-project-browser">
    <div className="technical-project-files" aria-label="Selected repositories">
      <p><span aria-hidden="true">v</span>projects/</p>
      {projects.map((project, index) => <button
        key={project.id}
        type="button"
        aria-pressed={project.id === activeProject.id}
        onClick={() => setActiveId(project.id)}
        onFocus={() => setActiveId(project.id)}
        onPointerEnter={() => setActiveId(project.id)}
      >
        <span>{String(index + 1).padStart(2, '0')}</span>
        <i aria-hidden="true" />
        <strong>{project.title}</strong>
        {project.featured ? <em>featured</em> : null}
      </button>)}
    </div>
    <TechnicalProject key={activeProject.id} project={activeProject} index={activeIndex + 1} />
    <div className="technical-project-print-list" aria-hidden="true">
      {projects.map((project, index) => <TechnicalProject key={project.id} project={project} index={index + 1} />)}
    </div>
  </div>
}

function TechnicalProject({ project, index }: { project: PortfolioProject; index: number }) {
  const stack = project.technologies.filter(technology => technology.trim())
  const technologies = stack.length ? stack : project.language.trim() ? [project.language] : []

  return <article className={`technical-project${project.featured ? ' technical-project-featured' : ''}`} aria-live="polite">
    <header className="technical-project-heading">
      <span>{String(index).padStart(2, '0')}</span>
      <div>
        {project.featured ? <p>Featured repository</p> : null}
        <h3>{project.title}</h3>
      </div>
    </header>

    <div className="technical-project-content">
      {project.description.trim() ? <p className="technical-project-description">{project.description}</p> : null}
      <dl className="technical-project-specs">
        {project.language.trim() ? <div><dt>Primary</dt><dd>{project.language}</dd></div> : null}
        {technologies.length > 0 ? <div><dt>Stack</dt><dd>{technologies.join(' / ')}</dd></div> : null}
        {project.homepage ? <div><dt>Output</dt><dd>Live link available</dd></div> : null}
        {project.stars > 0 ? <div><dt>Stars</dt><dd>{project.stars}</dd></div> : null}
        {project.forks > 0 ? <div><dt>Forks</dt><dd>{project.forks}</dd></div> : null}
      </dl>
      <ProjectActions project={project} directional />
    </div>
  </article>
}

function TechnicalHistory({ items, kind }: { items: PortfolioTimelineItem[]; kind: string }) {
  return <div className="technical-history" aria-label={`${kind} history`}>
    {items.map((item, index) => <article key={item.id} className="technical-history-item">
      <div className="technical-history-marker" aria-hidden="true">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <i />
      </div>
      <div className="technical-history-content">
        <header>
          <div>
            <h3>{item.title}</h3>
            {item.subtitle.trim() ? <span>{item.subtitle}</span> : null}
          </div>
          {item.meta.trim() ? <time>{item.meta}</time> : null}
        </header>
        {item.description.trim() ? <p>{item.description}</p> : null}
        {item.url?.trim() ? <a href={item.url} target="_blank" rel="noreferrer">View source <span aria-hidden="true">↗</span></a> : null}
      </div>
    </article>)}
  </div>
}
