import { ArrowUpRight } from 'lucide-react'
import type { PortfolioData } from '../../types'
import { ContactLinks, ProfileMeta, ProjectActions, ProjectMeta, RepoFolioAttribution, selectedProjects, SkillsList, Technologies, TimelineItems, VisibleNav } from './shared'

export function MinimalTemplate({ data }: { data: PortfolioData }) {
  const projects = selectedProjects(data)
  return (
    <div className="minimal-template tpl-page">
      <header className="tpl-nav minimal-nav"><a href="#top" className="tpl-brand">{data.name}</a><VisibleNav data={data} /></header>
      <main id="top" className="tpl-main minimal-main">
        <section className="minimal-hero">
          <div className="minimal-hero-copy">
            {data.hero.eyebrow ? <p className="tpl-eyebrow">{data.hero.eyebrow}</p> : null}
            <h1>{data.name}</h1>
            <p className="minimal-headline">{data.headline}</p>
            <p className="minimal-bio">{data.bio}</p>
            <ProfileMeta data={data} />
            {data.hero.showStatus && data.hero.status ? <p className="minimal-status">● {data.hero.status}</p> : null}
          </div>
          {data.hero.showImage && data.avatarUrl ? <img className="minimal-avatar" src={data.avatarUrl} alt={`${data.name} profile`} /> : null}
        </section>

        {data.sections.about.visible ? <MinimalTextSection id="about" title={data.sections.about.title}><p className="tpl-body-copy">{data.sections.about.text}</p></MinimalTextSection> : null}
        {data.sections.skills.visible ? <MinimalTextSection id="skills" title={data.sections.skills.title}><SkillsList skills={data.skills} /></MinimalTextSection> : null}
        {data.sections.experience.visible ? <MinimalTextSection id="experience" title={data.sections.experience.title}><TimelineItems items={data.sections.experience.items} /></MinimalTextSection> : null}
        {data.sections.education.visible ? <MinimalTextSection id="education" title={data.sections.education.title}><TimelineItems items={data.sections.education.items} /></MinimalTextSection> : null}
        {data.sections.certifications.visible ? <MinimalTextSection id="certifications" title={data.sections.certifications.title}><TimelineItems items={data.sections.certifications.items} /></MinimalTextSection> : null}
        {data.sections.achievements.visible ? <MinimalTextSection id="achievements" title={data.sections.achievements.title}><TimelineItems items={data.sections.achievements.items} /></MinimalTextSection> : null}

        {data.sections.projects.visible ? (
          <section id="projects" className="minimal-section">
            <h2>{data.sections.projects.title}</h2>
            {projects.length ? <div className="minimal-project-list">{projects.map((project) => (
              <article key={project.id} className={`minimal-project-row ${project.featured ? 'minimal-project-featured' : ''}`}>
                <div>
                  {project.featured ? <span className="tpl-featured-label">Featured</span> : null}
                  <h3>{project.title}</h3><p>{project.description}</p><Technologies project={project} /><ProjectActions project={project} />
                </div>
                <div className="minimal-project-side"><ArrowUpRight size={18} /><ProjectMeta project={project} /></div>
              </article>
            ))}</div> : <div className="tpl-empty-state">Select at least one repository to show your work here.</div>}
          </section>
        ) : null}

        {data.sections.contact.visible ? <MinimalTextSection id="contact" title={data.sections.contact.title}><p className="tpl-body-copy">{data.sections.contact.text}</p><ContactLinks data={data} /></MinimalTextSection> : null}
      </main>
      <footer className="tpl-footer"><span>{data.name}</span><RepoFolioAttribution /></footer>
    </div>
  )
}

function MinimalTextSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="minimal-section"><h2>{title}</h2><div className="minimal-section-content">{children}</div></section>
}
