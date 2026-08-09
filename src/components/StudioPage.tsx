import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Download,
  Eye,
  Github,
  LoaderCircle,
  Monitor,
  Moon,
  Palette,
  Plus,
  RefreshCcw,
  Smartphone,
  Star,
  Sun,
  Trash2,
} from 'lucide-react'
import { clearPortfolioDraft, loadPortfolioDraft, savePortfolioDraft } from '../lib/draft'
import { fetchGithubPortfolioSource } from '../lib/github'
import { buildSharePath, createPortfolioData } from '../lib/portfolio'
import { getPortfolioReadiness } from '../lib/readiness'
import { usePageMeta } from '../lib/seo'
import type {
  ListPortfolioSection,
  PortfolioData,
  PortfolioFont,
  PortfolioSections,
  PortfolioTemplate,
  PortfolioTimelineItem,
} from '../types'
import { PortfolioView } from './PortfolioView'

interface StudioPageProps {
  username: string
}

type PreviewMode = 'desktop' | 'mobile'
type ListSectionKey = 'experience' | 'education' | 'certifications' | 'achievements'

const ACCENT_PRESETS = ['#7cdd5b', '#7c8cff', '#ff6b6b', '#f4b942', '#b66cff', '#25c7b7']

export function StudioPage({ username }: StudioPageProps) {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop')
  const [copied, setCopied] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  usePageMeta({
    title: portfolio ? `Edit ${portfolio.name} — RepoFolio` : `Generate @${username} — RepoFolio`,
    description: `Customize the developer portfolio generated from @${username}'s public GitHub profile.`,
    path: `/studio/${encodeURIComponent(username)}`,
    robots: 'noindex,nofollow',
  })

  async function load(forceGithub = false) {
    setLoading(true)
    setError('')

    if (!forceGithub) {
      const draft = loadPortfolioDraft(username)
      if (draft) {
        setPortfolio(draft.portfolio)
        setSavedAt(draft.savedAt)
        setSaveStatus('saved')
        setLoading(false)
        return
      }
    }

    try {
      const source = await fetchGithubPortfolioSource(username)
      setPortfolio(createPortfolioData(source.user, source.repos))
      setSavedAt(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong while loading GitHub.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  useEffect(() => {
    if (!portfolio || loading) return
    setSaveStatus('saving')
    const timeout = window.setTimeout(() => {
      try {
        const timestamp = savePortfolioDraft(portfolio)
        setSavedAt(timestamp)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 450)

    return () => window.clearTimeout(timeout)
  }, [portfolio, loading])

  const shareUrl = useMemo(() => {
    if (!portfolio) return ''
    return `${window.location.origin}${buildSharePath(portfolio)}`
  }, [portfolio])

  async function copyShareUrl() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      window.prompt('Copy your portfolio link:', shareUrl)
    }
  }

  function openFinalPreview() {
    if (!portfolio) return
    window.open(buildSharePath(portfolio), '_blank', 'noopener,noreferrer')
  }

  async function resetToGithub() {
    if (!window.confirm('Reset this portfolio to fresh GitHub data? Your local edits for this username will be replaced.')) return
    clearPortfolioDraft(username)
    await load(true)
  }

  if (loading) return <LoadingScreen username={username} />
  if (error || !portfolio) return <ErrorScreen error={error} onRetry={() => void load()} />

  return (
    <main className="studio-shell min-h-screen bg-[#0b0d10] text-white">
      <header className="studio-header sticky top-0 z-40 border-b border-white/8 bg-[#0b0d10]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <a href="/" aria-label="Back to home" className="studio-icon-button"><ArrowLeft size={17} /></a>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-100">{portfolio.name}</p>
              <div className="flex items-center gap-2">
                <p className="truncate text-xs text-zinc-600">Editing @{portfolio.username}</p>
                <span className={`studio-save-status hidden sm:inline-flex studio-save-${saveStatus}`}>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : savedAt ? 'Saved locally' : 'Autosave on'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void resetToGithub()} className="studio-secondary-button hidden sm:inline-flex" title="Discard local edits and regenerate from GitHub">
              <RefreshCcw size={15} /> <span className="hidden xl:inline">Reset</span>
            </button>
            <button type="button" aria-label="Download portfolio as PDF" onClick={() => window.open(`${buildSharePath(portfolio)}&print=1`, '_blank', 'noopener,noreferrer')} className="studio-secondary-button" title="Open the A4 print view. In Chrome, disable Headers and footers if URL/date appear.">
              <Download size={15} /> <span className="hidden md:inline">Download PDF</span>
            </button>
            <button type="button" aria-label="Copy portfolio share link" onClick={() => void copyShareUrl()} className="studio-secondary-button">
              {copied ? <Check size={15} /> : <Copy size={15} />} <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
            </button>
            <button type="button" aria-label="Open final portfolio preview" onClick={openFinalPreview} className="studio-primary-button">
              <Eye size={15} /> <span className="hidden sm:inline">Final preview</span>
            </button>
          </div>
        </div>
      </header>

      <div className="studio-workspace mx-auto grid max-w-[1600px] lg:grid-cols-[450px_minmax(0,1fr)]">
        <aside className="studio-sidebar border-b border-white/8 bg-[#0e1014] lg:border-b-0 lg:border-r">
          <Editor data={portfolio} onChange={setPortfolio} onPreview={openFinalPreview} />
        </aside>

        <section className="studio-preview-panel min-w-0 bg-[#090a0d] p-3 sm:p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-300">Live preview</p>
              <p className="mt-0.5 text-xs text-zinc-600">Every edit updates instantly.</p>
            </div>
            <div className="flex rounded-xl border border-white/8 bg-white/[0.03] p-1">
              <button onClick={() => setPreviewMode('desktop')} aria-label="Desktop preview" className={`preview-toggle ${previewMode === 'desktop' ? 'preview-toggle-active' : ''}`}><Monitor size={15} /></button>
              <button onClick={() => setPreviewMode('mobile')} aria-label="Mobile preview" className={`preview-toggle ${previewMode === 'mobile' ? 'preview-toggle-active' : ''}`}><Smartphone size={15} /></button>
            </div>
          </div>

          <div className="preview-stage flex min-h-[700px] items-start justify-center overflow-auto rounded-[1.5rem] border border-white/8 bg-[#111318] p-2 sm:p-4">
            <div className={`preview-device ${previewMode === 'mobile' ? 'preview-device-mobile' : 'preview-device-desktop'}`}>
              <PortfolioView data={portfolio} embedded />
            </div>
          </div>
        </section>
      </div>

    </main>
  )
}

function Editor({ data, onChange, onPreview }: { data: PortfolioData; onChange: (data: PortfolioData) => void; onPreview: () => void }) {
  function patch<K extends keyof PortfolioData>(key: K, value: PortfolioData[K]) {
    onChange({ ...data, [key]: value })
  }

  function patchProject(id: number, updates: Partial<PortfolioData['projects'][number]>) {
    patch('projects', data.projects.map((project) => project.id === id ? { ...project, ...updates } : project))
  }

  function toggleProject(id: number, selected: boolean) {
    let projects = data.projects.map((project) => project.id === id ? { ...project, selected, featured: selected ? project.featured : false } : project)
    if (selected && !projects.some((project) => project.selected && project.featured)) {
      projects = projects.map((project) => project.id === id ? { ...project, featured: true } : project)
    }
    if (!selected && !projects.some((project) => project.selected && project.featured)) {
      const nextId = projects.find((project) => project.selected)?.id
      if (nextId !== undefined) projects = projects.map((project) => project.id === nextId ? { ...project, featured: true } : project)
    }
    patch('projects', projects)
  }

  function featureProject(id: number) {
    patch('projects', data.projects.map((project) => ({
      ...project,
      selected: project.id === id ? true : project.selected,
      featured: project.id === id,
    })))
  }

  function moveProject(id: number, direction: -1 | 1) {
    const index = data.projects.findIndex((project) => project.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= data.projects.length) return
    const projects = [...data.projects]
    ;[projects[index], projects[target]] = [projects[target], projects[index]]
    patch('projects', projects)
  }

  function patchAppearance(updates: Partial<PortfolioData['appearance']>) {
    patch('appearance', { ...data.appearance, ...updates })
  }

  function patchHero(updates: Partial<PortfolioData['hero']>) {
    patch('hero', { ...data.hero, ...updates })
  }

  function patchSection<K extends keyof PortfolioSections>(key: K, updates: Partial<PortfolioSections[K]>) {
    patch('sections', { ...data.sections, [key]: { ...data.sections[key], ...updates } })
  }

  const selectedCount = data.projects.filter((project) => project.selected).length
  const readiness = getPortfolioReadiness(data)

  return (
    <div className="studio-editor-scroll p-4 sm:p-6">
      <div className="readiness-card">
        <div className="readiness-heading">
          <div>
            <p className="readiness-eyebrow">Portfolio readiness</p>
            <p className="readiness-title">{readiness.ready ? 'Ready to share' : `${readiness.completed}/${readiness.total} essentials complete`}</p>
          </div>
          <strong>{readiness.percent}%</strong>
        </div>
        <div className="readiness-progress"><span style={{ width: `${readiness.percent}%` }} /></div>
        <div className="readiness-list">
          {readiness.items.map((item) => (
            <span key={item.id} className={item.complete ? 'readiness-item-complete' : ''}>
              <i>{item.complete ? <Check size={11} /> : null}</i>{item.label}
            </span>
          ))}
        </div>
        <button type="button" onClick={onPreview} className="readiness-preview-button"><Eye size={14} /> View final portfolio</button>
      </div>

      <EditorSection title="Template & style" description="Switch presentation without touching your content." icon={<Palette size={15} />} defaultOpen>
        <div className="template-picker">
          {(['minimal', 'modern', 'creative'] as PortfolioTemplate[]).map((template) => (
            <TemplateOption key={template} value={template} active={data.appearance.template === template} onClick={() => patchAppearance({ template })} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className={`studio-choice ${data.appearance.mode === 'dark' ? 'studio-choice-active' : ''}`} onClick={() => patchAppearance({ mode: 'dark' })}><Moon size={14} /> Dark</button>
          <button className={`studio-choice ${data.appearance.mode === 'light' ? 'studio-choice-active' : ''}`} onClick={() => patchAppearance({ mode: 'light' })}><Sun size={14} /> Light</button>
        </div>
        <label className="block">
          <span className="studio-label">Accent color</span>
          <div className="accent-row">
            {ACCENT_PRESETS.map((accent) => <button key={accent} type="button" aria-label={`Use ${accent}`} className={`accent-swatch ${data.appearance.accent.toLowerCase() === accent.toLowerCase() ? 'accent-swatch-active' : ''}`} style={{ background: accent }} onClick={() => patchAppearance({ accent })} />)}
            <input aria-label="Custom accent color" type="color" value={data.appearance.accent} onChange={(event) => patchAppearance({ accent: event.target.value })} className="accent-custom" />
          </div>
        </label>
        <SelectField label="Font" value={data.appearance.font} onChange={(value) => patchAppearance({ font: value as PortfolioFont })} options={[['sans', 'Clean sans'], ['editorial', 'Editorial serif'], ['mono', 'Developer mono']]} />
      </EditorSection>

      <EditorSection title="Hero" description="The first screen should explain who you are quickly." defaultOpen>
        <Field label="Name" value={data.name} onChange={(value) => patch('name', value)} />
        <Field label="Eyebrow" value={data.hero.eyebrow} onChange={(value) => patchHero({ eyebrow: value })} placeholder="Backend engineer" />
        <Field label="Headline" value={data.headline} onChange={(value) => patch('headline', value)} />
        <TextArea label="Short intro" value={data.bio} onChange={(value) => patch('bio', value)} rows={4} />
        <Field label="Location" value={data.location} onChange={(value) => patch('location', value)} placeholder="Casablanca, Morocco" />
        <Field label="Profile image URL" value={data.avatarUrl} onChange={(value) => patch('avatarUrl', value)} />
        <Field label="Availability text" value={data.hero.status} onChange={(value) => patchHero({ status: value })} />
        <Toggle label="Show availability" checked={data.hero.showStatus} onChange={(showStatus) => patchHero({ showStatus })} />
        <Toggle label="Show profile image" checked={data.hero.showImage} onChange={(showImage) => patchHero({ showImage })} />
      </EditorSection>

      <EditorSection title={`Projects · ${selectedCount} selected`} description="Ranked by quality, activity, stars and completeness — not alphabetically." defaultOpen>
        <div className="flex gap-2">
          <button className="studio-mini-button" onClick={() => patch('projects', data.projects.map((project, index) => ({ ...project, selected: true, featured: project.featured || (!data.projects.some((item) => item.featured) && index === 0) })))}>Select all</button>
          <button className="studio-mini-button" onClick={() => patch('projects', data.projects.map((project) => ({ ...project, selected: false, featured: false })))}>Clear</button>
        </div>
        {data.projects.length ? (
          <div className="space-y-3">
            {data.projects.map((project, index) => (
              <div key={project.id} className={`project-editor-card ${project.selected ? 'project-editor-card-active' : ''}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={project.selected} onChange={(event) => toggleProject(project.id, event.target.checked)} className="mt-1 size-4 accent-white" aria-label={`Show ${project.title}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-zinc-500">{project.originalName}</span>
                      <div className="flex items-center gap-1">
                        {project.selected ? <button className={`project-feature-button ${project.featured ? 'project-feature-button-active' : ''}`} onClick={() => featureProject(project.id)} aria-label={`Feature ${project.title}`} title="Make this the featured project"><Star size={12} fill={project.featured ? 'currentColor' : 'none'} /></button> : null}
                        <button className="project-order-button" disabled={index === 0} onClick={() => moveProject(project.id, -1)} aria-label={`Move ${project.title} up`}><ArrowUp size={13} /></button>
                        <button className="project-order-button" disabled={index === data.projects.length - 1} onClick={() => moveProject(project.id, 1)} aria-label={`Move ${project.title} down`}><ArrowDown size={13} /></button>
                      </div>
                    </div>
                  </div>
                </div>
                {project.selected ? (
                  <div className="mt-3 space-y-3">
                    <Field label="Project title" value={project.title} onChange={(title) => patchProject(project.id, { title })} />
                    <TextArea label="Description" value={project.description} onChange={(description) => patchProject(project.id, { description })} rows={3} />
                    <Field label="Technologies" value={project.technologies.join(', ')} onChange={(value) => patchProject(project.id, { technologies: commaList(value, 8) })} placeholder="React, TypeScript, Spring Boot" />
                    <Field label="GitHub link" value={project.url} onChange={(url) => patchProject(project.id, { url })} />
                    <Field label="Live demo URL (optional)" value={project.homepage} onChange={(homepage) => patchProject(project.id, { homepage })} placeholder="https://my-project.vercel.app" />
                    <p className="project-stats">{project.featured ? 'Featured · ' : ''}{project.language || 'No primary language'} · ★ {project.stars} · Forks {project.forks}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : <div className="studio-empty">This GitHub profile has no public repositories. You can still publish a profile, skills, experience and contact portfolio.</div>}
      </EditorSection>

      <EditorSection title="About & skills" description="Keep these concise and relevant to the roles you want.">
        <VisibilityRow label="Show About" checked={data.sections.about.visible} onChange={(visible) => patchSection('about', { visible })} />
        {data.sections.about.visible ? <><Field label="Section title" value={data.sections.about.title} onChange={(title) => patchSection('about', { title })} /><TextArea label="About" value={data.sections.about.text} onChange={(text) => patchSection('about', { text })} rows={5} /></> : null}
        <div className="editor-divider" />
        <VisibilityRow label="Show Skills" checked={data.sections.skills.visible} onChange={(visible) => patchSection('skills', { visible })} />
        {data.sections.skills.visible ? <><Field label="Section title" value={data.sections.skills.title} onChange={(title) => patchSection('skills', { title })} /><TextArea label="Skills" value={data.skills.join(', ')} onChange={(value) => patch('skills', commaList(value, 24))} placeholder="TypeScript, React, Java" rows={3} /></> : null}
      </EditorSection>

      {(['experience', 'education', 'certifications', 'achievements'] as ListSectionKey[]).map((key) => (
        <EditorSection key={key} title={capitalize(key)} description={`Add ${key} only if it strengthens the portfolio.`}>
          <ListSectionEditor section={data.sections[key]} onChange={(section) => patchSection(key, section)} itemLabel={singular(key)} />
        </EditorSection>
      ))}

      <EditorSection title="Links & contact" description="Only public contact details are prefilled." defaultOpen>
        <Field label="GitHub" value={data.githubUrl} onChange={(value) => patch('githubUrl', value)} />
        <Field label="Website" value={data.website} onChange={(value) => patch('website', value)} placeholder="https://your-site.dev" />
        <Field label="Email" value={data.email} onChange={(value) => patch('email', value)} placeholder="you@example.com" />
        <VisibilityRow label="Show Projects section" checked={data.sections.projects.visible} onChange={(visible) => patchSection('projects', { visible })} />
        {data.sections.projects.visible ? <Field label="Projects title" value={data.sections.projects.title} onChange={(title) => patchSection('projects', { title })} /> : null}
        <VisibilityRow label="Show Contact section" checked={data.sections.contact.visible} onChange={(visible) => patchSection('contact', { visible })} />
        {data.sections.contact.visible ? <><Field label="Contact headline" value={data.sections.contact.title} onChange={(title) => patchSection('contact', { title })} /><TextArea label="Contact text" value={data.sections.contact.text} onChange={(text) => patchSection('contact', { text })} rows={3} /></> : null}
      </EditorSection>
    </div>
  )
}

function ListSectionEditor({ section, onChange, itemLabel }: { section: ListPortfolioSection; onChange: (section: Partial<ListPortfolioSection>) => void; itemLabel: string }) {
  function updateItem(id: string, updates: Partial<PortfolioTimelineItem>) {
    onChange({ items: section.items.map((item) => item.id === id ? { ...item, ...updates } : item) })
  }
  function addItem() {
    onChange({ visible: true, items: [...section.items, { id: `${itemLabel}-${Date.now()}`, title: '', subtitle: '', meta: '', description: '', url: '' }] })
  }
  function removeItem(id: string) {
    onChange({ items: section.items.filter((item) => item.id !== id) })
  }

  return (
    <>
      <VisibilityRow label={`Show ${section.title}`} checked={section.visible} onChange={(visible) => onChange({ visible })} />
      {section.visible ? <Field label="Section title" value={section.title} onChange={(title) => onChange({ title })} /> : null}
      {section.visible ? section.items.map((item, index) => (
        <div key={item.id} className="list-item-editor">
          <div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium text-zinc-400">{itemLabel} {index + 1}</span><button onClick={() => removeItem(item.id)} className="project-order-button" aria-label={`Remove ${itemLabel}`}><Trash2 size={13} /></button></div>
          <div className="space-y-3">
            <Field label="Title" value={item.title} onChange={(title) => updateItem(item.id, { title })} placeholder={itemLabel === 'Experience' ? 'Software Engineer' : 'Title'} />
            <Field label="Organization / subtitle" value={item.subtitle} onChange={(subtitle) => updateItem(item.id, { subtitle })} placeholder="Company, school, issuer…" />
            <Field label="Date / meta" value={item.meta} onChange={(meta) => updateItem(item.id, { meta })} placeholder="2025 — Present" />
            <TextArea label="Description" value={item.description} onChange={(description) => updateItem(item.id, { description })} rows={3} />
            <Field label="Optional link" value={item.url ?? ''} onChange={(url) => updateItem(item.id, { url })} placeholder="https://…" />
          </div>
        </div>
      )) : null}
      <button onClick={addItem} className="studio-add-button"><Plus size={14} /> Add {itemLabel.toLowerCase()}</button>
    </>
  )
}

function TemplateOption({ value, active, onClick }: { value: PortfolioTemplate; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`template-option template-option-${value} ${active ? 'template-option-active' : ''}`}><span className="template-option-preview"><i /><i /><i /></span><strong>{capitalize(value)}</strong></button>
}

function EditorSection({ title, description, children, icon, defaultOpen = false }: { title: string; description: string; children: React.ReactNode; icon?: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="studio-editor-panel" open={defaultOpen}>
      <summary><span className="studio-editor-title">{icon}{title}</span><span className="studio-editor-description">{description}</span></summary>
      <div className="studio-editor-content">{children}</div>
    </details>
  )
}

function Field({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><span className="studio-label">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="studio-input" /></label>
}

function TextArea({ label, value, onChange, placeholder = '', rows = 4 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return <label className="block"><span className="studio-label">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="studio-input resize-none leading-6" /></label>
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="block"><span className="studio-label">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="studio-input">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="studio-toggle-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>
}

function VisibilityRow(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <Toggle {...props} />
}

function commaList(value: string, limit: number): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, limit)
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function singular(value: ListSectionKey): string {
  if (value === 'certifications') return 'Certification'
  if (value === 'achievements') return 'Achievement'
  if (value === 'education') return 'Education'
  return 'Experience'
}

function LoadingScreen({ username }: { username: string }) {
  return (
    <main className="studio-state-page" role="status" aria-live="polite">
      <div className="studio-state-card">
        <div className="studio-state-icon"><LoaderCircle className="animate-spin" size={22} /></div>
        <p className="studio-state-kicker">Generating portfolio</p>
        <h1>Reading @{username}</h1>
        <p>Fetching the public profile and repositories. RepoFolio will rank the strongest work before opening the editor.</p>
        <div className="studio-state-steps" aria-hidden="true">
          <span>Profile</span><i />
          <span>Repositories</span><i />
          <span>Portfolio</span>
        </div>
      </div>
    </main>
  )
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <main className="studio-state-page">
      <div className="studio-state-card">
        <div className="studio-state-icon"><Github size={20} /></div>
        <p className="studio-state-kicker">Generation stopped</p>
        <h1>Couldn’t generate this portfolio.</h1>
        <p>{error}</p>
        <div className="studio-state-actions">
          <a href="/" className="studio-secondary-button"><ArrowLeft size={15} /> Change username</a>
          <button type="button" onClick={onRetry} className="studio-primary-button"><RefreshCcw size={15} /> Retry</button>
        </div>
        <a href="/example" className="studio-state-example">Or view an example portfolio</a>
      </div>
    </main>
  )
}
