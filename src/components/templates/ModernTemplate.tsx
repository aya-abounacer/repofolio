import { ArrowUpRight } from 'lucide-react'
import type { PortfolioData } from '../../types'
import { ContactLinks, ProfileMeta, ProjectActions, ProjectMeta, RepoFolioAttribution, selectedProjects, SkillsList, Technologies, TimelineItems, VisibleNav } from './shared'

export function ModernTemplate({ data }: { data: PortfolioData }) {
  const projects = selectedProjects(data)

  return (
    <div className="modern-template tpl-page">
      <div className="modern-glow" aria-hidden="true" />
      <header className="tpl-nav modern-nav">
        <a href="#top" className="tpl-brand">{data.name}</a>
        <VisibleNav data={data} />
      </header>

      <main id="top" className="tpl-main">
        <section className="modern-hero">
          <div>
            {data.hero.showStatus && data.hero.status ? <div className="modern-status"><span /> {data.hero.status}</div> : null}
            {data.hero.eyebrow ? <p className="tpl-eyebrow">{data.hero.eyebrow}</p> : null}
            <h1>{data.name}</h1>
            <p className="modern-headline">{data.headline}</p>
            <p className="modern-bio">{data.bio}</p>
            <ProfileMeta data={data} />
          </div>
          {data.hero.showImage && data.avatarUrl ? (
            <div className="modern-avatar-wrap"><div className="modern-avatar-ring"><img src={data.avatarUrl} alt={`${data.name} profile`} /></div></div>
          ) : null}
        </section>

        {data.sections.about.visible ? (
          <section id="about" className="modern-section">
            <p className="tpl-section-index">01 / {data.sections.about.title}</p>
            <div><h2>{data.sections.about.title}</h2><p className="tpl-body-copy">{data.sections.about.text}</p></div>
          </section>
        ) : null}

        {data.sections.skills.visible ? (
          <section id="skills" className="modern-section">
            <p className="tpl-section-index">02 / {data.sections.skills.title}</p>
            <div><h2>{data.sections.skills.title}</h2><SkillsList skills={data.skills} /></div>
          </section>
        ) : null}

        {data.sections.experience.visible ? <ModernListSection id="experience" index="03" title={data.sections.experience.title} items={data.sections.experience.items} /> : null}
        {data.sections.education.visible ? <ModernListSection id="education" index="04" title={data.sections.education.title} items={data.sections.education.items} /> : null}
        {data.sections.certifications.visible ? <ModernListSection id="certifications" index="05" title={data.sections.certifications.title} items={data.sections.certifications.items} /> : null}
        {data.sections.achievements.visible ? <ModernListSection id="achievements" index="06" title={data.sections.achievements.title} items={data.sections.achievements.items} /> : null}

        {data.sections.projects.visible ? (
          <section id="projects" className="modern-projects-section">
            <div className="modern-project-heading">
              <p className="tpl-section-index">07 / {data.sections.projects.title}</p>
              <h2>{data.sections.projects.title}</h2>
            </div>
            {projects.length ? (
              <div className="modern-project-grid">
                {projects.map((project, index) => (
                  <article key={project.id} className={`modern-project-card ${project.featured ? 'modern-project-featured' : ''}`}>
                    <div className="modern-project-top"><span>{String(index + 1).padStart(2, '0')}</span>{project.featured ? <span className="tpl-featured-label">Featured</span> : <ArrowUpRight size={18} />}</div>
                    <div><h3>{project.title}</h3><p>{project.description}</p><Technologies project={project} /><ProjectActions project={project} /></div>
                    <ProjectMeta project={project} />
                  </article>
                ))}
              </div>
            ) : <div className="tpl-empty-state">Select at least one repository to show your work here.</div>}
          </section>
        ) : null}

        {data.sections.contact.visible ? (
          <section id="contact" className="modern-section modern-contact">
            <p className="tpl-section-index">08 / Contact</p>
            <div><h2>{data.sections.contact.title}</h2><p className="tpl-body-copy">{data.sections.contact.text}</p><ContactLinks data={data} /></div>
          </section>
        ) : null}
      </main>

      <footer className="tpl-footer"><span>© {new Date().getFullYear()} {data.name}</span><RepoFolioAttribution /></footer>
    </div>
  )
}

function ModernListSection({ id, index, title, items }: { id: string; index: string; title: string; items: PortfolioData['sections']['experience']['items'] }) {
  return <section id={id} className="modern-section"><p className="tpl-section-index">{index} / {title}</p><div><h2>{title}</h2><TimelineItems items={items} /></div></section>
}
