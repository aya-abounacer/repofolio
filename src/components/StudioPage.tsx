import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
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
  Search,
  Smartphone,
  Star,
  Sun,
  Trash2,
} from 'lucide-react'
import { clearPortfolioDraft, loadPortfolioDraft, savePortfolioDraft } from '../lib/draft'
import { fetchGithubPortfolioSource } from '../lib/github'
import { ProfilePhotoEditor } from './ProfilePhotoEditor'
import { createPortfolioData, deriveSkills, getProjectsMissingDescriptions, PROJECT_DESCRIPTION_PLACEHOLDER } from '../lib/portfolio'
import { saveSharedPortfolio } from '../lib/sharing'
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
  const [sharing, setSharing] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [shareError, setShareError] = useState('')
  const [savedShareUrl, setSavedShareUrl] = useState('')
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

  function reviewMissingDescriptions() {
    if (!portfolio) return false
    const missing = getProjectsMissingDescriptions(portfolio)
    if (!missing.length) return false
    window.dispatchEvent(new CustomEvent('repofolio:review-project', { detail: missing[0].id }))
    return true
  }

  function openLocalPreview(print = false) {
    if (!portfolio || (print && reviewMissingDescriptions())) return
    try {
      savePortfolioDraft(portfolio)
      window.open(`/preview/${encodeURIComponent(portfolio.username)}${print ? '?print=1' : ''}`, '_blank', 'noopener,noreferrer')
    } catch {
      setShareError('Could not save this preview on your device. Allow browser storage and try again.')
    }
  }

  function downloadPdf() { openLocalPreview(true) }
  function openFinalPreview() { openLocalPreview() }

  async function copyShareUrl() {
    if (!portfolio || sharing || photoBusy || reviewMissingDescriptions()) return
    setSharing(true)
    setShareError('')
    setSavedShareUrl('')
    try {
      const path = await saveSharedPortfolio(portfolio)
      const url = `${window.location.origin}${path}`
      setSavedShareUrl(url)
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      } catch {
        setShareError('Your link is saved. Copy it from the field below.')
      }
    } catch (caught) {
      setShareError(caught instanceof Error ? caught.message : 'Could not save your portfolio. Try again.')
    } finally {
      setSharing(false)
    }
  }

  async function resetToGithub() {
    if (photoBusy) return
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
                <p className="truncate text-xs text-zinc-400">Editing @{portfolio.username}</p>
                <span className={`studio-save-status hidden sm:inline-flex studio-save-${saveStatus}`}>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : savedAt ? 'Saved locally' : 'Autosave on'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" disabled={photoBusy} onClick={() => void resetToGithub()} className="studio-secondary-button hidden sm:inline-flex" title="Discard local edits and regenerate from GitHub">
              <RefreshCcw size={15} /> <span className="hidden xl:inline">Reset</span>
            </button>
            <button type="button" aria-label="Download portfolio as PDF" onClick={downloadPdf} className="studio-secondary-button" title="Open the A4 print view. In Chrome, disable Headers and footers if URL/date appear.">
              <Download size={15} /> <span className="hidden md:inline">Download PDF</span>
            </button>
            <button type="button" aria-label="Copy portfolio share link" disabled={sharing || photoBusy} onClick={() => void copyShareUrl()} className="studio-secondary-button">
              {copied ? <Check size={15} /> : <Copy size={15} />} <span className="hidden sm:inline">{sharing ? 'Saving…' : copied ? 'Copied' : 'Copy link'}</span>
            </button>
            <button type="button" aria-label="Open final portfolio preview" onClick={openFinalPreview} className="studio-primary-button">
              <Eye size={15} /> <span className="hidden sm:inline">Final preview</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-2 text-xs text-zinc-400">
        <p>Preview and PDF stay on this device. Copy link saves a public snapshot; later edits need a new link.</p>
        {shareError ? <p role="alert" className="mt-2 text-amber-300">{shareError}</p> : null}
        {savedShareUrl ? <label className="mt-2 block">Saved portfolio link<input readOnly value={savedShareUrl} onFocus={(event) => event.target.select()} className="studio-input mt-1" /></label> : null}
      </div>
      <div className="studio-workspace mx-auto grid max-w-[1600px] lg:grid-cols-[450px_minmax(0,1fr)]">
        <aside className="studio-sidebar border-b border-white/8 bg-[#0e1014] lg:border-b-0 lg:border-r">
          <Editor data={portfolio} onChange={setPortfolio} onPreview={openFinalPreview} onPhotoBusyChange={setPhotoBusy} />
        </aside>

        <section className="studio-preview-panel min-w-0 bg-[#090a0d] p-3 sm:p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-300">Live preview</p>
              <p className="mt-0.5 text-xs text-zinc-400">Every edit updates instantly.</p>
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

function Editor({ data, onChange, onPreview, onPhotoBusyChange }: { data: PortfolioData; onChange: Dispatch<SetStateAction<PortfolioData | null>>; onPreview: () => void; onPhotoBusyChange: (busy: boolean) => void }) {
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null)
  const [projectSearch, setProjectSearch] = useState('')
  const [projectPage, setProjectPage] = useState(1)
  const [reviewProjectId, setReviewProjectId] = useState<number | null>(null)
  const [newSkill, setNewSkill] = useState('')
  const [skillMessage, setSkillMessage] = useState('')
  const [reloadingSkills, setReloadingSkills] = useState(false)

  function addSkill() {
    const skill = newSkill.trim()
    if (!skill) return
    if (data.skills.some((existing) => existing.toLocaleLowerCase() === skill.toLocaleLowerCase())) {
      setSkillMessage(`${skill} is already in your skills.`)
      return
    }
    if (data.skills.length >= 24) {
      setSkillMessage('You can show up to 24 skills. Remove one before adding another.')
      return
    }
    patch('skills', [...data.skills, skill])
    setNewSkill('')
    setSkillMessage(`${skill} added.`)
  }

  async function reloadSkills() {
    if (reloadingSkills) return
    setReloadingSkills(true)
    setSkillMessage('')
    try {
      const source = await fetchGithubPortfolioSource(data.username)
      const imported = deriveSkills(source.repos)
      onChange((current) => current ? { ...current, skills: imported } : current)
      setSkillMessage(`Restored ${imported.length} skill${imported.length === 1 ? '' : 's'} from GitHub. Your other edits are unchanged.`)
    } catch (error) {
      setSkillMessage(error instanceof Error ? `Could not reload skills: ${error.message}` : 'Could not reload skills from GitHub. Try again.')
    } finally {
      setReloadingSkills(false)
    }
  }

  useEffect(() => {
    const reveal = (event: Event) => {
      const id = (event as CustomEvent<number>).detail
      const index = data.projects.findIndex((project) => project.id === id)
      if (index < 0) return
      setProjectSearch('')
      setProjectPage(Math.floor(index / 10) + 1)
      setExpandedProjectId(id)
      setReviewProjectId(id)
      const section = document.getElementById('project-editor-section') as HTMLDetailsElement | null
      if (section) section.open = true
    }
    window.addEventListener('repofolio:review-project', reveal)
    return () => window.removeEventListener('repofolio:review-project', reveal)
  }, [data.projects])

  useEffect(() => {
    if (reviewProjectId === null) return
    const field = document.getElementById(`project-description-${reviewProjectId}`)
    field?.focus()
    field?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setReviewProjectId(null)
  }, [reviewProjectId, projectPage, projectSearch, expandedProjectId])
  function patch<K extends keyof PortfolioData>(key: K, value: PortfolioData[K]) {
    onChange({ ...data, [key]: value })
  }

  function patchProject(id: number, updates: Partial<PortfolioData['projects'][number]>) {
    patch('projects', data.projects.map((project) => project.id === id ? { ...project, ...updates } : project))
  }

  function toggleProject(id: number, selected: boolean) {
    setExpandedProjectId(current => selected ? id : current === id ? null : current)
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
  const matchingProjects = data.projects.map((project, index) => ({ project, index })).filter(({ project }) =>
    `${project.title} ${project.originalName}`.toLocaleLowerCase().includes(projectSearch.trim().toLocaleLowerCase()),
  )
  const projectPageCount = Math.max(1, Math.ceil(matchingProjects.length / 10))
  const currentProjectPage = Math.min(projectPage, projectPageCount)
  const visibleProjects = matchingProjects.slice((currentProjectPage - 1) * 10, currentProjectPage * 10)
  const readiness = getPortfolioReadiness(data)
  const missingDescriptions = getProjectsMissingDescriptions(data)

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
        {missingDescriptions.length > 0 ? <p role="status" className="mt-3 text-sm text-amber-300">{missingDescriptions.length} selected project{missingDescriptions.length === 1 ? '' : 's'} need a description before sharing or exporting. Add descriptions below, or deselect those projects.</p> : null}
        <div className="readiness-list">
          {readiness.items.map((item) => (
            <span key={item.id} className={item.complete ? 'readiness-item-complete' : ''}>
              <i>{item.complete ? <Check size={11} /> : null}</i>{item.label}
            </span>
          ))}
        </div>
        <button type="button" onClick={onPreview} className="readiness-preview-button"><Eye size={14} /> View final portfolio</button>
      </div>

      <EditorSection title="Template & style" description="Switch presentation without touching your content." icon={<Palette size={15} />}>
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

      <EditorSection title="Hero" description="The first screen should explain who you are quickly.">
        <Field label="Name" value={data.name} onChange={(value) => patch('name', value)} />
        <Field label="Role label" help="Small text above your name in the portfolio preview." value={data.hero.eyebrow} onChange={(value) => patchHero({ eyebrow: value })} placeholder="Backend engineer" />
        <Field label="Headline" value={data.headline} onChange={(value) => patch('headline', value)} />
        <TextArea label="Short intro" value={data.bio} onChange={(value) => patch('bio', value)} rows={4} />
        <Field label="Location" value={data.location} onChange={(value) => patch('location', value)} placeholder="Casablanca, Morocco" />
        <ProfilePhotoEditor key={data.username} avatarUrl={data.avatarUrl} githubAvatarUrl={data.githubAvatarUrl || `https://github.com/${encodeURIComponent(data.username)}.png?size=512`} onBusyChange={onPhotoBusyChange} onChange={(avatarUrl) => onChange(current => current?.username === data.username ? { ...current, avatarUrl } : current)} />
        <Field label="Availability text" value={data.hero.status} onChange={(value) => patchHero({ status: value, availabilityConfirmed: false, showStatus: false })} placeholder="e.g. Open to frontend roles" />
        <Toggle label="I confirm this availability is accurate and want to show it" checked={Boolean(data.hero.availabilityConfirmed && data.hero.showStatus)} onChange={(confirmed) => patchHero({ availabilityConfirmed: confirmed, showStatus: confirmed })} />
        <p className="text-xs text-zinc-400">Availability stays hidden until you enter a status and confirm it. Changing the text requires confirmation again.</p>
        <Toggle label="Show profile image" checked={data.hero.showImage} onChange={(showImage) => patchHero({ showImage })} />
      </EditorSection>

      <EditorSection id="project-editor-section" title={`Projects · ${selectedCount} selected`} description="Ranked by quality, activity, stars and completeness — not alphabetically.">
        <VisibilityRow label="Show Projects section" checked={data.sections.projects.visible} onChange={(visible) => patchSection('projects', { visible })} />
        {data.sections.projects.visible ? <Field label="Projects title" value={data.sections.projects.title} onChange={(title) => patchSection('projects', { title })} /> : null}
        <label className="block">
          <span className="studio-label">Search projects</span>
          <span className="relative block">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input type="search" value={projectSearch} onChange={(event) => { setProjectSearch(event.target.value); setProjectPage(1) }} placeholder="Find a repository" className="studio-input studio-search-input" />
          </span>
        </label>
        <div className="flex gap-2">
          <button className="studio-mini-button" onClick={() => patch('projects', data.projects.map((project, index) => ({ ...project, selected: true, featured: project.featured || (!data.projects.some((item) => item.featured) && index === 0) })))}>Select all</button>
          <button className="studio-mini-button" onClick={() => patch('projects', data.projects.map((project) => ({ ...project, selected: false, featured: false })))}>Clear</button>
        </div>
        {data.projects.length ? (
          matchingProjects.length ?
          <div className="space-y-3">
            <p className="text-xs text-zinc-400" role="status">Showing {Math.min((currentProjectPage - 1) * 10 + 1, matchingProjects.length)}–{Math.min(currentProjectPage * 10, matchingProjects.length)} of {matchingProjects.length} projects</p>
            {visibleProjects.map(({ project, index }) => (
              <div key={project.id} className={`project-editor-card ${project.selected ? 'project-editor-card-active' : ''}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={project.selected} onChange={(event) => toggleProject(project.id, event.target.checked)} className="mt-1 size-4 accent-white" aria-label={`Show ${project.title}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" id={`project-toggle-${project.id}`} aria-expanded={expandedProjectId === project.id} aria-controls={`project-fields-${project.id}`} onClick={() => setExpandedProjectId(current => current === project.id ? null : project.id)} className="flex min-w-0 flex-1 items-center gap-2 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-200">{project.title}</span>
                          <span className="block truncate text-xs text-zinc-400">{project.featured ? 'Featured · ' : ''}{project.language || 'Project'}{project.selected && !project.description.trim() ? ' · Needs description' : ''}</span>
                        </span>
                        <ChevronDown size={14} className={`shrink-0 text-zinc-400 transition-transform ${expandedProjectId === project.id ? 'rotate-180' : ''}`} />
                      </button>
                      <div className="flex items-center gap-1">
                        {project.selected ? <button className={`project-feature-button ${project.featured ? 'project-feature-button-active' : ''}`} onClick={() => featureProject(project.id)} aria-label={`Feature ${project.title}`} title="Make this the featured project"><Star size={12} fill={project.featured ? 'currentColor' : 'none'} /></button> : null}
                        <button className="project-order-button" disabled={index === 0} onClick={() => moveProject(project.id, -1)} aria-label={`Move ${project.title} up`}><ArrowUp size={13} /></button>
                        <button className="project-order-button" disabled={index === data.projects.length - 1} onClick={() => moveProject(project.id, 1)} aria-label={`Move ${project.title} down`}><ArrowDown size={13} /></button>
                      </div>
                    </div>
                  </div>
                </div>
                <div id={`project-fields-${project.id}`} hidden={expandedProjectId !== project.id}>
                  <div className="mt-3 space-y-3">
                    <Field label="Project title" value={project.title} onChange={(title) => patchProject(project.id, { title })} />
                    <TextArea label="Description" id={`project-description-${project.id}`} value={project.description} onChange={(description) => patchProject(project.id, { description })} rows={3} placeholder={PROJECT_DESCRIPTION_PLACEHOLDER} error={project.selected && data.sections.projects.visible && !project.description.trim() ? 'Add a description before sharing, or deselect this project.' : undefined} />
                    <Field label="Technologies" value={project.technologies.join(', ')} onChange={(value) => patchProject(project.id, { technologies: commaList(value, 8) })} placeholder="React, TypeScript, Spring Boot" />
                    <Field label="GitHub link" value={project.url} onChange={(url) => patchProject(project.id, { url })} />
                    <Field label="Live demo URL (optional)" value={project.homepage} onChange={(homepage) => patchProject(project.id, { homepage })} placeholder="https://my-project.vercel.app" />
                    <p className="project-stats">{project.featured ? 'Featured · ' : ''}{project.language || 'No primary language'} · ★ {project.stars} · Forks {project.forks}</p>
                  </div>
                </div>
              </div>
            ))}
            {projectPageCount > 1 ? <nav aria-label="Project pages" className="flex flex-wrap items-center gap-2 pt-2">
              <button type="button" className="studio-mini-button" disabled={currentProjectPage === 1} onClick={() => setProjectPage(currentProjectPage - 1)}>Previous</button>
              {Array.from({ length: projectPageCount }, (_, index) => index + 1).map((page) => <button key={page} type="button" className="studio-mini-button" aria-label={`Project page ${page}`} aria-current={page === currentProjectPage ? 'page' : undefined} onClick={() => setProjectPage(page)}>{page}</button>)}
              <button type="button" className="studio-mini-button" disabled={currentProjectPage === projectPageCount} onClick={() => setProjectPage(currentProjectPage + 1)}>Next</button>
            </nav> : null}
          </div>
          : <div className="studio-empty">No projects match “{projectSearch}”. Try another name.</div>
        ) : <div className="studio-empty">This GitHub profile has no public repositories. You can still publish a profile, skills, experience and contact portfolio.</div>}
      </EditorSection>

      <EditorSection title="About & skills" description="Review imported skills and add a separate About paragraph.">
        <VisibilityRow label="Show About" checked={data.sections.about.visible} onChange={(visible) => patchSection('about', { visible })} />
        {data.sections.about.visible ? <><Field label="Section title" value={data.sections.about.title} onChange={(title) => patchSection('about', { title })} /><TextArea label="About" value={data.sections.about.text} onChange={(text) => patchSection('about', { text })} placeholder="Tell visitors more than your short intro: what you focus on and the work you're proud of." rows={5} /></> : null}
        <div className="editor-divider" />
        <VisibilityRow label="Show Skills" checked={data.sections.skills.visible} onChange={(visible) => patchSection('skills', { visible })} />
        {data.sections.skills.visible ? <>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="studio-label mb-0">Review your skills</p>
              <button type="button" disabled={reloadingSkills} onClick={() => void reloadSkills()} className="studio-mini-button px-2 py-1" title="Replace this list with the latest repository languages from GitHub"><RefreshCcw size={12} /> {reloadingSkills ? 'Reloading…' : 'Reload from GitHub'}</button>
            </div>
            <p className="my-3 text-xs leading-5 text-zinc-400">GitHub suggests skills from your repositories. Remove any that do not represent you. Reloading replaces this list with fresh GitHub suggestions.</p>
            {data.skills.length ? <div className="flex flex-wrap gap-2">
              {data.skills.map((skill, index) => <span key={`${skill}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] py-1 pl-2.5 pr-1 text-xs text-zinc-200">
                {skill}<button type="button" aria-label={`Remove ${skill} from skills`} title={`Remove ${skill}`} onClick={() => { patch('skills', data.skills.filter((_, skillIndex) => skillIndex !== index)); setSkillMessage(`${skill} removed.`) }} className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">×</button>
              </span>)}
            </div> : <p className="text-xs text-zinc-400">No skills imported. Add your strongest skills below.</p>}
          </div>
          <Field label="Section title" value={data.sections.skills.title} onChange={(title) => patchSection('skills', { title })} />
          <form onSubmit={(event) => { event.preventDefault(); addSkill() }}>
            <label htmlFor="new-skill" className="studio-label">Add a skill</label>
            <div className="flex gap-2">
              <input id="new-skill" type="text" value={newSkill} onChange={(event) => { setNewSkill(event.target.value); setSkillMessage('') }} placeholder="e.g. TypeScript" className="studio-input min-w-0 flex-1" />
              <button type="submit" disabled={!newSkill.trim() || data.skills.length >= 24} className="studio-mini-button px-3 disabled:cursor-not-allowed disabled:opacity-50">Add</button>
            </div>
            <p className="mt-2 text-xs text-zinc-400">Enter one skill at a time. Spaces are fine; press Enter or Add when finished.</p>
          </form>
          {skillMessage ? <p role="status" className="text-xs text-zinc-300">{skillMessage}</p> : null}
        </> : null}
      </EditorSection>

      {(['experience', 'education', 'certifications', 'achievements'] as ListSectionKey[]).map((key) => (
        <EditorSection key={key} title={capitalize(key)} description={`Add ${key} only if it strengthens the portfolio.`}>
          <ListSectionEditor section={data.sections[key]} onChange={(section) => patchSection(key, section)} itemLabel={singular(key)} />
        </EditorSection>
      ))}

      <EditorSection title="Links & contact" description="Only public contact details are prefilled.">
        <Field label="GitHub" value={data.githubUrl} onChange={(value) => patch('githubUrl', value)} />
        <Field label="Website" value={data.website} onChange={(value) => patch('website', value)} placeholder="https://your-site.dev" />
        <Field label="Email" value={data.email} onChange={(value) => patch('email', value)} placeholder="you@example.com" />
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

function EditorSection({ id, title, description, children, icon }: { id?: string; title: string; description: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <details id={id} className="studio-editor-panel">
      <summary><span className="studio-editor-title">{icon}{title}</span><span className="studio-editor-description">{description}</span></summary>
      <div className="studio-editor-content">{children}</div>
    </details>
  )
}

function Field({ label, value, onChange, placeholder = '', help }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; help?: string }) {
  return <label className="block"><span className="studio-label">{label}</span>{help ? <span className="mb-2 block text-xs text-zinc-400">{help}</span> : null}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="studio-input" /></label>
}

function TextArea({ label, value, onChange, placeholder = '', rows = 4, id, error }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; id?: string; error?: string }) {
  return <label className="block"><span className="studio-label">{label}</span><textarea id={id} aria-invalid={Boolean(error)} aria-describedby={error && id ? `${id}-error` : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="studio-input resize-none leading-6" />{error ? <span id={id ? `${id}-error` : undefined} className="mt-1 block text-xs text-amber-300">{error}</span> : null}</label>
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
